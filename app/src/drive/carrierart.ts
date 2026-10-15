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
//   tunnel       a graffiti piece sprayed on the tunnel's tiles (a handstyle, a cloud, a 3D block, drips), the word
//                being sung a yellow fade; lit by the bore's lamps like the tiles (world.ts), their grout and grime through it
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
import { TILE_REPEAT, drawTiles } from './tunnel';
import { daylight } from './sky';
import { BRAND, TEXT_SHARE } from './ads';
import { AD_STYLE, drawAd, drawRoute } from '../look/adart';

const CANVAS_W = 1024;
/** The bore's tiles drawn white (made once, for paint on them). */
let tileMap: HTMLCanvasElement | undefined;
/** The hill sign's canvas is wider: it's the end's view, held for seconds, its letters bigger on screen than its
 *  texels at 1024. */
const HILL_CANVAS_W = 2048;
/** Boards that show their ad's copy — or their own in-world copy (OWN_COPY) — until their lyric flips in (tri-vision:
 *  FLIP.slats slats, turning in a wave). A lit board that is simply blank reads as a bug, not anticipation. */
const COPY: ReadonlySet<Carrier['kind']> = new Set(['billboard', 'poster', 'sign', 'storefront', 'street', 'gantry', 'freeway', 'marquee', 'roofsign', 'vinyl', 'tunnelsign']);
/** What a set-piece's board says before its lyric comes (its own words, in the signs' face: never the song's). */
const OWN_COPY: Partial<Record<Carrier['kind'], [string, string]>> = {
  freeway: ['NORTH', '5'],
  marquee: ['OPEN LATE', ''],
  roofsign: ['CHICKEN', 'DINNERS'],
  vinyl: ['GRAND RE-OPENING', ''],
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
/** The tunnel's graffiti (drawGraffiti), in em of its row: letters jittered in size (± size/2), tilt (± tilt/2 rad)
 *  and step (± step/2), a row's first letter `first` x, crowding each other by `track`, a row's slant (± slant/2);
 *  the cap height `rowFill` of its row, the row at most `wide` of the face; the strokes' widths (cloud, outline, the
 *  letters fattened by `fat`), the 3D block `steps` coats `depth` apart, the shine's offset, the share of letters that
 *  drip; the piece sits `drop` of the face low (clear of the strip lights over it). */
const GRAFFITI = { size: 0.1, tilt: 0.14, step: 0.08, first: 1.14, track: -0.01, slant: 0.08, rowFill: 0.44, wide: 0.74, cloud: 0.34, outline: 0.11, fat: 0.025, steps: 7, depth: 0.016, shine: 0.025, drips: 0.4, drop: 0.14 };
/** The word dropping drops as it's sung: falling down its row and landing tilted, with a bounce. */
export const FALL = { depth: 0.42, fallS: 0.28, tilt: 0.2 };
function fallAt(w: Word, t: number, rowPx: number, room = Infinity, width = 0): { dy: number; tilt: number } | null {
  if (!/^dropping/i.test(w.w) || t < w.start) return null;
  const tau = t - w.start, u = Math.min(1, tau / FALL.fallS);
  const bounce = tau > FALL.fallS ? 0.12 * Math.exp(-(tau - FALL.fallS) * 9) * Math.sin((tau - FALL.fallS) * 30) : 0;
  // (never past the face's foot, its far end tilted down included: on a one-row face the word fell out of its canvas
  // and was cut in half; there, half the room to tilt, half to drop)
  const tilt = Math.min(FALL.tilt, Math.asin(Math.min(1, Math.max(0, room) / 2 / Math.max(1, width))));
  return { dy: Math.min(rowPx * FALL.depth, Math.max(0, room - width * Math.sin(tilt))) * (u * u - bounce), tilt: tilt * u };
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

interface Style { bg?: string; border?: string; band?: string; family: string; caps: boolean; colors: [unsung: string, sung: string, now: string]; alpha: [unsung: number, sung: number]; glow?: string; glowPasses?: number; tubes?: boolean; bubble?: string; /** The bubble on the left (received), not the right (sent). */ bubbleLeft?: boolean; outline?: string; shadow?: string; /** Its rows set flush left (an ad's copy). */ align?: 'left'; /** Chalk: each letter a little uneven. */ roughen?: boolean; /** The Hollywood sign's: a letter to a panel, the panels evenly spaced across the face, each standing a little out of true. */ panels?: boolean; /** A spray-painted piece (drawGraffiti): its letters' fade top to foot (the word being sung its own), their 3D block, the cloud sprayed behind. */ graffiti?: { fill: [string, string, string]; now: [string, string, string]; block: string; cloud: string } }
function styleOf(c: Carrier): Style {
  switch (c.kind) {
    case 'road': return { family: F.archivo(75, 900), caps: true, colors: ['#f3f1ea', '#f3f1ea', '#ffd65a'], alpha: [0.62, 0.97] };
    // by day a soft plum shade under the white (it reads on a pale sky and on the buildings), by night a white glow
    case 'sky': {
      // (a heavy italic sans: smoke letters, sturdy at a distance where a Didone's hairlines drop out); by day its
      // shade laid thrice and a hard plum drop shadow besides — white script on a pale sky needs an edge on a phone
      const day = daylight(c.phrase.start) > 0.6;
      return { family: F.archivoItalic(100, 800), caps: false, colors: ['#ffffff', '#ffffff', '#ffffff'], alpha: [0, 0.97], glow: day ? 'rgba(54,20,60,0.9)' : 'rgba(255,255,255,0.9)', glowPasses: day ? 3 : 1, shadow: day ? 'rgba(46,16,52,0.75)' : undefined };
    }
    case 'billboard': case 'poster': { // an ad (look/adart.ts draws it), the lyric its headline in its colours
      // (the word being sung: warm yellow on a dark ad, red on a light one — one rule across the film)
      const a = AD_STYLE[c.ad ?? 'lipstick'], dark = new THREE.Color(a.bg).getHSL({ h: 0, s: 0, l: 0 }).l < 0.4;
      return { family: F.archivo(62, 900), caps: true, colors: [a.ink, a.ink, dark ? '#ffd65a' : '#d81e2c'], alpha: [0.72, 1] };
    }
    case 'storefront': return { bg: '#1d3b30', family: F.archivo(100, 700), caps: true, colors: ['#f3ead2', '#f3ead2', '#ffd65a'], alpha: [0.72, 1] };
    case 'neon': return { family: F.bodoni(700, { italic: true }), caps: false, colors: ['#ff4fa3', '#ff4fa3', '#fff1a0'], alpha: [0.6, 1], glow: 'rgba(255,79,163,0.95)', tubes: true };
    case 'banner': return { bg: '#f7f4ec', band: '#d23a2a', family: F.archivo(75, 900), caps: true, colors: [HEX.ink, HEX.ink, HEX.accent], alpha: [0.85, 1] };
    // (white sheet metal, floodlit: no accent colour — the word being sung lights full white, the rest wait dimmer)
    case 'hill': return { family: F.archivo(62, 800), caps: true, colors: ['#e6e1d8', '#fbf7ee', '#ffffff'], alpha: [0.5, 1], panels: true };
    // graffiti on the tiles (the user, 2026-10-13: lit lettering "floating in a tunnel"; 2026-10-14: fat glowing caps
    // didn't read as graffiti): a writer's piece (drawGraffiti), the lines in turn hot pink on a cyan cloud, then
    // electric blue on a yellow one (in turn by piece: the two "Blowin' money fast" lines are both odd); the word being
    // sung a yellow-to-orange fade
    case 'tunnel': return { family: F.graffiti(), caps: true, colors: ['', '', ''], alpha: [1, 1], outline: '#141218', graffiti: (Math.floor(c.phrase.line / 2) + Number(c.id.split('.')[1] ?? 0)) % 2
      ? { fill: ['#8ff0ff', '#2a8cff', '#1d4fd8'], now: ['#fff7c0', '#ffd23a', '#ff8a1a'], block: '#0b1f5c', cloud: '#f2cf4a' }
      : { fill: ['#ffb3dc', '#ff4fa3', '#e0186a'], now: ['#fff7c0', '#ffd23a', '#ff8a1a'], block: '#5c0a33', cloud: '#6fe0f0' } };
    case 'barber': return { family: F.archivo(100, 900), caps: true, colors: ['#e9c46a', '#ffd76a', '#fff6d8'], alpha: [0.8, 1], outline: '#3a2408', shadow: '#120b04' }; // gold leaf on the glass
    case 'speed': return { bg: '#0e0d10', family: F.mono(700), caps: true, colors: ['#ffc23a', '#ffb000', '#fff3c4'], alpha: [0.9, 1], glow: 'rgba(255,170,0,0.6)' }; // (the user: its contrast wasn't great — the unsung words were half-dimmed)
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
    case 'phone': return c.received // (no panel: the bubbles sit on the screen's wallpaper, the scene's; his replies grey on the left)
      ? { bubble: '#3a3a46', bubbleLeft: true, family: F.archivo(100, 500), caps: false, colors: ['#ffffff', '#ffffff', '#ffd65a'], alpha: [0.75, 1] }
      : { bubble: '#2f7cf6', family: F.archivo(100, 500), caps: false, colors: ['#ffffff', '#ffffff', '#ffd65a'], alpha: [0.75, 1] };
    case 'marquee': return { bg: '#f8f4e8', family: F.archivo(62, 900), caps: true, colors: ['#141218', '#141218', '#d81e2c'], alpha: [0.72, 1] };
    case 'polesign': return { bg: '#fbf7ee', family: F.archivo(100, 900), caps: true, colors: ['#c8102e', '#c8102e', '#141218'], alpha: [0.72, 1] };
    case 'aframe': return { bg: '#1f2b26', border: '#3c4a43', family: F.archivo(87, 800), caps: true, colors: ['#f3efe6', '#f3efe6', '#ffd65a'], alpha: [0.7, 0.95], roughen: true }; // chalk
    case 'window': return c.ad // a promotional poster taped in the glass (the user, 2026-10-14: the words "floating in the window"), or painted on it
      ? { bg: '#fff8e6', border: '#c8102e', family: F.archivo(100, 900), caps: true, colors: ['#16131a', '#16131a', '#c8102e'], alpha: [0.8, 1] }
      : { family: F.archivo(100, 900), caps: true, colors: ['#ffffff', '#ffffff', '#ffd65a'], alpha: [0.82, 1], outline: '#c8102e', shadow: '#5a0614' };
    case 'vinyl': return { bg: '#c8202e', family: F.archivo(100, 900), caps: true, colors: ['#ffffff', '#ffffff', '#ffd65a'], alpha: [0.75, 1] };
    case 'roofsign': return { bg: '#ffd65a', family: F.archivo(100, 900), caps: true, colors: ['#c8102e', '#c8102e', '#141218'], alpha: [0.72, 1] };
    case 'carwash': return { family: F.archivo(100, 900), caps: true, colors: ['#ffffff', '#ffffff', '#ff3043'], alpha: [1, 1], outline: '#0b3a66', align: 'left' }; // (on the prop's board, solid over its suds; the hero word red: yellow sinks into the pale blue)
    case 'visor': return { bg: '#0e0d10', family: F.bodoni(700, { italic: true }), caps: false, colors: ['#f4f4f0', '#f4f4f0', '#ffd65a'], alpha: [0.7, 1] };
    case 'hood': return { family: F.archivoItalic(100, 800), caps: true, colors: ['#ffd65a', '#ffd65a', '#ffffff'], alpha: [0.75, 1], outline: '#5a0614', shadow: '#2a0309' };
    case 'giant': return { family: F.archivo(62, 900), caps: true, colors: ['#fff6e0', '#fff6e0', '#ffd65a'], alpha: [0.85, 1], outline: '#3a1a2e', shadow: '#1c0f22' }; // (a muralist's lettering on the wall's painting)
    case 'arch': return { bg: '#f6edd6', border: '#2b4a66', family: F.archivo(100, 900), caps: true, colors: ['#2b4a66', '#2b4a66', '#d81e2c'], alpha: [0.75, 1] }; // the beach town's band
    case 'tunnelsign': return { bg: '#0b0d12', border: '#454b58', family: F.archivo(100, 800), caps: true, colors: ['#ffe2a8', '#ffd98a', '#ffffff'], alpha: [0.6, 1], glow: 'rgba(255,180,80,0.85)' }; // a lit box in the bore
    case 'freeway': return { bg: GREEN, border: '#f4f4f0', family: F.archivo(100, 700), caps: false, colors: ['#f4f4f0', '#f4f4f0', '#ffd65a'], alpha: [0.75, 1] };
    case 'street': case 'gantry': return { bg: GREEN, border: '#f4f4f0', family: F.archivo(100, 700), caps: false, colors: ['#f4f4f0', '#f4f4f0', '#ffd65a'], alpha: [0.75, 1] };
    // (the beach: a towel's bold print, white with a black keyline on its coloured cloth; letters raked into the sand,
    // dark grooves with their pushed-up rims; the surf shack's hand-painted board, navy on its cream)
    case 'towel': return { family: F.archivoItalic(75, 800), caps: true, colors: ['#ffffff', '#ffffff', '#ffd65a'], alpha: [0.9, 1], outline: '#16131a', shadow: '#16131a' };
    case 'sand': return { family: F.archivo(87, 900), caps: true, colors: ['#6e3524', '#5a2618', '#c8102e'], alpha: [0.8, 1], outline: '#ffd9b0', shadow: '#3e1a10' };
    case 'surfshop': return { family: F.archivoItalic(100, 800), caps: true, colors: ['#123a5c', '#123a5c', '#d81e2c'], alpha: [0.85, 1] };
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
    this.canvas.width = carrier.kind === 'hill' ? HILL_CANVAS_W : CANVAS_W;
    this.canvas.height = Math.round((this.canvas.width * carrier.h) / carrier.w);
    this.c = this.canvas.getContext('2d')!;
    this.style = styleOf(carrier);
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 16;
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
    if (carrier.ad && carrier.kind !== 'bus' && carrier.kind !== 'giant') drawAd(c, carrier.ad, W, H, share, carrier.kind === 'billboard' || carrier.kind === 'poster' ? undefined : style.colors[1], Number(carrier.id.split('.')[1] ?? 0) + carrier.phrase.line);
    // (a shop's poster, taped up in its window: tape across its corners)
    if (carrier.kind === 'window' && carrier.ad) for (const [x, y, a] of [[0, 0, -0.785], [W, 0, 0.785], [0, H, 0.785], [W, H, -0.785]] as const) { c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = 'rgba(205,205,195,0.8)'; c.fillRect(-W * 0.045, -H * 0.05, W * 0.09, H * 0.1); c.restore(); }
    else if (carrier.kind === 'street' || carrier.kind === 'gantry') drawRoute(c, W, H, share);
    // (a price only once its item's words are coming in: a price beside a blank line reads as a bug)
    else if (carrier.kind === 'menu' && revealAt(carrier, t) > 0) this.drawPrices(c, share);
    else if (carrier.kind === 'plate') { c.fillStyle = '#c8102e'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = font(F.bodoni(700, { italic: true }), H * 0.17); c.fillText('California', W / 2, H * 0.15); c.textAlign = 'left'; }
    const TW = W * share; // the lyric's width
    const shown = Math.round(revealAt(carrier, t) * FLIP.steps) / FLIP.steps;
    if (!COPY.has(carrier.kind)) { if (shown > 0) { this.drawWords(c, t, TW, shown); if (style.graffiti) this.onTiles(); } return; }
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

  /** Paint on the tunnel's tiles: the paint multiplied by the tiles drawn white (their grout and grime, lined up with
   *  the wall's by Carrier.tiles), so the tiles show through it as they would through spray paint. */
  private onTiles() {
    const { canvas, carrier } = this, W = canvas.width, H = canvas.height, at = carrier.tiles;
    if (!at) return;
    const m = W / carrier.w, k = (TILE_REPEAT * m) / 256; // (px a metre; the tiles' canvas px to the face's)
    const tl = (tileMap ??= (() => { const t = document.createElement('canvas'); t.width = t.height = 256; drawTiles(t.getContext('2d')!, '#ffffff', '#6f6a66'); return t; })());
    const map = this.layer('tiles'), x = map.getContext('2d')!;
    x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, W, H);
    const pat = x.createPattern(tl, 'repeat')!;
    pat.setTransform(new DOMMatrix().translateSelf(-at.u * m, -at.v * m).scaleSelf(k, k));
    x.fillStyle = pat; x.fillRect(0, 0, W, H);
    x.globalCompositeOperation = 'destination-in'; x.drawImage(canvas, 0, 0); // (only where there's paint)
    const c = this.c;
    c.save(); c.globalCompositeOperation = 'multiply'; c.drawImage(map, 0, 0); c.restore();
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
    // (the hardware store's banner a row of its own words to each of its phrases' panels: GRAND OPENING alone on the top
    // one left the rest a blank red sheet — the user, 2026-10-14; the store's new man is the boss its lyric names)
    else if (carrier.kind === 'vinyl') own = ([['GRAND RE-OPENING', ''], ['UNDER NEW MANAGEMENT', ''], ['COME MEET', 'THE BOSS']] as [string, string][])[+(carrier.id.split('.')[1] ?? 0) % 3];
    else if (own && !carrier.id.endsWith('.0')) own = undefined;
    if (own && !carrier.ad) {
      const [top, under] = own;
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = style.colors[1];
      const big = Math.min(H * (under ? 0.3 : carrier.kind === 'vinyl' ? 0.6 : 0.4), (TW * 0.8) / Math.max(4, top.length * 0.58)); // (a banner's one row printed as big as it takes)
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
    if (style.panels) { this.drawPanels(c, t, TW, alpha); return; }
    if (style.graffiti) { this.drawGraffiti(c, t, TW, alpha * (1 - gone)); return; }
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
      const pad = em * 0.55, bw = Math.max(...widths) + 2 * pad, x0 = style.bubbleLeft ? TW * 0.04 : TW * 0.96 - bw;
      bubbleX = x0 + pad;
      c.save(); c.shadowBlur = 0; c.globalAlpha = alpha; c.fillStyle = style.bubble;
      c.beginPath(); c.roundRect(x0, H * 0.07, bw, H * 0.86, Math.min(H * 0.43, em * 0.9)); c.fill();
      // its tail, at the foot of its outer corner
      const tx = style.bubbleLeft ? x0 + em * 0.3 : x0 + bw - em * 0.3, ty = H * 0.93;
      c.beginPath(); c.moveTo(tx, ty - em * 0.5); c.lineTo(tx + (style.bubbleLeft ? -em * 0.35 : em * 0.35), ty); c.lineTo(tx + (style.bubbleLeft ? em * 0.25 : -em * 0.25), ty - em * 0.15); c.closePath(); c.fill(); c.restore();
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
        // dissolving: the letters drift apart and up, a little more each word along
        const fall = fallAt(w, t, rowH, H - y - em * 0.45, c.measureText(label(w)).width);
        if (fall) { c.save(); c.translate(x, y + fall.dy); c.rotate(fall.tilt); }
        const [fx, fy] = fall ? [0, 0] : [x + gone * em * 0.8 * (x / W - 0.5) * 4, y - gone * em * 0.6];
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

  /** A writer's piece sprayed on the tiles: the phrase in a handstyle, each letter tilted, stepped and sized a little
   *  its own way and crowding its neighbour, each row on its own slant; behind it a cloud of a second colour with
   *  overspray at its edge, a 3D block down and right, a black outline; the letters a fade with a white shine along
   *  their upper edges, the paint's grain showing the tiles through, drips off their feet, two sparkles. Painted on a
   *  layer at full strength, then laid on at `alpha` (so its overlapping coats never show through each other). */
  private drawGraffiti(c: CanvasRenderingContext2D, t: number, TW: number, alpha: number) {
    if (alpha <= 0) return;
    const { canvas, carrier, style } = this, W = canvas.width, H = canvas.height, G = style.graffiti!, seed = carrier.phrase.start;
    const words = carrier.phrase.words, P = GRAFFITI;
    const soloRow = carrier.phrase.solo === 'first' ? 0 : carrier.phrase.solo === 'last' ? carrier.rows.length - 1 : -1;
    const weights = carrier.rows.map((_, r) => (r === soloRow ? SOLO_ROW : 1)), sum = weights.reduce((a, b) => a + b, 0);
    c.font = font(style.family, 100);
    const capR = c.measureText('H').actualBoundingBoxAscent / 100, spaceR = c.measureText(' ').width / 100;
    // the rows' letters, each its own size (a row's first letter bigger), measured at 1 em
    let wi = 0, gi = 0;
    const rows = carrier.rows.map((row, r) => {
      const n = row.split(' ').length, rowWords = words.slice(wi, wi + n);
      wi += n;
      const chars = rowWords.map((w, k) => [...w.w.toUpperCase()].map((ch, j) => {
        const m = c.measureText(ch), s = (1 + (hash(seed, gi, 1) - 0.5) * P.size) * (k === 0 && j === 0 ? P.first : 1);
        return { ch, w, s, wR: (m.width / 100) * s, descR: (m.actualBoundingBoxDescent / 100) * s, i: gi++ };
      }));
      const widthR = chars.reduce((a, cs) => a + cs.reduce((b, g) => b + g.wR + P.track, -P.track), 0) + (spaceR + P.track) * (chars.length - 1);
      const rowH = (H * weights[r]!) / sum;
      return { chars, widthR, rowH, fit: Math.min((rowH * P.rowFill) / capR, (TW * P.wide) / widthR) };
    });
    const plain = rows.filter((_, r) => r !== soloRow), common = Math.min(...(plain.length ? plain : rows).map((r) => r.fit));
    // laid out: each letter's centre, baseline, tilt (px, rad)
    interface Glyph { ch: string; w: Word; i: number; s: number; em: number; cx: number; y: number; cw: number; desc: number; rot: number }
    const glyphs: Glyph[] = [];
    let top = 0;
    rows.forEach((row, r) => {
      const em = r === soloRow ? Math.min(row.fit, common * SOLO_MAX) * (1 + PUNCH.scale * punchAt(carrier, t)) : common;
      const yMid = top + row.rowH / 2, slope = (hash(seed, r, 7) - 0.5) * P.slant;
      top += row.rowH;
      let x = (TW - row.widthR * em) / 2;
      for (const cs of row.chars) {
        for (const g of cs) {
          const cw = g.wR * em, cx = x + cw / 2;
          glyphs.push({ ch: g.ch, w: g.w, i: g.i, s: g.s, em, cx, cw, desc: g.descR * em, rot: (hash(seed, g.i, 2) - 0.5) * P.tilt,
            y: yMid + (capR * em) / 2 + (cx - TW / 2) * slope + (hash(seed, g.i, 3) - 0.5) * P.step * em });
          x += cw + P.track * em;
        }
        x += (spaceR + P.track) * em;
      }
    });
    // the whole piece (its cloud's bubbles over the letters, its block and cloud under them) centred in the face below
    // `drop` of it (clear of the strip lights; a cloud cut flat at the face's edge reads as a decal)
    const lo = Math.min(...glyphs.map((g) => g.y - capR * g.em * 1.5)), hi = Math.max(...glyphs.map((g) => g.y + g.desc + g.em * 0.3));
    const shift = (H * (1 + P.drop)) / 2 - (lo + hi) / 2;
    for (const g of glyphs) g.y += shift;
    const at = (k: CanvasRenderingContext2D, g: Glyph, dx: number, dy: number, paint: (k: CanvasRenderingContext2D, lw: (emShare: number) => number) => void) => {
      k.save(); k.translate(g.cx + dx, g.y + dy); k.rotate(g.rot); k.scale(g.s, g.s);
      k.font = font(style.family, g.em); k.textAlign = 'center'; k.textBaseline = 'alphabetic'; k.lineJoin = 'round'; k.lineCap = 'round';
      paint(k, (share) => (share * g.em) / g.s);
      k.restore();
    };
    const coat = (k: CanvasRenderingContext2D, g: Glyph, dx: number, dy: number, color: string | CanvasGradient, width: number) =>
      at(k, g, dx, dy, (k, lw) => { k.fillStyle = color; k.strokeStyle = color; k.lineWidth = lw(width); k.strokeText(g.ch, 0, 0); k.fillText(g.ch, 0, 0); });
    const block = (g: Glyph, k: number) => [g.em * P.depth * 0.55 * k, g.em * P.depth * k] as const;

    const paint = this.layer('paint'), p = paint.getContext('2d')!;
    p.clearRect(0, 0, W, H);
    // the cloud: a coat of the second colour round the letters and their block, a bubble behind each letter, overspray
    // past its edge (hard-edged: a soft halo read as neon, not paint)
    p.save(); p.shadowColor = G.cloud; p.shadowBlur = common * 0.025; p.fillStyle = G.cloud;
    for (const g of glyphs) {
      coat(p, g, 0, 0, G.cloud, P.cloud); coat(p, g, ...block(g, P.steps), G.cloud, P.cloud);
      p.beginPath(); p.arc(g.cx + (hash(seed, g.i, 9) - 0.5) * g.cw * 0.4, g.y - capR * g.em * (0.45 + 0.2 * hash(seed, g.i, 10)), capR * g.em * (0.62 + 0.22 * hash(seed, g.i, 11)), 0, Math.PI * 2); p.fill();
    }
    p.restore();
    p.fillStyle = G.cloud;
    for (const g of glyphs) for (let k = 0; k < 26; k++) {
      const a = hash(seed, g.i, k, 4) * Math.PI * 2, rad = g.em * (0.3 + 0.2 * hash(seed, g.i, k, 5)), r = g.em * (0.008 + 0.02 * hash(seed, g.i, k, 6));
      p.globalAlpha = 0.35 + 0.5 * hash(seed, g.i, k, 8);
      p.beginPath(); p.arc(g.cx + Math.cos(a) * rad, g.y - (capR * g.em) / 2 + Math.sin(a) * rad * 0.8, r, 0, Math.PI * 2); p.fill();
    }
    p.globalAlpha = 1;
    // the 3D block, outlined, down and right; then the letters' own outline over it
    for (const g of glyphs) for (let k = P.steps; k >= 1; k--) coat(p, g, ...block(g, k), style.outline!, P.outline);
    for (const g of glyphs) for (let k = P.steps; k >= 1; k--) coat(p, g, ...block(g, k), G.block, P.fat + 0.03);
    for (const g of glyphs) coat(p, g, 0, 0, style.outline!, P.outline);
    // drips off the letters' feet (under the fill, so it runs out of the letter)
    for (const g of glyphs) {
      if (!/\p{L}/u.test(g.ch) || hash(seed, g.i, 20) > P.drips) continue;
      const x = g.cx + (hash(seed, g.i, 21) - 0.5) * g.cw * 0.5, y0 = g.y + g.desc - g.em * 0.08, y1 = Math.min(y0 + g.em * (0.14 + 0.36 * hash(seed, g.i, 22)), H - g.em * 0.06);
      for (const [col, lw, rad] of [[style.outline!, 0.075, 0.046], [G.fill[2], 0.035, 0.028]] as const) {
        p.strokeStyle = col; p.fillStyle = col; p.lineWidth = lw * g.em; p.lineCap = 'round';
        p.beginPath(); p.moveTo(x, y0); p.lineTo(x, y1); p.stroke();
        p.beginPath(); p.arc(x, y1, rad * g.em, 0, Math.PI * 2); p.fill();
      }
    }
    // the letters' faces: white, then their fade laid over it nudged down and right (a shine left on their upper
    // edges), the word being sung in its own; the paint's grain pricked through to the tiles
    const face = this.layer('face'), f = face.getContext('2d')!;
    f.globalCompositeOperation = 'source-over'; f.clearRect(0, 0, W, H);
    for (const g of glyphs) coat(f, g, 0, 0, '#ffffff', P.fat);
    f.globalCompositeOperation = 'source-atop';
    for (const g of glyphs) {
      const now = t >= g.w.start && t < g.w.end, [a, b, d] = now ? G.now : G.fill;
      at(f, g, g.em * P.shine, g.em * P.shine * 1.2, (k, lw) => {
        const grad = k.createLinearGradient(0, -capR * g.em, 0, g.desc);
        grad.addColorStop(0, a); grad.addColorStop(0.5, b); grad.addColorStop(1, d);
        k.fillStyle = grad; k.strokeStyle = grad; k.lineWidth = lw(P.fat); k.strokeText(g.ch, 0, 0); k.fillText(g.ch, 0, 0);
      });
    }
    p.drawImage(face, 0, 0);
    p.save(); p.globalCompositeOperation = 'destination-out';
    const grain = Math.round((W * H) / 900);
    for (let k = 0; k < grain; k++) { p.globalAlpha = 0.25 + 0.5 * hash(seed, k, 30); p.fillRect(hash(seed, k, 31) * W, hash(seed, k, 32) * H, 2, 2); }
    p.restore();
    // two sparkles: off the first letter's shoulder and the last's
    const star = (x: number, y: number, r: number) => {
      p.beginPath(); p.moveTo(x, y - r);
      for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]] as const) p.quadraticCurveTo(x, y, x + dx * r, y + dy * r);
      p.fill();
    };
    p.fillStyle = '#ffffff';
    const g0 = glyphs[0], g1 = glyphs[glyphs.length - 1];
    if (g0) star(g0.cx - g0.cw * 0.45, g0.y - capR * g0.em * 1.05, g0.em * 0.16);
    if (g1 && g1 !== g0) star(g1.cx + g1.cw * 0.5, g1.y - capR * g1.em * 0.9, g1.em * 0.12);
    c.globalAlpha = alpha; c.drawImage(paint, 0, 0); c.globalAlpha = 1;
  }

  /** The Hollywood sign: the phrase on one row, a letter to each of a row of equal cells (a word's gap a cell), each
   *  letter as tall as the face allows and a little tilted and stepped (each stands on its own legs on the slope). */
  private drawPanels(c: CanvasRenderingContext2D, t: number, TW: number, alpha: number) {
    const { canvas, carrier, style } = this, H = canvas.height;
    const label = (w: Word) => (style.caps ? w.w.toUpperCase() : w.w);
    const cells = carrier.phrase.words.flatMap((w, i) => [...(i ? [null] : []), ...[...label(w)].map((ch) => ({ ch, w }))]);
    const cell = TW / cells.length;
    c.font = font(style.family, 100);
    const cap = c.measureText('H'), capH = cap.actualBoundingBoxAscent, widest = Math.max(...cells.map((x) => (x ? c.measureText(x.ch).width : 0)));
    const em = Math.min((100 * H * 0.84) / capH, (100 * cell * 0.86) / widest);
    c.font = font(style.family, em);
    c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    cells.forEach((x, i) => {
      if (!x) return;
      const sung = t >= x.w.start, now = sung && t < x.w.end;
      c.fillStyle = style.colors[now ? 2 : sung ? 1 : 0];
      c.globalAlpha = style.alpha[sung ? 1 : 0] * alpha;
      c.save();
      c.translate(cell * (i + 0.5), H / 2 + (em * capH) / 200 + (hash(i, 31) - 0.5) * H * 0.05);
      c.rotate((hash(i, 32) - 0.5) * 0.06);
      c.fillText(x.ch, 0, 0);
      c.restore();
    });
    c.globalAlpha = 1; c.textAlign = 'left';
  }

  dispose() { this.texture.dispose(); }
}
