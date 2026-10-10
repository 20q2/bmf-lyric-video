// The car's progress along the route: a speed profile in song time and its exact integral. Pure.

/** From `t` (song s) the speed eases from whatever it was to `v` (m/s) over `ramp` seconds (smoothstep; 0 = at once). */
export interface SpeedKey { t: number; v: number; ramp: number }

/** ∫₀ᵘ smoothstep: the distance fraction a smoothstep ramp has covered by u in [0, 1]. */
const S = (u: number) => u * u * u - (u * u * u * u) / 2;
const smooth = (u: number) => u * u * (3 - 2 * u);

export class Motion {
  private keys: readonly SpeedKey[];
  /** Speed before each key's ramp, and the distance covered by its time. */
  private from: number[] = [];
  private at: number[] = [];

  constructor(keys: readonly SpeedKey[]) {
    if (!keys.length) throw new Error('Motion: no speed keys');
    for (let k = 1; k < keys.length; k++) {
      const p = keys[k - 1]!, c = keys[k]!;
      if (!(c.t > p.t)) throw new Error(`Motion: key ${k} at ${c.t} is not after key ${k - 1} at ${p.t}`);
      if (c.t < p.t + p.ramp - 1e-9) throw new Error(`Motion: key ${k - 1}'s ramp (${p.t} + ${p.ramp}) runs past key ${k} at ${c.t}`);
    }
    this.keys = keys;
    let v = 0, d = 0;
    for (let k = 0; k < keys.length; k++) {
      const key = keys[k]!;
      if (k > 0) d += this.covered(k - 1, key.t - keys[k - 1]!.t);
      this.from.push(k === 0 ? (key.ramp > 0 ? 0 : key.v) : v);
      this.at.push(k === 0 ? 0 : d);
      v = key.v;
    }
  }

  /** The key in force at t (the first one before it starts). */
  private keyAt(t: number) {
    let k = 0;
    while (k + 1 < this.keys.length && t >= this.keys[k + 1]!.t) k++;
    return k;
  }

  /** Distance key k covers in the τ seconds after it starts. */
  private covered(k: number, tau: number) {
    const { v, ramp } = this.keys[k]!, v0 = this.from[k]!;
    if (tau <= 0) return 0;
    if (ramp <= 0) return v * tau;
    if (tau <= ramp) return v0 * tau + (v - v0) * ramp * S(tau / ramp);
    return v0 * ramp + ((v - v0) * ramp) / 2 + v * (tau - ramp);
  }

  speedAt(t: number): number {
    const k = this.keyAt(t), { t: t0, v, ramp } = this.keys[k]!, v0 = this.from[k]!;
    if (t < t0) return v0;
    const u = ramp > 0 ? Math.min(1, (t - t0) / ramp) : 1;
    return v0 + (v - v0) * smooth(u);
  }

  /** Metres along the route at song time t (0 before the first key). */
  distanceAt(t: number): number {
    const k = this.keyAt(t);
    return this.at[k]! + this.covered(k, t - this.keys[k]!.t);
  }
}
