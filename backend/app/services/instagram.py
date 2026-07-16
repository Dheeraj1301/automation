"""Instagram integration interface. Real OAuth/webhook implementation lands
in Phase 10 (InstagramServiceReal) - calling code should only ever depend
on InstagramService, never on the mock directly, so that swap is a one-line
change in the instagram_service assignment below.
"""

from abc import abstractmethod
from dataclasses import dataclass

from app.core.logging import get_logger
from app.services.base import ExternalServiceInterface

logger = get_logger(__name__)


@dataclass
class DirectMessageResult:
    sent: bool
    provider_message_id: str | None


class InstagramService(ExternalServiceInterface):
    @abstractmethod
    def send_direct_message(self, organization_id: str, recipient_id: str, message: str) -> DirectMessageResult: ...


class InstagramServiceMock(InstagramService):
    def send_direct_message(self, organization_id: str, recipient_id: str, message: str) -> DirectMessageResult:
        logger.info(
            "instagram_dm_mocked",
            organization_id=organization_id,
            recipient_id=recipient_id,
            message=message,
        )
        return DirectMessageResult(sent=True, provider_message_id=None)


instagram_service: InstagramService = InstagramServiceMock()
