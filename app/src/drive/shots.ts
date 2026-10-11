// The camera language, from I Like Ur Look's director (spreads/shots.ts there), lifted off the page into the world. A
// stretch lists shots — a target to frame, starting on a beat, a hit or a sung word's cue — and the director eases
// between them, landing on the beat grid: 'cut' is there at once (an edit), 'swoop' flies there in SWOOP_S over an arc
// (the long moves: one continuous take), 'whip' pans in WHIP_S on a straight line (a set-piece's turn from one
// surface to its neighbour), 'snap' jumps in a fixed SNAP_S, 'land' overshoots and settles on a beat,
// 'glide' eases across a bar to a downbeat. A target is a function of time (a chase framing follows the car), and each
// move eases from the previous move's pose *at the same t*, so handing the camera from a moving car to a fixed sign
// (or back) never jumps. Pure functions of t.
import type { AudioData } from '../engine/audio';
import { ease } from '../engine/util';
import { type Pose, lerpPose, linePose, swoopPose } from './camera';

export type Target = (t: number) => Pose;
export type ShotMove = 'cut' | 'swoop' | 'whip' | 'land' | 'snap' | 'glide';
/** A sung word's cue: resolves to `start - LEAD`, so a snap's motion lands on the word. `w` names it in errors. */
export type WordCue = { start: number; w?: string };
export interface Shot {
  at: number | WordCue;
  to: Target;
  /** Default 'snap'. */
  move?: ShotMove;
  /** Land exactly then (on the beat grid unless the move is a snap). */
  until?: number;
  /** The move's own easing in place of its move's. */
  ease?: (u: number) => number;
}
export interface Move { at: number; land: number; to: Target; ease: (u: number) => number; path: (a: Pose, b: Pose, u: number) => Pose }

/** 'snap's fixed duration (s): the approved animatic's jump. */
export const SNAP_S = 0.25;
/** A word cue leads its word by this (s): outExpo puts most of a snap in its first frames. */
export const LEAD = 0.04;
/** 'land' takes at least this long to reach its beat (s). */
export const LAND_MIN = 0.25;
/** 'land's overshoot (ease.outBack's s). */
export const OVERSHOOT = 1.25;

export const resolveAt = (at: Shot['at']) => (typeof at === 'number' ? at : at.start - LEAD);
const describeAt = (s: Shot, at: number) => (typeof s.at === 'object' && s.at.w !== undefined ? `word "${s.at.w}" at ${at.toFixed(3)}` : at.toFixed(3));

// ---- the beat grid ----
export const beatAtOrAfter = (a: AudioData, t: number) => a.timeOfBeat(Math.ceil(a.beatAt(t) - 1e-9));
const barOf = (a: AudioData) => { const d = a.downbeats; return d.length > 1 ? d[d.length - 1]! - d[d.length - 2]! : 240 / a.bpm; };
export function downbeatAtOrAfter(a: AudioData, t: number) {
  for (const x of a.downbeats) if (x >= t - 1e-9) return x;
  const last = a.downbeats[a.downbeats.length - 1] ?? 0, bar = barOf(a);
  return last + Math.ceil((t - last) / bar - 1e-9) * bar;
}
function onGrid(a: AudioData, t: number) {
  return Math.abs(a.timeOfBeat(Math.round(a.beatAt(t) * 2) / 2) - t) < 1e-3;
}

/** A swoop's and a whip's durations (s). */
export const SWOOP_S = 0.42, WHIP_S = 0.25;
const EASE: Record<ShotMove, (u: number) => number> = {
  cut: () => 1,
  swoop: (u) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2), // easeInOutCubic
  whip: (u) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2),
  land: (u) => ease.outBack(u, OVERSHOOT),
  snap: (u) => (1 - 2 ** (-10 * u)) / (1 - 2 ** -10), // outExpo, normalised to land exactly
  glide: (u) => -(Math.cos(Math.PI * u) - 1) / 2,
};

function landing(a: AudioData, s: Shot, at: number) {
  const m = s.move ?? 'snap';
  if (s.until !== undefined) {
    if (m !== 'snap' && !onGrid(a, s.until)) throw new Error(`shot ${describeAt(s, at)}: until ${s.until} is not on the beat grid`);
    return s.until;
  }
  if (m === 'cut') return at + 1e-4;
  if (m === 'swoop') return at + SWOOP_S;
  if (m === 'whip') return at + WHIP_S;
  if (m === 'snap') return at + SNAP_S;
  if (m === 'glide') return downbeatAtOrAfter(a, at + barOf(a));
  return beatAtOrAfter(a, at + LAND_MIN);
}

/** The moves, in time order. Throws on two shots resolving to the same start. */
export function plan(a: AudioData, shots: readonly Shot[]): Move[] {
  const resolved = shots.map((s) => ({ s, at: resolveAt(s.at) })).sort((x, y) => x.at - y.at);
  for (let i = 1; i < resolved.length; i++) {
    if (Math.abs(resolved[i]!.at - resolved[i - 1]!.at) < 1e-6) {
      throw new Error(`two shots both start at ${resolved[i]!.at.toFixed(3)}: ${describeAt(resolved[i - 1]!.s, resolved[i - 1]!.at)} and ${describeAt(resolved[i]!.s, resolved[i]!.at)}`);
    }
  }
  return resolved.map(({ s, at }) => {
    const land = landing(a, s, at);
    if (!(land > at)) throw new Error(`shot ${describeAt(s, at)}: lands at ${land.toFixed(3)}, not after it starts`);
    return { at, land, to: s.to, ease: s.ease ?? EASE[s.move ?? 'snap'], path: s.move === 'swoop' ? swoopPose : s.move === 'whip' ? linePose : lerpPose };
  });
}

/** The pose at t: move i eases from move i-1's pose at t (recursively) to its target at t; before the first, `start`. */
export function evaluate(moves: readonly Move[], t: number, start: Target): Pose {
  let i = moves.length - 1;
  while (i >= 0 && moves[i]!.at > t) i--;
  const poseOf = (k: number): Pose => {
    if (k < 0) return start(t);
    const m = moves[k]!, u = (t - m.at) / (m.land - m.at);
    return u >= 1 ? m.to(t) : m.path(poseOf(k - 1), m.to(t), m.ease(Math.max(0, u)));
  };
  return poseOf(i);
}

/** camera(t) for a list of shots. */
export function director(a: AudioData, shots: readonly Shot[], start: Target): (t: number) => Pose {
  const moves = plan(a, shots);
  return (t) => evaluate(moves, t, start);
}
