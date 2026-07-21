"""AI Lead Intelligence & Prospect Discovery.

By design, this module never discovers businesses by scraping Google,
Google Maps, or LinkedIn - those platforms actively pursue scrapers
(LinkedIn especially) and doing so would risk this server's IP getting
blacklisted, on top of being a ToS violation. Instead, merchants add
prospects themselves (one at a time or via CSV, parsed client-side into
the same bulk-create call) - AI takes over from there: crawling each
company's own public website, analyzing/scoring it, and drafting outreach.
Outreach is never sent automatically; the merchant reviews and sends it
themselves, then marks it sent here for tracking.
"""

import csv
import io
import uuid
from collections import Counter
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_membership, require_role
from app.core.logging import get_logger
from app.db.session import get_db
from app.models.enrichment_job import STATUS_PENDING as JOB_PENDING, EnrichmentJob
from app.models.membership import Membership
from app.models.organization import Organization
from app.models.outreach_draft import STATUS_SENT, OutreachDraft
from app.models.prospect import STATUS_NEW, Prospect
from app.models.prospect_list import ProspectList
from app.schemas.prospecting import (
    DashboardStats,
    OutreachDraftGenerateRequest,
    OutreachDraftResponse,
    OutreachDraftUpdate,
    ProspectBulkCreate,
    ProspectListCreate,
    ProspectListResponse,
    ProspectResponse,
    ProspectUpdate,
)
from app.services.ai_provider import AIProviderNotConfiguredError
from app.services.outreach_generator import generate_outreach_draft
from app.services.prospect_ai import build_icp

logger = get_logger(__name__)
router = APIRouter()

CATALOG_ROLES = ("owner", "admin", "staff")


def _list_or_404(db: Session, org_id: uuid.UUID, list_id: uuid.UUID) -> ProspectList:
    prospect_list = (
        db.query(ProspectList).filter(ProspectList.id == list_id, ProspectList.organization_id == org_id).first()
    )
    if prospect_list is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prospect list not found")
    return prospect_list


def _prospect_or_404(db: Session, org_id: uuid.UUID, prospect_id: uuid.UUID) -> Prospect:
    prospect = (
        db.query(Prospect).filter(Prospect.id == prospect_id, Prospect.organization_id == org_id).first()
    )
    if prospect is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prospect not found")
    return prospect


def _to_list_response(prospect_list: ProspectList, prospect_count: int) -> ProspectListResponse:
    return ProspectListResponse.model_validate({**prospect_list.__dict__, "prospect_count": prospect_count})


@router.post("/lists", response_model=ProspectListResponse, status_code=status.HTTP_201_CREATED)
def create_list(
    org_id: uuid.UUID,
    payload: ProspectListCreate,
    membership: Membership = Depends(require_role(*CATALOG_ROLES)),
    db: Session = Depends(get_db),
) -> ProspectListResponse:
    prospect_list = ProspectList(organization_id=org_id, **payload.model_dump())
    db.add(prospect_list)
    db.commit()
    db.refresh(prospect_list)
    return _to_list_response(prospect_list, 0)


@router.get("/lists", response_model=list[ProspectListResponse])
def list_lists(
    org_id: uuid.UUID,
    membership: Membership = Depends(get_membership),
    db: Session = Depends(get_db),
) -> list[ProspectListResponse]:
    lists = (
        db.query(ProspectList)
        .filter(ProspectList.organization_id == org_id)
        .order_by(ProspectList.created_at.desc())
        .all()
    )
    result = []
    for prospect_list in lists:
        count = db.query(Prospect).filter(Prospect.list_id == prospect_list.id).count()
        result.append(_to_list_response(prospect_list, count))
    return result


@router.delete("/lists/{list_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_list(
    org_id: uuid.UUID,
    list_id: uuid.UUID,
    membership: Membership = Depends(require_role(*CATALOG_ROLES)),
    db: Session = Depends(get_db),
) -> None:
    prospect_list = _list_or_404(db, org_id, list_id)
    db.delete(prospect_list)
    db.commit()


@router.post("/lists/{list_id}/prospects", response_model=list[ProspectResponse], status_code=status.HTTP_201_CREATED)
def add_prospects(
    org_id: uuid.UUID,
    list_id: uuid.UUID,
    payload: ProspectBulkCreate,
    membership: Membership = Depends(require_role(*CATALOG_ROLES)),
    db: Session = Depends(get_db),
) -> list[Prospect]:
    _list_or_404(db, org_id, list_id)

    created: list[Prospect] = []
    for item in payload.prospects:
        prospect = Prospect(organization_id=org_id, list_id=list_id, status=STATUS_NEW, **item.model_dump())
        db.add(prospect)
        created.append(prospect)
    db.commit()

    for prospect in created:
        db.refresh(prospect)
        if prospect.website_url:
            db.add(EnrichmentJob(prospect_id=prospect.id, status=JOB_PENDING))
    db.commit()

    return created


@router.get("/lists/{list_id}/prospects", response_model=list[ProspectResponse])
def list_prospects(
    org_id: uuid.UUID,
    list_id: uuid.UUID,
    industry: str | None = Query(default=None),
    country: str | None = Query(default=None),
    city: str | None = Query(default=None),
    company_size: str | None = Query(default=None),
    min_score: int | None = Query(default=None, ge=0, le=100),
    has_contact: bool | None = Query(default=None),
    follow_up_status: str | None = Query(default=None),
    membership: Membership = Depends(get_membership),
    db: Session = Depends(get_db),
) -> list[Prospect]:
    _list_or_404(db, org_id, list_id)

    query = db.query(Prospect).filter(Prospect.list_id == list_id, Prospect.organization_id == org_id)
    if industry:
        query = query.filter(Prospect.industry.ilike(f"%{industry}%"))
    if country:
        query = query.filter(Prospect.country.ilike(f"%{country}%"))
    if city:
        query = query.filter(Prospect.city.ilike(f"%{city}%"))
    if company_size:
        query = query.filter(Prospect.company_size == company_size)
    if min_score is not None:
        query = query.filter(Prospect.lead_score >= min_score)
    if follow_up_status:
        query = query.filter(Prospect.follow_up_status == follow_up_status)
    if has_contact is not None:
        if has_contact:
            query = query.filter(Prospect.public_email.isnot(None) | Prospect.public_phone.isnot(None))
        else:
            query = query.filter(Prospect.public_email.is_(None), Prospect.public_phone.is_(None))

    return query.order_by(Prospect.lead_score.desc().nullslast(), Prospect.created_at.desc()).all()


@router.get("/lists/{list_id}/export")
def export_prospects(
    org_id: uuid.UUID,
    list_id: uuid.UUID,
    membership: Membership = Depends(get_membership),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    prospect_list = _list_or_404(db, org_id, list_id)
    prospects = (
        db.query(Prospect)
        .filter(Prospect.list_id == list_id, Prospect.organization_id == org_id)
        .order_by(Prospect.lead_score.desc().nullslast())
        .all()
    )

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "company_name", "website_url", "industry", "country", "state", "city", "company_size",
            "public_email", "public_phone", "office_address", "linkedin_url", "google_maps_url",
            "lead_score", "status", "follow_up_status", "tags",
        ]
    )
    for p in prospects:
        writer.writerow(
            [
                p.company_name, p.website_url, p.industry, p.country, p.state, p.city, p.company_size,
                p.public_email, p.public_phone, p.office_address, p.linkedin_url, p.google_maps_url,
                p.lead_score, p.status, p.follow_up_status, ";".join(p.tags or []),
            ]
        )
    buffer.seek(0)

    filename = f"{prospect_list.name.replace(' ', '_')}_prospects.csv"
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/prospects/{prospect_id}", response_model=ProspectResponse)
def get_prospect(
    org_id: uuid.UUID,
    prospect_id: uuid.UUID,
    membership: Membership = Depends(get_membership),
    db: Session = Depends(get_db),
) -> Prospect:
    return _prospect_or_404(db, org_id, prospect_id)


@router.patch("/prospects/{prospect_id}", response_model=ProspectResponse)
def update_prospect(
    org_id: uuid.UUID,
    prospect_id: uuid.UUID,
    payload: ProspectUpdate,
    membership: Membership = Depends(require_role(*CATALOG_ROLES)),
    db: Session = Depends(get_db),
) -> Prospect:
    prospect = _prospect_or_404(db, org_id, prospect_id)
    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(prospect, key, value)
    db.commit()
    db.refresh(prospect)
    return prospect


@router.post("/prospects/{prospect_id}/reanalyze", response_model=ProspectResponse)
def reanalyze_prospect(
    org_id: uuid.UUID,
    prospect_id: uuid.UUID,
    membership: Membership = Depends(require_role(*CATALOG_ROLES)),
    db: Session = Depends(get_db),
) -> Prospect:
    prospect = _prospect_or_404(db, org_id, prospect_id)
    if not prospect.website_url:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This prospect has no website URL to analyze")

    prospect.status = STATUS_NEW
    prospect.error_message = None
    db.add(EnrichmentJob(prospect_id=prospect.id, status=JOB_PENDING))
    db.commit()
    db.refresh(prospect)
    return prospect


@router.post("/prospects/{prospect_id}/outreach", response_model=OutreachDraftResponse, status_code=status.HTTP_201_CREATED)
def create_outreach_draft(
    org_id: uuid.UUID,
    prospect_id: uuid.UUID,
    payload: OutreachDraftGenerateRequest,
    membership: Membership = Depends(require_role(*CATALOG_ROLES)),
    db: Session = Depends(get_db),
) -> OutreachDraft:
    prospect = _prospect_or_404(db, org_id, prospect_id)
    organization = db.get(Organization, org_id)
    prospect_list = db.get(ProspectList, prospect.list_id)

    try:
        draft_content = generate_outreach_draft(
            channel=payload.channel,
            company_name=prospect.company_name,
            ai_summary=prospect.ai_summary,
            icp=build_icp(prospect_list),
            merchant_name=organization.name,
        )
    except AIProviderNotConfiguredError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    except Exception:
        logger.error("outreach_draft_generation_failed", prospect_id=str(prospect_id))
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Could not generate a draft. Please try again.")

    draft = OutreachDraft(prospect_id=prospect_id, channel=payload.channel, **draft_content)
    db.add(draft)
    db.commit()
    db.refresh(draft)
    return draft


@router.get("/prospects/{prospect_id}/outreach", response_model=list[OutreachDraftResponse])
def list_outreach_drafts(
    org_id: uuid.UUID,
    prospect_id: uuid.UUID,
    membership: Membership = Depends(get_membership),
    db: Session = Depends(get_db),
) -> list[OutreachDraft]:
    _prospect_or_404(db, org_id, prospect_id)
    return (
        db.query(OutreachDraft)
        .filter(OutreachDraft.prospect_id == prospect_id)
        .order_by(OutreachDraft.created_at.desc())
        .all()
    )


@router.patch("/outreach/{draft_id}", response_model=OutreachDraftResponse)
def update_outreach_draft(
    org_id: uuid.UUID,
    draft_id: uuid.UUID,
    payload: OutreachDraftUpdate,
    membership: Membership = Depends(require_role(*CATALOG_ROLES)),
    db: Session = Depends(get_db),
) -> OutreachDraft:
    draft = (
        db.query(OutreachDraft)
        .join(Prospect, Prospect.id == OutreachDraft.prospect_id)
        .filter(OutreachDraft.id == draft_id, Prospect.organization_id == org_id)
        .first()
    )
    if draft is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Outreach draft not found")

    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(draft, key, value)
    if updates:
        draft.status = updates.get("status", "edited")
    db.commit()
    db.refresh(draft)
    return draft


@router.post("/outreach/{draft_id}/mark-sent", response_model=OutreachDraftResponse)
def mark_outreach_sent(
    org_id: uuid.UUID,
    draft_id: uuid.UUID,
    membership: Membership = Depends(require_role(*CATALOG_ROLES)),
    db: Session = Depends(get_db),
) -> OutreachDraft:
    draft = (
        db.query(OutreachDraft)
        .join(Prospect, Prospect.id == OutreachDraft.prospect_id)
        .filter(OutreachDraft.id == draft_id, Prospect.organization_id == org_id)
        .first()
    )
    if draft is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Outreach draft not found")

    draft.status = STATUS_SENT
    draft.sent_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(draft)
    return draft


@router.get("/dashboard", response_model=DashboardStats)
def dashboard_stats(
    org_id: uuid.UUID,
    list_id: uuid.UUID | None = Query(default=None),
    membership: Membership = Depends(get_membership),
    db: Session = Depends(get_db),
) -> DashboardStats:
    query = db.query(Prospect).filter(Prospect.organization_id == org_id)
    if list_id:
        query = query.filter(Prospect.list_id == list_id)
    prospects = query.all()

    def score_bucket(score: int | None) -> str:
        if score is None:
            return "Not yet scored"
        if score >= 76:
            return "76-100"
        if score >= 51:
            return "51-75"
        if score >= 26:
            return "26-50"
        return "0-25"

    score_distribution = Counter(score_bucket(p.lead_score) for p in prospects)
    industry_breakdown = Counter(p.industry or "Unknown" for p in prospects)
    location_breakdown = Counter(
        ", ".join(filter(None, [p.city, p.country])) or "Unknown" for p in prospects
    )
    follow_up_counts = Counter(p.follow_up_status for p in prospects)

    prospect_ids = [p.id for p in prospects]
    outreach_counts: Counter = Counter()
    if prospect_ids:
        drafts = db.query(OutreachDraft).filter(OutreachDraft.prospect_id.in_(prospect_ids)).all()
        outreach_counts = Counter(d.status for d in drafts)

    return DashboardStats(
        total_prospects=len(prospects),
        score_distribution=dict(score_distribution),
        industry_breakdown=dict(industry_breakdown),
        location_breakdown=dict(location_breakdown),
        follow_up_status_counts=dict(follow_up_counts),
        outreach_status_counts=dict(outreach_counts),
    )
