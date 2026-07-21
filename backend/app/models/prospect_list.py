import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import TimestampedBase


class ProspectList(TimestampedBase):
    """A saved prospecting campaign: the merchant's ideal-customer-profile
    criteria, used both as a label to group prospects under and as context
    the AI scores/analyzes each prospect against."""

    __tablename__ = "prospect_lists"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)

    product_name: Mapped[str] = mapped_column(String(255), nullable=False)
    product_description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    product_category: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    target_industry: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    target_country: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    target_state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    target_city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    target_company_size: Mapped[str | None] = mapped_column(String(100), nullable=True)
    keywords: Mapped[str | None] = mapped_column(String(500), nullable=True)
    revenue_range: Mapped[str | None] = mapped_column(String(100), nullable=True)
    buyer_persona: Mapped[str | None] = mapped_column(Text, nullable=True)
    competitor_names: Mapped[str | None] = mapped_column(String(500), nullable=True)
    preferred_language: Mapped[str] = mapped_column(String(50), nullable=False, default="English")

    prospects: Mapped[list["Prospect"]] = relationship(
        back_populates="prospect_list", cascade="all, delete-orphan", order_by="Prospect.created_at.desc()"
    )
