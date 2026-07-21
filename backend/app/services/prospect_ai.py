"""AI company understanding + lead scoring for prospects. Builds on the
same Anthropic integration the AI Sales Agent uses (app/services/ai_provider.py)
- one Claude integration, reused everywhere in the codebase.
"""

import json
import re

from app.models.prospect_list import ProspectList
from app.services.ai_provider import AIProviderNotConfiguredError, ai_provider

SCORE_CRITERIA = (
    "industry_match",
    "product_relevance",
    "company_size_fit",
    "website_quality",
    "location_match",
    "business_activity",
    "buying_probability",
)

def build_icp(prospect_list: ProspectList | None) -> dict:
    """The merchant's ideal-customer-profile, as a plain dict - shared
    input shape for both AI analysis/scoring and outreach draft generation."""
    if prospect_list is None:
        return {}
    return {
        "product_name": prospect_list.product_name,
        "product_description": prospect_list.product_description,
        "target_industry": prospect_list.target_industry,
        "target_country": prospect_list.target_country,
        "target_state": prospect_list.target_state,
        "target_city": prospect_list.target_city,
        "target_company_size": prospect_list.target_company_size,
        "buyer_persona": prospect_list.buyer_persona,
    }


EMPTY_SUMMARY = {
    "what_they_sell": "",
    "customers": "",
    "pain_points": "",
    "company_type": "",
    "potential_interest": "",
    "buying_intent": "unknown",
    "partnership_opportunities": "",
}


def analyze_prospect(company_name: str, website_text: str, icp: dict) -> dict:
    """Returns {"summary": {...}, "score": int | None, "score_breakdown": {...}}.

    Falls back to an empty/unscored result on any AI failure or when no
    website text was crawled - a company not being auto-analyzed shouldn't
    block the merchant from seeing and reviewing it manually.
    """
    fallback = {"summary": dict(EMPTY_SUMMARY), "score": None, "score_breakdown": {}}

    if not website_text.strip():
        return fallback

    prompt = f"""Analyze this company as a potential customer for the merchant described below. Respond with ONLY a JSON object, no other text, in exactly this shape:

{{
  "summary": {{
    "what_they_sell": "1-2 sentences",
    "customers": "who their customers appear to be",
    "pain_points": "likely pain points this company has",
    "company_type": "e.g. manufacturer, retailer, distributor, agency",
    "potential_interest": "why they might care about the merchant's product",
    "buying_intent": "low, medium, or high",
    "partnership_opportunities": "any partnership angle, or 'None apparent'"
  }},
  "score": 0-100 overall lead score,
  "score_breakdown": {{
    "industry_match": 0-100,
    "product_relevance": 0-100,
    "company_size_fit": 0-100,
    "website_quality": 0-100,
    "location_match": 0-100,
    "business_activity": 0-100,
    "buying_probability": 0-100
  }}
}}

MERCHANT'S PRODUCT:
Name: {icp.get("product_name", "")}
Description: {icp.get("product_description", "")}
Target industry: {icp.get("target_industry", "")}
Target location: {", ".join(filter(None, [icp.get("target_city"), icp.get("target_state"), icp.get("target_country")]))}
Target company size: {icp.get("target_company_size", "")}
Buyer persona: {icp.get("buyer_persona", "")}

COMPANY BEING EVALUATED: {company_name}

COMPANY WEBSITE CONTENT (crawled from their own public pages):
{website_text[:6000]}"""

    try:
        reply = ai_provider.generate_reply(
            system_prompt=(
                "You are a B2B sales intelligence analyst. You only use the information given to you - "
                "never invent facts about a company. Respond with only the requested JSON."
            ),
            history=[{"role": "user", "content": prompt}],
        )
        parsed = _extract_json(reply)
        if parsed is None:
            return fallback

        summary = {**EMPTY_SUMMARY, **parsed.get("summary", {})}
        score = parsed.get("score")
        score = max(0, min(100, int(score))) if isinstance(score, (int, float)) else None
        breakdown = {
            key: max(0, min(100, int(value)))
            for key, value in (parsed.get("score_breakdown") or {}).items()
            if key in SCORE_CRITERIA and isinstance(value, (int, float))
        }
        return {"summary": summary, "score": score, "score_breakdown": breakdown}

    except AIProviderNotConfiguredError:
        return fallback
    except Exception:
        return fallback


def _extract_json(text: str) -> dict | None:
    text = text.strip()
    # Claude sometimes wraps JSON in a markdown code fence despite instructions.
    fence_match = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.DOTALL)
    candidate = fence_match.group(1) if fence_match else text
    try:
        return json.loads(candidate)
    except (json.JSONDecodeError, TypeError):
        brace_match = re.search(r"\{.*\}", text, re.DOTALL)
        if brace_match:
            try:
                return json.loads(brace_match.group(0))
            except json.JSONDecodeError:
                return None
        return None
