"use client";

import { useState } from "react";
import { StorefrontFaqItem } from "@/lib/api";

export function FAQAccordion({ items }: { items: StorefrontFaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h2 className="animate-reveal text-center font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
        Frequently asked questions
      </h2>
      <div className="mt-8 divide-y divide-border rounded-theme-lg border border-border bg-surface">
        {items.map((item, i) => {
          const isOpen = openIndex === i;
          return (
            <div key={i}>
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="font-medium text-text">{item.question}</span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`h-5 w-5 flex-none text-muted transition-transform ${isOpen ? "rotate-45" : ""}`}
                >
                  <path strokeLinecap="round" d="M12 5v14M5 12h14" />
                </svg>
              </button>
              {isOpen && <p className="px-5 pb-4 text-sm text-muted">{item.answer}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
