import uuid
from datetime import datetime

from pydantic import BaseModel, Field

FOLLOW_UP_PATTERN = "^(not_contacted|contacted|replied|qualified|disqualified)$"
CHANNEL_PATTERN = "^(email|linkedin|contact_form)$"
DRAFT_STATUS_PATTERN = "^(draft|edited|sent)$"


class ProspectListCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    product_name: str = Field(min_length=1, max_length=255)
    product_description: str = Field(default="", max_length=3000)
    product_category: str = Field(default="", max_length=255)
    target_industry: str = Field(default="", max_length=255)
    target_country: str = Field(default="", max_length=100)
    target_state: str | None = Field(default=None, max_length=100)
    target_city: str | None = Field(default=None, max_length=100)
    target_company_size: str | None = Field(default=None, max_length=100)
    keywords: str | None = Field(default=None, max_length=500)
    revenue_range: str | None = Field(default=None, max_length=100)
    buyer_persona: str | None = Field(default=None, max_length=2000)
    competitor_names: str | None = Field(default=None, max_length=500)
    preferred_language: str = Field(default="English", max_length=50)


class ProspectListResponse(ProspectListCreate):
    id: uuid.UUID
    created_at: datetime
    prospect_count: int = 0

    model_config = {"from_attributes": True}


class ProspectCreate(BaseModel):
    company_name: str = Field(min_length=1, max_length=255)
    website_url: str | None = Field(default=None, max_length=500)
    industry: str | None = Field(default=None, max_length=255)
    country: str | None = Field(default=None, max_length=100)
    state: str | None = Field(default=None, max_length=100)
    city: str | None = Field(default=None, max_length=100)
    company_size: str | None = Field(default=None, max_length=100)
    google_maps_url: str | None = Field(default=None, max_length=500)
    linkedin_url: str | None = Field(default=None, max_length=500)


class ProspectBulkCreate(BaseModel):
    prospects: list[ProspectCreate] = Field(min_length=1, max_length=200)


class ProspectUpdate(BaseModel):
    tags: list[str] | None = None
    follow_up_status: str | None = Field(default=None, pattern=FOLLOW_UP_PATTERN)
    notes: str | None = Field(default=None, max_length=5000)


class ProspectResponse(BaseModel):
    id: uuid.UUID
    list_id: uuid.UUID
    company_name: str
    website_url: str | None
    industry: str | None
    country: str | None
    state: str | None
    city: str | None
    company_size: str | None
    google_maps_url: str | None
    linkedin_url: str | None
    contact_page_url: str | None
    about_page_url: str | None
    contact_form_url: str | None
    public_email: str | None
    public_phone: str | None
    sales_email: str | None
    support_email: str | None
    office_address: str | None
    crawled_data: dict
    ai_summary: dict
    lead_score: int | None
    lead_score_breakdown: dict
    status: str
    error_message: str | None
    tags: list
    follow_up_status: str
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class OutreachDraftGenerateRequest(BaseModel):
    channel: str = Field(pattern=CHANNEL_PATTERN)


class OutreachDraftUpdate(BaseModel):
    subject: str | None = Field(default=None, max_length=255)
    body: str | None = Field(default=None, max_length=5000)
    status: str | None = Field(default=None, pattern=DRAFT_STATUS_PATTERN)


class OutreachDraftResponse(BaseModel):
    id: uuid.UUID
    prospect_id: uuid.UUID
    channel: str
    subject: str | None
    body: str
    status: str
    sent_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class DashboardStats(BaseModel):
    total_prospects: int
    score_distribution: dict[str, int]
    industry_breakdown: dict[str, int]
    location_breakdown: dict[str, int]
    follow_up_status_counts: dict[str, int]
    outreach_status_counts: dict[str, int]
