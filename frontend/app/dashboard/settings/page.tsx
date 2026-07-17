"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useOrg } from "@/lib/org-context";
import { api, ApiError, Invitation, Member } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const SEAT_LIMITS: Record<string, string> = { free: "1 seat", pro: "5 seats", enterprise: "Unlimited seats" };

export default function SettingsPage() {
  const { token } = useAuth();
  const { currentOrg, refreshOrganizations } = useOrg();

  if (!token || !currentOrg) return null;

  const canManage = currentOrg.role === "owner" || currentOrg.role === "admin";

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Organization settings</h1>

      <OrganizationDetails token={token} canManage={canManage} onSaved={refreshOrganizations} />
      {canManage && <IntegrationsSection token={token} />}
      <MembersSection token={token} canManage={canManage} isOwner={currentOrg.role === "owner"} />
      {canManage && <InvitesSection token={token} />}
    </div>
  );
}

function IntegrationsSection({ token }: { token: string }) {
  const { currentOrg } = useOrg();
  const searchParams = useSearchParams();
  const [connected, setConnected] = useState<boolean | null>(null);
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    if (!currentOrg) return;
    try {
      const status = await api.getZohoStatus(currentOrg.id, token);
      setConnected(status.connected);
      setConnectedEmail(status.connected_email);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load integration status");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrg?.id]);

  useEffect(() => {
    const zohoParam = searchParams.get("zoho");
    if (zohoParam === "connected") setNotice("Zoho CRM connected. New leads will sync automatically.");
    if (zohoParam === "error") setError("Could not connect Zoho CRM. Please try again.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!currentOrg) return null;

  async function handleConnect() {
    setIsBusy(true);
    setError(null);
    try {
      const { authorization_url } = await api.connectZoho(currentOrg!.id, token);
      window.location.href = authorization_url;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not start Zoho connection");
      setIsBusy(false);
    }
  }

  async function handleDisconnect() {
    setIsBusy(true);
    setError(null);
    try {
      await api.disconnectZoho(currentOrg!.id, token);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not disconnect Zoho");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 p-6 dark:border-gray-800">
      <h2 className="mb-4 text-lg font-medium text-gray-900 dark:text-gray-100">Integrations</h2>

      {notice && <p className="mb-3 text-sm text-green-600">{notice}</p>}
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="flex items-center justify-between rounded-lg border border-gray-100 p-4 dark:border-gray-800">
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">Zoho CRM</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {connected === null
              ? "Loading..."
              : connected
              ? `Connected as ${connectedEmail ?? "your Zoho account"}. Every new lead syncs automatically.`
              : "Connect your Zoho account to sync every new lead into Zoho CRM in real time."}
          </p>
        </div>
        {connected ? (
          <button
            onClick={handleDisconnect}
            disabled={isBusy}
            className="rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Disconnect
          </button>
        ) : (
          <button
            onClick={handleConnect}
            disabled={isBusy || connected === null}
            className="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {isBusy ? "Redirecting..." : "Connect Zoho CRM"}
          </button>
        )}
      </div>
    </section>
  );
}

function OrganizationDetails({
  token,
  canManage,
  onSaved,
}: {
  token: string;
  canManage: boolean;
  onSaved: () => Promise<void>;
}) {
  const { currentOrg } = useOrg();
  const [name, setName] = useState(currentOrg?.name ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(currentOrg?.name ?? "");
  }, [currentOrg?.id, currentOrg?.name]);

  if (!currentOrg) return null;

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.updateOrganization(currentOrg!.id, { name }, token);
      await onSaved();
      setMessage("Saved");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setError(null);
    try {
      await api.uploadLogo(currentOrg!.id, file, token);
      await onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not upload logo");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 p-6 dark:border-gray-800">
      <h2 className="mb-4 text-lg font-medium text-gray-900 dark:text-gray-100">Details</h2>

      <div className="mb-4 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800">
          {currentOrg.logo_path ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`${API_URL}${currentOrg.logo_path}`} alt="Organization logo" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-gray-400">No logo</span>
          )}
        </div>
        {canManage && (
          <label className="cursor-pointer text-sm font-medium text-brand-600 hover:underline">
            {isUploading ? "Uploading..." : "Change logo"}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleLogoChange} disabled={isUploading} />
          </label>
        )}
      </div>

      <form onSubmit={handleSave} className="max-w-sm">
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Organization name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!canManage}
          className="mb-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:disabled:bg-gray-900"
        />
        {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
        {message && <p className="mb-2 text-sm text-green-600">{message}</p>}
        {canManage && (
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        )}
      </form>

      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        Plan: <span className="font-medium text-gray-700 dark:text-gray-300">{currentOrg.plan}</span> ·{" "}
        {SEAT_LIMITS[currentOrg.plan] ?? ""}
      </p>
    </section>
  );
}

function MembersSection({ token, canManage, isOwner }: { token: string; canManage: boolean; isOwner: boolean }) {
  const { currentOrg } = useOrg();
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!currentOrg) return;
    try {
      setMembers(await api.listMembers(currentOrg.id, token));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load members");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrg?.id]);

  if (!currentOrg) return null;

  async function handleRoleChange(userId: string, role: string) {
    try {
      await api.updateMemberRole(currentOrg!.id, userId, role, token);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update role");
    }
  }

  async function handleRemove(userId: string) {
    try {
      await api.removeMember(currentOrg!.id, userId, token);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not remove member");
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 p-6 dark:border-gray-800">
      <h2 className="mb-4 text-lg font-medium text-gray-900 dark:text-gray-100">Team members</h2>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <ul className="divide-y divide-gray-100 dark:divide-gray-800">
        {members.map((member) => (
          <li key={member.user_id} className="flex items-center justify-between py-2 text-sm">
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">{member.full_name}</p>
              <p className="text-gray-500 dark:text-gray-400">{member.email}</p>
            </div>
            <div className="flex items-center gap-3">
              {isOwner && member.role !== "owner" ? (
                <select
                  value={member.role}
                  onChange={(e) => handleRoleChange(member.user_id, e.target.value)}
                  className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
                >
                  <option value="admin">admin</option>
                  <option value="staff">staff</option>
                </select>
              ) : (
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                  {member.role}
                </span>
              )}
              {canManage && member.role !== "owner" && (
                <button onClick={() => handleRemove(member.user_id)} className="text-xs text-red-600 hover:underline">
                  Remove
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function InvitesSection({ token }: { token: string }) {
  const { currentOrg } = useOrg();
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("staff");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function load() {
    if (!currentOrg) return;
    try {
      setInvites(await api.listInvites(currentOrg.id, token));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load invites");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrg?.id]);

  if (!currentOrg) return null;

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api.createInvite(currentOrg!.id, { email, role }, token);
      setEmail("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send invite");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRevoke(inviteId: string) {
    try {
      await api.revokeInvite(currentOrg!.id, inviteId, token);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not revoke invite");
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 p-6 dark:border-gray-800">
      <h2 className="mb-4 text-lg font-medium text-gray-900 dark:text-gray-100">Invite a teammate</h2>

      <form onSubmit={handleInvite} className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="staff">staff</option>
            <option value="admin">admin</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {isSubmitting ? "Sending..." : "Send invite"}
        </button>
      </form>

      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      {invites.length > 0 && (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {invites.map((invite) => (
            <li key={invite.id} className="flex items-center justify-between py-2 text-sm">
              <span className="text-gray-700 dark:text-gray-300">
                {invite.email} <span className="text-gray-400">({invite.role})</span>
              </span>
              <button onClick={() => handleRevoke(invite.id)} className="text-xs text-red-600 hover:underline">
                Revoke
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
