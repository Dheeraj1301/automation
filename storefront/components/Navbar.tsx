"use client";

import { useState } from "react";
import Link from "next/link";
import { assetUrl } from "@/lib/api";

const NAV_LINKS = [
  { label: "Shop", href: "/products" },
  { label: "About", href: "/about" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
];

export function Navbar({
  organizationName,
  logoPath,
}: {
  organizationName: string;
  logoPath: string | null;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" onClick={() => setIsMenuOpen(false)}>
          {logoPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={assetUrl(logoPath)} alt={organizationName} className="h-8 w-8 rounded-theme-sm object-cover" />
          ) : null}
          <span className="font-heading text-lg font-semibold tracking-tight">{organizationName}</span>
        </Link>

        <nav className="hidden gap-8 text-sm font-medium sm:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="text-muted transition-colors hover:text-text">
              {link.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => setIsMenuOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-theme-sm text-text sm:hidden"
          aria-label="Toggle menu"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-6 w-6">
            {isMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
            )}
          </svg>
        </button>
      </div>

      {isMenuOpen && (
        <nav className="flex flex-col gap-1 border-t border-border px-4 py-3 sm:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsMenuOpen(false)}
              className="rounded-theme-sm px-2 py-2.5 text-sm font-medium text-text hover:bg-surface-alt"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
