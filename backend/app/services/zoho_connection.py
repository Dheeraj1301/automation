"""Per-organization Zoho connection storage, on top of the existing
org-scoped Setting table (same pattern Phase 6's AI Config uses) rather than
a dedicated model+migration. Tokens are Fernet-encrypted before storage.
"""

import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.crypto import decrypt, encrypt
from app.core.logging import get_logger
from app.models.setting import Setting
from app.services import zoho

logger = get_logger(__name__)

ZOHO_SETTING_KEY = "zoho_integration"

# Refresh proactively before expiry rather than waiting for a 401, since a
# failed sync is silently dropped (never blocks lead capture) and we'd
# rather not waste that attempt.
REFRESH_MARGIN = timedelta(minutes=5)


@dataclass
class ZohoConnection:
    access_token: str
    refresh_token: str
    api_domain: str
    expires_at: datetime
    connected_email: str | None


def _get_setting(db: Session, org_id: uuid.UUID) -> Setting | None:
    return db.query(Setting).filter(Setting.organization_id == org_id, Setting.key == ZOHO_SETTING_KEY).first()


def get_connection(db: Session, org_id: uuid.UUID) -> ZohoConnection | None:
    setting = _get_setting(db, org_id)
    if setting is None or not setting.value.get("access_token"):
        return None
    access_token = decrypt(setting.value["access_token"])
    refresh_token = decrypt(setting.value["refresh_token"])
    if access_token is None or refresh_token is None:
        logger.warning("zoho_token_decrypt_failed", organization_id=str(org_id))
        return None
    return ZohoConnection(
        access_token=access_token,
        refresh_token=refresh_token,
        api_domain=setting.value["api_domain"],
        expires_at=datetime.fromisoformat(setting.value["expires_at"]),
        connected_email=setting.value.get("connected_email"),
    )


def save_connection(
    db: Session,
    org_id: uuid.UUID,
    token: "zoho.ZohoTokenResponse",
    connected_email: str | None = None,
    existing_refresh_token: str | None = None,
) -> ZohoConnection:
    refresh_token = token.refresh_token or existing_refresh_token
    if refresh_token is None:
        raise ValueError("No refresh token available to store (first connect must return one)")

    expires_at = datetime.now(timezone.utc) + timedelta(seconds=token.expires_in)
    value = {
        "access_token": encrypt(token.access_token),
        "refresh_token": encrypt(refresh_token),
        "api_domain": token.api_domain,
        "expires_at": expires_at.isoformat(),
        "connected_email": connected_email,
    }

    setting = _get_setting(db, org_id)
    if setting is None:
        setting = Setting(organization_id=org_id, key=ZOHO_SETTING_KEY, value=value)
        db.add(setting)
    else:
        if connected_email is None:
            value["connected_email"] = setting.value.get("connected_email")
        setting.value = value
    db.commit()

    return ZohoConnection(
        access_token=token.access_token,
        refresh_token=refresh_token,
        api_domain=token.api_domain,
        expires_at=expires_at,
        connected_email=value["connected_email"],
    )


def clear_connection(db: Session, org_id: uuid.UUID) -> None:
    setting = _get_setting(db, org_id)
    if setting is not None:
        db.delete(setting)
        db.commit()


def get_fresh_connection(db: Session, org_id: uuid.UUID) -> ZohoConnection | None:
    """Returns a connection with a valid access_token, refreshing if it's
    expired or about to be. Returns None if there's no connection, or if a
    needed refresh fails (e.g. the merchant revoked access on Zoho's side).
    """
    connection = get_connection(db, org_id)
    if connection is None:
        return None

    if datetime.now(timezone.utc) < connection.expires_at - REFRESH_MARGIN:
        return connection

    try:
        token = zoho.refresh_access_token(connection.refresh_token)
    except Exception as exc:
        logger.warning("zoho_token_refresh_failed", organization_id=str(org_id), error=str(exc))
        return None

    return save_connection(
        db, org_id, token, connected_email=connection.connected_email, existing_refresh_token=connection.refresh_token
    )
