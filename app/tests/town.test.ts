// The town's buildings: none stands on the road anywhere (a row set back from one stretch can stand on the road where
// it bends back past them), and every facade stays inside the box the guard checks (look/facades.ts).
import { expect, test } from 'bun:test';
import * as THREE from 'three';
import { makeDrive } from '../src/drive/drive';
import { ROAD_HALF } from '../src/drive/route';
import { ROAD_START, placeSignHits, placeSpots } from '../src/drive/world';
import { facadeOf } from '../src/look/facades';
import { LENS, placeCamera } from '../src/drive/camera';
import { type Verse2Plan, tireShop } from '../src/drive/sets/verse2';
import { audio, lyrics } from './data';

const drive = makeDrive(audio, lyrics);
/** The road's centre line every 2 m (flat: x, z). */
const road: [number, number][] = [];
for (let s = ROAD_START; s <= drive.route.length; s += 2) { const p = drive.route.frameAt(s).pos; road.push([p.x, p.z]); }
/** A footprint's sample points: a 5 x 5 grid over its base, in the unit box. */
const GRID = [-0.5, -0.25, 0, 0.25, 0.5].flatMap((x) => [-0.5, -0.25, 0, 0.25, 0.5].map((z) => [x, z] as const));

test('no building stands on the road', () => {
  const on: string[] = [];
  drive.blocks.forEach((b, i) => {
    if (b.concrete || b.car) return; // (a freeway's barriers and walls stand at its edge by design; a parked car on it)
    // (an arch over the road stands on its pylons: its own footprint is overhead)
    const base = new THREE.Vector3(0, -0.5, 0).applyMatrix4(b.matrix).y - drive.route.frameAt(b.s).pos.y;
    if (base > 2.5) return;
    let near = Infinity;
    for (const [x, z] of GRID) {
      const p = new THREE.Vector3(x, -0.5, z).applyMatrix4(b.matrix);
      for (const [rx, rz] of road) near = Math.min(near, Math.hypot(rx - p.x, rz - p.z));
    }
    if (near < ROAD_HALF + 0.5) on.push(`block ${i} s=${b.s.toFixed(0)} lateral=${b.lateral.toFixed(0)}: ${near.toFixed(1)} m from the centre line`);
  });
  expect(on).toEqual([]);
});

test('every facade stays inside its block: the box the guard checks', () => {
  const out: string[] = [];
  drive.blocks.forEach((b, i) => {
    if (b.concrete || b.prop) return;
    const inv = b.matrix.clone().invert();
    // (each front as the town builds it, its own treatment, and plain, as a set's own fronts are)
    for (const [name, g] of [...Object.entries(facadeOf(b)), ...Object.entries(facadeOf(b, { vary: true })).map(([k, g]) => [`${k} (varied)`, g] as const)]) {
      const p = g.getAttribute('position'), v = new THREE.Vector3();
      for (let k = 0; k < p.count; k++) {
        v.fromBufferAttribute(p, k).applyMatrix4(inv);
        if (Math.max(Math.abs(v.x), Math.abs(v.y), Math.abs(v.z)) > 0.5 + 1e-3) { out.push(`block ${i} ${name}: (${v.toArray().map((x) => x.toFixed(3)).join(', ')})`); break; }
      }
    }
  });
  expect(out).toEqual([]);
});

test("the places' signs stand clear of the buildings, near the lines that name them", () => {
  const bad: string[] = [];
  for (const p of placeSpots(drive)) {
    if (placeSignHits(drive, p.pos, p.face, drive.route.frameAt(p.s).pos.y)) bad.push(`${p.name} at s=${p.s.toFixed(0)}: in a building`);
    if (p.s - p.want > 40) bad.push(`${p.name}: ${(p.s - p.want).toFixed(0)} m on from its line`);
  }
  expect(bad).toEqual([]);
});

test("the tire shop's blank end the set dresses stands in the car wash's shot (scenes/sets/verse2.ts)", () => {
  // (the set finds it among the town's blocks, which are seeded: a reseeded town could lose it, and its dressing with it)
  const plan = drive.plans.verse2 as Verse2Plan, b = tireShop(drive.blocks, plan.wash.s);
  expect(b).toBeDefined();
  const wash = drive.carriers.filter((c) => c.kind === 'carwash'), t = (wash[0]!.phrase.start + wash[wash.length - 1]!.phrase.end) / 2;
  const cam = new THREE.PerspectiveCamera(LENS.fov, 16 / 9, LENS.near, LENS.far);
  placeCamera(cam, drive.camera(t)); cam.updateMatrixWorld();
  // (its near end's middle, half way up)
  const p = new THREE.Vector3(0, 0.5 - b!.h / 2 / new THREE.Vector3().setFromMatrixColumn(b!.matrix, 1).length(), -0.5).applyMatrix4(b!.matrix).project(cam);
  expect(Math.abs(p.x) < 1 && Math.abs(p.y) < 1 && p.z < 1).toBe(true);
});
