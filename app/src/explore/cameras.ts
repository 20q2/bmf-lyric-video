// The explorer's own cameras (the site player, src/player.ts): one flying free, one circling the car. Pure (three's
// maths only): the player feeds them input and the car's frame, they hand back an eye (explore/view.ts). Each can start
// from wherever the view already is, so switching between them and the video's camera never jumps.
import * as THREE from 'three';
import type { RouteFrame } from '../drive/route';
import type { Eye } from './view';

/** Flying: base speed (m/s) and its range (the wheel), the boost and creep factors, look (radians per px of drag), how
 *  fast the speed eases to what's asked (1/s), the field of view (degrees: wider than the video's 40°, to look round),
 *  how high it stays over what's under it (m). */
export const FLY = { speed: 14, min: 1, max: 800, fast: 4, slow: 0.25, look: 0.0035, ease: 8, fov: 55, clear: 0.8 };
/** Circling the car: distance (m) and its range, pitch range (radians), the height on the car aimed at (m), look. */
export const ORBIT = { dist: 10, min: 2.5, max: 400, pitch: [-0.08, 1.5] as const, height: 1.1, look: 0.006, fov: 50 };

const ORDER = 'YXZ';
const UP = new THREE.Vector3(0, 1, 0);
const LIMIT = Math.PI / 2 - 0.01;
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
/** The angle a, in (-π, π]. */
const wrap = (a: number) => a - 2 * Math.PI * Math.floor((a + Math.PI) / (2 * Math.PI));

/** Movement asked for, each -1..1: right, up (the world's), forward (along the view); `boost` fast, `creep` slow. */
export interface Move { x: number; y: number; z: number; boost?: boolean; creep?: boolean }

export class FlyCam {
  pos = new THREE.Vector3();
  yaw = 0;
  pitch = 0;
  speed = FLY.speed;
  /** Carried along with the car (the player hands each step the car's move), so the drive doesn't leave it behind; off
   *  (the default), it flies free of the car. */
  follow = false;
  private vel = new THREE.Vector3();

  /** Starts where `eye` stands, looking where it looks (its roll dropped), at rest. */
  from(eye: Eye) {
    this.pos.copy(eye.pos);
    const e = new THREE.Euler().setFromQuaternion(eye.quat, ORDER);
    this.yaw = e.y;
    this.pitch = clamp(e.x, -LIMIT, LIMIT);
    this.vel.set(0, 0, 0);
  }

  /** Turns the view by a drag of (dx, dy) px. */
  look(dx: number, dy: number) {
    this.yaw = wrap(this.yaw - dx * FLY.look);
    this.pitch = clamp(this.pitch - dy * FLY.look, -LIMIT, LIMIT);
  }

  /** Changes the speed by `notches` of the wheel (each a quarter faster or slower). */
  faster(notches: number) { this.speed = clamp(this.speed * 1.25 ** notches, FLY.min, FLY.max); }

  /** `dt` s of real time asking for `move`; `carried`: how far the car went in that step (taken only while following). */
  step(dt: number, move: Move, carried?: THREE.Vector3) {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, ORDER));
    const want = new THREE.Vector3(move.x, 0, -move.z).applyQuaternion(q).addScaledVector(UP, move.y);
    if (want.lengthSq() > 1) want.normalize();
    want.multiplyScalar(this.speed * (move.boost ? FLY.fast : 1) * (move.creep ? FLY.slow : 1));
    this.vel.lerp(want, 1 - Math.exp(-FLY.ease * dt));
    this.pos.addScaledVector(this.vel, dt);
    if (this.follow && carried) this.pos.add(carried);
  }

  /** Kept `FLY.clear` above a floor at height `y` (a fall onto it stops there). */
  floor(y: number) {
    if (this.pos.y >= y + FLY.clear) return;
    this.pos.y = y + FLY.clear;
    if (this.vel.y < 0) this.vel.y = 0;
  }

  eye(): Eye {
    return { pos: this.pos.clone(), quat: new THREE.Quaternion().setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, ORDER)), fov: FLY.fov };
  }
}

export class OrbitCam {
  /** Round the car from straight behind it (radians, toward its right positive), and up from level. */
  yaw = 0;
  pitch = 0.22;
  dist = ORBIT.dist;

  /** Starts where `eye` stands round the car (`car` its frame), aimed back at it. */
  from(eye: Eye, car: RouteFrame) {
    const off = eye.pos.clone().sub(this.target(car));
    this.dist = clamp(off.length(), ORBIT.min, ORBIT.max);
    this.pitch = clamp(Math.asin(clamp(off.y / Math.max(1e-6, off.length()), -1, 1)), ORBIT.pitch[0], ORBIT.pitch[1]);
    this.yaw = wrap(Math.atan2(off.x, off.z) - car.heading - Math.PI);
  }

  look(dx: number, dy: number) {
    this.yaw = wrap(this.yaw - dx * ORBIT.look);
    this.pitch = clamp(this.pitch + dy * ORBIT.look, ORBIT.pitch[0], ORBIT.pitch[1]);
  }

  /** Closer (negative) or further by `notches` of the wheel. */
  zoom(notches: number) { this.dist = clamp(this.dist * 1.15 ** notches, ORBIT.min, ORBIT.max); }

  /** Where it's aimed: over the car's middle. */
  target(car: RouteFrame) { return car.pos.clone().addScaledVector(UP, ORBIT.height); }

  eye(car: RouteFrame): Eye {
    const at = this.target(car), az = car.heading + Math.PI + this.yaw, flat = Math.cos(this.pitch) * this.dist;
    const pos = at.clone().add(new THREE.Vector3(Math.sin(az) * flat, Math.sin(this.pitch) * this.dist, Math.cos(az) * flat));
    const quat = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(pos, at, UP));
    return { pos, quat, fov: ORBIT.fov };
  }
}
