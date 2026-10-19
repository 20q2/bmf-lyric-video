// The city on past the town behind the corner (the user, 2026-10-19, of the wide shot at 12 s looking back down the
// street at the car waiting at the light: "the back of the town has nothing ... it looks like the edge of a map in a
// video game, not like there's any continuation back there ... nothing too busy"): LA going on into the haze, quiet.
//   - the boulevard on down the street from where the corner's street behind stops (drive/sets/intro.ts
//     STREET_BEHIND): its shops as the town's fronts (look/facades.ts) as far as a front still reads, plain boxes past
//     that, a storefront's band along their feet, into the haze (the road, its sidewalks and its furniture run on with
//     it: route.ts ROAD_START);
//   - behind them either side a grid of blocks: one- and two-storey stucco, apartment blocks, now and then a taller
//     one, parking lots, yards with a tree or two, the streets between them;
//   - over the roofs: rows of tall palms down a few of its streets, a couple of billboards, a water tower, and far
//     off a few mid-rise blocks (a district on the plain).
// Muted, toon-lit and fogged like the town, so the haze takes it (nothing in it to catch the eye). Merged: a chunk of
// the grid a mesh, the palms instanced. Shown through the early city only (scenes/drive.ts: later shots look back at it
// from a kilometre off). Browser and bun (geometry; the facades' materials are made on first use).
import * as THREE from 'three';
import type { Drive } from '../drive/drive';
import { type Block, boxAt } from '../drive/blocks';
import { STREET_BEHIND } from '../drive/sets/intro';
import { hash } from '../engine/util';
import { facadeMeshes, facades } from './facades';
import { PALM, palmVariant } from './palms';
import { WORLD, toon } from './toon';

/** The boulevard on past the street behind the corner (m along the road: negative, behind the light): its shops as
 *  fronts from `fronts` up to the street behind's own, plain boxes from `from` (where the road starts: route.ts
 *  ROAD_START) to `fronts`; the sidewalk's apron out to their fronts (m off the road's centre, its height). */
export const BOULEVARD = { from: -1000, fronts: -420, apron: [7, STREET_BEHIND.back] as [number, number], kerb: 0.15 };
/** The grid behind the boulevard's shops either side: from `near` back to `back` (m along the road), its cells (along
 *  the road, across it) and their streets' width, from `from` off the road's centre (an alley behind the shops first)
 *  out to `spread` of the distance back from the wide shot's lens plus `margin` (its view either side, and some), at
 *  most `most`; the floor's height. The motel's lot and wings are kept clear (right of the road, from `motel` along it
 *  up, within `motelOut` of the road). */
export const GRID = { near: 3, back: -1150, along: 108, across: 86, street: 11, from: 29, alley: 21, spread: 0.85, margin: 60, most: 1100, lens: 36, floor: 0.12, motel: -29, motelOut: 46 };
/** The grid's lots: their frontage (m, min–max), how many stay empty (parking), the gap between buildings, setbacks
 *  (min–max), depths (min–max); heights by kind (m, min–max) and how common each is (cumulative shares), the tall ones
 *  only this far off; rooftop units (share, within this distance); trees in a yard (each lot's chance, within this
 *  distance). */
export const LOTS = {
  front: [13, 24] as [number, number], empty: 0.17, gap: [1, 3] as [number, number], setback: [1.5, 7] as [number, number], depth: [12, 26] as [number, number],
  kinds: [{ share: 0.56, h: [3.8, 5.4] }, { share: 0.83, h: [6.4, 8.2] }, { share: 0.96, h: [10, 14] }, { share: 1, h: [17, 26] }] as { share: number; h: [number, number] }[],
  tallFrom: 260, units: 0.35, unitsWithin: 450, trees: 0.3, treesWithin: 700,
  /** Within this far of the wide shot's lens (m) a building is a front as the town's are (look/facades.ts: a plain box
   *  that close read as unfinished), and within `low` no taller than `lowH` (over the street's shops, it loomed over
   *  the barbershop's roof). */
  frontsWithin: 400, low: 130, lowH: 6.5,
};
/** Far off on the plain, a few mid-rise blocks (m along the road, off it; their footprint and height). */
export const MIDRISE: readonly [number, number, number, number, number][] = [
  [-640, -250, 24, 30, 42], [-700, -300, 30, 22, 34], [-610, -330, 22, 22, 28], [-760, -205, 26, 26, 38], [-820, 300, 28, 24, 36], [-560, 420, 22, 26, 30],
];
/** The rows of tall palms down the grid's streets (none near: dark against the haze, a row of them behind the motel
 *  crowded the frame): which street (the cell's, across: side, cell; or along: cell), how
 *  far apart (m), their heights (m), the stretch of road they line (m along it). */
export const PALM_ROWS = { every: 17, h: [17, 25] as [number, number], across: [[-1, 2], [1, 3]] as [number, number][], along: [5], span: [-950, -330] as [number, number] };
/** Over the roofs: billboards (m along the road, off it; which way they face, radians off facing back up the road; how
 *  high their faces stand), a water tower (where, how tall). */
export const OVER = {
  boards: [[-310, -78, 0.25, 13], [-470, 96, -0.5, 15]] as [number, number, number, number][],
  board: { w: 13, h: 4.2 },
  tower: { s: -560, lat: 150, h: 22, r: 4.2 },
};

const C = (hex: string) => new THREE.Color(hex);
/** LA stucco, muted (sRGB); the roofs' tar and gravel, a white one now and then; the yards and the streets. */
const WALLS = ['#d6c2a6', '#e1cfb6', '#c9aa8e', '#d4b4a0', '#bfae98', '#ccb8a6', '#dfd0bb', '#b8a48e', '#c6b39b', '#d2bdb0', '#b1b5a2', '#c3c3b3', '#cdb6a0', '#d9c7b8'].map(C);
const ROOFS = ['#8e8680', '#9b928a', '#a69e93', '#80776f', '#b3aca1', '#d6d0c4'].map(C);
const TALL = ['#bdb4a8', '#aca69e', '#c4b8a6', '#b4aca0'].map(C);
const BAND = C('#5d5560'), STOREFRONT = C('#3f3b47'), YARD = C('#a69a86'), LOT = C('#6b5b66'), STREET = C(WORLD.asphalt), WALK = C('#cbbba7');
const TREE = C('#56604a'), UNIT = C('#bdb7aa'), STEEL = C('#7c7a80'), TANK = C('#b9b4ab');
const BOARD_FACES: [THREE.Color, THREE.Color][] = [[C('#e3d6bd'), C('#b9675a')], [C('#cbd3cf'), C('#56708a')]];

const BALL = new THREE.IcosahedronGeometry(1, 0);
/** Geometry gathered in the road's frame behind the light (s along it, lat to its right, y up): flat-shaded faces
 *  coloured in their vertices. */
class Gather {
  pos: number[] = []; nor: number[] = []; col: number[] = [];
  constructor(private o: THREE.Vector3, private f: THREE.Vector3, private r: THREE.Vector3) {}
  /** The world point at (s, lat, y). */
  at(s: number, lat: number, y: number) { return new THREE.Vector3().copy(this.o).addScaledVector(this.f, s).addScaledVector(this.r, lat).setY(this.o.y + y); }
  /** A flat quad (its corners in order round it), its front toward `out`. */
  quad(p: THREE.Vector3[], c: THREE.Color, out: THREE.Vector3) {
    const n = new THREE.Vector3().subVectors(p[1]!, p[0]!).cross(new THREE.Vector3().subVectors(p[3]!, p[0]!)).normalize();
    const q = n.dot(out) < 0 ? [p[0]!, p[3]!, p[2]!, p[1]!] : p;
    if (n.dot(out) < 0) n.negate();
    for (const k of [0, 1, 2, 0, 2, 3]) { const v = q[k]!; this.pos.push(v.x, v.y, v.z); this.nor.push(n.x, n.y, n.z); this.col.push(c.r, c.g, c.b); }
  }
  tri(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, col: THREE.Color, out: THREE.Vector3) {
    const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
    const q = n.dot(out) < 0 ? [a, c, b] : [a, b, c];
    if (n.dot(out) < 0) n.negate();
    for (const v of q) { this.pos.push(v.x, v.y, v.z); this.nor.push(n.x, n.y, n.z); this.col.push(col.r, col.g, col.b); }
  }
  /** Ground from (s0, l0) to (s1, l1) at y. */
  ground(s0: number, l0: number, s1: number, l1: number, y: number, c: THREE.Color) {
    this.quad([this.at(s0, l0, y), this.at(s1, l0, y), this.at(s1, l1, y), this.at(s0, l1, y)], c, new THREE.Vector3(0, 1, 0));
  }
  /** A box standing at (s, lat): `a` along its own u (turned `turn` off the road's line), `b` across it, from y0 up h;
   *  its walls `wall` (its side facing u's way `face`, if given), its top `top` (none: open). */
  box(s: number, lat: number, a: number, b: number, y0: number, h: number, wall: THREE.Color, top: THREE.Color | null, turn = 0, face?: THREE.Color) {
    const cu = Math.cos(turn), su = Math.sin(turn);
    const pt = (u: number, v: number, y: number) => this.at(s + u * cu - v * su, lat + u * su + v * cu, y);
    const ctr = this.at(s, lat, y0 + h / 2);
    const corners: [number, number][] = [[-a / 2, -b / 2], [a / 2, -b / 2], [a / 2, b / 2], [-a / 2, b / 2]];
    for (let k = 0; k < 4; k++) {
      const [u0, v0] = corners[k]!, [u1, v1] = corners[(k + 1) % 4]!;
      const p = [pt(u0, v0, y0), pt(u1, v1, y0), pt(u1, v1, y0 + h), pt(u0, v0, y0 + h)];
      const mid = p[0]!.clone().add(p[2]!).multiplyScalar(0.5);
      this.quad(p, face && k === 1 ? face : wall, mid.sub(ctr));
    }
    if (top) this.quad(corners.map(([u, v]) => pt(u, v, y0 + h)), top, new THREE.Vector3(0, 1, 0));
  }
  /** An upright prism of `n` sides (a cylinder, a cone if `r1` is 0) at (s, lat) from y0 up h. */
  prism(s: number, lat: number, r0: number, r1: number, y0: number, h: number, n: number, c: THREE.Color, cap: boolean) {
    const ring = (r: number, y: number) => Array.from({ length: n }, (_, k) => { const a = (k / n) * Math.PI * 2; return this.at(s + r * Math.cos(a), lat + r * Math.sin(a), y); });
    const lo = ring(r0, y0), hi = ring(r1, y0 + h), ctr = this.at(s, lat, y0 + h / 2);
    for (let k = 0; k < n; k++) {
      const j = (k + 1) % n, out = lo[k]!.clone().add(lo[j]!).multiplyScalar(0.5).sub(ctr).setY(0);
      if (r1 > 0) this.quad([lo[k]!, lo[j]!, hi[j]!, hi[k]!], c, out); else this.tri(lo[k]!, lo[j]!, hi[0]!, c, out.setY(0.3));
    }
    if (cap && r1 > 0) { const top = this.at(s, lat, y0 + h); for (let k = 0; k < n; k++) this.tri(hi[k]!, hi[(k + 1) % n]!, top, c, new THREE.Vector3(0, 1, 0)); }
  }
  /** A tree's crown: a squat low-poly ball, its trunk hidden under it. */
  tree(s: number, lat: number, r: number, c: THREE.Color) {
    const p = BALL.getAttribute('position') as THREE.BufferAttribute;
    const v = [0, 1, 2].map(() => new THREE.Vector3()), ctr = this.at(s, lat, r * 1.6);
    for (let i = 0; i < p.count; i += 3) {
      for (let k = 0; k < 3; k++) v[k]!.copy(this.at(s + p.getX(i + k) * r, lat + p.getZ(i + k) * r, r * 1.6 + p.getY(i + k) * r * 0.8));
      this.tri(v[0]!, v[1]!, v[2]!, c, v[0]!.clone().add(v[1]!).add(v[2]!).multiplyScalar(1 / 3).sub(ctr));
    }
  }
  geometry(): THREE.BufferGeometry | null {
    if (!this.pos.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    return g;
  }
}

/** A rectangle in the road's frame: s0, l0, s1, l1 (lat signed: negative to the road's left). */
type Rect = [number, number, number, number];
const overlaps = (a: Rect, b: Rect) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
/** On a side of the road (−1 left, +1 right), from l0 to l1 off it: as a rectangle. */
const sided = (s0: number, l0: number, s1: number, l1: number, side: number): Rect => [s0, Math.min(side * l0, side * l1), s1, Math.max(side * l0, side * l1)];
/** A rectangle less another (the pieces of it outside). */
function minus(a: Rect, b: Rect): Rect[] {
  const [s0, l0, s1, l1] = a, [t0, m0, t1, m1] = b;
  if (t1 <= s0 || t0 >= s1 || m1 <= l0 || m0 >= l1) return [a];
  const out: Rect[] = [];
  if (t0 > s0) out.push([s0, l0, t0, l1]);
  if (t1 < s1) out.push([t1, l0, s1, l1]);
  const u0 = Math.max(s0, t0), u1 = Math.min(s1, t1);
  if (m0 > l0) out.push([u0, l0, u1, m0]);
  if (m1 < l1) out.push([u0, m1, u1, l1]);
  return out.filter(([x0, y0, x1, y1]) => x1 - x0 > 0.5 && y1 - y0 > 0.5);
}

export function buildBackdrop(drive: Drive): THREE.Group {
  const { route } = drive, f0 = route.frameAt(0), root = new THREE.Group();
  const o = f0.pos.clone(), f = new THREE.Vector3(f0.fwd.x, 0, f0.fwd.z).normalize(), r = new THREE.Vector3(f0.right.x, 0, f0.right.z).normalize();
  const mat = toon({ vertexColors: true });
  /** Where a point (s, lat) is as the road's frame behind the light has it. */
  const local = (p: THREE.Vector3): [number, number] => { const v = p.clone().sub(o); return [v.dot(f), v.dot(r)]; };
  // what's built there already (the town's blocks near the corner, the motel's lot and wings): the grid keeps clear
  const taken: Rect[] = drive.blocks.flatMap((b) => {
    const [s, lat] = local(new THREE.Vector3().setFromMatrixPosition(b.matrix));
    if (s > 80) return [];
    const half = Math.hypot(b.w, b.d) / 2 + 2;
    return [[s - half, lat - half, s + half, lat + half] as Rect];
  });
  const motel: Rect = [GRID.motel, 0, 60, GRID.motelOut];
  const free = (rc: Rect) => !overlaps(rc, motel) && !taken.some((t) => overlaps(rc, t));
  /** Ground on a side from (s0, l0) to (s1, l1) off the road, less the motel's (on the right). */
  const ground = (g: Gather, s0: number, l0: number, s1: number, l1: number, side: number, y: number, c: THREE.Color) => {
    for (const rc of minus(sided(s0, l0, s1, l1, side), motel)) g.ground(rc[0], rc[1], rc[2], rc[3], y, c);
  };

  /** The buildings near enough to be fronts (the town's: look/facades.ts, their names their own). */
  const fronted: Block[] = [];
  // the boulevard's shops on down the street: fronts up to the street behind's (as it builds them), plain boxes past
  {
    const B = STREET_BEHIND, plain = new Gather(o, f, r);
    for (const side of [-1, 1]) {
      for (let s = BOULEVARD.from, k = 0; s < B.from - 0.5; k++) {
        const w = Math.min(B.from - s, B.w[0] + (B.w[1] - B.w[0]) * hash(k, side, 171)), mid = s + w / 2;
        const h = B.h[0] + (B.h[1] - B.h[0]) * hash(k, side, 172), lateral = side * (B.back + B.d / 2);
        s += w;
        if (w < 4) continue;
        if (mid > BOULEVARD.fronts) { fronted.push({ s: mid, lateral, w: w - B.alley, h, d: B.d, color: hash(k, side, 173), matrix: boxAt(route, mid, lateral, B.d, h, w - B.alley) }); continue; }
        // (past where a front reads: its mass, its storefront's band, a lighter fascia)
        const wall = WALLS[Math.floor(hash(k, side, 174) * WALLS.length)]!, roof = ROOFS[Math.floor(hash(k, side, 175) * ROOFS.length)]!;
        plain.box(mid, lateral, w - B.alley, B.d, -0.4, 3.6, STOREFRONT, null);
        plain.box(mid, lateral, w - B.alley, B.d, 3.2, h - 3.2, wall, roof);
        if (hash(k, side, 176) < 0.6) plain.box(mid, side * (B.back - 0.4), (w - B.alley) * 0.9, 0.8, 3.0, 0.9, BAND, BAND);
      }
      // the sidewalk carried out to their fronts
      plain.ground(BOULEVARD.from, side * BOULEVARD.apron[0], B.from, side * BOULEVARD.apron[1], BOULEVARD.kerb, WALK);
    }
    const g = plain.geometry();
    if (g) root.add(new THREE.Mesh(g, mat));
  }

  // the grid behind, chunk by chunk (each its own mesh: the parts out of view are culled)
  const chunks = new Map<string, Gather>(), floor = new Gather(o, f, r);
  const chunk = (s: number, lat: number) => { const key = `${Math.floor(-s / 320)}:${Math.floor(lat / 360)}`; let g = chunks.get(key); if (!g) chunks.set(key, (g = new Gather(o, f, r))); return g; };
  const G = GRID, L = LOTS, latMost = (s: number) => Math.min(G.most, G.spread * (G.lens - s) + G.margin);
  const palmsAt: [number, number, number, number][] = [];
  for (const side of [-1, 1]) {
    // the alley behind the boulevard's shops
    ground(floor, G.back, G.alley, G.near, G.from, side, G.floor, LOT);
    for (let k = 1; ; k++) {
      const s1 = G.near - (k - 1) * G.along, s0 = s1 - G.along;
      if (s1 <= G.back) break;
      for (let j = 0; ; j++) {
        const l0 = G.from + j * G.across, l1 = l0 + G.across;
        if (l0 > latMost(s0)) break;
        // its streets: along its near (back) end and its outer edge
        const S = G.street, blockR: Rect = [s0 + S, l0, s1, l1 - S];
        const pieces: Rect[] = [[s0, l0, s0 + S, l1], [s0 + S, l1 - S, s1, l1]];
        for (const p of [...pieces, blockR]) ground(floor, p[0], p[1], p[2], p[3], side, G.floor, p === blockR ? YARD : STREET);
        // palms down its streets
        for (const [ps, pj] of PALM_ROWS.across) if (ps === side && pj === j) for (let s = Math.max(s0, PALM_ROWS.span[0]); s < Math.min(s1, PALM_ROWS.span[1]); s += PALM_ROWS.every) palmsAt.push([s, side * (l1 - S + 1), hash(s, side, 301), hash(s, side, 302)]);
        if (PALM_ROWS.along.includes(k) && s0 > PALM_ROWS.span[0]) for (let l = l0 + 6; l < l1; l += PALM_ROWS.every) palmsAt.push([s0 + S + 1.2, side * l, hash(k, l, 303), hash(k, l, 304)]);
        // its lots: two rows back to back, fronting its inner edge and its outer street, an alley between
        const [b0, , b1] = blockR, mid = (l0 + l1 - S) / 2;
        for (const row of [0, 1]) {
          for (let s = b0 + 1, n = 0; s < b1 - 4; n++) {
            const seed = [k, j, row, n, side], u = (x: number) => hash(...seed, x);
            const w = Math.min(b1 - s, L.front[0] + (L.front[1] - L.front[0]) * u(1)), ps = s + w / 2;
            s += w;
            const dist = G.lens - ps, rowFront = row === 0 ? l0 : l1 - S, inward = row === 0 ? 1 : -1;
            const g = chunk(ps, side * rowFront);
            if (u(2) < L.empty) { // (a parking lot)
              const rc = sided(ps - w / 2 + 0.5, rowFront, ps + w / 2 - 0.5, rowFront + inward * 20, side);
              if (free(rc)) floor.ground(rc[0], rc[1], rc[2], rc[3], G.floor + 0.04, LOT);
              continue;
            }
            const kind = L.kinds.findIndex((kd) => u(3) < kd.share), tallOk = dist > L.tallFrom;
            const kd = L.kinds[kind === 3 && !tallOk ? 2 : kind]!, h = Math.min(dist < L.low ? L.lowH : Infinity, kd.h[0] + (kd.h[1] - kd.h[0]) * u(4));
            const back = L.setback[0] + (L.setback[1] - L.setback[0]) * u(5), maxD = Math.abs(mid - rowFront) - back - 1.5;
            const d = Math.min(maxD, L.depth[0] + (L.depth[1] - L.depth[0]) * u(6) + (h > 9 ? 6 : 0)), a = w - (L.gap[0] + (L.gap[1] - L.gap[0]) * u(7));
            if (d < 6 || a < 6) continue;
            const lat = rowFront + inward * (back + d / 2), rc = sided(ps - a / 2, lat - d / 2, ps + a / 2, lat + d / 2, side);
            if (!free(rc)) continue;
            if (dist < L.frontsWithin) { fronted.push({ s: ps, lateral: side * lat, w: a, h, d, color: u(16), matrix: boxAt(route, ps, side * lat, d, h, a) }); continue; }
            const wall = (h > 16 ? TALL : WALLS)[Math.floor(u(8) * (h > 16 ? TALL : WALLS).length)]!, roof = ROOFS[Math.floor(u(9) * ROOFS.length)]!;
            g.box(ps, side * lat, a, d, -0.4, h + 0.4, wall, roof);
            // (a parapet's cap on the two-storey and up, a shade off the wall)
            if (h > 6) g.box(ps, side * lat, a + 0.3, d + 0.3, h, 0.45, wall.clone().multiplyScalar(0.86), roof);
            if (dist < L.unitsWithin && u(10) < L.units) g.box(ps + (u(11) - 0.5) * a * 0.4, side * (lat + (u(12) - 0.5) * d * 0.4), 2, 1.4, h, 1.2, UNIT, UNIT);
            if (dist < L.treesWithin && u(13) < L.trees) g.tree(ps + (u(14) - 0.5) * a * 0.6, side * (rowFront + inward * Math.max(1.5, back * 0.5)), 2.6 + 1.6 * u(15), TREE);
          }
        }
      }
    }
  }
  // far off, the mid-rise blocks
  MIDRISE.forEach(([s, lat, a, b, h], i) => {
    const g = chunk(s, lat), wall = TALL[i % TALL.length]!;
    g.box(s, lat, a, b, -0.4, h + 0.4, wall, ROOFS[i % 3]!);
    g.box(s, lat, a * 0.6, b * 0.6, h, 3.5, wall.clone().multiplyScalar(0.9), ROOFS[1]!); // (its penthouse)
  });
  // over the roofs: the billboards (a face toward the road's back, sun-faded; the back of the other), the water tower
  OVER.boards.forEach(([s, lat, turn, y], i) => {
    const g = chunk(s, lat), W = OVER.board, [field, block] = BOARD_FACES[i % BOARD_FACES.length]!;
    g.prism(s, lat, 0.45, 0.45, 0, y, 8, STEEL, false);
    g.box(s, lat, 0.5, W.w + 0.4, y - 0.2, W.h + 0.4, STEEL, STEEL, turn, STEEL);
    g.box(s + 0.32 * Math.cos(turn), lat + 0.32 * Math.sin(turn), 0.16, W.w, y, W.h, field, field, turn, field);
    g.box(s + 0.42 * Math.cos(turn) - W.w * 0.22 * Math.sin(turn), lat + 0.42 * Math.sin(turn) + W.w * 0.22 * Math.cos(turn), 0.1, W.w * 0.42, y + 0.5, W.h - 1, block, block, turn, block);
    g.box(s - 0.6 * Math.cos(turn), lat - 0.6 * Math.sin(turn), 1, W.w, y - 0.5, 0.15, STEEL, STEEL, turn); // (its catwalk)
  });
  {
    const T = OVER.tower, g = chunk(T.s, T.lat);
    for (const [ds, dl] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) g.box(T.s + ds * T.r * 0.7, T.lat + dl * T.r * 0.7, 0.4, 0.4, 0, T.h, STEEL, null);
    g.prism(T.s, T.lat, T.r, T.r, T.h, 6, 12, TANK, false);
    g.prism(T.s, T.lat, T.r + 0.2, 0, T.h + 6, 2.6, 12, TANK.clone().multiplyScalar(0.85), false);
  }
  for (const g of [floor, ...chunks.values()]) { const geo = g.geometry(); if (geo) root.add(new THREE.Mesh(geo, mat)); }
  root.add(facadeMeshes(facades(fronted, { vary: true, shops: new Map() })));

  // the palms: the town's (look/palms.ts), taller and leaner, instanced
  {
    const VARIANTS = 2, bark = new THREE.Color(WORLD.trunk), scar = bark.clone().lerp(new THREE.Color('#c9a27a'), 0.35);
    const leaves = toon({ color: WORLD.crown, side: THREE.DoubleSide }), dead = toon({ color: '#7a5f3c', side: THREE.DoubleSide }), wood = toon({ vertexColors: true });
    const placed: THREE.Matrix4[][] = Array.from({ length: VARIANTS }, () => []);
    for (const [s, lat, a, b] of palmsAt) {
      const h = PALM_ROWS.h[0] + (PALM_ROWS.h[1] - PALM_ROWS.h[0]) * a, k = h / PALM.h;
      placed[Math.floor(b * VARIANTS)]!.push(new THREE.Matrix4().compose(new THREE.Vector3().copy(o).addScaledVector(f, s).addScaledVector(r, lat).setY(o.y - 0.2), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), a * 40), new THREE.Vector3(k * 0.7, k, k * 0.7)));
    }
    placed.forEach((ms, v) => {
      if (!ms.length) return;
      const p = palmVariant(v + 5, bark, scar);
      for (const [geo, m] of [[p.trunk, wood], [p.skirt, dead], [p.crown, leaves]] as const) {
        const im = new THREE.InstancedMesh(geo, m, ms.length);
        ms.forEach((x, i) => im.setMatrixAt(i, x));
        im.computeBoundingSphere();
        root.add(im);
      }
    });
  }
  return root;
}
