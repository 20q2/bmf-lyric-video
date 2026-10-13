// The town's buildings: none stands on the road anywhere (a row set back from one stretch can stand on the road where
// it bends back past them), and every facade stays inside the box the guard checks (look/facades.ts).
import { expect, test } from 'bun:test';
import * as THREE from 'three';
import { makeDrive } from '../src/drive/drive';
import { ROAD_HALF } from '../src/drive/route';
import { ROAD_START } from '../src/drive/world';
import { facadeOf } from '../src/look/facades';
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
    if (b.concrete) return; // (a freeway's barriers and walls stand at its edge by design)
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
    const inv = b.matrix.clone().invert(), f = facadeOf(b);
    for (const [name, g] of Object.entries(f)) {
      const p = g.getAttribute('position'), v = new THREE.Vector3();
      for (let k = 0; k < p.count; k++) {
        v.fromBufferAttribute(p, k).applyMatrix4(inv);
        if (Math.max(Math.abs(v.x), Math.abs(v.y), Math.abs(v.z)) > 0.5 + 1e-3) { out.push(`block ${i} ${name}: (${v.toArray().map((x) => x.toFixed(3)).join(', ')})`); break; }
      }
    }
  });
  expect(out).toEqual([]);
});
