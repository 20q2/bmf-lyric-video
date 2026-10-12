// The road: a centre line in metres, parameterised by s, the horizontal distance driven (the car's motion.ts
// distance). Each segment bends the heading and lifts the road smoothly over its middle 60%, so corners and grades
// start and finish gently. Positions come from a table integrated every STEP metres. Pure.
import * as THREE from 'three';

/** A stretch of road: from s0 to s1 (m), turning by `turn` (radians, + to the left) and climbing by `rise` (m). */
/** The road's half-width (m): a lane each way. */
export const ROAD_HALF = 4;
export interface Segment { s0: number; s1: number; turn: number; rise: number }
export interface RouteFrame {
  pos: THREE.Vector3;
  /** Unit vectors: along the road (up the grade), to its right, and its up (fwd x up = right). */
  fwd: THREE.Vector3;
  right: THREE.Vector3;
  up: THREE.Vector3;
  /** Compass heading (radians): fwd's horizontal part is (sin heading, cos heading). */
  heading: number;
}

const STEP = 0.5;
const smooth = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
const dsmooth = (u: number) => (u <= 0 || u >= 1 ? 0 : 6 * u * (1 - u));

export class Route {
  readonly length: number;
  private xs: Float64Array;
  private zs: Float64Array;

  /** `segments` tile [0, last s1]; the road runs straight on for `tail` metres past them. */
  constructor(private segments: readonly Segment[], tail = 150) {
    for (let k = 1; k < segments.length; k++) {
      if (Math.abs(segments[k]!.s0 - segments[k - 1]!.s1) > 1e-9) throw new Error(`Route: segment ${k} starts at ${segments[k]!.s0}, not where ${k - 1} ends (${segments[k - 1]!.s1})`);
    }
    this.length = (segments[segments.length - 1]?.s1 ?? 0) + tail;
    const n = Math.ceil(this.length / STEP) + 2;
    this.xs = new Float64Array(n);
    this.zs = new Float64Array(n);
    for (let i = 1; i < n; i++) {
      const h = this.heading((i - 0.5) * STEP);
      this.xs[i] = this.xs[i - 1]! + Math.sin(h) * STEP;
      this.zs[i] = this.zs[i - 1]! + Math.cos(h) * STEP;
    }
  }

  /** The segment's eased progress at s: the middle 60% of its length. */
  private u(seg: Segment, s: number) {
    const L = seg.s1 - seg.s0;
    return L <= 0 ? (s >= seg.s1 ? 1 : 0) : (s - seg.s0 - 0.2 * L) / (0.6 * L);
  }

  heading(s: number): number {
    let h = 0;
    for (const seg of this.segments) h += seg.turn * smooth(this.u(seg, s));
    return h;
  }

  height(s: number): number {
    let y = 0;
    for (const seg of this.segments) y += seg.rise * smooth(this.u(seg, s));
    return y;
  }

  /** dy/ds. */
  private grade(s: number): number {
    let g = 0;
    for (const seg of this.segments) {
      const L = seg.s1 - seg.s0;
      if (L > 0) g += (seg.rise * dsmooth(this.u(seg, s))) / (0.6 * L);
    }
    return g;
  }

  frameAt(s: number): RouteFrame {
    // (behind the start, straight on back: the corner where the car waits has a street behind it)
    if (s < 0) { const f = this.frameAt(0); f.pos.addScaledVector(f.fwd, s); return f; }
    const c = Math.min(this.length, s), x = c / STEP, i = Math.min(Math.floor(x), this.xs.length - 2), f = x - i;
    const pos = new THREE.Vector3(
      this.xs[i]! + (this.xs[i + 1]! - this.xs[i]!) * f,
      this.height(c),
      this.zs[i]! + (this.zs[i + 1]! - this.zs[i]!) * f,
    );
    const heading = this.heading(c), g = this.grade(c);
    const fwd = new THREE.Vector3(Math.sin(heading), g, Math.cos(heading)).normalize();
    const right = new THREE.Vector3(-Math.cos(heading), 0, Math.sin(heading));
    const up = right.clone().cross(fwd).normalize();
    return { pos, fwd, right, up, heading };
  }
}
