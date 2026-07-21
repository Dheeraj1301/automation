import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { storefrontApi } from "@/lib/api";
import { ProductGrid } from "@/components/ProductGrid";
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
  const ctaClassName =
    "mt-8 inline-block rounded-theme bg-primary px-7 py-3.5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover";

  return (
    <div>
      <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-24">
        <h1 className="animate-reveal font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
          {page.hero_heading}
        </h1>
        {page.hero_subheading && (
          <p className="animate-reveal mx-auto mt-5 max-w-xl text-lg text-muted">{page.hero_subheading}</p>
        )}
        {isExternalCta ? (
          <a href={page.cta_url} className={ctaClassName}>
            {page.cta_text}
          </a>
        ) : (
          <Link href={page.cta_url} className={ctaClassName}>
            {page.cta_text}
          </Link>
        )}
      </section>

      {products && products.items.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <ProductGrid products={products.items} seed={page.slug} />
        </section>
      )}

      <section className="mx-auto max-w-md px-4 pb-16 sm:px-6">
        <h2 className="mb-6 text-center font-heading text-xl font-semibold tracking-tight">
          Want to hear about future drops?
        </h2>
        <LeadCaptureForm landingPageSlug={page.slug} />
      </section>
    </div>
  );
}
