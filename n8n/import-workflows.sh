#!/bin/sh
# One-command n8n workflow setup - safe to re-run after every deploy.
#
# The workflow JSON exports in n8n/workflows/ each carry a fixed top-level
# "id", so `n8n import:workflow` upserts the existing workflow in place
# instead of creating a duplicate on re-run (verified against n8n 2.30.7 -
# earlier n8n versions tolerated a missing id and auto-generated one, but
# current versions reject the import outright without it).
#
# Usage:
#   sh n8n/import-workflows.sh                        # local dev (docker-compose.yml)
#   COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.production" \
#     sh n8n/import-workflows.sh                        # production

set -e

# Git Bash on Windows rewrites leading-/ arguments (like /workflows/...) into
# Windows paths before they reach `docker compose exec`, breaking the import.
# No-op on Linux/macOS, so this is safe everywhere.
export MSYS_NO_PATHCONV=1

COMPOSE="${COMPOSE:-docker compose}"

echo "Waiting for n8n to be ready..."
until $COMPOSE ps n8n --format '{{.Health}}' 2>/dev/null | grep -q healthy; do
  sleep 2
done

echo "Importing workflows..."
$COMPOSE exec -T n8n n8n import:workflow --input=/workflows/new-lead-whatsapp.json
$COMPOSE exec -T n8n n8n import:workflow --input=/workflows/new-lead-crm.json

# import:workflow always leaves the workflow deactivated, regardless of the
# "active" field in the JSON - it must be explicitly (re-)published, and
# that publish only takes effect after n8n restarts.
echo "Publishing workflows..."
$COMPOSE exec -T n8n n8n publish:workflow --id=newLeadWhatsappMock01
$COMPOSE exec -T n8n n8n publish:workflow --id=newLeadCrmSyncMock01

echo "Restarting n8n to activate the published webhooks..."
$COMPOSE restart n8n

echo "Done. Submit a test lead (storefront Contact page or a published landing page),"
echo "then check the Executions tab (http://localhost:5678 locally, or"
echo "https://automation.\$DOMAIN in production) for both workflow runs."
