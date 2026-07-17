"""Zoho OAuth client and lead sync - pure HTTP calls, all mocked here so
these run without a real Zoho account or network access."""

import httpx
import pytest

from app.core.config import settings
from app.services import zoho


def test_build_authorization_url_includes_required_params(monkeypatch):
    monkeypatch.setattr(settings, "ZOHO_CLIENT_ID", "client-123")
    monkeypatch.setattr(settings, "ZOHO_REDIRECT_URI", "https://api.example.com/api/integrations/zoho/callback")

    url = zoho.build_authorization_url(state="signed-state-token")

    assert url.startswith("https://accounts.zoho.com/oauth/v2/auth?")
    assert "client_id=client-123" in url
    assert "state=signed-state-token" in url
    assert "access_type=offline" in url


def test_exchange_code_for_tokens_parses_response(monkeypatch):
    def fake_post(url, data, timeout):
        request = httpx.Request("POST", url)
        return httpx.Response(
            200,
            json={
                "access_token": "access-1",
                "refresh_token": "refresh-1",
                "api_domain": "https://www.zohoapis.com",
                "expires_in": 3600,
            },
            request=request,
        )

    monkeypatch.setattr(httpx, "post", fake_post)

    token = zoho.exchange_code_for_tokens("auth-code")

    assert token.access_token == "access-1"
    assert token.refresh_token == "refresh-1"
    assert token.api_domain == "https://www.zohoapis.com"
    assert token.expires_in == 3600


def test_exchange_code_for_tokens_raises_on_zoho_error(monkeypatch):
    def fake_post(url, data, timeout):
        request = httpx.Request("POST", url)
        return httpx.Response(200, json={"error": "invalid_code"}, request=request)

    monkeypatch.setattr(httpx, "post", fake_post)

    with pytest.raises(zoho.ZohoOAuthError):
        zoho.exchange_code_for_tokens("bad-code")


def test_refresh_access_token_keeps_original_refresh_token_if_none_returned(monkeypatch):
    def fake_post(url, data, timeout):
        request = httpx.Request("POST", url)
        return httpx.Response(
            200,
            json={"access_token": "access-2", "api_domain": "https://www.zohoapis.com", "expires_in": 3600},
            request=request,
        )

    monkeypatch.setattr(httpx, "post", fake_post)

    token = zoho.refresh_access_token("refresh-1")

    assert token.access_token == "access-2"
    assert token.refresh_token == "refresh-1"


def test_zoho_service_real_sync_lead_success(monkeypatch):
    def fake_post(url, json, headers, timeout):
        assert headers["Authorization"] == "Zoho-oauthtoken access-1"
        request = httpx.Request("POST", url)
        return httpx.Response(
            200,
            json={"data": [{"status": "success", "details": {"id": "zcrm-lead-1"}}]},
            request=request,
        )

    monkeypatch.setattr(httpx, "post", fake_post)

    result = zoho.ZohoServiceReal().sync_lead(
        access_token="access-1",
        api_domain="https://www.zohoapis.com",
        lead={"name": "Alice", "email": "alice@example.com", "phone": "+15551234567", "source": "storefront"},
    )

    assert result.synced is True
    assert result.provider_record_id == "zcrm-lead-1"


def test_zoho_service_real_sync_lead_never_raises_on_failure(monkeypatch):
    def fake_post(*args, **kwargs):
        raise httpx.ConnectError("connection refused", request=httpx.Request("POST", "https://www.zohoapis.com"))

    monkeypatch.setattr(httpx, "post", fake_post)

    result = zoho.ZohoServiceReal().sync_lead(access_token="access-1", api_domain="https://www.zohoapis.com", lead={})

    assert result.synced is False
    assert result.error is not None


def test_get_zoho_service_returns_mock_when_unconfigured(monkeypatch):
    monkeypatch.setattr(settings, "ZOHO_CLIENT_ID", "")
    monkeypatch.setattr(settings, "ZOHO_CLIENT_SECRET", "")

    assert isinstance(zoho.get_zoho_service(), zoho.ZohoServiceMock)


def test_get_zoho_service_returns_real_when_configured(monkeypatch):
    monkeypatch.setattr(settings, "ZOHO_CLIENT_ID", "client-123")
    monkeypatch.setattr(settings, "ZOHO_CLIENT_SECRET", "secret-456")

    assert isinstance(zoho.get_zoho_service(), zoho.ZohoServiceReal)
