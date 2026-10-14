// Chorus 4, up into the hills (flow plan §8): the ritual's last and biggest.
//   "Young and he fine and he tall and he handsome"   his biggest campaign: a giant painted board on the uphill side,
//        the car driving up into the frame and past it (verse 2's mural, outgrown)
//   "Talkin' so fine, I might hold it for ransom"      stays on its gantries — hijacked with ransom-note lettering
//        pasted over the route sign (carrierart.ts)
//   "Put it in drive, I'm not shy, I might let ya"     an insert inside the car: the line across the head unit, and
//        the shift indicator's D flaring on the word "drive" (look/dash.ts, scenes/sets/chorus4.ts)
//   "Cruise all night"                                 the giant hillside letters (the drive's own, carriers.ts)
// Pure.
import * as THREE from 'three';
import { type Carrier, type Kind, carMatrix, layout, lookFrom, rideAt } from '../carriers';
import { HEAD_UNIT } from '../cabin';
import { type Phrase, phrasesOf } from '../phrases';
import { type Block } from '../blocks';
import type { Placed, SetContext, SetFrame, SetPiece } from './index';

const UP = new THREE.Vector3(0, 1, 0);
const flat = (v: THREE.Vector3) => new THREE.Vector3(v.x, 0, v.z).normalize();
const CAMPAIGN4 = /young and he fine/i, DRIVE = /put it in drive/i;

/** His biggest board: on the uphill (right) side, where the car is this long before its line ends (m short of it),
 *  off the road, its centre's height, turned toward the coming car (radians), its size, its words' share and scale;
 *  the camera waits ahead of it (m short, off the road's centre, up), the car driving up into the frame. */
export const BOARD = { short: 34, lateral: 20, y: 11, turn: (33 * Math.PI) / 180, w: 30, h: 16.5, text: 0.62, scale: 1.35, d: 1.4, eye: { short: 24, lateral: -1.5, up: 2.6 }, rise: { short: 11, lateral: -4, up: 7.5 } };
/** The board's take runs from this long before its line to this long after (s): the eye climbs with the car from
 *  `eye` to `rise`, the board growing over it (a fixed eye read as a still — the user, 2026-10-13: "we could do more"). */
export const BOARD_TAKE = { before: 0.6, after: 0.6 };
/** The insert: the camera inside the car (its frame), aimed between the head unit's lyric and the shift indicator —
 *  pulled back and up enough that the wheel and gauges fill the frame's foot instead of bare door. */
export const INSERT = { eye: new THREE.Vector3(-0.17, 1.56, -0.18), aim: new THREE.Vector3(0.06, 1.15, 0.52) };

interface Face { center: THREE.Vector3; normal: THREE.Vector3; up: THREE.Vector3; w: number; h: number }
export interface Chorus4Plan {
  /** His board (the mural art is the prop's) and its block. */
  board: Face & { s: number };
  boardBlock: Block;
  /** When the word "drive" lands (the D flares) and the insert's window (s). */
  driveAt: number;
  insert: [number, number];
}

export const CHORUS4: SetPiece = {
  owns: (line) => CAMPAIGN4.test(line.text) || DRIVE.test(line.text),

  place(ctx: SetContext): Placed {
    const { st, route, motion, carFrame } = ctx;
    const carS = (t: number) => motion.distanceAt(t);
    const atRoad = (s: number, lateral: number, y: number) => { const f = route.frameAt(s); return f.pos.clone().addScaledVector(f.right, lateral).addScaledVector(UP, y); };
    const ground = (s: number) => route.frameAt(s).pos.y;
    const carriers: Carrier[] = [], frames = new Map<string, SetFrame>();
    const add = (kind: Kind, ph: Phrase, id: string, s: number, center: THREE.Vector3, normal: THREE.Vector3, up: THREE.Vector3, lay: ReturnType<typeof layout>, extra: Partial<Carrier> = {}) => {
      const c: Carrier = { id, phrase: ph, kind, stretch: st.id, reveal: ph.start, s, center, normal, up, ...lay, foot: center.y - ground(s), solid: null, ...extra };
      carriers.push(c);
      return c;
    };

    // ---- his biggest board, on the uphill side: the words left, his portrait right (the prop paints it) ----
    const camp = st.lines.find((l) => CAMPAIGN4.test(l.text))!, cps = phrasesOf(camp, ctx.nextStart(camp.i), ctx.solo);
    const B = BOARD, bs = carS(camp.end) - B.short, bf = route.frameAt(bs);
    const bn = flat(bf.fwd).negate().multiplyScalar(Math.cos(B.turn)).addScaledVector(flat(bf.right), -Math.sin(B.turn)).normalize();
    const bP = atRoad(bs, B.lateral, B.y), bUp = UP.clone().addScaledVector(bn, -bn.dot(UP)).normalize();
    const bAlong = bUp.clone().cross(bn).normalize(), textX = -B.w / 2 + (B.w * B.text) / 2;
    const blays = cps.map((ph) => layout('giant', ph.text, ph.solo, B.scale)), bH = blays.reduce((a, l) => a + l.h, 0);
    let btop = bH / 2;
    cps.forEach((ph, i) => {
      const L = blays[i]!, c = bP.clone().addScaledVector(bUp, btop - L.h / 2).addScaledVector(bAlong, textX);
      btop -= L.h;
      add('giant', ph, `L${camp.i}.${i}`, bs, c, bn.clone(), bUp.clone(), L, { ad: 'him' });
    });
    const aim = bP.clone().addScaledVector(bAlong, -2.5), t0 = camp.words[0]!.start - BOARD_TAKE.before, t1 = camp.end + BOARD_TAKE.after;
    const smooth = (x: number) => { const u = Math.min(1, Math.max(0, x)); return u * u * (3 - 2 * u); };
    const boardTake = (t: number) => {
      const u = smooth((t - t0) / (t1 - t0)), E = B.eye, R = B.rise;
      return lookFrom(atRoad(bs - (E.short + (R.short - E.short) * u), E.lateral + (R.lateral - E.lateral) * u, E.up + (R.up - E.up) * u), aim);
    };
    carriers.forEach((c, i) => frames.set(c.id, { to: boardTake, move: i ? 'snap' : 'cut' }));
    const bB = bP.clone().addScaledVector(bn, -B.d / 2 - 0.05), bLat = bB.clone().sub(bf.pos).dot(bf.right);
    const bh = B.y + B.h / 2 + 1;
    const boardBlock: Block = { s: bs, lateral: bLat, w: B.w + 2, h: bh, d: B.d, color: 0.5, bare: true, prop: true, matrix: new THREE.Matrix4().makeBasis(bAlong, UP, bn).scale(new THREE.Vector3(B.w + 2, bh, B.d)).setPosition(bB.x, ground(bs) + bh / 2, bB.z) };

    // ---- the insert: the line across the head unit, the shift indicator beside it, the D flaring on "drive" ----
    const drive = st.lines.find((l) => DRIVE.test(l.text))!, dps = phrasesOf(drive, ctx.nextStart(drive.i), ctx.solo);
    const next = st.lines[st.lines.indexOf(drive) + 1];
    const insert: [number, number] = [dps[0]!.start - 0.8, (next ? next.words[0]!.start : drive.end) + 0.8];
    const R = HEAD_UNIT, rn = R.normal.clone().normalize(), rUp = UP.clone().addScaledVector(rn, -rn.dot(UP)).normalize();
    const rlays = dps.map((ph) => layout('radio', ph.text, ph.solo)), rH = rlays.reduce((a, l) => a + l.h, 0);
    let rtop = rH / 2;
    const inCar = (p: THREE.Vector3, t: number) => p.clone().applyMatrix4(carMatrix(carFrame(t)));
    dps.forEach((ph, i) => {
      const L = rlays[i]!, pos = R.pos.clone().addScaledVector(rUp, rtop - L.h / 2);
      rtop -= L.h;
      const ride = { pos, normal: rn.clone(), up: rUp.clone() };
      const at = rideAt({ ride } as Carrier, carFrame(ph.start));
      add('radio', ph, `L${drive.i}.${i}`, carS(ph.start), at.center, at.normal, at.up, L, { ride, from: insert[0], until: insert[1] });
    });
    const insertShot = (t: number) => lookFrom(inCar(INSERT.eye, t), inCar(INSERT.aim, t));
    carriers.filter((c) => c.kind === 'radio').forEach((c, i) => frames.set(c.id, { to: insertShot, move: i ? 'snap' : 'cut' }));

    const plan: Chorus4Plan = {
      board: { s: bs, center: bP, normal: bn, up: bUp, w: B.w, h: B.h },
      boardBlock,
      driveAt: drive.words.find((w) => /^drive/i.test(w.w))?.start ?? drive.words[0]!.start,
      insert,
    };
    return { carriers, frames, clear: [{ side: 1, a: bs - 22, b: bs + 22 }], blocks: [boardBlock], plan };
  },
};
