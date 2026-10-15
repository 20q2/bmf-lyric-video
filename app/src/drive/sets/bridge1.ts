// The bridge, the tunnel through the headland (flow plan §6; reworked 2026-10-13: fifteen seconds of one tiled wall;
// its camera rewritten 2026-10-14 — the user: "the scene is solid, but ... I'm not feeling the camera work here").
// The "Blowin' money fast" lines are graffiti sprayed on the left wall's tiles (kind 'tunnel': lit by the lamps like
// the tiles round them, carrierart.ts); the two "Tryna make it last" lines are lit overhead signs hung in the bore. On
// "we might crash" the lane-control signals over the bore flip from green arrows to red X (scenes/sets/bridge1.ts)
// and the car fishtails (hydraulics.ts) — green and steady again as "tryna make it last" answers.
//
// The set places every line, so it can write the camera: three takes, each its own angle, joined by eased moves
// inside a take and cut only between them (no whips: the eye's road position and aim are smooth curves through
// keyframes, interpolated in the road's own frame so they stay inside the bore round its bend).
//   1 "Blowin' money fast, it won't last": low on the right, looking back up the bore at the mural and the dusk in
//     the mouth beyond; the car comes in out of the light and rushes the lens as the camera backs away.
//   2 "Tryna make it last", "Blowin' money fast, we might crash": high over the oncoming lane, the sign ahead, the two
//     of them sliding in under the lens on "last"; the eye drops in low behind them as they pull away past the next
//     piece, then lifts and pushes on down the bore — the signals turning red ahead, the car's tail lights far down it.
//   3 "Tryna make it last": low on the right walkway, the car passing the lens and on under the sign; then the eye
//     rises and follows them out toward the night in the mouth.
// Pure.
import * as THREE from 'three';
import { type Carrier, layout } from '../carriers';
import { poseFrom } from '../camera';
import { type Phrase, phrasesOf } from '../phrases';
import type { Target } from '../shots';
import { TILE_REPEAT, TUNNEL } from '../tunnel';
import type { Placed, SetContext, SetFrame, SetPiece } from './index';

const UP = new THREE.Vector3(0, 1, 0);
const flat = (v: THREE.Vector3) => new THREE.Vector3(v.x, 0, v.z).normalize();
const LAST = /tryna make it last/i, CRASH = /^crash/i;

/** The overhead signs: the car passes under this far past its line's end (m); the lettering's centre height; their
 *  size over the layout's (bolder than a plain lane sign: read from the camera's distance in the bore). */
export const PANEL = { ahead: 6, y: 4.6, scale: 1.3 };
/** The graffiti on the left wall: its centre this high for a face of one row and of two (m: two rows end under the
 *  strip lights at the haunch). */
const PAINT = { y1: 3.9, y2: 3.6 };
/** The lane-control signals down the bore: hung this high, one every `step` m, none within `clear` m of a mouth or an
 *  overhead sign; red from the word "crash" until `calm` s after it. */
export const SIGNALS = { y: 5.85, step: 46, clear: 16, calm: 1.5 };

/** Jet fans hung in pairs under the ceiling (the user, 2026-10-15: the bore a "real, built LA tunnel"): either side of
 *  the centre line this far, their axis this high (m), their drum's radius and length; a pair every `every` m or so,
 *  none in a shot's way (between the lens and a lyric) nor within `clear` m of the lens. */
export const FANS = { x: 2.9, y: TUNNEL.h - 0.8, r: 0.55, len: 3.6, every: 52, clear: 1.5 };
/** The oncoming traffic in the other lane (m off the centre line, m/s): a car about every `gap` s, its box (across,
 *  high, along; m) — none passing between the lens and a lyric while it's sung, nor within `over` m under the lens. */
export const ONCOMING = { lane: -1.9, v: 19, gap: 2.6, box: [2, 1.5, 4.8] as const, over: 4.5 };

interface Face { center: THREE.Vector3; normal: THREE.Vector3; up: THREE.Vector3; w: number; h: number }
export interface Bridge1Plan {
  /** The jet fans' pairs (m along the road). */
  fans: number[];
  /** The oncoming cars: when each enters the bore at its far mouth (s); then on at ONCOMING.v toward the near one. */
  oncoming: number[];
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

/** A point in the bore: m along the road, across it (+ right of the centre line), up from the road. */
type Bore = readonly [s: number, x: number, y: number];
/** A camera keyframe: at t the eye stands at `eye`, looking at `at`. */
interface Key { t: number; eye: Bore; at: Bore }

/** A monotone cubic through (ts, ys) (Fritsch–Carlson: no overshoot, so a held value holds and the eye never swings
 *  past a keyframe into a wall); held flat outside them. */
function monotone(ts: readonly number[], ys: readonly number[]): (t: number) => number {
  const n = ts.length, d = ts.slice(1).map((t, i) => (ys[i + 1]! - ys[i]!) / (t - ts[i]!));
  const m = ts.map((_, i) => (i === 0 || i === n - 1 ? 0 : d[i - 1]! * d[i]! <= 0 ? 0 : (2 * d[i - 1]! * d[i]!) / (d[i - 1]! + d[i]!)));
  return (t) => {
    if (t <= ts[0]!) return ys[0]!;
    if (t >= ts[n - 1]!) return ys[n - 1]!;
    let i = 0;
    while (t > ts[i + 1]!) i++;
    const h = ts[i + 1]! - ts[i]!, u = (t - ts[i]!) / h, u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * ys[i]! + (u3 - 2 * u2 + u) * h * m[i]! + (-2 * u3 + 3 * u2) * ys[i + 1]! + (u3 - u2) * h * m[i + 1]!;
  };
}

export const BRIDGE1: SetPiece = {
  place(ctx: SetContext): Placed {
    const { st, route, motion } = ctx;
    const carS = (t: number) => motion.distanceAt(t);
    const at = ([s, x, y]: Bore) => { const f = route.frameAt(s); return f.pos.clone().addScaledVector(f.right, x).addScaledVector(UP, y); };
    const ground = (s: number) => route.frameAt(s).pos.y;
    const s0 = carS(st.start), s1 = carS(st.end);
    const carriers: Carrier[] = [], frames = new Map<string, SetFrame>();
    const lines = st.lines.map((line) => ({ line, phs: phrasesOf(line, ctx.nextStart(line.i), ctx.solo) }));
    const signLines = lines.filter((l) => LAST.test(l.line.text)), wallLines = lines.filter((l) => !LAST.test(l.line.text));
    const id = (ph: Phrase, k: number) => `L${ph.line}.${k}`;

    // graffiti on the left wall, centred near s: its left edge on a tile's (the wall's grid: its grout runs through
    // the paint where the tiles' does, carrierart.ts); returns its centre
    const paint = (ph: Phrase, k: number, s: number) => {
      const lay = layout('tunnel', ph.text, ph.solo), y = lay.rows.length > 1 ? PAINT.y2 : PAINT.y1;
      const tile = TILE_REPEAT / 4, left = s0 + Math.round((s - lay.w / 2 - s0) / tile) * tile, sc = left + lay.w / 2;
      const f = route.frameAt(sc), center = at([sc, -(TUNNEL.halfW - 0.05), y]);
      const top = y + lay.h / 2;
      carriers.push({ id: id(ph, k), phrase: ph, kind: 'tunnel', stretch: st.id, reveal: ph.start, s: sc, center, normal: flat(f.right.clone()), up: UP.clone(), ...lay, foot: y, solid: null,
        tiles: { u: (((left - s0) % TILE_REPEAT) + TILE_REPEAT) % TILE_REPEAT, v: (((-top) % TILE_REPEAT) + TILE_REPEAT) % TILE_REPEAT } });
      return sc;
    };
    // a lit overhead sign over the road at s, the line's phrases stacked on it
    const panels: Bridge1Plan['panels'] = [];
    const sign = (phs: Phrase[], s: number) => {
      const lays = phs.map((ph) => layout('tunnelsign', ph.text, ph.solo, PANEL.scale)), H = lays.reduce((a, l) => a + l.h, 0);
      const W = Math.max(...lays.map((l) => l.w)), n = flat(route.frameAt(s).fwd).negate();
      let top = PANEL.y + H / 2;
      phs.forEach((ph, k) => {
        const L = lays[k]!, center = at([s, 0, top - L.h / 2]);
        top -= L.h;
        carriers.push({ id: id(ph, k), phrase: ph, kind: 'tunnelsign', stretch: st.id, reveal: ph.start, s, center, normal: n.clone(), up: UP.clone(), ...L, foot: center.y - ground(s),
          solid: k === 0 ? { at: new THREE.Vector3(0, L.h / 2 - H / 2, -0.14), size: new THREE.Vector3(W + 0.5, H + 0.45, 0.24) } : null });
      });
      panels.push({ s, face: { center: at([s, 0, PANEL.y]), normal: n.clone(), up: UP.clone(), w: W, h: H } });
    };
    // one take: every phrase in it framed by the same curve through its keyframes (a phrase's own shot within the take
    // moves nowhere: the take carries on); cut to at its first phrase
    const takes: { t0: number; phs: Phrase[]; eye: (t: number) => THREE.Vector3 }[] = [];
    const take = (phs: Phrase[], keys: Key[]) => {
      const ts = keys.map((k) => k.t), curve = (pick: (k: Key) => Bore) => [0, 1, 2].map((i) => monotone(ts, keys.map((k) => pick(k)[i]!)));
      const eye = curve((k) => k.eye), aim = curve((k) => k.at);
      const eyeAt = (t: number) => at([eye[0]!(t), eye[1]!(t), eye[2]!(t)]);
      const to: Target = (t) => poseFrom(eyeAt(t), at([aim[0]!(t), aim[1]!(t), aim[2]!(t)]));
      phs.forEach((ph, i) => frames.set(carriers.find((c) => c.phrase === ph)!.id, { to, move: i ? 'snap' : 'cut' }));
      takes.push({ t0: keys[0]!.t, phs, eye: eyeAt });
    };
    const W0 = -TUNNEL.halfW; // (aims on the left wall's face)

    // ---- take 1, "Blowin' money fast, it won't last": the eye low on the right, backing slowly away down the bore
    // while it looks back up it at the mural, the mouth's dusk beyond; the car comes in out of the light and rushes
    // the lens, its nose reaching it as the line ends. The two phrases one mural, read left to right as the aim pans.
    {
      const [A, B] = wallLines[0]!.phs as [Phrase, Phrase], T0 = A.start - 0.05, T1 = B.end;
      const eyeS = (t: number) => carS(T1) + 4.6 - 3 * (T1 - t), E = { x: 4.1, y: 2.3 }, aimY = 3.1;
      const sA = paint(A, 0, eyeS(A.end) - 18.5), sB = paint(B, 1, sA + 11);
      take([A, B], [
        { t: T0, eye: [eyeS(T0), E.x, E.y], at: [sA, W0, aimY] },
        { t: A.end, eye: [eyeS(A.end), E.x, E.y], at: [sA, W0, aimY] },
        { t: B.start + 0.25, eye: [eyeS(B.start + 0.25), E.x, E.y], at: [sB, W0, aimY] },
        { t: T1 + 0.5, eye: [eyeS(T1 + 0.5), E.x, E.y], at: [sB, W0, aimY] },
      ]);
    }

    // ---- take 2, the first sign and "Blowin' money fast, we might crash": high over the oncoming lane, the sign ahead
    // and the empty road under it, the two of them sliding in under the lens on "last" (seen from above) and on under
    // the sign; the eye drops in low behind them as they pull away past the next piece just beyond the sign, then
    // lifts and pushes on after them down the bore to the next — the signals turning red ahead on "crash", the car's
    // tail lights fishtailing far down it
    {
      const S = signLines[0]!, [C, D] = wallLines[1]!.phs as [Phrase, Phrase];
      const sS = carS(S.line.end) + PANEL.ahead;
      sign(S.phs, sS);
      const sC = paint(C, 0, sS + 11), sD = paint(D, 1, sC + 42);
      const hi = { x: -2.8, y: 5.1 }, lo = { x: 3.5, y: 1.1 }, mid = { x: 3, y: 2.6 };
      take([...S.phs, C, D], [
        { t: S.phs[0]!.start - 0.05, eye: [sS - 13.5, hi.x, hi.y], at: [sS, 0, 3] },
        { t: S.line.end, eye: [sS - 12.5, hi.x, hi.y], at: [sS, 0, 3] },
        { t: C.start + 0.25, eye: [sC - 16, lo.x, lo.y], at: [sC, W0, 3.3] },
        { t: C.end, eye: [sC - 8, lo.x, lo.y + 0.4], at: [sC, W0, 3.3] },
        { t: D.start + 0.2, eye: [sD - 14, mid.x, mid.y], at: [sD + 5, W0 + 2, 3] },
        { t: D.end + 0.6, eye: [sD - 12.5, mid.x, mid.y], at: [sD + 5, W0 + 2, 3] },
      ]);
    }

    // ---- take 3, the second sign: low on the right walkway short of it, the car passing the lens on its left and
    // driving on under the sign toward the exit's night; then the eye rises and follows them out
    {
      const S = signLines[1]!, sS = carS(S.line.end) + PANEL.ahead;
      sign(S.phs, sS);
      take(S.phs, [
        { t: S.phs[0]!.start - 0.05, eye: [sS - 15, 5.2, 1.5], at: [sS, -0.5, 3.4] },
        { t: S.line.end, eye: [sS - 14, 5.2, 1.5], at: [sS, -0.5, 3.4] },
        { t: S.line.end + 0.8, eye: [sS - 11, 4, 2.2], at: [sS + 14, 0.5, 2.6] },
        { t: st.end, eye: [sS + 4, 2.8, 2.6], at: [sS + 45, 0.5, 2] },
      ]);
    }

    // the signals down the bore, clear of the mouths and the signs; red on the word "crash"
    const crash = st.lines.flatMap((l) => l.words).find((w) => CRASH.test(w.w));
    const crashAt = crash?.start ?? st.end + 1;
    const signals: number[] = [];
    for (let s = s0 + 28; s < s1 - SIGNALS.clear; s += SIGNALS.step) {
      if (panels.some((p) => Math.abs(p.s - s) < SIGNALS.clear)) continue;
      signals.push(s);
    }
    // the props that move or hang in the bore's air (the fans, the oncoming cars) kept out of the shots: none between
    // the lens and any corner of a lyric while it's sung, nor where the lens passes (a box in the road's frame at s:
    // across, up, along from its centre)
    const boxAround = (s: number, x: number, y: number, half: THREE.Vector3) => {
      const f = route.frameAt(s), m = new THREE.Matrix4().makeBasis(flat(f.right.clone()), UP, flat(f.fwd.clone())).setPosition(at([s, x, y]));
      return { inv: m.invert(), box: new THREE.Box3(half.clone().negate(), half.clone()) };
    };
    const ray = new THREE.Ray(), hit = new THREE.Vector3();
    const views = takes.flatMap((tk) => tk.phs.map((ph) => {
      const c = carriers.find((k) => k.phrase === ph)!, a = c.up.clone().cross(c.normal).normalize();
      const pts = [[0, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]].map(([u, v]) => c.center.clone().addScaledVector(a, (u! * c.w) / 2).addScaledVector(c.up, (v! * c.h) / 2));
      return { from: ph.start, to: ph.end, eye: tk.eye, pts };
    }));
    const inShot = (b: { inv: THREE.Matrix4; box: THREE.Box3 }, t: number) => views.some((v) => {
      if (t < v.from || t > v.to) return false;
      const e = v.eye(t).applyMatrix4(b.inv);
      return v.pts.some((p) => {
        const q = p.clone().applyMatrix4(b.inv), d = q.clone().sub(e), len = d.length();
        ray.set(e, d.divideScalar(len));
        return !!ray.intersectBox(b.box, hit) && hit.distanceTo(e) < len;
      });
    });
    const lensAt = (t: number) => { const tk = takes.filter((k) => k.t0 <= t).pop(); return tk?.eye(t); };
    const tick = 1 / 30, frameTimes: number[] = [];
    for (let t = st.start; t < st.end; t += tick) frameTimes.push(t);
    // the fans: a pair every so often, clear of the signs, the signals and the mouths, never in a shot
    const fans: number[] = [];
    for (let s = s0 + 30; s < s1 - 25; s += FANS.every) {
      if (panels.some((p) => Math.abs(p.s - s) < 16) || signals.some((g) => Math.abs(g - s) < 9)) continue;
      const pair = [-1, 1].map((side) => boxAround(s, side * FANS.x, FANS.y, new THREE.Vector3(FANS.r + 0.2, FANS.r + 0.2, FANS.len / 2 + 0.3)));
      const near = pair.map((b) => ({ inv: b.inv, box: b.box.clone().expandByScalar(FANS.clear) }));
      if (frameTimes.some((t) => pair.some((b) => inShot(b, t)) || near.some((b) => { const e = lensAt(t); return !!e && b.box.containsPoint(e.applyMatrix4(b.inv)); }))) continue;
      fans.push(s);
    }
    // the oncoming cars: one about every `gap` s, each entering at the far mouth and on down the other lane; a car that
    // would cross a shot is held back a little
    const oncoming: number[] = [];
    const B = ONCOMING.box, half = new THREE.Vector3(B[0] / 2, B[1] / 2, B[2] / 2), sAt = (enter: number, t: number) => s1 + 3 - ONCOMING.v * (t - enter);
    for (let enter = st.start - (s1 - s0) / ONCOMING.v, k = 0; enter < st.end; k++) {
      let ok = false;
      for (let tries = 0; tries < 30 && !ok; tries++, enter += 0.1) {
        // (nor passing right under the lens: from over the other lane a roof filled the frame's foot)
        ok = !frameTimes.some((t) => {
          const s = sAt(enter, t);
          if (s < s0 - 4 || s > s1 + 4) return false;
          const b = boxAround(s, ONCOMING.lane, B[1] / 2, half), e = lensAt(t);
          return inShot(b, t) || (!!e && b.box.clone().expandByVector(new THREE.Vector3(0.3, ONCOMING.over, 0.5)).containsPoint(e.applyMatrix4(b.inv)));
        });
      }
      if (ok) oncoming.push(enter);
      enter += ONCOMING.gap * (0.6 + 0.8 * ((k * 0.618) % 1));
    }
    carriers.sort((a, b) => a.phrase.start - b.phrase.start);
    const plan: Bridge1Plan = { fans, oncoming, panels, signals, crashAt, calm: crashAt + SIGNALS.calm, s0, s1 };
    return { carriers, frames, clear: [], blocks: [], plan };
  },
};
