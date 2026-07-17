"""Auth-boundary tests for the Zoho integration routes. Same rationale as
test_marketing_routes_auth.py: auth is rejected before any DB session is
touched, so these run without Postgres.

The OAuth callback itself (/api/integrations/zoho/callback) is
intentionally NOT in this list - Zoho redirects the merchant's browser
there directly with no Authorization header, so it must stay public;
identity travels in the signed `state` param instead.
"""

import uuid

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

ORG_ID = uuid.uuid4()

INTEGRATION_ENDPOINTS = [
    ("GET", f"/api/organizations/{ORG_ID}/integrations/zoho/connect"),
    ("GET", f"/api/organizations/{ORG_ID}/integrations/zoho/status"),
    ("POST", f"/api/organizations/{ORG_ID}/integrations/zoho/disconnect"),
]


@pytest.mark.parametrize("method,path", INTEGRATION_ENDPOINTS)
def test_integration_endpoints_require_authentication(method: str, path: str):
    response = client.request(method, path)
    assert response.status_code == 401


def test_callback_does_not_require_authentication_but_rejects_bad_state():
    response = client.get(
        "/api/integrations/zoho/callback",
        params={"code": "some-code", "state": "not-a-real-token"},
        follow_redirects=False,
    )
    # No 401/403 - it's a public endpoint. Bad state redirects to the
    # dashboard with an error flag rather than raising.
    assert response.status_code in (302, 307)
    assert "zoho=error" in response.headers["location"]
