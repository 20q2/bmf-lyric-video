// The city below the overlook (the finale): the plain ahead of where the car parks, lit the way LA is from Mulholland
// at night — not one even grid (the user, 2026-10-13: "a purple matrix of uniform lights ... there is nothing"):
//   - a downtown: a cluster of dark towers with lit window columns and red beacons, under a dome of light;
//   - boulevards: long straight rows of bright sodium lights running out across the plain;
//   - the street grid between them, denser toward downtown, broken by dark blocks (parks, yards, hills);
//   - freeways: ribbons of headlights coming and tail lights going;
//   - a plane or two blinking across the sky.
// HDR points, so the city glitters in the bloom; the towers toon-dark silhouettes against the glow. The lights switch
// on in a wave as the car parks, rolling out from the overlook to the horizon, and twinkle. On the outro's "we might
// crash" (sung after the song has faded out of hearing: the end is the scene's own) they go out block by block, the
// freeways last. Deterministic (hashed). Browser only (points shader).
import * as THREE from 'three';
import { hash } from '../engine/util';
import { NIGHT, glowMaterial } from './night';
import { toon } from './toon';

/** Where the city spreads (m ahead of the parked car, and either side), its streets' spacing, the wave (when it
 *  starts, how fast it rolls out), how bright its lights shine (HDR), and the blackout (each block's lights die within
 *  `spread` s of the crash, over `die` s; the freeways this much later). */
export const CITY = { near: 320, far: 3800, half: 2800, street: 85, step: 16, waveAt: 165.6, wave: 1500, glow: 3.0, freeways: 5, spread: 1.5, die: 0.3, freewayLag: 1.5 };
/** Downtown: how far ahead and to the right (m), its towers (how many, within this radius, their heights) and the glow
 *  over it; the boulevards (how many each way). */
export const DOWNTOWN = { ahead: 1650, right: 420, towers: 16, radius: 260, h: [55, 170] as [number, number], glow: 0.34, boulevards: [7, 4] as [number, number] };

const VERT = /* glsl */ `
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
  gl_PointSize = clamp(size * 1150.0 / dist, 1.6, 6.0) * scale;
  gl_Position = projectionMatrix * mv;
  float tw = 0.75 + 0.25 * sin(t * (1.5 + fract(position.x * 0.013) * 3.0) + position.z);
  // (a beacon blinks: on a third of its second)
  if (blink > 0.0) tw = step(0.66, fract(t * 0.8 + blink));
  vA = smoothstep(wake, wake + 0.5, on) * tw * (1.0 - smoothstep(3400.0, 5000.0, dist));
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

export function buildCity(at: THREE.Vector3, fwd: THREE.Vector3, right: THREE.Vector3, ground: number, offAt = 1e7): { group: THREE.Group; update(t: number, eye: THREE.Vector3, scale: number): void } {
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
  const density = (p: THREE.Vector3) => { const dd = p.distanceTo(D); return 0.72 + 0.28 * Math.exp(-dd / 1400); };
  const dark = (bk: number, bj: number) => { const h = hash(bk, bj, 21); return h < 0.11 || (h > 0.5 && h < 0.53); };
  // the street grid: lights along every street both ways, thinner far out, whole blocks dark here and there
  for (const [along, across] of [[gF, gR], [gR, gF]] as const) {
    for (let k = -64; k <= 64; k++) {
      for (let j = -280; j <= 280; j++) {
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
  // the boulevards: long bright rows of sodium, close-set, running right out to the edge
  for (const [n, along, across] of [[DOWNTOWN.boulevards[0], gF, gR], [DOWNTOWN.boulevards[1], gR, gF]] as const) {
    for (let b = 0; b < n; b++) {
      const off = (hash(b, along === gF ? 31 : 32) - 0.5) * 2 * CITY.half * 0.8;
      for (let j = -400; j <= 400; j++) {
        const p = at.clone().addScaledVector(across, off).addScaledVector(along, j * 10);
        if (!inside(p)) continue;
        put(p, j % 2 ? sodium : amber, 2 + 0.5 * hash(b, j, 33), undefined, undefined, CITY.spread * hash(b, Math.floor(j / 8), 34));
      }
    }
  }
  // downtown: the towers (dark silhouettes), their windows lit in columns, beacons on the tall ones
  const group = new THREE.Group();
  const towerMat = toon({ color: '#0e0b16' });
  for (let i = 0; i < DOWNTOWN.towers; i++) {
    const a = hash(i, 41) * Math.PI * 2, r = DOWNTOWN.radius * Math.sqrt(hash(i, 42));
    const c = D.clone().addScaledVector(F, r * Math.cos(a)).addScaledVector(R, r * Math.sin(a));
    const h = DOWNTOWN.h[0] + (DOWNTOWN.h[1] - DOWNTOWN.h[0]) * hash(i, 43) ** 1.6 * (1 - r / DOWNTOWN.radius * 0.5), w = 22 + 24 * hash(i, 44), d = 22 + 24 * hash(i, 45);
    const tower = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), towerMat);
    tower.position.set(c.x, ground + h / 2, c.z); tower.rotation.y = grid; group.add(tower);
    // windows: columns up each face, some floors dark
    const faces: [THREE.Vector3, number][] = [[gF, d / 2], [gF.clone().negate(), d / 2], [gR, w / 2], [gR.clone().negate(), w / 2]];
    for (const [nrm, half] of faces) {
      const along = nrm.clone().cross(new THREE.Vector3(0, 1, 0)), span = nrm === gF || nrm.equals(gF.clone().negate()) ? w : d;
      for (let x = -span / 2 + 3; x < span / 2 - 2; x += 5.5) for (let y = 6; y < h - 4; y += 4.2) {
        if (hash(i, x, y) > 0.55) continue;
        const p = c.clone().addScaledVector(nrm, half + 0.5).addScaledVector(along, x);
        put(p, hash(i, y, 46) < 0.8 ? white : cool, 1.9, undefined, undefined, CITY.spread * hash(i, Math.floor(y / 12), 47), 0, ground + y);
      }
    }
    if (h > 110) put(c, [1, 0.12, 0.08], 2.2, undefined, undefined, CITY.spread, 0.2 + 0.6 * hash(i, 48), ground + h + 2);
  }
  // the dome of light over downtown: a warm glow standing behind it, facing the lookout
  const dome = new THREE.Mesh(new THREE.PlaneGeometry(2200, 620), glowMaterial('#ff9a4c', DOWNTOWN.glow, true));
  dome.position.copy(D).addScaledVector(F, 500).setY(ground + 60);
  dome.lookAt(at.x, ground + 120, at.z);
  group.add(dome);
  // freeways: long runs across the plain, white coming, red going
  for (let f = 0; f < CITY.freeways; f++) {
    const a = 0.5 + 1.1 * hash(f, 9), cross = gR.clone().multiplyScalar(Math.cos(a)).addScaledVector(gF, Math.sin(a)).normalize();
    const mid = at.clone().addScaledVector(F, CITY.near + 300 + 2600 * hash(f, 10)).addScaledVector(R, (hash(f, 11) - 0.5) * 2200);
    const len = 5600, start = mid.clone().addScaledVector(cross, -len / 2);
    for (let i = 0; i < 560; i++) {
      const lane = i % 2;
      const p0 = start.clone().addScaledVector(cross.clone().cross(new THREE.Vector3(0, 1, 0)), lane ? 6 : -6);
      const d = lane ? cross : cross.clone().negate(), s0 = lane ? p0 : p0.clone().addScaledVector(cross, len);
      put(s0, lane ? white : [1, 0.15, 0.1], 1.6, d, [hash(f, i, 12) * len, 22 + 8 * hash(f, i, 13), len], CITY.freewayLag + CITY.spread * hash(f, i, 14));
    }
  }
  // a plane or two, blinking, crossing the sky slowly
  for (let i = 0; i < 2; i++) {
    const d = R.clone().multiplyScalar(i ? -1 : 1).addScaledVector(F, 0.3).normalize(), len = 6000;
    const p = at.clone().addScaledVector(F, 1200 + 1500 * i).addScaledVector(d, -len / 2);
    put(p, [1, 0.3, 0.25], 1.8, d, [hash(i, 51) * len, 45, len], 1e6, 0.3 + 0.5 * i, ground + 520 + 180 * i);
    put(p, white, 1.4, d, [hash(i, 51) * len, 45, len], 1e6, 0, ground + 520 + 180 * i);
  }
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
  return {
    group,
    update(t, eye, scale) { u.t.value = t; u.on.value = t; u.eye.value.copy(eye); u.scale.value = scale; },
  };
}
