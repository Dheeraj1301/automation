"""Unauthenticated read-only endpoints for headless storefronts.

Scoped by organization slug (not org_id) since these are hit by a
merchant's public storefront site, never by the authenticated dashboard.
Only status="active" products are ever exposed here.
"""

import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.core.catalog import build_detail, build_list_item, clamp_page, clamp_page_size
from app.core.config import settings
from app.core.rate_limit import enforce_rate_limit
from app.db.session import get_db
from app.models.category import Category
from app.models.landing_page import LandingPage
from app.models.lead import SOURCE_LANDING_PAGE, SOURCE_STOREFRONT, Lead
from app.models.organization import Organization
from app.models.product import ACTIVE, Product
from app.models.setting import Setting
from app.schemas.ai_agent import ChatRequest, ChatResponse
from app.schemas.marketing import LeadCreateRequest, LeadResponse, PublicLandingPageResponse
from app.schemas.organization import PublicOrganizationResponse
from app.schemas.product import CategoryResponse, PaginatedProducts, ProductDetailResponse
from app.schemas.storefront_config import StorefrontConfigData
from app.services.ai_chat import handle_chat_message
from app.services.lead_automation import run_lead_automation

router = APIRouter()

STOREFRONT_CONFIG_KEY = "storefront_config"


def get_org_by_slug_or_404(db: Session, org_slug: str) -> Organization:
    organization = db.query(Organization).filter(Organization.slug == org_slug).first()
    if organization is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Storefront not found")
    return organization


def get_storefront_config(db: Session, org_id: uuid.UUID) -> StorefrontConfigData:
    setting = db.query(Setting).filter(Setting.organization_id == org_id, Setting.key == STOREFRONT_CONFIG_KEY).first()
    if setting is None:
        return StorefrontConfigData()
    return StorefrontConfigData.model_validate(setting.value)


@router.get("/{org_slug}", response_model=PublicOrganizationResponse)
def get_public_organization(org_slug: str, db: Session = Depends(get_db)) -> PublicOrganizationResponse:
    organization = get_org_by_slug_or_404(db, org_slug)
    return PublicOrganizationResponse(
        name=organization.name,
        slug=organization.slug,
        logo_path=organization.logo_path,
        whatsapp_number=organization.whatsapp_number if organization.whatsapp_verified else None,
        storefront_config=get_storefront_config(db, organization.id),
    )


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
def create_public_lead(
    org_slug: str,
    payload: LeadCreateRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> Lead:
    enforce_rate_limit(f"public_lead:{request.client.host if request.client else 'unknown'}")

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

    background_tasks.add_task(
        run_lead_automation,
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


@router.post("/{org_slug}/ai/chat", response_model=ChatResponse)
def public_ai_chat(
    org_slug: str,
    payload: ChatRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> ChatResponse:
    enforce_rate_limit(
        f"public_ai_chat:{request.client.host if request.client else 'unknown'}",
        limit=settings.RATE_LIMIT_PUBLIC_AI_CHAT_PER_MINUTE,
    )

    organization = get_org_by_slug_or_404(db, org_slug)

    customer_identifier = payload.customer_identifier or (
        f"anon:{request.client.host}" if request.client else "anon:unknown"
    )

    return handle_chat_message(db, organization, payload.conversation_id, payload.message, customer_identifier)
