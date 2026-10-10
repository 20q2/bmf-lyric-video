// The sky over the song: golden hour to night (spec §3), as the background, the fog and the light's colour. Pure.
import * as THREE from 'three';

/** [song s, sRGB hex]: the sky's colour through the drive (placeholder palette until M3). */
export const SKY_KEYS: readonly [number, string][] = Object.freeze([
  [0, '#FFC56B'], [60, '#F2865E'], [105, '#C2457A'], [135, '#3D2260'], [180, '#0E0C22'],
]);
const LIN = SKY_KEYS.map(([t, hex]) => [t, new THREE.Color(hex)] as const); // THREE.Color holds linear values

/** The sky's linear colour at t, into `out`. */
export function skyAt(t: number, out = new THREE.Color()): THREE.Color {
  if (t <= LIN[0]![0]) return out.copy(LIN[0]![1]);
  for (let k = 1; k < LIN.length; k++) {
    const [t1, c1] = LIN[k]!, [t0, c0] = LIN[k - 1]!;
    if (t <= t1) return out.copy(c0).lerp(c1, (t - t0) / (t1 - t0));
  }
  return out.copy(LIN[LIN.length - 1]![1]);
}

/** How lit the world is at t: 1 in daylight, falling to 0.25 by night. */
export function daylight(t: number): number {
  const u = Math.min(1, Math.max(0, (t - 40) / 120));
  return 1 - 0.75 * u * u * (3 - 2 * u);
}
