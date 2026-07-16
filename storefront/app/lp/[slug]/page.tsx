import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { storefrontApi } from "@/lib/api";
import { ProductCard } from "@/components/ProductCard";
import { LeadCaptureForm } from "@/components/LeadCaptureForm";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const page = await storefrontApi.getLandingPage(params.slug);
  if (!page) return {};
  return {
    title: page.title,
    description: page.hero_subheading ?? undefined,
  };
}

export default async function LandingPage({ params }: { params: { slug: string } }) {
  const page = await storefrontApi.getLandingPage(params.slug);
  if (!page) notFound();

  const products = await storefrontApi.listProducts({
    category_id: page.featured_category_id ?? undefined,
    page: 1,
    page_size: 12,
  });

  const isExternalCta = page.cta_url.startsWith("http");

  return (
    <div>
      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight">{page.hero_heading}</h1>
        {page.hero_subheading && <p className="mx-auto mt-4 max-w-xl text-muted">{page.hero_subheading}</p>}
        {isExternalCta ? (
          <a
            href={page.cta_url}
            className="mt-6 inline-block rounded-theme bg-brand px-6 py-3 text-sm font-medium text-white hover:bg-brand-dark"
          >
            {page.cta_text}
          </a>
        ) : (
          <Link
            href={page.cta_url}
            className="mt-6 inline-block rounded-theme bg-brand px-6 py-3 text-sm font-medium text-white hover:bg-brand-dark"
          >
            {page.cta_text}
          </Link>
        )}
      </section>

      {products && products.items.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-16">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-md px-4 pb-16">
        <h2 className="mb-4 text-center text-xl font-semibold">Want to hear about future drops?</h2>
        <LeadCaptureForm landingPageSlug={page.slug} />
      </section>
    </div>
  );
}
