from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import TimestampedBase

DEFAULT_PLAN = "free"


class Organization(TimestampedBase):
    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    plan: Mapped[str] = mapped_column(String(20), nullable=False, default=DEFAULT_PLAN)
    logo_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    support_phone: Mapped[str | None] = mapped_column(String(30), nullable=True)

    memberships: Mapped[list["Membership"]] = relationship(back_populates="organization")
    settings: Mapped[list["Setting"]] = relationship(back_populates="organization")
    invitations: Mapped[list["Invitation"]] = relationship(back_populates="organization")
