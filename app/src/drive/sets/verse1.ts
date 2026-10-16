// Verse 1, the city at speed (flow plan §2): the car never stops (the user: stopping "ruins the flow") — but for a moment
// at a stop sign just before it, while the bus it then tails pulls out of the side street there, by the speed trailer,
// and turns into their lane (the user, 2026-10-15: at ~28 s "a bus materializes out of nowhere"; "a side street next to
// the speed limit sign ... a stop sign, which is why our car stops for a moment and it lets the bus come in and turn
// right into our lane"). Its lyrics ride on what it follows and what's in it, or stand where the camera watches it pass:
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
import { LANE } from '../drive';
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

/** The pace (m/s, s): rushing past the trailer (on from the stop sign), then cruising with the traffic. */
export const PACE = { rush: 14, rushRamp: 0.6, cruise: 11, ease: 1, easeBefore: 1.2 };
/** The stop at the end of chorus 1 (its speed keys: sets/chorus1.ts): braking over `brake` s to the stop line, there
 *  `hold` s, then away over `go` s to `goV` m/s by the verse's start. */
export const STOP = { brake: 3, hold: 0.6, go: 3, goV: 13 };
/** The side street the bus comes out of, on the right, its mouth just past the car's stop line (`line` m past its
 *  nose): its half-width; the bus's lane in it (m off its middle, toward the way the car's going), where the bus waits
 *  at its own line (its centre, m off the road's centre), where it comes down the street from (m) over `approach` s to
 *  arrive `arrive` s before the car stops, and when it pulls out (s before the car stops); the radius it turns into
 *  their lane on; its stop signs' place (m out from the street's corners) and height. */
export const SIDE = { line: 0.3, half: 4.25, lane: 2, wait: 12.1, from: 40, approach: 6, arrive: 1.5, pull: 0.6, R: 7, sign: 0.6, signH: 2.2 };
/** The bus they tailgate: it pulls out from its stop at the curb (`curb` m off the road's centre, accelerating at
 *  `accel`) into their lane `join` s before its line, `gap` m off their nose; its half-length (a 30 ft city bus: at
 *  36 ft it was "very large" pulling out across the lens — the user, 2026-10-16; SIDE.wait keeps its nose at its line); its tail ad's centre's
 *  height; it turns off right `turnAfter` s after its line, `lead` m on and round a corner of radius R, gone `gone` s
 *  later. It's only there for the verse: at its stop from `early` s before the verse. */
export const BUS = { curb: ROAD_HALF - 1.15, accel: 4, join: 0.5, gap: 2, half: 4.6, adY: 1.85, turnAfter: 0.35, lead: 2, R: 10, gone: 3, early: 3 };
/** The van that was ahead of the bus: there once the bus has turned off (`appear` s after), `gap` m off their nose once
 *  it's closed in (at `close` m/s, by `by` s before its line); away `leave` s after its line, pulling ahead (accelerating
 *  at `accel` to `top` m/s quicker than them) on up the street for the rest of the verse — it vanished 4 s after it
 *  left, still in the menu board's shot (the user, 2026-10-15: "just kind of disappears ... if it wants to pull ahead
 *  ... so it's out of frame later, that's fine"); its half-length; its back doors (bottom, top) and its stickers'
 *  middle; its plate's centre. */
export const VAN = { appear: 1.2, gap: 3, close: 3, by: 0.7, leave: 0.3, accel: 3, top: 9, half: 2.6, doors: [0.55, 2.35] as [number, number], stickersY: 1.55, plateY: 0.66 };
/** Where things stand: the speed trailer (where the car passes it, off the road, its display's height); the burger
 *  stand's menu board (passed as its line is sung, how far through) and its marquee (on along the road from the board,
 *  off the road, its centre's height). In the car (x its left, y up, z forward): her phone, the radio in the dash. */
export const AT = {
  trailer: { passAt: 31.2, lateral: ROAD_HALF + 0.9, y: 2.2 },
  menu: { through: 0.45, lateral: ROAD_HALF + 1.3, y: 1.9 },
  marquee: { ds: 7, lateral: ROAD_HALF + 2.6, y: 5 },
  /** The newsstand (scenes/sets/newsstand.ts: the user's Easter egg, 2026-10-14): where the car passes it, and its
   *  middle off the road's centre, at the back of the right's sidewalk. Passed while they tailgate the bus: from the back seat
   *  its end comes up to the right of the bus for the last second before the whip up to her visor, off the line to
   *  the tail ad (the bus hides it until then; the van shot from the hood saw it for half that). */
  newsstand: { passAt: 35.1, lateral: ROAD_HALF + 3.1 },
  phone: new THREE.Vector3(-0.15, 1.2, 0.15),
  /** Her sun visor's mirror (cabin.ts), flipped down from the windshield's top rail: how long it takes to flip down,
   *  and how much before her line's half it starts. */
  mirror: { ...VISOR.mirror, flip: 0.3, before: 0.35 },
  /** The head unit's screen (cabin.ts), the lyric across its middle. */
  radio: HEAD_UNIT,
};
/** Her texts: how far below its place (a share of its height) a new bubble comes in from, rising into it. */
export const TEXTS = { rise: 0.5 };
/** The camera's places (in the car's frame where it rides with it; m). */
export const EYE = {
  trailer: { back: 4.2, lateral: ROAD_HALF - 0.1, y: 1.15, toRoad: 0.7, down: 0.25 },
  back: new THREE.Vector3(0, 2, -0.7),
  phone: new THREE.Vector3(-0.06, 1.55, -0.12),
  // (her eye, just under the mirror's level, over the dash: in the mirror, the street behind them)
  mirror: new THREE.Vector3(-0.4, 1.4, 0.18), // (up over the dash: lower, the dash filled half the frame — the user)
  /** The bus take aims this far above its ad (m). */
  busUp: 0.7,
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
  crossS: number; start: number; end: number; joinAt: number;
  /** The side street (its middle, m along the road), when the car's stopped at its line; the bus there: when it's
   *  arrived at its line, pulls out, and how long it takes to come up to their speed (s). */
  sideS: number; stopAt: number; busArrive: number; busPull: number; busRamp: number; joinV: number; turnAt: number; closeBy: number; leaveAt: number; menuS: number;
  busAd: Ad;
  panels: Record<'trailer' | 'menu' | 'marquee', Panel>;
  /** Where the bus and van ride, ahead of the car (m, centre to centre). */
  busAhead: number; vanAhead: number;
  /** The bus's tail ad in its frame (centre, size); her phone in the car's (centre, normal, up, size) and when she holds it. */
  tailAd: { pos: THREE.Vector3; w: number; h: number };
  /** Her visor: when it flips down and back up (s). */
  visor: { down: number; up: number };
  phone: { pos: THREE.Vector3; normal: THREE.Vector3; up: THREE.Vector3; w: number; h: number; held: [number, number][] };
  /** The Read receipt under her texts (he's seen them and said nothing): in each of her two threads (held[i]) from
   *  `at` (s), under its last sent bubble — each bubble's underside (along the phone's up from its centre, m, once
   *  it's risen into place: riseAt), its phrase's start and its thread. */
  read: { at: number[]; bubbles: { carrier: Carrier; start: number; dy: number; thread: number }[] };
  /** The one oncoming car (the other lane is a lane): where it passes them (m along the road) and when (s), coming
   *  on at `v` (m/s). */
  oncoming: { s0: number; t0: number; v: number };
}

/** How far ahead of the car the van rides at t: further while the bus is between them, closing in to its gap; then
 *  away up the street. */
export const vanAheadAt = (plan: Verse1Plan, t: number) => {
  const tau = Math.max(0, t - plan.leaveAt), ramp = VAN.top / VAN.accel;
  const away = tau < ramp ? 0.5 * VAN.accel * tau * tau : 0.5 * VAN.accel * ramp * ramp + VAN.top * (tau - ramp);
  return plan.vanAhead + Math.max(0, plan.closeBy - t) * VAN.close + away;
};
/** Whether the van is there at t (from once the bus is out of its way to the verse's end: far up the street by then). */
export const vanThere = (plan: Verse1Plan, t: number) => t >= plan.turnAt + VAN.appear && t < plan.end;

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
    // the side street the bus comes out of: its mouth at the car's stop line (where chorus 1's keys stop it); the bus
    // pulls out as they come to the line, along its turn into their lane and on, coming up to their speed by the time
    // it's to ride a tailgate's length ahead of them (`busRamp`: solved for that)
    const stopAt = st.start - STOP.go - STOP.hold, sideS = carS(stopAt) + CAR_HALF + SIDE.line + SIDE.half;
    const busPull = stopAt - SIDE.pull, busArrive = stopAt - SIDE.arrive, joinV = motion.speedAt(joinAt);
    const busPath = (SIDE.wait - LANE - SIDE.R) + (Math.PI / 2) * SIDE.R, busLane0 = sideS + SIDE.lane + SIDE.R;
    const busD = busPath + carS(joinAt) + busAhead - busLane0;
    const busRamp = Math.min(joinAt - busPull, Math.max(1.5, (2 * (joinV * (joinAt - busPull) - busD)) / joinV));
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
    hold(bus.cs, (t) => lookFrom(inFrame(EYE.back, t), inFrame(adPos.clone().add(new THREE.Vector3(0, EYE.busUp, 0)), t, busAhead)), 'cut', Math.max(lines[0]!.end + 0.05, onBus!.start - LEAD - 0.35)); // (aimed above the ad: at it, the bus's top was cut)
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
    hold(radio.cs, (t) => lookFrom(inFrame(EYE.radio, t), inFrame(R.pos, t)), 'cut'); // (a whip flew in through the car's body: the user, 2026-10-14)

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
    reply.cs.forEach((c) => (c.received = true)); // (his reply: received, grey on the left — the user, 2026-10-13)
    hold(reply.cs, phoneShot, 'cut');
    // each thread a conversation anchored at its foot, as a phone's is: a new bubble rises into place from the text
    // field (TEXTS.rise of its height) and pushes the ones before it up by its own (the user, 2026-10-16: "messages
    // kind of like slide in or like expand in"; carrierart.ts pops it up from its tail); where each ends is the stack's
    for (const cs of [texts.cs, reply.cs]) cs.forEach((c, k) => (c.ride!.rise = [{ after: c, dy: TEXTS.rise * c.h }, ...cs.slice(k + 1).map((n) => ({ after: n, dy: n.h }))]));

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

    // the Read receipt: visible once her first text has landed (he's seen it and said nothing — then "but"); it sits
    // under the last sent bubble, so each bubble's underside in the car's frame
    const under = (c: Carrier, thread: number) => ({ carrier: c, start: c.phrase.start, thread, dy: c.ride!.pos.clone().sub(AT.phone).dot(texts.up) - layout('phone', c.phrase.text, c.phrase.solo).h / 2 });
    const read = {
      at: [phs[2]![0]!.start + 0.9, (phs[7]![0]?.start ?? Infinity) + 0.9],
      bubbles: [...texts.cs.map((c) => under(c, 0)), ...reply.cs.map((c) => under(c, 1))],
    };
    // the one oncoming car: past them in the other lane during the radio's insert (visible through the windshield,
    // beyond the dash: it can't stand in front of an interior surface)
    const l8 = lines[4]!, passAt = (l8.start + l8.end) / 2;
    const oncoming = { s0: carS(passAt), t0: passAt, v: PACE.cruise };
    const plan: Verse1Plan = {
      trailerS, crossS, start: st.start, end: st.end, joinAt, joinV, turnAt, sideS, stopAt, busArrive, busPull, busRamp, closeBy, leaveAt, menuS, busAd, panels, busAhead, vanAhead,
      tailAd: { pos: adPos, w: LAYOUT.bus.w, h: bus.H },
      visor: { down: visorDown, up: l6.start + 0.3 },
      phone: { pos: AT.phone.clone(), normal: phoneN, up: texts.up, w: LAYOUT.phone.w, h: Math.max(texts.H, reply.H) + 0.04, held },
      read, oncoming,
    };
    // (the side street's corners clear of the town's buildings, and its mouth open)
    clear.push({ side: 1, a: sideS - SIDE.half - 12, b: sideS + SIDE.half + 12 });
    return { carriers, frames, clear, blocks, plan, openings: [...[-1, 1].map((side) => ({ side, a: crossS - 4.25, b: crossS + 4.25 })), { side: 1, a: sideS - SIDE.half, b: sideS + SIDE.half }] };
  },
};
