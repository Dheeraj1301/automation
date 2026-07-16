"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useOrg } from "@/lib/org-context";
import { api, ApiError, Category, LandingPage } from "@/lib/api";

const STOREFRONT_URL = process.env.NEXT_PUBLIC_STOREFRONT_URL ?? "http://localhost:3001";

export default function EditLandingPagePage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const { currentOrg } = useOrg();
  const router = useRouter();

  const [page, setPage] = useState<LandingPage | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [heroHeading, setHeroHeading] = useState("");
  const [heroSubheading, setHeroSubheading] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [categoryId, setCategoryId] = useState("");

  async function load() {
    if (!token || !currentOrg) return;
    try {
      const p = await api.getLandingPage(currentOrg.id, id, token);
      setPage(p);
      setHeroHeading(p.hero_heading);
      setHeroSubheading(p.hero_subheading ?? "");
      setCtaText(p.cta_text);
      setCtaUrl(p.cta_url);
      setCategoryId(p.featured_category_id ?? "");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load landing page");
    }
  }

  useEffect(() => {
    load();
    if (token && currentOrg) {
      api.listCategories(currentOrg.id, token).then(setCategories).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, currentOrg?.id, id]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!token || !currentOrg) return;
    setIsSaving(true);
    setError(null);
    try {
      await api.updateLandingPage(
        currentOrg.id,
        id,
        {
          hero_heading: heroHeading,
          hero_subheading: heroSubheading || null,
          cta_text: ctaText,
          cta_url: ctaUrl,
          featured_category_id: categoryId || null,
        },
        token
      );
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTogglePublish() {
    if (!token || !currentOrg || !page) return;
    try {
      await api.updateLandingPage(currentOrg.id, id, { is_published: !page.is_published }, token);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update landing page");
    }
  }

  async function handleDelete() {
    if (!token || !currentOrg) return;
    if (!confirm("Delete this landing page?")) return;
    try {
      await api.deleteLandingPage(currentOrg.id, id, token);
      router.push("/dashboard/landing-pages");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete landing page");
    }
  }

  if (!currentOrg || !page) return null;

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{page.title}</h1>
        <Link href="/dashboard/landing-pages" className="text-sm text-gray-500 hover:underline dark:text-gray-400">
          Back to landing pages
        </Link>
      </div>

      <div className="mb-6 flex items-center gap-3 rounded-xl border border-gray-200 p-4 text-sm dark:border-gray-800">
        <span
          className={`rounded px-2 py-0.5 text-xs font-medium ${
            page.is_published
              ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400"
              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
          }`}
        >
          {page.is_published ? "Published" : "Draft"}
        </span>
        <button onClick={handleTogglePublish} className="text-brand-600 hover:underline">
          {page.is_published ? "Unpublish" : "Publish"}
        </button>
        {page.is_published && (
          <a
            href={`${STOREFRONT_URL}/lp/${page.slug}`}
            target="_blank"
            rel="noreferrer"
            className="text-brand-600 hover:underline"
          >
            View live
          </a>
        )}
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Hero heading</label>
          <input
            required
            value={heroHeading}
            onChange={(e) => setHeroHeading(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Hero subheading
          </label>
          <textarea
            value={heroSubheading}
            onChange={(e) => setHeroSubheading(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">CTA text</label>
            <input
              value={ctaText}
              onChange={(e) => setCtaText(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">CTA URL</label>
            <input
              value={ctaUrl}
              onChange={(e) => setCtaUrl(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Featured category
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="">Show latest products</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
          <button type="button" onClick={handleDelete} className="text-sm text-red-600 hover:underline">
            Delete landing page
          </button>
        </div>
      </form>
    </div>
  );
}
