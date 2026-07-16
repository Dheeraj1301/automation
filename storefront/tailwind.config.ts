import type { Config } from "tailwindcss";

// Colors resolve to CSS custom properties set from lib/theme.ts at runtime
// (see app/layout.tsx), so swapping the theme never requires touching
// component classnames.
const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: "var(--color-brand)",
        "brand-dark": "var(--color-brand-dark)",
        surface: "var(--color-surface)",
        muted: "var(--color-muted)",
      },
      fontFamily: {
        sans: "var(--font-sans)",
      },
      borderRadius: {
        theme: "var(--radius)",
      },
    },
  },
  plugins: [],
};

export default config;
