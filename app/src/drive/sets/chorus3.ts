// Chorus 3, the coast road (flow plan §5): the ritual by the sea, wide, the car small against it.
//   "The boy from South of somewhere came walking in"   the beach town's welcome arch over the road, its lettering
//        band the lyric (WELCOME TO is the arch's own header). It stands before his first board, so the film's first
//        true wide looks down the whole chorus through it: sea left, the sun kissing the water (sky.ts puts it on the
//        horizon at 112 s), the car passing under early in the line and shrinking beyond, framed by the arch
//   "And I can't keep my panties from dropping"          the beach itself, in one take that cranes up and on along the
//        sand toward the pier (the user, 2026-10-14: the white boards on the beach were "atrocious… hardly legible…
//        so much white space"; "writing in the sand or towels with writing on them or the surfing stands"):
//        "And I can't keep" printed big on a beach towel spread under an umbrella, seen from just over the boardwalk;
//        "my panties" raked into the sand in giant letters, seen from higher as the camera climbs; "from dropping" the
//        surfboard sign on the surf rental shack's roof, its last word dropping off the board. The car passes under the
//        lens through the foot of the frame, left to right. A pier runs out to sea past them, before the tunnel.
// His campaign boards (standing on the sand on the left) and the "fly" sky-writing stay the drive's own (carriers.ts);
// the fly line's take is ours, craning up over the tunnel's headland as the line runs out.
// Pure.
import * as THREE from 'three';
import { type Carrier, type Kind, centerAt, layout, lookFrom } from '../carriers';
import { type Phrase, phrasesOf } from '../phrases';
import { type Pose } from '../camera';
import { type Block, boxAt } from '../blocks';
import type { Placed, SetContext, SetFrame, SetPiece } from './index';

const UP = new THREE.Vector3(0, 1, 0);
const flat = (v: THREE.Vector3) => new THREE.Vector3(v.x, 0, v.z).normalize();
const PLACE = /south of somewhere/i, DROP = /panties from dropping/i;

/** The arch: this far before his first campaign board (m: clear of its take's rays); its band's underside over the
 *  road, its pylons (off the road's centre, their plan size), and the wide's eye (m back from the arch, off the road's
 *  centre, up). */
export const ARCH = { before: 15, bottom: 6.2, pylon: { lateral: 12, w: 2.4 }, eye: { back: 50, lateral: 1, y: 4.2 } };
/** The beach's three surfaces for the dropping line, from `ahead` m past where the car is as the line starts (clear of
 *  his last board on the sand): the towel (m along from there, off the road's centre: left negative), the raked words
 *  (the same), and the surf shack's roof sign (the same, its face's centre over the sand, its toe back toward the
 *  camera's approach). The shack behind its sign (its size; how far its front stands behind the sign's face). */
export const SHORE = {
  ahead: 45,
  towel: { at: 0, lateral: -13 },
  sand: { at: 16, lateral: -22 },
  shop: { at: 34, lateral: -14, y: 5.0, toe: (38 * Math.PI) / 180 },
  shack: { w: 7.4, d: 4.2, h: 3.2, back: 0.6 },
};
/** The pier: this far before the chorus's end (m: past the beach's words, short of the tunnel's mouth). */
export const PIER = { before: 38 };
/** The fly line's take: this far behind the car, off its side, up (m, as the drive's sky shots); rising this much more
 *  from this far through the line (its share) to its end — over the headland's crest by then. */
export const FLY_TAKE = { back: 8, side: 1.2, up: 1.6, rise: 10.5, from: 0.35 };

interface Face { center: THREE.Vector3; normal: THREE.Vector3; up: THREE.Vector3; w: number; h: number }
export interface Chorus3Plan {
  /** The arch (m along the road), its band, its pylons' lateral; the fly line (s: the gulls cross under its
   *  sky-writing). */
  archS: number;
  band: Face & { bottom: number };
  pylons: number;
  fly: { start: number; end: number } | null;
  /** The beach's words: the towel's, the sand's and the surf shack's sign's faces (m along the road; their faces). */
  towel: Face & { s: number };
  sand: Face & { s: number };
  shop: Face & { s: number };
  /** The pier (m along the road), running out to sea on the left. */
  pierS: number;
  /** The coast's stretch of road (m): where the beach's props stand. */
  from: number;
  to: number;
}

/** A take through keyed poses (eye and aim at each time): moving steadily between the two keys of each hold, and on
 *  between holds along a cubic that leaves and arrives at the holds' own pace (no stop, no jolt). */
function keyedTake(keys: readonly { t: number; eye: THREE.Vector3; aim: THREE.Vector3 }[]): (t: number) => Pose {
  // (keys pair up as holds: [0,1], [2,3], …; each key's velocity is its hold's)
  const vel = (i: number, p: 'eye' | 'aim') => { const a = keys[i - (i % 2)]!, b = keys[i - (i % 2) + 1]!; return b[p].clone().sub(a[p]).divideScalar(b.t - a.t); };
  const at = (p: 'eye' | 'aim', t: number) => {
    if (t <= keys[0]!.t) return keys[0]![p].clone();
    const last = keys.length - 1;
    if (t >= keys[last]!.t) return keys[last]![p].clone().addScaledVector(vel(last, p), t - keys[last]!.t);
    let i = 0;
    while (t > keys[i + 1]!.t) i++;
    const a = keys[i]!, b = keys[i + 1]!, dt = b.t - a.t, u = (t - a.t) / dt;
    // (cubic Hermite: positions and velocities at both ends)
    const h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u, h01 = -2 * u ** 3 + 3 * u ** 2, h11 = u ** 3 - u ** 2;
    return a[p].clone().multiplyScalar(h00).addScaledVector(vel(i, p), h10 * dt).addScaledVector(b[p], h01).addScaledVector(vel(i + 1, p), h11 * dt);
  };
  return (t) => lookFrom(at('eye', t), at('aim', t));
}

export const CHORUS3: SetPiece = {
  owns: (line) => PLACE.test(line.text) || DROP.test(line.text),

  place(ctx: SetContext): Placed {
    const { st, route, motion } = ctx;
    const carS = (t: number) => motion.distanceAt(t);
    const atRoad = (s: number, lateral: number, y: number) => { const f = route.frameAt(s); return f.pos.clone().addScaledVector(f.right, lateral).addScaledVector(UP, y); };
    const ground = (s: number) => route.frameAt(s).pos.y;
    const carriers: Carrier[] = [], frames = new Map<string, SetFrame>();
    const add = (kind: Kind, ph: Phrase, id: string, s: number, center: THREE.Vector3, normal: THREE.Vector3, up: THREE.Vector3, lay: ReturnType<typeof layout>) => {
      const c: Carrier = { id, phrase: ph, kind, stretch: st.id, reveal: ph.start, s, center, normal, up, ...lay, foot: center.y - ground(s), solid: null };
      carriers.push(c);
      return c;
    };

    // ---- the arch: the line's phrases stacked as its lettering band; it stands just before his first board, so the
    // wide looks down the chorus through it and the car passes under early in the line ----
    const place = st.lines.find((l) => PLACE.test(l.text))!, pps = phrasesOf(place, ctx.nextStart(place.i), ctx.solo);
    const campaign = st.lines[0]!, cp0 = phrasesOf(campaign, ctx.nextStart(campaign.i), ctx.solo)[0]!;
    const firstBoard = Math.max(ctx.floor ?? -Infinity, carS((cp0.start + cp0.end) / 2));
    const A = ARCH, archS = firstBoard - A.before, af = route.frameAt(archS), an = flat(af.fwd).negate();
    const lays = pps.map((ph) => layout('arch', ph.text, ph.solo)), H = lays.reduce((a, l) => a + l.h, 0);
    let top = A.bottom + H;
    const bandW = Math.max(...lays.map((l) => l.w));
    pps.forEach((ph, i) => {
      // (a hair in front of the band's own box: the prop draws the structure behind)
      const L = lays[i]!, c = atRoad(archS, 0, top - L.h / 2).addScaledVector(an, 0.35);
      top -= L.h;
      add('arch', ph, `L${place.i}.${i}`, archS, c, an.clone(), UP.clone(), L);
    });
    // the wide: a fixed eye down the road, the sea and the low sun left, the arch's band ahead, the whole chorus
    // seen through it; the car passes under and drives small beyond
    const bandC = atRoad(archS, 0, A.bottom + H / 2);
    const wide = lookFrom(atRoad(archS - A.eye.back, A.eye.lateral, A.eye.y), bandC);
    carriers.forEach((c, i) => frames.set(c.id, { to: () => wide, move: i ? 'snap' : 'cut' }));

    // ---- the dropping line: on the beach — a towel, the sand, the surf shack's sign — in one take ----
    const drop = st.lines.find((l) => DROP.test(l.text))!, dps = phrasesOf(drop, ctx.nextStart(drop.i), ctx.solo);
    const S = SHORE, s0 = carS(drop.words[0]!.start) + S.ahead;
    const seaward = (s: number) => flat(route.frameAt(s)!.right).negate(); // (flat faces' text runs along the road, read from the road side: up is out to sea)
    // the towel and the raked words lie on the sand, face up (a hair over it: the towel's cloth is the prop's)
    const sT = s0 + S.towel.at, sS = s0 + S.sand.at, sP = s0 + S.shop.at;
    const towel = add('towel', dps[0]!, `L${drop.i}.0`, sT, atRoad(sT, S.towel.lateral, -0.05 + 0.06), UP.clone(), seaward(sT), layout('towel', dps[0]!.text, dps[0]!.solo));
    const sand = add('sand', dps[1]!, `L${drop.i}.1`, sS, atRoad(sS, S.sand.lateral, -0.05 + 0.03), UP.clone(), seaward(sS), layout('sand', dps[1]!.text, dps[1]!.solo));
    // the shack's sign faces the road, toed back toward the camera coming along it
    const pf = route.frameAt(sP), shopN = flat(pf.right).multiplyScalar(Math.cos(S.shop.toe)).addScaledVector(flat(pf.fwd), -Math.sin(S.shop.toe)).normalize();
    const shop = add('surfshop', dps[2]!, `L${drop.i}.2`, sP, atRoad(sP, S.shop.lateral, S.shop.y), shopN, UP.clone(), layout('surfshop', dps[2]!.text, dps[2]!.solo));
    // the take: just over the boardwalk, close over the towel, craning up as it's sung; up and on to the raked words,
    // high; then down and on to the shack's sign, the car passing under the lens. (Each hold drifts on; between holds
    // the eye carries on at the holds' pace: one take, no cut.)
    const [p0, p1, p2] = dps as [Phrase, Phrase, Phrase], LAND = 0.21;
    const K = (t: number, s: number, lat: number, y: number, aim: THREE.Vector3) => ({ t, eye: atRoad(s, lat, y), aim });
    const tAim = (ds: number, dl: number) => atRoad(sT + ds, S.towel.lateral + dl, 0);
    // (aimed out past the raked words: they sit low in the frame, the beach and the water beyond them)
    const sAim = (ds: number) => atRoad(sS + ds, S.sand.lateral - 5, 0);
    // (the flat faces from steeply over them: their letters foreshorten as the eye drops toward the sand)
    const take = keyedTake([
      K(p0.start - 0.1, sT - 2.5, -8.6, 4.6, tAim(0.3, 0)), K(p0.end - 0.08, sT + 0.5, -8.4, 6.4, tAim(0.8, -0.2)),
      K(p1.start + LAND, sS - 8, -6, 14.5, sAim(-1)), K(p2.start - 0.1, sS - 4, -6, 16, sAim(0.6)),
      K(p2.start + LAND, sP - 13, -1.4, 10.5, shop.center.clone()), K(p2.end, sP - 10, -1.6, 9.5, shop.center.clone()),
    ]);
    [towel, sand, shop].forEach((c, i) => frames.set(c.id, { to: take, move: i ? 'snap' : 'cut' }));

    // the arch's band and pylons, and the surf shack, stand as blocks: the guard checks them (the carriers' own solids
    // stay null — a face zone on the centre line would push its own pylons out)
    const shackAt = (): THREE.Matrix4 => {
      // (behind its sign, square to it: in the sign's frame, x along it, z out of its face)
      const T = S.shack, along = UP.clone().cross(shopN).normalize(), sandY = ground(sP) - 0.05;
      const c = shop.center.clone().addScaledVector(shopN, -(T.back + T.d / 2)).setY(sandY + T.h / 2);
      return new THREE.Matrix4().makeBasis(along, UP.clone(), shopN.clone()).scale(new THREE.Vector3(T.w, T.h, T.d)).setPosition(c);
    };
    const blocks: Block[] = [
      { s: archS, lateral: 0, w: 0.6, h: H + 0.6, d: 2 * A.pylon.lateral + A.pylon.w, color: 0.8, bare: true, prop: true, matrix: boxAt(route, archS, 0, 2 * A.pylon.lateral + A.pylon.w, H + 0.6, 0.6, A.bottom - 0.3) },
      ...[-1, 1].map((side): Block => ({ s: archS, lateral: side * A.pylon.lateral, w: A.pylon.w, h: A.bottom + H + 1, d: A.pylon.w, color: 0.8, bare: true, prop: true, matrix: boxAt(route, archS, side * A.pylon.lateral, A.pylon.w, A.bottom + H + 1, A.pylon.w) })),
      { s: sP, lateral: S.shop.lateral - S.shack.d / 2, w: S.shack.d, h: S.shack.h, d: S.shack.w, color: 0.7, bare: true, prop: true, matrix: shackAt() },
    ];
    const clear = [
      ...[-1, 1].map((side) => ({ side, a: archS - 10, b: archS + 10 })),
      { side: -1, a: sT - 15, b: sP + 15 },
    ];
    const flyLine = st.lines.find((l) => /\bfly\b/i.test(l.text));
    // the fly line's sky-writing is the drive's (carriers.ts); its take is ours: low behind the car looking up at it,
    // as everywhere, but craning up as the line runs out — the car closes on the tunnel's headland, which rose across
    // the writing's foot from down by the road (the lead, 2026-10-14)
    if (flyLine) {
      const T0 = flyLine.words[0]!.start, T1 = flyLine.end, F = FLY_TAKE;
      const eyeAt = (t: number) => {
        const f = ctx.carFrame(t), u = Math.min(1, Math.max(0, (t - T0 - F.from * (T1 - T0)) / ((1 - F.from) * (T1 - T0))));
        return f.pos.clone().addScaledVector(flat(f.fwd), -F.back).addScaledVector(f.right, F.side).addScaledVector(UP, F.up + F.rise * u * u * (3 - 2 * u));
      };
      phrasesOf(flyLine, ctx.nextStart(flyLine.i), ctx.solo).forEach((_, i) => frames.set(`L${flyLine.i}.${i}`, { of: (c) => (t) => lookFrom(eyeAt(t), centerAt(c, t).add(c.aim ?? new THREE.Vector3())), move: i ? 'snap' : 'cut' }));
    }
    const face =(c: Carrier) => ({ s: c.s, center: c.center.clone(), normal: c.normal.clone(), up: c.up.clone(), w: c.w, h: c.h });
    const plan: Chorus3Plan = {
      archS,
      band: { center: bandC, normal: an.clone(), up: UP.clone(), w: bandW, h: H, bottom: A.bottom },
      pylons: ARCH.pylon.lateral,
      fly: flyLine ? { start: flyLine.words[0]!.start, end: flyLine.end } : null,
      towel: face(towel), sand: face(sand), shop: face(shop),
      pierS: carS(st.end) - PIER.before,
      from: carS(st.start) - 60, to: carS(st.end),
    };
    return { carriers, frames, clear, blocks, plan };
  },
};
