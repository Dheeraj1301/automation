"""Pure heuristic lead qualification. Always runs, regardless of whether
the AI Sales Agent is configured - app/services/lead_qualifier.py layers
an optional AI-assisted refinement on top of this and falls back here on
any failure, so lead capture is never blocked by AI availability.
"""

from dataclasses import dataclass

from app.models.lead import (
    BUYER_TYPE_RETAIL,
    BUYER_TYPE_WHOLESALE,
    QUALIFICATION_HIGH,
    QUALIFICATION_LOW,
    QUALIFICATION_MEDIUM,
)

VALID_QUALIFICATIONS = {QUALIFICATION_HIGH, QUALIFICATION_MEDIUM, QUALIFICATION_LOW}
VALID_BUYER_TYPES = {
    BUYER_TYPE_WHOLESALE,
    BUYER_TYPE_RETAIL,
    "distributor",
    "importer",
    "existing_customer",
}


@dataclass
class LeadQualificationInput:
    company: str | None
    phone: str | None
    country: str | None
    source: str


@dataclass
class LeadQualificationResult:
    qualification: str
    buyer_type: str


def classify_lead_heuristically(data: LeadQualificationInput) -> LeadQualificationResult:
    has_company = bool(data.company and data.company.strip())
    has_phone = bool(data.phone and data.phone.strip())

    buyer_type = BUYER_TYPE_WHOLESALE if has_company else BUYER_TYPE_RETAIL

    if has_company and has_phone:
        qualification = QUALIFICATION_HIGH
    elif has_company or has_phone:
        qualification = QUALIFICATION_MEDIUM
    else:
        qualification = QUALIFICATION_LOW

    return LeadQualificationResult(qualification=qualification, buyer_type=buyer_type)
