import type { Config } from "tailwindcss";

// Colors resolve to CSS custom properties set per-theme in app/layout.tsx
// (see lib/themes.ts for the 7 theme token sets), so no component ever
// hardcodes a color - swapping a merchant's theme never touches
// component classnames.
const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        "surface-alt": "var(--color-surface-alt)",
        text: "var(--color-text)",
        muted: "var(--color-muted)",
        primary: "var(--color-primary)",
        "primary-hover": "var(--color-primary-hover)",
        "primary-soft": "var(--color-primary-soft)",
        secondary: "var(--color-secondary)",
        border: "var(--color-border)",
        "on-primary": "var(--color-on-primary)",
        // Legacy aliases kept so existing components (brand/brand-dark)
        // don't all need renaming in the same pass.
        brand: "var(--color-primary)",
        "brand-dark": "var(--color-primary-hover)",
      },
      fontFamily: {
        heading: "var(--font-heading)",
        sans: "var(--font-body)",
      },
      borderRadius: {
        theme: "var(--radius-md)",
        "theme-sm": "var(--radius-sm)",
        "theme-lg": "var(--radius-lg)",
      },
      boxShadow: {
        theme: "var(--shadow)",
      },
    },
  },
  plugins: [],
};

export default config;
