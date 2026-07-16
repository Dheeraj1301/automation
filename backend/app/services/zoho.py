"""Zoho CRM integration interface. Real OAuth implementation lands in
Phase 12 (ZohoServiceReal) - calling code should only ever depend on
ZohoService, so that swap is a one-line change below.
"""

from abc import abstractmethod
from dataclasses import dataclass

from app.core.logging import get_logger
from app.services.base import ExternalServiceInterface

logger = get_logger(__name__)


@dataclass
class CRMSyncResult:
    synced: bool
    provider_record_id: str | None


class ZohoService(ExternalServiceInterface):
    @abstractmethod
    def sync_lead(self, organization_id: str, lead: dict) -> CRMSyncResult: ...


class ZohoServiceMock(ZohoService):
    def sync_lead(self, organization_id: str, lead: dict) -> CRMSyncResult:
        logger.info("zoho_lead_sync_mocked", organization_id=organization_id, lead=lead)
        return CRMSyncResult(synced=True, provider_record_id=None)


zoho_service: ZohoService = ZohoServiceMock()
