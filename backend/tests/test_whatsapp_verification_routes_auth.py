"""Auth-boundary tests for the WhatsApp verification routes. Same rationale
as test_marketing_routes_auth.py: auth is rejected before any DB session is
touched, so these run without Postgres."""

import uuid

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

ORG_ID = uuid.uuid4()

WHATSAPP_VERIFICATION_ENDPOINTS = [
    ("POST", f"/api/organizations/{ORG_ID}/whatsapp-verification/send"),
    ("POST", f"/api/organizations/{ORG_ID}/whatsapp-verification/confirm"),
]


@pytest.mark.parametrize("method,path", WHATSAPP_VERIFICATION_ENDPOINTS)
def test_whatsapp_verification_endpoints_require_authentication(method: str, path: str):
    response = client.request(method, path)
    assert response.status_code == 401
