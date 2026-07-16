import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_membership
from app.core.catalog import clamp_page, clamp_page_size
from app.db.session import get_db
from app.models.lead import Lead
from app.models.membership import Membership
from app.schemas.marketing import LeadResponse, PaginatedLeads

router = APIRouter()


@router.get("", response_model=PaginatedLeads)
def list_leads(
    org_id: uuid.UUID,
    page: int = Query(default=1),
    page_size: int = Query(default=20),
    membership: Membership = Depends(get_membership),
    db: Session = Depends(get_db),
) -> PaginatedLeads:
    page = clamp_page(page)
    page_size = clamp_page_size(page_size)

    query = db.query(Lead).filter(Lead.organization_id == org_id)
    total = query.count()
    leads = query.order_by(Lead.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedLeads(
        items=[LeadResponse.model_validate(lead) for lead in leads], total=total, page=page, page_size=page_size
    )
