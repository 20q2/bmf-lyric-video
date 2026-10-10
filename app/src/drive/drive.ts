// The drive as a pure model: the stretches, the car's motion, the road, the lyric carriers and the camera. The scene
// renders it (scenes/drive.ts) and the guards check it (tests/sung.test.ts) — the same object, so what is checked is
// what shows.
import type { AudioData } from '../engine/audio';
import type { Lyrics } from '../engine/lyrics';
import { CHASE, type Pose, chase } from './camera';
import { type Carrier, framing, isFast, pairFraming, placeCarriers } from './carriers';
import type { Motion } from './motion';
import { Route, type RouteFrame } from './route';
import { SETTLE, dwellFor, emphasisOf } from './phrases';
import { LEAD, SNAP_S, type Shot, type Target, director, resolveAt } from './shots';
import { type Stretch, motionFor, resolveStretches } from './stretches';
import { type Tunnel, tunnelsOf } from './tunnel';

const DEG = Math.PI / 180;
/** After a line, the camera goes back to the car only if the next line is at least this far off (s). */
export const BACK_TO_CAR_GAP = 1.2;
/** A line's first phrase may be found this long before its first word (s), when the line before has ended. */
export const PREROLL = 0.5;
/** A phrase's text never shows more than this long before it's sung (s), whatever frame it's in. */
export const REVEAL_AHEAD = 2;
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
  tunnels: Tunnel[];
  carFrame(t: number): RouteFrame;
  stretchAt(t: number): Stretch;
  camera(t: number): Pose;
  shots: Shot[];
}

export function makeDrive(audio: AudioData, lyrics: Lyrics): Drive {
  const stretches = resolveStretches(audio, lyrics), motion = motionFor(stretches, audio), route = routeFor(stretches, motion);
  const tunnels = tunnelsOf(stretches, motion, audio.beats);
  const carriers = placeCarriers(stretches, motion, route, tunnels, emphasisOf(lyrics.lines));
  const carFrame = (t: number) => route.frameAt(motion.distanceAt(t));
  const stretchAt = (t: number) => stretches.find((s) => t >= s.start && t < s.end) ?? stretches[stretches.length - 1]!;
  const chaseOf = (st: Stretch): Target => (t) => {
    const p = chase(CHASE[st.chase], carFrame(t));
    return { ...p, yaw: p.yaw + Math.sin((t - st.start) * SWAY.rate) * SWAY.amp };
  };

  const shots: Shot[] = [];
  for (const st of stretches) if (st.k > 0) shots.push({ at: st.start, to: chaseOf(st), move: 'glide' });
  // pass 1: each phrase's shot. A line's first phrase may be found up to PREROLL early, but not before the phrase before
  // it has been read and sung; every phrase's reading window runs from its shot until it has been up dwellFor.
  const reading: [number, number][] = [], paired: boolean[] = [];
  const phraseShots = carriers.map((c, i) => {
    const w = c.phrase.words[0]!, cue = w.start - LEAD, prev = carriers[i - 1];
    const free = prev ? Math.max(reading[i - 1]![1], prev.phrase.end + 0.1) : 0; // read, and done being sung
    const early = !prev || prev.phrase.line !== c.phrase.line ? Math.min(PREROLL, Math.max(0, cue - free)) : 0;
    // in a fast line, the next phrase shares the frame (if it can), so it is read before it's sung
    const next = carriers[i + 1];
    // (or the next would be too short to read alone: it's previewed here)
    const nextAlone = next ? (carriers[i + 2]?.phrase.start ?? next.phrase.end + 1) - next.phrase.start - SETTLE : Infinity;
    const fast = isFast(lyrics.lines[c.phrase.line]!) || (!!next && (isFast(lyrics.lines[next.phrase.line]!) || nextAlone < dwellFor(next.phrase.words.length)));
    const pair = next && fast ? pairFraming(c, next) : null;
    paired.push(!!pair);
    const shot: Shot = { at: early > 0.05 ? cue - early : { start: w.start, w: w.w }, to: pair ?? framing(c, carFrame, (t) => motion.distanceAt(t)) };
    reading.push([resolveAt(shot.at), cue + SNAP_S + dwellFor(c.phrase.words.length)]);
    return shot;
  });
  shots.push(...phraseShots);
  // each phrase's text shows from its own shot, or from the shot before when that's the same line's (the next phrase
  // may be seen coming) or previews it (paired): never more than one phrase ahead, never across a pause
  carriers.forEach((c, i) => {
    c.reveal = resolveAt(phraseShots[i]!.at);
    if (paired[i - 1] || carriers[i - 1]?.phrase.line === c.phrase.line) c.reveal = Math.min(c.reveal, Math.max(resolveAt(phraseShots[i - 1]!.at), c.phrase.start - REVEAL_AHEAD));
  });
  const own = new Set<Shot>(phraseShots);
  // pass 2: back to the car after a line, once its last phrase has been read, if the next line's shot is far enough off
  carriers.forEach((c, i) => {
    const next = carriers[i + 1];
    if (next && next.phrase.line === c.phrase.line) return;
    const back = Math.max(c.phrase.end + 0.05, reading[i]![1]), nextAt = next ? resolveAt(phraseShots[i + 1]!.at) : Infinity;
    if (nextAt - back >= BACK_TO_CAR_GAP) { const b: Shot = { at: back, to: chaseOf(stretchAt(back)), move: 'land' }; shots.push(b); own.add(b); }
  });
  // a stretch's glide gives way to the phrases' own shots: it may not start within 0.3 s of one, nor while a phrase is
  // still being read (its reading window)
  const kept = shots.filter((s) => own.has(s) || (![...own].some((l) => Math.abs(resolveAt(l.at) - resolveAt(s.at)) < 0.3)
    && !reading.some(([a, b]) => resolveAt(s.at) >= a - 0.3 && resolveAt(s.at) < b)));
  const camera = director(audio, kept, chaseOf(stretches[0]!));
  return { stretches, motion, route, carriers, tunnels, carFrame, stretchAt, camera, shots: kept };
}
