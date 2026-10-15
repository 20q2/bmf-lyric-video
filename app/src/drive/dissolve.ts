// When a carrier's text shows (carrierart.ts draws it; the guards account for it). Pure.
//   reveal    the text appears as the camera first comes for it (Carrier.reveal), so the world ahead never shows the
//             song beyond the next phrase: a viewer with a beat to spare would read ahead
//   dissolve  sky-writing drifts apart after its phrase
//   stale     a board's words, sung and read, dim back (its art stays): one line in a frame leads, the current one
import type { Carrier } from './carriers';
import { SETTLE, dwellFor } from './phrases';

/** A carrier's text comes in over this long from its reveal (s; a board's tri-vision flip), finished as its shot lands. */
export const REVEAL_S = 0.3;
/** How far a carrier's text has appeared at t (0: blank, 1: shown). */
export const revealAt = (c: Carrier, t: number) => Math.min(1, Math.max(0, (t - c.reveal) / REVEAL_S));

/** A board's words dim to `to` of their strength, from `after` s past its phrase (and its reading time), over `over` s. */
export const STALE = { after: 1.2, over: 0.4, to: 0.45 };
/** How far a board's words are dimmed back at t (0: full, 1: dimmed to STALE.to; 0 for sky-writing, which dissolves,
 *  and the hill sign, the last line: it stays lit over the city to the end). */
export function staleAt(c: Carrier, t: number) {
  if (c.kind === 'sky' || c.kind === 'hill') return 0;
  const from = Math.max(c.phrase.end + STALE.after, c.phrase.start + SETTLE + dwellFor(c.phrase.words.length) + 0.1, c.hold ?? 0);
  return Math.min(1, Math.max(0, (t - from) / STALE.over));
}

/** Sky-writing starts to dissolve this long after its phrase ends, and is gone this long after that (s). */
export const DISSOLVE = { after: 0.15, over: 0.6 };
/** How far through its dissolve a sky phrase is at t (0: whole, 1: gone; 0 for every other kind): it starts once
 *  the phrase is sung and has been up its reading time (dwellFor, from SETTLE after its first word). */
export function dissolveAt(c: Carrier, t: number) {
  if (c.kind !== 'sky') return 0;
  const from = Math.max(c.phrase.end + DISSOLVE.after, c.phrase.start + SETTLE + dwellFor(c.phrase.words.length) + 0.1, (c.hold ?? 0) + DISSOLVE.after);
  return Math.min(1, Math.max(0, (t - from) / DISSOLVE.over));
}
