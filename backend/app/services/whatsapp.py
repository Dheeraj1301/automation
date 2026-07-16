"""WhatsApp Business Platform integration interface. Real implementation
lands in Phase 11 (WhatsAppServiceReal) - calling code should only ever
depend on WhatsAppService, so that swap is a one-line change below.
"""

from abc import abstractmethod
from dataclasses import dataclass

from app.core.logging import get_logger
from app.services.base import ExternalServiceInterface

logger = get_logger(__name__)


@dataclass
class WhatsAppSendResult:
    sent: bool
    provider_message_id: str | None


class WhatsAppService(ExternalServiceInterface):
    @abstractmethod
    def send_template_message(
        self, organization_id: str, phone_number: str, template_name: str, params: dict[str, str]
    ) -> WhatsAppSendResult: ...


class WhatsAppServiceMock(WhatsAppService):
    def send_template_message(
        self, organization_id: str, phone_number: str, template_name: str, params: dict[str, str]
    ) -> WhatsAppSendResult:
        logger.info(
            "whatsapp_message_mocked",
            organization_id=organization_id,
            phone_number=phone_number,
            template_name=template_name,
            params=params,
        )
        return WhatsAppSendResult(sent=True, provider_message_id=None)


whatsapp_service: WhatsAppService = WhatsAppServiceMock()
