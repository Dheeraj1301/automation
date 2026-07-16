"""Auth-boundary tests for the Phase 7 AI Sales Agent routes.

Same rationale as test_catalog_routes_auth.py: auth is rejected before any
DB session or Anthropic API call happens, so these run without Postgres or
an ANTHROPIC_API_KEY.
"""

import uuid

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

ORG_ID = uuid.uuid4()
CONVERSATION_ID = uuid.uuid4()

AI_AGENT_ENDPOINTS = [
    ("POST", f"/api/organizations/{ORG_ID}/ai/chat"),
    ("GET", f"/api/organizations/{ORG_ID}/ai/conversations"),
    ("GET", f"/api/organizations/{ORG_ID}/ai/conversations/{CONVERSATION_ID}"),
]


@pytest.mark.parametrize("method,path", AI_AGENT_ENDPOINTS)
def test_ai_agent_endpoints_require_authentication(method: str, path: str):
    response = client.request(method, path)
    assert response.status_code == 401
