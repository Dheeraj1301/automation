"""landing pages and leads

Revision ID: 0004_landing_pages_leads
Revises: 0003_product_catalog
Create Date: 2026-07-17

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0004_landing_pages_leads"
down_revision: Union[str, None] = "0003_product_catalog"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "landing_pages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column(
            "organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False
        ),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=255), nullable=False),
        sa.Column("hero_heading", sa.String(length=255), nullable=False),
        sa.Column("hero_subheading", sa.Text(), nullable=True),
        sa.Column("cta_text", sa.String(length=100), nullable=False, server_default="Shop now"),
        sa.Column("cta_url", sa.String(length=500), nullable=False, server_default="/products"),
        sa.Column(
            "featured_category_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("categories.id"), nullable=True
        ),
        sa.Column("is_published", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.UniqueConstraint("organization_id", "slug", name="uq_landing_page_org_slug"),
    )
    op.create_index("ix_landing_pages_organization_id", "landing_pages", ["organization_id"])

    op.create_table(
        "leads",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column(
            "organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False
        ),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column("country", sa.String(length=100), nullable=True),
        sa.Column("consent", sa.Boolean(), nullable=False),
        sa.Column(
            "landing_page_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("landing_pages.id"),
            nullable=True,
        ),
        sa.Column("source", sa.String(length=50), nullable=False, server_default="storefront"),
    )
    op.create_index("ix_leads_organization_id", "leads", ["organization_id"])


def downgrade() -> None:
    op.drop_table("leads")
    op.drop_index("ix_landing_pages_organization_id", table_name="landing_pages")
    op.drop_table("landing_pages")
