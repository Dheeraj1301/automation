"""Auth-boundary tests for storefront config routes. Same rationale as
test_marketing_routes_auth.py: auth is rejected before any DB session is
touched, so these run without Postgres."""

import uuid

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

ORG_ID = uuid.uuid4()

STOREFRONT_CONFIG_ENDPOINTS = [
    ("GET", f"/api/organizations/{ORG_ID}/storefront-config"),
    ("PUT", f"/api/organizations/{ORG_ID}/storefront-config"),
    ("GET", f"/api/organizations/{ORG_ID}/storefront-config/recommend-theme"),
]


@pytest.mark.parametrize("method,path", STOREFRONT_CONFIG_ENDPOINTS)
def test_storefront_config_endpoints_require_authentication(method: str, path: str):
    response = client.request(method, path)
    assert response.status_code == 401
