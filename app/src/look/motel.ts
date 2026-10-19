// The motel on the corner where the video opens and the end comes back to (drive/landmarks.ts: its pole sign): a '60s LA
// motor court round its lot (the user, 2026-10-18: "improve the fidelity of the motel in the starting scene"; it was one
// pink box with a row of doors on its face, the windows of every town block printed over them by its wall's shader).
//   - two storeys of rooms in an L: a wing across the back of the lot, its rooms facing the corner, and one down its far
//     side facing the road; a covered walkway along the upper floor on slim columns, its railing of pickets, a steel
//     stair up to it from the lot at each wing's street end;
//   - each room a numbered door with a lamp by it, an aluminium slider with drapes drawn behind it (some lit by night:
//     look/night.ts nightGlass's `drapes`) and a through-wall air conditioner under its sill;
//   - a flat roof with a deep overhang and a cream fascia, ledgestone on the wings' street ends and the columns' feet,
//     breeze block closing the walkway's end;
//   - the office at the street end of the lot, a glass box under a roof swept up toward the corner, OFFICE in neon over
//     its lobby (lit day and night), stone under its glass, a breeze-block screen down its street side;
//   - the lot: asphalt, its bays striped, a few cars nosed in; the pool in the L's corner behind its fence; the ice and
//     soda machines under the stair; planters;
//   - the pole sign: its face as it was (where it was, its size: the title), now in an enamelled cabinet edged with
//     bulbs, on two steel poles out of a stone planter, an arrow under it pointing into the lot and a starburst over it.
// Low and muted: it frames the title, it doesn't compete with it. The static parts tinted and fused per wing (kit.ts),
// the glass, the doors and each painted surface one mesh a piece. Browser only (canvas).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Route } from '../drive/route';
import { MOTEL_SIGN, motelSign } from '../drive/landmarks';
import { canvasTex, fuse, paint, part, rightFront, roadFrame, sedan, tball, tbox, tcyl } from '../scenes/sets/kit';
import { hash } from '../engine/util';
import { F, font } from '../engine/type';
import { WORLD, toon } from './toon';
import { BEHIND, GLOW, LIT, glowMaterial, lampMaterial, nightGlass } from './night';
import { PALM, palmVariant } from './palms';

/** The motel's palette (sRGB): muted, a dusty pink stucco with cream trim, the doors a grey teal, aluminium frames. */
const C = {
  wall: '#e6b1ae', base: '#c09294', trim: '#ece3cf', stripe: '#6b8584', door: '#557a76', frame: '#c4c0b6', roof: '#8e8580',
  slab: '#cbc1b2', soffit: '#e6dcc8', ac: '#d2c9b4', grille: '#857f75', rail: '#ece6d8', steel: '#3c4446', asphalt: '#6c5f68',
  stripeLot: '#e9e1cc', stop: '#bdb4a6', soil: '#4a3a32', shrub: '#4d6a4a', shrub2: '#66784f', deck: '#d8cfbf', water: '#76a6a2',
};
/** The rooms (m): a floor's height (the upper floor's level), the walls' top under the roof, a bay's width, a wing's
 *  depth, the walkway's; the ground floor's apron. */
const R = { floor: 3.3, top: 6.5, bay: 3.3, depth: 8, walk: 1.85, apron: 0.12 };
/** The wings, in their own frames (x along the face as it's seen from the lot, z out of it; m): the back wing's face on
 *  the road's s, its far end off the road's centre, its length, its bays' first x and count, its columns' first x; the
 *  side wing's near end on s, its face off the road, its length, bays' width and count. */
const A = { s: -20, lat: 41, len: 31.8, bay0: 9.7, bays: 6, stair: [27.2, 31.6] as [number, number] };
const B = { s: -2.2, lat: 33, len: 17.8, walk: 15.95, bay: 3.22, bays: 5 };
/** The office: its front on s, its court side off the road, its width and depth, its walls' height at the back and
 *  the front (its roof swept up toward the corner). */
const O = { s: -8, lat: 16, w: 6.5, d: 7, back: 3.5, front: 4.3 };

/** A box geometry its uvs in metres over `tile` (u, v), for the painted surfaces that repeat (stone, breeze block). */
function texBox(w: number, h: number, d: number, tu: number, tv = tu): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.getAttribute('uv') as THREE.BufferAttribute;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) { const i = f * 4 + v; uv.setXY(i, (uv.getX(i) * dims[f]![0]!) / tu, (uv.getY(i) * dims[f]![1]!) / tv); }
  return g;
}
/** A plane its uvs in metres over `tile`. */
function texPlane(w: number, h: number, tu: number, tv = tu): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(w, h), uv = g.getAttribute('uv') as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / tu, (uv.getY(i) * h) / tv);
  return g;
}
const at = (g: THREE.BufferGeometry, x: number, y: number, z: number, ry = 0) => { if (ry) g.rotateY(ry); return g.translate(x, y, z); };

// ---- the painted surfaces

/** Ledgestone: courses of long flat stones in tans and greys, dark joints between (a tile 1.6 m square). */
const STONE_TILE = 1.6;
function stoneTex(): THREE.CanvasTexture {
  const t = canvasTex(512, 512, (c) => {
    c.fillStyle = '#5f564d'; c.fillRect(0, 0, 512, 512);
    const tones = ['#b8a68c', '#a8957c', '#9c8f80', '#c2b39a', '#8f7f6e', '#b49a82', '#a39e92'];
    let y = 0, row = 0;
    while (y < 512) {
      const h = Math.min(512 - y, 26 + Math.floor(44 * hash(row, 1))), off = -Math.floor(150 * hash(row, 2));
      for (let x = off, k = 0; x < 512; k++) {
        const w = 60 + Math.floor(140 * hash(row, k, 3));
        c.fillStyle = tones[Math.floor(hash(row, k, 4) * tones.length)]!;
        c.fillRect(x + 3, y + 3, w - 6, h - 6);
        c.fillStyle = 'rgba(255,248,230,0.18)'; c.fillRect(x + 3, y + 3, w - 6, 4); // (its top edge catching the light)
        c.fillStyle = 'rgba(40,30,20,0.18)'; c.fillRect(x + 3, y + h - 7, w - 6, 4);
        // the piece wrapped round the tile's edge
        if (x + w > 512) { c.fillStyle = tones[Math.floor(hash(row, k, 4) * tones.length)]!; c.fillRect(x + 3 - 512, y + 3, w - 6, h - 6); }
        x += w;
      }
      y += h; row++;
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
/** Breeze block: a cast block 40 cm square, four petals cut through it round a boss (transparent: alpha-tested). */
const BREEZE_TILE = 0.4;
function breezeTex(): THREE.CanvasTexture {
  const t = canvasTex(128, 128, (c) => {
    c.fillStyle = '#e3dac6'; c.fillRect(0, 0, 128, 128);
    c.globalCompositeOperation = 'destination-out';
    for (const [x, y] of [[40, 40], [88, 40], [40, 88], [88, 88]]) { c.beginPath(); c.arc(x!, y!, 25, 0, Math.PI * 2); c.fill(); }
    c.globalCompositeOperation = 'source-over';
    c.fillStyle = '#e3dac6'; c.beginPath(); c.arc(64, 64, 13, 0, Math.PI * 2); c.fill();
    c.fillRect(60, 0, 8, 128); c.fillRect(0, 60, 128, 8); // (the ribs between the petals)
    c.strokeStyle = 'rgba(90,80,64,0.35)'; c.lineWidth = 5; c.strokeRect(2.5, 2.5, 123, 123); // (the joints)
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
/** The railing's pickets and the pool fence's (a tile 0.5 m wide: four pickets, transparent between). */
const PICKET_TILE = 0.5;
function picketTex(): THREE.CanvasTexture {
  const t = canvasTex(128, 64, (c) => {
    c.clearRect(0, 0, 128, 64);
    c.fillStyle = '#ffffff';
    for (let k = 0; k < 4; k++) c.fillRect(k * 32 + 12, 0, 8, 64);
  });
  t.wrapS = THREE.RepeatWrapping;
  return t;
}
/** The doors: each a flush door in the motel's grey teal, its number on a cream plate, a peephole, a brass knob, a kick
 *  plate; one cell each of an 8 x 4 atlas, in the order given. */
function doorAtlas(nums: string[]): THREE.CanvasTexture {
  return canvasTex(1024, 1024, (c) => {
    nums.forEach((n, i) => {
      const x = (i % 8) * 128, y = Math.floor(i / 8) * 256;
      c.fillStyle = C.door; c.fillRect(x, y, 128, 256);
      c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(x, y, 5, 256); c.fillRect(x + 123, y, 5, 256);
      c.fillStyle = 'rgba(255,255,255,0.06)'; c.fillRect(x + 5, y, 8, 256);
      c.fillStyle = '#b5a98f'; c.fillRect(x + 8, y + 232, 112, 18);
      c.fillStyle = '#e8dcc0'; c.fillRect(x + 32, y + 58, 64, 30);
      c.fillStyle = '#3a332c'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = font(F.sign(600), 25); c.fillText(n, x + 64, y + 74);
      c.fillStyle = '#2a2622'; c.beginPath(); c.arc(x + 64, y + 40, 3, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#cdb47a'; c.beginPath(); c.arc(x + 104, y + 134, 7, 0, Math.PI * 2); c.fill();
    });
  });
}
const doorUv = (g: THREE.BufferGeometry, k: number) => {
  const uv = g.getAttribute('uv') as THREE.BufferAttribute, col = k % 8, row = Math.floor(k / 8);
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (col + uv.getX(i)) / 8, 1 - (row + 1 - uv.getY(i)) / 4);
  return g;
};
/** The machines' fronts: a soda machine's (its panel of selections lit, SODA down it, the slot and the chute) and an
 *  ice chest's (ICE on its door): the halves of one texture. */
function vendingTex(): THREE.CanvasTexture {
  return canvasTex(512, 512, (c) => {
    c.fillStyle = '#9a4b45'; c.fillRect(0, 0, 256, 512);
    c.fillStyle = '#efe6d2'; c.fillRect(150, 40, 80, 300);
    for (let k = 0; k < 6; k++) { c.fillStyle = ['#c9b37a', '#a8b6a0', '#c7a08e'][k % 3]!; c.fillRect(160, 56 + k * 46, 60, 30); }
    c.save(); c.translate(80, 200); c.rotate(-Math.PI / 2); c.fillStyle = '#f2e9d6'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = font(F.sign(700), 64); c.fillText('SODA', 0, 0); c.restore();
    c.fillStyle = '#2b2624'; c.fillRect(30, 420, 196, 50); c.fillRect(180, 360, 24, 30);
    c.fillStyle = '#dcd7cb'; c.fillRect(256, 0, 256, 512);
    c.fillStyle = '#c8c3b6'; c.fillRect(276, 60, 216, 300);
    c.fillStyle = '#4f6878'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = font(F.sign(700), 96); c.fillText('ICE', 384, 210);
    c.fillStyle = '#8c877c'; c.fillRect(300, 400, 168, 14);
  });
}
/** OFFICE in neon tube on a clear ground (its glow drawn round it). */
function officeNeon(): THREE.CanvasTexture {
  return canvasTex(512, 128, (c) => {
    c.clearRect(0, 0, 512, 128);
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = font(F.sign(600), 92);
    (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '10px';
    c.shadowColor = 'rgba(255,150,120,0.9)'; c.shadowBlur = 18; c.fillStyle = '#ffe3d2';
    c.fillText('OFFICE', 256, 68); c.shadowBlur = 6; c.fillText('OFFICE', 256, 68);
  });
}

// ---- the parts of a holder (a group in its own frame): tinted boxes fused, and its panes, doors and painted parts
// merged a kind a mesh

type Kind = 'glass' | 'doors' | 'stone' | 'breeze' | 'pickets' | 'lamps' | 'vending';
class Holder {
  readonly geos = new Map<Kind, THREE.BufferGeometry[]>();
  constructor(readonly g: THREE.Object3D) {}
  box(w: number, h: number, d: number, x: number, y: number, z: number, c: string) { return tbox(this.g, w, h, d, x, y, z, c); }
  add(kind: Kind, geo: THREE.BufferGeometry) { (this.geos.get(kind) ?? this.geos.set(kind, []).get(kind)!).push(geo); }
  /** A pane facing +z (or turned by `ry`) centred at (x, y, z): what's behind it, lit by night (or always). */
  pane(w: number, h: number, x: number, y: number, z: number, lit: number, behind: keyof typeof BEHIND, ry = 0, trade = 0) {
    const g = at(new THREE.PlaneGeometry(w, h), x, y, z, ry), n = g.getAttribute('position').count;
    g.setAttribute('lit', new THREE.BufferAttribute(new Float32Array(n).fill(lit), 1));
    g.setAttribute('behind', new THREE.BufferAttribute(new Float32Array(n).fill(BEHIND[behind]), 1));
    g.setAttribute('trade', new THREE.BufferAttribute(new Float32Array(n).fill(trade), 1));
    this.add('glass', g);
  }
  finish(mats: Record<Kind, THREE.Material>) {
    fuse(this.g);
    for (const [kind, geos] of this.geos) {
      const m = mergeGeometries(geos, false);
      geos.forEach((g) => g.dispose());
      if (m) this.g.add(new THREE.Mesh(m, mats[kind]));
    }
  }
}

/** A wing of rooms in its holder's frame (its face at z 0 facing +z, x along it): the body, the bays (`bays`: each's
 *  x and its room numbers, ground and upper), the walkway over the ground floor's apron with its railing (from `walk`
 *  [x0, x1], its gaps), the columns (at `cols`), the roof and its fascia ([x0, x1], the ends that get fascia). */
function wing(h: Holder, o: {
  len: number; body: [number, number]; bays: { x: number; w: number; no: [number, number]; lit: [boolean, boolean] }[]; doorIndex: (n: number) => number;
  walk: [number, number]; gaps: [number, number][]; cols: number[]; roof: [number, number]; fasciaFrom: number; ends: number[];
}) {
  const [b0, b1] = o.body, bw = b1 - b0, bx = (b0 + b1) / 2;
  // the body, its base a shade darker
  h.box(bw, R.top, R.depth, bx, R.top / 2, -R.depth / 2, C.wall);
  h.box(bw + 0.02, 0.4, R.depth + 0.02, bx, 0.2, -R.depth / 2, C.base);
  // the ground floor's apron, the upper walkway's slab and its edge, its underside's soffit
  const [w0, w1] = o.walk, ww = w1 - w0, wx = (w0 + w1) / 2;
  h.box(ww, R.apron, R.walk + 0.05, wx, R.apron / 2, R.walk / 2, C.slab);
  h.box(ww, 0.24, R.walk, wx, R.floor - 0.12, R.walk / 2, C.slab);
  h.box(ww, 0.3, 0.05, wx, R.floor - 0.13, R.walk + 0.025, C.trim);
  // the railing: its top rail and its foot, its pickets between (not where a stair comes up)
  const runs: [number, number][] = [];
  let x = w0;
  for (const [g0, g1] of [...o.gaps, [w1, w1] as [number, number]]) { if (g0 - x > 0.1) runs.push([x, g0]); x = g1; }
  for (const [r0, r1] of runs) {
    h.box(r1 - r0, 0.06, 0.1, (r0 + r1) / 2, R.floor + 1.02, R.walk - 0.07, C.rail);
    h.box(r1 - r0, 0.04, 0.06, (r0 + r1) / 2, R.floor + 0.1, R.walk - 0.07, C.rail);
    h.add('pickets', at(texPlane(r1 - r0, 0.88, PICKET_TILE, 0.88), (r0 + r1) / 2, R.floor + 0.56, R.walk - 0.07));
  }
  // the columns, from the apron to the roof, ledgestone round their feet
  for (const c of o.cols) {
    h.box(0.13, R.top, 0.13, c, R.top / 2, R.walk - 0.12, C.rail);
    h.add('stone', at(texBox(0.42, 0.9, 0.42, STONE_TILE), c, R.apron + 0.45, R.walk - 0.12));
  }
  // the rooms: a door and its frame, a lamp by it; a slider in its frame, its sill; the air conditioner under it
  for (const bay of o.bays) {
    for (const fl of [0, 1] as const) {
      const y0 = fl ? R.floor : R.apron, dx = bay.x + 0.35, wx2 = bay.x + bay.w - 0.95;
      const door = doorUv(new THREE.PlaneGeometry(0.95, 2.1), o.doorIndex(bay.no[fl]));
      h.add('doors', at(door, dx + 0.475, y0 + 1.05, 0.05));
      h.box(0.07, 2.17, 0.07, dx - 0.035, y0 + 1.085, 0.035, C.trim);
      h.box(0.07, 2.17, 0.07, dx + 0.985, y0 + 1.085, 0.035, C.trim);
      h.box(1.09, 0.08, 0.07, dx + 0.475, y0 + 2.14, 0.035, C.trim);
      h.box(0.18, 0.26, 0.03, dx - 0.2, y0 + 1.95, 0.015, C.trim);
      h.add('lamps', at(new THREE.BoxGeometry(0.11, 0.17, 0.09), dx - 0.2, y0 + 1.95, 0.075));
      const ww2 = Math.min(1.5, bay.w - 1.75);
      h.pane(ww2, 1.15, wx2, y0 + 1.575, 0.02, bay.lit[fl] ? LIT.night : LIT.no, 'drapes');
      for (const s of [-1, 1]) h.box(0.06, 1.25, 0.06, wx2 + s * (ww2 / 2 + 0.03), y0 + 1.575, 0.03, C.frame);
      h.box(ww2 + 0.12, 0.06, 0.06, wx2, y0 + 2.18, 0.03, C.frame);
      h.box(0.035, 1.15, 0.05, wx2 + 0.08, y0 + 1.575, 0.035, C.frame); // (the slider's meeting rail)
      h.box(ww2 + 0.22, 0.06, 0.13, wx2, y0 + 0.97, 0.065, C.trim);
      h.box(0.7, 0.42, 0.55, wx2, y0 + 0.6, 0.12, C.ac);
      h.box(0.58, 0.3, 0.02, wx2, y0 + 0.6, 0.4, C.grille);
      for (let k = 0; k < 3; k++) h.box(0.58, 0.025, 0.03, wx2, y0 + 0.5 + k * 0.1, 0.41, C.ac);
    }
  }
  // the roof: its slab over the walkway, the soffit under the overhang, the fascia round its open edges with a stripe;
  // a few units and vents on top
  const [r0, r1] = o.roof, rw = r1 - r0, rx = (r0 + r1) / 2;
  h.box(rw, 0.28, R.depth + R.walk + 0.6, rx, R.top + 0.14, (R.walk + 0.3 - R.depth - 0.3) / 2, C.roof);
  h.box(rw - 0.1, 0.03, R.walk + 0.25, rx, R.top - 0.015, (R.walk + 0.25) / 2, C.soffit);
  const fz = R.walk + 0.35, f0 = o.fasciaFrom;
  h.box(r1 - f0 + 0.1, 0.5, 0.1, (f0 + r1 + 0.1) / 2 - 0.05, R.top + 0.12, fz, C.trim);
  h.box(r1 - f0 + 0.12, 0.09, 0.11, (f0 + r1 + 0.1) / 2 - 0.05, R.top + 0.02, fz, C.stripe);
  for (const e of o.ends) {
    const ex = e > 0 ? r1 + 0.05 : r0 - 0.05;
    h.box(0.1, 0.5, R.depth + R.walk + 0.7, ex, R.top + 0.12, (fz - R.depth - 0.35) / 2, C.trim);
    h.box(0.11, 0.09, R.depth + R.walk + 0.72, ex, R.top + 0.02, (fz - R.depth - 0.35) / 2, C.stripe);
  }
  for (let k = 0; k < 3; k++) {
    const ux = b0 + bw * (0.2 + 0.3 * k + 0.08 * hash(o.len, k, 3)), uz = -R.depth * (0.3 + 0.3 * hash(o.len, k, 4));
    h.box(1.2, 0.7, 0.9, ux, R.top + 0.63, uz, '#a8a39a');
    h.box(1.1, 0.06, 0.8, ux, R.top + 1.0, uz, '#8e8a82');
    tcyl(h.g, 0.08, 0.9, ux + 1.4, R.top + 0.7, uz - 0.6, '#77736c', 8);
  }
}

/** A steel stair along x (from (x0, ground) up to (x1, the upper floor), or down the other way), its flight between
 *  z0 and z1: two stringers, open treads, a handrail each side on its posts. */
function stair(h: Holder, x0: number, x1: number, z0: number, z1: number) {
  const run = Math.abs(x1 - x0), n = 18, rise = R.floor / n, len = Math.hypot(run, R.floor), dir = Math.sign(x1 - x0);
  const ang = Math.atan2(R.floor, run) * dir, zc = (z0 + z1) / 2, w = z1 - z0;
  for (const z of [z0 + 0.04, z1 - 0.04]) {
    const s = h.box(len, 0.22, 0.06, (x0 + x1) / 2, R.floor / 2, z, C.steel); s.rotation.z = ang;
    const rail = h.box(len, 0.05, 0.05, (x0 + x1) / 2, R.floor / 2 + 0.95, z, C.rail); rail.rotation.z = ang;
    for (let k = 0; k <= 4; k++) { const u = k / 4; h.box(0.04, 0.95, 0.04, x0 + (x1 - x0) * u, R.floor * u + 0.47, z, C.rail); }
  }
  for (let k = 1; k <= n; k++) h.box(run / n + 0.04, 0.05, w - 0.12, x0 + (x1 - x0) * ((k - 0.5) / n), k * rise - 0.03, zc, C.slab);
}

/** The motel round its lot (see the top). */
export function buildMotel(route: Route): THREE.Group {
  const root = new THREE.Group(), road = roadFrame(route, root), facing = rightFront(route, root);
  const stone = stoneTex(), breeze = breezeTex(), pickets = picketTex(), vending = vendingTex();
  const forward = { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 };
  const nums: string[] = [];
  const doorIndex = (n: number) => { const k = nums.indexOf(String(n)); return k >= 0 ? k : nums.push(String(n)) - 1; };
  // (the rooms' numbers, from the office's end: the back wing's 101–106 from the road in, the side wing's 107–111)
  const litOf = (n: number) => hash(n, 17) > 0.52;
  const aBays = Array.from({ length: A.bays }, (_, k) => { const n = 106 - k; return { x: A.bay0 + k * R.bay, w: R.bay, no: [n, n + 100] as [number, number], lit: [litOf(n), litOf(n + 100)] as [boolean, boolean] }; });
  const bBays = Array.from({ length: B.bays }, (_, k) => { const n = 107 + (B.bays - 1 - k); return { x: k * B.bay, w: B.bay, no: [n, n + 100] as [number, number], lit: [litOf(n), litOf(n + 100)] as [boolean, boolean] }; });
  for (const b of [...aBays, ...bBays]) { doorIndex(b.no[0]); doorIndex(b.no[1]); }
  const holders: Holder[] = [];

  // the back wing: its face toward the corner, from the side wing's face (x 8) to its street end
  const a = new Holder(road(A.s, A.lat)); holders.push(a);
  wing(a, {
    len: A.len, body: [0, A.len], bays: aBays, doorIndex, walk: [8, A.len], gaps: [[A.stair[0] - 1.1, A.stair[0]]],
    cols: [...Array.from({ length: A.bays + 1 }, (_, k) => A.bay0 + k * R.bay), A.len - 0.15], roof: [-0.3, A.len + 0.3], fasciaFrom: 10.3, ends: [1],
  });
  // its street end: ledgestone over the ground floor, breeze block closing the walkway's end (both floors); the ice
  // and soda machines on the apron under the stair, a planter at the corner
  a.add('stone', at(texBox(0.08, 3.0, R.depth, STONE_TILE), A.len + 0.04, R.apron + 1.5, -R.depth / 2));
  a.add('breeze', at(texBox(0.2, R.floor - R.apron - 0.25, R.walk, BREEZE_TILE), A.len - 0.1, R.apron + (R.floor - R.apron - 0.25) / 2, R.walk / 2));
  a.add('breeze', at(texBox(0.2, 1.0, R.walk, BREEZE_TILE), A.len - 0.1, R.floor + 0.5, R.walk / 2));
  a.box(0.95, 1.8, 0.72, 29.95, R.apron + 0.9, 0.5, '#9a4b45');
  a.box(0.9, 1.5, 0.72, 31.0, R.apron + 0.75, 0.5, '#dcd7cb');
  const soda = new THREE.PlaneGeometry(0.95, 1.8), ice = new THREE.PlaneGeometry(0.9, 1.5);
  for (const [g, u0] of [[soda, 0], [ice, 0.5]] as const) { const uv = g.getAttribute('uv') as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setX(i, u0 + uv.getX(i) * 0.5); }
  a.add('vending', at(soda, 29.95, R.apron + 0.9, 0.865));
  a.add('vending', at(ice, 31.0, R.apron + 0.75, 0.865));
  // the stair up from the lot at the street end, its landing off the walkway
  stair(a, A.stair[1], A.stair[0], R.walk + 0.05, R.walk + 1.15);
  a.box(1.1, 0.24, 1.15, A.stair[0] - 0.55, R.floor - 0.12, R.walk + 0.6, C.slab);
  for (const z of [R.walk + 1.15]) { a.box(1.1, 0.06, 0.06, A.stair[0] - 0.55, R.floor + 1.02, z, C.rail); }
  a.box(0.05, 1.0, 0.05, A.stair[0] - 1.1, R.floor + 0.5, R.walk + 1.15, C.rail);

  // the side wing: its face toward the road, from its near end (x 0) back to the back wing's face (x 17.8)
  const b = new Holder(facing(B.s, B.lat)); holders.push(b);
  wing(b, {
    len: B.len, body: [0, B.len], bays: bBays, doorIndex, walk: [0, B.walk], gaps: [],
    cols: Array.from({ length: B.bays + 1 }, (_, k) => k === 0 ? 0.12 : k * B.bay).filter((c) => c < B.walk - 0.1), roof: [-0.3, 15.6], fasciaFrom: -0.3, ends: [-1],
  });
  b.add('stone', at(texBox(0.08, 3.0, R.depth, STONE_TILE), -0.04, R.apron + 1.5, -R.depth / 2));
  // its stair: on along the walkway's line past its near end, down toward the corner
  stair(b, -4.4, 0, 0.25, 1.35);

  // the office
  const o = new Holder(road(O.s, O.lat)); holders.push(o);
  {
    const k = (O.front - O.back) / O.d; // (the roof's rise toward the front, per m)
    o.box(O.w + 0.8, 0.15, O.d + 1.2, O.w / 2 + 0.25, 0.075, -O.d / 2 + 0.5, C.slab);
    // the body: its sides' tops swept up to the front
    const prof = new THREE.Shape([new THREE.Vector2(-O.d, 0), new THREE.Vector2(0, 0), new THREE.Vector2(0, O.front), new THREE.Vector2(-O.d, O.back)]);
    const body = new THREE.ExtrudeGeometry(prof, { depth: O.w, bevelEnabled: false });
    body.rotateY(-Math.PI / 2).translate(O.w, 0, 0);
    part(o.g, body, C.wall);
    // its front: stone under a wall of glass (the lobby, lit day and night), aluminium mullions, the door in it; OFFICE
    // in neon on the band over it
    o.add('stone', at(texBox(O.w - 0.2, 0.6, 0.12, STONE_TILE), O.w / 2, 0.45, 0.06));
    o.pane(O.w - 0.3, 2.25, O.w / 2, 0.75 + 1.125, 0.025, LIT.always, 'shop', 0, 2);
    for (const mx of [0.15, 1.7, 3.2, 4.3, O.w - 0.15]) o.box(0.07, 2.3, 0.07, mx, 0.75 + 1.125, 0.05, C.frame);
    o.box(O.w - 0.2, 0.08, 0.08, O.w / 2, 3.0, 0.05, C.frame);
    o.box(O.w - 0.2, 0.06, 0.08, O.w / 2, 0.78, 0.07, C.frame);
    o.box(1.1, 0.06, 0.07, 3.75, 2.75, 0.07, C.frame); o.box(0.8, 0.05, 0.06, 3.75, 1.75, 0.09, '#d9d4c8'); // (the door's transom bar, its push bar)
    // the street side: the glass wrapping the corner, stone under it, then a breeze-block screen off the wall
    o.add('stone', at(texBox(0.12, 0.6, 3.0, STONE_TILE), O.w + 0.06, 0.45, -1.5));
    o.pane(2.8, 2.25, O.w + 0.025, 0.75 + 1.125, -1.55, LIT.always, 'shop', Math.PI / 2, 2);
    for (const mz of [-0.12, -1.5, -2.9]) o.box(0.07, 2.3, 0.07, O.w + 0.05, 0.75 + 1.125, mz, C.frame);
    o.box(0.08, 0.08, 3.0, O.w + 0.05, 3.0, -1.5, C.frame);
    o.add('breeze', at(texBox(0.2, 3.0, 3.4, BREEZE_TILE), O.w + 0.35, 1.65, -5.0));
    // the court side: its door, a window
    o.pane(0.9, 2.1, -0.025, 1.2, -1.6, LIT.always, 'shop', -Math.PI / 2, 4);
    o.box(0.07, 2.2, 1.06, -0.04, 1.2, -1.6, C.frame);
    o.pane(1.6, 1.1, -0.025, 1.75, -4.6, LIT.night, 'drapes', -Math.PI / 2);
    // the roof: a slab swept up to the front, out over the glass and the street side; its fascia, a column at the corner
    const L = Math.hypot(O.d + 1.9 + 0.4, (O.d + 2.3) * k), ang = -Math.atan(k), zc = (-O.d - 0.4 + 1.9) / 2, yAt = (z: number) => O.back + k * (z + O.d);
    const slab = o.box(O.w + 2.0, 0.22, L, O.w / 2 + 0.6, yAt(zc) + 0.11, zc, C.roof); slab.rotation.x = ang;
    const under = o.box(O.w + 1.9, 0.03, L - 0.1, O.w / 2 + 0.6, yAt(zc) - 0.015, zc, C.soffit); under.rotation.x = ang;
    o.box(O.w + 2.1, 0.42, 0.1, O.w / 2 + 0.6, yAt(1.9) + 0.06, 1.95, C.trim);
    o.box(O.w + 2.12, 0.08, 0.11, O.w / 2 + 0.6, yAt(1.9) - 0.04, 1.95, C.stripe);
    for (const sx of [-0.4 - 0.05, O.w + 1.6 + 0.05]) { const f = o.box(0.1, 0.42, L, sx, yAt(zc) + 0.06, zc, C.trim); f.rotation.x = ang; }
    o.box(0.1, yAt(1.5) - 0.15, 0.1, O.w + 1.2, (yAt(1.5) + 0.15) / 2, 1.5, C.rail);
    // planters along the front and the street side, shrubs in them
    for (const [px, pz, pw, pd] of [[1.0, 0.75, 1.6, 0.6], [5.6, 0.75, 1.6, 0.6], [O.w + 1.1, -4.2, 0.6, 3.0]] as const) {
      o.add('stone', at(texBox(pw, 0.5, pd, STONE_TILE), px, 0.4, pz));
      o.box(pw - 0.1, 0.04, pd - 0.1, px, 0.66, pz, C.soil);
      for (let i = 0; i < 3; i++) tball(o.g, 0.32, px + (pw > pd ? (i - 1) * pw * 0.3 : 0), 0.8, pz + (pd > pw ? (i - 1) * pd * 0.3 : 0), i % 2 ? C.shrub : C.shrub2);
    }
  }
  const neon = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.85), new THREE.MeshBasicMaterial({ map: officeNeon(), transparent: true, depthWrite: false, color: new THREE.Color(1.5, 1.5, 1.5), ...forward }));
  neon.position.set(O.w / 2, 3.65, 0.08); o.g.add(neon);

  // the lot: asphalt from the sidewalk's back to the wings, its bays striped with stops at their heads; the cars
  const lot = new Holder(road(-12.5, 24)); holders.push(lot);
  {
    const X = (lat: number) => 24 - lat, Z = (s: number) => s + 12.5;
    lot.box(34, 0.04, 31, 0, 0.02, 0, C.asphalt);
    // in front of the back wing (nosed in toward it), and of the side wing
    for (const lat of [16.7, 19.5, 22.3]) lot.box(0.1, 0.012, 5, X(lat), 0.046, Z(-15.6), C.stripeLot);
    for (const lat of [18.1, 20.9]) lot.box(1.6, 0.12, 0.18, X(lat), 0.1, Z(-17.7), C.stop);
    for (const s of [-8.8, -6.0, -3.2]) lot.box(5, 0.012, 0.1, X(28.7), 0.046, Z(s), C.stripeLot);
    for (const s of [-7.4, -4.6]) lot.box(0.18, 0.12, 1.6, X(30.7), 0.1, Z(s), C.stop);
    lot.add('stone', at(texBox(1.3, 0.45, 1.3, STONE_TILE), X(17.7), 0.225, Z(-11.2))); // (the palm's planter)
    lot.box(1.2, 0.04, 1.2, X(17.7), 0.45, Z(-11.2), C.soil);
  }
  const park = (lat: number, s: number, nose: 'back' | 'side', color: string, len: number) => {
    const car = sedan({ color, length: len }), f = route.frameAt(s), up = new THREE.Vector3(0, 1, 0);
    const fwd = new THREE.Vector3(f.fwd.x, 0, f.fwd.z).normalize(), right = new THREE.Vector3(f.right.x, 0, f.right.z).normalize();
    car.matrixAutoUpdate = false;
    if (nose === 'back') car.matrix.makeBasis(right, up, fwd.clone().negate()); else car.matrix.makeBasis(fwd, up, right);
    car.matrix.setPosition(f.pos.clone().addScaledVector(f.right, lat).addScaledVector(up, 0.04));
    root.add(car);
  };
  park(18.1, -15.4, 'back', '#8b8f88', 4.9);
  park(20.9, -15.6, 'back', '#d6c7a2', 4.6);
  park(28.6, -7.4, 'side', '#5d6b7a', 4.8);

  // the pool in the L's corner: its deck round it, the coping, the water (lit by night), the board; its fence round
  // the deck, a couple of chaises and an umbrella
  const pool = new Holder(road(-13.5, 26.6)); holders.push(pool);
  {
    const PW = 5, PD = 4, DW = 8.4, DD = 8.5;
    pool.box((DW - PW) / 2, 0.14, DD, -(DW + PW) / 4, 0.07, 0, C.deck);
    pool.box((DW - PW) / 2, 0.14, DD, (DW + PW) / 4, 0.07, 0, C.deck);
    pool.box(PW, 0.14, (DD - PD) / 2, 0, 0.07, (DD + PD) / 4, C.deck);
    pool.box(PW, 0.14, (DD - PD) / 2, 0, 0.07, -(DD + PD) / 4, C.deck);
    for (const s of [-1, 1]) { pool.box(PW + 0.6, 0.06, 0.3, 0, 0.17, s * (PD / 2 + 0.15), C.trim); pool.box(0.3, 0.06, PD, s * (PW / 2 + 0.15), 0.17, 0, C.trim); }
    pool.box(PW, 0.06, PD, 0, 0.08, 0, C.water);
    pool.box(0.6, 0.4, 0.7, 0, 0.34, -PD / 2 - 0.65, C.stripe);
    pool.box(0.5, 0.06, 2.2, 0, 0.56, -PD / 2 + 0.4, C.trim);
    // the fence: posts, rails, pickets, a gap for the gate toward the lot
    const fx = DW / 2 - 0.1, fz = DD / 2 - 0.1;
    const sides: [number, number, number, number][] = [[-fx, -fz, fx, -fz], [fx, -fz, fx, fz], [fx, fz, 1.0, fz], [-0.2, fz, -fx, fz], [-fx, fz, -fx, -fz]];
    for (const [x0, z0, x1, z1] of sides) {
      const l = Math.hypot(x1 - x0, z1 - z0), mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, ry = Math.atan2(-(z1 - z0), x1 - x0);
      for (const y of [1.2, 0.18]) { const r = pool.box(l, 0.04, 0.04, mx, y, mz, C.steel); r.rotation.y = ry; }
      const n = Math.max(1, Math.round(l / 1.6));
      for (let i = 0; i <= n; i++) pool.box(0.05, 1.25, 0.05, x0 + ((x1 - x0) * i) / n, 0.625, z0 + ((z1 - z0) * i) / n, C.steel);
      pool.add('pickets', new THREE.PlaneGeometry(1, 1).scale(l, 1.0, 1).rotateY(ry).translate(mx, 0.69, mz));
      const g = pool.geos.get('pickets')!; const last = g[g.length - 1]!, uv = last.getAttribute('uv') as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) uv.setX(i, (uv.getX(i) * l) / PICKET_TILE);
    }
    for (const cx of [-1.6, 2.0]) { // (the chaises on the deck's lot side, their backs up toward the wing)
      pool.box(1.9, 0.08, 0.7, cx, 0.38, 3.25, C.trim); pool.box(0.06, 0.24, 0.6, cx - 0.85, 0.26, 3.25, C.steel); pool.box(0.06, 0.24, 0.6, cx + 0.85, 0.26, 3.25, C.steel);
      const back = pool.box(0.7, 0.06, 0.7, cx - 0.8, 0.62, 3.25, C.trim); back.rotation.z = -0.9;
    }
    tcyl(pool.g, 0.03, 2.3, -3.4, 1.29, 2.8, C.steel, 6);
    part(pool.g, new THREE.ConeGeometry(1.3, 0.5, 10), '#b8907a', -3.4, 2.45, 2.8);
  }
  const poolGlow = new THREE.Mesh(new THREE.PlaneGeometry(5, 4).rotateX(-Math.PI / 2), glowMaterial('#9ad8d0', 0.7, true));
  poolGlow.position.set(0, 0.125, 0); pool.g.add(poolGlow);

  const mats: Record<Kind, THREE.Material> = {
    glass: Object.assign(nightGlass(), forward),
    doors: paint(doorAtlas(nums), forward),
    stone: paint(stone),
    breeze: toon({ map: breeze, alphaTest: 0.5, alphaToCoverage: true, side: THREE.DoubleSide }),
    pickets: toon({ map: pickets, color: C.rail, alphaTest: 0.5, alphaToCoverage: true, side: THREE.DoubleSide }),
    lamps: lampMaterial('#ffd8a0', GLOW.lamp * 0.45, 0.35),
    vending: paint(vending, { emissive: '#ffffff', emissiveMap: vending, emissiveIntensity: 0.3, ...forward }),
  };
  for (const h of holders) h.finish(mats);

  // two palms: off the office's court side in a planter, and by the pool
  const bark = new THREE.Color(WORLD.trunk), scar = bark.clone().lerp(new THREE.Color('#c9a27a'), 0.35);
  const wood = toon({ vertexColors: true }), leaves = toon({ color: WORLD.crown, side: THREE.DoubleSide }), dead = toon({ color: '#7a5f3c', side: THREE.DoubleSide });
  for (const [k, lat, s, h] of [[1, 17.7, -11.2, 11], [3, 30.2, -17.0, 9.5]] as const) {
    const p = palmVariant(k + 11, bark, scar), f = route.frameAt(s), g = new THREE.Group();
    g.position.copy(f.pos).addScaledVector(f.right, lat); g.scale.setScalar(h / PALM.h); g.rotation.y = k;
    g.add(new THREE.Mesh(p.trunk, wood), new THREE.Mesh(p.skirt, dead), new THREE.Mesh(p.crown, leaves));
    root.add(g);
  }
  return root;
}

// ---- the pole sign

/** The sign's face (the title in the world): SZA over BMF in pink neon, NO VACANCY lit below. Two faces — with the NO,
 *  and without (VACANCY, the end) — the scene picks one and lights it (userData). */
function signFace(no: boolean): THREE.CanvasTexture {
  const M = MOTEL_SIGN, c = document.createElement('canvas'); c.width = 512; c.height = Math.round((512 * M.h) / M.w);
  const x = c.getContext('2d')!, W = c.width, H = c.height;
  x.fillStyle = '#163a40'; x.fillRect(0, 0, W, H);
  x.strokeStyle = '#f3e6c4'; x.lineWidth = 14; x.strokeRect(14, 14, W - 28, H - 28);
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillStyle = '#f3e6c4'; x.font = `${H * 0.11}px "${F.archivo(100, 900)}"`; x.fillText('SZA', W / 2, H * 0.17);
  x.shadowColor = 'rgba(255,79,163,1)'; x.shadowBlur = 28; x.fillStyle = '#ffd0e8';
  x.font = `${H * 0.27}px "${F.bodoni(700, { italic: true })}"`; x.fillText('BMF', W / 2, H * 0.48, W * 0.8);
  x.font = `${H * 0.075}px "${F.archivo(100, 700)}"`;
  const vac = 'VACANCY', gap = x.measureText(' ').width, wNo = x.measureText('NO').width, wVac = x.measureText(vac).width, x0 = W / 2 - (wNo + gap + wVac) / 2;
  x.textAlign = 'left';
  x.shadowColor = no ? 'rgba(255,60,40,1)' : 'rgba(0,0,0,0)'; x.fillStyle = no ? '#ff8a70' : '#4a2a2a'; x.fillText('NO', x0, H * 0.82);
  x.shadowColor = 'rgba(255,60,40,1)'; x.fillStyle = '#ff8a70'; x.fillText(vac, x0 + wNo + gap, H * 0.82);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return tex;
}

/** The sign's bulbs' colour, and how bright they shine as its neon's lit (0..1: they flicker on with it). */
export const BULB = new THREE.Color('#ffd9a6');
export const bulbsAt = (lit: number) => 0.3 + 1.3 * lit;

/** The pole sign (landmarks.ts): its face where it always was; round it an enamelled cabinet, its rim edged with bulbs,
 *  a starburst on a mast over it; under it an arrow pointing into the lot (the face's left: the lot's side as the road
 *  sees it), bulbs down its shaft; two steel poles out of a stone planter. */
export function buildMotelSign(route: Route): THREE.Group {
  const M = MOTEL_SIGN, sign = motelSign(route), faces = { no: signFace(true), vacancy: signFace(false) };
  const mat = new THREE.MeshBasicMaterial({ map: faces.no, side: THREE.DoubleSide });
  const bulbsM = new THREE.MeshBasicMaterial({ color: BULB.clone().multiplyScalar(bulbsAt(1)) });
  const g = new THREE.Group(), parts = new THREE.Group();
  g.add(parts);
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(M.w, M.h), mat);
  panel.position.set(0, M.y, 0); g.add(panel);
  const cream = '#e7dcc4', teal = '#2e4a4d', coral = '#a9675b', bot = M.y - M.h / 2, top = M.y + M.h / 2, rim = 0.2;
  // the cabinet behind the face, its rim round it
  tbox(parts, M.w + 2 * rim, M.h + 2 * rim, 0.55, 0, M.y, -0.3, cream);
  tbox(parts, M.w + 2 * rim + 0.04, M.h + 2 * rim + 0.04, 0.2, 0, M.y, -0.45, teal);
  for (const s of [-1, 1]) {
    tbox(parts, M.w + 2 * rim, rim, 0.09, 0, M.y + s * (M.h / 2 + rim / 2), 0.015, teal);
    tbox(parts, rim, M.h, 0.09, s * (M.w / 2 + rim / 2), M.y, 0.015, teal);
  }
  tbox(parts, M.w + 2 * rim + 0.3, 0.12, 0.75, 0, top + rim + 0.06, -0.3, cream); // (its cap)
  // the starburst on its mast, over the cabinet's right
  const sx = M.w / 2 - 0.6, sy = top + 1.25;
  tbox(parts, 0.1, sy - top - rim, 0.1, sx, (top + rim + sy) / 2, -0.3, teal);
  for (let k = 0; k < 4; k++) { const spike = tbox(parts, k % 2 ? 0.9 : 1.5, 0.11, 0.08, sx, sy, -0.3, cream); spike.rotation.z = (k * Math.PI) / 4; }
  tball(parts, 0.14, sx, sy, -0.24, cream);
  // the arrow under it, pointing left (into the lot), on the poles
  const ay = bot - 0.85, arrow = new THREE.Shape([
    new THREE.Vector2(1.9, 0.27), new THREE.Vector2(-1.5, 0.27), new THREE.Vector2(-1.5, 0.6), new THREE.Vector2(-2.5, 0),
    new THREE.Vector2(-1.5, -0.6), new THREE.Vector2(-1.5, -0.27), new THREE.Vector2(1.9, -0.27),
  ]);
  part(parts, new THREE.ExtrudeGeometry(arrow, { depth: 0.22, bevelEnabled: false }), coral, 0, ay, -0.27);
  tbox(parts, 3.3, 0.16, 0.02, 0.2, ay, -0.04, cream);
  // the poles out of their planter
  for (const s of [-1, 1]) {
    tcyl(parts, 0.13, bot - rim, s * 1.4, (bot - rim) / 2, -0.45, '#3a4446', 14);
    tcyl(parts, 0.17, 0.08, s * 1.4, bot - rim - 0.04, -0.45, '#3a4446', 14);
  }
  tbox(parts, 3.9, 0.06, 1.3, 0, 0.52, -0.45, C.soil);
  for (let i = 0; i < 4; i++) tball(parts, 0.34, -1.35 + i * 0.9, 0.62, -0.45 + (i % 2 ? 0.2 : -0.2), i % 2 ? C.shrub : C.shrub2);
  fuse(parts);
  const planter = new THREE.Mesh(texBox(4.0, 0.5, 1.4, STONE_TILE), paint(stoneTex()));
  planter.position.set(0, 0.25, -0.45); g.add(planter);
  // the bulbs: round the rim, at the starburst's tips, down the arrow's shaft and round its head
  const pts: [number, number, number][] = [], step = 0.3, hw = M.w / 2 + rim / 2, hh = M.h / 2 + rim / 2;
  for (let x = -hw; x <= hw + 1e-6; x += (2 * hw) / Math.round((2 * hw) / step)) { pts.push([x, M.y + hh, 0.08], [x, M.y - hh, 0.08]); }
  for (let y = -hh + (2 * hh) / Math.round((2 * hh) / step); y < hh - 1e-6; y += (2 * hh) / Math.round((2 * hh) / step)) { pts.push([-hw, M.y + y, 0.08], [hw, M.y + y, 0.08]); }
  for (let k = 0; k < 8; k++) { const r = (k % 2 ? 0.45 : 0.75), a2 = (k * Math.PI) / 4; pts.push([sx + r * Math.cos(a2), sy + r * Math.sin(a2), -0.24]); }
  for (let x = 1.7; x > -1.5; x -= 0.3) pts.push([x, ay, 0.0]);
  for (const [x, y] of [[-1.65, 0.45], [-1.95, 0.26], [-2.25, 0.1], [-1.95, -0.26], [-1.65, -0.45]] as const) pts.push([x, ay + y, 0.0]);
  const bulb = new THREE.SphereGeometry(0.05, 8, 6);
  const bulbs = new THREE.Mesh(mergeGeometries(pts.map(([x, y, z]) => bulb.clone().translate(x, y, z)), false)!, bulbsM);
  g.add(bulbs);
  g.matrixAutoUpdate = false;
  g.matrix.makeBasis(new THREE.Vector3(0, 1, 0).cross(sign.normal).normalize(), new THREE.Vector3(0, 1, 0), sign.normal).setPosition(sign.foot);
  g.userData = { neon: mat, faces, bulbs: bulbsM };
  return g;
}
