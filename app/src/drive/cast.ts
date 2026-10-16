// The two of them, as flat silhouettes with a little body language, a function of song time: she throws her arm up on
// the lines that call for it (blowin' money fast, and the hook, he's so fly) — and on the outro's, pulled in up on the
// overlook, she gives one pump of it in celebration and lets it rest (PUMP) — and turns to look at him on the lines
// about him; he nods to the kick while the drums play, one hand on the wheel. Waiting at the intro's light they idle —
// he bobs gently to the guitar's beat, she turns once to look round the corner (the motel's side, away from him) —
// and the idling fades out as the first word comes. And at the end, once they've pulled in and the last line has been
// read, she leans into him — over to the middle of the bench, her head onto his shoulder — and his arm comes off the
// bench's top and round her shoulders (the user, 2026-10-15: "have the girl in the car lean into the guy ... he's
// trying to put his arm around her"). Pure.
import type { AudioData } from '../engine/audio';
import type { Lyrics } from '../engine/lyrics';

/** herArm, herLook: 0..1; herPump: 0..1, how far into the outro's pump her raised arm is (look/cast3d.ts drops its
 *  elbow, her forearm kept up); lean, hold: 0..1
 *  through her lean and his arm coming round her, linear (look/cast3d.ts eases each part of them in its own time);
 *  hisNod, steer: radians (steer: his wheel). */
export interface Cast { herArm: number; herPump: number; herLook: number; hisNod: number; lean: number; hold: number; steer: number }

/** Lines she throws her arm up on, and lines she looks at him on. */
export const ARM_UP = /blowin.? money|so fly/i, LOOK = /\b(he|he's|him|boy|my man|handsome)\b/i;
/** The outro's arm line, a celebration that they made it up here (the user, 2026-10-16: "instead of just throwing it up
 *  in the air and holding it like a mannequin ... brought it up, gave a little pump, like a smooth pump of her arm ...
 *  and then she just let it rest afterwards"): her arm comes up over `up` s from `lead` s before the line's first word;
 *  gives one pump — her elbow down and up again, her fist kept up (look/cast3d.ts PUMP_POSE) — the up landing on the
 *  line's third word ("fast"), the pump `pump` s long at least and at most, its low point `low` of the way through;
 *  holds `hold` s; and comes down over `down` s to rest, her forearm along her thigh. Every part eased, starting and
 *  ending still. */
export const PUMP = { lead: 0.15, up: 0.65, pump: [0.8, 1.2] as const, low: 0.5, hold: 0.2, down: 1.2 };
/** How long her moves take to ease in and out (s), and how far he nods (radians). */
export const CAST = { ease: 0.25, linger: 0.5, nod: 0.12 };
/** The wait at the light: his idle bob (radians, every other beat), her look round (radians, negative: away from him;
 *  a share of the intro in, and out, easing over `edge` s), both gone `fade` s before the first word. */
export const IDLE = { nod: 0.05, look: 0.55, in: 0.3, out: 0.78, edge: 1.4, fade: 1.5 };
/** The end: she leans in on the first beat from `at` (s: the car rolling its last metre into the turnout, the last line
 *  read and gone), easing in over `over` s, her face turned toward him by `look`; his arm comes round her `hold` s after
 *  she starts, over `holdOver` s. (It was after the last "crash", at 177 s: too late to read before the end card.) */
export const LEAN = { at: 170.2, over: 2.6, look: 0.35, hold: 0.9, holdOver: 2.4 };
/** His wheel, turned back and forth a touch as he holds the car on the road (the user, 2026-10-15: "to show that we're
 *  actually driving"): at most `amp` radians, a slow drift, a slower one and a quick correction (Hz, shares of amp).
 *  The scene stills it as the car stops. */
export const STEER = { amp: 0.06, waves: [[0.23, 0.6, 1.0], [0.09, 0.28, 2.3], [0.71, 0.12, 0.4]] as const };

const ramp = (t: number, a: number, b: number) => {
  const u = Math.min((t - a + CAST.ease) / CAST.ease, (b + CAST.linger - t) / CAST.ease);
  return Math.max(0, Math.min(1, u));
};
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (a: number, b: number, x: number) => { const u = clamp01((x - a) / (b - a)); return u * u * (3 - 2 * u); };
/** Eased 0..1 over x 0..1, its speed and acceleration nought at both ends. */
const ease = (x: number) => { const u = clamp01(x); return u * u * u * (u * (6 * u - 15) + 10); };
/** The outro's pump at t, for a gesture's times (`a` the arm starts up, `top` it's up, `land` the pump's up lands,
 *  `rest` it's down): the arm's swing and the elbow's bend. */
function pumpAt(t: number, g: { a: number; top: number; land: number; rest: number }): { arm: number; pump: number } {
  if (t <= g.a || t >= g.rest) return { arm: 0, pump: 0 };
  const u = (t - g.top) / (g.land - g.top);
  const dip = u <= 0 || u >= 1 ? 0 : u < PUMP.low ? ease(u / PUMP.low) : 1 - ease((u - PUMP.low) / (1 - PUMP.low));
  return { arm: ease((t - g.a) / PUMP.up) * (1 - ease((t - (g.rest - PUMP.down)) / PUMP.down)), pump: dip };
}

export function castOf(audio: AudioData, lyrics: Lyrics): (t: number) => Cast {
  const leanAt = audio.beats.find((b) => b >= LEAN.at) ?? LEAN.at;
  // (once she's leaning on him, her arm stays down: the outro's second "blowin' money fast" waved it over his head)
  // (and a wave still up as she leans is down by then: lowering through the lean, it swept across the frame at 172 s)
  // (the outro's, pulled in up on the overlook: a pump and down to rest, not held up through the line)
  const armLines = lyrics.lines.filter((l) => ARM_UP.test(l.text) && l.words[0]!.start < leanAt), outro = (l: (typeof armLines)[number]) => l.section.startsWith('outro');
  const arm = armLines.filter((l) => !outro(l)).map((l) => [l.words[0]!.start, Math.min(l.end, leanAt - CAST.linger - 0.1)] as const);
  const pumps = armLines.filter(outro).map((l) => {
    const a = l.words[0]!.start - PUMP.lead, top = a + PUMP.up, w = l.words[Math.min(2, l.words.length - 1)]!.start;
    const land = top + Math.min(PUMP.pump[1], Math.max(PUMP.pump[0], w - top));
    return { a, top, land, rest: land + PUMP.hold + PUMP.down };
  });
  const look = lyrics.lines.filter((l) => LOOK.test(l.text.replace(/[’]/g, "'"))).map((l) => [l.words[0]!.start, l.end] as const);
  const first = lyrics.lines[0]?.words[0]?.start ?? 0;
  return (t) => {
    const a = audio.sample(t);
    // the idle at the light, fading out as the song proper comes
    const idle = clamp01((first - t) / IDLE.fade);
    const bob = IDLE.nod * (0.5 - 0.5 * Math.cos(Math.PI * (audio.beatAt(t) % 2)));
    const round = IDLE.look * smooth(first * IDLE.in, first * IDLE.in + IDLE.edge, t) * (1 - smooth(first * IDLE.out - IDLE.edge, first * IDLE.out, t));
    const lean = clamp01((t - leanAt) / LEAN.over), hold = clamp01((t - leanAt - LEAN.hold) / LEAN.holdOver);
    const pump = pumps.reduce((m, g) => { const p = pumpAt(t, g); return p.arm > m.arm ? p : m; }, { arm: 0, pump: 0 });
    return {
      herArm: Math.max(pump.arm, arm.reduce((m, [s, e]) => Math.max(m, ramp(t, s, e)), 0)),
      herPump: pump.pump,
      herLook: look.reduce((m, [s, e]) => Math.max(m, ramp(t, s, e)), 0) - idle * round + LEAN.look * smooth(0, 1, lean),
      hisNod: CAST.nod * a.kick * Math.min(1, a.drums * 3) + idle * bob,
      lean, hold,
      steer: STEER.amp * STEER.waves.reduce((v, [hz, k, ph]) => v + k * Math.sin(2 * Math.PI * hz * t + ph), 0),
    };
  };
}
