"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useOrg } from "@/lib/org-context";
import { api, ApiError, OutreachDraft, Prospect } from "@/lib/api";

const CHANNELS = [
  { id: "email", label: "Email" },
  { id: "linkedin", label: "LinkedIn message" },
  { id: "contact_form", label: "Contact form" },
];

const FOLLOW_UP_OPTIONS = ["not_contacted", "contacted", "replied", "qualified", "disqualified"];

export default function ProspectDetailPage() {
  const { token } = useAuth();
  const { currentOrg } = useOrg();
  const params = useParams<{ listId: string; prospectId: string }>();
  const { listId, prospectId } = params;

  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [drafts, setDrafts] = useState<OutreachDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [tagsInput, setTagsInput] = useState("");
  const [notes, setNotes] = useState("");

  async function load() {
    if (!currentOrg || !token) return;
    setIsLoading(true);
    try {
      const [p, d] = await Promise.all([
        api.getProspect(currentOrg.id, prospectId, token),
        api.listOutreachDrafts(currentOrg.id, prospectId, token),
      ]);
      setProspect(p);
      setDrafts(d);
      setTagsInput(p.tags.join(", "));
      setNotes(p.notes ?? "");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load prospect");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrg?.id, prospectId]);

  if (!currentOrg || !token || (isLoading && !prospect)) return null;
  if (!prospect) return <p className="text-sm text-red-600">Prospect not found.</p>;

  async function handleReanalyze() {
    try {
      const updated = await api.reanalyzeProspect(currentOrg!.id, prospectId, token!);
      setProspect(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not re-analyze");
    }
  }

  async function handleSaveFollowUp(status: string) {
    try {
      const updated = await api.updateProspect(currentOrg!.id, prospectId, { follow_up_status: status }, token!);
      setProspect(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save");
    }
  }

  async function handleSaveTagsAndNotes() {
    try {
      const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
      const updated = await api.updateProspect(currentOrg!.id, prospectId, { tags, notes }, token!);
      setProspect(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save");
    }
  }

  async function handleGenerateDraft(channel: string) {
    setIsGenerating(true);
    setError(null);
    try {
      const draft = await api.generateOutreachDraft(currentOrg!.id, prospectId, channel, token!);
      setDrafts((prev) => [draft, ...prev]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not generate a draft");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleUpdateDraft(draftId: string, body: string, subject: string | null) {
    try {
      const updated = await api.updateOutreachDraft(currentOrg!.id, draftId, { body, subject: subject ?? undefined }, token!);
      setDrafts((prev) => prev.map((d) => (d.id === draftId ? updated : d)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save draft");
    }
  }

  async function handleMarkSent(draftId: string) {
    try {
      const updated = await api.markOutreachSent(currentOrg!.id, draftId, token!);
      setDrafts((prev) => prev.map((d) => (d.id === draftId ? updated : d)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update");
    }
  }

  const inputClass =
    "w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100";
  const cardClass = "rounded-xl border border-gray-200 p-6 dark:border-gray-800";

  return (
    <div className="max-w-4xl">
      <Link href={`/dashboard/prospecting/${listId}`} className="text-sm text-gray-500 hover:underline dark:text-gray-400">
        ← Back to campaign
      </Link>

      <div className="mt-2 mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{prospect.company_name}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {prospect.industry ?? "Unknown industry"} · {[prospect.city, prospect.country].filter(Boolean).join(", ") || "Unknown location"}
          </p>
          {prospect.website_url && (
            <a href={prospect.website_url} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-600 hover:underline">
              {prospect.website_url}
            </a>
          )}
        </div>
        <div className="text-right">
          {prospect.lead_score !== null && (
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{prospect.lead_score}</p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400">Lead score</p>
          {prospect.website_url && (
            <button onClick={handleReanalyze} className="mt-2 text-xs text-brand-600 hover:underline">
              Re-analyze
            </button>
          )}
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {prospect.status === "enriching" && <p className="mb-4 text-sm text-yellow-600">Still analyzing this company...</p>}
      {prospect.status === "failed" && (
        <p className="mb-4 text-sm text-red-600">Couldn&apos;t analyze this site: {prospect.error_message}</p>
      )}

      <div className="space-y-6">
        <section className={cardClass}>
          <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">AI summary</p>
          {prospect.ai_summary.what_they_sell ? (
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="font-medium text-gray-900 dark:text-gray-100">What they sell</dt>
                <dd className="text-gray-600 dark:text-gray-400">{prospect.ai_summary.what_they_sell}</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-900 dark:text-gray-100">Their customers</dt>
                <dd className="text-gray-600 dark:text-gray-400">{prospect.ai_summary.customers}</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-900 dark:text-gray-100">Why they might be interested</dt>
                <dd className="text-gray-600 dark:text-gray-400">{prospect.ai_summary.potential_interest}</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-900 dark:text-gray-100">Buying intent</dt>
                <dd className="text-gray-600 dark:text-gray-400">{prospect.ai_summary.buying_intent}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No AI analysis yet - add a website URL and wait a moment, or check back if the AI Sales Agent
              isn&apos;t configured for this account yet.
            </p>
          )}
        </section>

        <section className={cardClass}>
          <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">Contact information</p>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Email</dt>
              <dd className="text-gray-900 dark:text-gray-100">{prospect.public_email ?? "Not found"}</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Phone</dt>
              <dd className="text-gray-900 dark:text-gray-100">{prospect.public_phone ?? "Not found"}</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Contact page</dt>
              <dd>
                {prospect.contact_page_url ? (
                  <a href={prospect.contact_page_url} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
                    View
                  </a>
                ) : (
                  "Not found"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Social</dt>
              <dd className="space-x-2">
                {Object.entries(prospect.crawled_data.social_links ?? {}).map(([key, url]) => (
                  <a key={key} href={url} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
                    {key}
                  </a>
                ))}
                {Object.keys(prospect.crawled_data.social_links ?? {}).length === 0 && "None found"}
              </dd>
            </div>
          </dl>
        </section>

        <section className={cardClass}>
          <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">Follow-up</p>
          <select
            value={prospect.follow_up_status}
            onChange={(e) => handleSaveFollowUp(e.target.value)}
            className={`${inputClass} mb-3 w-56`}
          >
            {FOLLOW_UP_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt.replace("_", " ")}
              </option>
            ))}
          </select>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Tags (comma-separated)</label>
          <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} className={`${inputClass} mb-3`} />
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={`${inputClass} mb-3`} />
          <button onClick={handleSaveTagsAndNotes} className="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700">
            Save
          </button>
        </section>

        <section className={cardClass}>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Outreach</p>
            <div className="flex gap-2">
              {CHANNELS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleGenerateDraft(c.id)}
                  disabled={isGenerating}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  {isGenerating ? "Generating..." : `+ ${c.label}`}
                </button>
              ))}
            </div>
          </div>

          {drafts.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No drafts yet - generate one above.</p>
          ) : (
            <div className="space-y-4">
              {drafts.map((draft) => (
                <DraftEditor key={draft.id} draft={draft} onSave={handleUpdateDraft} onMarkSent={handleMarkSent} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function DraftEditor({
  draft,
  onSave,
  onMarkSent,
}: {
  draft: OutreachDraft;
  onSave: (draftId: string, body: string, subject: string | null) => void;
  onMarkSent: (draftId: string) => void;
}) {
  const [subject, setSubject] = useState(draft.subject ?? "");
  const [body, setBody] = useState(draft.body);

  return (
    <div className="rounded-md border border-gray-200 p-4 dark:border-gray-800">
      <div className="mb-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span className="font-medium uppercase">{draft.channel.replace("_", " ")}</span>
        <span>{draft.status === "sent" ? `Sent ${new Date(draft.sent_at!).toLocaleDateString()}` : draft.status}</span>
      </div>
      {draft.channel === "email" && (
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
          className="mb-2 w-full rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        />
      )}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={5}
        className="mb-2 w-full rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
      />
      <div className="flex gap-2">
        <button
          onClick={() => onSave(draft.id, body, draft.channel === "email" ? subject : null)}
          className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Save edits
        </button>
        {draft.status !== "sent" && (
          <button
            onClick={() => onMarkSent(draft.id)}
            className="rounded-md bg-brand-600 px-3 py-1 text-xs font-medium text-white hover:bg-brand-700"
          >
            Mark as sent
          </button>
        )}
      </div>
    </div>
  );
}
