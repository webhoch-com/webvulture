import { createHmac, timingSafeEqual } from 'node:crypto';

const secret = process.env.GENERATOR_SECRET ?? process.env.WV_SECRET ?? '';

if (!secret) {
  // eslint-disable-next-line no-console
  console.warn('[webhook] GENERATOR_SECRET is empty — webhook calls will be rejected by Laravel');
}

function sign(timestamp: string, body: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
}

export async function callWebhook(url: string, body: Record<string, unknown>): Promise<void> {
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
