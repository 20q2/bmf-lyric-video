// A carrier's face: its phrase, karaoke word by word, in the carrier's own medium (greybox looks until M3):
//   sign/gantry  a light board with a thin border, the phrase in Bodoni italic (unsung dim, sung ink, current accent)
//   road         white stencil capitals on nothing (the asphalt shows through), faint until sung
//   sky          white italic sky-writing on nothing: each word appears as it's sung, and once the phrase is done
//                it drifts apart and dissolves over DISSOLVE_S (sky-writing does), so the sky never fills up
//   wall         heavy capitals painted on the wall's colour
//   billboard    condensed black capitals on a white board, an accent band along its foot
//   storefront   cream capitals on a dark green fascia
//   neon         pink italic tubing on a dark wall, glowing; the word being sung lights cyan
//   street       a green street-name blade, white type; gantry the same green, bigger, over the freeway
//   banner       a towed banner: dark capitals printed on white cloth, a red hem
//   tunnel       lit capitals on the tunnel's tiles, glowing sodium orange, the word being sung flaring white
// Every face is blank until its reveal (dissolve.ts), its board or wall already standing. A word of emphasis
// (Phrase.solo) on its own row is set as big as its row allows, and punches up as it's sung (PUNCH).
// Laid out as carriers.ts says (rows, em). Redrawn only when its karaoke key changes. Browser only (canvas).
import * as THREE from 'three';
import type { Word } from '../engine/lyrics';
import { HEX } from '../engine/palette';
import { hash } from '../engine/util';
import { WORLD } from '../look/toon';
import { F, font } from '../engine/type';
import type { Carrier } from './carriers';
import { dissolveAt, revealAt } from './dissolve';
import { daylight } from './sky';

const CANVAS_W = 1024;
/** Faces that carry poster art until their lyric is revealed. */
const DECOR: ReadonlySet<Carrier['kind']> = new Set(['billboard', 'sign', 'wall', 'storefront', 'street', 'gantry']);
/** A word of emphasis punches up this much as it's sung, settling over `over` s; it fills this share of its row. */
export const PUNCH = { scale: 0.2, over: 0.3, fill: 0.9 };
/** How far through its punch the emphasis word is at t (1: just sung, 0: settled or not yet). */
const punchAt = (c: Carrier, t: number) => {
  const p = c.phrase, w = p.solo === 'first' ? p.words[0] : p.solo === 'last' ? p.words[p.words.length - 1] : undefined;
  if (!w || t < w.start) return 0;
  const u = (t - w.start) / PUNCH.over;
  return u >= 1 ? 0 : (1 - u) * (1 - u);
};


/** The karaoke state of a phrase at t: how many words have started, and which is being sung (-1: none). */
export function karaokeKey(words: readonly Word[], t: number): string {
  let started = 0, current = -1;
  words.forEach((w, i) => { if (t >= w.start) started = i + 1; if (t >= w.start && t < w.end) current = i; });
  return `${started}:${current}`;
}

/** The colour of the building a face is on (seeded per carrier; neon's wall is dark). */
export const wallColor = (c: Carrier) => c.kind === 'neon'
  ? new THREE.Color().setHSL(0.75 + 0.1 * hash(c.phrase.start, 9), 0.25, 0.22)
  : new THREE.Color(WORLD.stucco[Math.floor(hash(c.phrase.start, 9) * WORLD.stucco.length)]!);
const hexOf = (c: THREE.Color) => `#${c.getHexString(THREE.SRGBColorSpace)}`;
const GREEN = '#1f6b44';

interface Style { bg?: string; border?: string; band?: string; family: string; caps: boolean; colors: [unsung: string, sung: string, now: string]; alpha: [unsung: number, sung: number]; glow?: string; glowPasses?: number }
function styleOf(c: Carrier): Style {
  switch (c.kind) {
    case 'road': return { family: F.archivo(75, 900), caps: true, colors: ['#f3f1ea', '#f3f1ea', '#ffd65a'], alpha: [0.18, 0.95] };
    // by day a soft plum shade under the white (it reads on a pale sky and on the buildings), by night a white glow
    case 'sky': {
      const day = daylight(c.phrase.start) > 0.6; // by day heavier, its shade laid twice
      return { family: F.bodoni(day ? 700 : 400, { italic: true }), caps: false, colors: ['#ffffff', '#ffffff', '#ffffff'], alpha: [0, 0.97], glow: day ? 'rgba(54,20,60,0.9)' : 'rgba(255,255,255,0.9)', glowPasses: day ? 2 : 1 };
    }
    case 'wall': return { bg: hexOf(wallColor(c)), family: F.archivo(100, 900), caps: true, colors: [HEX.ink, HEX.ink, HEX.accent], alpha: [0.22, 1] };
    case 'billboard': return { bg: '#fbf8f0', band: HEX.accent, family: F.archivo(62, 900), caps: true, colors: [HEX.ink, HEX.ink, HEX.accent], alpha: [0.25, 1] };
    case 'storefront': return { bg: '#1d3b30', family: F.archivo(100, 700), caps: true, colors: ['#f3ead2', '#f3ead2', '#ffd65a'], alpha: [0.3, 1] };
    case 'neon': return { family: F.bodoni(700, { italic: true }), caps: false, colors: ['#ff4fa3', '#ff4fa3', '#7ff6ff'], alpha: [0.3, 1], glow: 'rgba(255,79,163,0.95)' };
    case 'banner': return { bg: '#f7f4ec', band: '#d23a2a', family: F.archivo(75, 900), caps: true, colors: [HEX.ink, HEX.ink, HEX.accent], alpha: [0.85, 1] };
    case 'tunnel': return { family: F.archivo(100, 900), caps: true, colors: ['#ffcf8a', '#ffb347', '#fff6e8'], alpha: [0.2, 1], glow: 'rgba(255,160,60,0.9)' };
    case 'street': case 'gantry': return { bg: GREEN, border: '#f4f4f0', family: F.archivo(100, 700), caps: false, colors: ['#f4f4f0', '#f4f4f0', '#ffd65a'], alpha: [0.45, 1] };
    default: return { bg: HEX.bg, border: HEX.ink, family: F.bodoni(400, { italic: true }), caps: false, colors: [HEX.dim, HEX.ink, HEX.accent], alpha: [0.55, 1] };
  }
}

export class CarrierArt {
  readonly canvas = document.createElement('canvas');
  readonly texture: THREE.CanvasTexture;
  private c: CanvasRenderingContext2D;
  private key = '';
  private style: Style;

  constructor(private carrier: Carrier) {
    this.canvas.width = CANVAS_W;
    this.canvas.height = Math.round((CANVAS_W * carrier.h) / carrier.w);
    this.c = this.canvas.getContext('2d')!;
    this.style = styleOf(carrier);
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 8;
    this.update(-Infinity); // blank until its reveal
  }

  update(t: number) {
    const key = `${karaokeKey(this.carrier.phrase.words, t)}:${Math.round(dissolveAt(this.carrier, t) * 20)}:${Math.round(revealAt(this.carrier, t) * 10)}:${Math.round(punchAt(this.carrier, t) * 10)}`;
    if (key === this.key) return;
    this.key = key;
    this.draw(t);
    this.texture.needsUpdate = true;
  }

  private draw(t: number) {
    const { c, canvas, carrier, style } = this, W = canvas.width, H = canvas.height, pxPerM = W / carrier.w;
    c.clearRect(0, 0, W, H);
    if (style.bg) { c.fillStyle = style.bg; c.fillRect(0, 0, W, H); }
    if (style.border) { c.strokeStyle = style.border; c.lineWidth = 6; c.strokeRect(10, 10, W - 20, H - 20); }
    if (style.band) { c.fillStyle = style.band; c.fillRect(0, H * 0.9, W, H * 0.1); }
    const shown = Math.round(revealAt(carrier, t) * 10) / 10;
    if (shown < 1) this.decor(1 - shown);
    if (shown <= 0) return;
    let em = carrier.em * pxPerM;
    c.font = font(style.family, em);
    const label = (w: Word) => (style.caps ? w.w.toUpperCase() : w.w);
    const widest = Math.max(...carrier.rows.map((r) => c.measureText(r).width));
    if (widest > W * 0.92) { em *= (W * 0.92) / widest; c.font = font(style.family, em); }
    c.textBaseline = 'middle';
    const gone = Math.round(dissolveAt(carrier, t) * 20) / 20;
    if (gone >= 1) return;
    if (style.glow) { c.shadowColor = style.glow; c.shadowBlur = em * (0.22 + 0.6 * gone); }
    const words = carrier.phrase.words, space = c.measureText(' ').width;
    let wi = 0;
    carrier.rows.forEach((row, r) => {
      const n = row.split(' ').length, rowWords = words.slice(wi, wi + n);
      wi += n;
      // the word of emphasis, alone on its row: as big as the row allows, punching up as it's sung
      const solo = (carrier.phrase.solo === 'first' && r === 0) || (carrier.phrase.solo === 'last' && r === carrier.rows.length - 1);
      if (solo) {
        const base = c.measureText(label(rowWords[0]!)).width;
        const big = Math.min((PUNCH.fill * H) / carrier.rows.length, (em * W * 0.92) / base) * (1 + PUNCH.scale * punchAt(carrier, t));
        c.font = font(style.family, Math.max(em, Math.min(big, (em * W * 0.98) / base))); // never past the face's edge
      }
      const total = rowWords.reduce((s, w) => s + c.measureText(label(w)).width, 0) + space * (rowWords.length - 1);
      let x = (W - total) / 2;
      const y = (H * (r + 0.5)) / carrier.rows.length;
      for (const w of rowWords) {
        const sung = t >= w.start, now = sung && t < w.end;
        c.fillStyle = style.colors[now ? 2 : sung ? 1 : 0];
        c.globalAlpha = style.alpha[sung ? 1 : 0] * (1 - gone) * shown;
        // dissolving: the letters drift apart and up, a little more each word along
        for (let k = 0; k < (style.glowPasses ?? 1); k++) c.fillText(label(w), x + gone * em * 0.8 * (x / W - 0.5) * 4, y - gone * em * 0.6);
        x += c.measureText(label(w)).width + space;
      }
      if (solo) c.font = font(style.family, em);
    });
    c.globalAlpha = 1;
    c.shadowBlur = 0;
  }

  /** Before its lyric is revealed a board isn't blank: it carries poster art (no words, so nothing to read ahead) — a
   *  banded sunset, a palm, a star, stripes, a sun over waves; route signs a shield and an arrow. Seeded per carrier. */
  private decor(a: number) {
    const { c, canvas, carrier } = this, W = canvas.width, H = canvas.height, k = carrier.kind;
    if (!DECOR.has(k)) return;
    const r = (n: number) => hash(carrier.phrase.start * 1000, n);
    const ink = '#36143c', P = ['#ff5a36', '#f6b34a', '#e3907a', '#cdb8e6', '#f6dd8f', '#2b78a6'];
    c.save();
    c.globalAlpha = a;
    const cx = W * (0.3 + 0.4 * r(1)), cy = H / 2, R = H * 0.36;
    if (k === 'street' || k === 'gantry') {
      // a route shield and an arrow, in the sign's white
      c.fillStyle = '#f4f4f0';
      c.beginPath(); c.moveTo(W * 0.3 - R * 0.8, cy - R * 0.8); c.lineTo(W * 0.3 + R * 0.8, cy - R * 0.8); c.lineTo(W * 0.3 + R * 0.8, cy + R * 0.2);
      c.quadraticCurveTo(W * 0.3 + R * 0.8, cy + R, W * 0.3, cy + R); c.quadraticCurveTo(W * 0.3 - R * 0.8, cy + R, W * 0.3 - R * 0.8, cy + R * 0.2); c.fill();
      c.beginPath(); c.moveTo(W * 0.7, cy - R); c.lineTo(W * 0.7 + R * 0.7, cy - R * 0.2); c.lineTo(W * 0.7 + R * 0.25, cy - R * 0.2);
      c.lineTo(W * 0.7 + R * 0.25, cy + R); c.lineTo(W * 0.7 - R * 0.25, cy + R); c.lineTo(W * 0.7 - R * 0.25, cy - R * 0.2); c.lineTo(W * 0.7 - R * 0.7, cy - R * 0.2); c.fill();
    } else {
      switch (Math.floor(r(2) * 5)) {
        case 0: { // a sunset, banded, sinking into the face's foot
          c.beginPath(); c.rect(0, 0, W, H * 0.78); c.clip();
          for (let i = 0; i < 5; i++) { c.fillStyle = P[i % 3]!; c.beginPath(); c.arc(cx, H * 0.78, R * 1.5 - i * R * 0.22, Math.PI, 0); c.fill(); }
          break;
        }
        case 1: { // a palm against a sun
          c.fillStyle = P[1]!; c.beginPath(); c.arc(cx + R * 0.3, cy, R, 0, Math.PI * 2); c.fill();
          c.strokeStyle = ink; c.lineWidth = H * 0.05; c.beginPath(); c.moveTo(cx - R * 0.2, H); c.quadraticCurveTo(cx - R * 0.1, cy, cx + R * 0.1, cy - R * 0.5); c.stroke();
          c.fillStyle = ink;
          for (let i = 0; i < 6; i++) { c.save(); c.translate(cx + R * 0.1, cy - R * 0.5); c.rotate(-Math.PI * 0.9 + (i * Math.PI) / 5.5); c.beginPath(); c.ellipse(R * 0.45, 0, R * 0.5, R * 0.1, 0.25, 0, Math.PI * 2); c.fill(); c.restore(); }
          break;
        }
        case 2: { // a star
          c.fillStyle = P[0]!; c.beginPath();
          for (let i = 0; i < 16; i++) { const ang = (i * Math.PI) / 8 - Math.PI / 2, rr = i % 2 ? R * 0.35 : R; c.lineTo(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr); }
          c.fill();
          break;
        }
        case 3: { // stripes, slanting
          c.translate(W / 2, H / 2); c.rotate(-0.5);
          for (let i = -6; i <= 6; i++) { c.fillStyle = P[(i + 6) % 4]!; c.fillRect(i * H * 0.32, -W, H * 0.16, W * 2); }
          break;
        }
        default: { // a sun over waves
          c.fillStyle = P[0]!; c.beginPath(); c.arc(cx, cy - R * 0.2, R * 0.6, 0, Math.PI * 2); c.fill();
          c.strokeStyle = P[5]!; c.lineWidth = H * 0.06;
          for (let j = 0; j < 2; j++) { c.beginPath(); for (let x = 0; x <= W; x += 8) c.lineTo(x, cy + R * (0.45 + 0.3 * j) + Math.sin(x / (H * 0.12)) * H * 0.05); c.stroke(); }
        }
      }
    }
    c.restore();
  }

  dispose() { this.texture.dispose(); }
}
