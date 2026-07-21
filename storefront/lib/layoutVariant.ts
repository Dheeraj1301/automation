/**
 * Deterministic pseudo-random variant picker, seeded by the org's slug (so
 * it's stable across requests/renders/deploys) rather than truly random.
 * This is how "every merchant's site looks distinct" without needing an
 * editable layout field or any live per-request randomness.
 */
export function pickVariant(seed: string, count: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % count;
}
