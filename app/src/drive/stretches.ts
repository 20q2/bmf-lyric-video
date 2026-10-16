// The route, stretch by stretch (spec §3): where each part of the drive happens, how fast the car goes, how the road
// bends and climbs, and how the camera frames the car (its lyrics' carriers: carriers.ts PATTERNS). The intro is the time before the first sung word's bar; every other
// stretch is one section of data/audio.json. Pure.
import type { AudioData } from '../engine/audio';
import type { Line, Lyrics } from '../engine/lyrics';
import { Motion, type SpeedKey } from './motion';

export type ChaseName = 'side' | 'behind' | 'front3q' | 'high' | 'overlook' | 'hero';
/** How fast the car goes through a stretch (m/s): cruising, slowing to a stop by bar `byBar`, or scripted by its
 *  set-piece (sets/: waiting at the intro's light, rushing past verse 1's speed trailer). */
export type Pace =
  | { kind: 'cruise'; v: number }
  | { kind: 'stop'; v: number; byBar: number }
  | { kind: 'set' };

export interface StretchSpec {
  id: string;
  /** The data/audio.json section it is (null: the intro, before the first section's first sung word). */
  section: string | null;
  place: string;
  pace: Pace;
  /** How far the road bends over the stretch (degrees, + to the left) and how far it climbs (m). */
  turn: number;
  rise: number;
  /** The camera's home framing of the car through the stretch. */
  chase: ChaseName;
  /** The stretch runs through a tunnel (tunnel.ts). */
  tunnel?: boolean;
}

export const STRETCHES: readonly StretchSpec[] = Object.freeze([
  { id: 'intro', section: null, place: 'a red light on the corner by the pink motel', pace: { kind: 'set' }, turn: 0, rise: 0, chase: 'front3q' },
  { id: 'chorus1', section: 'chorus1', place: 'the boulevard', pace: { kind: 'set' }, turn: 0, rise: 0, chase: 'hero' }, // (cruising, to the stop sign by verse 1's side street: sets/chorus1.ts)
  { id: 'verse1', section: 'verse1', place: 'city streets at speed, never stopping', pace: { kind: 'set' }, turn: 90, rise: 0, chase: 'front3q' },
  { id: 'chorus2', section: 'chorus2', place: 'the freeway', pace: { kind: 'set' }, turn: -20, rise: 6, chase: 'high' },
  { id: 'verse2', section: 'verse2', place: 'Slauson, the neighbourhood', pace: { kind: 'set' }, turn: -90, rise: -6, chase: 'side' },
  { id: 'chorus3', section: 'chorus3', place: 'the coast road', pace: { kind: 'cruise', v: 18 }, turn: 30, rise: 0, chase: 'hero' },
  { id: 'bridge1', section: 'bridge1', place: 'the tunnel through the headland', pace: { kind: 'cruise', v: 24 }, turn: 10, rise: 0, chase: 'behind', tunnel: true },
  { id: 'verse3', section: 'verse3', place: 'the Strip at night', pace: { kind: 'cruise', v: 8 }, turn: 0, rise: 0, chase: 'side' },
  { id: 'chorus4', section: 'chorus4', place: 'up into the hills', pace: { kind: 'cruise', v: 12 }, turn: 120, rise: 40, chase: 'front3q' },
  { id: 'outro1', section: 'outro1', place: 'the overlook, parked', pace: { kind: 'stop', v: 12, byBar: 3 }, turn: 0, rise: 0, chase: 'overlook' },
] satisfies StretchSpec[]);

export interface Stretch extends StretchSpec {
  k: number;
  start: number;
  end: number;
  /** Its lead lines (each line belongs to the stretch its start falls in). */
  lines: Line[];
}

/** No line ending later than this is shown (s): the song is already fading through the outro, and the end speaks for
 *  itself (the user, 2026-10-13: no outro lyrics — the scene is the words). The end is the scene's own. */
export const AUDIBLE = 165.5;
/** Whether a line is shown: it ends while the song can still be heard. */
export const shown = (l: Line) => l.end <= AUDIBLE;

/** The stretches, timed: they tile [0, duration). */
export function resolveStretches(audio: AudioData, lyrics: Lyrics): Stretch[] {
  const first = lyrics.lines[0]!.start;
  let introEnd = audio.downbeats[0]!;
  for (const d of audio.downbeats) if (d <= first) introEnd = d;
  const startOf = (s: StretchSpec) => {
    if (s.section === null) return 0;
    const sec = audio.sections.find((x) => x.name === s.section);
    if (!sec) throw new Error(`stretch ${s.id}: no section ${s.section} in data/audio.json (${audio.sections.map((x) => x.name).join(', ')})`);
    return sec.start === 0 ? introEnd : sec.start;
  };
  const starts = STRETCHES.map(startOf);
  return STRETCHES.map((s, k) => {
    const start = starts[k]!, end = k + 1 < STRETCHES.length ? starts[k + 1]! : audio.duration;
    if (!(end > start)) throw new Error(`stretch ${s.id}: [${start}, ${end}) is empty`);
    // (a line belongs to its own section, whatever its first word's time: a pickup can start a hair before the bar)
    return { ...s, k, start, end, lines: lyrics.lines.filter((l) => (s.section === null ? false : l.section === s.section) && shown(l)) };
  });
}

/** The car's speed profile through the stretches (a set-piece's stretch: its own keys, `scripted`). */
export function motionFor(R: readonly Stretch[], audio: AudioData, scripted: (s: Stretch) => SpeedKey[] = () => []): Motion {
  const bar = 240 / audio.bpm, keys: SpeedKey[] = [];
  for (const s of R) {
    const p = s.pace;
    if (p.kind === 'cruise') {
      keys.push({ t: s.start, v: p.v, ramp: bar });
    } else if (p.kind === 'set') {
      keys.push(...scripted(s));
    } else {
      keys.push({ t: s.start, v: p.v, ramp: 1 }, { t: s.start + bar, v: 0, ramp: (p.byBar - 1) * bar });
    }
  }
  return new Motion(keys);
}
