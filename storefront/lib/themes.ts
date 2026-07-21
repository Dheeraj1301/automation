/**
 * The 7 premium catalog themes. Every visual choice (color, font, radius,
 * shadow) lives here as design tokens - no component ever hardcodes a
 * color. app/layout.tsx picks one theme (from the merchant's
 * storefront_config, fetched server-side) and injects its tokens as CSS
 * custom properties; Tailwind utilities (see tailwind.config.ts) resolve
 * to those properties at runtime.
 *
 * Fonts reference CSS variables set up once in app/layout.tsx via
 * next/font/google (Inter, Playfair Display, Poppins, Barlow Condensed) -
 * reusing 4 font families across 7 themes keeps page weight down while
 * still giving each theme a distinct typographic personality.
 */
export type ThemeId =
  | "luxury"
  | "modern_tech"
  | "premium_fashion"
  | "organic"
  | "industrial"
  | "interior"
  | "colorful_retail";

export interface ThemeTokens {
  label: string;
  colors: {
    bg: string;
    bgDark: string;
    surface: string;
    surfaceDark: string;
    surfaceAlt: string;
    surfaceAltDark: string;
    text: string;
    textDark: string;
    muted: string;
    mutedDark: string;
    primary: string;
    primaryHover: string;
    secondary: string;
    border: string;
    borderDark: string;
    onPrimary: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  radius: { sm: string; md: string; lg: string; full: string };
  shadow: string;
  /** Loosely tunes copy/spacing personality per theme in components. */
  density: "tight" | "normal" | "airy";
}

export const themes: Record<ThemeId, ThemeTokens> = {
  luxury: {
    label: "Luxury",
    colors: {
      bg: "#0d0d0d",
      bgDark: "#0d0d0d",
      surface: "#161616",
      surfaceDark: "#161616",
      surfaceAlt: "#1e1c17",
      surfaceAltDark: "#1e1c17",
      text: "#f5f2ea",
      textDark: "#f5f2ea",
      muted: "#b6ab93",
      mutedDark: "#b6ab93",
      primary: "#cba135",
      primaryHover: "#b38f2c",
      secondary: "#ffffff",
      border: "#2b2822",
      borderDark: "#2b2822",
      onPrimary: "#0d0d0d",
    },
    fonts: { heading: "var(--font-playfair)", body: "var(--font-inter)" },
    radius: { sm: "2px", md: "4px", lg: "8px", full: "999px" },
    shadow: "0 20px 40px -20px rgba(203,161,53,0.25)",
    density: "airy",
  },

  modern_tech: {
    label: "Modern Tech",
    colors: {
      bg: "#fafafa",
      bgDark: "#0a0a0c",
      surface: "#ffffff",
      surfaceDark: "#141417",
      surfaceAlt: "#f2f3f5",
      surfaceAltDark: "#1a1b1f",
      text: "#0a0a0c",
      textDark: "#f4f4f6",
      muted: "#6b6f76",
      mutedDark: "#9a9da4",
      primary: "#2563eb",
      primaryHover: "#1d4ed8",
      secondary: "#0a0a0c",
      border: "#e5e6e8",
      borderDark: "#26272b",
      onPrimary: "#ffffff",
    },
    fonts: { heading: "var(--font-inter)", body: "var(--font-inter)" },
    radius: { sm: "10px", md: "16px", lg: "24px", full: "999px" },
    shadow: "0 20px 40px -24px rgba(10,10,12,0.25)",
    density: "normal",
  },

  premium_fashion: {
    label: "Premium Fashion",
    colors: {
      bg: "#faf8f5",
      bgDark: "#141210",
      surface: "#ffffff",
      surfaceDark: "#1c1a17",
      surfaceAlt: "#f0e9dd",
      surfaceAltDark: "#241f19",
      text: "#1a1a1a",
      textDark: "#f2ede4",
      muted: "#8a7f6f",
      mutedDark: "#a89d8c",
      primary: "#1a1a1a",
      primaryHover: "#000000",
      secondary: "#c9b896",
      border: "#e8e0d5",
      borderDark: "#2c2820",
      onPrimary: "#ffffff",
    },
    fonts: { heading: "var(--font-playfair)", body: "var(--font-inter)" },
    radius: { sm: "0px", md: "2px", lg: "4px", full: "999px" },
    shadow: "0 16px 32px -20px rgba(26,26,26,0.18)",
    density: "airy",
  },

  organic: {
    label: "Organic",
    colors: {
      bg: "#f7f3e8",
      bgDark: "#161408",
      surface: "#ffffff",
      surfaceDark: "#1f1c10",
      surfaceAlt: "#eee7d1",
      surfaceAltDark: "#26220f",
      text: "#3d2f1f",
      textDark: "#f0e9d8",
      muted: "#7a6a52",
      mutedDark: "#b5a688",
      primary: "#5c7d47",
      primaryHover: "#4a6739",
      secondary: "#8b6544",
      border: "#ddd2b0",
      borderDark: "#33301f",
      onPrimary: "#ffffff",
    },
    fonts: { heading: "var(--font-poppins)", body: "var(--font-inter)" },
    radius: { sm: "10px", md: "18px", lg: "28px", full: "999px" },
    shadow: "0 18px 36px -22px rgba(92,125,71,0.25)",
    density: "airy",
  },

  industrial: {
    label: "Industrial",
    colors: {
      bg: "#f2f3f5",
      bgDark: "#15171b",
      surface: "#ffffff",
      surfaceDark: "#1c1f24",
      surfaceAlt: "#e4e7eb",
      surfaceAltDark: "#22252b",
      text: "#1e2530",
      textDark: "#eef0f3",
      muted: "#5b6572",
      mutedDark: "#9aa2ac",
      primary: "#e2601f",
      primaryHover: "#c74f16",
      secondary: "#1e3a5f",
      border: "#d3d7dd",
      borderDark: "#2c2f36",
      onPrimary: "#ffffff",
    },
    fonts: { heading: "var(--font-barlow)", body: "var(--font-inter)" },
    radius: { sm: "2px", md: "4px", lg: "8px", full: "999px" },
    shadow: "0 16px 30px -20px rgba(30,37,48,0.3)",
    density: "tight",
  },

  interior: {
    label: "Interior",
    colors: {
      bg: "#f5f1ea",
      bgDark: "#181511",
      surface: "#ffffff",
      surfaceDark: "#211d17",
      surfaceAlt: "#ebe1d0",
      surfaceAltDark: "#292319",
      text: "#2b2621",
      textDark: "#efe8db",
      muted: "#786c5b",
      mutedDark: "#b3a690",
      primary: "#a9764f",
      primaryHover: "#8f6240",
      secondary: "#2b2621",
      border: "#e2d7c3",
      borderDark: "#332c22",
      onPrimary: "#ffffff",
    },
    fonts: { heading: "var(--font-playfair)", body: "var(--font-inter)" },
    radius: { sm: "8px", md: "14px", lg: "22px", full: "999px" },
    shadow: "0 18px 34px -22px rgba(169,118,79,0.25)",
    density: "airy",
  },

  colorful_retail: {
    label: "Colorful Retail",
    colors: {
      bg: "#ffffff",
      bgDark: "#161318",
      surface: "#fdfdfd",
      surfaceDark: "#1e1a22",
      surfaceAlt: "#fff2ea",
      surfaceAltDark: "#26202b",
      text: "#1f2430",
      textDark: "#f2f0f6",
      muted: "#6b7280",
      mutedDark: "#a3a8b5",
      primary: "#ff5c7c",
      primaryHover: "#e94a6a",
      secondary: "#4ecdc4",
      border: "#ffe0e9",
      borderDark: "#332a30",
      onPrimary: "#ffffff",
    },
    fonts: { heading: "var(--font-poppins)", body: "var(--font-inter)" },
    radius: { sm: "14px", md: "22px", lg: "30px", full: "999px" },
    shadow: "0 18px 36px -20px rgba(255,92,124,0.3)",
    density: "normal",
  },
};

export const DEFAULT_THEME: ThemeId = "modern_tech";

export function getTheme(themeId: string | undefined | null): ThemeTokens {
  return themes[(themeId as ThemeId) ?? DEFAULT_THEME] ?? themes[DEFAULT_THEME];
}
