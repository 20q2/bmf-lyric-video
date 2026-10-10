// When a carrier's text shows (carrierart.ts draws it; the guards account for it). Pure.
//   reveal    the text appears as the camera first comes for it (Carrier.reveal), so the world ahead never shows the
//             song beyond the next phrase: a viewer with a beat to spare would read ahead
//   dissolve  sky-writing drifts apart after its phrase
import type { Carrier } from './carriers';
import { SETTLE, dwellFor } from './phrases';

/** A carrier's text fades in over this long from its reveal (s): inside the camera's snap onto it (SNAP_S). */
export const REVEAL_S = 0.15;
/** How far a carrier's text has appeared at t (0: blank, 1: shown). */
export const revealAt = (c: Carrier, t: number) => Math.min(1, Math.max(0, (t - c.reveal) / REVEAL_S));

/** Sky-writing starts to dissolve this long after its phrase ends, and is gone this long after that (s). */
export const DISSOLVE = { after: 0.15, over: 0.6 };
/** How far through its dissolve a sky phrase is at t (0: whole, 1: gone; 0 for every other kind): it starts once
 *  the phrase is sung and has been up its reading time (dwellFor, from SETTLE after its first word). */
export function dissolveAt(c: Carrier, t: number) {
  if (c.kind !== 'sky') return 0;
  const from = Math.max(c.phrase.end + DISSOLVE.after, c.phrase.start + SETTLE + dwellFor(c.phrase.words.length) + 0.1);
  return Math.min(1, Math.max(0, (t - from) / DISSOLVE.over));
}
