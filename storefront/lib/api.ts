// All fetches here run server-side (React Server Components), so this
// hits the backend over the internal Docker network, not the browser -
// there is no client-side API surface in the storefront by design.
const API_URL = process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const MERCHANT_SLUG = process.env.MERCHANT_SLUG ?? "";

export interface PublicOrganization {
  name: string;
  slug: string;
  logo_path: string | null;
  support_phone: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface Variant {
  id: string;
  sku: string;
  size: string | null;
  color: string | null;
  price: string;
  inventory_count: number;
}

export interface CatalogImage {
  id: string;
  file_path: string;
  position: number;
}

export interface ProductListItem {
  id: string;
  name: string;
  slug: string;
  status: string;
  category_name: string | null;
  primary_image: string | null;
  min_price: string;
  max_price: string;
  total_inventory: number;
  variant_count: number;
}

export interface PaginatedProducts {
  items: ProductListItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  category_id: string | null;
  category_name: string | null;
  variants: Variant[];
  images: CatalogImage[];
}

export interface LandingPage {
  title: string;
  slug: string;
  hero_heading: string;
  hero_subheading: string | null;
  cta_text: string;
  cta_url: string;
  featured_category_id: string | null;
}

async function publicRequest<T>(path: string): Promise<T | null> {
  if (!MERCHANT_SLUG) return null;

  try {
    const res = await fetch(`${API_URL}/api/public/${MERCHANT_SLUG}${path}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function assetUrl(path: string): string {
  const publicApiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  return `${publicApiUrl}${path}`;
}

export const storefrontApi = {
  getOrganization: () => publicRequest<PublicOrganization>(""),

  listCategories: () => publicRequest<Category[]>("/categories").then((r) => r ?? []),

  listProducts: (params: { q?: string; category_id?: string; page?: number; page_size?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.q) query.set("q", params.q);
    if (params.category_id) query.set("category_id", params.category_id);
    query.set("page", String(params.page ?? 1));
    query.set("page_size", String(params.page_size ?? 20));
    return publicRequest<PaginatedProducts>(`/products?${query.toString()}`);
  },

  getProduct: (slug: string) => publicRequest<ProductDetail>(`/products/${slug}`),

  getLandingPage: (slug: string) => publicRequest<LandingPage>(`/landing-pages/${slug}`),
};
