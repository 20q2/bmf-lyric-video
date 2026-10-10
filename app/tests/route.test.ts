import { expect, test } from 'bun:test';
import { routeFor } from '../src/drive/drive';
import { motionFor, resolveStretches } from '../src/drive/stretches';
import { audio, lyrics } from './data';

const R = resolveStretches(audio, lyrics), motion = motionFor(R, audio), route = routeFor(R, motion);
const deg = (r: number) => (r * 180) / Math.PI;

test('the route starts at the origin heading +z, and runs on past where the car stops', () => {
  const f = route.frameAt(0);
  expect(f.pos.length()).toBeCloseTo(0, 6);
  expect(f.fwd.z).toBeCloseTo(1, 6);
  expect(route.length).toBeGreaterThanOrEqual(motion.distanceAt(audio.duration) + 50);
});

test('frames are orthonormal and right-handed (fwd x up = right, as three.js cameras have it)', () => {
  for (let s = 0; s < route.length; s += 37) {
    const { fwd, right, up } = route.frameAt(s);
    for (const v of [fwd, right, up]) expect(v.length()).toBeCloseTo(1, 6);
    expect(fwd.dot(right)).toBeCloseTo(0, 6);
    expect(fwd.dot(up)).toBeCloseTo(0, 6);
    expect(right.dot(up)).toBeCloseTo(0, 6);
    expect(fwd.clone().cross(up).distanceTo(right)).toBeLessThan(1e-6);
  }
});

test("each stretch bends the road by its turn and climbs by its rise", () => {
  for (const s of R) {
    const a = motion.distanceAt(s.start), b = motion.distanceAt(s.end);
    const dh = deg(route.frameAt(b).heading - route.frameAt(a).heading);
    expect(Math.abs(dh - s.turn)).toBeLessThan(5);
    expect(route.frameAt(b).pos.y - route.frameAt(a).pos.y).toBeCloseTo(s.rise, 0);
  }
});
