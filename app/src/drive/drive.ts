// The drive as a pure model: the stretches, the car's motion, the road, the signs and the camera. The scene renders it
// (scenes/drive.ts) and the guards check it (tests/sung.test.ts) — the same object, so what is checked is what shows.
import type { AudioData } from '../engine/audio';
import type { Lyrics } from '../engine/lyrics';
import { CHASE, type Pose, chase, fitSign } from './camera';
import type { Motion } from './motion';
import { Route, type RouteFrame } from './route';
import { type Shot, type Target, director, resolveAt } from './shots';
import { type Sign, placeSigns } from './signs';
import { type Stretch, motionFor, resolveStretches } from './stretches';

const DEG = Math.PI / 180;
/** After a line, the camera goes back to the car only if the next line is at least this far off (s). */
export const BACK_TO_CAR_GAP = 1.2;

/** The road through the stretches: each stretch's segment is the distance the car covers in it. */
export function routeFor(R: readonly Stretch[], motion: Motion): Route {
  return new Route(R.map((s) => ({ s0: motion.distanceAt(s.start), s1: motion.distanceAt(s.end), turn: s.turn * DEG, rise: s.rise })));
}

export interface Drive {
  stretches: Stretch[];
  motion: Motion;
  route: Route;
  signs: Sign[];
  /** Where the car is at t. */
  carFrame(t: number): RouteFrame;
  stretchAt(t: number): Stretch;
  camera(t: number): Pose;
  /** The shots camera() is directed from (for the guards' messages). */
  shots: Shot[];
}

export function makeDrive(audio: AudioData, lyrics: Lyrics): Drive {
  const stretches = resolveStretches(audio, lyrics), motion = motionFor(stretches, audio), route = routeFor(stretches, motion);
  const signs = placeSigns(stretches, motion, route);
  const carFrame = (t: number) => route.frameAt(motion.distanceAt(t));
  const stretchAt = (t: number) => stretches.find((s) => t >= s.start && t < s.end) ?? stretches[stretches.length - 1]!;
  const chaseOf = (st: Stretch): Target => (t) => chase(CHASE[st.chase], carFrame(t));
  const signOf = (sg: Sign): Target => { const p = fitSign(sg); return () => p; };

  const shots: Shot[] = [];
  for (const st of stretches) if (st.k > 0) shots.push({ at: st.start, to: chaseOf(st), move: 'glide' });
  signs.forEach((sg, i) => {
    const line = sg.line, next = signs[i + 1]?.line;
    shots.push({ at: { start: line.words[0]!.start, w: line.words[0]!.w }, to: signOf(sg) });
    if (!next || next.start - line.end >= BACK_TO_CAR_GAP) shots.push({ at: line.end + 0.05, to: chaseOf(stretchAt(line.end + 0.05)), move: 'land' });
  });
  // a stretch's glide that would start within 0.3 s of a line's own shots gives way to them
  const lineShots = new Set(shots.filter((s) => typeof s.at === 'object' || s.move === 'land'));
  const kept = shots.filter((s) => lineShots.has(s) || ![...lineShots].some((l) => Math.abs(resolveAt(l.at) - resolveAt(s.at)) < 0.3));
  const camera = director(audio, kept, chaseOf(stretches[0]!));
  return { stretches, motion, route, signs, carFrame, stretchAt, camera, shots: kept };
}
