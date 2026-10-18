// Verse 2, Slauson (flow plan §4; the user, 2026-10-12: the murals read as floating text — "a chicken PLACE with signs
// in front of it would be way better"): low and slow off the freeway into the neighbourhood, lowrider pace, the lyrics
// on the signs of a hardware store on the corner of Slauson (Mr. Handle It's) and, past it, a fried chicken spot with
// its chicken standing on its roof — its own thing for its one line (the user, 2026-10-13: don't foreshadow the
// chicken). A take a line, cut between lines; the car never stops:
//   "Ooh, he bossy, ooh, he crip walkin'"      the hardware store's tall pole sign's lightbox at the curb, from low
//                                               across the street: the car three-wheels past under it
//   "Took me | to Slauson | and he slut me out" a chalk A-frame, the SLAUSON street blade on the corner, another A-frame
//                                               past it, from the far lane, drifting along them
//   "And when I got a problem, he get to packing"   posters taped in the hardware store's front windows
//   "He 'bout all that action, call him Mr. Handle It"  its vinyl banner under its sign board, the man himself beside
//                                               it: a fibreglass giant on the sidewalk, a wrench over his shoulder
//   "You know I'm hella different… trickin' on"  the chicken spot's big roof sign, the chicken standing on it, from below
//   "I can be your ride or die…"               a hand car wash's '60s sign in its lot: the words flush left on its board,
//                                               its mascot right, a breaking wave over it
//   "Trust me, boy, I'm good in every hood"     their own car, from in front: the windshield banner, the hood
//   "Trickin', finna fall in backwards"         a whip round behind, low: TRICKIN' on their plate, the rest on bumper
//                                               stickers, as the car lays back on its hydraulics
//   "I'm just tryna show you… my man"          a big painted billboard up the street, on the sand where the coast
//                                               begins, the car driving on toward it (into chorus 3)
// Pure.
import * as THREE from 'three';
import { type Carrier, type Kind, LAYOUT, STREET, carMatrix, glideTake, layout, lookFrom, rideAt } from '../carriers';
import { type Phrase, phraseOf, phrasesOf } from '../phrases';
import { ROAD_HALF } from '../route';
import { type ShotMove, LEAD, WHIP_S } from '../shots';
import { BACK, type Block, boxAt } from '../blocks';
import { CAR } from '../world';
import { facadeTraits } from '../../look/facades';
import type { Placed, SetContext, SetFrame, SetPiece } from './index';

const UP = new THREE.Vector3(0, 1, 0);
const flat = (v: THREE.Vector3) => new THREE.Vector3(v.x, 0, v.z).normalize();
const uprightFor = (n: THREE.Vector3) => UP.clone().addScaledVector(n, -n.dot(UP)).normalize();
const smooth = (a: number, b: number, x: number) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };

/** The pace (m/s): crawling past the chicken spot; up to cruising this long before the car wash's line, over `up` s. */
export const PACE = { slow: 5.5, cruise: 10, upBefore: 1.6, up: 1.2 };
/** The chicken spot, on the left (m; along the road from where the car is as the named words are sung):
 *  pole     its tall sign at the curb (a little short of where the car is on "crip"), its lightbox's centre's
 *           height, turned toward the coming car (radians)
 *  corner   the side street, Slauson (where the car is as it's named; its width), its street blade on the near corner
 *  aframes  the chalk A-frames: the first short of the corner (from its near edge), the second under the blade (on
 *           from it: read together, the blade over it), off the road, their middles' height, turned
 *  shop     the hardware store past the corner (its start), its length, its front off the road's centre, its depth and
 *           height; its two windows (centres from its start, width, height, middle's height); the banner under its
 *           sign board (centre from its start, its middle's height); Mr. Handle It himself, a fibreglass giant on the
 *           sidewalk past the banner (from its start, out from its front)
 *  chicken  the chicken spot past it (the gap between), its length, depth and height; the sign on its roof (centre
 *           from its start, over the roof) */
export const SHACK = {
  pole: { lateral: -(ROAD_HALF + 1.6), y: 5.8, turn: 0.55, before: 5 },
  corner: { w: 9, blade: -2.4, lateral: -(ROAD_HALF + 1.2) }, // (the blade and the A-frame under it clear of the crosswalk)
  aframes: { first: 6.5, second: 1, lateral: -(ROAD_HALF + 2.4), y: 0.95, turn: 0.5 },
  // (the banner between the awnings and the sign board, the front tall enough for its four rows: under a 6.6 m eave its
  // top ran behind the fascia and its foot through the window's head — "the grand opening thing's clipping into other
  // stuff", the user, 2026-10-14; the windows wide enough to show the shop round their posters)
  shop: { from: 3, len: 23, face: -(ROAD_HALF + 5), d: 14, h: 7.9, windows: [4.4, 13.6], window: { w: 7, h: 2.5, y: 2.05 }, banner: { at: 11.5, y: 5.25 }, statue: { at: 17.9, out: 1.9 } },
  // (it stands level where the road falls ~5 cm a metre: its floor a step up from its apron at its door, the apron flush
  // with the sidewalk, `kerb` over the grade; its foundation shows at its low end)
  chicken: { gap: 5, len: 15, d: 13, h: 4.6, sign: { at: 7.5, over: 1.4 }, step: 0.15, kerb: 0.15 },
};
/** The takes (m): the pole sign's, from the right sidewalk back up the street (back of the sign, off the road's centre,
 *  up, drifting on, m/s); the corner's, from out along their facing (how far, how high): the first A-frame close, then
 *  the blade and the A-frame under it together; the shop's from across the street, along its faces (back of the first,
 *  off the road's centre, up; on past the last by the line's end). */
export const SHOTS = {
  pole: { back: 8, lateral: ROAD_HALF + 1.4, y: 1.3, drift: 0.4 },
  corner: { aframe: { out: 4.6, y: 1.7 }, pair: { out: 7, y: 2.2 } },
  windows: { back: 4, lateral: 3, y: 2.5, end: 3 },
  // (up and nearer for the banner under the sign board; from far enough back that the man himself, past it, is in the
  // frame as he's named)
  banner: { back: 5.5, lateral: 2.0, y: 2.4, end: 2 },
  sign: { back: 12.5, lateral: ROAD_HALF + 2, y: 3, end: 3 },
};
/** The car wash on the right: its sign (off the road's centre, its board's centre's height; passed this far through its
 *  line), its board round the words (its width; header over them, footer under, the margin on the left; the suds right
 *  of them; m), the camera upstream on the sidewalk (back of the sign, off the road's centre, up; its aim off the
 *  board's centre toward the road and up, taking in the wave over it); its building.
 *  (The sign stands in the wash's lot behind the sidewalk, its road-side edge 0.2 m past the sidewalk's back. Its
 *  board ran from 1.1 m out over the road to the sidewalk's back at 1.6 m up: the traffic's heads and the passers-by
 *  walked into it. The camera stands back far enough for the whole cabinet and its wave over the top of its stand, the
 *  type ~60 px.) */
export const WASH = { building: { ds: 14, lateral: 17 }, lateral: ROAD_HALF + 6.35, y: 4.4, through: 0.5, board: { w: 5.8, head: 0.8, gap: 0.15, foot: 0.55, pad: 0.25 }, eye: { back: 9.0, lateral: ROAD_HALF + 2.4, y: 2.6, toRoad: 1.0, up: 0.3 } };
/** The tire shop across the road past the car wash: the town's block (blocks.ts) whose near end stands in the wash
 *  sign's shot, a blank stucco wall face-on to its camera (the user, 2026-10-18: "at 97.3, on the left side of the tire
 *  shop building, add some interest there, it's too blank"), which the set dresses as a tire shop's side
 *  (scenes/sets/verse2.ts). The nearest block in the street's row on the road's left whose near end is `from`–`to` m
 *  past the wash's sign, with a blank end at least `minH` m tall (a shop with no floor over its storefront, no corner
 *  shop round it: room for a painted panel over a door); else none. The town signs it TIRES (VERSE2.shops: it was found
 *  by its name, which the town's dealing of the names, drive/shops.ts, no longer leaves where it was). */
export const TIRE_SHOP = { from: 10, to: 70, minH: 6 };
export function tireShop(blocks: readonly Block[], washS: number): Block | undefined {
  return blocks
    .filter((b) => b.lateral < 0 && b.lateral > -BACK.from && !b.concrete && !b.prop && !b.car && !b.corner && b.h >= TIRE_SHOP.minH && b.s - b.w / 2 > washS + TIRE_SHOP.from && b.s - b.w / 2 < washS + TIRE_SHOP.to)
    .sort((a, b) => a.s - b.s)
    .find((b) => { const t = facadeTraits(b, { vary: true }); return !t.apartments && !t.upper; }); // (as the town builds it: drive/world.ts)
}
/** On their car (its frame: x its left, y up, z forward): the windshield banner, the hood's lettering; their plate
 *  between the tail lights, the bumper stickers on the rear bumper either side (sized from the van's: `scale`); the
 *  camera high in front, and low behind. */
export const ON_CAR = {
  visor: { pos: new THREE.Vector3(0, 1.327, 0.925), normal: new THREE.Vector3(0, 0.247, 0.969) },
  hood: { pos: new THREE.Vector3(0, 1.0, 1.62), normal: new THREE.Vector3(0, 0.998, 0.057) },
  plate: { pos: new THREE.Vector3(0, 0.7, -CAR.length / 2 - 0.1), scale: 0.72 },
  stickers: { y: 0.42, x: 0.52, z: -CAR.length / 2 - 0.14, scale: 0.44 },
  // (behind: room under the stickers for the tail dropping as it lays back)
  front: new THREE.Vector3(0, 2.6, 4.4), behind: new THREE.Vector3(0, 1.0, -5), behindAim: new THREE.Vector3(0, 0.48, -2.7),
};
/** The big painted billboard at the end of the street, on the sand where the coast begins: where the car is when its
 *  line ends (m short of it), off to the left, its face's centre's height, turned toward the coming car, its face's
 *  size and its words' share of it; the camera waits in the street before it (m short of it, off the road's centre,
 *  up), the car driving up into the frame.
 *  (It was a mural on the end wall of a building standing on the boardwalk — "it's in the middle of, like, the
 *  boardwalk, and someone's about to walk into it", the user, 2026-10-16. Now a billboard on its own steel on the
 *  sand: its near leg ~5 m past the boardwalk's sand-side edge, its face up on its legs from 4.2 m, its frame, catwalk and
 *  lamps clear of the boardwalk overhead too.) */
export const GIANT = { short: 20, lateral: -21, y: 9.45, turn: (35 * Math.PI) / 180, w: 22, h: 10.5, text: 0.62, eye: { short: 19, lateral: -1.5, up: 2.2 } };

interface Face { center: THREE.Vector3; normal: THREE.Vector3; up: THREE.Vector3; w: number; h: number }
export interface Verse2Plan {
  /** The pole sign (its lightbox), the side street (its middle, width), the blade's pole, the A-frames (their boards). */
  pole: Face & { s: number };
  corner: { s: number; w: number; blade: number };
  aframes: (Face & { s: number })[];
  /** The hardware store: its block, its windows (centres along the road), its banner (its face); the chicken spot: its
   *  block and its roof sign (its face). */
  shop: Block;
  windows: number[];
  banner: Face;
  chicken: Block;
  sign: Face;
  wash: { s: number; board: Face };
  giant: Face;
  /** Its face and frame, up on its legs (the guard's block). */
  giantBlock: Block;
  /** The chicken spot's floor (its height: it stands level on the falling road). */
  chickenFloor: number;
  /** When the car lays back (the word "backwards"), when the word "chickens" lands (the roof chicken hops), and when Mr.
   *  Handle It winks (as he's named: "Handle"). */
  layBack: number;
  chickens: number;
  wink: number;
}

export const VERSE2: SetPiece = {
  shops: (plan, blocks) => { const b = tireShop(blocks, (plan as Verse2Plan).wash.s); return b ? [[b, 'TIRES'] as const] : []; },
  speed(st, audio) {
    const bar = 240 / audio.bpm, wash = st.lines[5];
    return [
      { t: st.start, v: PACE.slow, ramp: bar },
      ...(wash ? [{ t: wash.start - PACE.upBefore, v: PACE.cruise, ramp: PACE.up }] : []),
    ];
  },

  place(ctx: SetContext): Placed {
    const { st, route, motion, carFrame } = ctx;
    const lines = st.lines, phs = lines.map((l) => phrasesOf(l, ctx.nextStart(l.i), ctx.solo));
    // ("Took me | to Slauson | and he slut me out": the street's name on its own, on its blade)
    {
      const l = lines[1]!, ws = l.words, to = ws.findIndex((w) => /^to$/i.test(w.w)), and = ws.findIndex((w) => /^slauson/i.test(w.w)) + 1;
      if (to > 0 && and > to && and < ws.length) phs[1] = [phraseOf(l, 0, to, ctx.solo), phraseOf(l, to, and, ctx.solo), phraseOf(l, and, ws.length, ctx.solo)];
    }
    // ("You know I'm hella different | from them chickens | you been trickin' on": "chickens" a phrase's end, under the
    // chicken)
    {
      const l = lines[4]!, ws = l.words, from = ws.findIndex((w) => /^from$/i.test(w.w)), you = ws.findIndex((w, k) => k > from && /^you$/i.test(w.w));
      if (from > 0 && you > from + 1 && you < ws.length) phs[4] = [phraseOf(l, 0, from, ctx.solo), phraseOf(l, from, you, ctx.solo), phraseOf(l, you, ws.length, ctx.solo)];
    }
    // ("Trickin', | finna fall in | backwards": the plate, a sticker each)
    {
      const l = lines[7]!, ws = l.words, back = ws.findIndex((w) => /^backwards/i.test(w.w));
      if (back > 1) phs[7] = [phraseOf(l, 0, 1, ctx.solo), phraseOf(l, 1, back, ctx.solo), phraseOf(l, back, ws.length, ctx.solo)];
    }
    const carS = (t: number) => motion.distanceAt(t);
    const atRoad = (s: number, lateral: number, y: number) => { const f = route.frameAt(s); return f.pos.clone().addScaledVector(f.right, lateral).addScaledVector(UP, y); };
    const right = (s: number) => flat(route.frameAt(s).right), fwd = (s: number) => flat(route.frameAt(s).fwd);
    const ground = (s: number) => route.frameAt(s).pos.y;
    const inCar = (p: THREE.Vector3, t: number) => p.clone().applyMatrix4(carMatrix(carFrame(t)));
    const wordAt = (l: number, re: RegExp, through = 0) => { const w = lines[l]!.words.find((x) => re.test(x.w)); return w ? w.start + (w.end - w.start) * through : lines[l]!.start; };
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
    /** A panel's phrases one under the next, read top-down: their centres (P its centre, n its facing). */
    const stack = (kind: Kind, list: readonly Phrase[], P: THREE.Vector3, n: THREE.Vector3, up = uprightFor(n)) => {
      const lays = list.map((ph) => layout(kind, ph.text, ph.solo)), H = lays.reduce((a, l) => a + l.h, 0);
      let top = H / 2;
      return { H, items: list.map((ph, i) => { const L = lays[i]!, c = P.clone().addScaledVector(up, top - L.h / 2); top -= L.h; return { ph, lay: L, center: c }; }) };
    };
    /** A phrase riding on the car (at its own place in its frame). */
    const riding = (kind: Kind, ph: Phrase, pos: THREE.Vector3, n: THREE.Vector3, up = uprightFor(n), scale = 1) => {
      const ride = { pos, normal: n.clone(), up: up.clone() }, at = rideAt({ ride } as Carrier, carFrame(ph.start));
      return add(kind, ph, carS(ph.start), at.center, at.normal, at.up, layout(kind, ph.text, ph.solo, scale), { ride });
    };
    /** A take along a run of faces on the left, from across the street: the eye drifting on from `back` short of the
     *  first to `end` past that from the last by the line's end, the aim swinging on to each as it's sung. */
    const along = (cs: readonly Carrier[], E: { back: number; lateral: number; y: number; end: number }) => {
      const t0 = cs[0]!.phrase.start - 0.6, t1 = cs[cs.length - 1]!.phrase.end + 0.6, s0 = cs[0]!.s - E.back, s1 = Math.max(s0, cs[cs.length - 1]!.s - E.back + E.end);
      return (t: number) => {
        // (on to the next once the one before is sung)
        const aim = cs[0]!.center.clone();
        for (let i = 1; i < cs.length; i++) { const at = cs[i]!.phrase.start; aim.lerp(cs[i]!.center, smooth(Math.max(cs[i - 1]!.phrase.end, at - 0.45), at + 0.25, t)); }
        return lookFrom(atRoad(s0 + (s1 - s0) * smooth(t0, t1, t), E.lateral, E.y), aim);
      };
    };

    // ---- the chicken spot ----
    const S = SHACK, poleS = carS(wordAt(0, /^crip/i)) - S.pole.before, cornerS = carS(wordAt(1, /^slauson/i));
    const shop0 = cornerS + S.corner.w / 2 + S.shop.from;
    // its pole sign at the curb, its lightbox turned toward the coming car: "Ooh, he bossy, ooh, he crip walkin'"
    const poleN = fwd(poleS).negate().multiplyScalar(Math.cos(S.pole.turn)).addScaledVector(right(poleS), Math.sin(S.pole.turn)).normalize();
    const poleP = atRoad(poleS, S.pole.lateral, S.pole.y), pole = stack('polesign', phs[0]!, poleP, poleN);
    const poleCs = pole.items.map(({ ph, lay, center }) => add('polesign', ph, poleS, center, poleN, uprightFor(poleN), lay));
    const P = SHOTS.pole;
    hold(poleCs, (t) => lookFrom(atRoad(poleS - P.back + P.drift * (t - st.start), P.lateral, P.y), poleP.clone().addScaledVector(UP, -0.5)), 'cut');
    // the corner: an A-frame, the SLAUSON blade on its pole, another A-frame: "Took me | to Slauson | and he slut me out"
    const A = S.aframes, bladeS = cornerS - S.corner.w / 2 + S.corner.blade, ends = [cornerS - S.corner.w / 2 - A.first, bladeS + A.second];
    const aN = (s: number) => right(s).multiplyScalar(Math.cos(A.turn)).addScaledVector(fwd(s), -Math.sin(A.turn)).normalize();
    const [took, toSlauson, slut] = phs[1]!;
    const corner: Carrier[] = [], aframes: Verse2Plan['aframes'] = [];
    const aframe = (ph: Phrase, s: number) => {
      const n = aN(s), c = atRoad(s, A.lateral, A.y), lay = layout('aframe', ph.text, ph.solo);
      aframes.push({ s, center: c, normal: n, up: uprightFor(n), w: lay.w, h: lay.h });
      return add('aframe', ph, s, c, n, uprightFor(n), lay);
    };
    if (took) corner.push(aframe(took, ends[0]!));
    // (a street sign: its name stands before the lyric reaches it — the user, 2026-10-13)
    if (toSlauson) corner.push(add('street', toSlauson, bladeS, atRoad(bladeS, S.corner.lateral, STREET.y), right(bladeS), UP.clone(), layout('street', toSlauson.text, toSlauson.solo), { reveal: st.start - 2, early: true }));
    if (slut) corner.push(aframe(slut, ends[1]!));
    // (the first held close, then the blade and the A-frame under it together: it's up while the street's named)
    const out = (cs: readonly Carrier[], E: { out: number; y: number }) => {
      const at = cs.reduce((p, c) => p.add(c.center), new THREE.Vector3()).divideScalar(cs.length), n = cs[0]!.normal;
      const eye = at.clone().addScaledVector(n, E.out); eye.y = ground(cs[0]!.s) + E.y;
      return lookFrom(eye, at);
    };
    const first = out(corner.slice(0, 1), SHOTS.corner.aframe), pair = out(corner.slice(1), SHOTS.corner.pair);
    hold(corner, glideTake(corner, corner.map((_, i) => () => (i ? pair : first))), 'cut');
    // its windows, painted: "And when I got a problem, he get to packing"
    const Sh = S.shop, winS = Sh.windows.map((x) => shop0 + x), shopS = shop0 + Sh.len / 2, shopLat = Sh.face - Sh.d / 2;
    /** A point on the shop's front in its own straight frame (x from its start, y over its ground, out from its face),
     *  as the prop builds it: placed at their own s round the road's bend, the posters stood 0.3 m off their windows
     *  (the user, 2026-10-14: "the signs on the window are like offset"). */
    const sf = route.frameAt(shopS), sFwd = fwd(shopS), sRight = right(shopS);
    const onShop = (x: number, y: number, out: number) => sf.pos.clone().addScaledVector(sf.right, Sh.face).addScaledVector(sFwd, x - Sh.len / 2).addScaledVector(UP, y).addScaledVector(sRight, out);
    // (its words on promotional posters taped in the glass, not floating on it: the user, 2026-10-14)
    const wins = phs[2]!.map((ph, i) => { const k = Math.min(i, winS.length - 1); return add('window', ph, winS[k]!, onShop(Sh.windows[k]!, Sh.window.y + (i >= winS.length ? -0.9 : 0), 0.05), sRight.clone(), UP.clone(), layout('window', ph.text, ph.solo), { ad: 'sale' }); });
    hold(wins, along(wins, SHOTS.windows), 'cut');
    // its banner under its sign board: "He 'bout all that action, call him Mr. Handle It"
    const bS = shop0 + Sh.banner.at, bN = sRight.clone(), bP = onShop(Sh.banner.at, Sh.banner.y, 0.12), banner = stack('vinyl', phs[3]!, bP, bN);
    const bannerCs = banner.items.map(({ ph, lay, center }) => add('vinyl', ph, bS, center, bN, UP.clone(), lay));
    hold(bannerCs, along(bannerCs, SHOTS.banner), 'cut');
    const shop: Block = { s: shopS, lateral: shopLat, w: Sh.len, h: Sh.h, d: Sh.d, color: 0.4, bare: true, prop: true, matrix: boxAt(route, shopS, shopLat, Sh.d, Sh.h, Sh.len) };
    // the chicken spot past it, the big sign on its roof with the chicken standing on it: "You know I'm hella
    // different | from them chickens | you been trickin' on"
    const Ck = S.chicken, chicken0 = shop0 + Sh.len + Ck.gap, chickenS = chicken0 + Ck.len / 2, lift = Ck.kerb + Ck.step, chickenFloor = ground(chickenS) + lift;
    const rS = chicken0 + Ck.sign.at, rN = right(rS), rH = phs[4]!.reduce((a, ph) => a + layout('roofsign', ph.text, ph.solo).h, 0);
    const rP = atRoad(rS, Sh.face - 1.2, lift + Ck.h + Ck.sign.over + rH / 2), roof = stack('roofsign', phs[4]!, rP, rN);
    const roofCs = roof.items.map(({ ph, lay, center }) => add('roofsign', ph, rS, center, rN, UP.clone(), lay));
    hold(roofCs, along(roofCs, SHOTS.sign), 'cut');
    const chickenLat = Sh.face - Ck.d / 2;
    const chicken: Block = { s: chickenS, lateral: chickenLat, w: Ck.len, h: Ck.h, d: Ck.d, color: 0.4, bare: true, prop: true, matrix: boxAt(route, chickenS, chickenLat, Ck.d, Ck.h, Ck.len, lift) };

    // ---- the car wash on the right: its sign an ad facing the traffic, the words flush left, the car rolling past ----
    const W = WASH, wl = lines[5]!, ws = carS(wl.start + (wl.end - wl.start) * W.through), wn = fwd(ws).negate(), wAlong = UP.clone().cross(wn).normalize();
    const wH = phs[5]!.reduce((a, ph) => a + layout('carwash', ph.text, ph.solo).h, 0), boardH = W.board.head + W.board.gap + wH + W.board.foot, boardP = atRoad(ws, W.lateral, W.y);
    // (the words' column: the board's left, under its header)
    const textP = boardP.clone().addScaledVector(wAlong, -W.board.w / 2 + W.board.pad + LAYOUT.carwash.w / 2).addScaledVector(UP, boardH / 2 - W.board.head - W.board.gap - wH / 2);
    const wash = stack('carwash', phs[5]!, textP, wn).items.map(({ ph, lay, center }) => add('carwash', ph, ws, center, wn, UP.clone(), lay));
    const WE = W.eye, washShot = lookFrom(atRoad(ws - WE.back, WE.lateral, WE.y), boardP.clone().addScaledVector(right(ws), -WE.toRoad).addScaledVector(UP, WE.up));
    hold(wash, () => washShot, 'cut');

    // ---- their car, from in front: the windshield banner, the hood's lettering ----
    const [trust, good] = phs[6]!, V = ON_CAR.visor, Hd = ON_CAR.hood;
    const visor = trust ? [riding('visor', trust, V.pos, V.normal.clone().normalize())] : [];
    const hoodUp = new THREE.Vector3(0, 0.057, -0.998).normalize(); // (its letters stand toward the windshield: read from in front)
    const hood = good ? [riding('hood', good, Hd.pos, Hd.normal.clone().normalize(), hoodUp)] : [];
    const frontShot = (t: number) => lookFrom(inCar(ON_CAR.front, t), inCar(new THREE.Vector3(0, 1.0, 1.35), t)); // (low over the grille: the hood reads as the hood)
    hold([...visor, ...hood], frontShot, 'cut');

    // ---- a whip round behind, low: TRICKIN' on their plate, the rest on bumper stickers, the car laying back ----
    const back = new THREE.Vector3(0, 0, -1), [trickin, finna, backwards] = phs[7]!, St = ON_CAR.stickers;
    const rear = [
      ...(trickin ? [riding('plate', trickin, ON_CAR.plate.pos, back, UP.clone(), ON_CAR.plate.scale)] : []),
      // (left to right from behind: the car's left is the screen's left)
      ...(finna ? [riding('sticker', finna, new THREE.Vector3(St.x, St.y, St.z), back, UP.clone(), St.scale)] : []),
      ...(backwards ? [riding('sticker', backwards, new THREE.Vector3(-St.x, St.y, St.z), back, UP.clone(), St.scale)] : []),
    ];
    hold(rear, (t) => lookFrom(inCar(ON_CAR.behind, t), inCar(ON_CAR.behindAim, t)), 'whip');

    // ---- the big painted billboard at the end of the street, on the sand, the car driving on toward it ----
    const G = GIANT, gl = lines[8]!, gs = carS(gl.end) + G.short, gf = route.frameAt(gs);
    const gn = flat(gf.fwd).negate().multiplyScalar(Math.cos(G.turn)).addScaledVector(flat(gf.right), Math.sin(G.turn)).normalize();
    const gP = atRoad(gs, G.lateral, G.y), gUp = uprightFor(gn);
    const glays = phs[8]!.map((ph) => layout('giant', ph.text, ph.solo)), gH = glays.reduce((a, l) => a + l.h, 0);
    let gtop = gH / 2;
    // (its words on the left of it, the painting on the right: the prop paints it)
    const gAlong = gUp.clone().cross(gn).normalize(), textX = -G.w / 2 + (G.w * G.text) / 2;
    const giant = phs[8]!.map((ph, i) => { const L = glays[i]!, c = gP.clone().addScaledVector(gUp, gtop - L.h / 2).addScaledVector(gAlong, textX); gtop -= L.h; return add('giant', ph, gs, c, gn, gUp.clone(), L, { ad: 'him' }); });
    const giantShot = lookFrom(atRoad(gs - G.eye.short, G.eye.lateral, G.eye.up), gP.clone().addScaledVector(gAlong, -2));
    hold(giant, () => giantShot, 'whip');
    // (its face and its frame, up on its legs: the guard sees them as a block; the legs and the catwalk are the prop's)
    const gbw = G.w + 1, gbh = G.h + 1, gbd = 1, gB = gP.clone().addScaledVector(gn, -gbd / 2), gLat = gB.clone().sub(gf.pos).dot(gf.right);
    const giantBlock: Block = { s: gs, lateral: gLat, w: gbw, h: gbh, d: gbd, color: 0.5, bare: true, prop: true, matrix: new THREE.Matrix4().makeBasis(gAlong, UP, gn).scale(new THREE.Vector3(gbw, gbh, gbd)).setPosition(gB) };

    // the car wash's building on the right (the guard sees it); the town keeps off the chicken spot's block (and the far
    // side, where its takes stand), the car wash and his mural's
    const blocks: Block[] = [shop, chicken, giantBlock];
    const washB = { s: ws + W.building.ds, lateral: W.building.lateral, w: 18, h: 4.6, d: 10 };
    blocks.push({ ...washB, color: 0.9, matrix: boxAt(route, washB.s, washB.lateral, washB.d, washB.h, washB.w) });
    const blockEnd = chicken0 + Ck.len + 12;
    const clear = [{ side: -1, a: poleS - 20, b: blockEnd }, { side: 1, a: poleS - 20, b: blockEnd }, { side: 1, a: ws - 25, b: ws + 25 }, { side: -1, a: gs - 30, b: gs + 30 }];
    const plan: Verse2Plan = {
      pole: { s: poleS, center: poleP, normal: poleN, up: uprightFor(poleN), w: LAYOUT.polesign.w, h: pole.H },
      corner: { s: cornerS, w: S.corner.w, blade: bladeS },
      aframes, shop, windows: winS,
      banner: { center: bP, normal: bN, up: UP.clone(), w: LAYOUT.vinyl.w, h: banner.H },
      chicken, chickenFloor,
      sign: { center: rP, normal: rN, up: UP.clone(), w: LAYOUT.roofsign.w, h: rH },
      wash: { s: ws, board: { center: boardP, normal: wn, up: UP.clone(), w: W.board.w, h: boardH } },
      giant: { center: gP, normal: gn, up: gUp, w: G.w, h: G.h },
      giantBlock,
      layBack: lines[7]!.words.find((w) => /^backwards/i.test(w.w))?.start ?? lines[7]!.end,
      chickens: wordAt(4, /^chickens/i),
      wink: wordAt(3, /^handle/i),
    };
    // (chorus 3's faces stand past his mural, and past where their own clear zone would take his building)
    return { carriers, frames, clear, blocks, plan, floor: gs + G.w + 45, openings: [{ side: -1, a: cornerS - S.corner.w / 2, b: cornerS + S.corner.w / 2 }] };
  },
};
