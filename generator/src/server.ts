import 'dotenv/config';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { mkdirSync } from 'node:fs';
import { orchestrate } from './orchestrator.js';
import { scaffoldAstroProject } from './scaffolder.js';
import { buildAstroProject } from './build.js';
import { callWebhook, verifyIncoming } from './webhook.js';
import type { GenerateRequest, BuildRequest } from './types.js';

declare module 'fastify' {
  interface FastifyRequest {
    rawBody?: string;
  }
}

const app = Fastify({ logger: true });

/**
 * Concurrency limiter for /build — npm install + astro build per project
 * uses ~400 MB peak. The 2 GB production VM gets OOM-killed when more than
 * ~3 builds run in parallel. We queue excess /build requests in memory and
 * release the next as soon as one finishes. /build still returns 202
 * immediately; the queue just holds the actual work.
 */
const MAX_PARALLEL_BUILDS = Number(process.env.MAX_PARALLEL_BUILDS ?? 2);
let activeBuilds = 0;
const buildQueue: Array<() => Promise<void>> = [];

function drainBuildQueue(): void {
  // Pump the queue as long as slots are free AND items are waiting.
  // CRITICAL: the previous version only dequeued ONE item per finish event,
  // leaving the queue stuck whenever ≥3 builds piled up (v316 case).
  while (activeBuilds < MAX_PARALLEL_BUILDS && buildQueue.length > 0) {
    const next = buildQueue.shift()!;
    activeBuilds++;
    next().finally(() => {
      activeBuilds--;
      drainBuildQueue();
    });
  }
}

function withBuildSlot(work: () => Promise<void>): void {
  buildQueue.push(work);
  drainBuildQueue();
}

// Capture raw body BEFORE JSON parsing so HMAC verification matches exactly
// what Laravel signed (byte-for-byte). Otherwise Fastify re-stringifies
// the parsed object and the hash differs.
app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
  (req as any).rawBody = body as string;
  if (body === '') {
    done(null, {});
    return;
  }
  try {
    done(null, JSON.parse(body as string));
  } catch (err) {
    done(err as Error, undefined);
  }
});

// HMAC verification for incoming Laravel-originated requests.
// Skip /health (used by GeneratorHealthProbe) and /preview (static artifacts;
// behind firewall on 127.0.0.1 only — see deploy notes).
app.addHook('preHandler', async (req, reply) => {
  if (req.url === '/health' || req.url.startsWith('/preview')) {
    return;
  }
  const rawBody = req.rawBody ?? '';
  const ok = verifyIncoming(rawBody, {
    'x-wv-timestamp': req.headers['x-wv-timestamp'] as string | undefined,
    'x-wv-signature': req.headers['x-wv-signature'] as string | undefined,
  });
  if (!ok) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
});

const ARTIFACTS_DIR = process.env.ARTIFACTS_DIR ?? '/tmp/wv-artifacts';

mkdirSync(ARTIFACTS_DIR, { recursive: true });

await app.register(fastifyStatic, {
  root: ARTIFACTS_DIR,
  prefix: '/preview',
  prefixAvoidTrailingSlash: true,
  index: ['index.html'],
});

app.get('/health', async () => ({ ok: true }));

app.post<{ Body: GenerateRequest }>('/generate', async (req, reply) => {
  const { prototype_version_id, slug, rebuild_package, webhook_url } = req.body;

  if (!prototype_version_id || !slug || !rebuild_package || !webhook_url) {
    return reply.status(400).send({ error: 'Missing required fields' });
  }

  reply.status(202).send({ job_id: `gen-${prototype_version_id}-${Date.now()}` });

  setImmediate(async () => {
    try {
      app.log.info(`[gen] starting v${prototype_version_id} (slug=${slug})`);

      const { siteSpec, model, inputTokens, outputTokens, costCents } =
        await orchestrate(rebuild_package);

      const astroProjectPath = await scaffoldAstroProject(prototype_version_id, siteSpec, slug);

      app.log.info(`[gen] scaffolded → ${astroProjectPath}`);

      await callWebhook(webhook_url, {
        prototype_version_id,
        status: 'success',
        site_spec: siteSpec,
        meta: {
          astro_project_path: astroProjectPath,
          model,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          cost_cents: costCents,
        },
      });

      app.log.info(`[gen] webhook sent v${prototype_version_id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      app.log.error(`[gen] failed v${prototype_version_id}: ${msg}`);

      await callWebhook(webhook_url, {
        prototype_version_id,
        status: 'failed',
        meta: { error: msg },
      }).catch((e) => app.log.error(`[gen] webhook also failed: ${e.message}`));
    }
  });
});

app.post<{ Body: BuildRequest }>('/build', async (req, reply) => {
  const { prototype_version_id, slug, astro_project_path, webhook_url } = req.body;

  if (!prototype_version_id || !slug || !astro_project_path || !webhook_url) {
    return reply.status(400).send({ error: 'Missing required fields' });
  }

  reply.status(202).send({ job_id: `build-${prototype_version_id}-${Date.now()}` });

  setImmediate(() => withBuildSlot(async () => {
      try {
        app.log.info(`[build] starting v${prototype_version_id} (slug=${slug}, active=${activeBuilds}/${MAX_PARALLEL_BUILDS}, queued=${buildQueue.length})`);

        const { artifactPath, artifactHash, previewUrl } = await buildAstroProject(
          prototype_version_id,
          astro_project_path,
          slug,
        );

        await callWebhook(webhook_url, {
          prototype_version_id,
          status: 'success',
          meta: {
            artifact_path: artifactPath,
            artifact_hash: artifactHash,
            preview_url: previewUrl,
          },
        });

        app.log.info(`[build] done v${prototype_version_id} → ${previewUrl}`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        app.log.error(`[build] failed v${prototype_version_id}: ${msg}`);

        await callWebhook(webhook_url, {
          prototype_version_id,
          status: 'failed',
          meta: { error: msg },
        }).catch((e) => app.log.error(`[build] webhook also failed: ${e.message}`));
      }
  }));
});

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? '127.0.0.1';

app.listen({ port, host }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
