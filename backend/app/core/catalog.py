"""Pure catalog logic kept free of DB/session access so it's directly unit-testable."""

import csv
import io
from dataclasses import dataclass, field
from decimal import Decimal, InvalidOperation
from typing import TYPE_CHECKING

from app.core.provisioning import slugify
from app.schemas.product import ImageResponse, ProductDetailResponse, ProductListItem, VariantResponse

if TYPE_CHECKING:
    from app.models.product import Product

DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100

REQUIRED_CSV_COLUMNS = ("name", "sku", "price")


def clamp_page(page: int | None) -> int:
    if page is None or page < 1:
        return 1
    return page


def clamp_page_size(page_size: int | None) -> int:
    if page_size is None:
        return DEFAULT_PAGE_SIZE
    return max(1, min(page_size, MAX_PAGE_SIZE))


def variant_price_range(variants: list) -> tuple[Decimal, Decimal]:
    prices = [v.price for v in variants]
    if not prices:
        return Decimal("0"), Decimal("0")
    return min(prices), max(prices)


def total_inventory(variants: list) -> int:
    return sum(v.inventory_count for v in variants)


def build_list_item(product: "Product") -> ProductListItem:
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


def build_detail(product: "Product") -> ProductDetailResponse:
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


@dataclass
class ImportVariantRow:
    sku: str
    size: str | None
    color: str | None
    price: Decimal
    inventory_count: int


@dataclass
class ImportProductGroup:
    name: str
    slug: str
    category: str | None
    description: str | None
    status: str
    variants: list[ImportVariantRow] = field(default_factory=list)


@dataclass
class ImportRowError:
    row: int
    message: str


def parse_bulk_import_csv(content: str) -> tuple[list[ImportProductGroup], list[ImportRowError]]:
    """Parses a product-catalog CSV into per-product groups of variant rows.

    Rows sharing the same (slugified) product name are grouped as variants
    of one product, so a merchant can list size/color combinations as
    repeated rows under the same product name.
    """
    reader = csv.DictReader(io.StringIO(content))
    groups: dict[str, ImportProductGroup] = {}
    errors: list[ImportRowError] = []

    for row_number, row in enumerate(reader, start=2):
        missing = [col for col in REQUIRED_CSV_COLUMNS if not (row.get(col) or "").strip()]
        if missing:
            errors.append(ImportRowError(row=row_number, message=f"Missing required field(s): {', '.join(missing)}"))
            continue

        try:
            price = Decimal((row["price"] or "0").strip())
        except InvalidOperation:
            errors.append(ImportRowError(row=row_number, message=f"Invalid price: {row['price']!r}"))
            continue
        if price <= 0:
            errors.append(ImportRowError(row=row_number, message="Price must be greater than 0"))
            continue

        inventory_raw = (row.get("inventory_count") or "0").strip()
        try:
            inventory_count = int(inventory_raw) if inventory_raw else 0
        except ValueError:
            errors.append(ImportRowError(row=row_number, message=f"Invalid inventory_count: {inventory_raw!r}"))
            continue
        if inventory_count < 0:
            errors.append(ImportRowError(row=row_number, message="inventory_count cannot be negative"))
            continue

        name = row["name"].strip()
        slug = slugify(name)
        group = groups.setdefault(
            slug,
            ImportProductGroup(
                name=name,
                slug=slug,
                category=(row.get("category") or "").strip() or None,
                description=(row.get("description") or "").strip() or None,
                status=(row.get("status") or "active").strip() or "active",
            ),
        )
        group.variants.append(
            ImportVariantRow(
                sku=row["sku"].strip(),
                size=(row.get("size") or "").strip() or None,
                color=(row.get("color") or "").strip() or None,
                price=price,
                inventory_count=inventory_count,
            )
        )

    return list(groups.values()), errors
