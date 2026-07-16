import uuid

from sqlalchemy import Boolean, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import TimestampedBase


class LandingPage(TimestampedBase):
    __tablename__ = "landing_pages"
    __table_args__ = (UniqueConstraint("organization_id", "slug", name="uq_landing_page_org_slug"),)

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), nullable=False)
    hero_heading: Mapped[str] = mapped_column(String(255), nullable=False)
    hero_subheading: Mapped[str | None] = mapped_column(Text, nullable=True)
    cta_text: Mapped[str] = mapped_column(String(100), nullable=False, default="Shop now")
    cta_url: Mapped[str] = mapped_column(String(500), nullable=False, default="/products")
    featured_category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("categories.id"), nullable=True
    )
    is_published: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    featured_category: Mapped["Category | None"] = relationship()
    leads: Mapped[list["Lead"]] = relationship(back_populates="landing_page")
