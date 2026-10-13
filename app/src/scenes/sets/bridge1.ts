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

  // ---- strip lights along both walls at the haunch: the bore reads as a tube receding, the fog takes the far end ----
  const strip = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.15, 0.72, 0.38) });
  for (let s = plan.s0 + 4; s < plan.s1 - 4; s += 10) {
    for (const side of [-1, 1]) {
      const g = onRoad(s + 5, side * (TUNNEL.halfW - 0.12));
      box(g, 0.1, 0.09, 9.4, 0, TUNNEL.h - 0.75, 0, strip);
    }
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
        // (the red X burns harder: the scare reads even as the lamps die)
        m.color.setScalar(red ? 3 : 2);
      }
    },
  };
}
