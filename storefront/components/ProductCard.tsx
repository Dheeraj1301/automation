import Link from "next/link";
import { assetUrl, ProductListItem } from "@/lib/api";

export function ProductCard({
  product,
  size = "normal",
}: {
  product: ProductListItem;
  size?: "normal" | "large";
}) {
  const priceLabel =
    product.min_price === product.max_price ? `$${product.min_price}` : `$${product.min_price} – $${product.max_price}`;
  const outOfStock = product.total_inventory <= 0;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block overflow-hidden rounded-theme-lg border border-border bg-surface transition-shadow hover:shadow-theme"
    >
      <div className={`relative overflow-hidden bg-surface-alt ${size === "large" ? "aspect-[4/5]" : "aspect-square"}`}>
        {product.primary_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={assetUrl(product.primary_image)}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted">No image</div>
        )}
        {outOfStock && (
          <span className="absolute left-3 top-3 rounded-theme-sm bg-surface/90 px-2 py-1 text-xs font-medium text-muted backdrop-blur-sm">
            Out of stock
          </span>
        )}
      </div>
      <div className="p-4">
        {product.category_name && (
          <p className="mb-1 text-xs uppercase tracking-wide text-muted">{product.category_name}</p>
        )}
        <p className="truncate font-heading text-sm font-medium text-text">{product.name}</p>
        <p className="mt-1 text-sm text-muted">{priceLabel}</p>
      </div>
    </Link>
  );
}
