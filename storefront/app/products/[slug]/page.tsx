import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { assetUrl, storefrontApi } from "@/lib/api";
import { VariantPicker } from "@/components/VariantPicker";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await storefrontApi.getProduct(params.slug);
  if (!product) return {};
  return {
    title: product.name,
    description: product.description ?? undefined,
    openGraph: {
      title: product.name,
      description: product.description ?? undefined,
      images: product.images.map((img) => assetUrl(img.file_path)),
    },
  };
}

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  const product = await storefrontApi.getProduct(params.slug);
  if (!product) notFound();

  const prices = product.variants.map((v) => Number(v.price));
  const totalInventory = product.variants.reduce((sum, v) => sum + v.inventory_count, 0);

  const jsonLd = {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    image: product.images.map((img) => assetUrl(img.file_path)),
    category: product.category_name ?? undefined,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: Math.min(...prices),
      highPrice: Math.max(...prices),
      offerCount: product.variants.length,
      availability: totalInventory > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="mb-6 text-sm text-muted">
        <Link href="/products" className="hover:text-primary">
          Shop
        </Link>
        <span className="mx-2">/</span>
        <span className="text-text">{product.name}</span>
      </nav>

      <div className="grid gap-10 md:grid-cols-2">
        <div>
          <div className="aspect-square overflow-hidden rounded-theme-lg bg-surface-alt shadow-theme">
            {product.images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={assetUrl(product.images[0].file_path)} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-muted">No image</div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {product.images.slice(1).map((img) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={img.id}
                  src={assetUrl(img.file_path)}
                  alt=""
                  className="h-16 w-16 rounded-theme border border-border object-cover"
                />
              ))}
            </div>
          )}
        </div>

        <div>
          {product.category_name && (
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">{product.category_name}</p>
          )}
          <h1 className="mt-1.5 font-heading text-3xl font-semibold tracking-tight text-text">{product.name}</h1>
          {product.description && <p className="mt-4 text-sm leading-relaxed text-muted">{product.description}</p>}

          <div className="mt-6 border-t border-border pt-6">
            <VariantPicker variants={product.variants} />
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/contact"
              className="rounded-theme bg-primary px-6 py-3 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover"
            >
              Enquire about this product
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
