// The lowrider dances: the Impala's body on its hydraulics, a function of song time. It hops on the choruses' downbeats (every other bar), nose and tail in turn; it squats low on
// "dropping"; on "crip walkin'" it lifts a front corner and rolls onto three wheels; on "backwards" it lays back, nose
// up, tail down. The wheels stay on the road; the
// body (and the two of them) moves. Pure.
import type { AudioData } from '../engine/audio';
import type { Lyrics } from '../engine/lyrics';
import type { Stretch } from './stretches';

/** The hops (m, s); the squat (m, how long it holds, s); the three-wheel (m of lift at the front corner, radians of
 *  roll); the lay-back (radians, how long it holds, s). */
export const HYDRAULICS = { hop: 0.24, hopS: 0.42, squat: 0.14, squatHold: 1.3, threeLift: 0.22, threeRoll: 0.09, layBack: 0.13, layHold: 0.8 };

export interface Stance { lift: number; pitch: number; roll: number }

/** A damped bounce after an impulse at 0 (1 at once, settling). */
const settle = (tau: number) => (tau < 0 ? 0 : Math.exp(-7 * tau) * Math.cos(15 * tau));

export function hydraulics(audio: AudioData, lyrics: Lyrics, stretches: readonly Stretch[]): (t: number) => Stance {
  const H = HYDRAULICS;
  const choruses = stretches.filter((s) => s.id.startsWith('chorus'));
  const hops = audio.downbeats.filter((d, i) => i % 2 === 0 && choruses.some((s) => d >= s.start && d < s.end));
  const words = lyrics.lines.flatMap((l) => l.words);
  const drops = words.filter((w) => /^dropping/i.test(w.w)).map((w) => w.start);
  const crip = words.filter((w) => /^crip/i.test(w.w)).map((w) => w.start);
  const back = words.filter((w) => /^backwards/i.test(w.w)).map((w) => w.start);
  const walkEnd = (t0: number) => words.find((w) => w.start >= t0 && /^walkin/i.test(w.w))?.end ?? t0 + 1;
  return (t) => {
    let lift = 0, pitch = 0, roll = 0;
    hops.forEach((d, k) => {
      const tau = t - d;
      if (tau < 0 || tau > 1.2) return;
      const up = tau < H.hopS ? Math.sin((Math.PI * tau) / H.hopS) : 0.25 * settle(tau - H.hopS);
      lift += H.hop * up;
      pitch += (k % 2 ? 1 : -1) * 0.05 * up; // nose, then tail
    });
    for (const d of drops) {
      const tau = t - d;
      if (tau >= 0 && tau < H.squatHold + 0.6) lift -= H.squat * (tau < H.squatHold ? Math.min(1, tau / 0.08) : 1 - (tau - H.squatHold) / 0.6);
    }
    for (const c of crip) {
      const end = walkEnd(c), tau = t - c;
      if (tau < 0 || t > end + 0.5) continue;
      const k = Math.min(1, tau / 0.15) * (t > end ? Math.max(0, 1 - (t - end) / 0.5) : 1);
      lift += H.threeLift * 0.5 * k; pitch -= 0.06 * k; roll += H.threeRoll * k;
    }
    for (const b of back) { // laid back: nose up (pitch below 0), the tail down
      const tau = t - b;
      if (tau < 0 || tau > H.layHold + 0.5) continue;
      const k = Math.min(1, tau / 0.2) * (tau > H.layHold ? 1 - (tau - H.layHold) / 0.5 : 1);
      pitch -= H.layBack * k; lift -= 0.06 * k;
    }
    return { lift, pitch, roll };
  };
}
