"""org plan/logo columns, seed roles, invitations table

Revision ID: 0002_orgs_roles_invites
Revises: 0001_initial
Create Date: 2026-07-17

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002_orgs_roles_invites"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

ROLE_SEED = [
    ("owner", "Full access to the organization"),
    ("admin", "Can manage team, settings, and products"),
    ("staff", "Day-to-day access without team/billing management"),
]


def upgrade() -> None:
    op.add_column(
        "organizations",
        sa.Column("plan", sa.String(length=20), nullable=False, server_default="free"),
    )
    op.add_column(
        "organizations",
        sa.Column("logo_path", sa.String(length=500), nullable=True),
    )

    roles = sa.table(
        "roles",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("name", sa.String),
        sa.column("description", sa.String),
    )
    conn = op.get_bind()
    for name, description in ROLE_SEED:
        conn.execute(
            sa.text(
                "INSERT INTO roles (id, name, description) "
                "VALUES (gen_random_uuid(), :name, :description) "
                "ON CONFLICT ON CONSTRAINT uq_roles_name DO NOTHING"
            ).bindparams(name=name, description=description)
        )

    op.create_table(
        "invitations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column(
            "organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False
        ),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("role_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("roles.id"), nullable=False),
        sa.Column(
            "invited_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False
        ),
        sa.Column("token", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_invitations_token", "invitations", ["token"], unique=True)
    op.create_index("ix_invitations_org_email", "invitations", ["organization_id", "email"])


def downgrade() -> None:
    op.drop_index("ix_invitations_org_email", table_name="invitations")
    op.drop_index("ix_invitations_token", table_name="invitations")
    op.drop_table("invitations")
    op.execute("DELETE FROM roles WHERE name IN ('owner', 'admin', 'staff')")
    op.drop_column("organizations", "logo_path")
    op.drop_column("organizations", "plan")
