import uuid

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import TimestampedBase

SOURCE_STOREFRONT = "storefront"
SOURCE_LANDING_PAGE = "landing_page"

QUALIFICATION_HIGH = "high_value"
QUALIFICATION_MEDIUM = "medium_value"
QUALIFICATION_LOW = "low_value"

BUYER_TYPE_WHOLESALE = "wholesale"
BUYER_TYPE_RETAIL = "retail"
BUYER_TYPE_DISTRIBUTOR = "distributor"
BUYER_TYPE_IMPORTER = "importer"
BUYER_TYPE_EXISTING_CUSTOMER = "existing_customer"


class Lead(TimestampedBase):
    __tablename__ = "leads"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    company: Mapped[str | None] = mapped_column(String(255), nullable=True)
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    consent: Mapped[bool] = mapped_column(Boolean, nullable=False)
    landing_page_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("landing_pages.id"), nullable=True
    )
    source: Mapped[str] = mapped_column(String(50), nullable=False, default=SOURCE_STOREFRONT)

    # Traffic attribution - captured client-side from URL query params / document.referrer
    # at the moment the lead form is submitted, so any channel (Instagram DM link via
    # ManyChat, WhatsApp link, Google Ads, QR code, ...) is tracked the same way.
    utm_source: Mapped[str | None] = mapped_column(String(100), nullable=True)
    utm_medium: Mapped[str | None] = mapped_column(String(100), nullable=True)
    utm_campaign: Mapped[str | None] = mapped_column(String(100), nullable=True)
    referrer: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # AI/heuristic lead qualification, set once at capture time.
    qualification: Mapped[str | None] = mapped_column(String(20), nullable=True)
    buyer_type: Mapped[str | None] = mapped_column(String(30), nullable=True)

    landing_page: Mapped["LandingPage | None"] = relationship(back_populates="leads")
