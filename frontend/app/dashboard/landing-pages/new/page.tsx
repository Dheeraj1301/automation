"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useOrg } from "@/lib/org-context";
import { api, ApiError, Category } from "@/lib/api";

export default function NewLandingPagePage() {
  const { token } = useAuth();
  const { currentOrg } = useOrg();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState("");
  const [heroHeading, setHeroHeading] = useState("");
  const [heroSubheading, setHeroSubheading] = useState("");
  const [ctaText, setCtaText] = useState("Shop now");
  const [ctaUrl, setCtaUrl] = useState("/products");
  const [categoryId, setCategoryId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token || !currentOrg) return;
    api.listCategories(currentOrg.id, token).then(setCategories).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, currentOrg?.id]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token || !currentOrg) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const page = await api.createLandingPage(
        currentOrg.id,
        {
          title,
          hero_heading: heroHeading,
          hero_subheading: heroSubheading || undefined,
          cta_text: ctaText,
          cta_url: ctaUrl,
          featured_category_id: categoryId || null,
        },
        token
      );
      router.push(`/dashboard/landing-pages/${page.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create landing page");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!currentOrg) return null;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900 dark:text-gray-100">New landing page</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Internal title
          </label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Diwali Sale"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>

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
            Hero subheading (optional)
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
            Featured category (optional)
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

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {isSubmitting ? "Creating..." : "Create landing page"}
        </button>
      </form>
    </div>
  );
}
