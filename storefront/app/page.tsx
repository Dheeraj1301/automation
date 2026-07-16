import Link from "next/link";
import { storefrontApi } from "@/lib/api";
import { ProductCard } from "@/components/ProductCard";

export const revalidate = 60;

export default async function HomePage() {
  const organization = await storefrontApi.getOrganization();
  const products = await storefrontApi.listProducts({ page: 1, page_size: 8 });

  return (
    <div>
      <section className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight">{organization?.name ?? "Welcome"}</h1>
        <p className="mx-auto mt-4 max-w-xl text-muted">
          Browse our latest products, picked fresh for you.
        </p>
        <Link
          href="/products"
          className="mt-6 inline-block rounded-theme bg-brand px-6 py-3 text-sm font-medium text-white hover:bg-brand-dark"
        >
          Shop now
        </Link>
      </section>

      {products && products.items.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-16">
          <h2 className="mb-4 text-xl font-semibold">Featured products</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
