// The set-pieces' props' building blocks: canvas textures, boxes, cylinders, balls and planes in a group, and groups in
// the road's frame or a panel's. Browser only (canvas).
import * as THREE from 'three';
import type { Route } from '../../drive/route';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { WORLD, toon } from '../../look/toon';

export const UP = new THREE.Vector3(0, 1, 0);

/** A canvas texture `w` x `h` px drawn by `draw`. */
export function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d')!);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16;
  return t;
}
export const box = (g: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material) => {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); return b;
};
export const cyl = (g: THREE.Object3D, r: number, h: number, x: number, y: number, z: number, m: THREE.Material, seg = 12) => {
  const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), m); c.position.set(x, y, z); g.add(c); return c;
};
export const ball = (g: THREE.Object3D, r: number, x: number, y: number, z: number, m: THREE.Material) => {
  const b = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), m); b.position.set(x, y, z); g.add(b); return b;
};
/** A plane facing +z (its group's forward), centred at (x, y, z). */
export const plane = (g: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, m: THREE.Material) => {
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.set(x, y, z); g.add(p); return p;
};
/** A flat picture (unlit), its texture's colours as drawn. */
export const pic = (map: THREE.Texture, opts: THREE.MeshBasicMaterialParameters = {}) => new THREE.MeshBasicMaterial({ map, ...opts });
/** A painted picture (a shop's sign, a tower's number): lit and shaded like the wall it's on (toon), so it takes the
 *  low sun's warmth and the shade as its neighbours do — a pic() keeps its colours as drawn whatever the light, and at
 *  dusk its whites and reds glowed off the dimming beach (the user, 2026-10-16). */
export const paint = (map: THREE.Texture, opts: THREE.MeshToonMaterialParameters = {}) => toon({ map, ...opts });

/** A group in the road's frame at s, like the car's (x to the road's left, y up, z forward), `lateral` right of its
 *  centre, on its surface; added to `root`. */
export function roadFrame(route: Route, root: THREE.Object3D) {
  return (s: number, lateral: number) => {
    const f = route.frameAt(s), g = new THREE.Group(), fwd = new THREE.Vector3(f.fwd.x, 0, f.fwd.z).normalize(), right = new THREE.Vector3(f.right.x, 0, f.right.z).normalize();
    g.matrixAutoUpdate = false;
    g.matrix.makeBasis(right.negate(), UP, fwd).setPosition(f.pos.clone().addScaledVector(f.right, lateral));
    root.add(g);
    return g;
  };
}
/** A group facing the road from its left side at s (x along the road, y up, z out toward the road), its front
 *  `lateral` off the road's centre, on its surface: a shop front's own frame. */
export function leftFront(route: Route, root: THREE.Object3D) {
  return (s: number, lateral: number) => {
    const f = route.frameAt(s), g = new THREE.Group(), fwd = new THREE.Vector3(f.fwd.x, 0, f.fwd.z).normalize(), right = new THREE.Vector3(f.right.x, 0, f.right.z).normalize();
    g.matrixAutoUpdate = false;
    g.matrix.makeBasis(fwd, UP, right).setPosition(f.pos.clone().addScaledVector(f.right, lateral));
    root.add(g);
    return g;
  };
}
/** The same from the road's right side (x along the road, backwards: it reads left to right from the road). */
export function rightFront(route: Route, root: THREE.Object3D) {
  return (s: number, lateral: number) => {
    const f = route.frameAt(s), g = new THREE.Group(), fwd = new THREE.Vector3(f.fwd.x, 0, f.fwd.z).normalize(), right = new THREE.Vector3(f.right.x, 0, f.right.z).normalize();
    g.matrixAutoUpdate = false;
    g.matrix.makeBasis(fwd.clone().negate(), UP, right.clone().negate()).setPosition(f.pos.clone().addScaledVector(f.right, lateral));
    root.add(g);
    return g;
  };
}
/** A group in a panel's own frame (x along its text, y its up, z out of its face), origin at its centre. */
export function onPanel(p: { center: THREE.Vector3; normal: THREE.Vector3; up: THREE.Vector3 }): THREE.Group {
  const g = new THREE.Group(), along = p.up.clone().cross(p.normal).normalize();
  g.matrixAutoUpdate = false;
  g.matrix.makeBasis(along, p.up, p.normal).setPosition(p.center);
  return g;
}
/** The cars' and the passers-by's one material: each part's colour in its vertices, so a car or a person is a few
 *  meshes (fuse), and a parked one, batched, a single draw whatever its paint (scenes/batch.ts). Made on first use. */
let TINTED: THREE.Material | null = null;
const tintedMat = () => (TINTED ??= toon({ vertexColors: true }));
/** A part's geometry coloured `color` (sRGB) in its vertices; unindexed, no uvs (every part alike, so they merge). */
export function tinted(geo: THREE.BufferGeometry, color: string): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo;
  g.deleteAttribute('uv');
  const c = new THREE.Color(color), n = g.attributes.position!.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}
/** A tinted part in `to` at (x, y, z). */
export function part(to: THREE.Object3D, geo: THREE.BufferGeometry, color: string, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(tinted(geo, color), tintedMat()); m.position.set(x, y, z); to.add(m); return m;
}
export const tbox = (to: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number, color: string) => part(to, new THREE.BoxGeometry(w, h, d), color, x, y, z);
export const tcyl = (to: THREE.Object3D, r: number, h: number, x: number, y: number, z: number, color: string, seg = 12) => part(to, new THREE.CylinderGeometry(r, r, h, seg), color, x, y, z);
export const tball = (to: THREE.Object3D, r: number, x: number, y: number, z: number, color: string) => part(to, new THREE.SphereGeometry(r, 12, 9), color, x, y, z);
/** The tinted parts directly in `parent` fused into one mesh (in its frame; its groups, and theirs, left alone). */
export function fuse(parent: THREE.Object3D) {
  const parts = parent.children.filter((o): o is THREE.Mesh => (o as THREE.Mesh).isMesh && (o as THREE.Mesh).material === TINTED);
  if (parts.length < 2) return;
  const geos = parts.map((m) => { m.updateMatrix(); return m.geometry.clone().applyMatrix4(m.matrix); });
  const merged = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  if (!merged) return;
  for (const m of parts) { parent.remove(m); m.geometry.dispose(); }
  parent.add(new THREE.Mesh(merged, tintedMat()));
}

/** A body lofted along z (nose +z) from rounded sections (superellipses, drawing in a little toward the top): `half`
 *  its half-width, `top` and `bottom` its edges at z; capped at both ends. */
function loftBody(L: number, half: (z: number) => number, top: (z: number) => number, bottom: (z: number) => number): THREE.BufferGeometry {
  const hl = L / 2, n = Math.max(24, Math.round(L * 6.5)), R = 26, N = 5, pos: number[] = [], idx: number[] = [];
  for (let i = 0; i <= n; i++) {
    const z = -hl + (L * i) / n, t = top(z), b = bottom(z), yc = (t + b) / 2, hh = (t - b) / 2, w = half(z);
    for (let j = 0; j < R; j++) {
      const a = (j / R) * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a);
      const y = yc + hh * Math.sign(sn) * Math.pow(Math.abs(sn), 2 / N);
      pos.push(w * Math.sign(c) * Math.pow(Math.abs(c), 2 / N) * (1 - 0.08 * Math.max(0, (y - yc) / hh)), y, z);
    }
  }
  for (let i = 1; i <= n; i++) for (let j = 0; j < R; j++) {
    const a = (i - 1) * R + j, b = (i - 1) * R + ((j + 1) % R), c = i * R + j, d = i * R + ((j + 1) % R);
    idx.push(a, b, c, b, d, c);
  }
  for (const [i, flip] of [[0, true], [n, false]] as const) {
    const z = -hl + (L * i) / n, centre = pos.length / 3;
    pos.push(0, (top(z) + bottom(z)) / 2, z);
    for (let j = 0; j < R; j++) { const a = i * R + j, b = i * R + ((j + 1) % R); if (flip) idx.push(centre, b, a); else idx.push(centre, a, b); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/** A side profile (z, y points) extruded across x `w` wide, its edges rounded by `r`, centred on x = 0. */
function profileSlab(pts: [number, number][], w: number, r: number): THREE.BufferGeometry {
  const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(z, y))), { depth: w - 2 * r, bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: 2, curveSegments: 2 });
  return g.rotateY(-Math.PI / 2).translate((w - 2 * r) / 2, 0, 0);
}

/** A background car for the world's traffic and curbs: a '60s sedan, nose along +z, its base on the ground at y 0.
 *  `low` drops it on its suspension, lowrider-parked, nose down. Its body lofted (as the hero's is: look/impala.ts) —
 *  the hood falling to the grille, the deck to the tail, the sill rising into an arch over each wheel; the greenhouse
 *  dark glass under a roof in the body's colour on its pillars; quad headlamps in a chrome grille, chrome bumpers, a
 *  spear down each flank, the doors' seams and handles, whitewalls on chrome caps. (Built of boxes it read as a toy —
 *  the user, 2026-10-15: "improve the fidelity of the cars on the road".) It stays inside the box it was: 1.78 m wide,
 *  ~1.28 m tall, `length` long. Its parts tinted and fused: a body and four wheels. */
export function sedan(opts: { color: string; length?: number; low?: boolean }): THREE.Group {
  const g = new THREE.Group(), L = opts.length ?? 4.6, hl = L / 2, W = 1.78, hw = W / 2;
  const paint = opts.color, dark = '#1d2026', chrome: string = WORLD.chrome, glass = '#26303c', lamp = '#f4efd8', tail = '#b8161a', white = '#ece8dc';
  const box = tbox, cyl = tcyl; // (tinted parts: fused below)
  const drop = opts.low ? 0.12 : 0;
  const body = new THREE.Group(); body.position.y = -drop; if (opts.low) body.rotation.x = 0.02; // (parked low, nose down)
  g.add(body);
  const add = (geo: THREE.BufferGeometry, color: string) => part(body, geo, color);
  // the cabin's span: the windshield's foot, the roof's front and back, the rear window's foot (z); the belt and roof
  const zA = -0.2 + 0.22 * L + 0.12, zRf = zA - 0.55, zRr = -0.2 - 0.22 * L + 0.5, zC = zRr - 0.45, belt = 0.87, roof = 1.27;
  const wz = hl - 0.85, R = 0.3, arch = R + 0.08;
  // the body
  const clamp01 = (u: number) => Math.min(1, Math.max(0, u));
  const half = (z: number) => { const e = Math.max(0, Math.abs(z) - (hl - 0.4)) / 0.4; return hw * (1 - 0.12 * e * e); };
  const top = (z: number) => {
    if (z > zA) { const u = clamp01((z - zA) / (hl - zA)); return belt - 0.02 - 0.05 * u - 0.07 * u ** 4; }
    if (z < zC) { const u = clamp01((zC - z) / (zC + hl)); return belt + 0.02 - 0.02 * u - 0.08 * u ** 4; }
    return belt;
  };
  const bottom = (z: number) => { let y = 0.3; for (const zw of [wz, -wz]) { const dz = z - zw; if (Math.abs(dz) < arch) y = Math.max(y, 0.3 + Math.sqrt(arch * arch - dz * dz)); } return y; };
  add(loftBody(L, half, top, bottom), paint);
  // the greenhouse: dark glass on the belt, under the roof (in the body's colour, a touch proud) on its pillars
  const gw = W - 0.26, gr = 0.07, sideX = gw / 2;
  add(profileSlab([[zA, belt - 0.03], [zRf, roof - gr], [zRr, roof - gr], [zC, belt - 0.03]], gw, gr), glass);
  add(profileSlab([[zRf + 0.06, roof - 0.07], [zRr - 0.06, roof - 0.07], [zRr - 0.06, roof - 0.01], [zRf + 0.06, roof - 0.01]], gw - 0.1, 0.06), paint);
  // (a pillar: a strip from (z0, y0) to (z1, y1) on each side, its width along the glass)
  const pillar = (z0: number, y0: number, z1: number, y1: number, wide: number) => {
    const len = Math.hypot(z1 - z0, y1 - y0), a = Math.atan2(y1 - y0, z1 - z0);
    for (const s of [1, -1]) { const p = box(body, 0.03, wide, len + 0.04, s * (sideX + gr - 0.005), (y0 + y1) / 2, (z0 + z1) / 2, paint); p.rotation.x = -a; }
  };
  pillar(zA, belt, zRf, roof - 0.02, 0.07); // A
  pillar(zRr, roof - 0.02, zC, belt, 0.26); // C (wide: the sedan's sail)
  const zB = (zRf + zRr) / 2 + 0.05;
  for (const s of [1, -1]) box(body, 0.03, roof - belt, 0.08, s * (sideX + gr - 0.005), (roof + belt) / 2 - 0.01, zB, paint); // B
  // the doors' seams and handles, the chrome spear down each flank (where the side runs straight)
  for (const s of [1, -1]) {
    for (const z of [zA - 0.12, zB, zRr - 0.2]) box(body, 0.012, belt - 0.4, 0.014, s * (hw + 0.004), (belt + 0.4) / 2, z, dark);
    for (const z of [zB + 0.12, zRr - 0.08]) box(body, 0.02, 0.025, 0.12, s * (hw + 0.01), belt - 0.07, z, chrome);
    box(body, 0.015, 0.035, 2 * (hl - 0.45), s * (hw + 0.006), 0.64, 0, chrome);
  }
  // the nose: quad round lamps in chrome rings either side of a dark grille barred in chrome; the bumper below
  for (const x of [0.62, 0.4, -0.4, -0.62]) {
    const ring = cyl(body, 0.085, 0.03, x, 0.64, hl - 0.005, chrome, 10); ring.rotation.x = Math.PI / 2;
    const l = cyl(body, 0.065, 0.03, x, 0.64, hl + 0.006, lamp, 10); l.rotation.x = Math.PI / 2;
  }
  box(body, 0.6, 0.16, 0.03, 0, 0.62, hl - 0.002, dark);
  for (let k = 0; k < 3; k++) box(body, 0.6, 0.016, 0.035, 0, 0.565 + k * 0.055, hl + 0.004, chrome);
  for (const z of [hl + 0.03, -hl - 0.03]) part(body, new THREE.CapsuleGeometry(0.07, W - 0.16, 2, 8).rotateZ(Math.PI / 2), chrome, 0, 0.42, z);
  // the tail: lamps in long chrome bezels, the plate between them
  for (const x of [0.56, -0.56]) { box(body, 0.36, 0.13, 0.03, x, 0.7, -hl + 0.005, chrome); box(body, 0.32, 0.09, 0.03, x, 0.7, -hl - 0.006, tail); }
  box(body, 0.3, 0.15, 0.02, 0, 0.56, -hl - 0.004, white);
  // the mirrors on the doors' tops
  for (const s of [1, -1]) { box(body, 0.03, 0.03, 0.08, s * (hw + 0.03), belt + 0.03, zA - 0.2, chrome); box(body, 0.06, 0.08, 0.12, s * (hw + 0.07), belt + 0.08, zA - 0.2, chrome); }
  // the wheels in their arches, standing a little proud of the flanks; each on a pivot at its hub: a tyre, its
  // whitewall, a chrome cap with five dark spokes (a plain disc turning reads as standing still), rolled by how far the
  // car has moved (rollSedans)
  const wheels: THREE.Object3D[] = [];
  for (const z of [wz, -wz]) for (const s of [1, -1]) {
    const piv = new THREE.Group(); piv.position.set(s * (hw - 0.08), R, z); g.add(piv); wheels.push(piv);
    cyl(piv, R, 0.2, 0, 0, 0, dark, 14).rotation.z = Math.PI / 2;
    cyl(piv, 0.215, 0.205, 0, 0, 0, white, 14).rotation.z = Math.PI / 2;
    cyl(piv, 0.155, 0.21, 0, 0, 0, chrome, 10).rotation.z = Math.PI / 2;
    for (let k = 0; k < 5; k++) { const sp = box(piv, 0.02, 0.2, 0.035, s * 0.108, 0, 0, dark); sp.rotation.x = (k * 2 * Math.PI) / 5; }
  }
  // (one mesh for the body, one a wheel: a car was ~60 draws a pass)
  fuse(body); for (const w of wheels) fuse(w);
  g.userData.roll = { wheels, r: R, last: null as THREE.Vector3 | null, angle: 0 };
  ROLLING.push(g);
  return g;
}

/** The sedans built (sedan()): rolled each frame by rollSedans. */
const ROLLING: THREE.Group[] = [];
/** Turn every sedan's wheels by how far it moved since the last frame, along its own heading (parked ones stay still);
 *  a jump of more than `seek` m (a seek, a cut to a new place) doesn't count. */
export function rollSedans(seek = 4) {
  const p = new THREE.Vector3(), fwd = new THREE.Vector3();
  for (const g of ROLLING) {
    const R = g.userData.roll as { wheels: THREE.Object3D[]; r: number; last: THREE.Vector3 | null; angle: number };
    g.updateWorldMatrix(true, false);
    p.setFromMatrixPosition(g.matrixWorld); fwd.setFromMatrixColumn(g.matrixWorld, 2).normalize();
    if (R.last) { const d = p.clone().sub(R.last).dot(fwd); if (Math.abs(d) < seek) R.angle += d / R.r; }
    (R.last ??= new THREE.Vector3()).copy(p);
    for (const w of R.wheels) w.rotation.x = R.angle;
  }
}

/** A pedestrian as a flat silhouette (the cast's dark): a body, a head, two legs hinged at the hip (named 'legL',
 *  'legR': the scene scissors them as they walk), facing +z, feet at y 0. */
/** The passers-by's looks: skin, top, trousers, shoes, hair (each walker() takes the next by a hash of its turn:
 *  the same people every run). */
const LOOKS = {
  skin: ['#4a2e22', '#6b4330', '#8f5e40', '#b47c56', '#d9a67e', '#3a2620'],
  top: ['#c8463c', '#2f5d7c', '#e8dcc0', '#3c6b4a', '#d9a23a', '#6a4a8a', '#f2efe6', '#2a2a32', '#b85a7a'],
  legs: ['#2a3550', '#3a3a40', '#6a5a46', '#1e2228', '#8a7a62', '#2f4a3a'],
  shoes: ['#1a1618', '#f0ece2', '#5a3a26'],
  hair: ['#141012', '#2a1a12', '#4a2e1a', '#8a6a3a', '#c8c0b0'],
};
let walkers = 0;

/** A passer-by, standing 1.75 m, facing +z: a person, not a silhouette (a capsule, a ball and two sticks in one dark
 *  read as a box on the road — the user, 2026-10-15) — shoulders, a neck, a head with its hair, sleeved arms with
 *  hands, trousers and shoes, dressed by turn (LOOKS). The legs on pivots at the hips ('legL', 'legR'), the arms at the
 *  shoulders ('armL', 'armR'): stride() swings them. */
export function walker(): THREE.Group {
  const k = walkers++, pick = (a: readonly string[], salt: number) => a[Math.floor(hashTurn(k, salt) * a.length)]!;
  const g = new THREE.Group(), skin = pick(LOOKS.skin, 1), top = pick(LOOKS.top, 2), legs = pick(LOOKS.legs, 3), shoes = pick(LOOKS.shoes, 4), hair = pick(LOOKS.hair, 5);
  const box = tbox, cyl = tcyl, ball = tball; // (tinted parts: fused below)
  const capsule = (to: THREE.Object3D, r: number, len: number, y: number, color: string, sx = 1, sz = 1) => part(to, new THREE.CapsuleGeometry(r, len, 3, 8).scale(sx, 1, sz), color, 0, y, 0);
  box(g, 0.3, 0.16, 0.19, 0, 0.93, 0, legs); // the hips
  capsule(g, 0.15, 0.34, 1.24, top, 1.22, 0.72); // the torso, broad at the shoulders
  cyl(g, 0.048, 0.1, 0, 1.52, 0, skin, 10); // the neck
  part(g, new THREE.SphereGeometry(0.105, 12, 9).scale(0.92, 1.08, 1), skin, 0, 1.655, 0.005); // the head
  part(g, new THREE.SphereGeometry(0.11, 12, 9).scale(0.96, 0.74, 1), hair, 0, 1.695, -0.018); // its hair, over the crown and the back
  for (const [name, x] of [['armL', 0.205], ['armR', -0.205]] as const) {
    const sh = new THREE.Group(); sh.name = name; sh.position.set(x, 1.41, 0); sh.rotation.z = Math.sign(x) * 0.07; g.add(sh);
    capsule(sh, 0.05, 0.22, -0.14, top); // the sleeve
    capsule(sh, 0.04, 0.22, -0.39, skin); // the forearm
    ball(sh, 0.045, 0, -0.55, 0.01, skin); // the hand
  }
  for (const [name, x] of [['legL', 0.085], ['legR', -0.085]] as const) {
    const hip = new THREE.Group(); hip.name = name; hip.position.set(x, 0.88, 0); g.add(hip);
    capsule(hip, 0.07, 0.66, -0.42, legs);
    box(hip, 0.1, 0.07, 0.25, 0, -0.845, 0.05, shoes); // the shoe
  }
  // (one mesh for the body and one a limb, each on its pivot)
  fuse(g); for (const c of g.children) fuse(c);
  return g;
}
/** (a hash of a walker's turn, 0..1) */
const hashTurn = (k: number, salt: number) => { const x = Math.sin(k * 127.1 + salt * 311.7) * 43758.5453; return x - Math.floor(x); };

/** A walker's stride (walker()): its legs swung by `swing` (radians) each way, its arms the other way, less. */
export function stride(p: THREE.Object3D, swing: number) {
  p.getObjectByName('legL')!.rotation.x = swing; p.getObjectByName('legR')!.rotation.x = -swing;
  const l = p.getObjectByName('armL'), r = p.getObjectByName('armR');
  if (l) l.rotation.x = -0.6 * swing;
  if (r) r.rotation.x = 0.6 * swing;
}

/** A shop's sign: its words in the signs' face (F.sign: never the lyrics'), `ink` on `bg`, centred, letter-spaced. */
export function signFace(text: string, w: number, h: number, ink: string, bg: string | null, family: string, size = 0.62, spacing = 0.08): THREE.CanvasTexture {
  return canvasTex(w, h, (c) => {
    if (bg) { c.fillStyle = bg; c.fillRect(0, 0, w, h); }
    c.fillStyle = ink; c.textAlign = 'center'; c.textBaseline = 'middle';
    const px = h * size;
    c.font = `${px}px "${family}"`;
    (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${px * spacing}px`;
    c.fillText(text, w / 2, h * 0.54, w * 0.92);
  });
}
