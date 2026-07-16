import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class LandingPageCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    hero_heading: str = Field(min_length=1, max_length=255)
    hero_subheading: str | None = None
    cta_text: str = Field(default="Shop now", max_length=100)
    cta_url: str = Field(default="/products", max_length=500)
    featured_category_id: uuid.UUID | None = None


class LandingPageUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    hero_heading: str | None = Field(default=None, min_length=1, max_length=255)
    hero_subheading: str | None = None
    cta_text: str | None = Field(default=None, max_length=100)
    cta_url: str | None = Field(default=None, max_length=500)
    featured_category_id: uuid.UUID | None = None
    is_published: bool | None = None


class LandingPageResponse(BaseModel):
    id: uuid.UUID
    title: str
    slug: str
    hero_heading: str
    hero_subheading: str | None
    cta_text: str
    cta_url: str
    featured_category_id: uuid.UUID | None
    is_published: bool

    model_config = {"from_attributes": True}


class PublicLandingPageResponse(BaseModel):
    title: str
    slug: str
    hero_heading: str
    hero_subheading: str | None
    cta_text: str
    cta_url: str
    featured_category_id: uuid.UUID | None


class LeadCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=50)
    country: str | None = Field(default=None, max_length=100)
    consent: bool
    landing_page_slug: str | None = None


class LeadResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: EmailStr
    phone: str | None
    country: str | None
    consent: bool
    source: str
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedLeads(BaseModel):
    items: list[LeadResponse]
    total: int
    page: int
    page_size: int
