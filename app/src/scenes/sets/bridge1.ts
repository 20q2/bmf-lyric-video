// The bridge's props (drive/sets/bridge1.ts): the tunnel furnished — housings and ceiling hangers for the two lit
// overhead signs (their lettering is the carriers'), lane-control signals down the bore (green arrows that flip to
// red X on "we might crash", back to green as "tryna make it last" answers), dim strip lights along both walls so the
// bore reads as a tube receding instead of a void, SOS niches on the right, and the tunnel's name board over the
// entrance portal. Browser only (canvas).
import * as THREE from 'three';
import type { Drive } from '../../drive/drive';
import { type Bridge1Plan, SIGNALS } from '../../drive/sets/bridge1';
import { TUNNEL } from '../../drive/tunnel';
import { WORLD, toon } from '../../look/toon';
import { F, font } from '../../engine/type';
import { box, canvasTex, pic, plane, roadFrame, signFace } from './kit';

/** The exit's haze: veils this far back from the mouth (m), each adding this much of EXIT_GLOW. */
const EXIT_HAZE: readonly [number, number][] = [[2, 0.1], [6, 0.06], [12, 0.03]];
/** The haze's colour (the night beyond shows through it: the user wants to see time has passed — no glare). */
const EXIT_GLOW = '#d8c0e0';

export function buildBridge1(drive: Drive): { group: THREE.Group; update(t: number): void } | null {
  const plan = drive.plans.bridge1 as Bridge1Plan | undefined;
  if (!plan) return null;
  const { route } = drive, root = new THREE.Group(), onRoad = roadFrame(route, root);
  const dark = toon({ color: '#15121a' }), steel = toon({ color: WORLD.post });

  // ---- the overhead signs' housings: a dark box BEHIND each face (the face looks back down the bore at the coming
  // car: +z in the road's frame is onward), hangers up to the ceiling ----
  for (const p of plan.panels) {
    const g = onRoad(p.s, 0), F0 = p.face, yC = F0.center.y - route.frameAt(p.s).pos.y;
    box(g, F0.w + 0.6, F0.h + 0.5, 0.3, 0, yC, 0.22, dark);
    for (const x of [-F0.w / 3, F0.w / 3]) box(g, 0.12, TUNNEL.h - yC - F0.h / 2, 0.12, x, (TUNNEL.h + yC + F0.h / 2) / 2, 0.22, steel);
  }

  // ---- the lane-control signals: green arrow by default, red X from "crash" until the calm ----
  const arrow = canvasTex(128, 128, (c) => {
    c.fillStyle = '#060708'; c.fillRect(0, 0, 128, 128);
    c.strokeStyle = '#3dff7a'; c.lineWidth = 13; c.lineCap = 'round';
    c.beginPath(); c.moveTo(64, 104); c.lineTo(64, 30); c.moveTo(38, 56); c.lineTo(64, 28); c.lineTo(90, 56); c.stroke();
  });
  const cross = canvasTex(128, 128, (c) => {
    c.fillStyle = '#060708'; c.fillRect(0, 0, 128, 128);
    c.strokeStyle = '#ff2a24'; c.lineWidth = 15; c.lineCap = 'round';
    c.beginPath(); c.moveTo(36, 36); c.lineTo(92, 92); c.moveTo(92, 36); c.lineTo(36, 92); c.stroke();
  });
  const heads: THREE.MeshBasicMaterial[] = [];
  for (const s of plan.signals) {
    const g = onRoad(s, 0);
    box(g, 0.66, 0.66, 0.24, 0, SIGNALS.y, 0, dark);
    box(g, 0.1, TUNNEL.h - SIGNALS.y - 0.33, 0.1, 0, (TUNNEL.h + SIGNALS.y + 0.33) / 2, 0, steel);
    const m = new THREE.MeshBasicMaterial({ map: arrow, color: new THREE.Color(2, 2, 2) });
    const face = plane(g, 0.56, 0.56, 0, SIGNALS.y, -0.13, m);
    face.rotation.y = Math.PI; // (facing the coming car)
    heads.push(m);
  }

  // ---- strip lights along both walls at the haunch: the bore reads as a tube receding, the fog takes the far end;
  // each swept along the road, so they follow the bore round its bend (straight boxes kinked against the wall) ----
  const strip = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.15, 0.72, 0.38), side: THREE.DoubleSide });
  const lit: number[] = [];
  for (let s = plan.s0 + 4; s < plan.s1 - 4; s += 10) {
    for (const side of [-1, 1]) {
      for (let a = s + 0.3; a < s + 9.7 - 1e-6; a += 1) {
        const ring = [a, Math.min(a + 1, s + 9.7)].flatMap((u) => {
          const f = route.frameAt(u), at = f.pos.clone().addScaledVector(f.right, side * (TUNNEL.halfW - 0.17));
          return [at.clone().setY(at.y + TUNNEL.h - 0.795), at.clone().setY(at.y + TUNNEL.h - 0.705)];
        });
        const [p0, p1, q0, q1] = ring as [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3];
        for (const v of [p0, q0, p1, p1, q0, q1]) lit.push(v.x, v.y, v.z);
      }
    }
  }
  const strips = new THREE.BufferGeometry();
  strips.setAttribute('position', new THREE.Float32BufferAttribute(lit, 3));
  root.add(new THREE.Mesh(strips, strip));

  // ---- the light at the end: the way out a glare (it blooms; the car drives into it), and veils across the bore by
  // it, thickening toward it, the light spilling in (the sky through the mouth read as a hard cut-out, the town's ink
  // drawn over it) ----
  const veil = new THREE.PlaneGeometry(2 * TUNNEL.halfW, TUNNEL.h).translate(0, TUNNEL.h / 2, 0);
  for (const [back, k] of EXIT_HAZE) {
    const g = onRoad(plan.s1 - back, 0);
    g.add(new THREE.Mesh(veil, new THREE.MeshBasicMaterial({ color: new THREE.Color(EXIT_GLOW).multiplyScalar(k), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false })));
  }

  // ---- SOS niches on the right wall: a small lit orange box every so often ----
  const sos = pic(signFace('SOS', 160, 96, '#16130a', '#ff9a1a', F.sign(700), 0.6, 0.14));
  for (let s = plan.s0 + 55; s < plan.s1 - 30; s += 85) {
    if (plan.panels.some((p) => Math.abs(p.s - s) < 14)) continue;
    const g = onRoad(s, TUNNEL.halfW - 0.1);
    box(g, 0.1, 1.5, 1.7, 0, 1.15, 0, dark);
    const f = plane(g, 1.3, 0.75, -0.06, 1.3, 0, sos);
    f.rotation.y = -Math.PI / 2; // (its face toward the road)
    f.material = new THREE.MeshBasicMaterial({ map: (f.material as THREE.MeshBasicMaterial).map, color: new THREE.Color(1.6, 1.6, 1.6) });
  }

  // ---- the tunnel's name over the entrance portal, in the signs' face ----
  {
    const g = onRoad(plan.s0 - 0.4, 0);
    box(g, 11.4, 1.5, 0.4, 0, TUNNEL.h + 1.2, -0.1, toon({ color: '#b9ada0' }));
    const b = plane(g, 11, 1.2, 0, TUNNEL.h + 1.2, 0.12, pic(signFace('MT. SOMEWHERE TUNNEL', 1024, 128, '#f4f0e6', '#4a4038', F.sign(600), 0.56, 0.14)));
    b.rotation.y = Math.PI; // (read on the way in)
  }

  return {
    group: root,
    update(t) {
      const red = t >= plan.crashAt && t < plan.calm;
      for (const m of heads) {
        const want = red ? cross : arrow;
        if (m.map !== want) { m.map = want; m.needsUpdate = true; }
        // (the red X burns harder than the green: the scare reads down the bore)
        m.color.setScalar(red ? 3 : 2);
      }
    },
  };
}
