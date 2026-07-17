"""Zoho CRM OAuth client and lead-sync interface.

Pure HTTP client - no DB access here (matches the other service interfaces
in this package). Per-org connection storage/refresh lives in
app.services.zoho_connection, which calls the functions below and hands
sync_lead() a connection's current access_token.
"""

from abc import abstractmethod
from dataclasses import dataclass
from urllib.parse import urlencode

import httpx

from app.core.config import settings
from app.core.logging import get_logger
from app.services.base import ExternalServiceInterface

logger = get_logger(__name__)

ZOHO_SCOPE = "ZohoCRM.modules.leads.CREATE,ZohoCRM.modules.leads.READ"


@dataclass
class CRMSyncResult:
    synced: bool
    provider_record_id: str | None
    error: str | None = None


@dataclass
class ZohoTokenResponse:
    access_token: str
    refresh_token: str | None
    api_domain: str
    expires_in: int


def build_authorization_url(state: str) -> str:
    params = {
        "scope": ZOHO_SCOPE,
        "client_id": settings.ZOHO_CLIENT_ID,
        "response_type": "code",
        "access_type": "offline",
        "redirect_uri": settings.ZOHO_REDIRECT_URI,
        "state": state,
        "prompt": "consent",
    }
    return f"{settings.ZOHO_ACCOUNTS_BASE_URL}/oauth/v2/auth?{urlencode(params)}"


def exchange_code_for_tokens(code: str) -> ZohoTokenResponse:
    response = httpx.post(
        f"{settings.ZOHO_ACCOUNTS_BASE_URL}/oauth/v2/token",
        data={
            "grant_type": "authorization_code",
            "client_id": settings.ZOHO_CLIENT_ID,
            "client_secret": settings.ZOHO_CLIENT_SECRET,
            "redirect_uri": settings.ZOHO_REDIRECT_URI,
            "code": code,
        },
        timeout=settings.ZOHO_API_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    data = response.json()
    if "error" in data:
        raise ZohoOAuthError(data["error"])
    return ZohoTokenResponse(
        access_token=data["access_token"],
        refresh_token=data.get("refresh_token"),
        api_domain=data["api_domain"],
        expires_in=data["expires_in"],
    )


def refresh_access_token(refresh_token: str) -> ZohoTokenResponse:
    response = httpx.post(
        f"{settings.ZOHO_ACCOUNTS_BASE_URL}/oauth/v2/token",
        data={
            "grant_type": "refresh_token",
            "client_id": settings.ZOHO_CLIENT_ID,
            "client_secret": settings.ZOHO_CLIENT_SECRET,
            "refresh_token": refresh_token,
        },
        timeout=settings.ZOHO_API_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    data = response.json()
    if "error" in data:
        raise ZohoOAuthError(data["error"])
    return ZohoTokenResponse(
        access_token=data["access_token"],
        refresh_token=refresh_token,
        api_domain=data["api_domain"],
        expires_in=data["expires_in"],
    )


class ZohoOAuthError(Exception):
    pass


def fetch_connected_email(access_token: str) -> str | None:
    """Best-effort lookup of the Zoho account email just connected, for
    display in the dashboard. Returns None on any failure - never blocks
    the connect flow over a cosmetic detail.
    """
    try:
        response = httpx.get(
            f"{settings.ZOHO_ACCOUNTS_BASE_URL}/oauth/user/info",
            headers={"Authorization": f"Zoho-oauthtoken {access_token}"},
            timeout=settings.ZOHO_API_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        return response.json().get("Email")
    except Exception as exc:
        logger.warning("zoho_user_info_failed", error=str(exc))
        return None


class ZohoService(ExternalServiceInterface):
    @abstractmethod
    def sync_lead(self, access_token: str, api_domain: str, lead: dict) -> CRMSyncResult: ...


class ZohoServiceMock(ZohoService):
    def sync_lead(self, access_token: str, api_domain: str, lead: dict) -> CRMSyncResult:
        logger.info("zoho_lead_sync_mocked", lead=lead)
        return CRMSyncResult(synced=True, provider_record_id=None)


class ZohoServiceReal(ZohoService):
    def sync_lead(self, access_token: str, api_domain: str, lead: dict) -> CRMSyncResult:
        payload = {
            "data": [
                {
                    "Last_Name": lead.get("name") or "Unknown",
                    "Email": lead.get("email") or None,
                    "Phone": lead.get("phone") or None,
                    "Lead_Source": "ProfitPilot Storefront",
                    "Description": f"Captured via {lead.get('source', 'storefront')} on ProfitPilot.",
                }
            ]
        }
        try:
            response = httpx.post(
                f"{api_domain}/crm/v3/Leads",
                json=payload,
                headers={"Authorization": f"Zoho-oauthtoken {access_token}"},
                timeout=settings.ZOHO_API_TIMEOUT_SECONDS,
            )
            response.raise_for_status()
            result = response.json()["data"][0]
            if result.get("status") != "success":
                raise ZohoOAuthError(result.get("message", "unknown error"))
            record_id = result["details"]["id"]
            logger.info("zoho_lead_synced", provider_record_id=record_id)
            return CRMSyncResult(synced=True, provider_record_id=record_id)
        except Exception as exc:
            logger.warning("zoho_lead_sync_failed", error=str(exc))
            return CRMSyncResult(synced=False, provider_record_id=None, error=str(exc))


def get_zoho_service() -> ZohoService:
    if settings.ZOHO_CLIENT_ID and settings.ZOHO_CLIENT_SECRET:
        return ZohoServiceReal()
    return ZohoServiceMock()


zoho_service: ZohoService = get_zoho_service()
