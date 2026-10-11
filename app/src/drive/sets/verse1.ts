// Verse 1, the city at the lights (flow plan §2): one long red light and a drive-thru, mostly from inside the car.
//   "Going too fast, don't hurt yourself"   a speed trailer by the road flashing it; the car rushes past it, braking
//   "…lies you tell yourself"                at the red, a bus stopped alongside in the other lane: its wrap ad
//   "You kinda cute… don't play yourself"    the bus bench on the corner (a whip across the car to it)
//   "I'm not the one… my man"                the pickup ahead at the light: stickers on its tailgate, MY MAN its plate
//   "You say you feel different…"            on green: the radio's display, as they pull away
//   "Compliment my energy…"                  pulled up at a burger stand: its menu board
//   "All I ask… get to dumping"              its order screen (a whip out over her door)
//   "You know I can't give no fucks…"        the receipt curling out under it
// About five cuts in thirty seconds; the rest whips between neighbouring surfaces. Pure.
import * as THREE from 'three';
import { type Carrier, type Kind, LAYOUT, carMatrix, layout, lookFrom, rideAt } from '../carriers';
import { type Phrase, phrasesOf } from '../phrases';
import { type ShotMove, LEAD, WHIP_S, downbeatAtOrAfter } from '../shots';
import { adFor, type Ad } from '../ads';
import { type Block, boxAt } from '../blocks';
import { hash } from '../../engine/util';
import { ROAD_HALF } from '../route';
import type { Placed, SetContext, SetFrame, SetPiece } from './index';

const UP = new THREE.Vector3(0, 1, 0);
const flat = (v: THREE.Vector3) => new THREE.Vector3(v.x, 0, v.z).normalize();
/** The text's up for a face with this normal: world up, made orthogonal to it. */
const uprightFor = (n: THREE.Vector3) => UP.clone().addScaledVector(n, -n.dot(UP)).normalize();

/** The pace (m/s, s): rushing in; braking to the red; away on green, braking again into the burger stand. */
export const PACE = { rush: 16, rushRamp: 0.5, brake: 1.3, stopBy: 0.15, away: 14, awayRamp: 1.8, pullIn: 1.6 };
/** Where things stand (m: s along the road from the car's centre at the red, lateral off the road's centre, y up). */
export const AT = {
  /** The speed trailer: where the car passes it (s), off the road, its display's centre's height. */
  trailer: { passAt: 31.2, lateral: ROAD_HALF + 0.9, y: 2.2 },
  /** The pickup ahead at the light (its centre) and its tailgate's half-length back; the stop line, the cross street. */
  ahead: { ds: 6.4, back: 2.75, accel: 8, vmax: 20, lead: 0.2 },
  stopLine: 9.6, cross: [12.5, 21] as [number, number], signal: 22,
  /** The bus alongside in the other lane: its ad's centre (s, lateral, y), arriving (decelerating) before the red. */
  bus: { ds: 0.9, lateral: -1.9 + 1.25 + 0.04, y: 2.1, v: 10, decel: 3, early: 0.3, accel: 2.5 },
  bench: { ds: 2, lateral: ROAD_HALF + 1.3, y: 1.05 },
  /** The burger stand, from the car's centre where it pulls in: the menu board, the order screen (turned to the
   *  street), the receipt under it. */
  menu: { ds: 1.2, lateral: ROAD_HALF + 1.3, y: 1.75 },
  order: { ds: 4, lateral: ROAD_HALF + 0.9, y: 1.5, turn: (30 * Math.PI) / 180 },
  /** The radio in the dash (the car's frame: x its left, y up, z forward), its face tipped back toward them. */
  radio: { pos: new THREE.Vector3(-0.02, 1.12, 0.52), normal: new THREE.Vector3(0, 0.3, -0.954).normalize() },
};
/** The pickup's tailgate (its top, over the road) and the plate's top on its bumper (m). */
export const TAILGATE = { top: 1.32, bottom: 0.5, plateTop: 0.51 };
/** The city's blocks round the intersection: from this far before the red to this far past the stand (m), their widths
 *  along the street, the alleys between, heights, how far back from the road's centre (behind the stand, further). */
export const CITY = { before: 26, after: 30, w: [12, 20], alley: 2.5, h: [8, 16], back: 9.5, behindStand: 15.5 };
/** The camera's places (the car's frame where inside it; m). */
export const EYE = {
  trailer: { back: 4.2, lateral: ROAD_HALF - 0.1, y: 1.15, toRoad: 0.7, down: 0.25 },
  bus: new THREE.Vector3(-0.55, 2.45, 0.05),
  bench: new THREE.Vector3(0.25, 2.25, 0.1),
  ahead: new THREE.Vector3(0, 1.7, 2),
  radio: new THREE.Vector3(-0.18, 1.42, 0.08),
  menu: new THREE.Vector3(-0.1, 2.2, 0.1),
  order: { ds: 2.6, lateral: 3.7, y: 1.65 },
  receipt: 0.7,
};

/** A panel's phrases, one under the next (read top-down): centred on P, facing n. */
function stackOn(kind: Kind, phs: readonly Phrase[], P: THREE.Vector3, n: THREE.Vector3) {
  const up = uprightFor(n), lays = phs.map((ph) => layout(kind, ph.text, ph.solo)), H = lays.reduce((a, l) => a + l.h, 0);
  let top = H / 2;
  return { H, up, items: phs.map((ph, i) => { const L = lays[i]!, c = P.clone().addScaledVector(up, top - L.h / 2); top -= L.h; return { ph, lay: L, center: c }; }) };
}

export interface Verse1Plan {
  /** When the car stops at the red, the light goes green, it pulls in at the burger stand (s). */
  red: number; green: number; pullIn: number;
  /** Where the car's centre stands at the red and at the stand (m along the road). */
  stopS: number; standS: number;
  trailerS: number;
  busAd: Ad;
  /** The panels the props are built round: centre, normal, up, size (m). */
  panels: Record<'trailer' | 'bus' | 'bench' | 'menu' | 'order' | 'receipt', { center: THREE.Vector3; normal: THREE.Vector3; up: THREE.Vector3; w: number; h: number; s: number; ground: number }>;
  /** The radio's panel in the car's frame. */
  radio: { pos: THREE.Vector3; normal: THREE.Vector3; up: THREE.Vector3; w: number; h: number };
}

/** The pickup ahead: where its centre is along the road at t (it waits at the light, and goes a beat before them). */
export const aheadS = (plan: Verse1Plan, t: number) => {
  const A = AT.ahead, s0 = plan.stopS + A.ds, go = plan.green - A.lead;
  if (t <= go) return s0;
  const tv = A.vmax / A.accel, dt = t - go;
  return s0 + (dt < tv ? 0.5 * A.accel * dt * dt : 0.5 * A.accel * tv * tv + A.vmax * (dt - tv));
};
/** The bus in the other lane (it drives the other way): its centre along the road at t. */
export const busS = (plan: Verse1Plan, t: number) => {
  const B = AT.bus, s0 = plan.stopS + B.ds, stopT = plan.red - B.early, tb = B.v / B.decel;
  if (t < stopT - tb) return s0 + (B.v * B.v) / (2 * B.decel) + B.v * (stopT - tb - t);
  if (t < stopT) return s0 + 0.5 * B.decel * (stopT - t) ** 2;
  if (t < plan.green) return s0;
  const dt = t - plan.green, tv = 14 / B.accel;
  return s0 - (dt < tv ? 0.5 * B.accel * dt * dt : 0.5 * B.accel * tv * tv + 14 * (dt - tv));
};

export const VERSE1: SetPiece = {
  speed(st, audio) {
    const [, l5, , l7, , l9] = st.lines;
    const red = l5!.start, green = downbeatAtOrAfter(audio, l7!.end), pullIn = l9!.start;
    return [
      { t: st.start, v: PACE.rush, ramp: PACE.rushRamp },
      { t: red - PACE.stopBy - PACE.brake, v: 0, ramp: PACE.brake },
      { t: green, v: PACE.away, ramp: PACE.awayRamp },
      { t: pullIn - PACE.stopBy - PACE.pullIn, v: 0, ramp: PACE.pullIn },
    ];
  },

  place(ctx: SetContext): Placed {
    const { st, audio, route, motion, carFrame } = ctx;
    const lines = st.lines, phs = lines.map((l) => phrasesOf(l, ctx.nextStart(l.i), ctx.solo));
    const red = lines[1]!.start, green = downbeatAtOrAfter(audio, lines[3]!.end), pullIn = lines[5]!.start;
    const stopS = motion.distanceAt(red), standS = motion.distanceAt(pullIn), trailerS = motion.distanceAt(AT.trailer.passAt);
    const atRoad = (s: number, lateral: number, y: number) => { const f = route.frameAt(s); return f.pos.clone().addScaledVector(f.right, lateral).addScaledVector(UP, y); };
    const right = (s: number) => flat(route.frameAt(s).right), fwd = (s: number) => flat(route.frameAt(s).fwd);
    const F0 = carFrame(red + 0.5), F1 = carFrame(pullIn + 0.5), M0 = carMatrix(F0), M1 = carMatrix(F1);
    const inCar = (M: THREE.Matrix4, p: THREE.Vector3) => p.clone().applyMatrix4(M);

    const carriers: Carrier[] = [], frames = new Map<string, SetFrame>();
    const ground = (s: number) => route.frameAt(s).pos.y;
    const add = (kind: Kind, ph: Phrase, s: number, center: THREE.Vector3, normal: THREE.Vector3, up: THREE.Vector3, lay: ReturnType<typeof layout>, extra: Partial<Carrier> = {}) => {
      const id = `L${ph.line}.${phs[lines.findIndex((l) => l.i === ph.line)]!.indexOf(ph)}`;
      const c: Carrier = { id, phrase: ph, kind, stretch: st.id, reveal: ph.start, s, center, normal, up, ...lay, foot: center.y - ground(s), solid: null, ...extra };
      carriers.push(c);
      return c;
    };
    const panels = {} as Verse1Plan['panels'];
    const panel = (name: keyof Verse1Plan['panels'], kind: Kind, list: readonly Phrase[], s: number, P: THREE.Vector3, n: THREE.Vector3, extra: Partial<Carrier> = {}) => {
      const { H, up, items } = stackOn(kind, list, P, n);
      panels[name] = { center: P, normal: n, up, w: LAYOUT[kind].w, h: H, s, ground: ground(s) };
      return items.map(({ ph, lay, center }) => add(kind, ph, s, center, n, up, lay, extra));
    };
    // (each phrase's shot: its move, from its cue; a whip leaves once the phrase before it is sung)
    const frame = (c: Carrier, to: SetFrame['to'], move: ShotMove) => {
      const prev = carriers[carriers.indexOf(c) - 1], cue = c.phrase.start - LEAD;
      frames.set(c.id, { to, move, ...(move === 'whip' && prev ? { at: Math.min(cue, Math.max(prev.phrase.end, cue - WHIP_S)) } : {}) });
    };
    const hold = (cs: readonly Carrier[], to: SetFrame['to'], first: ShotMove) => cs.forEach((c, i) => frame(c, to, i ? 'snap' : first));

    // "Going too fast": the speed trailer, from upstream of it by the road; the car rushes past the lens and brakes
    const trailerP = atRoad(trailerS, AT.trailer.lateral, AT.trailer.y), trailerN = fwd(trailerS).negate();
    const speed = panel('trailer', 'speed', phs[0]!, trailerS, trailerP, trailerN);
    const E = EYE.trailer, trailerEye = atRoad(trailerS - E.back, E.lateral, E.y);
    const trailerShot = lookFrom(trailerEye, trailerP.clone().addScaledVector(right(trailerS), -E.toRoad).addScaledVector(UP, -E.down));
    hold(speed, () => trailerShot, 'cut');

    // at the red: the bus's wrap ad alongside, over him; the bench on the corner, over her; the pickup ahead
    const busAd = adFor(lines[1]!.text, red * 1000);
    const bs = stopS + AT.bus.ds, bus = panel('bus', 'bus', phs[1]!, bs, atRoad(bs, AT.bus.lateral, AT.bus.y), right(bs), { until: green + 0.5 });
    const busShot = lookFrom(inCar(M0, EYE.bus), panels.bus.center);
    hold(bus, () => busShot, 'cut');
    const ns = stopS + AT.bench.ds, bench = panel('bench', 'bench', phs[2]!, ns, atRoad(ns, AT.bench.lateral, AT.bench.y), right(ns).negate());
    const benchShot = lookFrom(inCar(M0, EYE.bench), panels.bench.center);
    hold(bench, () => benchShot, 'whip');
    // the pickup's tailgate: two stickers across its top, one under the first, the plate on the bumper below
    const tg = stopS + AT.ahead.ds - AT.ahead.back, tgN = fwd(tg).negate(), tgUp = UP.clone(), aheadUntil = green - AT.ahead.lead;
    const [p0, p1, p2, p3] = phs[3]!;
    const stick = (ph: Phrase, kind: Kind, x: number, top: number) => {
      const lay = layout(kind, ph.text, ph.solo), c = atRoad(tg, 1.9 + x, top - lay.h / 2);
      return add(kind, ph, tg, c, tgN, tgUp, lay, { until: aheadUntil });
    };
    const TOP = TAILGATE.top - 0.06, GAP = 0.06;
    const s0 = stick(p0!, 'sticker', -0.43, TOP), s1 = stick(p1!, 'sticker', 0.43, TOP);
    const s2 = p2 ? stick(p2, 'sticker', -0.43, TOP - s0.h - GAP) : undefined;
    const plate = p3 ? stick(p3, 'plate', 0, TAILGATE.plateTop) : undefined;
    const tailgate = [s0, s1, s2, plate].filter((c): c is Carrier => !!c);
    const aim = atRoad(tg, 1.9, 0.86), aheadShot = lookFrom(inCar(M0, EYE.ahead), aim);
    hold(tailgate, () => aheadShot, 'whip');

    // on green: the radio, riding in the dash, as they pull away
    const R = AT.radio, rUp = uprightFor(R.normal), radioPhs = phs[4]!;
    const { H: rH, items: rItems } = stackOn('radio', radioPhs, R.pos, R.normal);
    const radio = rItems.map(({ ph, lay, center }) => {
      const ride = { pos: center, normal: R.normal.clone(), up: rUp.clone() };
      const at = rideAt({ ride } as Carrier, carFrame(ph.start));
      return add('radio', ph, motion.distanceAt(ph.start), at.center, at.normal, at.up, lay, { ride });
    });
    const radioShot = (t: number) => { const M = carMatrix(carFrame(t)); return lookFrom(EYE.radio.clone().applyMatrix4(M), R.pos.clone().applyMatrix4(M)); };
    hold(radio, radioShot, 'cut');

    // pulled in at the burger stand: the menu board over her; the order screen, out over her door; the receipt
    const ms = standS + AT.menu.ds, menu = panel('menu', 'menu', phs[5]!, ms, atRoad(ms, AT.menu.lateral, AT.menu.y), right(ms).negate());
    const menuShot = lookFrom(inCar(M1, EYE.menu), panels.menu.center);
    hold(menu, () => menuShot, 'cut');
    const os = standS + AT.order.ds, oN = right(os).negate().multiplyScalar(Math.cos(AT.order.turn)).addScaledVector(fwd(os), -Math.sin(AT.order.turn)).normalize();
    const order = panel('order', 'order', phs[6]!, os, atRoad(os, AT.order.lateral, AT.order.y), oN);
    const orderShot = lookFrom(atRoad(standS + EYE.order.ds, EYE.order.lateral, EYE.order.y), panels.order.center);
    hold(order, () => orderShot, 'whip');
    const rec = stackOn('receipt', phs[7]!, new THREE.Vector3(), oN);
    const recP = panels.order.center.clone().addScaledVector(panels.order.up, -(panels.order.h / 2 + 0.1 + rec.H / 2));
    const receipt = panel('receipt', 'receipt', phs[7]!, os, recP, oN);
    const receiptShot = lookFrom(recP.clone().addScaledVector(oN, EYE.receipt).addScaledVector(UP, 0.04), recP);
    hold(receipt, () => receiptShot, 'cut');

    const plan: Verse1Plan = { red, green, pullIn, stopS, standS, trailerS, busAd, panels, radio: { pos: R.pos.clone(), normal: R.normal.clone(), up: rUp, w: LAYOUT.radio.w, h: rH } };
    // the town keeps the cross street clear, both sides; the city's own blocks stand on its corners and along the
    // street, set back behind the sidewalks (behind the burger stand, further)
    const gap: [number, number] = [stopS + AT.stopLine - 2, stopS + AT.cross[1] + 6];
    const clear = [-1, 1].map((side) => ({ side, a: gap[0], b: gap[1] })), blocks: Block[] = [];
    for (const side of [-1, 1]) for (let s = stopS - CITY.before, k = 0; s < standS + CITY.after; k++) {
      const w = CITY.w[0] + (CITY.w[1] - CITY.w[0]) * hash(k, side, 31), s1 = s + w;
      if (s1 > gap[0] && s < gap[1]) { s = gap[1]; continue; }
      const back = side > 0 && s1 > standS - 6 && s < standS + 14 ? CITY.behindStand : CITY.back, d = 12 + 8 * hash(k, side, 32);
      const h = CITY.h[0] + (CITY.h[1] - CITY.h[0]) * hash(k, side, 33), mid = (s + s1) / 2, lateral = side * (back + d / 2);
      blocks.push({ s: mid, lateral, w: w - CITY.alley, h, d, color: hash(k, side, 34), matrix: boxAt(route, mid, lateral, w - CITY.alley, h, d) });
      s = s1;
    }
    return { carriers, frames, clear, blocks, plan };
  },
};
