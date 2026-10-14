// Chorus 2, the freeway (flow plan §3): the ritual at speed. It places two of its lines; the rest ("dropping" on the
// paint, "fly" on the towed banners) stay the drive's own (carriers.ts).
//   "Young and fine and dark and handsome"   his campaign pasted up along the sound wall across the freeway, the Metro
//                                            running at grade in the median in front of it: the camera drifts along the
//                                            posters as the car and the train blast past, and the train's tail wipes them
//                                            into view, left to right (the user's favourite accident, made on purpose)
//   "The boy West side of Compton came…"     one big freeway sign, three panels across the lanes, the car rushing under
// And the SLAUSON exit sign at the end, where the car comes off into the neighbourhood (verse 2). Pure.
import * as THREE from 'three';
import { type Carrier, type Kind, layout, lineTake, lookFrom } from '../carriers';
import { TEXT_SHARE } from '../ads';
import { type Phrase, phraseOf, phrasesOf } from '../phrases';
import { ROAD_HALF } from '../route';
import { type Block, boxAt } from '../blocks';
import { eyeOf } from '../camera';
import type { Placed, SetContext, SetFrame, SetPiece } from './index';

const UP = new THREE.Vector3(0, 1, 0);
const flat = (v: THREE.Vector3) => new THREE.Vector3(v.x, 0, v.z).normalize();
const CAMPAIGN = /young and (he )?fine/i, PLACE = /west side|compton/i;

/** The freeway's left side: the median barrier, the Metro's tracks at grade (their middle; the train's half-width, height,
 *  its cars' length and how many, its speed), the sound wall (its face off the road's centre, its height, its segments'
 *  length). */
export const MEDIAN = { barrier: -ROAD_HALF - 0.6, barrierH: 1, tracks: -8.5 };
/** The freeway's right side: two more lanes (their width) off the road's right edge, a barrier past them (the user,
 *  2026-10-13: the one road with cars beside it on the dirt was "cars not driving on the actual road"). */
export const LANES = { n: 2, w: 3.7, barrier: 0.6 };
export const FREEWAY_EDGE = ROAD_HALF + LANES.n * LANES.w;
export const TRAIN = { half: 1.5, h: 3.9, car: 24, cars: 3, v: 30, gap: 0.6 };
export const WALL = { face: -12, h: 6, d: 0.6, seg: 20, before: 90 };
/** His posters on the wall: their width, the gap between, their centres' height; how long into "Young" its wipe lands. */
export const POSTERS = { w: 10, gap: 1, y: 3.45, wipeIn: 0.25 };
/** The freeway sign: three panels across the lanes and the tracks (their width, their bottom's height), its legs (off
 *  the road's centre); passed when its line is half sung; the camera upstream on the shoulder (m back, off, up). */
export const GANTRY = { panel: 6, gap: 0.3, bottom: 6.6, legs: [-13, FREEWAY_EDGE + 1.6] as [number, number], through: 0.5, eye: { back: 23, lateral: 2.2, y: 3.6 } }; // (the eye back and up: the whole sign in frame — its left panel was cut — and the car passing under the view, not across the words)
/** The SLAUSON exit sign, this long before the stretch ends (s). */
export const EXIT = { before: 2.2 };

interface Panel { center: THREE.Vector3; normal: THREE.Vector3; up: THREE.Vector3; w: number; h: number }
export interface Chorus2Plan {
  /** The stretch of road the freeway's left side runs (m). */
  s0: number; s1: number;
  /** The train's tail along the road at t: tailS + v (t - at); when it's there (s). */
  train: { tailS: number; at: number; from: number; until: number };
  /** The posters' row (their centres, m along the road) and the sign's panels. */
  posters: number[];
  gantryS: number; panels: Panel[];
  exitS: number;
  /** Slower cars in the outside lane, overtaken through the chorus (the cheapest speed there is: relative motion):
   *  each where it is when they pass it (m along the road, s), its own speed (m/s) and its lane (m off the centre). */
  traffic: { s0: number; t0: number; v: number; lat: number }[];
}

/** The pace (m/s): the freeway's; easing off for "…panties from dropping" (its road paint, read in one take high ahead
 *  of the car: at freeway speed its phrases lie too far apart to hold), from this long before it, back up after it. */
export const PACE = { freeway: 26, easy: 15, off: 0.9, offRamp: 0.7, on: 0.1, onRamp: 1.2 };

export const CHORUS2: SetPiece = {
  owns: (line) => CAMPAIGN.test(line.text) || PLACE.test(line.text),

  speed(st, audio) {
    const bar = 240 / audio.bpm, drop = st.lines.find((l) => /dropping/i.test(l.text));
    return [
      { t: st.start, v: PACE.freeway, ramp: bar },
      ...(drop ? [{ t: drop.start - PACE.off, v: PACE.easy, ramp: PACE.offRamp }, { t: drop.end + PACE.on, v: PACE.freeway, ramp: PACE.onRamp }] : []),
    ];
  },

  place(ctx: SetContext): Placed {
    const { st, route, motion } = ctx;
    const carS = (t: number) => motion.distanceAt(t);
    const campaign = st.lines.find((l) => CAMPAIGN.test(l.text))!, place = st.lines.find((l) => PLACE.test(l.text))!;
    const phsOf = (l: typeof campaign) => phrasesOf(l, ctx.nextStart(l.i), ctx.solo);
    const atRoad = (s: number, lateral: number, y: number) => { const f = route.frameAt(s); return f.pos.clone().addScaledVector(f.right, lateral).addScaledVector(UP, y); };
    const ground = (s: number) => route.frameAt(s).pos.y;
    const carriers: Carrier[] = [], frames = new Map<string, SetFrame>();
    const add = (kind: Kind, ph: Phrase, id: string, s: number, center: THREE.Vector3, normal: THREE.Vector3, up: THREE.Vector3, lay: ReturnType<typeof layout>, extra: Partial<Carrier> = {}) => {
      const c: Carrier = { id, phrase: ph, kind, stretch: st.id, reveal: ph.start, s, center, normal, up, ...lay, foot: center.y - ground(s), solid: null, ...extra };
      carriers.push(c);
      return c;
    };

    // his posters, edge to edge along the wall from where the freeway's faces may start; the camera drifts along them
    const cps = phsOf(campaign), p0 = Math.max(ctx.floor ?? -Infinity, carS(campaign.start) + POSTERS.w);
    const posters = cps.map((ph, i) => {
      const s = p0 + i * (POSTERS.w + POSTERS.gap), f = route.frameAt(s), n = flat(f.right);
      const lay = layout('poster', ph.text, ph.solo);
      return add('poster', ph, `L${ph.line}.${i}`, s, atRoad(s, WALL.face + 0.03, POSTERS.y), n, UP.clone(), lay, { ad: 'him' });
    });
    const take = lineTake(posters, posters.map(() => false));
    posters.forEach((c, i) => frames.set(c.id, { to: take, move: i ? 'snap' : 'cut' }));

    // the train: its tail passes the first poster's words (seen from the camera) `wipeIn` s into its phrase, then sweeps
    // on along the rest; the wall's face where the train's side is: solved along the road from the camera's eye
    const at = cps[0]!.start + POSTERS.wipeIn, eye = eyeOf(take(at)), first = posters[0]!;
    const words = first.center.clone().addScaledVector(first.up.clone().cross(first.normal).normalize(), first.w * ((TEXT_SHARE.poster ?? 1) - 0.5));
    const f0 = route.frameAt(first.s), side = MEDIAN.tracks + TRAIN.half;
    const lat = (p: THREE.Vector3) => p.clone().sub(f0.pos).dot(f0.right), along = (p: THREE.Vector3) => p.clone().sub(f0.pos).dot(flat(f0.fwd));
    const u = (lat(eye) - side) / (lat(eye) - lat(words)), cross = eye.clone().lerp(words, u);
    const tailS = first.s + along(cross);

    // the freeway sign: three panels across the lanes and the tracks, passed half way through its line
    // ("The boy | West side of Compton | came walking in": each panel a self-contained unit that reads top-down
    // within itself, like a real exit sign — a phrase CONTINUING across stacked panel rows would read column-first)
    const gw = place.words, westAt = gw.findIndex((w) => /^west/i.test(w.w)), cameAt = gw.findIndex((w) => /^came/i.test(w.w));
    const gps = westAt > 0 && cameAt > westAt
      ? [phraseOf(place, 0, westAt, ctx.solo), phraseOf(place, westAt, cameAt, ctx.solo), phraseOf(place, cameAt, gw.length, ctx.solo)]
      : phsOf(place);
    const gantryS = carS(place.start + (place.end - place.start) * GANTRY.through);
    const gf = route.frameAt(gantryS), gn = flat(gf.fwd).negate(), pw = GANTRY.panel, span = gps.length * pw + (gps.length - 1) * GANTRY.gap;
    const mid = (GANTRY.legs[0] + GANTRY.legs[1]) / 2;
    const panels: Panel[] = [];
    gps.forEach((ph, i) => {
      // (left to right as they're read: from the car, its right is the screen's)
      const lateral = mid - span / 2 + pw / 2 + i * (pw + GANTRY.gap), lay = layout('freeway', ph.text, ph.solo);
      const center = atRoad(gantryS, lateral, GANTRY.bottom + lay.h / 2);
      panels.push({ center, normal: gn, up: UP.clone(), w: lay.w, h: lay.h });
      add('freeway', ph, `L${ph.line}.${i}`, gantryS, center, gn, UP.clone(), lay);
    });
    const G = GANTRY.eye, sign = lookFrom(atRoad(gantryS - G.back, G.lateral, G.y), atRoad(gantryS, mid, GANTRY.bottom + 1.2));
    carriers.filter((c) => c.kind === 'freeway').forEach((c, i) => frames.set(c.id, { to: () => sign, move: i ? 'snap' : 'cut' }));

    // the freeway's left side: the sound wall (concrete: the guard sees it) from before the posters to the stretch's end
    const s0 = p0 - WALL.before, s1 = carS(st.end) + 20, blocks: Block[] = [];
    for (let s = s0; s < s1; s += WALL.seg) {
      const m = s + WALL.seg / 2;
      blocks.push({ s: m, lateral: WALL.face - WALL.d / 2, w: WALL.seg, h: WALL.h, d: WALL.d, color: 0, concrete: true, matrix: boxAt(route, m, WALL.face - WALL.d / 2, WALL.d, WALL.h, WALL.seg + 0.05) });
    }
    const until = at + (s1 - tailS) / TRAIN.v;
    // slower traffic in the outside lane, one overtaken in each third of the chorus
    const traffic = ([[0.23, 18, 0], [0.55, 17, 1], [0.84, 20, 0]] as const).map(([u, v, lane]) => {
      const t0 = st.start + (st.end - st.start) * u;
      return { s0: carS(t0), t0, v, lat: ROAD_HALF + LANES.w * (lane + 0.5) };
    });
    const plan: Chorus2Plan = {
      s0, s1, train: { tailS, at, from: Math.max(st.start - 1, at - 4), until }, posters: posters.map((c) => c.s),
      gantryS, panels, exitS: carS(st.end - EXIT.before) + 40, traffic,
    };
    return { carriers, frames, clear: [{ side: -1, a: s0, b: s1 }], blocks, plan };
  },
};
