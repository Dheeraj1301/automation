import { assetUrl, TestimonialItem } from "@/lib/api";
import { Icon } from "@/components/icons";
import { ScrollReveal } from "@/components/ScrollReveal";

export function Testimonials({ items }: { items: TestimonialItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="bg-surface-alt py-16">
      <ScrollReveal className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="text-center font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          What customers say
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => (
            <figure key={i} className="rounded-theme-lg border border-border bg-surface p-6">
              <div className="flex gap-0.5 text-primary">
                {Array.from({ length: 5 }).map((_, star) => (
                  <Icon
                    key={star}
                    name="star"
                    className={`h-4 w-4 ${star < item.rating ? "fill-current" : "opacity-25"}`}
                  />
                ))}
              </div>
              <blockquote className="mt-3 text-sm text-text">&ldquo;{item.quote}&rdquo;</blockquote>
              <figcaption className="mt-4 flex items-center gap-3">
                {item.avatar_path ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={assetUrl(item.avatar_path)} alt={item.name} className="h-9 w-9 rounded-full object-cover" />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                    {item.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-medium text-text">{item.name}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </ScrollReveal>
    </section>
  );
}
