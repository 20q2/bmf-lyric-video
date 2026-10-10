// The guard: while each phrase is sung, its carrier is in frame, faces the camera, reads upright left to right, isn't
// hidden behind another carrier's board or building, and its type is big enough to read —
// through the camera the scene renders (drive.ts camera). From the moment the snap onto it has landed until the next
// phrase's cue (or the phrase's end).
import { expect, test } from 'bun:test';
import * as THREE from 'three';
import { LENS, placeCamera } from '../src/drive/camera';
import { type Carrier, KINDS, basisOf, solidsOf } from '../src/drive/carriers';
import { dwellFor } from '../src/drive/phrases';
import { REVEAL_AHEAD, makeDrive } from '../src/drive/drive';
import { LEAD, SNAP_S } from '../src/drive/shots';
import { dissolveAt, revealAt } from '../src/drive/dissolve';
import { TUNNEL_CLEAR, nearTunnel } from '../src/drive/tunnel';
import { audio, lyrics } from './data';

const drive = makeDrive(audio, lyrics);
const cam = new THREE.PerspectiveCamera(LENS.fov, 16 / 9, LENS.near, LENS.far);
const RATE = 30;
/** Phrases still readable for less than dwellFor (by 0.03-0.8 s): tight joins in the dense verses, where the line
 *  before ends on another kind of carrier than this one starts on; and (L5.1, L8.1, L17.2, added 2026-10-10 when the
 *  guard learnt occlusion) the second sign of a line, which stands behind the first while that one's framed. M4
 *  designs these shots by hand; the list may only shrink. */
const KNOWN_SHORT = new Set(['L4.0', 'L5.1', 'L7.1', 'L8.1', 'L17.2', 'L20.1', 'L21.0', 'L36.1', 'L42.1', 'L43.1']);
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
/** Every carrier's solids as boxes in its own frame, with the frame's inverse (to take rays into it). */
const solids = drive.carriers.map((c) => ({ c, inv: basisOf(c).invert(), boxes: solidsOf(c).map(({ at, size }) => new THREE.Box3().setFromCenterAndSize(at, size)) }));
/** The other carrier whose solids hide the middle of c's face, or most of its corners, from the camera (if any). */
function hiddenBy(c: Carrier): string | null {
  const pts = [c.center, ...corners(c).map((k) => k.clone().lerp(c.center, 0.2))];
  for (const o of solids) {
    if (o.c === c || !o.boxes.length || o.c.center.distanceTo(c.center) > 120) continue;
    let hid = 0;
    pts.forEach((p, i) => {
      const d = p.distanceTo(cam.position), ray = new THREE.Ray(cam.position.clone(), p.clone().sub(cam.position).normalize()).applyMatrix4(o.inv);
      const hit = new THREE.Vector3();
      if (o.boxes.some((b) => ray.intersectBox(b, hit) && hit.applyMatrix4(basisOf(o.c)).distanceTo(cam.position) < d - 0.05)) hid++;
    });
    if (hid) return o.c.id;
  }
  return null;
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
  const by = hiddenBy(c);
  if (by) out.push(`hidden by ${by}`);
  return out;
}

test('every word is on exactly one carrier, in order', () => {
  expect(drive.carriers.flatMap((c) => c.phrase.words.map((w) => w.gi))).toEqual(lyrics.lines.flatMap((l) => l.words.map((w) => w.gi)));
});

test('the carriers are a mix: every kind is used', () => {
  expect(new Set(drive.carriers.map((c) => c.kind))).toEqual(new Set(KINDS));
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

test('only tunnel lettering stands in a tunnel or by its mouths, and it stands inside one', () => {
  const wrong = drive.carriers.filter((c) => c.kind !== 'sky' && (c.kind === 'tunnel') !== !!nearTunnel(drive.tunnels, c.s, c.kind === 'tunnel' ? -c.w / 2 : TUNNEL_CLEAR));
  expect(wrong.map((c) => `${c.id} ${c.kind} s=${c.s.toFixed(0)}`)).toEqual([]);
});

test("the car never drives over road paint while it's sung", () => {
  const CAR_HALF = 2.4;
  const over = drive.carriers.filter((c) => c.kind === 'road').filter((c) => {
    for (let t = c.phrase.start; t <= c.phrase.end; t += 1 / RATE) if (drive.motion.distanceAt(t) + CAR_HALF > c.s - c.h / 2) return true;
    return false;
  });
  expect(over.map((c) => `${c.id} "${c.phrase.text}"`)).toEqual([]);
});

/** How long c's phrase is readable (s): shown (revealed), in frame, facing, upright, big enough (problems()), and for
 *  sky-writing written and not yet dissolved. */
function readable(c: Carrier): number {
  let seen = 0;
  for (let t = c.phrase.start - 1.5; t <= c.phrase.end + 2; t += 1 / RATE) {
    if (revealAt(c, t) < 1 || (c.kind === 'sky' && (t < c.phrase.start || dissolveAt(c, t) >= 0.5))) continue;
    if (!problems(c, t).length) seen += 1 / RATE;
  }
  return seen;
}
const isShort = (c: Carrier) => readable(c) < dwellFor(c.phrase.words.length) - 1e-6;

test('every phrase is readable on screen long enough: dwellFor(words), counting time before and after it is sung', () => {
  const short = drive.carriers.filter((c) => !KNOWN_SHORT.has(c.id) && isShort(c));
  expect(short.map((c) => `${c.id} ${c.kind} "${c.phrase.text}" readable ${readable(c).toFixed(2)} s of ${dwellFor(c.phrase.words.length).toFixed(2)}`)).toEqual([]);
});

test("nothing shows the song ahead: a phrase's text appears only as the camera comes for it, at most one phrase early", () => {
  const early = drive.carriers.filter((c) => c.phrase.start - c.reveal > REVEAL_AHEAD + 1e-9).map((c) => `${c.id} ${(c.phrase.start - c.reveal).toFixed(2)} s`);
  expect(early).toEqual([]);
  // at any moment, at most two phrases are up and not yet begun (a line's first phrase in its pre-roll, and the next)
  const crowded: string[] = [];
  for (let t = 0; t < audio.duration; t += 0.1) {
    const ahead = drive.carriers.filter((c) => revealAt(c, t) > 0 && t < c.phrase.start);
    if (ahead.length > 2) crowded.push(`${t.toFixed(1)}: ${ahead.map((c) => c.id).join(' ')}`);
  }
  expect(crowded).toEqual([]);
});

test('the known short phrases are still short (drop them from KNOWN_SHORT as M4 fixes them)', () => {
  expect([...KNOWN_SHORT].filter((id) => { const c = drive.carriers.find((k) => k.id === id); return !c || !isShort(c); })).toEqual([]);
});
