// Lines into phrases: the chunks of 1-4 words that each get their own place in the world. The breaks are chosen to read
// as phrases: the cheapest split of the line (dynamic programming) under a cost that likes 2-3 words, breaks at commas
// and audible gaps and before a conjunction or preposition ("and dark", "from South Detroit"), and dislikes breaking
// after a function word ("the |", "my |") or leaving a short word alone. A comma inside a phrase is not allowed. Pure.
import type { Line, Word } from '../engine/lyrics';

export interface Phrase { line: number; words: Word[]; text: string; start: number; end: number }

export const MAX_WORDS = 4;
/** A gap in the singing at least this long (s) is a good place to break; twice it, a better one. */
export const GAP_S = 0.22;

/** Words a phrase reads well starting with. */
const STARTERS = new Set(['and', 'but', 'with', 'from', 'when', 'if', 'or', 'so', 'that', 'like', 'for', 'of', 'in', 'to', 'on', 'call', 'tell', 'cruise', 'put']);
/** Words a phrase shouldn't end on. */
const LEANERS = new Set(['the', 'a', 'an', 'my', 'your', 'to', 'of', 'and', 'but', 'from', 'i', 'i\'m', 'you', 'he', 'he\'s', 'it', 'is', 'can', 'can\'t', 'in', 'with', 'all', 'just', 'tryna', 'this', 'we', 'so']);
const SIZE_COST = [Infinity, 2, 0.3, 0, 0.6];

const bare = (w: Word) => w.w.toLowerCase().replace(/[’]/g, "'").replace(/[^a-z']/g, '');
const letters = (ws: readonly Word[]) => ws.reduce((n, w) => n + bare(w).replace(/'/g, '').length, 0);
const punct = (w: Word) => /[,?]$/.test(w.w);

/** The cost of words[i..j] (inclusive) as a phrase, including the break after it (if any). */
function cost(words: readonly Word[], i: number, j: number): number {
  const ws = words.slice(i, j + 1), n = ws.length;
  if (n > MAX_WORDS || ws.slice(0, -1).some(punct)) return Infinity;
  let c = SIZE_COST[n]! + Math.max(0, letters(ws) - 14) * 0.35;
  if (n === 1 && letters(ws) <= 2) c += 4;
  const last = words[j]!, next = words[j + 1];
  if (next) {
    if (punct(last)) c -= 2.5;
    const gap = next.start - last.end;
    if (gap >= 2 * GAP_S) c -= 2.5; else if (gap >= GAP_S) c -= 1.5;
    if (LEANERS.has(bare(last))) c += 2.5;
    if (STARTERS.has(bare(next))) c -= 1;
  }
  return c;
}

export function phrasesOf(line: Line): Phrase[] {
  const ws = line.words, n = ws.length;
  const best = new Array<number>(n + 1).fill(Infinity), from = new Array<number>(n + 1).fill(0);
  best[0] = 0;
  for (let j = 1; j <= n; j++) {
    for (let i = Math.max(0, j - MAX_WORDS); i < j; i++) {
      const c = best[i]! + cost(ws, i, j - 1);
      if (c < best[j]!) { best[j] = c; from[j] = i; }
    }
  }
  const out: Phrase[] = [];
  for (let j = n; j > 0; j = from[j]!) {
    const words = ws.slice(from[j]!, j);
    out.unshift({ line: line.i, words, text: words.map((w) => w.w).join(' '), start: words[0]!.start, end: words[words.length - 1]!.end });
  }
  return out;
}
