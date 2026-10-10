// A lyric sign's face: its line on a board, karaoke word by word (unsung words dim, sung words ink, the word being
// sung in the accent), laid out as signs.ts says. Redrawn only when its key changes. Browser only (canvas).
import * as THREE from 'three';
import type { Word } from '../engine/lyrics';
import { HEX } from '../engine/palette';
import { F, font } from '../engine/type';
import type { Sign } from './signs';

const PX_PER_M = 1024 / 7.5;

/** The karaoke state of a line at t: how many words have started, and which is being sung (-1: none). */
export function karaokeKey(words: readonly Word[], t: number): string {
  let started = 0, current = -1;
  words.forEach((w, i) => { if (t >= w.start) started = i + 1; if (t >= w.start && t < w.end) current = i; });
  return `${started}:${current}`;
}

export class SignArt {
  readonly canvas = document.createElement('canvas');
  readonly texture: THREE.CanvasTexture;
  private c: CanvasRenderingContext2D;
  private key = '';

  constructor(private sign: Sign) {
    this.canvas.width = Math.round(sign.w * PX_PER_M);
    this.canvas.height = Math.round(sign.h * PX_PER_M);
    this.c = this.canvas.getContext('2d')!;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 8;
  }

  update(t: number) {
    const key = karaokeKey(this.sign.line.words, t);
    if (key === this.key) return;
    this.key = key;
    this.draw(t);
    this.texture.needsUpdate = true;
  }

  private draw(t: number) {
    const { c, canvas, sign } = this, W = canvas.width, H = canvas.height;
    c.fillStyle = HEX.bg;
    c.fillRect(0, 0, W, H);
    c.strokeStyle = HEX.ink;
    c.lineWidth = 6;
    c.strokeRect(10, 10, W - 20, H - 20);
    const family = F.bodoni(400, { italic: true });
    let em = sign.em * PX_PER_M;
    c.font = font(family, em);
    const widest = Math.max(...sign.rows.map((r) => c.measureText(r).width));
    if (widest > W * 0.92) { em *= (W * 0.92) / widest; c.font = font(family, em); }
    c.textBaseline = 'middle';
    const words = sign.line.words;
    let wi = 0;
    sign.rows.forEach((row, r) => {
      const n = row.split(' ').length, rowWords = words.slice(wi, wi + n);
      wi += n;
      const space = c.measureText(' ').width;
      const total = rowWords.reduce((s, w) => s + c.measureText(w.w).width, 0) + space * (rowWords.length - 1);
      let x = (W - total) / 2;
      const y = (H * (r + 0.5)) / sign.rows.length;
      for (const w of rowWords) {
        const sung = t >= w.start, now = sung && t < w.end;
        c.fillStyle = now ? HEX.accent : sung ? HEX.ink : HEX.dim;
        c.globalAlpha = sung ? 1 : 0.55;
        c.fillText(w.w, x, y);
        x += c.measureText(w.w).width + space;
      }
      c.globalAlpha = 1;
    });
  }

  dispose() { this.texture.dispose(); }
}
