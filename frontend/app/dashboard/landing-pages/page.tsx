"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useOrg } from "@/lib/org-context";
import { api, ApiError, LandingPage } from "@/lib/api";

const STOREFRONT_URL = process.env.NEXT_PUBLIC_STOREFRONT_URL ?? "http://localhost:3001";

export default function LandingPagesPage() {
  const { token } = useAuth();
  const { currentOrg } = useOrg();
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!token || !currentOrg) return;
    try {
      setPages(await api.listLandingPages(currentOrg.id, token));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load landing pages");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, currentOrg?.id]);

  async function handleTogglePublish(page: LandingPage) {
    if (!token || !currentOrg) return;
    try {
      await api.updateLandingPage(currentOrg.id, page.id, { is_published: !page.is_published }, token);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update landing page");
    }
  }

  async function handleDelete(pageId: string) {
    if (!token || !currentOrg) return;
    if (!confirm("Delete this landing page?")) return;
    try {
      await api.deleteLandingPage(currentOrg.id, pageId, token);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete landing page");
    }
  }

  if (!currentOrg) return null;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Landing Pages</h1>
        <Link
          href="/dashboard/landing-pages/new"
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          New landing page
        </Link>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {pages.map((page) => (
              <tr key={page.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                <td className="px-4 py-3">
                  <Link href={`/dashboard/landing-pages/${page.id}`} className="font-medium text-gray-900 hover:underline dark:text-gray-100">
                    {page.title}
                  </Link>
                  {page.is_published && (
                    <a
                      href={`${STOREFRONT_URL}/lp/${page.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-2 text-xs text-brand-600 hover:underline"
                    >
                      View live
                    </a>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      page.is_published
                        ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    }`}
                  >
                    {page.is_published ? "Published" : "Draft"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => handleTogglePublish(page)} className="mr-3 text-xs text-brand-600 hover:underline">
                    {page.is_published ? "Unpublish" : "Publish"}
                  </button>
                  <button onClick={() => handleDelete(page.id)} className="text-xs text-red-600 hover:underline">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {pages.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  No landing pages yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
