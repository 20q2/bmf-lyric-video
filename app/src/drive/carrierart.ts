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
// and the set-pieces' surfaces, each in its own medium: a speed trailer's amber LEDs, a bus's tail ad (its ad is the
// prop's), her lipstick on her visor's mirror, stickers, a California plate, her phone's message bubbles, the radio's cyan display, a menu board with its
// prices, a burger stand's marquee in changeable letters; his posters on the freeway's wall, its big sign's panels;
// a fried chicken spot's pole sign lightbox, chalk A-frames, painted windows, vinyl banner and roof sign; a hand car
// wash's ad (its words left-aligned, the suds the prop's), their car's windshield banner and its hood's airbrushed
// lettering, and his giant mural's words (the mural is the prop's).
// Every face is blank until its reveal (dissolve.ts), its board or wall already standing. A word of emphasis
// (Phrase.solo) on its own row is set as big as its row allows, and punches up as it's sung (PUNCH).
// And the barbershop's windows, its lyric in gold leaf on the glass.
// Laid out as carriers.ts says (rows, em). Redrawn only when its karaoke key changes. Browser only (canvas).
import * as THREE from 'three';
import type { Word } from '../engine/lyrics';
import { HEX } from '../engine/palette';
import { hash } from '../engine/util';
import { WORLD } from '../look/toon';
import { F, font } from '../engine/type';
import type { Carrier } from './carriers';
import { STALE, dissolveAt, revealAt, staleAt } from './dissolve';
import { daylight } from './sky';
import { BRAND, TEXT_SHARE } from './ads';
import { AD_STYLE, drawAd, drawRoute } from '../look/adart';

const CANVAS_W = 1024;
/** Boards that show their ad's copy — or their own in-world copy (OWN_COPY) — until their lyric flips in (tri-vision:
 *  FLIP.slats slats, turning in a wave). A lit board that is simply blank reads as a bug, not anticipation. */
const COPY: ReadonlySet<Carrier['kind']> = new Set(['billboard', 'poster', 'sign', 'storefront', 'street', 'gantry', 'freeway', 'marquee', 'roofsign', 'vinyl', 'tunnelsign']);
/** What a set-piece's board says before its lyric comes (its own words, in the signs' face: never the song's). */
const OWN_COPY: Partial<Record<Carrier['kind'], [string, string]>> = {
  freeway: ['NORTH', '5'],
  marquee: ['OPEN LATE', ''],
  roofsign: ['CHICKEN', 'DINNERS'],
  vinyl: ['GRAND OPENING', ''],
  tunnelsign: ['THE STRIP', 'AHEAD'],
};
export const FLIP = { slats: 10, stagger: 0.6, steps: 12 };
/** The word of emphasis's row takes this many shares of its face's height (the others one each). */
const SOLO_ROW = 1.45;
/** The word of emphasis is never more than this many times its companions' size (they stay readable beside it). */
const SOLO_MAX = 1.6;
/** Faces that carry poster art until their lyric is revealed. */
/** A word of emphasis punches up this much as it's sung, settling over `over` s; it fills this share of its row. */
export const PUNCH = { scale: 0.2, over: 0.3, fill: 0.9 };
/** The word dropping drops as it's sung: falling down its row and landing tilted, with a bounce. */
export const FALL = { depth: 0.42, fallS: 0.28, tilt: 0.2 };
function fallAt(w: Word, t: number, rowPx: number): { dy: number; tilt: number } | null {
  if (!/^dropping/i.test(w.w) || t < w.start) return null;
  const tau = t - w.start, u = Math.min(1, tau / FALL.fallS);
  const bounce = tau > FALL.fallS ? 0.12 * Math.exp(-(tau - FALL.fallS) * 9) * Math.sin((tau - FALL.fallS) * 30) : 0;
  return { dy: rowPx * FALL.depth * (u * u - bounce), tilt: FALL.tilt * u };
}
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
/** Bumper stickers: [paper, ink, the word being sung]. */
const STICKERS: readonly [string, string, string][] = [['#f4f0e6', '#16131a', '#d81e2c'], ['#16131a', '#f4f0e6', '#ffd65a'], ['#ffd65a', '#16131a', '#d81e2c'], ['#d81e2c', '#ffffff', '#ffd65a']];

interface Style { bg?: string; border?: string; band?: string; family: string; caps: boolean; colors: [unsung: string, sung: string, now: string]; alpha: [unsung: number, sung: number]; glow?: string; glowPasses?: number; tubes?: boolean; bubble?: string; outline?: string; shadow?: string; /** Its rows set flush left (an ad's copy). */ align?: 'left'; /** Chalk: each letter a little uneven. */ roughen?: boolean; /** Ransom-note lettering: each letter its own pasted scrap, seeded. */ ransom?: boolean; /** The words as constellations: stars along the letters' strokes (the outro's night sky). */ stars?: boolean }
function styleOf(c: Carrier): Style {
  switch (c.kind) {
    case 'road': return { family: F.archivo(75, 900), caps: true, colors: ['#f3f1ea', '#f3f1ea', '#ffd65a'], alpha: [0.62, 0.97] };
    // by day a soft plum shade under the white (it reads on a pale sky and on the buildings), by night a white glow
    case 'sky': {
      // (a heavy italic sans: smoke letters, sturdy at a distance where a Didone's hairlines drop out); by day its shade
      // laid twice, by night a glow — and at full night (the outro) the words are written in stars, a constellation
      const light = daylight(c.phrase.start), day = light > 0.6;
      // (by day a hard plum drop shadow besides the shade: white script on a pale sky needs an edge to read on a phone)
      return { family: F.archivoItalic(100, 800), caps: false, colors: ['#ffffff', '#ffffff', '#ffffff'], alpha: [0, 0.97], glow: day ? 'rgba(54,20,60,0.9)' : 'rgba(255,255,255,0.9)', glowPasses: day ? 3 : 1, shadow: day ? 'rgba(46,16,52,0.75)' : undefined, stars: light < 0.35 };
    }
    case 'billboard': case 'poster': { // an ad (look/adart.ts draws it), the lyric its headline in its colours
      // (the word being sung: warm yellow on a dark ad, red on a light one — one rule across the film)
      const a = AD_STYLE[c.ad ?? 'lipstick'], dark = new THREE.Color(a.bg).getHSL({ h: 0, s: 0, l: 0 }).l < 0.4;
      return { family: F.archivo(62, 900), caps: true, colors: [a.ink, a.ink, dark ? '#ffd65a' : '#d81e2c'], alpha: [0.72, 1] };
    }
    case 'storefront': return { bg: '#1d3b30', family: F.archivo(100, 700), caps: true, colors: ['#f3ead2', '#f3ead2', '#ffd65a'], alpha: [0.72, 1] };
    case 'neon': return { family: F.bodoni(700, { italic: true }), caps: false, colors: ['#ff4fa3', '#ff4fa3', '#fff1a0'], alpha: [0.6, 1], glow: 'rgba(255,79,163,0.95)', tubes: true };
    case 'banner': return { bg: '#f7f4ec', band: '#d23a2a', family: F.archivo(75, 900), caps: true, colors: [HEX.ink, HEX.ink, HEX.accent], alpha: [0.85, 1] };
    case 'hill': return { family: F.archivo(100, 900), caps: true, colors: ['#fbf7ee', '#fbf7ee', '#ffd65a'], alpha: [0.62, 1] };
    case 'tunnel': return c.phrase.line % 2 // (the lines in turn: sodium orange, then cold cyan)
      ? { family: F.archivo(100, 900), caps: true, colors: ['#bff4ff', '#7fe6ff', '#ffffff'], alpha: [0.6, 1], glow: 'rgba(80,220,255,0.9)', tubes: true }
      : { family: F.archivo(100, 900), caps: true, colors: ['#ffcf8a', '#ffb347', '#fff6e8'], alpha: [0.6, 1], glow: 'rgba(255,160,60,0.9)', tubes: true };
    case 'barber': return { family: F.archivo(100, 900), caps: true, colors: ['#e9c46a', '#ffd76a', '#fff6d8'], alpha: [0.8, 1], outline: '#3a2408', shadow: '#120b04' }; // gold leaf on the glass
    case 'speed': return { bg: '#0e0d10', family: F.mono(700), caps: true, colors: ['#ffb000', '#ffb000', '#fff3c4'], alpha: [0.5, 1], glow: 'rgba(255,170,0,0.85)' };
    case 'bus': { // (the word being sung by the ad's own lightness, like the billboards: red drowns on a dark ad)
      const a = AD_STYLE[c.ad ?? 'phone'], dark = new THREE.Color(a.bg).getHSL({ h: 0, s: 0, l: 0 }).l < 0.4;
      return { family: F.archivo(62, 900), caps: true, colors: [a.ink, a.ink, dark ? '#ffd65a' : '#d81e2c'], alpha: [0.72, 1] };
    }
    case 'sticker': { // (each its own: cream, black, yellow or red)
      const [bg, ink, now] = STICKERS[Math.floor(hash(c.phrase.start, 21) * STICKERS.length)]!;
      return { bg, border: ink, family: F.archivo(75, 900), caps: true, colors: [ink, ink, now], alpha: [0.75, 1] };
    }
    case 'plate': return { bg: '#f2f1ea', border: '#1b2a6b', family: F.archivo(62, 700), caps: true, colors: ['#1b2a6b', '#1b2a6b', '#d81e2c'], alpha: [0.8, 1] };
    case 'radio': return { bg: '#04080a', family: F.mono(600), caps: true, colors: ['#5fd8ff', '#5fd8ff', '#ffffff'], alpha: [0.55, 1], glow: 'rgba(80,220,255,0.7)' };
    case 'menu': return { bg: '#1b1714', family: F.archivo(75, 900), caps: true, colors: ['#fff1d0', '#fff1d0', '#ffd65a'], alpha: [0.75, 1] };
    case 'mirror': return { family: F.bodoni(700, { italic: true }), caps: false, colors: ['#e8173a', '#e8173a', '#ff3054'], alpha: [0.78, 1], shadow: 'rgba(90,0,20,0.5)' }; // (lipstick on the glass: bright enough to read over the reflection)
    case 'phone': return { bg: '#0b0b10', bubble: '#2f7cf6', family: F.archivo(100, 500), caps: false, colors: ['#ffffff', '#ffffff', '#ffd65a'], alpha: [0.75, 1] };
    case 'marquee': return { bg: '#f8f4e8', family: F.archivo(62, 900), caps: true, colors: ['#141218', '#141218', '#d81e2c'], alpha: [0.72, 1] };
    case 'polesign': return { bg: '#fbf7ee', family: F.archivo(100, 900), caps: true, colors: ['#c8102e', '#c8102e', '#141218'], alpha: [0.72, 1] };
    case 'aframe': return { bg: '#1f2b26', border: '#3c4a43', family: F.archivo(87, 800), caps: true, colors: ['#f3efe6', '#f3efe6', '#ffd65a'], alpha: [0.7, 0.95], roughen: true }; // chalk
    case 'window': return { family: F.archivo(100, 900), caps: true, colors: ['#ffffff', '#ffffff', '#ffd65a'], alpha: [0.82, 1], outline: '#c8102e', shadow: '#5a0614' }; // painted on the glass
    case 'vinyl': return { bg: '#c8202e', border: '#ffffff', family: F.archivo(100, 900), caps: true, colors: ['#ffffff', '#ffffff', '#ffd65a'], alpha: [0.75, 1] };
    case 'roofsign': return { bg: '#ffd65a', border: '#c8202e', family: F.archivo(100, 900), caps: true, colors: ['#c8102e', '#c8102e', '#141218'], alpha: [0.72, 1] };
    case 'carwash': return { family: F.archivo(100, 900), caps: true, colors: ['#ffffff', '#ffffff', '#ff3043'], alpha: [0.75, 1], outline: '#0b3a66', align: 'left' }; // (on the prop's board; the hero word red: yellow sinks into the pale blue)
    case 'visor': return { bg: '#0e0d10', family: F.bodoni(700, { italic: true }), caps: false, colors: ['#f4f4f0', '#f4f4f0', '#ffd65a'], alpha: [0.7, 1] };
    case 'hood': return { family: F.archivoItalic(100, 800), caps: true, colors: ['#ffd65a', '#ffd65a', '#ffffff'], alpha: [0.75, 1], outline: '#5a0614', shadow: '#2a0309' };
    case 'giant': return { family: F.archivo(62, 900), caps: true, colors: [AD_STYLE.him.ink, AD_STYLE.him.ink, '#c8102e'], alpha: [0.72, 1] };
    case 'arch': return { bg: '#f6edd6', border: '#2b4a66', family: F.archivo(100, 900), caps: true, colors: ['#2b4a66', '#2b4a66', '#d81e2c'], alpha: [0.75, 1] }; // the beach town's band
    case 'tunnelsign': return { bg: '#0b0d12', border: '#454b58', family: F.archivo(100, 800), caps: true, colors: ['#ffe2a8', '#ffd98a', '#ffffff'], alpha: [0.6, 1], glow: 'rgba(255,180,80,0.85)' }; // a lit box in the bore
    case 'freeway': return { bg: GREEN, border: '#f4f4f0', family: F.archivo(100, 700), caps: false, colors: ['#f4f4f0', '#f4f4f0', '#ffd65a'], alpha: [0.75, 1] };
    case 'street': case 'gantry': return c.kind === 'gantry' && c.stretch === 'chorus4'
      // the hijacked sign: the route's shield stays, the words pasted over it in ransom-note scraps
      ? { bg: GREEN, border: '#f4f4f0', family: F.archivo(100, 900), caps: true, colors: ['#16131a', '#16131a', '#d81e2c'], alpha: [0.8, 1], ransom: true }
      : { bg: GREEN, border: '#f4f4f0', family: F.archivo(100, 700), caps: false, colors: ['#f4f4f0', '#f4f4f0', '#ffd65a'], alpha: [0.75, 1] };
    default: return { bg: HEX.bg, border: HEX.ink, family: F.bodoni(700, { italic: true }), caps: false, colors: [HEX.ink, HEX.ink, HEX.accent], alpha: [0.62, 1] };
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
    const falling = this.carrier.phrase.words.some((w) => /^dropping/i.test(w.w) && t >= w.start && t < w.start + 0.8);
    const key = `${karaokeKey(this.carrier.phrase.words, t)}:${Math.round(dissolveAt(this.carrier, t) * 20)}:${Math.round(revealAt(this.carrier, t) * FLIP.steps)}:${Math.round(punchAt(this.carrier, t) * 10)}:${falling ? Math.round(t * 30) : 0}:${Math.round(staleAt(this.carrier, t) * 8)}`;
    if (key === this.key) return;
    this.key = key;
    this.draw(t);
    this.texture.needsUpdate = true;
  }

  private draw(t: number) {
    const { c, canvas, carrier, style } = this, W = canvas.width, H = canvas.height;
    c.clearRect(0, 0, W, H);
    if (style.bg) { c.fillStyle = style.bg; c.fillRect(0, 0, W, H); }
    if (style.border) { c.strokeStyle = style.border; c.lineWidth = 6; c.strokeRect(10, 10, W - 20, H - 20); }
    if (style.band) { c.fillStyle = style.band; c.fillRect(0, H * 0.9, W, H * 0.1); }
    // the board's art, built round its lyric (never fading for it): an ad's product, or a route sign's shield and arrow
    const share = TEXT_SHARE[carrier.kind] ?? 1;
    // (a bus's ad is the bus's: its rows are the headline over it)
    if (carrier.ad && carrier.kind !== 'bus' && carrier.kind !== 'giant') drawAd(c, carrier.ad, W, H, share, carrier.kind === 'billboard' || carrier.kind === 'poster' ? undefined : style.colors[1]);
    else if (carrier.kind === 'street' || carrier.kind === 'gantry') drawRoute(c, W, H, share);
    // (a price only once its item's words are coming in: a price beside a blank line reads as a bug)
    else if (carrier.kind === 'menu' && revealAt(carrier, t) > 0) this.drawPrices(c, share);
    else if (carrier.kind === 'plate') { c.fillStyle = '#c8102e'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = font(F.bodoni(700, { italic: true }), H * 0.17); c.fillText('California', W / 2, H * 0.15); c.textAlign = 'left'; }
    const TW = W * share; // the lyric's width
    const shown = Math.round(revealAt(carrier, t) * FLIP.steps) / FLIP.steps;
    if (!COPY.has(carrier.kind)) { if (shown > 0) this.drawWords(c, t, TW, shown); return; }
    // a board shows its ad's own copy (its maker, its line) until its lyric comes; then it flips like a tri-vision
    // board, slat by slat, from the copy to the words
    if (shown >= 1) { this.drawWords(c, t, TW, 1); return; }
    const before = this.layer('before'), after = this.layer('after');
    this.drawCopy(before.getContext('2d')!, TW);
    const ac = after.getContext('2d')!;
    ac.clearRect(0, 0, W, H);
    if (shown > 0) this.drawWords(ac, t, TW, 1);
    for (let i = 0; i < FLIP.slats; i++) {
      const p = Math.min(1, Math.max(0, shown * (1 + FLIP.stagger) - (i / FLIP.slats) * FLIP.stagger));
      const src = p < 0.5 ? before : after, squash = Math.abs(Math.cos(Math.PI * p)), sw = TW / FLIP.slats, sx = i * sw;
      if (squash < 0.02) continue;
      c.drawImage(src, sx, 0, sw, H, sx + (sw * (1 - squash)) / 2, 0, sw * squash, H);
    }
  }

  /** A menu board's prices, one a row, right of its items (the board's own copy, in its own face). */
  private drawPrices(c: CanvasRenderingContext2D, share: number) {
    const { canvas, carrier } = this, W = canvas.width, H = canvas.height, n = carrier.rows.length;
    c.fillStyle = '#ffd65a'; c.textAlign = 'right'; c.textBaseline = 'middle'; c.font = font(F.sign(500), (H / n) * 0.42);
    carrier.rows.forEach((_, r) => c.fillText(`$${(2.49 + Math.floor(hash(carrier.phrase.start, 30 + r) * 6) + 0.5 * Math.floor(hash(carrier.phrase.start, 40 + r) * 2)).toFixed(2)}`, W * 0.97, (H * (r + 0.5)) / n, W * (1 - share) * 0.9));
    c.textAlign = 'left';
  }

  private layers: Record<string, HTMLCanvasElement> = {};
  private layer(name: string) {
    const l = (this.layers[name] ??= document.createElement('canvas'));
    if (l.width !== this.canvas.width || l.height !== this.canvas.height) { l.width = this.canvas.width; l.height = this.canvas.height; }
    return l;
  }

  /** The ad's own copy where its headline will go: its maker in capitals, its line under it; a set-piece's board its
   *  own in-world words (OWN_COPY: a gantry's control city, a marquee's OPEN LATE); a route sign has none beyond its
   *  shield and arrow. */
  private drawCopy(c: CanvasRenderingContext2D, TW: number) {
    const { canvas, carrier, style } = this, W = canvas.width, H = canvas.height;
    c.clearRect(0, 0, W, H);
    let own = OWN_COPY[carrier.kind];
    // (the freeway's three panels are a real gantry until the words come: control cities, not one sign thrice; a
    // stacked board's copy goes on its top row only, or OPEN LATE repeats down the box)
    if (carrier.kind === 'freeway') own = ([['LOS ANGELES', ''], ['SLAUSON AV', '1 MILE'], ['NORTH', '5']] as [string, string][])[+(carrier.id.split('.')[1] ?? 0) % 3];
    else if (own && !carrier.id.endsWith('.0')) own = undefined;
    if (own && !carrier.ad) {
      const [top, under] = own;
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = style.colors[1];
      const big = Math.min(H * (under ? 0.3 : 0.4), (TW * 0.8) / Math.max(4, top.length * 0.58));
      c.font = font(F.sign(600), big); c.fillText(top, TW / 2, under ? H * 0.38 : H * 0.5, TW * 0.88);
      if (under) { c.font = font(F.sign(600), big * 0.9); c.fillText(under, TW / 2, H * 0.72, TW * 0.88); }
      c.textAlign = 'left';
      return;
    }
    if (!carrier.ad) return;
    const [brand, line] = BRAND[carrier.ad];
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = style.colors[1];
    const big = Math.min(H * 0.34, (TW * 0.8) / Math.max(4, brand.length * 0.58));
    c.font = font(F.sign(600), big * 0.9); c.fillText(brand, TW / 2, H * 0.44, TW * 0.86);
    c.globalAlpha = 0.8; c.font = font(F.sign(400), big * 0.4); c.fillText(line, TW / 2, H * 0.44 + big * 0.72, TW * 0.86);
    c.globalAlpha = 1; c.textAlign = 'left';
  }

  /** The phrase, karaoke word by word, at `alpha` (its reveal for faces without copy). */
  private drawWords(c: CanvasRenderingContext2D, t: number, TW: number, alpha: number) {
    alpha *= 1 - (1 - STALE.to) * Math.round(staleAt(this.carrier, t) * 8) / 8; // (sung and read: dimmed back)
    const { canvas, carrier, style } = this, W = canvas.width, H = canvas.height, pxPerM = W / carrier.w;
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
    // rows share the face's height, the word of emphasis's row a bigger share
    const soloRow = carrier.phrase.solo === 'first' ? 0 : carrier.phrase.solo === 'last' ? carrier.rows.length - 1 : -1;
    const weights = carrier.rows.map((_, r) => (r === soloRow ? SOLO_ROW : 1)), sum = weights.reduce((a, b) => a + b, 0);
    if (style.tubes) { // neon on its backplates: a dark rounded plate behind each row, its mounting
      c.save(); c.shadowBlur = 0; c.globalAlpha = 0.55 * alpha; c.fillStyle = '#120a14';
      let y0 = 0;
      carrier.rows.forEach((row, r) => {
        const rh = (H * weights[r]!) / sum, wd = Math.min(TW * 0.96, c.measureText(row).width + em * 0.8);
        c.beginPath(); c.roundRect((TW - wd) / 2, y0 + rh * 0.12, wd, rh * 0.76, rh * 0.18); c.fill();
        y0 += rh;
      });
      c.restore();
    }
    // the word of emphasis, alone on its row: bigger (up to SOLO_MAX x its companions), punching up by `punch`
    const soloSize = (word: string, rowH: number, punch: number) => {
      const base = c.measureText(word).width, big = Math.min(PUNCH.fill * rowH, (em * TW * 0.92) / base, em * SOLO_MAX) * (1 + PUNCH.scale * punch);
      return Math.max(em, Math.min(big, (em * TW * 0.98) / base)); // never past the face's edge
    };
    // a sent text: the phrase is one message, its bubble on the right, its rows left-aligned in it (sized as settled,
    // so the bubble holds still while the word of emphasis punches)
    let bubbleX = 0;
    if (style.bubble) {
      const widths = carrier.rows.map((row, r) => {
        if (r !== soloRow) return c.measureText(row).width;
        c.font = font(style.family, soloSize(row, (H * weights[r]!) / sum, 0));
        const w = c.measureText(row).width; c.font = font(style.family, em); return w;
      });
      const pad = em * 0.55, bw = Math.max(...widths) + 2 * pad;
      bubbleX = TW * 0.96 - bw + pad;
      c.save(); c.shadowBlur = 0; c.globalAlpha = alpha; c.fillStyle = style.bubble;
      c.beginPath(); c.roundRect(TW * 0.96 - bw, H * 0.07, bw, H * 0.86, Math.min(H * 0.43, em * 0.9)); c.fill(); c.restore();
    }
    let wi = 0, top = 0;
    carrier.rows.forEach((row, r) => {
      const n = row.split(' ').length, rowWords = words.slice(wi, wi + n), rowH = (H * weights[r]!) / sum;
      wi += n;
      const y = top + rowH / 2;
      top += rowH;
      // (the word of emphasis in the accent colour, punching up as it's sung)
      const solo = r === soloRow;
      if (solo) c.font = font(style.family, soloSize(label(rowWords[0]!), rowH, punchAt(carrier, t)));
      const total = rowWords.reduce((s, w) => s + c.measureText(label(w)).width, 0) + space * (rowWords.length - 1);
      let x = style.bubble ? bubbleX : style.align === 'left' ? TW * 0.04 : (TW - total) / 2;
      for (const w of rowWords) {
        const sung = t >= w.start, now = sung && t < w.end;
        c.fillStyle = solo || now ? style.colors[2] : style.colors[sung ? 1 : 0];
        c.globalAlpha = (solo ? 1 : style.alpha[sung ? 1 : 0]) * (1 - gone) * alpha;
        if (style.ransom) { // each letter its own pasted scrap (the word being sung tilts a touch more)
          x += this.drawRansom(c, label(w), x, y, em * 0.74, now) + space * 1.5;
          continue;
        }
        // dissolving: the letters drift apart and up, a little more each word along
        const fall = fallAt(w, t, rowH);
        if (fall) { c.save(); c.translate(x, y + fall.dy); c.rotate(fall.tilt); }
        const [fx, fy] = fall ? [0, 0] : [x + gone * em * 0.8 * (x / W - 0.5) * 4, y - gone * em * 0.6];
        if (style.stars) { // the word as a constellation: stars sampled along its strokes
          x += this.drawConstellation(c, label(w), fx, fy, em, now) + space;
          if (fall) c.restore();
          continue;
        }
        if (style.tubes) { // neon: the tube's brighter core line over its glow
          c.save(); c.lineWidth = Math.max(2, em * 0.035); c.strokeStyle = 'rgba(255,255,255,0.75)'; c.strokeText(label(w), fx, fy); c.restore();
        }
        if (style.shadow) { // a sign painter's drop shadow, down and right, and an outline round the letters
          c.save(); c.shadowBlur = 0; c.fillStyle = style.shadow; c.fillText(label(w), fx + em * 0.07, fy + em * 0.07); c.restore();
        }
        if (style.outline) { c.save(); c.lineWidth = em * 0.12; c.lineJoin = 'round'; c.strokeStyle = style.outline; c.strokeText(label(w), fx, fy); c.restore(); }
        for (let k = 0; k < (style.glowPasses ?? 1); k++) c.fillText(label(w), fx, fy);
        if (style.roughen && style.bg) { // chalk: flecks of the board showing through its strokes
          const ww = c.measureText(label(w)).width;
          c.save(); c.globalAlpha = 0.55; c.fillStyle = style.bg;
          for (let k = 0; k < 40; k++) c.fillRect(fx + hash(w.gi, k, 1) * ww, fy + (hash(w.gi, k, 2) - 0.5) * em * 0.8, em * 0.05, em * 0.02);
          c.restore();
        }
        if (fall) c.restore();
        x += c.measureText(label(w)).width + space;
      }
      if (solo) c.font = font(style.family, em);
    });
    c.globalAlpha = 1;
    c.shadowBlur = 0;
  }

  /** A word written in stars: a faint ghost of the letterform (star dust, so the word reads), then the word's strokes
   *  sampled on a grid with a four-point star at each sample (seeded sizes, the current fillStyle and alpha).
   *  Returns the word's advance (px). */
  private drawConstellation(c: CanvasRenderingContext2D, word: string, fx: number, fy: number, em: number, now: boolean): number {
    c.font = font(this.style.family, em);
    const wd = c.measureText(word).width;
    const ink = c.fillStyle as string, alpha = c.globalAlpha;
    // the ghost: the letterform itself, dim — without it the stars are sparkle clumps, not words
    c.save();
    c.globalAlpha = alpha * 0.26;
    c.shadowColor = 'rgba(255,255,255,0.5)'; c.shadowBlur = em * 0.12;
    c.fillStyle = ink;
    c.fillText(word, fx, fy);
    c.restore();
    // rasterise the word on a scratch layer, downsampled for cheap reads
    const K = 4, raster = this.layer('stars'), rc = raster.getContext('2d')!;
    const rw = Math.max(2, Math.ceil(wd / K)), rh = Math.max(2, Math.ceil(em * 1.4 / K));
    rc.clearRect(0, 0, rw + 2, rh + 2);
    rc.font = font(this.style.family, em / K);
    rc.textBaseline = 'middle'; rc.textAlign = 'left';
    rc.fillStyle = '#fff';
    rc.fillText(word, 0, rh / 2);
    const img = rc.getImageData(0, 0, rw, rh).data;
    c.save();
    c.shadowColor = 'rgba(255,255,255,0.9)';
    const step = Math.max(1, Math.round(em * 0.095 / K));
    for (let gy = 0; gy < rh; gy += step) for (let gx = 0; gx < rw; gx += step) {
      if (img[(gy * rw + gx) * 4 + 3]! < 128) continue;
      const seed = gx * 131 + gy * 29 + word.length;
      const px = fx + gx * K + (hash(seed, 1) - 0.5) * em * 0.04, py = fy - em * 0.7 + gy * K + (hash(seed, 2) - 0.5) * em * 0.04;
      const r = em * (0.04 + 0.06 * hash(seed, 3)) * (now ? 1.35 : 1);
      c.globalAlpha = alpha * (0.7 + 0.3 * hash(seed, 4));
      c.fillStyle = ink;
      c.shadowBlur = r * 2.2;
      c.beginPath();
      c.moveTo(px, py - r * 2); c.quadraticCurveTo(px, py, px + r * 2, py); c.quadraticCurveTo(px, py, px, py + r * 2); c.quadraticCurveTo(px, py, px - r * 2, py); c.quadraticCurveTo(px, py, px, py - r * 2);
      c.fill();
    }
    c.restore();
    return wd;
  }

  /** A word in ransom-note letters: each its own scrap of paper (seeded colour, face, size, tilt), the ink in the
   *  current fillStyle/alpha. Returns the word's advance (px). */
  private drawRansom(c: CanvasRenderingContext2D, word: string, x: number, y: number, em: number, now: boolean): number {
    const scraps = ['#f4f0e6', '#ffd65a', '#ffffff', '#f4b6c2'];
    const faces = [F.archivo(100, 900), F.bodoni(700, { italic: true }), F.mono(700)];
    const ink = c.fillStyle as string, alpha = c.globalAlpha;
    let dx = 0;
    for (let i = 0; i < word.length; i++) {
      const seed = word.charCodeAt(i) * 31 + i * 7 + word.length;
      const size = em * (0.78 + 0.42 * hash(seed, 1)) * (now ? 1.08 : 1);
      const tilt = (hash(seed, 2) - 0.5) * 0.26, lift = (hash(seed, 3) - 0.5) * em * 0.18;
      c.save();
      c.font = font(faces[Math.floor(hash(seed, 4) * faces.length)]!, size);
      const wd = c.measureText(word[i]!).width, scrapW = Math.max(wd + size * 0.2, size * 0.5); // (an I's scrap stays a scrap)
      c.translate(x + dx + wd / 2, y + lift);
      c.rotate(tilt);
      c.globalAlpha = alpha;
      c.fillStyle = scraps[Math.floor(hash(seed, 5) * scraps.length)]!;
      c.fillRect(-scrapW / 2, -size * 0.62, scrapW, size * 1.22);
      c.fillStyle = ink;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(word[i]!, 0, size * 0.02);
      c.restore();
      dx += wd + em * 0.07;
    }
    return dx;
  }

  dispose() { this.texture.dispose(); }
}
