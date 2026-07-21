"""Auth-boundary tests for the prospecting routes. Same rationale as
test_marketing_routes_auth.py: auth is rejected before any DB session is
touched, so these run without Postgres."""

import uuid

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

ORG_ID = uuid.uuid4()
LIST_ID = uuid.uuid4()
PROSPECT_ID = uuid.uuid4()
DRAFT_ID = uuid.uuid4()

PROSPECTING_ENDPOINTS = [
    ("POST", f"/api/organizations/{ORG_ID}/prospecting/lists"),
    ("GET", f"/api/organizations/{ORG_ID}/prospecting/lists"),
    ("DELETE", f"/api/organizations/{ORG_ID}/prospecting/lists/{LIST_ID}"),
    ("POST", f"/api/organizations/{ORG_ID}/prospecting/lists/{LIST_ID}/prospects"),
    ("GET", f"/api/organizations/{ORG_ID}/prospecting/lists/{LIST_ID}/prospects"),
    ("GET", f"/api/organizations/{ORG_ID}/prospecting/lists/{LIST_ID}/export"),
    ("GET", f"/api/organizations/{ORG_ID}/prospecting/prospects/{PROSPECT_ID}"),
    ("PATCH", f"/api/organizations/{ORG_ID}/prospecting/prospects/{PROSPECT_ID}"),
    ("POST", f"/api/organizations/{ORG_ID}/prospecting/prospects/{PROSPECT_ID}/reanalyze"),
    ("POST", f"/api/organizations/{ORG_ID}/prospecting/prospects/{PROSPECT_ID}/outreach"),
    ("GET", f"/api/organizations/{ORG_ID}/prospecting/prospects/{PROSPECT_ID}/outreach"),
    ("PATCH", f"/api/organizations/{ORG_ID}/prospecting/outreach/{DRAFT_ID}"),
    ("POST", f"/api/organizations/{ORG_ID}/prospecting/outreach/{DRAFT_ID}/mark-sent"),
    ("GET", f"/api/organizations/{ORG_ID}/prospecting/dashboard"),
]


@pytest.mark.parametrize("method,path", PROSPECTING_ENDPOINTS)
def test_prospecting_endpoints_require_authentication(method: str, path: str):
    response = client.request(method, path)
    assert response.status_code == 401
