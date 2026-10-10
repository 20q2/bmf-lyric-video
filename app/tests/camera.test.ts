import { expect, test } from 'bun:test';
import * as THREE from 'three';
import { LENS, type Pose, fitSign, lerpPose, placeCamera } from '../src/drive/camera';

const cam = new THREE.PerspectiveCamera(LENS.fov, 16 / 9, LENS.near, LENS.far);
const P = (o: Partial<Pose>): Pose => ({ tx: 0, ty: 0, tz: 0, dist: 10, yaw: 0, pitch: 0, roll: 0, ...o });

test('placeCamera puts the camera dist from the target, at yaw/pitch, looking at it', () => {
  placeCamera(cam, P({ tx: 5, ty: 1, tz: -3, dist: 8, yaw: Math.PI / 2, pitch: 0.3 }));
  const target = new THREE.Vector3(5, 1, -3);
  expect(cam.position.distanceTo(target)).toBeCloseTo(8, 6);
  expect(cam.position.y).toBeCloseTo(1 + 8 * Math.sin(0.3), 6);
  expect(cam.position.x).toBeGreaterThan(5); // yaw 90°: the camera sits on +x of its target
  const p = target.clone().project(cam);
  expect(Math.abs(p.x) + Math.abs(p.y)).toBeLessThan(1e-6);
});

test('roll turns the image: a point above the target moves sideways on screen', () => {
  placeCamera(cam, P({ roll: 0.3 }));
  const up = new THREE.Vector3(0, 1, 0).project(cam);
  expect(Math.abs(up.x)).toBeGreaterThan(0.01);
});

test('lerpPose goes the short way round yaw and zooms evenly (log distance)', () => {
  const a = P({ yaw: (350 * Math.PI) / 180, dist: 4 }), b = P({ yaw: (10 * Math.PI) / 180, dist: 16 });
  const m = lerpPose(a, b, 0.5);
  expect(Math.cos(m.yaw)).toBeCloseTo(1, 6); // 0°, not 180°
  expect(m.dist).toBeCloseTo(8, 6);
});

test('fitSign: the board spans 70% of the frame width, centred', () => {
  const sign = { center: new THREE.Vector3(10, 3, 20), normal: new THREE.Vector3(-0.6, 0, -0.8), w: 6, h: 1.6 };
  placeCamera(cam, fitSign(sign));
  const side = new THREE.Vector3(0, 1, 0).cross(sign.normal).normalize().multiplyScalar(sign.w / 2);
  const l = sign.center.clone().sub(side).project(cam), r = sign.center.clone().add(side).project(cam);
  expect(Math.abs(r.x - l.x) / 2).toBeCloseTo(0.7, 1);
  expect(Math.abs((l.x + r.x) / 2)).toBeLessThan(0.02);
});
