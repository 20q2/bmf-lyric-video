import { expect, test } from 'bun:test';
import { MAX_WORDS, phrasesOf } from '../src/drive/phrases';
import { lyrics } from './data';

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
