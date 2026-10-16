// The two of them in the car, modelled (the user, 2026-10-14: "the people in the car need a massive fidelity
// overhaul"): still the cast's flat dark — no faces, no skin — but people's shapes at a glance from every side the film
// sees them from. Every part is a smooth surface lofted through sculpted cross-sections (heads with a brow, a nose,
// lips and a chin in profile, ears; his cap's crown and curved bill; her hair's volume and its fall down her back;
// shoulders that slope from the neck, a chest, a waist), the limbs tubes through their joints, tapering. A rim on the
// silhouette's edge (strongest toward the sky) keeps their form against the dark cabin.
//   him  at the wheel (the car's left, +x), a jacket's collar, a gold chain, shades: his left arm straight out to the
//        wheel low on its rim, the lowrider's lean-back grip; his right along the bench's top behind her, and at the
//        end round her shoulders (on pivots, reached by poseCast)
//   her  beside him, her braids up in a bun on her crown, their length over her right shoulder and down her front
//        (bending between her head and her body as she turns: skinned), gold hoops, bangles, a fitted wine top; her
//        right arm on a pivot at the shoulder (the scene swings it out and up, cast.ts), its elbow straightening as it
//        rises; her left on pivots at the shoulder and elbow, its hand in her lap, or on her phone (holdPhone)
// The heads turn on pivots at the neck ('hisHead', 'herHead'), her arm on 'herArm', his right on 'hisArm': poseCast
// moves them by name (and her whole figure, 'her', as she leans into him at the end); verse 1 moves her left
// ('herLeftArm') to her phone.
// His campaign poster is drawn from this same model (`bustTriangles`, look/adart.ts): the same cap, the same profile.
// Browser and bun (no DOM).
import * as THREE from 'three';
import { printShadows, toon } from './toon';
import { NIGHT } from './night';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { WHEEL } from '../drive/cabin';

/** A cross-section, level: [y, x, back z, front z, half-width, front width share, squareness (2: an ellipse)]. */
type Sec = [number, number, number, number, number, number?, number?];

/** How finely the surfaces are cut (the poster's portrait is drawn from them at a few hundred px: twice as fine). */
let detail = 1;
const cr = (a: number, b: number, c: number, d: number, u: number) => 0.5 * (2 * b + (c - a) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (3 * b - a - 3 * c + d) * u * u * u);
const spow = (v: number, e: number) => Math.sign(v) * Math.pow(Math.abs(v), e);

/** A surface through rings of points (each ring the same count, wound round its axis), closed at either end. */
function skin(rings: THREE.Vector3[][]): THREE.BufferGeometry {
  const m = rings[0]!.length, pos: number[] = [], idx: number[] = [];
  for (const r of rings) for (const p of r) pos.push(p.x, p.y, p.z);
  for (let i = 0; i + 1 < rings.length; i++) for (let j = 0; j < m; j++) {
    const a = i * m + j, b = i * m + ((j + 1) % m), c = (i + 1) * m + ((j + 1) % m), d = (i + 1) * m + j;
    idx.push(a, c, b, a, d, c);
  }
  // the ends: a point at each ring's middle
  const mid = (r: THREE.Vector3[]) => r.reduce((s, p) => s.add(p), new THREE.Vector3()).divideScalar(r.length);
  const s0 = pos.length / 3, a = mid(rings[0]!); pos.push(a.x, a.y, a.z);
  const s1 = s0 + 1, b = mid(rings[rings.length - 1]!); pos.push(b.x, b.y, b.z);
  const last = (rings.length - 1) * m;
  for (let j = 0; j < m; j++) { idx.push(s0, j, (j + 1) % m); idx.push(s1, last + ((j + 1) % m), last + j); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** A form lofted through level cross-sections, smoothed between them (Catmull-Rom, `sub` rings a span); `shape`
 *  moves each point after (a surface made from another's: her hair's cap from her head). */
function loft(secs: Sec[], ring = 40, sub = 4, shape?: (p: THREE.Vector3) => void): THREE.BufferGeometry {
  ring *= detail; sub *= detail;
  const n = secs.length, get = (i: number) => { const s = secs[Math.max(0, Math.min(n - 1, i))]!; return [s[0], s[1], s[2], s[3], s[4], s[5] ?? 1, s[6] ?? 2]; };
  const rows: number[][] = [];
  for (let i = 0; i < n - 1; i++) for (let k = 0; k < sub; k++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    rows.push(p1.map((_, j) => cr(p0[j]!, p1[j]!, p2[j]!, p3[j]!, k / sub)));
  }
  rows.push(get(n - 1));
  const rings = rows.map(([y, x, z0, z1, rx, tf, p]) => {
    const e = 2 / p!, zm = (z0! + z1!) / 2, zh = Math.max(0, (z1! - z0!) / 2), w = Math.max(0, rx!), r: THREE.Vector3[] = [];
    for (let j = 0; j < ring; j++) {
      const th = (2 * Math.PI * j) / ring, c = Math.cos(th), s = Math.sin(th);
      r.push(new THREE.Vector3(x! + w * spow(c, e) * (s > 0 ? 1 + (tf! - 1) * s : 1), y!, zm + zh * spow(s, e)));
      if (shape) shape(r[j]!);
    }
    return r;
  });
  return skin(rings);
}

/** A limb: a tube through its joints, its radius set at each (between them eased), rounded at both ends; flattened
 *  across `up` by `flat` (a hand's palm). */
function tube(pts: THREE.Vector3[], radii: number[], up = new THREE.Vector3(0, 1, 0), flat = 1, ring = 20, seg = 36): THREE.BufferGeometry {
  ring *= detail; seg *= detail;
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal'), L = curve.getLength();
  // each joint's share of the length along the chord (near enough to the curve's for the radii)
  const chord = [0]; for (let i = 1; i < pts.length; i++) chord.push(chord[i - 1]! + pts[i]!.distanceTo(pts[i - 1]!));
  const total = chord[chord.length - 1]!;
  const radius = (u: number) => {
    const d = u * total; let i = 0; while (i < chord.length - 2 && d > chord[i + 1]!) i++;
    const v = Math.min(1, Math.max(0, (d - chord[i]!) / Math.max(1e-6, chord[i + 1]! - chord[i]!))), e = v * v * (3 - 2 * v);
    return radii[i]! + (radii[i + 1]! - radii[i]!) * e;
  };
  const rings: THREE.Vector3[][] = [];
  for (let k = 0; k <= seg; k++) {
    const u = k / seg, p = curve.getPointAt(u), t = curve.getTangentAt(u), r0 = radius(u);
    // rounded ends: a hemisphere's fall-off over the last radius of length
    const end = Math.min(u * L, (1 - u) * L), cap = end < r0 ? Math.sqrt(Math.max(0.02, 1 - (1 - end / r0) ** 2)) : 1, r = r0 * cap;
    const nrm = up.clone().addScaledVector(t, -t.dot(up)); if (nrm.lengthSq() < 1e-8) nrm.set(1, 0, 0).addScaledVector(t, -t.x);
    nrm.normalize();
    const bin = t.clone().cross(nrm).normalize(), ringPts: THREE.Vector3[] = [];
    for (let j = 0; j < ring; j++) {
      const a = (2 * Math.PI * j) / ring;
      ringPts.push(p.clone().addScaledVector(bin, r * Math.cos(a)).addScaledVector(nrm, r * flat * Math.sin(a)));
    }
    rings.push(ringPts);
  }
  return skin(rings);
}

/** The cast's dark with a rim: a lighter edge where the surface turns away from the eye, strongest on what faces the
 *  sky (shoulders, the head's top, the cap), dimmed by night (the scene's NIGHT). Toon-lit underneath, its shadows
 *  printed like the world's. */
const CAST_INK = '#140d18';
function castMaterial(color: THREE.ColorRepresentation = CAST_INK, rim: THREE.ColorRepresentation = '#5a2a4e'): THREE.MeshToonMaterial {
  const m = toon({ color }), r = new THREE.Color(rim);
  m.onBeforeCompile = (sh) => {
    printShadows(sh);
    sh.uniforms.castNight = NIGHT;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float castNight;`)
      .replace('#include <opaque_fragment>', `{
  float facing = clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0);
  float rim = smoothstep(0.66, 0.72, 1.0 - facing) * (0.45 + 0.55 * smoothstep(-0.3, 0.6, normal.y));
  outgoingLight += vec3(${r.r.toFixed(4)}, ${r.g.toFixed(4)}, ${r.b.toFixed(4)}) * rim * (1.0 - 0.6 * castNight);
}
#include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => `cast${rim}`;
  return m;
}

/** What each part is, for the poster (adart.ts): his skin and clothes, gold, or a lens. */
export type Tone = 'body' | 'gold' | 'lens';
interface Mats { body: THREE.Material; gold: THREE.Material; lens: THREE.Material; plain?: THREE.Material; top?: THREE.Material }
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const part = (to: THREE.Object3D, geo: THREE.BufferGeometry, mats: Mats, tone: Tone = 'body') => { const o = new THREE.Mesh(geo, mats[tone]); o.userData.tone = tone; to.add(o); return o; };
const blob = (to: THREE.Object3D, mats: Mats, at: THREE.Vector3, r: [number, number, number], tone: Tone = 'body') => { const o = part(to, new THREE.SphereGeometry(1, 20, 14), mats, tone); o.position.copy(at); o.scale.set(...r); return o; };

// ---- the heads (each about its pivot at the top of the neck; facing +z, m) ----
/** His head: chin, lips, the nose's base, cheekbones, the bridge's dip at the eyes, the brow, the forehead, the crown. */
const HIS_HEAD: Sec[] = [
  [-0.088, 0, 0.05, 0.072, 0.012], [-0.078, 0, 0.012, 0.086, 0.03, 0.8, 2.2], [-0.062, 0, -0.03, 0.094, 0.047, 0.66, 2.4],
  [-0.045, 0, -0.06, 0.098, 0.055, 0.62, 2.4], [-0.028, 0, -0.08, 0.093, 0.06, 0.62, 2.4], [-0.012, 0, -0.092, 0.103, 0.064, 0.64, 2.4],
  [0.004, 0, -0.1, 0.099, 0.068, 0.68, 2.4], [0.03, 0, -0.107, 0.095, 0.074, 0.74, 2.4], [0.056, 0, -0.111, 0.089, 0.077, 0.8, 2.5],
  [0.08, 0, -0.113, 0.098, 0.079, 0.84, 2.4], [0.11, 0, -0.111, 0.091, 0.078, 0.88, 2.3], [0.14, 0, -0.1, 0.073, 0.071, 0.9, 2.2],
  [0.162, 0, -0.08, 0.048, 0.055, 0.95, 2.1], [0.177, 0, -0.05, 0.016, 0.032, 1, 2], [0.184, 0, -0.022, -0.006, 0.008],
];
const HIS_NOSE: Sec[] = [
  [0.07, 0, 0.074, 0.092, 0.007], [0.05, 0, 0.074, 0.104, 0.009], [0.028, 0, 0.074, 0.117, 0.013], [0.013, 0, 0.074, 0.125, 0.018],
  [0.003, 0, 0.078, 0.117, 0.021], [-0.004, 0, 0.084, 0.104, 0.012],
];
/** His cap: its crown over the skull (the front panels standing tall), its bill curved and tipped a touch down. */
const CAP: Sec[] = [
  [0.096, 0, -0.123, 0.104, 0.086, 0.9, 2.4], [0.125, 0, -0.121, 0.102, 0.086, 0.9, 2.3], [0.153, 0, -0.111, 0.09, 0.08, 0.92, 2.2],
  [0.176, 0, -0.089, 0.064, 0.065, 0.95, 2.1], [0.193, 0, -0.058, 0.032, 0.04, 1, 2], [0.201, 0, -0.026, 0.002, 0.012],
];
/** Her head: finer than his, and a woman's in profile — the forehead's curve, a small brow, a nose with a lift at its
 *  tip, full lips (the upper's a touch forward of the lower), a small, defined chin, the jaw angling back to the neck. */
const HER_HEAD: Sec[] = [
  [-0.088, 0, 0.034, 0.058, 0.011], [-0.08, 0, -0.002, 0.075, 0.027, 0.8, 2.2], [-0.068, 0, -0.035, 0.083, 0.039, 0.62, 2.3],
  [-0.055, 0, -0.06, 0.078, 0.047, 0.58, 2.3], [-0.042, 0, -0.075, 0.092, 0.052, 0.56, 2.3], [-0.031, 0, -0.084, 0.086, 0.055, 0.58, 2.3],
  [-0.02, 0, -0.09, 0.097, 0.058, 0.6, 2.3], [-0.007, 0, -0.095, 0.091, 0.062, 0.66, 2.4], [0.012, 0, -0.1, 0.09, 0.066, 0.7, 2.4],
  [0.034, 0, -0.104, 0.087, 0.069, 0.76, 2.4], [0.055, 0, -0.107, 0.082, 0.071, 0.8, 2.4], [0.072, 0, -0.108, 0.091, 0.072, 0.84, 2.3],
  [0.1, 0, -0.106, 0.088, 0.071, 0.88, 2.2], [0.128, 0, -0.097, 0.074, 0.066, 0.9, 2.2], [0.15, 0, -0.08, 0.051, 0.052, 0.95, 2.1],
  [0.165, 0, -0.052, 0.02, 0.032, 1, 2], [0.171, 0, -0.024, -0.004, 0.008],
];
const HER_NOSE: Sec[] = [
  [0.062, 0, 0.068, 0.083, 0.006], [0.044, 0, 0.068, 0.093, 0.008], [0.026, 0, 0.068, 0.103, 0.011], [0.014, 0, 0.068, 0.109, 0.015],
  [0.005, 0, 0.072, 0.105, 0.017], [-0.003, 0, 0.078, 0.095, 0.01],
];
/** Her hair (the user, 2026-10-15: "our main girls here need some work"; from behind, her head and its 41 locs read as a
 *  ribbed barrel): her braids pulled back off her face — close over her skull, so her head's shape, her neck and her
 *  shoulders read from behind — and up into a bun high on her crown, coiled; their length falls from under it over her
 *  right shoulder (the door's) and down her front. The cap of it: the head's sections, `over` out from them, cut back
 *  from her face at the hairline (each level's front no further than `line`: the forehead's top, the temples, behind
 *  her ears, the nape). */
const HAIR = {
  over: 0.007, squat: 0.9,
  line: [[0.2, 1], [0.126, 0.072], [0.095, 0.035], [0.06, -0.022], [0.0, -0.04], [-0.04, -0.056], [-0.07, -0.06]] as [number, number][],
  /** The bun: its base's middle on her crown (her head's frame), the way it stands (tipped back), its coil's radius at
   *  the foot and the top, its turns, its rise, the braid's thickness. */
  bun: { at: V(0, 0.15, -0.078), axis: V(0, 0.75, -0.66), r0: 0.05, r1: 0.011, turns: 2.5, rise: 0.072, thick: 0.02 },
  /** The fall: braids from under the bun, behind her right ear, round her neck, over her shoulder and down her front
   *  (her frame), each `r` thick; the head carries them down to `from`, her body from `to` (between, they bend: skinned). */
  fall: { n: 11, r: 0.0105, from: 1.64, to: 1.53 },
};
/** The hairline: how far forward her hair comes at height y (her head's frame). */
function hairline(y: number) {
  const L = HAIR.line; let i = 0; while (i < L.length - 2 && L[i + 1]![0] > y) i++;
  const [ya, za] = L[i]!, [yb, zb] = L[i + 1]!, u = Math.min(1, Math.max(0, (ya - y) / (ya - yb)));
  return za + (zb - za) * u;
}
function hairCap(): THREE.BufferGeometry {
  // (her head's own surface, blown out from its middle by `over`; where her face is, sunk back inside it)
  const O = V(0, 0.03, -0.012), v = new THREE.Vector3();
  return loft(HER_HEAD, 44, 4, (p) => {
    const inside = p.z > hairline(p.y);
    v.subVectors(p, O); const L = v.length();
    p.copy(O).addScaledVector(v, inside ? 0.86 : 1 + HAIR.over / L);
  });
}
/** The bun: one thick braid coiled from its foot up into its top, the turns stacked into a dome. */
function bunGeo(): THREE.BufferGeometry {
  const B = HAIR.bun, ax = B.axis.clone().normalize(), e1 = V(1, 0, 0), e2 = ax.clone().cross(e1).normalize(), pts: THREE.Vector3[] = [], radii: number[] = [];
  const n = Math.round(B.turns * 14);
  for (let k = 0; k <= n; k++) {
    const s = k / n, th = 2 * Math.PI * B.turns * s + 0.6, R = B.r0 + (B.r1 - B.r0) * s, h = B.rise * Math.sin((Math.PI / 2) * Math.min(1, s * 1.15));
    pts.push(B.at.clone().addScaledVector(e1, R * Math.cos(th)).addScaledVector(e2, R * Math.sin(th)).addScaledVector(ax, h));
    radii.push(B.thick * (1 - 0.35 * s * s));
  }
  return tube(pts, radii, ax, 1, 14, n * 3);
}
/** The braids' fall (her frame): each from under the bun's right side to its end on her front, fanned across the
 *  bundle and uneven at the ends. Returns each braid's points (the cuffs go on some of them). */
function fallPaths(): THREE.Vector3[][] {
  const F = FIGURE.her, H = (x: number, y: number, z: number) => V(x, y, z).add(F.head), out: THREE.Vector3[][] = [];
  // (the bundle's middle, and how far it opens at each point: tight from the bun, loosening down her front)
  const mid = [H(-0.03, 0.135, -0.11), H(-0.066, 0.072, -0.104), H(-0.08, 0.0, -0.084), V(-0.088, 1.53, -0.36), V(-0.094, 1.49, -0.3), V(-0.098, 1.44, -0.218), V(-0.102, 1.33, -0.168), V(-0.106, 1.215, -0.175)];
  const open = [0.008, 0.012, 0.016, 0.018, 0.019, 0.02, 0.026, 0.036];
  for (let i = 0; i < HAIR.fall.n; i++) {
    // (each braid's place across the bundle: one in the middle, the rest in a ring round it)
    const ring = i === 0 ? 0 : i < 5 ? 0.5 : 1, ang = i * 2.4, j = Math.sin(i * 91.7) * 43758.5453, jit = j - Math.floor(j);
    out.push(mid.map((m, k) => {
      const w = open[k]! * ring, last = k === mid.length - 1;
      // (lying on her: across her shoulder and down her front the bundle flattens against her, never into her)
      const flat = k >= 4 ? 0.45 : 1;
      return m.clone().add(V(w * Math.cos(ang) + 0.003 * Math.sin(k * 1.9 + i), last ? -0.05 * jit : 0, w * Math.sin(ang) * flat + (k >= 4 ? w * flat : 0)));
    }));
  }
  return out;
}
/** A mesh bending between her body and her head: each corner the head's by its height (her frame: all of it above
 *  `from`, none below `to`), the rest her body's (her group itself and 'herHead' as the bones). */
function skinned(g: THREE.Object3D, head: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, from: number, to: number) {
  const p = geo.attributes.position!, idx = new Uint16Array(p.count * 4), w = new Float32Array(p.count * 4);
  for (let i = 0; i < p.count; i++) {
    const u = Math.min(1, Math.max(0, (p.getY(i) - to) / (from - to))), h = u * u * (3 - 2 * u);
    idx[i * 4 + 1] = 1; w[i * 4] = 1 - h; w[i * 4 + 1] = h;
  }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(idx, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(w, 4));
  const m = new THREE.SkinnedMesh(geo, mat); m.frustumCulled = false; m.userData.tone = 'body';
  g.add(m);
  g.updateMatrixWorld(true);
  m.bind(new THREE.Skeleton([g, head] as unknown as THREE.Bone[]));
  return m;
}

// ---- the bodies (in the figure's frame: x from its middle, y and z the car body's; m) ----
const HIS_TORSO: Sec[] = [
  [0.95, 0, -0.43, -0.2, 0.1], [0.98, 0, -0.445, -0.19, 0.165, 1, 2.4], [1.06, 0, -0.45, -0.2, 0.162, 1, 2.6],
  [1.18, 0, -0.45, -0.205, 0.168, 1, 2.6], [1.3, 0, -0.45, -0.195, 0.182, 1, 2.6], [1.4, 0, -0.445, -0.2, 0.196, 1, 2.8],
  [1.46, 0, -0.43, -0.215, 0.2, 1, 3], [1.51, 0, -0.415, -0.24, 0.168, 1, 2.6], [1.545, 0, -0.395, -0.262, 0.112, 1, 2.3],
  [1.565, 0, -0.375, -0.272, 0.062], [1.575, 0, -0.36, -0.282, 0.02],
];
const HER_TORSO: Sec[] = [
  [0.95, 0, -0.43, -0.2, 0.1], [0.98, 0, -0.445, -0.185, 0.17, 1, 2.4], [1.06, 0, -0.45, -0.205, 0.158, 1, 2.4],
  [1.15, 0, -0.45, -0.235, 0.128, 1, 2.3], [1.25, 0, -0.45, -0.225, 0.138, 1, 2.3], [1.32, 0, -0.448, -0.19, 0.152, 0.85, 2.3],
  [1.38, 0, -0.442, -0.205, 0.158, 1, 2.5], [1.425, 0, -0.43, -0.23, 0.162, 1, 2.8], [1.465, 0, -0.415, -0.25, 0.13, 1, 2.4],
  [1.492, 0, -0.397, -0.272, 0.094, 1, 2.2], [1.512, 0, -0.38, -0.29, 0.048],
];
/** Where things are (the figure's frame): the heads' pivots, the shoulders' joints, the hips. */
export const FIGURE = {
  him: { x: 0.44, head: V(0, 1.64, -0.29), shoulder: V(0.188, 1.445, -0.322), hip: V(0.095, 1.04, -0.3) },
  her: { x: -0.44, head: V(0, 1.625, -0.302), shoulder: V(0.155, 1.425, -0.325), hip: V(0.085, 1.03, -0.3) },
};
/** The wheel's axis (the car body's frame: its column's way, which it turns about: world.ts buildCar). */
const WHEEL_AXIS = new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(WHEEL.tilt, 0, 0));
/** His left wrist with the wheel turned `steer` (radians; in his frame, `S` his shoulder, `x` his place across the
 *  bench): his grip low on the rim at about half seven (drive/cabin.ts WHEEL) turned with it, the wrist back along his
 *  arm from it; and the arm's way. */
function wheelWrist(S: THREE.Vector3, x: number, steer: number) {
  const G = WHEEL.grip.clone().applyAxisAngle(WHEEL_AXIS, steer).add(WHEEL.hub).sub(new THREE.Vector3(x, 0, 0)), dir = G.clone().sub(S).normalize();
  return { W: G.addScaledVector(dir, -0.085), dir };
}
/** Which way his left forearm's +x faces (his frame: in toward her; any way off the forearm's own). */
const LEFT_PALM = new THREE.Vector3(-1, 0, 0);
/** Her arm's rest: how far its elbow bends (radians: forearm forward along her thigh), how far up the scene swings
 *  it at most (cast.ts: -2.7 about z), the bend left once it's up; and how far her hand turns on her forearm as it
 *  rises (radians about it: from palm down on her thigh to palm forward, up — it rose palm back, toward her face, a
 *  hand on backwards: the user, 2026-10-16). */
const ELBOW = { rest: -1.3, up: 2.7, raised: -0.25, turn: -Math.PI };
/** His right arm (his frame): its bones (m, shoulder to elbow to wrist, his left arm's build — the user, 2026-10-15:
 *  laid out straight along the bench's top it read "super fucking long"); its rest along the bench's top behind her
 *  (the wrist, and which way the elbow points); and round her shoulders at the end. */
const ARM = {
  upper: 0.3, fore: 0.27, bench: V(-0.6, 1.44, -0.54), benchPole: V(0, -0.25, -1),
  /** Round her (her frame, as she leans): the wrist up behind her far shoulder (clear of its top and of the braids
   *  over it), the elbow out behind her neck (its pole), the hand bent at the wrist down over the shoulder's front
   *  (its way, and the way its palm faces: onto her). The wrist rises off the bench first (`rise` of the move), then
   *  comes over (`over`), kept back off her by `back` at the middle; the hand turns at the wrist through `turn`. */
  around: { wrist: V(-0.175, 1.56, -0.46), pole: V(-0.2, 0.05, -1), hand: V(-0.05, -0.22, 0.97), palm: V(0.1, -0.97, -0.22), rise: [0, 0.65], over: [0.3, 1], back: 0.05, turn: [0.45, 1] },
};
/** The end's lean (cast.ts LEAN): how far she slides over toward him (m), how far she leans in about her hip (radians,
 *  the hip's height), her head's tilt onto his shoulder; his head's tilt onto hers. Each in its own part of the lean
 *  (`[from, to]` of it), overlapping: she slides over, leaning in as she goes, and her head settles onto his shoulder
 *  last (all at once, on one curve, she tipped over stiff as a board: the user, 2026-10-15, "a little weird on the
 *  movement"). */
const LEAN_POSE = { slide: 0.3, tilt: 0.45, hip: 1.0, head: 0.3, his: 0.22, slideIn: [0, 0.75], tiltIn: [0.15, 0.9], headIn: [0.45, 1] };
/** Eased in and out softly (no jolt at either end: its speed and its acceleration both start and end at nought), over
 *  [a, b] of u. */
const ease = (u: number, [a, b]: readonly number[] = [0, 1]) => { const x = Math.min(1, Math.max(0, (u - a!) / (b! - a!))); return x * x * x * (x * (6 * x - 15) + 10); };

const _q = new THREE.Quaternion(), _m4 = new THREE.Matrix4();
/** A bone's turn: its -y along `along`, its +x toward `face` (square to it). */
function boneQ(along: THREE.Vector3, face: THREE.Vector3, out = new THREE.Quaternion()): THREE.Quaternion {
  const y = along.clone().normalize().negate(), x = face.clone().addScaledVector(y, -face.dot(y));
  if (x.lengthSq() < 1e-8) x.set(1, 0, 0).addScaledVector(y, -y.x);
  x.normalize();
  return out.setFromRotationMatrix(_m4.makeBasis(x, y, x.clone().cross(y)));
}
/** Reaches an arm (its shoulder's group, its forearm's inside, named `forearm`; its bones `U` and `F` long) for wrist `W`
 *  (the figure's frame): the elbow bent out toward `pole`, the palm facing `palm`. */
function reach(upper: THREE.Object3D, W: THREE.Vector3, pole: THREE.Vector3, palm: THREE.Vector3, U = ARM.upper, F = ARM.fore, forearm = 'hisForearm') {
  const S = upper.position, sw = W.clone().sub(S);
  const d = Math.min(U + F - 1e-3, Math.max(Math.abs(U - F) + 1e-3, sw.length())), n = sw.normalize();
  const cosA = (U * U + d * d - F * F) / (2 * U * d), sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  const m = pole.clone().addScaledVector(n, -pole.dot(n)).normalize();
  const E = S.clone().addScaledVector(n, U * cosA).addScaledVector(m, U * sinA), Wd = S.clone().addScaledVector(n, d);
  boneQ(E.clone().sub(S), m, upper.quaternion);
  const fore = upper.getObjectByName(forearm)!;
  fore.quaternion.copy(upper.quaternion).invert().multiply(boneQ(Wd.sub(E), palm, _q));
}

/** Poses the two of them (in the car's body, by name) for the moment: her arm up, her look to him, his nod; and at the
 *  end her lean into him — over on the bench and in, her head on his shoulder — and his arm round her. */
export function poseCast(body: THREE.Object3D, c: { herArm: number; herLook: number; hisNod: number; lean: number; hold: number; steer: number }) {
  const her = body.getObjectByName('her')!, him = body.getObjectByName('him')!, L = LEAN_POSE;
  // his wheel turned a touch, his left hand going with it on the rim
  const wheel = body.getObjectByName('steering'), left = him.getObjectByName('hisLeftArm');
  if (wheel) wheel.rotation.z = c.steer;
  if (left) { const { U, F, pole } = left.userData as { U: number; F: number; pole: THREE.Vector3 }; reach(left, wheelWrist(left.position, him.position.x, c.steer).W, pole, LEFT_PALM, U, F, 'hisLeftForearm'); }
  body.getObjectByName('herArm')!.rotation.set(0, 0, -2.7 * c.herArm);
  // (about her hip: the hip stays on the bench where she's slid to, her shoulders and head come over toward him)
  const slide = ease(c.lean, L.slideIn), a = -L.tilt * ease(c.lean, L.tiltIn), settle = ease(c.lean, L.headIn);
  her.rotation.set(0, 0, a);
  her.position.set(FIGURE.her.x + L.slide * slide + L.hip * Math.sin(a), L.hip * (1 - Math.cos(a)), 0);
  body.getObjectByName('herHead')!.rotation.set(0, 0.7 * c.herLook, -L.head * settle);
  body.getObjectByName('hisHead')!.rotation.set(c.hisNod, 0, L.his * settle);
  // his arm: off the bench's top behind her, up behind her back and round her shoulders — the upper arm behind her
  // neck, the forearm across her back, the hand over her far shoulder (worked out in her frame as she leans: the wrist
  // never crosses her). (It reached for her nape, his forearm and hand through her neck and braids: the user,
  // 2026-10-16, "his arm's not going around her exactly".)
  const upper = him.getObjectByName('hisArm');
  if (!upper) return;
  her.updateMatrix();
  const R = ARM.around, h = c.hold, toHer = _m5.copy(her.matrix).invert(), off = him.position;
  const B = ARM.bench.clone().add(off).applyMatrix4(toHer), up = ease(h, R.rise), over = ease(h, R.over);
  const P = new THREE.Vector3(B.x + (R.wrist.x - B.x) * over, B.y + (R.wrist.y - B.y) * up, B.z + (R.wrist.z - B.z) * over - R.back * Math.sin(Math.PI * over));
  const W = P.applyMatrix4(her.matrix).sub(off), herQ = _q2.setFromRotationMatrix(her.matrix);
  reach(upper, W, ARM.benchPole.clone().lerp(R.pole.clone().applyQuaternion(herQ), ease(h)), new THREE.Vector3(0, -1, 0));
  // the hand: straight on from the forearm along the bench, bent at the wrist down over her shoulder as it comes round
  const hand = upper.getObjectByName('hisHand');
  if (!hand) return;
  const fore = upper.getObjectByName('hisForearm')!, onHer = boneQ(R.hand.clone().applyQuaternion(herQ), R.palm.clone().applyQuaternion(herQ), _q3);
  hand.quaternion.identity().slerp(upper.quaternion.clone().multiply(fore.quaternion).invert().multiply(onHer), ease(h, R.turn));
}
const _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion(), _m5 = new THREE.Matrix4();

function legs(g: THREE.Object3D, mats: Mats, hip: THREE.Vector3, her: boolean) {
  for (const s of [1, -1]) {
    const h = V(s * hip.x, hip.y, hip.z), knee = V(s * (hip.x + (her ? -0.01 : 0.015)), hip.y + 0.04, 0.12), ankle = V(s * (hip.x + (her ? -0.015 : 0.025)), 0.62, 0.33);
    part(g, tube([h, knee, ankle], her ? [0.078, 0.055, 0.04] : [0.085, 0.064, 0.05]), mats);
    part(g, tube([ankle.clone().add(V(0, 0.02, -0.03)), ankle.clone().add(V(0, -0.04, 0.05)), ankle.clone().add(V(0, -0.06, her ? 0.16 : 0.18))], her ? [0.035, 0.04, 0.028] : [0.045, 0.05, 0.04], V(0, 1, 0), 0.6), mats);
  }
}

/** A hand from the wrist on along `dir`: a palm flat across `palm` (the way it faces), four fingers curling toward
 *  where it faces by `curl` (0 open, 1.5 a fist) and fanned by `spread`, a thumb off to `side`. */
function hand(g: THREE.Object3D, mats: Mats, wrist: THREE.Vector3, dir: THREE.Vector3, palm: THREE.Vector3, side: THREE.Vector3, size: number, curl = 0.4, spread = 0.1, thumb = true) {
  const d = dir.clone().normalize(), p = palm.clone().addScaledVector(d, -palm.dot(d)).normalize(), a = side.clone().addScaledVector(d, -side.dot(d)).addScaledVector(p, -side.dot(p)).normalize();
  const knuckle = wrist.clone().addScaledVector(d, 0.085 * size), k = size;
  part(g, tube([wrist.clone().addScaledVector(d, -0.01 * k), wrist.clone().addScaledVector(d, 0.04 * k), knuckle], [0.024 * k, 0.037 * k, 0.036 * k], p, 0.42), mats);
  // the fingers, index (by the thumb) to little: each in three bones, each joint bent by a share of the curl
  [[0.027, 0.074], [0.009, 0.082], [-0.009, 0.077], [-0.026, 0.062]].forEach(([off, len], i) => {
    const fan = (1.5 - i) * spread, f = d.clone().addScaledVector(a, Math.tan(fan)).normalize(), pts = [knuckle.clone().addScaledVector(a, off! * k).addScaledVector(d, -0.012 * k)];
    let at = pts[0]!.clone().addScaledVector(f, 0.012 * k), dirn = f.clone();
    pts.push(at.clone());
    for (const share of [0.45, 0.32, 0.23]) { dirn = dirn.clone().multiplyScalar(Math.cos(curl * 0.6)).addScaledVector(p, Math.sin(curl * 0.6)).normalize(); at = at.clone().addScaledVector(dirn, len! * share * k); pts.push(at); }
    part(g, tube(pts, [0.0105 * k, 0.0105 * k, 0.0095 * k, 0.0085 * k, 0.0075 * k], p, 0.85, 8, 14), mats);
  });
  if (!thumb) return;
  const base = wrist.clone().addScaledVector(d, 0.022 * k).addScaledVector(a, 0.02 * k);
  const mid = base.clone().addScaledVector(d, 0.03 * k).addScaledVector(a, 0.03 * k).addScaledVector(p, 0.012 * k);
  const tip = mid.clone().addScaledVector(d, 0.04 * k).addScaledVector(a, 0.01 * k).addScaledVector(p, 0.015 * k * (1 + curl));
  part(g, tube([base, mid, tip], [0.015 * k, 0.012 * k, 0.009 * k], p, 0.85, 8, 14), mats);
}

/** Him: driving (in the car), or standing for his portrait (`bust`: arms down, no legs). His head's group is named
 *  'hisHead'. */
export function buildHim(mats: Mats, pose: 'drive' | 'bust' = 'drive'): THREE.Group {
  const g = new THREE.Group(), F = FIGURE.him;
  part(g, loft(HIS_TORSO, 44), mats);
  part(g, tube([V(0, 1.5, -0.335), V(0, 1.6, -0.305), V(0, 1.67, -0.29)], [0.058, 0.054, 0.05]), mats); // the neck
  // his jacket's collar, standing up behind his neck and open at the front; his chain on his chest, its plate
  const collar: THREE.Vector3[] = [];
  for (let k = 0; k <= 10; k++) { const a = (0.75 + (k / 10) * 4.78), up = 0.5 - 0.5 * Math.cos(a); collar.push(V(0.082 * Math.sin(a), 1.538 + 0.035 * up, -0.322 + 0.074 * Math.cos(a))); }
  part(g, tube(collar, collar.map(() => 0.018), V(0, 1, 0), 1.6), mats);
  part(g, tube([V(0.072, 1.565, -0.345), V(0.07, 1.52, -0.27), V(0.04, 1.462, -0.21), V(0, 1.44, -0.2), V(-0.04, 1.462, -0.21), V(-0.07, 1.52, -0.27), V(-0.072, 1.565, -0.345)], [0.008, 0.008, 0.008, 0.008, 0.008, 0.008, 0.008], V(0, 1, 0), 1, 8, 48), mats, 'gold');
  part(g, new THREE.BoxGeometry(0.034, 0.03, 0.008), mats, 'gold').position.set(0, 1.418, -0.197);
  // the head, on its pivot: skull, nose, ears; the cap, its bill and button; his shades
  const head = new THREE.Group(); head.name = 'hisHead'; head.position.copy(F.head); g.add(head);
  part(head, loft(HIS_HEAD, 44), mats);
  part(head, loft(HIS_NOSE, 16), mats);
  for (const s of [1, -1]) blob(head, mats, V(s * 0.075, 0.036, -0.014), [0.014, 0.031, 0.021]).rotation.set(-0.2, 0, s * 0.12);
  part(head, loft(CAP, 44), mats);
  { // the bill: its outline round the cap's front, curved down at its sides, tipped down at the front
    const sh = new THREE.Shape(), w = 0.088;
    sh.moveTo(-w, 0.005); sh.bezierCurveTo(-w * 0.95, 0.12, -w * 0.45, 0.19, 0, 0.192); sh.bezierCurveTo(w * 0.45, 0.19, w * 0.95, 0.12, w, 0.005);
    sh.bezierCurveTo(w * 0.6, 0.085, -w * 0.6, 0.085, -w, 0.005);
    const bill = new THREE.ExtrudeGeometry(sh, { depth: 0.009, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 2, curveSegments: 24 });
    bill.rotateX(Math.PI / 2);
    const p = bill.attributes.position!;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, p.getY(i) - 1.3 * x * x - 0.1 * Math.max(0, z - 0.08)); }
    bill.computeVertexNormals();
    const brim = part(head, bill, mats); brim.position.set(0, 0.104, 0); if (mats.plain) brim.material = mats.plain; // (no rim: seen across its flat top at a glance, all of it lit up as an edge)
  }
  blob(head, mats, V(0, 0.2, -0.012), [0.011, 0.007, 0.011]); // its button
  for (const s of [1, -1]) {
    blob(head, mats, V(s * 0.034, 0.058, 0.099), [0.029, 0.019, 0.007], 'lens').rotation.y = s * 0.2;
    const rim = part(head, new THREE.TorusGeometry(1, 0.09, 6, 28), mats, 'gold'); rim.position.set(s * 0.034, 0.058, 0.101); rim.scale.set(0.03, 0.02, 0.03); rim.rotation.y = s * 0.2;
    part(head, tube([V(s * 0.064, 0.062, 0.093), V(s * 0.076, 0.06, 0.05), V(s * 0.079, 0.052, 0.0)], [0.003, 0.003, 0.003], V(0, 1, 0), 1, 6, 10), mats, 'gold'); // its arm
  }
  part(head, tube([V(-0.008, 0.062, 0.104), V(0, 0.066, 0.105), V(0.008, 0.062, 0.104)], [0.003, 0.003, 0.003], V(0, 0, 1), 1, 6, 8), mats, 'gold'); // its bridge
  // the arms
  const sh = (s: number) => V(s * F.shoulder.x, F.shoulder.y, F.shoulder.z), top = (s: number) => V(s * 0.13, 1.468, -0.33);
  const sleeve = [0.05, 0.062, 0.056, 0.05, 0.044], cuff = 0.042;
  if (pose === 'drive') {
    // his left (+x, the door's side): out to the wheel, low on its rim — on pivots at the shoulder ('hisLeftArm') and
    // the elbow ('hisLeftForearm') as his right is, so his hand stays on the rim as the wheel turns (poseCast). Built
    // where it rests, then hung on its pivots (reached to the same wrist, the same elbow: it looks as it did)
    const S = sh(1), { W, dir } = wheelWrist(S, F.x, 0), E = S.clone().lerp(W, 0.52).add(V(0.035, -0.02, 0));
    const n = W.clone().sub(S).normalize(), es = E.clone().sub(S), pole = es.clone().addScaledVector(n, -es.dot(n)).normalize();
    const U = es.length(), Fl = W.distanceTo(E);
    part(g, tube([top(1), S], [sleeve[0]!, sleeve[1]!]), mats);
    const upperL = new THREE.Group(); upperL.name = 'hisLeftArm'; upperL.position.copy(S); upperL.userData = { U, F: Fl, pole }; g.add(upperL);
    const foreL = new THREE.Group(); foreL.name = 'hisLeftForearm'; foreL.position.set(0, -U, 0); upperL.add(foreL);
    reach(upperL, W, pole, LEFT_PALM, U, Fl, 'hisLeftForearm');
    const back = (p: THREE.Vector3, q: THREE.Vector3, k: number) => p.clone().addScaledVector(q.clone().sub(p).normalize(), -k);
    const upperTube = part(g, tube([back(S, E, 0.02), S, S.clone().lerp(E, 0.5), E], [sleeve[1]!, sleeve[1]!, sleeve[2]!, sleeve[3]!]), mats);
    const foreTube = part(g, tube([back(E, W, 0.015), E.clone().lerp(W, 0.5), W], [sleeve[3]!, sleeve[4]!, cuff]), mats);
    const grip = new THREE.Group(); g.add(grip);
    hand(grip, mats, W, dir, V(-0.3, -0.9, 0.3), V(0, 0.5, 1), 1, 1.5, 0);
    g.updateMatrixWorld(true);
    upperL.attach(upperTube); foreL.attach(foreTube); foreL.attach(grip);
    // his right: on pivots at the shoulder ('hisArm') and the elbow ('hisForearm'), each bone along its own -y, the
    // palm facing its forearm's +x (poseCast reaches it: along the bench's top behind her, or round her shoulders)
    const S2 = sh(-1);
    part(g, tube([top(-1), S2], [sleeve[0]!, sleeve[1]!]), mats);
    const upper = new THREE.Group(); upper.name = 'hisArm'; upper.position.copy(S2); g.add(upper);
    part(upper, tube([V(0, 0.02, 0), V(0, 0, 0), V(0, -ARM.upper * 0.5, 0), V(0, -ARM.upper, 0)], [sleeve[1]!, sleeve[1]!, sleeve[2]!, sleeve[3]!]), mats);
    const fore = new THREE.Group(); fore.name = 'hisForearm'; fore.position.set(0, -ARM.upper, 0); upper.add(fore);
    part(fore, tube([V(0, 0.015, 0), V(0, -ARM.fore * 0.5, 0), V(0, -ARM.fore, 0)], [sleeve[3]!, sleeve[4]!, cuff]), mats);
    const wrist = new THREE.Group(); wrist.name = 'hisHand'; wrist.position.set(0, -ARM.fore, 0); fore.add(wrist); // (it bends at the wrist: poseCast)
    hand(wrist, mats, V(0, 0, 0), V(0, -1, 0), V(1, 0, 0), V(0, 0, 1), 1, 0.75, 0.06);
    reach(upper, ARM.bench, ARM.benchPole, V(0, -1, 0));
    legs(g, mats, F.hip, false);
  } else {
    for (const s of [1, -1]) {
      const S = sh(s), E = V(s * 0.215, 1.19, -0.33), W = V(s * 0.215, 0.95, -0.3);
      part(g, tube([top(s), S, E, W], [sleeve[0]!, sleeve[1]!, sleeve[3]!, cuff]), mats);
    }
  }
  return g;
}

/** Her arms: their bones (m); her left's rest, its hand in her lap (the wrist, which way the elbow points, the palm),
 *  and its hold on her phone (verse 1: holdPhone) — the wrist this far under the phone's foot and behind its back, the
 *  elbow down at her side. */
const HER_ARM = { upper: 0.28, fore: 0.24, lap: V(0.12, 1.115, -0.06), lapPole: V(1, 0.1, -0.5), lapPalm: V(0, -1, 0), under: 0.026, behind: 0.03, phonePole: V(0.5, -1, -0.3) };
/** Her top: fitted, scoop-necked, on straps (her frame: the neckline's middle in front, how it rises toward the straps,
 *  its line at the back, the straps' span either side), its colour against her skin's dark (the cast's). */
const TOP = { color: '#4a1238', neck: 1.34, scoop: 3.5, back: 1.41, strap: [0.07, 0.104] as [number, number] };
const isTop = (x: number, y: number, z: number) => {
  const ax = Math.abs(x), edge = z > -0.33 ? TOP.neck + TOP.scoop * x * x : TOP.back + 1.5 * x * x;
  return y < edge || (ax > TOP.strap[0] && ax < TOP.strap[1] && y < 1.52);
};
/** Paints a geometry's corners by place (its own colour attribute: for a material drawn in vertex colours). */
function paint(geo: THREE.BufferGeometry, color: (p: THREE.Vector3) => THREE.Color): THREE.BufferGeometry {
  const p = geo.attributes.position!, c = new Float32Array(p.count * 3), v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { const k = color(v.fromBufferAttribute(p, i)); c[i * 3] = k.r; c[i * 3 + 1] = k.g; c[i * 3 + 2] = k.b; }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
  return geo;
}

/** Her: her head's group named 'herHead'; her right arm on its pivot at the shoulder 'herArm'; her left on pivots at
 *  the shoulder ('herLeftArm') and the elbow ('herLeftForearm'), its hand on the wrist ('herHand': in her lap, or on her
 *  phone — holdPhone). */
export function buildHer(mats: Mats): THREE.Group {
  const g = new THREE.Group(), F = FIGURE.her;
  // her body, in her top (vertex-painted: the top's colour below its neckline and on its straps, her skin's above)
  const skinC = new THREE.Color(CAST_INK), topC = new THREE.Color(TOP.color);
  part(g, paint(loft(HER_TORSO, 144, 14), (p) => /* (fine: her top is painted per corner, coarse its neckline and straps stair-stepped) */ (isTop(p.x, p.y, p.z) ? topC : skinC)), { ...mats, body: mats.top ?? mats.body });
  part(g, tube([V(0, 1.44, -0.35), V(0, 1.5, -0.332), V(0, 1.565, -0.316), V(0, 1.655, -0.302)], [0.07, 0.054, 0.047, 0.045]), mats); // the neck: long
  const head = new THREE.Group(); head.name = 'herHead'; head.position.copy(F.head); g.add(head);
  // (her head and hair drawn a share shorter than they're cut: at full height her face read long)
  const skull = new THREE.Group(); skull.scale.y = HAIR.squat; head.add(skull);
  part(skull, loft(HER_HEAD, 44), mats);
  part(skull, loft(HER_NOSE, 16), mats);
  for (const s of [1, -1]) blob(skull, mats, V(s * 0.068, 0.028, -0.016), [0.011, 0.024, 0.017]).rotation.set(-0.2, 0, s * 0.12); // her ears
  // her hair: the cap, the bun on her crown, the braids' fall (skinned: from her head down onto her shoulder)
  part(skull, hairCap(), mats);
  part(skull, bunGeo(), mats);
  const paths = fallPaths();
  skinned(g, head, mergeGeometries(paths.map((pts, i) => tube(pts, pts.map((_, k) => HAIR.fall.r * (k < pts.length - 2 ? 1 : k === pts.length - 2 ? 0.95 : 0.7 + 0.1 * (i % 3))), V(0, 0, 1), 1, 8, 60).toNonIndexed())), mats.body, HAIR.fall.from, HAIR.fall.to);
  // gold: a cuff near the end of every other braid; her hoops, from the lobes
  paths.forEach((pts, i) => {
    if (i % 2) return;
    const c = new THREE.CatmullRomCurve3(pts, false, 'centripetal'), u = 0.86 - 0.03 * (i % 3);
    const cuff = part(g, new THREE.CylinderGeometry(HAIR.fall.r * 1.3, HAIR.fall.r * 1.3, 0.014, 12), mats, 'gold'); cuff.position.copy(c.getPointAt(u)); cuff.quaternion.setFromUnitVectors(V(0, 1, 0), c.getTangentAt(u));
  });
  for (const s of [1, -1]) {
    const hoop = part(head, new THREE.TorusGeometry(0.024, 0.0028, 8, 40), mats, 'gold'); hoop.position.set(s * 0.073, -0.016, -0.012); hoop.rotation.y = s * 1.0;
  }
  // her right arm (the door's side, -x) on its pivot: hanging from the shoulder, the forearm forward along her thigh;
  // as the scene swings it up its elbow straightens (worked out from the swing as the world's matrices update: the
  // scene sets only the arm's turn); her bangles at the wrist
  const S = V(-F.shoulder.x, F.shoulder.y, F.shoulder.z), arm = new THREE.Group(); arm.name = 'herArm'; arm.position.copy(S); g.add(arm);
  part(arm, tube([V(0.035, 0.035, -0.005), V(0, 0, 0), V(0.006, -0.13, 0.01), V(0.012, -0.27, 0.02)], [0.045, 0.043, 0.037, 0.03]), mats);
  const elbow = new THREE.Group(); elbow.position.set(0.012, -0.27, 0.02); arm.add(elbow);
  part(elbow, tube([V(0, 0.02, 0), V(0, -0.1, 0), V(0, -0.235, 0)], [0.03, 0.028, 0.02]), mats);
  const wrist = new THREE.Group(); wrist.position.set(0, -0.235, 0); elbow.add(wrist);
  hand(wrist, mats, V(0, 0, 0), V(0, -1, 0), V(0, 0, -1), V(1, 0, 0), 0.86, 0.35, 0.14);
  for (const y of [-0.2, -0.214]) { const b = part(elbow, new THREE.TorusGeometry(0.026, 0.0035, 6, 24), mats, 'gold'); b.position.set(0, y, 0); b.rotation.x = Math.PI / 2 + (y + 0.207) * 8; }
  arm.updateMatrixWorld = function (force?: boolean) {
    const u = Math.min(1, Math.max(0, -this.rotation.z / ELBOW.up));
    const e = u * u * (3 - 2 * u);
    elbow.rotation.x = ELBOW.rest + (ELBOW.raised - ELBOW.rest) * e;
    wrist.rotation.y = ELBOW.turn * e;
    THREE.Group.prototype.updateMatrixWorld.call(this, force);
  };
  elbow.rotation.x = ELBOW.rest;
  // her left (toward him): on pivots, each bone along its own -y, the palm facing its forearm's +x; at rest down her
  // side, the forearm across her lap, her hand in it
  const A = HER_ARM, S2 = V(F.shoulder.x, F.shoulder.y, F.shoulder.z);
  part(g, tube([V(0.11, 1.46, -0.33), S2], [0.045, 0.043]), mats);
  const upper = new THREE.Group(); upper.name = 'herLeftArm'; upper.position.copy(S2); g.add(upper);
  part(upper, tube([V(0, 0.02, 0), V(0, 0, 0), V(0, -A.upper * 0.5, 0), V(0, -A.upper, 0)], [0.043, 0.043, 0.037, 0.03]), mats);
  const fore = new THREE.Group(); fore.name = 'herLeftForearm'; fore.position.set(0, -A.upper, 0); upper.add(fore);
  part(fore, tube([V(0, 0.015, 0), V(0, -A.fore * 0.5, 0), V(0, -A.fore, 0)], [0.03, 0.028, 0.02]), mats);
  { const b = part(fore, new THREE.TorusGeometry(0.025, 0.0035, 6, 24), mats, 'gold'); b.position.set(0, -A.fore + 0.03, 0); b.rotation.x = Math.PI / 2 + 0.15; }
  const hd = new THREE.Group(); hd.name = 'herHand'; hd.position.set(0, -A.fore, 0); fore.add(hd);
  // (two hands, one shown: in her lap, the fingers loose; on her phone, the fingers flat up its back and the thumb
  // round its foot onto the screen's bottom bar — never over her texts)
  const lap = new THREE.Group(); lap.name = 'herHandLap'; hd.add(lap);
  hand(lap, mats, V(0, 0, 0), V(0, -1, 0), V(1, 0, 0), V(0, 0, -1), 0.86, 0.5, 0.05);
  const grip = new THREE.Group(); grip.name = 'herHandPhone'; grip.visible = false; hd.add(grip);
  hand(grip, mats, V(0, 0, 0), V(0, -1, 0), V(1, 0, 0), V(0, 0, -1), 0.86, 0.12, 0.03, false);
  part(grip, tube([V(0.004, -0.02, -0.02), V(0.03, -0.014, -0.032), V(0.054, -0.03, -0.036), V(0.052, -0.052, -0.032)], [0.0125, 0.011, 0.0095, 0.0085], V(1, 0, 0), 0.85, 8, 16), mats);
  reach(upper, A.lap, A.lapPole, A.lapPalm, A.upper, A.fore, 'herLeftForearm');
  legs(g, mats, F.hip, true);
  return g;
}

const _hq = new THREE.Quaternion(), _hm = new THREE.Matrix4(), _X = new THREE.Vector3(), _Y = new THREE.Vector3(), _Z = new THREE.Vector3();
/** Her phone in her left hand (verse 1, scenes/sets/verse1.ts): `grip` is where she holds it, in the car's body — its
 *  foot's edge on its back, x across it, y up it, z out of its screen — and `u` how far her hand has come up to it from
 *  her lap (0..1, eased here). Set each frame (after poseCast: in her frame as she sits then). */
export function holdPhone(body: THREE.Object3D, grip: THREE.Matrix4, u: number) {
  const her = body.getObjectByName('her'), upper = body.getObjectByName('herLeftArm'), hd = body.getObjectByName('herHand');
  if (!her || !upper || !hd) return;
  const A = HER_ARM, e = Math.min(1, Math.max(0, u)), s = e * e * (3 - 2 * e);
  her.updateMatrix();
  const m = _hm.copy(her.matrix).invert().multiply(grip), O = new THREE.Vector3().setFromMatrixPosition(m);
  m.extractBasis(_X, _Y, _Z);
  const W = O.addScaledVector(_Y, -A.under).addScaledVector(_Z, -A.behind);
  reach(upper, A.lap.clone().lerp(W, s), A.lapPole.clone().lerp(A.phonePole, s), A.lapPalm.clone().lerp(_Z, s).normalize(), A.upper, A.fore, 'herLeftForearm');
  // (the hand: straight on from the forearm in her lap; on the phone turned to it — palm to its back, fingers up it)
  const fore = upper.getObjectByName('herLeftForearm')!, onPhone = _hq.setFromRotationMatrix(_hm.makeBasis(_Z, _Y.clone().negate(), _X));
  const local = upper.quaternion.clone().multiply(fore.quaternion).invert().multiply(onPhone);
  hd.quaternion.identity().slerp(local, s);
  hd.getObjectByName('herHandLap')!.visible = s < 0.5;
  hd.getObjectByName('herHandPhone')!.visible = s >= 0.5;
}

/** The two of them, in their places in the car's body (their parts merged, a mesh a material in each moving piece:
 *  a hundred-odd parts would be a hundred-odd draws, twice over with the shadows). */
export function buildCast(body: THREE.Object3D): void {
  const top = castMaterial('#ffffff'); top.vertexColors = true; // (her body: her top's colour and her skin's, painted on)
  const mats: Mats = { body: castMaterial(), gold: toon({ color: '#f6c445' }), lens: castMaterial('#0c0910'), plain: toon({ color: CAST_INK }), top };
  const him = buildHim(mats); him.name = 'him'; him.position.x = FIGURE.him.x; body.add(compact(him));
  const her = buildHer(mats); her.name = 'her'; her.position.x = FIGURE.her.x; body.add(compact(her));
}
/** A group's own meshes merged by material (its child groups, which move, each compacted in turn). */
function compact<T extends THREE.Object3D>(g: T): T {
  const byMat = new Map<THREE.Material, THREE.Mesh[]>();
  for (const o of [...g.children]) {
    if (o instanceof THREE.SkinnedMesh) continue; // (it bends with its bones: kept whole)
    if (o instanceof THREE.Mesh && !o.children.length) (byMat.get(o.material as THREE.Material) ?? byMat.set(o.material as THREE.Material, []).get(o.material as THREE.Material)!).push(o);
    else compact(o);
  }
  for (const [m, list] of byMat) {
    if (list.length < 2) continue;
    const geos = list.map((o) => { o.updateMatrix(); const geo = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.matrix); geo.deleteAttribute('uv'); return geo; });
    for (const o of list) g.remove(o);
    g.add(new THREE.Mesh(mergeGeometries(geos), m));
  }
  return g;
}

/** His portrait's triangles (for the poster: look/adart.ts): every face of him posed for it (standing, his head turned
 *  round to his left and his chin up a touch), in his frame (his head's pivot at the origin): each corner's place and
 *  normal, each face's tone and which part it's of. Built once. */
let bust: { pos: Float32Array; nrm: Float32Array; tone: Tone[]; part: number[] } | null = null;
/** His pose for it: his head turned round to his left (radians, on the shoulders' three-quarter turn: near profile, his
 *  nose, lips and chin and the cap's bill against the light), his chin up a touch. */
const BUST = { turn: 0.85, chin: -0.08 };
export function bustTriangles(): { pos: Float32Array; nrm: Float32Array; tone: Tone[]; part: number[] } {
  if (bust) return bust;
  detail = 2;
  const none = new THREE.MeshBasicMaterial(), g = buildHim({ body: none, gold: none, lens: none }, 'bust');
  detail = 1;
  g.getObjectByName('hisHead')!.rotation.set(BUST.chin, BUST.turn, 0);
  g.position.copy(FIGURE.him.head).negate();
  g.updateMatrixWorld(true);
  const pos: number[] = [], nrm: number[] = [], tone: Tone[] = [], part: number[] = [], v = new THREE.Vector3(), nm = new THREE.Matrix3();
  let k = 0;
  g.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const geo = o.geometry as THREE.BufferGeometry, p = geo.attributes.position!, nn = geo.attributes.normal!, idx = geo.index, n = idx ? idx.count : p.count;
    nm.getNormalMatrix(o.matrixWorld);
    for (let i = 0; i < n; i++) {
      const j = idx ? idx.getX(i) : i;
      v.fromBufferAttribute(p, j).applyMatrix4(o.matrixWorld); pos.push(v.x, v.y, v.z);
      v.fromBufferAttribute(nn, j).applyMatrix3(nm).normalize(); nrm.push(v.x, v.y, v.z);
      if (i % 3 === 0) { tone.push(o.userData.tone as Tone); part.push(k); }
    }
    k++;
  });
  return (bust = { pos: new Float32Array(pos), nrm: new Float32Array(nrm), tone, part });
}
