"use client";

import { FormEvent, useState } from "react";
import { submitLead } from "@/lib/leads";
import { getAttribution } from "@/lib/attribution";

export function LeadCaptureForm({ landingPageSlug }: { landingPageSlug?: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
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
    const attribution = getAttribution();
    const result = await submitLead({
      name,
      email,
      phone: phone || undefined,
      company: company || undefined,
      country: country || undefined,
      consent,
      landing_page_slug: landingPageSlug,
      ...attribution,
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
      <div className="rounded-theme border border-black/10 p-6 text-center dark:border-white/10">
        <p className="font-medium">Thanks! We&apos;ll be in touch.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-theme border border-black/10 p-6 dark:border-white/10">
      <div>
        <label className="mb-1 block text-sm font-medium">Name</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-theme border border-black/10 px-3 py-2 text-sm dark:border-white/10 dark:bg-transparent"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Email</label>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-theme border border-black/10 px-3 py-2 text-sm dark:border-white/10 dark:bg-transparent"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Phone</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-theme border border-black/10 px-3 py-2 text-sm dark:border-white/10 dark:bg-transparent"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Country</label>
          <input
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full rounded-theme border border-black/10 px-3 py-2 text-sm dark:border-white/10 dark:bg-transparent"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Company (optional)</label>
        <input
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="w-full rounded-theme border border-black/10 px-3 py-2 text-sm dark:border-white/10 dark:bg-transparent"
        />
      </div>
      <label className="flex items-start gap-2 text-xs text-muted">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5"
        />
        I agree to be contacted about my inquiry.
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-theme bg-brand py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
      >
        {isSubmitting ? "Submitting..." : "Submit"}
      </button>
    </form>
  );
}
