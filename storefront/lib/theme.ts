/**
 * Single source of truth for storefront styling. Every visual choice
 * (color, font, radius) is read from this object and injected as CSS
 * custom properties in app/layout.tsx - swap this file to re-theme the
 * whole storefront without touching any component.
 */
export const theme = {
  colors: {
    brand: "#2563eb",
    brandDark: "#1d4ed8",
    surface: "#ffffff",
    surfaceDark: "#0a0a0a",
    text: "#111827",
    textDark: "#f3f4f6",
    muted: "#6b7280",
    mutedDark: "#9ca3af",
  },
  fonts: {
    sans: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  },
  radius: "0.5rem",
} as const;

export type Theme = typeof theme;
