"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useOrg } from "@/lib/org-context";
import { api, ApiError, Prospect, ProspectCreateInput, ProspectingDashboardStats, ProspectList } from "@/lib/api";

const EMPTY_PROSPECT: ProspectCreateInput = { company_name: "", website_url: "" };

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-gray-400">Not scored</span>;
  const color =
    score >= 76
      ? "bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-400"
      : score >= 51
      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-400"
      : score >= 26
      ? "bg-orange-100 text-orange-800 dark:bg-orange-500/10 dark:text-orange-400"
      : "bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>{score}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const label = { new: "New", enriching: "Enriching...", enriched: "Enriched", failed: "Failed" }[status] ?? status;
  const color =
    status === "enriched"
      ? "text-green-600"
      : status === "failed"
      ? "text-red-600"
      : status === "enriching"
      ? "text-yellow-600"
      : "text-gray-500";
  return <span className={`text-xs ${color}`}>{label}</span>;
}

function parseCsv(text: string): ProspectCreateInput[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = line.split(",").map((c) => c.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = cells[i] ?? ""));
    return {
      company_name: row.company_name || row.name || "",
      website_url: row.website_url || row.website || undefined,
      industry: row.industry || undefined,
      country: row.country || undefined,
      state: row.state || undefined,
      city: row.city || undefined,
      company_size: row.company_size || undefined,
      google_maps_url: row.google_maps_url || undefined,
      linkedin_url: row.linkedin_url || undefined,
    };
  }).filter((p) => p.company_name);
}

export default function ProspectListDetailPage() {
  const { token } = useAuth();
  const { currentOrg } = useOrg();
  const params = useParams<{ listId: string }>();
  const listId = params.listId;

  const [list, setList] = useState<ProspectList | null>(null);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [stats, setStats] = useState<ProspectingDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [manualProspect, setManualProspect] = useState<ProspectCreateInput>(EMPTY_PROSPECT);
  const [isAdding, setIsAdding] = useState(false);
  const [minScore, setMinScore] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    if (!currentOrg || !token) return;
    setIsLoading(true);
    try {
      const [lists, prospectRows, dashboard] = await Promise.all([
        api.listProspectLists(currentOrg.id, token),
        api.listProspects(
          currentOrg.id,
          listId,
          { min_score: minScore ? Number(minScore) : undefined, industry: industryFilter || undefined },
          token
        ),
        api.getProspectingDashboard(currentOrg.id, token, listId),
      ]);
      setList(lists.find((l) => l.id === listId) ?? null);
      setProspects(prospectRows);
      setStats(dashboard);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load campaign");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrg?.id, listId, minScore, industryFilter]);

  // Poll while anything is still enriching, so scores/status appear live.
  useEffect(() => {
    const hasPending = prospects.some((p) => p.status === "new" || p.status === "enriching");
    if (!hasPending) return;
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prospects]);

  if (!currentOrg || !token) return null;

  async function handleAddManual(e: FormEvent) {
    e.preventDefault();
    if (!manualProspect.company_name.trim()) return;
    setIsAdding(true);
    setError(null);
    try {
      await api.addProspects(currentOrg!.id, listId, [manualProspect], token!);
      setManualProspect(EMPTY_PROSPECT);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add prospect");
    } finally {
      setIsAdding(false);
    }
  }

  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseCsv(text);
    if (parsed.length === 0) {
      setError("Couldn't find any valid rows - make sure the CSV has a company_name column.");
      return;
    }
    setIsAdding(true);
    setError(null);
    try {
      await api.addProspects(currentOrg!.id, listId, parsed, token!);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not import prospects");
    } finally {
      setIsAdding(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleExport() {
    try {
      await api.exportProspectsCsv(currentOrg!.id, listId, list?.name ?? "prospects", token!);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not export");
    }
  }

  const inputClass =
    "w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100";

  if (isLoading && !list) return null;

  return (
    <div className="max-w-6xl">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <Link href="/dashboard/prospecting" className="text-sm text-gray-500 hover:underline dark:text-gray-400">
            ← All campaigns
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">{list?.name}</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
            Export CSV
          </button>
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            {showAddForm ? "Cancel" : "+ Add prospects"}
          </button>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Total prospects</p>
            <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">{stats.total_prospects}</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Top prospects (76+)</p>
            <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">{stats.score_distribution["76-100"] ?? 0}</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Contacted</p>
            <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">{stats.follow_up_status_counts.contacted ?? 0}</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Outreach drafted</p>
            <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {Object.values(stats.outreach_status_counts).reduce((a, b) => a + b, 0)}
            </p>
          </div>
        </div>
      )}

      {showAddForm && (
        <div className="mb-6 space-y-4 rounded-xl border border-gray-200 p-6 dark:border-gray-800">
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Add one prospect</p>
            <form onSubmit={handleAddManual} className="grid grid-cols-2 gap-3">
              <input
                required
                placeholder="Company name"
                value={manualProspect.company_name}
                onChange={(e) => setManualProspect({ ...manualProspect, company_name: e.target.value })}
                className={inputClass}
              />
              <input
                placeholder="Website URL"
                value={manualProspect.website_url ?? ""}
                onChange={(e) => setManualProspect({ ...manualProspect, website_url: e.target.value })}
                className={inputClass}
              />
              <input
                placeholder="Industry"
                value={manualProspect.industry ?? ""}
                onChange={(e) => setManualProspect({ ...manualProspect, industry: e.target.value })}
                className={inputClass}
              />
              <input
                placeholder="Country"
                value={manualProspect.country ?? ""}
                onChange={(e) => setManualProspect({ ...manualProspect, country: e.target.value })}
                className={inputClass}
              />
              <button
                type="submit"
                disabled={isAdding}
                className="col-span-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {isAdding ? "Adding..." : "Add prospect"}
              </button>
            </form>
          </div>

          <div className="border-t border-gray-200 pt-4 dark:border-gray-800">
            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Or bulk-import a CSV</p>
            <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
              Columns: company_name, website_url, industry, country, state, city, company_size, google_maps_url, linkedin_url
              (only company_name is required)
            </p>
            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCsvUpload} className="text-sm" />
          </div>
        </div>
      )}

      <div className="mb-4 flex gap-3">
        <input
          placeholder="Filter by industry"
          value={industryFilter}
          onChange={(e) => setIndustryFilter(e.target.value)}
          className={`${inputClass} w-48`}
        />
        <select value={minScore} onChange={(e) => setMinScore(e.target.value)} className={`${inputClass} w-40`}>
          <option value="">Any score</option>
          <option value="76">76+ (top)</option>
          <option value="51">51+</option>
          <option value="26">26+</option>
        </select>
      </div>

      {prospects.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No prospects match. Add some above.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
              <tr>
                <th className="px-4 py-2">Company</th>
                <th className="px-4 py-2">Industry</th>
                <th className="px-4 py-2">Location</th>
                <th className="px-4 py-2">Score</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Follow-up</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {prospects.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/prospecting/${listId}/${p.id}`} className="font-medium text-gray-900 hover:underline dark:text-gray-100">
                      {p.company_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{p.industry ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {[p.city, p.country].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <ScoreBadge score={p.lead_score} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{p.follow_up_status.replace("_", " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
