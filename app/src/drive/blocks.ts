// The town's buildings either side of the road, plot by plot (seeded), as boxes. Pure: world.ts builds them and the
// guard (tests/sung.test.ts) checks they never hide a lyric or swallow the camera. No building on a plot where a face
// on the left (with its own building) or a board stands, nor across the road from a face on the left (where its
// camera stands): the town makes room for the words.
import * as THREE from 'three';
import { hash } from '../engine/util';
import type { Carrier } from './carriers';
import type { Motion } from './motion';
import { ROAD_HALF, ROAD_START, type Route } from './route';
import type { Stretch } from './stretches';
import { TUNNEL_CLEAR, type Tunnel, nearTunnel } from './tunnel';

/** Per stretch: building heights (m, min–max), how many plots stay empty, which side is the sea, how far back (m) the
 *  near row starts, the rows behind it (how many, their heights), and how many of the left kerb's parking spots are
 *  taken (none: no parking). */
export const BLOCKS: Record<string, { h: [number, number]; empty: number; seaLeft?: boolean; far?: number; back?: [number, number, number]; parked?: number; /** Built as a commercial strip (STRIP). */ strip?: boolean }> = {
  intro: { h: [6, 10], empty: 0.5, back: [2, 8, 16], parked: 0.55 },
  chorus1: { h: [6, 16], empty: 0.06, back: [2, 10, 26], parked: 0.6, strip: true },
  verse1: { h: [14, 40], empty: 0.1, back: [3, 18, 50], parked: 0.6 },
  chorus2: { h: [6, 14], empty: 0.6, far: 40, back: [1, 8, 18] },
  verse2: { h: [4, 8], empty: 0.3, back: [1, 6, 10] }, // (its set parks its own lowriders)
  chorus3: { h: [5, 10], empty: 0.6, seaLeft: true, back: [1, 6, 12] },
  bridge1: { h: [5, 9], empty: 1, seaLeft: true }, // in the tunnel
  verse3: { h: [8, 18], empty: 0.05, back: [2, 12, 28], parked: 0.6 },
  chorus4: { h: [3, 6], empty: 0.8 },
  outro1: { h: [0, 0], empty: 1 },
};
/** Plots every PLOT m; the near row at least `far` m off the road's centre. */
export const PLOT = 22;
const NEAR = 11;
/** The front row stands low (m) along the road where the car is while sky-writing is up (its camera looks up past
 *  it): a single storey, a shop and its sign band (at 8 m the green block by the lens still loomed over chorus 1's
 *  plane shot — the user, 2026-10-16, "lower the height of the green building in that same frame on the left"). */
const NEAR_UNDER_SKY = 5;
/** The rows behind the street: the first this far off the road's centre (m), each next one this much further; none
 *  within this far of the road (wherever it bends back past them); a quarter of their plots empty (lots, parking). */
export const BACK = { from: 44, step: 26, road: 8, empty: 0.25 };
/** A stretch built as an LA commercial strip (the user, 2026-10-16: "it looks like all of these buildings are on parking
 *  lots ... it's like everything is a parking lot here"): its street's shops wall to wall, fronting the back of the
 *  sidewalk (`walk` m off the road's centre: world.ts SIDEWALKS; up to `front` m behind it, where the sidewalk's carried
 *  back to them), a plot each less a party wall's gap, an alley between some (`alleys` of them, this wide), deep enough
 *  to close off the lots behind them up to the back street's sidewalk (`back` m off the road's centre: world.ts
 *  BACK_STREET.lot); their plots cut short where a face, a set's own building or a cross street needs the ground (the
 *  shops run on up to it), and only `least` m of a plot left is still built. A face's clearances are what its shot
 *  needs: on its own side the ground round it (`own` m either side: a billboard stands in its lot), across the road,
 *  where its camera stands, the shops stand back behind the lens, their fronts `behind` m off the road's centre (the
 *  whole stretch from 58 m to 165 m stood empty for chorus 1's two boards). The rows behind keep fewer lots
 *  (`backEmpty`). */
export const STRIP = { walk: ROAD_HALF + 3, front: 1.2, party: 0.3, alleys: 0.3, alley: [2.5, 4] as [number, number], back: BACK.from - 12.5, least: 8, own: 6, behind: 11, backEmpty: 0.1 };
/** A footprint's sample points (the unit box's base). */
const FOOTPRINT = [-0.5, -0.25, 0, 0.25, 0.5].flatMap((x) => [-0.5, -0.25, 0, 0.25, 0.5].map((z) => [x, z] as const));

/** A box standing by the road: a building (the town's), or concrete (a set-piece's structure: a viaduct's deck, its
 *  piers); `lateral` off the road's centre, `w` along the road, `d` across it. */
export interface Block { s: number; lateral: number; w: number; h: number; d: number; color: number; matrix: THREE.Matrix4; concrete?: boolean; /** No awnings: its front carries murals. */ bare?: boolean; /** Built by its set-piece's props, or as a parked car (world.ts leaves it out of the town: the guard still sees it). */ prop?: boolean; /** A car parked at the kerb (world.ts builds it as a sedan; 'set': its set-piece builds it, the verse 3 chapel's limo; it stands on the road by design). */ car?: boolean | 'set'; /** A corner's: its end at this side of its box's z (−1, +1) faces a cross street, its storefront round it (look/facades.ts). */ corner?: -1 | 1 }

/** Parking at the left kerb (the far lane's: the right lane is the car's own, and the road is a lane each way): a spot
 *  every `every` m, none within `clear` m of a lyric's carrier or a set-piece's opening (a cross street, a driveway). */
export const PARKED = { every: 7.5, clear: 7, lateral: ROAD_HALF - 1.05 };

/** A box `across` x `h` x `along` the road, standing `lateral` off it at s (its foot on the road's level, or `y0` over it). */
export function boxAt(route: Route, s: number, lateral: number, across: number, h: number, along: number, y0 = 0): THREE.Matrix4 {
  const f = route.frameAt(s), p = f.pos.clone().addScaledVector(f.right, lateral);
  const m = new THREE.Matrix4().makeBasis(f.right.clone().negate(), new THREE.Vector3(0, 1, 0), new THREE.Vector3(f.fwd.x, 0, f.fwd.z).normalize());
  m.scale(new THREE.Vector3(across, h, along));
  m.setPosition(p.x, p.y + y0 + h / 2, p.z);
  return m;
}

/** The hill sign's side of the road is kept clear from this far before the car as its line starts (m). */
const HILL_CLEAR = 30;

export function blocksOf(route: Route, motion: Motion, stretches: readonly Stretch[], carriers: readonly Carrier[], tunnels: readonly Tunnel[], keepClear: readonly { side: number; a: number; b: number }[] = [], own: readonly Block[] = [], openings: readonly { side: number; a: number; b: number }[] = []): Block[] {
  const stretchAtS = (s: number): Stretch => {
    for (const st of stretches) if (s < motion.distanceAt(st.end)) return st;
    return stretches[stretches.length - 1]!;
  };
  // where the words stand, per side (−1 left, +1 right): [s from, s to]
  // (a hill sign keeps its side of the road clear from just before where the car is as its line starts — its shot looks
  // across the canyon from there — to past the overlook: not from its own s, which is the overlook's, back over the Strip)
  const hills = carriers.filter((c) => c.kind === 'hill').map((c) => ({ side: -1, a: motion.distanceAt(c.phrase.start) - HILL_CLEAR, b: c.s + 60 }));
  const faces = [...hills, ...carriers.filter((c) => c.solid).flatMap((c) => {
    const side = Math.sign(c.center.clone().sub(route.frameAt(c.s).pos).dot(route.frameAt(c.s).right)) || 1;
    // a face on the left is filmed from across the road (a wide pair stands well back): that side stays open too, and
    // its own as far (on a bend, the building on the inside of it stands in that shot)
    const margin = side < 0 ? c.w / 2 + 24 : 14, here = { side, a: c.s - c.w / 2 - margin, b: c.s + c.w / 2 + margin };
    return side < 0 ? [here, { side: 1, a: c.s - c.w - 24, b: c.s + c.w + 24 }] : [here];
  })];
  // (and what the set-pieces keep clear of the town: a cross street, a freeway's wall)
  const taken = [...faces, ...keepClear];
  // a set-piece's own blocks stand where no face needs the ground (the ground it keeps clear is kept from the town's)
  const skyRoad = carriers.filter((c) => c.kind === 'sky').map((c) => [motion.distanceAt(c.phrase.start) - 20, motion.distanceAt(c.phrase.end + 1.5) + 60] as const);
  const out: Block[] = own.filter((b) => !faces.some((t) => t.side === Math.sign(b.lateral) && b.s + b.w / 2 > t.a && b.s - b.w / 2 < t.b));
  const owned = own.map((b) => ({ side: Math.sign(b.lateral), a: b.s - b.w / 2 - 4, b: b.s + b.w / 2 + 4 }));
  // (a strip's: what its plots give way to, per side, and the ground across from a face on the left, where the shops
  // stand back behind its camera)
  const stripCarriers = carriers.filter((c) => c.solid && BLOCKS[c.stretch]?.strip);
  const stripFaces = stripCarriers.flatMap((c) => {
    const side = Math.sign(c.center.clone().sub(route.frameAt(c.s).pos).dot(route.frameAt(c.s).right)) || 1;
    return [{ side, a: c.s - c.w / 2 - STRIP.own, b: c.s + c.w / 2 + STRIP.own }];
  });
  const behindLens = stripCarriers.flatMap((c) => {
    const side = Math.sign(c.center.clone().sub(route.frameAt(c.s).pos).dot(route.frameAt(c.s).right)) || 1;
    return side < 0 ? [{ side: 1, a: c.s - c.w - 24, b: c.s + c.w + 24 }] : [];
  });
  const stripTaken = [...stripFaces, ...hills, ...keepClear, ...owned, ...openings.map((o) => ({ side: o.side, a: o.a - 1, b: o.b + 1 }))];
  /** A strip's shop on plot k: the plot less its gap, cut back to its longest free piece; or none. */
  const stripPlot = (k: number, side: number, s: number, b: (typeof BLOCKS)[string]): Block | null => {
    if (hash(k, side, 1) < b.empty || nearTunnel(tunnels, s, TUNNEL_CLEAR)) return null;
    const gap = hash(k, side, 7) < STRIP.alleys ? STRIP.alley[0] + (STRIP.alley[1] - STRIP.alley[0]) * hash(k, side, 8) : STRIP.party;
    let pieces: [number, number][] = [[s - (PLOT - gap) / 2, s + (PLOT - gap) / 2]];
    for (const t of stripTaken) if (t.side === side) pieces = pieces.flatMap(([x, y]): [number, number][] => [[x, Math.min(y, t.a)], [Math.max(x, t.b), y]]).filter(([x, y]) => y - x >= STRIP.least);
    if (!pieces.length) return null;
    const [x0, x1] = pieces.reduce((m, p) => (p[1] - p[0] > m[1] - m[0] ? p : m));
    const at = (x0 + x1) / 2, w = x1 - x0;
    // (across from a face on the left: behind the lens)
    const front = Math.max(STRIP.walk + STRIP.front * hash(k, side, 5), ...behindLens.filter((t) => t.side === side && x1 > t.a && x0 < t.b).map(() => STRIP.behind));
    const d = STRIP.back - front - 2 * hash(k, side, 3), tall = b.h[0] + (b.h[1] - b.h[0]) * hash(k, side, 4);
    const h = skyRoad.some(([a, z]) => at > a && at < z) ? Math.min(tall, NEAR_UNDER_SKY) : tall;
    const lateral = side * (front + d / 2), lift = route.frameAt(at).pos.y + 0.4;
    // (by a cross street its storefront turns the corner: look/facades.ts)
    const corner = openings.find((o) => o.side === side && Math.abs(o.a - x1) < 3) ? 1 : openings.find((o) => o.side === side && Math.abs(x0 - o.b) < 3) ? -1 : undefined;
    return { s: at, lateral, w, h, d, color: hash(k, side, 6), matrix: boxAt(route, at, lateral, d, h + lift, w, -lift), ...(corner ? { corner } : {}) } as Block;
  };
  for (let k = 0; k * PLOT < route.length; k++) {
    for (const side of [1, -1]) {
      const s = k * PLOT + PLOT / 2, b = BLOCKS[stretchAtS(s).id]!;
      if (b.strip) {
        const blk = stripPlot(k, side, s, b);
        if (blk) out.push(blk);
        continue;
      }
      if ((side === -1 && b.seaLeft) || hash(k, side, 1) < b.empty) continue;
      if (nearTunnel(tunnels, s, TUNNEL_CLEAR) || [...taken, ...owned].some((t) => t.side === side && s > t.a && s < t.b)) continue;
      const w = 10 + 10 * hash(k, side, 2), d = 10 + 10 * hash(k, side, 3), tall = b.h[0] + (b.h[1] - b.h[0]) * hash(k, side, 4);
      // (low where the car is while sky-writing's up: the camera low behind it looks up past them at the words)
      const h = skyRoad.some(([a, z]) => s > a && s < z) ? Math.min(tall, NEAR_UNDER_SKY) : tall;
      const lateral = side * ((b.far ?? NEAR) + d / 2 + 6 * hash(k, side, 5));
      const lift = route.frameAt(s).pos.y + 0.4; // down to the plain: by a raised road it would float
      out.push({ s, lateral, w, h, d, color: hash(k, side, 6), matrix: boxAt(route, s, lateral, d, h + lift, w, -lift) }); // (w along the road, d deep)
    }
  }
  // cars parked along the left kerb through the town: blocks, so the guard sees them (world.ts builds them as sedans);
  // not on a set-piece's own blocks, by a cross street or a driveway, or under road paint (it fills the road). (The
  // faces' and the set-pieces' clearances are for buildings, which would stand in their shots: a car at the kerb
  // stands under the words, and the guard checks it.)
  // (a set-piece's block that reaches the kerb on the left, a cross street's corner or a lot: no parking along it)
  const atKerb = own.filter((b) => b.lateral < 0 && -b.lateral - b.d / 2 < ROAD_HALF + 1).map((b) => ({ a: b.s - b.w / 2 - 3, b: b.s + b.w / 2 + 3 }));
  for (let k = Math.ceil(ROAD_START / PARKED.every); k * PARKED.every < route.length; k++) {
    const s = k * PARKED.every + PARKED.every / 2, b = BLOCKS[stretchAtS(s).id]!, side = -1;
    if (!b.parked || hash(k, 90) > b.parked) continue;
    if (nearTunnel(tunnels, s, TUNNEL_CLEAR) || atKerb.some((t) => s > t.a && s < t.b)) continue;
    if (openings.some((o) => o.side === side && s > o.a - PARKED.clear && s < o.b + PARKED.clear)) continue;
    if (carriers.some((c) => c.kind === 'road' && Math.abs(c.s - s) < c.h / 2 + PARKED.clear)) continue;
    const len = 4.4 + 0.8 * hash(k, 91), lateral = side * PARKED.lateral;
    out.push({ s, lateral, w: len, h: 1.45, d: 1.8, color: hash(k, 92), matrix: boxAt(route, s, lateral, 1.8, 1.45, len), prop: true, car: true });
  }
  // the rows behind the street: the town's depth (none by the sea, in a tunnel's rock, or across the valley a hill sign
  // is seen over), never on the road where it bends back past them
  const roadPts: [number, number][] = [];
  for (let s = 0; s <= route.length; s += 4) { const p = route.frameAt(s).pos; roadPts.push([p.x, p.z]); }
  const offRoad = (m: THREE.Matrix4) => FOOTPRINT.every(([x, z]) => {
    const p = new THREE.Vector3(x, -0.5, z).applyMatrix4(m);
    return roadPts.every(([rx, rz]) => Math.hypot(rx - p.x, rz - p.z) >= ROAD_HALF + BACK.road);
  });
  for (let k = 0; k * PLOT < route.length; k++) {
    for (const side of [1, -1]) {
      const s = k * PLOT + PLOT / 2, b = BLOCKS[stretchAtS(s).id]!;
      if (!b.back || (side === -1 && b.seaLeft) || nearTunnel(tunnels, s, TUNNEL_CLEAR) || hills.some((t) => t.side === side && s > t.a && s < t.b)) continue;
      const [rows, h0, h1] = b.back;
      for (let r = 0; r < rows; r++) {
        if (hash(k, side, 20 + r) < (b.strip ? STRIP.backEmpty : BACK.empty)) continue;
        const w = 14 + 10 * hash(k, side, 30 + r), d = 14 + 8 * hash(k, side, 40 + r), h = h0 + (h1 - h0) * hash(k, side, 50 + r);
        const at = s + (hash(k, side, 70 + r) - 0.5) * 6, lateral = side * (BACK.from + r * BACK.step + d / 2 + 6 * hash(k, side, 60 + r));
        // (nor across a cross street: the road to Slauson ran into storefronts)
        if (openings.some((o) => o.side === side && at + w / 2 > o.a - 3 && at - w / 2 < o.b + 3)) continue;
        const lift = route.frameAt(at).pos.y + 0.4, m = boxAt(route, at, lateral, d, h + lift, w, -lift);
        if (!offRoad(m)) continue;
        out.push({ s: at, lateral, w, h, d, color: hash(k, side, 80 + r), matrix: m });
      }
    }
  }
  return out;
}
