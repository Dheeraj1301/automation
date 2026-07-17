#!/bin/sh
# Run on the VPS to ship a new version. First-time setup (cloning the repo,
# writing .env.production, running nginx/init-letsencrypt.sh for TLS) has to
# happen once before this script is useful - see README's "Deploying to a
# VPS" section.
#
# Usage (from the repo root on the VPS): sh scripts/deploy.sh

set -e
cd "$(dirname "$0")/.."

if [ ! -f .env.production ]; then
  echo ".env.production not found - copy .env.production.example, fill it in, and re-run." >&2
  exit 1
fi

COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.production"

echo "### Pulling latest code ..."
git pull --ff-only

echo "### Building and starting services ..."
# Alembic migrations run automatically on backend startup (see
# backend/docker-entrypoint.sh) - no separate migrate step needed here.
$COMPOSE up -d --build

echo "### Pruning old, now-unused images ..."
docker image prune -f

echo "### Current status:"
$COMPOSE ps

echo "Done."
