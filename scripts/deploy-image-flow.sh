#!/usr/bin/env bash
# Deploy the image-flow + cost-tracking + XSS-fix changes to webvulture.webhoch.com.
# Run this LOCALLY from the worktree root after SSH-key auth is in place:
#   bash scripts/deploy-image-flow.sh
#
# Idempotent: safe to re-run.

set -euo pipefail

REMOTE=root@185.51.10.235
APP_DIR=/var/www/webvulture
GEN_DIR="$APP_DIR/generator"

echo "→ Sync app code (excluding vendor/node_modules)..."
rsync -avz --delete \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='vendor' \
  --exclude='storage/app/leads' \
  --exclude='storage/logs' \
  --exclude='storage/framework' \
  --exclude='.env' \
  --exclude='*.png' \
  --exclude='generator/dist' \
  ./ "$REMOTE:$APP_DIR/"

echo "→ Composer install (no-dev)..."
ssh "$REMOTE" "cd $APP_DIR && composer install --no-dev --optimize-autoloader --no-interaction"

echo "→ NPM build for Vite assets..."
ssh "$REMOTE" "cd $APP_DIR && npm ci && npm run build"

echo "→ Generator npm install + build..."
ssh "$REMOTE" "cd $GEN_DIR && npm ci && npm run build"

echo "→ Run migrations..."
ssh "$REMOTE" "cd $APP_DIR && php artisan migrate --force"

echo "→ Cache config/route/view..."
ssh "$REMOTE" "cd $APP_DIR && php artisan config:cache && php artisan route:cache && php artisan view:cache"

echo "→ Restart workers + reverb + generator..."
ssh "$REMOTE" "supervisorctl restart 'webvulture-queue:*' webvulture-reverb webvulture-generator"

echo "→ Health check..."
ssh "$REMOTE" "curl -fsS http://127.0.0.1:4000/health || true"

echo "✓ Deploy complete."
