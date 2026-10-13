// Chorus 2's props (drive/sets/chorus2.ts): the freeway's left side — the median barrier, the Metro's tracks at grade
// with their catenary, the train (three silver cars, a gold stripe) racing past, the sound wall (the drive's concrete
// blocks; his posters on it are carriers) — the big freeway sign's legs and beam, and the SLAUSON exit sign. Browser
// only (canvas).
import * as THREE from 'three';
import type { Drive } from '../../drive/drive';
import { LANE } from '../../drive/drive';
import { type Chorus2Plan, GANTRY, MEDIAN, TRAIN } from '../../drive/sets/chorus2';
import { ROAD_HALF } from '../../drive/route';
import { WORLD, toon } from '../../look/toon';
import { GLOW, lampMaterial } from '../../look/night';
import { F, font } from '../../engine/type';
import { sedan } from './kit';

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


export function buildChorus2(drive: Drive): { group: THREE.Group; update(t: number): void } | null {
  const plan = drive.plans.chorus2 as Chorus2Plan | undefined;
  if (!plan) return null;
  const { route } = drive, root = new THREE.Group();
  // (the freeway's furniture is put away as its stretch ends, before verse 2's first cut: its sound wall and catenary
  // stood in the chicken spot's frames)
  const freewayEnd = drive.stretches.find((st) => st.id === 'chorus2')?.end ?? Infinity;
  /** The road's frame at s (x to its left, y up, z forward), `lateral` right of its centre, on its surface. */
  const frameAt = (s: number, lateral: number, m = new THREE.Matrix4()) => {
    const f = route.frameAt(s), fwd = new THREE.Vector3(f.fwd.x, 0, f.fwd.z).normalize(), right = new THREE.Vector3(f.right.x, 0, f.right.z).normalize();
    return m.makeBasis(right.negate(), UP, fwd).setPosition(f.pos.clone().addScaledVector(f.right, lateral));
  };
  const onRoad = (s: number, lateral: number) => { const g = new THREE.Group(); g.matrixAutoUpdate = false; frameAt(s, lateral, g.matrix); root.add(g); return g; };
  const dark = toon({ color: WORLD.post }), concrete = toon({ color: '#b9ada0' }), steel = toon({ color: '#6d6a72' });

  // along the left side, in 10 m pieces that follow the road: the median barrier, the tracks' ballast and rails
  const STEP = 10, n = Math.ceil((plan.s1 - plan.s0) / STEP), piece = new THREE.Matrix4(), scale = new THREE.Matrix4();
  const strip = (lateral: number, w: number, h: number, y: number, mat: THREE.Material) => {
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, n);
    for (let k = 0; k < n; k++) {
      frameAt(plan.s0 + (k + 0.5) * STEP, lateral, piece);
      mesh.setMatrixAt(k, piece.multiply(scale.makeTranslation(0, y + h / 2, 0)).multiply(new THREE.Matrix4().makeScale(w, h, STEP + 0.05)));
    }
    root.add(mesh);
  };
  strip(MEDIAN.barrier, 0.6, MEDIAN.barrierH, 0, concrete);
  strip(MEDIAN.tracks, 4.2, 0.18, 0, toon({ color: '#7b6f68' }));
  for (const x of [-0.75, 0.75]) strip(MEDIAN.tracks + x, 0.08, 0.12, 0.18, steel);
  // the catenary: a pole every 40 m between the tracks and the wall, the wire over the tracks; through the posters'
  // run the poles keep their rhythm but stand at the boards' gaps, never over his face or the words
  strip(MEDIAN.tracks, 0.04, 0.04, 5.6, steel);
  const run = [plan.posters[0]! - 15, plan.posters[plan.posters.length - 1]! + 15];
  const poleAt = (s: number) => {
    const p = onRoad(s, MEDIAN.tracks - 2.6);
    box(p, 0.22, 6, 0.22, 0, 3, 0, steel);
    box(p, 2.8, 0.1, 0.1, -1.4, 5.8, 0, steel); // (its arm out over the tracks: to the road's right, the frame's -x)
  };
  for (let s = plan.s0 + 20; s < plan.s1; s += 40) if (s <= run[0]! || s >= run[1]!) poleAt(s);
  for (let i = 1; i < plan.posters.length; i += 2) poleAt((plan.posters[i - 1]! + plan.posters[i]!) / 2);

  // the train: three cars, silver with a gold stripe, a dark band of windows, red lamps on the last
  const cars: THREE.Group[] = [], body = toon({ color: '#d8dade' }), gold = toon({ color: '#e0a526' }), glass = toon({ color: '#1d2230' });
  for (let k = 0; k < TRAIN.cars; k++) {
    const c = new THREE.Group(); c.matrixAutoUpdate = false;
    box(c, 2 * TRAIN.half, TRAIN.h - 0.5, TRAIN.car, 0, 0.5 + (TRAIN.h - 0.5) / 2, 0, body);
    box(c, 2 * TRAIN.half + 0.02, 0.32, TRAIN.car + 0.02, 0, 1.35, 0, gold);
    box(c, 2 * TRAIN.half + 0.02, 0.9, TRAIN.car - 1.6, 0, 2.45, 0, glass);
    for (const z of [-TRAIN.car / 2 + 3, TRAIN.car / 2 - 3]) box(c, 2 * TRAIN.half - 0.4, 0.6, 2.2, 0, 0.3, z, dark);
    if (k === 0) for (const x of [-0.9, 0.9]) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.2), lampMaterial('#ff2a24', GLOW.tail, 1.1)); l.position.set(x, 1.1, -TRAIN.car / 2 - 0.02); l.rotation.y = Math.PI; c.add(l); }
    cars.push(c); root.add(c);
  }

  // the big freeway sign: its legs either side, its beam over the tops of its panels, a dark backing behind each
  {
    const top = Math.max(...plan.panels.map((p) => p.center.y + p.h / 2)) - route.frameAt(plan.gantryS).pos.y;
    const g = onRoad(plan.gantryS, 0);
    for (const lat of GANTRY.legs) box(g, 0.45, top + 0.6, 0.45, -lat, (top + 0.6) / 2, 0.4, steel); // (the frame's x is the road's left)
    box(g, GANTRY.legs[1] - GANTRY.legs[0] + 0.4, 0.5, 0.5, -(GANTRY.legs[0] + GANTRY.legs[1]) / 2, top + 0.35, 0.4, steel);
    for (const p of plan.panels) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(p.w + 0.2, p.h + 0.2, 0.12), toon({ color: '#154d31' }));
      b.position.copy(p.center).addScaledVector(p.normal, -0.08); b.lookAt(b.position.clone().add(p.normal)); root.add(b);
    }
  }

  // slower traffic in the outside lane, overtaken (the cheapest speed there is)
  const traffic = plan.traffic.map((T, i) => {
    const g = new THREE.Group(); g.matrixAutoUpdate = false;
    g.add(sedan({ color: ['#e8e2d2', '#5a6a7d', '#b0532e'][i % 3]! }));
    root.add(g);
    return { T, g };
  });

  // the SLAUSON exit sign over their lane, on a cantilever from the right shoulder
  {
    const g = onRoad(plan.exitS, ROAD_HALF + 2.5), tex = canvasTex(1024, 512, (c) => {
      c.fillStyle = '#1f6b44'; c.fillRect(0, 0, 1024, 512); c.strokeStyle = '#f4f4f0'; c.lineWidth = 12; c.strokeRect(18, 18, 988, 476);
      c.fillStyle = '#f4f4f0'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = font(F.sign(600), 140); c.fillText('Slauson Av', 512, 190);
      c.font = font(F.sign(500), 76); c.fillText('EXIT  1/4 MILE', 512, 360);
      c.fillStyle = '#ffd65a'; c.fillRect(760, 30, 230, 80); c.fillStyle = '#1f6b44'; c.font = font(F.sign(700), 50); c.fillText('EXIT 12', 875, 72);
    });
    box(g, 0.35, 7.6, 0.35, 0, 3.8, 0, steel);
    box(g, ROAD_HALF + 2.5 - LANE + 2.4, 0.3, 0.3, (ROAD_HALF + 2.5 - LANE + 2.4) / 2, 7.4, 0, steel); // (out over their lane: to the road's left)
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.3), new THREE.MeshBasicMaterial({ map: tex }));
    sign.position.set(ROAD_HALF + 2.5 - LANE, 6.1, -0.2); sign.rotation.y = Math.PI; g.add(sign);
  }

  const T = plan.train;
  return {
    group: root,
    update(t) {
      root.visible = t < freewayEnd && drive.motion.distanceAt(t) > plan.s0 - 400;
      const there = t >= T.from && t < T.until;
      for (const [k, c] of cars.entries()) {
        c.visible = there;
        if (there) frameAt(T.tailS + TRAIN.v * (t - T.at) + (k + 0.5) * TRAIN.car + k * TRAIN.gap, MEDIAN.tracks, c.matrix);
      }
      for (const { T: tr, g } of traffic) {
        const s = tr.s0 + tr.v * (t - tr.t0);
        g.visible = s > plan.s0 + 10 && s < plan.s1 - 5;
        if (g.visible) frameAt(s, tr.lat, g.matrix);
      }
    },
  };
}
