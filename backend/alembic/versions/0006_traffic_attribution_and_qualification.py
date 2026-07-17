"""traffic attribution, lead qualification, org support phone

Revision ID: 0006_traffic_qualification
Revises: 0005_ai_conversations
Create Date: 2026-07-17

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0006_traffic_qualification"
down_revision: Union[str, None] = "0005_ai_conversations"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("organizations", sa.Column("support_phone", sa.String(length=30), nullable=True))

    op.add_column("leads", sa.Column("company", sa.String(length=255), nullable=True))
    op.add_column("leads", sa.Column("utm_source", sa.String(length=100), nullable=True))
    op.add_column("leads", sa.Column("utm_medium", sa.String(length=100), nullable=True))
    op.add_column("leads", sa.Column("utm_campaign", sa.String(length=100), nullable=True))
    op.add_column("leads", sa.Column("referrer", sa.String(length=500), nullable=True))
    op.add_column("leads", sa.Column("qualification", sa.String(length=20), nullable=True))
    op.add_column("leads", sa.Column("buyer_type", sa.String(length=30), nullable=True))


def downgrade() -> None:
    op.drop_column("leads", "buyer_type")
    op.drop_column("leads", "qualification")
    op.drop_column("leads", "referrer")
    op.drop_column("leads", "utm_campaign")
    op.drop_column("leads", "utm_medium")
    op.drop_column("leads", "utm_source")
    op.drop_column("leads", "company")

    op.drop_column("organizations", "support_phone")
