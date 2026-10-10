// The drive as a pure model: the stretches, the car's motion, the road, the lyric carriers and the camera. The scene
// renders it (scenes/drive.ts) and the guards check it (tests/sung.test.ts) — the same object, so what is checked is
// what shows.
import type { AudioData } from '../engine/audio';
import type { Lyrics } from '../engine/lyrics';
import { CHASE, type Pose, chase } from './camera';
import { type Carrier, framing, placeCarriers } from './carriers';
import type { Motion } from './motion';
import { Route, type RouteFrame } from './route';
import { type Shot, type Target, director, resolveAt } from './shots';
import { type Stretch, motionFor, resolveStretches } from './stretches';

const DEG = Math.PI / 180;
/** After a line, the camera goes back to the car only if the next line is at least this far off (s). */
export const BACK_TO_CAR_GAP = 1.2;
/** The chase framings sway this far either side of their preset (radians) at this rate (radians per second), so the
 *  camera never sits still on the car — but never swings round far enough to turn its direction on screen around. */
export const SWAY = { amp: 0.35, rate: 0.35 };

/** The road through the stretches: each stretch's segment is the distance the car covers in it. */
export function routeFor(R: readonly Stretch[], motion: Motion): Route {
  return new Route(R.map((s) => ({ s0: motion.distanceAt(s.start), s1: motion.distanceAt(s.end), turn: s.turn * DEG, rise: s.rise })));
}

export interface Drive {
  stretches: Stretch[];
  motion: Motion;
  route: Route;
  carriers: Carrier[];
  carFrame(t: number): RouteFrame;
  stretchAt(t: number): Stretch;
  camera(t: number): Pose;
  shots: Shot[];
}

export function makeDrive(audio: AudioData, lyrics: Lyrics): Drive {
  const stretches = resolveStretches(audio, lyrics), motion = motionFor(stretches, audio), route = routeFor(stretches, motion);
  const carriers = placeCarriers(stretches, motion, route);
  const carFrame = (t: number) => route.frameAt(motion.distanceAt(t));
  const stretchAt = (t: number) => stretches.find((s) => t >= s.start && t < s.end) ?? stretches[stretches.length - 1]!;
  const chaseOf = (st: Stretch): Target => (t) => {
    const p = chase(CHASE[st.chase], carFrame(t));
    return { ...p, yaw: p.yaw + Math.sin((t - st.start) * SWAY.rate) * SWAY.amp };
  };

  const shots: Shot[] = [];
  for (const st of stretches) if (st.k > 0) shots.push({ at: st.start, to: chaseOf(st), move: 'glide' });
  carriers.forEach((c, i) => {
    const w = c.phrase.words[0]!, next = carriers[i + 1];
    shots.push({ at: { start: w.start, w: w.w }, to: framing(c, carFrame, (t) => motion.distanceAt(t)) });
    const lineEnds = !next || next.phrase.line !== c.phrase.line;
    if (lineEnds && (!next || next.phrase.start - c.phrase.end >= BACK_TO_CAR_GAP)) {
      shots.push({ at: c.phrase.end + 0.05, to: chaseOf(stretchAt(c.phrase.end + 0.05)), move: 'land' });
    }
  });
  // a stretch's glide that would start within 0.3 s of a phrase's own shots gives way to them
  const own = shots.filter((s) => typeof s.at === 'object' || s.move === 'land');
  const kept = shots.filter((s) => own.includes(s) || !own.some((l) => Math.abs(resolveAt(l.at) - resolveAt(s.at)) < 0.3));
  const camera = director(audio, kept, chaseOf(stretches[0]!));
  return { stretches, motion, route, carriers, carFrame, stretchAt, camera, shots: kept };
}
