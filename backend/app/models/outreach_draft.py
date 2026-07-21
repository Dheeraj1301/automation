import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import TimestampedBase

CHANNEL_EMAIL = "email"
CHANNEL_LINKEDIN = "linkedin"
CHANNEL_CONTACT_FORM = "contact_form"

STATUS_DRAFT = "draft"
STATUS_EDITED = "edited"
STATUS_SENT = "sent"


class OutreachDraft(TimestampedBase):
    """AI-drafted outreach copy. Never sent by the platform - the merchant
    reviews, edits if needed, sends it themselves through their own email/
    LinkedIn/etc, then marks it sent here for tracking."""

    __tablename__ = "outreach_drafts"

    prospect_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("prospects.id"), nullable=False, index=True
    )
    channel: Mapped[str] = mapped_column(String(20), nullable=False)
    subject: Mapped[str | None] = mapped_column(String(255), nullable=True)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default=STATUS_DRAFT)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    prospect: Mapped["Prospect"] = relationship(back_populates="outreach_drafts")
