// Lines into phrases: the chunks of 1-6 words that each get their own place in the world. The breaks are chosen to read
// as phrases: the cheapest split of the line (dynamic programming) under a cost that likes 2-3 words, breaks at commas
// and audible gaps and before a conjunction or preposition ("and dark", "from South Detroit"), and dislikes breaking
// after a function word ("the |", "my |") or leaving a short word alone — and above all a phrase the viewer can't
// read before the next one takes over (dwellFor: subtitle standards, docs/LYRIC_VIDEO_TENETS.md §2), so fast lines
// split into fewer, longer phrases. A comma is a strong place to break, but a phrase may run over one when that's the
// only way to make it readable. A punctuating word (punctuationOf: "you" and "but" thrown in off the beat at a clause's
// edge) stands at its phrase's start or end, on a row of its own (carriers.ts). Pure.
import type { Line, Word } from '../engine/lyrics';

export interface Phrase {
  line: number; words: Word[]; text: string; start: number; end: number;
  /** A punctuating word at its start or end, set on a row of its own. */
  solo?: 'first' | 'last';
}
/** Whether line's word k is a punctuating word. */
export type Solo = (line: Line, k: number) => boolean;

/** Words the song throws in as punctuation: "but" after a comma ("cute, but — play too much"), and "you" at a clause's
 *  edge (a line's start or end, or after a comma) sung off the beat ("You kinda cute", "fucks, you know", "can you?"),
 *  not "you" the subject landing on the beat ("You say you feel"). */
export const SOLO_WORDS = new Set(['you', 'but']);
/** A word sung within this share of a beat after it is on the beat. */
export const ON_BEAT = 0.15;
export function punctuationOf(beats: readonly number[]): Solo {
  return (line, k) => {
    const ws = line.words, w = ws[k]!, b = bare(w);
    if (!SOLO_WORDS.has(b)) return false;
    const afterComma = k > 0 && punct(ws[k - 1]!);
    if (b === 'but') return afterComma;
    if (!(k === 0 || k === ws.length - 1 || afterComma)) return false;
    let i = 0;
    while (i + 1 < beats.length && beats[i + 1]! <= w.start) i++;
    const period = (beats[i + 1] ?? beats[i]! + 0.5) - beats[i]!, phase = (w.start - beats[i]!) / period;
    return phase >= ON_BEAT;
  };
}

export const MAX_WORDS = 6;
/** How long a phrase of n words must stay readable (s): ⅚ s at least, 0.3 s a word. */
export const dwellFor = (n: number) => Math.max(5 / 6, 0.3 * n);
/** A phrase is readable from SETTLE after its first word (the camera's move onto it) until the next phrase starts. */
export const SETTLE = 0.21;
/** A gap in the singing at least this long (s) is a good place to break; twice it, a better one. */
export const GAP_S = 0.22;

/** Words a phrase reads well starting with. */
const STARTERS = new Set(['and', 'but', 'with', 'from', 'when', 'if', 'or', 'so', 'that', 'like', 'for', 'of', 'in', 'to', 'on', 'call', 'tell', 'cruise', 'put']);
/** Words a phrase shouldn't end on. */
const LEANERS = new Set(['the', 'a', 'an', 'my', 'your', 'to', 'of', 'and', 'but', 'from', 'i', 'i\'m', 'you', 'he', 'he\'s', 'it', 'is', 'can', 'can\'t', 'in', 'with', 'all', 'just', 'tryna', 'this', 'we', 'so']);
const SIZE_COST = [Infinity, 2, 0.3, 0, 0.6, 1.5, 3];

const bare = (w: Word) => w.w.toLowerCase().replace(/[’]/g, "'").replace(/[^a-z']/g, '');
const letters = (ws: readonly Word[]) => ws.reduce((n, w) => n + bare(w).replace(/'/g, '').length, 0);
const punct = (w: Word) => /[,?]$/.test(w.w);

/** The cost of words[i..j] (inclusive) as a phrase, including the break after it (if any). */
function cost(words: readonly Word[], i: number, j: number, after: number, solo: readonly boolean[]): number {
  const ws = words.slice(i, j + 1), n = ws.length;
  if (n > MAX_WORDS) return Infinity;
  for (let k = i + 1; k < j; k++) if (solo[k]) return Infinity; // a punctuating word only at a phrase's edge
  const inner = ws.slice(0, -1).filter(punct).length;
  let c = SIZE_COST[n]! + Math.max(0, letters(ws) - 14) * 0.35 + 3 * inner;
  if (n === 1 && letters(ws) <= 2) c += 4;
  const last = words[j]!, next = words[j + 1];
  const held = (next ? next.start : after) - words[i]!.start - SETTLE, need = dwellFor(n);
  if (held < need) c += 8 * (need - held);
  if (next) {
    if (punct(last)) c -= 2.5;
    const gap = next.start - last.end;
    if (gap >= 2 * GAP_S) c -= 2.5; else if (gap >= GAP_S) c -= 1.5;
    if (LEANERS.has(bare(last))) c += 2.5;
    if (STARTERS.has(bare(next))) c -= 1;
  }
  return c;
}

/** `after`: when the next line's first word starts (the last phrase is readable until then). */
export function phrasesOf(line: Line, after = Infinity, isSolo: Solo = () => false): Phrase[] {
  const ws = line.words, n = ws.length, solo = ws.map((_, k) => isSolo(line, k));
  const best = new Array<number>(n + 1).fill(Infinity), from = new Array<number>(n + 1).fill(0);
  best[0] = 0;
  for (let j = 1; j <= n; j++) {
    for (let i = Math.max(0, j - MAX_WORDS); i < j; i++) {
      const c = best[i]! + cost(ws, i, j - 1, after, solo);
      if (c < best[j]!) { best[j] = c; from[j] = i; }
    }
  }
  const out: Phrase[] = [];
  for (let j = n; j > 0; j = from[j]!) {
    const i = from[j]!, words = ws.slice(i, j);
    const edge: Phrase['solo'] = words.length < 2 ? undefined : solo[i] ? 'first' : solo[j - 1] ? 'last' : undefined;
    out.unshift({ line: line.i, words, text: words.map((w) => w.w).join(' '), start: words[0]!.start, end: words[words.length - 1]!.end, ...(edge ? { solo: edge } : {}) });
  }
  return out;
}
