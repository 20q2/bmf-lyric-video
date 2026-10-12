// Chorus 1's props (drive/sets/chorus1.ts): the barbershop on the far left corner — its cream front, a window a phrase
// (the gold leaf on them is the carriers'), a door between with the barber pole turning by it, striped awnings over the
// windows, its name across the top in the signs' face. Browser only (canvas).
import * as THREE from 'three';
import type { Drive } from '../../drive/drive';
import { BARBER, type Chorus1Plan } from '../../drive/sets/chorus1';
import { WORLD, toon } from '../../look/toon';
import { F } from '../../engine/type';
import { box, canvasTex, cyl, leftFront, pic, plane, signFace } from './kit';

/** Shop glass: dark, a pale streak of the sky across it. */
export const glassTex = () => canvasTex(256, 256, (c) => {
  const g = c.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#2c3a44'); g.addColorStop(1, '#141c22');
  c.fillStyle = g; c.fillRect(0, 0, 256, 256);
  c.fillStyle = 'rgba(255,236,214,0.12)'; c.beginPath(); c.moveTo(40, 0); c.lineTo(120, 0); c.lineTo(40, 256); c.lineTo(-40, 256); c.fill();
  c.fillStyle = 'rgba(255,236,214,0.07)'; c.beginPath(); c.moveTo(150, 0); c.lineTo(175, 0); c.lineTo(95, 256); c.lineTo(70, 256); c.fill();
});

export function buildChorus1(drive: Drive): { group: THREE.Group; update(t: number): void } | null {
  const plan = drive.plans.chorus1 as Chorus1Plan | undefined;
  if (!plan) return null;
  const root = new THREE.Group(), front = leftFront(drive.route, root), B = BARBER, Wn = B.window, shop = plan.shop;
  const g = front(shop.s, B.face), x = (s: number) => s - shop.s, w = shop.w;
  const cream = toon({ color: '#efe2c4' }), trim = toon({ color: '#f8f4ea' }), dark = toon({ color: '#1d2026' }), red = '#c8202e';
  // the building: its front cream, a dark base course, a cornice
  box(g, w, B.h, B.d, 0, B.h / 2, -B.d / 2, cream);
  box(g, w + 0.06, 0.45, 0.06, 0, 0.22, 0.03, dark);
  box(g, w + 0.3, 0.3, 0.4, 0, B.h - 0.15, 0.1, trim);
  // the windows: glass in white frames, a striped awning over each
  const glass = pic(glassTex());
  const stripes = canvasTex(512, 64, (c) => { for (let i = 0; i < 16; i++) { c.fillStyle = i % 2 ? '#f8f4ea' : red; c.fillRect(i * 32, 0, 32, 64); } });
  for (const s of plan.windows) {
    plane(g, Wn.w, Wn.h, x(s), Wn.y, 0.015, glass);
    for (const dy of [-1, 1]) box(g, Wn.w + 0.24, 0.12, 0.1, x(s), Wn.y + (dy * (Wn.h + 0.12)) / 2, 0.04, trim);
    for (const dx of [-1, 1]) box(g, 0.12, Wn.h, 0.1, x(s) + (dx * (Wn.w + 0.12)) / 2, Wn.y, 0.04, trim);
    const awning = plane(g, Wn.w + 0.4, 1.1, x(s), Wn.y + Wn.h / 2 + 0.75, 0.5, toon({ map: stripes, side: THREE.DoubleSide }));
    awning.rotation.x = -1.05; // (sloping down and out over the sidewalk)
  }
  // the doors between; the barber pole at the shop's near end (out from the front: anywhere else it'd stand over a window)
  for (const s of plan.doors) {
    box(g, B.door - 0.1, 2.4, 0.06, x(s), 1.2, 0.03, dark);
    plane(g, B.door - 0.5, 1.2, x(s), 1.55, 0.065, glass);
  }
  const poles: THREE.Texture[] = [];
  {
    const spiral = canvasTex(128, 256, (c) => {
      c.fillStyle = '#f8f4ea'; c.fillRect(0, 0, 128, 256);
      for (let i = -4; i < 8; i++) for (const [col, o] of [[red, 0], ['#1f3f8f', 48]] as const) {
        c.fillStyle = col; c.beginPath(); c.moveTo(0, i * 64 + o); c.lineTo(128, i * 64 + o - 64); c.lineTo(128, i * 64 + o - 40); c.lineTo(0, i * 64 + o + 24); c.fill();
      }
    });
    spiral.wrapS = spiral.wrapT = THREE.RepeatWrapping; poles.push(spiral);
    const px = -w / 2 + 0.3;
    cyl(g, 0.13, 1.3, px, 2.3, 0.3, toon({ map: spiral }), 20);
    for (const dy of [-0.7, 0.7]) cyl(g, 0.16, 0.12, px, 2.3 + dy, 0.3, toon({ color: WORLD.chrome }), 20);
    box(g, 0.08, 0.08, 0.3, px, 2.3, 0.15, toon({ color: WORLD.chrome }));
  }
  // its name across the top, in the signs' face
  plane(g, Math.min(w - 1, 9), 0.8, 0, B.h - 0.85, 0.05, pic(signFace('BARBER SHOP', 1024, 92, '#f8f4ea', '#1d2026', F.sign(500), 0.6, 0.18)));
  return {
    group: root,
    update(t) { for (const p of poles) p.offset.y = (t * 0.6) % 1; }, // (the stripes climb)
  };
}
