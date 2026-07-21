"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useOrg } from "@/lib/org-context";
import { api, ApiError, ProspectList } from "@/lib/api";

const EMPTY_FORM = {
  name: "",
  product_name: "",
  product_description: "",
  target_industry: "",
  target_country: "",
  target_city: "",
  target_company_size: "",
  buyer_persona: "",
};

export default function ProspectingListsPage() {
  const { token } = useAuth();
  const { currentOrg } = useOrg();

  const [lists, setLists] = useState<ProspectList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!currentOrg || !token) return;
    setIsLoading(true);
    try {
      setLists(await api.listProspectLists(currentOrg.id, token));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load campaigns");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrg?.id]);

  if (!currentOrg || !token) return null;

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api.createProspectList(currentOrg!.id, form, token!);
      setForm(EMPTY_FORM);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create campaign");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(listId: string) {
    if (!confirm("Delete this campaign and all its prospects? This can't be undone.")) return;
    try {
      await api.deleteProspectList(currentOrg!.id, listId, token!);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete campaign");
    }
  }

  const inputClass =
    "w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100";

  return (
    <div className="max-w-4xl">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Lead Intelligence</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          {showForm ? "Cancel" : "+ New campaign"}
        </button>
      </div>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Add businesses you want to evaluate as potential customers — AI crawls each company&apos;s own
        public website, scores the fit against what you tell it below, and drafts outreach you can
        review before sending. Nothing here scrapes Google, Maps, or LinkedIn automatically.
      </p>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 space-y-3 rounded-xl border border-gray-200 p-6 dark:border-gray-800">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Campaign name</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Dubai garment wholesalers - Q1"
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Your product</label>
              <input
                required
                value={form.product_name}
                onChange={(e) => setForm({ ...form, product_name: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Target industry</label>
              <input
                value={form.target_industry}
                onChange={(e) => setForm({ ...form, target_industry: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Product description</label>
            <textarea
              value={form.product_description}
              onChange={(e) => setForm({ ...form, product_description: e.target.value })}
              rows={2}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Target country</label>
              <input
                value={form.target_country}
                onChange={(e) => setForm({ ...form, target_country: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Target city</label>
              <input
                value={form.target_city}
                onChange={(e) => setForm({ ...form, target_city: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Company size</label>
              <input
                value={form.target_company_size}
                onChange={(e) => setForm({ ...form, target_company_size: e.target.value })}
                placeholder="e.g. 10-50 employees"
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Buyer persona (optional)</label>
            <textarea
              value={form.buyer_persona}
              onChange={(e) => setForm({ ...form, buyer_persona: e.target.value })}
              rows={2}
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {isSubmitting ? "Creating..." : "Create campaign"}
          </button>
        </form>
      )}

      {isLoading ? null : lists.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No campaigns yet — create one to start adding prospects.</p>
      ) : (
        <div className="space-y-3">
          {lists.map((list) => (
            <div
              key={list.id}
              className="flex items-center justify-between rounded-xl border border-gray-200 p-5 dark:border-gray-800"
            >
              <Link href={`/dashboard/prospecting/${list.id}`} className="flex-1">
                <p className="font-medium text-gray-900 dark:text-gray-100">{list.name}</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {list.product_name} · {list.target_industry || "Any industry"} ·{" "}
                  {list.target_country || "Any location"} · {list.prospect_count} prospect
                  {list.prospect_count === 1 ? "" : "s"}
                </p>
              </Link>
              <button onClick={() => handleDelete(list.id)} className="ml-4 text-xs text-red-600 hover:underline">
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
