import { expect, test } from 'bun:test';
import { makeDrive } from '../src/drive/drive';
import { MAX_WORDS, phrasesOf, punctuationOf } from '../src/drive/phrases';
import { audio, lyrics } from './data';

const all = lyrics.lines.flatMap((l) => phrasesOf(l));

test('phrases cover every word of every line once, in order', () => {
  expect(all.flatMap((p) => p.words.map((w) => w.gi))).toEqual(lyrics.lines.flatMap((l) => l.words.map((w) => w.gi)));
});

test('a phrase is 1 to MAX_WORDS words, timed from its first word to its last', () => {
  for (const p of all) {
    expect(p.words.length).toBeGreaterThanOrEqual(1);
    expect(p.words.length).toBeLessThanOrEqual(MAX_WORDS);
    expect(p.start).toBe(p.words[0]!.start);
    expect(p.end).toBe(p.words[p.words.length - 1]!.end);
    expect(p.text).toBe(p.words.map((w) => w.w).join(' '));
  }
});

test('a comma ends a phrase, unless the phrase would be too short to read without the next words', () => {
  const inner = all.filter((p) => p.words.slice(0, -1).some((w) => /[,?]$/.test(w.w)));
  expect(inner.length).toBeLessThan(all.length / 10);
});

test('no phrase is a lone short word (I, a, it), unless its line is just that', () => {
  const lone = all.filter((p) => p.words.length === 1 && p.words[0]!.w.replace(/\W/g, '').length <= 2 && lyrics.lines[p.line]!.words.length > 1);
  expect(lone.map((p) => p.text)).toEqual([]);
});

test('the chorus opening splits into short phrases', () => {
  expect(phrasesOf(lyrics.lines[0]!).map((p) => p.text)).toEqual(['Young and fine', 'and dark', 'and handsome']);
});

test('the punctuating "you"s and "but"s: thrown in off the beat at a clause edge, each alone on its own row', () => {
  const solo = punctuationOf(audio.beats);
  const picked = lyrics.lines.flatMap((l) => l.words.flatMap((w, k) => (solo(l, k) ? [`L${l.i}.${k} ${w.w}`] : [])));
  expect(picked).toEqual(['L6.0 You', 'L6.3 but', 'L7.4 but', 'L11.0 You', 'L11.7 you', 'L11.15 you?']);
  for (const c of makeDrive(audio, lyrics).carriers) {
    const ks = c.phrase.words.map((w) => lyrics.lines[c.phrase.line]!.words.indexOf(w)).filter((k) => solo(lyrics.lines[c.phrase.line]!, k));
    for (const k of ks) {
      const w = lyrics.lines[c.phrase.line]!.words[k]!;
      expect(c.rows.some((r) => r.toLowerCase() === w.w.toLowerCase())).toBe(true);
    }
  }
});
