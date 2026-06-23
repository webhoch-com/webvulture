import { createHmac, timingSafeEqual } from 'node:crypto';

const secret = process.env.GENERATOR_SECRET ?? process.env.WV_SECRET ?? '';
// LARAVEL_APP_URL is the only legitimate target for outbound webhook calls.
// We enforce a strict origin allowlist so a compromised caller cannot trick
// the generator into POSTing to internal services (169.254.169.254 IMDS,
// localhost:6379 Redis, etc.) by supplying an attacker-controlled webhook_url.
const ALLOWED_WEBHOOK_ORIGIN = (process.env.LARAVEL_APP_URL ?? process.env.APP_URL ?? '').replace(/\/+$/, '');

if (!secret) {
  // eslint-disable-next-line no-console
  console.warn('[webhook] GENERATOR_SECRET is empty — webhook calls will be rejected by Laravel');
}
if (!ALLOWED_WEBHOOK_ORIGIN) {
  // eslint-disable-next-line no-console
  console.warn('[webhook] LARAVEL_APP_URL/APP_URL is empty — callWebhook() will reject every URL');
}

/**
 * Fail-fast startup guard. The generator is useless without an HMAC secret (to
 * sign outbound webhooks) and a configured Laravel origin (the only allowed
 * webhook target). Without them the service silently scaffolds but can NEVER
 * call back to Laravel, so the build step never fires and demos hang at
 * "generating" — exactly the prod incident this guards against. Call this at
 * server startup so a misconfigured deploy crashes loudly instead of failing
 * silently. NOT called at import time, so tests/tooling can import this module
 * without these env vars set.
 */
export function assertWebhookEnv(): void {
  const missing: string[] = [];
  if (!secret) missing.push('GENERATOR_SECRET (or WV_SECRET)');
  if (!ALLOWED_WEBHOOK_ORIGIN) missing.push('LARAVEL_APP_URL (or APP_URL)');
  if (missing.length > 0) {
    throw new Error(
      `[webhook] FATAL: missing required env: ${missing.join(', ')}. ` +
        'The generator scaffolds but can never call back to Laravel without these — ' +
        "set them in the generator's environment (must match Laravel's APP_URL origin) and restart.",
    );
  }
}

function sign(timestamp: string, body: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
}

/** SSRF guard: only POST back to the configured Laravel origin. */
function isAllowedWebhookUrl(target: string): boolean {
  if (!ALLOWED_WEBHOOK_ORIGIN) return false;
  let parsed: URL;
  try { parsed = new URL(target); } catch { return false; }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
  let allowed: URL;
  try { allowed = new URL(ALLOWED_WEBHOOK_ORIGIN); } catch { return false; }
  return parsed.origin === allowed.origin;
}

export async function callWebhook(url: string, body: Record<string, unknown>): Promise<void> {
  if (!ALLOWED_WEBHOOK_ORIGIN) {
    throw new Error('callWebhook: refused — LARAVEL_APP_URL/APP_URL is not configured, so no outbound webhook target is allowed');
  }
  if (!isAllowedWebhookUrl(url)) {
    throw new Error(`callWebhook: refused — URL ${url} is not the configured LARAVEL_APP_URL origin (${ALLOWED_WEBHOOK_ORIGIN})`);
  }
  const timestamp = String(Math.floor(Date.now() / 1000));
  const rawBody = JSON.stringify(body);
  const sig = sign(timestamp, rawBody);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-WV-Timestamp': timestamp,
      'X-WV-Signature': sig,
    },
    body: rawBody,
  });

  if (!res.ok) {
    throw new Error(`Webhook ${url} returned ${res.status}`);
  }
}

export function verifyIncoming(
  rawBody: string,
  headers: { 'x-wv-timestamp'?: string; 'x-wv-signature'?: string },
  maxAgeSeconds = 300,
): boolean {
  if (!secret) return false;

  const ts = headers['x-wv-timestamp'];
  const sig = headers['x-wv-signature'];

  if (!ts || !sig || !/^\d+$/.test(ts)) return false;

  const age = Math.abs(Math.floor(Date.now() / 1000) - parseInt(ts, 10));
  if (age > maxAgeSeconds) return false;

  const expected = sign(ts, rawBody);
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(sig, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
