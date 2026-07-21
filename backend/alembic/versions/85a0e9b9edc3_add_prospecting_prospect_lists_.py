"""add prospecting: prospect lists, prospects, outreach drafts, enrichment jobs

Revision ID: 85a0e9b9edc3
Revises: 954575101bc2
Create Date: 2026-07-21 14:09:57.775716

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '85a0e9b9edc3'
down_revision: Union[str, None] = '954575101bc2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'prospect_lists',
        sa.Column('organization_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('product_name', sa.String(length=255), nullable=False),
        sa.Column('product_description', sa.Text(), nullable=False),
        sa.Column('product_category', sa.String(length=255), nullable=False),
        sa.Column('target_industry', sa.String(length=255), nullable=False),
        sa.Column('target_country', sa.String(length=100), nullable=False),
        sa.Column('target_state', sa.String(length=100), nullable=True),
        sa.Column('target_city', sa.String(length=100), nullable=True),
        sa.Column('target_company_size', sa.String(length=100), nullable=True),
        sa.Column('keywords', sa.String(length=500), nullable=True),
        sa.Column('revenue_range', sa.String(length=100), nullable=True),
        sa.Column('buyer_persona', sa.Text(), nullable=True),
        sa.Column('competitor_names', sa.String(length=500), nullable=True),
        sa.Column('preferred_language', sa.String(length=50), nullable=False),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_prospect_lists_organization_id'), 'prospect_lists', ['organization_id'], unique=False)

    op.create_table(
        'prospects',
        sa.Column('organization_id', sa.UUID(), nullable=False),
        sa.Column('list_id', sa.UUID(), nullable=False),
        sa.Column('company_name', sa.String(length=255), nullable=False),
        sa.Column('website_url', sa.String(length=500), nullable=True),
        sa.Column('industry', sa.String(length=255), nullable=True),
        sa.Column('country', sa.String(length=100), nullable=True),
        sa.Column('state', sa.String(length=100), nullable=True),
        sa.Column('city', sa.String(length=100), nullable=True),
        sa.Column('company_size', sa.String(length=100), nullable=True),
        sa.Column('google_maps_url', sa.String(length=500), nullable=True),
        sa.Column('linkedin_url', sa.String(length=500), nullable=True),
        sa.Column('contact_page_url', sa.String(length=500), nullable=True),
        sa.Column('about_page_url', sa.String(length=500), nullable=True),
        sa.Column('crawled_data', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('public_email', sa.String(length=255), nullable=True),
        sa.Column('public_phone', sa.String(length=50), nullable=True),
        sa.Column('contact_form_url', sa.String(length=500), nullable=True),
        sa.Column('sales_email', sa.String(length=255), nullable=True),
        sa.Column('support_email', sa.String(length=255), nullable=True),
        sa.Column('office_address', sa.String(length=500), nullable=True),
        sa.Column('ai_summary', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('lead_score', sa.Integer(), nullable=True),
        sa.Column('lead_score_breakdown', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('tags', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('follow_up_status', sa.String(length=20), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['list_id'], ['prospect_lists.id']),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_prospects_list_id'), 'prospects', ['list_id'], unique=False)
    op.create_index(op.f('ix_prospects_organization_id'), 'prospects', ['organization_id'], unique=False)

    op.create_table(
        'enrichment_jobs',
        sa.Column('prospect_id', sa.UUID(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('finished_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['prospect_id'], ['prospects.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_enrichment_jobs_prospect_id'), 'enrichment_jobs', ['prospect_id'], unique=False)
    op.create_index(op.f('ix_enrichment_jobs_status'), 'enrichment_jobs', ['status'], unique=False)

    op.create_table(
        'outreach_drafts',
        sa.Column('prospect_id', sa.UUID(), nullable=False),
        sa.Column('channel', sa.String(length=20), nullable=False),
        sa.Column('subject', sa.String(length=255), nullable=True),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['prospect_id'], ['prospects.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_outreach_drafts_prospect_id'), 'outreach_drafts', ['prospect_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_outreach_drafts_prospect_id'), table_name='outreach_drafts')
    op.drop_table('outreach_drafts')
    op.drop_index(op.f('ix_enrichment_jobs_status'), table_name='enrichment_jobs')
    op.drop_index(op.f('ix_enrichment_jobs_prospect_id'), table_name='enrichment_jobs')
    op.drop_table('enrichment_jobs')
    op.drop_index(op.f('ix_prospects_organization_id'), table_name='prospects')
    op.drop_index(op.f('ix_prospects_list_id'), table_name='prospects')
    op.drop_table('prospects')
    op.drop_index(op.f('ix_prospect_lists_organization_id'), table_name='prospect_lists')
    op.drop_table('prospect_lists')
