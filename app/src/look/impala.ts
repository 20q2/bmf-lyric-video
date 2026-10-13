// The '64 Impala's body (spec §3), lofted instead of extruded:
//   - a long low slab, its section a superellipse (crisp, slightly rounded), drawing in a touch toward its top;
//   - its plan tapering at the nose and tail;
//   - the hood falling to the grille, the deck to the tail;
//   - the open cockpit a tub between them;
//   - the sill rising into an arch over each wheel.
// The hull stays inside CAR_BOX (tests/impala.test.ts) and keeps the surfaces the lyrics ride on. Also the wire wheel:
// whitewall tyre, chrome rim, cross-laced spokes, a knock-off spinner. Browser and bun (geometry only).
import * as THREE from 'three';
import { CAR } from '../drive/cabin';

const HL = CAR.length / 2, HW = CAR.width / 2, ARCH = 0.5, N = 5;
/** Where the cockpit opens (z: from behind the bench to the dash), its floor's height. */
const COCKPIT = { z: [-1.25, 0.95] as [number, number], floor: 0.52 };
export const IMPALA = {
  /** Its half-width at z: tapering over the last 0.45 m at either end. */
  halfWidth: (z: number) => { const e = Math.max(0, Math.abs(z) - (HL - 0.45)) / 0.45; return HW * (1 - 0.13 * e * e); },
  /** Its top at z: the hood falling to the grille, the cockpit's floor, the deck falling to the tail. */
  top: (z: number) => {
    if (z > COCKPIT.z[1]) { const u = (z - COCKPIT.z[1]) / (HL - COCKPIT.z[1]); return 0.975 - 0.075 * u - 0.06 * u ** 4; }
    if (z < COCKPIT.z[0]) { const u = (COCKPIT.z[0] - z) / (HL + COCKPIT.z[0]); return 0.97 - 0.03 * u - 0.08 * u ** 4; }
    return COCKPIT.floor;
  },
  /** Its bottom at z: the sill, rising into an arch over each wheel. */
  bottom: (z: number) => { let y = 0.3; for (const zw of [CAR.wheelZ, -CAR.wheelZ]) { const dz = z - zw; if (Math.abs(dz) < ARCH) y = Math.max(y, 0.3 + Math.sqrt(ARCH * ARCH - dz * dz)); } return y; },
  /** Where the side's outer surface is at height y (for its chrome spear). */
  sideAt(z: number, y: number) {
    const t = this.top(z), b = this.bottom(z), yc = (t + b) / 2, hh = (t - b) / 2, v = Math.min(1, Math.abs((y - yc) / hh));
    return this.halfWidth(z) * Math.pow(1 - Math.pow(v, N), 1 / N) * (1 - 0.07 * Math.max(0, (y - yc) / hh));
  },
  cockpit: COCKPIT,
};

/** The hull: superellipse sections along z (a ring every station, the cockpit's edges doubled so its walls stand
 *  sheer), capped at both ends. */
export function impalaHull(): THREE.BufferGeometry {
  const zs: number[] = [];
  for (let i = 0; i <= 90; i++) zs.push(-HL + (2 * HL * i) / 90);
  for (const z of COCKPIT.z) zs.push(z - 0.005, z + 0.005);
  zs.sort((a, b) => a - b);
  const R = 40, pos: number[] = [], idx: number[] = [];
  for (const z of zs) {
    const t = IMPALA.top(z), b = IMPALA.bottom(z), yc = (t + b) / 2, hh = (t - b) / 2, w = IMPALA.halfWidth(z);
    for (let j = 0; j < R; j++) {
      const a = (j / R) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      const y = yc + hh * Math.sign(s) * Math.pow(Math.abs(s), 2 / N), x = w * Math.sign(c) * Math.pow(Math.abs(c), 2 / N) * (1 - 0.07 * Math.max(0, (y - yc) / hh));
      pos.push(x, y, z);
    }
  }
  for (let i = 1; i < zs.length; i++) for (let j = 0; j < R; j++) {
    const a = (i - 1) * R + j, b = (i - 1) * R + ((j + 1) % R), c = i * R + j, d = i * R + ((j + 1) % R);
    idx.push(a, b, c, b, d, c);
  }
  // (the end caps: a fan from each end's middle)
  for (const [i, flip] of [[0, true], [zs.length - 1, false]] as const) {
    const z = zs[i]!, centre = pos.length / 3;
    pos.push(0, (IMPALA.top(z) + IMPALA.bottom(z)) / 2, z);
    for (let j = 0; j < R; j++) { const a = i * R + j, b = i * R + ((j + 1) % R); if (flip) idx.push(centre, b, a); else idx.push(centre, a, b); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** A wire wheel, its axle along x, centred at its hub: a whitewall tyre, a chrome rim, cross-laced spokes, a three-eared
 *  knock-off. `out` (±1): which side its face looks to. */
export function wireWheel(r: number, out: number, rubber: THREE.Material, white: THREE.Material, chrome: THREE.Material): THREE.Group {
  const g = new THREE.Group(), add = (geo: THREE.BufferGeometry, m: THREE.Material) => { const o = new THREE.Mesh(geo, m); g.add(o); return o; };
  // the tyre: a lathe of a rounded section, turned onto the axle
  const pts: THREE.Vector2[] = [];
  for (let k = 0; k <= 12; k++) { const a = -Math.PI / 2 + (k / 12) * Math.PI; pts.push(new THREE.Vector2(r - 0.07 + 0.07 * Math.cos(a), 0.11 * Math.sin(a))); }
  const tyre = add(new THREE.LatheGeometry(pts, 28), rubber); tyre.rotation.z = Math.PI / 2;
  const wall = add(new THREE.RingGeometry(r * 0.62, r * 0.84, 28), white); wall.rotation.y = (out * Math.PI) / 2; wall.position.x = out * 0.112;
  const rim = add(new THREE.TorusGeometry(r * 0.6, 0.022, 8, 28), chrome); rim.rotation.y = Math.PI / 2; rim.position.x = out * 0.09;
  const hub = add(new THREE.CylinderGeometry(0.055, 0.07, 0.1, 12), chrome); hub.rotation.z = Math.PI / 2; hub.position.x = out * 0.08;
  // the spokes, laced in two crossing sets from the hub's two flanges to the rim
  for (let k = 0; k < 36; k++) {
    const a = (k / 36) * Math.PI * 2, a2 = a + (k % 2 ? 0.35 : -0.35), flange = k % 2 ? 0.05 : 0.11;
    const p = new THREE.Vector3(out * flange, 0.05 * Math.sin(a), 0.05 * Math.cos(a)), q = new THREE.Vector3(out * 0.09, r * 0.6 * Math.sin(a2), r * 0.6 * Math.cos(a2));
    const s = add(new THREE.CylinderGeometry(0.0045, 0.0045, p.distanceTo(q), 4), chrome);
    s.position.copy(p).add(q).multiplyScalar(0.5); s.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), q.clone().sub(p).normalize());
  }
  // the knock-off: three ears
  for (let k = 0; k < 3; k++) { const e = add(new THREE.BoxGeometry(0.03, 0.03, 0.13), chrome); e.position.x = out * 0.15; e.rotation.x = (k * Math.PI * 2) / 3; e.translateZ(0.05); }
  return g;
}
