from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import TimestampedBase


class Organization(TimestampedBase):
    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)

    memberships: Mapped[list["Membership"]] = relationship(back_populates="organization")
    settings: Mapped[list["Setting"]] = relationship(back_populates="organization")
