import pytest
from pydantic import ValidationError

from app.schemas.storefront_config import DEFAULT_THEME, StorefrontConfigData, TestimonialItem, WhyChooseUsItem


def test_defaults_to_modern_tech_with_empty_content():
    config = StorefrontConfigData()
    assert config.theme == DEFAULT_THEME
    assert config.hero.heading == ""
    assert config.hero.cta_text == "Shop now"
    assert config.why_choose_us == []
    assert config.testimonials == []
    assert config.faqs == []


def test_round_trips_through_dict_like_json_storage():
    config = StorefrontConfigData(
        theme="luxury",
        why_choose_us=[WhyChooseUsItem(icon="shield", title="Certified", description="Every piece authentic")],
        testimonials=[TestimonialItem(name="Priya", quote="Stunning", rating=5)],
    )

    stored = config.model_dump(mode="json")
    reloaded = StorefrontConfigData.model_validate(stored)

    assert reloaded == config
    assert reloaded.testimonials[0].name == "Priya"


def test_testimonial_rating_bounded_one_to_five():
    with pytest.raises(ValidationError):
        TestimonialItem(name="X", quote="Y", rating=6)
    with pytest.raises(ValidationError):
        TestimonialItem(name="X", quote="Y", rating=0)
