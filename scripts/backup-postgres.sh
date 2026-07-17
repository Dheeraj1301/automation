#!/bin/sh
# Dumps the production Postgres database to a gzip file and prunes backups
# older than 14 days. Postgres is the only durable data store in this stack
# (n8n's data volume only holds workflow definitions, which are also
# version-controlled in n8n/workflows/).
#
# Add to the VPS's crontab (run `crontab -e`), from the repo root:
#   0 2 * * * cd /path/to/automation && sh scripts/backup-postgres.sh >> /var/log/profitpilot-backup.log 2>&1

set -e
cd "$(dirname "$0")/.."

if [ -f .env.production ]; then
  set -a
  . ./.env.production
  set +a
fi

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

mkdir -p "$BACKUP_DIR"

docker compose -f docker-compose.prod.yml --env-file .env.production \
  exec -T postgres pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB}" \
  | gzip > "$BACKUP_DIR/profitpilot-$TIMESTAMP.sql.gz"

echo "Backed up to $BACKUP_DIR/profitpilot-$TIMESTAMP.sql.gz"

find "$BACKUP_DIR" -name 'profitpilot-*.sql.gz' -mtime "+$RETENTION_DAYS" -delete

echo "Pruned backups older than $RETENTION_DAYS days."
