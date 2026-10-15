// Tunnels: a stretch marked `tunnel` (the bridge) runs through a headland: the car goes in on the stretch's first beat
// and comes out into the next. Inside, tiled walls and a ceiling, a sodium lamp passing over the car on every beat (so
// they strobe in time), the lyrics lit up along the left wall (carriers.ts 'tunnel'). Pure: the scene builds and lights
// it (world.ts, scenes/drive.ts), the guard checks nothing else stands in it.
import { hash } from '../engine/util';
import type { Motion } from './motion';
import type { Stretch } from './stretches';

/** The bore's glazed tiles: one texture repeat is this many metres square, four tiles by four. */
export const TILE_REPEAT = 2;
/** One repeat of the tiles into a 256 px canvas: big tiles, heavy grout (no shimmer); a few tiles grimier, streaks
 *  running down (glazed clean, the bore read as a test room). The bore is textured with it (world.ts); the graffiti
 *  on the wall multiplies its paint by it drawn white (carrierart.ts), so the grout and grime show through the paint. */
export function drawTiles(x: CanvasRenderingContext2D, face = '#ddd3bc', grout = '#9a907c') {
  x.fillStyle = face; x.fillRect(0, 0, 256, 256);
  x.fillStyle = grout;
  for (let k = 0; k < 4; k++) { x.fillRect(k * 64, 0, 5, 256); x.fillRect(0, k * 64, 256, 5); }
  for (let i = 0; i < 16; i++) if (hash(i, 7) < 0.3) { x.fillStyle = `rgba(90,70,60,${(0.1 + 0.15 * hash(i, 8)).toFixed(2)})`; x.fillRect((i % 4) * 64 + 5, Math.floor(i / 4) * 64 + 5, 59, 59); }
  for (let i = 0; i < 9; i++) { const u = hash(i, 9) * 256, w = 3 + 6 * hash(i, 10); const gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(70,50,45,0.35)'); gr.addColorStop(1, 'rgba(70,50,45,0)'); x.fillStyle = gr; x.fillRect(u, 0, w, 256); }
}

/** The bore: half its width and its height (m); the headland over it: how far above the ceiling its top stands, and
 *  how far out either side it meets the ground. */
export const TUNNEL = { halfW: 7, h: 6.5, hill: 4, hillHalfW: 45 };
/** No other carrier stands within this far of a tunnel's mouths (m): the camera would be in the rock. */
export const TUNNEL_CLEAR = 15;

export interface Tunnel {
  stretch: string;
  /** Its mouths (m along the road). */
  s0: number;
  s1: number;
  /** Where its lamps hang (m along the road): over the car on each beat. */
  lamps: number[];
}

export function tunnelsOf(R: readonly Stretch[], motion: Motion, beats: readonly number[]): Tunnel[] {
  return R.filter((st) => st.tunnel).map((st) => ({
    stretch: st.id,
    s0: motion.distanceAt(st.start),
    s1: motion.distanceAt(st.end),
    lamps: beats.filter((b) => b >= st.start && b < st.end).map((b) => motion.distanceAt(b)),
  }));
}

/** How far inside a tunnel s is (0 outside, 1 more than `ramp` m in from a mouth). */
export function insideAt(tunnels: readonly Tunnel[], s: number, ramp = 6): number {
  for (const tn of tunnels) {
    if (s > tn.s0 && s < tn.s1) return Math.min(1, (s - tn.s0) / ramp, (tn.s1 - s) / ramp);
  }
  return 0;
}

/** The tunnel s is in, or within `margin` m of a mouth of (if any). */
export const nearTunnel = (tunnels: readonly Tunnel[], s: number, margin = 0) => tunnels.find((tn) => s > tn.s0 - margin && s < tn.s1 + margin);
