#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

# ── Laravel queue ─────────────────────────────────────────────────────────
echo "[laravel] starting queue worker..."
php "$ROOT/artisan" queue:work \
  --queue=scrape,enrichment,discovery,generation \
  --tries=3 \
  --timeout=120 &
QUEUE_PID=$!

# ── Laravel Reverb ────────────────────────────────────────────────────────
echo "[reverb] starting WebSocket server..."
php "$ROOT/artisan" reverb:start --no-interaction &
REVERB_PID=$!

# ── Node generator ────────────────────────────────────────────────────────
if [ -f "$ROOT/generator/.env" ]; then
  echo "[generator] starting Node service..."
  cd "$ROOT/generator"
  npm run dev &
  GEN_PID=$!
  cd "$ROOT"
else
  echo "[generator] skipping — generator/.env not found"
fi

echo ""
echo "WebVulture running."
echo "  Queue PID : ${QUEUE_PID}"
echo "  Reverb    : ${REVERB_PID}"
echo "  Generator : ${GEN_PID:-not started}"
echo ""
echo "Press Ctrl+C to stop."

wait
