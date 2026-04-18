import { exec } from 'node:child_process';
import { mkdir, cp, stat } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const execAsync = promisify(exec);

const ARTIFACTS_DIR = process.env.ARTIFACTS_DIR ?? '/tmp/wv-artifacts';
const PREVIEW_BASE_URL = process.env.PREVIEW_BASE_URL ?? 'http://localhost:4001';

export interface BuildResult {
  artifactPath: string;
  artifactHash: string;
  previewUrl: string;
}

export async function buildAstroProject(
  prototypeVersionId: number,
  astroProjectPath: string,
): Promise<BuildResult> {
  // Install deps
  await execAsync('npm install', {
    cwd: astroProjectPath,
    timeout: 120_000,
  });

  // Build
  await execAsync('npx astro build', {
    cwd: astroProjectPath,
    timeout: 180_000,
    env: { ...process.env, NODE_ENV: 'production' },
  });

  const distPath = join(astroProjectPath, 'dist');

  // Copy artifact to persistent location
  const artifactDir = join(ARTIFACTS_DIR, String(prototypeVersionId));
  await mkdir(artifactDir, { recursive: true });
  await cp(distPath, artifactDir, { recursive: true });

  // Hash the index.html as artifact fingerprint
  const indexHtml = readFileSync(join(distPath, 'index.html'));
  const artifactHash = createHash('sha256').update(indexHtml).digest('hex');

  const previewUrl = `${PREVIEW_BASE_URL}/preview/${prototypeVersionId}/`;

  return {
    artifactPath: artifactDir,
    artifactHash,
    previewUrl,
  };
}
