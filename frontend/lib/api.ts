const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const isFormData = options.body instanceof FormData;

  const headers: HeadersInit = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.detail ?? "Request failed");
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface CurrentUser {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  logo_path: string | null;
  whatsapp_number: string | null;
  whatsapp_verified: boolean;
}

export interface MyOrganization extends Organization {
  role: "owner" | "admin" | "staff";
}

export interface Member {
  user_id: string;
  email: string;
  full_name: string;
  role: "owner" | "admin" | "staff";
}

export interface Invitation {
  id: string;
  email: string;
  role: "admin" | "staff";
  status: string;
  expires_at: string;
}

export interface InvitationPreview {
  organization_name: string;
  email: string;
  role: string;
  is_valid: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export type ProductStatus = "active" | "draft" | "archived";

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
  status: ProductStatus;
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
  status: ProductStatus;
  category_id: string | null;
  category_name: string | null;
  variants: Variant[];
  images: CatalogImage[];
}

export interface BulkImportResult {
  products_created: number;
  variants_created: number;
  errors: { row: number; message: string }[];
}

export interface LandingPage {
  id: string;
  title: string;
  slug: string;
  hero_heading: string;
  hero_subheading: string | null;
  cta_text: string;
  cta_url: string;
  featured_category_id: string | null;
  is_published: boolean;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  country: string | null;
  consent: boolean;
  source: string;
  created_at: string;
}

export interface PaginatedLeads {
  items: Lead[];
  total: number;
  page: number;
  page_size: number;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface AIConfig {
  business_description: string;
  brand_tone: string;
  target_audience: string;
  faqs: FaqItem[];
  shipping_policy: string;
  return_policy: string;
}

export type ThemeId =
  | "luxury"
  | "modern_tech"
  | "premium_fashion"
  | "organic"
  | "industrial"
  | "interior"
  | "colorful_retail";

export interface StorefrontHeroConfig {
  heading: string;
  subheading: string;
  cta_text: string;
  cta_url: string;
  image_path: string | null;
}

export interface StorefrontWhyChooseUsItem {
  icon: string;
  title: string;
  description: string;
}

export interface StorefrontTestimonialItem {
  name: string;
  quote: string;
  rating: number;
  avatar_path: string | null;
}

export interface StorefrontFaqItem {
  question: string;
  answer: string;
}

export interface StorefrontConfig {
  theme: ThemeId;
  hero: StorefrontHeroConfig;
  about_heading: string;
  about_body: string;
  why_choose_us: StorefrontWhyChooseUsItem[];
  testimonials: StorefrontTestimonialItem[];
  faqs: StorefrontFaqItem[];
}

export interface ZohoStatus {
  connected: boolean;
  connected_email: string | null;
}

export interface ChatResponse {
  conversation_id: string;
  message: string;
}

export interface ConversationSummary {
  id: string;
  customer_identifier: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  last_message_preview: string | null;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface ConversationDetail {
  id: string;
  customer_identifier: string;
  messages: ConversationMessage[];
}

export interface ProspectList {
  id: string;
  name: string;
  product_name: string;
  product_description: string;
  product_category: string;
  target_industry: string;
  target_country: string;
  target_state: string | null;
  target_city: string | null;
  target_company_size: string | null;
  keywords: string | null;
  revenue_range: string | null;
  buyer_persona: string | null;
  competitor_names: string | null;
  preferred_language: string;
  created_at: string;
  prospect_count: number;
}

export interface ProspectListCreate {
  name: string;
  product_name: string;
  product_description?: string;
  product_category?: string;
  target_industry?: string;
  target_country?: string;
  target_state?: string;
  target_city?: string;
  target_company_size?: string;
  keywords?: string;
  revenue_range?: string;
  buyer_persona?: string;
  competitor_names?: string;
  preferred_language?: string;
}

export interface ProspectCreateInput {
  company_name: string;
  website_url?: string;
  industry?: string;
  country?: string;
  state?: string;
  city?: string;
  company_size?: string;
  google_maps_url?: string;
  linkedin_url?: string;
}

export interface AISummary {
  what_they_sell: string;
  customers: string;
  pain_points: string;
  company_type: string;
  potential_interest: string;
  buying_intent: string;
  partnership_opportunities: string;
}

export interface Prospect {
  id: string;
  list_id: string;
  company_name: string;
  website_url: string | null;
  industry: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  company_size: string | null;
  google_maps_url: string | null;
  linkedin_url: string | null;
  contact_page_url: string | null;
  about_page_url: string | null;
  contact_form_url: string | null;
  public_email: string | null;
  public_phone: string | null;
  sales_email: string | null;
  support_email: string | null;
  office_address: string | null;
  crawled_data: { pages_crawled?: string[]; social_links?: Record<string, string> };
  ai_summary: Partial<AISummary>;
  lead_score: number | null;
  lead_score_breakdown: Record<string, number>;
  status: "new" | "enriching" | "enriched" | "failed";
  error_message: string | null;
  tags: string[];
  follow_up_status: "not_contacted" | "contacted" | "replied" | "qualified" | "disqualified";
  notes: string | null;
  created_at: string;
}

export interface OutreachDraft {
  id: string;
  prospect_id: string;
  channel: "email" | "linkedin" | "contact_form";
  subject: string | null;
  body: string;
  status: "draft" | "edited" | "sent";
  sent_at: string | null;
  created_at: string;
}

export interface ProspectingDashboardStats {
  total_prospects: number;
  score_distribution: Record<string, number>;
  industry_breakdown: Record<string, number>;
  location_breakdown: Record<string, number>;
  follow_up_status_counts: Record<string, number>;
  outreach_status_counts: Record<string, number>;
}

export const api = {
  signup: (data: {
    email: string;
    password: string;
    full_name: string;
    organization_name: string;
    whatsapp_number: string;
  }) => request<TokenResponse>("/api/auth/signup", { method: "POST", body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    request<TokenResponse>("/api/auth/login", { method: "POST", body: JSON.stringify(data) }),

  me: (token: string) => request<CurrentUser>("/api/auth/me", {}, token),

  listOrganizations: (token: string) => request<MyOrganization[]>("/api/organizations", {}, token),

  createOrganization: (data: { name: string }, token: string) =>
    request<Organization>("/api/organizations", { method: "POST", body: JSON.stringify(data) }, token),

  updateOrganization: (orgId: string, data: { name: string }, token: string) =>
    request<Organization>(`/api/organizations/${orgId}`, { method: "PATCH", body: JSON.stringify(data) }, token),

  uploadLogo: (orgId: string, file: File, token: string) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<Organization>(`/api/organizations/${orgId}/logo`, { method: "POST", body: formData }, token);
  },

  listMembers: (orgId: string, token: string) => request<Member[]>(`/api/organizations/${orgId}/members`, {}, token),

  updateMemberRole: (orgId: string, userId: string, role: string, token: string) =>
    request<Member>(
      `/api/organizations/${orgId}/members/${userId}`,
      { method: "PATCH", body: JSON.stringify({ role }) },
      token
    ),

  removeMember: (orgId: string, userId: string, token: string) =>
    request<void>(`/api/organizations/${orgId}/members/${userId}`, { method: "DELETE" }, token),

  listInvites: (orgId: string, token: string) =>
    request<Invitation[]>(`/api/organizations/${orgId}/invites`, {}, token),

  createInvite: (orgId: string, data: { email: string; role: string }, token: string) =>
    request<Invitation>(
      `/api/organizations/${orgId}/invites`,
      { method: "POST", body: JSON.stringify(data) },
      token
    ),

  revokeInvite: (orgId: string, inviteId: string, token: string) =>
    request<void>(`/api/organizations/${orgId}/invites/${inviteId}`, { method: "DELETE" }, token),

  previewInvite: (token: string) => request<InvitationPreview>(`/api/invites/${token}`),

  acceptInvite: (inviteToken: string, authToken: string) =>
    request<MyOrganization>(
      "/api/invites/accept",
      { method: "POST", body: JSON.stringify({ token: inviteToken }) },
      authToken
    ),

  listCategories: (orgId: string, token: string) =>
    request<Category[]>(`/api/organizations/${orgId}/categories`, {}, token),

  createCategory: (orgId: string, name: string, token: string) =>
    request<Category>(
      `/api/organizations/${orgId}/categories`,
      { method: "POST", body: JSON.stringify({ name }) },
      token
    ),

  deleteCategory: (orgId: string, categoryId: string, token: string) =>
    request<void>(`/api/organizations/${orgId}/categories/${categoryId}`, { method: "DELETE" }, token),

  listProducts: (
    orgId: string,
    params: { q?: string; category_id?: string; status?: string; page?: number; page_size?: number },
    token: string
  ) => {
    const query = new URLSearchParams();
    if (params.q) query.set("q", params.q);
    if (params.category_id) query.set("category_id", params.category_id);
    if (params.status) query.set("status", params.status);
    query.set("page", String(params.page ?? 1));
    query.set("page_size", String(params.page_size ?? 20));
    return request<PaginatedProducts>(`/api/organizations/${orgId}/products?${query.toString()}`, {}, token);
  },

  createProduct: (
    orgId: string,
    data: {
      name: string;
      description?: string;
      category_id?: string | null;
      status: ProductStatus;
      sku: string;
      size?: string;
      color?: string;
      price: string;
      inventory_count: number;
    },
    token: string
  ) => request<ProductDetail>(`/api/organizations/${orgId}/products`, { method: "POST", body: JSON.stringify(data) }, token),

  getProduct: (orgId: string, productId: string, token: string) =>
    request<ProductDetail>(`/api/organizations/${orgId}/products/${productId}`, {}, token),

  updateProduct: (
    orgId: string,
    productId: string,
    data: Partial<{ name: string; description: string | null; category_id: string | null; status: ProductStatus }>,
    token: string
  ) =>
    request<ProductDetail>(
      `/api/organizations/${orgId}/products/${productId}`,
      { method: "PATCH", body: JSON.stringify(data) },
      token
    ),

  deleteProduct: (orgId: string, productId: string, token: string) =>
    request<void>(`/api/organizations/${orgId}/products/${productId}`, { method: "DELETE" }, token),

  addVariant: (
    orgId: string,
    productId: string,
    data: { sku: string; size?: string; color?: string; price: string; inventory_count: number },
    token: string
  ) =>
    request<Variant>(
      `/api/organizations/${orgId}/products/${productId}/variants`,
      { method: "POST", body: JSON.stringify(data) },
      token
    ),

  updateVariant: (
    orgId: string,
    productId: string,
    variantId: string,
    data: Partial<{ sku: string; size: string | null; color: string | null; price: string; inventory_count: number }>,
    token: string
  ) =>
    request<Variant>(
      `/api/organizations/${orgId}/products/${productId}/variants/${variantId}`,
      { method: "PATCH", body: JSON.stringify(data) },
      token
    ),

  deleteVariant: (orgId: string, productId: string, variantId: string, token: string) =>
    request<void>(
      `/api/organizations/${orgId}/products/${productId}/variants/${variantId}`,
      { method: "DELETE" },
      token
    ),

  uploadProductImage: (orgId: string, productId: string, file: File, token: string) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<CatalogImage>(
      `/api/organizations/${orgId}/products/${productId}/images`,
      { method: "POST", body: formData },
      token
    );
  },

  deleteProductImage: (orgId: string, productId: string, imageId: string, token: string) =>
    request<void>(
      `/api/organizations/${orgId}/products/${productId}/images/${imageId}`,
      { method: "DELETE" },
      token
    ),

  bulkImportProducts: (orgId: string, file: File, token: string) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<BulkImportResult>(
      `/api/organizations/${orgId}/products/bulk-import`,
      { method: "POST", body: formData },
      token
    );
  },

  listLandingPages: (orgId: string, token: string) =>
    request<LandingPage[]>(`/api/organizations/${orgId}/landing-pages`, {}, token),

  createLandingPage: (
    orgId: string,
    data: {
      title: string;
      hero_heading: string;
      hero_subheading?: string;
      cta_text?: string;
      cta_url?: string;
      featured_category_id?: string | null;
    },
    token: string
  ) =>
    request<LandingPage>(
      `/api/organizations/${orgId}/landing-pages`,
      { method: "POST", body: JSON.stringify(data) },
      token
    ),

  getLandingPage: (orgId: string, pageId: string, token: string) =>
    request<LandingPage>(`/api/organizations/${orgId}/landing-pages/${pageId}`, {}, token),

  updateLandingPage: (
    orgId: string,
    pageId: string,
    data: Partial<{
      title: string;
      hero_heading: string;
      hero_subheading: string | null;
      cta_text: string;
      cta_url: string;
      featured_category_id: string | null;
      is_published: boolean;
    }>,
    token: string
  ) =>
    request<LandingPage>(
      `/api/organizations/${orgId}/landing-pages/${pageId}`,
      { method: "PATCH", body: JSON.stringify(data) },
      token
    ),

  deleteLandingPage: (orgId: string, pageId: string, token: string) =>
    request<void>(`/api/organizations/${orgId}/landing-pages/${pageId}`, { method: "DELETE" }, token),

  listLeads: (orgId: string, params: { page?: number; page_size?: number }, token: string) => {
    const query = new URLSearchParams();
    query.set("page", String(params.page ?? 1));
    query.set("page_size", String(params.page_size ?? 20));
    return request<PaginatedLeads>(`/api/organizations/${orgId}/leads?${query.toString()}`, {}, token);
  },

  getAIConfig: (orgId: string, token: string) => request<AIConfig>(`/api/organizations/${orgId}/ai-config`, {}, token),

  updateAIConfig: (orgId: string, data: AIConfig, token: string) =>
    request<AIConfig>(`/api/organizations/${orgId}/ai-config`, { method: "PUT", body: JSON.stringify(data) }, token),

  getStorefrontConfig: (orgId: string, token: string) =>
    request<StorefrontConfig>(`/api/organizations/${orgId}/storefront-config`, {}, token),

  updateStorefrontConfig: (orgId: string, data: StorefrontConfig, token: string) =>
    request<StorefrontConfig>(
      `/api/organizations/${orgId}/storefront-config`,
      { method: "PUT", body: JSON.stringify(data) },
      token
    ),

  recommendTheme: (orgId: string, params: { industry?: string; description?: string }, token: string) => {
    const query = new URLSearchParams();
    if (params.industry) query.set("industry", params.industry);
    if (params.description) query.set("description", params.description);
    return request<{ theme: ThemeId }>(
      `/api/organizations/${orgId}/storefront-config/recommend-theme?${query.toString()}`,
      {},
      token
    );
  },

  sendChatMessage: (
    orgId: string,
    data: { conversation_id?: string; message: string; customer_identifier?: string },
    token: string
  ) => request<ChatResponse>(`/api/organizations/${orgId}/ai/chat`, { method: "POST", body: JSON.stringify(data) }, token),

  listConversations: (orgId: string, token: string) =>
    request<ConversationSummary[]>(`/api/organizations/${orgId}/ai/conversations`, {}, token),

  getConversation: (orgId: string, conversationId: string, token: string) =>
    request<ConversationDetail>(`/api/organizations/${orgId}/ai/conversations/${conversationId}`, {}, token),

  getZohoStatus: (orgId: string, token: string) =>
    request<ZohoStatus>(`/api/organizations/${orgId}/integrations/zoho/status`, {}, token),

  connectZoho: (orgId: string, token: string) =>
    request<{ authorization_url: string }>(`/api/organizations/${orgId}/integrations/zoho/connect`, {}, token),

  disconnectZoho: (orgId: string, token: string) =>
    request<void>(`/api/organizations/${orgId}/integrations/zoho/disconnect`, { method: "POST" }, token),

  sendWhatsAppVerification: (orgId: string, token: string) =>
    request<void>(`/api/organizations/${orgId}/whatsapp-verification/send`, { method: "POST" }, token),

  confirmWhatsAppVerification: (orgId: string, code: string, token: string) =>
    request<{ whatsapp_number: string; whatsapp_verified: boolean }>(
      `/api/organizations/${orgId}/whatsapp-verification/confirm`,
      { method: "POST", body: JSON.stringify({ code }) },
      token
    ),

  createProspectList: (orgId: string, data: ProspectListCreate, token: string) =>
    request<ProspectList>(`/api/organizations/${orgId}/prospecting/lists`, { method: "POST", body: JSON.stringify(data) }, token),

  listProspectLists: (orgId: string, token: string) =>
    request<ProspectList[]>(`/api/organizations/${orgId}/prospecting/lists`, {}, token),

  deleteProspectList: (orgId: string, listId: string, token: string) =>
    request<void>(`/api/organizations/${orgId}/prospecting/lists/${listId}`, { method: "DELETE" }, token),

  addProspects: (orgId: string, listId: string, prospects: ProspectCreateInput[], token: string) =>
    request<Prospect[]>(
      `/api/organizations/${orgId}/prospecting/lists/${listId}/prospects`,
      { method: "POST", body: JSON.stringify({ prospects }) },
      token
    ),

  listProspects: (
    orgId: string,
    listId: string,
    filters: {
      industry?: string;
      country?: string;
      city?: string;
      company_size?: string;
      min_score?: number;
      has_contact?: boolean;
      follow_up_status?: string;
    },
    token: string
  ) => {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== "") query.set(key, String(value));
    });
    return request<Prospect[]>(
      `/api/organizations/${orgId}/prospecting/lists/${listId}/prospects?${query.toString()}`,
      {},
      token
    );
  },

  getProspect: (orgId: string, prospectId: string, token: string) =>
    request<Prospect>(`/api/organizations/${orgId}/prospecting/prospects/${prospectId}`, {}, token),

  updateProspect: (
    orgId: string,
    prospectId: string,
    data: Partial<{ tags: string[]; follow_up_status: string; notes: string }>,
    token: string
  ) =>
    request<Prospect>(
      `/api/organizations/${orgId}/prospecting/prospects/${prospectId}`,
      { method: "PATCH", body: JSON.stringify(data) },
      token
    ),

  reanalyzeProspect: (orgId: string, prospectId: string, token: string) =>
    request<Prospect>(`/api/organizations/${orgId}/prospecting/prospects/${prospectId}/reanalyze`, { method: "POST" }, token),

  generateOutreachDraft: (orgId: string, prospectId: string, channel: string, token: string) =>
    request<OutreachDraft>(
      `/api/organizations/${orgId}/prospecting/prospects/${prospectId}/outreach`,
      { method: "POST", body: JSON.stringify({ channel }) },
      token
    ),

  listOutreachDrafts: (orgId: string, prospectId: string, token: string) =>
    request<OutreachDraft[]>(`/api/organizations/${orgId}/prospecting/prospects/${prospectId}/outreach`, {}, token),

  updateOutreachDraft: (
    orgId: string,
    draftId: string,
    data: Partial<{ subject: string; body: string; status: string }>,
    token: string
  ) =>
    request<OutreachDraft>(
      `/api/organizations/${orgId}/prospecting/outreach/${draftId}`,
      { method: "PATCH", body: JSON.stringify(data) },
      token
    ),

  markOutreachSent: (orgId: string, draftId: string, token: string) =>
    request<OutreachDraft>(`/api/organizations/${orgId}/prospecting/outreach/${draftId}/mark-sent`, { method: "POST" }, token),

  getProspectingDashboard: (orgId: string, token: string, listId?: string) => {
    const query = listId ? `?list_id=${listId}` : "";
    return request<ProspectingDashboardStats>(`/api/organizations/${orgId}/prospecting/dashboard${query}`, {}, token);
  },

  exportProspectsCsv: async (orgId: string, listId: string, listName: string, token: string) => {
    const res = await fetch(`${API_URL}/api/organizations/${orgId}/prospecting/lists/${listId}/export`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new ApiError(res.status, "Could not export prospects");

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${listName.replace(/\s+/g, "_")}_prospects.csv`;
    link.click();
    URL.revokeObjectURL(url);
  },
};
