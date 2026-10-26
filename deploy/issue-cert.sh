#!/usr/bin/env bash
# Request a Let's Encrypt certificate. Reads DOMAIN and CERTBOT_EMAIL from .env and does not print them.
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this script as root on the server." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
. "$SCRIPT_DIR/lib.sh"

require_env_file
load_layout
email="$(env_value CERTBOT_EMAIL)"
if [ -z "$DOMAIN" ] || [ "$DOMAIN" = "_" ] || [ -z "$email" ]; then
  echo "Set DOMAIN and CERTBOT_EMAIL in $APP_DIR/.env before requesting a certificate." >&2
  exit 1
fi

docker run --rm \
  -v "$DATA_DIR/certbot:/etc/letsencrypt" \
  -v "$DATA_DIR/certbot-www:/var/www/certbot" \
  certbot/certbot certonly --webroot -w /var/www/certbot \
  --cert-name "$DOMAIN" \
  -d "$DOMAIN" \
  --email "$email" \
  --agree-tos \
  --no-eff-email \
  --non-interactive

cd "$APP_DIR"
compose up -d --force-recreate --no-deps proxy
echo "Certificate installed and the proxy container was recreated. The upload directory was not changed."
