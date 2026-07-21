import { ScrollReveal } from "@/components/ScrollReveal";

export function AboutSection({
  heading,
  body,
  organizationName,
}: {
  heading: string;
  body: string;
  organizationName: string;
}) {
  if (!body) return null;

  return (
    <ScrollReveal className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
      <section>
        <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          {heading || `About ${organizationName}`}
        </h2>
        <p className="mt-5 whitespace-pre-line text-base leading-relaxed text-muted">{body}</p>
      </section>
    </ScrollReveal>
  );
}
