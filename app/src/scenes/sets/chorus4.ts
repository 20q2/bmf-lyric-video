// Chorus 4's props (drive/sets/chorus4.ts): his biggest campaign — the giant painted board on the uphill side (its
// words are the carriers'; his portrait and the board's paint are here), its posts and catwalk — and the shift
// indicator's D flaring on the word "drive" (the indicator is the car's: look/dash.ts). Browser only (canvas).
import * as THREE from 'three';
import type { Drive } from '../../drive/drive';
import { BOARD, type Chorus4Plan } from '../../drive/sets/chorus4';
import { WORLD, toon } from '../../look/toon';
import { drawAd } from '../../look/adart';
import { box, canvasTex, onPanel, pic, plane } from './kit';
import { GLOW, glowMaterial, lampMaterial } from '../../look/night';

export function buildChorus4(drive: Drive): { group: THREE.Group; update(t: number, car: THREE.Object3D): void } | null {
  const plan = drive.plans.chorus4 as Chorus4Plan | undefined;
  if (!plan) return null;
  const root = new THREE.Group(), B = plan.board, dark = toon({ color: WORLD.post });

  // the board: his ad painted across it (the words' column is the carriers'), a frame, posts down the slope, a catwalk
  {
    const g = onPanel(B);
    const art = canvasTex(2048, Math.round((2048 * B.h) / B.w), (c) => drawAd(c, 'him', c.canvas.width, c.canvas.height, BOARD.text));
    plane(g, B.w, B.h, 0, 0, -0.03, pic(art));
    box(g, B.w + 0.8, B.h + 0.8, 0.5, 0, 0, -0.35, toon({ color: '#3a3043' }));
    const drop = B.center.y - drive.route.frameAt(plan.boardBlock.s).pos.y;
    for (const x of [-B.w / 3, 0, B.w / 3]) box(g, 0.5, drop + 2, 0.5, x, -(drop + 2) / 2 + B.h / 4 - 2, -0.7, dark);
    box(g, B.w * 0.9, 0.18, 1.1, 0, -B.h / 2 - 0.35, 0.35, dark); // the painters' catwalk
    for (let x = -B.w * 0.45; x <= B.w * 0.45; x += 3) box(g, 0.05, 1.0, 0.05, x, -B.h / 2 + 0.15, 0.85, dark); // its rail's posts
    box(g, B.w * 0.9, 0.05, 0.05, 0, -B.h / 2 + 0.65, 0.85, dark);
    // the floodlights: gooseneck lamps along the top edge lighting the board (it's night up here), their hoods and
    // bulbs, and the light's wash down the face
    const bulb = lampMaterial('#fff0c8', GLOW.lamp * 1.2, 0.5);
    for (let i = 0; i < 6; i++) {
      const x = -B.w / 2 + (B.w * (i + 0.5)) / 6;
      box(g, 0.08, 0.08, 2.2, x, B.h / 2 + 0.9, 0.9, dark); box(g, 0.08, 1.0, 0.08, x, B.h / 2 + 0.4, -0.2, dark); // the neck
      box(g, 0.7, 0.3, 0.5, x, B.h / 2 + 0.75, 1.9, dark); // the hood
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), bulb); b.position.set(x, B.h / 2 + 0.55, 1.9); g.add(b);
    }
    const wash = new THREE.Mesh(new THREE.PlaneGeometry(B.w, B.h), glowMaterial('#fff0c8', 0.5));
    wash.position.z = 0.04; wash.rotation.z = Math.PI; g.add(wash); // (the glow fades along v from its top edge: the plane turned, its top at the lamps)
    // cross bracing between the posts
    for (const x of [-B.w / 6, B.w / 6]) { const br = box(g, 0.2, Math.hypot(B.w / 3, 6), 0.2, x, -B.h / 2 - 4, -0.7, dark); br.rotation.z = Math.atan2(B.w / 3, 6); }
    root.add(g);
  }

  return {
    group: root,
    update(t, car) {
      // the D, flaring on "drive" and settling to lit for the rest of the night
      const d = car.getObjectByName('shiftD') as THREE.Mesh | undefined;
      if (!d) return;
      const tau = t - plan.driveAt;
      const base = tau >= 0 ? 2.2 : 0.35;
      const punch = tau >= 0 && tau < 0.8 ? 1.6 * Math.exp(-tau * 5) : 0;
      (d.material as THREE.MeshBasicMaterial).color.setScalar(base + punch);
    },
  };
}
