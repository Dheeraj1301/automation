import pytest
from pydantic import ValidationError

from app.schemas.auth import SignupRequest

VALID = {
    "email": "merchant@example.com",
    "password": "password123",
    "full_name": "Alice Merchant",
    "organization_name": "Alice's Shop",
}


def test_signup_request_accepts_valid_e164_whatsapp_number():
    request = SignupRequest(**VALID, whatsapp_number="+14155552671")
    assert request.whatsapp_number == "+14155552671"


@pytest.mark.parametrize(
    "bad_number",
    ["4155552671", "+0155552671", "not-a-number", "+1", "+123456789012345678"],
)
def test_signup_request_rejects_invalid_whatsapp_number(bad_number):
    with pytest.raises(ValidationError):
        SignupRequest(**VALID, whatsapp_number=bad_number)


def test_signup_request_requires_whatsapp_number():
    with pytest.raises(ValidationError):
        SignupRequest(**VALID)
