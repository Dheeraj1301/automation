import type { Metadata } from "next";
import { storefrontApi } from "@/lib/api";

export const metadata: Metadata = { title: "Contact" };

export default async function ContactPage() {
  const organization = await storefrontApi.getOrganization();
  const name = organization?.name ?? "us";

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-4 text-2xl font-semibold">Contact {name}</h1>
      <p className="text-sm leading-relaxed text-muted">
        Have a question about an order or a product? A contact form is coming soon - for now,
        reach out to {name} directly through the channels they&apos;ve shared with you.
      </p>
    </div>
  );
}
