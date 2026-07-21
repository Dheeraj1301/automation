from app.core import theme_recommendation
from app.core.theme_recommendation import DEFAULT_THEME, recommend_theme_by_keywords, recommend_theme_with_ai
from app.services.ai_provider import AIProviderNotConfiguredError


def test_recommends_luxury_for_jewellery():
    assert recommend_theme_by_keywords("Jewellery") == "luxury"


def test_recommends_modern_tech_for_electronics():
    assert recommend_theme_by_keywords("Electronics", "We sell smart gadgets") == "modern_tech"


def test_recommends_premium_fashion_for_clothing():
    assert recommend_theme_by_keywords("Clothing brand") == "premium_fashion"


def test_recommends_organic_for_food():
    assert recommend_theme_by_keywords("Organic food products") == "organic"


def test_recommends_industrial_for_manufacturing():
    assert recommend_theme_by_keywords("Manufacturing and engineering") == "industrial"


def test_recommends_interior_for_furniture():
    assert recommend_theme_by_keywords("Furniture and home decor") == "interior"


def test_recommends_colorful_retail_for_toys():
    assert recommend_theme_by_keywords("Toys and gifts") == "colorful_retail"


def test_falls_back_to_default_theme_for_unmatched_industry():
    assert recommend_theme_by_keywords("Something completely unrelated") == DEFAULT_THEME


def test_ai_recommendation_falls_back_to_keywords_when_ai_unconfigured(monkeypatch):
    def fake_generate_reply(*args, **kwargs):
        raise AIProviderNotConfiguredError("no key")

    monkeypatch.setattr(theme_recommendation.ai_provider, "generate_reply", fake_generate_reply)

    assert recommend_theme_with_ai("Jewellery", "") == "luxury"


def test_ai_recommendation_falls_back_to_keywords_on_any_error(monkeypatch):
    def fake_generate_reply(*args, **kwargs):
        raise RuntimeError("network blip")

    monkeypatch.setattr(theme_recommendation.ai_provider, "generate_reply", fake_generate_reply)

    assert recommend_theme_with_ai("Furniture", "") == "interior"


def test_ai_recommendation_uses_ai_response_when_valid(monkeypatch):
    def fake_generate_reply(*args, **kwargs):
        return '{"theme": "colorful_retail"}'

    monkeypatch.setattr(theme_recommendation.ai_provider, "generate_reply", fake_generate_reply)

    # Industry text alone would keyword-match to nothing in particular -
    # confirms the AI's answer is what's actually used, not just a fallback.
    assert recommend_theme_with_ai("A general small business", "") == "colorful_retail"


def test_ai_recommendation_ignores_invalid_theme_in_response(monkeypatch):
    def fake_generate_reply(*args, **kwargs):
        return '{"theme": "not_a_real_theme"}'

    monkeypatch.setattr(theme_recommendation.ai_provider, "generate_reply", fake_generate_reply)

    assert recommend_theme_with_ai("Jewellery", "") == "luxury"
