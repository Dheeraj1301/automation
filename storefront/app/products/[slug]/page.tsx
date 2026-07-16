import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <div className="aspect-square overflow-hidden rounded-theme bg-black/5 dark:bg-white/5">
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
                  className="h-16 w-16 rounded-theme object-cover"
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <h1 className="text-2xl font-semibold">{product.name}</h1>
          {product.category_name && <p className="mt-1 text-sm text-muted">{product.category_name}</p>}
          {product.description && <p className="mt-4 text-sm leading-relaxed">{product.description}</p>}

          <div className="mt-6">
            <VariantPicker variants={product.variants} />
          </div>
        </div>
      </div>
    </div>
  );
}
