"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useOrg } from "@/lib/org-context";
import { api, ApiError, Lead } from "@/lib/api";

export default function LeadsPage() {
  const { token } = useAuth();
  const { currentOrg } = useOrg();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !currentOrg) return;
    api
      .listLeads(currentOrg.id, { page, page_size: pageSize }, token)
      .then((result) => {
        setLeads(result.items);
        setTotal(result.total);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load leads"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, currentOrg?.id, page]);

  if (!currentOrg) return null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900 dark:text-gray-100">Leads</h1>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Country</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Received</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {leads.map((lead) => (
              <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{lead.name}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{lead.email}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{lead.phone ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{lead.country ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{lead.source}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                  {new Date(lead.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  No leads yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
        <span>{total} lead(s)</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-md border border-gray-300 px-3 py-1 disabled:opacity-40 dark:border-gray-700"
          >
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-md border border-gray-300 px-3 py-1 disabled:opacity-40 dark:border-gray-700"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
