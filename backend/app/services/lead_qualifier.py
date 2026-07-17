"""Optional AI-assisted refinement of lead qualification. Always falls
back to the pure heuristic in app/core/lead_qualification.py - a missing
ANTHROPIC_API_KEY, an API error, or an unparseable response all fall back
silently. Lead capture must never fail because of this."""

from app.core.lead_qualification import (
    VALID_BUYER_TYPES,
    VALID_QUALIFICATIONS,
    LeadQualificationInput,
    LeadQualificationResult,
    classify_lead_heuristically,
)
from app.core.logging import get_logger
from app.services.ai_provider import AIProviderNotConfiguredError, ai_provider

logger = get_logger(__name__)

CLASSIFICATION_SYSTEM_PROMPT = """You are a lead-qualification classifier for a sales platform.
Given a lead's details, respond with EXACTLY two lines and nothing else:
QUALIFICATION: <high_value|medium_value|low_value>
BUYER_TYPE: <wholesale|retail|distributor|importer|existing_customer>

Base your answer only on the information given - a company name and full
contact details suggest a higher-value B2B buyer; a bare name and email
with no company suggests a lower-value retail lead."""


def _parse_classification(text: str) -> LeadQualificationResult | None:
    qualification: str | None = None
    buyer_type: str | None = None

    for line in text.splitlines():
        line = line.strip()
        if line.upper().startswith("QUALIFICATION:"):
            value = line.split(":", 1)[1].strip().lower()
            if value in VALID_QUALIFICATIONS:
                qualification = value
        elif line.upper().startswith("BUYER_TYPE:"):
            value = line.split(":", 1)[1].strip().lower()
            if value in VALID_BUYER_TYPES:
                buyer_type = value

    if qualification and buyer_type:
        return LeadQualificationResult(qualification=qualification, buyer_type=buyer_type)
    return None


def classify_lead(data: LeadQualificationInput) -> LeadQualificationResult:
    heuristic_result = classify_lead_heuristically(data)

    try:
        prompt = (
            f"Company: {data.company or 'not provided'}\n"
            f"Phone provided: {'yes' if data.phone else 'no'}\n"
            f"Country: {data.country or 'not provided'}\n"
            f"Source: {data.source}"
        )
        reply = ai_provider.generate_reply(
            CLASSIFICATION_SYSTEM_PROMPT, [{"role": "user", "content": prompt}]
        )
        parsed = _parse_classification(reply)
        if parsed is not None:
            return parsed
    except AIProviderNotConfiguredError:
        pass
    except Exception:
        logger.warning("lead_ai_classification_failed")

    return heuristic_result
