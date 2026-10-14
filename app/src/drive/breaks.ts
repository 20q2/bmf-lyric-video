// The style breaks (spec §4): small self-contained effects pinned to a word's moment (or the drums' first kick), a
// beat long, each one entry in the list `breaksOf` builds: the plates split on the kick, the print slips on
// "dropping", the comic panel freezes the second "fly" at the top of the skywriter's loop, "backwards" rewinds,
// "crash" smashes to a xerox, "Put it in drive" launches. BREAKS_ON turns a kind off in one line. The scene renders
// the world at `worldTime` (a freeze, a scrub) and runs the treatment (look/breaks.ts) on the printed frame. Pure.
import type { AudioData } from '../engine/audio';
import type { Lyrics } from '../engine/lyrics';
import { AUDIBLE } from './stretches';

/** The skywriter's loop round the hook's last word (scenes/drive.ts): in this long (s), this far clear of the word
 *  (shares of its row's height), starting this far round (radians) before the bottom of the loop. */
export const LOOP = { over: 1.8, clear: [0.3, 0.32] as [number, number], before: 0.5 };
/** Where round the loop its top is (a share of LOOP.over): the plane upside down over the word. */
export const LOOP_TOP = (Math.PI + LOOP.before) / (2 * Math.PI + LOOP.before);

export type BreakKind = 'plates' | 'slip' | 'comic' | 'rewind' | 'xerox' | 'launch';
export const BREAKS_ON: Record<BreakKind, boolean> = { plates: true, slip: true, comic: true, rewind: true, xerox: true, launch: true };
/** Each kind's length (beats). */
export const BREAK_LEN: Record<BreakKind, number> = { plates: 1, slip: 1, comic: 1, rewind: 1, xerox: 0.6, launch: 1 };
/** The slip grows each chorus (its size, per "dropping"); the rewind scrubs the world back this far (s). */
export const SLIP_SIZES = [1, 1.5, 2] as const;
export const REWIND = { back: 0.5 };

export interface Break {
  id: string;
  kind: BreakKind;
  /** When it lands (s) and how long it lasts (s). */
  at: number;
  len: number;
  /** How hard (1: as designed). */
  size: number;
  /** The word it lands on (or 'the kick'). */
  word: string;
}

/** The breaks, in time order, from the words and the drums. */
export function breaksOf(audio: AudioData, lyrics: Lyrics): Break[] {
  const beat = 60 / audio.bpm, out: Break[] = [];
  const words = lyrics.lines.flatMap((l) => l.words);
  const len = (kind: BreakKind) => BREAK_LEN[kind] * beat;
  // the drums come in: the first strong kick
  const kick = audio.onsets.kick?.find(([, s]) => s > 0.9);
  if (kick) out.push({ id: 'plates', kind: 'plates', at: kick[0], len: len('plates'), size: 1, word: 'the kick' });
  words.filter((w) => /^dropping/i.test(w.w)).forEach((w, i) => out.push({ id: `slip${i}`, kind: 'slip', at: w.start, len: len('slip'), size: SLIP_SIZES[Math.min(i, SLIP_SIZES.length - 1)]!, word: w.w }));
  // each hook's second "fly", frozen at the top of the loop the skywriter flies round it
  for (const l of lyrics.lines) {
    if (!/\bso fly\b/i.test(l.text)) continue;
    const flies = l.words.filter((w) => /^fly/i.test(w.w)), w = flies[flies.length - 1];
    if (flies.length > 1 && w) out.push({ id: `comic${l.i}`, kind: 'comic', at: w.start + LOOP.over * LOOP_TOP, len: len('comic'), size: 1, word: w.w });
  }
  words.filter((w) => /^backwards/i.test(w.w)).forEach((w, i) => out.push({ id: `rewind${i}`, kind: 'rewind', at: w.start, len: len('rewind'), size: 1, word: w.w }));
  // (the tunnel's "crash", not the outro's: the song's out of hearing by then)
  words.filter((w) => /^crash/i.test(w.w) && w.start < AUDIBLE).forEach((w, i) => out.push({ id: `xerox${i}`, kind: 'xerox', at: w.start, len: len('xerox'), size: 1, word: w.w }));
  words.filter((w) => /^drive/i.test(w.w)).forEach((w, i) => out.push({ id: `launch${i}`, kind: 'launch', at: w.start, len: len('launch'), size: 1, word: w.w }));
  return out.filter((b) => BREAKS_ON[b.kind]).sort((a, b) => a.at - b.at);
}

/** The break running at t, and how far through it is (k, 0..1). */
export function breakAt(breaks: readonly Break[], t: number): { b: Break; k: number } | null {
  for (const b of breaks) if (t >= b.at && t < b.at + b.len) return { b, k: (t - b.at) / b.len };
  return null;
}

/** The world's time at song time t: frozen through a comic panel, scrubbed back through a rewind, t otherwise. */
export function worldTime(breaks: readonly Break[], t: number): number {
  const a = breakAt(breaks, t);
  if (!a) return t;
  if (a.b.kind === 'comic') return a.b.at;
  if (a.b.kind === 'rewind') return a.b.at - REWIND.back * a.k;
  return t;
}
