import 'dotenv/config';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { mkdirSync } from 'node:fs';
import { orchestrate } from './orchestrator.js';
import { scaffoldAstroProject } from './scaffolder.js';
import { buildAstroProject } from './build.js';
import { callWebhook } from './webhook.js';
import type { GenerateRequest, BuildRequest } from './types.js';

const app = Fastify({ logger: true });

const ARTIFACTS_DIR = process.env.ARTIFACTS_DIR ?? '/tmp/wv-artifacts';

// Ensure dir exists before @fastify/static registers (plugin fails if root missing)
mkdirSync(ARTIFACTS_DIR, { recursive: true });

// ─── Static preview serving ─────────────────────────────────────────────────
await app.register(fastifyStatic, {
  root: ARTIFACTS_DIR,
  prefix: '/preview',
  prefixAvoidTrailingSlash: true,
  index: ['index.html'],
});

// ─── Health ────────────────────────────────────────────────────────────────
app.get('/health', async () => ({ ok: true }));

// ─── Generate ──────────────────────────────────────────────────────────────
app.post<{ Body: GenerateRequest }>('/generate', async (req, reply) => {
  const { prototype_version_id, rebuild_package, webhook_url } = req.body;

  if (!prototype_version_id || !rebuild_package || !webhook_url) {
    return reply.status(400).send({ error: 'Missing required fields' });
  }

  // Ack immediately — generation is async
  reply.status(202).send({ job_id: `gen-${prototype_version_id}-${Date.now()}` });

  // Run in background
  setImmediate(async () => {
    try {
      app.log.info(`[gen] starting v${prototype_version_id}`);

      const { siteSpec, model, inputTokens, outputTokens, costCents } =
        await orchestrate(rebuild_package);

      const astroProjectPath = await scaffoldAstroProject(prototype_version_id, siteSpec);

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

// ─── Build ─────────────────────────────────────────────────────────────────
app.post<{ Body: BuildRequest }>('/build', async (req, reply) => {
  const { prototype_version_id, astro_project_path, webhook_url } = req.body;

  if (!prototype_version_id || !astro_project_path || !webhook_url) {
    return reply.status(400).send({ error: 'Missing required fields' });
  }

  reply.status(202).send({ job_id: `build-${prototype_version_id}-${Date.now()}` });

  setImmediate(async () => {
    try {
      app.log.info(`[build] starting v${prototype_version_id}`);

      const { artifactPath, artifactHash, previewUrl } = await buildAstroProject(
        prototype_version_id,
        astro_project_path,
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
  });
});

// ─── Boot ──────────────────────────────────────────────────────────────────
const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? '0.0.0.0';

app.listen({ port, host }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
