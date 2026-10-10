// Where each phrase is written in the world (its "carrier"), and how the camera finds it. Every lyric line takes one
// kind of carrier from its stretch's pattern (the "fly" lines always the sky), and each of its phrases gets its own:
//   road   painted on the asphalt just past where the car is when the phrase ends, written to be read from ahead: the
//          camera holds high in front of the words looking back, the car drives toward it, down the screen, up to them
//          (never over them while they're sung), and each next phrase lies further on: lower on screen, read top-down
//   sky    written in the sky ahead as it's sung, then dissolving (carrierart.ts); the camera sits low behind the
//          car and looks up at it
//   wall   painted on a building's wall on the left of the road; from across the road the camera looks left, so the car
//          drives left to right on screen and each next wall comes in on the right
//   sign   a short roadside board; the camera snaps to it
//   gantry a board over the freeway; the camera snaps to it
// Placement and text layout (rows and type size, in metres) are pure, so the guards can check legibility under bun;
// the scene draws the faces to match (signart.ts). A carrier's text runs along `along` = up x normal, upright along `up`.
import * as THREE from 'three';
import { hash } from '../engine/util';
import { type Pose, fitSign } from './camera';
import type { Motion } from './motion';
import type { Phrase } from './phrases';
import { SETTLE, dwellFor, phrasesOf } from './phrases';
import type { Route, RouteFrame } from './route';
import type { Stretch } from './stretches';

export type Kind = 'road' | 'sky' | 'wall' | 'sign' | 'gantry';
/** Kinds two phrases can share a frame on (pairFraming): walls, side by side. (Paint on a moving road lies too far on,
 *  and two sky phrases too far apart, for a frame that holds both at a readable size: measured, tests/sung.test.ts.) */
export const PAIRABLE: ReadonlySet<Kind> = new Set(['wall']);

export interface Carrier {
  id: string;
  phrase: Phrase;
  kind: Kind;
  stretch: string;
  /** Where along the road it stands (m). */
  s: number;
  center: THREE.Vector3;
  /** The face's outward normal and its text's up (unit, orthogonal). */
  normal: THREE.Vector3;
  up: THREE.Vector3;
  w: number;
  h: number;
  rows: string[];
  em: number;
}

/** Each stretch's carriers, line by line (cycled); a line with "fly" in it is always written in the sky. */
export const PATTERNS: Record<string, readonly Kind[]> = {
  intro: ['sign'],
  chorus1: ['road', 'road', 'wall', 'sky', 'sign'],
  verse1: ['sign', 'wall', 'road', 'sign', 'wall', 'road', 'wall'],
  chorus2: ['gantry', 'gantry', 'road', 'sky'],
  verse2: ['wall', 'sign', 'road', 'wall', 'sign', 'road', 'wall', 'sign', 'road'],
  chorus3: ['road', 'sky', 'road', 'sky'],
  bridge1: ['road', 'sky', 'road', 'sky'],
  verse3: ['wall', 'sign', 'wall', 'sky', 'wall', 'sign', 'wall', 'sign', 'road'],
  chorus4: ['road', 'sky', 'sky'],
  outro1: ['sky', 'sky', 'sky', 'sky'],
};

/** Per kind: a row's height and the face's width (m), and the face's type: its average advance per character (a share
 *  of the em) and the share of a row the em may take. */
export const LAYOUT: Record<Kind, { rowH: number; w: number; advance: number; emOfRow: number }> = {
  road: { rowH: 3.4, w: 7, advance: 0.62, emOfRow: 0.7 },
  sky: { rowH: 9, w: 40, advance: 0.42, emOfRow: 0.72 },
  wall: { rowH: 2.6, w: 12, advance: 0.62, emOfRow: 0.7 },
  sign: { rowH: 1.3, w: 4.6, advance: 0.42, emOfRow: 0.62 },
  gantry: { rowH: 2, w: 8, advance: 0.42, emOfRow: 0.62 },
};
/** A phrase longer than this (characters) takes two rows. */
export const WRAP_AT = 13;
const TEXT_W = 0.9;

/** Placement: paint begins this far past where the car's centre is at the phrase's end (m); sky text this far ahead of the car at
 *  its start, this high (every other one higher by `lift`), this far off to alternate sides; walls this far off the road, their text this high; signs and
 *  gantries as before. */
export const ROAD_AHEAD = 3.5;
/** Road paint is framed from this far (m, or perLength x its length if more) and this steeply (radians) behind it. */
export const ROAD_VIEW = { dist: 11, pitch: 0.95, perLength: 2.3 };
/** Walls are watched from this far out along their normal (m), sliding with the car up to this far either way. */
export const WALL_VIEW = { dist: 20, slide: 7 };
export const SKY = { ahead: 75, up: 19, side: 17, lift: 7 };
export const WALL = { lateral: 15, y: 5 };
export const SIGN = { lateral: 7.5, y: 3, toe: (25 * Math.PI) / 180 };
export const GANTRY_Y = 6;

/** A line sung faster than people read (0.3 s a word, subtitle standards: docs/LYRIC_VIDEO_TENETS.md §2). */
export const isFast = (line: { words: readonly { start: number }[]; end: number }) =>
  line.end - line.words[0]!.start < 0.3 * line.words.length;

export function rowsOf(text: string): string[] {
  if (text.length <= WRAP_AT) return [text];
  const words = text.split(' ');
  let best = 1, bestD = Infinity;
  for (let k = 1; k < words.length; k++) {
    const d = Math.abs(words.slice(0, k).join(' ').length - words.slice(k).join(' ').length);
    if (d < bestD) { bestD = d; best = k; }
  }
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
}

function layout(kind: Kind, text: string) {
  const L = LAYOUT[kind], rows = rowsOf(kind === 'road' || kind === 'wall' ? text.toUpperCase() : text);
  const longest = Math.max(...rows.map((r) => r.length));
  const em = Math.min(L.rowH * L.emOfRow, (L.w * TEXT_W) / (longest * L.advance));
  return { rows, em, w: L.w, h: L.rowH * rows.length };
}

const WORLD_UP = new THREE.Vector3(0, 1, 0);
/** The text's up for a face with this normal: world up, made orthogonal to it (paint on the road: the road's forward). */
const uprightFor = (normal: THREE.Vector3, fallback: THREE.Vector3) => {
  const u = WORLD_UP.clone().addScaledVector(normal, -normal.dot(WORLD_UP));
  return u.lengthSq() < 1e-6 ? fallback.clone() : u.normalize();
};
const flat = (v: THREE.Vector3) => new THREE.Vector3(v.x, 0, v.z).normalize();

export function placeCarriers(R: readonly Stretch[], motion: Motion, route: Route): Carrier[] {
  const out: Carrier[] = [];
  const last: Record<string, number> = {};
  const room = (key: string, s: number, gap: number) => { const v = Math.max(s, (last[key] ?? -Infinity) + gap); last[key] = v; return v; };
  const lines = R.flatMap((st) => st.lines);
  const nextStart = (i: number) => lines.find((l) => l.i > i)?.words[0]!.start ?? Infinity;
  for (const st of R) {
    const pattern = PATTERNS[st.id] ?? ['sign'];
    st.lines.forEach((line, li) => {
      let kind: Kind = /\bfly\b/i.test(line.text) ? 'sky' : pattern[li % pattern.length]!;
      // a fast line is framed two phrases at a time (pairFraming): on walls, which pair side by side (a sign's next
      // stands behind it; paint on a moving road lies too far on to share a readable frame)
      if (isFast(line) && (kind === 'sign' || kind === 'road')) kind = 'wall';
      // walls stand on the left (seen from the right, the drive runs left to right on screen); none where the sea is
      const wallSide = -1;
      const phs = phrasesOf(line, nextStart(line.i));
      phs.forEach((ph, pi) => {
        // a line's first phrase too short to read alone, straight after the line before, stays on that line's kind of
        // carrier, so the frame before can show it coming (pairFraming)
        const prev = out[out.length - 1];
        const alone = (phs[pi + 1]?.start ?? nextStart(line.i)) - ph.start - SETTLE;
        const k: Kind = pi === 0 && prev && PAIRABLE.has(prev.kind) && ph.start - prev.phrase.end < 0.4 && alone < dwellFor(ph.words.length) ? prev.kind : kind;
        const kind_ = k;
        const lay = layout(kind_, ph.text), id = `L${line.i}.${pi}`;
        let s: number, center: THREE.Vector3, normal: THREE.Vector3, up: THREE.Vector3;
        if (kind_ === 'road') {
          s = room('road', motion.distanceAt(ph.end) + ROAD_AHEAD + lay.h / 2, lay.h + 2); const f = route.frameAt(s);
          center = f.pos.clone().addScaledVector(f.up, 0.03);
          normal = f.up.clone();
          up = f.fwd.clone().negate();
        } else if (kind_ === 'sky') {
          const side = pi % 2 === 0 ? -1 : 1; // left first, then right: read left to right
          s = motion.distanceAt(ph.start) + SKY.ahead; const f = route.frameAt(s);
          center = f.pos.clone().addScaledVector(WORLD_UP, SKY.up + (pi % 2) * SKY.lift).addScaledVector(f.right, side * SKY.side);
          const car = route.frameAt(motion.distanceAt((ph.start + ph.end) / 2)).pos;
          normal = car.clone().sub(center).normalize();
          up = uprightFor(normal, WORLD_UP);
        } else if (kind_ === 'wall') {
          s = room(`wall${wallSide}`, motion.distanceAt((ph.start + ph.end) / 2), lay.w + 12); const f = route.frameAt(s);
          center = f.pos.clone().addScaledVector(f.right, wallSide * WALL.lateral).addScaledVector(WORLD_UP, WALL.y);
          normal = flat(f.right.clone().multiplyScalar(-wallSide));
          up = WORLD_UP.clone();
        } else if (kind_ === 'gantry') {
          s = room('gantry', motion.distanceAt((ph.start + ph.end) / 2), 14); const f = route.frameAt(s);
          center = f.pos.clone().addScaledVector(f.up, GANTRY_Y);
          normal = flat(f.fwd.clone().negate());
          up = WORLD_UP.clone();
        } else {
          const side = 1; // on the right: the walls have the left
          s = room(`sign${side}`, motion.distanceAt((ph.start + ph.end) / 2), 10); const f = route.frameAt(s);
          center = f.pos.clone().addScaledVector(f.right, side * SIGN.lateral).addScaledVector(WORLD_UP, SIGN.y);
          const back = flat(f.fwd.clone().negate()), toRoad = flat(f.right.clone().multiplyScalar(-side));
          normal = back.multiplyScalar(Math.cos(SIGN.toe)).addScaledVector(toRoad, Math.sin(SIGN.toe)).normalize();
          up = WORLD_UP.clone();
        }
        out.push({ id, phrase: ph, kind: kind_, stretch: st.id, s, center, normal, up, ...lay });
      });
    });
  }
  return out;
}

/** The pose for a camera at `eye` looking at `at`. */
export function lookFrom(eye: THREE.Vector3, at: THREE.Vector3): Pose {
  const d = eye.clone().sub(at), dist = d.length();
  return { tx: at.x, ty: at.y, tz: at.z, dist, yaw: Math.atan2(d.x, d.z), pitch: Math.asin(d.y / dist), roll: 0 };
}

/** How the camera frames a carrier while its phrase is sung: a function of t (most follow the car). */
export function framing(c: Carrier, car: (t: number) => RouteFrame, carS: (t: number) => number): (t: number) => Pose {
  const jitter = (k: number) => hash(c.phrase.start * 1000, k) * 2 - 1; // a seeded variation, so runs don't repeat
  switch (c.kind) {
    case 'road': {
      // high in front of the words, looking back down the road at them, held: the car drives toward us, up to them
      const p: Pose = { tx: c.center.x, ty: c.center.y, tz: c.center.z, dist: Math.max(ROAD_VIEW.dist, c.h * ROAD_VIEW.perLength), yaw: Math.atan2(c.up.x, c.up.z) + Math.PI + 0.2 * jitter(1), pitch: ROAD_VIEW.pitch + 0.08 * jitter(2), roll: 0 };
      return () => p;
    }
    case 'sky': return (t) => {
      // low behind the car, looking up at the writing
      const f = car(t), eye = f.pos.clone().addScaledVector(flat(f.fwd), -8).addScaledVector(f.right, 2.5 * jitter(3)).add(new THREE.Vector3(0, 1.6, 0));
      return lookFrom(eye, c.center);
    };
    case 'wall': {
      // out from the wall across the road, sliding along with the car's progress past it (clamped)
      const along = c.up.clone().cross(c.normal).normalize(), dir = Math.sign(along.dot(car(c.phrase.start).fwd)) || 1;
      return (t) => {
        const slide = Math.max(-WALL_VIEW.slide, Math.min(WALL_VIEW.slide, carS(t) - c.s)) + 2 * jitter(4);
        const eye = c.center.clone().addScaledVector(c.normal, WALL_VIEW.dist).addScaledVector(along, dir * slide);
        eye.y = car(t).pos.y + 2.2;
        return lookFrom(eye, c.center);
      };
    }
    default: {
      const p = fitSign({ center: c.center, normal: c.normal, w: c.w, h: c.h });
      return () => ({ ...p, yaw: p.yaw + 0.2 * jitter(5) });
    }
  }
}

/** Two phrases framed at once, the one being sung and the next (`n`), so the next can be read before it's sung — for
 *  fast lines: two walls, from out across the road between them (the next is to the right). Null where the pair can't
 *  share a frame (not both walls). */
export function pairFraming(c: Carrier, n: Carrier, car: (t: number) => RouteFrame): ((t: number) => Pose) | null {
  if (c.kind !== n.kind || !PAIRABLE.has(c.kind)) return null;
  const mid = c.center.clone().lerp(n.center, 0.5), span = c.center.distanceTo(n.center);
  const eye = mid.clone().addScaledVector(c.normal, Math.max(WALL_VIEW.dist, (span + c.w) * PAIR.wall));
  return (t) => { const e = eye.clone(); e.y = car(t).pos.y + 2.2; return lookFrom(e, mid); };
}
/** How far back a pair framing stands, per metre of the pair's extent. */
export const PAIR = { wall: 0.95 };
