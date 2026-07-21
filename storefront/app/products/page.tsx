import type { Metadata } from "next";
import { storefrontApi } from "@/lib/api";
import { ProductGrid } from "@/components/ProductGrid";

export const metadata: Metadata = { title: "Shop" };
export const revalidate = 60;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string; category_id?: string; page?: string };
}) {
  const page = Number(searchParams.page) || 1;
  const categoryId = searchParams.category_id ?? searchParams.category;
  const [products, categories, organization] = await Promise.all([
    storefrontApi.listProducts({ q: searchParams.q, category_id: categoryId, page, page_size: 24 }),
    storefrontApi.listCategories(),
    storefrontApi.getOrganization(),
  ]);

  const items = products?.items ?? [];
  const total = products?.total ?? 0;
  const pageSize = products?.page_size ?? 24;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const seed = organization?.slug ?? "shop";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="font-heading text-2xl font-semibold tracking-tight text-text sm:text-3xl">Shop</h1>

      <form className="mb-8 mt-6 flex flex-wrap gap-3" action="/products">
        <input
          type="text"
          name="q"
          defaultValue={searchParams.q}
          placeholder="Search products..."
          className="w-64 rounded-theme border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none focus:border-primary"
        />
        <select
          name="category_id"
          defaultValue={categoryId ?? ""}
          className="rounded-theme border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none focus:border-primary"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-theme bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover"
        >
          Search
        </button>
      </form>

      {items.length === 0 ? (
        <p className="text-muted">No products found.</p>
      ) : (
        <ProductGrid products={items} seed={seed} />
      )}

      {totalPages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-2 text-sm">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <a
              key={p}
              href={`/products?${new URLSearchParams({
                ...(searchParams.q ? { q: searchParams.q } : {}),
                ...(categoryId ? { category_id: categoryId } : {}),
                page: String(p),
              }).toString()}`}
              className={`rounded-theme px-3 py-1.5 transition-colors ${
                p === page ? "bg-primary text-on-primary" : "border border-border text-text hover:border-primary"
              }`}
            >
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
