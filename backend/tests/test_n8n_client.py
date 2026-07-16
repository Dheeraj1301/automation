"""n8n being down or unconfigured must never block lead capture - these
tests verify trigger_new_lead_workflows swallows failures instead of
raising, without needing a real n8n instance."""

import httpx
import pytest

from app.services import n8n_client


def test_trigger_new_lead_workflows_does_not_raise_when_n8n_is_unreachable(monkeypatch):
    def fake_post(*args, **kwargs):
        raise httpx.ConnectError("connection refused", request=httpx.Request("POST", "http://n8n:5678/webhook/x"))

    monkeypatch.setattr(httpx, "post", fake_post)

    # Should not raise, even though every webhook call fails.
    n8n_client.trigger_new_lead_workflows("org-1", {"id": "lead-1", "name": "Alice"})


def test_trigger_new_lead_workflows_calls_both_webhook_paths(monkeypatch):
    called_paths = []

    def fake_post(url, json, timeout):
        called_paths.append(url)

        class FakeResponse:
            def raise_for_status(self):
                pass

        return FakeResponse()

    monkeypatch.setattr(httpx, "post", fake_post)

    n8n_client.trigger_new_lead_workflows("org-1", {"id": "lead-1", "name": "Alice"})

    assert any("new-lead-whatsapp" in p for p in called_paths)
    assert any("new-lead-crm" in p for p in called_paths)


def test_trigger_new_lead_workflows_does_not_raise_on_non_2xx_response(monkeypatch):
    def fake_post(*args, **kwargs):
        request = httpx.Request("POST", "http://n8n:5678/webhook/x")
        response = httpx.Response(status_code=404, request=request)
        response.raise_for_status = lambda: (_ for _ in ()).throw(
            httpx.HTTPStatusError("not found", request=request, response=response)
        )
        return response

    monkeypatch.setattr(httpx, "post", fake_post)

    n8n_client.trigger_new_lead_workflows("org-1", {"id": "lead-1", "name": "Alice"})
