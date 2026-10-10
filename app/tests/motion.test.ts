import { expect, test } from 'bun:test';
import { Motion } from '../src/drive/motion';

test('constant speed: distance is v * t', () => {
  const m = new Motion([{ t: 0, v: 10, ramp: 0 }]);
  expect(m.distanceAt(3)).toBeCloseTo(30, 9);
});

test('a ramp covers the average of its speeds over its length (smoothstep)', () => {
  const m = new Motion([{ t: 0, v: 0, ramp: 0 }, { t: 1, v: 10, ramp: 2 }]);
  expect(m.speedAt(0.5)).toBe(0);
  expect(m.speedAt(2)).toBeCloseTo(5, 9);
  expect(m.distanceAt(3)).toBeCloseTo(10, 9); // 0 to 1 s still, 1 to 3 s ramping: 2 * (0 + 10) / 2
  expect(m.distanceAt(4)).toBeCloseTo(20, 9);
});

test('a stop holds the distance flat', () => {
  const m = new Motion([{ t: 0, v: 8, ramp: 0 }, { t: 2, v: 0, ramp: 1 }, { t: 6, v: 8, ramp: 1 }]);
  expect(m.distanceAt(5)).toBeCloseTo(m.distanceAt(3.5), 9);
});

test('distance is continuous and non-decreasing, and speed changes smoothly, frame to frame', () => {
  const m = new Motion([{ t: 0, v: 0, ramp: 0 }, { t: 1, v: 26, ramp: 1 }, { t: 4, v: 0, ramp: 1.5 }, { t: 8, v: 12, ramp: 1 }]);
  const dt = 1 / 60;
  let prev = m.distanceAt(0), prevV = m.speedAt(0);
  for (let t = dt; t < 10; t += dt) {
    const d = m.distanceAt(t), v = m.speedAt(t);
    expect(d).toBeGreaterThanOrEqual(prev - 1e-9);
    expect(d - prev).toBeLessThanOrEqual(26 * dt + 1e-6);
    expect(Math.abs(v - prevV)).toBeLessThan(26 * 1.5 * dt + 1e-6); // peak acceleration of a 1 s smoothstep ramp: 1.5 x dv/s
    prev = d; prevV = v;
  }
});

test('keys out of order, or a ramp running into the next key, are errors', () => {
  expect(() => new Motion([{ t: 2, v: 1, ramp: 0 }, { t: 1, v: 2, ramp: 0 }])).toThrow();
  expect(() => new Motion([{ t: 0, v: 1, ramp: 0 }, { t: 1, v: 2, ramp: 2 }, { t: 2, v: 0, ramp: 0 }])).toThrow();
});
