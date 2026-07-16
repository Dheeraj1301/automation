"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError, InvitationPreview } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { AuthCard } from "@/components/AuthCard";

function AcceptInviteContent() {
  const token = useSearchParams().get("token");
  const router = useRouter();
  const { token: authToken, user, isLoading: authLoading } = useAuth();

  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Missing invite token");
      return;
    }
    api
      .previewInvite(token)
      .then(setPreview)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Invite not found"));
  }, [token]);

  async function handleAccept() {
    if (!token || !authToken) return;
    setIsAccepting(true);
    setError(null);
    try {
      await api.acceptInvite(token, authToken);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not accept invite");
    } finally {
      setIsAccepting(false);
    }
  }

  return (
    <AuthCard title="Join organization">
      {!preview && !error && <p className="text-sm text-gray-600 dark:text-gray-400">Loading invite...</p>}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {preview && (
        <div>
          <p className="mb-4 text-sm text-gray-700 dark:text-gray-300">
            You&apos;ve been invited to join <span className="font-semibold">{preview.organization_name}</span> as{" "}
            <span className="font-semibold">{preview.role}</span>.
          </p>

          {!preview.is_valid && <p className="mb-4 text-sm text-red-600">This invite has expired or was revoked.</p>}

          {preview.is_valid && !authLoading && !authToken && (
            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">Log in or sign up with {preview.email} to accept.</p>
              <div className="flex gap-3">
                <Link
                  href={`/login?next=${encodeURIComponent(`/accept-invite?token=${token}`)}`}
                  className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
                >
                  Log in
                </Link>
                <Link
                  href={`/signup?next=${encodeURIComponent(`/accept-invite?token=${token}`)}`}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Sign up
                </Link>
              </div>
            </div>
          )}

          {preview.is_valid && authToken && user && user.email.toLowerCase() !== preview.email.toLowerCase() && (
            <p className="text-sm text-red-600">
              You&apos;re signed in as {user.email}, but this invite was sent to {preview.email}.
            </p>
          )}

          {preview.is_valid && authToken && user && user.email.toLowerCase() === preview.email.toLowerCase() && (
            <button
              onClick={handleAccept}
              disabled={isAccepting}
              className="w-full rounded-md bg-brand-600 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {isAccepting ? "Joining..." : "Accept & join"}
            </button>
          )}
        </div>
      )}
    </AuthCard>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={null}>
      <AcceptInviteContent />
    </Suspense>
  );
}
