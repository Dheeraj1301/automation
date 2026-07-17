"""AI-assisted lead classification must always fall back to the pure
heuristic - missing API key, API errors, and unparseable model output all
degrade gracefully rather than blocking lead capture."""

from app.core.lead_qualification import LeadQualificationInput, classify_lead_heuristically
from app.services import ai_provider as ai_provider_module
from app.services import lead_qualifier
from app.services.ai_provider import AIProviderNotConfiguredError


def test_classify_lead_falls_back_when_ai_not_configured(monkeypatch):
    def fake_generate_reply(system_prompt, history):
        raise AIProviderNotConfiguredError("not configured")

    monkeypatch.setattr(ai_provider_module.ai_provider, "generate_reply", fake_generate_reply)

    data = LeadQualificationInput(company="Acme", phone="+1", country="US", source="storefront")
    result = lead_qualifier.classify_lead(data)

    assert result == classify_lead_heuristically(data)


def test_classify_lead_falls_back_on_unparseable_ai_response(monkeypatch):
    def fake_generate_reply(system_prompt, history):
        return "I'm not sure, this lead could go either way!"

    monkeypatch.setattr(ai_provider_module.ai_provider, "generate_reply", fake_generate_reply)

    data = LeadQualificationInput(company=None, phone=None, country=None, source="storefront")
    result = lead_qualifier.classify_lead(data)

    assert result == classify_lead_heuristically(data)


def test_classify_lead_uses_ai_result_when_well_formed(monkeypatch):
    def fake_generate_reply(system_prompt, history):
        return "QUALIFICATION: high_value\nBUYER_TYPE: distributor"

    monkeypatch.setattr(ai_provider_module.ai_provider, "generate_reply", fake_generate_reply)

    data = LeadQualificationInput(company=None, phone=None, country=None, source="storefront")
    result = lead_qualifier.classify_lead(data)

    assert result.qualification == "high_value"
    assert result.buyer_type == "distributor"


def test_classify_lead_falls_back_when_ai_raises_unexpected_error(monkeypatch):
    def fake_generate_reply(system_prompt, history):
        raise RuntimeError("network exploded")

    monkeypatch.setattr(ai_provider_module.ai_provider, "generate_reply", fake_generate_reply)

    data = LeadQualificationInput(company="Acme", phone=None, country=None, source="storefront")
    result = lead_qualifier.classify_lead(data)

    assert result == classify_lead_heuristically(data)
