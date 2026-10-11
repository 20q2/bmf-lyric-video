import { expect, test } from 'bun:test';
import { AUDIBLE, STRETCHES, resolveStretches, shown } from '../src/drive/stretches';
import { audio, lyrics } from './data';

const R = resolveStretches(audio, lyrics);

test('ten stretches in the route order, tiling the song with no gaps', () => {
  expect(R.map((s) => s.id)).toEqual(['intro', 'chorus1', 'verse1', 'chorus2', 'verse2', 'chorus3', 'bridge1', 'verse3', 'chorus4', 'outro1']);
  expect(R.map((s) => s.id)).toEqual(STRETCHES.map((s) => s.id));
  expect(R[0]!.start).toBe(0);
  expect(R[R.length - 1]!.end).toBeCloseTo(audio.duration, 6);
  for (let k = 1; k < R.length; k++) expect(R[k]!.start).toBe(R[k - 1]!.end);
});

test('the intro ends on the downbeat at or before the first sung word', () => {
  const intro = R[0]!, first = lyrics.lines[0]!.start;
  expect(audio.downbeats).toContain(intro.end);
  expect(intro.end).toBeLessThanOrEqual(first);
  expect(first - intro.end).toBeLessThan(240 / audio.bpm); // within a bar
});

test('every lyric line shown belongs to exactly one stretch (its section); none after the song fades out of hearing', () => {
  const owners = lyrics.lines.map((l) => R.filter((s) => l.start >= s.start - 0.25 && l.start < s.end).length);
  expect(owners.every((n) => n >= 1)).toBe(true);
  expect(R.flatMap((s) => s.lines.map((l) => l.i))).toEqual(lyrics.lines.filter(shown).map((l) => l.i));
  expect(R.flatMap((s) => s.lines).every((l) => l.end <= AUDIBLE)).toBe(true);
});
