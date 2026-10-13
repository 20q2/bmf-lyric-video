// The bridge, the tunnel through the headland (flow plan §6; reworked 2026-10-13: fifteen seconds of one tiled wall).
// The "Blowin' money fast" lines keep their lettering on the wall (sodium, then cyan: the drive's own, the look the
// section was kept for). The set owns the two "Tryna make it last" lines: each on a lit overhead sign hung in the
// bore, shot from a waiting eye low in the oncoming lane — the car's headlights come up the black, pass the lens, and
// drive on under the sign toward the lamps' vanishing point (the second sign has the exit's night in its arch). And
// "we might crash" is an event: the lane-control signals over the bore flip from green arrows to red X on the word
// (scenes/sets/bridge1.ts), the lamps die for a beat (scenes/drive.ts), and the car fishtails (hydraulics.ts) — all
// green and steady again as "tryna make it last" answers. Pure.
import * as THREE from 'three';
import { type Carrier, type Kind, layout, lookFrom } from '../carriers';
import { type Phrase, phrasesOf } from '../phrases';
import type { Placed, SetContext, SetFrame, SetPiece } from './index';

const UP = new THREE.Vector3(0, 1, 0);
const flat = (v: THREE.Vector3) => new THREE.Vector3(v.x, 0, v.z).normalize();
const LAST = /tryna make it last/i, CRASH = /^crash/i;

/** The overhead signs: the car passes under this far past its line's end (m); the lettering's centre height; the
 *  waiting eye (m short of the sign, off the road's centre in the oncoming lane — the car passes to its right — up,
 *  and its slow drift on, m/s), aimed this far under the lettering (the bore and the car hold the frame's foot). */
export const PANEL = { ahead: 6, y: 4.6, eye: { back: 13, lateral: -2.6, y: 1.25, drift: 0.55 }, aimDown: 1.1 };
/** The lane-control signals down the bore: hung this high, one every `step` m, none within `clear` m of a mouth or an
 *  overhead sign; red from the word "crash" until `calm` s after it (the lamps die with them: scenes/drive.ts). */
export const SIGNALS = { y: 5.85, step: 46, clear: 16, calm: 1.5 };

interface Face { center: THREE.Vector3; normal: THREE.Vector3; up: THREE.Vector3; w: number; h: number }
export interface Bridge1Plan {
  /** The overhead signs (m along the road; the whole stack's face). */
  panels: { s: number; face: Face }[];
  /** The signals (m along the road), when they flip red and when they calm back to green (s). */
  signals: number[];
  crashAt: number;
  calm: number;
  /** The bore (m along the road: tunnel.ts's mouths). */
  s0: number;
  s1: number;
}

export const BRIDGE1: SetPiece = {
  owns: (line) => LAST.test(line.text),

  place(ctx: SetContext): Placed {
    const { st, route, motion } = ctx;
    const carS = (t: number) => motion.distanceAt(t);
    const atRoad = (s: number, lateral: number, y: number) => { const f = route.frameAt(s); return f.pos.clone().addScaledVector(f.right, lateral).addScaledVector(UP, y); };
    const ground = (s: number) => route.frameAt(s).pos.y;
    const s0 = carS(st.start), s1 = carS(st.end);
    const carriers: Carrier[] = [], frames = new Map<string, SetFrame>();
    const add = (kind: Kind, ph: Phrase, id: string, s: number, center: THREE.Vector3, normal: THREE.Vector3, up: THREE.Vector3, lay: ReturnType<typeof layout>, extra: Partial<Carrier> = {}) => {
      const c: Carrier = { id, phrase: ph, kind, stretch: st.id, reveal: ph.start, s, center, normal, up, ...lay, foot: center.y - ground(s), solid: null, ...extra };
      carriers.push(c);
      return c;
    };

    // the overhead signs, one per owned line: the line's phrases stacked on the lit box, the eye waiting low in the
    // oncoming lane short of it, the car passing the lens and driving on beneath
    const panels: Bridge1Plan['panels'] = [];
    for (const line of st.lines.filter((l) => LAST.test(l.text))) {
      const phs = phrasesOf(line, ctx.nextStart(line.i), ctx.solo);
      const lays = phs.map((ph) => layout('tunnelsign', ph.text, ph.solo)), H = lays.reduce((a, l) => a + l.h, 0);
      const W = Math.max(...lays.map((l) => l.w));
      const s = carS(line.end) + PANEL.ahead, n = flat(route.frameAt(s).fwd).negate();
      let top = PANEL.y + H / 2;
      const cs = phs.map((ph, pi) => {
        const L = lays[pi]!, c = atRoad(s, 0, top - L.h / 2);
        top -= L.h;
        return add('tunnelsign', ph, `L${line.i}.${pi}`, s, c, n.clone(), UP.clone(), L,
          pi === 0 ? { solid: { at: new THREE.Vector3(0, L.h / 2 - H / 2, -0.14), size: new THREE.Vector3(W + 0.5, H + 0.45, 0.24) } } : {});
      });
      panels.push({ s, face: { center: atRoad(s, 0, PANEL.y), normal: n.clone(), up: UP.clone(), w: W, h: H } });
      const E = PANEL.eye, t0 = line.words[0]!.start, aim = atRoad(s, 0, PANEL.y - PANEL.aimDown);
      const to = (t: number) => lookFrom(atRoad(s - E.back + E.drift * (t - t0), E.lateral, E.y), aim);
      cs.forEach((c, i) => frames.set(c.id, { to, move: i ? 'snap' : 'cut' }));
    }

    // the signals down the bore, clear of the mouths and the signs; red on the word "crash"
    const crash = st.lines.flatMap((l) => l.words).find((w) => CRASH.test(w.w));
    const crashAt = crash?.start ?? st.end + 1;
    const signals: number[] = [];
    for (let s = s0 + 28; s < s1 - SIGNALS.clear; s += SIGNALS.step) {
      if (panels.some((p) => Math.abs(p.s - s) < SIGNALS.clear)) continue;
      signals.push(s);
    }
    const plan: Bridge1Plan = { panels, signals, crashAt, calm: crashAt + SIGNALS.calm, s0, s1 };
    return { carriers, frames, clear: [], blocks: [], plan };
  },
};
