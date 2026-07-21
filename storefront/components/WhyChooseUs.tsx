import { WhyChooseUsItem } from "@/lib/api";
import { Icon } from "@/components/icons";
import { ScrollReveal } from "@/components/ScrollReveal";

export function WhyChooseUs({ items }: { items: WhyChooseUsItem[] }) {
  if (items.length === 0) return null;

  return (
    <ScrollReveal className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <section>
        <h2 className="text-center font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Why choose us</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => (
            <div key={i} className="rounded-theme-lg border border-border bg-surface p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-theme bg-primary-soft text-primary">
                <Icon name={item.icon} className="h-5 w-5" />
              </div>
              <p className="mt-4 font-heading text-base font-semibold text-text">{item.title}</p>
              <p className="mt-1.5 text-sm text-muted">{item.description}</p>
            </div>
          ))}
        </div>
      </section>
    </ScrollReveal>
  );
}
