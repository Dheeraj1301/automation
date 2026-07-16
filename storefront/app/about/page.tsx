import type { Metadata } from "next";
import { storefrontApi } from "@/lib/api";

export const metadata: Metadata = { title: "About" };

export default async function AboutPage() {
  const organization = await storefrontApi.getOrganization();
  const name = organization?.name ?? "our store";

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-4 text-2xl font-semibold">About {name}</h1>
      <p className="text-sm leading-relaxed text-muted">
        Welcome to {name}. We&apos;re a growing online store bringing you a curated selection of
        products. This page is a placeholder - the merchant can customize it with their own story
        in a later phase.
      </p>
    </div>
  );
}
