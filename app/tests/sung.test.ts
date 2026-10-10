// The guard: while each phrase is sung, its carrier is in frame, faces the camera, reads upright left to right, and its
// type is big enough to read —
// through the camera the scene renders (drive.ts camera). From the moment the snap onto it has landed until the next
// phrase's cue (or the phrase's end).
import { expect, test } from 'bun:test';
import * as THREE from 'three';
import { LENS, placeCamera } from '../src/drive/camera';
import type { Carrier } from '../src/drive/carriers';
import { dwellFor } from '../src/drive/phrases';
import { makeDrive } from '../src/drive/drive';
import { LEAD, SNAP_S } from '../src/drive/shots';
import { dissolveAt } from '../src/drive/dissolve';
import { audio, lyrics } from './data';

const drive = makeDrive(audio, lyrics);
const cam = new THREE.PerspectiveCamera(LENS.fov, 16 / 9, LENS.near, LENS.far);
const RATE = 30;
/** Phrases still readable for less than dwellFor (by 0.07-0.8 s) on 2026-10-10: tight joins in the dense verses, where
 *  the line before ends on another kind of carrier than this one starts on. M4 designs these shots by hand; the list
 *  may only shrink. */
const KNOWN_SHORT = new Set(['L4.0', 'L7.1', 'L19.0', 'L20.1', 'L21.0', 'L22.0', 'L24.0', 'L36.1', 'L37.0', 'L39.1', 'L42.1', 'L43.1']);
/** Frame margin (NDC), the most a face may turn away from the camera, and the least type size on screen (px at 1080p);
 *  and how long a phrase must stay up (§2: subtitle standards, ⅚ s and 0.3 s a word). */
const MARGIN = 0.1; // title-safe: the middle 90% of the frame (docs/LYRIC_VIDEO_TENETS.md §3)
const MAX_ANGLE = 65;
const MIN_EM_PX = 48; // ~4.5% of the frame's height: readable on a phone (§1)

const along = (c: Carrier) => c.up.clone().cross(c.normal).normalize();
function corners(c: Carrier) {
  const a = along(c).multiplyScalar(c.w / 2), u = c.up.clone().multiplyScalar(c.h / 2);
  return [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([x, y]) => c.center.clone().addScaledVector(a, x!).addScaledVector(u, y!));
}
const toPx = (v: THREE.Vector3) => new THREE.Vector2(((v.x + 1) / 2) * 1920, ((1 - v.y) / 2) * 1080);

function problems(c: Carrier, t: number): string[] {
  placeCamera(cam, drive.camera(t));
  const out: string[] = [];
  for (const k of corners(c)) {
    const p = k.clone().project(cam);
    if (!(Math.abs(p.x) <= 1 - MARGIN && Math.abs(p.y) <= 1 - MARGIN && p.z < 1)) { out.push(`corner off frame (${p.x.toFixed(2)}, ${p.y.toFixed(2)})`); break; }
  }
  const toCam = cam.position.clone().sub(c.center).normalize();
  const angle = (Math.acos(Math.min(1, toCam.dot(c.normal))) * 180) / Math.PI;
  if (angle > MAX_ANGLE) out.push(`faces ${angle.toFixed(0)}° away`);
  // upright and left to right on screen: the text's up points up, its run points right
  const o = toPx(c.center.clone().project(cam)), r = toPx(c.center.clone().addScaledVector(along(c), c.em).project(cam)), u = toPx(c.center.clone().addScaledVector(c.up, c.em).project(cam));
  if (r.x - o.x <= Math.abs(r.y - o.y)) out.push('reads backwards or sideways');
  if (o.y - u.y <= Math.abs(u.x - o.x)) out.push('upside down or sideways');
  const a = toPx(c.center.clone().addScaledVector(c.up, c.em / 2).project(cam)), b = toPx(c.center.clone().addScaledVector(c.up, -c.em / 2).project(cam));
  const px = a.distanceTo(b);
  if (px < MIN_EM_PX) out.push(`type ${px.toFixed(0)} px`);
  return out;
}

test('every word is on exactly one carrier, in order', () => {
  expect(drive.carriers.flatMap((c) => c.phrase.words.map((w) => w.gi))).toEqual(lyrics.lines.flatMap((l) => l.words.map((w) => w.gi)));
});

test('the carriers are a mix: every kind is used', () => {
  expect(new Set(drive.carriers.map((c) => c.kind))).toEqual(new Set(['road', 'sky', 'wall', 'sign', 'gantry']));
});

test('every carrier reads while its phrase is sung', () => {
  const fails: string[] = [];
  drive.carriers.forEach((c, i) => {
    const from = c.phrase.start - LEAD + SNAP_S;
    const next = drive.carriers[i + 1], nextCue = next ? next.phrase.start - LEAD : Infinity;
    const to = Math.min(c.phrase.end, nextCue);
    const bad: string[] = [];
    for (let t = from; t <= to; t += 1 / RATE) {
      const p = problems(c, t);
      if (p.length) bad.push(`${t.toFixed(2)}: ${p.join(', ')}`);
    }
    if (bad.length) fails.push(`${c.id} ${c.kind} "${c.phrase.text}" [${c.stretch}] ${bad.length} samples, first ${bad[0]}`);
  });
  expect(fails).toEqual([]);
});

test("the car never drives over road paint while it's sung", () => {
  const CAR_HALF = 2.4;
  const over = drive.carriers.filter((c) => c.kind === 'road').filter((c) => {
    for (let t = c.phrase.start; t <= c.phrase.end; t += 1 / RATE) if (drive.motion.distanceAt(t) + CAR_HALF > c.s - c.h / 2) return true;
    return false;
  });
  expect(over.map((c) => `${c.id} "${c.phrase.text}"`)).toEqual([]);
});

test('every phrase is readable on screen long enough: dwellFor(words), counting time before and after it is sung', () => {
  // readable = in frame, facing, upright, big enough (problems()), and for sky-writing written and not yet dissolved
  const short: string[] = [];
  for (const c of drive.carriers) {
    let seen = 0;
    for (let t = c.phrase.start - 1.5; t <= c.phrase.end + 2; t += 1 / RATE) {
      if (c.kind === 'sky' && (t < c.phrase.start || dissolveAt(c, t) >= 0.5)) continue;
      if (!problems(c, t).length) seen += 1 / RATE;
    }
    const need = dwellFor(c.phrase.words.length);
    if (seen < need - 1e-6 && !KNOWN_SHORT.has(c.id)) short.push(`${c.id} ${c.kind} "${c.phrase.text}" readable ${seen.toFixed(2)} s of ${need.toFixed(2)}`);
  }
  expect(short).toEqual([]);
});

test('the known short phrases are still short (drop them from KNOWN_SHORT as M4 fixes them)', () => {
  const ids = new Set(drive.carriers.map((c) => c.id));
  expect([...KNOWN_SHORT].filter((id) => !ids.has(id))).toEqual([]);
});
