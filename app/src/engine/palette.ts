import { hexToLinear } from './util';

// Placeholder palette for the test card and the greybox. The video's palette is chosen in M3 (spec §4).
export const HEX = {
  bg: '#F4EFE6', // background
  ink: '#16131A', // text
  dim: '#8C8578', // secondary text, unsung words
  accent: '#FF5A36', // highlights: the word being sung, beat marks
} as const;

export type PaletteKey = keyof typeof HEX;

/** Linear RGB triplets for GL uniforms. */
export const LIN: Record<PaletteKey, [number, number, number]> = Object.fromEntries(
  Object.entries(HEX).map(([k, v]) => [k, hexToLinear(v)]),
) as Record<PaletteKey, [number, number, number]>;

/** CSS rgba() for Canvas2D. */
export function rgba(key: PaletteKey | string, a = 1): string {
  const hex = (HEX as Record<string, string>)[key] ?? key;
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
