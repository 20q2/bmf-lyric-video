// The two of them, as flat silhouettes with a little body language, a function of song time: she throws her arm up on
// the lines that call for it (blowin' money fast, and the hook, he's so fly), and turns to look at him on the lines
// about him; he nods to the kick while the drums play, one hand on the wheel. Waiting at the intro's light they idle —
// he bobs gently to the guitar's beat, she turns once to look round the corner (the motel's side, away from him) —
// and the idling fades out as the first word comes. And at the end, once they've pulled in and the last line has been
// read, she leans into him — over to the middle of the bench, her head onto his shoulder — and his arm comes off the
// bench's top and round her shoulders (the user, 2026-10-15: "have the girl in the car lean into the guy ... he's
// trying to put his arm around her"). Pure.
import type { AudioData } from '../engine/audio';
import type { Lyrics } from '../engine/lyrics';

/** herArm, herLook, lean, hold: 0..1 (hold: his arm round her shoulders); hisNod: radians. */
export interface Cast { herArm: number; herLook: number; hisNod: number; lean: number; hold: number }

/** Lines she throws her arm up on, and lines she looks at him on. */
export const ARM_UP = /blowin.? money|so fly/i, LOOK = /\b(he|he's|him|boy|my man|handsome)\b/i;
/** How long her moves take to ease in and out (s), and how far he nods (radians). */
export const CAST = { ease: 0.25, linger: 0.5, nod: 0.12 };
/** The wait at the light: his idle bob (radians, every other beat), her look round (radians, negative: away from him;
 *  a share of the intro in, and out, easing over `edge` s), both gone `fade` s before the first word. */
export const IDLE = { nod: 0.05, look: 0.55, in: 0.3, out: 0.78, edge: 1.4, fade: 1.5 };
/** The end: she leans in on the first beat from `at` (s: the car rolling its last metre into the turnout, the last line
 *  read and gone), easing in over `over` s, her face turned toward him by `look`; his arm comes round her `hold` s after
 *  she starts, over `holdOver` s. (It was after the last "crash", at 177 s: too late to read before the end card.) */
export const LEAN = { at: 170.2, over: 2.2, look: 0.35, hold: 0.6, holdOver: 2.2 };

const ramp = (t: number, a: number, b: number) => {
  const u = Math.min((t - a + CAST.ease) / CAST.ease, (b + CAST.linger - t) / CAST.ease);
  return Math.max(0, Math.min(1, u));
};
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (a: number, b: number, x: number) => { const u = clamp01((x - a) / (b - a)); return u * u * (3 - 2 * u); };

export function castOf(audio: AudioData, lyrics: Lyrics): (t: number) => Cast {
  const leanAt = audio.beats.find((b) => b >= LEAN.at) ?? LEAN.at;
  // (once she's leaning on him, her arm stays down: the outro's second "blowin' money fast" waved it over his head)
  const arm = lyrics.lines.filter((l) => ARM_UP.test(l.text) && l.words[0]!.start < leanAt).map((l) => [l.words[0]!.start, l.end] as const);
  const look = lyrics.lines.filter((l) => LOOK.test(l.text.replace(/[’]/g, "'"))).map((l) => [l.words[0]!.start, l.end] as const);
  const first = lyrics.lines[0]?.words[0]?.start ?? 0;
  return (t) => {
    const a = audio.sample(t);
    // the idle at the light, fading out as the song proper comes
    const idle = clamp01((first - t) / IDLE.fade);
    const bob = IDLE.nod * (0.5 - 0.5 * Math.cos(Math.PI * (audio.beatAt(t) % 2)));
    const round = IDLE.look * smooth(first * IDLE.in, first * IDLE.in + IDLE.edge, t) * (1 - smooth(first * IDLE.out - IDLE.edge, first * IDLE.out, t));
    const lean = smooth(leanAt, leanAt + LEAN.over, t), hold = smooth(leanAt + LEAN.hold, leanAt + LEAN.hold + LEAN.holdOver, t);
    return {
      herArm: arm.reduce((m, [s, e]) => Math.max(m, ramp(t, s, e)), 0),
      herLook: look.reduce((m, [s, e]) => Math.max(m, ramp(t, s, e)), 0) - idle * round + LEAN.look * lean,
      hisNod: CAST.nod * a.kick * Math.min(1, a.drums * 3) + idle * bob,
      lean, hold,
    };
  };
}
