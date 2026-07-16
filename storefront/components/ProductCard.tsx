import Link from "next/link";
import { assetUrl, ProductListItem } from "@/lib/api";

export function ProductCard({ product }: { product: ProductListItem }) {
  const priceLabel = product.min_price === product.max_price ? `$${product.min_price}` : `$${product.min_price} – $${product.max_price}`;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block overflow-hidden rounded-theme border border-black/10 dark:border-white/10"
    >
      <div className="aspect-square overflow-hidden bg-black/5 dark:bg-white/5">
        {product.primary_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={assetUrl(product.primary_image)}
            alt={product.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted">No image</div>
        )}
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-medium">{product.name}</p>
        <p className="text-sm text-muted">{priceLabel}</p>
      </div>
    </Link>
  );
}
