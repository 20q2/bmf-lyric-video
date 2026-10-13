// Verse 3's props (drive/sets/verse3.ts): the Strip's shaped signs round each line's lyric face — the pharmacy's pill,
// the liquor store's champagne glass, the marquee's bulb frame and posts, the tiki bar's bamboo and torches under
// TARZAN & JANE, the payphones with their coin light, the pawn shop's three gold balls, the chapel's heart — each
// flickering on with its line (the lyric faces are the carriers'; every header is the signs' face, never the lyrics').
// Browser only (canvas).
import * as THREE from 'three';
import type { Drive } from '../../drive/drive';
import { type Theme, type Verse3Plan } from '../../drive/sets/verse3';
import { WORLD, toon } from '../../look/toon';
import { GLOW, lampMaterial } from '../../look/night';
import { F, font } from '../../engine/type';
import { ball, box, canvasTex, cyl, onPanel, plane, signFace, pic } from './kit';

/** A neon drawing as a texture: `draw` strokes tubes with a glow already set. */
function neonTex(w: number, h: number, glow: string, draw: (c: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  return canvasTex(w, h, (c) => {
    c.shadowColor = glow; c.shadowBlur = 26; c.lineCap = 'round'; c.lineJoin = 'round';
    draw(c); draw(c); // (two passes: the glow builds)
  });
}
/** A neon plane: its material's brightness is the flicker's (update sets it; `peak`: headers burn cooler than the
 *  lyric tubes, or the bloom blots their script). */
function neonPlane(g: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, tex: THREE.Texture): THREE.Mesh {
  const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, color: new THREE.Color(GLOW.neon, GLOW.neon, GLOW.neon), depthWrite: false });
  return plane(g, w, h, x, y, z, m);
}
/** Neon script in a colour (headers: the bar's own name — set in Bodoni italic, a script, not the lyrics' faces). */
const neonText = (text: string, color: string, px = 110, italic = true) => neonTex(1024, Math.round(px * 1.9), color, (c) => {
  c.strokeStyle = color; c.lineWidth = Math.max(3, px * 0.06);
  c.font = font(italic ? F.bodoni(700, { italic: true }) : F.archivo(100, 700), px);
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.strokeText(text, 512, px * 0.95, 1000);
});

/** The flicker on: dark before, stuttering on over the last 1.1 s before `start`, lit from it. */
const flickAt = (t: number, start: number) => {
  if (t >= start) return 1;
  const u = 1 - (start - t) / 1.1;
  if (u < 0) return 0.04;
  return (t * 13) % 1 < 0.25 + 0.55 * u ? 1 : 0.05;
};

/** The tiki bar's torches: their poles' height (m). */
const TORCH = { h: 2.6 };

export function buildVerse3(drive: Drive): { group: THREE.Group; update(t: number): void } | null {
  const plan = drive.plans.verse3 as Verse3Plan | undefined;
  if (!plan) return null;
  const { route } = drive, root = new THREE.Group();
  const dark = toon({ color: '#15121a' }), chrome = toon({ color: WORLD.chrome }), bamboo = toon({ color: '#9e7a42' });
  const gold = toon({ color: '#d7a62e' });
  /** Every flickering material, with its line's start, its lit brightness (headers cooler than tubes: the bloom would
   *  blot their script) and whether it dances (torches). */
  const flicker: { m: THREE.MeshBasicMaterial; start: number; peak: number; dance?: boolean }[] = [];
  const neon = (g: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, tex: THREE.Texture, start: number, opts: { peak?: number; dance?: boolean } = {}) => {
    const p = neonPlane(g, w, h, x, y, z, tex);
    flicker.push({ m: p.material as THREE.MeshBasicMaterial, start, peak: opts.peak ?? 2.1, dance: opts.dance });
    return p;
  };
  let coin: THREE.Mesh | null = null, coinStart = 0;

  for (const sign of plan.signs) {
    const { face, theme, start } = sign, g = onPanel(face), foot = face.center.y - route.frameAt(sign.s).pos.y;
    const groundY = -foot, W = face.w, H = face.h;
    switch (theme as Theme) {
      case 'pill': {
        // the capsule, tilted beside the words; PHARMACY over them
        const cap = neonTex(512, 288, '#4dff9e', (c) => {
          c.strokeStyle = '#4dff9e'; c.lineWidth = 14;
          c.save(); c.translate(256, 144); c.rotate(-0.5);
          c.beginPath(); c.roundRect(-150, -62, 300, 124, 62); c.stroke();
          c.beginPath(); c.moveTo(0, -62); c.lineTo(0, 62); c.stroke(); c.restore();
        });
        neon(g, 3.2, 1.9, -W / 2 - 2.1, 0.4, 0.1, cap, start);
        neon(g, 6.4, 1.15, 0, H / 2 + 1.0, 0.1, neonText('PHARMACY', '#4dff9e', 110, false), start, { peak: 1.55 });
        break;
      }
      case 'pop': {
        // the champagne glass, its bubbles, the cork away; LIQUOR over the words
        const glass = neonTex(400, 480, '#ffd65a', (c) => {
          c.strokeStyle = '#ffd65a'; c.lineWidth = 12;
          c.beginPath(); c.moveTo(100, 90); c.lineTo(300, 90); c.lineTo(200, 240); c.lineTo(200, 360); c.stroke();
          c.beginPath(); c.moveTo(130, 400); c.lineTo(270, 400); c.stroke();
          c.fillStyle = '#ffd65a';
          for (const [bx, by, r] of [[160, 46, 10], [210, 24, 13], [258, 52, 9]] as const) { c.beginPath(); c.arc(bx, by, r, 0, Math.PI * 2); c.fill(); }
        });
        neon(g, 1.5, 1.8, -W / 2 - 0.5, 0.4, 0.1, glass, start); // (on the board, at its left edge: hung past it, its edge sliced the glass in two)
        neon(g, 5.2, 1.15, 0, H / 2 + 1.0, 0.1, neonText('LIQUOR', '#ffd65a', 110, false), start, { peak: 1.55 });
        break;
      }
      case 'marquee': {
        // the board's posts and its bulb frame; the house's name on top, lit yellow
        for (const x of [-W / 3, W / 3]) box(g, 0.28, foot - H / 2, 0.28, x, groundY + (foot - H / 2) / 2, -0.25, dark);
        const bulb = lampMaterial('#ffe8b0', GLOW.lamp, 1.1);
        const e = W / 2 + 0.25, f = H / 2 + 0.25;
        for (let i = 0; i <= 18; i++) { ball(g, 0.07, -e + (2 * e * i) / 18, f, 0.05, bulb); ball(g, 0.07, -e + (2 * e * i) / 18, -f, 0.05, bulb); }
        for (let i = 1; i < 8; i++) { ball(g, 0.07, -e, -f + (2 * f * i) / 8, 0.05, bulb); ball(g, 0.07, e, -f + (2 * f * i) / 8, 0.05, bulb); }
        box(g, W * 0.72, 1.5, 0.3, 0, H / 2 + 1.05, -0.12, toon({ color: '#c8202e' }));
        plane(g, W * 0.68, 1.25, 0, H / 2 + 1.05, 0.06, pic(signFace('NITE OWL', 1024, 180, '#ffd65a', '#c8202e', F.sign(700), 0.62, 0.18), { color: new THREE.Color(1.4, 1.4, 1.4) }));
        break;
      }
      case 'tiki1': {
        // the bamboo frame and the first torch (TARZAN & JANE hangs by the second face)
        for (const x of [-W / 2 - 0.35, W / 2 + 0.35]) cyl(g, 0.14, H + 1.6, x, 0, 0.05, bamboo);
        for (const y of [-H / 2 - 0.3, H / 2 + 0.3]) { const b = box(g, W + 1.1, 0.24, 0.24, 0, y, 0.05, bamboo); b.rotation.z = 0.015; }
        // (a torch at the kerb: its pole up to a man's reach, the flame on top — mid-height by the board it read as a
        // sticker on a stick)
        const pole = -W / 2 - 1.6;
        cyl(g, 0.1, TORCH.h, pole, groundY + TORCH.h / 2, 0.15, bamboo);
        const flame = neonTex(220, 300, '#ff8a2a', (c) => {
          c.fillStyle = '#ff8a2a';
          c.beginPath(); c.moveTo(110, 20); c.quadraticCurveTo(190, 130, 110, 270); c.quadraticCurveTo(30, 130, 110, 20); c.fill();
        });
        neon(g, 0.9, 1.25, pole, groundY + TORCH.h + 0.55, 0.15, flame, start - 2, { peak: 2.6, dance: true }); // (torches burn before the line)
        break;
      }
      case 'tiki2': {
        // the bar's own name over the face, and the second torch
        for (const x of [-W / 2 - 0.35, W / 2 + 0.35]) cyl(g, 0.14, H + 1.6, x, 0, 0.05, bamboo);
        neon(g, 10, 1.75, 0, H / 2 + 1.2, 0.1, neonText('Tarzan & Jane', '#4de0c0', 128), start, { peak: 1.55 });
        const pole = W / 2 + 1.6;
        cyl(g, 0.1, TORCH.h, pole, groundY + TORCH.h / 2, 0.15, bamboo);
        const flame = neonTex(220, 300, '#ff8a2a', (c) => {
          c.fillStyle = '#ff8a2a';
          c.beginPath(); c.moveTo(110, 20); c.quadraticCurveTo(190, 130, 110, 270); c.quadraticCurveTo(30, 130, 110, 20); c.fill();
        });
        neon(g, 0.9, 1.25, pole, groundY + TORCH.h + 0.55, 0.15, flame, start - 4, { peak: 2.6, dance: true });
        break;
      }
      case 'phone': {
        // the payphones at the kerb under the words: two hooded boxes on a post, PHONE in blue, the coin light
        neon(g, 5.4, 1.15, 0, H / 2 + 1.0, 0.1, neonText('PHONE', '#5fd8ff', 110, false), start, { peak: 1.55 });
        const kerb = new THREE.Group(); kerb.position.set(0, groundY, 1.2); g.add(kerb);
        box(kerb, 0.22, 2.6, 0.22, 0, 1.3, 0, dark);
        for (const x of [-0.55, 0.55]) {
          box(kerb, 0.9, 0.95, 0.5, x, 2.0, 0, toon({ color: '#1f6b86' }));
          box(kerb, 0.5, 0.5, 0.3, x, 1.95, 0.12, dark);
          box(kerb, 0.07, 0.4, 0.12, x - 0.28, 1.95, 0.2, chrome); // the handset
        }
        coin = plane(kerb, 0.1, 0.1, 0.55, 2.42, 0.26, new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.4, 0.3) }));
        coinStart = start;
        break;
      }
      case 'pawn': {
        // the three gold balls on their bracket over the fascia, PAWN · LOANS lit small
        const arm = box(g, 0.16, 1.6, 0.16, 0, H / 2 + 1.2, -0.2, dark); void arm;
        for (const [dx, dy] of [[-0.75, 0.6], [0.75, 0.6], [0, -0.1]] as const) ball(g, 0.42, dx, H / 2 + 1.1 + dy, 0.15, gold);
        plane(g, 4.4, 0.7, 0, -H / 2 - 0.65, 0.1, pic(signFace('PAWN · LOANS · JEWELRY', 1024, 128, '#ffd65a', '#241f2a', F.sign(600), 0.52, 0.12), { color: new THREE.Color(1.5, 1.5, 1.5) }));
        // a neon tube round the fascia and PAWN down a blade beside it (a dark slate alone, it was the one unlit sign
        // on the strip)
        const fw = W + 0.8, fh = H + 0.8, px = Math.round((1024 * fh) / fw);
        neon(g, fw, fh, 0, 0, 0.08, neonTex(1024, px, '#4de0c0', (c) => {
          c.strokeStyle = '#4de0c0'; c.lineWidth = 9;
          c.beginPath(); c.roundRect(22, 22, 1024 - 44, px - 44, 18); c.stroke();
        }), start, { peak: 1.6 });
        box(g, 1.25, 4.6, 0.25, W / 2 + 1.1, 0, -0.1, dark);
        neon(g, 1.1, 4.4, W / 2 + 1.1, 0, 0.06, neonTex(256, 1024, '#ffd65a', (c) => {
          c.strokeStyle = '#ffd65a'; c.lineWidth = 9;
          c.font = font(F.archivo(100, 800), 200); c.textAlign = 'center'; c.textBaseline = 'middle';
          'PAWN'.split('').forEach((ch, i) => c.strokeText(ch, 128, 140 + i * 248));
        }), start - 1.5, { peak: 1.8 });
        break;
      }
      case 'chapel': {
        // the heart and its arrow beside the words; WEDDING CHAPEL over, ALWAYS OPEN under
        const heart = neonTex(420, 420, '#ff4fa3', (c) => {
          c.strokeStyle = '#ff4fa3'; c.lineWidth = 13;
          c.beginPath(); c.moveTo(210, 340);
          c.bezierCurveTo(60, 230, 60, 110, 160, 92); c.bezierCurveTo(196, 86, 210, 120, 210, 140);
          c.bezierCurveTo(210, 120, 224, 86, 260, 92); c.bezierCurveTo(360, 110, 360, 230, 210, 340); c.stroke();
          c.strokeStyle = '#f4f4f0'; c.lineWidth = 10;
          c.beginPath(); c.moveTo(60, 300); c.lineTo(340, 140); c.stroke();
          c.beginPath(); c.moveTo(340, 140); c.lineTo(300, 142); c.moveTo(340, 140); c.lineTo(330, 176); c.stroke();
        });
        neon(g, 2.6, 2.6, W / 2 + 2.0, 0.3, 0.1, heart, start);
        neon(g, 8.2, 1.3, 0, H / 2 + 1.1, 0.1, neonText('Wedding Chapel', '#f4f4f0', 120), start, { peak: 1.5 });
        neon(g, 3.6, 0.8, 0, -H / 2 - 0.7, 0.1, neonText('ALWAYS OPEN', '#ff4fa3', 72, false), start, { peak: 1.45 });
        break;
      }
    }
    root.add(g);
  }

  return {
    group: root,
    update(t) {
      for (const { m, start, peak, dance } of flicker) {
        const lit = dance ? 0.75 + 0.25 * Math.sin(t * 11 + start * 7) * Math.sin(t * 17) : flickAt(t, start);
        m.color.setScalar(0.18 + (peak - 0.18) * Math.max(0.04, lit));
      }
      if (coin) { // the coin light blinks while they're told to call
        const on = t >= coinStart && (t * 2.2) % 1 < 0.5;
        (coin.material as THREE.MeshBasicMaterial).color.setScalar(on ? 3 : 0.3);
      }
    },
  };
}
