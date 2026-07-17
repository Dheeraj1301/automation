"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { AuthCard, FormField } from "@/components/AuthCard";

function SignupForm() {
  const [fullName, setFullName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setToken } = useAuth();
  const router = useRouter();
  const next = useSearchParams().get("next");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const { access_token } = await api.signup({
        email,
        password,
        full_name: fullName,
        organization_name: organizationName,
        whatsapp_number: whatsappNumber,
      });
      setToken(access_token);
      router.push(`/verify-whatsapp${next ? `?next=${encodeURIComponent(next)}` : ""}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard title="Create your ProfitPilot account">
      <form onSubmit={handleSubmit}>
        <FormField label="Full name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <FormField
          label="Organization name"
          required
          value={organizationName}
          onChange={(e) => setOrganizationName(e.target.value)}
        />
        <FormField
          label="Email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <FormField
          label="Password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <FormField
          label="WhatsApp business number"
          type="tel"
          required
          placeholder="+14155552671"
          pattern="^\+[1-9]\d{7,14}$"
          title="Include the country code, e.g. +14155552671"
          value={whatsappNumber}
          onChange={(e) => setWhatsappNumber(e.target.value)}
        />
        <p className="-mt-2 mb-4 text-xs text-gray-500 dark:text-gray-400">
          Include the country code (e.g. +1 for the US, +91 for India). We&apos;ll text a
          verification code to this number next - it&apos;s also where the AI Sales Agent
          sends customers to close a sale.
        </p>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-brand-600 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {isSubmitting ? "Creating account..." : "Sign up"}
        </button>
      </form>
      <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        Already have an account?{" "}
        <Link href="/login" className="text-brand-600 hover:underline">
          Log in
        </Link>
      </p>
    </AuthCard>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}
