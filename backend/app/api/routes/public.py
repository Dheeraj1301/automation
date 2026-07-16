"""Unauthenticated read-only endpoints for headless storefronts.

Scoped by organization slug (not org_id) since these are hit by a
merchant's public storefront site, never by the authenticated dashboard.
Only status="active" products are ever exposed here.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.catalog import build_detail, build_list_item, clamp_page, clamp_page_size
from app.db.session import get_db
from app.models.category import Category
from app.models.landing_page import LandingPage
from app.models.lead import SOURCE_LANDING_PAGE, SOURCE_STOREFRONT, Lead
from app.models.organization import Organization
from app.models.product import ACTIVE, Product
from app.schemas.marketing import LeadCreateRequest, LeadResponse, PublicLandingPageResponse
from app.schemas.organization import PublicOrganizationResponse
from app.schemas.product import CategoryResponse, PaginatedProducts, ProductDetailResponse
from app.services.n8n_client import trigger_new_lead_workflows

router = APIRouter()


def get_org_by_slug_or_404(db: Session, org_slug: str) -> Organization:
    organization = db.query(Organization).filter(Organization.slug == org_slug).first()
    if organization is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Storefront not found")
    return organization


@router.get("/{org_slug}", response_model=PublicOrganizationResponse)
def get_public_organization(org_slug: str, db: Session = Depends(get_db)) -> Organization:
    return get_org_by_slug_or_404(db, org_slug)


@router.get("/{org_slug}/categories", response_model=list[CategoryResponse])
def list_public_categories(org_slug: str, db: Session = Depends(get_db)) -> list[Category]:
    organization = get_org_by_slug_or_404(db, org_slug)
    return db.query(Category).filter(Category.organization_id == organization.id).order_by(Category.name).all()


@router.get("/{org_slug}/products", response_model=PaginatedProducts)
def list_public_products(
    org_slug: str,
    q: str | None = Query(default=None),
    category_id: uuid.UUID | None = Query(default=None),
    page: int = Query(default=1),
    page_size: int = Query(default=20),
    db: Session = Depends(get_db),
) -> PaginatedProducts:
    organization = get_org_by_slug_or_404(db, org_slug)
    page = clamp_page(page)
    page_size = clamp_page_size(page_size)

    query = db.query(Product).filter(Product.organization_id == organization.id, Product.status == ACTIVE)
    if q:
        query = query.filter(Product.name.ilike(f"%{q}%"))
    if category_id:
        query = query.filter(Product.category_id == category_id)

    total = query.count()
    products = query.order_by(Product.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedProducts(
        items=[build_list_item(p) for p in products], total=total, page=page, page_size=page_size
    )


@router.get("/{org_slug}/products/{product_slug}", response_model=ProductDetailResponse)
def get_public_product(org_slug: str, product_slug: str, db: Session = Depends(get_db)) -> ProductDetailResponse:
    organization = get_org_by_slug_or_404(db, org_slug)
    product = (
        db.query(Product)
        .filter(Product.organization_id == organization.id, Product.slug == product_slug, Product.status == ACTIVE)
        .first()
    )
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return build_detail(product)


@router.get("/{org_slug}/landing-pages/{page_slug}", response_model=PublicLandingPageResponse)
def get_public_landing_page(org_slug: str, page_slug: str, db: Session = Depends(get_db)) -> LandingPage:
    organization = get_org_by_slug_or_404(db, org_slug)
    page = (
        db.query(LandingPage)
        .filter(
            LandingPage.organization_id == organization.id,
            LandingPage.slug == page_slug,
            LandingPage.is_published.is_(True),
        )
        .first()
    )
    if page is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Landing page not found")
    return page


@router.post("/{org_slug}/leads", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
def create_public_lead(org_slug: str, payload: LeadCreateRequest, db: Session = Depends(get_db)) -> Lead:
    organization = get_org_by_slug_or_404(db, org_slug)

    if not payload.consent:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Consent is required to submit this form")

    landing_page = None
    if payload.landing_page_slug:
        landing_page = (
            db.query(LandingPage)
            .filter(LandingPage.organization_id == organization.id, LandingPage.slug == payload.landing_page_slug)
            .first()
        )

    lead = Lead(
        organization_id=organization.id,
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        country=payload.country,
        consent=payload.consent,
        landing_page_id=landing_page.id if landing_page else None,
        source=SOURCE_LANDING_PAGE if landing_page else SOURCE_STOREFRONT,
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)

    trigger_new_lead_workflows(
        organization_id=str(organization.id),
        lead={
            "id": str(lead.id),
            "name": lead.name,
            "email": lead.email,
            "phone": lead.phone,
            "country": lead.country,
            "source": lead.source,
        },
    )

    return lead
