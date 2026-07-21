import Link from "next/link";

const SHOP_LINKS = [
  { label: "All products", href: "/products" },
  { label: "About us", href: "/about" },
  { label: "Contact", href: "/contact" },
];

const SUPPORT_LINKS = [
  { label: "FAQ", href: "/faq" },
  { label: "Privacy policy", href: "/privacy" },
  { label: "Terms of service", href: "/terms" },
];

export function Footer({ organizationName }: { organizationName: string }) {
  return (
    <footer className="border-t border-border bg-surface-alt">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <p className="font-heading text-lg font-semibold tracking-tight">{organizationName}</p>
          <p className="mt-2 max-w-xs text-sm text-muted">
            Browse our full catalog, ask a question anytime, and reach us directly whenever you&apos;re ready.
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold text-text">Shop</p>
          <ul className="mt-3 space-y-2">
            {SHOP_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-muted transition-colors hover:text-primary">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold text-text">Support</p>
          <ul className="mt-3 space-y-2">
            {SUPPORT_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-muted transition-colors hover:text-primary">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-border px-4 py-6 text-center text-xs text-muted sm:px-6">
        © {new Date().getFullYear()} {organizationName}. All rights reserved.
      </div>
    </footer>
  );
}
