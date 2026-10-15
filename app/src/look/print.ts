// The print pass: the rendered frame made to look screen-printed (spec §4, "graphic 3D"):
//   ink      a plum outline wherever something stands in front of something further off (from the depth buffer), so
//            every silhouette is drawn; fading with distance, as the fog does
//   halftone a dot screen in the shadows (45°, `cell` logical px), dots growing as the tone darkens
//   contact  ambient occlusion where things meet (from the depth buffer), printed into the dots
//   tint     shadows pulled toward violet, highlights left warm: the sunset's complementary
//   hero     a hero surface (its alpha low: look/hero.ts) keeps its light: no halftone or tint, its ink kept
//   register the red and blue plates a pixel out of register; paper fibre under it all
// Reads the scene's colour and depth; writes linear HDR (the engine's post adds bloom and grain after). Browser only.
import * as THREE from 'three';
import { FSPass } from '../engine/gl';

export interface PrintParams {
  /** Outline strength 0..1, its width (logical px) and how far off (m) it has faded out. */
  ink: number; inkPx: number; inkFar: number;
  /** Halftone strength 0..1, cell (logical px), and the tones it spans (linear luma: full dots at lo, none from hi). */
  halftone: number; cell: number; lo: number; hi: number;
  /** How far the red and blue plates drift out of register (logical px), and how much the paper's fibre shows. */
  misreg: number; paper: number;
  /** How far shadows are pulled toward the violet tint 0..1. */
  tint: number;
  /** The contact shade (ambient occlusion from the depth buffer): its strength 0..1 (where things meet the ground, in
   *  creases), and its reach (m). */
  ao: number; aoR: number;
}

export const PRINT: PrintParams = { ink: 0.95, inkPx: 2, inkFar: 600, halftone: 0.6, cell: 5.5, lo: 0.02, hi: 0.2, tint: 0.5, misreg: 1.3, paper: 0.035, ao: 0.85, aoR: 1.1 };
const INK = new THREE.Color('#1c0f22'), SHADE = new THREE.Color('#5a3d8a');

const FRAG = /* glsl */ `
uniform sampler2D src, depth;
uniform vec2 texel;
uniform float near, far, ink, inkPx, inkFar, halftone, cell, lo, hi, tint, misreg, paper, ao, aoR;
uniform vec2 proj; // tan of the half field of view across and up
uniform vec3 inkColor, shade;
float lin(float d) { float z = d * 2.0 - 1.0; return 2.0 * near * far / (far + near - z * (far - near)); }
// the view-space point at uv, z metres off
vec3 viewAt(vec2 uv, float z) { return vec3((uv * 2.0 - 1.0) * proj * z, -z); }
void main() {
  // the plates a touch out of register: red pulled one way, blue the other (as a screen print's layers drift)
  vec2 mis = texel * misreg * PX_SCALE * vec2(1.0, 0.6);
  vec3 c = vec3(texture(src, vUv + mis).r, texture(src, vUv).g, texture(src, vUv - mis).b);
  // the hero (the car's paint and chrome, look/hero.ts): its alpha is low; it keeps its own light — no halftone, no
  // violet shade (its ink outline stays)
  float hero = 1.0 - smoothstep(0.6, 0.9, texture(src, vUv).a);
  float z0 = lin(texture(depth, vUv).r);
  // ink: on a flat surface 1/depth runs linearly across the screen, however steeply it's seen, so it bends only at an
  // edge; ink where it peaks here (this pixel the near side of a silhouette, or a corner standing out)
  float e = 0.0, w0 = 1.0 / z0;
  vec2 o = texel * inkPx * PX_SCALE;
  for (int k = 0; k < 4; k++) {
    float a = float(k) * PI / 4.0;
    vec2 dv = o * vec2(cos(a), sin(a));
    float wa = 1.0 / lin(texture(depth, vUv + dv).r), wb = 1.0 / lin(texture(depth, vUv - dv).r);
    e = max(e, smoothstep(0.06, 0.2, (2.0 * w0 - wa - wb) / w0));
  }
  e *= 1.0 - smoothstep(inkFar * 0.5, inkFar, z0);
  // the contact shade (the user, 2026-10-14: the shadows' overhaul): ambient occlusion from the depth buffer — how much
  // of the open sky over this point the surfaces within aoR metres of it hide (the ground under a car, a wall's foot,
  // the crease under an awning, a shelf's back), so things sit on the ground. The surface's own plane, rebuilt from its
  // neighbours' depths (the nearer side at an edge), sets which way is open. Printed as the shadows are: dots and the
  // violet shade.
  vec3 P = viewAt(vUv, z0);
  vec2 tx = vec2(texel.x, 0.0), ty = vec2(0.0, texel.y);
  vec3 pr = viewAt(vUv + tx, lin(texture(depth, vUv + tx).r)), pl = viewAt(vUv - tx, lin(texture(depth, vUv - tx).r));
  vec3 pu = viewAt(vUv + ty, lin(texture(depth, vUv + ty).r)), pd = viewAt(vUv - ty, lin(texture(depth, vUv - ty).r));
  vec3 N = normalize(cross(abs(pr.z - P.z) < abs(P.z - pl.z) ? pr - P : P - pl, abs(pu.z - P.z) < abs(P.z - pd.z) ? pu - P : P - pd));
  float occ = 0.0, R2 = aoR * aoR;
  vec2 ro = min(aoR / (2.0 * z0 * proj.y), 0.12) * vec2(proj.y / proj.x, 1.0);
  for (int k = 0; k < 16; k++) {
    float fk = float(k), r = sqrt((fk + 0.5) / 16.0);
    vec2 uv = vUv + ro * r * vec2(cos(fk * 2.39996 + 0.3), sin(fk * 2.39996 + 0.3));
    vec3 v = viewAt(uv, lin(texture(depth, uv).r)) - P;
    float vv = dot(v, v);
    occ += max(0.0, dot(v, N) - 0.004 * z0) * aoR / (vv + 0.05 * R2) * (1.0 - smoothstep(R2, 4.0 * R2, vv));
  }
  occ = clamp(occ / 16.0 * 1.6, 0.0, 1.0) * ao * step(z0, far * 0.99) * (1.0 - hero);
  // shadows toward violet: the same tone, the shade's hue
  float L = luma(c) * (1.0 - 0.6 * occ);
  vec3 shadeN = shade / luma(shade);
  float sh = 1.0 - smoothstep(lo, hi * 1.5, L);
  float mx = max(c.r, max(c.g, c.b)), chroma = (mx - min(c.r, min(c.g, c.b))) / max(mx, 1e-4);
  float keep = smoothstep(0.55, 0.9, chroma); // strong colours (the car's red, neon) keep their hue
  sh *= (1.0 - 0.85 * keep) * (1.0 - hero);
  c = mix(c, shadeN * L, sh * tint);
  c *= 1.0 - 0.5 * occ;
  // halftone dots in the shadows
  vec2 q = rot2(PI / 4.0) * FRAG_PX / cell, f = fract(q) - 0.5;
  float r = 0.5 * sqrt(1.0 - smoothstep(lo, hi, L)) * 1.1, d = length(f), aa = fwidth(d) * 1.2;
  float dots = smoothstep(r + aa, r - aa, d) * step(0.001, r);
  c = mix(c, mix(shadeN * L, c, keep) * 0.55, dots * halftone * step(z0, far * 0.99) * (1.0 - hero));
  c = mix(c, inkColor, e * ink);
  // the paper: a soft fibre, lighter and darker by a percent or two
  float fib = snoise(FRAG_PX * vec2(0.012, 0.05)) * 0.6 + snoise(FRAG_PX * 0.09) * 0.4;
  c *= 1.0 + paper * fib;
  fragColor = vec4(c, 1.0);
}`;

export class PrintPass {
  private pass: FSPass;
  constructor() {
    this.pass = new FSPass(FRAG, {
      src: { value: null }, depth: { value: null }, texel: { value: new THREE.Vector2() },
      near: { value: 0.1 }, far: { value: 3000 }, ink: { value: PRINT.ink }, inkPx: { value: PRINT.inkPx }, inkFar: { value: PRINT.inkFar },
      halftone: { value: PRINT.halftone }, cell: { value: PRINT.cell }, lo: { value: PRINT.lo }, hi: { value: PRINT.hi }, tint: { value: PRINT.tint },
      misreg: { value: PRINT.misreg }, paper: { value: PRINT.paper }, ao: { value: PRINT.ao }, aoR: { value: PRINT.aoR }, proj: { value: new THREE.Vector2() },
      inkColor: { value: new THREE.Vector3(...INK.toArray()) }, shade: { value: new THREE.Vector3(...SHADE.toArray()) },
    });
  }

  render(renderer: THREE.WebGLRenderer, rt: THREE.WebGLRenderTarget, cam: THREE.PerspectiveCamera, out: THREE.WebGLRenderTarget, p: Partial<PrintParams> = {}) {
    const u = this.pass.u, q = { ...PRINT, ...p };
    u.src!.value = rt.texture;
    u.depth!.value = rt.depthTexture;
    u.texel!.value.set(1 / rt.width, 1 / rt.height);
    u.near!.value = cam.near; u.far!.value = cam.far;
    const ty = Math.tan((cam.fov * Math.PI) / 360);
    u.proj!.value.set(ty * cam.aspect, ty);
    for (const k of ['ink', 'inkPx', 'inkFar', 'halftone', 'cell', 'lo', 'hi', 'tint', 'misreg', 'paper', 'ao', 'aoR'] as const) u[k]!.value = q[k];
    this.pass.render(renderer, out);
  }
}
