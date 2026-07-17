"use server";

const API_URL = process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const MERCHANT_SLUG = process.env.MERCHANT_SLUG ?? "";

export interface LeadSubmission {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  country?: string;
  consent: boolean;
  landing_page_slug?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  referrer?: string;
}

export async function submitLead(data: LeadSubmission): Promise<{ ok: boolean; error?: string }> {
  if (!MERCHANT_SLUG) {
    return { ok: false, error: "Storefront is not configured" };
  }

  try {
    const res = await fetch(`${API_URL}/api/public/${MERCHANT_SLUG}/leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: body.detail ?? "Could not submit form" };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "Could not reach the server" };
  }
}
