import { expect, test } from 'bun:test';
import * as THREE from 'three';
import { FlyCam, OrbitCam, ORBIT } from '../src/explore/cameras';
import type { RouteFrame } from '../src/drive/route';
import type { Eye } from '../src/explore/view';

const UP = new THREE.Vector3(0, 1, 0);
const look = (e: Eye) => new THREE.Vector3(0, 0, -1).applyQuaternion(e.quat);
/** An eye at `pos` looking at `at`, as a camera's lookAt sets it. */
const eyeAt = (pos: THREE.Vector3, at: THREE.Vector3): Eye => {
  const o = new THREE.PerspectiveCamera(); o.position.copy(pos); o.lookAt(at);
  return { pos: pos.clone(), quat: o.quaternion.clone(), fov: 40 };
};
const car = (heading: number, pos = new THREE.Vector3(30, 2, -40)): RouteFrame => {
  const fwd = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));
  return { pos, fwd, up: UP.clone(), right: fwd.clone().cross(UP), heading };
};

test('flying starts where the view was, looking the same way (no jump on leaving the video camera)', () => {
  const was = eyeAt(new THREE.Vector3(3, 7, -2), new THREE.Vector3(20, 1, 15));
  const fly = new FlyCam();
  fly.from(was);
  const now = fly.eye();
  expect(now.pos.distanceTo(was.pos)).toBeLessThan(1e-9);
  expect(look(now).dot(look(was))).toBeCloseTo(1, 9);
});

test('flying forward goes along the view; following carries it with the car, not following leaves it', () => {
  const fly = new FlyCam();
  fly.from(eyeAt(new THREE.Vector3(0, 5, 0), new THREE.Vector3(10, 5, 0)));
  for (let i = 0; i < 120; i++) fly.step(1 / 60, { x: 0, y: 0, z: 1 });
  expect(fly.pos.x).toBeGreaterThan(5);
  expect(Math.abs(fly.pos.z)).toBeLessThan(1e-6);
  const before = fly.pos.clone(), carried = new THREE.Vector3(0, 0, 3);
  fly.follow = false;
  fly.step(0, { x: 0, y: 0, z: 0 }, carried);
  expect(fly.pos.distanceTo(before)).toBeLessThan(1e-9);
  fly.follow = true;
  fly.step(0, { x: 0, y: 0, z: 0 }, carried);
  expect(fly.pos.distanceTo(before.add(carried))).toBeLessThan(1e-9);
});

test('orbit starts where the view was and aims at the car; it turns with the car', () => {
  const c = car(0.7), o = new OrbitCam();
  const at = o.target(c), was = eyeAt(at.clone().add(new THREE.Vector3(-6, 3, 4)), at);
  o.from(was, c);
  const now = o.eye(c);
  expect(now.pos.distanceTo(was.pos)).toBeLessThan(1e-6);
  expect(look(now).dot(at.clone().sub(now.pos).normalize())).toBeCloseTo(1, 6);
  // the same place round the car once it has turned: its offset turned with it
  const turned = o.eye(car(0.7 + Math.PI / 2, c.pos));
  const a = was.pos.clone().sub(at), b = turned.pos.clone().sub(at);
  expect(a.length()).toBeCloseTo(b.length(), 6);
  expect(b.clone().applyAxisAngle(UP, -Math.PI / 2).distanceTo(a)).toBeLessThan(1e-6);
});

test('a fresh orbit sits behind the car, above it; zoom keeps to its range', () => {
  const c = car(1.2), o = new OrbitCam(), e = o.eye(c);
  expect(e.pos.clone().sub(c.pos).dot(c.fwd)).toBeLessThan(0);
  expect(e.pos.y).toBeGreaterThan(c.pos.y + ORBIT.height);
  o.zoom(-100);
  expect(o.dist).toBe(ORBIT.min);
  o.zoom(1000);
  expect(o.dist).toBe(ORBIT.max);
});
