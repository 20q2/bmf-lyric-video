// The sync layer's dial (drive/heft.ts): low under long lines, high in the last chorus.
import { expect, test } from 'bun:test';
import { makeDrive } from '../src/drive/drive';
import { DUCK, HEFT, heftOf } from '../src/drive/heft';
import { audio, lyrics } from './data';

test('the heft dial is low under long lines', () => {
  const d = makeDrive(audio, lyrics), heft = heftOf(d.stretches, d.reading);
  const long = d.reading.filter((r) => r.words >= DUCK.words);
  expect(long.length).toBeGreaterThan(0);
  for (const r of long) expect(heft((r.a + r.b) / 2)).toBeLessThanOrEqual(DUCK.to * Math.max(...Object.values(HEFT)) + 1e-9);
  expect(heft(d.stretches.find((s) => s.id === 'chorus4')!.start + 3)).toBeGreaterThan(0.5);
});
