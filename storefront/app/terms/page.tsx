import type { Metadata } from "next";
import { storefrontApi } from "@/lib/api";

export const metadata: Metadata = { title: "Terms of Service" };

export default async function TermsPage() {
  const organization = await storefrontApi.getOrganization();
  const name = organization?.name ?? "This store";

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="mb-4 font-heading text-2xl font-semibold tracking-tight text-text">Terms of Service</h1>
      <p className="text-sm leading-relaxed text-muted">
        By using {name}&apos;s website, you agree to these placeholder terms, which will be replaced
        with real, merchant-specific terms in a later phase.
      </p>
    </div>
  );
}
