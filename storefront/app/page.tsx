import Link from "next/link";
import { storefrontApi } from "@/lib/api";
import { Hero } from "@/components/Hero";
import { ProductGrid } from "@/components/ProductGrid";
import { WhyChooseUs } from "@/components/WhyChooseUs";
import { Testimonials } from "@/components/Testimonials";
import { FAQAccordion } from "@/components/FAQAccordion";
import { AboutSection } from "@/components/AboutSection";
import { LeadCaptureForm } from "@/components/LeadCaptureForm";

export const revalidate = 60;

export default async function HomePage() {
  const organization = await storefrontApi.getOrganization();
  const products = await storefrontApi.listProducts({ page: 1, page_size: 8 });
  const categories = await storefrontApi.listCategories();

  const name = organization?.name ?? "Welcome";
  const config = organization?.storefront_config;
  const seed = organization?.slug ?? name;

  return (
    <div>
      <Hero hero={config?.hero ?? { heading: "", subheading: "", cta_text: "", cta_url: "/products", image_path: null }} organizationName={name} seed={seed} />

      {categories.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="flex flex-wrap justify-center gap-3">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/products?category_id=${category.id}`}
                className="animate-reveal rounded-theme-lg border border-border bg-surface px-5 py-2.5 text-sm font-medium text-text transition-colors hover:border-primary hover:text-primary"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {products && products.items.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <h2 className="animate-reveal mb-6 text-center font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Featured products
          </h2>
          <ProductGrid products={products.items} seed={seed} />
          <div className="mt-8 text-center">
            <Link href="/products" className="text-sm font-semibold text-primary hover:underline">
              View full catalog &rarr;
            </Link>
          </div>
        </section>
      )}

      <WhyChooseUs items={config?.why_choose_us ?? []} />

      {config && <AboutSection heading={config.about_heading} body={config.about_body} organizationName={name} />}

      <Testimonials items={config?.testimonials ?? []} />

      <FAQAccordion items={config?.faqs ?? []} />

      <section className="mx-auto max-w-xl px-4 py-16 sm:px-6">
        <h2 className="animate-reveal mb-6 text-center font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Get in touch
        </h2>
        <LeadCaptureForm />
      </section>
    </div>
  );
}
