"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useOrg } from "@/lib/org-context";
import { api, AIConfig, ApiError } from "@/lib/api";

const EMPTY_CONFIG: AIConfig = {
  business_description: "",
  brand_tone: "",
  target_audience: "",
  faqs: [],
  shipping_policy: "",
  return_policy: "",
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function AIConfigPage() {
  const { token } = useAuth();
  const { currentOrg } = useOrg();

  const [config, setConfig] = useState<AIConfig>(EMPTY_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (!token || !currentOrg) return;
    hasLoaded.current = false;
    setIsLoading(true);
    api
      .getAIConfig(currentOrg.id, token)
      .then((loaded) => {
        setConfig(loaded);
        hasLoaded.current = true;
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load AI configuration"))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, currentOrg?.id]);

  useEffect(() => {
    if (!hasLoaded.current || !token || !currentOrg) return;

    setStatus("saving");
    if (saveTimeout.current) clearTimeout(saveTimeout.current);

    saveTimeout.current = setTimeout(async () => {
      try {
        await api.updateAIConfig(currentOrg.id, config, token);
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

  function updateField<K extends keyof AIConfig>(key: K, value: AIConfig[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }));
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

  if (!currentOrg || isLoading) return null;

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">AI Configuration</h1>
        <SaveIndicator status={status} />
      </div>

      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        This profile feeds the AI Sales Agent (coming in a later phase) - fill it in so the AI can
        answer customers accurately. Changes save automatically.
      </p>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="space-y-6">
        <section className="rounded-xl border border-gray-200 p-6 dark:border-gray-800">
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Business description
          </label>
          <textarea
            value={config.business_description}
            onChange={(e) => updateField("business_description", e.target.value)}
            rows={4}
            placeholder="What does your business sell? What makes it unique?"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </section>

        <section className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-gray-200 p-6 dark:border-gray-800">
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Brand tone</label>
            <input
              value={config.brand_tone}
              onChange={(e) => updateField("brand_tone", e.target.value)}
              placeholder="e.g. Friendly and playful"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
          <div className="rounded-xl border border-gray-200 p-6 dark:border-gray-800">
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Target audience
            </label>
            <input
              value={config.target_audience}
              onChange={(e) => updateField("target_audience", e.target.value)}
              placeholder="e.g. Young professionals in India"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 p-6 dark:border-gray-800">
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Shipping policy
          </label>
          <textarea
            value={config.shipping_policy}
            onChange={(e) => updateField("shipping_policy", e.target.value)}
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </section>

        <section className="rounded-xl border border-gray-200 p-6 dark:border-gray-800">
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Return policy</label>
          <textarea
            value={config.return_policy}
            onChange={(e) => updateField("return_policy", e.target.value)}
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </section>

        <section className="rounded-xl border border-gray-200 p-6 dark:border-gray-800">
          <div className="mb-3 flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">FAQs</label>
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
