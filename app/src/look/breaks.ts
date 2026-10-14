// The style breaks' treatments (drive/breaks.ts): a full-screen pass on the printed frame, between the print pass
// and the engine's post, while a break runs. Each kind is a screen treatment (the plates, the slip, the xerox, the
// launch's smear, the rewind's VHS) and, for some, graphics drawn over it (a canvas per kind, drawn once: the comic
// panel's border, burst and speed lines; the rewind's REW glyph; the launch's radial lines). Everything is a function
// of song time (judder seeded by the frame). Browser only.
import * as THREE from 'three';
import { FSPass, H, W, rtScale } from '../engine/gl';
import { F, font } from '../engine/type';
import type { Break, BreakKind } from '../drive/breaks';

const KIND: Record<BreakKind, number> = { plates: 1, slip: 2, comic: 3, rewind: 4, xerox: 5, launch: 6 };
const PAPER = new THREE.Color('#f2ede4').convertSRGBToLinear(), INK = new THREE.Color('#1c0f22').convertSRGBToLinear();

const FRAG = /* glsl */ `
uniform sampler2D src, olay;
uniform int kind;
uniform float k, size, t, olayOn, px;
uniform vec2 res;
uniform vec3 paper, ink;
void main() {
  vec2 uv = vUv, texel = 1.0 / res;
  vec4 s0 = texture(src, uv);
  vec3 c = s0.rgb;
  float a = s0.a, fr = floor(t * 24.0);
  if (kind == 1) {
    // the plates: red, green and blue pulled apart, slamming back into register with a shudder
    float e = exp(-5.0 * k) * (0.6 + 0.4 * abs(cos(18.0 * k)));
    vec2 off = texel * px * 16.0 * size * e;
    c = vec3(texture(src, uv + off * vec2(1.0, 0.35)).r, texture(src, uv + off * vec2(-0.3, -0.8)).g, texture(src, uv + off * vec2(-1.0, 0.45)).b);
  } else if (kind == 2) {
    // the slip: the sheet drops, a torn edge at its top with the paper showing above, landing with a bounce
    float d = 90.0 * size * px * texel.y;
    float u = max(0.0, k - 0.1), drop = smoothstep(0.0, 0.1, k) * (1.0 + 0.14 * exp(-10.0 * u) * cos(38.0 * u));
    float dy = d * clamp(drop, 0.0, 1.2);
    float tear = (hash12(vec2(floor(uv.x * res.x / (6.0 * px)), 1.0)) - 0.5) * 6.0 * px * texel.y + (hash12(vec2(floor(uv.x * res.x / (40.0 * px)), 2.0)) - 0.5) * 12.0 * px * texel.y;
    // (above the tear, the dark under the sheet, the torn paper's fringe along it: paper there vanished into a pale sky)
    float edge = 1.0 - dy + tear;
    if (uv.y > edge) { c = mix(paper, ink, smoothstep(0.0, 5.0 * px * texel.y, uv.y - edge)); a = 1.0; }
    else c = texture(src, uv + vec2(0.0, dy)).rgb;
  } else if (kind == 4) {
    // the rewind: VHS bands wobbling, a tracking bar sweeping up through noise, the colour thinned
    float row = floor(uv.y * 48.0), band = step(0.8, hash12(vec2(row, fr)));
    float wob = (hash12(vec2(fr, row)) - 0.5) * 18.0 * px * texel.x * band;
    float track = 1.0 - smoothstep(0.0, 0.05, abs(uv.y - fract(0.1 + k * 1.3)));
    uv.x += wob + track * 30.0 * px * texel.x * (hash12(vec2(fr, 9.0)) - 0.5);
    c = texture(src, uv).rgb;
    float g = dot(c, vec3(0.3, 0.59, 0.11));
    c = mix(c, vec3(g), 0.35) * (1.0 - 0.5 * track) + 0.4 * track * hash12(floor(uv * res / (2.0 * px)) + fr);
    c += 0.04 * (hash12(floor(uv * res / (2.0 * px)) + fr * 3.0) - 0.5);
  } else if (kind == 5) {
    // the xerox: the frame in strips, each shoved sideways by the frame, printed one-bit through an ordered dither
    // (the lyric's glow burns through white: it stays legible)
    float strip = floor(uv.y * 9.0), sh = (hash12(vec2(strip, fr)) - 0.5) * 36.0 * px * texel.x * size;
    c = texture(src, uv + vec2(sh, 0.0)).rgb;
    float l = dot(c, vec3(0.3, 0.59, 0.11));
    ivec2 ip = ivec2(mod(floor(gl_FragCoord.xy / px), 4.0));
    float m[16] = float[16](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
    float th = (m[ip.y * 4 + ip.x] + 0.5) / 16.0;
    c = mix(ink, paper, step(0.1 + 0.9 * th, l * 1.6));
  } else if (kind == 6) {
    // the launch: a radial smear out from the middle, hardest as it lands (the middle itself still: the words)
    float e = (1.0 - k) * (1.0 - k);
    vec2 dir = (uv - 0.5) * 0.09 * size * e;
    vec3 acc = vec3(0.0);
    for (int i = 0; i < 10; i++) acc += texture(src, uv - dir * (float(i) / 9.0)).rgb;
    c = acc / 10.0;
  }
  if (olayOn > 0.0) { vec4 o = texture(olay, vUv); c = mix(c, o.rgb, o.a * olayOn); }
  fragColor = vec4(c, a);
}`;

/** The graphics over the frame, one canvas per kind that has them (W x H logical px), linear-space textures. */
function overlay(kind: BreakKind): THREE.CanvasTexture | null {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d')!;
  const cx = W / 2, cy = H / 2;
  if (kind === 'comic') {
    // the panel: paper round the frame, a heavy border inset; speed lines from the corners in; a burst of dots
    const inset = 44, bw = 14;
    c.fillStyle = '#f2ede4'; c.fillRect(0, 0, W, H);
    c.clearRect(inset, inset, W - 2 * inset, H - 2 * inset);
    c.lineWidth = bw; c.strokeStyle = '#1c0f22'; c.strokeRect(inset + bw / 2, inset + bw / 2, W - 2 * inset - bw, H - 2 * inset - bw);
    c.strokeStyle = 'rgba(28,15,34,0.9)'; c.lineCap = 'round';
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2 + 0.03 * Math.sin(i * 7.1), r0 = 0.46 * H + 0.08 * H * ((i * 37) % 11) / 11, r1 = r0 + 0.1 * H + 0.14 * H * ((i * 53) % 7) / 7;
      c.lineWidth = 2 + 3 * ((i * 11) % 3);
      c.beginPath(); c.moveTo(cx + r0 * Math.cos(a), cy + r0 * Math.sin(a)); c.lineTo(cx + r1 * Math.cos(a), cy + r1 * Math.sin(a)); c.stroke();
    }
    c.fillStyle = 'rgba(28,15,34,0.85)';
    for (let ring = 0; ring < 3; ring++) {
      const n = 26 + ring * 10, r = 0.38 * H + ring * 0.035 * H, dot = 3 + ring * 2.2;
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + ring * 0.11; c.beginPath(); c.arc(cx + r * 1.45 * Math.cos(a), cy + r * Math.sin(a), dot, 0, Math.PI * 2); c.fill(); }
    }
  } else if (kind === 'rewind') {
    // the deck's REW glyph, top left, in the signs' mono
    c.font = font(F.sign(700), 64); c.textBaseline = 'top';
    c.lineWidth = 6; c.strokeStyle = '#1c0f22'; c.fillStyle = '#f4f0e6';
    const tri = (x: number) => { c.beginPath(); c.moveTo(x + 46, 70); c.lineTo(x, 95); c.lineTo(x + 46, 120); c.closePath(); c.stroke(); c.fill(); };
    tri(70); tri(118);
    c.strokeText('REW', 190, 62); c.fillText('REW', 190, 62);
  } else if (kind === 'launch') {
    // radial speed lines from the middle out, the middle clear
    c.strokeStyle = 'rgba(28,15,34,0.85)'; c.lineCap = 'round';
    for (let i = 0; i < 110; i++) {
      const a = (i / 110) * Math.PI * 2 + 0.02 * Math.sin(i * 5.3), r0 = 0.36 * H + 0.1 * H * ((i * 29) % 13) / 13, r1 = 0.75 * H;
      c.lineWidth = 1.5 + 3 * ((i * 7) % 3);
      c.beginPath(); c.moveTo(cx + r0 * Math.cos(a), cy + r0 * Math.sin(a)); c.lineTo(cx + r1 * Math.cos(a), cy + r1 * Math.sin(a)); c.stroke();
    }
  } else return null;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class BreaksPass {
  private pass: FSPass;
  private overlays = new Map<BreakKind, THREE.CanvasTexture | null>();
  constructor() {
    this.pass = new FSPass(FRAG, {
      src: { value: null }, olay: { value: null }, kind: { value: 0 }, k: { value: 0 }, size: { value: 1 }, t: { value: 0 }, olayOn: { value: 0 }, px: { value: 1 },
      res: { value: new THREE.Vector2() }, paper: { value: PAPER }, ink: { value: INK },
    });
  }
  /** Runs the break `a` (and its progress) on the printed frame `src` into `out`, at song time t. */
  render(renderer: THREE.WebGLRenderer, src: THREE.WebGLRenderTarget, out: THREE.WebGLRenderTarget | null, a: { b: Break; k: number }, t: number) {
    const u = this.pass.u, kind = a.b.kind;
    if (!this.overlays.has(kind)) this.overlays.set(kind, overlay(kind));
    const olay = this.overlays.get(kind);
    u.src!.value = src.texture; u.kind!.value = KIND[kind]; u.k!.value = a.k; u.size!.value = a.b.size; u.t!.value = t;
    u.res!.value.set(src.width, src.height); u.px!.value = rtScale(src);
    u.olay!.value = olay; u.olayOn!.value = olay ? (kind === 'launch' ? 1 - a.k : 1) : 0;
    this.pass.render(renderer, out);
  }
}
