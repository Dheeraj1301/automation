import pytest
from pydantic import ValidationError

from app.schemas.prospecting import (
    OutreachDraftGenerateRequest,
    ProspectBulkCreate,
    ProspectCreate,
    ProspectListCreate,
    ProspectUpdate,
)


def test_prospect_list_create_requires_name_and_product_name():
    with pytest.raises(ValidationError):
        ProspectListCreate(name="", product_name="Widget Pro")
    with pytest.raises(ValidationError):
        ProspectListCreate(name="Campaign", product_name="")


def test_prospect_list_create_defaults_preferred_language_to_english():
    data = ProspectListCreate(name="Campaign", product_name="Widget Pro")
    assert data.preferred_language == "English"


def test_prospect_bulk_create_requires_at_least_one_prospect():
    with pytest.raises(ValidationError):
        ProspectBulkCreate(prospects=[])


def test_prospect_bulk_create_caps_at_200():
    prospects = [ProspectCreate(company_name=f"Company {i}") for i in range(201)]
    with pytest.raises(ValidationError):
        ProspectBulkCreate(prospects=prospects)


def test_prospect_update_rejects_invalid_follow_up_status():
    with pytest.raises(ValidationError):
        ProspectUpdate(follow_up_status="maybe_later")


def test_prospect_update_accepts_valid_follow_up_status():
    update = ProspectUpdate(follow_up_status="qualified")
    assert update.follow_up_status == "qualified"


def test_outreach_draft_generate_request_rejects_unknown_channel():
    with pytest.raises(ValidationError):
        OutreachDraftGenerateRequest(channel="carrier_pigeon")


@pytest.mark.parametrize("channel", ["email", "linkedin", "contact_form"])
def test_outreach_draft_generate_request_accepts_known_channels(channel):
    assert OutreachDraftGenerateRequest(channel=channel).channel == channel
