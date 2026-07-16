from pydantic import BaseModel, Field


class FaqItem(BaseModel):
    question: str = Field(default="", max_length=500)
    answer: str = Field(default="", max_length=2000)


class AIConfigData(BaseModel):
    """Structured merchant profile Phase 7's AI Sales Agent will read from.

    No AI model calls happen in this phase - this is persistence only.
    """

    business_description: str = Field(default="", max_length=5000)
    brand_tone: str = Field(default="", max_length=200)
    target_audience: str = Field(default="", max_length=2000)
    faqs: list[FaqItem] = Field(default_factory=list)
    shipping_policy: str = Field(default="", max_length=5000)
    return_policy: str = Field(default="", max_length=5000)
