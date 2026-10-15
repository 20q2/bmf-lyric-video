// Off-screen culling: the parts of the world that never move, hidden for a frame when nothing in them can be seen or
// cast a shadow that can. three has no hierarchy of bounds: every render walks the whole world (~16 500 objects) once
// for the lens and once for each shadow map, testing every mesh, wherever the camera is — the beach set's 5000 at the
// city's first light, every parked car on the route. Hidden, a part's whole subtree is skipped by all four walks.
//   parts    found once, at load: the world is posed at times through the song (`pose`: the sets' own update, the
//            car on the road) and anything whose place changes between them — a matrix, an instanced mesh's
//            instances, a skeleton, a geometry — moves; so does anything hidden at any of them: the sets' traffic and
//            walkers are placed only while shown, and a window between two poses would never see them move (the
//            intro's crossing truck was hidden at its load-time place). A subtree with nothing moving in it is still. Still subtrees
//            are the parts (big ones split into their children); what moves is left to three's own culling. A light
//            counts as moving (hidden, it would stop lighting what's seen), and so does a mesh three is told not to
//            cull, unless it's instanced (its instances' bounds are known; another may be shaped in its shader).
//   frame    `hide` before the render, `restore` after: the parts' own visibility (set by the sets, the carriers,
//            ?hide=) is never touched between renders.
// Browser and bun (no DOM).
import * as THREE from 'three';

/** A still subtree bigger than this (objects) is split into its children: finer culling, a few more tests. */
const MOST = 64;
/** Each part's bounds are this much wider (m): what wobbles in place between poses (the chicken shop's roof bird). */
const PAD = 2;
/** What's kept of an object at each pose: its matrix and its position, rotation and scale, the versions of what moves
 *  it from inside, whether it's shown. */
const N = 28;

export class Zones {
  private parts: { o: THREE.Object3D; s: THREE.Sphere }[] = [];
  private hid: THREE.Object3D[] = [];

  /** `roots`: the world's, of which `posed` move with `pose` (the rest never move: they're not posed). */
  constructor(roots: THREE.Object3D[], posed: THREE.Object3D[], pose: (t: number) => void, times: number[]) {
    const nodes: THREE.Object3D[] = [], sampled: number[] = [];
    for (const r of roots) r.traverse((o) => { if (posed.includes(r)) sampled.push(nodes.length); nodes.push(o); });
    const moves = new Uint8Array(nodes.length);
    nodes.forEach((o, k) => { if ((o as THREE.Light).isLight || (o as THREE.SkinnedMesh).isSkinnedMesh || (!o.frustumCulled && !(o as THREE.InstancedMesh).isInstancedMesh)) moves[k] = 1; });
    // (each posed object's place at a time, as its parent holds it — a move carries to its children below — the
    // versions of what moves it from inside, and whether it's shown)
    const attrs = nodes.map((o) => Object.values(((o as THREE.Mesh).geometry as THREE.BufferGeometry | undefined)?.attributes ?? {}) as THREE.BufferAttribute[]);
    const sign = (k: number, out: Float64Array) => {
      const o = nodes[k]!, inst = o as THREE.InstancedMesh, m = o.matrix.elements, p = o.position, q = o.quaternion, sc = o.scale;
      for (let e = 0; e < 16; e++) out[e] = m[e]!;
      out[16] = p.x; out[17] = p.y; out[18] = p.z; out[19] = q.x; out[20] = q.y; out[21] = q.z; out[22] = q.w; out[23] = sc.x; out[24] = sc.y; out[25] = sc.z;
      let v = inst.isInstancedMesh ? inst.instanceMatrix.version : 0;
      for (const a of attrs[k]!) v += a.version;
      out[26] = v;
      out[27] = o.visible ? 0 : NaN;
    };
    const first = new Float64Array(nodes.length * N), now = new Float64Array(N);
    times.forEach((t, j) => {
      pose(t);
      for (const k of sampled) {
        if (moves[k]) continue;
        const b = k * N;
        if (!j) { sign(k, now); first.set(now, b); }
        else sign(k, now);
        for (let e = 0; e < N; e++) if (!(now[e] === first[b + e])) { moves[k] = 1; break; }
      }
    });
    const index = new Map(nodes.map((o, k) => [o, k]));
    const still = new Map<THREE.Object3D, boolean>(), size = new Map<THREE.Object3D, number>();
    const walk = (o: THREE.Object3D, carried = false): boolean => {
      const k = index.get(o)!;
      if (carried) moves[k] = 1;
      let s = !moves[k], n = 1;
      for (const c of o.children) { s = walk(c, !!moves[k]) && s; n += size.get(c)!; }
      still.set(o, s); size.set(o, n);
      return s;
    };
    roots.forEach((r) => walk(r));
    // (the unposed roots' places too: nothing has rendered yet, so nothing has worked them out)
    for (const r of roots) r.updateMatrixWorld(true);
    const box = new THREE.Box3();
    const part = (o: THREE.Object3D) => {
      if (still.get(o) && (size.get(o)! <= MOST || !o.children.length)) {
        if (!box.setFromObject(o).isEmpty()) { const s = box.getBoundingSphere(new THREE.Sphere()); s.radius += PAD; this.parts.push({ o, s }); }
      } else o.children.forEach(part); // (o's own mesh, if any, isn't culled)
    };
    roots.forEach(part);
  }

  /** Hides the parts `sees` rules out (for this frame's render). */
  hide(sees: (s: THREE.Sphere) => boolean) {
    for (const { o, s } of this.parts) if (o.visible && !sees(s)) { o.visible = false; this.hid.push(o); }
  }

  /** Shows them again (after the render). */
  restore() {
    for (const o of this.hid) o.visible = true;
    this.hid.length = 0;
  }
}
