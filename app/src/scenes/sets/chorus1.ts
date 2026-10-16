// Chorus 1's props (drive/sets/chorus1.ts): the barbershop on the far left corner — its cream front, a window a phrase
// (the gold leaf on them is the carriers'), a door between with the barber pole turning by it, striped awnings over the
// windows, its name across the top in the signs' face. Browser only (canvas).
import * as THREE from 'three';
import type { Drive } from '../../drive/drive';
import { BARBER, type Chorus1Plan } from '../../drive/sets/chorus1';
import { WORLD, toon } from '../../look/toon';
import { SIDEWALKS } from '../../drive/world';
import { F, font } from '../../engine/type';
import { box, canvasTex, cyl, fuse, leftFront, paint, pic, plane, signFace, tbox, tcyl } from './kit';

/** Shop glass: dark, a pale streak of the sky across it. */
export const glassTex = () => canvasTex(256, 256, (c) => {
  const g = c.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#2c3a44'); g.addColorStop(1, '#141c22');
  c.fillStyle = g; c.fillRect(0, 0, 256, 256);
  c.fillStyle = 'rgba(255,236,214,0.12)'; c.beginPath(); c.moveTo(40, 0); c.lineTo(120, 0); c.lineTo(40, 256); c.lineTo(-40, 256); c.fill();
  c.fillStyle = 'rgba(255,236,214,0.07)'; c.beginPath(); c.moveTo(150, 0); c.lineTo(175, 0); c.lineTo(95, 256); c.lineTo(70, 256); c.fill();
});

/** The shop's end wall to the cross street, the one its take looks along (the user, 2026-10-16: "on the side of the
 *  barbershop that we're looking on, the wall is pretty bare"): dressed as a '60s corner shop's side — a painted wall
 *  sign up top (HAIRCUTS · SHAVES, a pole at its end, sun-faded: paint on stucco, muted, under the gold leaf on the
 *  windows round the corner), a window with an AC unit in it, a small frosted one, the side door under a lamp, a
 *  downpipe at the back corner, bills pasted up by the sidewalk; the front's base course and cornice carried round.
 *  In `g` (the shop's front frame), its end at x = −w/2. */
function sideWall(g: THREE.Group, w: number) {
  const B = BARBER, side = new THREE.Group(), navy = '#2c3550';
  // (the wall's own frame: x along it from its back (−d/2) to the front corner (+d/2), y up, z out of it)
  side.position.set(-w / 2, 0, -B.d / 2); side.rotation.y = -Math.PI / 2; g.add(side);
  const L = B.d, x = (fromFront: number) => L / 2 - fromFront;
  // the base course and the cornice round from the front
  tbox(side, L, 0.45, 0.06, 0, 0.22, 0.03, '#1d2026');
  tbox(side, L + 0.05, 0.3, 0.4, -0.125, B.h - 0.15, 0.1, '#f8f4ea'); // (short of the front's, which turns the corner)
  // the wall sign: brick red ground (cream on the cream wall didn't read), a cream rule round it, HAIRCUTS big, the
  // trades under it, a pole at its back end; faded and worn
  const cream = '#f1e6cc';
  const sign = canvasTex(2048, 640, (c) => {
    c.fillStyle = '#9b3a39'; c.fillRect(0, 0, 2048, 640);
    c.strokeStyle = cream; c.lineWidth = 18; c.strokeRect(24, 24, 2000, 592);
    // the pole: red and navy stripes up a white shaft, a cap and a foot
    c.fillStyle = '#f4efe2'; c.fillRect(110, 110, 150, 420);
    c.save(); c.beginPath(); c.rect(110, 110, 150, 420); c.clip();
    for (let i = -6; i < 14; i++) { c.fillStyle = i % 2 ? '#c8202e' : navy; c.beginPath(); c.moveTo(110, 110 + i * 60); c.lineTo(260, 50 + i * 60); c.lineTo(260, 78 + i * 60); c.lineTo(110, 138 + i * 60); c.fill(); }
    c.restore();
    c.fillStyle = navy; c.fillRect(96, 80, 178, 34); c.fillRect(96, 526, 178, 34); c.beginPath(); c.arc(185, 76, 30, Math.PI, 0); c.fill();
    c.fillStyle = cream; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    c.font = font(F.bodoni(900), 250); c.fillText('HAIRCUTS', 1150, 350, 1580);
    c.fillRect(420, 410, 1460, 10);
    c.font = font(F.sign(700), 92); c.fillText('SHAVES · SHAMPOO · SHINES', 1150, 535, 1500);
    // (sun and years on it: paler in patches, the paint flaking to the stucco)
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 260; i++) { c.fillStyle = `rgba(214,170,150,${0.12 + 0.25 * rnd()})`; c.beginPath(); c.ellipse(rnd() * 2048, rnd() * 640, 6 + 40 * rnd(), 3 + 14 * rnd(), rnd() * 3, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = 'rgba(255,240,220,0.12)'; c.fillRect(0, 0, 2048, 640);
  });
  plane(side, 7.2, 2.25, x(5.1), 4.45, 0.02, paint(sign));
  // a window toward the back, an AC unit in its lower half; a small frosted one nearer the front
  const glass = pic(glassTex()), frosted = toon({ color: '#c9cdc8' });
  const win = (cx: number, cy: number, ww: number, wh: number, m: THREE.Material) => {
    plane(side, ww, wh, cx, cy, 0.015, m);
    for (const dy of [-1, 1]) tbox(side, ww + 0.2, 0.1, 0.1, cx, cy + (dy * (wh + 0.1)) / 2, 0.04, '#f8f4ea');
    for (const dx of [-1, 1]) tbox(side, 0.1, wh, 0.1, cx + (dx * (ww + 0.1)) / 2, cy, 0.04, '#f8f4ea');
    tbox(side, ww + 0.36, 0.08, 0.2, cx, cy - wh / 2 - 0.12, 0.08, '#f8f4ea'); // its sill
  };
  win(x(7.4), 1.95, 1.5, 1.3, glass);
  tbox(side, 0.78, 0.48, 0.62, x(7.4), 1.55, 0.2, '#b9b6ac'); // the AC unit, out over the walk
  tbox(side, 0.66, 0.34, 0.02, x(7.4), 1.55, 0.52, '#6d6b66'); // its grille
  win(x(4.6), 2.2, 0.75, 0.85, frosted);
  // the side door at the back, a step, a lamp over it on a gooseneck (the sidewalk runs along the wall: its foot is
  // the kerb's height up)
  const k = SIDEWALKS.kerb;
  tbox(side, 1.12, 2.3, 0.08, x(9.6), 1.15, 0.03, '#f8f4ea');
  tbox(side, 0.96, 2.18, 0.06, x(9.6), 1.09, 0.06, '#5b2a2e');
  tbox(side, 0.06, 0.06, 0.06, x(9.6) + 0.36, 1.05, 0.11, '#c9c4b8'); // its handle
  tbox(side, 1.3, 0.14, 0.5, x(9.6), k + 0.07, 0.25, '#b8ab98');
  tbox(side, 0.05, 0.05, 0.42, x(9.6), 2.62, 0.21, '#1d2026');
  tcyl(side, 0.16, 0.12, x(9.6), 2.56, 0.42, '#1d2026', 14);
  // the downpipe at the back corner, its shoe at the foot
  tcyl(side, 0.065, B.h - 0.3 - k, x(L - 0.2), (B.h - 0.3 + k) / 2, 0.1, '#d6ccb6');
  tbox(side, 0.18, 0.12, 0.3, x(L - 0.2), k + 0.06, 0.18, '#d6ccb6');
  fuse(side);
  // bills pasted up by the sidewalk at the front end: a soul revue, a fight, a car show, a lost dog; edges lifting
  const bills = canvasTex(1024, 384, (c) => {
    const items: [number, number, number, string, string, string, string][] = [
      [10, 40, -0.05, '#f2d64b', '#1d2026', 'SOUL', 'REVUE · FRI'],
      [250, 20, 0.04, '#f4efe2', '#a8343a', 'FIGHT', 'NIGHT · SAT'],
      [500, 50, -0.02, '#2b78a6', '#f4efe2', 'CAR', 'SHOW · SUN'],
      [760, 35, 0.06, '#e8e2d2', '#2c3550', 'LOST', 'DOG · REWARD'],
    ];
    for (const [bx, by, rot, bg, ink, big, small] of items) {
      c.save(); c.translate(bx + 115, by + 160); c.rotate(rot);
      c.fillStyle = bg; c.fillRect(-110, -155, 220, 310);
      c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(-110, 120, 220, 35);
      c.fillStyle = ink; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = font(F.bodoni(900), 78); c.fillText(big, 0, -60, 200);
      c.font = font(F.sign(700), 26); c.fillText(small, 0, 20, 200);
      c.fillRect(-80, 60, 160, 6); c.fillRect(-60, 82, 120, 6);
      c.restore();
    }
  });
  plane(side, 3.6, 1.35, x(1.95), 1.6, 0.025, paint(bills, { transparent: true, alphaTest: 0.5 }));
}

/** A door in its bay (m): its leaf's width and height (a shop door's 2.1 m), the rail over it, the transom light over
 *  that, the frame's jambs, the step up to it off the walk. */
const DOOR = { w: 1.0, h: 2.13, rail: 0.08, transom: 0.5, jamb: 0.09, step: 0.12 };

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
    const awning = plane(g, Wn.w + 0.4, 1.1, x(s), Wn.y + Wn.h / 2 + 0.6, 0.5, toon({ map: stripes, side: THREE.DoubleSide }));
    awning.rotation.x = -1.05; // (sloping down and out over the sidewalk)
  }
  // the doors between, each in its own bay (clear of the windows' frames and awnings): a shop door's 2.1 m, a glazed
  // leaf in a dark aluminium frame with a push bar and a kick plate, a transom light over it, the frame's head level
  // with the windows' tops' trim below the awnings; OPEN on its glass, the hours under; a step up off the walk. The barber
  // pole at the shop's near end (out from the front: anywhere else it'd stand over a window)
  {
    const D = DOOR, y0 = SIDEWALKS.kerb + D.step, open = paint(canvasTex(256, 192, (c) => {
      c.fillStyle = '#c8202e'; c.beginPath(); c.roundRect(28, 10, 200, 70, 12); c.fill();
      c.fillStyle = '#f8f4ea'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = font(F.sign(700), 52); c.fillText('OPEN', 128, 48);
      c.font = font(F.sign(600), 22); c.fillText('TUE – SAT', 128, 118); c.fillText('9 – 6', 128, 150);
    }), { transparent: true, alphaTest: 0.5 });
    for (const s of plan.doors) {
      const fx = x(s), head = y0 + D.h + D.rail + D.transom;
      tbox(g, D.w + 2 * D.jamb, head + D.jamb, 0.07, fx, (head + D.jamb) / 2, 0.035, '#2a2c31'); // the frame, from the base course up
      plane(g, D.w - 0.16, D.h - 0.42, fx, y0 + 0.3 + (D.h - 0.42) / 2, 0.075, glass); // the leaf's glass, its stiles and rails the frame's
      plane(g, D.w, D.transom, fx, y0 + D.h + D.rail + D.transom / 2, 0.075, glass); // the transom light over it
      tbox(g, D.w - 0.08, 0.24, 0.03, fx, y0 + 0.14, 0.085, '#b8b2a4'); // the kick plate
      tbox(g, D.w - 0.24, 0.05, 0.06, fx, y0 + 1.0, 0.11, '#c9c4b8'); // the push bar
      plane(g, 0.5, 0.375, fx, y0 + 1.5, 0.08, open);
      tbox(g, D.w + 2 * D.jamb + 0.4, D.step + 0.05, 0.45, fx, y0 - (D.step + 0.05) / 2, 0.225, '#b8ab98'); // the step up off the walk
      tbox(g, D.w + 2 * D.jamb + 0.3, 0.12, 0.12, fx, head + D.jamb + 0.06, 0.06, '#f8f4ea'); // its head's trim
    }
    fuse(g);
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
  // (over the awnings, clear of them seen from the street: they slope out under it)
  plane(g, Math.min(w - 1, 9), 0.8, 0, B.h - 0.6, 0.05, pic(signFace('BARBER SHOP', 1024, 92, '#f8f4ea', '#1d2026', F.sign(500), 0.6, 0.18)));
  sideWall(g, w);
  return {
    group: root,
    update(t) { for (const p of poles) p.offset.y = (t * 0.6) % 1; }, // (the stripes climb)
  };
}
