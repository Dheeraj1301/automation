from app.core.lead_qualification import LeadQualificationInput, classify_lead_heuristically
from app.models.lead import BUYER_TYPE_RETAIL, BUYER_TYPE_WHOLESALE, QUALIFICATION_HIGH, QUALIFICATION_LOW, QUALIFICATION_MEDIUM


def test_full_details_with_company_is_high_value_wholesale():
    result = classify_lead_heuristically(
        LeadQualificationInput(company="Acme Imports", phone="+1234567890", country="US", source="storefront")
    )
    assert result.qualification == QUALIFICATION_HIGH
    assert result.buyer_type == BUYER_TYPE_WHOLESALE


def test_company_only_is_medium_value_wholesale():
    result = classify_lead_heuristically(
        LeadQualificationInput(company="Acme Imports", phone=None, country=None, source="storefront")
    )
    assert result.qualification == QUALIFICATION_MEDIUM
    assert result.buyer_type == BUYER_TYPE_WHOLESALE


def test_phone_only_no_company_is_medium_value_retail():
    result = classify_lead_heuristically(
        LeadQualificationInput(company=None, phone="+1234567890", country=None, source="storefront")
    )
    assert result.qualification == QUALIFICATION_MEDIUM
    assert result.buyer_type == BUYER_TYPE_RETAIL


def test_name_and_email_only_is_low_value_retail():
    result = classify_lead_heuristically(
        LeadQualificationInput(company=None, phone=None, country=None, source="storefront")
    )
    assert result.qualification == QUALIFICATION_LOW
    assert result.buyer_type == BUYER_TYPE_RETAIL


def test_blank_company_string_is_treated_as_missing():
    result = classify_lead_heuristically(
        LeadQualificationInput(company="   ", phone=None, country=None, source="storefront")
    )
    assert result.buyer_type == BUYER_TYPE_RETAIL
