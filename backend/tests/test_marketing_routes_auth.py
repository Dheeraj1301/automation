"""Auth-boundary tests for the Phase 5 landing-page and leads routes.

Same rationale as test_catalog_routes_auth.py: auth is rejected before
any DB session is touched, so these run without Postgres.
"""

import uuid

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

ORG_ID = uuid.uuid4()
PAGE_ID = uuid.uuid4()

MARKETING_ENDPOINTS = [
    ("GET", f"/api/organizations/{ORG_ID}/landing-pages"),
    ("POST", f"/api/organizations/{ORG_ID}/landing-pages"),
    ("GET", f"/api/organizations/{ORG_ID}/landing-pages/{PAGE_ID}"),
    ("PATCH", f"/api/organizations/{ORG_ID}/landing-pages/{PAGE_ID}"),
    ("DELETE", f"/api/organizations/{ORG_ID}/landing-pages/{PAGE_ID}"),
    ("GET", f"/api/organizations/{ORG_ID}/leads"),
    ("GET", f"/api/organizations/{ORG_ID}/ai-config"),
    ("PUT", f"/api/organizations/{ORG_ID}/ai-config"),
]


@pytest.mark.parametrize("method,path", MARKETING_ENDPOINTS)
def test_marketing_endpoints_require_authentication(method: str, path: str):
    response = client.request(method, path)
    assert response.status_code == 401
