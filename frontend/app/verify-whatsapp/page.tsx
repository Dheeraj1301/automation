"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { OrgProvider, useOrg } from "@/lib/org-context";
import { AuthCard, FormField } from "@/components/AuthCard";

function VerifyForm() {
  const { token } = useAuth();
  const { currentOrg, isLoading, refreshOrganizations } = useOrg();
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (!isLoading && currentOrg && currentOrg.whatsapp_verified) {
      router.replace(next || "/dashboard");
    }
  }, [isLoading, currentOrg, next, router]);

  if (!token || isLoading || !currentOrg) return null;

  async function handleResend() {
    setError(null);
    setNotice(null);
    setIsResending(true);
    try {
      await api.sendWhatsAppVerification(currentOrg!.id, token!);
      setNotice("Code sent. Check WhatsApp for a message from us.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send code");
    } finally {
      setIsResending(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api.confirmWhatsAppVerification(currentOrg!.id, code, token!);
      await refreshOrganizations();
      router.push(next || "/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Incorrect code");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard title="Verify your WhatsApp number">
      <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        We sent a 6-digit code to <span className="font-medium">{currentOrg.whatsapp_number}</span>.
        Enter it below to continue.
      </p>
      <form onSubmit={handleSubmit}>
        <FormField
          label="Verification code"
          required
          inputMode="numeric"
          pattern="\d{4,8}"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        {notice && <p className="mb-4 text-sm text-green-600">{notice}</p>}
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-brand-600 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {isSubmitting ? "Verifying..." : "Verify"}
        </button>
      </form>
      <button
        onClick={handleResend}
        disabled={isResending}
        className="mt-4 text-sm text-brand-600 hover:underline disabled:opacity-50"
      >
        {isResending ? "Sending..." : "Resend code"}
      </button>
    </AuthCard>
  );
}

export default function VerifyWhatsAppPage() {
  return (
    <Suspense fallback={null}>
      <OrgProvider>
        <VerifyForm />
      </OrgProvider>
    </Suspense>
  );
}
