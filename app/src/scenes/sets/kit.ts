// The set-pieces' props' building blocks: canvas textures, boxes, cylinders, balls and planes in a group, and groups in
// the road's frame or a panel's. Browser only (canvas).
import * as THREE from 'three';
import type { Route } from '../../drive/route';

export const UP = new THREE.Vector3(0, 1, 0);

/** A canvas texture `w` x `h` px drawn by `draw`. */
export function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d')!);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
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
