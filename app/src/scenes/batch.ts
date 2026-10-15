// Static batching: the meshes of a still part of the world (scenes/zones.ts) that could share a draw merged into one
// mesh per material. The world is ~12 000 separate meshes (a parked car alone ~68), and every render walks and draws
// each — for the lens and for each shadow map: three's cost per frame was those walks, not the pixels (the user,
// 2026-10-15: "the world is still pretty laggy"). Merged, a part is a few meshes under its own root.
// Left as they are: a mesh with a name (code may look it up), one hidden or under a hidden group (it may be shown), an
// instanced or skinned mesh, one with several materials, interleaved attributes, morph targets, its own render hook or
// user data.
// Browser and bun (no DOM).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Whether a mesh under `root` can be merged into it (see above). */
function mergeable(o: THREE.Object3D, root: THREE.Object3D): o is THREE.Mesh {
  const m = o as THREE.Mesh;
  if (!m.isMesh || (m as THREE.InstancedMesh).isInstancedMesh || (m as THREE.SkinnedMesh).isSkinnedMesh || Array.isArray(m.material)) return false;
  if (Object.values(m.geometry.attributes).some((a) => (a as THREE.InterleavedBufferAttribute).isInterleavedBufferAttribute)) return false;
  if (m.name || Object.keys(m.userData).length || Object.keys(m.geometry.morphAttributes).length || m.onBeforeRender !== THREE.Object3D.prototype.onBeforeRender) return false;
  for (let p: THREE.Object3D | null = m; p && p !== root; p = p.parent) if (!p.visible) return false;
  return true;
}

/** What has to be the same for two meshes to share a draw: the material, the shadows' flags, the order and layers, and
 *  the geometry's attributes (names, sizes, types) and whether it's indexed. */
function key(m: THREE.Mesh): string {
  const g = m.geometry, attrs = Object.entries(g.attributes).map(([n, a]) => `${n}:${a.itemSize}:${a.normalized ? 1 : 0}:${(a as THREE.BufferAttribute).array.constructor.name}`).sort().join(',');
  return `${(m.material as THREE.Material).uuid}|${m.castShadow ? 1 : 0}${m.receiveShadow ? 1 : 0}|${m.renderOrder}|${m.layers.mask}|${g.index ? 'i' : 'n'}|${attrs}`;
}

/** Turns a geometry's triangles the other way round (baked under a mirroring transform, they'd face inside out). */
function flip(g: THREE.BufferGeometry) {
  if (g.index) { const a = g.index.array; for (let i = 0; i + 2 < a.length; i += 3) { const t = a[i + 1]!; a[i + 1] = a[i + 2]!; a[i + 2] = t; } g.index.needsUpdate = true; return; }
  for (const attr of Object.values(g.attributes) as THREE.BufferAttribute[]) {
    const a = attr.array, s = attr.itemSize;
    for (let v = 0; v + 2 < attr.count; v += 3) for (let c = 0; c < s; c++) { const t = a[(v + 1) * s + c]!; a[(v + 1) * s + c] = a[(v + 2) * s + c]!; a[(v + 2) * s + c] = t; }
    attr.needsUpdate = true;
  }
}

/** Merges the meshes under `root` (not root itself) that can share a draw, one merged mesh per kind under `root`; the
 *  originals are taken out (their geometries, maybe shared, are left alone). Returns how many meshes it took out. */
export function batch(root: THREE.Object3D): number {
  root.updateMatrixWorld(true);
  const inv = root.matrixWorld.clone().invert(), kinds = new Map<string, THREE.Mesh[]>();
  root.traverse((o) => { if (o !== root && mergeable(o, root)) { const k = key(o); (kinds.get(k) ?? kinds.set(k, []).get(k)!).push(o); } });
  let removed = 0;
  for (const meshes of kinds.values()) {
    if (meshes.length < 2) continue;
    const geos = meshes.map((m) => {
      const rel = inv.clone().multiply(m.matrixWorld), g = m.geometry.clone().applyMatrix4(rel);
      if (rel.determinant() < 0) flip(g);
      g.clearGroups();
      return g;
    });
    const merged = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    if (!merged) continue;
    const first = meshes[0]!, m = new THREE.Mesh(merged, first.material);
    m.castShadow = first.castShadow; m.receiveShadow = first.receiveShadow; m.renderOrder = first.renderOrder; m.layers.mask = first.layers.mask;
    root.add(m);
    for (const o of meshes) o.removeFromParent();
    removed += meshes.length - 1;
  }
  return removed;
}
