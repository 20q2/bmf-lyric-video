// The route, stretch by stretch (spec §3): where each part of the drive happens, how fast the car goes, how the road
// bends and climbs, and where its signs stand. The intro is the time before the first sung word's bar; every other
// stretch is one section of data/audio.json. Pure.
import type { AudioData } from '../engine/audio';
import type { Line, Lyrics } from '../engine/lyrics';
import { Motion, type SpeedKey } from './motion';

export type ChaseName = 'side' | 'behind' | 'front3q' | 'high';
/** How fast the car goes through a stretch (m/s): parked (pulling away in its last bar into the next stretch's speed),
 *  cruising, stop-and-go in bars (`go` bars moving, `stop` bars standing), or slowing to a stop by bar `byBar`. */
export type Pace =
  | { kind: 'park' }
  | { kind: 'cruise'; v: number }
  | { kind: 'stopgo'; v: number; go: number; stop: number }
  | { kind: 'stop'; v: number; byBar: number };

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
  /** Where its lyric signs stand: beside the road, or over it on gantries. */
  signs: 'roadside' | 'gantry';
}

export const STRETCHES: readonly StretchSpec[] = Object.freeze([
  { id: 'intro', section: null, place: 'pink motel, parked', pace: { kind: 'park' }, turn: 0, rise: 0, chase: 'front3q', signs: 'roadside' },
  { id: 'chorus1', section: 'chorus1', place: 'the boulevard', pace: { kind: 'cruise', v: 14 }, turn: 0, rise: 0, chase: 'side', signs: 'roadside' },
  { id: 'verse1', section: 'verse1', place: 'city streets, stop-and-go', pace: { kind: 'stopgo', v: 9, go: 2, stop: 1 }, turn: 90, rise: 0, chase: 'front3q', signs: 'roadside' },
  { id: 'chorus2', section: 'chorus2', place: 'the freeway', pace: { kind: 'cruise', v: 26 }, turn: -20, rise: 6, chase: 'high', signs: 'gantry' },
  { id: 'verse2', section: 'verse2', place: 'Slauson, the neighbourhood', pace: { kind: 'cruise', v: 10 }, turn: -90, rise: -6, chase: 'side', signs: 'roadside' },
  { id: 'chorus3', section: 'chorus3', place: 'the coast road', pace: { kind: 'cruise', v: 18 }, turn: 30, rise: 0, chase: 'side', signs: 'roadside' },
  { id: 'bridge1', section: 'bridge1', place: 'the coast road, faster', pace: { kind: 'cruise', v: 24 }, turn: 10, rise: 0, chase: 'behind', signs: 'roadside' },
  { id: 'verse3', section: 'verse3', place: 'the Strip at night', pace: { kind: 'cruise', v: 8 }, turn: 0, rise: 0, chase: 'side', signs: 'roadside' },
  { id: 'chorus4', section: 'chorus4', place: 'up into the hills', pace: { kind: 'cruise', v: 12 }, turn: 120, rise: 40, chase: 'front3q', signs: 'roadside' },
  { id: 'outro1', section: 'outro1', place: 'the overlook, parked', pace: { kind: 'stop', v: 12, byBar: 3 }, turn: 0, rise: 0, chase: 'high', signs: 'roadside' },
] satisfies StretchSpec[]);

export interface Stretch extends StretchSpec {
  k: number;
  start: number;
  end: number;
  /** Its lead lines (each line belongs to the stretch its start falls in). */
  lines: Line[];
}

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
    return { ...s, k, start, end, lines: lyrics.lines.filter((l) => l.start >= start && l.start < end) };
  });
}

/** The car's speed profile through the stretches. */
export function motionFor(R: readonly Stretch[], audio: AudioData): Motion {
  const bar = 240 / audio.bpm, keys: SpeedKey[] = [];
  const cruiseOf = (s: Stretch | undefined) => (s && s.pace.kind !== 'park' ? s.pace.v : 0);
  for (const s of R) {
    const p = s.pace;
    if (p.kind === 'park') {
      keys.push({ t: s.start, v: 0, ramp: 0 }, { t: s.end - bar, v: cruiseOf(R[s.k + 1]), ramp: bar });
    } else if (p.kind === 'cruise') {
      keys.push({ t: s.start, v: p.v, ramp: bar });
    } else if (p.kind === 'stopgo') {
      for (let b = 0; s.start + b * bar < s.end - 1e-6; b += p.go + p.stop) {
        keys.push({ t: s.start + b * bar, v: p.v, ramp: Math.min(1, bar) });
        const stopAt = s.start + (b + p.go) * bar;
        if (stopAt < s.end - 1e-6) keys.push({ t: stopAt, v: 0, ramp: 1.5 });
      }
    } else {
      keys.push({ t: s.start, v: p.v, ramp: 1 }, { t: s.start + bar, v: 0, ramp: (p.byBar - 1) * bar });
    }
  }
  return new Motion(keys);
}
