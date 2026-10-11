// The set-pieces (docs/superpowers/specs/2026-10-11-bmf-flow-plan.md): a stretch that is its own scene, its lyrics on
// surfaces chosen for its lines, its camera written for them. Each scripts the car's pace through its stretch, places
// its phrases' carriers and frames each; the town keeps its ground clear; the scene builds its props (scenes/sets/).
// Pure, like the rest of the drive model: the guard checks what shows.
import type { AudioData } from '../../engine/audio';
import type { Line } from '../../engine/lyrics';
import type { Carrier } from '../carriers';
import type { Motion, SpeedKey } from '../motion';
import type { Solo } from '../phrases';
import type { Route, RouteFrame } from '../route';
import type { Shot, ShotMove, Target } from '../shots';
import type { Stretch } from '../stretches';
import type { Block } from '../blocks';
import { CHORUS2 } from './chorus2';
import { INTRO } from './intro';
import { VERSE1 } from './verse1';
import { VERSE2 } from './verse2';

/** How a set frames one of its phrases: the target, the move onto it, and when it starts (default: its cue). */
export interface SetFrame { to: Target; move: ShotMove; at?: number }
export interface SetContext {
  st: Stretch;
  audio: AudioData;
  route: Route;
  motion: Motion;
  /** The car (in its lane) at t, or a vehicle `ahead` m in front of it. */
  carFrame: (t: number, ahead?: number) => RouteFrame;
  solo?: Solo;
  /** When the line after line i starts (s). */
  nextStart: (i: number) => number;
  /** The stretch after this one. */
  next?: Stretch;
  /** Its faces on the left stand at least this far along the road (their centres, m: past the set-piece before). */
  floor?: number;
}
export interface Placed {
  carriers: Carrier[];
  /** How the camera frames each of its phrases, by carrier id (or the next stretch's first: the intro's hand-off). */
  frames: Map<string, SetFrame>;
  /** Stretches of road the town leaves clear for it: [s from, s to] on a side (−1 left, +1 right). */
  clear: { side: number; a: number; b: number }[];
  /** Its own buildings (the guard checks them like the town's). */
  blocks: Block[];
  /** Where its props stand and when they move, for the scene (scenes/sets/). */
  plan: unknown;
  /** Shots of its own that aren't any phrase's (the intro's, before the first word). */
  shots?: Shot[];
  /** The next stretch's faces on the left stand at least this far along the road (their centres, m); by default past
   *  its own blocks. */
  floor?: number;
}
export interface SetPiece {
  /** The car's speed keys through the stretch (its pace `set`; else the stretch's own pace). */
  speed?(st: Stretch, audio: AudioData): SpeedKey[];
  /** The lines it places (default: all its stretch's); the rest are placed as usual. */
  owns?(line: Line): boolean;
  place(ctx: SetContext): Placed;
}
/** Whether a set-piece places this line of stretch st. */
export const owned = (line: Line, st: Stretch) => { const set = SETS[st.id]; return !!set && (set.owns?.(line) ?? true); };

export const SETS: Readonly<Record<string, SetPiece>> = { intro: INTRO, verse1: VERSE1, chorus2: CHORUS2, verse2: VERSE2 };
