import { createHmac } from 'node:crypto';

const secret = process.env.WV_SECRET ?? '';

function sign(timestamp: string): string {
  return createHmac('sha256', secret).update(timestamp).digest('hex');
}

export async function callWebhook(url: string, body: Record<string, unknown>): Promise<void> {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const sig = sign(timestamp);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-WV-Timestamp': timestamp,
      'X-WV-Signature': sig,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Webhook ${url} returned ${res.status}`);
  }
}
