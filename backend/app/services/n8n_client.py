"""Triggers n8n webhook workflows for lead-driven automation.

n8n owns the workflow logic (log -> mock WhatsApp send / mock CRM sync -
see n8n/workflows/); this module's only job is firing the two webhooks and
never letting a down or unconfigured n8n instance block lead capture.
"""

import httpx

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


def _trigger_webhook(webhook_path: str, payload: dict) -> None:
    url = f"{settings.N8N_BASE_URL}/webhook/{webhook_path}"
    try:
        response = httpx.post(url, json=payload, timeout=settings.N8N_WEBHOOK_TIMEOUT_SECONDS)
        response.raise_for_status()
        logger.info("n8n_workflow_triggered", webhook_path=webhook_path)
    except Exception as exc:
        logger.warning("n8n_workflow_trigger_failed", webhook_path=webhook_path, error=str(exc))


def trigger_new_lead_workflows(organization_id: str, lead: dict) -> None:
    payload = {"organization_id": organization_id, "lead": lead}
    _trigger_webhook(settings.N8N_WEBHOOK_PATH_LEAD_WHATSAPP, payload)
    _trigger_webhook(settings.N8N_WEBHOOK_PATH_LEAD_CRM, payload)
