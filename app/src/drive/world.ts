// The greybox world (M2): ground, road, blocks of buildings, palms, a few landmarks, the sign boards and the car with
// its two silhouettes. Plain lit colours, no textures but the lyric faces: the look comes in M3. Deterministic
// (seeded by position along the road).
import * as THREE from 'three';
import { hash } from '../engine/util';
import { WORLD, toon } from '../look/toon';
import { F } from '../engine/type';
import { GLOW, glowMaterial, lampMaterial, nightGlass, withWindows } from '../look/night';
import { wallMaterial } from '../look/walls';
import { SHOPS, facades, signAtlas } from '../look/facades';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PALM, palmVariant } from '../look/palms';
import { IMPALA, impalaHull, wireWheel } from '../look/impala';
import { printedGround } from '../look/ground';
import type { Drive } from './drive';
import { ROAD_HALF, ROAD_START, type Route } from './route';
import { BANNER, type Carrier, LAYOUT, PAIRABLE, SET_KINDS, basisOf, solidsOf } from './carriers';
import { TILE_REPEAT, TUNNEL, TUNNEL_CLEAR, type Tunnel, drawTiles, nearTunnel } from './tunnel';
import type { Stretch } from './stretches';
import { BLOCKS, boxAt } from './blocks';
import { sedan } from '../scenes/sets/kit';
import { MOTEL_SIGN, motelSign } from './landmarks';
import { CORNER } from './sets/intro';
import { buildDash } from '../look/dash';
import { CAR } from './cabin';
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
/** The overlook: its gravel turnout's radius, the wall's radius round the car and its blocks (either way of the middle,
 *  this far apart in radians), and how far the hillside runs down to the plain (m). */
const LOOKOUT = { apron: 19, r: 12, blocks: 12, pitch: 0.095, fall: 190 };
const WOOD_DARK = toon({ color: '#3a2a24' });
const STEP = 2;
export { ROAD_START }; // (route.ts: the road starts this far behind the light)

/** Each section's ground (sRGB; others the golden fields). */
const GROUND: Record<string, string> = { verse1: '#c99a7a', chorus2: '#b8a99a', verse2: '#9fae62', chorus3: '#f0d39b', verse3: '#6a5a78', chorus4: '#7d6a5c' };
const PALMS = new Set(['intro', 'chorus1', 'chorus3', 'verse3']); // (none in verse 2: its take's camera rides where they'd stand; on the coast, on the beach by the water)
/** Kerbs and sidewalks along the town's streets (not the freeway, the coast, the tunnel or the hills): the kerb's
 *  height, the sidewalk's width (m) and its concrete; broken where a cross street opens (the set-pieces' openings). */
const SIDEWALKS = { stretches: new Set(['intro', 'chorus1', 'verse1', 'verse2', 'verse3']), kerb: 0.15, width: 3, colour: '#cbbba7' };

/** A ribbon along the road from s0 to s1: at each sample, from (lateral a, height ya) to (lateral b, height yb) over the
 *  road's level; uv in metres (along, across). */
function ribbon(route: Route, s0: number, s1: number, a: number | ((s: number) => number), ya: number, b: number | ((s: number) => number), yb: number): THREE.BufferGeometry {
  const n = Math.max(2, Math.ceil((s1 - s0) / STEP) + 1), pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const at = (x: number | ((s: number) => number), s: number) => (typeof x === 'number' ? x : x(s));
  for (let i = 0; i < n; i++) {
    const s = s0 + ((s1 - s0) * i) / (n - 1), f = route.frameAt(s), as = at(a, s), bs = at(b, s);
    const p = f.pos.clone().addScaledVector(f.right, as), q = f.pos.clone().addScaledVector(f.right, bs);
    pos.push(p.x, p.y + ya, p.z, q.x, q.y + yb, q.z);
    uv.push(s, 0, s, Math.hypot(bs - as, yb - ya));
    if (i) { const o = (i - 1) * 2; idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
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

/** An embankment along one side of the road (side: -1 left, +1 right): from the verge's edge (`edge` m out) down to
 *  the plain at SLOPE, wherever the road stands above it; steeper on a bend's inside, where it may reach no further
 *  out than the bend's radius (past it, the hairpin up into the hills folded it into tall sheets across the sky). */
function skirt(route: Route, side: number, edge: (s: number) => number, end = route.length): THREE.BufferGeometry {
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
    const p = f.pos.clone().addScaledVector(f.right, side * e).addScaledVector(f.up, -0.05);
    const q = f.pos.clone().addScaledVector(f.right, side * run); q.y = -0.4;
    pos.set([p.x, p.y, p.z, q.x, q.y, q.z], i * 6);
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
  g.add(named(new THREE.Mesh(strip(route, (s) => (seaLeft(s) ? -BEACH : -SHOULDER), -ROAD_HALF, -0.05, (s) => (seaLeft(s) ? sand : groundOf(s)), end), printedGround(lambert())), 'verges'));
  g.add(named(new THREE.Mesh(strip(route, ROAD_HALF, SHOULDER, -0.05, (s) => (seaLeft(s) ? sand : groundOf(s)), end), printedGround(lambert())), 'verges'));
  // the sea beyond the beach, and the surf's foam along the shore: broken white lines, a second set further out
  {
    const water = toon({ color: WORLD.sea, side: THREE.DoubleSide }), foam: THREE.Matrix4[] = [];
    for (const st of drive.stretches) {
      if (!BLOCKS[st.id]!.seaLeft) continue;
      const a = Math.max(ROAD_START, motion.distanceAt(st.start) - 60), b = Math.min(end, motion.distanceAt(st.end) + 60);
      g.add(named(new THREE.Mesh(ribbon(route, a, b, -SEA, -0.12, -BEACH, -0.12), water), 'sea'));
      for (let s = a; s < b; s += 7) {
        if (hash(s, 71) < 0.3) continue;
        foam.push(boxAt(route, s + 3 * hash(s, 72), -BEACH - 0.6 - 1.5 * hash(s, 73), 0.5 + 0.8 * hash(s, 74), 0.03, 3 + 3 * hash(s, 75), -0.1));
        if (hash(s, 76) < 0.5) foam.push(boxAt(route, s + 2 + 3 * hash(s, 77), -BEACH - 6 - 3 * hash(s, 78), 0.4, 0.03, 2 + 3 * hash(s, 79), -0.1));
      }
    }
    const fm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), toon({ color: '#f4f0e6' }), foam.length);
    foam.forEach((m, i) => fm.setMatrixAt(i, m));
    g.add(named(fm, 'sea'));
  }
  // the overlook (the user, 2026-10-13: they sat "at the top of a box"): the road ends on a gravel turnout at the lip;
  // a low stone wall with a pipe rail runs along it; a coin viewer, a bench and a bin stand by the wall; pines frame
  // the view either side; and the hillside falls away below, rolling down to the plain
  {
    const park = route.frameAt(end - OVERLOOK_LIP), lipF = route.frameAt(end);
    const fwd = new THREE.Vector3(lipF.fwd.x, 0, lipF.fwd.z).normalize(), right = new THREE.Vector3(lipF.right.x, 0, lipF.right.z).normalize();
    const look = new THREE.Group(); g.add(named(look, 'lookout'));
    const y0 = park.pos.y, centre = park.pos.clone().addScaledVector(fwd, 2);
    const apron = new THREE.Mesh(new THREE.CircleGeometry(LOOKOUT.apron, 48), printedGround(toon({ color: '#8a8074' })));
    apron.rotation.x = -Math.PI / 2; apron.position.copy(centre).addScaledVector(fwd, 2).setY(y0 + 0.03); look.add(apron);
    const stone = toon({ color: '#9a8d7e' }), cap = toon({ color: '#b3a797' }), steel = toon({ color: WORLD.post }), dark = toon({ color: '#1a2430' }), wood = toon({ color: '#5a3a2a' });
    const put = (geo: THREE.BufferGeometry, m: THREE.Material, p: THREE.Vector3, yaw = 0) => { const o = new THREE.Mesh(geo, m); o.position.copy(p); o.rotation.y = yaw; look.add(o); return o; };
    const onArc = (a: number, r: number) => { const d = fwd.clone().multiplyScalar(Math.cos(a)).addScaledVector(right, Math.sin(a)); return { p: centre.clone().addScaledVector(d, r), yaw: Math.atan2(d.x, d.z) }; };
    // the wall, block by block on its arc, capped, with the rail's posts and pipes over it
    for (let i = -LOOKOUT.blocks; i <= LOOKOUT.blocks; i++) {
      const { p, yaw } = onArc(i * LOOKOUT.pitch, LOOKOUT.r);
      put(new THREE.BoxGeometry(1.14, 0.55, 0.5), stone, p.clone().setY(y0 + 0.28), yaw);
      put(new THREE.BoxGeometry(1.2, 0.08, 0.62), cap, p.clone().setY(y0 + 0.59), yaw);
      if (i % 4 === 0) put(new THREE.CylinderGeometry(0.03, 0.03, 0.55, 8), steel, p.clone().setY(y0 + 0.9));
      if (i % 4 === 0 && i < LOOKOUT.blocks) { // the pipe to the next post, along the chord
        const q = onArc((i + 4) * LOOKOUT.pitch, LOOKOUT.r).p, mid = p.clone().add(q).multiplyScalar(0.5).setY(y0 + 1.16), d = q.clone().sub(p);
        const pipe = put(new THREE.CylinderGeometry(0.025, 0.025, d.length(), 8), steel, mid, Math.atan2(d.x, d.z)); pipe.rotation.x = Math.PI / 2; pipe.rotation.order = 'YXZ';
      }
    }
    // the coin viewer, left of the car's nose at the wall; a bench and a bin to the right
    { const { p } = onArc(-0.42, LOOKOUT.r - 1.2); put(new THREE.CylinderGeometry(0.06, 0.09, 1.25, 10), steel, p.clone().setY(y0 + 0.62)); put(new THREE.BoxGeometry(0.42, 0.26, 0.5), dark, p.clone().setY(y0 + 1.4), Math.atan2(fwd.x, fwd.z)); }
    { const { p, yaw } = onArc(0.5, LOOKOUT.r - 1.6); put(new THREE.BoxGeometry(1.8, 0.07, 0.45), wood, p.clone().setY(y0 + 0.46), yaw); put(new THREE.BoxGeometry(1.8, 0.4, 0.07), wood, p.clone().addScaledVector(fwd, -0.22).setY(y0 + 0.72), yaw); for (const dx of [-0.75, 0.75]) put(new THREE.BoxGeometry(0.06, 0.45, 0.4), steel, p.clone().addScaledVector(right, dx).setY(y0 + 0.22), yaw); }
    { const { p } = onArc(0.8, LOOKOUT.r - 1.4); put(new THREE.CylinderGeometry(0.32, 0.3, 0.9, 12), toon({ color: '#2f5d3a' }), p.clone().setY(y0 + 0.45)); }
    // pines either side, framing the view
    for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) {
      const p = centre.clone().addScaledVector(right, sx * (LOOKOUT.apron - 2 + 7 * k)).addScaledVector(fwd, 3 - 6 * k + 3 * hash(sx, k, 3)), h = 7 + 4 * hash(sx, k, 4);
      put(new THREE.CylinderGeometry(0.18, 0.26, 2.2, 8), WOOD_DARK, p.clone().setY(y0 + 1.1));
      put(new THREE.ConeGeometry(2.2 + 0.8 * hash(sx, k, 5), h, 10), dark, p.clone().setY(y0 + 2 + h / 2));
    }
    // chaparral: dark scrub round the turnout's edge and down the hillside, and a VISTA POINT sign where the road meets
    // the apron (the turnout read as a flat grey disc)
    {
      const scrubM: THREE.Matrix4[] = [];
      for (let i = 0; i < 90; i++) {
        const a = hash(i, 11) * Math.PI * 2, r = LOOKOUT.apron + 1 + 10 * hash(i, 12) ** 1.5, p = centre.clone().addScaledVector(fwd, r * Math.cos(a) + 2).addScaledVector(right, r * Math.sin(a));
        if (Math.cos(a) > 0.25) continue; // (none ahead, past the wall: there it stood across the view)
        if (Math.abs(p.clone().sub(park.pos).dot(right)) < ROAD_HALF + 2 && p.clone().sub(park.pos).dot(fwd) < 2) continue; // (not on the road in)
        const sz = 0.5 + 0.9 * hash(i, 13);
        scrubM.push(new THREE.Matrix4().compose(p.setY(y0 - 0.1 - 0.4 * hash(i, 14)), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), hash(i, 15) * 6), new THREE.Vector3(sz * 1.3, sz * 0.7, sz)));
      }
      for (let i = 0; i < 160; i++) { // down the slope, thinning
        const u = 0.2 + 0.78 * hash(i, 21) ** 0.7, x = (hash(i, 22) - 0.5) * (2 * SHOULDER + 60), sz = 0.6 + 1.2 * hash(i, 23);
        const drop = y0 - (-0.4), ease = u * u * (3 - 2 * u), p = lipF.pos.clone().addScaledVector(fwd, 1 + u * LOOKOUT.fall).addScaledVector(right, x).setY(-0.4 + drop * (1 - ease) + 0.1);
        scrubM.push(new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), hash(i, 24) * 6), new THREE.Vector3(sz * 1.3, sz * 0.8, sz)));
      }
      const scrub = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), toon({ color: '#1e2a24' }), scrubM.length);
      scrubM.forEach((m, i) => scrub.setMatrixAt(i, m));
      look.add(scrub);
      const sp = park.pos.clone().addScaledVector(fwd, -8).addScaledVector(right, ROAD_HALF + 1.6);
      put(new THREE.BoxGeometry(0.12, 2.4, 0.12), steel, sp.clone().setY(y0 + 1.2));
      const face = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.6), new THREE.MeshBasicMaterial({ map: (() => { const cv = document.createElement('canvas'); cv.width = 512; cv.height = 192; const c = cv.getContext('2d')!; c.fillStyle = '#6b4a2a'; c.fillRect(0, 0, 512, 192); c.strokeStyle = '#f4f0e6'; c.lineWidth = 8; c.strokeRect(10, 10, 492, 172); c.fillStyle = '#f4f0e6'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `700 70px "${F.sign(700)}"`; c.fillText('VISTA POINT', 256, 96); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; })() }));
      face.position.copy(sp).setY(y0 + 2.2); face.lookAt(face.position.clone().addScaledVector(fwd, -1)); look.add(face);
    }
    // the hillside: from the lip down to the plain, rolling
    const across = 2 * SHOULDER + 70, along = LOOKOUT.fall, geo = new THREE.PlaneGeometry(across, along, 28, 40).rotateX(-Math.PI / 2), P = geo.attributes.position!;
    const drop = y0 - (-0.4);
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), u = (P.getZ(i) + along / 2) / along; // (u: 0 at the lip, 1 at the plain)
      const ease = u * u * (3 - 2 * u), roll = (1.6 * Math.sin(x * 0.07 + u * 9) + 1.1 * Math.sin(x * 0.19 - u * 5)) * Math.sin(Math.PI * u);
      P.setY(i, -0.4 + drop * (1 - ease) + roll - 0.1);
    }
    geo.computeVertexNormals();
    const hill = new THREE.Mesh(geo, printedGround(toon({ color: '#5e5048' })));
    hill.matrixAutoUpdate = false;
    hill.matrix.makeBasis(right, new THREE.Vector3(0, 1, 0), fwd).setPosition(lipF.pos.clone().addScaledVector(fwd, along / 2 + 1).setY(0));
    look.add(hill);
  }
  // embankments where the road has climbed: from each verge's edge down to the plain
  for (const side of [-1, 1]) g.add(named(new THREE.Mesh(skirt(route, side, (s) => (side < 0 && seaLeft(s) ? BEACH : SHOULDER), end), lambert()), 'skirts'));
  const box3 = new THREE.Box3();
  for (let s = 0; s < route.length; s += 50) box3.expandByPoint(route.frameAt(s).pos);
  const base = new THREE.Mesh(new THREE.PlaneGeometry(BASE, BASE), printedGround(toon({ color: grass.clone().multiplyScalar(0.85) })));
  base.rotation.x = -Math.PI / 2;
  base.position.set((box3.min.x + box3.max.x) / 2, -0.4, (box3.min.z + box3.max.z) / 2);
  g.add(named(base, 'base'));
  // (the freeway's extra lanes: the road's own ribbon widened to the right over chorus 2's stretch, merging in and
  // out — a strip laid beside it was shaded apart from it, the user, 2026-10-14)
  const lanes = (drive.plans.chorus2 as { lanes?: { a: number; b: number; edge: number; merge: number } } | undefined)?.lanes;
  const ease = (u: number) => { const v = Math.min(1, Math.max(0, u)); return v * v * (3 - 2 * v); };
  const rightEdge = (s: number) => (lanes ? ROAD_HALF + (lanes.edge - ROAD_HALF) * ease((s - lanes.a) / lanes.merge) * ease((lanes.b - s) / lanes.merge) : ROAD_HALF);
  g.add(named(new THREE.Mesh(strip(route, -ROAD_HALF, rightEdge, 0, () => asphalt, end), lambert()), 'road'));
  // the centre line's dashes, but none under road paint (they'd cut through its letters; left out, not squashed
  // flat: a flat box's normals are NaN, and the bloom spreads a NaN into a white dot)
  const paint = drive.carriers.filter((c) => c.kind === 'road');
  const dashAt: number[] = [];
  // (nor across a cross street's mouth: its crosswalks)
  for (let s = ROAD_START; s < end; s += 8) if (!paint.some((c) => Math.abs(c.s - s) < c.h / 2 + 2) && !drive.openings.some((o) => s > o.a - 4 && s < o.b + 4)) dashAt.push(s);
  const dashes = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), toon({ color: WORLD.dash }), dashAt.length);
  dashAt.forEach((s, i) => dashes.setMatrixAt(i, boxAt(route, s, 0, 0.15, 0.02, 3, 0.01)));
  g.add(named(dashes, 'dashes'));
  // the edge lines, along every road the town's kerbs don't line (the freeway, the coast, the hills); not in a tunnel
  {
    const line = toon({ color: WORLD.dash, side: THREE.DoubleSide }), spans: [number, number][] = [];
    for (const st of drive.stretches) if (!SIDEWALKS.stretches.has(st.id) && !st.tunnel) spans.push([motion.distanceAt(st.start), Math.min(end, motion.distanceAt(st.end))]);
    for (const [a, b] of spans) for (const side of [-1, 1]) {
      if (b - a < 2) continue;
      const edge = (inset: number) => (side > 0 ? (s: number) => rightEdge(s) - inset : -(ROAD_HALF - inset));
      g.add(named(new THREE.Mesh(ribbon(route, a, b, edge(0.38), 0.015, edge(0.22), 0.015), line), 'dashes'));
    }
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
      if (!b.car) continue;
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
    const spans: [number, number][] = [];
    for (const st of drive.stretches) if (K.stretches.has(st.id)) spans.push([st.k === 0 ? ROAD_START : motion.distanceAt(st.start), motion.distanceAt(st.end)]);
    for (const side of [-1, 1]) {
      const cuts = drive.openings.filter((o) => o.side === side).sort((x, y) => x.a - y.a);
      for (const [a0, b0] of spans) {
        let a = a0;
        for (const o of [...cuts.filter((o) => o.b > a0 && o.a < b0), { a: b0, b: b0 }]) {
          if (o.a - a > 1) {
            const r0 = side * ROAD_HALF, r1 = side * (ROAD_HALF + K.width);
            g.add(named(new THREE.Mesh(ribbon(route, a, o.a, r0, K.kerb, r1, K.kerb), walk), 'sidewalks'));
            g.add(named(new THREE.Mesh(ribbon(route, a, o.a, r0, 0, r0, K.kerb), kerb), 'sidewalks'));
          }
          a = Math.max(a, o.b);
        }
      }
    }
  }

  // the town's buildings (blocks.ts: the guard checks them too)
  const towns = drive.blocks.filter((b) => !b.concrete && !b.prop), concrete = drive.blocks.filter((b) => b.concrete && !b.prop);
  // (each a street front: look/facades.ts — its body, storefront, windows, sign and cornice, inside its box)
  const town = facades(towns), fronts = new THREE.Group();
  fronts.add(new THREE.Mesh(town.walls, toon({ vertexColors: true })), new THREE.Mesh(town.trim, toon({ vertexColors: true })));
  fronts.add(new THREE.Mesh(town.glass, nightGlass()), new THREE.Mesh(town.signs, new THREE.MeshBasicMaterial({ map: signAtlas() })));
  g.add(named(fronts, 'blocks'));
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
  const g = new THREE.Group(), { halfW: W, h: H, hill, hillHalfW } = TUNNEL;
  const bore: [number, number][] = [[-W, 0], [-W, H], [W, H], [W, 0]];
  g.add(new THREE.Mesh(sweep(route, tn.s0, tn.s1, bore, TILE_REPEAT), toon({ map: tiles(), side: THREE.DoubleSide })));
  const rock = toon({ color: WORLD.rock, side: THREE.DoubleSide });
  const outside: [number, number][] = [[-hillHalfW, -0.3], [-W - 1, H + hill], [W + 1, H + hill], [hillHalfW, -0.3]];
  g.add(new THREE.Mesh(sweep(route, tn.s0, tn.s1, outside, 4), rock));
  // the mouths: the headland's face with the bore cut out
  const face = new THREE.Shape(outside.map(([x, y]) => new THREE.Vector2(x, y)));
  face.holes.push(new THREE.Path(bore.map(([x, y]) => new THREE.Vector2(x, y))));
  for (const s of [tn.s0, tn.s1]) {
    const f = route.frameAt(s), mouth = new THREE.Mesh(new THREE.ShapeGeometry(face), rock);
    mouth.matrixAutoUpdate = false;
    mouth.matrix.makeBasis(f.right, f.up, f.fwd).setPosition(f.pos);
    g.add(mouth);
  }
  // a raised walkway along each wall (a kerb's step: the bore read as a box with a floor)
  const crete = toon({ color: '#a39a8c' });
  for (const side of [-1, 1]) g.add(new THREE.Mesh(sweep(route, tn.s0, tn.s1, [[side * W, PORTAL.walk.h], [side * (W - PORTAL.walk.w), PORTAL.walk.h], [side * (W - PORTAL.walk.w), 0]], 2), toon({ color: '#a39a8c', side: THREE.DoubleSide })));
  // a sodium lamp over the car on every beat, in its housing
  const lamps = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: '#ffb347' }), tn.lamps.length);
  tn.lamps.forEach((s, i) => lamps.setMatrixAt(i, boxAt(route, s, 0, 1.6, 0.15, 0.6, H - 0.15)));
  const housings = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), toon({ color: '#2a2430' }), tn.lamps.length);
  tn.lamps.forEach((s, i) => housings.setMatrixAt(i, boxAt(route, s, 0, 1.9, 0.22, 0.9, H - 0.17)));
  g.add(lamps, housings);
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
const FURNITURE = { every: 9, keep: 0.6, clear: 5 };
function furniture(drive: Drive): THREE.InstancedMesh {
  const { route, motion } = drive, K = SIDEWALKS, at: THREE.Matrix4[] = [], col: THREE.Color[] = [];
  const put = (s: number, lateral: number, across: number, h: number, along: number, y0: number, c: string) => { at.push(boxAt(route, s, lateral, across, h, along, K.kerb + y0)); col.push(new THREE.Color(c)); };
  const spans: [number, number][] = [];
  for (const st of drive.stretches) if (K.stretches.has(st.id)) spans.push([st.k === 0 ? ROAD_START : motion.distanceAt(st.start), motion.distanceAt(st.end)]);
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
  const palette = ['#ff5a36', '#2b78a6', '#1f6b44', '#f6dd8f', '#c8102e', '#ffffff'];
  drive.blocks.forEach((b, i) => {
    if (b.concrete || b.prop) return;
    const side = Math.sign(b.lateral), front = Math.abs(b.lateral) - b.d / 2;
    if (b.h > 4 && !b.bare && hash(i, 41) < 0.6) {
      // an awning, 1.6 m out from the face toward the road, over the shop's glass and under its sign (look/facades.ts)
      awn.push(boxAt(route, b.s, side * (front - 0.8), 1.6, 0.15, b.w * 0.7, 3.0));
      awnCol.push(new THREE.Color(palette[Math.floor(hash(i, 42) * palette.length)]!));
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
    const rows = Math.ceil(SHOPS.length / 4);
    drive.blocks.forEach((b, i) => {
      if (b.concrete || b.prop) return;
      const side = Math.sign(b.lateral), back = Math.abs(b.lateral) > 30;
      if (b.h >= 12 && hash(i, 70) < 0.24) {
        const s = b.s + (hash(i, 71) - 0.5) * b.w * 0.5, lat = b.lateral + (hash(i, 72) - 0.5) * b.d * 0.5;
        tank.push(boxAt(route, s, lat, 2.6, 2.8, 2.6, b.h + 2.2));
        cap.push(boxAt(route, s, lat, 3, 0.9, 3, b.h + 5));
        for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) leg.push(boxAt(route, s + dz * 0.9, lat + dx * 0.9, 0.16, 2.3, 0.16, b.h));
      } else if (b.h >= 7 && hash(i, 73) < 0.14) {
        mast.push(boxAt(route, b.s + (hash(i, 74) - 0.5) * b.w * 0.5, b.lateral + (hash(i, 75) - 0.5) * b.d * 0.5, 0.12, 5 + 3 * hash(i, 76), 0.12, b.h));
      }
      if (back && b.h >= 8 && b.w >= 8 && hash(i, 77) < 0.2) {
        const front = Math.abs(b.lateral) - b.d / 2, lat = side * (front + 0.4), w = Math.min(7, b.w - 1), h = 2.6, y = b.h + 2.4;
        leg.push(boxAt(route, b.s - w / 2 + 0.5, lat, 0.15, 2.4, 0.15, b.h), boxAt(route, b.s + w / 2 - 0.5, lat, 0.15, 2.4, 0.15, b.h));
        // (its face toward the road: on the right, facing −x in the road's frame, boxAt's x being −right)
        const geo = new THREE.PlaneGeometry(w, h).rotateY(side > 0 ? Math.PI / 2 : -Math.PI / 2), uv = geo.getAttribute('uv'), k = Math.floor(hash(i, 78) * SHOPS.length), cx = k % 4, cy = Math.floor(k / 4);
        for (let j = 0; j < uv.count; j++) uv.setXY(j, (cx + uv.getX(j)) / 4, 1 - (cy + 1 - uv.getY(j)) / rows);
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
    if (signs.length) g.add(new THREE.Mesh(mergeGeometries(signs), new THREE.MeshBasicMaterial({ map: signAtlas(), side: THREE.DoubleSide })));
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
const PLACE_SIGN = { after: 45, coastAfter: 24, lateral: 12, w: 11, h: 5.2, y: 5 };
function placeSigns(drive: Drive): THREE.Group {
  const g = new THREE.Group(), { route, motion } = drive;
  const lines = new Map<number, { text: string; end: number }>();
  for (const c of drive.carriers) { const l = lines.get(c.phrase.line); lines.set(c.phrase.line, { text: (l ? l.text + ' ' : '') + c.phrase.text, end: Math.max(l?.end ?? 0, c.phrase.end) }); }
  for (const [, l] of lines) {
    const place = PLACES.find(([re]) => re.test(l.text));
    if (!place) continue;
    const [, name, sub, sprayed] = place, P = PLACE_SIGN;
    // (on the coast, soon after the arch and on the beach side: the arch wide sees it whole)
    const onCoast = !!BLOCKS[drive.stretchAt(l.end).id]!.seaLeft;
    let s = motion.distanceAt(l.end) + (onCoast ? P.coastAfter : P.after);
    while (drive.carriers.some((c) => Math.abs(c.s - s) < (onCoast ? 10 : 16))) s += 6; // clear of the words' own faces
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
    // (on the coast the sign stands on the beach side, where the towers' take looks: on the right it never came fully
    // into a frame)
    const coast = !!BLOCKS[drive.stretchAt(drive.stretches.find((x) => s < motion.distanceAt(x.end))?.start ?? 0).id]!.seaLeft, side = coast ? -1 : 1;
    const f = route.frameAt(s), face = f.fwd.clone().negate().addScaledVector(f.right, -0.5 * side).setY(0).normalize(); // toward the oncoming car and the road
    const sign = new THREE.Group();
    sign.add(new THREE.Mesh(new THREE.PlaneGeometry(P.w, P.h), new THREE.MeshBasicMaterial({ map: tex })));
    for (const px of [-P.w / 2 + 0.6, P.w / 2 - 0.6]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, P.y + P.h / 2, 0.2), toon({ color: WORLD.post })); leg.position.set(px, (P.h / 2 - P.y) / 2, -0.12); sign.add(leg); } // (legs: the ground to the board's top)
    sign.matrixAutoUpdate = false;
    sign.matrix.makeBasis(new THREE.Vector3(0, 1, 0).cross(face).normalize(), new THREE.Vector3(0, 1, 0), face).setPosition(f.pos.clone().addScaledVector(f.right, side * (coast ? P.lateral - 3 : P.lateral)).add(new THREE.Vector3(0, P.y, 0)));
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
    at.push(s);
  }
  const L = STREETLIGHTS, n = at.length;
  const poles = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), toon({ color: WORLD.post }), n * 2);
  const bulbs = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), lampMaterial('#ffcf8a'), n);
  const pools = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 24), glowMaterial('#ffb560', GLOW.pool, true), n);
  at.forEach((s, i) => {
    poles.setMatrixAt(2 * i, boxAt(route, s, L.lateral, 0.22, L.h, 0.22));
    poles.setMatrixAt(2 * i + 1, boxAt(route, s, (L.lateral + L.reach) / 2, L.lateral - L.reach, 0.16, 0.16, L.h - 0.1));
    bulbs.setMatrixAt(i, boxAt(route, s, L.reach + 0.3, 0.9, 0.18, 0.45, L.h - 0.3));
    const f = route.frameAt(s), m = new THREE.Matrix4().makeBasis(f.right, f.fwd, f.up).scale(new THREE.Vector3(6.5, 6.5, 1));
    pools.setMatrixAt(i, m.setPosition(f.pos.clone().addScaledVector(f.right, L.reach - 0.5).addScaledVector(f.up, 0.04)));
  });
  pools.frustumCulled = false;
  g.add(poles, bulbs, pools);
  return g;
}

/** The motel on the corner (the intro's, the end's): a two-storey pink wing running back from the road, its rooms'
 *  doors and windows facing its lot (toward the corner), the upper walkway with its railing and posts, the stair at its
 *  far end, a white parapet. Its box: s −17, 20 m right of the road, 30 m deep from the road, 14 m along it, 9 m high. */
function buildMotel(route: Route): THREE.Group {
  const M = { s: -17, lateral: 20, w: 30, h: 9, d: 14 }, f = route.frameAt(M.s), g = new THREE.Group();
  g.matrixAutoUpdate = false;
  g.matrix.makeBasis(f.right.clone().negate(), new THREE.Vector3(0, 1, 0), new THREE.Vector3(f.fwd.x, 0, f.fwd.z).normalize()).setPosition(f.pos.clone().addScaledVector(f.right, M.lateral));
  const pink = withWindows(toon({ color: WORLD.motel })), white = toon({ color: '#f8f4ea' }), teal = toon({ color: '#1f6f78' }), glass = toon({ color: '#28323c' });
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); };
  const H = 6.6, front = M.d / 2 - 1.8; // (its rooms' face, the walkway in front of it to the box's edge)
  box(M.w, H, M.d - 1.8, 0, H / 2, -0.9, pink);
  box(M.w + 0.3, 0.5, M.d - 1.5, 0, H + 0.25, -0.9, white); // the parapet
  for (const [y0, fl] of [[0, 0], [3.3, 1]] as const) {
    for (let k = 0; k < 9; k++) {
      const x = -M.w / 2 + 2 + k * 3.2;
      box(1.0, 2.1, 0.06, x, y0 + 1.05, front + 0.03, teal); // its door
      box(1.3, 1.0, 0.04, x + 1.35, y0 + 1.5, front + 0.02, glass); // its window
      box(1.5, 0.1, 0.16, x + 1.35, y0 + 0.95, front + 0.08, white); // its sill
    }
    if (fl) { // the upper walkway: its slab, its railing, the posts holding it
      box(M.w, 0.22, 1.8, 0, y0 - 0.11, front + 0.9, white);
      box(M.w, 0.08, 0.08, 0, y0 + 1.0, M.d / 2 - 0.05, white);
      for (let x = -M.w / 2; x <= M.w / 2; x += 1.5) box(0.05, 1.0, 0.05, x, y0 + 0.5, M.d / 2 - 0.05, white);
      for (let x = -M.w / 2 + 0.2; x <= M.w / 2; x += 6) box(0.2, y0, 0.2, x, y0 / 2, M.d / 2 - 0.15, white);
    }
  }
  const stair = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.2, 4.6), white); // the stair up to the walkway, at its far end
  stair.position.set(M.w / 2 - 1, 1.65, front + 0.5 - 2.2); stair.rotation.x = Math.atan2(3.3, 4.2); g.add(stair);
  return g;
}

/** The motel's roadside sign (landmarks.ts), the video's title in the world: SZA over BMF in pink neon, NO VACANCY
 *  lit below. Two faces — with the NO, and without (VACANCY, the end) — the scene picks one and lights it (userData). */
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
function buildMotelSign(route: Route): THREE.Group {
  const M = MOTEL_SIGN, at = motelSign(route), faces = { no: signFace(true), vacancy: signFace(false) };
  const mat = new THREE.MeshBasicMaterial({ map: faces.no, side: THREE.DoubleSide });
  const g = new THREE.Group();
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(M.w, M.h), mat);
  panel.position.set(0, M.y, 0); g.add(panel);
  const pole = new THREE.Mesh(new THREE.BoxGeometry(0.35, M.y - M.h / 2, 0.35), toon({ color: WORLD.post }));
  pole.position.set(0, (M.y - M.h / 2) / 2, -0.1); g.add(pole);
  g.matrixAutoUpdate = false;
  g.matrix.makeBasis(new THREE.Vector3(0, 1, 0).cross(at.normal).normalize(), new THREE.Vector3(0, 1, 0), at.normal).setPosition(at.foot);
  g.userData = { neon: mat, faces };
  return g;
}

/** A small high-wing plane, nose along +x from its tail at 0, `k` times life size (banners' tugs, the skywriter). */
export function buildPlane(k = 1): THREE.Group {
  const g = new THREE.Group(), body = toon({ color: '#e9e4da' }), trim = toon({ color: '#b3122e' });
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); };
  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.55 * k, 0.22 * k, 6 * k, 10), body);
  fuselage.rotation.z = -Math.PI / 2; fuselage.position.set(3 * k, 0, 0); g.add(fuselage);
  box(1.5 * k, 0.12 * k, 10 * k, 3.9 * k, 0.6 * k, 0, body); // the wing, over the cabin
  box(0.8 * k, 0.08 * k, 3.4 * k, 0.35 * k, 0.1 * k, 0, body); // tailplane
  box(1 * k, 1.5 * k, 0.08 * k, 0.4 * k, 0.75 * k, 0, trim); // fin
  // a red band round its nose, its canopy, its wheels
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.5 * k, 0.5 * k, 0.6 * k, 10), trim); band.rotation.z = -Math.PI / 2; band.position.set(5.4 * k, 0, 0); g.add(band);
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.42 * k, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), toon({ color: '#28323c' })); canopy.position.set(4.2 * k, 0.35 * k, 0); canopy.scale.set(1.6, 1, 1); g.add(canopy);
  for (const z of [-0.8, 0.8]) { const wh = new THREE.Mesh(new THREE.SphereGeometry(0.2 * k, 8, 6), toon({ color: '#1b1820' })); wh.position.set(4.3 * k, -0.85 * k, z * k); g.add(wh); }
  const prop = new THREE.Mesh(new THREE.CircleGeometry(1.1 * k, 16), new THREE.MeshBasicMaterial({ color: '#2a2a30', transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
  prop.rotation.y = Math.PI / 2; prop.position.set(6.05 * k, 0, 0); g.add(prop); // spinning, a blur
  return g;
}

/** A towed banner ripples: a wave running back from its leading (right) edge, growing toward its trailing edge. Small
 *  enough to leave the words readable. */
export const FLUTTER = { segments: 40, amp: 0.025, waves: 2.5, hz: 1.3 };
/** Ripple a banner carrier's face (its object from buildCarrier) at t. */
export function flutter(o: THREE.Object3D, c: Carrier, t: number) {
  const face = o.getObjectByName('face') as THREE.Mesh, p = face.geometry.attributes.position!;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), back = (c.w / 2 - x) / c.w; // 0 at the leading edge, 1 at the trailing
    p.setZ(i, FLUTTER.amp * c.w * back * Math.sin(2 * Math.PI * (FLUTTER.waves * back - FLUTTER.hz * t)));
  }
  p.needsUpdate = true;
}

/** A carrier with its face's texture: a board on posts (a sign, a billboard), a street blade on its pole, a gantry over
 *  the road, a building with the face on its front (a wall, a shop's fascia, neon), paint on the road, or writing in the
 *  sky. */
export function buildCarrier(c: Carrier, face: THREE.Texture, wall: THREE.Color, route: Route): THREE.Object3D {
  const clear = c.kind === 'road' || c.kind === 'sky' || c.kind === 'neon' || c.kind === 'tunnel' || c.kind === 'hill' || c.kind === 'bus' || c.kind === 'hood' || c.kind === 'giant' || c.kind === 'barber' || c.kind === 'mirror' || c.kind === 'window' || c.kind === 'carwash'; // the face is only its letters
  const mat = new THREE.MeshBasicMaterial({ map: face, transparent: clear, depthWrite: !clear, fog: c.kind !== 'sky', polygonOffset: c.kind === 'road', polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  if (c.kind === 'neon') mat.color.setScalar(GLOW.neon); // lit lettering: HDR, it blooms
  if (c.kind === 'tunnel') { // graffiti: paint on the tiles, lit by the bore's lamps like the tiles round it (the user, 2026-10-14: it glowed — its lighting "doesn't match the environment at all")
    const m = new THREE.Mesh(new THREE.PlaneGeometry(c.w, c.h), toon({ map: face, transparent: true, depthWrite: false }));
    m.name = 'face'; m.matrixAutoUpdate = false; m.matrix.copy(basisOf(c));
    return m;
  }
  if (c.kind === 'hill') mat.color.setScalar(1.5); // floodlit at night
  if (c.kind === 'road') return drapedOnRoad(c, mat, route);
  if (c.kind === 'speed' || c.kind === 'radio' || c.kind === 'phone') mat.color.setScalar(1.6); // (lit displays: they bloom a little)
  if (c.kind === 'polesign' || c.kind === 'roofsign') mat.color.setScalar(1.25); // (lightboxes)
/** How bright a neon sign's wash on its wall is (HDR; by night). */
const NEON_WASH = 0.45;
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
  if (building && c.kind === 'neon') {
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
      const plane = buildPlane(k); plane.position.x = x0; g.add(plane);
      break;
    }
    case 'hill': {
      // the mound it stands on (from the plain up to the letters' feet), and the scaffold behind each letter
      // (a low shoulder, not a mountain: the outro's crane looks past it at the city)
      const mh = c.foot - c.h / 2 + 2, mound = new THREE.Mesh(new THREE.ConeGeometry(c.w * 0.48, mh, 24, 1), toon({ color: '#5a4a52' }));
      mound.position.set(0, -c.h / 2 + 2 - mh / 2, -6); mound.scale.z = 0.5; g.add(mound);
      for (let i = 0; i < 16; i++) box(0.4, c.h * 0.9, 0.4, -c.w * 0.45 + (i * c.w * 0.9) / 15, -c.h * 0.05, -1.2, grey(WORLD.post));
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

/** The car: a '64 Impala convertible, the LA lowrider (nose +z): a long low body (its side profile extruded across its
 *  width, wheel arches cut), a chrome spear down the side, chrome bumpers, whitewalls with chrome caps, quad headlights
 *  and the triple round tail lights (they glow at night, the headlights throw beams); the two of them as flat
 *  silhouettes: him at the wheel (on its left) in a cap, her riding, her hair down her back. */
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
  box(Wd - 0.3, 0.5, 0.18, 0, belt + 0.15, -0.55, seat); // the bench's back
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
    const plate = add(new THREE.PlaneGeometry(0.46, 0.23), new THREE.MeshBasicMaterial({ map: tex }), 0, 0.7, -hl - 0.075); plate.rotation.y = Math.PI; plate.name = 'plate';
    box(0.5, 0.27, 0.03, 0, 0.7, -hl - 0.06, dark);
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
  // the two of them: him at the wheel (+x: the car's left) in a cap, a hand on it; her, her hair down her back, an arm
  // that goes up (cast.ts); their heads on pivots at the neck (hers turns to him, his nods): named for the scene
  // his wheel: the rim, two spokes to a chrome hub inside a horn ring, on its column down into the dash
  // (its face toward him: tipped back at the top like a car's, the hub side (local -z) up and back at him, the column
  // (local +z) down and forward into the dash — at -0.9 the hub faced his lap and its back the windshield (the user,
  // 2026-10-13 and 14: "facing towards the window"))
  const wheel = new THREE.Group(); wheel.position.set(0.44, belt + 0.38, 0.42); wheel.rotation.x = 0.6; body.add(wheel);
  add(new THREE.TorusGeometry(0.19, 0.022, 8, 28), dark, 0, 0, 0, wheel);
  add(new THREE.TorusGeometry(0.1, 0.007, 6, 24), trim, 0, 0, -0.012, wheel);
  for (const a of [0.35, -0.35, Math.PI / 2 + 0.0]) { const spoke = add(new THREE.BoxGeometry(0.36, 0.02, 0.014), dark, 0, 0, 0, wheel); spoke.rotation.z = a; if (a > 1) spoke.scale.x = 0.5, spoke.position.y = -0.09; }
  { const hub = add(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 14), trim, 0, 0, -0.01, wheel); hub.rotation.x = Math.PI / 2; }
  { const column = add(new THREE.CylinderGeometry(0.022, 0.022, 0.3, 10), cabin, 0, 0, 0.16, wheel); column.rotation.x = Math.PI / 2; }
  for (const [x, him] of [[0.44, true], [-0.44, false]] as const) {
    // (a silhouette with a figure's shape, not a pill: shoulders, a tapered torso, a neck — the user, 2026-10-13)
    const torso = add(new THREE.CylinderGeometry(him ? 0.2 : 0.16, him ? 0.17 : 0.15, 0.5, 14), dark, x, belt + 0.22, -0.25);
    torso.scale.z = 0.55;
    const shoulders = add(new THREE.CapsuleGeometry(him ? 0.075 : 0.065, him ? 0.4 : 0.34, 4, 10), dark, x, belt + 0.47, -0.25); shoulders.rotation.z = Math.PI / 2;
    add(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 10), dark, x, belt + 0.56, -0.23);
    const head = new THREE.Group(); head.name = him ? 'hisHead' : 'herHead'; head.position.set(x, belt + 0.66, -0.22); body.add(head);
    const skull = add(new THREE.SphereGeometry(0.125, 14, 10), dark, 0, 0.1, 0, head); skull.scale.set(0.92, 1.1, 1);
    if (him) {
      add(new THREE.SphereGeometry(0.135, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), dark, 0, 0.17, 0, head); // the cap's crown
      add(new THREE.BoxGeometry(0.19, 0.022, 0.15), dark, 0, 0.17, 0.15, head); // its brim, forward
      add(new THREE.CylinderGeometry(0.03, 0.03, 0.04, 8), dark, 0, 0.31, 0, head); // its button
      const reach = add(new THREE.CapsuleGeometry(0.05, 0.5, 4, 8), dark, x - 0.02, belt + 0.45, 0.1); reach.rotation.x = 1.1; // his arm, to the wheel
    } else {
      // her hair: a crown over the head, a fall down her back to the shoulders, a flick at its end
      const crown = add(new THREE.SphereGeometry(0.15, 14, 10), dark, 0, 0.14, -0.03, head); crown.scale.set(1.05, 0.95, 1.05);
      const hair = add(new THREE.CapsuleGeometry(0.12, 0.32, 4, 10), dark, 0, -0.1, -0.12, head); hair.scale.set(1.15, 1, 0.55);
      add(new THREE.SphereGeometry(0.09, 10, 8), dark, 0.06, -0.3, -0.14, head).scale.set(1.4, 0.7, 0.7); // the flick
      add(new THREE.SphereGeometry(0.05, 10, 8), dark, 0, 0.26, -0.02, head); // a bun on top
      const arm = new THREE.Group(); arm.name = 'herArm'; arm.position.set(x - 0.2, belt + 0.55, -0.2); body.add(arm);
      add(new THREE.CapsuleGeometry(0.055, 0.55, 4, 8), dark, 0, -0.3, 0, arm);
      add(new THREE.SphereGeometry(0.075, 10, 8), dark, 0, -0.62, 0, arm); // her hand
    }
  }
  return g;
}
