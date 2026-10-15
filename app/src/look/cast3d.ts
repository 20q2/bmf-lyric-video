// The two of them in the car, modelled (the user, 2026-10-14: "the people in the car need a massive fidelity
// overhaul"): still the cast's flat dark — no faces, no skin — but people's shapes at a glance from every side the film
// sees them from. Every part is a smooth surface lofted through sculpted cross-sections (heads with a brow, a nose,
// lips and a chin in profile, ears; his cap's crown and curved bill; her hair's volume and its fall down her back;
// shoulders that slope from the neck, a chest, a waist), the limbs tubes through their joints, tapering. A rim on the
// silhouette's edge (strongest toward the sky) keeps their form against the dark cabin.
//   him  at the wheel (the car's left, +x), a jacket's collar, a gold chain, shades: his left arm straight out to the
//        wheel low on its rim, the lowrider's lean-back grip; his right along the bench's top behind her
//   her  beside him, her hair down her back, her right arm on a pivot at the shoulder (the scene swings it out and up,
//        cast.ts), its elbow straightening as it rises; her left hand in her lap
// The heads turn on pivots at the neck ('hisHead', 'herHead'), her arm on 'herArm': the scene moves them by name.
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

/** A form lofted through level cross-sections, smoothed between them (Catmull-Rom, `sub` rings a span). */
function loft(secs: Sec[], ring = 40, sub = 4): THREE.BufferGeometry {
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
function castMaterial(color: THREE.ColorRepresentation = '#140d18', rim: THREE.ColorRepresentation = '#5a2a4e'): THREE.MeshToonMaterial {
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
interface Mats { body: THREE.Material; gold: THREE.Material; lens: THREE.Material; plain?: THREE.Material }
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
/** Her head: finer — a smaller nose, fuller lips, a softer jaw. */
const HER_HEAD: Sec[] = [
  [-0.082, 0, 0.046, 0.064, 0.01], [-0.073, 0, 0.012, 0.079, 0.026, 0.8, 2.2], [-0.058, 0, -0.03, 0.087, 0.042, 0.66, 2.3],
  [-0.042, 0, -0.058, 0.09, 0.05, 0.62, 2.3], [-0.026, 0, -0.076, 0.088, 0.055, 0.62, 2.3], [-0.011, 0, -0.088, 0.1, 0.059, 0.62, 2.3],
  [0.004, 0, -0.096, 0.094, 0.064, 0.68, 2.4], [0.028, 0, -0.102, 0.09, 0.069, 0.74, 2.4], [0.052, 0, -0.106, 0.085, 0.072, 0.8, 2.4],
  [0.075, 0, -0.108, 0.091, 0.073, 0.84, 2.3], [0.104, 0, -0.106, 0.086, 0.072, 0.88, 2.2], [0.132, 0, -0.096, 0.07, 0.066, 0.9, 2.2],
  [0.153, 0, -0.077, 0.046, 0.051, 0.95, 2.1], [0.167, 0, -0.048, 0.015, 0.03, 1, 2], [0.173, 0, -0.021, -0.006, 0.008],
];
const HER_NOSE: Sec[] = [
  [0.064, 0, 0.07, 0.086, 0.006], [0.046, 0, 0.07, 0.096, 0.008], [0.026, 0, 0.07, 0.106, 0.011], [0.013, 0, 0.07, 0.111, 0.015],
  [0.004, 0, 0.074, 0.105, 0.017], [-0.002, 0, 0.08, 0.096, 0.01],
];
/** Her hair: a full shell over the crown and out past her cheeks (her face clear in front of it), closing at the nape;
 *  its length in locs (`locs`). */
const HAIR: Sec[] = [
  [0.218, 0, -0.07, 0.0, 0.03], [0.203, 0, -0.122, 0.045, 0.088, 0.9, 2.2], [0.172, 0, -0.148, 0.077, 0.115, 0.85, 2.3],
  [0.12, 0, -0.16, 0.079, 0.124, 0.8, 2.4], [0.06, 0, -0.163, 0.036, 0.126, 0.7, 2.4], [0.0, 0, -0.162, 0.016, 0.122, 0.72, 2.4],
  [-0.05, 0, -0.15, -0.01, 0.105, 0.8, 2.3], [-0.08, 0, -0.13, -0.04, 0.07], [-0.09, 0, -0.11, -0.06, 0.03],
];
/** Her locs: rooted in rows from the crown down (their angles round her head from straight behind, radians), each lying
 *  over the shell down to her ears (the higher rows' over the lower's), then falling — the sides' swept back past her
 *  jaw and behind her shoulders, all of them down her back to the bench's top and over it, their ends uneven. */
const LOCS = { rows: [{ y: 0.2, spread: 1.5, n: 9 }, { y: 0.15, spread: 1.75, n: 13 }, { y: 0.085, spread: 1.95, n: 19 }], r: 0.0135 };
/** The hair's shell at height y, round at `phi` from straight behind (an ellipse through its section there). */
function shellAt(phi: number, y: number, out: number) {
  let i = 0; while (i < HAIR.length - 2 && HAIR[i + 1]![0] > y) i++;
  const a = HAIR[i]!, b = HAIR[i + 1]!, u = Math.min(1, Math.max(0, (a[0] - y) / (a[0] - b[0]))), at = (k: number) => a[k]! + (b[k]! - a[k]!) * u;
  const zm = (at(2) + at(3)) / 2, zh = (at(3) - at(2)) / 2;
  return V(at(4) * Math.sin(phi) * out, y, zm - zh * Math.cos(phi) * out);
}
function locs(head: THREE.Object3D, mats: Mats) {
  let k = 0;
  LOCS.rows.forEach((row, ri) => {
    const lift = 1.03 + 0.022 * (LOCS.rows.length - 1 - ri);
    for (let i = 0; i < row.n; i++, k++) {
      const phi = -row.spread + (2 * row.spread * i) / (row.n - 1), j = Math.sin(k * 12.9898) * 43758.5453, jit = j - Math.floor(j), sx = Math.sin(phi);
      const pts = [shellAt(phi, row.y + 0.008, 0.97)];
      for (let y = row.y - 0.03; y > 0.0; y -= 0.035) pts.push(shellAt(phi, y, lift));
      // (down past her jaw, swept behind the face; behind her shoulders; down her back, over the bench's top)
      const last = pts[pts.length - 1]!, x2 = Math.sign(sx) * Math.min(Math.abs(last.x) * 1.05, 0.135), z2 = Math.min(last.z, -0.07 - 0.03 * Math.abs(sx));
      const x3 = x2 * 0.92, x4 = x3 * (0.8 + 0.1 * jit), end = -0.29 - 0.1 * jit;
      pts.push(V(x2, -0.07, z2), V(x3, -0.19, -0.17 - 0.01 * jit), V(x4, end, -0.185));
      const r = pts.map((_, n) => LOCS.r * (n < pts.length - 3 ? 1 : [0.95, 0.82, 0.6][n - (pts.length - 3)]!));
      part(head, tube(pts, r, V(0, 0, 1), 1, 9, 40), mats);
    }
  });
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
  [1.38, 0, -0.442, -0.205, 0.158, 1, 2.5], [1.425, 0, -0.43, -0.23, 0.162, 1, 2.8], [1.465, 0, -0.415, -0.25, 0.128, 1, 2.4],
  [1.49, 0, -0.395, -0.27, 0.078], [1.505, 0, -0.38, -0.285, 0.032],
];
/** Where things are (the figure's frame): the heads' pivots, the shoulders' joints, the hips. */
export const FIGURE = {
  him: { x: 0.44, head: V(0, 1.64, -0.29), shoulder: V(0.188, 1.445, -0.322), hip: V(0.095, 1.04, -0.3) },
  her: { x: -0.44, head: V(0, 1.61, -0.3), shoulder: V(0.155, 1.425, -0.325), hip: V(0.085, 1.03, -0.3) },
};
/** His grip on the wheel: low on its rim at about half seven, his arm straight to it (the car body's frame; the
 *  wheel's place is drive/cabin.ts WHEEL, shared with world.ts buildCar). */
const GRIP = WHEEL.hub.clone().add(WHEEL.grip);
/** Her arm's rest: how far its elbow bends (radians: forearm forward along her thigh), how far up the scene swings
 *  it at most (cast.ts: -2.7 about z), the bend left once it's up. */
const ELBOW = { rest: -1.3, up: 2.7, raised: -0.25 };

function legs(g: THREE.Object3D, mats: Mats, hip: THREE.Vector3, her: boolean) {
  for (const s of [1, -1]) {
    const h = V(s * hip.x, hip.y, hip.z), knee = V(s * (hip.x + (her ? -0.01 : 0.015)), hip.y + 0.04, 0.12), ankle = V(s * (hip.x + (her ? -0.015 : 0.025)), 0.62, 0.33);
    part(g, tube([h, knee, ankle], her ? [0.078, 0.055, 0.04] : [0.085, 0.064, 0.05]), mats);
    part(g, tube([ankle.clone().add(V(0, 0.02, -0.03)), ankle.clone().add(V(0, -0.04, 0.05)), ankle.clone().add(V(0, -0.06, her ? 0.16 : 0.18))], her ? [0.035, 0.04, 0.028] : [0.045, 0.05, 0.04], V(0, 1, 0), 0.6), mats);
  }
}

/** A hand from the wrist on along `dir`: a palm flat across `palm` (the way it faces), four fingers curling toward
 *  where it faces by `curl` (0 open, 1.5 a fist) and fanned by `spread`, a thumb off to `side`. */
function hand(g: THREE.Object3D, mats: Mats, wrist: THREE.Vector3, dir: THREE.Vector3, palm: THREE.Vector3, side: THREE.Vector3, size: number, curl = 0.4, spread = 0.1) {
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
    // his left (+x, the door's side): straight out to the wheel, low on its rim
    const S = sh(1), G = GRIP.clone().sub(V(F.x, 0, 0)), dir = G.clone().sub(S).normalize(), W = G.clone().addScaledVector(dir, -0.085);
    const E = S.clone().lerp(W, 0.52).add(V(0.035, -0.02, 0));
    part(g, tube([top(1), S, E, W], [sleeve[0]!, sleeve[1]!, sleeve[3]!, cuff]), mats);
    hand(g, mats, W, dir, V(-0.3, -0.9, 0.3), V(0, 0.5, 1), 1, 1.5, 0);
    // his right: back along the bench's top behind her, his hand over its edge
    const S2 = sh(-1), E2 = V(-0.42, 1.43, -0.52), W2 = V(-0.68, 1.425, -0.535);
    part(g, tube([top(-1), S2, E2, W2], [sleeve[0]!, sleeve[1]!, sleeve[3]!, cuff]), mats);
    hand(g, mats, W2, V(-1, -0.1, -0.1), V(0, -1, 0), V(0, 0, 1), 1, 0.7, 0.06);
    legs(g, mats, F.hip, false);
  } else {
    for (const s of [1, -1]) {
      const S = sh(s), E = V(s * 0.215, 1.19, -0.33), W = V(s * 0.215, 0.95, -0.3);
      part(g, tube([top(s), S, E, W], [sleeve[0]!, sleeve[1]!, sleeve[3]!, cuff]), mats);
    }
  }
  return g;
}

/** Her: her head's group named 'herHead', her right arm on its pivot at the shoulder 'herArm'. */
export function buildHer(mats: Mats): THREE.Group {
  const g = new THREE.Group(), F = FIGURE.her;
  part(g, loft(HER_TORSO, 44), mats);
  part(g, tube([V(0, 1.45, -0.345), V(0, 1.56, -0.31), V(0, 1.64, -0.298)], [0.046, 0.042, 0.04]), mats); // the neck
  const head = new THREE.Group(); head.name = 'herHead'; head.position.copy(F.head); g.add(head);
  part(head, loft(HER_HEAD, 44), mats);
  part(head, loft(HER_NOSE, 16), mats);
  part(head, loft(HAIR, 48), mats);
  locs(head, mats);
  // her right arm (the door's side, -x) on its pivot: hanging from the shoulder, the forearm forward along her thigh;
  // as the scene swings it up its elbow straightens (worked out from the swing as the world's matrices update: the
  // scene sets only the arm's turn)
  const S = V(-F.shoulder.x, F.shoulder.y, F.shoulder.z), arm = new THREE.Group(); arm.name = 'herArm'; arm.position.copy(S); g.add(arm);
  part(arm, tube([V(0.035, 0.035, -0.005), V(0, 0, 0), V(0.012, -0.27, 0.02)], [0.05, 0.047, 0.036]), mats);
  const elbow = new THREE.Group(); elbow.position.set(0.012, -0.27, 0.02); arm.add(elbow);
  part(elbow, tube([V(0, 0.02, 0), V(0, -0.12, 0), V(0, -0.235, 0)], [0.036, 0.033, 0.024]), mats);
  hand(elbow, mats, V(0, -0.235, 0), V(0, -1, 0), V(0, 0, -1), V(1, 0, 0), 0.88, 0.35, 0.14);
  arm.updateMatrixWorld = function (force?: boolean) {
    const u = Math.min(1, Math.max(0, -this.rotation.z / ELBOW.up));
    elbow.rotation.x = ELBOW.rest + (ELBOW.raised - ELBOW.rest) * u * u * (3 - 2 * u);
    THREE.Group.prototype.updateMatrixWorld.call(this, force);
  };
  elbow.rotation.x = ELBOW.rest;
  // her left: down her side, the forearm across her lap, her hand resting in it
  const S2 = V(F.shoulder.x, F.shoulder.y, F.shoulder.z), E2 = V(0.175, 1.17, -0.275), W2 = V(0.12, 1.115, -0.06);
  part(g, tube([V(0.11, 1.46, -0.33), S2, E2, W2], [0.05, 0.047, 0.036, 0.025]), mats);
  hand(g, mats, W2, V(-0.5, -0.1, 1), V(0, -1, 0), V(-1, 0, 0), 0.88, 0.5, 0.05);
  legs(g, mats, F.hip, true);
  return g;
}

/** The two of them, in their places in the car's body (their parts merged, a mesh a material in each moving piece:
 *  a hundred-odd parts would be a hundred-odd draws, twice over with the shadows). */
export function buildCast(body: THREE.Object3D): void {
  const mats: Mats = { body: castMaterial(), gold: toon({ color: '#f6c445' }), lens: castMaterial('#0c0910'), plain: toon({ color: '#140d18' }) };
  const him = buildHim(mats); him.position.x = FIGURE.him.x; body.add(compact(him));
  const her = buildHer(mats); her.position.x = FIGURE.her.x; body.add(compact(her));
}
/** A group's own meshes merged by material (its child groups, which move, each compacted in turn). */
function compact<T extends THREE.Object3D>(g: T): T {
  const byMat = new Map<THREE.Material, THREE.Mesh[]>();
  for (const o of [...g.children]) {
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
