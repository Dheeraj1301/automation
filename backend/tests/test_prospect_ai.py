from app.services import prospect_ai
from app.services.ai_provider import AIProviderNotConfiguredError
from app.services.prospect_ai import _extract_json, analyze_prospect, build_icp


def test_extract_json_parses_plain_json():
    assert _extract_json('{"score": 80}') == {"score": 80}


def test_extract_json_parses_json_in_markdown_fence():
    text = '```json\n{"score": 65}\n```'
    assert _extract_json(text) == {"score": 65}


def test_extract_json_extracts_json_surrounded_by_prose():
    text = 'Sure, here you go:\n{"score": 50}\nHope that helps!'
    assert _extract_json(text) == {"score": 50}


def test_extract_json_returns_none_for_garbage():
    assert _extract_json("not json at all") is None


def test_build_icp_returns_empty_dict_for_none():
    assert build_icp(None) == {}


def test_analyze_prospect_returns_fallback_when_no_website_text():
    result = analyze_prospect("Acme Inc", "", {})
    assert result["score"] is None
    assert result["summary"]["buying_intent"] == "unknown"


def test_analyze_prospect_falls_back_when_ai_unconfigured(monkeypatch):
    def fake_generate_reply(*args, **kwargs):
        raise AIProviderNotConfiguredError("no key")

    monkeypatch.setattr(prospect_ai.ai_provider, "generate_reply", fake_generate_reply)

    result = analyze_prospect("Acme Inc", "We sell widgets to businesses.", {})
    assert result["score"] is None
    assert result["summary"] == dict(prospect_ai.EMPTY_SUMMARY)


def test_analyze_prospect_parses_valid_ai_response(monkeypatch):
    def fake_generate_reply(*args, **kwargs):
        return (
            '{"summary": {"what_they_sell": "Widgets", "buying_intent": "high"}, '
            '"score": 85, "score_breakdown": {"industry_match": 90, "product_relevance": 80}}'
        )

    monkeypatch.setattr(prospect_ai.ai_provider, "generate_reply", fake_generate_reply)

    result = analyze_prospect("Acme Inc", "We sell widgets to businesses.", {"product_name": "Widget Pro"})
    assert result["score"] == 85
    assert result["summary"]["what_they_sell"] == "Widgets"
    assert result["summary"]["buying_intent"] == "high"
    assert result["score_breakdown"]["industry_match"] == 90


def test_analyze_prospect_clamps_out_of_range_scores(monkeypatch):
    def fake_generate_reply(*args, **kwargs):
        return '{"summary": {}, "score": 150, "score_breakdown": {"industry_match": -10}}'

    monkeypatch.setattr(prospect_ai.ai_provider, "generate_reply", fake_generate_reply)

    result = analyze_prospect("Acme Inc", "some text", {})
    assert result["score"] == 100
    assert result["score_breakdown"]["industry_match"] == 0


def test_analyze_prospect_falls_back_on_unparseable_ai_response(monkeypatch):
    def fake_generate_reply(*args, **kwargs):
        return "I couldn't analyze this company."

    monkeypatch.setattr(prospect_ai.ai_provider, "generate_reply", fake_generate_reply)

    result = analyze_prospect("Acme Inc", "some text", {})
    assert result["score"] is None
