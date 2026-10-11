// The set-pieces (docs/superpowers/specs/2026-10-11-bmf-flow-plan.md): a stretch that is its own scene, its lyrics on
// surfaces chosen for its lines, its camera written for them. Each scripts the car's pace through its stretch, places
// its phrases' carriers and frames each; the town keeps its ground clear; the scene builds its props (scenes/sets/).
// Pure, like the rest of the drive model: the guard checks what shows.
import type { AudioData } from '../../engine/audio';
import type { Carrier } from '../carriers';
import type { Motion, SpeedKey } from '../motion';
import type { Solo } from '../phrases';
import type { Route, RouteFrame } from '../route';
import type { ShotMove, Target } from '../shots';
import type { Stretch } from '../stretches';
import type { Block } from '../blocks';
import { VERSE1 } from './verse1';

/** How a set frames one of its phrases: the target, the move onto it, and when it starts (default: its cue). */
export interface SetFrame { to: Target; move: ShotMove; at?: number }
export interface SetContext {
  st: Stretch;
  audio: AudioData;
  route: Route;
  motion: Motion;
  /** The car (in its lane) at t. */
  carFrame: (t: number) => RouteFrame;
  solo?: Solo;
  /** When the line after line i starts (s). */
  nextStart: (i: number) => number;
}
export interface Placed {
  carriers: Carrier[];
  frames: Map<string, SetFrame>;
  /** Stretches of road the town leaves clear for it: [s from, s to] on a side (−1 left, +1 right). */
  clear: { side: number; a: number; b: number }[];
  /** Its own buildings (the guard checks them like the town's). */
  blocks: Block[];
  /** Where its props stand and when they move, for the scene (scenes/sets/). */
  plan: unknown;
}
export interface SetPiece {
  /** The car's speed keys through the stretch. */
  speed(st: Stretch, audio: AudioData): SpeedKey[];
  place(ctx: SetContext): Placed;
}

export const SETS: Readonly<Record<string, SetPiece>> = { verse1: VERSE1 };
