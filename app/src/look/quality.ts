// Preview or final: the export (?export=1, scripts/render.ts) renders at full quality; the live player a little
// lighter so it stays responsive (spec §8). Everything visible stays the same function of song time: only the cost
// of a frame changes. Browser and bun (no location under bun: final).
const params = typeof location === 'undefined' ? null : new URLSearchParams(location.search);

/** Rendering at full quality (the export, and under bun). */
export const FINAL = !params || params.has('export');
/** Each shadow cascade's map (px: look/shadows.ts), and how often the hero's sky reflection is remade (s of song time). */
export const QUALITY = { shadowMap: FINAL ? 2048 : 1536, envStep: FINAL ? 0.25 : 1 } as const;
