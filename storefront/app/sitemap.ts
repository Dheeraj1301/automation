import type { MetadataRoute } from "next";
import { storefrontApi } from "@/lib/api";

const STATIC_PATHS = ["", "/products", "/about", "/contact", "/faq", "/privacy", "/terms"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.SITE_URL ?? "http://localhost:3001";

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date(),
  }));

  const products = await storefrontApi.listProducts({ page: 1, page_size: 100 });
  const productEntries: MetadataRoute.Sitemap = (products?.items ?? []).map((product) => ({
    url: `${siteUrl}/products/${product.slug}`,
    lastModified: new Date(),
  }));

  return [...staticEntries, ...productEntries];
}
