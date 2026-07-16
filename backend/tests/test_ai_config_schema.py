from app.schemas.ai_config import AIConfigData, FaqItem


def test_ai_config_defaults_to_empty_strings_and_no_faqs():
    config = AIConfigData()
    assert config.business_description == ""
    assert config.brand_tone == ""
    assert config.target_audience == ""
    assert config.faqs == []
    assert config.shipping_policy == ""
    assert config.return_policy == ""


def test_ai_config_round_trips_through_dict_like_json_storage():
    config = AIConfigData(
        business_description="We sell handmade candles.",
        brand_tone="Warm and friendly",
        target_audience="Home decor enthusiasts",
        faqs=[FaqItem(question="Do you ship internationally?", answer="Yes, worldwide.")],
        shipping_policy="Ships in 2-3 business days.",
        return_policy="30-day returns.",
    )

    stored = config.model_dump(mode="json")
    reloaded = AIConfigData.model_validate(stored)

    assert reloaded == config
    assert reloaded.faqs[0].question == "Do you ship internationally?"
