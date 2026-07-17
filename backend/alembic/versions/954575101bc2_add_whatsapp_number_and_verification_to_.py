"""add whatsapp number and verification to organizations

Revision ID: 954575101bc2
Revises: 0005_ai_conversations
Create Date: 2026-07-17 17:05:33.548231

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '954575101bc2'
down_revision: Union[str, None] = '0005_ai_conversations'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('organizations', sa.Column('whatsapp_number', sa.String(length=20), nullable=True))
    op.add_column(
        'organizations',
        sa.Column('whatsapp_verified', sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column('organizations', 'whatsapp_verified')
    op.drop_column('organizations', 'whatsapp_number')
