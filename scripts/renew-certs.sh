#!/bin/sh
# Renews Let's Encrypt certs and reloads nginx. Let's Encrypt certs are valid
# 90 days; certbot only actually renews when a cert is within 30 days of
# expiry, so this is safe to run daily.
#
# Add to the VPS's crontab (run `crontab -e`), from the repo root:
#   0 3 * * * cd /path/to/automation && sh scripts/renew-certs.sh >> /var/log/profitpilot-renew.log 2>&1

set -e
cd "$(dirname "$0")/.."

docker run --rm \
  -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
  -v "$(pwd)/certbot/www:/var/www/certbot" \
  certbot/certbot renew --webroot -w /var/www/certbot --quiet

docker compose -f docker-compose.prod.yml --env-file .env.production exec nginx nginx -s reload
