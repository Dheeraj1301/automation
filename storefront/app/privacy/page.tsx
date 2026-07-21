import type { Metadata } from "next";
import { storefrontApi } from "@/lib/api";

export const metadata: Metadata = { title: "Privacy Policy" };

export default async function PrivacyPage() {
  const organization = await storefrontApi.getOrganization();
  const name = organization?.name ?? "This store";

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="mb-4 font-heading text-2xl font-semibold tracking-tight text-text">Privacy Policy</h1>
      <p className="text-sm leading-relaxed text-muted">
        {name} respects your privacy. This placeholder policy will be replaced with a real,
        merchant-specific policy in a later phase. We do not sell your personal information to
        third parties.
      </p>
    </div>
  );
}
