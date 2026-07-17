#!/bin/sh
# One-time bootstrap for Let's Encrypt certs on a fresh VPS.
#
# nginx's config (default.conf.template) references
# /etc/letsencrypt/live/$DOMAIN/*.pem unconditionally, but Let's Encrypt's
# HTTP-01 challenge requires nginx to already be running on port 80 to serve
# it - a chicken-and-egg problem. This script breaks the cycle: it creates a
# throwaway self-signed cert so nginx can start, requests the real cert via
# the webroot challenge, then reloads nginx with the real one.
#
# Run once, from the repo root on the VPS, after `docker compose -f
# docker-compose.prod.yml up -d postgres redis` :
#   sh nginx/init-letsencrypt.sh
#
# Requires DOMAIN and LETSENCRYPT_EMAIL to be set in .env.production.

set -e

if [ -f .env.production ]; then
  set -a
  . ./.env.production
  set +a
fi

if [ -z "$DOMAIN" ] || [ -z "$LETSENCRYPT_EMAIL" ]; then
  echo "DOMAIN and LETSENCRYPT_EMAIL must be set (in .env.production or the environment)." >&2
  exit 1
fi

COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.production"
DOMAINS="$DOMAIN www.$DOMAIN app.$DOMAIN api.$DOMAIN automation.$DOMAIN"

echo "### Creating a dummy self-signed cert so nginx can start ..."
mkdir -p "certbot/conf/live/$DOMAIN" certbot/www
docker run --rm \
  -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
  --entrypoint sh alpine:3.20 -c "\
    apk add --no-cache openssl >/dev/null && \
    openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
      -keyout '/etc/letsencrypt/live/$DOMAIN/privkey.pem' \
      -out '/etc/letsencrypt/live/$DOMAIN/fullchain.pem' \
      -subj '/CN=localhost'"

echo "### Starting nginx with the dummy cert ..."
$COMPOSE up -d nginx

echo "### Deleting dummy cert and requesting the real one ..."
docker run --rm \
  -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
  --entrypoint sh certbot/certbot -c "rm -rf /etc/letsencrypt/live/$DOMAIN /etc/letsencrypt/archive/$DOMAIN /etc/letsencrypt/renewal/$DOMAIN.conf"

domain_args=""
for d in $DOMAINS; do domain_args="$domain_args -d $d"; done

docker run --rm \
  -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
  -v "$(pwd)/certbot/www:/var/www/certbot" \
  certbot/certbot certonly --webroot -w /var/www/certbot \
  $domain_args \
  --email "$LETSENCRYPT_EMAIL" --agree-tos --no-eff-email

echo "### Reloading nginx with the real cert ..."
$COMPOSE exec nginx nginx -s reload

echo "Done. https://$DOMAIN should now work. Set up renewal via scripts/renew-certs.sh on a cron."
