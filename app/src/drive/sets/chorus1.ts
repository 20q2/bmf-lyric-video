// Chorus 1's first line (the user, 2026-10-12: the first cut fell in the middle of it; "do something else for the
// opening"): "Young and fine and dark and handsome" in gold leaf on the barbershop's two windows on the far left corner,
// one take from the far right corner's sidewalk as the light goes green: the light changing up over the lane, the car
// pulling away from the line into the frame from the left and on past the windows, the camera drifting with it. The rest
// of chorus 1 is the drive's own (carriers.ts). Pure.
import * as THREE from 'three';
import { CAMPAIGN, type Carrier, layout, lookFrom } from '../carriers';
import { phraseOf } from '../phrases';
import { ROAD_HALF } from '../route';
import { type Block, boxAt } from '../blocks';
import type { Placed, SetContext, SetFrame, SetPiece } from './index';

const UP = new THREE.Vector3(0, 1, 0);
const flat = (v: THREE.Vector3) => new THREE.Vector3(v.x, 0, v.z).normalize();
const smooth = (a: number, b: number, x: number) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };

/** The barbershop on the far left corner (m along the road from where the car waited: where it starts; its front off
 *  the road's centre, its depth and height); a window a phrase (width, height, their middles' height, the wall either
 *  end), a door between each. */
export const BARBER = { s0: 17, face: -(ROAD_HALF + 3), d: 11, h: 5.6, window: { w: 5.8, h: 2.5, y: 2.45, inset: 0.5 }, door: 1.3 };
/** The take: the eye at the mouth of the cross street on the right, drifting along (m along the road, from and to:
 *  short of the signal's mast, which would stand in the frame), off the road's centre, up (over the two of them as the car passes between: they never hide the windows); the aim swings from the
 *  first window to the second this long either side of the second phrase's first word (s). */
export const TAKE = { s: [9, 12.6] as [number, number], lateral: ROAD_HALF + 2, y: 2.6, swing: [0.4, 0.15] as [number, number] };

export interface Chorus1Plan {
  /** The barbershop's block, its windows' centres (m along the road) and its doors'. */
  shop: Block;
  windows: number[];
  doors: number[];
}

export const CHORUS1: SetPiece = {
  owns: (line) => CAMPAIGN.test(line.text),

  place(ctx: SetContext): Placed {
    const { st, route } = ctx;
    // (two phrases, a window each: "Young and fine | and dark and handsome")
    const line = st.lines.find((l) => CAMPAIGN.test(l.text))!, ws = line.words;
    const k = Math.max(1, ws.findIndex((w) => /^fine/i.test(w.w)) + 1), phs = [phraseOf(line, 0, k, ctx.solo), phraseOf(line, k, ws.length, ctx.solo)];
    const atRoad = (s: number, lateral: number, y: number) => { const f = route.frameAt(s); return f.pos.clone().addScaledVector(f.right, lateral).addScaledVector(UP, y); };
    const B = BARBER, Wn = B.window;
    const windows = phs.map((_, i) => B.s0 + Wn.inset + Wn.w / 2 + i * (Wn.w + B.door)), s1 = B.s0 + 2 * Wn.inset + phs.length * Wn.w + (phs.length - 1) * B.door;
    // each phrase on its own window, in gold leaf on the glass (a hair proud of the front)
    const carriers: Carrier[] = phs.map((ph, i) => {
      const s = windows[i]!, center = atRoad(s, B.face + 0.04, Wn.y), lay = layout('barber', ph.text, ph.solo);
      return { id: `L${line.i}.${i}`, phrase: ph, kind: 'barber', stretch: st.id, reveal: ph.start, s, center, normal: flat(route.frameAt(s).right), up: UP.clone(), ...lay, foot: Wn.y, solid: null };
    });
    // (the aim on each window in turn, swinging on to the next as its phrase comes)
    const T = TAKE, t0 = st.start, t1 = line.end + 0.6;
    const take = (t: number) => {
      const u = Math.min(1, Math.max(0, (t - t0) / (t1 - t0))), aim = carriers[0]!.center.clone();
      for (let i = 1; i < carriers.length; i++) { const at = carriers[i]!.phrase.start; aim.lerp(carriers[i]!.center, smooth(at - T.swing[0], at + T.swing[1], t)); }
      return lookFrom(atRoad(T.s[0] + (T.s[1] - T.s[0]) * u, T.lateral, T.y), aim);
    };
    const frames = new Map<string, SetFrame>();
    carriers.forEach((c, i) => frames.set(c.id, i ? { to: take, move: 'snap' } : { to: take, move: 'cut', at: st.start }));
    const ss = (B.s0 + s1) / 2, lateral = B.face - B.d / 2;
    const shop: Block = { s: ss, lateral, w: s1 - B.s0, h: B.h, d: B.d, color: 0.15, bare: true, prop: true, matrix: boxAt(route, ss, lateral, B.d, B.h, s1 - B.s0) };
    const plan: Chorus1Plan = { shop, windows, doors: windows.slice(1).map((w) => w - Wn.w / 2 - B.door / 2) };
    return { carriers, frames, clear: [{ side: -1, a: B.s0 - 4, b: s1 + 4 }], blocks: [shop], plan };
  },
};
