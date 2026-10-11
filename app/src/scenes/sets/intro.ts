// The intro's props (drive/sets/intro.ts): the corner where the car waits at the light — the street signs on the near
// corner's pole (BMF BLVD along the road over SZA AVE across it: the title), the stop line and crosswalks, the cross
// street, the far corner's mast with its signal heads over the lanes (red, then green on the first kick), its lit street
// sign, and the walk countdown ticking off the last beats. Browser only (canvas).
import * as THREE from 'three';
import type { Drive } from '../../drive/drive';
import { LANE } from '../../drive/drive';
import { CORNER, COUNTDOWN, type IntroPlan, MAST, SIGNS } from '../../drive/sets/intro';
import { ROAD_HALF } from '../../drive/route';
import { WORLD, toon } from '../../look/toon';
import { GLOW, lampMaterial } from '../../look/night';
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
const cyl = (g: THREE.Object3D, r: number, h: number, x: number, y: number, z: number, m: THREE.Material) => {
  const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 12), m); c.position.set(x, y, z); g.add(c); return c;
};
/** A street-name blade's face: LA's green, a white border, the name big, its suffix and block number small. */
const blade = (name: string, suffix: string, block: string) => canvasTex(1024, 220, (c) => {
  c.fillStyle = '#1f6b44'; c.fillRect(0, 0, 1024, 220);
  c.strokeStyle = '#f4f4f0'; c.lineWidth = 10; c.strokeRect(14, 14, 996, 192);
  c.fillStyle = '#f4f4f0'; c.textBaseline = 'middle';
  c.font = font(F.archivo(100, 700), 34); c.fillText(block, 46, 110);
  c.font = font(F.archivo(100, 900), 150); c.textAlign = 'center'; c.fillText(name, 540, 120);
  c.font = font(F.archivo(100, 700), 60); c.textAlign = 'right'; c.fillText(suffix, 980, 132);
});

export function buildIntro(drive: Drive): { group: THREE.Group; update(t: number): void } | null {
  const plan = drive.plans.intro as IntroPlan | undefined;
  if (!plan) return null;
  const { route } = drive, root = new THREE.Group(), C = CORNER;
  /** A group in the road's frame at s (x to its left, y up, z forward), `lateral` right of its centre. */
  const onRoad = (s: number, lateral: number) => {
    const f = route.frameAt(s), g = new THREE.Group(), fwd = new THREE.Vector3(f.fwd.x, 0, f.fwd.z).normalize(), right = new THREE.Vector3(f.right.x, 0, f.right.z).normalize();
    g.matrixAutoUpdate = false;
    g.matrix.makeBasis(right.negate(), UP, fwd).setPosition(f.pos.clone().addScaledVector(f.right, lateral));
    root.add(g);
    return g;
  };
  const dark = toon({ color: WORLD.post }), black = toon({ color: '#1b1820' }), paint = new THREE.MeshBasicMaterial({ color: WORLD.dash });

  // the stop line (their half), the crosswalks either side of the cross street, the cross street's asphalt
  box(onRoad(C.stopLine, 0), ROAD_HALF, 0.02, 0.45, -ROAD_HALF / 2, 0.03, 0, paint);
  for (const ds of [C.cross[0] - 1.4, C.cross[1] + 1.4]) {
    const g = onRoad(ds, 0);
    for (let x = -ROAD_HALF + 0.4; x < ROAD_HALF; x += 1) box(g, 0.5, 0.02, 2.4, x, 0.03, 0, paint);
  }
  const cross = onRoad((C.cross[0] + C.cross[1]) / 2, 0), asphalt = toon({ color: WORLD.asphalt });
  for (const side of [-1, 1]) box(cross, 60, 0.04, C.cross[1] - C.cross[0], side * (ROAD_HALF + 30), 0, 0, asphalt);

  // the near corner's pole: BMF BLVD along the road, SZA AVE across it, each readable from both sides
  {
    const pole = onRoad(C.pole, SIGNS.lateral), W = 2.1, H = 0.45;
    // (the blades sit on top of the pole, a thin bracket between them: nothing in front of their faces)
    const top = SIGNS.across - H / 2 - 0.02;
    cyl(pole, 0.06, top, 0, top / 2, 0, dark);
    cyl(pole, 0.012, SIGNS.along - SIGNS.across, 0, (SIGNS.along + SIGNS.across) / 2, 0, dark);
    const along = blade('BMF', 'BLVD', '100'), across = blade('SZA', 'AVE', '400');
    // (a face's plane in its own frame: x along its text, y up, z out of it, so it reads from that side)
    const face = (tex: THREE.Texture, n: THREE.Vector3, y: number) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: tex }));
      m.matrixAutoUpdate = false;
      m.matrix.makeBasis(UP.clone().cross(n).normalize(), UP, n).setPosition(n.clone().multiplyScalar(0.012).add(new THREE.Vector3(0, y, 0)));
      pole.add(m);
    };
    // (the pole's frame: x the road's left, z along it; BMF BLVD's blade runs along the road, SZA AVE's across)
    box(pole, 0.02, H, W, 0, SIGNS.along, 0, toon({ color: '#1f6b44' }));
    face(along, new THREE.Vector3(1, 0, 0), SIGNS.along); face(along, new THREE.Vector3(-1, 0, 0), SIGNS.along);
    box(pole, W, H, 0.02, 0, SIGNS.across, 0, toon({ color: '#1f6b44' }));
    face(across, new THREE.Vector3(0, 0, -1), SIGNS.across); face(across, new THREE.Vector3(0, 0, 1), SIGNS.across);
  }

  // the far corner's mast: its arm out over the lanes, a signal head over each (red, then green), its lit street sign,
  // the walk countdown on the pole
  const lit = { red: [] as THREE.Object3D[], green: [] as THREE.Object3D[] };
  const count = { mesh: null as THREE.Mesh | null, faces: [] as THREE.Texture[] };
  {
    const mast = onRoad(C.mast, MAST.lateral), reach = MAST.lateral + LANE + 1.2;
    cyl(mast, 0.13, 6.4, 0, 3.2, 0, dark);
    box(mast, reach, 0.16, 0.16, reach / 2, 5.95, 0, dark); // (out over the road: to its left)
    for (const x of [MAST.lateral - LANE, MAST.lateral + LANE]) {
      box(mast, 0.42, 1.2, 0.32, x, MAST.headY, 0, black);
      for (const [k, color] of [[0, '#ff2a24'], [1, '#ffb000'], [2, '#3dff7a']] as const) {
        const y = MAST.headY + 0.37 - k * 0.37;
        const off = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), toon({ color: '#2a2630' })); off.position.set(x, y, -0.13); mast.add(off);
        if (k === 1) continue;
        const on = new THREE.Mesh(new THREE.SphereGeometry(0.115, 14, 10), lampMaterial(color, GLOW.lamp, 1.6)); on.position.set(x, y, -0.13); mast.add(on);
        (k === 0 ? lit.red : lit.green).push(on);
      }
    }
    const street = canvasTex(1024, 220, (c) => {
      c.fillStyle = '#1f6b44'; c.fillRect(0, 0, 1024, 220); c.strokeStyle = '#f4f4f0'; c.lineWidth = 10; c.strokeRect(14, 14, 996, 192);
      c.fillStyle = '#f4f4f0'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = font(F.archivo(100, 900), 140); c.fillText('SZA AV', 512, 118);
    });
    const ms = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.52), new THREE.MeshBasicMaterial({ map: street, color: new THREE.Color(1.3, 1.3, 1.3) }));
    ms.position.set(MAST.lateral, 5.95, -0.1); ms.rotation.y = Math.PI; mast.add(ms);
    // the countdown: orange digits on black, facing the waiting car
    box(mast, 0.5, 0.5, 0.25, 0, MAST.countY, -0.25, black);
    count.faces = Array.from({ length: COUNTDOWN + 1 }, (_, n) => canvasTex(256, 256, (c) => {
      c.fillStyle = '#0c0b0e'; c.fillRect(0, 0, 256, 256);
      if (!n) return;
      c.fillStyle = '#ff7a1a'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = font(F.mono(700), 200); c.fillText(String(n), 128, 140);
    }));
    count.mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), new THREE.MeshBasicMaterial({ map: count.faces[0]!, color: new THREE.Color(1.6, 1.6, 1.6) }));
    count.mesh.position.set(0, MAST.countY, -0.38); count.mesh.rotation.y = Math.PI; mast.add(count.mesh);
  }

  return {
    group: root,
    update(t) {
      const green = t >= plan.green;
      for (const o of lit.red) o.visible = !green;
      for (const o of lit.green) o.visible = green;
      // the countdown: from COUNTDOWN on its first beat down to 1 on its last, dark once it's green
      const k = plan.countdown.findLastIndex((b) => t >= b), n = k < 0 || green ? 0 : COUNTDOWN - k;
      const m = count.mesh!.material as THREE.MeshBasicMaterial;
      if (m.map !== count.faces[n]) { m.map = count.faces[n]!; m.needsUpdate = true; }
    },
  };
}
