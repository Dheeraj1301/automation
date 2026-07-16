import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_membership, require_role
from app.core.provisioning import slugify
from app.db.session import get_db
from app.models.category import Category
from app.models.membership import Membership
from app.models.product import Product
from app.schemas.product import CategoryCreate, CategoryResponse

router = APIRouter()

CATALOG_ROLES = ("owner", "admin", "staff")


def unique_category_slug(db: Session, org_id: uuid.UUID, name: str) -> str:
    base_slug = slugify(name)
    slug = base_slug
    suffix = 1
    while db.query(Category).filter(Category.organization_id == org_id, Category.slug == slug).first() is not None:
        suffix += 1
        slug = f"{base_slug}-{suffix}"
    return slug


def get_or_create_category(db: Session, org_id: uuid.UUID, name: str) -> Category:
    category = db.query(Category).filter(Category.organization_id == org_id, Category.name == name).first()
    if category is None:
        category = Category(organization_id=org_id, name=name, slug=unique_category_slug(db, org_id, name))
        db.add(category)
        db.flush()
    return category


@router.get("", response_model=list[CategoryResponse])
def list_categories(
    org_id: uuid.UUID,
    membership: Membership = Depends(get_membership),
    db: Session = Depends(get_db),
) -> list[Category]:
    return db.query(Category).filter(Category.organization_id == org_id).order_by(Category.name).all()


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    org_id: uuid.UUID,
    payload: CategoryCreate,
    membership: Membership = Depends(require_role(*CATALOG_ROLES)),
    db: Session = Depends(get_db),
) -> Category:
    category = Category(organization_id=org_id, name=payload.name, slug=unique_category_slug(db, org_id, payload.name))
    db.add(category)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Category already exists")
    db.refresh(category)
    return category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    org_id: uuid.UUID,
    category_id: uuid.UUID,
    membership: Membership = Depends(require_role(*CATALOG_ROLES)),
    db: Session = Depends(get_db),
) -> None:
    category = db.query(Category).filter(Category.id == category_id, Category.organization_id == org_id).first()
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    db.query(Product).filter(Product.category_id == category_id, Product.organization_id == org_id).update(
        {"category_id": None}
    )
    db.delete(category)
    db.commit()
