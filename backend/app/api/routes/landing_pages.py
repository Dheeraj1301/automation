import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_membership, require_role
from app.core.provisioning import slugify
from app.db.session import get_db
from app.models.category import Category
from app.models.landing_page import LandingPage
from app.models.membership import Membership
from app.schemas.marketing import LandingPageCreate, LandingPageResponse, LandingPageUpdate

router = APIRouter()

CATALOG_ROLES = ("owner", "admin", "staff")


def unique_landing_page_slug(db: Session, org_id: uuid.UUID, title: str) -> str:
    base_slug = slugify(title)
    slug = base_slug
    suffix = 1
    while (
        db.query(LandingPage).filter(LandingPage.organization_id == org_id, LandingPage.slug == slug).first()
        is not None
    ):
        suffix += 1
        slug = f"{base_slug}-{suffix}"
    return slug


def get_org_landing_page_or_404(db: Session, org_id: uuid.UUID, page_id: uuid.UUID) -> LandingPage:
    page = db.query(LandingPage).filter(LandingPage.id == page_id, LandingPage.organization_id == org_id).first()
    if page is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Landing page not found")
    return page


@router.get("", response_model=list[LandingPageResponse])
def list_landing_pages(
    org_id: uuid.UUID,
    membership: Membership = Depends(get_membership),
    db: Session = Depends(get_db),
) -> list[LandingPage]:
    return (
        db.query(LandingPage)
        .filter(LandingPage.organization_id == org_id)
        .order_by(LandingPage.created_at.desc())
        .all()
    )


@router.post("", response_model=LandingPageResponse, status_code=status.HTTP_201_CREATED)
def create_landing_page(
    org_id: uuid.UUID,
    payload: LandingPageCreate,
    membership: Membership = Depends(require_role(*CATALOG_ROLES)),
    db: Session = Depends(get_db),
) -> LandingPage:
    if payload.featured_category_id is not None:
        category = (
            db.query(Category)
            .filter(Category.id == payload.featured_category_id, Category.organization_id == org_id)
            .first()
        )
        if category is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Category not found")

    page = LandingPage(
        organization_id=org_id,
        title=payload.title,
        slug=unique_landing_page_slug(db, org_id, payload.title),
        hero_heading=payload.hero_heading,
        hero_subheading=payload.hero_subheading,
        cta_text=payload.cta_text,
        cta_url=payload.cta_url,
        featured_category_id=payload.featured_category_id,
    )
    db.add(page)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A landing page with that title already exists")
    db.refresh(page)
    return page


@router.get("/{page_id}", response_model=LandingPageResponse)
def get_landing_page(
    org_id: uuid.UUID,
    page_id: uuid.UUID,
    membership: Membership = Depends(get_membership),
    db: Session = Depends(get_db),
) -> LandingPage:
    return get_org_landing_page_or_404(db, org_id, page_id)


@router.patch("/{page_id}", response_model=LandingPageResponse)
def update_landing_page(
    org_id: uuid.UUID,
    page_id: uuid.UUID,
    payload: LandingPageUpdate,
    membership: Membership = Depends(require_role(*CATALOG_ROLES)),
    db: Session = Depends(get_db),
) -> LandingPage:
    page = get_org_landing_page_or_404(db, org_id, page_id)
    data = payload.model_dump(exclude_unset=True)

    if "featured_category_id" in data and data["featured_category_id"] is not None:
        category = (
            db.query(Category)
            .filter(Category.id == data["featured_category_id"], Category.organization_id == org_id)
            .first()
        )
        if category is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Category not found")

    for field_name, value in data.items():
        setattr(page, field_name, value)

    db.commit()
    db.refresh(page)
    return page


@router.delete("/{page_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_landing_page(
    org_id: uuid.UUID,
    page_id: uuid.UUID,
    membership: Membership = Depends(require_role(*CATALOG_ROLES)),
    db: Session = Depends(get_db),
) -> None:
    page = get_org_landing_page_or_404(db, org_id, page_id)
    db.delete(page)
    db.commit()
