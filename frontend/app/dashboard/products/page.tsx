"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useOrg } from "@/lib/org-context";
import { api, ApiError, BulkImportResult, Category, ProductListItem, ProductStatus } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const STATUS_BADGE: Record<ProductStatus, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  draft: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  archived: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
};

export default function ProductsPage() {
  const { token } = useAuth();
  const { currentOrg } = useOrg();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token || !currentOrg) return;
    api.listCategories(currentOrg.id, token).then(setCategories).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, currentOrg?.id]);

  async function load() {
    if (!token || !currentOrg) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.listProducts(
        currentOrg.id,
        { q: q || undefined, category_id: categoryId || undefined, status: status || undefined, page, page_size: pageSize },
        token
      );
      setProducts(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load products");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, currentOrg?.id, page, categoryId, status]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    load();
  }

  async function handleImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !token || !currentOrg) return;
    setIsImporting(true);
    setImportResult(null);
    setError(null);
    try {
      const result = await api.bulkImportProducts(currentOrg.id, file, token);
      setImportResult(result);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Import failed");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  if (!currentOrg) return null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Products</h1>
        <div className="flex gap-2">
          <label className="cursor-pointer rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
            {isImporting ? "Importing..." : "Import CSV"}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleImportFile}
              disabled={isImporting}
            />
          </label>
          <Link
            href="/dashboard/products/new"
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Add product
          </Link>
        </div>
      </div>

      {importResult && (
        <div className="mb-4 rounded-md border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="font-medium text-gray-900 dark:text-gray-100">
            Imported {importResult.products_created} product(s), {importResult.variants_created} variant(s).
          </p>
          {importResult.errors.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-red-600">
              {importResult.errors.map((e, i) => (
                <li key={i}>
                  Row {e.row}: {e.message}
                </li>
              ))}
            </ul>
          )}
          <button onClick={() => setImportResult(null)} className="mt-2 text-xs text-gray-500 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      <form onSubmit={handleSearchSubmit} className="mb-4 flex flex-wrap gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products..."
          className="w-64 rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        />
        <select
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
        <button
          type="submit"
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Search
        </button>
      </form>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Inventory</th>
              <th className="px-4 py-3">Variants</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                <td className="px-4 py-3">
                  <Link href={`/dashboard/products/${p.id}`} className="flex items-center gap-3">
                    <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800">
                      {p.primary_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={`${API_URL}${p.primary_image}`} alt={p.name} className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <span className="font-medium text-gray-900 hover:underline dark:text-gray-100">{p.name}</span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{p.category_name ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                  {p.min_price === p.max_price ? p.min_price : `${p.min_price} – ${p.max_price}`}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{p.total_inventory}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{p.variant_count}</td>
                <td className="px-4 py-3">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[p.status]}`}>{p.status}</span>
                </td>
              </tr>
            ))}
            {!isLoading && products.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  No products yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
        <span>{total} product(s)</span>
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
