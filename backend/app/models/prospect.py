import uuid

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import TimestampedBase

STATUS_NEW = "new"
STATUS_ENRICHING = "enriching"
STATUS_ENRICHED = "enriched"
STATUS_FAILED = "failed"

FOLLOW_UP_NOT_CONTACTED = "not_contacted"
FOLLOW_UP_CONTACTED = "contacted"
FOLLOW_UP_REPLIED = "replied"
FOLLOW_UP_QUALIFIED = "qualified"
FOLLOW_UP_DISQUALIFIED = "disqualified"


class Prospect(TimestampedBase):
    """A business the merchant is evaluating as a potential customer.

    Only ever populated from (a) what the merchant typed/pasted in
    themselves, or (b) what the company's own public website says when we
    crawl it - never from scraping Google, Maps, or LinkedIn directly.
    """

    __tablename__ = "prospects"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True
    )
    list_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("prospect_lists.id"), nullable=False, index=True
    )

    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    website_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    industry: Mapped[str | None] = mapped_column(String(255), nullable=True)
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    company_size: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # Pasted in by the merchant if they want it referenced - never
    # auto-discovered by scraping Maps/LinkedIn ourselves.
    google_maps_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    linkedin_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    contact_page_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    about_page_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # {description, products, services, industries_served, markets, brands,
    #  business_hours, certifications, years_in_business, social_links: {}}
    crawled_data: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    public_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    public_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    contact_form_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    sales_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    support_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    office_address: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # {what_they_sell, customers, pain_points, company_type,
    #  potential_interest, buying_intent, partnership_opportunities}
    ai_summary: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    lead_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # {industry_match, product_relevance, company_size, website_quality,
    #  location_match, business_activity, product_fit, buying_probability}
    lead_score_breakdown: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    status: Mapped[str] = mapped_column(String(20), nullable=False, default=STATUS_NEW)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    tags: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    follow_up_status: Mapped[str] = mapped_column(String(20), nullable=False, default=FOLLOW_UP_NOT_CONTACTED)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    prospect_list: Mapped["ProspectList"] = relationship(back_populates="prospects")
    outreach_drafts: Mapped[list["OutreachDraft"]] = relationship(
        back_populates="prospect", cascade="all, delete-orphan", order_by="OutreachDraft.created_at.desc()"
    )
