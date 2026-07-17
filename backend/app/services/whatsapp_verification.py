"""WhatsApp business number verification for organizations, on top of the
existing Setting table (same pattern as zoho_connection.py) rather than a
dedicated model.

Sends the OTP via whatsapp_service.send_template_message - with the mock
provider that just logs it (visible in `docker compose logs backend`),
same as every other not-yet-configured integration in this codebase. Once
WhatsAppServiceReal exists, OTPs get delivered for real with no changes
here.
"""

import secrets
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.logging import get_logger
from app.models.organization import Organization
from app.models.setting import Setting
from app.services.whatsapp import whatsapp_service

logger = get_logger(__name__)

WHATSAPP_VERIFICATION_KEY = "whatsapp_verification"
OTP_LENGTH = 6
OTP_EXPIRY_MINUTES = 10
MAX_ATTEMPTS = 5


class OTPError(Exception):
    pass


def _get_setting(db: Session, org_id: uuid.UUID) -> Setting | None:
    return (
        db.query(Setting)
        .filter(Setting.organization_id == org_id, Setting.key == WHATSAPP_VERIFICATION_KEY)
        .first()
    )


def _generate_code() -> str:
    return f"{secrets.randbelow(10**OTP_LENGTH):0{OTP_LENGTH}d}"


def send_verification_code(db: Session, organization: Organization) -> None:
    if not organization.whatsapp_number:
        raise OTPError("Organization has no WhatsApp number on file")

    code = _generate_code()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRY_MINUTES)
    value = {"code": code, "expires_at": expires_at.isoformat(), "attempts": 0}

    setting = _get_setting(db, organization.id)
    if setting is None:
        setting = Setting(organization_id=organization.id, key=WHATSAPP_VERIFICATION_KEY, value=value)
        db.add(setting)
    else:
        setting.value = value
    db.commit()

    whatsapp_service.send_template_message(
        organization_id=str(organization.id),
        phone_number=organization.whatsapp_number,
        template_name="signup_verification_code",
        params={"code": code},
    )


@dataclass
class VerifyResult:
    verified: bool
    error: str | None = None


def confirm_verification_code(db: Session, organization: Organization, code: str) -> VerifyResult:
    setting = _get_setting(db, organization.id)
    if setting is None:
        return VerifyResult(verified=False, error="No verification code was requested for this number")

    stored = setting.value
    if stored["attempts"] >= MAX_ATTEMPTS:
        return VerifyResult(verified=False, error="Too many attempts. Request a new code")

    expires_at = datetime.fromisoformat(stored["expires_at"])
    if datetime.now(timezone.utc) > expires_at:
        return VerifyResult(verified=False, error="Code expired. Request a new one")

    stored["attempts"] += 1
    setting.value = stored
    db.commit()

    if not secrets.compare_digest(code, stored["code"]):
        return VerifyResult(verified=False, error="Incorrect code")

    organization.whatsapp_verified = True
    db.delete(setting)
    db.commit()

    logger.info("whatsapp_number_verified", organization_id=str(organization.id))
    return VerifyResult(verified=True)
