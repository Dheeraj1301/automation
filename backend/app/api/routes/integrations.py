"""Zoho CRM connect flow.

Split into two routers: `router` is org-scoped and authenticated (connect,
status, disconnect - mounted under /api/organizations/{org_id}/integrations
in main.py); `public_router` holds the OAuth callback, which Zoho redirects
the merchant's browser to directly with no Authorization header, so org
identity travels in the signed `state` param instead (mounted at
/api/integrations in main.py).
"""

import uuid

from fastapi import APIRouter, Depends, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.api.deps import get_membership, require_role
from app.core.config import settings
from app.core.logging import get_logger
from app.core.security import create_oauth_state, verify_oauth_state
from app.db.session import get_db
from app.models.membership import Membership
from app.schemas.integrations import ZohoConnectResponse, ZohoStatusResponse
from app.services import zoho, zoho_connection

logger = get_logger(__name__)

router = APIRouter()
public_router = APIRouter()

INTEGRATION_ROLES = ("owner", "admin")
OAUTH_STATE_PURPOSE = "zoho_connect"


@router.get("/zoho/connect", response_model=ZohoConnectResponse)
def connect_zoho(
    membership: Membership = Depends(require_role(*INTEGRATION_ROLES)),
) -> ZohoConnectResponse:
    state = create_oauth_state(
        organization_id=str(membership.organization_id), user_id=str(membership.user_id), purpose=OAUTH_STATE_PURPOSE
    )
    return ZohoConnectResponse(authorization_url=zoho.build_authorization_url(state))


@router.get("/zoho/status", response_model=ZohoStatusResponse)
def zoho_status(
    membership: Membership = Depends(get_membership),
    db: Session = Depends(get_db),
) -> ZohoStatusResponse:
    connection = zoho_connection.get_connection(db, membership.organization_id)
    if connection is None:
        return ZohoStatusResponse(connected=False)
    return ZohoStatusResponse(connected=True, connected_email=connection.connected_email)


@router.post("/zoho/disconnect", status_code=204)
def disconnect_zoho(
    membership: Membership = Depends(require_role(*INTEGRATION_ROLES)),
    db: Session = Depends(get_db),
) -> None:
    zoho_connection.clear_connection(db, membership.organization_id)


@public_router.get("/zoho/callback")
def zoho_callback(
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> RedirectResponse:
    redirect_base = f"{settings.FRONTEND_URL}/dashboard/settings"

    if error or not code or not state:
        return RedirectResponse(f"{redirect_base}?zoho=error")

    payload = verify_oauth_state(state, purpose=OAUTH_STATE_PURPOSE)
    if payload is None:
        return RedirectResponse(f"{redirect_base}?zoho=error")

    org_id = uuid.UUID(payload["org_id"])

    try:
        token = zoho.exchange_code_for_tokens(code)
    except Exception as exc:
        logger.warning("zoho_oauth_exchange_failed", organization_id=str(org_id), error=str(exc))
        return RedirectResponse(f"{redirect_base}?zoho=error")

    connected_email = zoho.fetch_connected_email(token.access_token)
    zoho_connection.save_connection(db, org_id, token, connected_email=connected_email)

    logger.info("zoho_connected", organization_id=str(org_id))
    return RedirectResponse(f"{redirect_base}?zoho=connected")
