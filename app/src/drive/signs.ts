// The greybox lyric signs: one board per line, standing where the car is when the line is half sung — beside the road
// (alternating right and left) or over it on a gantry — turned toward the oncoming car. Their text layout (rows and
// type size, in metres) is computed here, purely, from approximate glyph widths, so the guards can check legibility
// under bun; the scene draws the boards to match (signart.ts). Pure.
import * as THREE from 'three';
import type { Line } from '../engine/lyrics';
import type { Board } from './camera';
import type { Motion } from './motion';
import type { Route } from './route';
import type { Stretch } from './stretches';

export interface Sign extends Board {
  id: string;
  line: Line;
  stretch: string;
  /** +1 right of the road, -1 left, 0 over it. */
  side: 1 | -1 | 0;
  /** The text as laid out: its rows, and the type's em (m). */
  rows: string[];
  em: number;
}

/** Board centre: off the road's centre line (m) and up from the road (m); gantries hang over the road. */
export const LATERAL = 7.5;
export const SIGN_Y = 3.2;
export const GANTRY_Y = 6;
/** Boards turn this far from facing straight back down the road toward it (radians). */
export const TOE = (25 * Math.PI) / 180;
/** Boards on one side stand at least this far apart along the road (m). */
export const SPACING = 14;
/** A row's height (m), the boards' widths for one and two rows, and the share of a row the type's em may take. */
export const ROW_H = 1.6;
export const WIDTH = { 1: 6, 2: 7.5 } as const;
const EM_OF_ROW = 0.62;
/** Lines longer than this wrap onto two rows. */
export const WRAP_AT = 30;
/** Bodoni Moda italic's average advance per character, as a share of the em (approximate: the guards' measure). */
export const ADVANCE = 0.42;
/** The share of the board's width the text may take. */
const TEXT_W = 0.9;

/** Split a line into one or two rows, balancing their lengths. */
export function rowsOf(text: string): string[] {
  if (text.length <= WRAP_AT) return [text];
  const words = text.split(' ');
  let best = 1, bestD = Infinity;
  for (let k = 1; k < words.length; k++) {
    const d = Math.abs(words.slice(0, k).join(' ').length - words.slice(k).join(' ').length);
    if (d < bestD) { bestD = d; best = k; }
  }
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
}

export function placeSigns(R: readonly Stretch[], motion: Motion, route: Route): Sign[] {
  const out: Sign[] = [];
  const last = { 1: -Infinity, '-1': -Infinity, 0: -Infinity } as Record<string, number>;
  for (const st of R) {
    st.lines.forEach((line, j) => {
      const side: Sign['side'] = st.signs === 'gantry' ? 0 : j % 2 === 0 ? 1 : -1;
      let s = motion.distanceAt((line.start + line.end) / 2);
      s = Math.max(s, last[side]! + SPACING);
      last[side] = s;
      const f = route.frameAt(s);
      const back = new THREE.Vector3(-f.fwd.x, 0, -f.fwd.z).normalize();
      const rows = rowsOf(line.text), n = rows.length as 1 | 2;
      const w = WIDTH[n], h = ROW_H * n;
      const longest = Math.max(...rows.map((r) => r.length));
      const em = Math.min(ROW_H * EM_OF_ROW, (w * TEXT_W) / (longest * ADVANCE));
      let center: THREE.Vector3, normal: THREE.Vector3;
      if (side === 0) {
        center = f.pos.clone().addScaledVector(f.up, GANTRY_Y);
        normal = back;
      } else {
        center = f.pos.clone().addScaledVector(f.right, side * LATERAL).addScaledVector(f.up, SIGN_Y);
        const toRoad = f.right.clone().multiplyScalar(-side);
        normal = back.multiplyScalar(Math.cos(TOE)).addScaledVector(toRoad, Math.sin(TOE)).normalize();
      }
      out.push({ id: `L${line.i}`, line, stretch: st.id, side, center, normal, w, h, rows, em });
    });
  }
  return out;
}
