"""Auth-boundary tests for catalog routes.

These don't touch a real database: FastAPI's dependency chain rejects
unauthenticated requests before any DB session is used, so we can verify
routing + auth wiring for every new endpoint without Postgres running.
"""

import uuid

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

ORG_ID = uuid.uuid4()
PRODUCT_ID = uuid.uuid4()
CATEGORY_ID = uuid.uuid4()
VARIANT_ID = uuid.uuid4()
IMAGE_ID = uuid.uuid4()

CATALOG_ENDPOINTS = [
    ("GET", f"/api/organizations/{ORG_ID}/categories"),
    ("POST", f"/api/organizations/{ORG_ID}/categories"),
    ("DELETE", f"/api/organizations/{ORG_ID}/categories/{CATEGORY_ID}"),
    ("GET", f"/api/organizations/{ORG_ID}/products"),
    ("POST", f"/api/organizations/{ORG_ID}/products"),
    ("GET", f"/api/organizations/{ORG_ID}/products/{PRODUCT_ID}"),
    ("PATCH", f"/api/organizations/{ORG_ID}/products/{PRODUCT_ID}"),
    ("DELETE", f"/api/organizations/{ORG_ID}/products/{PRODUCT_ID}"),
    ("POST", f"/api/organizations/{ORG_ID}/products/{PRODUCT_ID}/variants"),
    ("PATCH", f"/api/organizations/{ORG_ID}/products/{PRODUCT_ID}/variants/{VARIANT_ID}"),
    ("DELETE", f"/api/organizations/{ORG_ID}/products/{PRODUCT_ID}/variants/{VARIANT_ID}"),
    ("POST", f"/api/organizations/{ORG_ID}/products/{PRODUCT_ID}/images"),
    ("DELETE", f"/api/organizations/{ORG_ID}/products/{PRODUCT_ID}/images/{IMAGE_ID}"),
    ("POST", f"/api/organizations/{ORG_ID}/products/bulk-import"),
]


@pytest.mark.parametrize("method,path", CATALOG_ENDPOINTS)
def test_catalog_endpoints_require_authentication(method: str, path: str):
    response = client.request(method, path)
    # 401 (not 404/422) proves the route resolved to a real handler and
    # the auth dependency ran - including POST bulk-import, which must
    # not be shadowed by the sibling {product_id} route.
    assert response.status_code == 401
