// The video's camera, standing in the world while the explorer looks from elsewhere (explore/view.ts): a film camera on
// the video camera's place, its lens down its view, with the edges of its frame drawn out ahead of it. Unlit and
// unfogged (it reads by night and from across the city), grown with distance from the eye so it never shrinks to a
// speck. Browser and bun.
import * as THREE from 'three';
import { LENS } from '../drive/camera';

/** How far ahead its frame's edges are drawn (m, at size 1), and how it grows with the eye's distance (size per m). */
const FRAME = { reach: 3.2, grow: 0.025 };
const ACCENT = '#ff5a36';

export function buildRig() {
  const rig = new THREE.Group();
  rig.name = 'video-camera';
  const mat = (color: THREE.ColorRepresentation) => new THREE.MeshBasicMaterial({ color, fog: false });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.36, 0.56), mat('#26252b'));
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.075, 0.22, 20).rotateX(Math.PI / 2), mat('#121216'));
  lens.position.set(0, 0, -0.38);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.085, 20), mat('#7f9cff'));
  glass.position.set(0, 0, -0.495);
  glass.rotation.y = Math.PI;
  const reel = new THREE.CylinderGeometry(0.15, 0.15, 0.05, 24).rotateZ(Math.PI / 2);
  const reels = [-0.12, 0.17].map((z) => { const m = new THREE.Mesh(reel, mat(ACCENT)); m.position.set(0, 0.32, z); return m; });
  // the tally light (it blinks)
  const tally = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), mat(new THREE.Color(ACCENT).multiplyScalar(4)));
  tally.position.set(0.1, 0.2, -0.2);
  tally.name = 'tally';
  // the frame's edges: from the lens out to its four corners, and the frame itself
  const ty = Math.tan((LENS.fov * Math.PI) / 360), tx = ty * (16 / 9), d = FRAME.reach;
  const c = [[-tx, -ty], [tx, -ty], [tx, ty], [-tx, ty]].map(([x, y]) => new THREE.Vector3(x! * d, y! * d, -d));
  const o = new THREE.Vector3(0, 0, -0.5), pts: THREE.Vector3[] = [];
  for (let i = 0; i < 4; i++) pts.push(o, c[i]!, c[i]!, c[(i + 1) % 4]!);
  const frame = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: ACCENT, fog: false }));
  rig.add(body, lens, glass, ...reels, tally, frame);
  rig.traverse((m) => { m.castShadow = m.receiveShadow = false; });
  rig.visible = false;
  return rig;
}

const _m = new THREE.Matrix4(), _s = new THREE.Vector3();

/** Stands the rig where `cam` (the video's camera, placed) is, sized for an eye at `from`; its tally blinking with song
 *  time `t`. */
export function poseRig(rig: THREE.Object3D, cam: THREE.Object3D, from: THREE.Vector3, t: number) {
  const k = Math.max(1, cam.position.distanceTo(from) * FRAME.grow);
  rig.matrixAutoUpdate = false;
  rig.matrix.copy(_m.compose(cam.position, cam.quaternion, _s.setScalar(k)));
  rig.matrixWorldNeedsUpdate = true;
  rig.getObjectByName('tally')!.visible = t % 1 < 0.5;
}
