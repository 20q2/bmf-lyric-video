// The LA palm (spec §3), not a ball on a stick:
//   - a tall trunk, a little curved and leaning, flaring at its foot, banded where old fronds were cut;
//   - a skirt of dead fronds under the crown;
//   - a crown of arching fronds, each a spine with its leaflets hanging off both sides.
// A few seeded variants, 12 m tall, scaled per palm (instanced). Browser and bun (geometry only).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { hash } from '../engine/util';

/** The model's height (m), its trunk's radius at the top and at the flared foot, its fronds (how many, how long, how
 *  many leaflet pairs). */
export const PALM = { h: 12, r: [0.2, 0.42] as [number, number], fronds: 14, frond: 3.4, leaflets: 10 };

/** A trunk up a gentle S, banded (vertex colours: bark and its lighter scars). */
function trunk(seed: number, bark: THREE.Color, scar: THREE.Color): THREE.BufferGeometry {
  const rings = 26, sides = 8, lean = 0.6 + 0.9 * hash(seed, 1), az = hash(seed, 2) * Math.PI * 2, pos: number[] = [], col: number[] = [], idx: number[] = [];
  const at = (u: number) => new THREE.Vector3(Math.cos(az) * lean * u * u + 0.25 * Math.sin(Math.PI * u) * Math.sin(az), PALM.h * u, Math.sin(az) * lean * u * u - 0.25 * Math.sin(Math.PI * u) * Math.cos(az));
  for (let i = 0; i <= rings; i++) {
    const u = i / rings, c = at(u), r = PALM.r[0] + (PALM.r[1] - PALM.r[0]) * Math.pow(1 - u, 6), band = i % 2 ? scar : bark;
    for (let j = 0; j < sides; j++) { const a = (j / sides) * Math.PI * 2; pos.push(c.x + r * Math.cos(a), c.y, c.z + r * Math.sin(a)); col.push(band.r, band.g, band.b); }
    if (i) for (let j = 0; j < sides; j++) { const a = (i - 1) * sides + j, b = (i - 1) * sides + ((j + 1) % sides), c2 = i * sides + j, d = i * sides + ((j + 1) % sides); idx.push(a, c2, b, b, c2, d); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx);
  g.computeVertexNormals();
  g.userData.top = at(1);
  return g;
}

/** The crown: fronds arching out and down from the top, each a spine with leaflets either side. */
function crown(seed: number, top: THREE.Vector3): THREE.BufferGeometry {
  const pos: number[] = [];
  for (let f = 0; f < PALM.fronds; f++) {
    const az = f * 2.39996 + hash(seed, 10 + f) * 0.4, el = 0.75 - 1.1 * (f / PALM.fronds) + 0.2 * hash(seed, 30 + f), L = PALM.frond * (0.85 + 0.3 * hash(seed, 50 + f));
    const dir = new THREE.Vector3(Math.cos(az), 0, Math.sin(az)), side = new THREE.Vector3(-dir.z, 0, dir.x);
    const spine = (t: number) => top.clone().addScaledVector(dir, L * t * Math.cos(el)).add(new THREE.Vector3(0, L * t * Math.sin(el) - 1.6 * t * t, 0));
    for (let k = 0; k < PALM.leaflets; k++) {
      const t0 = k / PALM.leaflets, t1 = (k + 1) / PALM.leaflets, a = spine(t0), b = spine(t1), w = 0.9 * Math.sin(Math.PI * (t0 + 0.5 / PALM.leaflets)) + 0.1;
      for (const s of [1, -1]) {
        const tip = b.clone().addScaledVector(side, s * w).add(new THREE.Vector3(0, -0.45 * w, 0));
        pos.push(a.x, a.y, a.z, b.x, b.y, b.z, tip.x, tip.y, tip.z);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/** A palm variant: its trunk, its dead skirt and its crown (separate: three materials). */
export function palmVariant(seed: number, bark: THREE.Color, scar: THREE.Color): { trunk: THREE.BufferGeometry; skirt: THREE.BufferGeometry; crown: THREE.BufferGeometry } {
  const t = trunk(seed, bark, scar), top = t.userData.top as THREE.Vector3;
  const skirt = new THREE.ConeGeometry(0.75, 1.5, 10, 1, true); skirt.translate(top.x, top.y - 0.55, top.z);
  return { trunk: t, skirt, crown: mergeGeometries([crown(seed, top)])! };
}
