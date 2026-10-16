// The city below the overlook (the finale): the plain ahead of where the car parks, lit the way LA is from Mulholland
// at night — not one even grid (the user, 2026-10-13: "a purple matrix of uniform lights ... there is nothing"):
//   - a downtown: a cluster of dark towers with lit window columns and red beacons, under a dome of light;
//   - boulevards: long straight rows of bright sodium lights running out across the plain;
//   - the street grid between them, denser toward downtown, broken by dark blocks (parks, yards, hills);
//   - freeways: ribbons of headlights coming and tail lights going, two lanes each way;
//   - planes blinking across the sky, one low on its approach, its landing lights on;
//   - searchlights from two lots in the city sweeping the sky (a premiere somewhere);
//   - a mist lying in the canyon and over the plain, lit warm from under by the city (the user, 2026-10-15: "make it
//     look just like really nice at the end").
//   - between the streets, the houses: dim porch and window lights scattered through every lit block (the user,
//     2026-10-16: "its fidelity improved just a little bit"), and a smaller cluster of mid-rise towers off downtown;
//   - a soft haze over the brightest parts: warm glows lying over downtown, midtown and the busiest blocks.
// Downtown's tallest towers wear lit crowns and setbacks; every tall one a blinking red beacon; their windows lit warm,
// white or cool, a floor lit right across here and there.
// HDR points, so the city glitters in the bloom; the towers toon-dark silhouettes against the glow. The lights switch
// on in a wave as the car parks, rolling out from the overlook to the horizon, and twinkle. On the outro's "we might
// crash" (sung after the song has faded out of hearing: the end is the scene's own) they go out block by block, the
// freeways last. Deterministic (hashed). Browser only (points shader).
import * as THREE from 'three';
import { hash } from '../engine/util';
import { NIGHT, glowMaterial, lampMaterial } from './night';
import { toon } from './toon';

/** Where the city spreads (m ahead of the parked car, and either side), its streets' spacing, the wave (when it
 *  starts, how fast it rolls out), how bright its lights shine (HDR), and the blackout (each block's lights die within
 *  `spread` s of the crash, over `die` s; the freeways this much later); its dark plain from this far out. */
export const CITY = { plain: 196, near: 300, far: 5200, half: 3800, street: 85, step: 14, waveAt: 165.6, wave: 1800, glow: 3.6, freeways: 7, spread: 1.5, die: 0.3, freewayLag: 1.5 };
/** Downtown: how far ahead and to the right (m), its towers (how many, within this radius, their heights) and the glow
 *  over it; the boulevards (how many each way). */
export const DOWNTOWN = { ahead: 1700, right: 520, towers: 30, radius: 320, h: [55, 190] as [number, number], glow: 0.4, boulevards: [11, 7] as [number, number],
  /** its few tallest, landmarks near its middle (how many, their heights) */
  landmarks: 3, tall: [195, 235] as [number, number] };
/** Midtown: a smaller cluster of mid-rise towers out on the plain between the hill and downtown (m ahead, right; how
 *  many, within this radius, their heights). */
export const MIDTOWN = { ahead: 2800, right: -60, towers: 12, radius: 230, h: [35, 95] as [number, number] };
/** The houses between the streets: lights a block (fewest far out, most round downtown), how bright (a share of a
 *  street light's: a texture between the streets rather than more glitter). */
export const HOMES = { least: 3, most: 9, dim: 0.55 };
/** The haze lying over the brightest parts: how many glows besides downtown's and midtown's, how big (m), how bright. */
export const HAZE = { n: 90, size: [160, 420] as [number, number], glow: 0.07 };
/** Each freeway's cars (two lanes each way), and its lamps down both sides this far apart (m). */
export const FREEWAY = { cars: 1800, lamps: 45 };
/** The searchlights: where they stand (m ahead of the parked car, right of it), how long their beams reach, how wide
 *  they open, how bright; their sweep (radians off the vertical, how far either way, how fast). */
export const SEARCH = { at: [[1350, 320], [1950, -380]] as [number, number][], len: 1600, r: 26, glow: 0.3, tilt: 0.42, sweep: 0.55, rate: 0.33 };
/** The mist: bands of glow standing over the canyon and the plain (m ahead, how tall), how bright. */
export const MIST = { at: [[235, 16], [420, 40], [900, 60], [1700, 80]] as [number, number][], glow: 0.12 };
/** When the plane on its approach comes into the end's frame (s). */
const APPROACH_AT = 168;

/** The least a light is drawn (px across). */
const LEAST = 2.6;

const VERT = /* glsl */ `
#define LEAST ${LEAST.toFixed(1)}
attribute vec3 color; attribute float size; attribute float wake; attribute float sleep; attribute float blink;
uniform float t, scale, on, offAt, die; uniform vec3 eye;
varying vec3 vColor; varying float vA;
// moving lights: start, direction, run length, speed packed in 'move' (x: phase, y: speed, z: length), 'dir'
attribute vec3 dir; attribute vec3 move;
void main() {
  vec3 p = position;
  if (move.z > 0.0) p += dir * mod(move.x + t * move.y, move.z);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float dist = length(mv.xyz);
  // (a touch nearer the eye along its own ray, so it stays where it is on screen: 2 km off, the depth buffer can't tell
  // a window 0.5 m proud of its tower from the tower, and downtown's windows flickered on and off as the camera moved)
  mv.xyz *= 0.996;
  // (no dot smaller than LEAST px: smaller, one covers one pixel or four as it drifts across them, and the far lights
  // shimmered; a dot drawn bigger than it is shines that much fainter, the same light in all)
  float px = size * 1400.0 / dist, drawn = clamp(px, LEAST, 7.0);
  gl_PointSize = drawn * scale;
  gl_Position = projectionMatrix * mv;
  float tw = 0.75 + 0.25 * sin(t * (1.5 + fract(position.x * 0.013) * 3.0) + position.z);
  // (a beacon blinks: on a third of its second)
  if (blink > 0.0) tw = step(0.66, fract(t * 0.8 + blink));
  vA = smoothstep(wake, wake + 0.5, on) * tw * (1.0 - smoothstep(4800.0, 6800.0, dist));
  vA *= pow(max(px, 1.8) / drawn, 2.0); // (as bright in all as at the 1.8 px it was drawn at least)
  // the blackout: this light's block goes dark 'sleep' s after the crash
  vA *= 1.0 - smoothstep(offAt + sleep, offAt + sleep + die, t);
  vColor = color;
}`;

const FRAG = /* glsl */ `
uniform float glow, night;
varying vec3 vColor; varying float vA;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float a = smoothstep(0.5, 0.15, length(d)) * vA * night;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vColor * glow, a);
}`;

/** The haze's glows: big soft discs, sized in metres (no least size: they're never small), coming up with the wave
 *  and going with their part of the city in the blackout. */
const HAZE_VERT = /* glsl */ `
attribute float size; attribute float wake; attribute float sleep;
uniform float t, scale, offAt, die;
varying float vA;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = clamp(size * 1400.0 / length(mv.xyz), 2.0, 900.0) * scale;
  gl_Position = projectionMatrix * mv;
  vA = smoothstep(wake, wake + 2.0, t) * (1.0 - smoothstep(offAt + sleep, offAt + sleep + die, t));
}`;
const HAZE_FRAG = /* glsl */ `
uniform float glow, night;
varying float vA;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float a = exp(-dot(d, d) * 14.0) - exp(-3.5);
  if (a <= 0.0) discard;
  gl_FragColor = vec4(vec3(1.0, 0.56, 0.3) * glow * a * vA * night, 1.0);
}`;

export function buildCity(at: THREE.Vector3, fwd: THREE.Vector3, right: THREE.Vector3, ground: number, offAt = 1e7, plainFrom = 0): { group: THREE.Group; update(t: number, eye: THREE.Vector3, scale: number): void } {
  const pos: number[] = [], col: number[] = [], size: number[] = [], wake: number[] = [], dir: number[] = [], move: number[] = [], sleep: number[] = [], blink: number[] = [];
  const F = fwd.clone().setY(0).normalize(), R = right.clone().setY(0).normalize();
  const grid = 0.21; // the street grid's slant to the view (radians)
  const gF = F.clone().multiplyScalar(Math.cos(grid)).addScaledVector(R, Math.sin(grid)), gR = R.clone().multiplyScalar(Math.cos(grid)).addScaledVector(F, -Math.sin(grid));
  const sodium: [number, number, number] = [1, 0.6, 0.25], amber: [number, number, number] = [1, 0.72, 0.38], white: [number, number, number] = [1, 0.95, 0.85], cool: [number, number, number] = [0.6, 0.8, 1];
  const accents: [number, number, number][] = [[1, 0.35, 0.5], [0.5, 1, 0.75], [0.55, 0.65, 1]];
  const D = at.clone().addScaledVector(F, DOWNTOWN.ahead).addScaledVector(R, DOWNTOWN.right);
  const put = (p: THREE.Vector3, c: [number, number, number], s: number, d: THREE.Vector3 = new THREE.Vector3(), m: [number, number, number] = [0, 0, 0], sl = 0, bl = 0, y = ground + 0.6) => {
    const ahead = p.clone().sub(at).dot(F);
    pos.push(p.x, y, p.z); col.push(...c); size.push(s);
    wake.push(CITY.waveAt + Math.max(0, ahead) / CITY.wave + 0.15 * hash(p.x, p.z, 5));
    dir.push(d.x, d.y, d.z); move.push(...m); sleep.push(sl); blink.push(bl);
  };
  const inside = (p: THREE.Vector3) => { const v = p.clone().sub(at), a = v.dot(F), x = v.dot(R); return a > CITY.near && a < CITY.far && Math.abs(x) < CITY.half * (0.4 + a / CITY.far); };
  // how built-up a spot is: densest round downtown, thinning to the edges; and whether its block is dark (a park, a
  // yard, a hill)
  const density = (p: THREE.Vector3) => { const dd = p.distanceTo(D); return 0.8 + 0.2 * Math.exp(-dd / 1600); };
  const dark = (bk: number, bj: number) => { const h = hash(bk, bj, 21); return h < 0.11 || (h > 0.5 && h < 0.53); };
  // the street grid: lights along every street both ways, thinner far out, whole blocks dark here and there
  for (const [along, across] of [[gF, gR], [gR, gF]] as const) {
    for (let k = -80; k <= 80; k++) {
      for (let j = -380; j <= 380; j++) {
        const p = at.clone().addScaledVector(across, k * CITY.street).addScaledVector(along, j * CITY.step + 4 * (hash(k, j, 1) - 0.5));
        if (!inside(p)) continue;
        const bj = Math.floor((j * CITY.step) / CITY.street);
        if (dark(k, bj) || hash(k, j, 2) > density(p)) continue;
        const r = hash(k, j, 3), c = r < 0.6 ? sodium : r < 0.8 ? amber : r < 0.93 ? white : r < 0.97 ? cool : accents[Math.floor(hash(k, j, 4) * 3)]!;
        // (the blackout takes whole blocks at once: the delay is the block's, not the light's)
        put(p, c, 0.9 + 1.4 * hash(k, j, 6), undefined, undefined, CITY.spread * hash(k, bj, 7));
      }
    }
  }
  // the houses: dim lights scattered through each lit block between its streets (porches, windows, a TV's blue)
  const homeC: [number, number, number][] = [[1, 0.78, 0.5], [1, 0.86, 0.66], [1, 0.66, 0.36], [0.62, 0.74, 1]];
  for (let k = -80; k <= 80; k++) {
    for (let bj = -64; bj <= 64; bj++) {
      const mid = at.clone().addScaledVector(gR, (k + 0.5) * CITY.street).addScaledVector(gF, (bj + 0.5) * CITY.street);
      if (!inside(mid) || dark(k, bj)) continue;
      const n = Math.round(HOMES.least + (HOMES.most - HOMES.least) * Math.exp(-mid.distanceTo(D) / 1400) * (0.6 + 0.8 * hash(k, bj, 81)));
      for (let i = 0; i < n; i++) {
        const p = mid.clone().addScaledVector(gR, (hash(k, bj, i, 82) - 0.5) * CITY.street * 0.78).addScaledVector(gF, (hash(k, bj, i, 83) - 0.5) * CITY.street * 0.78);
        const r = hash(k, bj, i, 84), c = homeC[r < 0.4 ? 0 : r < 0.7 ? 1 : r < 0.93 ? 2 : 3]!;
        put(p, [c[0] * HOMES.dim, c[1] * HOMES.dim, c[2] * HOMES.dim], 0.5 + 0.6 * hash(k, bj, i, 85), undefined, undefined, CITY.spread * hash(k, bj, 7), 0, ground + 0.4);
      }
    }
  }
  // the boulevards: long bright rows of sodium, close-set, running right out to the edge
  for (const [n, along, across] of [[DOWNTOWN.boulevards[0], gF, gR], [DOWNTOWN.boulevards[1], gR, gF]] as const) {
    for (let b = 0; b < n; b++) {
      const off = (hash(b, along === gF ? 31 : 32) - 0.5) * 2 * CITY.half * 0.8;
      for (let j = -540; j <= 540; j++) {
        const p = at.clone().addScaledVector(across, off).addScaledVector(along, j * 10);
        if (!inside(p)) continue;
        put(p, j % 2 ? sodium : amber, 2 + 0.5 * hash(b, j, 33), undefined, undefined, CITY.spread * hash(b, Math.floor(j / 8), 34));
      }
    }
  }
  // downtown: the towers (dark silhouettes), their windows lit in columns, beacons on the tall ones
  const group = new THREE.Group();
  // (clear of the haze from the cut to the last line: black against the glow, lit or dark; before it, in the haze like
  // everything else — unhazed, they hung as black blocks in the coast's sky at 106 s, 2026-10-15)
  const towerMat = toon({ color: '#0e0b16', fog: false }), hazedMat = toon({ color: '#0e0b16' }), crowns: THREE.Mesh[] = [], blocks: THREE.Mesh[] = [];
  const warm: [number, number, number] = [1, 0.8, 0.55];
  // (a cluster's towers round its middle `M`; `seed` keeps the clusters' hashes apart — downtown's are as they were)
  const towers = (M: THREE.Vector3, count: number, radius: number, hs: [number, number], seed: number, tallest: [number, number] = hs, landmarks = 0) => {
    for (let i = 0; i < count + landmarks; i++) {
      const lm = i >= count, a = hash(i, 41 + seed) * Math.PI * 2, r = (lm ? 0.4 : 1) * radius * Math.sqrt(hash(i, 42 + seed));
      const c = M.clone().addScaledVector(F, r * Math.cos(a)).addScaledVector(R, r * Math.sin(a));
      const h = lm ? tallest[0] + (tallest[1] - tallest[0]) * hash(i, 50 + seed) : hs[0] + (hs[1] - hs[0]) * hash(i, 43 + seed) ** 1.6 * (1 - r / radius * 0.5);
      const w = lm ? 17 + 9 * hash(i, 44 + seed) : 22 + 24 * hash(i, 44 + seed), d = lm ? 17 + 9 * hash(i, 45 + seed) : 22 + 24 * hash(i, 45 + seed); // (the landmarks slim)
      const tower = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), towerMat); blocks.push(tower);
      tower.position.set(c.x, ground + h / 2, c.z); tower.rotation.y = grid; group.add(tower);
      // windows: columns up each face, some floors dark, a floor here and there lit right across; each tower's light
      // its own (warm, white or cool), a window off it here and there
      const tint = hash(i, 51 + seed), own = tint < 0.35 ? warm : tint < 0.8 ? white : cool;
      const faces: [THREE.Vector3, number][] = [[gF, d / 2], [gF.clone().negate(), d / 2], [gR, w / 2], [gR.clone().negate(), w / 2]];
      for (const [nrm, half] of faces) {
        const along = nrm.clone().cross(new THREE.Vector3(0, 1, 0)), span = nrm === gF || nrm.equals(gF.clone().negate()) ? w : d;
        for (let y = 6; y < h - 4; y += 4.2) {
          const full = hash(i, y, 52 + seed) < 0.06;
          for (let x = -span / 2 + 3; x < span / 2 - 2; x += 5.5) {
            if (!full && hash(i, x, y) > 0.55) continue;
            const p = c.clone().addScaledVector(nrm, half + 0.5).addScaledVector(along, x), odd = hash(i, x, y, 53 + seed);
            put(p, odd < 0.12 ? (own === warm ? white : warm) : own, 1.9, undefined, undefined, CITY.spread * hash(i, Math.floor(y / 12), 47), 0, ground + y);
          }
        }
      }
      if (h > 80) put(c, [1, 0.12, 0.08], 2.2, undefined, undefined, CITY.spread, 0.2 + 0.6 * hash(i, 48 + seed), ground + h + 2);
      // the tallest: a setback on top and a lit crown round it (a band of light, white or teal)
      if (h > 130) {
        const top = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 14, d * 0.7), towerMat); blocks.push(top); top.position.set(c.x, ground + h + 7, c.z); top.rotation.y = grid; group.add(top);
        const crown = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7 + 0.6, 2.2, d * 0.7 + 0.6), lampMaterial(hash(i, 49 + seed) < 0.5 ? '#bff4ff' : '#fff1d8', 2.4, 0.2));
        crown.position.set(c.x, ground + h + 11.5, c.z); crown.rotation.y = grid; group.add(crown); crowns.push(crown);
      }
    }
  };
  towers(D, DOWNTOWN.towers, DOWNTOWN.radius, DOWNTOWN.h, 0, DOWNTOWN.tall, DOWNTOWN.landmarks);
  const Mt = at.clone().addScaledVector(F, MIDTOWN.ahead).addScaledVector(R, MIDTOWN.right);
  towers(Mt, MIDTOWN.towers, MIDTOWN.radius, MIDTOWN.h, 100);
  // the plain the city stands on, dark between its lights (moonlit, it read pale through them, and with the lights out
  // as a flat lavender sea: the haze is the mist's); from the foot of the lookout's slope out. Laid from `plainFrom`
  // (the cut to the last line): earlier, other sections look out over this ground
  const plain = (() => {
    const L = 12000, plain = new THREE.Mesh(new THREE.PlaneGeometry(9000, L).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#120e18', fog: false }));
    plain.rotation.y = Math.atan2(F.x, F.z); plain.position.copy(at).addScaledVector(F, CITY.plain + L / 2).setY(ground + 0.06); plain.name = 'plain';
    group.add(plain);
    return plain;
  })();
  // the dome of light over downtown: a warm glow standing behind it, facing the lookout
  const dome = new THREE.Mesh(new THREE.PlaneGeometry(3000, 760), glowMaterial('#ff9a4c', DOWNTOWN.glow, true));
  dome.position.copy(D).addScaledVector(F, 500).setY(ground + 70);
  dome.lookAt(at.x, ground + 120, at.z);
  group.add(dome);
  // freeways: long runs across the plain, white coming, red going
  for (let f = 0; f < CITY.freeways; f++) {
    const a = 0.5 + 1.1 * hash(f, 9), cross = gR.clone().multiplyScalar(Math.cos(a)).addScaledVector(gF, Math.sin(a)).normalize();
    const mid = at.clone().addScaledVector(F, CITY.near + 300 + 2600 * hash(f, 10)).addScaledVector(R, (hash(f, 11) - 0.5) * 2200);
    const len = 5600, start = mid.clone().addScaledVector(cross, -len / 2), side = cross.clone().cross(new THREE.Vector3(0, 1, 0));
    for (let i = 0; i < FREEWAY.cars; i++) {
      // (two lanes each way: white coming, red going, the outer lane a little slower)
      const lane = i % 2, outer = Math.floor(i / 2) % 2;
      const p0 = start.clone().addScaledVector(side, (lane ? 1 : -1) * (5 + 4 * outer));
      const d = lane ? cross : cross.clone().negate(), s0 = lane ? p0 : p0.clone().addScaledVector(cross, len);
      put(s0, lane ? white : [1, 0.15, 0.1], lane ? 1.9 : 1.6, d, [hash(f, i, 12) * len, 24 + 8 * hash(f, i, 13) - 5 * outer, len], CITY.freewayLag + CITY.spread * hash(f, i, 14));
    }
    // its lamps down both sides: an amber ribbon either side of the traffic
    for (let x = 0; x < len; x += FREEWAY.lamps) for (const sd of [-1, 1]) {
      const p = start.clone().addScaledVector(cross, x + 6 * hash(f, x, 15)).addScaledVector(side, sd * 15);
      if (inside(p)) put(p, amber, 1.1, undefined, undefined, CITY.freewayLag + CITY.spread * hash(f, Math.floor(x / 300), 16), 0, ground + 1.5);
    }
  }
  // a plane or two, blinking, crossing the sky slowly
  for (let i = 0; i < 2; i++) {
    const d = R.clone().multiplyScalar(i ? -1 : 1).addScaledVector(F, 0.3).normalize(), len = 6000;
    const p = at.clone().addScaledVector(F, 1200 + 1500 * i).addScaledVector(d, -len / 2);
    put(p, [1, 0.3, 0.25], 1.8, d, [hash(i, 51) * len, 45, len], 1e6, 0.3 + 0.5 * i, ground + 520 + 180 * i);
    put(p, white, 1.4, d, [hash(i, 51) * len, 45, len], 1e6, 0, ground + 520 + 180 * i);
  }
  // and one low on its approach, right to left across the city's side of the view as they park: its landing lights
  // ahead of it, its beacon blinking (in the end's frame from APPROACH_AT)
  {
    const d = R.clone().negate().addScaledVector(F, -0.12).normalize(), len = 9000, speed = 95, y = ground + 230;
    const at0 = at.clone().addScaledVector(F, 2100).addScaledVector(R, 1500).addScaledVector(d, -len / 2), on = (u: number) => at0.clone().addScaledVector(d, u);
    const phase = len / 2 - speed * APPROACH_AT;
    put(on(0), [1, 1, 0.95], 11, d, [phase, speed, len], 1e6, 0, y); // its landing lights
    put(on(-24), [1, 0.2, 0.15], 6, d, [phase, speed, len], 1e6, 0.1, y + 4);
    put(on(-16), [0.3, 1, 0.4], 4.5, d, [phase, speed, len], 1e6, 0, y);
  }
  // the haze: soft warm glows lying over downtown, midtown and here and there over the busiest blocks (lifted most of
  // their own size off the plain, so the plain doesn't cut them)
  const hz: number[] = [], hzSize: number[] = [], hzWake: number[] = [], hzSleep: number[] = [];
  const glowAt = (p: THREE.Vector3, sz: number, k: number) => { const a = p.clone().sub(at).dot(F); hz.push(p.x, ground + sz * 0.42, p.z); hzSize.push(sz); hzWake.push(CITY.waveAt + Math.max(0, a) / CITY.wave + 0.3); hzSleep.push(CITY.spread * hash(k, 91)); };
  for (let k = 0; k < 7; k++) glowAt(D.clone().addScaledVector(F, (hash(k, 92) - 0.5) * 500).addScaledVector(R, (hash(k, 93) - 0.5) * 700), 420 + 200 * hash(k, 94), k);
  for (let k = 0; k < 3; k++) glowAt(Mt.clone().addScaledVector(R, (k - 1) * 220), 320, 10 + k);
  for (let k = 0; k < HAZE.n; k++) {
    const p = at.clone().addScaledVector(F, CITY.near + 300 + (CITY.far - CITY.near - 300) * hash(k, 95) ** 0.8).addScaledVector(R, (hash(k, 96) - 0.5) * 2 * CITY.half * 0.7);
    if (!inside(p) || hash(k, 97) > 0.4 + 0.6 * Math.exp(-p.distanceTo(D) / 1500)) continue;
    glowAt(p, HAZE.size[0] + (HAZE.size[1] - HAZE.size[0]) * hash(k, 98), 20 + k);
  }
  const hg = new THREE.BufferGeometry();
  hg.setAttribute('position', new THREE.Float32BufferAttribute(hz, 3));
  hg.setAttribute('size', new THREE.Float32BufferAttribute(hzSize, 1));
  hg.setAttribute('wake', new THREE.Float32BufferAttribute(hzWake, 1));
  hg.setAttribute('sleep', new THREE.Float32BufferAttribute(hzSleep, 1));
  const hu = { t: { value: 0 }, scale: { value: 1 }, night: NIGHT, glow: { value: HAZE.glow }, offAt: { value: offAt }, die: { value: 1.2 } };
  const haze = new THREE.Points(hg, new THREE.ShaderMaterial({ vertexShader: HAZE_VERT, fragmentShader: HAZE_FRAG, uniforms: hu, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false }));
  haze.frustumCulled = false; group.add(haze);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('size', new THREE.Float32BufferAttribute(size, 1));
  g.setAttribute('wake', new THREE.Float32BufferAttribute(wake, 1));
  g.setAttribute('dir', new THREE.Float32BufferAttribute(dir, 3));
  g.setAttribute('move', new THREE.Float32BufferAttribute(move, 3));
  g.setAttribute('sleep', new THREE.Float32BufferAttribute(sleep, 1));
  g.setAttribute('blink', new THREE.Float32BufferAttribute(blink, 1));
  const u = { t: { value: 0 }, scale: { value: 1 }, on: { value: 0 }, eye: { value: new THREE.Vector3() }, night: NIGHT, glow: { value: CITY.glow }, offAt: { value: offAt }, die: { value: CITY.die } };
  const m = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: u, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false });
  const points = new THREE.Points(g, m);
  points.frustumCulled = false;
  group.add(points);
  // the searchlights: open cones from their lots up into the sky, swept to and fro
  const beams = SEARCH.at.map(([a, r], k) => {
    const mat = glowMaterial('#d8e6ff', SEARCH.glow), beam = new THREE.Mesh(new THREE.CylinderGeometry(SEARCH.r, 1.5, SEARCH.len, 24, 1, true), mat);
    beam.frustumCulled = false; group.add(beam);
    return { beam, mat, base: at.clone().addScaledVector(F, a).addScaledVector(R, r).setY(ground + 2), phase: 1.7 * k + 0.4 };
  });
  // the mist: tall bands of soft glow standing across the view, lit from under
  const mists = MIST.at.map(([a, h], k) => {
    const mat = glowMaterial(k < 1 ? '#ff9c86' : '#ffb07a', MIST.glow), band = new THREE.Mesh(new THREE.PlaneGeometry(9000, h * 2), mat);
    band.position.copy(at).addScaledVector(F, a).setY(ground + h * 0.6 - 4); band.lookAt(at.x, band.position.y, at.z);
    band.frustumCulled = false; group.add(band);
    return mat;
  });
  const up = new THREE.Vector3(0, 1, 0), aim = new THREE.Vector3();
  return {
    group,
    update(t, eye, scale) {
      u.t.value = t; u.on.value = t; u.eye.value.copy(eye); u.scale.value = scale; hu.t.value = t; hu.scale.value = scale;
      // (the city's own light: it comes up with the wave and goes with the blackout — the searchlights, the crowns and
      // the mist it lights with it)
      const lit = Math.min(1, Math.max(0, (t - CITY.waveAt) / 2)) * (1 - Math.min(1, Math.max(0, (t - offAt - CITY.spread) / 1.2)));
      for (const b of beams) {
        const az = b.phase + SEARCH.sweep * Math.sin(t * SEARCH.rate + b.phase * 2), tilt = SEARCH.tilt + 0.12 * Math.sin(t * SEARCH.rate * 0.7 + b.phase);
        aim.copy(F).multiplyScalar(Math.sin(tilt) * Math.cos(az)).addScaledVector(R, Math.sin(tilt) * Math.sin(az)).setY(Math.cos(tilt)).normalize();
        b.beam.quaternion.setFromUnitVectors(up, aim); b.beam.position.copy(b.base).addScaledVector(aim, SEARCH.len / 2);
        b.mat.uniforms.strength!.value = SEARCH.glow * lit;
        b.beam.visible = lit > 0;
      }
      for (const mt of mists) mt.uniforms.strength!.value = MIST.glow * (0.15 + 0.85 * lit);
      for (const c of crowns) c.visible = lit > 0.05;
      plain.visible = t >= plainFrom;
      for (const b of blocks) b.material = t >= plainFrom ? towerMat : hazedMat;
    },
  };
}
