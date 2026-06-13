import { exec } from 'node:child_process';
import { mkdir, cp, rm } from 'node:fs/promises';
import { join, resolve as resolvePath } from 'node:path';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const execAsync = promisify(exec);

const ARTIFACTS_DIR = process.env.ARTIFACTS_DIR ?? '/tmp/wv-artifacts';
const PROJECTS_DIR = process.env.PROJECTS_DIR ?? '/tmp/wv-projects';
const PREVIEW_ROOT_DOMAIN = process.env.PREVIEW_ROOT_DOMAIN ?? 'webseiten-werkstatt.at';
const PREVIEW_SCHEME = process.env.PREVIEW_SCHEME ?? 'https';

export interface BuildResult {
  artifactPath: string;
  artifactHash: string;
  previewUrl: string;
}

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,99}$/;

export async function buildAstroProject(
  prototypeVersionId: number,
  astroProjectPath: string,
  slug: string,
): Promise<BuildResult> {
  if (!SLUG_RE.test(slug)) {
    throw new Error(`Invalid slug "${slug}" — must match ${SLUG_RE}`);
  }

  // Path-traversal guard: the caller-supplied astroProjectPath becomes the
  // `cwd` of `npm install` and `npx astro build`. A compromised upstream
  // could otherwise smuggle "/tmp/wv-projects/../../etc/cron.d/..." to run
  // npm install in a sensitive directory. Resolve and require it to live
  // strictly under PROJECTS_DIR.
  const resolvedProject = resolvePath(astroProjectPath);
  const resolvedRoot = resolvePath(PROJECTS_DIR);
  if (resolvedProject !== resolvedRoot && !resolvedProject.startsWith(resolvedRoot + '/')) {
    throw new Error(`astroProjectPath "${astroProjectPath}" escapes PROJECTS_DIR (${resolvedRoot})`);
  }

  await execAsync('npm install --prefer-offline --no-audit --no-fund', {
    cwd: resolvedProject,
    timeout: 360_000,
  });

  await execAsync('npx astro build', {
    cwd: resolvedProject,
    timeout: 360_000,
    env: { ...process.env, NODE_ENV: 'production' },
  });

  const distPath = join(resolvedProject, 'dist');

  // Keyed by slug — matches Nginx wildcard vhost {slug}.webseiten-werkstatt.at → /var/www/.../{slug}/
  const artifactDir = join(ARTIFACTS_DIR, slug);
  await rm(artifactDir, { recursive: true, force: true });
  await mkdir(artifactDir, { recursive: true });
  await cp(distPath, artifactDir, { recursive: true });

  const indexHtml = readFileSync(join(distPath, 'index.html'));
  const artifactHash = createHash('sha256').update(indexHtml).digest('hex');

  const previewUrl = `${PREVIEW_SCHEME}://${slug}.${PREVIEW_ROOT_DOMAIN}/`;

  return {
    artifactPath: artifactDir,
    artifactHash,
    previewUrl,
  };
}
