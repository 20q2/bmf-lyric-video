// The greybox world (M2): ground, road, blocks of buildings, palms, a few landmarks, the sign boards and the car with
// its two silhouettes. Plain lit colours, no textures but the signs' faces: the look comes in M3. Deterministic
// (seeded by position along the road).
import * as THREE from 'three';
import { hash } from '../engine/util';
import type { Drive } from './drive';
import type { Route } from './route';
import type { Sign } from './signs';
import type { Stretch } from './stretches';

const ROAD_HALF = 4;
const GROUND_HALF = 320;
const STEP = 2;

/** Per stretch: building heights (m, min–max; 0 = none), how many plots stay empty, and which sides are sea. */
const BLOCKS: Record<string, { h: [number, number]; empty: number; seaLeft?: boolean; far?: number }> = {
  intro: { h: [6, 10], empty: 0.5 },
  chorus1: { h: [8, 22], empty: 0.3 },
  verse1: { h: [14, 40], empty: 0.1 },
  chorus2: { h: [6, 14], empty: 0.6, far: 40 },
  verse2: { h: [4, 8], empty: 0.3 },
  chorus3: { h: [5, 10], empty: 0.6, seaLeft: true },
  bridge1: { h: [5, 9], empty: 0.7, seaLeft: true },
  verse3: { h: [8, 18], empty: 0.05 },
  chorus4: { h: [3, 6], empty: 0.8 },
  outro1: { h: [0, 0], empty: 1 },
};
const PALMS = new Set(['intro', 'chorus1', 'chorus3', 'bridge1', 'verse3']);

/** A strip along the road from `a` to `b` metres off its centre line (negative: left), coloured per sample. */
function strip(route: Route, a: number, b: number, dy: number, colorAt: (s: number) => THREE.Color): THREE.BufferGeometry {
  const n = Math.ceil(route.length / STEP) + 1, pos = new Float32Array(n * 6), col = new Float32Array(n * 6), idx: number[] = [];
  for (let i = 0; i < n; i++) {
    const s = Math.min(route.length, i * STEP), f = route.frameAt(s), c = colorAt(s);
    const p = f.pos.clone().addScaledVector(f.right, a), q = f.pos.clone().addScaledVector(f.right, b);
    pos.set([p.x, p.y + dy, p.z, q.x, q.y + dy, q.z], i * 6);
    col.set([c.r, c.g, c.b, c.r, c.g, c.b], i * 6);
    if (i > 0) { const o = (i - 1) * 2; idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function boxAt(route: Route, s: number, lateral: number, w: number, h: number, d: number, y0 = 0): THREE.Matrix4 {
  const f = route.frameAt(s), p = f.pos.clone().addScaledVector(f.right, lateral);
  const m = new THREE.Matrix4().makeBasis(f.right.clone().negate(), new THREE.Vector3(0, 1, 0), new THREE.Vector3(f.fwd.x, 0, f.fwd.z).normalize());
  m.scale(new THREE.Vector3(w, h, d));
  m.setPosition(p.x, p.y + y0 + h / 2, p.z);
  return m;
}

export function buildWorld(drive: Drive): THREE.Group {
  const { route, motion } = drive, g = new THREE.Group();
  const stretchAtS = (s: number): Stretch => {
    for (const st of drive.stretches) if (s < motion.distanceAt(st.end)) return st;
    return drive.stretches[drive.stretches.length - 1]!;
  };
  const lambert = (o: THREE.MeshLambertMaterialParameters = {}) => new THREE.MeshLambertMaterial({ vertexColors: true, ...o });

  // ground either side (the sea to the left along the coast), the road, its centre dashes
  const grass = new THREE.Color('#6f7a52'), sand = new THREE.Color('#b9a37a'), sea = new THREE.Color('#2f5f8a'), asphalt = new THREE.Color('#34343c');
  g.add(new THREE.Mesh(strip(route, -GROUND_HALF, -ROAD_HALF, -0.05, (s) => (BLOCKS[stretchAtS(s).id]!.seaLeft ? sea : grass)), lambert()));
  g.add(new THREE.Mesh(strip(route, ROAD_HALF, GROUND_HALF, -0.05, (s) => (BLOCKS[stretchAtS(s).id]!.seaLeft ? sand : grass)), lambert()));
  g.add(new THREE.Mesh(strip(route, -ROAD_HALF, ROAD_HALF, 0, () => asphalt), lambert()));
  const dashes = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: '#e8e2cf' }), Math.ceil(route.length / 8));
  for (let i = 0; i < dashes.count; i++) dashes.setMatrixAt(i, boxAt(route, i * 8, 0, 0.15, 0.02, 3, 0.01));
  g.add(dashes);

  // blocks either side, seeded by plot
  const mats: THREE.Matrix4[] = [], cols: THREE.Color[] = [];
  for (let k = 0; k * 22 < route.length; k++) {
    for (const side of [1, -1]) {
      const s = k * 22 + 11, st = stretchAtS(s), b = BLOCKS[st.id]!;
      if ((side === -1 && b.seaLeft) || hash(k, side, 1) < b.empty) continue;
      const w = 10 + 10 * hash(k, side, 2), d = 10 + 10 * hash(k, side, 3), h = b.h[0] + (b.h[1] - b.h[0]) * hash(k, side, 4);
      mats.push(boxAt(route, s, side * ((b.far ?? 18) + d / 2 + 6 * hash(k, side, 5)), w, h, d));
      cols.push(new THREE.Color().setHSL(0.08 + 0.1 * hash(k, side, 6), 0.15, 0.45 + 0.25 * hash(k, side, 7)));
    }
  }
  const blocks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial(), mats.length);
  mats.forEach((m, i) => { blocks.setMatrixAt(i, m); blocks.setColorAt(i, cols[i]!); });
  g.add(blocks);

  // palms: a trunk and a crown, behind the signs' line
  const trunks: THREE.Matrix4[] = [], crowns: THREE.Matrix4[] = [];
  for (let k = 0; k * 30 < route.length; k++) {
    const s = k * 30 + 5;
    if (!PALMS.has(stretchAtS(s).id)) continue;
    for (const side of [1, -1]) {
      if (side === -1 && BLOCKS[stretchAtS(s).id]!.seaLeft) continue;
      const h = 9 + 4 * hash(k, side, 8);
      trunks.push(boxAt(route, s, side * 11.5, 0.35, h, 0.35));
      crowns.push(boxAt(route, s, side * 11.5, 3.2, 1.2, 3.2, h));
    }
  }
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.5, 0.6, 1, 6), new THREE.MeshLambertMaterial({ color: '#5a4636' }), trunks.length);
  trunks.forEach((m, i) => trunk.setMatrixAt(i, m));
  const crown = new THREE.InstancedMesh(new THREE.SphereGeometry(0.5, 7, 4), new THREE.MeshLambertMaterial({ color: '#2f5a3a' }), crowns.length);
  crowns.forEach((m, i) => crown.setMatrixAt(i, m));
  g.add(trunk, crown);

  // the motel the car waits outside at the start
  const motel = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: '#e58fa8' }));
  motel.matrixAutoUpdate = false;
  motel.matrix.copy(boxAt(route, 4, 22, 34, 9, 14));
  g.add(motel);
  return g;
}

/** A sign's board, back and posts (or gantry), with its face's texture. */
export function buildSign(sign: Sign, face: THREE.Texture): THREE.Group {
  const g = new THREE.Group();
  const board = new THREE.Mesh(new THREE.PlaneGeometry(sign.w, sign.h), new THREE.MeshBasicMaterial({ map: face }));
  const back = new THREE.Mesh(new THREE.BoxGeometry(sign.w + 0.2, sign.h + 0.2, 0.15), new THREE.MeshLambertMaterial({ color: '#2a2a30' }));
  back.position.z = -0.1;
  g.add(board, back);
  const legH = sign.side === 0 ? 6 : 3.2 - sign.h / 2;
  const legX = sign.side === 0 ? 6.5 : sign.w / 2 - 0.6;
  for (const x of [-legX, legX]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, legH + sign.h / 2, 0.2), new THREE.MeshLambertMaterial({ color: '#4a4a52' }));
    leg.position.set(x, -(legH + sign.h / 2) / 2 + sign.h / 2 - (sign.side === 0 ? 0 : sign.h / 2), -0.2);
    g.add(leg);
  }
  g.position.copy(sign.center);
  g.lookAt(sign.center.clone().add(sign.normal));
  return g;
}

/** The car (a '64-ish convertible, nose +z) with its two silhouettes: him driving (left), her riding. */
export function buildCar(): THREE.Group {
  const g = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color: '#b3122e' }), dark = new THREE.MeshLambertMaterial({ color: '#141018' });
  const chrome = new THREE.MeshLambertMaterial({ color: '#c9c6bf' });
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); return b;
  };
  box(1.9, 0.55, 4.8, 0, 0.6, 0, paint); // body
  box(1.86, 0.18, 1.5, 0, 0.95, 1.55, paint); // hood
  box(1.86, 0.18, 1.2, 0, 0.95, -1.7, paint); // trunk deck
  box(1.7, 0.45, 0.06, 0, 1.25, 0.75, chrome); // windshield frame
  for (const z of [1.4, -1.45]) for (const x of [0.92, -0.92]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.25, 14), dark);
    w.rotation.z = Math.PI / 2; w.position.set(x, 0.36, z); g.add(w);
  }
  for (const x of [0.42, -0.42]) { // driver (+x: the car's left) and passenger
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.42, 4, 8), dark); torso.position.set(x, 1.2, -0.05); g.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 8), dark); head.position.set(x, 1.68, -0.02); g.add(head);
  }
  return g;
}
