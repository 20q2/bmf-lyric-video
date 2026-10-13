// Verse 3, the Strip at night (flow plan §7): one sign per line, each shaped for its line, flickering on with it
// (the props: scenes/sets/verse3.ts), the camera tracking along the strip in one slow take — the cut INTO the take is
// the tunnel's burst-out into full night. The lyrics keep the film's own sign kinds:
//   "Ecstasy is just a pill away"             neon, under a pharmacy's pill
//   "Pop it up or you could screw today"      neon, a champagne glass, its cork popped
//   "I'm just tryna hear you say my name"     the marquee (a name in lights is the point)
//   "Love to play your ruler, be your Jane"   neon, the tiki bar's first face
//   "You could be my Tarzan, toss me up"      neon, the tiki bar's second (TARZAN & JANE is the bar's own sign)
//   "Other hoes is lacking, call me up"       neon, over the payphones (their coin light blinks on the line)
//   "Know my baby packing, why I'm stuck"     the pawn shop's fascia, three gold balls over it
//   "That's why he my man"                    neon, the wedding chapel's heart
// Pure.
import * as THREE from 'three';
import { type Carrier, type Kind, LEFT, LEFT_GAP, layout, lookFrom, solidFor } from '../carriers';
import { type Phrase, phrasesOf } from '../phrases';
import { TUNNEL_CLEAR } from '../tunnel';
import type { Placed, SetContext, SetFrame, SetPiece } from './index';

const UP = new THREE.Vector3(0, 1, 0);
const flat = (v: THREE.Vector3) => new THREE.Vector3(v.x, 0, v.z).normalize();
const smooth = (a: number, b: number, x: number) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };

/** Each line's sign: its kind, its prop's theme, and its lyric's scale. */
export const SIGNS: readonly { kind: Kind; theme: Theme; scale?: number }[] = [
  { kind: 'neon', theme: 'pill' },
  { kind: 'neon', theme: 'pop' },
  { kind: 'marquee', theme: 'marquee', scale: 3 },
  { kind: 'neon', theme: 'tiki1' },
  { kind: 'neon', theme: 'tiki2' },
  { kind: 'neon', theme: 'phone' },
  { kind: 'storefront', theme: 'pawn' },
  { kind: 'neon', theme: 'chapel' },
];
export type Theme = 'pill' | 'pop' | 'marquee' | 'tiki1' | 'tiki2' | 'phone' | 'pawn' | 'chapel';
/** Where the signs stand (m off the road's centre) and the take: the eye rides the strip on the right (m behind the
 *  car, off the road's centre, up); the aim swings to each sign round its line's start (s). */
export const STRIP = { lateral: -15, eye: { back: 4, lateral: 5, y: 2.2 }, swing: [0.5, 0.18] as [number, number] };

interface Face { center: THREE.Vector3; normal: THREE.Vector3; up: THREE.Vector3; w: number; h: number }
export interface Verse3Plan {
  /** A sign a line: its face (the whole stack), its theme, and its line's start (the prop flickers on with it). */
  signs: { s: number; face: Face; theme: Theme; start: number }[];
}

export const VERSE3: SetPiece = {
  place(ctx: SetContext): Placed {
    const { st, route, motion } = ctx;
    const carS = (t: number) => motion.distanceAt(t);
    const atRoad = (s: number, lateral: number, y: number) => { const f = route.frameAt(s); return f.pos.clone().addScaledVector(f.right, lateral).addScaledVector(UP, y); };
    const ground = (s: number) => route.frameAt(s).pos.y;
    const carriers: Carrier[] = [], frames = new Map<string, SetFrame>();

    // a sign a line, down the left of the strip: at the car's position mid-line, past the tunnel's mouth and clear of
    // the sign before; the line's phrases stacked top-down, the building behind (solidFor: the guard sees it)
    const signs: Verse3Plan['signs'] = [];
    const stacks: { aim: THREE.Vector3; start: number; end: number; cs: Carrier[] }[] = [];
    let prevS = -Infinity, prevW = 0;
    st.lines.forEach((line, li) => {
      const spec = SIGNS[li % SIGNS.length]!, phs = phrasesOf(line, ctx.nextStart(line.i), ctx.solo);
      const lays = phs.map((ph) => layout(spec.kind, ph.text, ph.solo, spec.scale ?? 1));
      const H = lays.reduce((a, l) => a + l.h, 0), W = Math.max(...lays.map((l) => l.w));
      const mid = (line.words[0]!.start + line.end) / 2;
      const minS = li === 0 ? carS(st.start) + TUNNEL_CLEAR + W / 2 + 1 : prevS + (prevW + W) / 2 + LEFT_GAP;
      const s = Math.max(carS(mid), minS);
      prevS = s; prevW = W;
      const f = route.frameAt(s), n = flat(f.right);
      const base = spec.kind === 'neon' ? LEFT.neon.y : spec.kind === 'storefront' ? LEFT.storefront.y : 4.6;
      // (the stack's foot stays over the car's roof: the take looks across the road past the car)
      const yC = Math.max(base, H / 2 + 2.7);
      let top = yC + H / 2;
      const cs = phs.map((ph, pi) => {
        const L = lays[pi]!, y = top - L.h / 2, center = atRoad(s, STRIP.lateral, y);
        top -= L.h;
        // the first (top) phrase carries the stack's solid: the sign's building (or the marquee's board), spanning any
        // phrase stacked under it, so the guard sees what stands there
        const under = phs.length > 1 ? { h: H - L.h, dy: -H / 2 } : undefined;
        const solid = pi > 0 ? null
          : spec.kind === 'marquee' ? { at: new THREE.Vector3(0, L.h / 2 - H / 2, -0.12), size: new THREE.Vector3(W + 0.4, H + 0.7, 0.2) }
          : solidFor(spec.kind, W, L.h, y, under);
        const c: Carrier = { id: `L${line.i}.${pi}`, phrase: ph, kind: spec.kind, stretch: st.id, reveal: ph.start, s, center, normal: n.clone(), up: UP.clone(), ...L, foot: y, solid };
        carriers.push(c);
        return c;
      });
      signs.push({ s, face: { center: atRoad(s, STRIP.lateral, yC), normal: n.clone(), up: UP.clone(), w: W, h: H }, theme: spec.theme, start: line.words[0]!.start });
      stacks.push({ aim: atRoad(s, STRIP.lateral, yC), start: line.words[0]!.start, end: line.end, cs });
    });

    // one slow take down the strip: the eye rides just behind the car on the right, the aim swinging sign to sign as
    // each line comes (never before the line before is sung: its words are still being read)
    const E = STRIP.eye;
    const take = (t: number) => {
      const aim = stacks[0]!.aim.clone();
      for (let i = 1; i < stacks.length; i++) {
        const sk = stacks[i]!;
        aim.lerp(sk.aim, smooth(Math.max(stacks[i - 1]!.end + 0.02, sk.start - STRIP.swing[0]), sk.start + STRIP.swing[1], t));
      }
      return lookFrom(atRoad(carS(t) - E.back, E.lateral, E.y), aim);
    };
    carriers.forEach((c, i) => frames.set(c.id, { to: take, move: i ? 'snap' : 'cut' }));

    const last = signs[signs.length - 1]!;
    const clear = [-1, 1].map((side) => ({ side, a: signs[0]!.s - 12, b: last.s + 12 }));
    return { carriers, frames, clear, blocks: [], plan: { signs } satisfies Verse3Plan, floor: last.s + prevW / 2 + 12 };
  },
};
