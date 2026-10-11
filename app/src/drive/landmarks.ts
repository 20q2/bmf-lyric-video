// Landmarks that aren't lyrics: the motel's roadside sign (SZA / BMF / NO VACANCY) on the corner where the video opens
// (the car waiting at the light: sets/intro.ts), which closes it. Where it stands, and when its neon is lit: it flickers on with the first beats, and at the end, the car
// long gone, its NO goes out (VACANCY). Pure: world.ts builds it, drive.ts frames it, the scene lights it.
import * as THREE from 'three';
import type { Route } from './route';

/** The sign's spot: along the road (m, from where the car waits at the light), off it (right: the motel's side), its
 *  panel's size and its centre's height. */
export const MOTEL_SIGN = { s: -4, lateral: 8, w: 4.4, h: 5.4, y: 5.4 };

/** The sign's panel: its centre, the way it faces (toward the road and up it), and its size. */
export function motelSign(route: Route) {
  const M = MOTEL_SIGN, f = route.frameAt(0);
  const foot = f.pos.clone().addScaledVector(f.fwd, M.s).addScaledVector(f.right, M.lateral);
  const normal = f.fwd.clone().addScaledVector(f.right, -0.8 * Math.sign(M.lateral)).setY(0).normalize();
  return { foot, center: foot.clone().add(new THREE.Vector3(0, M.y, 0)), normal, w: M.w, h: M.h };
}

/** The neon's flicker on: dark before `from`, a stutter on the half-beats, fully lit from `on` (a downbeat). */
export const NEON_ON = { from: 0.59, on: 2.47 };
/** At the end the NO goes out (s): 0.7 s into the end card, long enough before the fade to register. */
export const VACANCY_AT = 179.9;

/** How lit the sign's neon is at t (0..1), and whether its NO is lit. */
export function neonAt(t: number, beat: number): { lit: number; no: boolean } {
  const no = t < VACANCY_AT || (t < VACANCY_AT + 0.35 && Math.floor((t - VACANCY_AT) * 14) % 2 === 1); // it sputters out
  if (t >= NEON_ON.on) return { lit: 1, no };
  if (t < NEON_ON.from) return { lit: 1, no }; // (lit from the first frame: the thumbnail)
  // stuttering on: lit in flashes on the half-beats, longer as it catches
  const u = (t - NEON_ON.from) / (NEON_ON.on - NEON_ON.from), phase = (beat * 2) % 1;
  return { lit: phase < 0.25 + 0.6 * u ? 1 : 0.08, no };
}
