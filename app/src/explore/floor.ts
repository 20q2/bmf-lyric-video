// What's under the explorer's camera: the height of the first solid surface straight down from a point (the ground, a
// roof, the car), so flying can't sink through the world into its underside (the user, 2026-10-25: Ctrl held took the
// camera under the city). Solid is what casts a shadow (scenes/drive.ts: everything lit, not the lettering or the sky);
// hidden parts are skipped (three's own raycaster tests them too), and so are instanced things (palms, parked cars: a
// floor needn't know them, and three tests their every instance).
//   Every mesh of any size (the city's blocks merged into one: ~790 000 triangles, ~120 ms a ray through three's
//   raycast — the site flew at 6 fps) gets a grid of its triangles by where they stand on the ground, built once
//   (warmFloor, at load): a ray down then tests only the few in its cell. A look-up came to ~2 ms. Browser and bun.
import * as THREE from 'three';

/** A mesh with more triangles than this is gridded (smaller ones go through three's raycast); the grid's cells (m). */
const BIG = 2000;
const CELL = 8;

interface Grid {
  /** The mesh's place when it was gridded (gridded again if it moves). */
  at: THREE.Matrix4;
  /** Its vertices in the world, its triangles' corners (vertex numbers, 3 a triangle). */
  pos: Float32Array;
  tri: Uint32Array;
  x0: number; z0: number; nx: number; nz: number;
  /** Cell c's triangles: list[start[c] .. start[c + 1]). */
  start: Uint32Array;
  list: Uint32Array;
}
const grids = new WeakMap<THREE.Mesh, Grid>();

function gridOf(m: THREE.Mesh): Grid {
  const g = m.geometry, p = g.attributes.position!, n = p.count;
  const pos = new Float32Array(n * 3), v = new THREE.Vector3();
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld);
    pos[3 * i] = v.x; pos[3 * i + 1] = v.y; pos[3 * i + 2] = v.z;
    x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); z0 = Math.min(z0, v.z); z1 = Math.max(z1, v.z);
  }
  const tri = g.index ? Uint32Array.from(g.index.array as ArrayLike<number>) : Uint32Array.from({ length: n - (n % 3) }, (_, i) => i);
  const nx = Math.max(1, Math.ceil((x1 - x0) / CELL)), nz = Math.max(1, Math.ceil((z1 - z0) / CELL)), nt = tri.length / 3;
  // each triangle in every cell its footprint's box covers: counted, then placed
  const span = (k: number) => {
    let ax = Infinity, az = Infinity, bx = -Infinity, bz = -Infinity;
    for (let j = 0; j < 3; j++) { const c = tri[3 * k + j]! * 3; ax = Math.min(ax, pos[c]!); bx = Math.max(bx, pos[c]!); az = Math.min(az, pos[c + 2]!); bz = Math.max(bz, pos[c + 2]!); }
    return [Math.min(nx - 1, Math.floor((ax - x0) / CELL)), Math.min(nx - 1, Math.floor((bx - x0) / CELL)), Math.min(nz - 1, Math.floor((az - z0) / CELL)), Math.min(nz - 1, Math.floor((bz - z0) / CELL))] as const;
  };
  const start = new Uint32Array(nx * nz + 1);
  for (let k = 0; k < nt; k++) { const [i0, i1, j0, j1] = span(k); for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) start[j * nx + i + 1]!++; }
  for (let c = 0; c < nx * nz; c++) start[c + 1]! += start[c]!;
  const list = new Uint32Array(start[nx * nz]!), fill = start.slice(0, nx * nz);
  for (let k = 0; k < nt; k++) { const [i0, i1, j0, j1] = span(k); for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) list[fill[j * nx + i]!++] = k; }
  const grid = { at: m.matrixWorld.clone(), pos, tri, x0, z0, nx, nz, start, list };
  grids.set(m, grid);
  return grid;
}

/** The highest of the gridded mesh's surfaces straight under (x, y, z) and no lower than `low` (or `best`, if higher). */
function gridFloor(gr: Grid, x: number, y: number, z: number, low: number, best: number | null): number | null {
  const i = Math.floor((x - gr.x0) / CELL), j = Math.floor((z - gr.z0) / CELL);
  if (i < 0 || j < 0 || i >= gr.nx || j >= gr.nz) return best;
  const { pos, tri, list } = gr, c = j * gr.nx + i;
  for (let q = gr.start[c]!; q < gr.start[c + 1]!; q++) {
    const k = list[q]! * 3, a = tri[k]! * 3, b = tri[k + 1]! * 3, d = tri[k + 2]! * 3;
    const ax = pos[a]!, az = pos[a + 2]!, bx = pos[b]!, bz = pos[b + 2]!, cx = pos[d]!, cz = pos[d + 2]!;
    const det = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
    if (Math.abs(det) < 1e-9) continue; // (a wall: no floor)
    const l1 = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / det, l2 = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / det, l3 = 1 - l1 - l2;
    if (l1 < -1e-6 || l2 < -1e-6 || l3 < -1e-6) continue;
    const h = l1 * pos[a + 1]! + l2 * pos[b + 1]! + l3 * pos[d + 1]!;
    if (h <= y && h >= low && (best === null || h > best)) best = h;
  }
  return best;
}

const ray = new THREE.Raycaster();
const DOWN = new THREE.Vector3(0, -1, 0);
const hits: THREE.Intersection[] = [];
const isBig = (m: THREE.Mesh) => !(m as THREE.InstancedMesh).isInstancedMesh && (m.geometry.index?.count ?? m.geometry.attributes.position?.count ?? 0) / 3 > BIG;

/** The highest solid surface under `p` within `reach` m (null: nothing under it). */
export function floorUnder(root: THREE.Object3D, p: THREE.Vector3, reach = 600): number | null {
  ray.set(p, DOWN);
  ray.far = reach;
  hits.length = 0;
  let top: number | null = null;
  const walk = (o: THREE.Object3D) => {
    if (!o.visible) return;
    const m = o as THREE.Mesh;
    if (m.isMesh && o.castShadow && !(m as THREE.InstancedMesh).isInstancedMesh) {
      // (a grid only while its mesh stands where it was gridded: what moves — the traffic, every car a few thousand
      // triangles — goes through three's raycast, its bounds first. Gridded again as it moved, each look-up rebuilt
      // every moving car's grid: 48 ms, the user's readout, 2026-10-25)
      const g = isBig(m) ? grids.get(m) : undefined;
      if (g && g.at.equals(m.matrixWorld)) top = gridFloor(g, p.x, p.y, p.z, p.y - reach, top);
      else o.raycast(ray, hits);
    }
    for (const c of o.children) walk(c);
  };
  walk(root);
  for (const h of hits) if (top === null || h.point.y > top) top = h.point.y;
  return top;
}

/** Grids every big solid mesh under `root` now, as it stands (at load: what's gridded is what never moves after). */
export function warmFloor(root: THREE.Object3D) {
  root.updateMatrixWorld(true);
  root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && o.castShadow && isBig(m)) gridOf(m); });
}
