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
import { WORLD, toon } from './toon';
import { F, font } from '../engine/type';
import { BEHIND, nightGlass } from './night';
import type { Block } from '../drive/blocks';

/** How deep the front's detail is (m: the body stands this far behind the box's front); the storefront (its glass's
 *  top, the sign band, a bay's width); the floors above (their height, a window's width, height, the gap between);
 *  the cornice's height; the pilasters from this height up; how far the ends stand in from the box's (room for their
 *  windows' frames and sills: their panes were bare glass flush on the wall), the coping round the roof's other edges
 *  (its height, its width) (m). */
export const FACADE = { depth: 0.3, shop: { top: 3.0, band: [3.15, 3.95] as [number, number], bay: 3.2 }, floor: 3.3, win: { w: 1.3, h: 1.7, gap: 1.3 }, cornice: 0.55, pilasters: 14, end: 0.18, coping: [0.3, 0.32] as [number, number] };
/** The shops' names (the signs' face, F.sign: never the lyrics'), and how many the atlas holds a row. */
export const SHOPS = ['LIQUOR', 'DONUTS', 'TACOS', 'TIRES', 'BEAUTY SUPPLY', 'CHECKS CASHED', 'LAUNDROMAT', 'PAWN', 'WIGS', 'BAIL BONDS', 'PHO', 'MARKET', 'NAILS', 'DENTIST', 'INCOME TAX', 'RECORDS'] as const;
const ATLAS_COLS = 4;
const SIGN_COLOURS: readonly [string, string][] = [['#f4f0e6', '#c8202e'], ['#1d2026', '#ffd65a'], ['#c8202e', '#fff6e0'], ['#2b78a6', '#ffffff'], ['#ffd65a', '#1d2026'], ['#1f6b44', '#f4f0e6']];

export interface FacadeGeometry { walls: THREE.BufferGeometry; trim: THREE.BufferGeometry; glass: THREE.BufferGeometry; signs: THREE.BufferGeometry }

/** Collects a facade's parts in its block's local frame (x across, + out of its front; y up from its ground; z along).
 *  Its walls darken toward the ground by `grime` (a share: years of dust and splash, read in their vertex colours). */
class Parts {
  walls: THREE.BufferGeometry[] = []; trim: THREE.BufferGeometry[] = []; glass: THREE.BufferGeometry[] = []; signs: THREE.BufferGeometry[] = [];
  constructor(private wall: THREE.Color, private trimC: THREE.Color, private mirrored: boolean, private grime = 0, private H = 1, private trade = 0) {}
  private coloured(g: THREE.BufferGeometry, c: THREE.Color, grime = 0) {
    const n = g.getAttribute('position').count, a = new Float32Array(n * 3), y = g.getAttribute('position');
    for (let i = 0; i < n; i++) { const k = 1 - grime * (1 - Math.min(1, Math.max(0, y.getY(i) / this.H))); a.set([c.r * k, c.g * k, c.b * k], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    return g;
  }
  /** A box on the walls or the trim, in their colour or its own. */
  box(to: 'walls' | 'trim', w: number, h: number, d: number, x: number, y: number, z: number, colour?: THREE.Color) {
    const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z);
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
    const uv = g.getAttribute('uv'), rows = Math.ceil(SHOPS.length / ATLAS_COLS), cx = k % ATLAS_COLS, cy = Math.floor(k / ATLAS_COLS);
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (cx + (this.mirrored ? 1 - uv.getX(i) : uv.getX(i))) / ATLAS_COLS, 1 - (cy + 1 - uv.getY(i)) / rows);
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
/** What each shop (SHOPS) shows through its glass (look/night.ts nightGlass: 0 shelves, 1 a rail of clothes, 2 a counter
 *  under a menu board, 3 bills taped up, 4 an office's blinds): the liquor store its shelves, the taco shop its counter,
 *  the tax office its blinds. */
const TRADE_OF: readonly number[] = [0, 2, 2, 3, 0, 3, 3, 0, 1, 4, 2, 0, 4, 4, 4, 3];

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
  /** What its shop sells, seen through its glass (TRADE_OF). */
  trade: number;
}
const PLAIN: Style = { trade: 0, bay: FACADE.shop.bay, bulk: 0.35, bulkC: null, pier: 0.12, pierC: null, frameC: null, transom: false, recess: false, shutter: false, win: FACADE.win, muntin: 0, ac: 0, sign: 0, signW: 0.62, grime: 0, faded: false };
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
    trade: TRADE_OF[Math.floor(r(5) * SHOPS.length)]!, // (its sign's: r(5) picks its name)
  };
}

export interface FacadeOptions { /** Each front its own treatment (styleOf), not the town's one. */ vary?: boolean }

/** What a block's front is, as facadeOf builds it: low apartments over a carport (no shop) or a shop (its name: SHOPS),
 *  and whether it has floors over its storefront (windows up its front and its ends) — what a set dressing a block's
 *  blank end needs to know of it (scenes/sets/verse2.ts, the tire shop's). */
export function facadeTraits(b: Block, opts: FacadeOptions = {}): { apartments: boolean; shop: (typeof SHOPS)[number]; upper: boolean } {
  const r = (k: number) => hash(b.s, b.lateral, k), V = opts.vary ? styleOf(r) : PLAIN;
  const apartments = b.h <= 9 && r(2) > 0.72 && !b.corner;
  return { apartments, shop: SHOPS[Math.floor(r(5) * SHOPS.length)]!, upper: (apartments ? 3.3 : 4.3) + V.win.h <= b.h - FACADE.cornice - 0.4 };
}

/** One block's street front, in world space. */
export function facadeOf(b: Block, opts: FacadeOptions = {}): FacadeGeometry {
  // (the block's box: its matrix scales a unit cube; unscaled, it's the local frame. Its x axis runs away from the
  // road's right: on the road's right the front is +x, on its left -x; a mirror in x puts every front at +x)
  const sx = new THREE.Vector3().setFromMatrixColumn(b.matrix, 0).length(), sy = new THREE.Vector3().setFromMatrixColumn(b.matrix, 1).length(), sz = new THREE.Vector3().setFromMatrixColumn(b.matrix, 2).length();
  const side = Math.sign(b.lateral) || 1;
  const local = b.matrix.clone().multiply(new THREE.Matrix4().makeScale(side / sx, 1 / sy, 1 / sz)).multiply(new THREE.Matrix4().makeTranslation(0, -sy / 2, 0));
  const D = sx, H = sy, W = sz, A = FACADE, front = D / 2, body = front - A.depth;
  const stucco = new THREE.Color(WORLD.stucco[Math.floor(b.color * WORLD.stucco.length)]!);
  const r = (k: number) => hash(b.s, b.lateral, k), V = opts.vary ? styleOf(r) : PLAIN;
  let trimC = r(1) < 0.5 ? stucco.clone().lerp(new THREE.Color('#ffffff'), 0.55) : stucco.clone().multiplyScalar(0.62);
  if (V.faded) trimC = trimC.lerp(stucco, 0.5); // (sun-faded toward the wall)
  const P = new Parts(stucco, trimC, side < 0, V.grime, H, V.trade);
  const col = (c: string | null) => (c ? new THREE.Color(c) : undefined);
  // (the ground: the road's level is its box's bottom plus its lift; the facade starts at the road)
  const g0 = H - b.h;
  // the ground floor: a storefront (bays of glass, a door, a base course, the sign band), or a carport on low apartments
  const T = facadeTraits(b, opts), apartments = T.apartments, xf = body;
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
    const sw = Math.min(W * V.signW, 9), shop = SHOPS.indexOf(T.shop), sz2 = (r(4) - 0.5) * W * 0.2;
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
  const all = blocks.map((b) => facadeOf(b, opts));
  return { walls: merged(all.map((f) => f.walls)), trim: merged(all.map((f) => f.trim)), glass: merged(all.map((f) => f.glass)), signs: merged(all.map((f) => f.signs)) };
}

/** The street fronts' materials, made once and shared (the town's, and a set's own fronts: scenes/sets/verse2.ts) —
 *  one vertex-coloured toon for the walls and the trim, the glass, the signs (browser only: the atlas). */
let shared: { body: THREE.Material; glass: THREE.Material; signs: THREE.Material } | undefined;
/** A facade's meshes in a group, on the shared materials (browser only). */
export function facadeMeshes(f: FacadeGeometry): THREE.Group {
  // (the panes stand a centimetre off their walls, the signs half that off their bands: past ~100 m that's under the
  // depth buffer's step (near 0.1 m, far 3000 m), and the far blocks' windows flickered in and out of their walls — the
  // user, 2026-10-16, the pastel green ones down the road at the start. A polygon offset pulls them forward by a few
  // of the buffer's own steps, so it grows with the distance as the step does, and is nothing up close.)
  const forward = { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 };
  shared ??= { body: toon({ vertexColors: true }), glass: Object.assign(nightGlass(), forward), signs: new THREE.MeshBasicMaterial({ map: signAtlas(), ...forward }) };
  const g = new THREE.Group();
  g.add(new THREE.Mesh(f.walls, shared.body), new THREE.Mesh(f.trim, shared.body), new THREE.Mesh(f.glass, shared.glass), new THREE.Mesh(f.signs, shared.signs));
  return g;
}

/** The shops' signs, a cell each, drawn once (browser only: a canvas). (The town drew it twice: once for the fronts,
 *  once for the rooftop signs.) */
let atlas: THREE.CanvasTexture | undefined;
export function signAtlas(): THREE.CanvasTexture {
  return (atlas ??= drawSignAtlas());
}
function drawSignAtlas(): THREE.CanvasTexture {
  const cw = 512, ch = 112, rows = Math.ceil(SHOPS.length / ATLAS_COLS), cv = document.createElement('canvas');
  cv.width = cw * ATLAS_COLS; cv.height = ch * rows;
  const c = cv.getContext('2d')!;
  SHOPS.forEach((name, k) => {
    const x = (k % ATLAS_COLS) * cw, y = Math.floor(k / ATLAS_COLS) * ch, [bg, ink] = SIGN_COLOURS[k % SIGN_COLOURS.length]!;
    c.fillStyle = bg; c.fillRect(x, y, cw, ch);
    c.strokeStyle = ink; c.lineWidth = 4; c.strokeRect(x + 6, y + 6, cw - 12, ch - 12);
    c.fillStyle = ink; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = font(F.sign(700), ch * 0.5);
    c.fillText(name, x + cw / 2, y + ch * 0.54, cw * 0.88);
  });
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
