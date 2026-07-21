import type { Metadata } from "next";
import { storefrontApi } from "@/lib/api";
import { FAQAccordion } from "@/components/FAQAccordion";

export const metadata: Metadata = { title: "FAQ" };
export const revalidate = 60;

const DEFAULT_FAQS = [
  { question: "What payment methods do you accept?", answer: "Payment options will be shown at checkout." },
  {
    question: "How long does shipping take?",
    answer: "Shipping times vary by product and location; details are provided at checkout.",
  },
  { question: "What is your return policy?", answer: "Please contact us for return and exchange requests." },
];

export default async function FaqPage() {
  const organization = await storefrontApi.getOrganization();
  const faqs = organization?.storefront_config.faqs.length ? organization.storefront_config.faqs : DEFAULT_FAQS;

  return <FAQAccordion items={faqs} />;
}
