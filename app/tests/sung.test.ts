// The guard: while each phrase is sung, its carrier is in frame, faces the camera, reads upright left to right, isn't
// hidden behind another carrier's board or building, and its type is big enough to read —
// through the camera the scene renders (drive.ts camera). From the moment the snap onto it has landed until the next
// phrase's cue (or the phrase's end).
import { expect, test } from 'bun:test';
import * as THREE from 'three';
import { LENS, placeCamera } from '../src/drive/camera';
import { type Carrier, KINDS, basisOf, centerAt, occludersOf, rideAt } from '../src/drive/carriers';
import { dwellFor } from '../src/drive/phrases';
import { CABIN, CAR_BOX, REVEAL_AHEAD, makeDrive } from '../src/drive/drive';
import { LEAD, SNAP_S } from '../src/drive/shots';
import { dissolveAt, revealAt } from '../src/drive/dissolve';
import { HEADLAND, TUNNEL, TUNNEL_CLEAR, headlandAt, nearTunnel } from '../src/drive/tunnel';
import { SHOULDER, SLOPE } from '../src/drive/world';
import { AUDIBLE, shown } from '../src/drive/stretches';
import { audio, lyrics } from './data';

const drive = makeDrive(audio, lyrics);
const cam = new THREE.PerspectiveCamera(LENS.fov, 16 / 9, LENS.near, LENS.far);
const RATE = 30;
/** Phrases still readable for less than dwellFor (by 0.03-0.8 s): tight joins in the dense verses and choruses, where
 *  the line before ends on another kind of carrier than this one starts on, or a line's take glides on to them in
 *  0.12 s where a cut was instant. Each section's set-piece (sets/) designs these shots by hand (verse 1's are gone);
 *  the list may only shrink. */
const KNOWN_SHORT = new Set(['L42.1']);
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
const solids = drive.carriers.map((c) => ({ c, inv: basisOf(c).invert(), boxes: occludersOf(c).map(({ at, size }) => new THREE.Box3().setFromCenterAndSize(at, size)) }));
/** The town's buildings: unit boxes in their own (scaled) frames. */
const UNIT = new THREE.Box3(new THREE.Vector3(-0.5, -0.5, -0.5), new THREE.Vector3(0.5, 0.5, 0.5));
const blocks = drive.blocks.map((b) => ({ b, m: b.matrix, inv: b.matrix.clone().invert(), at: new THREE.Vector3().setFromMatrixPosition(b.matrix) }));
/** Whether a building stands between the camera and p. */
function blockHides(p: THREE.Vector3): boolean {
  const d = p.distanceTo(cam.position);
  return blocks.some(({ m, inv, at }) => {
    if (at.distanceTo(cam.position) > d + 60) return false;
    const ray = new THREE.Ray(cam.position.clone(), p.clone().sub(cam.position).normalize()).applyMatrix4(inv), hit = new THREE.Vector3();
    return !!ray.intersectBox(UNIT, hit) && hit.applyMatrix4(m).distanceTo(cam.position) < d - 0.05;
  });
}
/** The other carrier whose solids hide the middle of c's face, or most of its corners, from the camera (if any). */
const CAR = new THREE.Box3(new THREE.Vector3(-CAR_BOX.w / 2, 0, -CAR_BOX.l / 2), new THREE.Vector3(CAR_BOX.w / 2, CAR_BOX.h, CAR_BOX.l / 2));
/** From inside the car, only what's in the cabin with the camera can stand in the way. */
const CABIN_BOXES = CABIN.map(([at, size]) => new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(...at), new THREE.Vector3(...size)));
function hiddenBy(c: Carrier, t: number): string | null {
  const pts = [c.center, ...corners(c).map((k) => k.clone().lerp(c.center, 0.2))];
  // the car, where it is at t
  const f = drive.carFrame(t), car = new THREE.Matrix4().makeBasis(f.right.clone().negate(), f.up, f.fwd).setPosition(f.pos), inv = car.clone().invert();
  // (in the car: over its footprint, up to the height of someone standing in the open top)
  const q = cam.position.clone().applyMatrix4(inv), inside = Math.abs(q.x) < CAR_BOX.w / 2 && Math.abs(q.z) < CAR_BOX.l / 2 && q.y > 0 && q.y < 3.5;
  const boxes = inside ? CABIN_BOXES : [CAR];
  // (words on the car itself, its banner, hood or plaque: only the cabin can hide them, from inside)
  if (pts.some((p) => {
    if (!inside && CAR.containsPoint(p.clone().applyMatrix4(inv))) return false;
    const d = p.distanceTo(cam.position), ray = new THREE.Ray(cam.position.clone(), p.clone().sub(cam.position).normalize()).applyMatrix4(inv), hit = new THREE.Vector3();
    return boxes.some((b) => ray.intersectBox(b, hit) && hit.applyMatrix4(car).distanceTo(cam.position) < d - 0.05);
  })) return 'the car';
  if (pts.some(blockHides)) return 'a building';
  if (pts.some(terrainHides)) return 'the ground';
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
/** The ground, fast: the road sampled every 2 m into a grid (40 m cells); the ground at a point is the nearest road
 *  point's height, falling away past the verges down the embankments to the plain (world.ts). The road ends at the
 *  overlook's cliff. */
const roadEnd = drive.motion.distanceAt(drive.stretches[drive.stretches.length - 1]!.end) + 9;
const cells = new Map<string, number[]>(), samples: THREE.Vector3[] = [], fwds: THREE.Vector3[] = [];
for (let s = 0; s <= roadEnd; s += 2) {
  const f = drive.route.frameAt(s), p = f.pos;
  fwds.push(new THREE.Vector3(f.fwd.x, 0, f.fwd.z).normalize());
  const k = `${Math.floor(p.x / 40)},${Math.floor(p.z / 40)}`;
  (cells.get(k) ?? cells.set(k, []).get(k)!).push(samples.length);
  samples.push(p);
}
const roadTop = Math.max(...samples.map((p) => p.y)) + 0.5;
function terrainY(q: THREE.Vector3): number {
  if (q.y > roadTop) return -0.4; // (above the highest road: nothing to hit)
  // the highest of every nearby stretch of road's verges and embankments (where a road climbs past another, its bank
  // stands over the lower one's ground)
  const cx = Math.floor(q.x / 40), cz = Math.floor(q.z / 40), reach = Math.ceil((SHOULDER + SLOPE * roadTop) / 40);
  let y = -0.4;
  for (let i = -reach; i <= reach; i++) for (let j = -reach; j <= reach; j++) for (const n of cells.get(`${cx + i},${cz + j}`) ?? []) {
    const p = samples[n]!;
    if (p.y - 0.05 <= y) continue;
    // this sample's own slice of road (2 m along it), and its verge and bank out to either side
    const dx = q.x - p.x, dz = q.z - p.z, f = fwds[n]!, along = dx * f.x + dz * f.z, across = Math.abs(dx * f.z - dz * f.x);
    if (Math.abs(along) > 1.01) continue;
    y = Math.max(y, p.y - 0.05 - Math.max(0, across - SHOULDER) / SLOPE);
  }
  return y;
}
/** Whether the ground (the road on a hill, an embankment) stands between the camera and p. In a tunnel's bore the
 *  ground is its floor; its headland is left to the camera check. */
function terrainHides(p: THREE.Vector3): boolean {
  const from = cam.position, d = p.distanceTo(from), n = Math.ceil(d / 3);
  for (let i = 1; i < n; i++) {
    const q = from.clone().lerp(p, i / n);
    if (q.distanceTo(p) < 2) break;
    if (q.y < terrainY(q) - 0.15) return true;
  }
  return false;
}
const toPx = (v: THREE.Vector3) => new THREE.Vector2(((v.x + 1) / 2) * 1920, ((1 - v.y) / 2) * 1080);

function problems(c: Carrier, t: number): string[] {
  placeCamera(cam, drive.camera(t));
  if (c.vel) c = { ...c, center: centerAt(c, t) }; // a banner, where it has flown to
  if (c.ride) c = { ...c, ...rideAt(c, drive.carFrame(t, c.ride.ahead)) }; // in the car, or on the vehicle ahead
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
  const by = hiddenBy(c, t);
  if (by) out.push(`hidden by ${by}`);
  return out;
}

test('every word sung while the song can be heard is on exactly one carrier, in order; none after', () => {
  expect(drive.carriers.flatMap((c) => c.phrase.words.map((w) => w.gi))).toEqual(lyrics.lines.filter(shown).flatMap((l) => l.words.map((w) => w.gi)));
  expect(drive.carriers.filter((c) => c.phrase.end > AUDIBLE).map((c) => c.id)).toEqual([]);
});

test('the carriers are a mix: every kind is used', () => {
  expect(new Set(drive.carriers.map((c) => c.kind))).toEqual(new Set(KINDS));
});

test('every carrier reads while its phrase is sung', () => {
  const fails: string[] = [];
  drive.carriers.forEach((c, i) => {
    const from = Math.max(c.phrase.start - LEAD + SNAP_S, c.from ?? -Infinity);
    const next = drive.carriers[i + 1], nextCue = next ? next.phrase.start - LEAD : Infinity;
    const to = Math.min(c.phrase.end, nextCue, (c.until ?? Infinity) - 1e-6);
    const bad: string[] = [];
    for (let t = from; t <= to; t += 1 / RATE) {
      const p = problems(c, t);
      if (p.length) bad.push(`${t.toFixed(2)}: ${p.join(', ')}`);
    }
    if (bad.length) fails.push(`${c.id} ${c.kind} "${c.phrase.text}" [${c.stretch}] ${bad.length} samples, first ${bad[0]}`);
  });
  expect(fails).toEqual([]);
}, 120000);

test('only tunnel furniture (wall lettering, overhead signs) stands in a tunnel or by its mouths, and it stands inside one', () => {
  const inTunnel = (c: Carrier) => c.kind === 'tunnel' || c.kind === 'tunnelsign';
  const wrong = drive.carriers.filter((c) => c.kind !== 'sky' && c.kind !== 'banner' && inTunnel(c) !== !!nearTunnel(drive.tunnels, c.s, inTunnel(c) ? -c.w / 2 : TUNNEL_CLEAR));
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
    if (revealAt(c, t) < 1 || t >= (c.until ?? Infinity) || t < (c.from ?? -Infinity) || (c.kind === 'sky' && (t < c.phrase.start || dissolveAt(c, t) >= 0.5))) continue;
    if (!problems(c, t).length) seen += 1 / RATE;
  }
  return seen;
}
const isShort = (c: Carrier) => readable(c) < dwellFor(c.phrase.words.length) - 1e-6;

test('every phrase is readable on screen long enough: dwellFor(words), counting time before and after it is sung', () => {
  const short = drive.carriers.filter((c) => !KNOWN_SHORT.has(c.id) && isShort(c));
  expect(short.map((c) => `${c.id} ${c.kind} "${c.phrase.text}" readable ${readable(c).toFixed(2)} s of ${dwellFor(c.phrase.words.length).toFixed(2)}`)).toEqual([]);
}, 120000);

test("nothing shows the song ahead: a phrase's text appears only as the camera comes for it, at most one phrase early", () => {
  const early = drive.carriers.filter((c) => !c.early && c.phrase.start - c.reveal > REVEAL_AHEAD + 1e-9).map((c) => `${c.id} ${(c.phrase.start - c.reveal).toFixed(2)} s`);
  expect(early).toEqual([]);
  // at any moment, at most two phrases are up and not yet begun (a line's first phrase in its pre-roll, and the next)
  const crowded: string[] = [];
  for (let t = 0; t < audio.duration; t += 0.1) {
    const ahead = drive.carriers.filter((c) => !c.early && revealAt(c, t) > 0 && t < c.phrase.start);
    if (ahead.length > 2) crowded.push(`${t.toFixed(1)}: ${ahead.map((c) => c.id).join(' ')}`);
  }
  expect(crowded).toEqual([]);
});

test('the known short phrases are still short (drop them from KNOWN_SHORT as M4 fixes them)', () => {
  expect([...KNOWN_SHORT].filter((id) => { const c = drive.carriers.find((k) => k.id === id); return !c || !isShort(c); })).toEqual([]);
});

// ---- the camera never inside anything ----
/** The ground's height under p (m), and whether p is in a tunnel's rock: the road's verges, embankments down to the
 *  plain, a tunnel's bore and its headland (world.ts, tunnel.ts). */
function groundAt(p: THREE.Vector3, near: number): { y: number; rock: boolean } {
  let best = near, bd = Infinity;
  for (let s = Math.max(0, near - 220); s <= Math.min(drive.route.length, near + 220); s += 2) { const dd = drive.route.frameAt(s).pos.distanceToSquared(p); if (dd < bd) { bd = dd; best = s; } }
  for (let s = best - 2; s <= best + 2; s += 0.25) { const dd = drive.route.frameAt(Math.max(0, s)).pos.distanceToSquared(p); if (dd < bd) { bd = dd; best = Math.max(0, s); } }
  const f = drive.route.frameAt(best), rel = p.clone().sub(f.pos), lat = rel.dot(f.right), up = rel.y;
  const tn = nearTunnel(drive.tunnels, best, HEADLAND.spur[1]); // (the headland runs on past its mouths, the road in a cutting)
  if (tn) {
    const inBore = best > tn.s0 && best < tn.s1 && Math.abs(lat) < TUNNEL.halfW && up < TUNNEL.h;
    return { y: f.pos.y, rock: !inBore && up < headlandAt(lat, best - tn.s0, tn.s1 - tn.s0) };
  }
  const edge = SHOULDER, over = Math.abs(lat) - edge;
  return { y: over <= 0 ? f.pos.y - 0.05 : Math.max(-0.4, f.pos.y - over / SLOPE), rock: false };
}

test('the camera is never inside anything: the ground, a tunnel\'s rock, a building, a board, the car', () => {
  const bad: string[] = [];
  for (let t = 0; t < audio.duration; t += 1 / RATE) { // every frame: a move can pass through a board in a tenth
    placeCamera(cam, drive.camera(t));
    const p = cam.position, g = groundAt(p, drive.motion.distanceAt(t));
    const why = g.rock ? 'in rock' : p.y < g.y + 0.3 ? 'under the ground'
      : blocks.some(({ inv }) => UNIT.containsPoint(p.clone().applyMatrix4(inv))) ? 'in a building'
      : solids.some((o) => o.boxes.some((b) => b.containsPoint(p.clone().applyMatrix4(o.inv)))) ? 'in a board'
      : null;
    if (why) bad.push(`${t.toFixed(1)} ${why}`);
  }
  expect(bad).toEqual([]);
});

test("every carrier's solid stands at its face (in the face's own frame, not moved into the world)", () => {
  const far = drive.carriers.filter((c) => c.solid && c.solid.at.length() > Math.max(c.w, c.h, 30));
  expect(far.map((c) => `${c.id} ${c.solid!.at.toArray().map((v) => v.toFixed(0)).join(',')}`)).toEqual([]);
});
