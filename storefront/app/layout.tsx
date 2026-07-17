import type { Metadata } from "next";
import { theme } from "@/lib/theme";
import { storefrontApi } from "@/lib/api";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ChatWidget } from "@/components/ChatWidget";
import { AttributionTracker } from "@/components/AttributionTracker";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const organization = await storefrontApi.getOrganization();
  const name = organization?.name ?? "ProfitPilot Store";
  return {
    title: { default: name, template: `%s | ${name}` },
    description: `Shop ${name} online.`,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const organization = await storefrontApi.getOrganization();

  return (
    <html lang="en">
      <body>
        <style
          // Theme values become CSS custom properties here, once, so no
          // component ever hardcodes a color/font - swap lib/theme.ts to
          // re-skin the whole storefront.
          dangerouslySetInnerHTML={{
            __html: `
              :root {
                --color-brand: ${theme.colors.brand};
                --color-brand-dark: ${theme.colors.brandDark};
                --color-surface: ${theme.colors.surface};
                --color-text: ${theme.colors.text};
                --color-muted: ${theme.colors.muted};
                --font-sans: ${theme.fonts.sans};
                --radius: ${theme.radius};
              }
              @media (prefers-color-scheme: dark) {
                :root {
                  --color-surface: ${theme.colors.surfaceDark};
                  --color-text: ${theme.colors.textDark};
                  --color-muted: ${theme.colors.mutedDark};
                }
              }
            `,
          }}
        />
        <AttributionTracker />
        <div className="flex min-h-screen flex-col">
          <Header organizationName={organization?.name ?? "Store"} />
          <main className="flex-1">{children}</main>
          <Footer organizationName={organization?.name ?? "Store"} />
        </div>
        {organization && <ChatWidget merchantSlug={organization.slug} organizationName={organization.name} />}
      </body>
    </html>
  );
}
