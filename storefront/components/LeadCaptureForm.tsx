"use client";

import { FormEvent, useState } from "react";
import { submitLead } from "@/lib/leads";

export function LeadCaptureForm({ landingPageSlug }: { landingPageSlug?: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [consent, setConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!consent) {
      setError("Please agree to be contacted before submitting.");
      return;
    }

    setIsSubmitting(true);
    const result = await submitLead({
      name,
      email,
      phone: phone || undefined,
      country: country || undefined,
      consent,
      landing_page_slug: landingPageSlug,
    });
    setIsSubmitting(false);

    if (result.ok) {
      setSubmitted(true);
    } else {
      setError(result.error ?? "Something went wrong");
    }
  }

  if (submitted) {
    return (
      <div className="rounded-theme-lg border border-border bg-surface p-8 text-center">
        <p className="font-heading text-lg font-medium text-text">Thanks! We&apos;ll be in touch.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-theme-lg border border-border bg-surface p-6 shadow-theme">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-text">Name</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-theme border border-border bg-bg px-3 py-2.5 text-sm text-text outline-none focus:border-primary"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-text">Email</label>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-theme border border-border bg-bg px-3 py-2.5 text-sm text-text outline-none focus:border-primary"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text">Phone</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-theme border border-border bg-bg px-3 py-2.5 text-sm text-text outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text">Country</label>
          <input
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full rounded-theme border border-border bg-bg px-3 py-2.5 text-sm text-text outline-none focus:border-primary"
          />
        </div>
      </div>
      <label className="flex items-start gap-2 text-xs text-muted">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
        I agree to be contacted about my inquiry.
      </label>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-theme bg-primary py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-50"
      >
        {isSubmitting ? "Submitting..." : "Submit"}
      </button>
    </form>
  );
}
