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
    company: str | None = Field(default=None, max_length=255)
    country: str | None = Field(default=None, max_length=100)
    consent: bool
    landing_page_slug: str | None = None

    # Traffic attribution - captured client-side (URL query params /
    # document.referrer) so any channel is tracked uniformly: an Instagram
    # DM link (via ManyChat or similar), a WhatsApp link, Google Ads, a QR
    # code, or plain sharing.
    utm_source: str | None = Field(default=None, max_length=100)
    utm_medium: str | None = Field(default=None, max_length=100)
    utm_campaign: str | None = Field(default=None, max_length=100)
    referrer: str | None = Field(default=None, max_length=500)


class LeadResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: EmailStr
    phone: str | None
    company: str | None
    country: str | None
    consent: bool
    source: str
    utm_source: str | None
    utm_medium: str | None
    utm_campaign: str | None
    qualification: str | None
    buyer_type: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedLeads(BaseModel):
    items: list[LeadResponse]
    total: int
    page: int
    page_size: int
