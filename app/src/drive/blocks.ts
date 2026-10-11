// The town's buildings either side of the road, plot by plot (seeded), as boxes. Pure: world.ts builds them and the
// guard (tests/sung.test.ts) checks they never hide a lyric or swallow the camera. No building on a plot where a face
// on the left (with its own building) or a board stands, nor across the road from a face on the left (where its
// camera stands): the town makes room for the words.
import * as THREE from 'three';
import { hash } from '../engine/util';
import type { Carrier } from './carriers';
import type { Motion } from './motion';
import type { Route } from './route';
import type { Stretch } from './stretches';
import { TUNNEL_CLEAR, type Tunnel, nearTunnel } from './tunnel';

/** Per stretch: building heights (m, min–max), how many plots stay empty, which side is the sea, and how far back
 *  (m) the near row starts. */
export const BLOCKS: Record<string, { h: [number, number]; empty: number; seaLeft?: boolean; far?: number }> = {
  intro: { h: [6, 10], empty: 0.5 },
  chorus1: { h: [8, 22], empty: 0.3 },
  verse1: { h: [14, 40], empty: 0.1 },
  chorus2: { h: [6, 14], empty: 0.6, far: 40 },
  verse2: { h: [4, 8], empty: 0.3 },
  chorus3: { h: [5, 10], empty: 0.6, seaLeft: true },
  bridge1: { h: [5, 9], empty: 1, seaLeft: true }, // in the tunnel
  verse3: { h: [8, 18], empty: 0.05 },
  chorus4: { h: [3, 6], empty: 0.8 },
  outro1: { h: [0, 0], empty: 1 },
};
/** Plots every PLOT m; the near row at least `far` m off the road's centre. */
export const PLOT = 22;
const NEAR = 18;

/** A box standing by the road: a building (the town's), or concrete (a set-piece's structure: a viaduct's deck, its
 *  piers); `lateral` and `w` across the road, `d` along it. */
export interface Block { s: number; lateral: number; w: number; h: number; d: number; color: number; matrix: THREE.Matrix4; concrete?: boolean }

/** A box `across` x `h` x `along` the road, standing `lateral` off it at s (its foot on the road's level, or `y0` over it). */
export function boxAt(route: Route, s: number, lateral: number, across: number, h: number, along: number, y0 = 0): THREE.Matrix4 {
  const f = route.frameAt(s), p = f.pos.clone().addScaledVector(f.right, lateral);
  const m = new THREE.Matrix4().makeBasis(f.right.clone().negate(), new THREE.Vector3(0, 1, 0), new THREE.Vector3(f.fwd.x, 0, f.fwd.z).normalize());
  m.scale(new THREE.Vector3(across, h, along));
  m.setPosition(p.x, p.y + y0 + h / 2, p.z);
  return m;
}

export function blocksOf(route: Route, motion: Motion, stretches: readonly Stretch[], carriers: readonly Carrier[], tunnels: readonly Tunnel[], keepClear: readonly { side: number; a: number; b: number }[] = [], own: readonly Block[] = []): Block[] {
  const stretchAtS = (s: number): Stretch => {
    for (const st of stretches) if (s < motion.distanceAt(st.end)) return st;
    return stretches[stretches.length - 1]!;
  };
  // where the words stand, per side (−1 left, +1 right): [s from, s to]
  // (a hill sign keeps its whole side of the road clear, from well before it: it's seen across the valley)
  const hills = carriers.filter((c) => c.kind === 'hill').map((c) => ({ side: -1, a: c.s - 260, b: c.s + 60 }));
  const faces = [...hills, ...carriers.filter((c) => c.solid).flatMap((c) => {
    const side = Math.sign(c.center.clone().sub(route.frameAt(c.s).pos).dot(route.frameAt(c.s).right)) || 1;
    // a face on the left is filmed from across the road (a wide pair stands well back): that side stays open too, and
    // its own as far (on a bend, the building on the inside of it stands in that shot)
    const margin = side < 0 ? c.w / 2 + 24 : 14, here = { side, a: c.s - c.w / 2 - margin, b: c.s + c.w / 2 + margin };
    return side < 0 ? [here, { side: 1, a: c.s - c.w - 24, b: c.s + c.w + 24 }] : [here];
  })];
  // (and what the set-pieces keep clear of the town: a cross street, a freeway's wall)
  const taken = [...faces, ...keepClear];
  // a set-piece's own blocks stand where no face needs the ground (the ground it keeps clear is kept from the town's)
  const out: Block[] = own.filter((b) => !faces.some((t) => t.side === Math.sign(b.lateral) && b.s + b.w / 2 > t.a && b.s - b.w / 2 < t.b));
  const owned = own.map((b) => ({ side: Math.sign(b.lateral), a: b.s - b.w / 2 - 4, b: b.s + b.w / 2 + 4 }));
  for (let k = 0; k * PLOT < route.length; k++) {
    for (const side of [1, -1]) {
      const s = k * PLOT + PLOT / 2, b = BLOCKS[stretchAtS(s).id]!;
      if ((side === -1 && b.seaLeft) || hash(k, side, 1) < b.empty) continue;
      if (nearTunnel(tunnels, s, TUNNEL_CLEAR) || [...taken, ...owned].some((t) => t.side === side && s > t.a && s < t.b)) continue;
      const w = 10 + 10 * hash(k, side, 2), d = 10 + 10 * hash(k, side, 3), h = b.h[0] + (b.h[1] - b.h[0]) * hash(k, side, 4);
      const lateral = side * ((b.far ?? NEAR) + d / 2 + 6 * hash(k, side, 5));
      const lift = route.frameAt(s).pos.y + 0.4; // down to the plain: by a raised road it would float
      out.push({ s, lateral, w, h, d, color: hash(k, side, 6), matrix: boxAt(route, s, lateral, d, h + lift, w, -lift) }); // (w along the road, d deep)
    }
  }
  return out;
}
