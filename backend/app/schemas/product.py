import uuid
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

ProductStatus = Literal["active", "draft", "archived"]


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class CategoryResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str

    model_config = {"from_attributes": True}


class VariantCreate(BaseModel):
    sku: str = Field(min_length=1, max_length=100)
    size: str | None = Field(default=None, max_length=50)
    color: str | None = Field(default=None, max_length=50)
    price: Decimal = Field(gt=0)
    inventory_count: int = Field(default=0, ge=0)


class VariantUpdate(BaseModel):
    sku: str | None = Field(default=None, min_length=1, max_length=100)
    size: str | None = Field(default=None, max_length=50)
    color: str | None = Field(default=None, max_length=50)
    price: Decimal | None = Field(default=None, gt=0)
    inventory_count: int | None = Field(default=None, ge=0)


class VariantResponse(BaseModel):
    id: uuid.UUID
    sku: str
    size: str | None
    color: str | None
    price: Decimal
    inventory_count: int

    model_config = {"from_attributes": True}


class ImageResponse(BaseModel):
    id: uuid.UUID
    file_path: str
    position: int

    model_config = {"from_attributes": True}


class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    category_id: uuid.UUID | None = None
    status: ProductStatus = "active"
    sku: str = Field(min_length=1, max_length=100)
    size: str | None = Field(default=None, max_length=50)
    color: str | None = Field(default=None, max_length=50)
    price: Decimal = Field(gt=0)
    inventory_count: int = Field(default=0, ge=0)


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    category_id: uuid.UUID | None = None
    status: ProductStatus | None = None


class ProductListItem(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    status: str
    category_name: str | None
    primary_image: str | None
    min_price: Decimal
    max_price: Decimal
    total_inventory: int
    variant_count: int


class PaginatedProducts(BaseModel):
    items: list[ProductListItem]
    total: int
    page: int
    page_size: int


class ProductDetailResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    description: str | None
    status: str
    category_id: uuid.UUID | None
    category_name: str | None
    variants: list[VariantResponse]
    images: list[ImageResponse]


class BulkImportError(BaseModel):
    row: int
    message: str


class BulkImportResult(BaseModel):
    products_created: int
    variants_created: int
    errors: list[BulkImportError]
