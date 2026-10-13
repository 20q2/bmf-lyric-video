// Chorus 3's props (drive/sets/chorus3.ts): the beach town's welcome arch — its cream band (the lyric is the carriers'),
// a WELCOME TO header in the signs' face, an arc of stepped blocks over it, two pylons, bulbs along the band's foot —
// the numbered lifeguard towers down the sand (their boards are the carriers), and three gulls crossing under the
// "fly" sky-writing. Browser only (canvas).
import * as THREE from 'three';
import type { Drive } from '../../drive/drive';
import { ARCH, type Chorus3Plan, TOWER } from '../../drive/sets/chorus3';
import { WORLD, toon } from '../../look/toon';
import { GLOW, lampMaterial } from '../../look/night';
import { F } from '../../engine/type';
import { box, onPanel, pic, plane, roadFrame, signFace } from './kit';

export function buildChorus3(drive: Drive): { group: THREE.Group; update(t: number): void } | null {
  const plan = drive.plans.chorus3 as Chorus3Plan | undefined;
  if (!plan) return null;
  const { route } = drive, root = new THREE.Group(), onRoad = roadFrame(route, root);
  const cream = toon({ color: '#f6edd6' }), blue = toon({ color: '#2b4a66' }), wood = toon({ color: '#d9c7a2' });
  const bulb = lampMaterial('#ffe08a', GLOW.lamp, 0.8);

  // ---- the arch: pylons, the band's box, WELCOME TO over it, a stepped arc on top, bulbs along the band's foot ----
  {
    const B = plan.band, A = ARCH, g = onPanel(B);
    box(g, 2 * plan.pylons + A.pylon.w, B.h + 0.6, 0.6, 0, 0, -0.35, cream); // the band's box (the carriers face it)
    box(g, 2 * plan.pylons + A.pylon.w + 0.3, 0.45, 0.8, 0, -B.h / 2 - 0.35, -0.3, blue); // its sill
    // WELCOME TO, the arch's own words, over the band
    box(g, 9.5, 1.15, 0.55, 0, B.h / 2 + 0.85, -0.32, blue);
    plane(g, 9, 0.95, 0, B.h / 2 + 0.85, -0.03, pic(signFace('WELCOME TO', 1024, 108, '#f6edd6', null, F.sign(600), 0.62, 0.24)));
    // the arc: stepped blocks rising to a keystone
    for (const [dx, dy, w] of [[-9, 1.9, 4], [9, 1.9, 4], [-5.4, 2.6, 4], [5.4, 2.6, 4], [-1.8, 3.1, 4.2], [1.8, 3.1, 4.2]] as const) {
      box(g, w, 0.7, 0.6, dx, B.h / 2 + dy, -0.35, cream);
    }
    box(g, 1.6, 1.1, 0.7, 0, B.h / 2 + 3.5, -0.35, blue); // the keystone
    // bulbs along the band's foot (dusk: they're already on)
    for (let i = 0; i <= 26; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), bulb);
      s.position.set(-plan.pylons + (2 * plan.pylons * i) / 26, -B.h / 2 - 0.08, 0.05); g.add(s);
    }
    root.add(g);
    // the pylons, down to the ground (their blocks are the drive's: here the stone)
    for (const side of [-1, 1]) {
      const p = onRoad(plan.archS, side * plan.pylons), h = B.bottom + B.h + 1;
      box(p, A.pylon.w, h, A.pylon.w, 0, h / 2, 0, cream);
      box(p, A.pylon.w + 0.4, 0.5, A.pylon.w + 0.4, 0, 1.1, 0, blue); // its base course
    }
  }

  // ---- the lifeguard towers: a hut on stilts behind each board, its roof, its number on the hut ----
  plan.towers.forEach(({ s }, i) => {
    const T = TOWER.hut, g = onRoad(s, TOWER.lateral + T.back);
    box(g, T.w, T.h, T.d, 0, T.top - T.h / 2, 0, cream);
    box(g, T.w + 0.7, 0.18, T.d + 0.7, 0, T.top + 0.09, 0, blue); // its roof
    for (const x of [-T.w / 2 + 0.2, T.w / 2 - 0.2]) for (const z of [-T.d / 2 + 0.2, T.d / 2 - 0.2]) {
      box(g, 0.16, T.top - T.h, 0.16, x, (T.top - T.h) / 2, z, wood); // its stilts, down to the sand
    }
    // its number, on the hut's road side (the frame's -x is the road)
    const n = plane(g, 0.8, 0.8, -T.w / 2 - 0.01, T.top - T.h / 2, 0, pic(signFace(String(7 + i), 128, 128, '#2b4a66', '#f6edd6', F.sign(700), 0.7, 0)));
    n.rotation.y = -Math.PI / 2;
  });

  // ---- the gulls, crossing under the fly line's sky-writing (flat dark Vs, flapping) ----
  const gulls: { g: THREE.Group; wings: THREE.Mesh[]; k: number }[] = [];
  if (plan.fly) {
    const dark = toon({ color: '#241f2a', side: THREE.DoubleSide });
    for (let k = 0; k < 3; k++) {
      const g = new THREE.Group(); g.matrixAutoUpdate = false;
      const wings = [-1, 1].map((side) => {
        const w = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.4), dark);
        w.position.x = side * 0.85; w.rotation.y = 0; g.add(w);
        return w;
      });
      root.add(g);
      gulls.push({ g, wings, k });
    }
  }

  const UP = new THREE.Vector3(0, 1, 0);
  return {
    group: root,
    update(t) {
      if (!plan.fly) return;
      const F0 = plan.fly, on = t > F0.start - 0.8 && t < F0.end + 2;
      for (const { g, wings, k } of gulls) {
        g.visible = on;
        if (!on) continue;
        // ahead of the car, below the sky-writing, crossing left to right with a bob
        const f = drive.carFrame(t), fwd = new THREE.Vector3(f.fwd.x, 0, f.fwd.z).normalize();
        const u = t - F0.start + 0.8;
        const p = f.pos.clone().addScaledVector(fwd, 56 + 7 * k)
          .addScaledVector(f.right, -16 + 5.5 * u + 4 * k)
          .addScaledVector(UP, 20 + 2.2 * k + 0.8 * Math.sin(t * 1.7 + k * 2));
        g.matrix.makeBasis(f.right.clone(), UP.clone(), fwd.clone().negate()).setPosition(p);
        const flap = Math.sin(t * 7 + k * 1.9) * 0.7;
        wings[0]!.rotation.z = flap; wings[1]!.rotation.z = -flap;
      }
    },
  };
}
