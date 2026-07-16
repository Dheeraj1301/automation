from dataclasses import dataclass
from decimal import Decimal

from app.core.catalog import (
    clamp_page,
    clamp_page_size,
    parse_bulk_import_csv,
    total_inventory,
    variant_price_range,
)


@dataclass
class FakeVariant:
    price: Decimal
    inventory_count: int


def test_clamp_page_defaults_and_floors_at_one():
    assert clamp_page(None) == 1
    assert clamp_page(0) == 1
    assert clamp_page(-5) == 1
    assert clamp_page(5) == 5


def test_clamp_page_size_defaults_and_bounds():
    assert clamp_page_size(None) == 20
    assert clamp_page_size(0) == 1
    assert clamp_page_size(5) == 5
    assert clamp_page_size(1000) == 100


def test_variant_price_range_empty():
    assert variant_price_range([]) == (Decimal("0"), Decimal("0"))


def test_variant_price_range_min_max():
    variants = [FakeVariant(Decimal("10.00"), 1), FakeVariant(Decimal("25.50"), 2), FakeVariant(Decimal("5.00"), 3)]
    assert variant_price_range(variants) == (Decimal("5.00"), Decimal("25.50"))


def test_total_inventory_sums_all_variants():
    variants = [FakeVariant(Decimal("1"), 3), FakeVariant(Decimal("1"), 7)]
    assert total_inventory(variants) == 10


def test_parse_bulk_import_csv_groups_variants_by_product_name():
    csv_content = (
        "name,sku,size,color,price,inventory_count,category,description,status\n"
        "Classic Tee,TEE-S-BLU,S,Blue,19.99,10,Apparel,A comfy tee,active\n"
        "Classic Tee,TEE-M-BLU,M,Blue,19.99,5,Apparel,A comfy tee,active\n"
        "Classic Tee,TEE-L-BLU,L,Blue,21.99,0,Apparel,A comfy tee,active\n"
    )

    groups, errors = parse_bulk_import_csv(csv_content)

    assert errors == []
    assert len(groups) == 1
    group = groups[0]
    assert group.name == "Classic Tee"
    assert group.category == "Apparel"
    assert len(group.variants) == 3
    assert {v.sku for v in group.variants} == {"TEE-S-BLU", "TEE-M-BLU", "TEE-L-BLU"}


def test_parse_bulk_import_csv_case_insensitive_grouping():
    csv_content = "name,sku,price\n" "Blue Mug,MUG-1,9.99\n" "blue mug,MUG-2,9.99\n"

    groups, errors = parse_bulk_import_csv(csv_content)

    assert errors == []
    assert len(groups) == 1
    assert len(groups[0].variants) == 2


def test_parse_bulk_import_csv_missing_required_field_is_reported():
    csv_content = "name,sku,price\n" ",MUG-1,9.99\n"

    groups, errors = parse_bulk_import_csv(csv_content)

    assert groups == []
    assert len(errors) == 1
    assert errors[0].row == 2
    assert "name" in errors[0].message


def test_parse_bulk_import_csv_invalid_price_is_reported():
    csv_content = "name,sku,price\n" "Mug,MUG-1,not-a-number\n"

    groups, errors = parse_bulk_import_csv(csv_content)

    assert groups == []
    assert len(errors) == 1
    assert "price" in errors[0].message.lower()


def test_parse_bulk_import_csv_zero_or_negative_price_is_rejected():
    csv_content = "name,sku,price\n" "Mug,MUG-1,0\n" "Mug,MUG-2,-5\n"

    groups, errors = parse_bulk_import_csv(csv_content)

    assert groups == []
    assert len(errors) == 2


def test_parse_bulk_import_csv_invalid_inventory_count_is_reported():
    csv_content = "name,sku,price,inventory_count\n" "Mug,MUG-1,9.99,not-a-number\n"

    groups, errors = parse_bulk_import_csv(csv_content)

    assert groups == []
    assert len(errors) == 1
    assert "inventory_count" in errors[0].message


def test_parse_bulk_import_csv_defaults_status_and_inventory():
    csv_content = "name,sku,price\n" "Mug,MUG-1,9.99\n"

    groups, errors = parse_bulk_import_csv(csv_content)

    assert errors == []
    assert groups[0].status == "active"
    assert groups[0].variants[0].inventory_count == 0
    assert groups[0].category is None
