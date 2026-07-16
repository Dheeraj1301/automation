import uuid

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import TimestampedBase

SOURCE_STOREFRONT = "storefront"
SOURCE_LANDING_PAGE = "landing_page"


class Lead(TimestampedBase):
    __tablename__ = "leads"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    consent: Mapped[bool] = mapped_column(Boolean, nullable=False)
    landing_page_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("landing_pages.id"), nullable=True
    )
    source: Mapped[str] = mapped_column(String(50), nullable=False, default=SOURCE_STOREFRONT)

    landing_page: Mapped["LandingPage | None"] = relationship(back_populates="leads")
