// The sky's pure functions: the air (fog) graded through the song, the printed clouds and the golden-hour rays.
import { expect, test } from 'bun:test';
import { AIR_KEYS, airAt, cloudsAt, raysAt, skyStateAt } from '../src/drive/sky';

test('the air is keyed in time order and interpolates between its keys', () => {
  for (let k = 1; k < AIR_KEYS.length; k++) expect(AIR_KEYS[k]![0]).toBeGreaterThan(AIR_KEYS[k - 1]![0]);
  const [t0, n0, f0, , m0] = AIR_KEYS[0]!, [t1, n1, f1, , m1] = AIR_KEYS[1]!;
  const mid = airAt((t0 + t1) / 2);
  expect(mid.near).toBeCloseTo((n0 + n1) / 2, 5);
  expect(mid.far).toBeCloseTo((f0 + f1) / 2, 5);
  expect(mid.mix).toBeCloseTo((m0 + m1) / 2, 5);
});

test('the air always opens out: far well beyond near, its tint a share, all song', () => {
  for (let t = 0; t < 182; t += 0.5) {
    const a = airAt(t);
    expect(a.far).toBeGreaterThan(a.near + 300);
    expect(a.mix).toBeGreaterThanOrEqual(0);
    expect(a.mix).toBeLessThanOrEqual(1);
  }
});

test('the rays come with the low sun and go when it sets; clouds thin out by night', () => {
  const elev = (t: number) => (skyStateAt(t).sunElev * 180) / Math.PI;
  expect(raysAt(0)).toBeGreaterThan(0); // (22°: just beginning)
  expect(raysAt(0)).toBeLessThan(0.6);
  expect(raysAt(90)).toBeGreaterThan(0.9); // (4°: full)
  for (let t = 0; t < 182; t += 1) if (elev(t) < -1) expect(raysAt(t)).toBe(0);
  expect(cloudsAt(10)).toBeGreaterThan(cloudsAt(170));
  for (let t = 0; t < 182; t += 1) { expect(cloudsAt(t)).toBeGreaterThanOrEqual(0); expect(cloudsAt(t)).toBeLessThanOrEqual(1); }
});
