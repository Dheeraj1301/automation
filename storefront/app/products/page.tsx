import type { Metadata } from "next";
import { storefrontApi } from "@/lib/api";
import { ProductCard } from "@/components/ProductCard";

export const metadata: Metadata = { title: "Shop" };
export const revalidate = 60;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string; page?: string };
}) {
  const page = Number(searchParams.page) || 1;
  const [products, categories] = await Promise.all([
    storefrontApi.listProducts({ q: searchParams.q, category_id: searchParams.category, page, page_size: 24 }),
    storefrontApi.listCategories(),
  ]);

  const items = products?.items ?? [];
  const total = products?.total ?? 0;
  const pageSize = products?.page_size ?? 24;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Shop</h1>

      <form className="mb-6 flex flex-wrap gap-3" action="/products">
        <input
          type="text"
          name="q"
          defaultValue={searchParams.q}
          placeholder="Search products..."
          className="w-64 rounded-theme border border-black/10 px-3 py-2 text-sm dark:border-white/10 dark:bg-transparent"
        />
        <select
          name="category"
          defaultValue={searchParams.category ?? ""}
          className="rounded-theme border border-black/10 px-3 py-2 text-sm dark:border-white/10 dark:bg-transparent"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-theme bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">
          Search
        </button>
      </form>

      {items.length === 0 ? (
        <p className="text-muted">No products found.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2 text-sm">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <a
              key={p}
              href={`/products?${new URLSearchParams({ ...(searchParams.q ? { q: searchParams.q } : {}), ...(searchParams.category ? { category: searchParams.category } : {}), page: String(p) }).toString()}`}
              className={`rounded-theme px-3 py-1 ${p === page ? "bg-brand text-white" : "border border-black/10 dark:border-white/10"}`}
            >
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
