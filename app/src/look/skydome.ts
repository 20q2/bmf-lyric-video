// The sky as a poster would print it: the gradient from horizon to zenith in flat bands, a glow where the sun is, the
// sun itself (HDR, so it blooms) until it sets, and stars coming out after. Follows drive/sky.ts. Centred on the
// camera every frame; drawn behind everything, unfogged. Browser only.
import * as THREE from 'three';
import type { SkyState } from '../drive/sky';

/** How many bands the gradient prints in, the sun's radius (degrees) and its brightness (HDR). */
export const SKYDOME = { bands: 9, sunDeg: 2.4, sunHDR: 9, radius: 2500 };

const VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww; // on the far plane
}`;

const FRAG = /* glsl */ `
uniform vec3 zenith, horizon, sunDir, sunColor;
uniform float stars, bands, sunR, sunHDR, time;
varying vec3 vDir;
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main() {
  vec3 d = normalize(vDir);
  float h = max(d.y, 0.0);
  // the gradient, printed in bands (their edges anti-aliased)
  float g = pow(h, 0.42), b = g * bands, aa = fwidth(b);
  float q = (floor(b) + smoothstep(1.0 - aa, 1.0, fract(b))) / bands;
  q = mix(q, g, stars); // by night the bands melt into one gradient (seen looking up they'd ring the frame)
  vec3 c = mix(horizon, zenith, q);
  // the glow round the sun, warmest on the horizon, also banded
  float toSun = max(dot(d, sunDir), 0.0), glow = pow(toSun, 6.0) * (1.0 - g) ;
  float gq = floor(glow * 4.0 + 0.5) / 4.0;
  c += gq * sunColor * 0.35;
  // the sun (above the horizon)
  float ang = acos(clamp(dot(d, sunDir), -1.0, 1.0)), px = fwidth(ang);
  c = mix(c, sunColor * sunHDR, smoothstep(sunR + px, sunR - px, ang) * step(0.0, d.y));
  // stars: one in some cells of a grid over the sky, twinkling
  if (stars > 0.0 && d.y > 0.02) {
    vec2 sp = vec2(atan(d.z, d.x), asin(d.y)) * 120.0;
    vec2 cell = floor(sp), f = fract(sp) - 0.5;
    float r = hash12(cell);
    if (r > 0.985) {
      vec2 o = vec2(hash12(cell + 7.1), hash12(cell + 3.3)) - 0.5;
      float s = smoothstep(0.09, 0.0, length(f - o * 0.6)) * (0.6 + 0.4 * sin(time * (1.0 + r * 3.0) + r * 40.0));
      c += vec3(1.0, 0.95, 0.9) * s * stars * (1.5 + 2.0 * fract(r * 97.0)) * smoothstep(0.02, 0.15, d.y);
    }
  }
  gl_FragColor = vec4(c, 1.0);
}`;

export class SkyDome {
  readonly mesh: THREE.Mesh;
  private u: Record<string, THREE.IUniform>;

  constructor() {
    this.u = {
      zenith: { value: new THREE.Color() }, horizon: { value: new THREE.Color() },
      sunDir: { value: new THREE.Vector3(0, 0.2, -1).normalize() }, sunColor: { value: new THREE.Color('#ffd9a0') },
      stars: { value: 0 }, bands: { value: SKYDOME.bands }, sunR: { value: (SKYDOME.sunDeg * Math.PI) / 180 },
      sunHDR: { value: SKYDOME.sunHDR }, time: { value: 0 },
    };
    const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: this.u, side: THREE.BackSide, depthWrite: false, fog: false });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(SKYDOME.radius, 48, 24), mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1;
  }

  update(s: SkyState, sunDir: THREE.Vector3, sunColor: THREE.Color, camera: THREE.Camera, t: number) {
    this.u.zenith!.value.copy(s.zenith);
    this.u.horizon!.value.copy(s.horizon);
    this.u.sunDir!.value.copy(sunDir);
    this.u.sunColor!.value.copy(sunColor);
    this.u.stars!.value = s.stars;
    this.u.time!.value = t;
    this.mesh.position.copy(camera.position);
  }
}
