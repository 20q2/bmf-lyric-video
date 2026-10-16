// The sky over the song: golden hour to night (spec §3). Keyed by song time: the colour at the zenith and at the
// horizon, how high the sun stands (golden hour held over the beach, it sets unseen in the tunnel), and how far the
// stars are out. The sky dome draws it in poster bands (look/skydome.ts); the world's fog fades into the horizon colour;
// the sun's and the sky's light follow it. Pure.
import * as THREE from 'three';

/** [song s, zenith sRGB, horizon sRGB, sun elevation (degrees)]. */
export const SKY_KEYS: readonly [number, string, string, number][] = Object.freeze([
  [0, '#F2A65A', '#FFE0A6', 22],
  [30, '#EE8A55', '#FFD08E', 17],
  [60, '#DA6A5E', '#FFB97C', 12],
  [90, '#B04E78', '#FF9A6A', 4],
  // chorus 3, the coast (105.6-120.6): the warm golden hour held over the beach, the sun just clear of the sea (the
  // user, 2026-10-16: it "is setting very quickly in this beach scene ... keep the lighting in this nice warm orange")
  [105.6, '#8E417C', '#F98162', 1.1636],
  // "He's so fly" (116.4), the plane going by: the light starts to drop, the sun touching the sea as the car goes in
  [116.4, '#8E417C', '#F98162', 1.1636],
  [120.6, '#7C3A7E', '#F7745F', 0],
  // the bridge, in the tunnel (120.6-135.6): the sun sets while the bore hides the sky; from 132, the far mouth in
  // view, the night is as it was (this key lies on the line the old 125 s and 140 s keys drew: the night is unchanged)
  [132, '#3D2360', '#BB4C7B', -7.333],
  [140, '#261A4C', '#8E3D7C', -10],
  [165, '#110D2E', '#3F2560', -16],
  [182, '#07061A', '#221A44', -20],
]);
const LIN = SKY_KEYS.map(([t, z, h, e]) => [t, new THREE.Color(z), new THREE.Color(h), e] as const); // linear

/** Where the sun sets: this far (degrees) left of the coast road's heading at COAST_T (scenes/drive.ts aims the light,
 *  sets/chorus3's glitter path lies along it). */
export const SUN_AZ_DEG = 26, COAST_T = 110;

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

/** The air through the song (spec §2: distance haze graded per section): [song s, fog's near and far (m), its tint
 *  (sRGB), how far the fog's colour leans from the horizon's toward the tint]. Golden dust on the corner and the
 *  boulevard, the city's warm haze, the freeway's clearer air, the neighbourhood's rose, sea haze on the coast, the
 *  night's violet. (By night the scene pulls the far end in further; in a tunnel the dark takes over.) */
export const AIR_KEYS: readonly [number, number, number, string, number][] = Object.freeze([
  [0, 70, 900, '#FFD39A', 0.3],
  [30, 90, 1000, '#F7B98A', 0.25],
  [60, 120, 1200, '#F0A07A', 0.2],
  [75, 80, 900, '#E88F8A', 0.25],
  [105, 120, 1300, '#FF9A6A', 0.3],
  [116.4, 120, 1300, '#FF9A6A', 0.3], // (the sea haze held till the plane, as the light is)
  [132, 138, 985, '#9E4D7A', 0.165], // (on the old 105 s-135 s line: the far mouth and the night as they were)
  [135, 140, 950, '#8E3D7C', 0.15],
  [182, 140, 900, '#3F2560', 0.15],
]);
const AIR_LIN = AIR_KEYS.map(([t, n, f, c, m]) => [t, n, f, new THREE.Color(c), m] as const); // (tints linear)

export interface Air { near: number; far: number; tint: THREE.Color; mix: number }

/** The air at t (its tint linear). */
export function airAt(t: number, out: Air = { near: 0, far: 0, tint: new THREE.Color(), mix: 0 }): Air {
  let k = 1;
  while (k < AIR_LIN.length - 1 && t > AIR_LIN[k]![0]) k++;
  const [t0, n0, f0, c0, m0] = AIR_LIN[k - 1]!, [t1, n1, f1, c1, m1] = AIR_LIN[k]!;
  const u = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
  out.near = n0 + (n1 - n0) * u;
  out.far = f0 + (f1 - f0) * u;
  out.tint.copy(c0).lerp(c1, u);
  out.mix = m0 + (m1 - m0) * u;
  return out;
}

const ramp = (a: number, b: number, x: number) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
/** How strong the sun's printed rays are at t (0..1): they come as it sinks below ~26°, full under 16°, gone once it
 *  has set. */
export const raysAt = (t: number) => { const e = (skyStateAt(t).sunElev * 180) / Math.PI; return ramp(26, 16, e) * ramp(-1, 2, e); };
/** How much of the low sky the printed clouds cover at t (0..1): full by day, thinning to dark wisps by night. */
export const cloudsAt = (t: number) => 0.85 - 0.6 * skyStateAt(t).stars;
