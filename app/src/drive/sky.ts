// The sky over the song: golden hour to night (spec §3). Keyed by song time: the colour at the zenith and at the
// horizon, how high the sun stands (it sets as the coast road ends, just before the tunnel), and how far the stars
// are out. The sky dome draws it in poster bands (look/skydome.ts); the world's fog fades into the horizon colour;
// the sun's and the sky's light follow it. Pure.
import * as THREE from 'three';

/** [song s, zenith sRGB, horizon sRGB, sun elevation (degrees)]. */
export const SKY_KEYS: readonly [number, string, string, number][] = Object.freeze([
  [0, '#F2A65A', '#FFE0A6', 16],
  [30, '#EE8A55', '#FFD08E', 11],
  [60, '#DA6A5E', '#FFB97C', 6],
  [90, '#B04E78', '#FF9A6A', 2],
  [112, '#7C3A7E', '#F7745F', -1],
  [125, '#4B2A6E', '#D9567A', -5],
  [140, '#261A4C', '#8E3D7C', -10],
  [165, '#110D2E', '#3F2560', -16],
  [182, '#07061A', '#221A44', -20],
]);
const LIN = SKY_KEYS.map(([t, z, h, e]) => [t, new THREE.Color(z), new THREE.Color(h), e] as const); // linear

export interface SkyState {
  zenith: THREE.Color;
  horizon: THREE.Color;
  /** The sun's elevation (radians; below 0: set). */
  sunElev: number;
  /** How far the stars are out (0..1). */
  stars: number;
}

/** The sky at t (colours linear). */
export function skyStateAt(t: number, out: SkyState = { zenith: new THREE.Color(), horizon: new THREE.Color(), sunElev: 0, stars: 0 }): SkyState {
  let k = 1;
  while (k < LIN.length - 1 && t > LIN[k]![0]) k++;
  const [t0, z0, h0, e0] = LIN[k - 1]!, [t1, z1, h1, e1] = LIN[k]!;
  const u = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
  out.zenith.copy(z0).lerp(z1, u);
  out.horizon.copy(h0).lerp(h1, u);
  const elev = e0 + (e1 - e0) * u;
  out.sunElev = (elev * Math.PI) / 180;
  out.stars = Math.min(1, Math.max(0, (-elev - 4) / 10));
  return out;
}

/** The horizon's linear colour at t, into `out` (the fog's colour). */
export function skyAt(t: number, out = new THREE.Color()): THREE.Color {
  return out.copy(skyStateAt(t).horizon);
}

/** How lit the world is at t: 1 with the sun well up, falling to 0.25 by night (follows the sun). */
export function daylight(t: number): number {
  const e = (skyStateAt(t).sunElev * 180) / Math.PI;
  const u = Math.min(1, Math.max(0, (e + 12) / 22));
  return 0.25 + 0.75 * u * u * (3 - 2 * u);
}
