// Verse 2, Slauson (flow plan §4): low and slow off the freeway into the neighbourhood, lowrider culture, the lyrics
// painted by hand. The car never stops (10 m/s).
//   "Ooh, he bossy… them chickens you been trickin' on"   one take: the camera rides alongside as the car cruises a
//          block of murals on the left (a style a line), a SLAUSON street sign on the corner, the chicken shack's wall
//          (a chicken on its roof); the car three-wheels on "crip walkin'"
//   "I can be your ride or die…"                         a hand car wash's sign, the car rolling past
//   "Trust me, boy, I'm good in every hood"               their own car, from in front: the windshield banner, then
//                                                         the hood's airbrushed lettering
//   "Trickin', finna fall in backwards"                   a whip round behind to the club plaque on the rear deck as
//                                                         the car lays back on its hydraulics
//   "I'm just tryna show you… if you my man"             a giant mural of him at the end of the street, the car
//                                                         driving on toward it (into chorus 3)
// Three cuts in thirty seconds. Pure.
import * as THREE from 'three';
import { type Carrier, type Kind, STREET, carMatrix, layout, lineTake, lookFrom, rideAt } from '../carriers';
import { type Phrase, phrasesOf } from '../phrases';
import { ROAD_HALF } from '../route';
import { type ShotMove, LEAD, WHIP_S } from '../shots';
import { type Block, boxAt } from '../blocks';
import { hash } from '../../engine/util';
import type { Placed, SetContext, SetFrame, SetPiece } from './index';

const UP = new THREE.Vector3(0, 1, 0);
const flat = (v: THREE.Vector3) => new THREE.Vector3(v.x, 0, v.z).normalize();
const uprightFor = (n: THREE.Vector3) => UP.clone().addScaledVector(n, -n.dot(UP)).normalize();

/** The block of murals on the left: its buildings' fronts (m off the road's centre), their depth, heights and widths
 *  along the street, the corner (a side street) at the SLAUSON sign; the murals' centres' height and the gap between
 *  them along the wall. */
export const BLOCK = { face: -8, d: 10, h: [6, 9] as [number, number], w: [14, 22] as [number, number], alley: 1.5, corner: 7 };
/** (proud of the fronts: the street bends, each building a straight box along it, so its corners stand a little out) */
export const MURAL = { y: 4.2, gap: 1.2, proud: 0.3 };
const STREET_SCALE = 1.25;
/** The take along it: the mural sung as the car three-wheels stands where the car is this far through its phrase. */
export const TAKE = { through: 0.55 };
/** The car wash on the right: its sign (off the road, its centre's height; passed this far through its line), the
 *  camera upstream on the sidewalk; its building. */
export const WASH = { building: { ds: 14, lateral: 17 }, lateral: ROAD_HALF + 1.6, y: 3.6, through: 0.5, eye: { back: 5.2, lateral: ROAD_HALF + 0.3, y: 1.4, toRoad: 0.5, down: 0.3 } };
/** On their car (its frame: x its left, y up, z forward): the windshield banner, the hood's lettering, the club plaque
 *  on the rear deck; the camera high in front, and behind. */
export const ON_CAR = {
  visor: { pos: new THREE.Vector3(0, 1.327, 0.925), normal: new THREE.Vector3(0, 0.247, 0.969) },
  hood: { pos: new THREE.Vector3(0, 1.0, 1.62), normal: new THREE.Vector3(0, 0.998, 0.057) },
  plaque: { pos: new THREE.Vector3(0, 1.32, -1.9), normal: new THREE.Vector3(0, 0, -1) },
  front: new THREE.Vector3(0, 2.75, 4.4), behind: new THREE.Vector3(0, 1.55, -6.4),
};
/** The giant mural of him at the end of the street: where the car is when its line ends (m short of it), off to the
 *  left, its centre's height, turned toward the coming car; the camera waits in the street before it (m short of it,
 *  off the road's centre, up), the car driving up into the frame. */
export const GIANT = { short: 20, lateral: -14, y: 7.5, turn: (35 * Math.PI) / 180, w: 22, h: 12, text: 0.62, eye: { short: 24, lateral: 3, up: 2.4 } };

export interface Verse2Plan {
  /** The block's stretch of road and its buildings' colours come from the drive's blocks; the chicken shack (its s). */
  chickenS: number;
  wash: { s: number; sign: { center: THREE.Vector3; normal: THREE.Vector3; up: THREE.Vector3; w: number; h: number } };
  giant: { center: THREE.Vector3; normal: THREE.Vector3; up: THREE.Vector3; w: number; h: number };
  /** When the car lays back (the word "backwards"). */
  layBack: number;
}

export const VERSE2: SetPiece = {
  place(ctx: SetContext): Placed {
    const { st, route, motion, carFrame } = ctx;
    const lines = st.lines, phs = lines.map((l) => phrasesOf(l, ctx.nextStart(l.i), ctx.solo));
    const carS = (t: number) => motion.distanceAt(t);
    const atRoad = (s: number, lateral: number, y: number) => { const f = route.frameAt(s); return f.pos.clone().addScaledVector(f.right, lateral).addScaledVector(UP, y); };
    const right = (s: number) => flat(route.frameAt(s).right), fwd = (s: number) => flat(route.frameAt(s).fwd);
    const ground = (s: number) => route.frameAt(s).pos.y;
    const inCar = (p: THREE.Vector3, t: number) => p.clone().applyMatrix4(carMatrix(carFrame(t)));
    const carriers: Carrier[] = [], frames = new Map<string, SetFrame>();
    const idOf = (ph: Phrase) => `L${ph.line}.${phs[lines.findIndex((l) => l.i === ph.line)]!.indexOf(ph)}`;
    const add = (kind: Kind, ph: Phrase, s: number, center: THREE.Vector3, normal: THREE.Vector3, up: THREE.Vector3, lay: ReturnType<typeof layout>, extra: Partial<Carrier> = {}) => {
      const c: Carrier = { id: idOf(ph), phrase: ph, kind, stretch: st.id, reveal: ph.start, s, center, normal, up, ...lay, foot: center.y - ground(s), solid: null, ...extra };
      carriers.push(c);
      return c;
    };
    const frame = (c: Carrier, to: SetFrame['to'], move: ShotMove) => {
      const prev = carriers[carriers.indexOf(c) - 1], cue = c.phrase.start - LEAD;
      frames.set(c.id, { to, move, ...(move === 'whip' && prev ? { at: Math.min(cue, Math.max(prev.phrase.end, cue - WHIP_S)) } : {}) });
    };
    const hold = (cs: readonly Carrier[], to: SetFrame['to'], first: ShotMove) => cs.forEach((c, i) => frame(c, to, i ? 'snap' : first));
    /** A panel's phrases one under the next, riding in the car (P, n in its frame). */
    const riding = (kind: Kind, list: readonly Phrase[], P: THREE.Vector3, n: THREE.Vector3, up = uprightFor(n)) => {
      const lays = list.map((ph) => layout(kind, ph.text, ph.solo)), H = lays.reduce((a, l) => a + l.h, 0);
      let top = H / 2;
      return list.map((ph, i) => {
        const L = lays[i]!, pos = P.clone().addScaledVector(up, top - L.h / 2); top -= L.h;
        const ride = { pos, normal: n.clone(), up: up.clone() }, at = rideAt({ ride } as Carrier, carFrame(ph.start));
        return add(kind, ph, carS(ph.start), at.center, at.normal, at.up, L, { ride });
      });
    };

    // ---- the take: the block of murals on the left, the camera riding alongside ----
    const take = lines.slice(0, 5), tps = take.flatMap((l) => phs[lines.indexOf(l)]!);
    // (the murals one after the next along the wall, the run placed so the one being sung as the car three-wheels
    // stands where the car is then: the camera drifts along them, holding each as it's sung (lineTake), the car rolling
    // through)
    // (the SLAUSON sign a size up: it stands out from the wall, the camera framed on the murals behind it)
    const lays = tps.map((ph) => (/slauson/i.test(ph.text) ? layout('street', ph.text, ph.solo, STREET_SCALE) : layout('mural', ph.text, ph.solo)));
    const offs: number[] = []; let x = 0;
    lays.forEach((l, i) => { if (i) x += lays[i - 1]!.w / 2 + MURAL.gap + l.w / 2; offs.push(x); });
    const crip = Math.max(0, tps.findIndex((ph) => /crip/i.test(ph.text))), cw = tps[crip]!;
    const base = carS(cw.start + (cw.end - cw.start) * TAKE.through) - offs[crip]!;
    let wallEnd = -Infinity, sign: Carrier | undefined;
    for (const [i, ph] of tps.entries()) {
      const slauson = /slauson/i.test(ph.text), kind: Kind = slauson ? 'street' : 'mural', lay = lays[i]!;
      const s = base + offs[i]!;
      wallEnd = s + lay.w / 2;
      const n = right(s);
      if (slauson) { // the street sign on the corner, on its pole by the curb
        const c = atRoad(s, -STREET.lateral, STREET.y);
        // (no solid of its own: a blade on a pole, and a solid would clear the block's buildings round it)
        sign = add('street', ph, s, c, n, UP.clone(), lay);
      } else add('mural', ph, s, atRoad(s, BLOCK.face + MURAL.proud, MURAL.y), n, UP.clone(), lay);
    }
    hold(carriers, lineTake(carriers, carriers.map(() => false)), 'cut');
    const chickenLine = take[4]!, chicken = carriers.filter((c) => c.phrase.line === chickenLine.i);
    const chickenS = chicken.length ? (chicken[0]!.s + chicken[chicken.length - 1]!.s) / 2 : 0;

    // ---- the car wash on the right: its sign facing the traffic, the car rolling past ----
    const wl = lines[5]!, ws = carS(wl.start + (wl.end - wl.start) * WASH.through), wn = fwd(ws).negate(), wP = atRoad(ws, WASH.lateral, WASH.y);
    const wlays = phs[5]!.map((ph) => layout('carwash', ph.text, ph.solo)), wH = wlays.reduce((a, l) => a + l.h, 0);
    let wtop = wH / 2;
    const wash = phs[5]!.map((ph, i) => { const L = wlays[i]!, c = wP.clone().addScaledVector(UP, wtop - L.h / 2); wtop -= L.h; return add('carwash', ph, ws, c, wn, UP.clone(), L, i ? {} : { solid: { at: new THREE.Vector3(0, L.h / 2 - wH / 2, -0.12), size: new THREE.Vector3(L.w + 0.3, wH + 0.3, 0.14) } }); });
    const WE = WASH.eye, washShot = lookFrom(atRoad(ws - WE.back, WE.lateral, WE.y), wP.clone().addScaledVector(right(ws), -WE.toRoad).addScaledVector(UP, -WE.down));
    hold(wash, () => washShot, 'cut');

    // ---- their car, from in front: the windshield banner, the hood's lettering ----
    const [trust, good] = phs[6]!, V = ON_CAR.visor, Hd = ON_CAR.hood;
    const visor = trust ? riding('visor', [trust], V.pos, V.normal.clone().normalize()) : [];
    const hoodUp = new THREE.Vector3(0, 0.057, -0.998).normalize(); // (its letters stand toward the windshield: read from in front)
    const hood = good ? riding('hood', [good], Hd.pos, Hd.normal.clone().normalize(), hoodUp) : [];
    const frontShot = (t: number) => lookFrom(inCar(ON_CAR.front, t), inCar(new THREE.Vector3(0, 1.05, 1.1), t));
    hold([...visor, ...hood], frontShot, 'cut');

    // ---- a whip round behind: the club plaque on the rear deck, the car laying back ----
    const P = ON_CAR.plaque, plaque = riding('plaque', phs[7]!, P.pos, P.normal);
    hold(plaque, (t) => lookFrom(inCar(ON_CAR.behind, t), inCar(P.pos, t)), 'whip');

    // ---- the giant mural of him at the end of the street, the car driving on toward it ----
    const gl = lines[8]!, gs = carS(gl.end) + GIANT.short, gf = route.frameAt(gs);
    const gn = flat(gf.fwd).negate().multiplyScalar(Math.cos(GIANT.turn)).addScaledVector(flat(gf.right), Math.sin(GIANT.turn)).normalize();
    const gP = atRoad(gs, GIANT.lateral, GIANT.y), gUp = uprightFor(gn);
    const glays = phs[8]!.map((ph) => layout('giant', ph.text, ph.solo)), gH = glays.reduce((a, l) => a + l.h, 0);
    let gtop = gH / 2;
    // (its words on the left of it, his portrait on the right: the prop paints it)
    const along = gUp.clone().cross(gn).normalize(), textX = -GIANT.w / 2 + (GIANT.w * GIANT.text) / 2;
    const giant = phs[8]!.map((ph, i) => { const L = glays[i]!, c = gP.clone().addScaledVector(gUp, gtop - L.h / 2).addScaledVector(along, textX); gtop -= L.h; return add('giant', ph, gs, c, gn, gUp.clone(), L, { ad: 'him' }); });
    const giantShot = lookFrom(atRoad(gs - GIANT.eye.short, GIANT.eye.lateral, GIANT.eye.up), gP.clone().addScaledVector(along, -2));
    hold(giant, () => giantShot, 'whip');

    // the block's buildings on the left (concrete: no; the town's kind), a side street at the SLAUSON corner; the
    // town keeps off the block and the car wash
    const blocks: Block[] = [], s0 = carS(st.start) - 5, s1 = wallEnd + 15, corner = sign ? sign.s : -Infinity;
    for (let s = s0, k = 0; s < s1; k++) {
      const w = BLOCK.w[0] + (BLOCK.w[1] - BLOCK.w[0]) * hash(k, 3, 61), e = s + w;
      if (e > corner - BLOCK.corner && s < corner + BLOCK.corner) { s = corner + BLOCK.corner; continue; }
      const h = BLOCK.h[0] + (BLOCK.h[1] - BLOCK.h[0]) * hash(k, 3, 62), mid = (s + e) / 2, lateral = BLOCK.face - BLOCK.d / 2;
      blocks.push({ s: mid, lateral, w: w - BLOCK.alley, h, d: BLOCK.d, color: hash(k, 3, 63), bare: true, matrix: boxAt(route, mid, lateral, BLOCK.d, h, w - BLOCK.alley) });
      s = e;
    }
    // the car wash's building on the right, his mural's on the left (blocks: the guard sees them)
    const washB = { s: ws + WASH.building.ds, lateral: WASH.building.lateral, w: 18, h: 4.6, d: 10 };
    blocks.push({ ...washB, color: 0.9, matrix: boxAt(route, washB.s, washB.lateral, washB.d, washB.h, washB.w) });
    const gB = gP.clone().addScaledVector(gn, -6.1), gfB = route.frameAt(gs), gLat = gB.clone().sub(gfB.pos).dot(gfB.right);
    blocks.push({ s: gs, lateral: gLat, w: GIANT.w + 2, h: GIANT.y + GIANT.h / 2 + 2, d: 12, color: 0.5, matrix: new THREE.Matrix4().makeBasis(gUp.clone().cross(gn).normalize(), UP, gn).scale(new THREE.Vector3(GIANT.w + 2, GIANT.y + GIANT.h / 2 + 2, 12)).setPosition(gB.x, ground(gs) + (GIANT.y + GIANT.h / 2 + 2) / 2, gB.z) });
    // (the town keeps off the block, the far side where the take's camera stands, the car wash and his mural)
    const clear = [{ side: -1, a: s0, b: s1 }, { side: 1, a: s0, b: s1 }, { side: 1, a: ws - 25, b: ws + 25 }, { side: -1, a: gs - 30, b: gs + 30 }];
    const backwards = lines[7]!.words.find((w) => /^backwards/i.test(w.w))?.start ?? lines[7]!.end;
    const plan: Verse2Plan = {
      chickenS,
      wash: { s: ws, sign: { center: wP, normal: wn, up: UP.clone(), w: wlays[0]?.w ?? 3.6, h: wH } },
      giant: { center: gP, normal: gn, up: gUp, w: GIANT.w, h: GIANT.h },
      layBack: backwards,
    };
    // (chorus 3's faces stand past his mural)
    return { carriers, frames, clear, blocks, plan, floor: gs + GIANT.w + 30 };
  },
};
