#!/bin/bash
# Deploy Script fuer webhoch Webseiten Vorschau
# Ausfuehren auf dem VPS: bash deploy.sh

set -e

echo "=== webhoch Webseiten Vorschau — Deployment ==="

# 1. Secrets generieren (nur beim ersten Mal)
if [ ! -f .env ]; then
  echo "Generiere .env Datei..."
  JWT_SECRET=$(openssl rand -hex 32)
  ENCRYPTION_KEY=$(openssl rand -hex 32)
  DB_PASSWORD=$(openssl rand -hex 16)

  cat > .env << EOF
DB_PASSWORD=${DB_PASSWORD}
JWT_SECRET=${JWT_SECRET}
ENCRYPTION_KEY=${ENCRYPTION_KEY}
EOF
  echo ".env erstellt mit generierten Secrets"
else
  echo ".env existiert bereits, ueberspringe..."
fi

# 2. Teaser-Verzeichnis erstellen
mkdir -p /var/www/teasers/_archives
echo "Teaser-Verzeichnis bereit"

# 3. Docker Compose starten
echo "Starte Docker Compose..."
docker compose up -d --build

# 4. Warte auf PostgreSQL
echo "Warte auf Datenbank..."
sleep 5

# 5. Migrationen ausfuehren
echo "Fuehre Migrationen aus..."
docker compose exec app node server/node_modules/.bin/node-pg-migrate up \
  --migration-file-language sql \
  -m server/migrations \
  --database-url-var DATABASE_URL

echo ""
echo "=== Deployment abgeschlossen ==="
echo "App erreichbar unter: https://n8n.webhoch.com"
echo "Default Login: admin / webhoch2024"
echo ""
echo "WICHTIG: Passwort nach erstem Login aendern!"
echo "WICHTIG: API Keys unter Einstellungen hinterlegen!"
