import { expect, test } from 'bun:test';
import * as THREE from 'three';
import { FLY, FlyCam, OrbitCam, ORBIT } from '../src/explore/cameras';
import { floorUnder } from '../src/explore/floor';
import { Cascades } from '../src/look/shadows';
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

test('a floor stops a fall onto it, and leaves a camera above it alone', () => {
  const fly = new FlyCam();
  fly.from(eyeAt(new THREE.Vector3(0, 3, 0), new THREE.Vector3(10, 3, 0)));
  for (let i = 0; i < 60; i++) { fly.step(1 / 60, { x: 0, y: -1, z: 0 }); fly.floor(0); }
  expect(fly.pos.y).toBeCloseTo(FLY.clear, 9);
  fly.pos.y = 20;
  fly.floor(0);
  expect(fly.pos.y).toBe(20);
});

test('the floor under a point is the highest solid surface below it; hidden and unlit things are not floors', () => {
  const lit = () => new THREE.MeshToonMaterial();
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(100, 100).rotateX(-Math.PI / 2), lit());
  const roof = new THREE.Mesh(new THREE.BoxGeometry(4, 1, 4), lit()); roof.position.set(0, 5.5, 0);
  const hidden = new THREE.Mesh(new THREE.BoxGeometry(4, 1, 4), lit()); hidden.position.set(20, 8, 0); hidden.visible = false;
  const words = new THREE.Mesh(new THREE.PlaneGeometry(4, 4).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial()); words.position.set(-20, 3, 0);
  const world = new THREE.Group();
  for (const m of [ground, roof, hidden]) { m.castShadow = true; world.add(m); }
  world.add(words);
  world.updateMatrixWorld(true);
  expect(floorUnder(world, new THREE.Vector3(0, 30, 0))).toBeCloseTo(6, 6); // the roof
  expect(floorUnder(world, new THREE.Vector3(0, 3, 0))).toBeCloseTo(0, 6); // under the roof: the street
  expect(floorUnder(world, new THREE.Vector3(20, 30, 0))).toBeCloseTo(0, 6); // a hidden box isn't there
  expect(floorUnder(world, new THREE.Vector3(-20, 30, 0))).toBeCloseTo(0, 6); // lettering isn't solid
  expect(floorUnder(world, new THREE.Vector3(0, -5, 0))).toBeNull();
});

test('a big mesh (gridded) gives the same floor as three\'s raycast', () => {
  const g = new THREE.PlaneGeometry(120, 120, 120, 120).rotateX(-Math.PI / 2); // 28 800 triangles: gridded
  const p = g.attributes.position!;
  for (let i = 0; i < p.count; i++) p.setY(i, Math.sin(p.getX(i) * 0.1) * 3 + Math.cos(p.getZ(i) * 0.07) * 2);
  const hill = new THREE.Mesh(g, new THREE.MeshToonMaterial());
  hill.castShadow = true;
  hill.position.set(10, 4, -5);
  const world = new THREE.Group().add(hill);
  world.updateMatrixWorld(true);
  const ray = new THREE.Raycaster();
  for (const [x, z] of [[0, 0], [33.3, -17.1], [-41, 50.5], [69, 0]]) {
    const at = new THREE.Vector3(x, 50, z);
    ray.set(at, new THREE.Vector3(0, -1, 0));
    const want = ray.intersectObject(hill)[0]?.point.y ?? null;
    const got = floorUnder(world, at);
    if (want === null) expect(got).toBeNull(); else expect(got!).toBeCloseTo(want, 4);
  }
});

test('Fast lighting: the shadow maps drawn once empty and then left alone; culling by the view alone', () => {
  const c = new Cascades(256), cam = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 3000);
  cam.position.set(0, 2, 0); cam.lookAt(0, 2, -10); cam.updateMatrixWorld();
  c.update(cam, new THREE.Vector3(0.3, 0.8, 0.2).normalize(), 0);
  c.disabled = true;
  for (const l of c.lights) { expect(l.shadow.autoUpdate).toBe(false); expect(l.shadow.needsUpdate).toBe(true); }
  c.live = true; // (the scene sets it every frame: it mustn't turn the maps back on)
  for (const l of c.lights) expect(l.shadow.autoUpdate).toBe(false);
  expect(c.sees(new THREE.Sphere(new THREE.Vector3(0, 2, -30), 1))).toBe(true); // ahead
  expect(c.sees(new THREE.Sphere(new THREE.Vector3(0, 2, 30), 1))).toBe(false); // behind
  c.disabled = false;
  c.live = true;
  for (const l of c.lights) expect(l.shadow.autoUpdate).toBe(true);
});
