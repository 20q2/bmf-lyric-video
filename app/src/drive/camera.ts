// Camera poses in the world (metres): a target, and where the camera sits around it. Pure.
import * as THREE from 'three';
import type { RouteFrame } from './route';

/** The lens: vertical field of view (degrees), near and far planes (m). */
export const LENS = Object.freeze({ fov: 40, near: 0.1, far: 3000 });
const ASPECT = 16 / 9;
const TAN_H = Math.tan((LENS.fov * Math.PI) / 360) * ASPECT;

/** The camera sits `dist` from the target (tx, ty, tz) at compass `yaw` (0: on its +z side) and elevation `pitch`,
 *  looking at it; `roll` turns the image (radians). */
export interface Pose { tx: number; ty: number; tz: number; dist: number; yaw: number; pitch: number; roll: number }

export function placeCamera(cam: THREE.Camera, p: Pose) {
  const c = Math.cos(p.pitch) * p.dist;
  cam.position.set(p.tx + Math.sin(p.yaw) * c, p.ty + Math.sin(p.pitch) * p.dist, p.tz + Math.cos(p.yaw) * c);
  cam.up.set(0, 1, 0);
  cam.lookAt(p.tx, p.ty, p.tz);
  if (p.roll) cam.rotateZ(p.roll);
  cam.updateMatrixWorld();
}

const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
/** The signed short way from angle a to b (radians). */
const turnTo = (a: number, b: number) => {
  const d = (b - a) % (2 * Math.PI);
  return d > Math.PI ? d - 2 * Math.PI : d < -Math.PI ? d + 2 * Math.PI : d;
};

export const lerpPose = (a: Pose, b: Pose, u: number): Pose => ({
  tx: lerp(a.tx, b.tx, u),
  ty: lerp(a.ty, b.ty, u),
  tz: lerp(a.tz, b.tz, u),
  dist: Math.exp(lerp(Math.log(a.dist), Math.log(b.dist), u)), // zoom evenly
  yaw: a.yaw + turnTo(a.yaw, b.yaw) * u,
  pitch: lerp(a.pitch, b.pitch, u),
  roll: lerp(a.roll, b.roll, u),
});

const DEG = Math.PI / 180;
/** The car's home framings: yaw from its nose (+ to its left), pitch and distance. */
export const CHASE = Object.freeze({
  side: { yaw: -90 * DEG, pitch: 8 * DEG, dist: 9 },
  behind: { yaw: 180 * DEG, pitch: 12 * DEG, dist: 11 },
  front3q: { yaw: -35 * DEG, pitch: 8 * DEG, dist: 9 },
  high: { yaw: 180 * DEG, pitch: 50 * DEG, dist: 30 },
});
export type ChasePreset = (typeof CHASE)[keyof typeof CHASE];

/** A chase framing of the car at its route frame: aimed a metre above the road. */
export function chase(c: ChasePreset, f: RouteFrame): Pose {
  return { tx: f.pos.x, ty: f.pos.y + 1, tz: f.pos.z, dist: c.dist, yaw: f.heading + c.yaw, pitch: c.pitch, roll: 0 };
}

/** A sign's board: its centre, the unit normal its face looks along, and its size (m). */
export interface Board { center: THREE.Vector3; normal: THREE.Vector3; w: number; h: number }
/** The share of the frame's width a framed board fills. */
export const SIGN_FILL = 0.7;

/** Straight on to a board, slightly from above, at the distance where it spans SIGN_FILL of the frame's width. */
export function fitSign(b: Board): Pose {
  return {
    tx: b.center.x, ty: b.center.y, tz: b.center.z,
    dist: b.w / SIGN_FILL / (2 * TAN_H),
    yaw: Math.atan2(b.normal.x, b.normal.z), pitch: 4 * DEG, roll: 0,
  };
}
