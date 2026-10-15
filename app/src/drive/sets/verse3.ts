// Verse 3, the Strip at night (flow plan §7; rebuilt 2026-10-14). The user, on the sign-per-line version: "the
// typography is great, but the environment is like terrible … these are just floating billboards that have zero
// integration with the environment. It's nothing like it was in verse one, where everything was tightly packed into a
// moving scene." So the strip is a street now: both kerbs built wall to wall, two to four storeys (the town's fronts,
// blocks.ts/look/facades.ts), a cross street half way, and every line's neon is one business's own sign, mounted the way
// that business would mount it (the props: scenes/sets/verse3.ts):
//   "Ecstasy is just a pill away"             the drugstore's neon, bolted to its upper floor (left)
//   "Pop it up or you could screw today"      the liquor store's sign up on a steel frame on its flat roof (left)
//   "I'm just tryna hear you say my name"     the theatre's marquee, out over the sidewalk (left)
//   "Love to play your ruler, be your Jane"   the tiki bar's big sign on its roof at the corner, turned to face the
//   "You could be my Tarzan, toss me up"      traffic coming up the strip (right): the one sign, filling row by row
//   "Other hoes is lacking, call me up"       the hotel's neon between its floors, the payphones at its kerb (left)
//   "Know my baby packing, why I'm stuck"     the pawn shop's fascia, the three gold balls over it (left)
//   "That's why he my man"                    the wedding chapel's heart, the camera rising off it (left)
// Five moving takes, cut between lines (never in one): along the right sidewalk as the car slows past, low by the kerb
// as it crosses the frame under the marquee, behind it up the street to the corner, a crane along the hotel and the
// pawn shop, and up off the chapel. Pure.
import * as THREE from 'three';
import { type Carrier, type Kind, layout, lookFrom } from '../carriers';
import { phrasesOf } from '../phrases';
import { ROAD_HALF } from '../route';
import { type Block, boxAt } from '../blocks';
import { TUNNEL_CLEAR } from '../tunnel';
import { hash } from '../../engine/util';
import type { Placed, SetContext, SetFrame, SetPiece } from './index';

const UP = new THREE.Vector3(0, 1, 0);
const flat = (v: THREE.Vector3) => new THREE.Vector3(v.x, 0, v.z).normalize();
const smooth = (a: number, b: number, x: number) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };

export type Theme = 'pill' | 'pop' | 'marquee' | 'tiki' | 'phone' | 'pawn' | 'chapel';
/** How a business mounts its sign: flat on its upper wall on standoffs, on a steel frame on its roof facing the street,
 *  on its roof turned to face the coming traffic (`cross`), on its marquee out over the sidewalk, on its fascia. */
export type Mount = 'wall' | 'roof' | 'cross' | 'marquee' | 'fascia';

/** The street's fronts: how far off the road's centre (m: the sidewalk's back edge), the lots' depth, a storey. */
export const STREET = { front: ROAD_HALF + 3, depth: [13, 18] as [number, number], storey: 3.3 };
/** The businesses the lines are on, in the lines' order (the tiki bar's sign carries two): its side, how far past the
 *  car's place at its line's middle it stands (m: the take looks ahead to it), its frontage and height (m), how it
 *  mounts its sign, the lyric's scale (x the kind's: carriers.ts LAYOUT) and the sign's height (its centre, m; a roof
 *  sign's foot over the roof). */
export const SHOPS: readonly { theme: Theme; kind: Kind; side: -1 | 1; ahead: number; w: number; h: number; mount: Mount; scale: number; y: number }[] = [
  { theme: 'pill', kind: 'neon', side: -1, ahead: 6, w: 12, h: 8.4, mount: 'wall', scale: 0.5, y: 5.7 },
  { theme: 'pop', kind: 'neon', side: -1, ahead: 6, w: 11, h: 5.0, mount: 'roof', scale: 0.6, y: 1.4 },
  { theme: 'marquee', kind: 'marquee', side: -1, ahead: 3, w: 15, h: 12.6, mount: 'marquee', scale: 1.8, y: 5.3 },
  { theme: 'tiki', kind: 'neon', side: 1, ahead: 6, w: 11, h: 4.4, mount: 'cross', scale: 0.64, y: 1.6 },
  { theme: 'phone', kind: 'neon', side: -1, ahead: 6, w: 12, h: 11.2, mount: 'wall', scale: 0.5, y: 5.6 },
  { theme: 'pawn', kind: 'storefront', side: -1, ahead: 6, w: 11, h: 7.6, mount: 'fascia', scale: 0.62, y: 4.6 },
  { theme: 'chapel', kind: 'neon', side: -1, ahead: 5, w: 13, h: 8.2, mount: 'wall', scale: 0.55, y: 5.4 },
];
/** Which business each of the verse's lines is on. */
export const LINE_SHOP = [0, 1, 2, 3, 3, 4, 5, 6];
/** A marquee hangs this far out from its wall (m); a roof sign stands this far back from the parapet, a cross sign its
 *  near edge this far in from the front. */
export const MOUNT = { marquee: 2.3, roofBack: 0.8, crossIn: 0.5, wall: 0.28 };
/** The cross street: how far past the theatre's far end it opens, its width (m). */
export const CROSS = { after: 2, w: 11 };
/** The filler lots between the businesses: frontage (m), storeys (one on the right's run `lowRun` m up to the tiki
 *  bar's corner, so its roof sign stands over its neighbours from up the street; `end` past the chapel), and the
 *  narrowest gap left as an alley (m). */
export const FILL = { w: [5.5, 10] as [number, number], storeys: [2, 3] as [number, number], lowRun: 22, alley: 2.6, end: 4 };

/** The takes, by the shops they hold (eye and aim in the road's frame: m along the road from the car or from a fixed
 *  place, m off the centre, m up). */
export const TAKES = {
  /** Along the right sidewalk, a few metres behind the car as it slows into the strip: the drugstore, then the liquor
   *  store; the eye travels at `v` (m/s) from `s0` m past the tunnel's mouth. */
  walk: { s0: 7, v: 6.0, lateral: STREET.front - 1.9, y: 1.75, pan: [0.22, 0.3] as [number, number], toCar: 0.25 },
  /** Low by the right kerb across from the marquee, creeping on at `v` while the car crosses the frame. */
  kerb: { back: 14, v: 2.2, lateral: ROAD_HALF + 1.0, y: 1.6 },
  /** Behind the car up the street to the corner: the eye `back` m behind it at first, falling back at `fall` m/s
   *  (the car drives away into the frame), `lateral` off the centre, `y` up; aimed `down` m under the sign's middle,
   *  from the first to the second (it tilts up as it nears). */
  chase: { back: 7, fall: 4.5, lateral: -0.4, y: 3.2, down: [3.7, 1.2] as [number, number] },
  /** A crane along the right side, behind the car, high: the hotel, then the pawn shop (aimed `lead` m up the street of
   *  it). */
  crane: { ahead: -7, lateral: ROAD_HALF + 0.6, y: 5.8, pan: [0.3, 0.25] as [number, number], lead: 1.8 },
  /** Off the chapel: from across the street near its own level, rising and pulling back as the line is sung. */
  rise: { back: [11, 16] as [number, number], lateral: [ROAD_HALF + 1.4, ROAD_HALF + 0.4] as [number, number], y: [2.4, 7.5] as [number, number] },
};

interface Face { center: THREE.Vector3; normal: THREE.Vector3; up: THREE.Vector3; w: number; h: number }
/** A lot on the strip: a building (the town's front, its box a Block) and, for a business, its sign. */
export interface Lot { s: number; side: -1 | 1; w: number; d: number; h: number; shop?: number }
export interface Verse3Plan {
  lots: Lot[];
  /** Each business's sign: its theme, mount, lot, the whole lyric stack's face (all its lines), and its lines' starts
   *  (its tubes flicker on with each). */
  signs: { theme: Theme; mount: Mount; lot: number; face: Face; starts: number[]; s: number; side: -1 | 1 }[];
  /** The cross street (m along the road: its two kerbs). */
  cross: [number, number];
  /** The strip from and to (m along the road). */
  span: [number, number];
  /** When the verse starts and ends (s). */
  t: [number, number];
}

export const VERSE3: SetPiece = {
  place(ctx: SetContext): Placed {
    const { st, route, motion } = ctx;
    const carS = (t: number) => motion.distanceAt(t);
    const atRoad = (s: number, lateral: number, y: number) => { const f = route.frameAt(s); return f.pos.clone().addScaledVector(f.right, lateral).addScaledVector(UP, y); };
    const carriers: Carrier[] = [], frames = new Map<string, SetFrame>();
    const lines = st.lines, phs = lines.map((l) => phrasesOf(l, ctx.nextStart(l.i), ctx.solo));

    // ---- the businesses: each where the car is mid-way through its (first) line, plus how far ahead the take looks ----
    const mouth = carS(st.start); // (the tunnel's mouth: the bridge ends at it)
    const shopLines = SHOPS.map((_, k) => lines.filter((_, li) => LINE_SHOP[li] === k));
    const lots: Lot[] = [], signs: Verse3Plan['signs'] = [];
    const heroS = SHOPS.map((sp, k) => { const l = shopLines[k]![0]!; return carS((l.words[0]!.start + l.end) / 2) + sp.ahead; });
    // (nothing stands within TUNNEL_CLEAR of the mouth: the headland's rock)
    heroS[0] = Math.max(heroS[0]!, mouth + TUNNEL_CLEAR + SHOPS[0]!.w / 2 + 1);
    const theatre = SHOPS.findIndex((s) => s.theme === 'marquee'), tiki = SHOPS.findIndex((s) => s.theme === 'tiki');
    // (a business never overlaps the one before it on its side: it moves on past it, or past the cross street)
    const unpile = (cross: [number, number]) => {
      for (const side of [-1, 1]) {
        let b = -Infinity;
        SHOPS.forEach((sp, k) => {
          if (sp.side !== side) return;
          let a = Math.max(heroS[k]! - sp.w / 2, b);
          if (a < cross[1] && a + sp.w > cross[0]) a = cross[1];
          heroS[k] = a + sp.w / 2; b = a + sp.w;
        });
      }
    };
    unpile([Infinity, Infinity]);
    // the cross street just past the theatre; the tiki bar its far corner, on the right (its roof sign faces up the strip)
    const crossA = heroS[theatre]! + SHOPS[theatre]!.w / 2 + CROSS.after, cross: [number, number] = [crossA, crossA + CROSS.w];
    heroS[tiki] = cross[1] + SHOPS[tiki]!.w / 2;
    unpile(cross);
    const span: [number, number] = [mouth + TUNNEL_CLEAR, heroS[heroS.length - 1]! + SHOPS[SHOPS.length - 1]!.w / 2 + 14];
    // the right side ends before chorus 4's board (its take looks up the road past this side's far end)
    const rightEnd = Math.min(span[1], heroS[tiki]! + 34);

    // ---- the lots: the businesses' own, the town's fronts packed wall to wall between them (seeded) ----
    for (const side of [-1, 1] as const) {
      const fixed = SHOPS.map((sp, k) => ({ sp, k })).filter(({ sp }) => sp.side === side).map(({ sp, k }) => ({ a: heroS[k]! - sp.w / 2, b: heroS[k]! + sp.w / 2, k }));
      const end = side > 0 ? rightEnd : span[1];
      let s = span[0], n = 0;
      const fill = (a: number, b: number) => {
        // fillers from a to b: frontages FILL.w, the last stretched to close the gap
        let x = a;
        while (b - x > FILL.alley) { // (a sliver left over is an alley)
          let w = FILL.w[0] + (FILL.w[1] - FILL.w[0]) * hash(n, side, 301);
          if (b - x - w < FILL.w[0]) w = b - x;
          const mid = x + w / 2;
          // (the right side's run up to the tiki bar's corner stays one storey: its sign stands over it from up the street)
          const low = side > 0 && mid > cross[0] - FILL.lowRun && mid < heroS[tiki]!;
          // (past the chapel, the left's last fronts stand four storeys: the road climbing away into the hills shows over
          // lower ones as a grey ramp across the sky)
          const end = side < 0 && mid > heroS[heroS.length - 1]!;
          const storeys = low ? 1 : end ? FILL.end : FILL.storeys[0] + Math.floor(hash(n, side, 302) * (FILL.storeys[1] - FILL.storeys[0] + 1));
          const h = storeys === 1 ? 4.6 + 0.6 * hash(n, side, 303) : storeys * STREET.storey + 0.9 + 0.8 * hash(n, side, 304);
          lots.push({ s: mid, side, w, d: STREET.depth[0] + (STREET.depth[1] - STREET.depth[0]) * hash(n, side, 305), h });
          x += w; n++;
        }
      };
      for (const f of fixed.sort((x, y) => x.a - y.a)) {
        // (the cross street cuts the row: fill up to its near kerb, then on from its far one)
        if (s < cross[0] && f.a > cross[1]) { fill(s, cross[0]); s = cross[1]; }
        fill(s, f.a);
        const sp = SHOPS[f.k]!;
        lots.push({ s: (f.a + f.b) / 2, side, w: sp.w, d: STREET.depth[1], h: sp.h, shop: f.k });
        s = f.b;
      }
      if (s < cross[0] && end > cross[1]) { fill(s, cross[0]); s = cross[1]; }
      fill(s, end);
    }

    // ---- each business's sign: its lines' phrases stacked top-down on it ----
    SHOPS.forEach((sp, k) => {
      const lot = lots.findIndex((l) => l.shop === k), L = lots[lot]!, s = L.s;
      const f = route.frameAt(s), right = flat(f.right), fwd = flat(f.fwd);
      const list = shopLines[k]!.flatMap((l) => phs[lines.indexOf(l)]!);
      const lays = list.map((ph) => layout(sp.kind, ph.text, ph.solo, sp.scale));
      const H = lays.reduce((a, l) => a + l.h, 0), W = Math.max(...lays.map((l) => l.w));
      // where the stack's centre stands, and which way it faces
      let center: THREE.Vector3, normal: THREE.Vector3;
      if (sp.mount === 'cross') { // on the roof, turned to the coming traffic: its near edge in from the front
        normal = fwd.clone().negate();
        center = atRoad(s, sp.side * (STREET.front + MOUNT.crossIn + W / 2), L.h + sp.y + H / 2);
      } else {
        normal = right.clone().multiplyScalar(-sp.side); // (facing the road from its side)
        // (a wall's sign and a fascia stand off its front, toward the road; a roof's frame stands back on the roof)
        const lateral = sp.mount === 'marquee' ? STREET.front - MOUNT.marquee : sp.mount === 'roof' ? STREET.front + MOUNT.roofBack : STREET.front - MOUNT.wall;
        center = atRoad(s, sp.side * lateral, sp.mount === 'roof' ? L.h + sp.y + H / 2 : sp.y);
      }
      const up = UP.clone();
      let top = H / 2;
      list.forEach((ph, i) => {
        const lay = lays[i]!, c = center.clone().addScaledVector(up, top - lay.h / 2);
        top -= lay.h;
        // (no solid of its own: the building is the town's block, which the guard sees; a carrier's own building would
        // stand a second box round it)
        carriers.push({ id: `L${ph.line}.${phs[lines.findIndex((l) => l.i === ph.line)]!.indexOf(ph)}`, phrase: ph, kind: sp.kind, stretch: st.id, reveal: ph.start, s, center: c, normal: normal.clone(), up: up.clone(), ...lay, foot: c.y - f.pos.y, solid: null });
      });
      signs.push({ theme: sp.theme, mount: sp.mount, lot, face: { center, normal, up, w: W, h: H }, starts: shopLines[k]!.map((l) => l.words[0]!.start), s, side: sp.side });
    });

    // ---- the takes ----
    const signOf = (k: number) => signs.find((g) => g.theme === SHOPS[k]!.theme)!;
    const aimOf = (k: number) => signOf(k).face.center;
    const lineStart = (li: number) => lines[li]!.words[0]!.start;
    /** The aim swinging from one sign to the next across a line's join: `pan` s before to `pan` s after it. */
    const swing = (a: THREE.Vector3, b: THREE.Vector3, at: number, pan: [number, number]) => (t: number) => a.clone().lerp(b, smooth(at - pan[0], at + pan[1], t));
    const takes: { lines: number[]; to: (t: number) => ReturnType<typeof lookFrom> }[] = [];
    { // the drugstore and the liquor store, from the right sidewalk, the car slowing past into the strip
      // (aimed a little toward the car, so it's in the frame below the signs)
      const T = TAKES.walk, t0 = lineStart(0), aim = swing(aimOf(0), aimOf(1), lineStart(1), T.pan);
      const car = (t: number) => ctx.carFrame(t).pos.clone().addScaledVector(UP, 1);
      takes.push({ lines: [0, 1], to: (t) => lookFrom(atRoad(mouth + T.s0 + T.v * (t - t0), T.lateral, T.y), aim(t).lerp(car(t), T.toCar)) });
    }
    { // the marquee: low by the right kerb across from it, the car crossing the frame
      const T = TAKES.kerb, t0 = lineStart(2), s0 = signOf(2).s - T.back;
      takes.push({ lines: [2], to: (t) => lookFrom(atRoad(s0 + T.v * (t - t0), T.lateral, T.y), aimOf(2)) });
    }
    { // behind the car up the street, over the crossing, to the tiki bar's sign on the corner
      // (tilting up as it nears: low, the car's in the frame under the sign; near, the sign's top would leave it)
      const T = TAKES.chase, t0 = lineStart(3), t1 = lines[4]!.end, g = signOf(3);
      const aim = (t: number) => g.face.center.clone().addScaledVector(UP, -(T.down[0] + (T.down[1] - T.down[0]) * smooth(t0, t1, t)));
      takes.push({ lines: [3, 4], to: (t) => lookFrom(atRoad(carS(t0) - T.back + (carS(t) - carS(t0)) - T.fall * (t - t0), T.lateral, T.y), aim(t)) });
    }
    { // the hotel and the pawn shop, from a crane along the right, level with the car
      // (aimed a little up the street of the pawn shop: the chapel's words, shown as the cut to them nears, stay out of
      // this frame's edge)
      const T = TAKES.crane, back = flat(route.frameAt(signOf(5).s).fwd).multiplyScalar(-T.lead);
      const aim = swing(aimOf(4), aimOf(5).clone().add(back), lineStart(6), T.pan);
      takes.push({ lines: [5, 6], to: (t) => lookFrom(atRoad(carS(t) + T.ahead, T.lateral, T.y), aim(t)) });
    }
    { // up off the chapel
      const T = TAKES.rise, l = lines[7]!, t0 = lineStart(7), t1 = l.end + 0.4, g = signOf(6);
      takes.push({ lines: [7], to: (t) => { const u = smooth(t0 - 0.2, t1, t); return lookFrom(atRoad(g.s - (T.back[0] + (T.back[1] - T.back[0]) * u), T.lateral[0] + (T.lateral[1] - T.lateral[0]) * u, T.y[0] + (T.y[1] - T.y[0]) * u), g.face.center); } });
    }
    for (const take of takes) {
      const ids = take.lines.flatMap((li) => phs[li]!.map((_, pi) => `L${lines[li]!.i}.${pi}`));
      ids.forEach((id, i) => frames.set(id, { to: take.to, move: i ? 'snap' : 'cut' }));
    }

    // ---- the buildings: the town's fronts (world.ts builds them), the businesses' bare of the town's awnings ----
    const blocks: Block[] = lots.map((L, i) => {
      const lateral = L.side * (STREET.front + L.d / 2), lift = route.frameAt(L.s).pos.y + 0.4;
      return { s: L.s, lateral, w: L.w, h: L.h, d: L.d, color: hash(i, 311), ...(L.shop !== undefined ? { bare: true } : {}), matrix: boxAt(route, L.s, lateral, L.d, L.h + lift, L.w, -lift) };
    });
    // (the town keeps off the strip: its fronts are these)
    const clear = [-1, 1].map((side) => ({ side, a: span[0] - 2, b: (side > 0 ? rightEnd : span[1]) + 2 }));
    const openings = [-1, 1].map((side) => ({ side, a: cross[0], b: cross[1] }));
    const plan: Verse3Plan = { lots, signs, cross, span: [span[0], span[1]], t: [st.start, st.end] };
    return { carriers, frames, clear, blocks, openings, plan, floor: span[1] + 4 };
  },
};
