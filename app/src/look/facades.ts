// The town's buildings as LA street fronts (spec §3), not boxes with a window grid. Each block (blocks.ts) gets:
//   - a stucco body standing a hand's width behind its box's front;
//   - in that depth, its storefront (glass bays, a door, a base course, a sign band with a shop's name) or, on low
//     apartments, a carport's dark mouth;
//   - its upper floors' windows (frames, sills; on its two ends too, set into ends standing a little in from its box's);
//   - pilasters up the taller ones, a frieze band and a cornice along the front, a coping round the rest of its roof.
// Every part stays inside the block's box, which is what the guard checks (tests/town.test.ts). Seeded by the block's
// place. The geometry is pure (bun builds it under test); facadeMeshes gives it its materials, shared, and the sign
// atlas is drawn in the browser (signAtlas).
// The ends' frames, the roofline and a corner's storefront came with the user's note on the buildings close to the
// camera (2026-10-15: "I don't think all the buildings need fidelity improved significantly, but at least the ones
// that are close to the camera sure as hell do").
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { hash } from '../engine/util';
import { WORLD, printShadows, toon } from './toon';
import { F, font } from '../engine/type';
import { BEHIND, nightGlass } from './night';
import type { Block } from '../drive/blocks';
import { SHOPS, type ShopName, TRADE, isApartments, planShops, shopIndex, shopOf } from '../drive/shops';

/** How deep the front's detail is (m: the body stands this far behind the box's front); the storefront (its glass's
 *  top, the sign band, a bay's width); the floors above (their height, a window's width, height, the gap between);
 *  the cornice's height; the pilasters from this height up; how far the ends stand in from the box's (room for their
 *  windows' frames and sills: their panes were bare glass flush on the wall), the coping round the roof's other edges
 *  (its height, its width) (m). */
export const FACADE = { depth: 0.3, shop: { top: 3.0, band: [3.15, 3.95] as [number, number], bay: 3.2 }, floor: 3.3, win: { w: 1.3, h: 1.7, gap: 1.3 }, cornice: 0.55, pilasters: 14, end: 0.18, coping: [0.3, 0.32] as [number, number] };
/** The sign atlas: a cell a shop (drive/shops.ts SHOPS, in order), this many a row, each this many px. */
const ATLAS = { cols: 8, cw: 384, ch: 84 };
const ATLAS_ROWS = Math.ceil(SHOPS.length / ATLAS.cols);
/** Where a sign's uv (0..1 over its face) falls in the atlas's cell `k` (turned back if `mirrored`). */
export function signUv(k: number, u: number, v: number, mirrored = false): [number, number] {
  const cx = k % ATLAS.cols, cy = Math.floor(k / ATLAS.cols);
  return [(cx + (mirrored ? 1 - u : u)) / ATLAS.cols, 1 - (cy + 1 - v) / ATLAS_ROWS];
}
/** The signs' paint, field and lettering: muted, sign painters' enamels faded by the sun — cream, oxblood, charcoal,
 *  buff, slate, bottle green, putty, umber, sage, plum. Never the lyrics' brights: the user, 2026-10-18, "There
 *  shouldn't be anything that catches our attention and brings us away from the lyrics" (they were fire-engine red,
 *  sign yellow and sky blue, unlit, so they glowed in the shade). */
const SIGN_COLOURS: readonly [string, string][] = [
  ['#e2dbcb', '#6e2f2a'], ['#2b2e33', '#cfc09a'], ['#7a3d35', '#e6dcc6'], ['#3e5866', '#e0dacd'], ['#bfab7e', '#2f2a25'], ['#354c3e', '#ddd3bc'],
  ['#d3cdc0', '#2c3846'], ['#5a4a3c', '#ddd0b6'], ['#a5b2a8', '#28332d'], ['#ddd2bf', '#3b5847'], ['#4a3f4c', '#d8cbb2'], ['#b5a398', '#3a2c2a'],
];

export interface FacadeGeometry { walls: THREE.BufferGeometry; trim: THREE.BufferGeometry; glass: THREE.BufferGeometry; signs: THREE.BufferGeometry }

/** Collects a facade's parts in its block's local frame (x across, + out of its front; y up from its ground; z along).
 *  Its walls darken toward the ground by `grime` (a share: years of dust and splash, read in their vertex colours). */
class Parts {
  walls: THREE.BufferGeometry[] = []; trim: THREE.BufferGeometry[] = []; glass: THREE.BufferGeometry[] = []; signs: THREE.BufferGeometry[] = [];
  constructor(private wall: THREE.Color, private trimC: THREE.Color, private mirrored: boolean, private grime = 0, private H = 1, private trade = 0, private surface = 0) {}
  private coloured(g: THREE.BufferGeometry, c: THREE.Color, grime = 0) {
    const n = g.getAttribute('position').count, a = new Float32Array(n * 3), y = g.getAttribute('position');
    for (let i = 0; i < n; i++) { const k = 1 - grime * (1 - Math.min(1, Math.max(0, y.getY(i) / this.H))); a.set([c.r * k, c.g * k, c.b * k], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    return g;
  }
  /** A box on the walls or the trim, in their colour or its own. */
  box(to: 'walls' | 'trim', w: number, h: number, d: number, x: number, y: number, z: number, colour?: THREE.Color) {
    const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z);
    // (the walls' own surface, its coursing drawn by facadeWalls; a shutter or the like in its own colour, plain)
    if (to === 'walls') g.setAttribute('surface', new THREE.BufferAttribute(new Float32Array(g.getAttribute('position').count).fill(colour ? 0 : this.surface), 1));
    this[to].push(this.coloured(g, colour ?? (to === 'walls' ? this.wall : this.trimC), to === 'walls' ? this.grime : 0));
  }
  /** A pane facing +x (out of the front) or along ±z (an end), lit at night if `lit`; behind it (look/night.ts
   *  nightGlass) a shop, a room upstairs, or the dark (a carport's mouth). */
  pane(w: number, h: number, x: number, y: number, z: number, facing: 'x' | 'z+' | 'z-', lit: boolean, behind: keyof typeof BEHIND = 'shop') {
    const g = new THREE.PlaneGeometry(w, h);
    if (facing === 'x') g.rotateY(Math.PI / 2); else if (facing === 'z-') g.rotateY(Math.PI);
    g.translate(x, y, z);
    g.setAttribute('lit', new THREE.BufferAttribute(new Float32Array(g.getAttribute('position').count).fill(lit ? 1 : 0), 1));
    g.setAttribute('behind', new THREE.BufferAttribute(new Float32Array(g.getAttribute('position').count).fill(BEHIND[behind]), 1));
    g.setAttribute('trade', new THREE.BufferAttribute(new Float32Array(g.getAttribute('position').count).fill(this.trade), 1)); // (what a shop behind it sells: TRADE_OF)
    this.glass.push(g);
  }
  /** A shop's sign on its band, facing +x (or along ±z: a corner's end), its texture the atlas's cell `k` (turned back
   *  on a mirrored front, so its name reads the right way round). */
  sign(w: number, h: number, x: number, y: number, z: number, k: number, facing: 'x' | 'z+' | 'z-' = 'x') {
    const g = new THREE.PlaneGeometry(w, h);
    if (facing === 'x') g.rotateY(Math.PI / 2); else if (facing === 'z-') g.rotateY(Math.PI);
    g.translate(x, y, z);
    const uv = g.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) uv.setXY(i, ...signUv(k, uv.getX(i), uv.getY(i), this.mirrored));
    this.signs.push(g);
  }
}

/** Reverses a geometry's triangles' winding (in place). */
function flipWinding(g: THREE.BufferGeometry) {
  const ix = g.getIndex();
  if (ix) { for (let i = 0; i < ix.count; i += 3) { const b = ix.getX(i + 1); ix.setX(i + 1, ix.getX(i + 2)); ix.setX(i + 2, b); } ix.needsUpdate = true; return; }
  for (const name of Object.keys(g.attributes)) {
    const a = g.getAttribute(name), n = a.itemSize, tmp = new Array<number>(n);
    for (let i = 0; i < a.count; i += 3) for (let k = 0; k < n; k++) { tmp[k] = a.getComponent(i + 1, k); a.setComponent(i + 1, k, a.getComponent(i + 2, k)); a.setComponent(i + 2, k, tmp[k]!); }
  }
}

const empty = () => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(0), 3)); return g; };
/** Merged into one (the empty ones left out: an apartment block has no sign, and a merge wants all or none indexed). */
const merged = (gs: THREE.BufferGeometry[]) => { const some = gs.filter((g) => g.getAttribute('position').count > 0); return some.length ? mergeGeometries(some)! : empty(); };

/** Each front its own (FacadeOptions.vary; the user, 2026-10-16: "every front of the store has the same texture on the
 *  front of it. Maybe a little bit of variance would be nice, but not so much that it draws our attention away from the
 *  lyrics"): muted, all of them, the stucco's own tones or the trades' plain materials — tile bulkheads (oxblood,
 *  bottle green, black, cream, slate), brick piers, dark or bronze shop frames, roll-down shutters, window AC units. */
const TILES = ['#7a3b32', '#2f4a3e', '#24272c', '#cfc2a4', '#3c5566', '#5e4b3c'];
const BRICK = ['#9a5a48', '#86503f', '#a26c56', '#7b5546'];
const FRAMES = ['#2a2c31', '#4a3b2c', '#5d6166'];
const SHUTTER = '#8d8b84', AC = '#bdb7aa';
/** A front's wall (the user, 2026-10-18: "I'd like for the storefront textures to be different, but I don't need them
 *  to be that crazy ... their saturation should remain low"): the stucco's own pastel, smooth or scored in bands; or
 *  face brick; or painted block in a muted grey, putty or sage (facadeWalls draws the coursing, fading it out where
 *  it would shimmer). */
export const SURFACE = { stucco: 0, brick: 1, block: 2, scored: 3 } as const;
const WALL_BRICK = ['#8f5a4a', '#7e5446', '#9a6a56', '#74574b', '#8a6656'];
const WALL_BLOCK = ['#b4ada0', '#a3a49a', '#bcae96', '#9ba496', '#b2a69a', '#a99e92'];

/** A front's treatment: its storefront's bays (width), the bulkhead under the glass (height; tiled or brick, or the
 *  trim's), its piers' width and colour (brick: broad), its shop frame's colour (the trim's, or dark metal), a transom
 *  over the glass, a recessed entry, a bay shuttered; its upper windows (width, height, gap, divided by a mullion or a
 *  meeting rail, an AC unit in some); its sign (on the band, painted on the wall with no band, or a cabinet on the
 *  band; its width, a share of the front's); its age (grime toward the ground, its trim faded toward the wall). The
 *  plain one (vary off) is the town's front as it was: verse 3 reads its panes back by their order (scenes/sets/verse3.ts). */
interface Style {
  bay: number; bulk: number; bulkC: string | null; pier: number; pierC: string | null; frameC: string | null;
  transom: boolean; recess: boolean; shutter: boolean;
  win: { w: number; h: number; gap: number }; muntin: 0 | 1 | 2; ac: number;
  sign: 0 | 1 | 2; signW: number; grime: number; faded: boolean;
  /** Its wall (SURFACE) and, for brick or block, the wall's colour (else the stucco's). */
  surface: number; wallC: string | null;
}
const PLAIN: Style = { surface: 0, wallC: null, bay: FACADE.shop.bay, bulk: 0.35, bulkC: null, pier: 0.12, pierC: null, frameC: null, transom: false, recess: false, shutter: false, win: FACADE.win, muntin: 0, ac: 0, sign: 0, signW: 0.62, grime: 0, faded: false };
function styleOf(r: (k: number) => number): Style {
  const kind = Math.floor(r(400) * 4), pick = <T>(xs: readonly T[], k: number) => xs[Math.floor(r(k) * xs.length)]!;
  return {
    bay: 2.6 + 1.4 * r(401),
    bulk: kind === 1 ? 0.5 + 0.2 * r(402) : 0.3 + 0.25 * r(402),
    bulkC: kind === 1 ? pick(TILES, 403) : kind === 2 ? pick(BRICK, 403) : null,
    pier: kind === 2 ? 0.42 : 0.12, pierC: kind === 2 ? pick(BRICK, 403) : null,
    frameC: kind === 3 || r(404) < 0.25 ? pick(FRAMES, 405) : null,
    transom: r(406) < 0.5, recess: r(407) < 0.4, shutter: r(408) < 0.25,
    win: { w: 1.0 + 0.6 * r(409), h: 1.5 + 0.4 * r(410), gap: 0.9 + 0.8 * r(411) }, muntin: Math.floor(r(412) * 3) as 0 | 1 | 2, ac: r(413) < 0.5 ? 0.12 : 0,
    sign: Math.floor(r(414) * 3) as 0 | 1 | 2, signW: 0.4 + 0.3 * r(415), grime: 0.06 + 0.12 * r(416), faded: r(417) < 0.35,
    // (half the fronts stucco, smooth; the rest scored, brick or block — the brick's piers then its own)
    ...((w) => (w < 0.42 ? { surface: SURFACE.stucco, wallC: null } : w < 0.56 ? { surface: SURFACE.scored, wallC: null }
      : w < 0.78 ? { surface: SURFACE.brick, wallC: pick(WALL_BRICK, 419) } : { surface: SURFACE.block, wallC: pick(WALL_BLOCK, 419) }))(r(418)),
  };
}

export interface FacadeOptions {
  /** Each front its own treatment (styleOf), not the town's one. */ vary?: boolean;
  /** Who's who (drive/shops.ts planShops: the town's, Drive.shops); a block not in it, a name of its own by its hash.
   *  facades plans its blocks' if not given. */
  shops?: ReadonlyMap<Block, ShopName>;
  /** facades, planning its blocks' shops: names and lines of business to deal none of (shopsNear). */
  avoid?: readonly string[];
}

/** What a block's front is, as facadeOf builds it: low apartments over a carport (no shop) or a shop (its name: SHOPS),
 *  and whether it has floors over its storefront (windows up its front and its ends) — what a set dressing a block's
 *  blank end needs to know of it (scenes/sets/verse2.ts, the tire shop's). */
export function facadeTraits(b: Block, opts: FacadeOptions = {}): { apartments: boolean; shop: ShopName; upper: boolean } {
  const r = (k: number) => hash(b.s, b.lateral, k), V = opts.vary ? styleOf(r) : PLAIN;
  const apartments = isApartments(b);
  return { apartments, shop: opts.shops?.get(b) ?? SHOPS[Math.floor(r(5) * SHOPS.length)]!.name, upper: (apartments ? 3.3 : 4.3) + V.win.h <= b.h - FACADE.cornice - 0.4 };
}

/** One block's street front, in world space. */
export function facadeOf(b: Block, opts: FacadeOptions = {}): FacadeGeometry {
  // (the block's box: its matrix scales a unit cube; unscaled, it's the local frame. Its x axis runs away from the
  // road's right: on the road's right the front is +x, on its left -x; a mirror in x puts every front at +x)
  const sx = new THREE.Vector3().setFromMatrixColumn(b.matrix, 0).length(), sy = new THREE.Vector3().setFromMatrixColumn(b.matrix, 1).length(), sz = new THREE.Vector3().setFromMatrixColumn(b.matrix, 2).length();
  const side = Math.sign(b.lateral) || 1;
  const local = b.matrix.clone().multiply(new THREE.Matrix4().makeScale(side / sx, 1 / sy, 1 / sz)).multiply(new THREE.Matrix4().makeTranslation(0, -sy / 2, 0));
  const D = sx, H = sy, W = sz, A = FACADE, front = D / 2, body = front - A.depth;
  const r = (k: number) => hash(b.s, b.lateral, k), V = opts.vary ? styleOf(r) : PLAIN;
  const stucco = new THREE.Color(V.wallC ?? WORLD.stucco[Math.floor(b.color * WORLD.stucco.length)]!);
  // (the front's trim: the wall's, lightened or deepened; brick's and block's in a pale stone, as their sills and copings are)
  let trimC = V.surface === SURFACE.brick ? new THREE.Color('#cdc3b0').multiplyScalar(0.9 + 0.1 * r(1)) : r(1) < 0.5 ? stucco.clone().lerp(new THREE.Color('#ffffff'), 0.55) : stucco.clone().multiplyScalar(0.62);
  if (V.faded) trimC = trimC.lerp(stucco, 0.5); // (sun-faded toward the wall)
  const T = facadeTraits(b, opts), apartments = T.apartments, xf = body;
  const P = new Parts(stucco, trimC, side < 0, V.grime, H, TRADE[shopOf(T.shop).trade], V.surface);
  const col = (c: string | null) => (c ? new THREE.Color(c) : undefined);
  // (the ground: the road's level is its box's bottom plus its lift; the facade starts at the road)
  const g0 = H - b.h;
  // the ground floor: a storefront (bays of glass, a door, a base course, the sign band), or a carport on low apartments
  const n = Math.max(1, Math.floor((W - 1) / V.bay)), bw = (W - 1) / n, door = Math.floor(r(3) * n);
  const zOf = (i: number) => -W / 2 + 0.5 + bw * (i + 0.5);
  // the body, behind the front's depth, its ends a little in from the box's; its roof a little under the coping's top
  // (level with it, the two fought along the roof's edges). A recessed entry: the ground floor's body cut back round
  // its door's bay, `R` deep (the floor over it its soffit)
  const top = H - A.coping[0] / 3, R = 1.2, recess = V.recess && !apartments && n >= 2;
  if (!recess) P.box('walls', D - A.depth, top, W - 2 * A.end, -A.depth / 2, top / 2, 0);
  else {
    const gt = g0 + A.shop.top, z0 = -W / 2 + A.end, z1 = W / 2 - A.end, d0 = zOf(door) - bw / 2 + 0.06, d1 = zOf(door) + bw / 2 - 0.06;
    P.box('walls', D - A.depth, top - gt, W - 2 * A.end, -A.depth / 2, (gt + top) / 2, 0);
    for (const [a, c] of [[z0, d0], [d1, z1]] as const) if (c - a > 0.01) P.box('walls', D - A.depth, gt, c - a, -A.depth / 2, gt / 2, (a + c) / 2);
    P.box('walls', D - A.depth - R, gt, d1 - d0, -A.depth / 2 - R / 2, gt / 2, (d0 + d1) / 2);
    // its floor (terrazzo, at the sidewalk's height), its door in the back, display glass down its two sides
    P.box('trim', R + 0.02, g0 + 0.16, d1 - d0, xf - R / 2, (g0 + 0.16) / 2, (d0 + d1) / 2, new THREE.Color('#b9b0a2'));
    const gh = A.shop.top - V.bulk - 0.05;
    P.pane(Math.min(1.1, d1 - d0 - 0.3), 2.2, xf - R + 0.02, g0 + 0.16 + 1.1, (d0 + d1) / 2, 'x', false);
    for (const [z, f] of [[d0 + 0.01, 'z+'], [d1 - 0.01, 'z-']] as const) P.pane(R - 0.1, gh, xf - R / 2, g0 + V.bulk + gh / 2, z, f, r(30) > 0.45);
  }
  if (!apartments) {
    const frame = col(V.frameC), pierC = col(V.pierC) ?? frame;
    const gb = V.bulk, gh = A.shop.top - gb - 0.1;
    for (let i = 0; i < n; i++) {
      const z = zOf(i), pw = bw - V.pier - 0.12;
      if (i > 0) P.box('trim', 0.12, A.shop.top, V.pier, xf + 0.06, g0 + A.shop.top / 2, z - bw / 2, pierC);
      if (recess && i === door) continue; // (its glass is down its sides)
      if (V.shutter && n >= 2 && i === (door + 1) % n) {
        // a bay shuttered: its roll-down door down over the glass, its housing over it, ribbed
        P.box('walls', 0.03, A.shop.top - 0.1, pw, xf + 0.03, g0 + (A.shop.top - 0.1) / 2, z, new THREE.Color(SHUTTER));
        P.box('trim', 0.2, 0.28, pw + 0.06, xf + 0.1, g0 + A.shop.top - 0.14, z, new THREE.Color(SHUTTER).multiplyScalar(0.85));
        for (let k = 1; k < 7; k++) P.box('trim', 0.05, 0.03, pw, xf + 0.055, g0 + (k * (A.shop.top - 0.3)) / 7, z, new THREE.Color(SHUTTER).multiplyScalar(0.8));
        continue;
      }
      const lit = i !== door && r(10 + i) > 0.45;
      if (V.transom) {
        const lo = 2.25 - gb, hi = gh - lo - 0.1;
        P.pane(pw, lo, xf + 0.02, g0 + gb + lo / 2, z, 'x', lit);
        P.box('trim', 0.1, 0.1, pw, xf + 0.05, g0 + gb + lo + 0.05, z, frame);
        P.pane(pw, hi, xf + 0.02, g0 + gb + lo + 0.1 + hi / 2, z, 'x', lit);
      } else P.pane(pw, gh, xf + 0.02, g0 + gb + gh / 2, z, 'x', lit);
    }
    // the bulkhead under the glass (its tile or brick, or the trim's) and its base course
    P.box('trim', 0.08, gb, W - 0.6, xf + 0.04, g0 + gb / 2, 0, col(V.bulkC) ?? frame);
    const [b0, b1] = A.shop.band;
    // the sign: on the band; painted on the wall (no band); or a cabinet standing on the band
    if (V.sign !== 1) P.box('trim', 0.16, b1 - b0, W - 0.4, xf + 0.08, g0 + (b0 + b1) / 2, 0);
    const sw = Math.min(W * V.signW, 9), shop = shopIndex(T.shop), sz2 = (r(4) - 0.5) * W * 0.2;
    if (V.sign === 0) P.sign(sw, (b1 - b0) * 0.78, xf + 0.165, g0 + (b0 + b1) / 2, sz2, shop);
    else if (V.sign === 1) P.sign(sw, (b1 - b0) * 0.9, xf + 0.02, g0 + (b0 + b1) / 2 + 0.05, sz2, shop);
    else {
      P.box('trim', 0.12, (b1 - b0) * 0.86, sw * 0.72 + 0.16, xf + 0.22, g0 + (b0 + b1) / 2, sz2, new THREE.Color(FRAMES[0]!));
      P.sign(sw * 0.72, (b1 - b0) * 0.72, xf + 0.285, g0 + (b0 + b1) / 2, sz2, shop);
    }
    // a corner's: its storefront turns the corner, glass bays along its end to the cross street, the band and its sign
    // round with it (seen end-on from the cross street, its end was a blank wall)
    if (b.corner) {
      const c = b.corner, ze = c * (W / 2 - A.end), facing = c > 0 ? 'z+' : 'z-', x1 = body - 0.5, x0 = -D / 2 + 1.2;
      const m = Math.max(1, Math.floor((x1 - x0) / V.bay)), cw = (x1 - x0) / m;
      for (let i = 0; i < m; i++) {
        const x = x1 - cw * (i + 0.5);
        P.pane(cw - 0.24, A.shop.top - 0.45, x, g0 + 0.35 + (A.shop.top - 0.45) / 2, ze + c * 0.02, facing, r(200 + i) > 0.45);
        P.box('trim', 0.12, A.shop.top, 0.12, x - cw / 2, g0 + A.shop.top / 2, ze + c * 0.06, frame);
      }
      P.box('trim', 0.12, A.shop.top, 0.12, x1 + 0.06, g0 + A.shop.top / 2, ze + c * 0.06, frame); // its corner post
      P.box('trim', x1 - x0, 0.35, 0.08, (x0 + x1) / 2, g0 + 0.175, ze + c * 0.04, col(V.bulkC) ?? frame); // the base course
      P.box('trim', body + 0.16 - (x0 - 0.3), b1 - b0, 0.16, (body + 0.16 + x0 - 0.3) / 2, g0 + (b0 + b1) / 2, ze + c * 0.08);
      P.sign(Math.min((x1 - x0) * 0.62, 9), (b1 - b0) * 0.78, (x0 + x1) / 2, g0 + (b0 + b1) / 2, ze + c * 0.165, shop, facing);
    }
  } else {
    P.pane(Math.min(W * 0.5, 7), 2.4, xf + 0.02, g0 + 1.2, (r(6) - 0.5) * W * 0.3, 'x', false, 'dark'); // the carport's dark mouth
  }
  // the floors above: framed windows with sills, on its front and its two ends
  const Wn = V.win, y0 = g0 + (apartments ? 3.3 : 4.3), roofline = H - A.cornice - 0.4;
  const across = (len: number) => Math.max(0, Math.floor((len - 1.2) / (Wn.w + Wn.gap)));
  /** A window's division (a mullion, or a meeting rail) and, in some, an AC unit in its lower sash, out over the walk. */
  const divide = (y: number, z: number, k: number) => {
    if (V.muntin === 1) P.box('trim', 0.05, Wn.h, 0.06, xf + 0.035, y, z);
    else if (V.muntin === 2) P.box('trim', 0.05, 0.06, Wn.w, xf + 0.035, y - Wn.h * 0.08, z);
    if (V.ac && r(500 + k) < V.ac) P.box('trim', 0.26, 0.42, Math.min(0.68, Wn.w - 0.2), xf + 0.15, y - Wn.h / 2 + 0.3, z, new THREE.Color(AC));
  };
  for (let k = 0; ; k++) {
    const y = y0 + k * A.floor + Wn.h / 2;
    if (y + Wn.h / 2 > roofline) break;
    const m = across(W), pitch = Wn.w + Wn.gap;
    for (let i = 0; i < m; i++) {
      const z = (i - (m - 1) / 2) * pitch, lit = r(100 + k * 37 + i) > 0.5;
      P.pane(Wn.w, Wn.h, xf + 0.01, y, z, 'x', lit, 'room');
      P.box('trim', 0.08, 0.08, Wn.w + 0.16, xf + 0.04, y + Wn.h / 2 + 0.04, z);
      P.box('trim', 0.08, Wn.h, 0.08, xf + 0.04, y, z - Wn.w / 2 - 0.04);
      P.box('trim', 0.08, Wn.h, 0.08, xf + 0.04, y, z + Wn.w / 2 + 0.04);
      P.box('trim', 0.16, 0.1, Wn.w + 0.3, xf + 0.08, y - Wn.h / 2 - 0.05, z); // its sill
      if (V !== PLAIN) divide(y, z, k * 37 + i);
    }
    // its ends: a row of windows each (in the depth behind the front's detail), framed and silled as the front's are
    // (they were bare panes flush on the wall: dark stickers, seen end-on)
    const e = across(D - A.depth - 1), ez = W / 2 - A.end;
    for (let i = 0; i < e; i++) {
      const x = body - 0.8 - Wn.w / 2 - i * pitch;
      if (x - Wn.w / 2 < -D / 2 + 0.4) break;
      for (const s2 of [1, -1] as const) {
        P.pane(Wn.w, Wn.h, x, y, s2 * (ez + 0.005), s2 > 0 ? 'z+' : 'z-', r(300 + k * 41 + i + (s2 > 0 ? 0 : 7)) > 0.55, 'room');
        P.box('trim', Wn.w + 0.16, 0.08, 0.08, x, y + Wn.h / 2 + 0.04, s2 * (ez + 0.04));
        for (const j of [-1, 1]) P.box('trim', 0.08, Wn.h, 0.08, x + j * (Wn.w / 2 + 0.04), y, s2 * (ez + 0.04));
        P.box('trim', Wn.w + 0.3, 0.1, 0.16, x, y - Wn.h / 2 - 0.05, s2 * (ez + 0.08)); // its sill
      }
    }
  }
  // pilasters up the taller ones, a cornice along the top of the front
  if (b.h > A.pilasters) {
    const m = across(W), pitch = Wn.w + Wn.gap;
    for (let i = 0; i <= m; i += 2) P.box('trim', 0.2, H - A.cornice - y0, 0.4, xf + 0.1, (y0 + H - A.cornice) / 2, (i - m / 2) * pitch);
  }
  P.box('trim', A.depth, A.cornice, W, front - A.depth / 2, H - A.cornice / 2, 0);
  // under the cornice a frieze band across the front; round the roof's other three edges a coping, so its roofline
  // reads as a parapet's, not a box's edge
  P.box('trim', 0.12, 0.16, W - 2 * A.end, body + 0.06, H - A.cornice - 0.35, 0);
  const [ch, cw] = A.coping;
  for (const s2 of [1, -1]) P.box('trim', D - A.depth, ch, cw, -A.depth / 2, H - ch / 2, s2 * (W / 2 - cw / 2));
  P.box('trim', cw, ch, W - 2 * cw, -D / 2 + cw / 2, H - ch / 2, 0);
  const out = { walls: merged(P.walls), trim: merged(P.trim), glass: merged(P.glass), signs: merged(P.signs) };
  // (mirrored on the road's left: its triangles' winding turned back, so their fronts face out)
  for (const g of Object.values(out)) { if (side < 0) flipWinding(g); g.applyMatrix4(local); }
  return out;
}

/** The whole town's street fronts, merged per material. */
export function facades(blocks: readonly Block[], opts: FacadeOptions = {}): FacadeGeometry {
  const o = { ...opts, shops: opts.shops ?? planShops(blocks, { avoid: opts.avoid }) };
  const all = blocks.map((b) => facadeOf(b, o));
  return { walls: merged(all.map((f) => f.walls)), trim: merged(all.map((f) => f.trim)), glass: merged(all.map((f) => f.glass)), signs: merged(all.map((f) => f.signs)) };
}

/** The street fronts' materials, made once and shared (the town's, and a set's own fronts: scenes/sets/verse2.ts) —
 *  the walls (vertex-coloured toon, their coursing drawn: facadeWalls), the trim (vertex-coloured toon), the glass, the
 *  signs (browser only: the atlas). */
let shared: { walls: THREE.Material; trim: THREE.Material; glass: THREE.Material; signs: THREE.Material } | undefined;
/** A facade's meshes in a group, on the shared materials (browser only). */
export function facadeMeshes(f: FacadeGeometry): THREE.Group {
  // (the panes stand a centimetre off their walls, the signs half that off their bands: past ~100 m that's under the
  // depth buffer's step (near 0.1 m, far 3000 m), and the far blocks' windows flickered in and out of their walls — the
  // user, 2026-10-16, the pastel green ones down the road at the start. A polygon offset pulls them forward by a few
  // of the buffer's own steps, so it grows with the distance as the step does, and is nothing up close.)
  const forward = { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 };
  // (the signs painted, lit and shaded as the wall they're on: unlit, they kept their colours whatever the light and
  // glowed out of the shade — scenes/sets/kit.ts paint)
  shared ??= { walls: facadeWalls(), trim: toon({ vertexColors: true }), glass: Object.assign(nightGlass(), forward), signs: toon({ map: signAtlas(), ...forward }) };
  const g = new THREE.Group();
  g.add(new THREE.Mesh(f.walls, shared.walls), new THREE.Mesh(f.trim, shared.trim), new THREE.Mesh(f.glass, shared.glass), new THREE.Mesh(f.signs, shared.signs));
  return g;
}

/** The walls' toon, its `surface` attribute (SURFACE) drawn on it in world space along each wall: brick's running
 *  bond (its mortar paler, a brick now and then a shade off), painted block's courses (their joints in shadow),
 *  scored stucco's bands; plain stucco as it was.
 *  Its joints are box-filtered over each pixel's footprint (surfJoint), so a joint finer than a pixel is drawn as the
 *  share of the pixel it covers, and the wall's average holds at any distance. Their light-and-dark contrast fades out,
 *  to that average, while a course is still more than five pixels tall (FADE). Past that, brick keeps its joints only
 *  in hue and its bricks only as a random mottle.
 *  Mortar lines a pixel or two wide and a few pixels apart are what crawled. Brick at 15 s and 43 s rolled with "crazy
 *  wave patterns ... as the camera moves" (the user, 2026-10-19). The lines beat against the pixel grid, and in the
 *  shade against the print's 5.5 px halftone screen (look/print.ts). The old fade let full-contrast pale mortar down to
 *  about two pixels a course. Its antialiasing widened a joint with the pixel's footprint instead of averaging it, so
 *  the wall changed its tone as it receded. And it took its derivatives inside the per-pixel branch. */
const FADE = [1 / 14, 1 / 5.5] as const; // (cells per pixel: a course 14 px tall shows its joints' contrast in full, 5.5 px or less none)
export function facadeWalls(): THREE.MeshToonMaterial {
  const m = toon({ vertexColors: true });
  m.onBeforeCompile = (sh) => {
    printShadows(sh);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
attribute float surface; varying float vSurf; varying vec3 vSurfPos; varying vec3 vSurfN;`)
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
  vSurf = surface; vSurfPos = (modelMatrix * vec4(transformed, 1.0)).xyz; vSurfN = normalize(mat3(modelMatrix) * objectNormal);`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying float vSurf; varying vec3 vSurfPos; varying vec3 vSurfN;
float surfHash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
// (the joints' coverage from a cell's edge to x: they are 2*hw of each cell, shifted to start it)
float surfJointI(float x, float jw) { return floor(x) * jw + min(fract(x), jw); }
// (how much of a box w wide (cells), centred at f (the cell's fract), falls on its joints, which run hw either side of
// the cell's edge: the pattern box-filtered, so as w grows it settles to 2*hw, the joints' share of the wall)
float surfJoint(float f, float w, float hw) { float x = f + hw, h = 0.5 * max(w, 1e-4); return (surfJointI(x + h, 2.0 * hw) - surfJointI(x - h, 2.0 * hw)) / (2.0 * h); }
// (how much of a pattern's detail is left, 1 to 0, by its cells per pixel)
float surfDetail(float w) { return 1.0 - smoothstep(${FADE[0].toFixed(4)}, ${FADE[1].toFixed(4)}, w); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
  // the wall's plane, across along it and up; and how many metres a pixel spans on it each way, taken here outside any
  // branch (a derivative inside a branch that some of its neighbours skip is undefined)
  vec3 sTng = vec3(-vSurfN.z, 0.0, vSurfN.x); sTng /= max(length(sTng), 1e-4);
  vec2 sP = vec2(dot(vSurfPos, sTng), vSurfPos.y), sDx = dFdx(sP), sDy = dFdy(sP);
  vec2 sPx = sqrt(sDx * sDx + sDy * sDy);
  if (vSurf > 0.5 && abs(vSurfN.y) < 0.5) {
    vec3 base = diffuseColor.rgb;
    if (vSurf < 1.5) {
      // brick: 0.09 m courses of 0.25 m bricks, running bond; the mortar paler, greyed; a brick now and then a shade off
      vec2 cell = vec2(0.25, 0.09), g = vec2(sP.x / cell.x + 0.5 * mod(floor(sP.y / cell.y), 2.0), sP.y / cell.y), w = sPx / cell, fr = fract(g);
      // Down the street the joints stay while a course is 3 px or more, but there the mortar is a grey within a few
      // percent of the brick's own luma. The print's halftone dots and violet shade go by luma (look/print.ts), so a
      // joint that differs from its brick in hue alone moves no dot. Up close it pales, as mortar does.
      float lines = 1.0 - smoothstep(1.0 / 6.0, 1.0 / 3.0, w.y), linesX = lines * (1.0 - smoothstep(1.0 / 6.0, 1.0 / 3.0, w.x));
      float bed = mix(0.14, surfJoint(fr.y, 1.5 * w.y, 0.07), lines), head = mix(0.05, surfJoint(fr.x, 1.5 * w.x, 0.025), linesX);
      vec3 grey = vec3(0.74, 0.71, 0.66) / 0.713 * dot(base, vec3(0.2126, 0.7152, 0.0722));
      vec3 mortar = mix(mix(base, grey * 1.06, 0.85), mix(base, vec3(0.74, 0.71, 0.66) * (0.6 + 0.4 * dot(base, vec3(0.6))), 0.4), surfDetail(w.y));
      // each brick its own shade, a mottle with no rhythm that outlasts the joints, so a brick a few pixels tall still reads
      float tone = (1.0 - smoothstep(1.0 / 6.0, 1.0 / 2.5, max(w.y, w.x))) * (surfHash(floor(g)) - 0.5);
      diffuseColor.rgb = mix(base * (1.0 + 0.4 * tone), mortar, 1.0 - (1.0 - bed) * (1.0 - head));
    } else if (vSurf < 2.5) {
      // painted block: 0.2 m courses of 0.4 m blocks, running bond; the joints struck in, in shadow
      vec2 cell = vec2(0.4, 0.2), g = vec2(sP.x / cell.x + 0.5 * mod(floor(sP.y / cell.y), 2.0), sP.y / cell.y), w = sPx / cell, fr = fract(g);
      float dy = surfDetail(w.y), dxy = dy * surfDetail(w.x);
      float bed = mix(0.06, surfJoint(fr.y, 1.5 * w.y, 0.03), dy), head = mix(0.03, surfJoint(fr.x, 1.5 * w.x, 0.015), dxy);
      diffuseColor.rgb = base * (1.0 - 0.16 * (1.0 - (1.0 - bed) * (1.0 - head)));
    } else {
      // scored stucco: a reveal every 0.6 m up the wall
      float w = sPx.y / 0.6;
      diffuseColor.rgb = base * (1.0 - 0.14 * mix(0.024, surfJoint(fract(sP.y / 0.6), 1.5 * w, 0.012), surfDetail(w)));
    }
  }`);
  };
  m.customProgramCacheKey = () => 'facadeWalls';
  return m;
}

/** The shops' signs, a cell each, drawn once (browser only: a canvas). (The town drew it twice: once for the fronts,
 *  once for the rooftop signs.) Each its own paint (SIGN_COLOURS) and its own sign painter's border — a keyline, a
 *  double keyline, or rules over and under its words; a name too long for one line on two. */
let atlas: THREE.CanvasTexture | undefined;
export function signAtlas(): THREE.CanvasTexture {
  return (atlas ??= drawSignAtlas());
}
function drawSignAtlas(): THREE.CanvasTexture {
  const { cw, ch } = ATLAS, cv = document.createElement('canvas');
  cv.width = cw * ATLAS.cols; cv.height = ch * ATLAS_ROWS;
  const c = cv.getContext('2d')!;
  SHOPS.forEach(({ name }, k) => {
    const x = (k % ATLAS.cols) * cw, y = Math.floor(k / ATLAS.cols) * ch, [bg, ink] = SIGN_COLOURS[(k * 5) % SIGN_COLOURS.length]!, border = (k * 7) % 3;
    c.fillStyle = bg; c.fillRect(x, y, cw, ch);
    c.strokeStyle = ink; c.fillStyle = ink;
    if (border === 0) { c.lineWidth = 3; c.strokeRect(x + 5, y + 5, cw - 10, ch - 10); }
    else if (border === 1) { c.lineWidth = 2; c.strokeRect(x + 4, y + 4, cw - 8, ch - 8); c.strokeRect(x + 9, y + 9, cw - 18, ch - 18); }
    else { c.fillRect(x + 14, y + 8, cw - 28, 3); c.fillRect(x + 14, y + ch - 11, cw - 28, 3); }
    // its words: one line, as big as fits; or, too long for that, two (split where the lines come out most even)
    const maxW = cw * 0.86, width = (lines: string[], px: number) => { c.font = font(F.sign(700), px); return Math.max(...lines.map((l) => c.measureText(l).width)); };
    let lines = [name], px = ch * 0.5;
    const words = name.split(' ');
    if (width(lines, px) > maxW && name.includes(' · ')) { lines = name.split(' · ').slice(0, 2); px = ch * 0.34; } // (two trades, a line each)
    else if (width(lines, px) > maxW && words.length > 1) {
      let best: string[] = [];
      for (let i = 1; i < words.length; i++) {
        const two = [words.slice(0, i).join(' '), words.slice(i).join(' ')], longest = (ls: string[]) => Math.max(...ls.map((l) => l.length));
        if (!best.length || longest(two) < longest(best)) best = two;
      }
      lines = best; px = ch * 0.34;
    }
    px *= Math.min(1, Math.max(0.72, maxW / width(lines, px)));
    c.font = font(F.sign(700), px); c.textAlign = 'center'; c.textBaseline = 'middle';
    lines.forEach((l, i) => c.fillText(l, x + cw / 2, y + ch * (lines.length === 1 ? 0.54 : 0.32 + 0.38 * i), maxW));
  });
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
