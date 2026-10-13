// Blowin' money fast: on every line that sings it, banknotes pour out of the convertible — up out of the front seats,
// tumbling, left behind on the wind while the car drives (the tunnel), or blown off the overlook toward the city lights
// while it's parked (the outro). Each bill's flight is a function of its own time since it left the car, so any frame
// can be drawn on its own. Browser only (a canvas texture).
import * as THREE from 'three';
import { hash } from '../engine/util';
import type { Lyrics } from '../engine/lyrics';
import type { RouteFrame } from '../drive/route';

/** Bills per line, how long each flies (s), its size (m), and the wind (m/s along the car's forward when parked).
 *  (Sized and spread so the parked outro reads as a flurry, not one green clump chasing the car.) */
export const MONEY = { perLine: 90, life: 7, w: 0.72, h: 0.32, wind: 3.2, fall: 0.55, drag: 1.4, nearest: 3 };

function billTexture(): THREE.Texture {
  const c = document.createElement('canvas'); c.width = 256; c.height = 112;
  const x = c.getContext('2d')!;
  x.fillStyle = '#9fc59a'; x.fillRect(0, 0, 256, 112);
  x.strokeStyle = '#3d6b48'; x.lineWidth = 8; x.strokeRect(8, 8, 240, 96);
  x.fillStyle = '#3d6b48'; x.beginPath(); x.ellipse(128, 56, 28, 34, 0, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#cfe3c8'; x.beginPath(); x.ellipse(128, 56, 18, 24, 0, 0, Math.PI * 2); x.fill();
  for (const cx of [36, 220]) { x.fillStyle = '#3d6b48'; x.beginPath(); x.arc(cx, 56, 14, 0, Math.PI * 2); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class Money {
  readonly mesh: THREE.InstancedMesh;
  /** Every bill: when it leaves the car, and its line's index (for its seed). */
  private bills: { t0: number; seed: number }[] = [];
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();

  constructor(lyrics: Lyrics, private carFrame: (t: number) => RouteFrame, private speedAt: (t: number) => number) {
    for (const l of lyrics.lines) {
      if (!/blowin.? money fast/i.test(l.text)) continue;
      const t0 = l.words[0]!.start, t1 = l.end;
      for (let i = 0; i < MONEY.perLine; i++) this.bills.push({ t0: t0 + (t1 - t0) * (i / MONEY.perLine) + 0.05 * hash(l.i, i, 1), seed: l.i * 1000 + i });
    }
    const geo = new THREE.PlaneGeometry(MONEY.w, MONEY.h);
    const mat = new THREE.MeshBasicMaterial({ map: billTexture(), side: THREE.DoubleSide });
    this.mesh = new THREE.InstancedMesh(geo, mat, this.bills.length);
    this.mesh.frustumCulled = false;
  }

  /** `eye`: the camera; `clear`: the lyrics showing now (centre, radius m) — no bill passes in front of one. */
  update(t: number, eye?: THREE.Vector3, clear: { at: THREE.Vector3; r: number }[] = []) {
    let n = 0;
    for (const b of this.bills) {
      const tau = t - b.t0;
      if (tau < 0 || tau > MONEY.life) continue;
      const r = (k: number) => hash(b.seed, k) * 2 - 1;
      const f = this.carFrame(b.t0), v = this.speedAt(b.t0);
      // out of the front seats, up and to the sides (parked, flung forward: away from the back-seat camera, off the
      // overlook); then the air takes it: it keeps a fifth of the car's speed, slowing, and drifts on the wind (forward
      // off the overlook when the car is parked), falling slowly, fluttering
      const out = new THREE.Vector3().addScaledVector(f.right, 4.6 * r(1)).addScaledVector(f.up, 2.5 + 2.4 * hash(b.seed, 2)).addScaledVector(f.fwd, 1.4 * r(3) + (v < 1 ? 2.2 + 2.2 * hash(b.seed, 10) : 0));
      const carry = f.fwd.clone().multiplyScalar(v * 0.2);
      const k = MONEY.drag, slow = (1 - Math.exp(-k * tau)) / k;
      const p = f.pos.clone().addScaledVector(f.up, 1.4).addScaledVector(f.fwd, 0.5) // from the front seats, her hands
        .addScaledVector(out.add(carry), slow)
        .addScaledVector(f.fwd, v < 1 ? MONEY.wind * tau : 0)
        .addScaledVector(f.up, -MONEY.fall * tau)
        .addScaledVector(f.right, 0.35 * Math.sin(tau * (2 + 2 * hash(b.seed, 4)) + 6 * hash(b.seed, 5)));
      if (eye && p.distanceTo(eye) < MONEY.nearest) continue; // edge-on at the lens a bill is a green shard
      if (eye && clear.some(({ at, r: rad }) => {
        const toText = at.clone().sub(eye), d = toText.length(), toBill = p.clone().sub(eye), db = toBill.length();
        return db < d && toBill.angleTo(toText) < Math.atan((rad + MONEY.w) / d) + 0.04;
      })) continue; // it would cross the words
      this.q.setFromEuler(new THREE.Euler(tau * 5 * r(6), tau * 4 * r(7) + 3 * r(8), tau * 6 * r(9)));
      this.m.compose(p, this.q, new THREE.Vector3(1, 1, 1));
      this.mesh.setMatrixAt(n++, this.m);
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
