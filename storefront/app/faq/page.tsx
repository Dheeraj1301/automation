import type { Metadata } from "next";

export const metadata: Metadata = { title: "FAQ" };

const FAQS = [
  { q: "What payment methods do you accept?", a: "Payment options will be shown at checkout." },
  { q: "How long does shipping take?", a: "Shipping times vary by product and location; details are provided at checkout." },
  { q: "What is your return policy?", a: "Please contact us for return and exchange requests." },
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-6 text-2xl font-semibold">Frequently asked questions</h1>
      <div className="space-y-6">
        {FAQS.map((item) => (
          <div key={item.q}>
            <p className="font-medium">{item.q}</p>
            <p className="mt-1 text-sm text-muted">{item.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
