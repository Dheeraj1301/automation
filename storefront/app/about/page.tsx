import type { Metadata } from "next";
import { storefrontApi } from "@/lib/api";
import { AboutSection } from "@/components/AboutSection";
import { WhyChooseUs } from "@/components/WhyChooseUs";
import { Testimonials } from "@/components/Testimonials";

export const metadata: Metadata = { title: "About" };
export const revalidate = 60;

export default async function AboutPage() {
  const organization = await storefrontApi.getOrganization();
  const name = organization?.name ?? "our store";
  const config = organization?.storefront_config;

  const hasContent = config && (config.about_body || config.why_choose_us.length > 0 || config.testimonials.length > 0);

  return (
    <div>
      {hasContent ? (
        <>
          <AboutSection heading={config!.about_heading} body={config!.about_body} organizationName={name} />
          <WhyChooseUs items={config!.why_choose_us} />
          <Testimonials items={config!.testimonials} />
        </>
      ) : (
        <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-text sm:text-3xl">About {name}</h1>
          <p className="mt-5 text-sm leading-relaxed text-muted">
            Welcome to {name}. We&apos;re a growing online store bringing you a curated selection of products.
          </p>
        </div>
      )}
    </div>
  );
}
