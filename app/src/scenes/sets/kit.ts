// The set-pieces' props' building blocks: canvas textures, boxes, cylinders, balls and planes in a group, and groups in
// the road's frame or a panel's. Browser only (canvas).
import * as THREE from 'three';
import type { Route } from '../../drive/route';
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
/** A background car for the world's traffic and curbs: a blocky sedan (body, cab, dark windows, chrome bumpers,
 *  wheels), nose along +z, its base on the ground at y 0. `low` drops it on its suspension, lowrider-parked, nose down. */
export function sedan(opts: { color: string; length?: number; low?: boolean }): THREE.Group {
  const g = new THREE.Group(), L = opts.length ?? 4.6, hl = L / 2, W = 1.78;
  const paint = toon({ color: opts.color }), dark = toon({ color: '#1d2026' }), chrome = toon({ color: WORLD.chrome });
  const drop = opts.low ? 0.12 : 0;
  const body = new THREE.Group(); body.position.y = -drop; if (opts.low) body.rotation.x = 0.02; // (parked low, nose down)
  g.add(body);
  // (a three-box sedan — the user, 2026-10-13: the other cars "look like shit": the hood lower than the trunk, the
  // cabin's glass in pillars, the sills tucked in, mirrors, lamps in bezels, a chrome strip, wheels on hubs)
  const lower = 0.52, beltY = 0.3 + lower;
  // the body to the beltline, its wheel arches cut (one box down to the hubs ran through the wheels' tops — the user,
  // 2026-10-15): the band over the arches the whole length, the panels under it between and beyond the wheels, a dark
  // well inside each arch
  const wz = hl - 0.85, R = 0.3, arch = R + 0.07, top = 2 * R + 0.07;
  box(body, W, beltY - top, L, 0, (top + beltY) / 2, 0, paint);
  for (const [z0, z1] of [[-hl, -wz - arch], [-wz + arch, wz - arch], [wz + arch, hl]] as const) box(body, W, top - 0.3, z1 - z0, 0, (0.3 + top) / 2, (z0 + z1) / 2, paint);
  for (const z of [wz, -wz]) box(body, W - 0.36, top - 0.2, 2 * arch, 0, (0.2 + top) / 2, z, dark);
  box(body, W - 0.1, 0.06, L - 0.3, 0, 0.3 + 0.03, 0, dark); // the sill, tucked in
  const cab = box(body, W - 0.34, 0.44, L * 0.44, 0, beltY + 0.22, -0.2, paint); cab.scale.set(1, 1, 1); // the cabin's roof box
  const glass = box(body, W - 0.3, 0.36, L * 0.44 - 0.14, 0, beltY + 0.18, -0.2, dark); glass.scale.z = 1.02; // its glass
  for (const z of [L * 0.22 - 0.2, -L * 0.22 - 0.2]) for (const x of [W / 2 - 0.19, -W / 2 + 0.19]) box(body, 0.06, 0.4, 0.07, x, beltY + 0.2, z, paint); // the pillars
  box(body, W - 0.6, 0.02, L * 0.46, 0, beltY + 0.45, -0.2, paint); // the roof
  box(body, W - 0.2, 0.08, L * 0.28, 0, beltY + 0.04, hl - L * 0.14 - 0.1, paint); // the hood's crown
  box(body, W - 0.2, 0.1, L * 0.2, 0, beltY + 0.05, -hl + L * 0.1 + 0.1, paint); // the trunk's lid, a little higher
  for (const x of [W / 2 + 0.12, -W / 2 - 0.12]) { box(body, 0.16, 0.1, 0.1, x, beltY + 0.12, L * 0.22 - 0.3, dark); } // the mirrors
  box(body, W + 0.06, 0.1, 0.12, 0, 0.42, hl + 0.04, chrome);
  box(body, W + 0.06, 0.1, 0.12, 0, 0.42, -hl - 0.04, chrome);
  // its lamps in chrome bezels, the grille, a chrome strip down each flank, and the wheels on chrome hubs
  const lamp = toon({ color: '#f4efd8' }), tail = toon({ color: '#b8161a' });
  for (const x of [W / 2 - 0.28, -W / 2 + 0.28]) { box(body, 0.3, 0.2, 0.04, x, 0.62, hl + 0.005, chrome); box(body, 0.22, 0.14, 0.04, x, 0.62, hl + 0.02, lamp); box(body, 0.3, 0.16, 0.04, x, 0.62, -hl - 0.005, chrome); box(body, 0.24, 0.1, 0.04, x, 0.62, -hl - 0.02, tail); }
  box(body, W - 0.9, 0.16, 0.04, 0, 0.62, hl + 0.01, dark); for (let k = 0; k < 3; k++) box(body, W - 0.92, 0.015, 0.05, 0, 0.56 + k * 0.06, hl + 0.015, chrome); // the grille
  for (const x of [W / 2 + 0.005, -W / 2 - 0.005]) box(body, 0.02, 0.05, L * 0.8, x, 0.66, 0, chrome);
  // the wheels in their arches, standing a little proud of the flanks; each on a pivot at its hub with a five-spoke cap
  // (a plain disc turning reads as standing still), rolled by how far the car has moved (rollSedans)
  const wheels: THREE.Object3D[] = [];
  for (const z of [wz, -wz]) for (const s of [1, -1]) {
    const piv = new THREE.Group(); piv.position.set(s * (W / 2 - 0.07), R, z); g.add(piv); wheels.push(piv);
    cyl(piv, R, 0.2, 0, 0, 0, dark, 16).rotation.z = Math.PI / 2;
    cyl(piv, 0.17, 0.22, 0, 0, 0, chrome, 12).rotation.z = Math.PI / 2;
    for (let k = 0; k < 5; k++) { const sp = box(piv, 0.03, 0.28, 0.05, s * 0.115, 0, 0, dark); sp.rotation.x = (k * 2 * Math.PI) / 5; }
  }
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
export function walker(): THREE.Group {
  const g = new THREE.Group(), dark = toon({ color: '#241f2a' });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.5, 4, 10), dark); torso.position.y = 1.15; g.add(torso);
  ball(g, 0.11, 0, 1.62, 0, dark);
  for (const [name, x] of [['legL', 0.08], ['legR', -0.08]] as const) {
    const hip = new THREE.Group(); hip.name = name; hip.position.set(x, 0.86, 0); g.add(hip);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.68, 4, 8), dark); leg.position.y = -0.43; hip.add(leg);
  }
  return g;
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
