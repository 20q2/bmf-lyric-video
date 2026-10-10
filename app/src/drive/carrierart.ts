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
// Every face is blank until its reveal (dissolve.ts), its board or wall already standing.
// Laid out as carriers.ts says (rows, em). Redrawn only when its karaoke key changes. Browser only (canvas).
import * as THREE from 'three';
import type { Word } from '../engine/lyrics';
import { HEX } from '../engine/palette';
import { hash } from '../engine/util';
import { F, font } from '../engine/type';
import type { Carrier } from './carriers';
import { dissolveAt, revealAt } from './dissolve';

const CANVAS_W = 1024;


/** The karaoke state of a phrase at t: how many words have started, and which is being sung (-1: none). */
export function karaokeKey(words: readonly Word[], t: number): string {
  let started = 0, current = -1;
  words.forEach((w, i) => { if (t >= w.start) started = i + 1; if (t >= w.start && t < w.end) current = i; });
  return `${started}:${current}`;
}

/** The colour of the building a face is on (seeded per carrier; neon's wall is dark). */
export const wallColor = (c: Carrier) => c.kind === 'neon'
  ? new THREE.Color().setHSL(0.75 + 0.1 * hash(c.phrase.start, 9), 0.25, 0.22)
  : new THREE.Color().setHSL(0.02 + 0.12 * hash(c.phrase.start, 9), 0.35, 0.62);
const hexOf = (c: THREE.Color) => `#${c.getHexString(THREE.SRGBColorSpace)}`;
const GREEN = '#1f6b44';

interface Style { bg?: string; border?: string; band?: string; family: string; caps: boolean; colors: [unsung: string, sung: string, now: string]; alpha: [unsung: number, sung: number]; glow?: string }
function styleOf(c: Carrier): Style {
  switch (c.kind) {
    case 'road': return { family: F.archivo(75, 900), caps: true, colors: ['#f3f1ea', '#f3f1ea', '#ffd65a'], alpha: [0.18, 0.95] };
    case 'sky': return { family: F.bodoni(400, { italic: true }), caps: false, colors: ['#ffffff', '#ffffff', '#ffffff'], alpha: [0, 0.95], glow: 'rgba(255,255,255,0.9)' };
    case 'wall': return { bg: hexOf(wallColor(c)), family: F.archivo(100, 900), caps: true, colors: [HEX.ink, HEX.ink, HEX.accent], alpha: [0.22, 1] };
    case 'billboard': return { bg: '#fbf8f0', band: HEX.accent, family: F.archivo(62, 900), caps: true, colors: [HEX.ink, HEX.ink, HEX.accent], alpha: [0.25, 1] };
    case 'storefront': return { bg: '#1d3b30', family: F.archivo(100, 700), caps: true, colors: ['#f3ead2', '#f3ead2', '#ffd65a'], alpha: [0.3, 1] };
    case 'neon': return { family: F.bodoni(700, { italic: true }), caps: false, colors: ['#ff4fa3', '#ff4fa3', '#7ff6ff'], alpha: [0.3, 1], glow: 'rgba(255,79,163,0.95)' };
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
    const key = `${karaokeKey(this.carrier.phrase.words, t)}:${Math.round(dissolveAt(this.carrier, t) * 20)}:${Math.round(revealAt(this.carrier, t) * 10)}`;
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
    if (shown <= 0) return;
    let em = carrier.em * pxPerM;
    c.font = font(style.family, em);
    const label = (w: Word) => (style.caps ? w.w.toUpperCase() : w.w);
    const widest = Math.max(...carrier.rows.map((r) => c.measureText(r).width));
    if (widest > W * 0.92) { em *= (W * 0.92) / widest; c.font = font(style.family, em); }
    c.textBaseline = 'middle';
    const gone = Math.round(dissolveAt(carrier, t) * 20) / 20;
    if (gone >= 1) return;
    if (style.glow) { c.shadowColor = style.glow; c.shadowBlur = em * (0.15 + 0.6 * gone); }
    const words = carrier.phrase.words, space = c.measureText(' ').width;
    let wi = 0;
    carrier.rows.forEach((row, r) => {
      const n = row.split(' ').length, rowWords = words.slice(wi, wi + n);
      wi += n;
      const total = rowWords.reduce((s, w) => s + c.measureText(label(w)).width, 0) + space * (rowWords.length - 1);
      let x = (W - total) / 2;
      const y = (H * (r + 0.5)) / carrier.rows.length;
      for (const w of rowWords) {
        const sung = t >= w.start, now = sung && t < w.end;
        c.fillStyle = style.colors[now ? 2 : sung ? 1 : 0];
        c.globalAlpha = style.alpha[sung ? 1 : 0] * (1 - gone) * shown;
        // dissolving: the letters drift apart and up, a little more each word along
        c.fillText(label(w), x + gone * em * 0.8 * (x / W - 0.5) * 4, y - gone * em * 0.6);
        x += c.measureText(label(w)).width + space;
      }
    });
    c.globalAlpha = 1;
    c.shadowBlur = 0;
  }

  dispose() { this.texture.dispose(); }
}
