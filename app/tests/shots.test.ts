import { expect, test } from 'bun:test';
import { type Pose } from '../src/drive/camera';
import { LEAD, SNAP_S, director, plan } from '../src/drive/shots';
import { audio } from './data';

const P = (o: Partial<Pose>): Pose => ({ tx: 0, ty: 0, tz: 0, dist: 10, yaw: 0, pitch: 0.1, roll: 0, ...o });
const fixed = (p: Pose) => () => p;
/** A target moving at 20 m/s along +z: a car at speed. */
const moving = (t: number) => P({ tz: 20 * t });
const gap = (a: Pose, b: Pose) => Math.hypot(a.tx - b.tx, a.ty - b.ty, a.tz - b.tz, a.dist - b.dist, a.yaw - b.yaw, a.pitch - b.pitch);

test('a snap lands SNAP_S after its cue, and a word cue starts LEAD early', () => {
  const [m] = plan(audio, [{ at: { start: 10 }, to: fixed(P({ tx: 5 })) }]);
  expect(m!.at).toBeCloseTo(10 - LEAD, 9);
  expect(m!.land).toBeCloseTo(10 - LEAD + SNAP_S, 9);
});

test('a land lands on a beat at least 0.25 s on; a glide on the downbeat a bar on', () => {
  const [l, g] = plan(audio, [{ at: 20, to: fixed(P({})), move: 'land' }, { at: 40, to: fixed(P({})), move: 'glide' }]);
  expect(audio.beats.some((b) => Math.abs(b - l!.land) < 1e-6)).toBe(true);
  expect(l!.land - 20).toBeGreaterThanOrEqual(0.25 - 1e-9);
  expect(audio.downbeats.some((b) => Math.abs(b - g!.land) < 1e-6)).toBe(true);
  expect(g!.land - 40).toBeGreaterThanOrEqual(240 / audio.bpm - 1e-6);
});

test('two shots starting at the same time are an error', () => {
  expect(() => plan(audio, [{ at: 5, to: fixed(P({})) }, { at: 5, to: fixed(P({ tx: 1 })) }])).toThrow();
});

test('handing the camera from a moving car to a fixed sign is continuous', () => {
  const cam = director(audio, [{ at: 30, to: fixed(P({ tx: 40, tz: 600 })), move: 'glide' }], moving);
  const dt = 1 / 600;
  for (let t = 29; t < 33; t += dt) expect(gap(cam(t), cam(t + dt))).toBeLessThan(2.5); // smooth at 20 m/s and the glide
  expect(gap(cam(30 - 1e-6), cam(30 + 1e-6))).toBeLessThan(1e-3);
});

test('a move taking over before the last has landed starts from where the camera is, even on a moving target', () => {
  const cam = director(audio, [
    { at: 10, to: moving, move: 'glide' },
    { at: 10.5, to: fixed(P({ tx: -30 })) },
  ], fixed(P({ tx: 100 })));
  expect(gap(cam(10.5 - 1e-6), cam(10.5 + 1e-6))).toBeLessThan(1e-2);
});

test('once landed on a moving target, the camera tracks it exactly', () => {
  const cam = director(audio, [{ at: 5, to: moving }], fixed(P({ tx: 50 })));
  for (const t of [6, 7.5, 9]) expect(gap(cam(t), moving(t))).toBeLessThan(1e-9);
});
