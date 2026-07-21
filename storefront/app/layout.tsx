import type { Metadata } from "next";
import { Barlow_Condensed, Inter, Playfair_Display, Poppins } from "next/font/google";
import { getTheme } from "@/lib/themes";
import { storefrontApi } from "@/lib/api";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { AIChatWidget } from "@/components/AIChatWidget";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-playfair",
  display: "swap",
});
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});
const barlow = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-barlow",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const organization = await storefrontApi.getOrganization();
  const name = organization?.name ?? "ProfitPilot Store";
  return {
    title: { default: name, template: `%s | ${name}` },
    description: organization?.storefront_config.about_body || `Shop ${name} online.`,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const organization = await storefrontApi.getOrganization();
  const theme = getTheme(organization?.storefront_config.theme);
  const { colors, fonts, radius, shadow } = theme;

  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} ${poppins.variable} ${barlow.variable}`}>
      <body>
        <style
          // Theme tokens become CSS custom properties here, once per
          // request - components read var(--color-*) etc via the Tailwind
          // classes configured in tailwind.config.ts, never a literal color.
          dangerouslySetInnerHTML={{
            __html: `
              :root {
                --color-bg: ${colors.bg};
                --color-surface: ${colors.surface};
                --color-surface-alt: ${colors.surfaceAlt};
                --color-text: ${colors.text};
                --color-muted: ${colors.muted};
                --color-primary: ${colors.primary};
                --color-primary-hover: ${colors.primaryHover};
                --color-primary-soft: color-mix(in srgb, ${colors.primary} 12%, transparent);
                --color-secondary: ${colors.secondary};
                --color-border: ${colors.border};
                --color-on-primary: ${colors.onPrimary};
                --font-heading: ${fonts.heading}, var(--font-inter), sans-serif;
                --font-body: ${fonts.body}, sans-serif;
                --radius-sm: ${radius.sm};
                --radius-md: ${radius.md};
                --radius-lg: ${radius.lg};
                --shadow: ${shadow};
              }
              @media (prefers-color-scheme: dark) {
                :root {
                  --color-bg: ${colors.bgDark};
                  --color-surface: ${colors.surfaceDark};
                  --color-surface-alt: ${colors.surfaceAltDark};
                  --color-text: ${colors.textDark};
                  --color-muted: ${colors.mutedDark};
                  --color-border: ${colors.borderDark};
                }
              }
            `,
          }}
        />
        <div className="flex min-h-screen flex-col bg-bg text-text">
          <Navbar organizationName={organization?.name ?? "Store"} logoPath={organization?.logo_path ?? null} />
          <main className="flex-1">{children}</main>
          <Footer organizationName={organization?.name ?? "Store"} />
          <WhatsAppButton whatsappNumber={organization?.whatsapp_number ?? null} />
          {organization?.slug && (
            <AIChatWidget organizationName={organization.name} organizationSlug={organization.slug} />
          )}
        </div>
      </body>
    </html>
  );
}
