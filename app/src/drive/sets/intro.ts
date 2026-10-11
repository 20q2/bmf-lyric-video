// The intro (the user, 2026-10-11): the car waiting at a red light on the corner by the pink motel, the song introduced
// by the corner's street signs (BMF BLVD crossing SZA AVE: the title), the light going green on the first kick, when the
// beat and the song begin. Cut on every other downbeat of the guitar intro:
//   0         the street signs crossed against the sky, the car waiting at the line
//   bar 2     the Impala at the line, jacked up, dropping on its hydraulics (hydraulics.ts)
//   bar 4     over the two of them, up at the red light
//   bar 6     wide across the intersection, back at the car and the motel's neon
//   bar 8     the signal, its walk countdown ticking off the last eight beats
// and on the kick, chorus 1's first shot (its first phrase's: the intro frames it): from behind the car as the light
// goes green, his first billboard across the intersection, the car pulling away toward it. Pure.
import * as THREE from 'three';
import { lookFrom } from '../carriers';
import { ROAD_HALF } from '../route';
import { LEAD, type Shot } from '../shots';
import type { Placed, SetContext, SetFrame, SetPiece } from './index';

const UP = new THREE.Vector3(0, 1, 0);
/** The corner (m along the road from the car's centre at the light): the stop line, the cross street, the far corner's
 *  signal mast, the near corner's street-sign pole. */
export const CORNER = { stopLine: 3.4, cross: [6.2, 14.7] as [number, number], mast: 16.6, pole: 5.4 };
/** The street signs (off the road, their heights: BMF BLVD along the road over SZA AVE across it); the mast (off the road,
 *  its signal heads' and its countdown's heights). */
export const SIGNS = { lateral: ROAD_HALF + 1, along: 4.05, across: 3.2 };
export const MAST = { lateral: ROAD_HALF + 1.4, headY: 5.25, countY: 3.1 };
/** How many beats the walk countdown ticks off before the green. */
export const COUNTDOWN = 8;
/** The left faces after the intro stand past the far crosswalk (their centres, m along the road): the first in the
 *  launch shot's frame. */
export const FLOOR = 26;
/** The launch shot: from behind the car (m back, right, up), aimed between the green light and the first billboard. */
export const LAUNCH = { back: 7, right: 0.9, up: 2.3, aim: { s: 21, lateral: -4, y: 5.2 } };

export interface IntroPlan {
  /** When the light turns green (s: as the first kick's cut lands) and the countdown's beats before it. */
  green: number;
  countdown: number[];
}

export const INTRO: SetPiece = {
  // waiting at the light: still until the next stretch's first beat (its own key pulls away from rest)
  speed: (st) => [{ t: st.start, v: 0, ramp: 0 }],

  place(ctx: SetContext): Placed {
    const { st, audio, route, carFrame } = ctx;
    const atRoad = (s: number, lateral: number, y: number) => { const f = route.frameAt(s); return f.pos.clone().addScaledVector(f.right, lateral).addScaledVector(UP, y); };
    const park = carFrame(0), at0 = (fwd: number, right: number, up: number) => park.pos.clone().addScaledVector(park.fwd, fwd).addScaledVector(park.right, right).addScaledVector(UP, up);
    // the cuts: every other downbeat of the intro (from its second bar)
    const bars = audio.downbeats.filter((d) => d > 1 && d < st.end - 1).filter((_, i) => i % 2 === 0);
    const C = CORNER, lane = park.pos.distanceTo(route.frameAt(0).pos);
    const shots: Shot[] = [
      // the street signs crossed against the sky, from low in the crosswalk ahead of the car (both faces at 45°), drifting
      { at: 0, move: 'cut', to: (t) => lookFrom(atRoad(C.pole + 2.8 - 0.1 * t, SIGNS.lateral - 2.4, 1), atRoad(C.pole, SIGNS.lateral, (SIGNS.along + SIGNS.across) / 2 + 0.2)) },
      // the car at the line, low off its nose
      { at: bars[0]!, move: 'cut', to: (t) => lookFrom(at0(5.2 - 0.35 * (t - bars[0]!), 2.4, 0.5), at0(0.6, 0, 0.75)) },
      // over the two of them, up at the red light over their lane
      { at: bars[1]!, move: 'cut', to: (t) => lookFrom(at0(-1.9 + 0.12 * (t - bars[1]!), 0, 1.85), atRoad(C.mast, lane, MAST.headY)) },
      // wide across the intersection, back at the car waiting, the motel behind
      { at: bars[2]!, move: 'cut', to: (t) => lookFrom(atRoad(22 - 0.6 * (t - bars[2]!), -9 + 0.4 * (t - bars[2]!), 4.5), at0(0, 0, 1)) },
      // the signal and its countdown, close
      { at: bars[3]!, move: 'cut', to: (t) => lookFrom(atRoad(C.mast - 5.5 + 0.2 * (t - bars[3]!), ROAD_HALF - 1, 3.2), atRoad(C.mast, 3.4, 4.3)) },
    ];
    const green = st.end - LEAD, beat = 60 / audio.bpm;
    const countdown = Array.from({ length: COUNTDOWN }, (_, k) => green - (COUNTDOWN - k) * beat);
    // the town keeps clear of the cross street and the motel's lot
    const clear = [-1, 1].map((side) => ({ side, a: C.stopLine - 2, b: C.cross[1] + 6 })).concat([{ side: 1, a: -36, b: 3 }]);
    // the hand-off: the first phrase of the song framed from behind the car at the line as the light goes green
    const first = ctx.next?.lines[0], frames = new Map<string, SetFrame>();
    const launch = lookFrom(at0(-LAUNCH.back, LAUNCH.right, LAUNCH.up), atRoad(LAUNCH.aim.s, LAUNCH.aim.lateral, LAUNCH.aim.y));
    if (first) frames.set(`L${first.i}.0`, { to: () => launch, move: 'cut' });
    return { carriers: [], frames, clear, blocks: [], shots, floor: FLOOR, plan: { green, countdown } satisfies IntroPlan };
  },
};
