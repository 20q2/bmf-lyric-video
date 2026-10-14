// The sync layer's dial (spec §5): how hard the film hits the beat through the song, 0..1. Low in the verses, high in
// the choruses, highest in the last; its own levels in the intro, the bridge and the outro; eased across a stretch's
// start; ducked while a long line is being read (its reading window: drive.ts), so the frame never shakes under
// words. The scene scales the kick's punch-in and jolt, the car's bounce and the lights' pulse by it; the breaks sit
// above it. Pure.
import type { Stretch } from './stretches';

export const HEFT: Record<string, number> = { intro: 0.2, chorus1: 0.7, verse1: 0.3, chorus2: 0.8, verse2: 0.3, chorus3: 0.85, bridge1: 0.6, verse3: 0.35, chorus4: 1, outro1: 0.15 };
/** The dial eases from a stretch's level to the next's over this long (s) from the next's start. */
export const EASE_S = 1.5;
/** Under a line this many words or longer being read, the dial drops to `to` of itself, over `over` s in and out. */
export const DUCK = { words: 5, to: 0.25, over: 0.3 };

const smooth = (a: number, b: number, x: number) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };

export function heftOf(stretches: readonly Stretch[], reading: readonly { a: number; b: number; words: number }[]): (t: number) => number {
  const long = reading.filter((r) => r.words >= DUCK.words);
  return (t) => {
    let h = HEFT[stretches[0]!.id] ?? 0.5;
    for (const st of stretches) h += ((HEFT[st.id] ?? 0.5) - h) * smooth(st.start, st.start + EASE_S, t);
    for (const r of long) h *= 1 - (1 - DUCK.to) * smooth(r.a - DUCK.over, r.a, t) * (1 - smooth(r.b, r.b + DUCK.over, t));
    return h;
  };
}
