#!/bin/sh
# One-command n8n workflow setup - no manual UI import needed.
# Run after `docker compose up -d` (waits for n8n's health check itself,
# so it's also safe to run immediately after starting the stack).
#
# Usage: sh n8n/import-workflows.sh

set -e

echo "Waiting for n8n to be ready..."
until docker compose ps n8n --format '{{.Health}}' 2>/dev/null | grep -q healthy; do
  sleep 2
done

echo "Importing workflows..."
docker compose exec -T n8n n8n import:workflow --input=/workflows/new-lead-whatsapp.json
docker compose exec -T n8n n8n import:workflow --input=/workflows/new-lead-crm.json

echo "Restarting n8n to activate the imported webhooks..."
docker compose restart n8n

echo "Done. Submit a test lead (storefront Contact page or a published landing page),"
echo "then check the Executions tab at http://localhost:5678 for both workflow runs."
