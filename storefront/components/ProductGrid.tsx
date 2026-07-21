import { ProductListItem } from "@/lib/api";
import { pickVariant } from "@/lib/layoutVariant";
import { ProductCard } from "@/components/ProductCard";

export function ProductGrid({ products, seed }: { products: ProductListItem[]; seed: string }) {
  const variant = pickVariant(seed, 3);

  if (variant === 1) {
    // Masonry-ish: CSS columns, cards flow top-to-bottom then wrap.
    return (
      <div className="columns-2 gap-4 sm:columns-3 lg:columns-4 [&>*]:mb-4 [&>*]:break-inside-avoid">
        {products.map((product, i) => (
          <ProductCard key={product.id} product={product} size={i % 3 === 0 ? "large" : "normal"} />
        ))}
      </div>
    );
  }

  if (variant === 2) {
    return (
      <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6">
        {products.map((product) => (
          <div key={product.id} className="w-56 flex-none snap-start sm:w-64">
            <ProductCard product={product} size="large" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
