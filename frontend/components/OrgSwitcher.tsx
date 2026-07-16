"use client";

import { FormEvent, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useOrg } from "@/lib/org-context";
import { api, ApiError } from "@/lib/api";

const PLAN_LABEL: Record<string, string> = { free: "Free", pro: "Pro", enterprise: "Enterprise" };

export function OrgSwitcher() {
  const { token } = useAuth();
  const { organizations, currentOrg, switchOrg, refreshOrganizations } = useOrg();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError(null);
    try {
      const org = await api.createOrganization({ name: newOrgName }, token);
      await refreshOrganizations();
      switchOrg(org.id);
      setNewOrgName("");
      setIsCreating(false);
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create organization");
    }
  }

  if (!currentOrg) return null;

  return (
    <div className="relative px-3 pb-3">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-left text-sm dark:border-gray-800"
      >
        <span className="truncate">
          <span className="font-medium text-gray-900 dark:text-gray-100">{currentOrg.name}</span>
          <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
            {PLAN_LABEL[currentOrg.plan] ?? currentOrg.plan}
          </span>
        </span>
        <span className="text-gray-400">▾</span>
      </button>

      {isOpen && (
        <div className="absolute left-3 right-3 z-10 mt-1 rounded-md border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-800 dark:bg-gray-900">
          {organizations.map((org) => (
            <button
              key={org.id}
              onClick={() => {
                switchOrg(org.id);
                setIsOpen(false);
              }}
              className={`block w-full truncate rounded px-2 py-1.5 text-left text-sm ${
                org.id === currentOrg.id
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-500"
                  : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
            >
              {org.name} <span className="text-xs text-gray-400">({org.role})</span>
            </button>
          ))}

          <div className="mt-1 border-t border-gray-200 pt-1 dark:border-gray-800">
            {isCreating ? (
              <form onSubmit={handleCreate} className="p-1">
                <input
                  autoFocus
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="Organization name"
                  className="mb-1 w-full rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800"
                />
                {error && <p className="mb-1 text-xs text-red-600">{error}</p>}
                <button
                  type="submit"
                  className="w-full rounded bg-brand-600 py-1 text-xs font-medium text-white hover:bg-brand-700"
                >
                  Create
                </button>
              </form>
            ) : (
              <button
                onClick={() => setIsCreating(true)}
                className="block w-full rounded px-2 py-1.5 text-left text-sm text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                + New organization
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
