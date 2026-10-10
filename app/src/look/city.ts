// The city below the overlook (the finale): tens of thousands of lights spread over the plain ahead of where the car
// parks — street grids in sodium orange and white, a few coloured — and freeways of headlights and tail lights streaming
// across it. They switch on in a wave as the car parks, rolling out from the overlook to the horizon, and twinkle; HDR
// points, so the city glitters in the bloom. Deterministic (hashed). Browser only (points shader).
import * as THREE from 'three';
import { hash } from '../engine/util';
import { NIGHT } from './night';

/** Where the city spreads (m ahead of the parked car, and either side), its streets' spacing, the wave (when it starts,
 *  how fast it rolls out), and how bright its lights shine (HDR). */
export const CITY = { near: 320, far: 3600, half: 2600, street: 85, step: 16, waveAt: 165.6, wave: 1500, glow: 2.4, freeways: 4 };

const VERT = /* glsl */ `
attribute vec3 color; attribute float size; attribute float wake;
uniform float t, scale, on; uniform vec3 eye;
varying vec3 vColor; varying float vA;
// moving lights: start, direction, run length, speed packed in 'move' (x: phase, y: speed, z: length), 'dir'
attribute vec3 dir; attribute vec3 move;
void main() {
  vec3 p = position;
  if (move.z > 0.0) p += dir * mod(move.x + t * move.y, move.z);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float dist = length(mv.xyz);
  gl_PointSize = clamp(size * 900.0 / dist, 1.1, 5.0) * scale;
  gl_Position = projectionMatrix * mv;
  float tw = 0.75 + 0.25 * sin(t * (1.5 + fract(position.x * 0.013) * 3.0) + position.z);
  vA = smoothstep(wake, wake + 0.5, on) * tw * (1.0 - smoothstep(3200.0, 4600.0, dist));
  vColor = color;
}`;
const FRAG = /* glsl */ `
uniform float night, glow; varying vec3 vColor; varying float vA;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float a = smoothstep(1.0, 0.2, r);
  gl_FragColor = vec4(vColor * a * vA * night * glow, 1.0);
}`;

/** The city, laid out ahead of `at` (the parked car's position, its flat forward and right). */
export function buildCity(at: THREE.Vector3, fwd: THREE.Vector3, right: THREE.Vector3, ground: number): { points: THREE.Points; update(t: number, eye: THREE.Vector3, scale: number): void } {
  const pos: number[] = [], col: number[] = [], size: number[] = [], wake: number[] = [], dir: number[] = [], move: number[] = [];
  const F = fwd.clone().setY(0).normalize(), R = right.clone().setY(0).normalize();
  const grid = 0.21; // the street grid's slant to the view (radians)
  const gF = F.clone().multiplyScalar(Math.cos(grid)).addScaledVector(R, Math.sin(grid)), gR = R.clone().multiplyScalar(Math.cos(grid)).addScaledVector(F, -Math.sin(grid));
  const palette: [number, number, number][] = [[1, 0.6, 0.25], [1, 0.72, 0.38], [1, 0.95, 0.85], [0.6, 0.8, 1], [1, 0.35, 0.5], [0.5, 1, 0.75]];
  const put = (p: THREE.Vector3, c: [number, number, number], s: number, d: THREE.Vector3 = new THREE.Vector3(), m: [number, number, number] = [0, 0, 0]) => {
    const ahead = p.clone().sub(at).dot(F);
    pos.push(p.x, ground + 0.6, p.z); col.push(...c); size.push(s);
    wake.push(CITY.waveAt + Math.max(0, ahead) / CITY.wave + 0.15 * hash(p.x, p.z, 5));
    dir.push(d.x, d.y, d.z); move.push(...m);
  };
  const inside = (p: THREE.Vector3) => { const v = p.clone().sub(at), a = v.dot(F), x = v.dot(R); return a > CITY.near && a < CITY.far && Math.abs(x) < CITY.half * (0.4 + a / CITY.far); };
  // the street grid: lights along every street both ways, a few missing; colour mostly sodium
  for (const [along, across] of [[gF, gR], [gR, gF]] as const) {
    for (let k = -60; k <= 60; k++) {
      for (let j = -260; j <= 260; j++) {
        const p = at.clone().addScaledVector(across, k * CITY.street).addScaledVector(along, j * CITY.step + 4 * (hash(k, j, 1) - 0.5));
        if (!inside(p) || hash(k, j, 2) < 0.18) continue;
        const r = hash(k, j, 3), c = r < 0.62 ? palette[0]! : r < 0.8 ? palette[1]! : r < 0.94 ? palette[2]! : palette[3 + Math.floor(hash(k, j, 4) * 3)]!;
        put(p, c, 1 + 1.4 * hash(k, j, 6));
      }
    }
  }
  // freeways: long runs across the plain, white coming, red going
  for (let f = 0; f < CITY.freeways; f++) {
    const a = 0.5 + 1.1 * hash(f, 9), cross = gR.clone().multiplyScalar(Math.cos(a)).addScaledVector(gF, Math.sin(a)).normalize();
    const mid = at.clone().addScaledVector(F, CITY.near + 300 + 2400 * hash(f, 10)).addScaledVector(R, (hash(f, 11) - 0.5) * 2000);
    const len = 5200, start = mid.clone().addScaledVector(cross, -len / 2);
    for (let i = 0; i < 520; i++) {
      const lane = i % 2;
      const p0 = start.clone().addScaledVector(cross.clone().cross(new THREE.Vector3(0, 1, 0)), lane ? 6 : -6);
      const d = lane ? cross : cross.clone().negate(), s0 = lane ? p0 : p0.clone().addScaledVector(cross, len);
      put(s0, lane ? [1, 0.95, 0.85] : [1, 0.15, 0.1], 1.6, d, [hash(f, i, 12) * len, 22 + 8 * hash(f, i, 13), len]);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('size', new THREE.Float32BufferAttribute(size, 1));
  g.setAttribute('wake', new THREE.Float32BufferAttribute(wake, 1));
  g.setAttribute('dir', new THREE.Float32BufferAttribute(dir, 3));
  g.setAttribute('move', new THREE.Float32BufferAttribute(move, 3));
  const u = { t: { value: 0 }, scale: { value: 1 }, on: { value: 0 }, eye: { value: new THREE.Vector3() }, night: NIGHT, glow: { value: CITY.glow } };
  const m = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: u, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false });
  const points = new THREE.Points(g, m);
  points.frustumCulled = false;
  return {
    points,
    update(t, eye, scale) { u.t.value = t; u.on.value = t; u.eye.value.copy(eye); u.scale.value = scale; },
  };
}
