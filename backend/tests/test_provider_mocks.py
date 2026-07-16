"""Unit tests for the Phase 8 mock provider services. These verify the
calling contract (return shape) that InstagramServiceReal / WhatsAppServiceReal
/ ZohoServiceReal must also satisfy in later phases."""

from app.services.instagram import InstagramServiceMock
from app.services.whatsapp import WhatsAppServiceMock
from app.services.zoho import ZohoServiceMock


def test_instagram_mock_reports_sent_without_calling_any_api():
    result = InstagramServiceMock().send_direct_message(
        organization_id="org-1", recipient_id="ig-user-1", message="Thanks for your comment!"
    )
    assert result.sent is True
    assert result.provider_message_id is None


def test_whatsapp_mock_reports_sent_without_calling_any_api():
    result = WhatsAppServiceMock().send_template_message(
        organization_id="org-1",
        phone_number="+15551234567",
        template_name="new_lead_welcome",
        params={"name": "Alice"},
    )
    assert result.sent is True
    assert result.provider_message_id is None


def test_zoho_mock_reports_synced_without_calling_any_api():
    result = ZohoServiceMock().sync_lead(organization_id="org-1", lead={"name": "Alice", "email": "a@example.com"})
    assert result.synced is True
    assert result.provider_record_id is None
