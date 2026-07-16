import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_membership, require_role
from app.api.routes.categories import get_or_create_category, unique_category_slug
from app.core.catalog import clamp_page, clamp_page_size, parse_bulk_import_csv, total_inventory, variant_price_range
from app.core.logging import get_logger
from app.core.provisioning import slugify
from app.db.session import get_db
from app.models.category import Category
from app.models.membership import Membership
from app.models.product import Product
from app.models.product_image import ProductImage
from app.models.product_variant import ProductVariant
from app.schemas.product import (
    BulkImportError,
    BulkImportResult,
    ImageResponse,
    PaginatedProducts,
    ProductCreate,
    ProductDetailResponse,
    ProductListItem,
    ProductUpdate,
    VariantCreate,
    VariantResponse,
    VariantUpdate,
)

router = APIRouter()
logger = get_logger(__name__)

CATALOG_ROLES = ("owner", "admin", "staff")

UPLOAD_ROOT = Path("uploads")
ALLOWED_IMAGE_TYPES = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp"}
MAX_IMAGE_BYTES = 2 * 1024 * 1024


def unique_product_slug(db: Session, org_id: uuid.UUID, name: str) -> str:
    base_slug = slugify(name)
    slug = base_slug
    suffix = 1
    while db.query(Product).filter(Product.organization_id == org_id, Product.slug == slug).first() is not None:
        suffix += 1
        slug = f"{base_slug}-{suffix}"
    return slug


def get_org_product_or_404(db: Session, org_id: uuid.UUID, product_id: uuid.UUID) -> Product:
    product = db.query(Product).filter(Product.id == product_id, Product.organization_id == org_id).first()
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


def get_org_variant_or_404(db: Session, org_id: uuid.UUID, product_id: uuid.UUID, variant_id: uuid.UUID) -> ProductVariant:
    variant = (
        db.query(ProductVariant)
        .filter(
            ProductVariant.id == variant_id,
            ProductVariant.product_id == product_id,
            ProductVariant.organization_id == org_id,
        )
        .first()
    )
    if variant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Variant not found")
    return variant


def build_list_item(product: Product) -> ProductListItem:
    min_price, max_price = variant_price_range(product.variants)
    return ProductListItem(
        id=product.id,
        name=product.name,
        slug=product.slug,
        status=product.status,
        category_name=product.category.name if product.category else None,
        primary_image=product.images[0].file_path if product.images else None,
        min_price=min_price,
        max_price=max_price,
        total_inventory=total_inventory(product.variants),
        variant_count=len(product.variants),
    )


def build_detail(product: Product) -> ProductDetailResponse:
    return ProductDetailResponse(
        id=product.id,
        name=product.name,
        slug=product.slug,
        description=product.description,
        status=product.status,
        category_id=product.category_id,
        category_name=product.category.name if product.category else None,
        variants=[VariantResponse.model_validate(v) for v in product.variants],
        images=[ImageResponse.model_validate(i) for i in product.images],
    )


@router.get("", response_model=PaginatedProducts)
def list_products(
    org_id: uuid.UUID,
    q: str | None = Query(default=None),
    category_id: uuid.UUID | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    page: int = Query(default=1),
    page_size: int = Query(default=20),
    membership: Membership = Depends(get_membership),
    db: Session = Depends(get_db),
) -> PaginatedProducts:
    page = clamp_page(page)
    page_size = clamp_page_size(page_size)

    query = db.query(Product).filter(Product.organization_id == org_id)
    if q:
        query = query.filter(Product.name.ilike(f"%{q}%"))
    if category_id:
        query = query.filter(Product.category_id == category_id)
    if status_filter:
        query = query.filter(Product.status == status_filter)

    total = query.count()
    products = (
        query.order_by(Product.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    )

    return PaginatedProducts(
        items=[build_list_item(p) for p in products], total=total, page=page, page_size=page_size
    )


@router.post("", response_model=ProductDetailResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    org_id: uuid.UUID,
    payload: ProductCreate,
    membership: Membership = Depends(require_role(*CATALOG_ROLES)),
    db: Session = Depends(get_db),
) -> ProductDetailResponse:
    if payload.category_id is not None:
        category = (
            db.query(Category).filter(Category.id == payload.category_id, Category.organization_id == org_id).first()
        )
        if category is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Category not found")

    product = Product(
        organization_id=org_id,
        category_id=payload.category_id,
        name=payload.name,
        slug=unique_product_slug(db, org_id, payload.name),
        description=payload.description,
        status=payload.status,
    )
    db.add(product)
    db.flush()

    variant = ProductVariant(
        organization_id=org_id,
        product_id=product.id,
        sku=payload.sku,
        size=payload.size,
        color=payload.color,
        price=payload.price,
        inventory_count=payload.inventory_count,
    )
    db.add(variant)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="SKU already in use")

    db.refresh(product)
    logger.info("product_created", organization_id=str(org_id), product_id=str(product.id))
    return build_detail(product)


@router.get("/{product_id}", response_model=ProductDetailResponse)
def get_product(
    org_id: uuid.UUID,
    product_id: uuid.UUID,
    membership: Membership = Depends(get_membership),
    db: Session = Depends(get_db),
) -> ProductDetailResponse:
    return build_detail(get_org_product_or_404(db, org_id, product_id))


@router.patch("/{product_id}", response_model=ProductDetailResponse)
def update_product(
    org_id: uuid.UUID,
    product_id: uuid.UUID,
    payload: ProductUpdate,
    membership: Membership = Depends(require_role(*CATALOG_ROLES)),
    db: Session = Depends(get_db),
) -> ProductDetailResponse:
    product = get_org_product_or_404(db, org_id, product_id)
    data = payload.model_dump(exclude_unset=True)

    if "category_id" in data and data["category_id"] is not None:
        category = (
            db.query(Category)
            .filter(Category.id == data["category_id"], Category.organization_id == org_id)
            .first()
        )
        if category is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Category not found")

    for field_name, value in data.items():
        setattr(product, field_name, value)

    db.commit()
    db.refresh(product)
    return build_detail(product)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    org_id: uuid.UUID,
    product_id: uuid.UUID,
    membership: Membership = Depends(require_role(*CATALOG_ROLES)),
    db: Session = Depends(get_db),
) -> None:
    product = get_org_product_or_404(db, org_id, product_id)
    db.delete(product)
    db.commit()


@router.post("/{product_id}/variants", response_model=VariantResponse, status_code=status.HTTP_201_CREATED)
def add_variant(
    org_id: uuid.UUID,
    product_id: uuid.UUID,
    payload: VariantCreate,
    membership: Membership = Depends(require_role(*CATALOG_ROLES)),
    db: Session = Depends(get_db),
) -> ProductVariant:
    get_org_product_or_404(db, org_id, product_id)

    variant = ProductVariant(organization_id=org_id, product_id=product_id, **payload.model_dump())
    db.add(variant)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="SKU already in use")
    db.refresh(variant)
    return variant


@router.patch("/{product_id}/variants/{variant_id}", response_model=VariantResponse)
def update_variant(
    org_id: uuid.UUID,
    product_id: uuid.UUID,
    variant_id: uuid.UUID,
    payload: VariantUpdate,
    membership: Membership = Depends(require_role(*CATALOG_ROLES)),
    db: Session = Depends(get_db),
) -> ProductVariant:
    variant = get_org_variant_or_404(db, org_id, product_id, variant_id)
    for field_name, value in payload.model_dump(exclude_unset=True).items():
        setattr(variant, field_name, value)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="SKU already in use")
    db.refresh(variant)
    return variant


@router.delete("/{product_id}/variants/{variant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_variant(
    org_id: uuid.UUID,
    product_id: uuid.UUID,
    variant_id: uuid.UUID,
    membership: Membership = Depends(require_role(*CATALOG_ROLES)),
    db: Session = Depends(get_db),
) -> None:
    variant = get_org_variant_or_404(db, org_id, product_id, variant_id)

    remaining = db.query(ProductVariant).filter(ProductVariant.product_id == product_id).count()
    if remaining <= 1:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A product must have at least one variant")

    db.delete(variant)
    db.commit()


@router.post("/{product_id}/images", response_model=ImageResponse, status_code=status.HTTP_201_CREATED)
async def upload_product_image(
    org_id: uuid.UUID,
    product_id: uuid.UUID,
    file: UploadFile = File(...),
    membership: Membership = Depends(require_role(*CATALOG_ROLES)),
    db: Session = Depends(get_db),
) -> ProductImage:
    get_org_product_or_404(db, org_id, product_id)

    extension = ALLOWED_IMAGE_TYPES.get(file.content_type)
    if extension is None:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Image must be a PNG, JPEG, or WEBP file"
        )

    contents = await file.read()
    if len(contents) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Image must be under 2MB")

    image_dir = UPLOAD_ROOT / str(org_id) / "products" / str(product_id)
    image_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex}.{extension}"
    (image_dir / filename).write_bytes(contents)

    position = db.query(ProductImage).filter(ProductImage.product_id == product_id).count()
    image = ProductImage(
        organization_id=org_id,
        product_id=product_id,
        file_path=f"/uploads/{org_id}/products/{product_id}/{filename}",
        position=position,
    )
    db.add(image)
    db.commit()
    db.refresh(image)
    return image


@router.delete("/{product_id}/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product_image(
    org_id: uuid.UUID,
    product_id: uuid.UUID,
    image_id: uuid.UUID,
    membership: Membership = Depends(require_role(*CATALOG_ROLES)),
    db: Session = Depends(get_db),
) -> None:
    image = (
        db.query(ProductImage)
        .filter(ProductImage.id == image_id, ProductImage.product_id == product_id, ProductImage.organization_id == org_id)
        .first()
    )
    if image is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")

    file_path = Path(image.file_path.lstrip("/"))
    file_path.unlink(missing_ok=True)

    db.delete(image)
    db.commit()


@router.post("/bulk-import", response_model=BulkImportResult)
async def bulk_import_products(
    org_id: uuid.UUID,
    file: UploadFile = File(...),
    membership: Membership = Depends(require_role(*CATALOG_ROLES)),
    db: Session = Depends(get_db),
) -> BulkImportResult:
    if not (file.filename or "").lower().endswith(".csv"):
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Please upload a .csv file")

    raw = await file.read()
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File must be UTF-8 encoded")

    groups, parse_errors = parse_bulk_import_csv(text)

    products_created = 0
    variants_created = 0
    row_errors = list(parse_errors)

    for group in groups:
        category_id = None
        if group.category:
            category_id = get_or_create_category(db, org_id, group.category).id

        product = Product(
            organization_id=org_id,
            category_id=category_id,
            name=group.name,
            slug=unique_product_slug(db, org_id, group.name),
            description=group.description,
            status=group.status,
        )
        db.add(product)
        db.flush()
        products_created += 1

        for variant_row in group.variants:
            db.add(
                ProductVariant(
                    organization_id=org_id,
                    product_id=product.id,
                    sku=variant_row.sku,
                    size=variant_row.size,
                    color=variant_row.color,
                    price=variant_row.price,
                    inventory_count=variant_row.inventory_count,
                )
            )
            variants_created += 1

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Import failed: a SKU or product name in this file already exists in your catalog",
        )

    logger.info(
        "products_bulk_imported",
        organization_id=str(org_id),
        products_created=products_created,
        variants_created=variants_created,
        errors=len(row_errors),
    )

    return BulkImportResult(
        products_created=products_created,
        variants_created=variants_created,
        errors=[BulkImportError(row=e.row, message=e.message) for e in row_errors],
    )
