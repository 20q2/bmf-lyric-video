// Verse 2's props (drive/sets/verse2.ts): the chicken on the chicken shack's roof; the hand car wash on the right (its
// building, its bays, the sign's frame on its pole, soap bubbles); his giant mural painted on the end wall (his
// portrait; its words are carriers). The block's buildings are the drive's (blocks.ts); the murals, the SLAUSON sign,
// their car's banner, hood lettering and plaque are carriers. Browser only (canvas).
import * as THREE from 'three';
import type { Drive } from '../../drive/drive';
import { type Verse2Plan, BLOCK, GIANT, WASH } from '../../drive/sets/verse2';
import { WORLD, toon } from '../../look/toon';
import { drawAd } from '../../look/adart';
import { F, font } from '../../engine/type';

const UP = new THREE.Vector3(0, 1, 0);
function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d')!);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
const box = (g: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material) => {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); return b;
};
const ball = (g: THREE.Object3D, r: number, x: number, y: number, z: number, m: THREE.Material) => {
  const b = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), m); b.position.set(x, y, z); g.add(b); return b;
};
/** A group in a panel's own frame (x along its text, y its up, z out of its face), origin at its centre. */
function onPanel(p: { center: THREE.Vector3; normal: THREE.Vector3; up: THREE.Vector3 }): THREE.Group {
  const g = new THREE.Group(), along = p.up.clone().cross(p.normal).normalize();
  g.matrixAutoUpdate = false;
  g.matrix.makeBasis(along, p.up, p.normal).setPosition(p.center);
  return g;
}

export function buildVerse2(drive: Drive): { group: THREE.Group; update(t: number): void } | null {
  const plan = drive.plans.verse2 as Verse2Plan | undefined;
  if (!plan) return null;
  const { route } = drive, root = new THREE.Group();
  const onRoad = (s: number, lateral: number) => {
    const f = route.frameAt(s), g = new THREE.Group(), fwd = new THREE.Vector3(f.fwd.x, 0, f.fwd.z).normalize(), right = new THREE.Vector3(f.right.x, 0, f.right.z).normalize();
    g.matrixAutoUpdate = false;
    g.matrix.makeBasis(right.negate(), UP, fwd).setPosition(f.pos.clone().addScaledVector(f.right, lateral));
    root.add(g);
    return g;
  };
  const dark = toon({ color: WORLD.post });

  // the chicken on the shack's roof: white, a red comb and wattle, an orange beak, on a post
  {
    const roof = drive.blocks.find((b) => Math.abs(b.s - plan.chickenS) < b.w / 2 && b.lateral < 0);
    const g = onRoad(plan.chickenS, BLOCK.face - 3), y = roof?.h ?? 7, white = toon({ color: '#f7f2e6' }), red = toon({ color: '#d4202e' });
    box(g, 0.2, 1.4, 0.2, 0, y + 0.7, 0, dark);
    const body = ball(g, 1.2, 0, y + 2.4, 0, white); body.scale.set(1, 0.9, 1.25);
    ball(g, 0.6, 0, y + 3.7, 0.9, white);
    for (let k = 0; k < 3; k++) box(g, 0.14, 0.32, 0.22, 0, y + 4.35, 0.75 + k * 0.2, red);
    ball(g, 0.16, 0, y + 3.35, 1.4, red).scale.set(0.7, 1.4, 0.7);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.45, 10), toon({ color: '#f29a1a' })); beak.rotation.x = Math.PI / 2; beak.position.set(0, y + 3.65, 1.6); g.add(beak);
    ball(g, 0.8, 0, y + 2.6, -1.4, white).scale.set(0.5, 1.2, 0.7); // its tail
  }

  // the car wash on the right: its building and bays, the sign's frame on its pole, soap bubbles at the entrance
  {
    const W = plan.wash, sign = onPanel(W.sign), drop = W.sign.center.y - route.frameAt(W.s).pos.y;
    box(sign, W.sign.w + 0.35, W.sign.h + 0.35, 0.16, 0, 0, -0.1, toon({ color: '#0b3a66' }));
    box(sign, 0.25, drop - W.sign.h / 2, 0.25, 0, -(drop + W.sign.h / 2) / 2, -0.2, dark);
    const head = canvasTex(1024, 220, (c) => {
      c.fillStyle = '#ffd65a'; c.fillRect(0, 0, 1024, 220); c.fillStyle = '#0b3a66'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = font(F.sign(700), 124); c.fillText('HAND WASH', 512, 118);
    });
    const hp = new THREE.Mesh(new THREE.PlaneGeometry(W.sign.w + 0.35, 0.8), new THREE.MeshBasicMaterial({ map: head })); hp.position.set(0, W.sign.h / 2 + 0.6, -0.02); sign.add(hp);
    root.add(sign);
    // (its building is the drive's block: here its blue roof edge and its bays, open to the road)
    const b = onRoad(W.s + WASH.building.ds, WASH.building.lateral), blue = toon({ color: '#1f8fd6' });
    box(b, 10.4, 0.6, 18.4, 0, 4.6, 0, blue);
    for (const z of [-5, 0, 5]) box(b, 0.05, 3, 3.6, 5.03, 1.5, z, toon({ color: '#1d2230' }));
    const suds = toon({ color: '#ffffff' });
    for (let k = 0; k < 14; k++) ball(b, 0.25 + 0.35 * ((k * 0.37) % 1), 5.6 + ((k * 0.61) % 1.4), 0.3 + ((k * 0.43) % 1) * 1.8, -7 + k, suds);
  }

  // his giant mural on the end wall: his portrait on the right, its words (carriers) on the left, on its building
  {
    const G = plan.giant, wall = onPanel(G);
    const art = canvasTex(2048, Math.round((2048 * G.h) / G.w), (c) => drawAd(c, 'him', c.canvas.width, c.canvas.height, GIANT.text));
    const m = new THREE.Mesh(new THREE.PlaneGeometry(G.w, G.h), new THREE.MeshBasicMaterial({ map: art })); m.position.z = -0.02; wall.add(m);
    // (its building is the drive's block)
    root.add(wall);
  }

  return { group: root, update() {} };
}
