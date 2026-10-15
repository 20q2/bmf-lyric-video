// The sky as a poster would print it: the gradient from horizon to zenith in flat bands, a glow where the sun is, the
// sun itself (HDR, so it blooms) until it sets, printed clouds drifting in the low sky and the low sun's rays fanning out
// round it (drive/sky.ts: cloudsAt, raysAt), two printed mountain ranges on the horizon away from the sea, and stars coming out after. Follows drive/sky.ts. Centred on the
// camera every frame; drawn behind everything, unfogged. Browser only.
import * as THREE from 'three';
import type { SkyState } from '../drive/sky';

/** How many bands the gradient prints in, the sun's radius (degrees) and its brightness (HDR); the moon's radius. */
export const SKYDOME = { bands: 9, sunDeg: 2.4, sunHDR: 9, radius: 2500, moonDeg: 0.9 };

const VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww; // on the far plane
}`;

const FRAG = /* glsl */ `
uniform vec3 zenith, horizon, sunDir, sunColor, mountainDir;
uniform float stars, bands, sunR, sunHDR, time, groundMix, clouds, rays, mountains, moon;
uniform vec3 moonDir; uniform float moonR;
varying vec3 vDir;
const float PI_ = 3.14159265;
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), f.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
void main() {
  vec3 d = normalize(vDir);
  float h = max(d.y, 0.0);
  // the gradient, printed in bands (their edges anti-aliased)
  float g = pow(h, 0.42), b = g * bands, aa = fwidth(b);
  float q = (floor(b) + smoothstep(1.0 - aa, 1.0, fract(b))) / bands;
  q = mix(q, g, stars); // by night the bands melt into one gradient (seen looking up they'd ring the frame)
  vec3 c = mix(horizon, zenith, q);
  // (under the horizon, in the hero's reflections only: dark ground, so chrome shows a horizon line — the world hides
  // it in the main view)
  c = mix(c, horizon * 0.22, smoothstep(0.0, 0.06, -d.y) * groundMix);
  // the glow round the sun, warmest on the horizon, also banded
  float toSun = max(dot(d, sunDir), 0.0), glow = pow(toSun, 6.0) * (1.0 - g) ;
  float gq = floor(glow * 4.0 + 0.5) / 4.0;
  c += gq * sunColor * 0.35;
  // the mountains: two printed ranges on the horizon on the far side from the sea (the far one hazed toward the sky,
  // the near one darker); their ridges noise round the compass (sampled on a circle: no seam)
  if (mountains > 0.0 && d.y > -0.02) {
    vec2 fd2 = normalize(d.xz + 1e-5), md = normalize(mountainDir.xz + 1e-5);
    float face = smoothstep(-0.35, 0.15, dot(fd2, md)), pa = fwidth(d.y) * 1.2;
    float far1 = (0.02 + 0.1 * fbm(fd2 * 2.5 + vec2(2.7))) * face, near1 = (0.008 + 0.06 * fbm(fd2 * 5.5 + vec2(8.3, 3.1))) * face;
    vec3 farC = mix(horizon, zenith, 0.45) * 0.92, nearC = mix(horizon, zenith, 0.7) * 0.62;
    c = mix(c, farC, smoothstep(far1 + pa, far1 - pa, d.y) * step(0.001, far1) * mountains);
    c = mix(c, nearC, smoothstep(near1 + pa, near1 - pa, d.y) * step(0.001, near1) * mountains);
  }
  // the low sun's rays: printed wedges fanning out round it, turning slowly
  if (rays > 0.0 && d.y > 0.0) {
    vec3 s = normalize(sunDir), d0 = normalize(d - s * dot(d, s) + 1e-5);
    vec3 ax = normalize(cross(s, vec3(0.0, 1.0, 0.0)) + 1e-5), ay = cross(ax, s);
    float phi = atan(dot(d0, ay), dot(d0, ax));
    float wedge = step(0.5, fract(phi * 9.0 / PI_ + time * 0.01));
    float reach = smoothstep(0.55, 0.995, dot(d, s));
    c += sunColor * 0.09 * wedge * reach * rays;
  }
  // the sun (above the horizon)
  float ang = acos(clamp(dot(d, sunDir), -1.0, 1.0)), px = fwidth(ang);
  c = mix(c, sunColor * sunHDR, smoothstep(sunR + px, sunR - px, ang) * step(0.0, d.y));
  // clouds: flat printed shapes in the low sky, drifting, two tones (lit on the sun's side), passing over the sun
  if (clouds > 0.0 && d.y > 0.0) {
    vec2 cp = d.xz / (d.y + 0.1) * 0.55 + vec2(time * 0.006, 0.0);
    // (lobed: a finer noise carves the edges into puffs, and a darker rim lines them — plain fbm read as soft smears)
    float n = fbm(cp) + 0.16 * (fbm(cp * 2.7 + 5.0) - 0.5), na = fwidth(n) * 1.5;
    float cover = smoothstep(0.56 - na, 0.56 + na, n) * smoothstep(0.01, 0.06, d.y) * (1.0 - smoothstep(0.3, 0.6, d.y));
    float rim = cover - smoothstep(0.585 - na, 0.585 + na, n);
    vec3 fd = normalize(vec3(d.x, 0.0, d.z) + 1e-4), fs = normalize(vec3(sunDir.x, 0.0, sunDir.z) + 1e-4);
    float lit = step(0.5, dot(fd, fs) * 0.5 + 0.5 + (n - 0.62) * 1.5);
    vec3 shadeC = mix(zenith, horizon, 0.35) * 0.82, litC = mix(horizon, sunColor, 0.55) * 1.05;
    c = mix(c, mix(shadeC, litC, lit) * (1.0 - 0.22 * clamp(rim, 0.0, 1.0)), cover * clouds);
  }
  // the moon, once the sun's down: a pale disc, its seas printed darker, in a soft halo — a wide faint one and a close
  // brighter one (the damp air round it)
  if (moon > 0.0 && d.y > 0.0) {
    float am = acos(clamp(dot(d, moonDir), -1.0, 1.0)), pm = fwidth(am);
    c += vec3(0.62, 0.68, 0.95) * moon * (0.06 * exp(-am * 4.0) + 0.2 * exp(-am * 14.0) + 0.3 * exp(-am * 45.0));
    vec3 mx = normalize(cross(moonDir, vec3(0.0, 1.0, 0.0)) + 1e-5), my = cross(mx, moonDir);
    vec2 mp = vec2(dot(d, mx), dot(d, my)) / moonR;
    float seas = smoothstep(0.52, 0.6, fbm(mp * 1.3 + vec2(3.1, 7.7)));
    vec3 disc = mix(vec3(0.95, 0.95, 1.0) * 1.45, vec3(0.66, 0.68, 0.82) * 1.15, seas);
    c = mix(c, disc, smoothstep(moonR + pm, moonR - pm, am) * moon);
  }
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
      sunDir: { value: new THREE.Vector3(0, 0.2, -1).normalize() }, sunColor: { value: new THREE.Color('#ffd9a0') }, moonDir: { value: new THREE.Vector3(0, 1, 0) }, moon: { value: 0 }, moonR: { value: (SKYDOME.moonDeg * Math.PI) / 180 },
      stars: { value: 0 }, bands: { value: SKYDOME.bands }, sunR: { value: (SKYDOME.sunDeg * Math.PI) / 180 },
      sunHDR: { value: SKYDOME.sunHDR }, time: { value: 0 }, groundMix: { value: 0 }, clouds: { value: 0 }, rays: { value: 0 },
      mountainDir: { value: new THREE.Vector3(1, 0, 0) }, mountains: { value: 0 },
    };
    const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: this.u, side: THREE.BackSide, depthWrite: false, fog: false });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(SKYDOME.radius, 48, 24), mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1;
  }

  /** Draws the ground under the horizon (the hero's environment: look/envsky.ts). */
  withGround() { this.u.groundMix!.value = 1; }
  /** The mountains stand round this direction (flat), away from the sea. */
  setMountains(dir: THREE.Vector3) { this.u.mountainDir!.value.copy(dir); this.u.mountains!.value = 1; }

  update(s: SkyState, sunDir: THREE.Vector3, sunColor: THREE.Color, camera: THREE.Object3D, t: number, clouds = 0, rays = 0, moonDir?: THREE.Vector3, moon = 0) {
    if (moonDir) this.u.moonDir!.value.copy(moonDir);
    this.u.moon!.value = moon;
    this.u.clouds!.value = clouds;
    this.u.rays!.value = rays;
    this.u.zenith!.value.copy(s.zenith);
    this.u.horizon!.value.copy(s.horizon);
    this.u.sunDir!.value.copy(sunDir);
    this.u.sunColor!.value.copy(sunColor);
    this.u.stars!.value = s.stars;
    this.u.time!.value = t;
    this.mesh.position.copy(camera.position);
  }
}
