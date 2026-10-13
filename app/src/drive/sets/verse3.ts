// Verse 3, the Strip at night (flow plan §7; rebuilt 2026-10-13: the one slow take read as a metronome — the verse is
// the song's fastest, and the edit should snap with it). One shaped sign per line, on BOTH sides of the strip, each
// flickering on with its line (the props: scenes/sets/verse3.ts); a designed shot per sign, cut on the line's beat —
// the eye ping-pongs across the street the way you'd actually gawk down a neon strip. The tiki bar's two lines are the
// one held two-shot; the chapel's pulls wide, the whole lit strip behind it, and hands to chorus 4's climb.
//   "Ecstasy is just a pill away"             neon, low and close under the pharmacy's pill (left)
//   "Pop it up or you could screw today"      neon, the liquor store's champagne glass (right)
//   "I'm just tryna hear you say my name"     the marquee, head on (a name in lights is the point; left)
//   "Love to play your ruler, be your Jane"   neon, the tiki bar's first face (right) —
//   "You could be my Tarzan, toss me up"      — and its second, one take across the pair under TARZAN & JANE
//   "Other hoes is lacking, call me up"       neon over the payphones, from the kerb (their coin light blinks; left)
//   "Know my baby packing, why I'm stuck"     the pawn shop's fascia, low, three gold balls over it (right)
//   "That's why he my man"                    the chapel's heart — wide, the strip glowing behind (left)
// Pure.
import * as THREE from 'three';
import { type Carrier, type Kind, LEFT, LEFT_GAP, layout, lookFrom, solidFor } from '../carriers';
import { phrasesOf } from '../phrases';
import { TUNNEL_CLEAR } from '../tunnel';
import type { Placed, SetContext, SetFrame, SetPiece } from './index';

const UP = new THREE.Vector3(0, 1, 0);
const flat = (v: THREE.Vector3) => new THREE.Vector3(v.x, 0, v.z).normalize();
const smooth = (a: number, b: number, x: number) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };

export type Theme = 'pill' | 'pop' | 'marquee' | 'tiki1' | 'tiki2' | 'phone' | 'pawn' | 'chapel';
/** Each line's sign: its kind, its prop's theme, its side of the strip (-1 left, +1 right), its lyric's scale, and its
 *  shot (how far out along the sign's normal the eye stands, how high, and how far up-road of the sign; m). */
export const SIGNS: readonly { kind: Kind; theme: Theme; side: -1 | 1; scale?: number; eye: { out: number; y: number; along: number } }[] = [
  { kind: 'neon', theme: 'pill', side: -1, eye: { out: 14, y: 1.25, along: 2 } },
  // (right-side eyes either hug their own kerb — the ray never crosses the lane — or stand fully across, over the roof)
  { kind: 'neon', theme: 'pop', side: 1, eye: { out: 18, y: 2.2, along: 4 } },
  { kind: 'marquee', theme: 'marquee', scale: 3, side: -1, eye: { out: 15.5, y: 2.9, along: 0 } },
  { kind: 'neon', theme: 'tiki1', side: 1, eye: { out: 17, y: 2.0, along: 0 } },
  { kind: 'neon', theme: 'tiki2', side: 1, eye: { out: 17, y: 2.0, along: 0 } }, // (the pair shares one take)
  { kind: 'neon', theme: 'phone', side: -1, eye: { out: 11, y: 1.15, along: 3 } },
  { kind: 'storefront', theme: 'pawn', side: 1, eye: { out: 18, y: 1.8, along: 5 } },
  { kind: 'neon', theme: 'chapel', side: -1, eye: { out: 22, y: 2.6, along: 6 } },
];
/** The signs' faces off the road's centre (m), the two-shot's aim swing (s round the second line's start), and where
 *  its eye tracks along the strip, from and to (0: facing the first face, 1: the second), and how much further apart
 *  its two faces stand than neighbours do (m: closer, the first stood cut by the frame's edge through the second). */
export const STRIP = { lateral: 15, swing: [0.45, 0.15] as [number, number], track: [0.1, 1] as [number, number], pairGap: 9 };

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

    // a sign a line, alternating sides of the strip: at the car's position mid-line, past the tunnel's mouth, and
    // clear of the sign before on its own side; the line's phrases stacked top-down, the building behind (solidFor)
    const signs: Verse3Plan['signs'] = [];
    const stacks: { spec: (typeof SIGNS)[number]; s: number; aim: THREE.Vector3; start: number; end: number; cs: Carrier[] }[] = [];
    const lastOn: Record<number, { s: number; w: number }> = {};
    st.lines.forEach((line, li) => {
      const spec = SIGNS[li % SIGNS.length]!, phs = phrasesOf(line, ctx.nextStart(line.i), ctx.solo);
      const lays = phs.map((ph) => layout(spec.kind, ph.text, ph.solo, spec.scale ?? 1));
      const H = lays.reduce((a, l) => a + l.h, 0), W = Math.max(...lays.map((l) => l.w));
      const mid = (line.words[0]!.start + line.end) / 2;
      const prev = lastOn[spec.side];
      const minS = Math.max(
        li === 0 ? carS(st.start) + TUNNEL_CLEAR + W / 2 + 1 : -Infinity,
        prev ? prev.s + (prev.w + W) / 2 + LEFT_GAP + (spec.theme === 'tiki2' ? STRIP.pairGap : 0) : -Infinity,
      );
      const s = Math.max(carS(mid), minS);
      lastOn[spec.side] = { s, w: W };
      const f = route.frameAt(s), n = flat(f.right).multiplyScalar(-spec.side); // (facing the road from its side)
      const lateral = spec.side * STRIP.lateral;
      const base = spec.kind === 'neon' ? LEFT.neon.y : spec.kind === 'storefront' ? LEFT.storefront.y : 4.6;
      // (the stack's foot stays over the car's roof: the shots look across the road past it)
      const yC = Math.max(base, H / 2 + 2.7);
      let top = yC + H / 2;
      const cs = phs.map((ph, pi) => {
        const L = lays[pi]!, y = top - L.h / 2, center = atRoad(s, lateral, y);
        top -= L.h;
        const under = phs.length > 1 ? { h: H - L.h, dy: -H / 2 } : undefined;
        const solid = pi > 0 ? null
          : spec.kind === 'marquee' ? { at: new THREE.Vector3(0, L.h / 2 - H / 2, -0.12), size: new THREE.Vector3(W + 0.4, H + 0.7, 0.2) }
          : solidFor(spec.kind, W, L.h, y, under);
        const c: Carrier = { id: `L${line.i}.${pi}`, phrase: ph, kind: spec.kind, stretch: st.id, reveal: ph.start, s, center, normal: n.clone(), up: UP.clone(), ...L, foot: y, solid };
        carriers.push(c);
        return c;
      });
      signs.push({ s, face: { center: atRoad(s, lateral, yC), normal: n.clone(), up: UP.clone(), w: W, h: H }, theme: spec.theme, start: line.words[0]!.start });
      stacks.push({ spec, s, aim: atRoad(s, lateral, yC), start: line.words[0]!.start, end: line.end, cs });
    });

    // a designed shot per sign, cut on its line's beat: the eye out along the sign's normal (so it ping-pongs across
    // the street), at its own height and up-road offset — low under the pill, head-on at the marquee, kerb-level by
    // the phones, wide at the chapel. The tiki pair shares one take, the aim swinging to the second face on its line.
    const shotOf = (k: number) => {
      const sk = stacks[k]!, E = sk.spec.eye;
      const eye = atRoad(sk.s - E.along, sk.spec.side * (STRIP.lateral - E.out), E.y);
      return lookFrom(eye, sk.aim);
    };
    stacks.forEach((sk, k) => {
      if (sk.spec.theme === 'tiki2') { // the pair's one take: the eye tracking along the strip from the first face to
        // the second, the aim swinging over with it (from a static eye between them, the first face's words stood cut
        // by the frame's edge while the second's were read)
        const a = stacks[k - 1]!, E = sk.spec.eye;
        const eyeAt = (s: number) => atRoad(s - E.along, sk.spec.side * (STRIP.lateral - E.out), E.y);
        const to = (t: number) => {
          const u = smooth(Math.max(a.end - 0.1, sk.start - STRIP.swing[0]), sk.start + STRIP.swing[1], t);
          return lookFrom(eyeAt(a.s + (sk.s - a.s) * (STRIP.track[0] + (STRIP.track[1] - STRIP.track[0]) * u)), a.aim.clone().lerp(sk.aim, u));
        };
        a.cs.forEach((c, i) => frames.set(c.id, { to, move: i ? 'snap' : 'cut' }));
        sk.cs.forEach((c) => frames.set(c.id, { to, move: 'snap' }));
        return;
      }
      if (sk.spec.theme === 'tiki1') return; // (framed with tiki2, above)
      const pose = shotOf(k);
      sk.cs.forEach((c, i) => frames.set(c.id, { to: () => pose, move: i ? 'snap' : 'cut' }));
    });

    const last = signs[signs.length - 1]!;
    const clear = [-1, 1].map((side) => ({ side, a: signs[0]!.s - 12, b: last.s + 12 }));
    return { carriers, frames, clear, blocks: [], plan: { signs } satisfies Verse3Plan, floor: last.s + last.face.w / 2 + 12 };
  },
};
