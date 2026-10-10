// The two of them, as flat silhouettes with a little body language, a function of song time: she throws her arm up on
// the lines that call for it (blowin' money fast — the bills are hers to throw — and the hook, he's so fly), and turns
// to look at him on the lines about him; he nods to the kick while the drums play, one hand on the wheel. Pure.
import type { AudioData } from '../engine/audio';
import type { Lyrics } from '../engine/lyrics';

export interface Cast { herArm: number; herLook: number; hisNod: number }

/** Lines she throws her arm up on, and lines she looks at him on. */
export const ARM_UP = /blowin.? money|so fly/i, LOOK = /\b(he|he's|him|boy|my man|handsome)\b/i;
/** How long her moves take to ease in and out (s), and how far he nods (radians). */
export const CAST = { ease: 0.25, linger: 0.5, nod: 0.12 };

const ramp = (t: number, a: number, b: number) => {
  const u = Math.min((t - a + CAST.ease) / CAST.ease, (b + CAST.linger - t) / CAST.ease);
  return Math.max(0, Math.min(1, u));
};

export function castOf(audio: AudioData, lyrics: Lyrics): (t: number) => Cast {
  const arm = lyrics.lines.filter((l) => ARM_UP.test(l.text)).map((l) => [l.words[0]!.start, l.end] as const);
  const look = lyrics.lines.filter((l) => LOOK.test(l.text.replace(/[’]/g, "'"))).map((l) => [l.words[0]!.start, l.end] as const);
  return (t) => {
    const a = audio.sample(t);
    return {
      herArm: arm.reduce((m, [s, e]) => Math.max(m, ramp(t, s, e)), 0),
      herLook: look.reduce((m, [s, e]) => Math.max(m, ramp(t, s, e)), 0),
      hisNod: CAST.nod * a.kick * Math.min(1, a.drums * 3),
    };
  };
}
