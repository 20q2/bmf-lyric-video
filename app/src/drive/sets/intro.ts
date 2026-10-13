// The intro (the user, 2026-10-11): the car waiting at a red light on the corner by the pink motel, the song introduced
// by the corner's street signs (BMF BLVD crossing SZA AVE: the title), the light going green on the first kick, when the
// beat and the song begin. Cut on every other downbeat of the guitar intro:
//   0         the street signs crossed against the sky, from low by the car's nose (held: the car sits low and waits)
//   bar 4     over the two of them, up at the red light, the corner's shops either side
//   bar 6     wide from up the road, back at the car waiting at the line, the street behind it, the motel
//   bar 8     the signal, its walk countdown ticking off the last eight beats
// and on the kick, chorus 1's barbershop (sets/chorus1.ts). The corner is a street, not a road starting in the desert:
// shops along it behind the car on both sides (the motel's lot on the right), a liquor store on the far right corner.
// Pure.
import * as THREE from 'three';
import { lookFrom } from '../carriers';
import { ROAD_HALF } from '../route';
import { type Shot } from '../shots';
import { type Block, boxAt } from '../blocks';
import { hash } from '../../engine/util';
import type { Placed, SetContext, SetPiece } from './index';

const UP = new THREE.Vector3(0, 1, 0);
/** The corner (m along the road from the car's centre at the light): the stop line, the cross street, the far corner's
 *  signal mast, the near corner's street-sign pole. */
export const CORNER = { stopLine: 3.4, cross: [6.2, 14.7] as [number, number], mast: 16.6, pole: 5.4 };
/** The street signs (off the road, their heights: BMF BLVD along the road over SZA AVE across it); the mast (off the road,
 *  its signal heads' and its countdown's heights). */
export const SIGNS = { lateral: ROAD_HALF + 1, along: 4.05, across: 3.2 };
export const MAST = { lateral: ROAD_HALF + 1.4, headY: 5.25, countY: 3.1 };
/** How many beats the walk countdown ticks off before the green; the green comes this long after the kick's cut (s: the
 *  barbershop's take opens on the red, up over the lane, and it changes). */
export const COUNTDOWN = 8, GREEN_AFTER = 0.1;
/** The left faces after the intro stand past the far corner's barbershop (their centres, m along the road). */
export const FLOOR = 40;
/** The first shot: the eye low off the car's front corner (how far from the pole, m; its bearing round it from the
 *  road's back, radians, and how far it turns, radians a second; its height and rise, m, m/s), looking up at the signs:
 *  only sky behind them. */
export const SIGN_EYE = { r: 2.6, bearing: -0.75, turn: 0.055, y: 0.9, rise: 0.032 }; // (the long hold circles visibly: dead-still signs read as a freeze)
/** The wide shot: from up the road past the corner (m along, off the road's centre, up; drifting back toward the car,
 *  m/s), back down the street at the car waiting at the line, the shops behind it, the motel. */
export const WIDE = { s: 36, lateral: -1.2, y: 6.5, drift: 0.7 };
/** The street behind the corner: shops along it either side from `from` to the corner (their fronts `back` off the
 *  road's centre, widths along it, depth, heights; m), the motel's lot (on the right: its own); the far right corner's
 *  liquor store (along the road, its front off it, depth, height). */
export const STREET_BEHIND = { from: -150, back: 9, w: [9, 17] as [number, number], d: 12, h: [5, 9] as [number, number], alley: 1.2, motelLot: [-28, 3] as [number, number] };
export const LIQUOR = { s: [17.5, 31] as [number, number], back: 8.5, d: 12, h: 5.2 };

export interface IntroPlan {
  /** When the light turns green (s: just after the first kick's cut) and the countdown's beats before it. */
  green: number;
  countdown: number[];
  /** The liquor store's block. */
  liquor: Block;
  /** The pedestrian the countdown counts for: crossing the main road on the near crosswalk (m along the road), from
   *  the right sidewalk (m off the road's centre) toward the left, from `t0` at `v` (m/s), across by the green. */
  walker: { s: number; t0: number; v: number; from: number };
  /** One car through the intersection on the cross street (its light is green) during the wide shot: where it starts
   *  (m off the road's centre, left negative), from `t0` at `v` (m/s), left to right. */
  cross: { s: number; t0: number; v: number; from: number };
}

export const INTRO: SetPiece = {
  // waiting at the light: still until the next stretch's first beat (its own key pulls away from rest)
  speed: (st) => [{ t: st.start, v: 0, ramp: 0 }],

  place(ctx: SetContext): Placed {
    const { st, audio, route, carFrame } = ctx;
    const atRoad = (s: number, lateral: number, y: number) => { const f = route.frameAt(s); return f.pos.clone().addScaledVector(f.right, lateral).addScaledVector(UP, y); };
    const park = carFrame(0), at0 = (fwd: number, right: number, up: number) => park.pos.clone().addScaledVector(park.fwd, fwd).addScaledVector(park.right, right).addScaledVector(UP, up);
    // the cuts: every other downbeat of the intro (from its second bar); the first shot holds through two of them
    const bars = audio.downbeats.filter((d) => d > 1 && d < st.end - 1).filter((_, i) => i % 2 === 0);
    const C = CORNER, lane = park.pos.distanceTo(route.frameAt(0).pos), E = SIGN_EYE, Wd = WIDE;
    const shots: Shot[] = [
      // the street signs crossed against the sky, from low off the car's nose (both faces at 45°), drifting
      { at: 0, move: 'cut', to: (t) => { const a = E.bearing + E.turn * t; return lookFrom(atRoad(C.pole - E.r * Math.cos(a), SIGNS.lateral + E.r * Math.sin(a), E.y + E.rise * t), atRoad(C.pole, SIGNS.lateral, (SIGNS.along + SIGNS.across) / 2 + 0.2)); } },
      // over the two of them, up at the red light over their lane
      { at: bars[1]!, move: 'cut', to: (t) => lookFrom(at0(-1.9 + 0.12 * (t - bars[1]!), 0, 1.85), atRoad(C.mast, lane, MAST.headY)) },
      // wide from up the road, back down the street at the car waiting at the line, the shops behind it, the motel
      { at: bars[2]!, move: 'cut', to: (t) => lookFrom(atRoad(Wd.s - Wd.drift * (t - bars[2]!), Wd.lateral, Wd.y), at0(-4, -0.6, 0.6)) },
      // the signal and its countdown, close
      { at: bars[3]!, move: 'cut', to: (t) => lookFrom(atRoad(C.mast - 5.5 + 0.2 * (t - bars[3]!), ROAD_HALF - 1, 3.2), atRoad(C.mast, 3.4, 4.3)) },
    ];
    const green = st.end + GREEN_AFTER, beat = 60 / audio.bpm;
    const countdown = Array.from({ length: COUNTDOWN }, (_, k) => green - (COUNTDOWN - k) * beat);
    // the street behind the corner: shops either side (on the right, behind the motel's lot), and the far right corner's
    // liquor store
    const B = STREET_BEHIND, blocks: Block[] = [];
    for (const side of [-1, 1]) {
      const end = side < 0 ? C.stopLine - 1 : B.motelLot[0];
      for (let s = B.from, k = 0; s < end; k++) {
        const w = Math.min(end - s, B.w[0] + (B.w[1] - B.w[0]) * hash(k, side, 71)), mid = s + w / 2;
        const h = B.h[0] + (B.h[1] - B.h[0]) * hash(k, side, 72), lateral = side * (B.back + B.d / 2);
        if (w > 4) blocks.push({ s: mid, lateral, w: w - B.alley, h, d: B.d, color: hash(k, side, 73), matrix: boxAt(route, mid, lateral, B.d, h, w - B.alley) });
        s += w;
      }
    }
    const L = LIQUOR, ls = (L.s[0] + L.s[1]) / 2, ll = L.back + L.d / 2;
    const liquor: Block = { s: ls, lateral: ll, w: L.s[1] - L.s[0], h: L.h, d: L.d, color: 0.62, bare: true, prop: true, matrix: boxAt(route, ls, ll, L.d, L.h, L.s[1] - L.s[0]) };
    blocks.push(liquor);
    // the town keeps clear of the cross street and the motel's lot
    const clear = [-1, 1].map((side) => ({ side, a: C.stopLine - 2, b: C.cross[1] + 6 })).concat([{ side: 1, a: B.motelLot[0], b: B.motelLot[1] }]);
    // the pedestrian the countdown counts for: onto the near crosswalk at the second cut, across the road right to
    // left (toward the barbershop's corner), on the far sidewalk at least a second before the green
    const span = 2 * (ROAD_HALF + 1.5);
    const walker = { s: C.cross[0] - 1.4, t0: bars[1]!, v: span / Math.max(4, green - 1 - bars[1]!), from: ROAD_HALF + 1.5 };
    // one car through on the cross street (its light is the green one), mid-intersection halfway through the wide
    // shot; from the road's right toward its left (screen left to right in the wide, which looks back down the road)
    const crossV = -12, crossFrom = 45, crossMid = (bars[2]! + bars[3]!) / 2;
    const cross = { s: (C.cross[0] + C.cross[1]) / 2, t0: crossMid - crossFrom / -crossV, v: crossV, from: crossFrom };
    return { carriers: [], frames: new Map(), clear, blocks, shots, floor: FLOOR, openings: [-1, 1].map((side) => ({ side, a: C.cross[0], b: C.cross[1] })), plan: { green, countdown, liquor, walker, cross } satisfies IntroPlan };
  },
};
