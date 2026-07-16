"""build_list_item/build_detail only read attributes off whatever object
they're given, so we can verify their behavior with plain fakes shaped
like the ORM models - no database required."""

import uuid
from dataclasses import dataclass, field
from decimal import Decimal

from app.core.catalog import build_detail, build_list_item


@dataclass
class FakeCategory:
    id: uuid.UUID
    name: str


@dataclass
class FakeVariant:
    id: uuid.UUID
    sku: str
    size: str | None
    color: str | None
    price: Decimal
    inventory_count: int


@dataclass
class FakeImage:
    id: uuid.UUID
    file_path: str
    position: int


@dataclass
class FakeProduct:
    id: uuid.UUID
    name: str
    slug: str
    description: str | None
    status: str
    category_id: uuid.UUID | None
    category: FakeCategory | None
    variants: list = field(default_factory=list)
    images: list = field(default_factory=list)


def make_product(**overrides) -> FakeProduct:
    defaults = dict(
        id=uuid.uuid4(),
        name="Classic Tee",
        slug="classic-tee",
        description="A comfy tee",
        status="active",
        category_id=None,
        category=None,
        variants=[
            FakeVariant(id=uuid.uuid4(), sku="TEE-S", size="S", color="Blue", price=Decimal("19.99"), inventory_count=5),
            FakeVariant(id=uuid.uuid4(), sku="TEE-M", size="M", color="Blue", price=Decimal("21.99"), inventory_count=3),
        ],
        images=[FakeImage(id=uuid.uuid4(), file_path="/uploads/org/products/p/1.png", position=0)],
    )
    defaults.update(overrides)
    return FakeProduct(**defaults)


def test_build_list_item_computes_price_range_and_inventory():
    product = make_product()

    item = build_list_item(product)

    assert item.min_price == Decimal("19.99")
    assert item.max_price == Decimal("21.99")
    assert item.total_inventory == 8
    assert item.variant_count == 2
    assert item.primary_image == "/uploads/org/products/p/1.png"
    assert item.category_name is None


def test_build_list_item_uses_category_name_when_present():
    category = FakeCategory(id=uuid.uuid4(), name="Apparel")
    product = make_product(category=category)

    item = build_list_item(product)

    assert item.category_name == "Apparel"


def test_build_list_item_handles_no_images():
    product = make_product(images=[])

    item = build_list_item(product)

    assert item.primary_image is None


def test_build_detail_includes_all_variants_and_images():
    product = make_product()

    detail = build_detail(product)

    assert detail.name == "Classic Tee"
    assert len(detail.variants) == 2
    assert {v.sku for v in detail.variants} == {"TEE-S", "TEE-M"}
    assert len(detail.images) == 1
