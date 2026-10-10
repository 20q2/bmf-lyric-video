// Where each phrase is written in the world (its "carrier"), and how the camera finds it. Every lyric line takes one
// kind of carrier from its stretch's pattern (the "fly" lines always the sky), and each of its phrases gets its own:
//   road   painted on the asphalt just past where the car is when the phrase ends, written to be read from ahead: the
//          camera holds high in front of the words looking back, the car drives toward it, down the screen, up to them
//          (never over them while they're sung), and each next phrase lies further on: lower on screen, read top-down
//   sky    written in the sky ahead as it's sung, then dissolving (carrierart.ts); the camera sits low behind the
//          car and looks up at it
//   left   on the road's left, facing it: a mural on a building's wall, a billboard on posts, a shop's fascia, neon on
//          a dark wall (the Strip at night); from across the road the camera looks left, so the car drives left to
//          right on screen. Two phrases share a building, one over the other (read top-down, then on to the next
//          building, on the right): a slow verse's run keeps up with the car. Any two share a frame (pairFraming)
//   sign   a short roadside board on the right; `street` a green street-name blade; the camera snaps to it
//   gantry a green freeway sign over the road; the camera snaps to it
//   tunnel lit up along a tunnel's left wall (the bridge, tunnel.ts), framed from across the bore like the left faces
// Each phrase's text is blank until the camera first comes for it (`reveal`, set by makeDrive): the world ahead
// shows its signs and walls, never the song beyond the next phrase.
// Placement and text layout (rows and type size, in metres) are pure, so the guards can check legibility under bun;
// the scene draws the faces to match (carrierart.ts). A carrier's text runs along `along` = up x normal, upright along `up`.
import * as THREE from 'three';
import { OBB } from 'three/addons/math/OBB.js';
import { hash } from '../engine/util';
import { type Pose, fitSign } from './camera';
import type { Motion } from './motion';
import type { Phrase } from './phrases';
import { SETTLE, dwellFor, phrasesOf } from './phrases';
import type { Route, RouteFrame } from './route';
import type { Stretch } from './stretches';
import { TUNNEL, TUNNEL_CLEAR, type Tunnel, nearTunnel } from './tunnel';

export type LeftKind = 'wall' | 'billboard' | 'storefront' | 'neon';
export type Kind = 'road' | 'sky' | LeftKind | 'sign' | 'street' | 'gantry' | 'tunnel';
export const KINDS: readonly Kind[] = ['road', 'sky', 'wall', 'billboard', 'storefront', 'neon', 'sign', 'street', 'gantry', 'tunnel'];
/** Kinds two phrases can share a frame on (pairFraming): the faces on the road's left, side by side. (Paint on a moving
 *  road lies too far on, and two sky phrases too far apart, for a frame that holds both at a readable size: measured,
 *  tests/sung.test.ts.) */
export const PAIRABLE: ReadonlySet<Kind> = new Set<LeftKind>(['wall', 'billboard', 'storefront', 'neon']);

export interface Carrier {
  id: string;
  phrase: Phrase;
  kind: Kind;
  stretch: string;
  /** When its text first shows (s): the start of the first shot that frames it (makeDrive; until then, its first
   *  word's start). */
  reveal: number;
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
  /** How high its centre stands over the ground (m). */
  foot: number;
  /** Its solid part in its own frame (basisOf): a board's backing, or the building it's on; null where it has none of
   *  its own (road paint, sky-writing, the lower of two faces stacked on one building). */
  solid: { at: THREE.Vector3; size: THREE.Vector3 } | null;
  /** On the left, two phrases share a building, one over the other: which this is (none: alone). */
  stack?: 'top' | 'bottom';
  /** For a stacked face: how far up (m) from its centre the middle of the stack is, where its shots aim. */
  stackDy?: number;
}

/** Each stretch's carriers, line by line (cycled); a line with "fly" in it is always written in the sky. */
export const PATTERNS: Record<string, readonly Kind[]> = {
  intro: ['sign'],
  chorus1: ['road', 'road', 'billboard', 'sky', 'street'],
  verse1: ['street', 'wall', 'road', 'sign', 'billboard', 'road', 'storefront'],
  chorus2: ['gantry', 'gantry', 'road', 'sky'],
  verse2: ['storefront', 'street', 'road', 'wall', 'sign', 'road', 'billboard', 'street', 'road'],
  chorus3: ['road', 'sky', 'road', 'sky'],
  bridge1: ['tunnel'],
  verse3: ['neon', 'sign', 'billboard', 'sky', 'neon', 'street', 'storefront', 'sign', 'road'],
  chorus4: ['road', 'sky', 'sky'],
  outro1: ['sky', 'sky', 'sky', 'sky'],
};
/** A fast line moves to the road's left (so it can pair); which face it takes there, cycled line by line. */
export const FAST_LEFT: Record<string, readonly LeftKind[]> = {
  verse1: ['wall', 'billboard', 'storefront'],
  verse2: ['billboard', 'wall', 'storefront', 'neon'],
  verse3: ['neon', 'billboard', 'neon', 'storefront', 'wall'],
};

/** Per kind: a row's height and the face's width (m), and the face's type: its average advance per character (a share
 *  of the em) and the share of a row the em may take. */
export const LAYOUT: Record<Kind, { rowH: number; w: number; advance: number; emOfRow: number }> = {
  road: { rowH: 3.4, w: 7, advance: 0.62, emOfRow: 0.7 },
  sky: { rowH: 9, w: 40, advance: 0.42, emOfRow: 0.72 },
  wall: { rowH: 2.6, w: 12, advance: 0.62, emOfRow: 0.7 },
  billboard: { rowH: 2.8, w: 14, advance: 0.52, emOfRow: 0.72 },
  storefront: { rowH: 2.3, w: 13, advance: 0.62, emOfRow: 0.68 },
  neon: { rowH: 2.4, w: 11, advance: 0.42, emOfRow: 0.7 },
  sign: { rowH: 1.3, w: 4.6, advance: 0.42, emOfRow: 0.62 },
  street: { rowH: 1, w: 4.4, advance: 0.55, emOfRow: 0.66 },
  gantry: { rowH: 2, w: 8, advance: 0.55, emOfRow: 0.62 },
  tunnel: { rowH: 2, w: 10, advance: 0.62, emOfRow: 0.7 },
};
/** Kinds set in capitals. */
export const CAPS: ReadonlySet<Kind> = new Set<Kind>(['road', 'wall', 'billboard', 'storefront', 'tunnel']);
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
export const WALL_VIEW = { dist: 20, slide: 7, eye: 2.2 };
export const SKY = { ahead: 75, up: 19, side: 17, lift: 7 };
/** The faces on the left stand this far off the road's centre (m). Per kind: how high a lone face's centre stands, and
 *  where the lower of two stacked faces starts (its bottom edge); the two stand STACK_GAP apart. */
export const LEFT_LATERAL = 15;
export const LEFT: Record<LeftKind, { y: number; base: number }> = {
  wall: { y: 5, base: 1.6 },
  billboard: { y: 8, base: 5.5 },
  storefront: { y: 3.4, base: 2 },
  neon: { y: 6, base: 2.2 },
};
export const STACK_GAP = 0.8;
/** The faces on the left stand at least this far apart (m, between their edges): a street frontage, not a row of
 *  lots, so a slow verse's run of them keeps up with the car. */
export const LEFT_GAP = 3;
/** The ground under a face on the left. */
const groundY = (c: Carrier) => c.center.y - c.foot;
export const SIGN = { lateral: 7.5, y: 3, toe: (25 * Math.PI) / 180, gap: 14 };
export const STREET = { lateral: 6.5, y: 3.6 };
export const GANTRY_Y = 6;
/** Tunnel lettering's centre stands this high on the wall (m); the camera frames it from this far out, across the bore,
 *  sliding with the car up to `slide` either way, from `eye` m up: the car passes between, so it looks over it. */
export const TUNNEL_TEXT = { y: 3.8, dist: 2 * TUNNEL.halfW - 1.5, slide: 5, eye: 3.6 };
/** A gantry stands at least this far past the last face on the left (m). */
export const GANTRY_CLEAR = 20;

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
  const L = LAYOUT[kind], rows = rowsOf(CAPS.has(kind) ? text.toUpperCase() : text);
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

export function placeCarriers(R: readonly Stretch[], motion: Motion, route: Route, tunnels: readonly Tunnel[] = []): Carrier[] {
  const out: Carrier[] = [];
  // anything standing by the road stands clear of a tunnel and its mouths
  const clear = (s: number) => { const tn = nearTunnel(tunnels, s, TUNNEL_CLEAR); return tn ? tn.s1 + TUNNEL_CLEAR : s; };
  const last: Record<string, number> = {};
  const room = (key: string, s: number, gap: number) => { const v = Math.max(s, (last[key] ?? -Infinity) + gap); last[key] = v; return v; };
  const lines = R.flatMap((st) => st.lines);
  const nextStart = (i: number) => lines.find((l) => l.i > i)?.words[0]!.start ?? Infinity;
  for (const st of R) {
    const pattern = PATTERNS[st.id] ?? ['sign'];
    st.lines.forEach((line, li) => {
      let kind: Kind = /\bfly\b/i.test(line.text) ? 'sky' : pattern[li % pattern.length]!;
      // a fast line is framed two phrases at a time (pairFraming): on the left, where faces pair side by side (a sign's
      // next stands behind it; paint on a moving road lies too far on to share a readable frame)
      if (isFast(line) && kind !== 'sky' && !PAIRABLE.has(kind)) { const fl = FAST_LEFT[st.id] ?? ['wall']; kind = fl[li % fl.length]!; }
      const phs = phrasesOf(line, nextStart(line.i));
      phs.forEach((ph, pi) => {
        // a line's first phrase too short to read alone, straight after the line before, stays on that line's kind of
        // carrier, so the frame before can show it coming (pairFraming)
        const prev = out[out.length - 1];
        const alone = (phs[pi + 1]?.start ?? nextStart(line.i)) - ph.start - SETTLE;
        let kind_: Kind = pi === 0 && prev && PAIRABLE.has(prev.kind) && !PAIRABLE.has(kind) && ph.start - prev.phrase.end < 0.4 && alone < dwellFor(ph.words.length) ? prev.kind : kind;
        // a street blade holds one row
        if (kind_ === 'street' && rowsOf(ph.text).length > 1) kind_ = 'sign';
        let lay = layout(kind_, ph.text);
        const id = `L${line.i}.${pi}`;
        let s: number, center: THREE.Vector3, normal: THREE.Vector3, up: THREE.Vector3, foot: number | undefined, stack: Carrier['stack'], stackDy: number | undefined;
        let solid: Carrier['solid'] | undefined;
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
        } else if (PAIRABLE.has(kind_) && prev && !prev.stack && PAIRABLE.has(prev.kind) && prev.stretch === st.id) {
          // under the face before, on its building: that one moves up to make room
          kind_ = prev.kind; lay = layout(kind_, ph.text);
          const L = LEFT[kind_ as LeftKind], fB = L.base + lay.h / 2, fT = L.base + lay.h + STACK_GAP + prev.h / 2;
          prev.center.addScaledVector(WORLD_UP, fT - prev.foot);
          prev.foot = fT; prev.stack = 'top'; prev.stackDy = (fB - fT) / 2;
          prev.solid = solidFor(kind_, Math.max(prev.w, lay.w), prev.h, fT, { h: lay.h, dy: fB - fT });
          s = prev.s; normal = prev.normal.clone(); up = prev.up.clone();
          center = prev.center.clone().addScaledVector(WORLD_UP, fB - fT);
          foot = fB; solid = null; stack = 'bottom'; stackDy = (fT - fB) / 2;
        } else if (PAIRABLE.has(kind_)) {
          // on the left (seen from the right, the drive runs left to right on screen); on a bend, on along the road
          // until it stands clear of the one before (their buildings swing into each other on the inside of a turn)
          const L = LEFT[kind_ as LeftKind], before = out.findLast((c) => PAIRABLE.has(c.kind) && c.solid);
          const at = (s: number) => { const f = route.frameAt(s); return { center: f.pos.clone().addScaledVector(f.right, -LEFT_LATERAL).addScaledVector(WORLD_UP, L.y), normal: flat(f.right.clone()), up: WORLD_UP.clone() }; };
          s = room('left', clear(motion.distanceAt((ph.start + ph.end) / 2)), lay.w + LEFT_GAP);
          solid = solidFor(kind_, lay.w, lay.h, L.y);
          while (before && overlaps(before, { ...at(s), solid })) s += 1;
          last.left = s;
          ({ center, normal, up } = at(s));
          foot = L.y;
        } else if (kind_ === 'tunnel') {
          // on the bore's left wall
          s = room('tunnel', motion.distanceAt((ph.start + ph.end) / 2), lay.w + 4); const f = route.frameAt(s);
          center = f.pos.clone().addScaledVector(f.right, -(TUNNEL.halfW - 0.05)).addScaledVector(WORLD_UP, TUNNEL_TEXT.y);
          normal = flat(f.right.clone());
          up = WORLD_UP.clone();
          foot = TUNNEL_TEXT.y; solid = null;
        } else if (kind_ === 'gantry') {
          // past the faces on the left (a verse's run of them may still be going when the freeway starts)
          s = room('gantry', clear(Math.max(motion.distanceAt((ph.start + ph.end) / 2), (last.left ?? -Infinity) + GANTRY_CLEAR)), 14); const f = route.frameAt(s);
          center = f.pos.clone().addScaledVector(f.up, GANTRY_Y);
          normal = flat(f.fwd.clone().negate());
          up = WORLD_UP.clone();
        } else {
          // signs and street blades on the right: the left is taken
          const P = kind_ === 'street' ? STREET : SIGN;
          s = room('right', clear(motion.distanceAt((ph.start + ph.end) / 2)), SIGN.gap); const f = route.frameAt(s);
          center = f.pos.clone().addScaledVector(f.right, P.lateral).addScaledVector(WORLD_UP, P.y);
          const back = flat(f.fwd.clone().negate()), toRoad = flat(f.right.clone().negate());
          normal = back.multiplyScalar(Math.cos(SIGN.toe)).addScaledVector(toRoad, Math.sin(SIGN.toe)).normalize();
          up = WORLD_UP.clone();
        }
        foot ??= center.y - route.frameAt(s).pos.y;
        if (solid === undefined) solid = solidFor(kind_, lay.w, lay.h, foot);
        out.push({ id, phrase: ph, kind: kind_, stretch: st.id, reveal: ph.start, s, center, normal, up, ...lay, foot, solid, ...(stack ? { stack, stackDy } : {}) });
      });
    });
  }
  return out;
}

/** How tall the building behind a face on the left stands (m; a billboard stands on posts, none). */
export const BUILDING_H: Partial<Record<LeftKind, number>> = { wall: 14, storefront: 7, neon: 12 };
/** The carrier's own frame: x along its text, y its text's up, z its face's normal, origin at its centre. */
export const basisOf = (c: Carrier) => new THREE.Matrix4().makeBasis(c.up.clone().cross(c.normal).normalize(), c.up, c.normal).setPosition(c.center);
/** A face's solid part, in its own frame (m): the building it's on (its foot on the ground, at least 1.5 m above the
 *  text), or its backing board, taking in a face stacked `under` it (its height, and its centre's offset). */
function solidFor(kind: Kind, w: number, h: number, foot: number, under?: { h: number; dy: number }): Carrier['solid'] {
  if (kind === 'road' || kind === 'sky') return null;
  const H = BUILDING_H[kind as LeftKind];
  if (H) { const top = Math.max(H, foot + h / 2 + 1.5); return { at: new THREE.Vector3(0, top / 2 - foot, -5.06), size: new THREE.Vector3(w + LEFT_GAP, top, 10) }; }
  const lo = under ? under.dy - under.h / 2 : -h / 2;
  return { at: new THREE.Vector3(0, (lo + h / 2) / 2, -0.1), size: new THREE.Vector3(w + 0.2, h / 2 - lo + 0.2, 0.15) };
}
/** A carrier's solid parts, which can hide another's face. The scene builds them from this (world.ts), so the guard
 *  checks what shows. */
export const solidsOf = (c: Pick<Carrier, 'solid'>) => (c.solid ? [c.solid] : []);

/** Whether two carriers' solids come within CLEAR of each other. */
type Placed = Pick<Carrier, 'center' | 'normal' | 'up' | 'solid'>;
const CLEAR = 0.5;
function overlaps(a: Placed, b: Placed): boolean {
  const obbs = (c: Placed) => { const m = basisOf(c as Carrier); return solidsOf(c as Carrier).map(({ at, size }) => new OBB(at, size.clone().addScalar(CLEAR).multiplyScalar(0.5)).applyMatrix4(m)); };
  const bs = obbs(b);
  return obbs(a).some((x) => bs.some((y) => x.intersectsOBB(y)));
}

/** The pose for a camera at `eye` looking at `at`. */
export function lookFrom(eye: THREE.Vector3, at: THREE.Vector3): Pose {
  const d = eye.clone().sub(at), dist = d.length();
  return { tx: at.x, ty: at.y, tz: at.z, dist, yaw: Math.atan2(d.x, d.z), pitch: Math.asin(d.y / dist), roll: 0 };
}

/** How the camera frames a carrier while its phrase is sung: a function of t (most follow the car). */
export function framing(c: Carrier, car: (t: number) => RouteFrame, carS: (t: number) => number): (t: number) => Pose {
  const jitter = (k: number) => hash(c.phrase.start * 1000, k) * 2 - 1; // a seeded variation, so runs don't repeat
  if (PAIRABLE.has(c.kind) || c.kind === 'tunnel') {
    // out from the face across the road (or the bore), sliding along with the car's progress past it (clamped); a
    // stacked face's shot holds its whole stack, read top-down
    const V = c.kind === 'tunnel' ? TUNNEL_TEXT : WALL_VIEW;
    const along = c.up.clone().cross(c.normal).normalize(), dir = Math.sign(along.dot(car(c.phrase.start).fwd)) || 1;
    const aim = c.center.clone().addScaledVector(WORLD_UP, c.stackDy ?? 0);
    return (t) => {
      const slide = Math.max(-V.slide, Math.min(V.slide, carS(t) - c.s)) + 2 * jitter(4);
      const eye = aim.clone().addScaledVector(c.normal, V.dist).addScaledVector(along, dir * slide);
      eye.y = groundY(c) + V.eye; // eye height over the ground across from it (not the car's: it may be on a grade)
      return lookFrom(eye, aim);
    };
  }
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
    default: {
      const p = fitSign({ center: c.center, normal: c.normal, w: c.w, h: c.h });
      return () => ({ ...p, yaw: p.yaw + 0.2 * jitter(5) });
    }
  }
}

/** Two phrases framed at once, the one being sung and the next (`n`), so the next can be read before it's sung — for
 *  fast lines: two faces on the left, from out across the road between them (the next is to the right). Null where the
 *  pair can't share a frame (not both on the left). */
export function pairFraming(c: Carrier, n: Carrier): ((t: number) => Pose) | null {
  if (!PAIRABLE.has(c.kind) || !PAIRABLE.has(n.kind)) return null;
  const mid = c.center.clone().lerp(n.center, 0.5), span = c.center.distanceTo(n.center);
  const dist = Math.max(WALL_VIEW.dist, (span + Math.max(c.w, n.w)) * PAIR.wall);
  const eye = mid.clone().addScaledVector(c.normal, dist);
  // further out than usual, it stands back past the signs on the right: up over them
  eye.y = (groundY(c) + groundY(n)) / 2 + 2.2 + (dist - WALL_VIEW.dist) * PAIR.lift;
  const p = lookFrom(eye, mid);
  return () => p;
}
/** How far back a pair framing stands, per metre of the pair's extent; and how far it rises (m) per metre further out
 *  than WALL_VIEW.dist. */
export const PAIR = { wall: 0.95, lift: 0.5 };
