"""Everything that should happen after a lead is captured, run as a
background task so the (often unauthenticated, storefront-facing) request
that created the lead isn't held open for it - each of these is a network
call to a service that may be slow or down, and none of them should ever
affect what the visitor sees.

Runs outside the request's lifespan, so it opens its own DB session rather
than reusing the request-scoped one.
"""

import uuid

from app.db.session import SessionLocal
from app.services.n8n_client import trigger_new_lead_workflows
from app.services.zoho import zoho_service
from app.services.zoho_connection import get_fresh_connection


def run_lead_automation(organization_id: str, lead: dict) -> None:
    trigger_new_lead_workflows(organization_id, lead)

    db = SessionLocal()
    try:
        connection = get_fresh_connection(db, uuid.UUID(organization_id))
        if connection is not None:
            zoho_service.sync_lead(connection.access_token, connection.api_domain, lead)
    finally:
        db.close()
