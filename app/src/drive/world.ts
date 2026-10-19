// The greybox world (M2): ground, road, blocks of buildings, palms, a few landmarks, the sign boards and the car with
// its two silhouettes. Plain lit colours, no textures but the lyric faces: the look comes in M3. Deterministic
// (seeded by position along the road).
import * as THREE from 'three';
import { hash } from '../engine/util';
import { WORLD, toon } from '../look/toon';
import { F } from '../engine/type';
import { GLOW, glowMaterial, lampMaterial } from '../look/night';
import { wallMaterial } from '../look/walls';
import { facadeMeshes, facades, signAtlas, signUv } from '../look/facades';
import { roofSign, shopIndex } from './shops';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PALM, palmVariant } from '../look/palms';
import { IMPALA, impalaHull, wireWheel } from '../look/impala';
import { printedGround } from '../look/ground';
import { SURF, seaSwash, seaWater } from '../look/sea';
import type { Drive } from './drive';
import { ROAD_HALF, ROAD_START, type Route } from './route';
import { BANNER, type Carrier, LAYOUT, PAIRABLE, SET_KINDS, basisOf, solidsOf } from './carriers';
import { HEADLAND, HEADWALL, TILE_REPEAT, TUNNEL, TUNNEL_CLEAR, type Tunnel, drawTiles, headlandAt, nearTunnel } from './tunnel';
import type { Stretch } from './stretches';
import { BACK, BLOCKS, boxAt } from './blocks';
import { canvasTex, fuse, part, sedan, tball, tbox, tcyl } from '../scenes/sets/kit';
import { buildMotel, buildMotelSign } from '../look/motel';
import { CORNER } from './sets/intro';
import { type Chorus2Plan, laneEdge } from './sets/chorus2';
import { buildDash } from '../look/dash';
import { buildCast } from '../look/cast3d';
import { LOT, buildClimbHills, buildLookout, dressHill, scrubGround } from '../look/lookout';
import { CAR, WHEEL } from './cabin';
export { CAR };
import { candyPaint, chrome as heroChrome } from '../look/hero';

export { ROAD_HALF }; // (route.ts: the road's own measure)
/** The ground is a flat base plane under shoulders that follow the road this far out (m; the sea, further): a strip much
 *  wider than the road's tightest bend folds over the road there (the hairpin into the hills). */
export const SHOULDER = 40;
export const SEA = 200;
/** Along the coast, the beach: sand from the road's edge this far out (m) to the water (the user, 2026-10-13: with
 *  the sea at the road's edge, the boards and the arch stood "in the ocean"). */
export const BEACH = 42;
const BASE = 12000;
/** Where the road climbs above the plain, its verges slope down to it this much out per metre down (an embankment). */
export const SLOPE = 1;
/** The road runs on this far past where the car parks, to the overlook's edge (m). */
const OVERLOOK_LIP = 9;
const STEP = 2;
export { ROAD_START }; // (route.ts: the road starts this far behind the light)

/** Each section's ground (sRGB; others the golden fields). */
const GROUND: Record<string, string> = { verse1: '#c99a7a', chorus2: '#b8a99a', verse2: '#9fae62', chorus3: '#f0d39b', verse3: '#6a5a78', chorus4: '#7d6a5c', outro1: '#6b5b55' };
const PALMS = new Set(['intro', 'chorus1', 'chorus3']); // (none in verse 2: its take's camera rides where they'd stand; none on the Strip: its fronts stand where they would; on the coast, on the beach by the water)
/** Kerbs and sidewalks along the town's streets (not the freeway, the coast, the tunnel or the hills): the kerb's
 *  height, the sidewalk's width (m) and its concrete; broken where a cross street opens (the set-pieces' openings). */
export const SIDEWALKS = { stretches: new Set(['intro', 'chorus1', 'verse1', 'verse2', 'verse3']), kerb: 0.15, width: 3, colour: '#cbbba7' };
/** The town's back streets: the rows of buildings behind the street (blocks.ts BACK) front one of their own, and the
 *  ground between is parking (the user, 2026-10-15: past a board, "shops but no road or sidewalks just a flat orange
 *  plane"). Off the road's centre (m): the lots from the sidewalk's back to `lot`, a sidewalk to `road`, the back street
 *  to `walk`, its far sidewalk to the back row's fronts (BACK.from); the lots' bays every `bay` m, `bayLen` deep; none
 *  where the road turns tighter than `tight` m toward that side (the strips would fold). */
const BACK_STREET = { lot: BACK.from - 12, road: BACK.from - 9.5, walk: BACK.from - 2.5, bay: 2.8, bayLen: 5, tight: 60, lotColour: '#6b5b66' };
/** A cross street's corners (where a set-piece's opening cuts the sidewalk): the kerb's return round each (its radius,
 *  m), a ramp down to the crossings at its apex (half its width along the kerb, its flares either side, how far it runs
 *  back into the walk; m), and the sidewalk on round the corner along the cross street (its width the sidewalk's) to
 *  the back street's; and the sidewalk carried back to a building's front where one stands up to `apron` m behind it,
 *  across the alleys between them up to `join` m wide. */
export const CORNER_WALK = { radius: 2.4, ramp: { half: 0.75, flare: 0.65, run: 1.4 }, apron: 3, join: 6, to: BACK_STREET.lot };

/** Geometry in the road's frame: each vertex (s along it, lateral off its centre, height over its level), uv in metres
 *  (along, out from the kerb: the sidewalks' tiles line up with the ribbons'); triangles by index. */
function patch(route: Route, verts: readonly (readonly [number, number, number])[], tris: number[]): THREE.BufferGeometry {
  const pos: number[] = [], uv: number[] = [];
  for (const [s, l, y] of verts) { const f = route.frameAt(s), p = f.pos.clone().addScaledVector(f.right, l); pos.push(p.x, p.y + y, p.z); uv.push(s, Math.abs(l) - ROAD_HALF); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(tris);
  g.computeVertexNormals();
  return g;
}

/** A ribbon along the road from s0 to s1: at each sample, from (lateral a, height ya) to (lateral b, height yb) over the
 *  road's level; uv in metres (along, across). */
function ribbon(route: Route, s0: number, s1: number, a: number | ((s: number) => number), ya: number | ((s: number) => number), b: number | ((s: number) => number), yb: number | ((s: number) => number)): THREE.BufferGeometry {
  const n = Math.max(2, Math.ceil((s1 - s0) / STEP) + 1), pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const at = (x: number | ((s: number) => number), s: number) => (typeof x === 'number' ? x : x(s));
  for (let i = 0; i < n; i++) {
    const s = s0 + ((s1 - s0) * i) / (n - 1), f = route.frameAt(s), as = at(a, s), bs = at(b, s), yas = at(ya, s), ybs = at(yb, s);
    const p = f.pos.clone().addScaledVector(f.right, as), q = f.pos.clone().addScaledVector(f.right, bs);
    pos.push(p.x, p.y + yas, p.z, q.x, q.y + ybs, q.z);
    uv.push(s, 0, s, Math.hypot(bs - as, ybs - yas));
    if (i) { const o = (i - 1) * 2; idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** The sea's water from `d0` to `d1` m out from the waterline (negative: up the sand), at heights `y0`, `y1` off the
 *  road's: its uv (s along the road, d out from the waterline) and `seaOff` (the way out to sea) as look/sea.ts reads
 *  them. */
function seaRibbon(route: Route, s0: number, s1: number, d0: number, d1: number, y0: number, y1: number): THREE.BufferGeometry {
  const n = Math.max(2, Math.ceil((s1 - s0) / STEP) + 1), pos: number[] = [], uv: number[] = [], off: number[] = [], idx: number[] = [];
  for (let i = 0; i < n; i++) {
    const s = s0 + ((s1 - s0) * i) / (n - 1), f = route.frameAt(s), out = new THREE.Vector2(-f.right.x, -f.right.z).normalize();
    for (const [d, y] of [[d0, y0], [d1, y1]] as const) {
      const p = f.pos.clone().addScaledVector(f.right, -(BEACH + d));
      pos.push(p.x, p.y + y, p.z); uv.push(s, d); off.push(out.x, out.y);
    }
    if (i) { const o = (i - 1) * 2; idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('seaOff', new THREE.Float32BufferAttribute(off, 2)); g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** A strip along the road from `a` to `b` metres off its centre line (negative: left; numbers, or functions of s),
 *  coloured per sample. */
function strip(route: Route, a: number | ((s: number) => number), b: number | ((s: number) => number), dy: number, colorAt: (s: number) => THREE.Color, end = route.length): THREE.BufferGeometry {
  const at = (x: number | ((s: number) => number), s: number) => (typeof x === 'number' ? x : x(s));
  const n = Math.ceil((end - ROAD_START) / STEP) + 1, pos = new Float32Array(n * 6), col = new Float32Array(n * 6), idx: number[] = [];
  for (let i = 0; i < n; i++) {
    const s = Math.min(end, ROAD_START + i * STEP), f = route.frameAt(s), c = colorAt(s);
    const p = f.pos.clone().addScaledVector(f.right, at(a, s)), q = f.pos.clone().addScaledVector(f.right, at(b, s));
    pos.set([p.x, p.y + dy, p.z, q.x, q.y + dy, q.z], i * 6);
    col.set([c.r, c.g, c.b, c.r, c.g, c.b], i * 6);
    if (i > 0) { const o = (i - 1) * 2; idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Lines painted on the road (each piece from s0 to s1 along it, from lateral a to b), laid on the road strip's own
 *  facets — the strip from `left` to `right` that `strip` builds, sample for sample, each quad split on its diagonal
 *  the same way — so they never sink into it or stand off it, however it climbs and turns; `lift` m over it (the
 *  material's polygon offset does the rest at any distance). */
function roadPaint(route: Route, end: number, left: number, right: (s: number) => number, pieces: { s0: number; s1: number; a: number | ((s: number) => number); b: number | ((s: number) => number) }[], lift = 0.006): THREE.BufferGeometry {
  const pos: number[] = [], at = (x: number | ((s: number) => number), s: number) => (typeof x === 'number' ? x : x(s));
  const row = (s: number) => { const f = route.frameAt(s); return { p: f.pos.clone().addScaledVector(f.right, left), q: f.pos.clone().addScaledVector(f.right, right(s)), w: right(s) - left }; };
  for (const pc of pieces) {
    const i0 = Math.max(0, Math.floor((pc.s0 - ROAD_START) / STEP)), i1 = Math.ceil((Math.min(pc.s1, end) - ROAD_START) / STEP);
    for (let i = i0; i < i1; i++) {
      const sA = ROAD_START + i * STEP, sB = Math.min(end, sA + STEP);
      if (sB <= sA) continue;
      const A = row(sA), B = row(sB);
      // (the quad's two facets: (pA, qA, pB) where u + v <= 1, (qA, qB, pB) past it; u along, v across from the left)
      const surf = (u: number, v: number) => u + v <= 1
        ? A.p.clone().addScaledVector(B.p.clone().sub(A.p), u).addScaledVector(A.q.clone().sub(A.p), v)
        : B.q.clone().addScaledVector(A.q.clone().sub(B.q), 1 - u).addScaledVector(B.p.clone().sub(B.q), 1 - v);
      const u0 = Math.max(0, (pc.s0 - sA) / (sB - sA)), u1 = Math.min(1, (pc.s1 - sA) / (sB - sA));
      if (u1 <= u0) continue;
      const va = (u: number) => { const s = sA + u * (sB - sA); return (at(pc.a, s) - left) / (A.w + (B.w - A.w) * u); };
      const vb = (u: number) => { const s = sA + u * (sB - sA); return (at(pc.b, s) - left) / (A.w + (B.w - A.w) * u); };
      // cut where each of its edges crosses the facets' diagonal, so no triangle of paint spans the fold
      const cross = (v: (u: number) => number) => { const a = v(0), b = v(1); return (1 - a) / (1 + b - a); };
      const us = [u0, u1, cross(va), cross(vb)].filter((u) => u >= u0 && u <= u1).sort((x, y) => x - y);
      for (let k = 0; k + 1 < us.length; k++) {
        const ua = us[k]!, ub = us[k + 1]!;
        if (ub - ua < 1e-6) continue;
        const c = [surf(ua, va(ua)), surf(ua, vb(ua)), surf(ub, va(ub)), surf(ub, vb(ub))];
        // (split from (ua, b) to (ub, a): along the facets' diagonal where it crosses)
        for (const t of [[0, 1, 2], [1, 3, 2]]) for (const j of t) { const p = c[j]!; pos.push(p.x, p.y + lift, p.z); }
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const n = new Float32Array(pos.length); for (let i = 1; i < n.length; i += 3) n[i] = 1;
  g.setAttribute('normal', new THREE.BufferAttribute(n, 3));
  return g;
}

/** An embankment along one side of the road (side: -1 left, +1 right): from the verge's edge (`edge` m out) down to
 *  the plain at SLOPE, wherever the road stands above it; steeper on a bend's inside, where it may reach no further
 *  out than the bend's radius (past it, the hairpin up into the hills folded it into tall sheets across the sky). Its
 *  top `top(s)` m under the road's level (under the verge; on the climb, the retaining wall's foot: CLIMB_WALL). */
function skirt(route: Route, side: number, edge: (s: number) => number, end = route.length, top: (s: number) => number = () => 0.05): THREE.BufferGeometry {
  const n = Math.ceil((end - ROAD_START) / STEP) + 1, pos = new Float32Array(n * 6), col = new Float32Array(n * 6), idx: number[] = [];
  const c = new THREE.Color(WORLD.ground).multiplyScalar(0.8);
  // each sample's bend radius on this side (Infinity where the road runs straight or bends the other way)
  const inside = Array.from({ length: n }, (_, i) => {
    const s = Math.min(end, ROAD_START + i * STEP), a = route.frameAt(s), b = route.frameAt(s + STEP);
    const turn = Math.acos(Math.min(1, a.fwd.dot(b.fwd)));
    return turn > 1e-6 && Math.sign(b.fwd.dot(a.right)) === side ? STEP / turn : Infinity;
  });
  for (let i = 0; i < n; i++) {
    const s = Math.min(end, ROAD_START + i * STEP), f = route.frameAt(s), h = Math.max(0, f.pos.y + 0.4), e = edge(s);
    let run = e + SLOPE * h;
    for (let j = Math.max(0, i - Math.ceil(run / STEP)); j < Math.min(n, i + Math.ceil(run / STEP) + 1); j++) run = Math.min(run, 0.85 * inside[j]!);
    run = Math.max(e, run);
    const p = f.pos.clone().addScaledVector(f.right, side * e); p.y -= top(s); // (straight down: as the wall's face, world.ts climbWalls)
    const q = f.pos.clone().addScaledVector(f.right, side * run); q.y = -0.4;
    pos.set([p.x, p.y, p.z, q.x, q.y, q.z], i * 6);
    col.set([c.r, c.g, c.b, c.r, c.g, c.b], i * 6);
    // (wound to face out and up on either side: the left's, wound as the right's, faced in under the road and was
    // culled from outside — on the climb's left, past the bend, you looked under the verge into its far side's inside)
    if (i > 0) { const o = (i - 1) * 2; if (side > 0) idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); else idx.push(o, o + 2, o + 1, o + 1, o + 2, o + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}


/** The climb into the hills keeps a verge this wide (m off the road's centre) once it's this high over the plain (m). */
const CLIMB_VERGE = { w: 7.5, h: 8 };
/** How far out the verges reach at s on a side (m off the road's centre): SHOULDER, but narrow where the road climbs
 *  into the hills (40 m shelves either side of the climb read from afar as a band floating in the fog), widening again
 *  over the last of it to hold the overlook's lot; and never further out on a bend's inside than most of its radius
 *  (past its centre, the hairpin's verge and embankment folded into a spike standing over it). */
function vergesOf(drive: Drive, end: number): (side: number, s: number) => number {
  const { route, motion } = drive, n = Math.ceil((end - ROAD_START) / STEP) + 1;
  const sm = (u: number) => { const v = Math.min(1, Math.max(0, u)); return v * v * (3 - 2 * v); };
  const climb = drive.stretches.find((st) => st.id === 'chorus4'), from = climb ? motion.distanceAt(climb.start) : Infinity, lot = end - OVERLOOK_LIP - LOT.entry;
  // each sample's bend radius on either side (Infinity where it runs straight or bends the other way), then the least
  // within a verge's reach along the road
  const radius = (side: number) => {
    const r = Array.from({ length: n }, (_, i) => {
      const s = Math.min(end, ROAD_START + i * STEP), a = route.frameAt(s), b = route.frameAt(s + STEP), turn = Math.acos(Math.min(1, a.fwd.dot(b.fwd)));
      return turn > 1e-6 && Math.sign(b.fwd.dot(a.right)) === side ? STEP / turn : Infinity;
    }), k = Math.ceil(SHOULDER / STEP);
    return r.map((_, i) => Math.min(...r.slice(Math.max(0, i - k), i + k + 1)));
  };
  const inside = { [-1]: radius(-1), [1]: radius(1) } as Record<number, number[]>;
  return (side, s) => {
    const h = route.frameAt(s).pos.y + 0.4, narrow = s >= from ? sm(h / CLIMB_VERGE.h) * (1 - sm((s - (lot - 55)) / 45)) : 0;
    const i = Math.min(n - 1, Math.max(0, Math.round((s - ROAD_START) / STEP)));
    return Math.max(ROAD_HALF + 1, Math.min(SHOULDER - (SHOULDER - CLIMB_VERGE.w) * narrow, 0.85 * inside[side]![i]!));
  };
}

/** The climb's retaining walls (the user, 2026-10-17: driving up to the vista "I can see through the mesh of the like
 *  concrete of the road"): along both verges' edges from where the road stands `from` m over the plain to its end, a
 *  board-formed concrete wall holding the verge up, `depth` m from its parapet's foot down to its own (eased in over
 *  `ramp` m; never under the plain), the hills meeting its face (look/lookout.ts CLIMB.under holds them that far under
 *  the verge), the embankment carried on from its foot; its parapet `h` m over the verge, `t` m either side of the
 *  edge, under a cap `cap.w` m either side and `cap.h` thick. */
const CLIMB_WALL = { from: 6, ramp: 14, depth: 3.2, h: 0.55, t: 0.15, cap: { w: 0.22, h: 0.1 }, tile: { along: 6, down: 4 }, colour: '#b3a99b', capColour: '#cbc0ae' };

/** The concrete's face: panels between expansion joints, the formwork's boards, the pour's mottle, grime run down from
 *  the cap, a row of weep holes. One tile (`tile` m), its top row the wall's top. */
function wallTexture(): THREE.CanvasTexture {
  const W = CLIMB_WALL, w = 512, h = Math.round((512 * W.tile.down) / W.tile.along), px = w / W.tile.along, cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const c = cv.getContext('2d')!;
  let k = 0; const r = () => hash(++k, 5.3);
  c.fillStyle = W.colour; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 260; i++) { c.fillStyle = r() < 0.5 ? 'rgba(70,58,66,0.07)' : 'rgba(255,248,236,0.07)'; c.fillRect(r() * w, r() * h, (0.3 + r()) * px, (0.15 + 0.4 * r()) * px); }
  // the boards: a faint line every 0.3 m, a stronger one at each lift (1.2 m)
  for (let y = 0.3; y < W.tile.down; y += 0.3) { const lift = Math.abs(y / 1.2 - Math.round(y / 1.2)) < 0.01; c.fillStyle = lift ? 'rgba(50,40,50,0.28)' : 'rgba(50,40,50,0.09)'; c.fillRect(0, y * px, w, lift ? 2 : 1); }
  // grime run down from the cap, longest under the joints
  for (let i = 0; i < 14; i++) {
    const x = r() * w, len = (0.4 + 2.6 * r() ** 2) * px, g = c.createLinearGradient(0, 0, 0, len);
    g.addColorStop(0, 'rgba(44,34,44,0.26)'); g.addColorStop(1, 'rgba(44,34,44,0)'); c.fillStyle = g; c.fillRect(x, 0, (0.08 + 0.3 * r()) * px, len);
  }
  for (const x of [0, w - 1]) { const g = c.createLinearGradient(0, 0, 0, 2.4 * px); g.addColorStop(0, 'rgba(44,34,44,0.3)'); g.addColorStop(1, 'rgba(44,34,44,0)'); c.fillStyle = g; c.fillRect(x - 0.15 * px, 0, 0.3 * px, 2.4 * px); }
  // the expansion joint at the panel's ends (the tile's edges), its sealant dark
  c.fillStyle = 'rgba(30,22,30,0.75)'; c.fillRect(0, 0, 3, h); c.fillRect(w - 3, 0, 3, h);
  // the weep holes, a stain under each
  for (const x of [1.5, 4.5]) {
    const y = 2.3 * px, s = 0.1 * px, g = c.createLinearGradient(0, y, 0, y + 0.8 * px);
    g.addColorStop(0, 'rgba(40,30,38,0.35)'); g.addColorStop(1, 'rgba(40,30,38,0)'); c.fillStyle = g; c.fillRect(x * px - s * 0.7, y, s * 1.4, 0.8 * px);
    c.fillStyle = '#231a22'; c.beginPath(); c.arc(x * px, y, s / 2, 0, Math.PI * 2); c.fill();
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.flipY = false; t.repeat.set(1 / W.tile.along, 1 / W.tile.down); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

/** The climb's retaining walls (CLIMB_WALL) along both verges (`verge(side, s)` m out) from `s0` to the road's end
 *  `end`: the walls and their caps (two meshes), and how far under the road's level each wall's foot lies at s (the
 *  embankment's top: `skirt`). */
function climbWalls(route: Route, verge: (side: number, s: number) => number, s0: number, end: number): { group: THREE.Group; foot: (s: number) => number } {
  const W = CLIMB_WALL, g = new THREE.Group();
  let from = Infinity;
  for (let s = ROAD_START + Math.ceil((s0 - ROAD_START) / STEP) * STEP; s < end; s += STEP) if (route.frameAt(s).pos.y + 0.4 >= W.from) { from = s; break; }
  const sm = (u: number) => { const v = Math.min(1, Math.max(0, u)); return v * v * (3 - 2 * v); };
  // (the wall's foot: eased in from the verge's own level, never below the plain at -0.4)
  const foot = (s: number) => (s < from ? 0.05 : Math.min(route.frameAt(s).pos.y + 0.4, 0.05 + (W.depth - 0.05) * sm((s - from) / W.ramp)));
  if (!(from < end)) return { group: g, foot };
  const walls: THREE.BufferGeometry[] = [], caps: THREE.BufferGeometry[] = [], top = W.h + W.cap.h;
  for (const side of [-1, 1]) {
    const at = (d: number) => (s: number) => side * (verge(side, s) + d);
    // the face down to the foot (a little under it, into the embankment), the road side, the cap and its edges
    walls.push(ribbon(route, from, end, at(W.t), W.h, at(W.t), (s) => -foot(s) - 0.3), ribbon(route, from, end, at(-W.t), W.h, at(-W.t), -0.05));
    caps.push(ribbon(route, from, end, at(-W.cap.w), top, at(W.cap.w), top));
    for (const d of [-W.cap.w, W.cap.w]) caps.push(ribbon(route, from, end, at(d), W.h, at(d), top));
    caps.push(ribbon(route, from, end, at(W.t), W.h, at(W.cap.w), W.h), ribbon(route, from, end, at(-W.cap.w), W.h, at(-W.t), W.h));
    // its ends, closed
    for (const s of [from, end]) {
      const e = verge(side, s), l = (d: number) => side * (e + d);
      walls.push(patch(route, [[s, l(-W.t), -0.05], [s, l(W.t), -foot(s) - 0.3], [s, l(-W.t), W.h], [s, l(W.t), W.h]], [0, 1, 2, 1, 3, 2]));
      caps.push(patch(route, [[s, l(-W.cap.w), W.h], [s, l(W.cap.w), W.h], [s, l(-W.cap.w), top], [s, l(W.cap.w), top]], [0, 1, 2, 1, 3, 2]));
    }
  }
  g.add(new THREE.Mesh(mergeGeometries(walls)!, toon({ map: wallTexture(), side: THREE.DoubleSide })), new THREE.Mesh(mergeGeometries(caps)!, toon({ color: W.capColour, side: THREE.DoubleSide })));
  return { group: g, foot };
}

export function buildWorld(drive: Drive): THREE.Group {
  const { route, motion } = drive, g = new THREE.Group();
  const stretchAtS = (s: number): Stretch => {
    for (const st of drive.stretches) if (s < motion.distanceAt(st.end)) return st;
    return drive.stretches[drive.stretches.length - 1]!;
  };
  const lambert = (o: THREE.MeshToonMaterialParameters = {}) => toon({ vertexColors: true, ...o });

  // ground either side (the sea to the left along the coast), the road, its centre dashes
  const grass = new THREE.Color(WORLD.ground), sand = new THREE.Color(WORLD.sand), sea = new THREE.Color(WORLD.sea), asphalt = new THREE.Color(WORLD.asphalt);
  const seaLeft = (s: number) => !!BLOCKS[stretchAtS(s).id]!.seaLeft;
  // the road ends at the overlook, a few metres past where the car parks: a cliff, the city below
  const end = Math.min(route.length, motion.distanceAt(drive.stretches[drive.stretches.length - 1]!.end) + OVERLOOK_LIP);
  const named = <T extends THREE.Object3D>(o: T, name: string) => { o.name = name; return o; };
  // each section its own ground: the city's paving, the freeway's concrete, the neighbourhood's lawns, the coast's sand
  const groundOf = (s: number) => { const g0 = GROUND[stretchAtS(s).id]; return g0 ? new THREE.Color(g0) : grass; };
  const verge = vergesOf(drive, end);
  g.add(named(new THREE.Mesh(strip(route, (s) => (seaLeft(s) ? -BEACH : -verge(-1, s)), -ROAD_HALF, -0.05, (s) => (seaLeft(s) ? sand : groundOf(s)), end), printedGround(lambert())), 'verges'));
  g.add(named(new THREE.Mesh(strip(route, ROAD_HALF, (s) => verge(1, s), -0.05, (s) => (seaLeft(s) ? sand : groundOf(s)), end), printedGround(lambert())), 'verges'));
  // the sea beyond the beach, its swell, surf and foam drawn by its shader (look/sea.ts: the static white slabs that
  // stood for the foam are gone), and the wash up the sand
  for (const st of drive.stretches) {
    if (!BLOCKS[st.id]!.seaLeft) continue;
    const a = Math.max(ROAD_START, motion.distanceAt(st.start) - 60), b = Math.min(end, motion.distanceAt(st.end) + 60);
    g.add(named(new THREE.Mesh(seaRibbon(route, a, b, SEA - BEACH, 0, -0.12, -0.12), seaWater()), 'sea'));
    g.add(named(new THREE.Mesh(seaRibbon(route, a, b, 0, -SURF.runup - 0.6, -0.045, -0.045), seaSwash()), 'sea'));
  }
  // the overlook (the user, 2026-10-13: they sat "at the top of a box"): the road ends in a lot at the lip, a stone
  // wall along it, the city below (look/lookout.ts)
  g.add(named(buildLookout(route.frameAt(end - OVERLOOK_LIP), OVERLOOK_LIP, SHOULDER), 'lookout'));
  // the hills the climb runs up to it (shown from the climb on: the scene)
  { const climb = drive.stretches.find((st) => st.id === 'chorus4'); if (climb) g.add(named(buildClimbHills((s) => route.frameAt(s), motion.distanceAt(climb.start), end, (s) => Math.max(verge(-1, s), verge(1, s))), 'climb')); }
  // embankments where the road has climbed: from each verge's edge down to the plain
  // (on the climb, from the foot of its retaining walls)
  const climbAt = drive.stretches.find((st) => st.id === 'chorus4'), walls = climbWalls(route, verge, climbAt ? motion.distanceAt(climbAt.start) : Infinity, end);
  g.add(named(walls.group, 'climbwalls'));
  for (const side of [-1, 1]) g.add(named(new THREE.Mesh(skirt(route, side, (s) => (side < 0 && seaLeft(s) ? BEACH : verge(side, s)), end, walls.foot), lambert()), 'skirts'));
  const box3 = new THREE.Box3();
  for (let s = 0; s < route.length; s += 50) box3.expandByPoint(route.frameAt(s).pos);
  const base = new THREE.Mesh(new THREE.PlaneGeometry(BASE, BASE), printedGround(toon({ color: grass.clone().multiplyScalar(0.85) })));
  base.rotation.x = -Math.PI / 2;
  base.position.set((box3.min.x + box3.max.x) / 2, -0.4, (box3.min.z + box3.max.z) / 2);
  g.add(named(base, 'base'));
  // (the freeway's extra lanes: the road's own ribbon widened to the right over chorus 2's stretch, merging in and
  // out — a strip laid beside it was shaded apart from it, the user, 2026-10-14)
  const lanes = (drive.plans.chorus2 as Chorus2Plan | undefined)?.lanes;
  const rightEdge = (s: number) => (lanes ? laneEdge(lanes, s) : ROAD_HALF);
  g.add(named(new THREE.Mesh(strip(route, -ROAD_HALF, rightEdge, 0, () => asphalt, end), lambert()), 'road'));
  // the centre line's dashes and the edge lines: paint laid on the road strip's own facets and drawn over them
  // (roadPaint) — a dash was a flat box tangent to the road at its middle, and on the climb to the overlook its ends sank
  // into the grade and stood off it; the edge lines' samples fell between the road's, a centimetre off its facets: they
  // flickered in and out of the asphalt (the user, 2026-10-15: "the lines in the road are clipping like crazy"). The
  // road's paint ends where the overlook's lot begins (it has its own bays: look/lookout.ts).
  const lines = toon({ color: WORLD.dash, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 });
  const lotAt = end - OVERLOOK_LIP - LOT.entry;
  const paint = drive.carriers.filter((c) => c.kind === 'road');
  const dashes: { s0: number; s1: number; a: number; b: number }[] = [];
  // (none under road paint, they'd cut through its letters; nor across a cross street's mouth: its crosswalks; nor in a
  // tunnel: its two-way bore has its own double yellow line, scenes/sets/bridge1.ts)
  for (let s = ROAD_START; s + 1.5 < lotAt; s += 8) if (!paint.some((c) => Math.abs(c.s - s) < c.h / 2 + 2) && !drive.openings.some((o) => s > o.a - 4 && s < o.b + 4) && !nearTunnel(drive.tunnels, s, 2)) dashes.push({ s0: s - 1.5, s1: s + 1.5, a: -0.075, b: 0.075 });
  g.add(named(new THREE.Mesh(roadPaint(route, end, -ROAD_HALF, rightEdge, dashes), lines), 'dashes'));
  // the edge lines, along every road the town's kerbs don't line (the freeway, the coast, the hills); not in a tunnel
  {
    const spans: [number, number][] = [], edges: { s0: number; s1: number; a: number | ((s: number) => number); b: number | ((s: number) => number) }[] = [];
    for (const st of drive.stretches) if (!SIDEWALKS.stretches.has(st.id) && !st.tunnel) spans.push([motion.distanceAt(st.start), Math.min(lotAt, motion.distanceAt(st.end))]);
    for (const [a, b] of spans) {
      if (b - a < 2) continue;
      edges.push({ s0: a, s1: b, a: -(ROAD_HALF - 0.22), b: -(ROAD_HALF - 0.38) }, { s0: a, s1: b, a: (s) => rightEdge(s) - 0.38, b: (s) => rightEdge(s) - 0.22 });
    }
    g.add(named(new THREE.Mesh(roadPaint(route, end, -ROAD_HALF, rightEdge, edges), lines), 'dashes'));
  }
  // a guardrail along the sea side of the coast road (the road's edge dropped straight into the water): posts and a rail
  {
    const post: THREE.Matrix4[] = [], rail = toon({ color: '#c9c4b8', side: THREE.DoubleSide }), lat = -(ROAD_HALF + 0.9);
    for (const st of drive.stretches) {
      if (!BLOCKS[st.id]!.seaLeft || st.tunnel) continue;
      const a = motion.distanceAt(st.start), b = Math.min(end, motion.distanceAt(st.end));
      g.add(named(new THREE.Mesh(ribbon(route, a, b, lat, 0.55, lat, 0.75), rail), 'guardrail'));
      for (let s = a + 2; s < b; s += 4) post.push(boxAt(route, s, lat, 0.12, 0.75, 0.12));
    }
    const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), toon({ color: WORLD.post }), post.length);
    post.forEach((m, i) => posts.setMatrixAt(i, m));
    g.add(named(posts, 'guardrail'));
  }
  // the cars parked at the left kerb (blocks.ts PARKED: the guard sees them as blocks)
  {
    const cars = new THREE.Group(), colours = ['#e8e2d2', '#5a6a7d', '#b0532e', '#2b4a6b', '#8a8f8a', '#d9b24a', '#3a3a40', '#7a9a6a'];
    for (const b of drive.blocks) {
      if (b.car !== true) continue; // ('set': its set-piece builds its own)
      const car = sedan({ color: colours[Math.floor(b.color * colours.length)]!, length: b.w }), f = route.frameAt(b.s);
      car.matrixAutoUpdate = false;
      // (facing the far lane's way: its nose back toward the start)
      car.matrix.makeBasis(f.right.clone().negate(), new THREE.Vector3(0, 1, 0), new THREE.Vector3(f.fwd.x, 0, f.fwd.z).normalize().negate()).setPosition(f.pos.clone().addScaledVector(f.right, b.lateral));
      cars.add(car);
    }
    g.add(named(cars, 'parked'));
  }
  // the kerbs and the sidewalks, along the town's stretches, broken at the cross streets
  {
    const tex = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const c = cv.getContext('2d')!; c.fillStyle = SIDEWALKS.colour; c.fillRect(0, 0, 128, 128); c.fillStyle = 'rgba(60,40,50,0.35)'; c.fillRect(0, 0, 3, 128); c.fillRect(0, 0, 128, 2); const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / 1.5, 1 / 1.5); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    const walk = toon({ map: tex, side: THREE.DoubleSide }), kerb = toon({ color: '#b8a894', side: THREE.DoubleSide }), K = SIDEWALKS;
    const B = BACK_STREET, lotM = toon({ color: B.lotColour, side: THREE.DoubleSide }), street = toon({ color: WORLD.asphalt, side: THREE.DoubleSide });
    // (the concrete, the kerbs' faces and the corners' asphalt, each merged into one mesh at the end)
    const walks: THREE.BufferGeometry[] = [], kerbs: THREE.BufferGeometry[] = [], asphalts: THREE.BufferGeometry[] = [];
    const spans: [number, number][] = [];
    for (const st of drive.stretches) if (K.stretches.has(st.id)) spans.push([st.k === 0 ? ROAD_START : motion.distanceAt(st.start), motion.distanceAt(st.end)]);
    const inSpan = (s: number) => spans.some(([a, b]) => s >= a && s <= b);
    const Cw = CORNER_WALK, R = Cw.radius, reach = Cw.to - ROAD_HALF, foot = -0.05; // (faces down past the verges' level)
    /** A face standing along a path of (s, lateral) points, from `foot` up to each point's height. */
    const face = (pts: [number, number, number][]) => {
      const verts: [number, number, number][] = [], tris: number[] = [];
      pts.forEach(([s, l, y], i) => { verts.push([s, l, foot], [s, l, y]); if (i) { const o = (i - 1) * 2; tris.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); } });
      return patch(route, verts, tris);
    };
    /** A cross street's corner at the end `e` of its mouth (`dir`: the way out of it along the road) on a side: the
     *  kerb's return round it, a ramp down to the crossings at its apex, and the sidewalk on round the corner and along
     *  the cross street to the back street's (the corner buildings stood in their lots with the sidewalk cut off at
     *  the street's mouth: the user, 2026-10-16, the barbershop at 16 s and the hardware store at 83 s). In (u, v): u
     *  m from the mouth along the road, v m out from the road's kerb. */
    const corner = (e: number, dir: number, side: number) => {
      const at = (u: number, v: number, y: number): [number, number, number] => [e + dir * u, side * (ROAD_HALF + v), y];
      const ramp = Cw.ramp, sm = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
      // the return: a quarter circle round (R, R), a point at angle a and ρ from its centre at (R − ρ sin a, R − ρ cos a);
      // the kerb's height, down to the road's at the apex (a = π/4) and back up the ramp's run and its flares
      const arc = (a: number, rho: number) => at(R - rho * Math.sin(a), R - rho * Math.cos(a), K.kerb * (1 - (1 - sm(ramp.half, ramp.half + ramp.flare, Math.abs(a - Math.PI / 4) * R)) * Math.max(0, 1 - (R - rho) / ramp.run)));
      const N = 18, rings = [R, R - ramp.run / 3, R - (2 * ramp.run) / 3, R - ramp.run, 0];
      const verts: [number, number, number][] = [], tris: number[] = [];
      for (let i = 0; i <= N; i++) for (const rho of rings) verts.push(arc((i / N) * (Math.PI / 2), rho));
      for (let i = 0; i < N; i++) for (let j = 0; j < rings.length - 1; j++) { const o = i * rings.length + j, p = o + rings.length; tris.push(o, p, o + 1, p, p + 1, o + 1); }
      walks.push(patch(route, verts, tris));
      // the sidewalk on from the return round the corner, and along the cross street out to the back street's
      walks.push(patch(route, [at(0, R, K.kerb), at(R, R, K.kerb), at(0, K.width, K.kerb), at(R, K.width, K.kerb)], [0, 1, 2, 1, 3, 2]));
      walks.push(patch(route, [at(0, K.width, K.kerb), at(K.width, K.width, K.kerb), at(0, reach, K.kerb), at(K.width, reach, K.kerb)], [0, 1, 2, 1, 3, 2]));
      // its kerb: round the return (down to nothing in the ramp) and up the cross street; its back to the lot, its end
      kerbs.push(face([...Array.from({ length: N + 1 }, (_, i) => arc((i / N) * (Math.PI / 2), R)), at(0, reach, K.kerb)]));
      kerbs.push(face([at(K.width, K.width, K.kerb), at(K.width, reach, K.kerb)]), face([at(K.width, reach, K.kerb), at(0, reach, K.kerb)]));
      // the road where the return cuts the corner off
      const fan: [number, number, number][] = [at(0, 0, 0.01), ...Array.from({ length: N + 1 }, (_, i) => { const p = arc((i / N) * (Math.PI / 2), R); return [p[0], p[1], 0.01] as [number, number, number]; })];
      asphalts.push(patch(route, fan, Array.from({ length: N }, (_, i) => [0, i + 1, i + 2]).flat()));
    };
    for (const side of [-1, 1]) {
      const cuts = drive.openings.filter((o) => o.side === side).sort((x, y) => x.a - y.a);
      const r0 = side * ROAD_HALF, r1 = side * (ROAD_HALF + K.width);
      for (const [a0, b0] of spans) {
        // (each run between the cuts stops short of a corner by the return's radius: the corner has its own)
        let a = a0;
        for (const o of [...cuts.filter((o) => o.b > a0 && o.a < b0), { a: b0, b: b0 }]) {
          const s0 = a > a0 ? a + R : a, s1 = o.a < b0 ? o.a - R : o.a;
          if (s1 - s0 > 1) {
            walks.push(ribbon(route, s0, s1, r0, K.kerb, r1, K.kerb));
            kerbs.push(ribbon(route, s0, s1, r0, 0, r0, K.kerb), ribbon(route, s0, s1, r1, foot, r1, K.kerb)); // (its back too: a lot's a step down)
          }
          a = Math.max(a, o.b);
        }
      }
      for (const o of cuts) { if (inSpan(o.a - K.width)) corner(o.a, -1, side); if (inSpan(o.b + K.width)) corner(o.b, 1, side); }
      // the sidewalk on back to the fronts of the buildings standing a little behind it (a set's shops, a few metres
      // off the road: they stood behind a strip of parking lot), the gaps between them that are only an alley filled
      // too; not round a corner (its own walk)
      const fronts = drive.blocks
        .filter((b) => !b.car && !b.concrete && Math.sign(b.lateral) === side)
        .map((b) => ({ a: b.s - b.w / 2, b: b.s + b.w / 2, front: Math.abs(b.lateral) - b.d / 2 }))
        .filter((p) => p.front - (ROAD_HALF + K.width) > 0.05 && p.front - (ROAD_HALF + K.width) <= Cw.apron)
        .sort((x, y) => x.a - y.a);
      const aprons = [...fronts];
      for (let i = 1; i < fronts.length; i++) { const p = fronts[i - 1]!, q = fronts[i]!; if (q.a > p.b && q.a - p.b < Cw.join) aprons.push({ a: p.b, b: q.a, front: Math.min(p.front, q.front) }); }
      for (const p of aprons) {
        let pieces: [number, number][] = [[p.a, p.b]];
        for (const o of cuts) pieces = pieces.flatMap(([x, y]): [number, number][] => [[x, Math.min(y, o.a - K.width)], [Math.max(x, o.b + K.width), y]]).filter(([x, y]) => y - x > 0.05);
        for (const [x0, y0] of pieces) for (const [a1, b1] of spans) {
          const x = Math.max(x0, a1), y = Math.min(y0, b1), f = side * p.front;
          if (y - x < 0.05) continue;
          walks.push(ribbon(route, x, y, r1, K.kerb, f, K.kerb));
          kerbs.push(ribbon(route, x, y, f, foot, f, K.kerb), face([[x, r1, K.kerb], [x, f, K.kerb]]), face([[y, r1, K.kerb], [y, f, K.kerb]]));
        }
      }
    }
    // the back streets and the lots (BACK_STREET), where the rows behind stand: each side's runs broken at a turn too
    // tight for them, a tunnel, the sea; a cross street's asphalt carried through to the back street
    const paintM = toon({ color: WORLD.dash, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 });
    const marks: THREE.BufferGeometry[] = [];
    const tight = (s: number, side: number) => {
      const f0 = route.frameAt(s - 3), f1 = route.frameAt(s + 3);
      return f1.fwd.clone().sub(f0.fwd).dot(f0.right) * side > 0 && f0.fwd.angleTo(f1.fwd) > 6 / B.tight;
    };
    for (const st of drive.stretches) {
      const bk = BLOCKS[st.id]!;
      if (!K.stretches.has(st.id) || !bk.back) continue;
      const a0 = st.k === 0 ? ROAD_START : motion.distanceAt(st.start), b0 = motion.distanceAt(st.end);
      for (const side of [-1, 1]) {
        if (side === -1 && bk.seaLeft) continue;
        // (the runs: the stretch less its tight turns and tunnels, sampled every 2 m)
        const runs: [number, number][] = [];
        let from: number | null = null;
        for (let s = a0; s <= b0; s += 2) {
          const ok = s > 3 && !tight(s, side) && !nearTunnel(drive.tunnels, s, TUNNEL_CLEAR);
          if (ok && from === null) from = s;
          if ((!ok || s + 2 > b0) && from !== null) { if (s - from > 8) runs.push([from, s]); from = null; }
        }
        const cuts = drive.openings.filter((o) => o.side === side);
        for (const [ra, rb] of runs) {
          // (the back street and its far sidewalk run unbroken; the lots and the near sidewalk stop at a cross street)
          g.add(named(new THREE.Mesh(ribbon(route, ra, rb, side * B.road, 0.012, side * B.walk, 0.012), street), 'backstreets'));
          g.add(named(new THREE.Mesh(ribbon(route, ra, rb, side * B.walk, K.kerb, side * BACK.from, K.kerb), walk), 'backstreets'));
          g.add(named(new THREE.Mesh(ribbon(route, ra, rb, side * B.walk, 0, side * B.walk, K.kerb), kerb), 'backstreets'));
          for (let s = ra + 2; s + 3 < rb; s += 8) marks.push(ribbon(route, s, s + 3, side * ((B.road + B.walk) / 2 - 0.07), 0.016, side * ((B.road + B.walk) / 2 + 0.07), 0.016));
          let a = ra;
          for (const o of [...cuts.filter((o) => o.b > ra && o.a < rb).sort((x, y) => x.a - y.a), { a: rb, b: rb }]) {
            if (o.a - a > 1) {
              g.add(named(new THREE.Mesh(ribbon(route, a, o.a, side * (ROAD_HALF + K.width), 0.006, side * B.lot, 0.006), lotM), 'backstreets'));
              g.add(named(new THREE.Mesh(ribbon(route, a, o.a, side * B.lot, K.kerb, side * B.road, K.kerb), walk), 'backstreets'));
              g.add(named(new THREE.Mesh(ribbon(route, a, o.a, side * B.road, 0, side * B.road, K.kerb), kerb), 'backstreets'));
              // (the near sidewalk's step down to the lot, and its ends at the cross streets: open, they showed the ground
              // through under it)
              kerbs.push(ribbon(route, a, o.a, side * B.lot, foot, side * B.lot, K.kerb));
              if (a > ra) kerbs.push(face([[a, side * B.lot, K.kerb], [a, side * B.road, K.kerb]]));
              if (o.a < rb) kerbs.push(face([[o.a, side * B.lot, K.kerb], [o.a, side * B.road, K.kerb]]));
              // (the bays: a row off the street's sidewalk and a row off the back street's)
              for (let s = a + 1; s + 0.2 < o.a; s += B.bay) for (const [x0, x1] of [[ROAD_HALF + K.width + 0.6, ROAD_HALF + K.width + 0.6 + B.bayLen], [B.lot - 0.6 - B.bayLen, B.lot - 0.6]] as const) marks.push(ribbon(route, s, s + 0.12, side * x0, 0.01, side * x1, 0.01));
            }
            if (o.b > o.a && o.a < rb) g.add(named(new THREE.Mesh(ribbon(route, Math.max(o.a, ra), Math.min(o.b, rb), side * ROAD_HALF, 0.01, side * B.walk, 0.01), street), 'backstreets'));
            a = Math.max(a, o.b);
          }
        }
      }
    }
    if (marks.length) g.add(named(new THREE.Mesh(mergeGeometries(marks), paintM), 'backstreets'));
    for (const [gs, m] of [[walks, walk], [kerbs, kerb], [asphalts, street]] as const) if (gs.length) g.add(named(new THREE.Mesh(mergeGeometries(gs)!, m), 'sidewalks'));
  }

  // the town's buildings (blocks.ts: the guard checks them too)
  const towns = drive.blocks.filter((b) => !b.concrete && !b.prop), concrete = drive.blocks.filter((b) => b.concrete && !b.prop);
  // (each a street front: look/facades.ts — its body, storefront, windows, sign and cornice, inside its box)
  g.add(named(facadeMeshes(facades(towns, { vary: true, shops: drive.shops })), 'blocks'));
  // (a set-piece's concrete: a viaduct's deck and piers)
  const crete = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), toon({ color: '#b9ada0' }), Math.max(1, concrete.length));
  concrete.forEach((b, i) => crete.setMatrixAt(i, b.matrix));
  crete.count = concrete.length;
  g.add(named(crete, 'concrete'));
  g.add(named(dressing(drive), 'dressing'));
  g.add(named(placeSigns(drive), 'places'));

  // palms: LA's (look/palms.ts), behind the roadside signs' line, a few seeded variants instanced, each its own height
  // and turn
  const VARIANTS = 4, placed: THREE.Matrix4[][] = Array.from({ length: VARIANTS }, () => []);
  const skyRoad = drive.carriers.filter((c) => c.kind === 'sky').map((c) => [motion.distanceAt(c.phrase.start) - 20, motion.distanceAt(c.phrase.end + 1.5) + 40] as const);
  // (the buildings' footprints grown by a crown's reach, as inverse matrices into their unit boxes)
  const REACH = 3;
  const stands = drive.blocks.filter((b) => !b.car && !b.concrete).map((b) => boxAt(route, b.s, b.lateral, b.d + 2 * REACH, 1, b.w + 2 * REACH).invert());
  for (let k = 0; k * 30 < route.length; k++) {
    const s = k * 30 + 5;
    if (!PALMS.has(stretchAtS(s).id) || s < CORNER.cross[1] + 15) continue; // (none on the intro's corner: the signs stand against the sky)
    for (const side of [1, -1]) {
      const beach = BLOCKS[stretchAtS(s).id]!.seaLeft; // (on the coast only the beach side, by the water)
      if (beach && side === 1) continue;
      if (nearTunnel(drive.tunnels, s, TUNNEL_CLEAR)) continue; // nor in the rock
      // none by a face on the left: they'd stand between it and the camera across the road (on the right too: a wide
      // pair shot stands back past them)
      if (drive.carriers.some((c) => PAIRABLE.has(c.kind) && Math.abs(c.s - s) < c.w / 2 + (side === -1 ? 8 : 28))) continue;
      // nor where the car is while sky-writing's up: the low camera behind it looks up past them into the words (and the
      // skywriter's loop)
      if (skyRoad.some(([a, b]) => s > a && s < b)) continue;
      // nor by a set-piece's sign: its own designed shots stand close to it (a palm by the lens at the chapel)
      if (drive.carriers.some((c) => SET_KINDS.has(c.kind) && !c.ride && Math.abs(c.s - s) < c.w / 2 + 20)) continue;
      const h = 10 + 6 * hash(k, side, 8), f = route.frameAt(s), at = f.pos.clone().addScaledVector(f.right, side * (beach ? BEACH - 7 - 4 * hash(k, 15) : 11.5));
      // nor in a building, or with its crown through one (a strip's shops stand at the back of the sidewalk: blocks.ts
      // STRIP; its palms stand in its lots and alleys)
      if (stands.some((m) => { const p = at.clone().applyMatrix4(m); return Math.abs(p.x) < 0.5 && Math.abs(p.z) < 0.5; })) continue;
      const m = new THREE.Matrix4().compose(at, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), hash(k, side, 9) * Math.PI * 2), new THREE.Vector3().setScalar(h / PALM.h));
      placed[Math.floor(hash(k, side, 7) * VARIANTS)]!.push(m);
    }
  }
  const bark = new THREE.Color(WORLD.trunk), scar = bark.clone().lerp(new THREE.Color('#c9a27a'), 0.35);
  const palms = new THREE.Group(), leaves = toon({ color: WORLD.crown, side: THREE.DoubleSide }), dead = toon({ color: '#7a5f3c', side: THREE.DoubleSide }), wood = toon({ vertexColors: true });
  placed.forEach((ms, v) => {
    if (!ms.length) return;
    const p = palmVariant(v + 1, bark, scar);
    for (const [geo, mat] of [[p.trunk, wood], [p.skirt, dead], [p.crown, leaves]] as const) {
      const im = new THREE.InstancedMesh(geo, mat, ms.length);
      ms.forEach((m, i) => im.setMatrixAt(i, m));
      palms.add(im);
    }
  });
  g.add(named(palms, 'palms'));

  for (const tn of drive.tunnels) g.add(buildTunnel(route, tn));
  g.add(named(buildStreetlights(drive), 'streetlights'));
  g.add(named(furniture(drive), 'furniture'));

  // the motel on the corner, behind the car waiting at the light
  const motel = buildMotel(route);
  const sign = buildMotelSign(route);
  g.add(motel, sign);
  g.userData.sign = sign.userData;
  return g;
}

/** A profile (lateral, height; m) swept along the road from s0 to s1: its uv in metres over `tile`. */
function sweep(route: Route, s0: number, s1: number, profile: readonly [number, number][], tile: number): THREE.BufferGeometry {
  const n = Math.ceil((s1 - s0) / 1) + 1, m = profile.length, pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const len = [0];
  for (let j = 1; j < m; j++) len.push(len[j - 1]! + Math.hypot(profile[j]![0] - profile[j - 1]![0], profile[j]![1] - profile[j - 1]![1]));
  for (let i = 0; i < n; i++) {
    const s = Math.min(s1, s0 + i), f = route.frameAt(s);
    profile.forEach(([x, y], j) => {
      const v = f.pos.clone().addScaledVector(f.right, x).addScaledVector(f.up, y);
      pos.push(v.x, v.y, v.z); uv.push((s - s0) / tile, len[j]! / tile);
    });
    if (i > 0) for (let j = 0; j < m - 1; j++) { const a = (i - 1) * m + j, b = i * m + j; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Glazed wall tiles (tunnel.ts drawTiles), 4 to a texture repeat. */
function tiles(): THREE.Texture {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  drawTiles(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

/** A tunnel's portal (m): how far its concrete frame stands proud of the headland's face, the lintel's height over
 *  the bore, a jamb's width; the walkway along each wall inside (its width, its step up). */
const PORTAL = { proud: 0.8, lintel: 1.4, jamb: 1.2, walk: { w: 0.7, h: 0.3 } };
/** A tunnel (tunnel.ts): the tiled bore, the headland over it with a mouth at each end, and its lamps. */
function buildTunnel(route: Route, tn: Tunnel): THREE.Group {
  const g = new THREE.Group(), { halfW: W, h: H } = TUNNEL, UP = new THREE.Vector3(0, 1, 0);
  // the bore, grimed: the tiles darken toward the road (spray, brake dust, water) and the ceiling's soot gathers over
  // the lanes, so the lamps' pools read (the tiles were one clean colour floor to ceiling; the user, 2026-10-15: a
  // "quality pass")
  const bore: [number, number][] = [[-W, 0], [-W, H], [W, H], [W, 0]];
  const walls: [number, number, number][] = [[0, 0.3], [0.5, 0.42], [1.4, 0.62], [2.6, 0.86], [H - 0.6, 1], [H, 0.74]].map(([y, c]) => [W, y!, c!]);
  const grimed: [number, number, number][] = [...walls.map(([x, y, c]) => [-x, y, c] as [number, number, number]), [-0.45 * W, H, 0.55], [0, H, 0.48], [0.45 * W, H, 0.55], ...walls.slice().reverse()];
  const boreGeo = sweep(route, tn.s0, tn.s1, grimed.map(([x, y]) => [x, y]), TILE_REPEAT), nv = boreGeo.attributes.position!.count, tone = new Float32Array(nv * 3);
  for (let i = 0; i < nv; i++) tone.fill(grimed[i % grimed.length]![2], i * 3, i * 3 + 3);
  boreGeo.setAttribute('color', new THREE.BufferAttribute(tone, 3));
  g.add(new THREE.Mesh(boreGeo, toon({ map: tiles(), vertexColors: true, side: THREE.DoubleSide })));
  // the headland over it: a hill (tunnel.ts headlandAt) rising off the mouths to a lumpy crest, its flanks falling to
  // the sea and the land, running on past each mouth with the road in a cutting — a closed landform seen from the fly
  // line's crane (it was a flat-topped prism, read from above as a black slab), scrub on its slopes
  const rock = toon({ color: WORLD.rock, side: THREE.DoubleSide }), len = tn.s1 - tn.s0, H0 = HEADLAND;
  const at = (lat: number, along: number, y: number) => { const f = route.frameAt(tn.s0 + along); return f.pos.clone().addScaledVector(f.right, lat).addScaledVector(UP, y); };
  // (across the headland: every 0.5 m over the cutting and the mouths, every 2.5 m out on its flanks. The mouths' faces
  // are cut on the same points, so their edges are the surface's own: cut finer than the surface, the sky showed
  // through slivers between them, seen from over the hill (the fly line's crane, 119 s))
  const fine = H0.cutFrom + 6, lats: number[] = [];
  for (let x = -H0.sea; x < -fine; x += 2.5) lats.push(x);
  for (let x = -fine; x <= fine + 1e-6; x += 0.5) lats.push(x);
  for (let x = fine + 2.5; x < H0.land; x += 2.5) lats.push(x);
  lats.push(H0.land);
  const land = (a0: number, a1: number) => { // a grid over the headland from a0 to a1 m along
    const n = Math.max(2, Math.ceil((a1 - a0) / 2) + 1), pos: number[] = [], idx: number[] = [], m = lats.length;
    for (let i = 0; i < n; i++) {
      const a = a0 + ((a1 - a0) * i) / (n - 1);
      for (const x of lats) { const p = at(x, a, headlandAt(x, a, len)); pos.push(p.x, p.y, p.z); }
      if (i) for (let j = 0; j < m - 1; j++) { const p = (i - 1) * m + j, q = i * m + j; idx.push(p, q, p + 1, p + 1, q, q + 1); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    return geo;
  };
  const earth = printedGround(toon({ color: '#b48c66', side: THREE.DoubleSide }));
  // (just inside each mouth and just outside it: the surface steps down across the mouth's face)
  for (const [a0, a1] of [[-H0.spur[0], -1e-3], [0, len], [len + 1e-3, len + H0.spur[1]]] as const) g.add(new THREE.Mesh(land(a0, a1), earth));
  // the mouths: the face between the headland's profile inside and the cutting's outside, the bore cut out of it
  for (const [along, s] of [[0, tn.s0], [len, tn.s1]] as const) {
    const out = along === 0 ? -1e-3 : len + 1e-3, xs = lats.filter((x) => Math.abs(x) <= fine + 1e-6);
    const face = new THREE.Shape([...xs.map((x) => new THREE.Vector2(x, headlandAt(x, along, len))), ...xs.slice().reverse().map((x) => new THREE.Vector2(x, Math.min(headlandAt(x, along, len), headlandAt(x, out, len)) - 0.02))]);
    face.holes.push(new THREE.Path(bore.map(([x, y]) => new THREE.Vector2(x, y))));
    const f = route.frameAt(s), mouth = new THREE.Mesh(new THREE.ShapeGeometry(face), rock);
    mouth.matrixAutoUpdate = false;
    mouth.matrix.makeBasis(f.right, UP, f.right.clone().cross(UP)).setPosition(f.pos); // (up as the surface's: `at`)
    g.add(mouth);
  }
  // chaparral on the slopes (dark clumps, thinning toward the crest) and pale rock breaking through
  {
    const bush: THREE.Matrix4[] = [], stone: THREE.Matrix4[] = [], tint: THREE.Color[] = [];
    for (let k = 0; k < 2600; k++) {
      const along = -H0.spur[0] + (len + H0.spur[0] + H0.spur[1]) * hash(k, 31), lat = -H0.sea + (H0.sea + H0.land) * hash(k, 32);
      const y = headlandAt(lat, along, len);
      if (y < 0.4 || (Math.abs(lat) < W + 2.5 && (along < 2 || along > len - 2))) continue; // (not on the road's cutting or over a mouth)
      if (Math.abs(lat) < HEADWALL.half + 2 && Math.min(Math.abs(along), Math.abs(along - len)) < 2.5) continue; // (nor through a headwall)
      const p = at(lat, along, y - 0.1), sz = 0.45 + 0.9 * hash(k, 33);
      if (hash(k, 34) < 0.06) { stone.push(new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromEuler(new THREE.Euler(0.3 * hash(k, 35), 6 * hash(k, 36), 0.3 * hash(k, 37))), new THREE.Vector3(sz * 1.6, sz * 0.7, sz))); continue; }
      bush.push(new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromAxisAngle(UP, 6 * hash(k, 38)), new THREE.Vector3(sz * 1.4, sz * 0.75, sz * 1.2)));
      tint.push(new THREE.Color(['#4a5a36', '#66703e', '#3a4a30', '#7a7646'][Math.floor(hash(k, 39) * 4)]!));
    }
    const scrub = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), toon(), bush.length);
    bush.forEach((m, i) => { scrub.setMatrixAt(i, m); scrub.setColorAt(i, tint[i]!); });
    const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), toon({ color: '#c9b49a' }), stone.length);
    stone.forEach((m, i) => rocks.setMatrixAt(i, m));
    g.add(scrub, rocks);
  }
  // a raised walkway along each wall (a kerb's step: the bore read as a box with a floor)
  const crete = toon({ color: '#a39a8c' });
  for (const side of [-1, 1]) g.add(new THREE.Mesh(sweep(route, tn.s0, tn.s1, [[side * W, PORTAL.walk.h], [side * (W - PORTAL.walk.w), PORTAL.walk.h], [side * (W - PORTAL.walk.w), 0]], 2), toon({ color: '#a39a8c', side: THREE.DoubleSide })));
  // a sodium lamp over the car on every beat: a fixture flush to the ceiling — its steel housing, the lit lens standing
  // just proud of it behind a guard's bars, a visor lip along each side (it was a plain box)
  const fix = (m: THREE.Material, parts: [number, number, number, number, number][]) => {
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), m, tn.lamps.length * parts.length);
    tn.lamps.forEach((s, i) => parts.forEach(([across, h, along, dz, y0], k) => im.setMatrixAt(i * parts.length + k, boxAt(route, s + dz, 0, across, h, along, y0))));
    g.add(im);
  };
  fix(toon({ color: '#3a3640' }), [[2.3, 0.24, 0.84, 0, H - 0.24], [2.3, 0.14, 0.05, -0.42, H - 0.34], [2.3, 0.14, 0.05, 0.42, H - 0.34]]);
  fix(new THREE.MeshBasicMaterial({ color: new THREE.Color(1.9, 1.15, 0.5) }), [[1.9, 0.05, 0.56, 0, H - 0.29]]);
  fix(toon({ color: '#1e1a20' }), [-0.22, -0.11, 0, 0.11, 0.22].map((dz): [number, number, number, number, number] => [1.96, 0.025, 0.035, dz, H - 0.315]));
  // the portals: a concrete frame round each mouth (a lintel over the bore, a jamb each side with chevrons), standing
  // proud of the headland's face
  const chevrons = (() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 512;
    const x = c.getContext('2d')!;
    x.fillStyle = '#f2c230'; x.fillRect(0, 0, 64, 512);
    x.fillStyle = '#1d1a1e';
    for (let k = 0; k < 8; k++) { x.beginPath(); x.moveTo(0, k * 64); x.lineTo(64, k * 64 + 32); x.lineTo(64, k * 64 + 64); x.lineTo(0, k * 64 + 32); x.closePath(); x.fill(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  for (const [s, dir] of [[tn.s0, -1], [tn.s1, 1]] as const) {
    const f = route.frameAt(s), frame = new THREE.Group();
    frame.matrixAutoUpdate = false;
    frame.matrix.makeBasis(f.right, f.up, f.fwd).setPosition(f.pos.clone().addScaledVector(f.fwd, dir * PORTAL.proud / 2));
    const put = (w: number, h: number, x: number, y: number, m: THREE.Material) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, PORTAL.proud), m); b.position.set(x, y, 0); frame.add(b); return b; };
    put(2 * W + 2 * PORTAL.jamb + 0.4, PORTAL.lintel, 0, H + PORTAL.lintel / 2, crete);
    for (const side of [-1, 1]) {
      put(PORTAL.jamb, H, side * (W + PORTAL.jamb / 2), H / 2, crete);
      const band = new THREE.Mesh(new THREE.PlaneGeometry(PORTAL.jamb - 0.1, 3.2), new THREE.MeshBasicMaterial({ map: chevrons, color: new THREE.Color(1.3, 1.3, 1.3) }));
      band.position.set(side * (W + PORTAL.jamb / 2), 1.7, dir * (PORTAL.proud / 2 + 0.005)); if (dir < 0) band.rotation.y = Math.PI; frame.add(band);
    }
    g.add(frame);
  }
  return g;
}

/** The kerb's furniture along the town's sidewalks (SIDEWALKS): hydrants, parking meters, bins, newspaper boxes and bus
 *  benches, seeded every `every` m on both sides, none by a cross street or a driveway (the openings) or a lyric's
 *  face; all low (under 1.3 m: nothing stands in a shot). One instanced mesh of unit boxes, coloured. */
const FURNITURE = { every: 9, keep: 0.6, clear: 5, /** (the stretches whose sets dress their own kerbs: scenes/sets/verse3.ts) */ own: new Set(['verse3']) };
function furniture(drive: Drive): THREE.InstancedMesh {
  const { route, motion } = drive, K = SIDEWALKS, at: THREE.Matrix4[] = [], col: THREE.Color[] = [];
  const put = (s: number, lateral: number, across: number, h: number, along: number, y0: number, c: string) => { at.push(boxAt(route, s, lateral, across, h, along, K.kerb + y0)); col.push(new THREE.Color(c)); };
  const spans: [number, number][] = [];
  for (const st of drive.stretches) if (K.stretches.has(st.id) && !FURNITURE.own.has(st.id)) spans.push([st.k === 0 ? ROAD_START : motion.distanceAt(st.start), motion.distanceAt(st.end)]);
  const faces = drive.carriers.filter((c) => c.solid || SET_KINDS.has(c.kind)).map((c) => ({ s: c.s, w: c.w, side: Math.sign(c.center.clone().sub(route.frameAt(c.s).pos).dot(route.frameAt(c.s).right)) }));
  for (const [a, b] of spans) for (let s = a + FURNITURE.every / 2; s < b; s += FURNITURE.every) {
    for (const side of [-1, 1]) {
      const k = Math.round(s / FURNITURE.every);
      if (hash(k, side, 100) > FURNITURE.keep) continue;
      if (drive.openings.some((o) => o.side === side && s > o.a - FURNITURE.clear && s < o.b + FURNITURE.clear)) continue;
      if (faces.some((c) => c.side === side && Math.abs(c.s - s) < c.w / 2 + FURNITURE.clear)) continue;
      const kerb = side * (ROAD_HALF + 0.55), u = hash(k, side, 101), sp = s + (hash(k, side, 102) - 0.5) * 4;
      if (u < 0.22) { put(sp, kerb, 0.3, 0.75, 0.3, 0, '#c8202e'); put(sp, kerb, 0.38, 0.12, 0.38, 0.75, '#c8202e'); put(sp, kerb, 0.5, 0.16, 0.16, 0.36, '#c8202e'); } // a hydrant
      else if (u < 0.5) { put(sp, kerb, 0.06, 1.1, 0.06, 0, '#6a6a70'); put(sp, kerb, 0.18, 0.3, 0.1, 1.1, '#2a2a30'); } // a parking meter
      else if (u < 0.7) { put(sp, kerb + side * 0.3, 0.65, 0.95, 0.65, 0, '#2f5d3a'); put(sp, kerb + side * 0.3, 0.72, 0.08, 0.72, 0.95, '#1f3f28'); } // a bin
      else if (u < 0.85) { put(sp, kerb + side * 0.15, 0.4, 1.1, 0.45, 0, ['#2b78a6', '#c8202e', '#f6dd8f'][Math.floor(hash(k, side, 103) * 3)]!); } // a newspaper box
      else { const back = side * (ROAD_HALF + K.width - 0.5); put(sp, back, 0.45, 0.07, 1.8, 0.45, '#5a3a2a'); put(sp, back + side * 0.2, 0.07, 0.42, 1.8, 0.52, '#5a3a2a'); for (const dz of [-0.75, 0.75]) put(sp + dz, back, 0.4, 0.45, 0.06, 0, '#3d3540'); } // a bus bench
    }
  }
  const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), toon(), at.length);
  at.forEach((x, i) => { m.setMatrixAt(i, x); m.setColorAt(i, col[i]!); });
  return m;
}

/** The town's dressing: awnings over the buildings' ground floors on the road side, rooftop clutter (AC units, water
 *  tanks), and power lines on poles along the right where the town is low (the neighbourhood, the coast). */
const POWER = { stretches: new Set(['chorus3']), lateral: 13, every: 34, h: 9 };
function dressing(drive: Drive): THREE.Group {
  const g = new THREE.Group(), { route } = drive, awn: THREE.Matrix4[] = [], awnCol: THREE.Color[] = [], roof: THREE.Matrix4[] = [];
  // (muted, the fronts' own: canvas in faded brick, slate, sage, tan, plum, cream, umber; canopies in painted metal —
  // they were saturated orange, blue, red and yellow slabs, every one the same, under the shops' own signs)
  const canvas = ['#9c4a3a', '#3f5f6e', '#4f6b4a', '#b89f72', '#6e5466', '#d9d0bc', '#7a6a58'], metal = ['#3a3c40', '#6b6e70', '#c9c2b2'];
  /** A box `across` x `h` x `along` at s, its centre `y` over the road, turned `tilt` about the road's direction. */
  const tilted = (s: number, lateral: number, across: number, h: number, along: number, y: number, tilt: number) =>
    boxAt(route, s, lateral, 1, 1, 1, y - 0.5).multiply(new THREE.Matrix4().makeRotationZ(tilt)).multiply(new THREE.Matrix4().makeScale(across, h, along));
  drive.blocks.forEach((b, i) => {
    if (b.concrete || b.prop) return;
    const side = Math.sign(b.lateral), front = Math.abs(b.lateral) - b.d / 2;
    if (b.h > 4 && !b.bare && hash(i, 41) < 0.6) {
      // an awning over the shop's glass and under its sign (look/facades.ts), out from the face toward the road, each
      // shop its own: a canvas shed sloping down to a valance, or a flat metal canopy; its width its own
      const w = b.w * (0.5 + 0.35 * hash(i, 45)), at = b.s + (hash(i, 46) - 0.5) * (b.w - w) * 0.6;
      if (hash(i, 47) < 0.6) {
        const out = 1.5, slope = 0.38, c = new THREE.Color(canvas[Math.floor(hash(i, 42) * canvas.length)]!);
        awn.push(tilted(at, side * (front - out / 2), out / Math.cos(slope), 0.06, w, 3.1 - (out / 2) * Math.tan(slope), -side * slope)); awnCol.push(c);
        awn.push(boxAt(route, at, side * (front - out - 0.02), 0.04, 0.28, w, 3.1 - out * Math.tan(slope) - 0.24)); awnCol.push(c.clone().multiplyScalar(0.85)); // its valance
      } else {
        awn.push(boxAt(route, at, side * (front - 0.6), 1.2, 0.1, w, 2.95));
        awnCol.push(new THREE.Color(metal[Math.floor(hash(i, 42) * metal.length)]!));
      }
    }
    for (let k = 0; k < 1 + Math.floor(hash(i, 43) * 3); k++) {
      const u = hash(i, 44 + k) - 0.5, v = hash(i, 50 + k) - 0.5, tank = hash(i, 56 + k) < 0.25;
      roof.push(boxAt(route, b.s + u * b.w * 0.6, b.lateral + v * b.d * 0.6, tank ? 2.2 : 1.6, tank ? 2.6 : 1.1, tank ? 2.2 : 1.2, b.h));
    }
  });
  const awnings = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), toon(), awn.length);
  awn.forEach((m, i) => { awnings.setMatrixAt(i, m); awnings.setColorAt(i, awnCol[i]!); });
  const roofs = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), toon({ color: '#b9ada0' }), roof.length);
  roof.forEach((m, i) => roofs.setMatrixAt(i, m));
  g.add(awnings, roofs);
  // the skyline (the stranger test: flat-topped boxes): water towers on legs over the tall blocks, masts, and on the
  // rows behind the street, rooftop signs (the shops' names, look/facades.ts signAtlas) facing the road
  {
    const tank: THREE.Matrix4[] = [], cap: THREE.Matrix4[] = [], leg: THREE.Matrix4[] = [], mast: THREE.Matrix4[] = [], signs: THREE.BufferGeometry[] = [];
    drive.blocks.forEach((b, i) => {
      if (b.concrete || b.prop) return;
      const side = Math.sign(b.lateral);
      if (b.h >= 12 && hash(i, 70) < 0.24) {
        const s = b.s + (hash(i, 71) - 0.5) * b.w * 0.5, lat = b.lateral + (hash(i, 72) - 0.5) * b.d * 0.5;
        tank.push(boxAt(route, s, lat, 2.6, 2.8, 2.6, b.h + 2.2));
        cap.push(boxAt(route, s, lat, 3, 0.9, 3, b.h + 5));
        for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) leg.push(boxAt(route, s + dz * 0.9, lat + dx * 0.9, 0.16, 2.3, 0.16, b.h));
      } else if (b.h >= 7 && hash(i, 73) < 0.14) {
        mast.push(boxAt(route, b.s + (hash(i, 74) - 0.5) * b.w * 0.5, b.lateral + (hash(i, 75) - 0.5) * b.d * 0.5, 0.12, 5 + 3 * hash(i, 76), 0.12, b.h));
      }
      if (roofSign(b) && drive.shops.has(b)) { // (its own shop's name: drive/shops.ts, dealt with the storefronts' own)
        const front = Math.abs(b.lateral) - b.d / 2, lat = side * (front + 0.4), w = Math.min(7, b.w - 1), h = 2.6, y = b.h + 2.4;
        leg.push(boxAt(route, b.s - w / 2 + 0.5, lat, 0.15, 2.4, 0.15, b.h), boxAt(route, b.s + w / 2 - 0.5, lat, 0.15, 2.4, 0.15, b.h));
        // (its face toward the road: on the right, facing −x in the road's frame, boxAt's x being −right)
        const geo = new THREE.PlaneGeometry(w, h).rotateY(side > 0 ? Math.PI / 2 : -Math.PI / 2), uv = geo.getAttribute('uv'), k = shopIndex(drive.shops.get(b)!);
        for (let j = 0; j < uv.count; j++) uv.setXY(j, ...signUv(k, uv.getX(j), uv.getY(j)));
        geo.applyMatrix4(boxAt(route, b.s, lat, 1, 1, 1, y - 0.5)); // (a unit scale: the plane's already its size)
        signs.push(geo);
        const back_ = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), toon({ color: '#2a2430' })); back_.matrixAutoUpdate = false; back_.matrix.copy(boxAt(route, b.s, lat - side * 0.08, 0.1, h, w, y - h / 2)); g.add(back_);
      }
    });
    const wood = toon({ color: '#6b5a4a' });
    const tanks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.5, 0.5, 1, 14), wood, tank.length); tank.forEach((m, i) => tanks.setMatrixAt(i, m));
    const caps = new THREE.InstancedMesh(new THREE.ConeGeometry(0.5, 1, 14), toon({ color: '#8a7a68' }), cap.length); cap.forEach((m, i) => caps.setMatrixAt(i, m));
    const legs = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), toon({ color: WORLD.post }), leg.length); leg.forEach((m, i) => legs.setMatrixAt(i, m));
    const masts = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), toon({ color: WORLD.post }), mast.length); mast.forEach((m, i) => masts.setMatrixAt(i, m));
    g.add(tanks, caps, legs, masts);
    if (signs.length) g.add(new THREE.Mesh(mergeGeometries(signs), toon({ map: signAtlas(), side: THREE.DoubleSide }))); // (painted: lit as the roofs are)
  }
  // power lines: poles, and three wires sagging between each pair
  const at: number[] = [];
  for (let s = 0; s < route.length; s += POWER.every) {
    const st = drive.stretchAt(drive.stretches.find((x) => s < drive.motion.distanceAt(x.end))?.start ?? 0);
    if (!POWER.stretches.has(st.id) || nearTunnel(drive.tunnels, s, TUNNEL_CLEAR) || drive.carriers.some((c) => Math.abs(c.s - s) < 14 && c.solid)) { at.push(NaN); continue; }
    at.push(s);
  }
  const poles = at.filter((s) => !Number.isNaN(s));
  const pm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), toon({ color: WORLD.trunk }), poles.length * 2);
  poles.forEach((s, i) => { pm.setMatrixAt(2 * i, boxAt(route, s, POWER.lateral, 0.3, POWER.h, 0.3)); pm.setMatrixAt(2 * i + 1, boxAt(route, s, POWER.lateral, 2.4, 0.14, 0.14, POWER.h - 0.6)); });
  g.add(pm);
  const wire: number[] = [];
  for (let i = 1; i < at.length; i++) {
    const a = at[i - 1]!, b = at[i]!;
    if (Number.isNaN(a) || Number.isNaN(b)) continue;
    for (const off of [-1, 0, 1]) {
      for (let k = 0; k < 8; k++) {
        const u0 = k / 8, u1 = (k + 1) / 8, p = (u: number) => {
          const f = route.frameAt(a + (b - a) * u);
          return f.pos.clone().addScaledVector(f.right, POWER.lateral + off).add(new THREE.Vector3(0, POWER.h - 0.6 - 1.4 * Math.sin(Math.PI * u), 0));
        };
        const q0 = p(u0), q1 = p(u1);
        wire.push(q0.x, q0.y, q0.z, q1.x, q1.y, q1.z);
      }
    }
  }
  const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wire, 3));
  g.add(new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color: '#1c0f22' })));
  return g;
}

/** The song's places, as city signs by the road just after the line that names them (callbacks, never ahead of the
 *  words): South Detroit, Compton, Slauson; and "South of somewhere": SOUTH OF, DETROIT crossed out, somewhere sprayed. */
export const PLACES: readonly [RegExp, string, string, boolean][] = [
  [/south detroit/i, 'SOUTH DETROIT', 'CITY LIMIT', false],
  [/compton/i, 'COMPTON', 'WEST SIDE', false],
  [/slauson/i, 'SLAUSON AV', 'NEXT RIGHT', false],
  [/south of somewhere/i, 'SOUTH OF', 'DETROIT', true],
];
/** A place sign (m): how far past where the car is as its line ends it stands (on the coast, sooner), how far off the
 *  road's centre, its board's size and its centre's height; and how much further on it may be moved to stand clear of
 *  the lyrics' faces and the town's buildings (`step` at a time) — if it can't be, it isn't put up (the user,
 *  2026-10-16: South Detroit's, pushed 270 m on past verse 1's faces to stand in a building by the burger stand at
 *  53 s, "left behind from a previous iteration ... shoved and clipping into a building"). */
const PLACE_SIGN = { after: 45, coastAfter: 24, lateral: 12, w: 11, h: 5.2, y: 5, reach: 36, step: 6 };
export interface PlaceSpot { name: string; sub: string; sprayed: boolean; /** Where its line ends (s) and where it'd stand then (m along the road). */ end: number; want: number; s: number; coast: boolean; pos: THREE.Vector3; face: THREE.Vector3 }
/** Whether a place sign's board (and its legs, down to the ground) at `pos`, facing `face`, stands in a building. */
export function placeSignHits(drive: Drive, pos: THREE.Vector3, face: THREE.Vector3, ground: number) {
  const P = PLACE_SIGN, along = new THREE.Vector3(0, 1, 0).cross(face).normalize(), q = new THREE.Vector3();
  return drive.blocks.some((b) => {
    if (b.car) return false;
    const inv = b.matrix.clone().invert();
    for (let u = -P.w / 2; u <= P.w / 2 + 1e-6; u += 0.5) for (let y = ground + 0.2; y <= pos.y + P.h / 2; y += 1) {
      q.copy(pos).addScaledVector(along, u).setY(y).applyMatrix4(inv);
      if (Math.abs(q.x) < 0.5 && Math.abs(q.y) < 0.5 && Math.abs(q.z) < 0.5) return true;
    }
    return false;
  });
}
/** The song's places' signs: where each stands (pure; the guard checks them: tests/town.test.ts). */
export function placeSpots(drive: Drive): PlaceSpot[] {
  const { route, motion } = drive, P = PLACE_SIGN, out: PlaceSpot[] = [];
  const lines = new Map<number, { text: string; end: number }>();
  for (const c of drive.carriers) { const l = lines.get(c.phrase.line); lines.set(c.phrase.line, { text: (l ? l.text + ' ' : '') + c.phrase.text, end: Math.max(l?.end ?? 0, c.phrase.end) }); }
  for (const [, l] of lines) {
    const place = PLACES.find(([re]) => re.test(l.text));
    if (!place) continue;
    const [, name, sub, sprayed] = place;
    // (on the coast, soon after the arch and on the beach side: the arch wide sees it whole)
    const onCoast = !!BLOCKS[drive.stretchAt(l.end).id]!.seaLeft;
    const want = motion.distanceAt(l.end) + (onCoast ? P.coastAfter : P.after);
    for (let s = want; s <= want + P.reach; s += P.step) {
      if (drive.carriers.some((c) => Math.abs(c.s - s) < (onCoast ? 10 : 16))) continue; // clear of the words' own faces
      // (on the coast the sign stands on the beach side, where the towers' take looks: on the right it never came fully
      // into a frame)
      const coast = !!BLOCKS[drive.stretchAt(drive.stretches.find((x) => s < motion.distanceAt(x.end))?.start ?? 0).id]!.seaLeft, side = coast ? -1 : 1;
      const f = route.frameAt(s), face = f.fwd.clone().negate().addScaledVector(f.right, -0.5 * side).setY(0).normalize(); // toward the oncoming car and the road
      const pos = f.pos.clone().addScaledVector(f.right, side * (coast ? P.lateral - 3 : P.lateral)).add(new THREE.Vector3(0, P.y, 0));
      if (placeSignHits(drive, pos, face, f.pos.y)) continue; // clear of the town's buildings
      out.push({ name, sub, sprayed, end: l.end, want, s, coast, pos, face });
      break;
    }
  }
  return out;
}
function placeSigns(drive: Drive): THREE.Group {
  const g = new THREE.Group(), P = PLACE_SIGN;
  for (const { name, sub, sprayed, coast, pos, face } of placeSpots(drive)) {
    const cv = document.createElement('canvas'); cv.width = 768; cv.height = Math.round((768 * P.h) / P.w);
    const x = cv.getContext('2d')!, W = cv.width, H = cv.height;
    x.fillStyle = '#1f6b44'; x.fillRect(0, 0, W, H);
    x.strokeStyle = '#f4f4f0'; x.lineWidth = 10; x.strokeRect(14, 14, W - 28, H - 28);
    x.fillStyle = '#f4f4f0'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = `${H * 0.28}px "${F.sign(600)}"`; x.fillText(name, W / 2, H * 0.36, W * 0.88);
    x.font = `${H * 0.16}px "${F.sign(500)}"`; x.fillText(sub, W / 2, H * 0.72, W * 0.8);
    if (sprayed) { // the old name struck out, the new one sprayed over in pink
      const wSub = x.measureText(sub).width;
      x.strokeStyle = '#ff4fa3'; x.lineWidth = 9; x.beginPath(); x.moveTo(W / 2 - wSub / 2 - 10, H * 0.74); x.lineTo(W / 2 + wSub / 2 + 10, H * 0.68); x.stroke();
      x.fillStyle = '#ff4fa3'; x.save(); x.translate(W * 0.62, H * 0.6); x.rotate(-0.12);
      x.font = `${H * 0.26}px "${F.bodoni(700, { italic: true })}"`; x.fillText('somewhere', 0, 0); x.restore();
    }
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const sign = new THREE.Group();
    // (on the coast its paint is lit like the beach round it: unlit, its greens and whites glowed off the dusk sand —
    // the user, 2026-10-16)
    sign.add(new THREE.Mesh(new THREE.PlaneGeometry(P.w, P.h), coast ? toon({ map: tex }) : new THREE.MeshBasicMaterial({ map: tex })));
    for (const px of [-P.w / 2 + 0.6, P.w / 2 - 0.6]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, P.y + P.h / 2, 0.2), toon({ color: WORLD.post })); leg.position.set(px, (P.h / 2 - P.y) / 2, -0.12); sign.add(leg); } // (legs: the ground to the board's top)
    sign.matrixAutoUpdate = false;
    sign.matrix.makeBasis(new THREE.Vector3(0, 1, 0).cross(face).normalize(), new THREE.Vector3(0, 1, 0), face).setPosition(pos);
    g.add(sign);
  }
  return g;
}

/** Streetlights on the road's right from dusk: one passes the car every STREETLIGHTS.beats beats (at least `gap` m
 *  apart), a pole with an arm over the road, a bulb and its pool of light; none in a tunnel or by its mouths, nor
 *  close to a sign (it would stand in front of it) or across from a face on the left (beside the camera that films it). */
export const STREETLIGHTS = { from: 92, beats: 2, gap: 18, lateral: 6.2, h: 7.2, reach: 3.6 };
function buildStreetlights(drive: Drive): THREE.Group {
  const { route, motion } = drive, g = new THREE.Group(), at: number[] = [];
  const signs = drive.carriers.filter((c) => c.kind === 'sign' || c.kind === 'street' || c.kind === 'gantry' || c.kind === 'arch');
  for (const b of drive.beats.filter((b, i) => b >= STREETLIGHTS.from && i % STREETLIGHTS.beats === 0)) {
    const s = motion.distanceAt(b);
    if (at.length && s - at[at.length - 1]! < STREETLIGHTS.gap) continue;
    if (nearTunnel(drive.tunnels, s, TUNNEL_CLEAR) || signs.some((c) => Math.abs(c.s - s) < 12)) continue;
    // nor where the camera stands across the road from a face on the left (it would stand beside the lens)
    if (drive.carriers.some((c) => PAIRABLE.has(c.kind) && Math.abs(c.s - s) < c.w / 2 + 28)) continue;
    // nor where the car is while sky-writing's up, as for the palms: the low camera behind it looks up past them into
    // the words (a lamp's arm ran through "fly" on the coast)
    if (drive.carriers.some((c) => c.kind === 'sky' && s > motion.distanceAt(c.phrase.start) - 20 && s < motion.distanceAt(c.phrase.end + 1.5) + 40)) continue;
    at.push(s);
  }
  const L = STREETLIGHTS, n = at.length;
  // (each pool draped over the road's own frame, a grid sampled along it every metre and lifted 4 cm: a flat disc in
  // the road's plane at the lamp, over the climb's crests and bends the road and its verges rose through it in jagged
  // teeth — the user, 2026-10-16: "jagged shadows ... it looks like a glitch". From the climb on the lamps also light
  // the world for real, the car and the two of them too: scenes/drive.ts, their bulbs `userData.lamps`)
  const climb = drive.stretches.find((st) => st.id === 'chorus4'), lit = climb ? motion.distanceAt(climb.start) : Infinity;
  const poles = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), toon({ color: WORLD.post }), n * 2);
  const bulbs = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), lampMaterial('#ffcf8a'), n);
  at.forEach((s, i) => {
    poles.setMatrixAt(2 * i, boxAt(route, s, L.lateral, 0.22, L.h, 0.22));
    poles.setMatrixAt(2 * i + 1, boxAt(route, s, (L.lateral + L.reach) / 2, L.lateral - L.reach, 0.16, 0.16, L.h - 0.1));
    bulbs.setMatrixAt(i, boxAt(route, s, L.reach + 0.3, 0.9, 0.18, 0.45, L.h - 0.3));
  });
  g.add(poles, bulbs);
  if (n) {
    const R = 6.5, k = 13, pos: number[] = [], uv: number[] = [], idx: number[] = [];
    for (const s of at) {
      const o = pos.length / 3;
      for (let j = 0; j <= k; j++) {
        const f = route.frameAt(s + R * (2 * j / k - 1));
        for (let i = 0; i <= k; i++) {
          const p = f.pos.clone().addScaledVector(f.right, L.reach - 0.5 + R * (2 * i / k - 1)).addScaledVector(f.up, 0.04);
          pos.push(p.x, p.y, p.z); uv.push(i / k, j / k);
        }
      }
      for (let j = 0; j < k; j++) for (let i = 0; i < k; i++) { const a0 = o + j * (k + 1) + i; idx.push(a0, a0 + 1, a0 + k + 1, a0 + 1, a0 + k + 2, a0 + k + 1); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
    geo.computeVertexNormals();
    const m = glowMaterial('#ffb560', GLOW.pool, true);
    Object.assign(m, { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 });
    const pools = new THREE.Mesh(geo, m);
    pools.frustumCulled = false;
    g.add(pools);
  }
  // where the lit lamps' light comes from: just under each bulb
  g.userData.lamps = at.filter((s) => s >= lit).map((s) => { const f = route.frameAt(s); return f.pos.clone().addScaledVector(f.right, L.reach + 0.3).add(new THREE.Vector3(0, L.h - 0.6, 0)); });
  return g;
}

/** The little plane's livery and parts (m, at life size; nose along +x from its tail at 0): its cream, its red trim, its
 *  glass, tyres and steel; the fuselage's stations (x, top, bottom, half-width) from the tail post to the cowl's lip, its
 *  rings' faces round each section and how square they are; the side windows (x spans, and the faces round from the
 *  side they fill), the windshield's span, the cowl from here forward; its registration; the prop (its hub's x, radius,
 *  how fast its blades seem to turn, rev/s: the film's shutter strobes a real prop's 40 down to a slow creep). */
export const PLANE = {
  cream: '#e9e4da', red: '#b3122e', glass: '#2c3742', tyre: '#1b1820', steel: '#55555c', soot: '#2e2c30',
  stations: [[0, 0.34, 0.14, 0.06], [0.6, 0.38, 0.02, 0.12], [1.4, 0.44, -0.16, 0.21], [2.3, 0.51, -0.34, 0.32], [2.8, 0.55, -0.43, 0.38],
    [3.15, 0.57, -0.48, 0.42], [3.25, 0.58, -0.49, 0.43], [3.6, 0.59, -0.53, 0.46], [3.85, 0.59, -0.53, 0.465], [3.95, 0.59, -0.53, 0.465],
    [4.5, 0.59, -0.53, 0.47], [4.6, 0.58, -0.53, 0.47], [4.98, 0.43, -0.5, 0.45], [5.0, 0.42, -0.5, 0.45], [5.4, 0.36, -0.44, 0.4], [5.65, 0.29, -0.36, 0.33], [5.8, 0.19, -0.27, 0.24]] as const,
  ring: 24, square: 3,
  windows: { spans: [[2.8, 3.15], [3.25, 3.85], [3.95, 4.5]] as const, faces: [1, 2] as const },
  windshield: [4.6, 4.98] as const, cowl: 5.0, reg: 'N427BF',
  prop: { x: 6.12, r: 1.1, hz: 2.4 },
} as const;

/** The fuselage lofted through PLANE's stations: its faces' triangles split by their paint (the cowl red, a cheatline
 *  just under the windows sweeping up the tail cone as it narrows, the windows' and the windshield's glass, the rest
 *  cream), each a geometry ready for tinting, its normals smooth across the paint's edges. */
function planeFuselage(): Map<string, THREE.BufferGeometry> {
  const P = PLANE, S = P.stations, R = P.ring, e = 2 / P.square, pos: number[] = [], idx: number[] = [];
  const at = (a: number) => [Math.sign(Math.cos(a)) * Math.abs(Math.cos(a)) ** e, Math.sign(Math.sin(a)) * Math.abs(Math.sin(a)) ** e] as const;
  for (const [x, top, bottom, hw] of S) {
    const yc = (top + bottom) / 2, hh = (top - bottom) / 2;
    for (let j = 0; j < R; j++) { const [c, s] = at((j / R) * Math.PI * 2); pos.push(x, yc + hh * s, hw * c); }
  }
  const paintOf = (i: number, j: number): string => {
    const x = (S[i]![0] + S[i + 1]![0]) / 2, side = j < R / 4 || j >= (3 * R) / 4 ? 1 : -1, round = side > 0 ? (j + R / 4) % R - R / 4 : R / 2 - 1 - j; // (faces up from the side's middle: 0 just above it, -1 just below)
    if (x > P.cowl) return P.red;
    if (x > P.windshield[0] && x < P.windshield[1] && j >= R / 8 && j < (3 * R) / 8) return P.glass; // (the top's faces, from 45 to 135 degrees round)
    if ((P.windows.faces as readonly number[]).includes(round) && P.windows.spans.some(([a, b]) => x > a && x < b)) return P.glass;
    return round === -1 ? P.red : P.cream;
  };
  const paints: string[] = [];
  for (let i = 0; i < S.length - 1; i++) for (let j = 0; j < R; j++) {
    const a = i * R + j, b = i * R + ((j + 1) % R), c = a + R, d = b + R;
    idx.push(a, c, b, b, c, d); paints.push(paintOf(i, j), paintOf(i, j));
  }
  // its ends capped: the tail post, and the firewall's face behind the spinner
  for (const [i, flip] of [[0, true], [S.length - 1, false]] as const) {
    const ctr = pos.length / 3; pos.push(S[i]![0], (S[i]![1] + S[i]![2]) / 2, 0);
    for (let j = 0; j < R; j++) { const a = i * R + j, b = i * R + ((j + 1) % R); idx.push(...(flip ? [ctr, a, b] : [ctr, b, a])); paints.push(i ? P.red : P.cream); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  const flat = geo.toNonIndexed(), fp = flat.attributes.position!, fn = flat.attributes.normal!, out = new Map<string, THREE.BufferGeometry>();
  for (const paint of new Set(paints)) {
    const p: number[] = [], n: number[] = [];
    paints.forEach((q, f) => { if (q === paint) for (let v = f * 3; v < f * 3 + 3; v++) { p.push(fp.getX(v), fp.getY(v), fp.getZ(v)); n.push(fn.getX(v), fn.getY(v), fn.getZ(v)); } });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3));
    out.set(paint, g);
  }
  return out;
}

/** The prop's blur, made once: a faint disc with two ghost blades, darker toward the tips, and the ring their yellow
 *  tips paint as they spin. */
let PROP_TEX: THREE.CanvasTexture | null = null;
function propTexture(): THREE.CanvasTexture {
  if (PROP_TEX) return PROP_TEX;
  const N = 256, c = document.createElement('canvas'); c.width = c.height = N;
  const x = c.getContext('2d')!, m = N / 2;
  const disc = x.createRadialGradient(m, m, m * 0.1, m, m, m * 0.86);
  disc.addColorStop(0, 'rgba(42,42,48,0)'); disc.addColorStop(0.25, 'rgba(42,42,48,0.28)'); disc.addColorStop(1, 'rgba(42,42,48,0.52)');
  x.fillStyle = disc; x.beginPath(); x.arc(m, m, m * 0.86, 0, Math.PI * 2); x.fill();
  x.fillStyle = 'rgba(30,28,34,0.28)'; // (two ghost blades, broad at the hub and narrowing out)
  for (const s of [1, -1]) { x.beginPath(); x.moveTo(m, m - 9); x.lineTo(m + s * m * 0.86, m - 4); x.lineTo(m + s * m * 0.86, m + 4); x.lineTo(m, m + 9); x.fill(); }
  x.strokeStyle = 'rgba(232,196,64,0.45)'; x.lineWidth = m * 0.07; x.beginPath(); x.arc(m, m, m * 0.91, 0, Math.PI * 2); x.stroke();
  PROP_TEX = new THREE.CanvasTexture(c); PROP_TEX.colorSpace = THREE.SRGBColorSpace;
  return PROP_TEX;
}

/** A small high-wing plane, a Cessna's lines, nose along +x from its tail at 0, `k` times life size (banners' tugs, the
 *  skywriter): one mesh for all of it but its registration (a decal on the fin) and its prop (named `prop`, which turns:
 *  spinProp). */
export function buildPlane(k = 1): THREE.Group {
  const P = PLANE, g = new THREE.Group(), q = new THREE.Quaternion(), UPV = new THREE.Vector3(0, 1, 0);
  for (const [paint, geo] of planeFuselage()) part(g, geo, paint);
  /** A bar of section w x d from a to b (struts, gear legs). */
  const bar = (a: THREE.Vector3, b: THREE.Vector3, w: number, d: number, color: string) => {
    const dir = b.clone().sub(a), m = tbox(g, w, dir.length(), d, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2, color);
    m.quaternion.copy(q.setFromUnitVectors(UPV, dir.normalize()));
  };
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  // the wing over the cabin, its leading edge rounded, its tips red; a strut each side from the fuselage's foot
  tbox(g, 1.5, 0.12, 9.4, 3.9, 0.6, 0, P.cream);
  tcyl(g, 0.06, 9.4, 4.65, 0.6, 0, P.cream, 10).rotation.x = Math.PI / 2;
  for (const s of [-1, 1]) {
    tbox(g, 1.5, 0.12, 0.3, 3.9, 0.6, s * 4.85, P.red);
    tcyl(g, 0.06, 0.3, 4.65, 0.6, s * 4.85, P.red, 10).rotation.x = Math.PI / 2;
    bar(V(3.75, -0.32, s * 0.4), V(3.95, 0.54, s * 2.7), 0.13, 0.045, P.cream);
  }
  // the spinner, and the cowl's intakes either side of it and its exhaust stub under it
  part(g, new THREE.CylinderGeometry(0.03, 0.2, 0.4, 16).rotateZ(-Math.PI / 2), P.cream, 6.0, -0.03, 0);
  for (const s of [-1, 1]) tbox(g, 0.04, 0.08, 0.09, 5.79, 0.08, s * 0.16, P.tyre);
  tcyl(g, 0.04, 0.22, 5.2, -0.48, 0.18, P.soot, 8).rotation.z = Math.PI / 2;
  // the tailplane (one piece: a hairline of sky between it and its elevator broke into a row of dots under the ink
  // outline), the fin swept back into a fillet along the spine, red, the rudder's hinge line down it
  tbox(g, 0.82, 0.07, 3.4, 0.4, 0.24, 0, P.cream);
  const fin = new THREE.Shape([new THREE.Vector2(-0.14, 0.24), new THREE.Vector2(1.7, 0.24), new THREE.Vector2(1.7, 0.47), new THREE.Vector2(0.95, 0.62),
    new THREE.Vector2(0.48, 1.55), new THREE.Vector2(-0.06, 1.55)]);
  part(g, new THREE.ExtrudeGeometry(fin, { depth: 0.07, bevelEnabled: false }).translate(0, 0, -0.035), P.red);
  bar(V(0.1, 0.36, 0), V(0.16, 1.54, 0), 0.025, 0.09, P.soot);
  // the smoke nozzle under the tail, where the writing comes from, on its bracket
  tcyl(g, 0.045, 0.5, -0.02, 0.06, 0, P.steel, 10).rotation.z = Math.PI / 2;
  tcyl(g, 0.05, 0.06, -0.29, 0.06, 0, P.soot, 10).rotation.z = Math.PI / 2;
  tbox(g, 0.06, 0.12, 0.03, 0.12, 0.13, 0, P.steel);
  // tricycle gear: spring legs out to the mains, a leg down to the nose wheel; each wheel in a red pant
  const wheel = (x: number, y: number, z: number, r: number) => {
    tcyl(g, r, r * 0.55, x, y, z, P.tyre, 14).rotation.x = Math.PI / 2;
    tball(g, 1, x + 0.02, y + r * 0.25, z, P.red).scale.set(r * 1.75, r * 0.9, r * 0.62);
  };
  for (const s of [-1, 1]) { bar(V(3.65, -0.48, s * 0.22), V(3.68, -0.86, s * 0.82), 0.09, 0.04, P.steel); wheel(3.7, -0.89, s * 0.85, 0.19); }
  bar(V(5.3, -0.4, 0), V(5.33, -0.86, 0), 0.06, 0.06, P.steel); wheel(5.34, -0.9, 0, 0.15);
  fuse(g);
  // its registration on the fin, both sides, ahead of the rudder (block letters, cream on the red)
  const regTex = canvasTex(256, 56, (x) => { x.fillStyle = '#f2ecdf'; x.font = 'bold 50px Arial, Helvetica, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(P.reg, 128, 30, 250); });
  const regGeo = mergeGeometries([0.045, -0.045].map((z) => { const p = new THREE.PlaneGeometry(0.82, 0.18); if (z < 0) p.rotateY(Math.PI); return p.translate(0.55, 0.62, z); }))!;
  g.add(new THREE.Mesh(regGeo, toon({ map: regTex, transparent: true, alphaTest: 0.4, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 })));
  // the prop: a blur, turning (spinProp), lit like the rest of it (unlit, its tips' ring glowed off a plane in silhouette)
  const prop = new THREE.Mesh(new THREE.CircleGeometry(P.prop.r, 32).rotateY(Math.PI / 2), toon({ map: propTexture(), transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  prop.name = 'prop'; prop.position.set(P.prop.x, -0.03, 0); g.add(prop);
  g.scale.setScalar(k);
  return g;
}
/** Turn the props of the planes in `o` (buildPlane) to where they are at t. */
export function spinProp(o: THREE.Object3D, t: number) {
  o.traverse((p) => { if (p.name === 'prop') p.rotation.x = -2 * Math.PI * PLANE.prop.hz * t; });
}

/** A towed banner ripples: a wave running back from its leading (right) edge, growing toward its trailing edge. Small
 *  enough to leave the words readable. */
export const FLUTTER = { segments: 40, amp: 0.025, waves: 2.5, hz: 1.3 };
/** Ripple a banner carrier's face (its object from buildCarrier) at t, and turn its tug's prop. */
export function flutter(o: THREE.Object3D, c: Carrier, t: number) {
  const face = o.getObjectByName('face') as THREE.Mesh, p = face.geometry.attributes.position!;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), back = (c.w / 2 - x) / c.w; // 0 at the leading edge, 1 at the trailing
    p.setZ(i, FLUTTER.amp * c.w * back * Math.sin(2 * Math.PI * (FLUTTER.waves * back - FLUTTER.hz * t)));
  }
  p.needsUpdate = true;
  spinProp(o, t); // (and its tug's prop turns)
}

/** The hill under the hill sign (in its face's frame, m): its ridge this far behind the letters, its slope's falloff
 *  toward the overlook, how far it runs on to the city's side and the other, the ground this far under the letters'
 *  feet, a gentle roll in it; its mesh's extent and offset; the mast on its ridge (along, height). */
export const HILLSIDE = { ridge: 45, across: 60, right: 120, left: 320, under: 1.5, roll: 0.06, w: 860, d: 420, x: -130, z: -60, mast: { x: -70, h: 30 },
  /** The floodlights' wash on the slope: brightest this far in front of the letters, how far it falls off down and up
   *  the slope (m), how far along the letters it runs (a share of their width) and how bright; its warm white. */
  wash: { z0: 1, fall: 8, along: 0.6, glow: 0.08, color: [1, 0.9, 0.78] } };

/** The hill's ground lit by its floodlights (in its own frame, the sign's: x along the letters, z toward the overlook),
 *  per pixel: added light falling off smoothly from the letters' feet, to nothing, along and across the slope. */
function floodWash<T extends THREE.MeshToonMaterial>(m: T, w: number): T {
  const prev = m.onBeforeCompile, key = m.customProgramCacheKey(), W = HILLSIDE.wash, f = (v: number) => v.toFixed(4);
  m.onBeforeCompile = (sh, r) => {
    prev.call(m, sh, r);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
varying vec2 vWash;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
vWash = transformed.xz;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec2 vWash;`)
      .replace('#include <opaque_fragment>', `{
  float wx = vWash.x / ${f(w * W.along)}, wz = (vWash.y - ${f(W.z0)}) / ${f(W.fall)};
  outgoingLight += vec3(${W.color.map(f).join(', ')}) * ${f(W.glow)} * exp(-pow(wx * wx, 3.0)) * exp(-wz * wz);
}
#include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => `${key}floodWash${w.toFixed(2)}`;
  return m;
}

/** A carrier with its face's texture: a board on posts (a sign, a billboard), a street blade on its pole, a gantry over
 *  the road, a building with the face on its front (a wall, a shop's fascia, neon), paint on the road, or writing in the
 *  sky. */
/** How bright a neon sign's wash on its wall is (HDR; by night). */
const NEON_WASH = 0.45;
export function buildCarrier(c: Carrier, face: THREE.Texture, wall: THREE.Color, route: Route): THREE.Object3D {
  const clear = c.kind === 'road' || c.kind === 'sky' || c.kind === 'neon' || c.kind === 'tunnel' || c.kind === 'hill' || c.kind === 'bus' || c.kind === 'hood' || c.kind === 'giant' || c.kind === 'barber' || c.kind === 'mirror' || c.kind === 'window' || c.kind === 'carwash' || c.kind === 'phone' || c.kind === 'towel' || c.kind === 'sand' || c.kind === 'surfshop'; // the face is only its letters (the phone's: its bubbles, over the screen's wallpaper)
  const mat = new THREE.MeshBasicMaterial({ map: face, transparent: clear, depthWrite: !clear, fog: c.kind !== 'sky' && c.kind !== 'hill', polygonOffset: c.kind === 'road', polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  if (c.kind === 'neon') mat.color.setScalar(GLOW.neon); // lit lettering: HDR, it blooms
  if (c.kind === 'tunnel') { // graffiti: paint on the tiles, lit by the bore's lamps like the tiles round it (the user, 2026-10-14: it glowed — its lighting "doesn't match the environment at all")
    const m = new THREE.Mesh(new THREE.PlaneGeometry(c.w, c.h), toon({ map: face, transparent: true, depthWrite: false }));
    m.name = 'face'; m.matrixAutoUpdate = false; m.matrix.copy(basisOf(c));
    return m;
  }
  if (c.kind === 'hill') mat.color.setScalar(2); // floodlit at night: through the haze (fogged, its letters went lavender)
  if (c.kind === 'road') return drapedOnRoad(c, mat, route);
  if (c.kind === 'speed' || c.kind === 'radio' || c.kind === 'phone') mat.color.setScalar(1.6); // (lit displays: they bloom a little)
  if (c.kind === 'polesign' || c.kind === 'roofsign') mat.color.setScalar(1.25); // (lightboxes)
  if (c.kind === 'tunnelsign') mat.color.setScalar(1.7); // (a lit box in the dark bore)
  if (c.kind === 'plate' || c.kind === 'sticker') mat.color.setScalar(1.25); // (plate lamps: the rear reads at dusk)
  if (SET_KINDS.has(c.kind)) { // a set-piece's surface: just the face; its props stand round it (scenes/sets/)
    const m = new THREE.Mesh(new THREE.PlaneGeometry(c.w, c.h), mat);
    m.name = 'face'; m.matrixAutoUpdate = false; m.matrix.copy(basisOf(c));
    return m;
  }
  const g = new THREE.Group();
  const board = new THREE.Mesh(new THREE.PlaneGeometry(c.w, c.h, c.kind === 'banner' ? FLUTTER.segments : 1, 1), mat);
  board.name = 'face';
  g.add(board);
  const grey = (hex: string) => toon({ color: hex });
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); return b;
  };
  // the face's centre stands this high over the ground (the road's height where it stands)
  const y0 = c.foot;
  // legs from the board's top down to the ground, at these x
  const legs = (xs: number[], drop = y0 + c.h / 2) => { for (const x of xs) box(0.2, drop, 0.2, x, c.h / 2 - drop / 2, -0.2, grey(WORLD.post)); };
  // its backing board or its building (carriers.ts solidsOf: what the guard checks for hiding other faces)
  const building = PAIRABLE.has(c.kind) && c.kind !== 'billboard';
  // (a face's building printed as a wall, look/walls.ts: stucco, a base band, windows off the sign's column, a cornice
  // and roof units; one plain box read as a blank slab. A storefront's a shade darker than its face.)
  for (const { at, size } of solidsOf(c)) {
    if (!building) { box(size.x, size.y, size.z, at.x, at.y, at.z, grey(WORLD.backing)).name = 'backing'; continue; }
    const colour = c.kind === 'neon' ? wall : wall.clone().multiplyScalar(0.78);
    box(size.x, size.y, size.z, at.x, at.y, at.z, wallMaterial(colour, size, c.w / 2 + 0.6)).name = 'facade';
    const trim = toon({ color: colour.clone().multiplyScalar(1.18) });
    box(size.x + 0.3, 0.42, size.z + 0.3, at.x, at.y + size.y / 2 - 0.21, at.z, trim).name = 'cornice';
    for (let k = 0; k < 2; k++) { // (an AC unit, a tank, on the roof)
      const u = hash(c.s, k, 61), tank = hash(c.s, k, 62) < 0.4;
      box(tank ? 2 : 1.5, tank ? 2.4 : 1, tank ? 2 : 1.3, at.x + (u - 0.5) * size.x * 0.7, at.y + size.y / 2 + (tank ? 1.2 : 0.5), at.z - 1 - 2 * hash(c.s, k, 63), toon({ color: '#b9ada0' })).name = 'roof';
    }
  }
  if (building && c.kind === 'neon' && !c.mounted) {
    // the neon's mounting panel on the wall (dark, the tubes stand off it), and its wash of light on the wall round it
    box(c.w + 0.5, c.h, 0.06, 0, 0, -0.035, grey('#1a1420')).name = 'panel';
    const wash = new THREE.Mesh(new THREE.PlaneGeometry(c.w + 5, c.h + 4), glowMaterial('#ff4fa3', NEON_WASH, true));
    wash.position.z = -0.002; g.add(wash);
  }
  switch (c.kind) {
    case 'sign': legs([-(c.w / 2 - 0.5), c.w / 2 - 0.5]); break;
    case 'billboard': {
      // a steel structure: two I-beam legs, the catwalk under the board with its railing, gooseneck lamps over its top
      const steel = grey('#4a4450');
      if (c.stack !== 'bottom') for (const x of [-(c.w / 2 - 2), c.w / 2 - 2]) {
        const drop = y0 + c.h / 2;
        box(0.36, drop, 0.12, x, c.h / 2 - drop / 2, -0.35, steel); box(0.12, drop, 0.5, x, c.h / 2 - drop / 2, -0.35, steel);
      }
      if (c.stack !== 'top') { // (the catwalk and its rail wholly under the board: the rail cut its bottom row of words)
        box(c.w, 0.08, 1.1, 0, -c.h / 2 - 1.2, 0.45, steel);
        box(c.w, 0.05, 0.05, 0, -c.h / 2 - 0.22, 0.98, steel);
        for (let x = -c.w / 2; x <= c.w / 2; x += 1.8) box(0.05, 0.95, 0.05, x, -c.h / 2 - 0.7, 0.98, steel);
      }
      if (c.stack !== 'bottom') for (const x of [-c.w / 3, 0, c.w / 3]) {
        box(0.06, 0.06, 1.2, x, c.h / 2 + 0.35, 0.45, steel);
        box(0.5, 0.14, 0.3, x, c.h / 2 + 0.3, 1.05, steel);
      }
      break;
    }
    case 'street': { // (on a pole at its left end, from the ground to the blade's top, clamps gripping its edge: the
      // intro corner's pole; off a leg it read as floating in front of it)
      const x = -c.w / 2 - 0.1, top = c.h / 2 + 0.25, drop = y0 + top;
      { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, drop, 10), grey(WORLD.post)); pole.position.set(x, top - drop / 2, -0.12); g.add(pole); }
      for (const y of [-c.h / 2, c.h / 2]) box(0.22, 0.07, 0.07, x + 0.06, y, -0.1, grey(WORLD.post));
      break;
    }
    case 'banner': {
      // the plane ahead of it (to its right, nose that way: it flies the way the words run), a high-wing tug on a tow
      // line from the banner's leading edge; as big as the banner was made (carriers.ts BANNER.view)
      const k = c.w / LAYOUT.banner.w, tow = BANNER.tow * k, x0 = c.w / 2 + tow;
      box(tow, 0.05 * k, 0.05 * k, c.w / 2 + tow / 2, 0, 0, grey('#3a3a40'));
      // (level, whatever the banner's tilt toward the car: in the banner's frame it banked as if turning; from below
      // the car we see its underside)
      const plane = buildPlane(k), B = basisOf(c), rot = new THREE.Matrix4().extractRotation(B);
      const along = new THREE.Vector3().setFromMatrixColumn(B, 0).setY(0).normalize(), level = new THREE.Matrix4().makeBasis(along, new THREE.Vector3(0, 1, 0), along.clone().cross(new THREE.Vector3(0, 1, 0)));
      plane.quaternion.setFromRotationMatrix(rot.invert().multiply(level));
      plane.position.x = x0; g.add(plane);
      break;
    }
    case 'hill': {
      // Mount Lee: a steep hill up from the plain, its ridge behind the letters, falling away fast on the city's side
      // (right) and running on along the left; each letter on its own scaffold down to the slope; the mast on top
      // (the hills' own ground, not a dark fill: at night that read as a black wedge cut into the city's lights)
      const H = HILLSIDE, under = c.foot - c.h / 2 - H.under; // (the ground's height over the plain under the letters)
      const along = (x: number) => Math.exp(-((x / (x > 0 ? H.right : H.left)) ** 4)), across = (z: number) => Math.exp(-(((z + H.ridge) / H.across) ** 2));
      const peak = under / across(0);
      const rise = (x: number, z: number) => peak * along(x) * across(z) * (1 + H.roll * Math.sin(x * 0.045 + 1.3) * Math.sin(z * 0.06 + 0.4)) - c.foot - 0.5;
      const geo = new THREE.PlaneGeometry(H.w, H.d, Math.round(H.w / 5), Math.round(H.d / 5)).rotateX(-Math.PI / 2).translate(H.x, 0, H.z);
      const p = geo.attributes.position!;
      for (let i = 0; i < p.count; i++) p.setY(i, rise(p.getX(i), p.getZ(i)));
      geo.computeVertexNormals();
      // (in chaparral, darker and clear of the haze: by moonlight its plain ground read as a pale dune — the user,
      // 2026-10-15)
      // the floodlights' wash on the slope round the letters (they're lit from below, the Hollywood sign's way): added
      // light fading out from the letters' feet, worked out per pixel in the hill's own shader. (It was a second skin
      // over the slope, its light in its corners: between them the hill's own polygons poked through it, and its ends
      // stopped dead — hard vertical lines cut across the light, the user, 2026-10-16.)
      const hill = new THREE.Mesh(geo, floodWash(scrubGround(toon({ color: '#5a4b4c', fog: false }), '#1d241f', 0.09), c.w)); hill.name = 'mound'; g.add(hill);
      const n = c.rows[0]!.length, cell = c.w / n, steel = grey(WORLD.post);
      [...c.rows[0]!].forEach((ch, i) => {
        if (ch === ' ') return;
        const x = -c.w / 2 + cell * (i + 0.5), top = c.h * 0.4, foot = rise(x, -1.5) - 1, drop = top - foot;
        for (const dx of [-0.3, 0, 0.3]) box(0.3, drop, 0.3, x + dx * cell, top - drop / 2, -0.8, steel);
        for (const y of [top * 0.2, -top * 0.6]) box(cell * 0.66, 0.2, 0.2, x, y, -0.8, steel);
      });
      const mx = H.mast.x, my = rise(mx, -H.ridge);
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 0.35, 0.3) }));
      beacon.position.set(mx, my + H.mast.h + 0.6, -H.ridge); beacon.name = 'beacon'; g.add(beacon);
      // its slope's scrub and ridge bushes, the letters' floodlights and beams, the mast's lattice, the observatory
      dressHill(g, c, rise, { x: mx, z: -H.ridge, h: H.mast.h }, beacon.material);
      break;
    }
    case 'gantry': legs([-6.5, 6.5]); box(13.4, 0.4, 0.4, 0, c.h / 2 + 0.2, -0.2, grey(WORLD.post)); break;
  }
  g.matrixAutoUpdate = false;
  g.matrix.copy(basisOf(c));
  return g;
}

/** Road paint laid on the road itself, row of vertices by row along it, so it follows the road's bends and grade. The
 *  face's own axes decide which way its texture runs: its up along the road (forward or back) and its run across it. */
function drapedOnRoad(c: Carrier, mat: THREE.Material, route: Route): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(c.w, c.h, 1, Math.max(2, Math.ceil(c.h / 0.5)));
  const p = geo.attributes.position!, f0 = route.frameAt(c.s);
  const upSign = Math.sign(c.up.dot(f0.fwd)), runSign = Math.sign(c.up.clone().cross(c.normal).dot(f0.right));
  for (let i = 0; i < p.count; i++) {
    const f = route.frameAt(c.s + upSign * p.getY(i)), v = f.pos.clone().addScaledVector(f.right, runSign * p.getX(i)).addScaledVector(f.up, 0.03);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, mat);
}

/** The floor shifter on the transmission hump between their knees (the user, 2026-10-16: "the car's console doesn't
 *  have a gear shift ... look pretty nice from that view" — the shot over her shoulder onto her phone looks down on
 *  it): the '64 SS's short console on the hump, its chrome-edged top plate with the P R N D L gate, a rubber boot,
 *  a chrome stick raked back toward the bench, a chrome ball. (A column shifter, the bench car's own, would sit on his
 *  side of the wheel, out of that shot.) Its places (m, the body's frame): the console's span along z and its top;
 *  the stick's foot along z, its length and rake (radians back), the ball's radius. Merged: a mesh a material. */
const SHIFTER = { z: [0.08, 0.5] as [number, number], w: 0.2, top: 0.86, foot: 0.3, stick: 0.2, rake: 0.3, ball: 0.026 };
function buildShifter(body: THREE.Object3D, cabin: THREE.Material, trim: THREE.Material, rubber: THREE.Material) {
  const S = SHIFTER, floorTop = IMPALA.cockpit.floor + 0.22, zl = S.z[1] - S.z[0], zm = (S.z[0] + S.z[1]) / 2;
  const at = (g: THREE.BufferGeometry, x: number, y: number, z: number, rx = 0) => g.rotateX(rx).translate(x, y, z);
  const mats = new Map<THREE.Material, THREE.BufferGeometry[]>([[cabin, []], [trim, []], [rubber, []]]);
  const put = (m: THREE.Material, g: THREE.BufferGeometry) => mats.get(m)!.push(g.index ? g.toNonIndexed() : g);
  put(cabin, at(new THREE.BoxGeometry(S.w, S.top - floorTop, zl), 0, (S.top + floorTop) / 2, zm)); // the console
  put(trim, at(new THREE.BoxGeometry(S.w + 0.012, 0.008, zl + 0.012), 0, S.top + 0.002, zm)); // its chrome-edged top
  put(cabin, at(new THREE.BoxGeometry(S.w - 0.03, 0.006, zl - 0.03), 0, S.top + 0.007, zm));
  put(rubber, at(new THREE.BoxGeometry(0.026, 0.004, 0.17), 0.065, S.top + 0.011, zm + 0.02)); // the indicator's slot, on his side of the boot
  for (let k = 0; k < 5; k++) put(trim, at(new THREE.BoxGeometry(0.018, 0.003, 0.008), 0.065, S.top + 0.014, zm + 0.09 - k * 0.035)); // its P R N D L ticks
  put(rubber, at(new THREE.CylinderGeometry(0.018, 0.04, 0.05, 14), 0, S.top + 0.03, S.foot)); // the boot
  const up = new THREE.Vector3(0, Math.cos(S.rake), -Math.sin(S.rake)), foot = new THREE.Vector3(0, S.top + 0.04, S.foot);
  const mid = foot.clone().addScaledVector(up, S.stick / 2), knob = foot.clone().addScaledVector(up, S.stick);
  put(trim, at(new THREE.CylinderGeometry(0.0075, 0.0095, S.stick, 10), mid.x, mid.y, mid.z, -S.rake)); // the stick
  put(trim, at(new THREE.SphereGeometry(S.ball, 16, 12), knob.x, knob.y + S.ball * 0.6, knob.z)); // the ball
  for (const [m, gs] of mats) { const o = new THREE.Mesh(mergeGeometries(gs), m); o.name = 'shifter'; body.add(o); }
}

/** The car: a '64 Impala convertible, the LA lowrider (nose +z): a long low body (its side profile extruded across its
 *  width, wheel arches cut), a chrome spear down the side, chrome bumpers, whitewalls with chrome caps, quad headlights
 *  and the triple round tail lights (they glow at night, the headlights throw beams); the two of them (look/cast3d.ts):
 *  him at the wheel (on its left) in a cap, her riding, her hair down her back. */
export function buildCar(): THREE.Group {
  // the body (and the two of them) on its hydraulics (hydraulics.ts moves it, by name); the wheels on the road
  const g = new THREE.Group(), body = new THREE.Group(), { length: L, width: Wd, belt, wheelZ, wheelR } = CAR, hl = L / 2;
  body.name = 'body';
  g.add(body);
  // (the hero: candy paint and chrome in real light, the sky in them; look/hero.ts)
  const paint = candyPaint(WORLD.car, '#ff5a66'), dark = toon({ color: WORLD.carDark }), chrome = heroChrome();
  // (the cabin's own colours: oxblood tuck-and-roll, a dark plum dash — the two of them stay the cast's dark: in the
  // in-car shots the dash and seats read as forms, not black slabs)
  const white = toon({ color: '#f4efe4' }), seat = toon({ color: '#6e2533' }), cabin = toon({ color: '#3d2a36' });
  const add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, to: THREE.Object3D = body) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); to.add(o); return o; };
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material) => add(new THREE.BoxGeometry(w, h, d), m, x, y, z);

  // the body: the lofted hull (look/impala.ts), the cockpit's sides up to the beltline either side of its tub, a
  // chrome strip along their tops, its floor dark
  add(impalaHull(), paint, 0, 0, 0).name = 'hull';
  const [cz0, cz1] = IMPALA.cockpit.z, cl = cz1 - cz0, cm = (cz0 + cz1) / 2;
  for (const x of [1, -1]) {
    box(0.07, belt - IMPALA.cockpit.floor, cl, x * (IMPALA.halfWidth(cm) - 0.035), (belt + IMPALA.cockpit.floor) / 2, cm, paint);
    box(0.09, 0.025, cl, x * (IMPALA.halfWidth(cm) - 0.04), belt + 0.012, cm, chrome);
  }
  box(Wd - 0.2, 0.02, cl - 0.05, 0, IMPALA.cockpit.floor + 0.012, cm, seat); // the floor's carpet
  box(Wd - 0.2, belt - IMPALA.cockpit.floor, 0.05, 0, (belt + IMPALA.cockpit.floor) / 2, cz1 - 0.03, cabin); // the firewall under the dash
  // the cockpit (the stranger test: the in-car shots read as flat planes, a ring for a wheel, a screen on a stick):
  // the bench, its cushion and back; door cards with a chrome armrest; the windshield's frame in the cabin's dark
  // with a chrome line (in chrome, the top rail reflected the sky as a beige slab across the shot's foot)
  const trim = toon({ color: WORLD.chrome }); // (the cabin's brightwork: toon, not the hero's chrome — in the sun it streaked)
  // the bench's back: a padded roll along its top and tuck-and-roll pleats down the face behind it, a chrome strip
  // under the roll (a plain block, it filled the end's last shot, seen from behind the two of them, as a red slab)
  const seatW = Wd - 0.3, roll = 0.09, backTop = belt + 0.4, backZ = -0.55;
  box(seatW, 0.5 - roll, 0.18, 0, belt - 0.1 + (0.5 - roll) / 2, backZ, seat);
  { const top = add(new THREE.CylinderGeometry(roll, roll, seatW, 16), seat, 0, backTop - roll, backZ); top.rotation.z = Math.PI / 2; }
  for (const side of [1, -1]) { const cap = add(new THREE.SphereGeometry(roll, 12, 8), seat, side * seatW / 2, backTop - roll, backZ); cap.scale.set(0.35, 1, 1); }
  const pleats = 17, pleatW = seatW / pleats, pleatH = 0.5 - roll - 0.05;
  for (let k = 0; k < pleats; k++) {
    const p = add(new THREE.CylinderGeometry(pleatW * 0.46, pleatW * 0.46, pleatH, 10, 1, false, Math.PI / 2, Math.PI), seat, -seatW / 2 + pleatW * (k + 0.5), belt - 0.1 + 0.03 + pleatH / 2, backZ - 0.09);
    p.scale.z = 0.5; // (half-rounds, standing a few cm proud of the back)
  }
  box(seatW, 0.02, 0.012, 0, backTop - 2 * roll - 0.01, backZ - 0.09 - pleatW * 0.23 - 0.008, trim); // (over the pleats' tops)
  box(Wd - 0.3, 0.16, 0.62, 0, belt - 0.1, -0.3, seat); // its cushion
  for (const x of [1, -1]) {
    box(0.03, belt - IMPALA.cockpit.floor - 0.12, cl - 0.1, x * (IMPALA.halfWidth(cm) - 0.085), (belt + IMPALA.cockpit.floor) / 2 - 0.03, cm, seat); // the door card
    box(0.09, 0.04, 0.5, x * (IMPALA.halfWidth(cm) - 0.12), belt - 0.16, cm - 0.2, trim); // its armrest
  }
  box(Wd - 0.12, 0.035, 0.05, 0, belt + 0.48, 0.92, cabin); // the windshield's top rail
  box(Wd - 0.12, 0.01, 0.052, 0, belt + 0.47, 0.92, trim); // its chrome line
  for (const x of [Wd / 2 - 0.08, -Wd / 2 + 0.08]) { box(0.06, 0.5, 0.06, x, belt + 0.24, 0.95, cabin); box(0.012, 0.5, 0.062, x + Math.sign(x) * 0.03, belt + 0.24, 0.95, trim); } // the A-pillars
  { // the rear-view mirror, hung from the rail, turned to him
    const stalk = add(new THREE.CylinderGeometry(0.008, 0.008, 0.09, 8), cabin, 0, belt + 0.42, 0.9);
    stalk.rotation.x = 0.4;
    const mirror = box(0.24, 0.065, 0.018, 0, belt + 0.375, 0.875, cabin); mirror.rotation.y = 0.25; mirror.rotation.x = 0.15;
    const face = box(0.22, 0.05, 0.004, 0, 0, -0.011, chrome); mirror.add(face); face.position.set(0, 0, -0.011);
  }
  // the dash: a padded top rolling over its front edge, the fascia under it with a brushed band and three chrome ribs
  // across, his instrument hood over the gauges, her glovebox with a chrome button, a round vent at each end; the head
  // unit, the gauges and the shift strip stand proud of the fascia (look/dash.ts)
  // (the fascia's and the pad's faces at z 0.6: the head unit's screen leans back, its top edge at z 0.56 — with the
  // faces nearer than that its top was sunk into the dash (the user, 2026-10-14: "the music console is inside the
  // dashboard"); the head unit, the gauges and the shift strip stand proud of it on their own housings, look/dash.ts)
  box(1.76, 0.36, 0.34, 0, 1.03, 0.77, cabin); // the fascia
  box(1.76, 0.06, 0.34, 0, 1.24, 0.77, cabin); // the pad
  { const roll = add(new THREE.CylinderGeometry(0.03, 0.03, 1.76, 10), cabin, 0, 1.24, 0.6); roll.rotation.z = Math.PI / 2; }
  box(1.76, 0.07, 0.012, 0, 0.93, 0.595, toon({ color: '#8f877c' })); // the brushed band
  for (const y of [0.905, 0.93, 0.955]) box(1.76, 0.004, 0.014, 0, y, 0.594, trim);
  box(0.38, 0.035, 0.12, 0.48, 1.215, 0.46, cabin); // his instrument hood
  // under the dash: the kick panel down to the floor, the transmission hump along the middle (the floor read as the
  // hull's bare inside in the head-unit shot)
  { const kick = 0.85 - IMPALA.cockpit.floor; box(Wd - 0.3, kick, 0.06, 0, IMPALA.cockpit.floor + kick / 2, 0.6, cabin); } // (up to the fascia's underside, under it: higher, it stood in front of the head unit)
  box(0.46, 0.22, cl - 0.4, 0, IMPALA.cockpit.floor + 0.11, cm, seat);
  buildShifter(body, cabin, trim, toon({ color: '#16121a' }));
  box(0.5, 0.16, 0.012, -0.52, 1.07, 0.595, toon({ color: '#4a3542' })); // her glovebox
  { const btn = add(new THREE.CylinderGeometry(0.012, 0.012, 0.01, 10), trim, -0.52, 1.07, 0.588); btn.rotation.x = Math.PI / 2; }
  for (const x of [0.8, -0.8]) { add(new THREE.TorusGeometry(0.04, 0.007, 6, 16), trim, x, 1.14, 0.59); add(new THREE.CircleGeometry(0.036, 16), dark, x, 1.14, 0.592).rotation.y = Math.PI; }
  g.userData.dash = buildDash(body);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(Wd - 0.2, 0.46), new THREE.MeshBasicMaterial({ color: '#dfe8f0', transparent: true, opacity: 0.08, depthWrite: false }));
  glass.position.set(0, belt + 0.24, 0.94); glass.rotation.x = -0.25; body.add(glass);
  // chrome: the spear along each side's crease, the bumpers wrapping the ends, the grille's bars over its dark mouth,
  // bezels round the quad headlights and the triple tail lights
  for (const sx of [1, -1]) {
    const pts: THREE.Vector3[] = [];
    // (along the cockpit, on its side's box: the hull's side is nothing there, where its top dips to the floor — the
    // spear ran down the middle of the cabin, a bright post under the dash in the in-car shots)
    for (let z = -2.2; z <= 2.25; z += 0.15) pts.push(new THREE.Vector3(sx * ((z > cz0 && z < cz1 ? IMPALA.halfWidth(z) : IMPALA.sideAt(z, 0.74)) + 0.006), 0.74, z));
    add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.018, 6), chrome, 0, 0, 0).name = 'spear';
  }
  for (const zEnd of [hl + 0.065, -hl - 0.065]) { const bumper = add(new THREE.CapsuleGeometry(0.065, Wd - 0.1, 6, 12), chrome, 0, 0.42, zEnd); bumper.rotation.z = Math.PI / 2; bumper.name = 'bumper'; }
  box(Wd - 0.5, 0.24, 0.04, 0, 0.64, hl + 0.005, dark); // the grille's mouth
  { // the plate on its tail, blank until verse 2 writes on it (the user: the plate area there all along)
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128;
    const x = cv.getContext('2d')!;
    x.fillStyle = '#f2f1ea'; x.fillRect(0, 0, 256, 128); x.strokeStyle = '#1b2a6b'; x.lineWidth = 8; x.strokeRect(4, 4, 248, 120);
    x.fillStyle = '#d81e2c'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `italic 600 30px "${F.bodoni(700, { italic: true })}"`; x.fillText('California', 128, 30);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const plate = add(new THREE.PlaneGeometry(0.46, 0.23), new THREE.MeshBasicMaterial({ map: tex }), 0, 0.7, -hl - 0.085); plate.rotation.y = Math.PI; plate.name = 'plate';
    box(0.5, 0.27, 0.03, 0, 0.7, -hl - 0.06, dark); // (its holder: its face at -hl - 0.075, the plate 1 cm proud of it — flush, they fought)
  }
  for (let k = 0; k < 4; k++) box(Wd - 0.52, 0.018, 0.03, 0, 0.55 + k * 0.06, hl + 0.025, chrome).name = 'grille';
  for (const x of [0.72, 0.45, -0.45, -0.72]) add(new THREE.TorusGeometry(0.1, 0.014, 6, 18), chrome, x, 0.68, hl + 0.03).name = 'headBezel';
  for (const x of [0.78, 0.55, 0.32, -0.32, -0.55, -0.78]) add(new THREE.TorusGeometry(0.085, 0.012, 6, 18), chrome, x, 0.68, -hl - 0.03);
  // under it: the chassis (it rides with the body), and a strut down to each wheel's hub (the scene stretches them as
  // the hydraulics lift it: named 'struts')
  box(Wd - 0.5, 0.16, L - 1.6, 0, 0.22, 0, dark).name = 'chassis';
  const struts = new THREE.Group(); struts.name = 'struts'; g.add(struts);
  for (const z of [wheelZ, -wheelZ]) for (const x of [Wd / 2 - 0.35, -Wd / 2 + 0.35]) add(new THREE.CylinderGeometry(0.05, 0.05, 1, 8), chrome, x, 0.5, z, struts);
  // wire wheels on whitewalls (look/impala.ts), each on a pivot at its hub: the scene rolls them (userData.wheels)
  const wheels: THREE.Object3D[] = [];
  for (const z of [wheelZ, -wheelZ]) for (const x of [Wd / 2 - 0.13, -Wd / 2 + 0.13]) {
    const w = wireWheel(wheelR, Math.sign(x), dark, white, chrome); w.position.set(x, wheelR, z); g.add(w); wheels.push(w);
  }
  g.userData.wheels = wheels;
  // lights: quad headlights, triple round tail lights; the beams ahead on the road
  const head = lampMaterial('#fff2d8', GLOW.head, 0.9), tail = lampMaterial('#ff2a24', GLOW.tail, 1.1);
  for (const x of [0.72, 0.45, -0.45, -0.72]) add(new THREE.CircleGeometry(0.09, 14), head, x, 0.68, hl + 0.035).name = 'headLamp';
  for (const x of [0.78, 0.55, 0.32, -0.32, -0.55, -0.78]) { const t = add(new THREE.CircleGeometry(0.075, 14), tail, x, 0.68, -hl - 0.035); t.rotation.y = Math.PI; }
  // the headlights' throw: light on the road ahead, widening and fading
  const throwGeo = new THREE.PlaneGeometry(1, 1, 1, 1);
  throwGeo.rotateX(-Math.PI / 2);
  const P = throwGeo.attributes.position!;
  for (let i = 0; i < P.count; i++) { const far = P.getZ(i) < 0 ? 1 : 0; P.setXYZ(i, P.getX(i) * (far ? 7 : 1.6), 0.04, hl + 0.4 + far * 22); }
  const lit = new THREE.Mesh(throwGeo, glowMaterial('#ffe6bd', GLOW.beam, false, true));
  lit.name = 'beams'; // (the scene ties the throw to speed: parked at the overlook it would searchlight off the cliff)
  g.add(lit); // (on the road, not on the body)
  // his wheel: the rim, two spokes to a chrome hub inside a horn ring, on its column down into the dash
  // (its face toward him: tipped back at the top like a car's, the hub side (local -z) up and back at him, the column
  // (local +z) down and forward into the dash — at -0.9 the hub faced his lap and its back the windshield (the user,
  // 2026-10-13 and 14: "facing towards the window"))
  const wheel = new THREE.Group(); wheel.name = 'steering'; wheel.position.copy(WHEEL.hub); wheel.rotation.x = WHEEL.tilt; body.add(wheel); // (turned a touch: look/cast3d.ts poseCast)
  add(new THREE.TorusGeometry(0.19, 0.022, 8, 28), dark, 0, 0, 0, wheel);
  add(new THREE.TorusGeometry(0.1, 0.007, 6, 24), trim, 0, 0, -0.012, wheel);
  for (const a of [0.35, -0.35, Math.PI / 2 + 0.0]) { const spoke = add(new THREE.BoxGeometry(0.36, 0.02, 0.014), dark, 0, 0, 0, wheel); spoke.rotation.z = a; if (a > 1) spoke.scale.x = 0.5, spoke.position.y = -0.09; }
  { const hub = add(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 14), trim, 0, 0, -0.01, wheel); hub.rotation.x = Math.PI / 2; }
  { const column = add(new THREE.CylinderGeometry(0.022, 0.022, 0.3, 10), cabin, 0, 0, 0.16, wheel); column.rotation.x = Math.PI / 2; }
  buildCast(body); // the two of them (look/cast3d.ts)
  return g;
}
