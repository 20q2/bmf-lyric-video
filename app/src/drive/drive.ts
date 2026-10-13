// The drive as a pure model: the stretches, the car's motion, the road, the lyric carriers and the camera. The scene
// renders it (scenes/drive.ts) and the guards check it (tests/sung.test.ts) — the same object, so what is checked is
// what shows.
import type { AudioData } from '../engine/audio';
import type { Lyrics } from '../engine/lyrics';
import { CHASE, type Pose, chase, lerpPose } from './camera';
import { type Carrier, type Kind, PAIRABLE, framing, glideTake, isFast, lineTake, lookFrom, pairFraming, placeCarriers, takeable } from './carriers';
import type { Motion } from './motion';
import { Route, type RouteFrame } from './route';
import { SETTLE, dwellFor, emphasisOf } from './phrases';
import { LEAD, SNAP_S, SWOOP_S, type Shot, type Target, beatAtOrAfter, director, resolveAt } from './shots';
import * as THREE from 'three';
import { AUDIBLE, type Stretch, motionFor, resolveStretches } from './stretches';
import { type Tunnel, tunnelsOf } from './tunnel';
import { REVEAL_S } from './dissolve';
import { type Block, blocksOf } from './blocks';
import { motelSign } from './landmarks';
import { type Placed, type SetFrame, SETS, owned } from './sets';

const DEG = Math.PI / 180;
const flat = (v: THREE.Vector3) => new THREE.Vector3(v.x, 0, v.z).normalize();
/** After a line, the camera goes back to the car only if the next line is at least this far off (s). */
export const BACK_TO_CAR_GAP = 1.2;
/** A line's first phrase may be found this long before its first word (s), when the line before has ended. */
export const PREROLL = 0.5;
/** A phrase's text never shows more than this long before it's sung (s), whatever frame it's in. */
export const REVEAL_AHEAD = 2;
/** The chase framings sway this far either side of their preset (radians) at this rate (radians per second), so the
 *  camera never sits still on the car — but never swings round far enough to turn its direction on screen around. */
export const SWAY = { amp: 0.35, rate: 0.35 };

/** The car's bulk (m): world.ts builds it within this box (the two of them sitting up out of it included), its base on
 *  the road at the car's route frame; the guard checks it doesn't hide the lyrics. */
export const CAR_BOX = { w: 2.05, h: 1.95, l: 5.7 };

/** Inside the car, what of it can stand between the camera and a word (the car's frame: x its left, y up from the road,
 *  z forward; m, centre and size; world.ts buildCar): their bodies, his head and cap, her head and hair, the seat's
 *  back, the windshield's frame, the wheel, the dash, the body up to its beltline. */
export const CABIN: readonly [[number, number, number], [number, number, number]][] = [
  [[0.44, 1.28, -0.25], [0.42, 0.84, 0.42]], [[-0.44, 1.28, -0.25], [0.42, 0.84, 0.42]],
  [[0.44, 1.795, -0.175], [0.3, 0.35, 0.39]], [[-0.44, 1.6, -0.275], [0.34, 0.64, 0.39]],
  [[0, 1.13, -0.55], [1.66, 0.5, 0.18]],
  [[0.9, 1.22, 0.95], [0.06, 0.5, 0.06]], [[-0.9, 1.22, 0.95], [0.06, 0.5, 0.06]], [[0, 1.46, 0.92], [1.84, 0.06, 0.06]],
  [[0.44, 1.36, 0.42], [0.42, 0.32, 0.3]],
  [[0, 1.1, 0.73], [1.7, 0.22, 0.36]],
  [[0, 0.64, 0], [1.96, 0.68, 5.4]],
];

/** The faces on the left after a set-piece start this far past its own blocks (m: a wide face's clear zone reaches
 *  this far back, blocks.ts). */
export const SET_FLOOR = 40;

/** How far right of the road's centre the car drives (m): in its lane. */
export const LANE = 1.9;
/** The opening's cuts (s, downbeats: the drop, the two of them, the lot, the pull-out) and how far from the sign
 *  its first shot stands (m). */
export const SIGN_SHOT = { dist: 7.5, push: 0.5, over: 3 };
/** The end, after the last line: on a beat at least `after` s past it (and no later than `before` s ahead of the fade
 *  out of hearing), the camera glides up and away behind the parked car (m back, up, and how fast each grows), looking
 *  out over the city's lights (m ahead of the car, below its level). */
export const END = { after: 0.8, before: 0.6, back: 9, backRate: 1.2, up: 2.5, rise: 0.9, look: 120, under: 18, side: 22 };
/** The end: the cut to the motel (s, a half-beat after the last line has been read), and the fade out (s). */
export const FINALE = { endCard: 179.2, fade: [180.9, 181.6] as [number, number] };

/** A move this far (m between the eyes, or radians between the views) is a cut instead; a cut may come this much
 *  before its cue (onto a half-beat) or after. */
export const CUT = { dist: 12, turn: 0.9, zoom: 3, early: 0.15, late: 0.02 };
const eyeOf = (p: Pose) => new THREE.Vector3(p.tx + Math.sin(p.yaw) * Math.cos(p.pitch) * p.dist, p.ty + Math.sin(p.pitch) * p.dist, p.tz + Math.cos(p.yaw) * Math.cos(p.pitch) * p.dist);
const viewOf = (p: Pose) => new THREE.Vector3(p.tx, p.ty, p.tz).sub(eyeOf(p)).normalize();
/** Whether going from pose a to b is better cut than moved (far apart, turned far, or framed at very different
 *  distances: easing between those swings the eye wide, through the ground). */
export const far = (a: Pose, b: Pose) => eyeOf(a).distanceTo(eyeOf(b)) > CUT.dist || viewOf(a).angleTo(viewOf(b)) > CUT.turn
  || Math.max(a.dist, b.dist) / Math.min(a.dist, b.dist) > CUT.zoom
  || [0.25, 0.5, 0.75].some((u) => eyeOf(lerpPose(a, b, u)).y < Math.min(eyeOf(a).y, eyeOf(b).y) - 0.3); // it would dip

/** The kinds a line glides along in one take (glideTake; the faces on the left have theirs: lineTake). */
const GLIDES: ReadonlySet<Kind> = new Set(['road', 'sign', 'street', 'gantry', 'tunnel']);
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
  /** The town's buildings. */
  blocks: Block[];
  /** Where cross streets open the kerb (the set-pieces'). */
  openings: { side: number; a: number; b: number }[];
  /** The song's beats (s). */
  beats: readonly number[];
  /** The car in its lane at t (or a vehicle `ahead` m in front of it, in its lane). */
  carFrame(t: number, ahead?: number): RouteFrame;
  /** The cut to the last line (s): every word sung before it goes, so the end starts clean. */
  lastCut: number | null;
  stretchAt(t: number): Stretch;
  camera(t: number): Pose;
  shots: Shot[];
  /** Each set-piece's plan for its props (sets/; scenes/sets/ builds them), by stretch. */
  plans: Record<string, unknown>;
}

export function makeDrive(audio: AudioData, lyrics: Lyrics): Drive {
  const stretches = resolveStretches(audio, lyrics);
  const motion = motionFor(stretches, audio, (s) => SETS[s.id]?.speed?.(s, audio) ?? []), route = routeFor(stretches, motion);
  const tunnels = tunnelsOf(stretches, motion, audio.beats);
  // the car keeps to its lane (the right one), off the centre line
  const carFrame = (t: number, ahead = 0) => { const f = route.frameAt(motion.distanceAt(t) + ahead); return { ...f, pos: f.pos.clone().addScaledVector(f.right, LANE) }; };
  // the lyrics on their carriers: the set-pieces' stretches on their own surfaces (sets/), framed as they say
  const solo = emphasisOf(lyrics.lines), nextStart = (i: number) => lyrics.lines[i + 1]?.words[0]?.start ?? Infinity;
  const setFrames = new Map<string, SetFrame>(), clears: Placed['clear'] = [], setBlocks: Block[] = [], plans: Record<string, unknown> = {}, ofSets: Carrier[] = [], openings: { side: number; a: number; b: number }[] = [];
  // (the faces on the left after a set-piece stand past its ground: its own blocks' far end, and their clear zone)
  const floor: Record<string, number> = {}, setShots: Shot[] = [];
  for (const st of stretches) {
    const next = stretches[st.k + 1], p = SETS[st.id]?.place({ st, audio, route, motion, carFrame, solo, nextStart, next, floor: floor[st.id] });
    if (!p) continue;
    ofSets.push(...p.carriers);
    if (next && p.blocks.length && p.floor === undefined) floor[next.id] = Math.max(...p.blocks.map((b) => b.s + b.w / 2)) + SET_FLOOR;
    p.frames.forEach((f, id) => setFrames.set(id, f));
    clears.push(...p.clear); setBlocks.push(...p.blocks);
    if (p.openings) openings.push(...p.openings);
    if (p.shots) setShots.push(...p.shots);
    if (next && p.floor !== undefined) floor[next.id] = p.floor;
    plans[st.id] = p.plan;
  }
  const placed = [...placeCarriers(stretches, motion, route, tunnels, solo, owned, floor), ...ofSets];
  const carriers = placed.sort((a, b) => a.phrase.words[0]!.gi - b.phrase.words[0]!.gi);
  const stretchAt = (t: number) => stretches.find((s) => t >= s.start && t < s.end) ?? stretches[stretches.length - 1]!;
  const chaseOf = (st: Stretch): Target => (t) => {
    const p = chase(CHASE[st.chase], carFrame(t));
    return { ...p, yaw: p.yaw + Math.sin((t - st.start) * SWAY.rate) * SWAY.amp };
  };

  const shots: Shot[] = [];
  for (const st of stretches) if (st.k > 0 && !SETS[st.id]) shots.push({ at: st.start, to: chaseOf(st), move: 'glide' });
  // pass 1: each phrase's shot. A line's first phrase may be found up to PREROLL early, but not before the phrase before
  // it has been read and sung; every phrase's reading window runs from its shot until it has been up dwellFor.
  const reading: [number, number][] = [], paired: boolean[] = [], phraseShots: Shot[] = [];
  // in a fast line, the next phrase shares the frame (if it can), so it is read before it's sung (or the next would be
  // too short to read alone: it's previewed)
  const fastAt = (i: number) => {
    const c = carriers[i]!, next = carriers[i + 1];
    const nextAlone = next ? (carriers[i + 2]?.phrase.start ?? next.phrase.end + 1) - next.phrase.start - SETTLE : Infinity;
    return isFast(lyrics.lines[c.phrase.line]!) || (!!next && (isFast(lyrics.lines[next.phrase.line]!) || nextAlone < dwellFor(next.phrase.words.length)));
  };
  // a line on faces on the left is one take: the camera drifts along its faces as they're sung (lineTake), on into the
  // next line's first when that one's previewed
  const takes: (Target | undefined)[] = [];
  const own_ = (i: number) => setFrames.has(carriers[i]!.id); // (a set-piece's: framed as it says)
  for (let i = 0; i < carriers.length;) {
    if (own_(i)) { takes[i++] = undefined; continue; }
    let j = i + 1;
    while (j < carriers.length && !own_(j) && PAIRABLE.has(carriers[j]!.kind) && PAIRABLE.has(carriers[j - 1]!.kind) && takeable(carriers[j - 1]!, carriers[j]!)
      && (carriers[j]!.phrase.line === carriers[j - 1]!.phrase.line || fastAt(j - 1))) j++;
    // (elsewhere, a line on one kind of sign: from its framing to the next's)
    if (j === i + 1 && GLIDES.has(carriers[i]!.kind)) while (j < carriers.length && !own_(j) && carriers[j]!.phrase.line === carriers[i]!.phrase.line && carriers[j]!.kind === carriers[i]!.kind) j++;
    const run = carriers.slice(i, j);
    const take = run.length < 2 ? undefined : PAIRABLE.has(run[0]!.kind) ? lineTake(run, run.map((_, k) => fastAt(i + k))) : glideTake(run, run.map((c) => framing(c, carFrame, (t) => motion.distanceAt(t))));
    for (let k = i; k < j; k++) takes[k] = take;
    i = j;
  }
  carriers.forEach((c, i) => {
    const w = c.phrase.words[0]!, cue = w.start - LEAD, prev = carriers[i - 1];
    const sf = setFrames.get(c.id);
    if (sf) {
      const shot: Shot = { at: sf.at ?? { start: w.start, w: w.w }, to: sf.to, move: sf.move };
      phraseShots.push(shot); paired.push(false);
      reading.push([resolveAt(shot.at), cue + SNAP_S + dwellFor(c.phrase.words.length)]);
      return shot;
    }
    const free = prev ? Math.max(reading[i - 1]![1], prev.phrase.end + 0.1) : 0; // read, and done being sung
    const early = !prev || prev.phrase.line !== c.phrase.line ? Math.min(PREROLL, Math.max(0, cue - free)) : 0;
    const next = carriers[i + 1], take = takes[i], pair = !take && next && fastAt(i) ? pairFraming(c, next) : null;
    paired.push(!!pair || (!!take && take === takes[i + 1]));
    const to = take ?? pair ?? framing(c, carFrame, (t) => motion.distanceAt(t));
    let at: Shot['at'] = early > 0.05 ? cue - early : { start: w.start, w: w.w };
    // one continuous take: when the new framing is far from the last phrase's, the camera swoops there (an arc over the
    // town), leaving early enough to arrive on the cue, once the phrase before has been read and sung; the last line
    // (after "crash") is cut to
    let move: Shot['move'] = 'snap';
    const before = phraseShots[i - 1];
    if (take && take === takes[i - 1]) {
      // (on in the line's take: no move of its own)
    } else if (!before || far(before.to(resolveAt(at)), to(resolveAt(at)))) {
      // (where the phrase before is still up and there's no room to leave early, a cut: the densest lines)
      const t0 = resolveAt(at), lead = SWOOP_S - SNAP_S, free = Math.max(reading[i - 1]?.[1] ?? -Infinity, prev?.phrase.end ?? -Infinity);
      const room = free <= t0 - lead;
      // (in the tunnel there's no sky to arc through: cut)
      move = i === carriers.length - 1 || !room || c.kind === 'tunnel' || prev?.kind === 'tunnel' ? 'cut' : 'swoop';
      if (move === 'swoop') at = t0 - lead;
    }
    const shot: Shot = { at, to, move };
    phraseShots.push(shot);
    reading.push([resolveAt(shot.at), cue + SNAP_S + dwellFor(c.phrase.words.length)]);
    return shot;
  });
  shots.push(...phraseShots);
  // each phrase's text shows from its own shot, or from the shot before when that's the same line's (the next phrase
  // may be seen coming) or previews it (paired): never more than one phrase ahead, never across a pause
  carriers.forEach((c, i) => {
    c.reveal = resolveAt(phraseShots[i]!.at) - REVEAL_S; // (shown by the time its shot lands: a cut finds it finished)
    if (paired[i - 1] || carriers[i - 1]?.phrase.line === c.phrase.line) c.reveal = Math.min(c.reveal, Math.max(resolveAt(phraseShots[i - 1]!.at), c.phrase.start - REVEAL_AHEAD));
  });
  const own = new Set<Shot>(phraseShots);
  // pass 2: back to the car after a line, once its last phrase has been read, if the next line's shot is far enough off
  carriers.forEach((c, i) => {
    const next = carriers[i + 1];
    if (!next || next.phrase.line === c.phrase.line || setFrames.has(c.id)) return; // (after the last line, the end card; a set-piece keeps its camera)
    const back = Math.max(c.phrase.end + 0.05, reading[i]![1]), nextAt = next ? resolveAt(phraseShots[i + 1]!.at) : Infinity;
    // a cut back to the car on the beat after (or the 'land' when the car's chase is near enough to move to)
    const beat = beatAtOrAfter(audio, back), to = chaseOf(stretchAt(beat));
    if (nextAt - beat >= BACK_TO_CAR_GAP) { const b: Shot = { at: beat, to, move: far(phraseShots[i]!.to(beat), to(beat)) ? (c.kind === 'tunnel' ? 'cut' : 'swoop') : 'land' }; shots.push(b); own.add(b); }
  });
  // the opening (the intro's set-piece: its own shots); the motel's sign, which the end comes back to
  const sign = motelSign(route), endCardAt = FINALE.endCard;
  const signShot: Target = (t) => lookFrom(sign.center.clone().addScaledVector(sign.normal, SIGN_SHOT.dist - SIGN_SHOT.push * Math.min(1, Math.max(0, t - endCardAt) / SIGN_SHOT.over)).add(new THREE.Vector3(0, -0.8, 0)), sign.center);
  shots.push(...setShots);
  for (const o of setShots) own.add(o);
  // the end: after "crash" (a jolt), the last line low behind the parked car (its tail lights, the banner over it;
  // carriers.ts); then the motel again, empty at night, and its NO goes out
  // after the last line (the song fading out of hearing), the scene alone: a slow crane up and away from the parked car
  // over the city's lights; then the motel's sign
  const lastLine = carriers[carriers.length - 1]!.phrase, park = carFrame(audio.duration), pf = flat(park.fwd), pr = flat(park.right);
  const away = beatAtOrAfter(audio, Math.max(lastLine.end + END.after, AUDIBLE - END.before));
  // (aimed a little right of straight ahead: the hill sign's shoulder stands off to the left, and the end belongs to
  // the city)
  const crane: Target = (t) => { const u = Math.max(0, t - away); return lookFrom(park.pos.clone().addScaledVector(pf, -END.back - END.backRate * u).add(new THREE.Vector3(0, END.up + END.rise * u, 0)), park.pos.clone().addScaledVector(pf, END.look).addScaledVector(pr, END.side).add(new THREE.Vector3(0, -END.under, 0))); };
  const scene: Shot = { at: away, to: crane, move: 'glide' };
  const endCard: Shot = { at: endCardAt, to: signShot, move: 'cut' };
  shots.push(scene, endCard); own.add(scene); own.add(endCard);
  // a stretch's glide gives way to the phrases' own shots: it may not start within 0.3 s of one, nor while a phrase is
  // still being read (its reading window)
  const kept = shots.filter((s) => own.has(s) || (![...own].some((l) => Math.abs(resolveAt(l.at) - resolveAt(s.at)) < 0.3)
    && !reading.some(([a, b]) => resolveAt(s.at) >= a - 0.3 && resolveAt(s.at) < b)));
  const camera = director(audio, kept, chaseOf(stretches[0]!));
  const blocks = blocksOf(route, motion, stretches, carriers, tunnels, clears, setBlocks);
  const lastShot = phraseShots[phraseShots.length - 1], lastCut = lastShot ? resolveAt(lastShot.at) : null;
  return { stretches, motion, route, carriers, tunnels, blocks, openings, beats: audio.beats, carFrame, stretchAt, camera, shots: kept, lastCut, plans };
}
