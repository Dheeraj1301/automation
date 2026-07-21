from typing import Literal

from pydantic import BaseModel, Field

ThemeId = Literal[
    "luxury",
    "modern_tech",
    "premium_fashion",
    "organic",
    "industrial",
    "interior",
    "colorful_retail",
]
THEME_IDS: tuple[str, ...] = ThemeId.__args__
DEFAULT_THEME: ThemeId = "modern_tech"


class HeroConfig(BaseModel):
    heading: str = Field(default="", max_length=200)
    subheading: str = Field(default="", max_length=500)
    cta_text: str = Field(default="Shop now", max_length=50)
    cta_url: str = Field(default="/products", max_length=500)
    image_path: str | None = None


class WhyChooseUsItem(BaseModel):
    icon: str = Field(default="star", max_length=30)
    title: str = Field(default="", max_length=100)
    description: str = Field(default="", max_length=300)


class TestimonialItem(BaseModel):
    name: str = Field(default="", max_length=100)
    quote: str = Field(default="", max_length=600)
    rating: int = Field(default=5, ge=1, le=5)
    avatar_path: str | None = None


class StorefrontFaqItem(BaseModel):
    question: str = Field(default="", max_length=300)
    answer: str = Field(default="", max_length=2000)


class StorefrontConfigData(BaseModel):
    """Merchant-editable catalog website content and theme choice.

    Layout variation (hero style, product grid style) is derived
    deterministically from the organization id, not stored here - that's
    what makes every merchant's site look distinct without needing an
    editable "layout" field to maintain.
    """

    theme: ThemeId = Field(default=DEFAULT_THEME)
    hero: HeroConfig = Field(default_factory=HeroConfig)
    about_heading: str = Field(default="", max_length=200)
    about_body: str = Field(default="", max_length=3000)
    why_choose_us: list[WhyChooseUsItem] = Field(default_factory=list)
    testimonials: list[TestimonialItem] = Field(default_factory=list)
    faqs: list[StorefrontFaqItem] = Field(default_factory=list)
