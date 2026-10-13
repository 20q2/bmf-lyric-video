// The town's buildings as LA street fronts (spec §3), not boxes with a window grid. Each block (blocks.ts) gets:
//   - a stucco body standing a hand's width behind its box's front;
//   - in that depth, its storefront (glass bays, a door, a base course, a sign band with a shop's name) or, on low
//     apartments, a carport's dark mouth;
//   - its upper floors' windows (frames, sills; on its two ends too);
//   - pilasters up the taller ones, and a cornice.
// Every part stays inside the block's box, which is what the guard checks (tests/town.test.ts). Seeded by the block's
// place. The geometry is pure (bun builds it under test); world.ts gives it materials, and the sign atlas is drawn in
// the browser (signAtlas).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { hash } from '../engine/util';
import { WORLD } from './toon';
import { F, font } from '../engine/type';
import type { Block } from '../drive/blocks';

/** How deep the front's detail is (m: the body stands this far behind the box's front); the storefront (its glass's
 *  top, the sign band, a bay's width); the floors above (their height, a window's width, height, the gap between);
 *  the cornice's height; the pilasters from this height up (m). */
export const FACADE = { depth: 0.3, shop: { top: 3.0, band: [3.15, 3.95] as [number, number], bay: 3.2 }, floor: 3.3, win: { w: 1.3, h: 1.7, gap: 1.3 }, cornice: 0.55, pilasters: 14 };
/** The shops' names (the signs' face, F.sign: never the lyrics'), and how many the atlas holds a row. */
export const SHOPS = ['LIQUOR', 'DONUTS', 'TACOS', 'TIRES', 'BEAUTY SUPPLY', 'CHECKS CASHED', 'LAUNDROMAT', 'PAWN', 'WIGS', 'BAIL BONDS', 'PHO', 'MARKET', 'NAILS', 'DENTIST', 'INCOME TAX', 'RECORDS'] as const;
const ATLAS_COLS = 4;
const SIGN_COLOURS: readonly [string, string][] = [['#f4f0e6', '#c8202e'], ['#1d2026', '#ffd65a'], ['#c8202e', '#fff6e0'], ['#2b78a6', '#ffffff'], ['#ffd65a', '#1d2026'], ['#1f6b44', '#f4f0e6']];

export interface FacadeGeometry { walls: THREE.BufferGeometry; trim: THREE.BufferGeometry; glass: THREE.BufferGeometry; signs: THREE.BufferGeometry }

/** Collects a facade's parts in its block's local frame (x across, + out of its front; y up from its ground; z along). */
class Parts {
  walls: THREE.BufferGeometry[] = []; trim: THREE.BufferGeometry[] = []; glass: THREE.BufferGeometry[] = []; signs: THREE.BufferGeometry[] = [];
  constructor(private wall: THREE.Color, private trimC: THREE.Color, private mirrored: boolean) {}
  private coloured(g: THREE.BufferGeometry, c: THREE.Color) {
    const n = g.getAttribute('position').count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    return g;
  }
  box(to: 'walls' | 'trim', w: number, h: number, d: number, x: number, y: number, z: number) {
    const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z);
    this[to].push(this.coloured(g, to === 'walls' ? this.wall : this.trimC));
  }
  /** A pane facing +x (out of the front) or along ±z (an end), lit at night if `lit`. */
  pane(w: number, h: number, x: number, y: number, z: number, facing: 'x' | 'z+' | 'z-', lit: boolean) {
    const g = new THREE.PlaneGeometry(w, h);
    if (facing === 'x') g.rotateY(Math.PI / 2); else if (facing === 'z-') g.rotateY(Math.PI);
    g.translate(x, y, z);
    g.setAttribute('lit', new THREE.BufferAttribute(new Float32Array(g.getAttribute('position').count).fill(lit ? 1 : 0), 1));
    this.glass.push(g);
  }
  /** A shop's sign on its band, facing +x, its texture the atlas's cell `k` (turned back on a mirrored front, so its
   *  name reads the right way round). */
  sign(w: number, h: number, x: number, y: number, z: number, k: number) {
    const g = new THREE.PlaneGeometry(w, h); g.rotateY(Math.PI / 2); g.translate(x, y, z);
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

/** One block's street front, in world space. */
export function facadeOf(b: Block): FacadeGeometry {
  // (the block's box: its matrix scales a unit cube; unscaled, it's the local frame. Its x axis runs away from the
  // road's right: on the road's right the front is +x, on its left -x; a mirror in x puts every front at +x)
  const sx = new THREE.Vector3().setFromMatrixColumn(b.matrix, 0).length(), sy = new THREE.Vector3().setFromMatrixColumn(b.matrix, 1).length(), sz = new THREE.Vector3().setFromMatrixColumn(b.matrix, 2).length();
  const side = Math.sign(b.lateral) || 1;
  const local = b.matrix.clone().multiply(new THREE.Matrix4().makeScale(side / sx, 1 / sy, 1 / sz)).multiply(new THREE.Matrix4().makeTranslation(0, -sy / 2, 0));
  const D = sx, H = sy, W = sz, A = FACADE, front = D / 2, body = front - A.depth;
  const stucco = new THREE.Color(WORLD.stucco[Math.floor(b.color * WORLD.stucco.length)]!);
  const r = (k: number) => hash(b.s, b.lateral, k);
  const trimC = r(1) < 0.5 ? stucco.clone().lerp(new THREE.Color('#ffffff'), 0.55) : stucco.clone().multiplyScalar(0.62);
  const P = new Parts(stucco, trimC, side < 0);
  // (the ground: the road's level is its box's bottom plus its lift; the facade starts at the road)
  const g0 = H - b.h;
  // the body, behind the front's depth
  P.box('walls', D - A.depth, H, W - 0.02, -A.depth / 2, H / 2, 0);
  // the ground floor: a storefront (bays of glass, a door, a base course, the sign band), or a carport on low apartments
  const apartments = b.h <= 9 && r(2) > 0.72, xf = body;
  if (!apartments) {
    const n = Math.max(1, Math.floor((W - 1) / A.shop.bay)), bw = (W - 1) / n, door = Math.floor(r(3) * n);
    for (let i = 0; i < n; i++) {
      const z = -W / 2 + 0.5 + bw * (i + 0.5);
      P.pane(bw - 0.24, A.shop.top - 0.45, xf + 0.02, g0 + 0.35 + (A.shop.top - 0.45) / 2, z, 'x', i !== door && r(10 + i) > 0.45);
      if (i > 0) P.box('trim', 0.12, A.shop.top, 0.12, xf + 0.06, g0 + A.shop.top / 2, z - bw / 2);
    }
    P.box('trim', 0.08, 0.35, W - 0.6, xf + 0.04, g0 + 0.175, 0); // the base course
    const [b0, b1] = A.shop.band;
    P.box('trim', 0.16, b1 - b0, W - 0.4, xf + 0.08, g0 + (b0 + b1) / 2, 0);
    P.sign(Math.min(W * 0.62, 9), (b1 - b0) * 0.78, xf + 0.165, g0 + (b0 + b1) / 2, (r(4) - 0.5) * W * 0.2, Math.floor(r(5) * SHOPS.length));
  } else {
    P.pane(Math.min(W * 0.5, 7), 2.4, xf + 0.02, g0 + 1.2, (r(6) - 0.5) * W * 0.3, 'x', false); // the carport's dark mouth
  }
  // the floors above: framed windows with sills, on its front and its two ends
  const y0 = g0 + (apartments ? 3.3 : 4.3), top = H - A.cornice - 0.4;
  const across = (len: number) => Math.max(0, Math.floor((len - 1.2) / (A.win.w + A.win.gap)));
  for (let k = 0; ; k++) {
    const y = y0 + k * A.floor + A.win.h / 2;
    if (y + A.win.h / 2 > top) break;
    const m = across(W), pitch = A.win.w + A.win.gap;
    for (let i = 0; i < m; i++) {
      const z = (i - (m - 1) / 2) * pitch, lit = r(100 + k * 37 + i) > 0.5;
      P.pane(A.win.w, A.win.h, xf + 0.01, y, z, 'x', lit);
      P.box('trim', 0.08, 0.08, A.win.w + 0.16, xf + 0.04, y + A.win.h / 2 + 0.04, z);
      P.box('trim', 0.08, A.win.h, 0.08, xf + 0.04, y, z - A.win.w / 2 - 0.04);
      P.box('trim', 0.08, A.win.h, 0.08, xf + 0.04, y, z + A.win.w / 2 + 0.04);
      P.box('trim', 0.16, 0.1, A.win.w + 0.3, xf + 0.08, y - A.win.h / 2 - 0.05, z); // its sill
    }
    // its ends: a column of windows each (in the depth behind the front's detail)
    const e = across(D - A.depth - 1);
    for (let i = 0; i < e; i++) {
      const x = body - 0.8 - A.win.w / 2 - i * pitch;
      if (x - A.win.w / 2 < -D / 2 + 0.4) break;
      for (const sz2 of [1, -1] as const) P.pane(A.win.w, A.win.h, x, y, sz2 * (W / 2 - 0.005), sz2 > 0 ? 'z+' : 'z-', r(300 + k * 41 + i + (sz2 > 0 ? 0 : 7)) > 0.55);
    }
  }
  // pilasters up the taller ones, a cornice along the top of the front
  if (b.h > A.pilasters) {
    const m = across(W), pitch = A.win.w + A.win.gap;
    for (let i = 0; i <= m; i += 2) P.box('trim', 0.2, H - A.cornice - y0, 0.4, xf + 0.1, (y0 + H - A.cornice) / 2, (i - m / 2) * pitch);
  }
  P.box('trim', A.depth, A.cornice, W, front - A.depth / 2, H - A.cornice / 2, 0);
  const out = { walls: merged(P.walls), trim: merged(P.trim), glass: merged(P.glass), signs: merged(P.signs) };
  // (mirrored on the road's left: its triangles' winding turned back, so their fronts face out)
  for (const g of Object.values(out)) { if (side < 0) flipWinding(g); g.applyMatrix4(local); }
  return out;
}

/** The whole town's street fronts, merged per material. */
export function facades(blocks: readonly Block[]): FacadeGeometry {
  const all = blocks.map(facadeOf);
  return { walls: merged(all.map((f) => f.walls)), trim: merged(all.map((f) => f.trim)), glass: merged(all.map((f) => f.glass)), signs: merged(all.map((f) => f.signs)) };
}

/** The shops' signs, a cell each (browser only: a canvas). */
export function signAtlas(): THREE.CanvasTexture {
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
