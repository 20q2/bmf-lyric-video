// The style breaks (drive/breaks.ts): every break lands on its word (or the drums' first kick), none overlaps another,
// the world's time is the song's outside them, and (M5 §8) no break starts while a phrase is still being read unless
// it's the phrase's own word's break.
import { expect, test } from 'bun:test';
import { LOOP, LOOP_TOP, breakAt, breaksOf, worldTime } from '../src/drive/breaks';
import { audio, lyrics } from './data';

const breaks = breaksOf(audio, lyrics);
const words = lyrics.lines.flatMap((l) => l.words);

test('every break lands on its word', () => {
  expect(breaks.length).toBeGreaterThanOrEqual(6);
  for (const b of breaks) {
    if (b.kind === 'plates') { expect(audio.onsets.kick!.some(([t]) => Math.abs(t - b.at) < 1e-6)).toBe(true); continue; }
    const w = words.find((w) => w.w === b.word && Math.abs(w.start + (b.kind === 'comic' ? LOOP.over * LOOP_TOP : 0) - b.at) < 1e-6);
    expect(w, `${b.id} lands on "${b.word}" at ${b.at.toFixed(2)}`).toBeDefined();
  }
});

test('breaks never overlap, and the world keeps song time outside them', () => {
  for (let i = 1; i < breaks.length; i++) expect(breaks[i]!.at).toBeGreaterThanOrEqual(breaks[i - 1]!.at + breaks[i - 1]!.len);
  for (let t = 0; t < audio.duration; t += 0.37) if (!breakAt(breaks, t)) expect(worldTime(breaks, t)).toBe(t);
  const comic = breaks.find((b) => b.kind === 'comic')!, rewind = breaks.find((b) => b.kind === 'rewind')!;
  expect(worldTime(breaks, comic.at + comic.len * 0.5)).toBe(comic.at);
  expect(worldTime(breaks, rewind.at + rewind.len * 0.5)).toBeLessThan(rewind.at);
});

test('the heft dial is low under long lines', async () => {
  const { makeDrive } = await import('../src/drive/drive');
  const { DUCK, HEFT, heftOf } = await import('../src/drive/heft');
  const d = makeDrive(audio, lyrics), heft = heftOf(d.stretches, d.reading);
  const long = d.reading.filter((r) => r.words >= DUCK.words);
  expect(long.length).toBeGreaterThan(0);
  for (const r of long) expect(heft((r.a + r.b) / 2)).toBeLessThanOrEqual(DUCK.to * Math.max(...Object.values(HEFT)) + 1e-9);
  expect(heft(d.stretches.find((s) => s.id === 'chorus4')!.start + 3)).toBeGreaterThan(0.5);
});
