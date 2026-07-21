"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useOrg } from "@/lib/org-context";
import { api, ApiError, StorefrontConfig, ThemeId } from "@/lib/api";

const EMPTY_CONFIG: StorefrontConfig = {
  theme: "modern_tech",
  hero: { heading: "", subheading: "", cta_text: "Shop now", cta_url: "/products", image_path: null },
  about_heading: "",
  about_body: "",
  why_choose_us: [],
  testimonials: [],
  faqs: [],
};

const THEMES: { id: ThemeId; label: string; swatch: string[] }[] = [
  { id: "luxury", label: "Luxury", swatch: ["#0d0d0d", "#cba135", "#f5f2ea"] },
  { id: "modern_tech", label: "Modern Tech", swatch: ["#0a0a0c", "#2563eb", "#fafafa"] },
  { id: "premium_fashion", label: "Premium Fashion", swatch: ["#1a1a1a", "#c9b896", "#faf8f5"] },
  { id: "organic", label: "Organic", swatch: ["#5c7d47", "#8b6544", "#f7f3e8"] },
  { id: "industrial", label: "Industrial", swatch: ["#1e3a5f", "#e2601f", "#f2f3f5"] },
  { id: "interior", label: "Interior", swatch: ["#a9764f", "#2b2621", "#f5f1ea"] },
  { id: "colorful_retail", label: "Colorful Retail", swatch: ["#ff5c7c", "#4ecdc4", "#ffffff"] },
];

const ICON_OPTIONS = ["shield", "truck", "star", "headset", "heart", "leaf", "award", "clock"];

type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function StorefrontConfigPage() {
  const { token } = useAuth();
  const { currentOrg } = useOrg();

  const [config, setConfig] = useState<StorefrontConfig>(EMPTY_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);

  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (!token || !currentOrg) return;
    hasLoaded.current = false;
    setIsLoading(true);
    api
      .getStorefrontConfig(currentOrg.id, token)
      .then((loaded) => {
        setConfig(loaded);
        hasLoaded.current = true;
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load catalog website settings"))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, currentOrg?.id]);

  useEffect(() => {
    if (!hasLoaded.current || !token || !currentOrg) return;

    setStatus("saving");
    if (saveTimeout.current) clearTimeout(saveTimeout.current);

    saveTimeout.current = setTimeout(async () => {
      try {
        await api.updateStorefrontConfig(currentOrg.id, config, token);
        setStatus("saved");
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not save");
        setStatus("error");
      }
    }, 800);

    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  function updateHero<K extends keyof StorefrontConfig["hero"]>(key: K, value: StorefrontConfig["hero"][K]) {
    setConfig((prev) => ({ ...prev, hero: { ...prev.hero, [key]: value } }));
  }

  function updateWhyChooseUs(index: number, field: "icon" | "title" | "description", value: string) {
    setConfig((prev) => ({
      ...prev,
      why_choose_us: prev.why_choose_us.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
  }
  function addWhyChooseUs() {
    setConfig((prev) => ({
      ...prev,
      why_choose_us: [...prev.why_choose_us, { icon: "star", title: "", description: "" }],
    }));
  }
  function removeWhyChooseUs(index: number) {
    setConfig((prev) => ({ ...prev, why_choose_us: prev.why_choose_us.filter((_, i) => i !== index) }));
  }

  function updateTestimonial(index: number, field: "name" | "quote" | "rating", value: string | number) {
    setConfig((prev) => ({
      ...prev,
      testimonials: prev.testimonials.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
  }
  function addTestimonial() {
    setConfig((prev) => ({
      ...prev,
      testimonials: [...prev.testimonials, { name: "", quote: "", rating: 5, avatar_path: null }],
    }));
  }
  function removeTestimonial(index: number) {
    setConfig((prev) => ({ ...prev, testimonials: prev.testimonials.filter((_, i) => i !== index) }));
  }

  function updateFaq(index: number, field: "question" | "answer", value: string) {
    setConfig((prev) => ({
      ...prev,
      faqs: prev.faqs.map((faq, i) => (i === index ? { ...faq, [field]: value } : faq)),
    }));
  }
  function addFaq() {
    setConfig((prev) => ({ ...prev, faqs: [...prev.faqs, { question: "", answer: "" }] }));
  }
  function removeFaq(index: number) {
    setConfig((prev) => ({ ...prev, faqs: prev.faqs.filter((_, i) => i !== index) }));
  }

  async function handleSuggestTheme() {
    if (!currentOrg || !token) return;
    setIsSuggesting(true);
    try {
      const { theme } = await api.recommendTheme(currentOrg.id, { description: config.about_body }, token);
      setConfig((prev) => ({ ...prev, theme }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not get a suggestion");
    } finally {
      setIsSuggesting(false);
    }
  }

  if (!currentOrg || isLoading) return null;

  const inputClass =
    "w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100";
  const cardClass = "rounded-xl border border-gray-200 p-6 dark:border-gray-800";
  const labelClass = "mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300";

  return (
    <div className="max-w-3xl">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Catalog Website</h1>
        <SaveIndicator status={status} />
      </div>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        This is your public, customer-facing website — shareable via Instagram, WhatsApp, QR codes, or a direct
        link. Changes save automatically and go live within a minute.
      </p>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="space-y-6">
        <section className={cardClass}>
          <div className="mb-3 flex items-center justify-between">
            <label className={labelClass}>Theme</label>
            <button
              type="button"
              onClick={handleSuggestTheme}
              disabled={isSuggesting}
              className="text-xs font-medium text-brand-600 hover:underline disabled:opacity-50"
            >
              {isSuggesting ? "Thinking..." : "✨ Get AI suggestion"}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => setConfig((prev) => ({ ...prev, theme: theme.id }))}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  config.theme === theme.id
                    ? "border-brand-600 ring-1 ring-brand-600"
                    : "border-gray-200 hover:border-gray-300 dark:border-gray-800"
                }`}
              >
                <div className="mb-2 flex gap-1">
                  {theme.swatch.map((color, i) => (
                    <span key={i} className="h-5 w-5 rounded-full border border-black/10" style={{ backgroundColor: color }} />
                  ))}
                </div>
                <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{theme.label}</p>
              </button>
            ))}
          </div>
        </section>

        <section className={cardClass}>
          <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">Hero section</p>
          <div className="space-y-3">
            <div>
              <label className={labelClass}>Heading</label>
              <input
                value={config.hero.heading}
                onChange={(e) => updateHero("heading", e.target.value)}
                placeholder="Your business name"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Subheading</label>
              <input
                value={config.hero.subheading}
                onChange={(e) => updateHero("subheading", e.target.value)}
                placeholder="A one-line pitch for your storefront"
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Button text</label>
                <input value={config.hero.cta_text} onChange={(e) => updateHero("cta_text", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Button link</label>
                <input value={config.hero.cta_url} onChange={(e) => updateHero("cta_url", e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>
        </section>

        <section className={cardClass}>
          <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">About</p>
          <div className="space-y-3">
            <div>
              <label className={labelClass}>Heading</label>
              <input
                value={config.about_heading}
                onChange={(e) => setConfig((prev) => ({ ...prev, about_heading: e.target.value }))}
                placeholder={`About ${currentOrg.name}`}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Story</label>
              <textarea
                value={config.about_body}
                onChange={(e) => setConfig((prev) => ({ ...prev, about_body: e.target.value }))}
                rows={4}
                placeholder="Tell customers who you are and what makes your business worth buying from."
                className={inputClass}
              />
            </div>
          </div>
        </section>

        <section className={cardClass}>
          <div className="mb-3 flex items-center justify-between">
            <label className={labelClass}>Why choose us</label>
            <button type="button" onClick={addWhyChooseUs} className="text-xs text-brand-600 hover:underline">
              + Add reason
            </button>
          </div>
          <div className="space-y-3">
            {config.why_choose_us.map((item, i) => (
              <div key={i} className="rounded-md border border-gray-200 p-3 dark:border-gray-800">
                <div className="mb-2 flex items-center gap-2">
                  <select
                    value={item.icon}
                    onChange={(e) => updateWhyChooseUs(i, "icon", e.target.value)}
                    className="rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  >
                    {ICON_OPTIONS.map((icon) => (
                      <option key={icon} value={icon}>
                        {icon}
                      </option>
                    ))}
                  </select>
                  <input
                    value={item.title}
                    onChange={(e) => updateWhyChooseUs(i, "title", e.target.value)}
                    placeholder="Title"
                    className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  />
                  <button type="button" onClick={() => removeWhyChooseUs(i)} className="text-xs text-red-600 hover:underline">
                    Remove
                  </button>
                </div>
                <input
                  value={item.description}
                  onChange={(e) => updateWhyChooseUs(i, "description", e.target.value)}
                  placeholder="Short description"
                  className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
            ))}
            {config.why_choose_us.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">Nothing yet — add a few reasons customers should buy from you.</p>
            )}
          </div>
        </section>

        <section className={cardClass}>
          <div className="mb-3 flex items-center justify-between">
            <label className={labelClass}>Testimonials</label>
            <button type="button" onClick={addTestimonial} className="text-xs text-brand-600 hover:underline">
              + Add testimonial
            </button>
          </div>
          <div className="space-y-3">
            {config.testimonials.map((item, i) => (
              <div key={i} className="rounded-md border border-gray-200 p-3 dark:border-gray-800">
                <div className="mb-2 flex items-center gap-2">
                  <input
                    value={item.name}
                    onChange={(e) => updateTestimonial(i, "name", e.target.value)}
                    placeholder="Customer name"
                    className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  />
                  <select
                    value={item.rating}
                    onChange={(e) => updateTestimonial(i, "rating", Number(e.target.value))}
                    className="rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  >
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n} star{n > 1 ? "s" : ""}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={() => removeTestimonial(i)} className="text-xs text-red-600 hover:underline">
                    Remove
                  </button>
                </div>
                <textarea
                  value={item.quote}
                  onChange={(e) => updateTestimonial(i, "quote", e.target.value)}
                  placeholder="What did they say?"
                  rows={2}
                  className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
            ))}
            {config.testimonials.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">No testimonials yet.</p>
            )}
          </div>
        </section>

        <section className={cardClass}>
          <div className="mb-3 flex items-center justify-between">
            <label className={labelClass}>FAQs</label>
            <button type="button" onClick={addFaq} className="text-xs text-brand-600 hover:underline">
              + Add question
            </button>
          </div>
          <div className="space-y-3">
            {config.faqs.map((faq, i) => (
              <div key={i} className="rounded-md border border-gray-200 p-3 dark:border-gray-800">
                <div className="mb-2 flex items-center justify-between">
                  <input
                    value={faq.question}
                    onChange={(e) => updateFaq(i, "question", e.target.value)}
                    placeholder="Question"
                    className="mr-2 flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  />
                  <button type="button" onClick={() => removeFaq(i)} className="text-xs text-red-600 hover:underline">
                    Remove
                  </button>
                </div>
                <textarea
                  value={faq.answer}
                  onChange={(e) => updateFaq(i, "answer", e.target.value)}
                  placeholder="Answer"
                  rows={2}
                  className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
            ))}
            {config.faqs.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">No FAQs yet.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;
  const label = { saving: "Saving...", saved: "Saved", error: "Could not save" }[status];
  const color =
    status === "error" ? "text-red-600" : status === "saved" ? "text-green-600" : "text-gray-500 dark:text-gray-400";
  return <span className={`text-sm ${color}`}>{label}</span>;
}
