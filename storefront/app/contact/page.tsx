import type { Metadata } from "next";
import { storefrontApi } from "@/lib/api";
import { LeadCaptureForm } from "@/components/LeadCaptureForm";

export const metadata: Metadata = { title: "Contact" };

export default async function ContactPage() {
  const organization = await storefrontApi.getOrganization();
  const name = organization?.name ?? "us";

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="text-center font-heading text-2xl font-semibold tracking-tight text-text sm:text-3xl">
        Contact {name}
      </h1>
      <p className="mx-auto mb-8 mt-4 max-w-md text-center text-sm leading-relaxed text-muted">
        Have a question about an order or a product? Send us a message and we&apos;ll get back to you.
        {organization?.whatsapp_number && " You can also message us directly on WhatsApp using the button below."}
      </p>
      <LeadCaptureForm />
    </div>
  );
}
