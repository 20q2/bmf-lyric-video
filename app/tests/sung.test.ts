// The guard: while each line is sung, its sign is in frame, faces the camera and its text is big enough to read —
// through the camera the scene renders (drive.ts camera). From the moment the snap onto it has landed until the next
// line's cue (or the line's end).
import { expect, test } from 'bun:test';
import * as THREE from 'three';
import { LENS, placeCamera } from '../src/drive/camera';
import { makeDrive } from '../src/drive/drive';
import { LEAD, SNAP_S } from '../src/drive/shots';
import type { Sign } from '../src/drive/signs';
import { audio, lyrics } from './data';

const drive = makeDrive(audio, lyrics);
const cam = new THREE.PerspectiveCamera(LENS.fov, 16 / 9, LENS.near, LENS.far);
const RATE = 30;
/** Frame margin (NDC), the most a board may face away from the camera, and the least type size on screen (px at 1080p). */
const MARGIN = 0.03;
const MAX_ANGLE = 60;
const MIN_EM_PX = 36;
const TAN_V = Math.tan((LENS.fov * Math.PI) / 360);

function corners(s: Sign) {
  const along = new THREE.Vector3(0, 1, 0).cross(s.normal).normalize().multiplyScalar(s.w / 2);
  const up = s.normal.clone().cross(along).normalize().multiplyScalar(s.h / 2);
  return [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, b]) => s.center.clone().addScaledVector(along, a!).addScaledVector(up, b!));
}

function problems(s: Sign, t: number): string[] {
  placeCamera(cam, drive.camera(t));
  const out: string[] = [];
  for (const c of corners(s)) {
    const p = c.clone().project(cam);
    if (!(Math.abs(p.x) <= 1 - MARGIN && Math.abs(p.y) <= 1 - MARGIN && p.z < 1)) { out.push(`corner off frame (${p.x.toFixed(2)}, ${p.y.toFixed(2)})`); break; }
  }
  const toCam = cam.position.clone().sub(s.center).normalize();
  const angle = (Math.acos(Math.min(1, toCam.dot(s.normal))) * 180) / Math.PI;
  if (angle > MAX_ANGLE) out.push(`faces ${angle.toFixed(0)}° away`);
  const view = new THREE.Vector3(); cam.getWorldDirection(view);
  const depth = s.center.clone().sub(cam.position).dot(view);
  const px = (s.em / (2 * depth * TAN_V)) * 1080;
  if (px < MIN_EM_PX) out.push(`type ${px.toFixed(0)} px`);
  return out;
}

test('every line has a sign', () => {
  expect(drive.signs.map((s) => s.line.i)).toEqual(lyrics.lines.map((l) => l.i));
});

test('every sign reads while its line is sung', () => {
  const fails: string[] = [];
  drive.signs.forEach((s, i) => {
    const from = s.line.words[0]!.start - LEAD + SNAP_S;
    const nextCue = drive.signs[i + 1] ? drive.signs[i + 1]!.line.words[0]!.start - LEAD : Infinity;
    const to = Math.min(s.line.end, nextCue);
    const bad: string[] = [];
    for (let t = from; t <= to; t += 1 / RATE) {
      const p = problems(s, t);
      if (p.length) bad.push(`${t.toFixed(2)}: ${p.join(', ')}`);
    }
    if (bad.length) fails.push(`${s.id} "${s.line.text}" [${s.stretch}] ${bad.length} samples, first ${bad[0]}`);
  });
  expect(fails).toEqual([]);
});
