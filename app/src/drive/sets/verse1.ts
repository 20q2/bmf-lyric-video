// Verse 1, the city at speed (flow plan §2): the car never stops (the user: stopping "ruins the flow"). Its lyrics
// ride on what it follows and what's in it, or stand where the camera watches it pass:
//   "Going too fast, don't hurt yourself"   a speed trailer by the road flashing it; the car rushes past the lens
//   "I can't keep up with"                   the bus they're tailgating: its tail ad, from the back seat
//   "…all the lies you tell yourself"        in the pause after "with" (the user's pick), up to her visor flipping
//                                            down: written on its mirror in her lipstick
//   "You kinda cute… don't play yourself"    her phone: the texts she's sending, bubble by bubble
//   "I'm not the one… my man"                the bus turns off: the van ahead, its back doors stickered, MY MAN its plate
//   "You say you feel different…"            the radio's display
//   "Compliment my energy…"                  a burger stand's menu board, the car passing it
//   "All I ask… get to dumping"              the stand's marquee up on its pole, the car away down the street
//   "…can you?"                              back on her phone
// Cuts into the trailer, onto the bus, onto the stand, back to the phone; whips between the rest. Pure.
import * as THREE from 'three';
import { type Carrier, type Kind, LAYOUT, carMatrix, layout, lookFrom, rideAt } from '../carriers';
import { type Phrase, phraseOf, phrasesOf } from '../phrases';
import { ROAD_HALF } from '../route';
import { type ShotMove, LEAD, WHIP_S } from '../shots';
import { adFor, type Ad } from '../ads';
import { type Block, boxAt } from '../blocks';
import { hash } from '../../engine/util';
import { HEAD_UNIT, VISOR } from '../cabin';
import type { Placed, SetContext, SetFrame, SetPiece } from './index';

const UP = new THREE.Vector3(0, 1, 0);
const flat = (v: THREE.Vector3) => new THREE.Vector3(v.x, 0, v.z).normalize();
/** The text's up for a face with this normal: world up, made orthogonal to it. */
const uprightFor = (n: THREE.Vector3) => UP.clone().addScaledVector(n, -n.dot(UP)).normalize();
/** The car's half-length (m: world.ts CAR). */
const CAR_HALF = 2.7;

/** The pace (m/s, s): rushing past the trailer, then cruising with the traffic. */
export const PACE = { rush: 16, rushRamp: 0.5, cruise: 11, ease: 1, easeBefore: 1.2 };
/** The bus they tailgate: it pulls out from its stop at the curb (`curb` m off the road's centre, accelerating at
 *  `accel`) into their lane `join` s before its line, `gap` m off their nose; its half-length; its tail ad's centre's
 *  height; it turns off right `turnAfter` s after its line, `lead` m on and round a corner of radius R, gone `gone` s
 *  later. It's only there for the verse: at its stop from `early` s before the verse. */
export const BUS = { curb: ROAD_HALF - 1.15, accel: 4, join: 0.5, gap: 2, half: 5.5, adY: 1.85, turnAfter: 0.35, lead: 2, R: 10, gone: 3, early: 3 };
/** The van that was ahead of the bus: there once the bus has turned off (`appear` s after), `gap` m off their nose once
 *  it's closed in (at `close` m/s, by `by` s before its line); away `leave` s after its line (accelerating at `accel`),
 *  gone `gone` s later; its half-length; its back doors (bottom, top) and its stickers' middle; its plate's centre. */
export const VAN = { appear: 1.2, gap: 3, close: 3, by: 0.7, leave: 0.3, accel: 6, gone: 4, half: 2.6, doors: [0.55, 2.35] as [number, number], stickersY: 1.55, plateY: 0.66 };
/** Where things stand: the speed trailer (where the car passes it, off the road, its display's height); the burger
 *  stand's menu board (passed as its line is sung, how far through) and its marquee (on along the road from the board,
 *  off the road, its centre's height). In the car (x its left, y up, z forward): her phone, the radio in the dash. */
export const AT = {
  trailer: { passAt: 31.2, lateral: ROAD_HALF + 0.9, y: 2.2 },
  menu: { through: 0.45, lateral: ROAD_HALF + 1.3, y: 1.9 },
  marquee: { ds: 7, lateral: ROAD_HALF + 2.6, y: 5 },
  phone: new THREE.Vector3(-0.15, 1.2, 0.15),
  /** Her sun visor's mirror (cabin.ts), flipped down from the windshield's top rail: how long it takes to flip down,
   *  and how much before her line's half it starts. */
  mirror: { ...VISOR.mirror, flip: 0.3, before: 0.35 },
  /** The head unit's screen (cabin.ts), the lyric across its middle. */
  radio: HEAD_UNIT,
};
/** The camera's places (in the car's frame where it rides with it; m). */
export const EYE = {
  trailer: { back: 4.2, lateral: ROAD_HALF - 0.1, y: 1.15, toRoad: 0.7, down: 0.25 },
  back: new THREE.Vector3(0, 2, -0.7),
  phone: new THREE.Vector3(-0.06, 1.55, -0.12),
  // (her eye, just under the mirror's level, over the dash: in the mirror, the street behind them)
  mirror: new THREE.Vector3(-0.4, 1.27, 0.3),
  hood: new THREE.Vector3(0, 1.62, 2.3),
  radio: new THREE.Vector3(-0.12, 1.5, -0.1),
  menu: { back: 4.2, lateral: ROAD_HALF + 0.2, y: 1.35, toRoad: 0.6, down: 0.2 },
  marquee: { past: 1, lateral: ROAD_HALF - 0.2, y: 2.2 },
};
/** The city's blocks along the street: their widths along it, the alleys between, heights, how far back from the
 *  road's centre (behind the burger stand, further). */
export const CITY = { w: [12, 20] as [number, number], alley: 2.5, h: [8, 16] as [number, number], back: 9.5, behindStand: 15.5 };

/** A panel's phrases, one under the next (read top-down): centred on P, facing n. */
function stackOn(kind: Kind, phs: readonly Phrase[], P: THREE.Vector3, n: THREE.Vector3) {
  const up = uprightFor(n), lays = phs.map((ph) => layout(kind, ph.text, ph.solo)), H = lays.reduce((a, l) => a + l.h, 0);
  let top = H / 2;
  return { H, up, items: phs.map((ph, i) => { const L = lays[i]!, c = P.clone().addScaledVector(up, top - L.h / 2); top -= L.h; return { ph, lay: L, center: c }; }) };
}

interface Panel { center: THREE.Vector3; normal: THREE.Vector3; up: THREE.Vector3; w: number; h: number; s: number; ground: number }
export interface Verse1Plan {
  trailerS: number;
  /** The cross street the bus turns into (its middle, m along the road); the verse's start; when the bus has joined
   *  their lane (and its speed then), starts to turn; when the van has closed in and when it leaves; the menu board
   *  (m along the road). */
  crossS: number; start: number; joinAt: number; joinV: number; turnAt: number; closeBy: number; leaveAt: number; menuS: number;
  busAd: Ad;
  panels: Record<'trailer' | 'menu' | 'marquee', Panel>;
  /** Where the bus and van ride, ahead of the car (m, centre to centre). */
  busAhead: number; vanAhead: number;
  /** The bus's tail ad in its frame (centre, size); her phone in the car's (centre, normal, up, size) and when she holds it. */
  tailAd: { pos: THREE.Vector3; w: number; h: number };
  /** Her visor: when it flips down and back up (s). */
  visor: { down: number; up: number };
  phone: { pos: THREE.Vector3; normal: THREE.Vector3; up: THREE.Vector3; w: number; h: number; held: [number, number][] };
}

/** How far ahead of the car the van rides at t: further while the bus is between them, closing in to its gap; then
 *  away up the street. */
export const vanAheadAt = (plan: Verse1Plan, t: number) => plan.vanAhead + Math.max(0, plan.closeBy - t) * VAN.close + 0.5 * VAN.accel * Math.max(0, t - plan.leaveAt) ** 2;
/** Whether the van is there at t (from once the bus is out of its way until it's away up the street). */
export const vanThere = (plan: Verse1Plan, t: number) => t >= plan.turnAt + VAN.appear && t < plan.leaveAt + VAN.gone;

export const VERSE1: SetPiece = {
  speed(st) {
    const l5 = st.lines[1]!;
    return [
      { t: st.start, v: PACE.rush, ramp: PACE.rushRamp },
      { t: l5.start - PACE.easeBefore, v: PACE.cruise, ramp: PACE.ease },
    ];
  },

  place(ctx: SetContext): Placed {
    const { st, route, motion, carFrame } = ctx;
    const lines = st.lines, phs = lines.map((l) => phrasesOf(l, ctx.nextStart(l.i), ctx.solo));
    // ("I can't keep up with | all the lies you tell yourself": split at the line's longest pause, after "with", where
    // it moves from the bus to her mirror; the rest phrased as usual)
    {
      const l = lines[1]!, ws = l.words, gaps = ws.slice(1).map((w, k) => w.start - ws[k]!.end), k = gaps.indexOf(Math.max(...gaps)) + 1;
      phs[1] = [phraseOf(l, 0, k, ctx.solo), ...phrasesOf({ ...l, words: ws.slice(k) }, ctx.nextStart(l.i), ctx.solo)];
    }
    // ("You kinda cute, | But | play too much, don't play yourself": three texts, "But" on its own to land the beat (the
    // user, 2026-10-12))
    {
      const l = lines[2]!, ws = l.words, but = ws.findIndex((w) => /^but$/i.test(w.w));
      if (but > 0 && but < ws.length - 1) phs[2] = [phraseOf(l, 0, but, ctx.solo), phraseOf(l, but, but + 1, ctx.solo), phraseOf(l, but + 1, ws.length, ctx.solo)];
    }
    const l5 = lines[1]!, l6 = lines[2]!, l7 = lines[3]!, l9 = lines[5]!, l11 = lines[7]!;
    const carS = (t: number) => motion.distanceAt(t);
    const busAhead = CAR_HALF + BUS.gap + BUS.half, vanAhead = CAR_HALF + VAN.gap + VAN.half;
    const turnAt = l5.end + BUS.turnAfter, closeBy = l7.start - VAN.by, leaveAt = l7.end + VAN.leave, joinAt = l5.start - BUS.join;
    const crossS = carS(turnAt) + busAhead + BUS.lead + BUS.R;
    const menuS = carS(l9.start + (l9.end - l9.start) * AT.menu.through), trailerS = carS(AT.trailer.passAt);
    const atRoad = (s: number, lateral: number, y: number) => { const f = route.frameAt(s); return f.pos.clone().addScaledVector(f.right, lateral).addScaledVector(UP, y); };
    const right = (s: number) => flat(route.frameAt(s).right), fwd = (s: number) => flat(route.frameAt(s).fwd);
    const ground = (s: number) => route.frameAt(s).pos.y;
    /** A point in the frame of the car (or the vehicle `ahead` of it) at t. */
    const inFrame = (p: THREE.Vector3, t: number, ahead = 0) => p.clone().applyMatrix4(carMatrix(carFrame(t, ahead)));

    const carriers: Carrier[] = [], frames = new Map<string, SetFrame>();
    const idOf = (ph: Phrase) => `L${ph.line}.${phs[lines.findIndex((l) => l.i === ph.line)]!.indexOf(ph)}`;
    const add = (kind: Kind, ph: Phrase, s: number, center: THREE.Vector3, normal: THREE.Vector3, up: THREE.Vector3, lay: ReturnType<typeof layout>, extra: Partial<Carrier> = {}) => {
      const c: Carrier = { id: idOf(ph), phrase: ph, kind, stretch: st.id, reveal: ph.start, s, center, normal, up, ...lay, foot: center.y - ground(s), solid: null, ...extra };
      carriers.push(c);
      return c;
    };
    const panels = {} as Verse1Plan['panels'];
    /** A panel standing by the road; its first phrase carries the panel's backing and frame (`over` m of header over
     *  it), so the guard sees what can stand in a shot's way. */
    const panel = (name: keyof Verse1Plan['panels'], kind: Kind, list: readonly Phrase[], s: number, P: THREE.Vector3, n: THREE.Vector3, over = 0.5) => {
      const { H, up, items } = stackOn(kind, list, P, n), w = LAYOUT[kind].w;
      panels[name] = { center: P, normal: n, up, w, h: H, s, ground: ground(s) };
      return items.map(({ ph, lay, center }, i) => add(kind, ph, s, center, n, up, lay, i ? {} : {
        solid: { at: new THREE.Vector3(0, lay.h / 2 - H / 2 + over / 2, -0.12), size: new THREE.Vector3(w + 0.3, H + over + 0.2, 0.14) },
      }));
    };
    /** A panel riding in the car, or on the vehicle `ahead` of it (P, n in that frame). */
    const riding = (kind: Kind, list: readonly Phrase[], P: THREE.Vector3, n: THREE.Vector3, ahead: number, extra: Partial<Carrier> = {}) => {
      const { H, up, items } = stackOn(kind, list, P, n);
      return { H, up, cs: items.map(({ ph, lay, center }) => {
        const ride = { pos: center, normal: n.clone(), up: up.clone(), ahead };
        const at = rideAt({ ride } as Carrier, carFrame(ph.start, ahead));
        return add(kind, ph, carS(ph.start) + ahead, at.center, at.normal, at.up, lay, { ride, ...extra });
      }) };
    };
    // (each phrase's shot: its move, from its cue; a whip leaves once the phrase before it is sung)
    const frame = (c: Carrier, to: SetFrame['to'], move: ShotMove, at?: number) => {
      const prev = carriers[carriers.indexOf(c) - 1], cue = c.phrase.start - LEAD;
      frames.set(c.id, { to, move, ...(at !== undefined ? { at } : move === 'whip' && prev ? { at: Math.min(cue, Math.max(prev.phrase.end, cue - WHIP_S)) } : {}) });
    };
    const hold = (cs: readonly Carrier[], to: SetFrame['to'], first: ShotMove, at?: number) => cs.forEach((c, i) => frame(c, to, i ? 'snap' : first, i ? undefined : at));

    // "Going too fast": the speed trailer, from upstream of it by the road; the car rushes past the lens
    const trailerP = atRoad(trailerS, AT.trailer.lateral, AT.trailer.y), trailerN = fwd(trailerS).negate();
    const speed = panel('trailer', 'speed', phs[0]!, trailerS, trailerP, trailerN);
    const E = EYE.trailer, trailerShot = lookFrom(atRoad(trailerS - E.back, E.lateral, E.y), trailerP.clone().addScaledVector(right(trailerS), -E.toRoad).addScaledVector(UP, -E.down));
    hold(speed, () => trailerShot, 'cut');

    // the bus they're tailgating: its tail ad, from the back seat (cut to as the trailer's line ends: its one phrase
    // has five words to be read in)
    const busAd = adFor(l5.text, l5.start * 1000), back = new THREE.Vector3(0, 0, -1);
    const adPos = new THREE.Vector3(0, BUS.adY, -BUS.half - 0.03);
    const [onBus, ...inMirror] = phs[1]!;
    const bus = riding('bus', [onBus!], adPos, back, busAhead, { ad: busAd, from: joinAt, until: turnAt });
    hold(bus.cs, (t) => lookFrom(inFrame(EYE.back, t), inFrame(adPos, t, busAhead)), 'cut', Math.max(lines[0]!.end + 0.05, onBus!.start - LEAD - 0.35));
    // in the pause after "with": up to her visor, flipping down, the rest of the line on its mirror in her lipstick
    const Mi = AT.mirror, visorDown = (inMirror[0]?.start ?? l5.end) - Mi.before;
    // (a hair off the glass: in front of it, and left out of its reflection)
    const mirror = riding('mirror', inMirror, Mi.pos.clone().addScaledVector(Mi.normal, 0.004), Mi.normal, 0, { from: visorDown + Mi.flip * 0.5, until: l6.start });
    hold(mirror.cs, (t) => lookFrom(inFrame(EYE.mirror, t), inFrame(Mi.pos, t)), 'whip');

    // her phone: the texts she's sending (and, at the end, "…can you?"), over her shoulder
    const phoneN = EYE.phone.clone().sub(AT.phone).normalize();
    const phoneShot = (t: number) => lookFrom(inFrame(EYE.phone, t), inFrame(AT.phone, t));
    const held: [number, number][] = [[l6.start - 0.6, l7.start], [l11.start - 0.6, st.end + 0.5]];
    const texts = riding('phone', phs[2]!, AT.phone, phoneN, 0, { from: held[0]![0], until: held[0]![1] });
    hold(texts.cs, phoneShot, 'whip');

    // the bus turns off: the van ahead, closed in, its back doors stickered, MY MAN its plate; from over the hood
    const doors = new THREE.Vector3(0, VAN.stickersY, -VAN.half - 0.02), [p0, p1, p2, p3] = phs[3]!;
    const stickers = riding('sticker', [p0, p1, p2].filter((p): p is Phrase => !!p), doors, back, vanAhead, { from: closeBy, until: leaveAt }).cs;
    const plate = p3 ? riding('plate', [p3], new THREE.Vector3(0, VAN.plateY, -VAN.half - 0.06), back, vanAhead, { from: closeBy, until: leaveAt }).cs : [];
    const vanAim = new THREE.Vector3(0, (VAN.stickersY + VAN.plateY) / 2 + 0.25, -VAN.half);
    hold([...stickers, ...plate], (t) => lookFrom(inFrame(EYE.hood, t), inFrame(vanAim, t, vanAhead)), 'whip');

    // the radio, riding in the dash
    const R = AT.radio, radio = riding('radio', phs[4]!, R.pos, R.normal, 0, { until: l9.start }); // (off once the camera's away: it'd show behind her phone)
    hold(radio.cs, (t) => lookFrom(inFrame(EYE.radio, t), inFrame(R.pos, t)), 'whip');

    // the burger stand: its menu board facing the traffic, the car passing it; its marquee up on its pole
    const menuP = atRoad(menuS, AT.menu.lateral, AT.menu.y), standN = fwd(menuS).negate();
    const menu = panel('menu', 'menu', phs[5]!, menuS, menuP, standN);
    const M = EYE.menu, menuShot = lookFrom(atRoad(menuS - M.back, M.lateral, M.y), menuP.clone().addScaledVector(right(menuS), -M.toRoad).addScaledVector(UP, -M.down));
    hold(menu, () => menuShot, 'cut');
    const ms = menuS + AT.marquee.ds, marqueeP = atRoad(ms, AT.marquee.lateral, AT.marquee.y);
    const marquee = panel('marquee', 'marquee', phs[6]!, ms, marqueeP, fwd(ms).negate());
    // (from past the menu board, on the road's edge: the car's away down the street by then)
    const marqueeShot = lookFrom(atRoad(menuS + EYE.marquee.past, EYE.marquee.lateral, EYE.marquee.y), marqueeP);
    hold(marquee, () => marqueeShot, 'whip');

    // "…can you?": back on her phone
    const reply = riding('phone', phs[7]!, AT.phone, phoneN, 0, { from: held[1]![0], until: held[1]![1] });
    hold(reply.cs, phoneShot, 'cut');

    // the city: blocks along the street from the trailer on (before it they'd stand in chorus 1's sky), set back behind
    // the sidewalks; the cross street the bus turns into open; behind the burger stand, further back
    const s0 = trailerS + 10, s1 = carS(st.end) + 10, gap: [number, number] = [crossS - 8, crossS + 8];
    const clear = [-1, 1].map((side) => ({ side, a: gap[0], b: gap[1] })), blocks: Block[] = [];
    for (const side of [-1, 1]) for (let s = s0, k = 0; s < s1; k++) {
      const w = CITY.w[0] + (CITY.w[1] - CITY.w[0]) * hash(k, side, 31), e = s + w;
      if (e > gap[0] && s < gap[1]) { s = gap[1]; continue; }
      const behind = side > 0 && e > menuS - 14 && s < menuS + AT.marquee.ds + 12, d = 12 + 8 * hash(k, side, 32);
      const h = CITY.h[0] + (CITY.h[1] - CITY.h[0]) * hash(k, side, 33), mid = (s + e) / 2, lateral = side * ((behind ? CITY.behindStand : CITY.back) + d / 2);
      blocks.push({ s: mid, lateral, w: w - CITY.alley, h, d, color: hash(k, side, 34), matrix: boxAt(route, mid, lateral, d, h, w - CITY.alley) });
      s = e;
    }

    const plan: Verse1Plan = {
      trailerS, crossS, start: st.start, joinAt, joinV: motion.speedAt(joinAt), turnAt, closeBy, leaveAt, menuS, busAd, panels, busAhead, vanAhead,
      tailAd: { pos: adPos, w: LAYOUT.bus.w, h: bus.H },
      visor: { down: visorDown, up: l6.start + 0.3 },
      phone: { pos: AT.phone.clone(), normal: phoneN, up: texts.up, w: LAYOUT.phone.w, h: Math.max(texts.H, reply.H) + 0.04, held },
    };
    return { carriers, frames, clear, blocks, plan };
  },
};
