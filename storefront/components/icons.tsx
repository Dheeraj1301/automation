// Small, fixed icon set for "Why choose us" items - merchants pick a key
// (see StorefrontConfig.why_choose_us[].icon) rather than uploading icons.
const PATHS: Record<string, string> = {
  shield: "M12 2 4 5v6c0 5 3.4 9 8 11 4.6-2 8-6 8-11V5l-8-3Z",
  truck: "M3 7h11v8H3V7Zm11 3h4l3 3v2h-7v-5ZM6 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm12 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
  star: "m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z",
  headset:
    "M4 12a8 8 0 0 1 16 0v5a3 3 0 0 1-3 3h-1v-6h4v-2a6 6 0 0 0-12 0v2h4v6H7a3 3 0 0 1-3-3v-5Z",
  heart: "M12 21s-7.5-4.7-10-9.3C.5 8 2.3 4.5 6 4.5c2 0 3.5 1.2 4 2.4.5-1.2 2-2.4 4-2.4 3.7 0 5.5 3.5 4 7.2-2.5 4.6-10 9.3-10 9.3Z",
  leaf: "M5 21c9 0 14-5 14-14V4h-3C7 4 5 12 5 21Zm0 0c0-4 2-7 6-9",
  award: "M12 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm-3 2-1.5 5L12 19l4.5 3L15 17",
  clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-16v6l4 2",
};

export function Icon({ name, className }: { name: string; className?: string }) {
  const d = PATHS[name] ?? PATHS.star;
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={d} />
    </svg>
  );
}

export const ICON_NAMES = Object.keys(PATHS);
