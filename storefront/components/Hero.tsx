import Link from "next/link";
import { assetUrl, HeroConfig } from "@/lib/api";
import { pickVariant } from "@/lib/layoutVariant";

export function Hero({
  hero,
  organizationName,
  seed,
}: {
  hero: HeroConfig;
  organizationName: string;
  seed: string;
}) {
  const heading = hero.heading || organizationName;
  const subheading = hero.subheading || "Browse our latest products, picked fresh for you.";
  const ctaText = hero.cta_text || "Shop now";
  const ctaUrl = hero.cta_url || "/products";

  // Split variant needs an image to look right - fall back to centered
  // when the merchant hasn't uploaded one yet.
  const variant = hero.image_path ? pickVariant(seed, 3) : pickVariant(seed, 2) === 0 ? 0 : 2;

  if (variant === 1 && hero.image_path) {
    return (
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-24">
        <div className="animate-reveal">
          <h1 className="font-heading text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">{heading}</h1>
          <p className="mt-5 max-w-lg text-lg text-muted">{subheading}</p>
          <Link
            href={ctaUrl}
            className="mt-8 inline-block rounded-theme bg-primary px-7 py-3.5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover"
          >
            {ctaText}
          </Link>
        </div>
        <div className="animate-reveal aspect-[4/5] overflow-hidden rounded-theme-lg bg-surface-alt shadow-theme">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={assetUrl(hero.image_path)} alt={heading} className="h-full w-full object-cover" />
        </div>
      </section>
    );
  }

  if (variant === 2) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6 md:py-28">
        <p className="animate-reveal font-heading text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          {organizationName}
        </p>
        <h1 className="animate-reveal mt-4 font-heading text-4xl font-semibold leading-[1.1] tracking-tight sm:text-6xl">
          {heading}
        </h1>
        <p className="animate-reveal mt-6 max-w-xl text-lg text-muted">{subheading}</p>
        <Link
          href={ctaUrl}
          className="animate-reveal mt-9 inline-block rounded-theme bg-primary px-7 py-3.5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover"
        >
          {ctaText}
        </Link>
      </section>
    );
  }

  return (
    <section className="border-b border-border bg-surface-alt">
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 md:py-28">
        <h1 className="animate-reveal font-heading text-4xl font-semibold tracking-tight sm:text-5xl">{heading}</h1>
        <p className="animate-reveal mx-auto mt-5 max-w-xl text-lg text-muted">{subheading}</p>
        <Link
          href={ctaUrl}
          className="animate-reveal mt-8 inline-block rounded-theme bg-primary px-7 py-3.5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover"
        >
          {ctaText}
        </Link>
      </div>
    </section>
  );
}
