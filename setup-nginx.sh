#!/bin/bash
# Nginx Konfiguration fuer webhoch Webseiten Vorschau
# Ausfuehren auf dem VPS: bash setup-nginx.sh

set -e

echo "=== Nginx Setup ==="

# Alte n8n Config entfernen (falls vorhanden)
rm -f /etc/nginx/sites-enabled/dl.conf

# Neue Config kopieren
cp nginx/app.conf /etc/nginx/sites-available/webhoch-app.conf
ln -sf /etc/nginx/sites-available/webhoch-app.conf /etc/nginx/sites-enabled/

# SSL fuer n8n.webhoch.com (falls noch nicht vorhanden)
if [ ! -d /etc/letsencrypt/live/n8n.webhoch.com ]; then
  echo "SSL Zertifikat fuer n8n.webhoch.com anfordern..."
  certbot certonly --nginx -d n8n.webhoch.com --non-interactive --agree-tos
fi

# Nginx testen und neuladen
nginx -t
systemctl reload nginx

echo "Nginx konfiguriert und neugeladen"
echo "n8n.webhoch.com -> App (Port 3001)"
echo "*.webseiten-werkstatt.at -> /var/www/teasers/"
