// A carrier's face: its phrase, karaoke word by word, in the carrier's own medium. Words not yet sung read clearly
// (the whole phrase is legible as it arrives); sung words go full strength, the one being sung its accent colour:
//   sign/gantry  a light board with a thin border, the phrase in Bodoni italic (unsung dim, sung ink, current accent)
//   road         white stencil capitals on nothing (the asphalt shows through)
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
import { TEXT_SHARE } from './ads';
import { AD_STYLE, drawAd, drawRoute } from '../look/adart';

const CANVAS_W = 1024;
/** Faces that carry poster art until their lyric is revealed. */
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
    case 'road': return { family: F.archivo(75, 900), caps: true, colors: ['#f3f1ea', '#f3f1ea', '#ffd65a'], alpha: [0.62, 0.97] };
    // by day a soft plum shade under the white (it reads on a pale sky and on the buildings), by night a white glow
    case 'sky': {
      const day = daylight(c.phrase.start) > 0.6; // by day heavier, its shade laid twice
      return { family: F.bodoni(day ? 700 : 400, { italic: true }), caps: false, colors: ['#ffffff', '#ffffff', '#ffffff'], alpha: [0, 0.97], glow: day ? 'rgba(54,20,60,0.9)' : 'rgba(255,255,255,0.9)', glowPasses: day ? 2 : 1 };
    }
    case 'wall': return { bg: hexOf(wallColor(c)), family: F.archivo(100, 900), caps: true, colors: [HEX.ink, HEX.ink, HEX.accent], alpha: [0.72, 1] };
    case 'billboard': { // an ad (look/adart.ts draws it), the lyric its headline in its colours
      const a = AD_STYLE[c.ad ?? 'lipstick'];
      return { family: F.archivo(62, 900), caps: true, colors: [a.ink, a.ink, a.now], alpha: [0.72, 1] };
    }
    case 'storefront': return { bg: '#1d3b30', family: F.archivo(100, 700), caps: true, colors: ['#f3ead2', '#f3ead2', '#ffd65a'], alpha: [0.72, 1] };
    case 'neon': return { family: F.bodoni(700, { italic: true }), caps: false, colors: ['#ff4fa3', '#ff4fa3', '#7ff6ff'], alpha: [0.6, 1], glow: 'rgba(255,79,163,0.95)' };
    case 'banner': return { bg: '#f7f4ec', band: '#d23a2a', family: F.archivo(75, 900), caps: true, colors: [HEX.ink, HEX.ink, HEX.accent], alpha: [0.85, 1] };
    case 'tunnel': return { family: F.archivo(100, 900), caps: true, colors: ['#ffcf8a', '#ffb347', '#fff6e8'], alpha: [0.6, 1], glow: 'rgba(255,160,60,0.9)' };
    case 'street': case 'gantry': return { bg: GREEN, border: '#f4f4f0', family: F.archivo(100, 700), caps: false, colors: ['#f4f4f0', '#f4f4f0', '#ffd65a'], alpha: [0.75, 1] };
    default: return { bg: HEX.bg, border: HEX.ink, family: F.bodoni(400, { italic: true }), caps: false, colors: [HEX.ink, HEX.ink, HEX.accent], alpha: [0.62, 1] };
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
    // the board's art, built round its lyric (never fading for it): an ad's product, or a route sign's shield and arrow
    const share = TEXT_SHARE[carrier.kind] ?? 1;
    if (carrier.ad) drawAd(c, carrier.ad, W, H, share, carrier.kind === 'billboard' ? undefined : style.colors[1]);
    else if (carrier.kind === 'street' || carrier.kind === 'gantry') drawRoute(c, W, H, share);
    const TW = W * share; // the lyric's width
    const shown = Math.round(revealAt(carrier, t) * 10) / 10;
    if (shown <= 0) return;
    let em = carrier.em * pxPerM;
    c.font = font(style.family, em);
    const label = (w: Word) => (style.caps ? w.w.toUpperCase() : w.w);
    const widest = Math.max(...carrier.rows.map((r) => c.measureText(r).width));
    if (widest > TW * 0.92) { em *= (TW * 0.92) / widest; c.font = font(style.family, em); }
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
        const big = Math.min((PUNCH.fill * H) / carrier.rows.length, (em * TW * 0.92) / base) * (1 + PUNCH.scale * punchAt(carrier, t));
        c.font = font(style.family, Math.max(em, Math.min(big, (em * TW * 0.98) / base))); // never past the face's edge
      }
      const total = rowWords.reduce((s, w) => s + c.measureText(label(w)).width, 0) + space * (rowWords.length - 1);
      let x = (TW - total) / 2;
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

  dispose() { this.texture.dispose(); }
}
