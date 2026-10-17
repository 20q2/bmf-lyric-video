// Verse 3's props (drive/sets/verse3.ts): the Strip as a street at night. The buildings are the set's own lots (the
// drive's blocks, built here from the town's front geometry, look/facades.ts, in the strip's own night colours); on
// them, each business's own signs, mounted as it would mount them — the drugstore's neon on standoffs off its upper
// wall, DRUGS down a blade at its corner, the green cross; the liquor store's sign on a steel frame on its roof, the
// champagne glass beside it; the theatre's marquee out over the sidewalk on tie rods, its bulbs chasing, NITE OWL down
// a blade over it; the tiki bar's big roof sign on its lattice at the corner, bamboo round it, torches at the kerb; the
// hotel's neon standing on a frame on its entrance canopy (out to the kerb on brass posts), HOTEL down its blade, the
// payphones on its wall, CALL ME in tube in its window by them; the pawn shop's one big lit cabinet (PAWN · LOANS ·
// GOLD over the lines), the three gold balls, its display windows (guitars, TVs, jewellery, tools, WE BUY GOLD and a
// guitar in neon) under grilles part way down; the wedding chapel's clapboard front, gable, steeple and bell, its
// portico, stained glass, lawn and picket fence, its sign a big neon heart on the portico with the line on a ribbon
// across it, bulbs chasing round it, bells and rings lighting word by word; the white stretch limo at the kerb. Round them the strip's other businesses (STRIP: a diner, a donut
// shop, a check casher, a tattoo parlour, a motel ...), each with its own sign, room, window neon, awning and people;
// fire escapes, roof signs and plant above; the kerbs' furniture, the cross street and its signals, street lamps,
// people on the sidewalks, the traffic's lights, the wet
// road holding the lines' pink, steam off a manhole.
//
// The colour script (the user, 2026-10-15: "a lot of things ... competing for our attention along with the actual
// words ... the whites especially are really pulling our attention away from the pinks ... desaturate the rest and
// really make the pink pop"): the lines' neon owns the frame. Everything else is muted and dim — the windows' rooms
// lit low in dusty colours, the strip's own neon in greyed tones at under half the lines' brightness, no white
// anywhere bright: the street lamps, the bulbs, the headlights, the chapel's front all held down.
// Every lyric face is the carriers'; every sign's own word is set in the signs' face (F.sign), never the lyrics'.
// Browser only (canvas).
import * as THREE from 'three';
import type { Drive } from '../../drive/drive';
import { LIMO, type Lot, MOUNT, SHOPS, STREET, type Theme, type Verse3Plan, limoS, lotBlock } from '../../drive/sets/verse3';
import { PARKED } from '../../drive/blocks';
import type { Carrier } from '../../drive/carriers';
import { ROAD_HALF } from '../../drive/route';
import { LANE } from '../../drive/drive';
import { WORLD, toon } from '../../look/toon';
import { GLOW, glowMaterial, lampMaterial } from '../../look/night';
import { FACADE, facadeOf } from '../../look/facades';
import { F, font } from '../../engine/type';
import { hash } from '../../engine/util';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ball, box, canvasTex, cyl, fuse, leftFront, onPanel, paint as painted, part, pic, plane, rightFront, roadFrame, sedan, signFace, stride, tbox, tcyl, tinted, walker } from './kit';

const UP = new THREE.Vector3(0, 1, 0);

/** A neon drawing as a texture: `draw` strokes tubes with a glow already set (two passes: the glow builds). */
function neonTex(w: number, h: number, glow: string, draw: (c: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  return canvasTex(w, h, (c) => {
    c.shadowColor = glow; c.shadowBlur = Math.max(10, h * 0.12); c.lineCap = 'round'; c.lineJoin = 'round';
    draw(c); draw(c);
  });
}
/** A sign's own word in neon tube (the signs' face: F.sign), across a w x h texture (px). */
const tubeWord = (text: string, color: string, w = 1024, h = 220, weight = 600) => neonTex(w, h, color, (c) => {
  c.strokeStyle = color; c.lineWidth = Math.max(4, h * 0.05);
  c.font = font(F.sign(weight), h * 0.62); c.textAlign = 'center'; c.textBaseline = 'middle';
  (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${h * 0.06}px`;
  c.strokeText(text, w / 2, h * 0.54, w * 0.94);
});
/** A blade's word, its letters stacked down it (texture 256 wide, a letter a 240 px cell), in tube or lit paint. */
const bladeWord = (text: string, color: string, tube: boolean, bg?: string) => {
  const n = text.length, h = 240 * n + 60;
  const draw = (c: CanvasRenderingContext2D) => {
    if (bg) { c.fillStyle = bg; c.fillRect(0, 0, 256, h); }
    c.font = font(F.sign(700), 200); c.textAlign = 'center'; c.textBaseline = 'middle';
    c.strokeStyle = color; c.fillStyle = color; c.lineWidth = 11;
    text.split('').forEach((ch, i) => (tube ? c.strokeText(ch, 128, 150 + i * 240) : c.fillText(ch, 128, 150 + i * 240)));
  };
  return tube ? neonTex(256, h, color, draw) : canvasTex(256, h, draw);
};

type Spaced = CanvasRenderingContext2D & { letterSpacing: string };
/** Sets `text` in the signs' face as big as fits `maxW` (from `px` down), centred at (x, y): never squeezed (a canvas's
 *  maxWidth squashes the letters: the theatre's end panels read squished, the user 2026-10-16). */
function fitText(c: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, px: number, weight: number, spacing = 0.08, stroke = false) {
  let size = px;
  for (;; size *= 0.94) {
    c.font = font(F.sign(weight), size); (c as Spaced).letterSpacing = `${size * spacing}px`;
    if (c.measureText(text).width <= maxW || size < 6) break;
  }
  if (stroke) c.strokeText(text, x, y); else c.fillText(text, x, y);
}
/** A lit box sign's face in a w x h cell at (x0, y0): its colour, lit brighter across its middle (the tubes behind it),
 *  a keyline, its name and a second line, optionally the pawnbroker's three balls before them. */
function boxFace(c: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number, text: string, ink: string, bg: string, sub = '', balls = false) {
  c.save(); c.translate(x0, y0); c.beginPath(); c.rect(0, 0, w, h); c.clip();
  c.fillStyle = bg; c.fillRect(0, 0, w, h);
  const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(0,0,0,0.16)'); g.addColorStop(0.5, 'rgba(255,255,255,0.07)'); g.addColorStop(1, 'rgba(0,0,0,0.18)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.strokeStyle = ink; c.lineWidth = h * 0.035; c.strokeRect(h * 0.08, h * 0.08, w - h * 0.16, h * 0.84);
  const bx = balls ? h * 0.95 : 0;
  if (balls) for (const [px, py] of [[0.32, 0.36], [0.68, 0.36], [0.5, 0.68]] as const) { c.fillStyle = ink; c.beginPath(); c.arc(h * 0.14 + px * h * 0.75, py * h, h * 0.13, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = ink; c.textAlign = 'center'; c.textBaseline = 'middle';
  const cx = bx + (w - bx) / 2, mw = w - bx - h * 0.45;
  fitText(c, text, cx, sub ? h * 0.42 : h * 0.54, mw, h * (sub ? 0.44 : 0.58), 700);
  if (sub) fitText(c, sub, cx, h * 0.75, mw, h * 0.16, 600, 0.05);
  c.restore();
}
/** A neon drawing beside a trade's name (STRIP), in a 256 x 256 cell, stroked in `col` (neonTex sets the glow). */
function drawIcon(c: CanvasRenderingContext2D, icon: Icon, col: string) {
  c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 10;
  const arc = (x: number, y: number, r: number, a0 = 0, a1 = Math.PI * 2) => { c.beginPath(); c.arc(x, y, r, a0, a1); c.stroke(); };
  switch (icon) {
    case 'donut': arc(128, 128, 92); arc(128, 128, 34); for (let k = 0; k < 9; k++) { const a = k * 0.7, r = 62; c.beginPath(); c.moveTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r); c.lineTo(128 + Math.cos(a + 0.18) * (r + 8), 128 + Math.sin(a + 0.18) * (r + 8)); c.stroke(); } break;
    case 'record': arc(128, 128, 96); arc(128, 128, 30); arc(128, 128, 62, -0.6, 0.9); arc(128, 128, 78, 2.4, 3.6); c.beginPath(); c.arc(128, 128, 6, 0, Math.PI * 2); c.fill(); break;
    case 'martini': c.beginPath(); c.moveTo(40, 50); c.lineTo(216, 50); c.lineTo(128, 150); c.closePath(); c.stroke(); c.beginPath(); c.moveTo(128, 150); c.lineTo(128, 214); c.moveTo(84, 220); c.lineTo(172, 220); c.stroke(); arc(150, 84, 14); c.beginPath(); c.moveTo(150, 84); c.lineTo(196, 22); c.stroke(); break;
    case 'eye': c.beginPath(); c.moveTo(20, 128); c.quadraticCurveTo(128, 30, 236, 128); c.quadraticCurveTo(128, 226, 20, 128); c.stroke(); arc(128, 128, 36); c.beginPath(); c.arc(128, 128, 14, 0, Math.PI * 2); c.fill(); for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k - 2) * 0.36; c.beginPath(); c.moveTo(128 + Math.cos(a) * 88, 128 + Math.sin(a) * 88); c.lineTo(128 + Math.cos(a) * 116, 128 + Math.sin(a) * 116); c.stroke(); } break;
    case 'star': c.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, r = k % 2 ? 42 : 104; c.lineTo(128 + Math.cos(a) * r, 136 + Math.sin(a) * r); } c.closePath(); c.stroke(); break;
    case 'slice': c.beginPath(); c.moveTo(128, 230); c.lineTo(40, 50); c.quadraticCurveTo(128, 10, 216, 50); c.closePath(); c.stroke(); c.beginPath(); c.moveTo(52, 74); c.quadraticCurveTo(128, 38, 204, 74); c.stroke(); for (const [x, y] of [[110, 100], [150, 120], [124, 160]] as const) arc(x, y, 13); break;
    case 'cup': c.beginPath(); c.moveTo(50, 110); c.lineTo(60, 210); c.lineTo(170, 210); c.lineTo(180, 110); c.closePath(); c.stroke(); arc(196, 150, 26, -Math.PI / 2, Math.PI / 2); for (const x of [90, 130]) { c.beginPath(); c.moveTo(x, 90); c.bezierCurveTo(x - 20, 70, x + 20, 50, x, 26); c.stroke(); } break;
  }
}

/** The chapel's white stretch limo, from the town's sedan (kit.ts sedan(), called, not copied): built at a sedan's
 *  length, cut through its back door and pulled apart to LIMO.len, the body's straight middle (its loft, glass, roof
 *  and spear run straight there) stretched across the gap and the back wheels moved with the tail; in the stretch a
 *  passenger door and two fixed windows a side between new pillars, a vinyl landau panel over the roof's back half, an
 *  antenna; JUST MARRIED on a card off its back bumper, cans trailing on their strings. White held to a lavender grey
 *  (the colour script: nothing white stands up to the lines' pink). Nose +z. */
function stretchLimo(): THREE.Group {
  const base = 5.0, S = LIMO.len - base, paint = '#aaa4ba', car = sedan({ color: paint, length: base });
  // (the cut: behind the B-pillar and ahead of the back door's seam, as sedan() lays a 5 m car out)
  const cut = -0.45, wheels = (car.userData.roll as { wheels: THREE.Object3D[] }).wheels;
  for (const part of car.children) {
    if (wheels.includes(part)) { part.position.z += Math.sign(part.position.z) * S / 2; continue; }
    part.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const p = m.geometry.getAttribute('position');
      for (let j = 0; j < p.count; j++) p.setZ(j, p.getZ(j) + (p.getZ(j) > cut ? S / 2 : -S / 2));
      p.needsUpdate = true; m.geometry.computeBoundingBox(); m.geometry.computeBoundingSphere();
    });
  }
  // its stretch, in sedan()'s own measures: the belt and the roof (m up); the side glass's plane, leaning in from the
  // ring under it (hb out at yb up) to the roof's edge (hr); the B-pillar and the side glass's back end once pulled
  // apart (m along); the flank's curve at the seams' and the rocker's heights (m out)
  const belt = 0.87, roof = 1.27, yb = belt - 0.08, hb = 0.76, hr = 0.63, zB = 0.03 + S / 2, zBack = -1.08 - S / 2, zRoofBack = -0.778 - S / 2, hl = LIMO.len / 2;
  const x = new THREE.Group(); car.add(x);
  const span = zB - zBack, pillars = [zB - span * 0.25, zB - span * 0.5, zB - span * 0.75];
  /** A strip laid from (x0, y0) to (x1, y1) on side s at z, `w` along the car, `t` thick. */
  const strip = (s: number, x0: number, y0: number, x1: number, y1: number, z: number, w: number, t: number, col: string) => {
    const len = Math.hypot(x1 - x0, y1 - y0), m = tbox(x, t, len, w, s * (x0 + x1) / 2, (y0 + y1) / 2, z, col);
    m.rotation.z = s * Math.atan2(x0 - x1, y1 - y0); return m;
  };
  for (const s of [1, -1]) {
    // the new pillars on the side glass's plane, splitting its long pane into four
    for (const z of pillars) strip(s, hb + 0.006, yb, hr + 0.006, roof, z, 0.075, 0.012, paint);
    // the passenger door (behind the B-pillar) and the back door's front seam, on the flank's curve; the door's handle
    for (const z of [pillars[0]!, pillars[2]!]) strip(s, 0.889, 0.45, 0.842, 0.76, z, 0.014, 0.012, '#1d2026');
    tbox(x, 0.02, 0.025, 0.12, s * 0.81, 0.79, pillars[0]! - 0.13, WORLD.chrome);
    tbox(x, 0.015, 0.05, span, s * 0.862, 0.38, (zB + zBack) / 2, WORLD.chrome); // (a chrome rocker along the stretch)
  }
  tbox(x, 2 * hr - 0.06, 0.03, zB - 0.4 - (zRoofBack + 0.08), 0, roof + 0.008, (zB - 0.4 + zRoofBack + 0.08) / 2, '#7c768c'); // the landau panel
  tbox(x, 0.02, 0.09, 0.26, 0, roof + 0.06, zRoofBack + 0.35, '#2a2a30'); // the antenna's fin
  // the wedding's ribbons down its hood from the windshield's corners to a bow on its nose (seen from the street ahead:
  // the cans and the card are behind it)
  const zA = 0.998 + S / 2, bow = new THREE.Vector3(0, 0.82, hl - 0.25);
  for (const s of [1, -1]) {
    const from = new THREE.Vector3(s * 0.72, belt + 0.02, zA), d = bow.clone().sub(from), rib = tbox(x, 0.08, 0.012, d.length(), (from.x + bow.x) / 2, (from.y + bow.y) / 2 + 0.01, (from.z + bow.z) / 2, '#d8c4cc');
    rib.rotation.order = 'YXZ'; rib.rotation.y = Math.atan2(d.x, d.z); rib.rotation.x = -Math.atan2(d.y, Math.hypot(d.x, d.z));
    part(x, new THREE.SphereGeometry(0.09, 10, 8).scale(1, 0.55, 0.5), '#d8c4cc', s * 0.08, bow.y + 0.05, bow.z);
  }
  // the cans on their strings off the back bumper, lying on the road behind it
  [[-0.5, 0.75], [-0.15, 1.15], [0.2, 0.9], [0.52, 1.35]].forEach(([cx, back]) => {
    const z = -hl - back!, can = tcyl(x, 0.045, 0.12, cx!, 0.045, z, '#9a98a2', 10); can.rotation.z = Math.PI / 2; can.rotation.y = cx! * 0.8;
    const y0 = 0.4, z0 = -hl - 0.04, len = Math.hypot(z - z0, y0 - 0.05), str = tbox(x, 0.008, 0.008, len, cx! * 0.6, (y0 + 0.05) / 2, (z + z0) / 2, '#c8c4cc');
    str.rotation.x = -Math.atan2(y0 - 0.05, z0 - z);
  });
  fuse(x);
  // JUST MARRIED on a card hung off the back bumper (painted: it takes the street's light)
  const card = plane(car, 0.92, 0.34, 0, 0.5, -hl - 0.11, painted(canvasTex(512, 190, (c) => {
    c.fillStyle = '#e6e0d4'; c.fillRect(0, 0, 512, 190); c.strokeStyle = '#b04a5a'; c.lineWidth = 6; c.strokeRect(10, 10, 492, 170);
    c.fillStyle = '#3a2a3a'; c.textAlign = 'center'; c.textBaseline = 'middle'; fitText(c, 'JUST MARRIED', 256, 98, 440, 96, 700, 0.06);
    c.fillStyle = '#b04a5a'; for (const hx of [40, 472]) { c.beginPath(); c.moveTo(hx, 112); c.bezierCurveTo(hx - 26, 92, hx - 18, 66, hx, 80); c.bezierCurveTo(hx + 18, 66, hx + 26, 92, hx, 112); c.fill(); }
  })));
  card.rotation.set(0.12, Math.PI, 0);
  return car;
}

/** The flicker on: dark before, stuttering on over the last 1.1 s before `start`, lit from it. */
const flickAt = (t: number, start: number) => {
  if (t >= start) return 1;
  const u = 1 - (start - t) / 1.1;
  if (u < 0) return 0.04;
  return (t * 13) % 1 < 0.25 + 0.55 * u ? 1 : 0.05;
};

let measurer: CanvasRenderingContext2D | null = null;
/** Where carrierart.ts draws a neon face's rows' backplates (m, in its face's frame: each row's middle, the plate's
 *  width and height): Bodoni italic at its em, shrunk as the face shrinks a row too wide for it. */
function neonPlates(c: Pick<Carrier, 'rows' | 'em' | 'w' | 'h'>) {
  const x = (measurer ??= document.createElement('canvas').getContext('2d')!);
  x.font = font(F.bodoni(700, { italic: true }), 100);
  const ws = c.rows.map((r) => (x.measureText(r).width / 100) * c.em), widest = Math.max(...ws), k = widest > c.w * 0.92 ? (c.w * 0.92) / widest : 1;
  const rh = c.h / c.rows.length;
  return c.rows.map((_, r) => ({ y: c.h / 2 - rh * (r + 0.5), w: Math.min(c.w * 0.96, (ws[r]! + c.em * 0.8) * k), h: rh * 0.76 }));
}
/** A plate with rounded corners, `d` thick, centred on its middle. */
function roundPlate(w: number, h: number, r: number, d: number): THREE.BufferGeometry {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 4 }).translate(0, 0, -d / 2);
}

/** The lines' pink (carrierart.ts's neon), for what belongs to them: their frames, their light on the wet road. */
const PINK = '#ff4fa3';
/** Everything else's neon: greyed, so no other colour stands up to the pink — dusty teal, amber, slate blue, brick,
 *  sage, lavender. */
const C = { teal: '#5d9a92', amber: '#c29a5c', blue: '#6c84b0', red: '#b25454', green: '#6aa884', violet: '#8f7db4', orange: '#bf7f4c', rose: '#b07a92' };
/** How bright the strip's own neon shines (x its colour), against the lines' GLOW.neon (2.6): under half, so it reads
 *  as lit without blooming over them. */
const SECONDARY = 1.05;
/** A word's neon (the chapel's bells and rings) comes on over this long from its word's start (s): eased, not snapped. */
const WORD_ON = 0.15;
/** The strip's other businesses, on the lots between the lines' own: each a trade with its own front — its sign over its
 *  glass (a lit box sign on its band, or its name in tube on a raceway, a drawing beside it), its own room behind the
 *  glass (the atlas's cells), the neon it hangs in its window, a blade down its corner on a building tall enough, an
 *  awning (two colours: striped). The user, 2026-10-16: no adult signs ("I don't think there needs to be like a peep
 *  show sign ... LIVE NUDES ... I don't think I want to advertise that so explicitly"), and "the storefront is, like,
 *  super bland. I don't know what it's supposed to be". (No HOTEL or PAWN among them: those are the lines' own.) */
type Icon = 'donut' | 'record' | 'martini' | 'eye' | 'star' | 'slice' | 'cup';
interface StripTrade { name: string; sign: 'box' | 'neon'; bg: string; ink: string; sub?: string; icon?: Icon; rooms: number[]; window?: readonly [string, string]; blade?: readonly [string, string]; awning?: readonly string[]; tall?: boolean; closed?: boolean }
const STRIP: Record<string, StripTrade> = {
  // (the one the user picked out at 142 s, bottom right: its own front below — bars, posters, the ATM, the camera)
  checks: { name: 'CHECKS CASHED', sign: 'box', bg: '#d6b23e', ink: '#1c3a28', sub: 'PAYDAY LOANS · MONEY ORDERS', rooms: [24], window: ['OPEN', C.red] },
  donuts: { name: 'DONUTS', sign: 'neon', bg: '', ink: C.orange, icon: 'donut', rooms: [25], window: ['HOT NOW', C.red], blade: ['DONUTS', C.orange], awning: ['#6a3a2a', '#a89878'] },
  diner: { name: 'DINER', sign: 'box', bg: '#2a4a52', ink: '#e0d0a8', sub: 'BREAKFAST ALL NIGHT', rooms: [4], window: ['OPEN', C.red], blade: ['EAT', C.red], awning: ['#5a2a30', '#a89878'] },
  records: { name: 'RECORDS', sign: 'neon', bg: '', ink: C.blue, icon: 'record', rooms: [8], window: ['OPEN', C.red], blade: ['RECORDS', C.amber] },
  tattoo: { name: 'TATTOO', sign: 'neon', bg: '', ink: C.green, icon: 'star', rooms: [26], window: ['WALK-INS', C.amber], blade: ['TATTOO', C.green] },
  motel: { name: 'MOTEL', sign: 'box', bg: '#3a2a44', ink: '#d8c8a8', sub: 'ROOMS $9.99 · POOL · A/C', rooms: [28], window: ['VACANCY', C.red], blade: ['MOTEL', C.rose], tall: true },
  laundry: { name: 'COIN LAUNDRY', sign: 'box', bg: '#34587a', ink: '#e0dccc', sub: 'OPEN 24 HOURS', rooms: [2, 31], window: ['24 HRS', C.blue] },
  lounge: { name: 'COCKTAILS', sign: 'neon', bg: '', ink: C.teal, icon: 'martini', rooms: [3], window: ['COLD BEER', C.amber], blade: ['LOUNGE', C.teal], awning: ['#2a3048'] },
  psychic: { name: 'PSYCHIC', sign: 'neon', bg: '', ink: C.violet, icon: 'eye', rooms: [27], window: ['READINGS', C.violet] },
  bail: { name: 'BAIL BONDS', sign: 'box', bg: '#28386a', ink: '#e4dcc4', sub: '24 HOURS · 555-0144', rooms: [20], window: ['OPEN 24', C.blue] },
  tacos: { name: 'TACOS', sign: 'box', bg: '#c49a3c', ink: '#561c1c', sub: 'BURRITOS · TORTAS', rooms: [29], window: ['OPEN', C.red], awning: ['#2a5a3a'] },
  arcade: { name: 'ARCADE', sign: 'neon', bg: '', ink: C.blue, icon: 'star', rooms: [30], blade: ['ARCADE', C.violet] },
  pizza: { name: "LUCA'S", sign: 'neon', bg: '', ink: C.amber, icon: 'slice', rooms: [29], window: ['PIZZERIA', C.orange], awning: ['#5a2a2a', '#a89878'] }, // (Luca's: the user's Easter egg, 2026-10-16, "sneaking it in somewhere")
  barber: { name: 'BARBER', sign: 'box', bg: '#d4ccbc', ink: '#2a3a6a', sub: 'CUTS · SHAVES · FADES', rooms: [9], window: ['OPEN', C.red], awning: ['#2a3a6a', '#a89878'] },
  coffee: { name: 'COFFEE', sign: 'neon', bg: '', ink: C.amber, icon: 'cup', rooms: [4], window: ['OPEN', C.red], awning: ['#3e3a30'] },
  shoes: { name: 'SHOE REPAIR', sign: 'box', bg: '#5a2a2a', ink: '#d8c8a0', sub: 'KEYS CUT · WHILE U WAIT', rooms: [5], closed: true },
};
/** The trades dealt to the lots in turn (checks to its own lot): none repeated within the last few on a side. */
const DEAL = ['donuts', 'pizza', 'records', 'tattoo', 'motel', 'laundry', 'lounge', 'psychic', 'bail', 'tacos', 'arcade', 'diner', 'barber', 'coffee', 'shoes']; // (Luca's where the camera opens on the Strip, at its edge)
/** Signs on a frame on a tall filler's roof, facing the street (where no view of the words crosses them). */
const ROOF_WORDS = [['JAZZ', C.amber], ['BILLIARDS', C.teal], ['KARAOKE', C.violet], ['STEAKS · CHOPS', C.orange], ['BOWL', C.blue], ['DANCING', C.rose]] as const;

/** People on the sidewalks: how many a side, their pace (m/s), and how far from the kerb's edge they walk (m: clear of
 *  the kerb's furniture). */
const PEOPLE = { perSide: 22, v: [0.9, 1.5] as [number, number], from: [0.95, 2.4] as [number, number] };
/** The kerb's furniture (hydrants, meters, bins, newspaper boxes): how far apart (m), how far in from the kerb's edge. */
const KERB = { every: 7, in: 0.42 };
/** The traffic: cars ahead in their lane (m ahead of the car at the verse's start, m/s), oncoming in the other. */
const TRAFFIC = {
  ahead: [[26, 8.6], [52, 9]] as [number, number][], oncoming: [[60, -10], [110, -9], [150, -11]] as [number, number][],
  /** The oncoming cars' line (m off the centre): a car's width in from the left kerb's parked cars (blocks.ts PARKED).
   *  In their lane's middle (−LANE) they drove 0.7 m into the parked cars' sides. */
  oncomingLane: -(PARKED.lateral - 1.9),
};
/** Street lamps on both kerbs: every `every` m (staggered), their height and reach over the road, their glow (a dim
 *  sodium amber: at the town's full strength their heads were the frame's brightest white). */
const LAMPS = { every: 26, h: 7.4, reach: 2.4, kerb: 0.5, glow: 1.4 };
/** How bright the windows' rooms are lit (x their drawn colours): low, so the glass reads as rooms, not lightboxes. */
const ROOMS = { fill: 0.72, shop: 0.7 };
/** The chapel (m, in its front's frame): its gable's rise over the wall, the portico (width, depth, height to its
 *  roof), the steeple (its tower's side, how far back on the roof, the belfry's height, the spire's), the lawn's
 *  depth to its picket fence. (Its limo at the kerb: drive/sets/verse3.ts LIMO.) */
/** The chapel's sign's heart: its top over the line's middle (m), its width to its height's (x the classic curve's), how
 *  far its tip stands off the portico's roof (m). */
const HEART = { top: 2.9, wide: 1.0, lift: 0.15 };
const CHAPEL = { gable: 3.2, portico: { w: 4.6, d: 1.6, h: 2.95 }, steeple: { side: 2.3, back: 2.2, tower: 3.6, belfry: 2.2, spire: 3.6 }, lawn: 1.3 };

/** The rooms seen through the fillers' windows: an atlas of 8 x 4 cells, each a room of its own. Shops' ground-floor
 *  rooms (each trade's own: STRIP), the floors' rooms above, and dark ones (the user, 2026-10-15: "it's kind of just
 *  like a repeating texture. all of the windows"). No words in them: on the left the fronts are mirrored. */
const ATLAS = { cols: 8, rows: 4, cell: 256 };
const CELLS = { roomLit: [10, 11, 12, 13, 14, 15, 16, 20, 21, 22], roomDark: [17, 18, 19, 23] };
function roomAtlas(): THREE.CanvasTexture {
  const { cols, rows, cell: S } = ATLAS;
  return canvasTex(cols * S, rows * S, (c) => {
    const rect = (x: number, y: number, w: number, h: number, col: string) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
    const disc = (x: number, y: number, r: number, col: string) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); };
    const rnd = (k: number, j: number) => hash(k, j, 977);
    const cellAt = (k: number, draw: () => void) => { c.save(); c.translate((k % cols) * S, Math.floor(k / cols) * S); c.beginPath(); c.rect(0, 0, S, S); c.clip(); draw(); c.restore(); };
    const shelves = (k: number, wall: string, shelf: string, wares: string[]) => {
      rect(0, 0, S, S, wall);
      for (let y = 70; y < S; y += 64) {
        rect(0, y, S, 6, shelf);
        for (let x = 6, j = 0; x < S - 10; j++) { const w = 10 + rnd(k, j) * 18, h = 16 + rnd(k, j + 50) * 30; if (rnd(k, j + 90) > 0.18) rect(x, y - h, w, h, wares[j % wares.length]!); x += w + 3; }
      }
      rect(0, 0, S, 22, 'rgba(255,240,210,0.18)'); // (the ceiling's light)
    };
    const dark = (k: number, base: string) => {
      rect(0, 0, S, S, base);
      const g = c.createLinearGradient(0, 0, S, S); g.addColorStop(0, 'rgba(160,150,190,0)'); g.addColorStop(0.45, 'rgba(160,150,190,0.10)'); g.addColorStop(0.55, 'rgba(160,150,190,0)');
      c.fillStyle = g; c.fillRect(0, 0, S, S);
      if (k % 2) rect(S * 0.6, S * 0.35, S * 0.3, S * 0.65, 'rgba(0,0,0,0.25)'); // (a shape in the dark)
    };
    const blinds = (wall: string, slat: string, open: number) => {
      rect(0, 0, S, S, wall);
      for (let y = 0; y < S * open; y += 12) rect(0, y, S, 8, slat);
    };
    /** A person seen through the glass: a silhouette standing, feet at `foot`, `h` px tall. */
    const who = (x: number, foot: number, h: number, col: string) => {
      c.fillStyle = col; const top = foot - h;
      c.beginPath(); c.arc(x, top + h * 0.075, h * 0.075, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.roundRect(x - h * 0.15, top + h * 0.17, h * 0.3, h * 0.4, h * 0.08); c.fill();
      c.fillRect(x - h * 0.11, top + h * 0.5, h * 0.22, h * 0.5);
    };
    const curtains = (glow: string, cloth: string, gap: number) => {
      rect(0, 0, S, S, glow);
      for (const [x0, x1] of [[0, S / 2 - gap], [S / 2 + gap, S]] as const) { rect(x0, 0, x1 - x0, S, cloth); for (let x = x0 + 8; x < x1; x += 22) rect(x, 0, 5, S, 'rgba(0,0,0,0.18)'); }
    };
    // 0 a corner store's shelves, warm; 1 the same under cooler light
    cellAt(0, () => shelves(0, '#6e5a48', '#8a7a68', ['#8a4a42', '#a08850', '#4a6a7a', '#7a7a5a']));
    cellAt(1, () => shelves(1, '#4e5c5a', '#6a7472', ['#7a5a5a', '#8a8a6a', '#4a5a6a', '#5a6a5a']));
    // 2 a laundromat: a row of round doors, the dryers above
    cellAt(2, () => { rect(0, 0, S, S, '#56606a'); for (let x = 32; x < S; x += 64) { rect(x - 28, 120, 56, 120, '#7a8088'); disc(x, 180, 20, '#2e3640'); disc(x, 180, 13, '#4a5664'); rect(x - 28, 20, 56, 80, '#6a7078'); disc(x, 60, 18, '#2e3640'); } });
    // 3 a dim bar: dark, the back bar's bottles glinting, pendant lamps
    cellAt(3, () => { rect(0, 0, S, S, '#2a1e22'); rect(0, 120, S, 8, '#4a3428'); for (let x = 8; x < S; x += 14) rect(x, 92 + rnd(3, x) * 10, 8, 28, ['#7a5a32', '#4a6a4a', '#6a3a32'][x % 3]!); for (const x of [50, 128, 206]) { rect(x - 1, 0, 2, 40, '#000'); disc(x, 46, 11, '#c08a4a'); } rect(0, 190, S, 66, '#3a2a24'); });
    // 4 a diner's counter, stools, the menu board
    cellAt(4, () => { rect(0, 0, S, S, '#7a6650'); rect(20, 30, S - 40, 46, '#3a3430'); for (let x = 34; x < S - 30; x += 26) rect(x, 42, 16, 4, '#9a9070'); rect(0, 150, S, 40, '#8a5a4a'); for (let x = 30; x < S; x += 50) { rect(x - 3, 190, 6, 50, '#3a3434'); disc(x, 186, 13, '#7a3a3a'); } });
    // 5 closed: the roll-down grille
    cellAt(5, () => { rect(0, 0, S, S, '#2a2830'); for (let y = 0; y < S; y += 10) rect(0, y, S, 3, '#3c3a44'); rect(0, S - 18, S, 18, '#1e1c22'); });
    // 6 an empty shop, dark
    cellAt(6, () => dark(6, '#1a1820'));
    // 7 dark, a small OPEN sign glowing red in it (drawn back to front on the left: the fronts there are mirrored)
    cellAt(7, () => { dark(7, '#1e1a22'); c.save(); c.shadowColor = '#b04a4a'; c.shadowBlur = 14; c.strokeStyle = '#c86060'; c.lineWidth = 5; c.beginPath(); c.roundRect(60, 96, 136, 56, 12); c.stroke(); c.font = font(F.sign(700), 36); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#d07070'; c.fillText('OPEN', 128, 126); c.restore(); });
    // 8 records in bins, posters on the wall
    cellAt(8, () => { rect(0, 0, S, S, '#4a3e4e'); for (let x = 10; x < S; x += 48) rect(x, 30, 36, 50, ['#6a5a3a', '#3a5a6a', '#6a3a4a', '#5a6a4a'][(x / 48) | 0 % 4] ?? '#5a5a5a'); for (let x = 0; x < S; x += 8) rect(x, 170 - rnd(8, x) * 30, 6, 90, ['#2a2430', '#5a4a3a', '#3a3a50'][x % 3]!); });
    // 9 a beauty salon: mirrors, chairs
    cellAt(9, () => { rect(0, 0, S, S, '#6a5a64'); for (const x of [50, 128, 206]) { rect(x - 26, 40, 52, 70, '#8a8a96'); rect(x - 22, 44, 44, 62, '#5a6070'); rect(x - 18, 150, 36, 40, '#3a2a30'); rect(x - 4, 190, 8, 50, '#2a2228'); } });
    // the floors' rooms: 10 blinds closed, lit amber; 11 blinds half up over a lamp
    cellAt(10, () => blinds('#7a5a3a', '#9a7a52', 1));
    cellAt(11, () => { rect(0, 0, S, S, '#5a4a40'); disc(170, 170, 26, '#a07a4a'); rect(165, 196, 10, 50, '#3a2a24'); for (let y = 0; y < S * 0.45; y += 12) rect(0, y, S, 8, '#8a7a62'); });
    // 12 curtains drawn, maroon, a gap of light; 13 grey-teal curtains
    cellAt(12, () => curtains('#9a7a50', '#5a2a32', 10));
    cellAt(13, () => curtains('#7a7a6a', '#3a4a4e', 4));
    // 14 a room: a picture on the wall, a lamp's shade
    cellAt(14, () => { rect(0, 0, S, S, '#6a5a4c'); rect(40, 50, 70, 54, '#3a3432'); rect(46, 56, 58, 42, '#5a6a6a'); rect(170, 120, 50, 36, '#a4885a'); rect(192, 156, 6, 70, '#2a2420'); rect(0, 226, S, 30, '#4a3a34'); });
    // 15 a room by a television's blue light
    cellAt(15, () => { const g = c.createRadialGradient(80, 200, 10, 80, 200, 220); g.addColorStop(0, '#5a6a8a'); g.addColorStop(1, '#2a2e40'); c.fillStyle = g; c.fillRect(0, 0, S, S); rect(160, 150, 80, 106, '#1e2030'); });
    // 16 plants on the sill against a warm room
    cellAt(16, () => { rect(0, 0, S, S, '#7a604a'); for (const x of [40, 110, 190]) { rect(x - 16, 210, 32, 46, '#4a3028'); for (let k = 0; k < 6; k++) { c.fillStyle = '#2e3a2e'; c.beginPath(); c.ellipse(x + (k - 2.5) * 9, 180 - (k % 3) * 18, 10, 30, (k - 2.5) * 0.3, 0, Math.PI * 2); c.fill(); } } });
    // 17 dark, a curtain's edge; 18 dark; 19 dark behind closed blinds
    cellAt(17, () => { dark(17, '#1c1a24'); rect(0, 0, 40, S, '#26222e'); });
    cellAt(18, () => dark(18, '#18161e'));
    cellAt(19, () => blinds('#1c1a22', '#26242e', 1));
    // 20 an office under pale tubes; 21 a kitchen's cabinets; 22 sheer curtains, warm
    cellAt(20, () => { rect(0, 0, S, S, '#5e6660'); rect(20, 12, 90, 8, '#8a948a'); rect(140, 12, 90, 8, '#8a948a'); for (let x = 20; x < S; x += 80) { rect(x, 170, 60, 10, '#3a3e3a'); rect(x + 10, 130, 36, 30, '#2a2e2e'); } });
    cellAt(21, () => { rect(0, 0, S, S, '#7a6a52'); for (let x = 0; x < S; x += 64) { rect(x + 4, 20, 56, 70, '#5a4632'); rect(x + 4, 160, 56, 96, '#5a4632'); } rect(0, 150, S, 10, '#8a7a62'); });
    cellAt(22, () => { rect(0, 0, S, S, '#8a6e50'); for (let x = 0; x < S; x += 16) rect(x, 0, 8, S, 'rgba(230,210,180,0.22)'); });
    cellAt(23, () => { dark(23, '#1a1820'); rect(0, 0, S, 14, '#24202c'); });
    // the trades' own rooms (STRIP), each with its people
    // 24 a check-casher's: the counter behind its thick glass, a clerk at each window, the rates board, the tubes
    cellAt(24, () => {
      rect(0, 0, S, S, '#5c6a66'); for (const x of [30, 150]) rect(x, 6, 80, 7, '#a8b4ac');
      rect(14, 26, 70, 46, '#232a2a'); for (let k = 0; k < 5; k++) rect(20, 32 + k * 8, 40 + rnd(24, k) * 18, 3, '#b8c49a');
      who(118, 168, 120, '#2a2a30'); who(200, 168, 116, '#3a3034');
      rect(0, 140, S, 116, '#40464a'); rect(0, 136, S, 8, '#8a8e86'); for (let x = 12; x < S; x += 40) rect(x, 160, 28, 70, '#4a5054');
      c.fillStyle = 'rgba(200,232,228,0.13)'; c.fillRect(90, 40, S - 90, 96); for (const x of [90, 160, 230]) rect(x - 2, 40, 5, 96, '#7a827e');
      rect(96, 128, 52, 6, '#2a2e30'); rect(166, 128, 52, 6, '#2a2e30'); // (the deal trays)
    });
    // 25 a donut shop: the menu over the case, trays of donuts, the clerk, the floor's tiles
    cellAt(25, () => {
      rect(0, 0, S, S, '#86684e'); rect(10, 10, S - 20, 40, '#2a2420'); for (let k = 0; k < 3; k++) for (let j = 0; j < 4; j++) rect(18 + j * 58, 17 + k * 11, 38, 4, '#d0b070');
      who(80, 150, 110, '#2a2026'); rect(60, 70, 40, 20, '#c8c0b0');
      rect(0, 120, S, 100, '#5a4a40'); c.fillStyle = 'rgba(220,210,190,0.18)'; c.fillRect(6, 124, S - 12, 86);
      for (let k = 0; k < 3; k++) for (let x = 20; x < S - 10; x += 26) { const col = ['#a86a70', '#5a3424', '#c49a58', '#8a5a3a'][(x / 26 + k) % 4 | 0]!; disc(x, 140 + k * 26, 10, col); disc(x, 140 + k * 26, 3.5, '#4a3a30'); }
      for (let y = 222; y < S; y += 12) for (let x = (y / 12) % 2 ? 0 : 12; x < S; x += 24) rect(x, y, 12, 12, '#6a5a4c');
    });
    // 26 a tattoo parlour: flash framed on the walls, the chair under its lamp, the artist at work
    cellAt(26, () => {
      rect(0, 0, S, S, '#4a2228');
      for (let k = 0; k < 2; k++) for (let j = 0; j < 7; j++) { const x = 10 + j * 35, y = 14 + k * 46; rect(x, y, 30, 40, '#1a1012'); rect(x + 2, y + 2, 26, 36, '#b8a888'); for (let q = 0; q < 3; q++) disc(x + 8 + q * 7, y + 12 + (q % 2) * 12, 4, ['#8a3a3a', '#3a6a5a', '#c89a4a', '#3a4a7a'][(j + k + q) % 4]!); }
      rect(60, 170, 120, 20, '#1a1416'); c.save(); c.translate(170, 170); c.rotate(-0.5); rect(0, -14, 70, 18, '#1a1416'); c.restore(); rect(110, 190, 12, 50, '#2a2426');
      rect(200, 108, 4, 70, '#2a2426'); disc(180, 108, 14, '#c8b080'); who(56, 230, 112, '#241a1e'); rect(0, 236, S, 20, '#2a1a1e');
    });
    // 27 a psychic's parlour: draped in violet, a crystal ball glowing on its table, candles, the palm on the wall
    cellAt(27, () => {
      rect(0, 0, S, S, '#33264a'); for (let x = 0; x < S; x += 20) rect(x, 0, 8, S, 'rgba(0,0,0,0.18)');
      const g = c.createRadialGradient(128, 150, 4, 128, 150, 90); g.addColorStop(0, 'rgba(190,170,240,0.85)'); g.addColorStop(0.25, 'rgba(150,130,210,0.35)'); g.addColorStop(1, 'rgba(120,100,180,0)'); c.fillStyle = g; c.fillRect(0, 40, S, 200);
      disc(128, 158, 22, '#b4a4e0'); disc(122, 152, 7, '#e0d8f4');
      c.fillStyle = '#4e2e5a'; c.beginPath(); c.ellipse(128, 196, 96, 22, 0, 0, Math.PI * 2); c.fill(); rect(32, 196, 192, 60, '#4e2e5a');
      for (const x of [56, 200]) { rect(x - 3, 168, 6, 22, '#c8bc98'); disc(x, 164, 4, '#e8c070'); }
      c.strokeStyle = '#a090c0'; c.lineWidth = 3; c.beginPath(); c.roundRect(186, 30, 44, 60, 16); c.stroke(); for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(192 + k * 10, 34); c.lineTo(192 + k * 10, 12); c.stroke(); }
      who(40, 240, 104, '#1e1628');
    });
    // 28 a motel's office: panelled, the key board behind the desk, the clerk, the bell, a soda machine
    cellAt(28, () => {
      rect(0, 0, S, S, '#6a4a32'); for (let x = 0; x < S; x += 22) rect(x, 0, 3, S, '#5a3e2a');
      rect(30, 28, 100, 64, '#4a3424'); for (let k = 0; k < 3; k++) for (let j = 0; j < 6; j++) { rect(38 + j * 15, 36 + k * 19, 3, 6, '#2a1e14'); rect(36 + j * 15, 42 + k * 19, 7, 9, '#c8b48a'); }
      who(84, 168, 112, '#2a2024'); rect(0, 140, 170, 116, '#4a3220'); rect(0, 136, 170, 8, '#8a6a48'); disc(140, 132, 6, '#c8a860');
      rect(186, 40, 56, 200, '#6a2a2c'); rect(194, 52, 40, 70, '#c8b8a0'); for (let k = 0; k < 4; k++) rect(196 + k * 10, 130, 6, 40, '#3a1a1c'); rect(196, 200, 36, 12, '#1a1012');
    });
    // 29 a counter's kitchen (tacos, pizza): the tiled wall, menu boards, the steel line, heat lamps, the cook
    cellAt(29, () => {
      rect(0, 0, S, S, '#86807a'); for (let y = 0; y < S; y += 16) rect(0, y, S, 1.5, '#6e6a64'); for (let x = 0; x < S; x += 16) rect(x, 0, 1.5, S, '#6e6a64');
      for (let j = 0; j < 3; j++) { rect(12 + j * 82, 12, 72, 52, '#1e1c1a'); for (let k = 0; k < 5; k++) rect(18 + j * 82, 20 + k * 8, 40 + rnd(29, j * 5 + k) * 18, 3, '#d8c080'); }
      for (const x of [70, 150, 220]) { rect(x - 1, 64, 2, 30, '#2a2a2a'); rect(x - 16, 94, 32, 8, '#8a3a2a'); }
      who(110, 190, 120, '#2a2226'); rect(0, 150, S, 106, '#7a7e80'); rect(0, 146, S, 8, '#a8acae'); for (let x = 20; x < S; x += 50) rect(x, 128, 34, 18, ['#8a6a3a', '#6a7a3a', '#9a4a2a'][(x / 50) % 3 | 0]!);
    });
    // 30 an arcade: dark, its cabinets' screens glowing, the players
    cellAt(30, () => {
      rect(0, 0, S, S, '#181222'); for (let x = 0; x < S; x += 6) for (let y = 220; y < S; y += 6) if (rnd(30, x * 7 + y) > 0.8) rect(x, y, 3, 3, ['#5a4a7a', '#3a6a6a', '#7a5a3a'][(x + y) % 3]!);
      for (let k = 0; k < 4; k++) { const x = 10 + k * 62; rect(x, 50, 50, 170, '#26203a'); rect(x + 4, 56, 42, 14, ['#b07a4a', '#6a8ab0', '#a06a9a', '#6aa08a'][k]!); rect(x + 6, 82, 38, 34, ['#4a9a9a', '#9a6ab4', '#c0a050', '#5a7ac0'][k]!); rect(x + 4, 128, 42, 10, '#3a3450'); }
      who(70, 236, 110, '#0e0a14'); who(196, 236, 104, '#0e0a14');
    });
    // 31 a laundromat's front: the folding table, someone folding, the change machine
    cellAt(31, () => {
      rect(0, 0, S, S, '#56606a'); for (const x of [40, 180]) rect(x, 8, 60, 6, '#a0a8a8');
      for (let x = 136; x < S; x += 60) { rect(x, 120, 52, 110, '#7a8088'); disc(x + 26, 170, 18, '#2e3640'); disc(x + 26, 170, 11, '#4a5664'); }
      rect(10, 60, 40, 90, '#6a7a6a'); rect(16, 70, 28, 20, '#a4b0a0');
      who(80, 236, 110, '#2a2a34'); rect(40, 160, 90, 10, '#9a948a'); rect(48, 170, 6, 66, '#4a4a50'); rect(116, 170, 6, 66, '#4a4a50'); for (let k = 0; k < 3; k++) rect(56 + k * 22, 148, 18, 12, ['#8a5a5a', '#5a6a8a', '#a09060'][k]!);
    });
    // and the people in the bar's, the diner's and the laundromat's rooms
    cellAt(3, () => { who(100, 250, 120, '#120a0c'); who(190, 120, 70, '#1e1214'); });
    cellAt(4, () => { who(150, 186, 100, '#2a2024'); who(60, 230, 96, '#3a2a2a'); });
    cellAt(2, () => who(110, 250, 118, '#2a2e36'));
  });
}

export function buildVerse3(drive: Drive): { group: THREE.Group; update(t: number): void } | null {
  const plan = drive.plans.verse3 as Verse3Plan | undefined;
  if (!plan) return null;
  const { route } = drive, root = new THREE.Group();
  const L = leftFront(route, root), R = rightFront(route, root), onRoad = roadFrame(route, root);
  /** A lot's own frame: x along its front (left to right from the road), y up from the road, z out toward the road
   *  (its front at z 0). */
  const lotFrame = (lot: Lot) => (lot.side < 0 ? L(lot.s, -STREET.front) : R(lot.s, STREET.front));
  const atRoad = (s: number, lateral: number, y: number) => { const f = route.frameAt(s); return f.pos.clone().addScaledVector(f.right, lateral).addScaledVector(UP, y); };
  const dark = toon({ color: '#1b1820' }), steel = toon({ color: '#4a4450' }), chrome = toon({ color: WORLD.chrome }), conduit = toon({ color: '#5b5660' });
  const bamboo = toon({ color: '#8a6c42' }), thatch = toon({ color: '#8e7048' });
  // (lit a little from within: in the street's shade a plain toon gold printed as brown)
  const gold = toon({ color: '#e8bc50', emissive: '#5a4214' });

  /** Every flickering or buzzing neon material: its line's start (it flickers on with it; none: always lit, a slight
   *  buzz), its lit brightness, whether it dances (a torch's flame). */
  const flicker: { m: THREE.MeshBasicMaterial; start?: number; peak: number; dance?: boolean; seed: number }[] = [];
  /** The marquee's and the pawn shop's bulbs, in two phases (they chase); the payphones' coin light (it blinks while
   *  they're told to call). */
  const marqueeBulbs: { m: THREE.ShaderMaterial; phase: number; k: number }[] = [];
  let coin: THREE.Mesh | null = null, coinStart = 0;
  /** Neon lit by a word (the chapel's bells and rings): dark until `at`, then on (eased in over WORD_ON s: no flash). */
  const wordLit: { m: THREE.MeshBasicMaterial; at: number; peak: number }[] = [];
  /** Stretches of kerb kept clear of lamps and furniture (the hotel's canopy posts stand there): side, middle, half. */
  const kerbClear: { side: number; s: number; half: number }[] = [];
  const neon = (g: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, tex: THREE.Texture, opts: { start?: number; peak?: number; dance?: boolean } = {}) => {
    const peak = opts.peak ?? SECONDARY;
    const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, color: new THREE.Color().setScalar(peak), side: THREE.DoubleSide });
    flicker.push({ m, start: opts.start, peak, dance: opts.dance, seed: flicker.length });
    return plane(g, w, h, x, y, z, m);
  };
  /** A lit picture (a sign's lightbox, a lit window): unlit, at `k` of its drawn colours — under them, so nothing but
   *  the lines' neon reaches white. */
  const litPic = (tex: THREE.Texture, k = 0.7) => pic(tex, { color: new THREE.Color(k, k, k) });
  /** A soft glow of colour (a wash on a wall, a pool on the sidewalk, a sign's reflection in the wet road). */
  const wash = (g: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, color: string, k: number, flat = false) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glowMaterial(color, k, true));
    m.position.set(x, y, z); if (flat) m.rotation.x = -Math.PI / 2; g.add(m); return m;
  };
  /** A sign's reflection in the wet road: a long pool of its colour from the kerb out across the lane, under it. */
  const reflect = (s: number, side: number, w: number, color: string, k = 0.55) => {
    const g = onRoad(s, side * (ROAD_HALF - 3));
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glowMaterial(color, k, true));
    m.rotation.x = -Math.PI / 2; m.scale.set(6, Math.max(1.6, w * 0.5), 1); m.position.y = 0.03; g.add(m);
  };

  // ---- the views to keep clear: while a phrase is up, nothing the props add may stand between the camera and its
  // words (the guard checks the drive's blocks; this checks the props the scene alone knows) ----
  const faces = drive.carriers.filter((c) => c.stretch === 'verse3');
  const eyeAt = (t: number) => { const p = drive.camera(t), c = Math.cos(p.pitch) * p.dist; return new THREE.Vector3(p.tx + Math.sin(p.yaw) * c, p.ty + Math.sin(p.pitch) * p.dist, p.tz + Math.cos(p.yaw) * c); };
  /** Where the lens is through the verse (every 0.1 s). */
  const lens: THREE.Vector3[] = [];
  for (let t = plan.t[0]; t < plan.t[1]; t += 0.1) lens.push(eyeAt(t));
  const views = (() => {
    const out: { t: number; eye: THREE.Vector3; pts: THREE.Vector3[] }[] = [];
    for (let t = plan.t[0]; t < plan.t[1]; t += 0.1) {
      const up = faces.filter((c) => t >= c.reveal && t < c.phrase.end + 0.6);
      if (!up.length) continue;
      out.push({ t, eye: eyeAt(t), pts: up.flatMap((c) => { const a = c.up.clone().cross(c.normal).normalize(); return [-0.5, 0, 0.5].flatMap((x) => [-0.5, 0, 0.5].map((y) => c.center.clone().addScaledVector(a, x * c.w).addScaledVector(c.up, y * c.h))); }) });
    }
    return out;
  })();
  /** Whether a thing (a vertical cylinder at p, its radius and height) would stand in a view at t (or any view). */
  const inView = (p: THREE.Vector3, r: number, h: number, t?: number) => views.some((v) => {
    if (t !== undefined && Math.abs(v.t - t) > 0.051) return false;
    if (v.eye.distanceTo(p) < r + 1.2) return true; // (nor by the lens)
    return v.pts.some((q) => {
      // the closest approach of the sight line to the thing's axis, in plan; its height there
      const d = q.clone().sub(v.eye), dx = d.x, dz = d.z, L2 = dx * dx + dz * dz;
      const u = Math.max(0, Math.min(1, ((p.x - v.eye.x) * dx + (p.z - v.eye.z) * dz) / (L2 || 1)));
      const x = v.eye.x + dx * u, z = v.eye.z + dz * u, y = v.eye.y + d.y * u;
      return Math.hypot(x - p.x, z - p.z) < r && y > p.y - 0.1 && y < p.y + h;
    });
  });

  // ---- the strip's other businesses: a trade dealt to each filler with a shop (STRIP); the check casher on the right
  // beside the take up the street (142 s) ----
  const tradeOf = new Map<number, StripTrade>();
  {
    const fillers = plan.lots.map((lot, i) => ({ lot, i })).filter(({ lot, i }) => {
      const B = lotBlock(route, lot, i), apartments = lot.h <= 9 && hash(B.s, B.lateral, 2) > 0.72; // (as look/facades.ts decides: no shop)
      return lot.shop === undefined && !apartments;
    });
    // (the one beside the lens as the take up the street to the tiki bar's sign settles: the user's frame)
    const tiki = plan.signs.find((g) => g.theme === 'tiki')!, t = Math.min(...faces.filter((c) => Math.abs(c.s - tiki.s) < 0.01).map((c) => c.reveal)) + 0.75;
    const eye = eyeAt(t), cam = drive.camera(t), aim = new THREE.Vector3(cam.tx, cam.ty, cam.tz).sub(eye).normalize();
    const front = (l: Lot) => atRoad(l.s, l.side * STREET.front, 1.5), seen = (l: Lot) => front(l).sub(eye).normalize().dot(aim) > Math.cos(0.6);
    const checks = fillers.filter(({ lot }) => lot.side > 0 && seen(lot)).sort((a, b) => front(a.lot).distanceTo(eye) - front(b.lot).distanceTo(eye))[0];
    if (checks) tradeOf.set(checks.i, STRIP.checks!);
    for (const side of [-1, 1]) {
      const recent: string[] = [];
      let k = Math.floor(hash(side, 7, 707) * DEAL.length);
      for (const { lot, i } of fillers.filter((f) => f.lot.side === side).sort((a, b) => a.lot.s - b.lot.s)) {
        if (tradeOf.has(i)) { recent.push('checks'); continue; }
        let name = DEAL[k % DEAL.length]!;
        for (let n = 0; n < DEAL.length && (recent.slice(-5).includes(name) || (STRIP[name]!.tall && lot.h < 9)); n++) name = DEAL[++k % DEAL.length]!;
        k += 1 + Math.floor(hash(i, 5, 709) * 3);
        tradeOf.set(i, STRIP[name]!); recent.push(name);
      }
    }
  }
  /** Each lot's own frame, made once (see lotFrame). */
  const frames = new Map<number, THREE.Group>();
  const frameOf = (i: number) => { let g = frames.get(i); if (!g) { g = lotFrame(plan.lots[i]!); frames.set(i, g); } return g; };

  // ---- the fronts: the town's geometry (look/facades.ts) for every lot but the chapel's (its own, below), in the
  // strip's colours: the stucco greyed and dimmed, the trim off white, each window a room of its own (the atlas; a
  // filler's shop's its trade's own); its sign is its trade's (below), not the town's painted band ----
  /** Each filler's ground-floor panes, in its lot's frame (x, y their middle; w, h; z their face; door: the one the
   *  town's front makes its door). */
  const panesOf = new Map<number, { x: number; y: number; w: number; h: number; z: number; door: boolean }[]>();
  {
    const walls: THREE.BufferGeometry[] = [], trim: THREE.BufferGeometry[] = [], glass: THREE.BufferGeometry[] = [];
    /** Greys a front's vertex colours toward their luminance and dims them (the night's street, not its signs). */
    const mute = (g: THREE.BufferGeometry, sat: number, k: number, ceil: number) => {
      const col = g.getAttribute('color');
      for (let j = 0; j < col.count; j++) {
        const r = col.getX(j), gg = col.getY(j), b = col.getZ(j), l = 0.3 * r + 0.59 * gg + 0.11 * b, m = Math.min(k, ceil / Math.max(l, 1e-3));
        col.setXYZ(j, (l + (r - l) * sat) * m, (l + (gg - l) * sat) * m, (l + (b - l) * sat) * m);
      }
    };
    plan.lots.forEach((lot, i) => {
      const shop = lot.shop !== undefined ? SHOPS[lot.shop]!.theme : undefined;
      if (shop === 'chapel') return;
      const f = facadeOf(lotBlock(route, lot, i)), ground = route.frameAt(lot.s).pos.y;
      mute(f.walls, 0.55, 0.82, 0.5); mute(f.trim, 0.45, 0.72, 0.42);
      walls.push(f.walls); trim.push(f.trim);
      // its panes: each a room from the atlas (some dark), mirrored back on the left (the front's own mirror); a
      // filler's shop's panes its trade's rooms, all lit (it's open), the door among them
      const pos = f.glass.getAttribute('position'), uv = f.glass.getAttribute('uv'), lit = f.glass.getAttribute('lit');
      const keep: number[] = [], panes: { x: number; y: number; w: number; h: number; z: number; door: boolean }[] = [], trade = tradeOf.get(i);
      const inv = shop ? null : frameOf(i).matrix.clone().invert();
      // (its door: the pane the town's front makes it, by the same hash: look/facades.ts)
      const B = lotBlock(route, lot, i), doorAt = Math.floor(hash(B.s, B.lateral, 3) * Math.max(1, Math.floor((lot.w - 1) / 3.2)));
      let low0 = 0;
      for (let p = 0; p * 4 < pos.count; p++) {
        const c = new THREE.Vector3();
        for (let j = 0; j < 4; j++) c.add(new THREE.Vector3().fromBufferAttribute(pos, p * 4 + j));
        c.multiplyScalar(0.25);
        const low = c.y - ground < 3.2;
        if (shop && low) continue; // (a business's ground floor is its own, below)
        keep.push(p);
        const r = (k: number) => hash(i, p, k);
        const on = lit.getX(p * 4) > 0.5 && (low || r(1) < 0.72);
        let k: number;
        if (low) {
          const ord = low0++;
          k = trade ? trade.rooms[ord % trade.rooms.length]! : 5; // (an apartment block's carport: its roll-down door)
          if (inv) {
            const q = [0, 1, 2, 3].map((j) => new THREE.Vector3().fromBufferAttribute(pos, p * 4 + j).applyMatrix4(inv));
            const x0 = Math.min(...q.map((v) => v.x)), x1 = Math.max(...q.map((v) => v.x)), y0 = Math.min(...q.map((v) => v.y)), y1 = Math.max(...q.map((v) => v.y));
            panes.push({ x: (x0 + x1) / 2, y: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0, z: q[0]!.z, door: ord === doorAt });
          }
        } else { const set = on ? CELLS.roomLit : CELLS.roomDark; k = set[Math.floor(r(2) * set.length)]!; }
        const cx = k % ATLAS.cols, cy = Math.floor(k / ATLAS.cols);
        for (let j = 0; j < 4; j++) {
          const v = p * 4 + j, u0 = uv.getX(v), v0 = uv.getY(v);
          uv.setXY(v, (cx + (lot.side < 0 ? 1 - u0 : u0)) / ATLAS.cols, 1 - (cy + 1 - v0) / ATLAS.rows);
        }
      }
      if (!shop) panesOf.set(i, panes.sort((a, b) => a.x - b.x));
      if (keep.length * 4 === pos.count) { glass.push(f.glass); return; }
      // (the business's ground-floor panes left out: a new index over the kept ones)
      const ix = f.glass.getIndex()!, idx: number[] = [];
      for (let q = 0; q < ix.count; q++) { const v = ix.getX(q); if (keep.includes(Math.floor(v / 4))) idx.push(v); }
      f.glass.setIndex(idx); glass.push(f.glass);
    });
    const fronts = new THREE.Group(); fronts.name = 'verse3-fronts'; root.add(fronts);
    // (one mesh a material; the empty ones left out — an apartment block's front has no sign — and the glass's `lit`
    // dropped: these rooms are lit by the atlas, not the town's shader)
    const m = (gs: THREE.BufferGeometry[]) => mergeGeometries(gs.filter((g) => g.getAttribute('position').count > 0).map((g) => { for (const n of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(n)) g.deleteAttribute(n); return g; }))!;
    fronts.add(new THREE.Mesh(m(walls), toon({ vertexColors: true })), new THREE.Mesh(m(trim), toon({ vertexColors: true })));
    fronts.add(new THREE.Mesh(m(glass), pic(roomAtlas(), { color: new THREE.Color().setScalar(ROOMS.fill) })));
  }

  // ---- a business's ground floor: its glass, its own rooms behind it (pane by pane: the trade's things, a lobby, a
  // dim bar, blinds, a dark pane), its door, the fascia with its small words, an awning ----
  /** Each trade's rooms, drawn once (512 x 384), and which a pane shows (by its place along the front). */
  const ROOMSETS: Record<Exclude<Theme, 'chapel'>, ((c: CanvasRenderingContext2D) => void)[]> = (() => {
    const W = 512, H = 384;
    const rect = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, col: string) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
    const disc = (c: CanvasRenderingContext2D, x: number, y: number, r: number, col: string) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); };
    const aisle = (wall: string, wares: string[], seed: number) => (c: CanvasRenderingContext2D) => {
      rect(c, 0, 0, W, H, wall);
      for (let y = 100; y < H; y += 92) { rect(c, 0, y, W, 8, '#7a8280'); for (let x = 10, j = 0; x < W - 12; j++) { const w = 12 + hash(seed, j, 3) * 20, h = 26 + hash(seed, j, 4) * 40; rect(c, x, y - h, w, h, wares[j % wares.length]!); x += w + 4; } }
      for (const x of [60, 250, 440]) rect(c, x, 8, 120, 10, '#9aa6a0'); // (the tubes, pale)
    };
    const bottles = (seed: number) => (c: CanvasRenderingContext2D) => {
      rect(c, 0, 0, W, H, '#4a3628');
      for (let y = 110; y < H; y += 100) { rect(c, 0, y, W, 8, '#6a4e36'); for (let x = 8, j = 0; x < W - 10; j++) { const w = 12 + hash(seed, j, 5) * 6, h = 50 + hash(seed, j, 6) * 30; c.fillStyle = ['#8a6030', '#4a6a3a', '#7a4a2a', '#a08048', '#3a4a5a'][j % 5]!; c.beginPath(); c.roundRect(x, y - h, w, h, [6, 6, 0, 0]); c.fill(); rect(c, x + w / 2 - 2, y - h - 14, 4, 16, '#2a2018'); x += w + 6; } }
    };
    const cooler = (c: CanvasRenderingContext2D) => { rect(c, 0, 0, W, H, '#2e3a40'); for (let x = 0; x < W; x += 128) { rect(c, x + 6, 10, 116, H - 20, '#3e5258'); for (let y = 70; y < H; y += 70) { rect(c, x + 6, y, 116, 4, '#5a6a6e'); for (let k = 0; k < 6; k++) rect(c, x + 12 + k * 18, y - 30, 12, 30, ['#7a4a3a', '#8a7a4a', '#4a5a7a'][k % 3]!); } rect(c, x + 104, H / 2 - 30, 6, 60, '#8a9294'); } };
    const lobbyTheatre = (c: CanvasRenderingContext2D) => { rect(c, 0, 0, W, H, '#3a1a20'); rect(c, 0, 260, W, 124, '#5a1e26'); rect(c, 140, 170, 230, 90, '#6a4a2a'); rect(c, 150, 180, 210, 30, '#8a6a3a'); for (const x of [40, 470]) { rect(c, x - 4, 210, 8, 60, '#8a7040'); disc(c, x, 210, 10, '#8a7040'); } rect(c, 40, 230, 430, 6, '#7a2030'); for (const x of [90, 420]) disc(c, x, 40, 16, '#a07848'); };
    const doorsDark = (c: CanvasRenderingContext2D) => { rect(c, 0, 0, W, H, '#1e1418'); for (let x = 0; x < W; x += 128) { rect(c, x + 8, 8, 112, H - 16, '#2a1c22'); rect(c, x + 20, H / 2, 88, 8, '#7a6440'); } };
    const bar = (c: CanvasRenderingContext2D) => { rect(c, 0, 0, W, H, '#24160e'); rect(c, 0, 150, W, 10, '#5a3a22'); for (let x = 10; x < W; x += 18) rect(c, x, 110 + hash(x, 1, 9) * 14, 10, 38, ['#8a5a2a', '#4a5a3a', '#7a3a2a', '#9a7a3a'][(x / 18) % 4 | 0]!); for (const x of [80, 256, 432]) { rect(c, x - 1, 0, 2, 60, '#000'); disc(c, x, 68, 18, '#b07a3a'); disc(c, x, 68, 9, '#d09a52'); } rect(c, 0, 250, W, 134, '#3a2416'); for (let x = 40; x < W; x += 70) { rect(c, x - 4, 290, 8, 94, '#1a100a'); disc(c, x, 286, 18, '#4a2a1a'); } };
    const bambooBlind = (c: CanvasRenderingContext2D) => { rect(c, 0, 0, W, H, '#6a4a2a'); for (let y = 0; y < H; y += 9) rect(c, 0, y, W, 6, '#8a6a40'); for (let x = 0; x < W; x += 128) rect(c, x + 60, 0, 6, H, '#4a3018'); };
    const lobbyHotel = (c: CanvasRenderingContext2D) => { rect(c, 0, 0, W, H, '#5a4a3a'); rect(c, 0, 0, W, 50, '#4a3a2e'); rect(c, 280, 180, 200, 90, '#4a2e22'); rect(c, 300, 60, 160, 90, '#3a2e26'); for (let r = 0; r < 3; r++) for (let k = 0; k < 6; k++) rect(c, 310 + k * 25, 72 + r * 26, 12, 14, '#8a7a5a'); disc(c, 330, 168, 14, '#b08a52'); rect(c, 60, 250, 140, 70, '#6a2e2e'); rect(c, 50, 230, 20, 90, '#6a2e2e'); for (let k = 0; k < 7; k++) { c.fillStyle = '#2e3a2a'; c.beginPath(); c.ellipse(230 + (k - 3) * 10, 200 - (k % 3) * 20, 12, 46, (k - 3) * 0.35, 0, Math.PI * 2); c.fill(); } rect(c, 214, 260, 32, 60, '#4a3024'); rect(c, 0, 320, W, 64, '#3a2a22'); };
    const curtainHotel = (c: CanvasRenderingContext2D) => { rect(c, 0, 0, W, H, '#7a5a3a'); for (const [x0, x1] of [[0, 230], [282, W]] as const) { rect(c, x0, 0, x1 - x0, H, '#4a2230'); for (let x = x0 + 10; x < x1; x += 30) rect(c, x, 0, 8, H, 'rgba(0,0,0,0.2)'); } };
    const guitars = (c: CanvasRenderingContext2D) => { rect(c, 0, 0, W, H, '#4a3e36'); for (let y = 20; y < H; y += 24) for (let x = 12; x < W; x += 24) disc(c, x, y, 2.5, '#3a302a'); for (const [x, col] of [[70, '#8a4a22'], [170, '#3a2a22'], [270, '#9a6a2a'], [370, '#6a2a2a'], [460, '#2a3a4a']] as const) { rect(c, x - 5, 30, 10, 150, '#2a1e18'); rect(c, x - 10, 22, 20, 26, '#1e1612'); c.fillStyle = col; c.beginPath(); c.ellipse(x, 220, 40, 50, 0, 0, Math.PI * 2); c.fill(); c.beginPath(); c.ellipse(x, 290, 50, 60, 0, 0, Math.PI * 2); c.fill(); disc(c, x, 240, 14, '#1a1210'); } };
    const jewelCase = (c: CanvasRenderingContext2D) => { rect(c, 0, 0, W, H, '#3a3030'); for (let k = 0; k < 4; k++) { rect(c, 20 + k * 120, 40, 100, 120, '#2a2226'); for (let j = 0; j < 6; j++) { disc(c, 44 + k * 120 + (j % 3) * 26, 70 + Math.floor(j / 3) * 50, 9, '#a08a4a'); disc(c, 44 + k * 120 + (j % 3) * 26, 70 + Math.floor(j / 3) * 50, 5, '#2a2226'); } } rect(c, 0, 200, W, 184, '#4a3a2e'); rect(c, 10, 210, W - 20, 90, '#5a5a5e'); for (let k = 0; k < 14; k++) { disc(c, 34 + k * 34, 250, 11, '#b09650'); disc(c, 34 + k * 34, 250, 7, '#40362e'); rect(c, 30 + k * 34, 234, 8, 6, '#6a5a3a'); } for (let k = 0; k < 18; k++) { c.strokeStyle = '#b8a060'; c.lineWidth = 3; c.beginPath(); c.arc(30 + k * 26, 285, 7, 0, Math.PI * 2); c.stroke(); } };
    const tvs = (c: CanvasRenderingContext2D) => { rect(c, 0, 0, W, H, '#3a3634'); for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) { const x = 16 + k * 124, y = 20 + r * 120; rect(c, x, y, 110, 100, '#2a2624'); rect(c, x + 10, y + 12, 70, 60, ['#3a4a5a', '#2a3438', '#4a4a3e'][(r + k) % 3]!); disc(c, x + 94, y + 30, 6, '#6a6058'); disc(c, x + 94, y + 54, 6, '#6a6058'); } };
    return {
      pill: [aisle('#5a6462', ['#7a6a6a', '#6a7a7e', '#8a8268', '#5e6e60'], 1), aisle('#5e605a', ['#6a5a6a', '#7a8a7a', '#8a7a5a'], 2), (c) => { rect(c, 0, 0, W, H, '#4a4e4c'); for (let y = 0; y < H * 0.6; y += 14) rect(c, 0, y, W, 9, '#6a706c'); rect(c, 90, 150, 330, 200, '#5a3a48'); disc(c, 200, 240, 50, '#8a6a6a'); rect(c, 270, 200, 120, 14, '#a08a7a'); rect(c, 270, 230, 90, 10, '#a08a7a'); }],
      pop: [bottles(3), cooler, bottles(4)],
      marquee: [lobbyTheatre, doorsDark],
      tiki: [bar, bambooBlind],
      phone: [lobbyHotel, curtainHotel],
      pawn: [guitars, jewelCase, tvs],
    };
  })();
  const roomTex = new Map<string, THREE.CanvasTexture>();
  const roomOf = (theme: Exclude<Theme, 'chapel'>, k: number) => {
    const set = ROOMSETS[theme], j = k % set.length, key = `${theme}${j}`;
    if (!roomTex.has(key)) roomTex.set(key, canvasTex(512, 384, set[j]!));
    return roomTex.get(key)!;
  };
  const TRADES: Record<Exclude<Theme, 'chapel'>, { fascia: string; ink: string; sign: string; awning?: string }> = {
    pill: { fascia: '#2a5a44', ink: '#c8c0a8', sign: 'RX · DRUGS · COSMETICS · FILM' },
    pop: { fascia: '#4a1d26', ink: '#c0a060', sign: 'LIQUOR · BEER · WINE · ICE', awning: '#6a2a30' },
    marquee: { fascia: '#6a2028', ink: '#c0a060', sign: 'NOW PLAYING' },
    tiki: { fascia: '#4a2e18', ink: '#8ab0a4', sign: 'MAI TAIS · ZOMBIES · HAPPY HOUR 4-7' },
    phone: { fascia: '#1f3450', ink: '#b8b0a0', sign: 'COLOR TV · PHONES · WEEKLY RATES' },
    pawn: { fascia: '#4a1a1a', ink: '#c8a050', sign: 'WE BUY GOLD · LOANS · JEWELRY · TOOLS' },
  };
  /** A business's glass front (in its lot's frame), `solid` the stretches of its front (x from, to) kept wall instead
   *  of glass (the hotel's payphones'), `fascia` false for a front whose board covers its fascia's place, `recess` its
   *  display windows' rooms set back in the front's depth (a display's things stand in front of them). Its panes (x,
   *  width, which is the door, which is wall). */
  const storefront = (g: THREE.Object3D, w: number, theme: Exclude<Theme, 'chapel'>, glassTop = 2.9, opts: { solid?: [number, number][]; fascia?: boolean; wall?: string; recess?: boolean } = {}) => {
    const T = TRADES[theme], frame = toon({ color: '#1d1a22' });
    const W = w - 0.6, panes = Math.max(2, Math.round(W / 2.4)), pw = W / panes, glassH = glassTop - 0.35;
    const solidAt = (x: number) => (opts.solid ?? []).some(([a, b]) => x > a && x < b);
    const out: { x: number; w: number; door: boolean; solid: boolean }[] = [];
    for (let i = 0; i < panes; i++) {
      const x = -W / 2 + pw * (i + 0.5);
      out.push({ x, w: pw, door: i === Math.floor(panes / 2), solid: solidAt(x) });
      if (solidAt(x)) { box(g, pw, glassTop, 0.1, x, glassTop / 2, 0.04, toon({ color: opts.wall ?? '#4a4258' })); continue; }
      if (i === Math.floor(panes / 2)) { // the door
        box(g, pw - 0.2, glassTop - 0.05, 0.08, x, (glassTop - 0.05) / 2, 0.06, frame);
        plane(g, pw - 0.5, glassH - 0.25, x, 0.3 + (glassH - 0.25) / 2, 0.11, pic(roomOf(theme, i), { color: new THREE.Color().setScalar(ROOMS.shop * 0.85) }));
        box(g, 0.05, 0.6, 0.05, x + pw / 2 - 0.45, 1.1, 0.13, chrome);
        continue;
      }
      plane(g, pw - 0.1, glassH, x, 0.35 + glassH / 2, opts.recess ? -0.22 : 0.06, pic(roomOf(theme, i), { color: new THREE.Color().setScalar(ROOMS.shop) }));
      box(g, pw, 0.35, 0.2, x, 0.175, 0.08, toon({ color: '#3a3540' })); // the base course
      if (opts.recess) { // the display's floor and its sides, back to the room
        tbox(g, pw - 0.1, 0.05, 0.32, x, 0.38, -0.08, '#3a2c26');
        for (const sd of [-1, 1]) tbox(g, 0.04, glassH, 0.3, x + sd * (pw / 2 - 0.07), 0.35 + glassH / 2, -0.08, '#2a2428');
      }
    }
    for (let i = 0; i <= panes; i++) box(g, 0.1, glassTop, 0.12, -W / 2 + pw * i, glassTop / 2, 0.08, frame);
    box(g, W + 0.2, 0.1, 0.2, 0, glassTop, 0.08, frame);
    if (opts.fascia !== false) {
      // the fascia over the glass (over the town's sign band), its words lit low
      box(g, w - 0.2, 0.95, 0.24, 0, glassTop + 0.55, 0.12, toon({ color: T.fascia }));
      plane(g, Math.min(w - 0.8, 9), 0.55, 0, glassTop + 0.55, 0.25, litPic(signFace(T.sign, 1024, 64, T.ink, null, F.sign(600), 0.62, 0.16), 0.68));
    }
    if (T.awning) { const a = box(g, w * 0.8, 0.08, 1.5, 0, glassTop - 0.15, 0.85, toon({ color: T.awning })); a.rotation.x = 0.2; }
    // its light spilling out on the sidewalk
    wash(g, w * 0.9, 3.4, 0, 0.17, 1.7, '#c8a078', 0.16, true);
    return out;
  };

  /** A wall sign's hardware round its face (in the face's frame, the wall `back` m behind it): standoffs, the
   *  transformer box at its foot, the conduit from it down the wall, a tube round the panel's edge in the lines' pink
   *  (it frames them: no other colour round the words). */
  const wallMount = (g: THREE.Object3D, W: number, H: number, start: number, back = MOUNT.wall) => {
    for (const x of [-W / 2 + 0.4, W / 2 - 0.4]) for (const y of [-H / 2 + 0.3, H / 2 - 0.3]) box(g, 0.08, 0.08, back, x, y, -back / 2 - 0.04, steel);
    box(g, 0.5, 0.8, 0.28, W / 2 + 0.6, -H / 2 + 0.4, -back + 0.14, toon({ color: '#3a3540' }));
    cyl(g, 0.04, H + 0.4 - 0.8, W / 2 + 0.6, (H / 2 + 0.4 - H / 2 + 0.8) / 2, -back + 0.06, conduit);
    const run = cyl(g, 0.035, W, 0, -H / 2 + 0.12, -back + 0.06, conduit); run.rotation.z = Math.PI / 2;
    const fw = W + 0.6, fh = H + 0.5, px = Math.round((1024 * fh) / fw);
    neon(g, fw, fh, 0, 0, 0.01, neonTex(1024, px, PINK, (c) => { c.strokeStyle = PINK; c.lineWidth = 7; c.beginPath(); c.roundRect(14, 14, 1024 - 28, px - 28, 22); c.stroke(); }), { start, peak: 1.2 });
  };
  /** A blade down a building's corner, out from its wall (in the lot's frame: at x, from y0 up h, out `out` m). */
  const blade = (g: THREE.Object3D, x: number, y0: number, h: number, word: string, color: string, out = 1.25, start?: number, peak = SECONDARY) => {
    const b = new THREE.Group(); b.position.set(x, y0 + h / 2, out / 2 + 0.05); b.rotation.y = Math.PI / 2; g.add(b);
    box(b, out, h, 0.3, 0, 0, 0, dark);
    for (const sd of [1, -1]) { const p = neon(b, out * 0.82, h * 0.94, 0, 0, sd * 0.16, bladeWord(word, color, true), { start, peak }); if (sd < 0) p.rotation.y = Math.PI; }
    for (const y of [-h / 2 + 0.4, h / 2 - 0.4]) box(g, 0.08, 0.08, out + 0.2, x, y0 + h / 2 + y, (out + 0.2) / 2, steel); // its brackets
    return b;
  };
  /** A lit box sign's face: `text` filled (not tubed: a box sign's letters read from across the street) in `ink` on
   *  `bg`, a border, optionally the pawnbroker's three balls before it. */
  const boxSignTex = (text: string, ink: string, bg: string, w: number, h: number, balls = false, sub = '') => canvasTex(w, h, (c) => boxFace(c, 0, 0, w, h, text, ink, bg, sub, balls));
  /** Someone standing still on the sidewalk (in `g`'s frame, at x, z, turned `ry`): built once and never moved, so it's
   *  batched with what it stands by (the walkers are posed every frame). */
  const stander = (g: THREE.Object3D, x: number, z: number, ry: number) => { const p = walker(); p.position.set(x, 0.15, z); p.rotation.y = ry; g.add(p); return p; };
  /** A shop's things seen in its window, lit by the shop behind them, not by the street (unlit, their colours held
   *  low): one material, so a window's things are one draw. */
  const DISPLAY = new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color().setScalar(0.66) });
  const displayPart = (to: THREE.Object3D, geo: THREE.BufferGeometry, color: string, x: number, y: number, z: number) => { const m = new THREE.Mesh(tinted(geo, color), DISPLAY); m.position.set(x, y, z); to.add(m); return m; };
  /** A roll-down security grille, `h` m of it down from its housing at `top` over a w-wide opening (in `g`'s frame, at
   *  x, its face at z): the link mesh, its bottom bar, its guides, the housing it rolls into. */
  const grilleTex = canvasTex(64, 64, (c) => { c.clearRect(0, 0, 64, 64); c.fillStyle = '#ffffff'; for (let y = 0; y < 64; y += 16) { c.fillRect(0, y, 64, 4); for (let x = (y / 16) % 2 ? 0 : 16; x < 64; x += 32) c.fillRect(x, y, 5, 16); } });
  grilleTex.wrapS = grilleTex.wrapT = THREE.RepeatWrapping;
  const GRILLE = toon({ map: grilleTex, alphaTest: 0.5, side: THREE.DoubleSide, color: '#8a8692' });
  const grille = (g: THREE.Object3D, w: number, h: number, x: number, top: number, z: number) => {
    const geo = new THREE.PlaneGeometry(w, h), uv = geo.getAttribute('uv');
    for (let j = 0; j < uv.count; j++) uv.setXY(j, (uv.getX(j) * w) / 0.3, (uv.getY(j) * h) / 0.3);
    const m = new THREE.Mesh(geo, GRILLE); m.position.set(x, top - h / 2, z); g.add(m);
    tbox(g, w + 0.04, 0.06, 0.06, x, top - h, z, '#4a4650');
    for (const sd of [-1, 1]) tbox(g, 0.05, h + 0.1, 0.07, x + sd * (w / 2 + 0.02), top - h / 2, z, '#3a3640');
    tbox(g, w + 0.14, 0.24, 0.28, x, top + 0.1, z - 0.06, '#3a3640');
  };

  // ---- the businesses ----
  for (const sign of plan.signs) {
    const lot = plan.lots[sign.lot]!, g = frameOf(sign.lot), { face, theme } = sign, W = face.w, H = face.h, start = sign.starts[0]!;
    const fg = onPanel(face); root.add(fg);
    const groundY = -(face.center.y - route.frameAt(sign.s).pos.y);
    // (the lines' own pink in the wet road under them; the marquee's and the board's in their lights' warm)
    reflect(sign.s, sign.side, W, theme === 'marquee' || theme === 'pawn' ? '#c8a070' : PINK, theme === 'marquee' || theme === 'pawn' ? 0.3 : 0.6);
    switch (theme) {
      case 'pill': {
        storefront(g, lot.w, 'pill');
        wallMount(fg, W, H, start);
        blade(g, -lot.w / 2 + 0.5, 3.8, 5.6, 'DRUGS', C.green, 1.3); // (down its up-street corner: seen coming)
        // the capsule beside the words, and the cross on its bracket at the far corner
        neon(fg, 2.0, 1.15, -W / 2 - 1.4, 0.2, -0.1, neonTex(512, 288, C.green, (c) => {
          c.strokeStyle = C.green; c.lineWidth = 14; c.save(); c.translate(256, 144); c.rotate(-0.5);
          c.beginPath(); c.roundRect(-150, -62, 300, 124, 62); c.stroke(); c.beginPath(); c.moveTo(0, -62); c.lineTo(0, 62); c.stroke(); c.restore();
        }));
        const cross = new THREE.Group(); cross.position.set(lot.w / 2 - 0.6, 4.6, 0.9); cross.rotation.y = Math.PI / 2; g.add(cross);
        box(cross, 1.3, 1.3, 0.25, 0, 0, 0, dark);
        for (const sd of [1, -1]) { const p = neon(cross, 1.1, 1.1, 0, 0, sd * 0.14, canvasTex(128, 128, (c) => { c.fillStyle = C.green; c.fillRect(44, 10, 40, 108); c.fillRect(10, 44, 108, 40); }), { peak: 0.9 }); if (sd < 0) p.rotation.y = Math.PI; }
        box(g, 0.08, 0.08, 1.4, lot.w / 2 - 0.6, 5.0, 0.7, steel);
        wash(fg, W + 6, H + 4, 0, 0, -MOUNT.wall + 0.02, PINK, 0.2);
        break;
      }
      case 'pop': {
        storefront(g, lot.w, 'pop');
        // the roof's steel frame under the sign: legs to the roof, braced back, a catwalk along its foot
        const foot = -H / 2;
        const roof = groundY + lot.h, legH = foot - roof;
        for (const x of [-W / 2 + 0.6, -W / 6, W / 6, W / 2 - 0.6]) {
          box(fg, 0.16, legH + H, 0.16, x, roof + (legH + H) / 2, -0.35, steel);
          const brace = box(fg, 0.1, Math.hypot(legH + H * 0.6, 1.8), 0.1, x, roof + (legH + H * 0.6) / 2, -1.25, steel);
          brace.rotation.x = Math.atan2(1.8, legH + H * 0.6);
        }
        for (const y of [foot + 0.2, 0, H / 2 - 0.2]) box(fg, W, 0.1, 0.1, 0, y, -0.35, steel);
        box(fg, W + 0.4, 0.08, 0.9, 0, foot - 0.15, 0.25, steel); // the catwalk
        neon(fg, 4.6, 1.15, 0, H / 2 + 0.75, -0.05, tubeWord('LIQUOR', C.amber));
        box(fg, 4.8, 1.2, 0.12, 0, H / 2 + 0.75, -0.2, dark);
        for (const x of [-1.8, 1.8]) box(fg, 0.12, 0.8, 0.12, x, H / 2 + 0.2, -0.3, steel);
        // the champagne glass on its own frame at the sign's right, its bubbles, the cork away
        box(fg, 1.9, 2.4, 0.12, W / 2 + 1.15, 0, -0.2, dark);
        neon(fg, 1.6, 2.1, W / 2 + 1.15, 0, -0.1, neonTex(400, 520, C.amber, (c) => {
          c.strokeStyle = C.amber; c.lineWidth = 12;
          c.beginPath(); c.moveTo(100, 130); c.lineTo(300, 130); c.lineTo(200, 280); c.lineTo(200, 400); c.stroke();
          c.beginPath(); c.moveTo(130, 440); c.lineTo(270, 440); c.stroke();
          c.fillStyle = C.amber; for (const [bx, by, r] of [[160, 86, 10], [210, 60, 13], [258, 92, 9], [228, 24, 8]] as const) { c.beginPath(); c.arc(bx, by, r, 0, Math.PI * 2); c.fill(); }
        }));
        box(fg, 0.14, legH + 1.2, 0.14, W / 2 + 1.15, roof + (legH + 1.2) / 2 - 0.1, -0.3, steel);
        // in its window: the neon the liquor store hangs there
        neon(g, 1.7, 0.6, -lot.w / 2 + 1.6, 2.1, 0.14, tubeWord('COLD BEER', C.blue, 512, 180), { peak: 0.9 });
        neon(g, 1.2, 0.5, lot.w / 2 - 1.5, 2.2, 0.14, tubeWord('LOTTO', C.red, 512, 200), { peak: 0.9 });
        break;
      }
      case 'marquee': {
        storefront(g, lot.w, 'marquee', 2.9);
        // the marquee: a box from the wall out to the face, bulbs round its front, its soffit lit, tie rods to the wall
        const out = MOUNT.marquee, mw = W + 1.4, mh = H + 0.9;
        box(fg, mw, mh, out - 0.05, 0, 0, -out / 2 - 0.03, toon({ color: '#6a2a32' }));
        box(fg, mw + 0.2, 0.2, out + 0.1, 0, mh / 2 + 0.1, -out / 2, toon({ color: '#8a7040' }));
        box(fg, mw + 0.2, 0.2, out + 0.1, 0, -mh / 2 - 0.1, -out / 2, toon({ color: '#8a7040' }));
        // (its bulbs warm and low: at a lamp's full glow they ringed the words in white)
        const bulb = [lampMaterial('#e8b878', 1.9, 0.6), lampMaterial('#e8b878', 0.6, 0.3)];
        marqueeBulbs.push(...bulb.map((m, i) => ({ m, phase: i, k: 1.9 })));
        const e = mw / 2 - 0.15, f = mh / 2 - 0.15, n = 22;
        for (let i = 0; i <= n; i++) for (const y of [f, -f]) ball(fg, 0.07, -e + (2 * e * i) / n, y, 0.04, bulb[i % 2]!);
        for (let i = 1; i < 6; i++) for (const x of [-e, e]) ball(fg, 0.07, x, -f + (2 * f * i) / 6, 0.04, bulb[i % 2]!);
        // its ends: burgundy panels framed in gold, a column of bulbs down each front edge (the house's name was set on
        // them squeezed into the end's narrow panel — the user, 2026-10-16: "the squished burgundy background gold text
        // NITE OWL"; the blade over it says it)
        for (const sd of [-1, 1]) {
          const ex = sd * (mw / 2 + 0.03);
          for (const z of [-0.2, -out + 0.15]) tbox(fg, 0.04, mh - 0.3, 0.06, ex, 0, z, '#8a7040');
          tbox(fg, 0.04, 0.06, out - 0.3, ex, mh / 2 - 0.2, -out / 2, '#8a7040'); tbox(fg, 0.04, 0.06, out - 0.3, ex, -mh / 2 + 0.2, -out / 2, '#8a7040');
          tbox(fg, 0.03, mh - 0.7, 0.5, ex, 0, -out / 2, '#4a1820');
          for (let k = 0; k < 7; k++) ball(fg, 0.06, ex + sd * 0.02, -mh / 2 + 0.4 + (k * (mh - 0.8)) / 6, -out / 2, bulb[k % 2]!);
        }
        // the soffit's lights under it, pooling on the sidewalk
        plane(fg, mw - 0.4, out - 0.3, 0, -mh / 2 - 0.21, -out / 2, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.72, 0.5) })).rotation.x = Math.PI / 2;
        wash(g, mw + 2, out + 2.5, 0, 0.18, out / 2 + 0.6, '#c8a078', 0.35, true);
        for (const x of [-mw / 2 + 0.5, mw / 2 - 0.5]) { const rod = box(fg, 0.05, Math.hypot(2.6, out), 0.05, x, mh / 2 + 1.3, -out / 2, steel); rod.rotation.x = -Math.atan2(out, 2.6); }
        // NITE OWL down a blade over it
        const top = face.center.y - route.frameAt(sign.s).pos.y + mh / 2 + 0.6;
        blade(g, 0, top, Math.min(6.8, lot.h + 1.5 - top), 'NITE OWL', C.amber, 1.6);
        // the ticket booth (glazed on three sides, a gold-trimmed base, its domed cap, the cashier lit inside) and the
        // poster cases either side of it
        {
          const bz = 0.55;
          tbox(g, 1.9, 1.0, 1.0, 0, 0.5, bz, '#5a2028'); tbox(g, 2.0, 0.08, 1.1, 0, 1.02, bz, '#8a7040');
          for (const x of [-0.92, 0.92]) for (const z of [bz - 0.47, bz + 0.47]) tbox(g, 0.08, 1.3, 0.08, x, 1.68, z, '#8a7040');
          tbox(g, 2.06, 0.22, 1.16, 0, 2.42, bz, '#5a2028'); tbox(g, 2.12, 0.06, 1.22, 0, 2.3, bz, '#8a7040');
          const cap = tcyl(g, 0.62, 0.3, 0, 2.66, bz, '#6a2a32', 16); cap.scale.set(1.5, 1, 0.85);
          displayPart(g, new THREE.BoxGeometry(1.76, 1.24, 0.9), '#a07a52', 0, 1.66, bz); // (its glass, the booth lit within)
          displayPart(g, new THREE.SphereGeometry(0.13, 10, 8), '#2a1a1a', 0.1, 1.72, bz + 0.1); displayPart(g, new THREE.BoxGeometry(0.34, 0.32, 0.2), '#2a1a1a', 0.1, 1.46, bz + 0.1); // the cashier
          tbox(g, 0.5, 0.04, 0.2, 0, 1.08, bz + 0.55, '#8a7040'); // the ticket sill
        }
        for (const x of [-lot.w / 2 + 1.4, lot.w / 2 - 1.4]) {
          box(g, 1.3, 1.9, 0.1, x, 1.5, 0.12, toon({ color: '#8a7040' }));
          plane(g, 1.05, 1.6, x, 1.5, 0.18, litPic(canvasTex(128, 192, (c) => { c.fillStyle = x > 0 ? '#5a3a5e' : '#2b1b4e'; c.fillRect(0, 0, 128, 192); c.fillStyle = '#a08850'; c.beginPath(); c.arc(64, 70, 36, 0, Math.PI * 2); c.fill(); c.fillStyle = '#16131a'; c.fillRect(20, 130, 88, 10); c.fillRect(30, 150, 68, 8); }), 0.7));
        }
        break;
      }
      case 'tiki': {
        storefront(g, lot.w, 'tiki', 2.6);
        // a thatched fringe over its front, tiki faces either side of its door
        const fr = box(g, lot.w + 0.4, 0.7, 1.4, 0, 3.4, 0.6, thatch); fr.rotation.x = 0.25;
        for (const x of [-1.6, 1.6]) { box(g, 0.7, 2.4, 0.5, x, 1.2, 0.35, toon({ color: '#5a3e24' })); for (const y of [1.7, 0.9]) box(g, 0.5, 0.12, 0.1, x, y, 0.62, toon({ color: '#9a6a3a' })); }
        // the roof sign's lattice: columns from the roof up its back, crossed braces between, a catwalk at its foot
        const roof = groundY + lot.h, foot = -H / 2;
        for (const x of [-W / 2 + 0.5, 0, W / 2 - 0.5]) box(fg, 0.22, H / 2 + 0.6 - roof, 0.22, x, (roof + H / 2 + 0.6) / 2, -0.55, steel);
        for (let k = 0; k < 4; k++) {
          const y0 = roof + ((H / 2 - roof) * k) / 4, y1 = roof + ((H / 2 - roof) * (k + 1)) / 4;
          for (const [xa, xb] of [[-W / 2 + 0.5, 0], [0, W / 2 - 0.5]] as const) {
            const len = Math.hypot(xb - xa, y1 - y0), br = box(fg, len, 0.08, 0.08, (xa + xb) / 2, (y0 + y1) / 2, -0.55, steel);
            br.rotation.z = Math.atan2(y1 - y0, xb - xa) * (k % 2 ? 1 : -1);
          }
        }
        box(fg, W + 0.6, 0.08, 1.0, 0, foot - 0.2, 0.2, steel); // the catwalk
        for (const x of [-W / 2 - 0.35, W / 2 + 0.35]) cyl(fg, 0.15, H + 1.4, x, 0.2, 0.05, bamboo);
        for (const y of [-H / 2 - 0.3, H / 2 + 0.3]) box(fg, W + 1.1, 0.26, 0.26, 0, y, 0.05, bamboo);
        box(fg, W + 1.6, 1.9, 0.2, 0, H / 2 + 1.35, -0.15, dark);
        neon(fg, W + 1.2, 1.8, 0, H / 2 + 1.35, 0.0, neonTex(1024, 300, C.teal, (c) => {
          c.strokeStyle = C.teal; c.lineWidth = 9; c.font = font(F.sign(700), 150); c.textAlign = 'center'; c.textBaseline = 'middle';
          c.strokeText('TARZAN & JANE', 512, 160, 980);
        }));
        wash(fg, W + 6, H + 5, 0, 0, -0.3, PINK, 0.14);
        // a thatched hat over its name (a carved tiki stood up its left side from the roof, its eyes lit: a dark column
        // ten metres tall and under a metre wide, it read as a chimney with lights on it — the user, 2026-10-16: "it has
        // like a chimney thing to the left of it ... left over from a different time". The tikis by its door say it.)
        const hat = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, W + 2.4, 3), thatch);
        hat.rotation.z = Math.PI / 2; hat.scale.set(1, 1, 0.6); hat.position.set(0, H / 2 + 2.75, -0.2); fg.add(hat);
        for (let k = 0; k < 9; k++) { const f = box(fg, 0.12, 0.9, 0.05, -W / 2 - 0.9 + (k * (W + 1.8)) / 8, H / 2 + 2.2, 0.55, thatch); f.rotation.z = (k % 2 ? 0.15 : -0.15); } // its fringe
        // the torches at the kerb, either side of its door
        for (const x of [-lot.w / 2 + 0.8, lot.w / 2 - 0.8]) {
          cyl(g, 0.08, 2.6, x, 1.3, 2.4, bamboo);
          neon(g, 0.8, 1.15, x, 3.15, 2.4, neonTex(220, 300, C.orange, (c) => { c.fillStyle = C.orange; c.beginPath(); c.moveTo(110, 20); c.quadraticCurveTo(190, 130, 110, 270); c.quadraticCurveTo(30, 130, 110, 20); c.fill(); }), { peak: 1.3, dance: true });
        }
        break;
      }
      case 'phone': {
        // (the user, 2026-10-15, at 146 s: "advertising, like, phones and color TVs and floating blue text over a sign
        // that's clipping over the front of the store, and then there's, like, randomly phones poking out of the front
        // windows". Its words now on its canopy, its payphones on a stretch of its own wall.)
        // (and 2026-10-17, at 145 s: its lines in a pink-framed panel on its wall between its floors were "placed a bit
        // awkwardly ... better integrated within the environment". They stand on its entrance canopy now, as a hotel's
        // name stands over its door: each row's tubes on a dark backer, the backers on a steel frame braced on the
        // canopy's roof, the transformer at its foot; the canopy out to the kerb on brass posts, its soffit lit, a runner
        // under it to the door; their pink on its roof, on the wall behind and on the sidewalk.)
        const phoneX = -lot.w / 2 + 1.5; // (the payphones' wall: the front's up-street end)
        const phonePanes = storefront(g, lot.w, 'phone', 2.9, { solid: [[-lot.w / 2, -lot.w / 2 + 3.0]], wall: '#3e3a52', fascia: false });
        const navy = '#1f3450';
        box(g, lot.w - 0.2, 0.95, 0.24, 0, 3.45, 0.12, toon({ color: navy })); // its fascia over the glass, bare (the canopy says it)
        blade(g, lot.w / 2 - 0.6, 3.9, 7.2, 'HOTEL', C.red, 1.5);
        hotelCanopy(g, sign, W, H);
        // the payphones on the wall: two hooded boxes mounted on it, the shared PHONE sign over them, their coin light
        const ph = new THREE.Group(); ph.position.set(phoneX, 0, 0.1); g.add(ph);
        box(ph, 2.4, 0.08, 0.6, 0, 2.55, 0.3, toon({ color: '#2a4a5e' })); // the hood
        plane(ph, 2.2, 0.3, 0, 2.78, 0.06, litPic(signFace('PHONE', 512, 80, '#b8c4c8', '#244456', F.sign(700), 0.7, 0.2), 0.8));
        for (const x of [-0.6, 0.6]) {
          box(ph, 0.62, 0.95, 0.28, x, 1.6, 0.14, toon({ color: '#2f5a6e' }));
          box(ph, 0.38, 0.42, 0.06, x, 1.65, 0.3, dark);
          box(ph, 0.07, 0.4, 0.1, x - 0.24, 1.6, 0.32, chrome);
          box(ph, 0.62, 0.28, 0.24, x, 0.85, 0.12, toon({ color: '#2a3a46' })); // (its directory shelf)
        }
        coin = plane(ph, 0.08, 0.08, 0.6, 1.95, 0.29, new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 0.3, 0.25), toneMapped: false }));
        coinStart = sign.starts[0]!;
        // someone on the near phone, turned to it
        { const p = stander(ph, -0.6, 0.62, Math.PI); p.getObjectByName('armR')!.rotation.set(-2.25, 0, 0.55); }
        // CALL ME in its first window by the phones: a handset in rose tube, the words under it (the user, 2026-10-16:
        // "'other hoes is lacking, call me up', and I can see that that is by a phone in the environment, which is nice.
        // Maybe if you want to use the girl sign, that would be a good place" — the strip's GIRLS blade gone, this in
        // its place: the line's own invitation, not an advert)
        {
          const pane = phonePanes.find((p) => !p.solid && !p.door)!;
          neon(g, 1.7, 0.96, pane.x, 1.95, 0.13, neonTex(512, 288, C.rose, (c) => {
            c.strokeStyle = C.rose; c.lineWidth = 9; c.lineCap = 'round';
            c.save(); c.translate(256, 92); c.rotate(-0.18);
            c.beginPath(); c.moveTo(-96, 18); c.quadraticCurveTo(-90, -40, 0, -44); c.quadraticCurveTo(90, -40, 96, 18); c.stroke();
            for (const sd of [-1, 1]) { c.beginPath(); c.roundRect(sd * 96 - 26, 6, 52, 34, 10); c.stroke(); }
            c.restore();
            c.textAlign = 'center'; c.textBaseline = 'middle'; fitText(c, 'CALL ME', 256, 214, 440, 104, 600, 0.12, true);
          }), { peak: 1.0 });
        }
        break;
      }
      case 'pawn': {
        // (the user, 2026-10-15, at 148 s: "I have no idea what the word on the sign is ... it looks like P-A-M-E ... oh,
        // it's a pawn shop." And 2026-10-16: "there's kind of like a marquee sign on a pawn shop, and I'm not sure why it
        // looks that way ... The pawn shop's also locked up and is selling guitars and needs a quality pass". Its sign now
        // a pawnbroker's own: one big lit cabinet over its front, PAWN · LOANS · GOLD across its head after the three
        // balls, the lines on its face below, the whole in a gold retainer (the chase bulbs round the board made it a
        // marquee: gone); the balls hung off its corner too. Shut for the night: its display windows set back in its
        // front, full of what it's lent on — guitars hung, TVs, a jewellery case, tools — WE BUY GOLD and a guitar in
        // neon in them, their grilles part way down, the door's all the way.)
        const panes = storefront(g, lot.w, 'pawn', 2.2, { fascia: false, recess: true });
        {
          const head = 1.75, hy = H / 2 + 0.16 + head / 2, wall = MOUNT.wall + FACADE.depth, cw = W + 0.36;
          tbox(fg, cw, H + head + 0.5, wall - 0.04, 0, (head + 0.16) / 2, -wall / 2 - 0.01, '#232120'); // the cabinet's box
          plane(fg, W, head, 0, hy, 0.0, pic(boxSignTex('PAWN · LOANS · GOLD', '#d8ac58', '#1d3b30', 1024, Math.round((1024 * head) / W), true), { color: new THREE.Color().setScalar(0.86) }));
          // the retainer round it all, gold, and the bar between the head and the face
          const top = hy + head / 2 + 0.07, bot = -H / 2 - 0.07;
          for (const y of [top, bot, H / 2 + 0.08]) tbox(fg, cw, 0.12, 0.07, 0, y, 0.02, '#8a6a2e');
          for (const sd of [-1, 1]) tbox(fg, 0.12, top - bot + 0.12, 0.07, sd * (cw / 2 - 0.06), (top + bot) / 2, 0.02, '#8a6a2e');
          // its feet on the wall: angle brackets under it, the conduit down to the front
          for (const x of [-W / 3, W / 3]) tbox(fg, 0.1, 0.1, wall, x, bot - 0.12, -wall / 2, '#3a3640');
          tcyl(fg, 0.04, 1.2, cw / 2 - 0.4, bot - 0.6, -wall + 0.06, '#5b5660');
        }
        // the displays: guitars hung up, TVs stacked, the jewellery case, a toolbox and a drill; lit by the shop behind
        const guitar = (x: number, y: number, z: number, col: string) => {
          displayPart(g, new THREE.SphereGeometry(0.2, 12, 8).scale(1, 1.15, 0.22), col, x, y - 0.12, z);
          displayPart(g, new THREE.SphereGeometry(0.15, 12, 8).scale(1, 1.1, 0.22), col, x, y + 0.15, z);
          displayPart(g, new THREE.CylinderGeometry(0.05, 0.05, 0.02, 12).rotateX(Math.PI / 2), '#1a1210', x, y + 0.03, z + 0.045);
          displayPart(g, new THREE.BoxGeometry(0.05, 0.5, 0.03), '#3a2a1c', x, y + 0.5, z);
          displayPart(g, new THREE.BoxGeometry(0.09, 0.14, 0.035), '#1e1612', x, y + 0.81, z);
          displayPart(g, new THREE.BoxGeometry(0.07, 0.045, 0.005), '#d0c8b8', x + 0.13, y - 0.3, z + 0.05); // its tag
        };
        panes.filter((p) => !p.door).forEach((p, d) => {
          const x = p.x;
          if (d === 0) {
            [['#9a5a24', -0.75], ['#2a2224', -0.1], ['#7a2a24', 0.55]].forEach(([col, dx]) => guitar(x + (dx as number), 1.3, -0.15, col as string));
            neon(g, 2.1, 0.44, x, 0.82, -0.03, tubeWord('WE BUY GOLD', C.amber, 1024, 214), { peak: 1.0 });
          } else if (d === 1) {
            displayPart(g, new THREE.BoxGeometry(0.62, 0.46, 0.3), '#3a3634', x - 0.55, 0.64, -0.12); displayPart(g, new THREE.BoxGeometry(0.46, 0.32, 0.01), '#58788e', x - 0.6, 0.65, 0.035);
            displayPart(g, new THREE.BoxGeometry(0.52, 0.4, 0.28), '#2e2a28', x - 0.55, 1.07, -0.12); displayPart(g, new THREE.BoxGeometry(0.38, 0.27, 0.01), '#3e4e5a', x - 0.6, 1.08, 0.025);
            displayPart(g, new THREE.BoxGeometry(0.6, 0.26, 0.14), '#2a2a2e', x + 0.1, 0.54, -0.1); for (const dx of [-0.17, 0.17]) displayPart(g, new THREE.CylinderGeometry(0.08, 0.08, 0.02, 12).rotateX(Math.PI / 2), '#5a5a60', x + 0.1 + dx, 0.54, -0.025);
            displayPart(g, new THREE.BoxGeometry(0.8, 0.3, 0.22), '#2a1e26', x + 0.55, 1.3, -0.12); displayPart(g, new THREE.BoxGeometry(0.76, 0.02, 0.2), '#8a8296', x + 0.55, 1.46, -0.12);
            for (let k = 0; k < 7; k++) displayPart(g, new THREE.TorusGeometry(0.028, 0.009, 6, 12), '#c8a050', x + 0.25 + k * 0.1, 1.38, -0.03);
            guitar(x + 0.65, 1.55, -0.18, '#c09050');
          } else {
            displayPart(g, new THREE.BoxGeometry(0.56, 0.28, 0.24), '#8a2a24', x - 0.6, 0.55, -0.1); displayPart(g, new THREE.BoxGeometry(0.3, 0.04, 0.04), '#2a2a2a', x - 0.6, 0.72, -0.1);
            displayPart(g, new THREE.BoxGeometry(0.28, 0.1, 0.08), '#c8a040', x + 0.0, 0.52, -0.08); displayPart(g, new THREE.BoxGeometry(0.06, 0.16, 0.07), '#2a2a2a', x - 0.06, 0.4, -0.08);
            displayPart(g, new THREE.BoxGeometry(0.9, 0.3, 0.22), '#2a1e26', x + 0.45, 0.55, -0.12); displayPart(g, new THREE.BoxGeometry(0.86, 0.02, 0.2), '#8a8296', x + 0.45, 0.71, -0.12);
            for (let k = 0; k < 6; k++) displayPart(g, new THREE.SphereGeometry(0.04, 8, 6), '#c8a050', x + 0.12 + k * 0.13, 0.62, -0.06);
            neon(g, 0.7, 1.4, x - 0.5, 1.45, -0.03, neonTex(256, 512, C.orange, (c) => {
              c.strokeStyle = C.orange; c.lineWidth = 10;
              c.beginPath(); c.ellipse(128, 380, 84, 96, 0, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.ellipse(128, 250, 62, 62, 0, 0.6, Math.PI - 0.6, true); c.stroke();
              c.beginPath(); c.arc(128, 330, 26, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.moveTo(128, 200); c.lineTo(128, 50); c.stroke(); c.strokeRect(108, 18, 40, 40);
            }), { peak: 1.0 });
            guitar(x + 0.5, 1.45, -0.16, '#3a4a5a');
          }
          grille(g, p.w - 0.08, 0.5, p.x, 2.15, 0.17); // (part way down for the night)
        });
        { const door = panes.find((p) => p.door)!; grille(g, door.w - 0.08, 2.1, door.x, 2.15, 0.17); tbox(g, 0.08, 0.1, 0.06, door.x + 0.2, 0.14, 0.22, '#c8a050'); } // (all the way down, padlocked)
        // the three gold balls hung from an arm off its far corner, out over the sidewalk, big enough to read
        const bx = lot.w / 2 - 0.45, ay = 6.4;
        box(g, 0.1, 0.1, 2.6, bx, ay, 1.3, dark); // the arm
        const rod = box(g, 0.05, 1.6, 0.05, bx, ay + 0.6, 0.65, dark); rod.rotation.x = -0.95; // its stay up to the wall
        for (const [z, dy] of [[1.1, 0], [2.0, 0], [1.55, -0.8]] as const) { box(g, 0.03, 0.8 - dy, 0.03, bx, ay - 0.4 + dy / 2, z, dark); ball(g, 0.33, bx, ay - 1.1 + dy, z, gold); }
        wash(g, lot.w, 3, 0, 0.17, 1.6, '#c8a078', 0.14, true);
        break;
      }
      case 'chapel': {
        // (the user, 2026-10-15: "the wedding chapel is cute, but it looks super blocky and super early concept, so I'd
        // say expand on that more." A little Las Vegas chapel: clapboard under a gable, a steeple with its bell, an
        // arched portico on columns, stained glass, a lawn behind a picket fence, a limo at the kerb. Held to a
        // lavender grey: at full white its front outshone its own neon.)
        buildChapel(g, lot, sign, fg, W, H, start);
        break;
      }
    }
  }

  /** The hotel's entrance canopy (in its lot's frame) and its lines' neon standing on it (see its case above). */
  function hotelCanopy(g: THREE.Object3D, sign: Verse3Plan['signs'][number], W: number, H: number) {
    const out = MOUNT.canopyOut, top = MOUNT.canopyTop, ct = 0.42, cw = W + 1.6, fz = MOUNT.canopy, navy = '#1f3450', brass = '#8a7040', steelC = '#4a4450';
    const roadY = route.frameAt(sign.s).pos.y, faceY = sign.face.center.y - roadY, kerb = 0.15;
    // the canopy: its box, brass bands round its edges, its words along its front, its lit soffit, brass posts at the kerb
    tbox(g, cw, ct, out, 0, top - ct / 2, out / 2, navy);
    for (const y of [top - 0.03, top - ct + 0.03]) {
      tbox(g, cw + 0.04, 0.06, 0.05, 0, y, out + 0.005, brass);
      for (const sd of [-1, 1]) tbox(g, 0.05, 0.06, out, sd * (cw / 2 + 0.005), y, out / 2, brass);
    }
    plane(g, cw - 0.5, ct - 0.18, 0, top - ct / 2, out + 0.04, litPic(signFace('HOTEL · COLOR TV · WEEKLY RATES', 1024, Math.round((1024 * (ct - 0.18)) / (cw - 0.5)), '#c8b48a', navy, F.sign(700), 0.7, 0.14), 0.8));
    plane(g, cw - 0.3, out - 0.3, 0, top - ct - 0.005, out / 2, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.62, 0.52, 0.38) })).rotation.x = Math.PI / 2;
    for (const sd of [-1, 1]) {
      const x = sd * (cw / 2 - 0.12), z = out - 0.12;
      tcyl(g, 0.05, top - ct - kerb, x, kerb + (top - ct - kerb) / 2, z, brass, 10);
      tcyl(g, 0.1, 0.12, x, kerb + 0.06, z, brass, 10); // (its foot)
    }
    tbox(g, 1.5, 0.012, out - 0.1, 0, kerb + 0.007, out / 2 - 0.05, '#5a1e2a'); // the runner to the door
    // the frame on its roof: posts up the backers' backs, braced back down to the roof, a rail along their feet
    // (its end posts outside the narrower rows, standing a little over the top row with a rail across: a frame, seen)
    const top0 = faceY + H / 2 + 0.3, posts = [-W / 2 + 0.15, 0, W / 2 - 0.15];
    for (const x of posts) {
      tbox(g, 0.13, top0 - top, 0.13, x, (top + top0) / 2, fz - 0.24, steelC);
      const bh = (top0 - top) * 0.6, bd = fz - 0.24 - 0.35, brace = tbox(g, 0.08, Math.hypot(bh, bd), 0.08, x, top + bh / 2, 0.35 + bd / 2, steelC);
      brace.rotation.x = Math.atan2(bd, bh);
      tbox(g, 0.32, 0.05, 0.32, x, top + 0.025, fz - 0.24, steelC); // (its base plate)
    }
    for (const y of [top + 0.12, top0 - 0.05]) tbox(g, W - 0.15, 0.1, 0.1, 0, y, fz - 0.24, steelC);
    // each row's tubes on its own dark backer (where carrierart.ts draws its plate), a channel behind it to the posts
    for (const c of faces.filter((f) => Math.abs(f.s - sign.s) < 0.01)) {
      const cy = c.center.y - roadY;
      for (const p of neonPlates(c)) {
        part(g, roundPlate(p.w, p.h, p.h * 0.24, 0.07), '#130b15', 0, cy + p.y, fz - 0.09);
        tbox(g, Math.max(0.6, p.w - 0.7), 0.16, 0.1, 0, cy + p.y - p.h * 0.1, fz - 0.17, '#2a2630');
      }
    }
    // the transformer at the frame's foot, its conduit up the end post
    tbox(g, 0.55, 0.42, 0.34, W / 2 - 0.2, top + 0.21, fz - 0.7, '#3a3540');
    tcyl(g, 0.03, faceY - H / 2 - top, W / 2 - 0.8 + 0.09, top + (faceY - H / 2 - top) / 2, fz - 0.3, '#5b5660', 8);
    // their pink on the canopy's roof, on the wall behind, on the sidewalk under it; the soffit's warm pool
    wash(g, cw - 0.2, out - 0.2, 0, top + 0.012, out / 2, PINK, 0.32, true);
    wash(g, W + 7, H + 5, 0, faceY, 0.32, PINK, 0.3);
    wash(g, cw + 1.2, out + 0.6, 0, kerb + 0.02, out / 2, '#c8a078', 0.22, true);
    wash(g, cw + 3, out + 1.2, 0, kerb + 0.025, out / 2 + 0.3, PINK, 0.1, true);
    kerbClear.push({ side: sign.side, s: sign.s, half: cw / 2 });
  }

  /** The chapel's sign, in its face's frame (see buildChapel): the heart (a dark sheet-metal cabinet on the wall, its tip
   *  `foot` m under the line's middle on a shoe on the portico's roof), its pink tube round it and chasing bulbs inside
   *  that; the ribbon across it carrying the line (a dark band edged in gold tube, its ends folded back into notched
   *  tails); wedding bells either side lighting as "he" and "my" are sung, a pair of rings over it at "man". */
  function chapelSign(fg: THREE.Object3D, sign: Verse3Plan['signs'][number], W: number, H: number, start: number, roof: number) {
    const wall = -(SHOPS.find((s) => s.theme === sign.theme)!.out ?? MOUNT.wall) + 0.02, K = HEART, foot = roof + K.lift;
    // the heart's outline (m, in the face's frame), its tip resting `foot` up
    const ky = (K.top - foot) / (11.92 + 17), kx = ky * K.wide, cy = foot + 17 * ky;
    const heartAt = (a: number, s = 1) => new THREE.Vector2(s * kx * 16 * Math.sin(a) ** 3, cy + s * ky * (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) + (1 - s) * ky * -2.5); // (inset about its middle)
    const outline = (s = 1, n = 160) => Array.from({ length: n }, (_, i) => heartAt((i / n) * Math.PI * 2, s));
    const cab = new THREE.ExtrudeGeometry(new THREE.Shape(outline()), { depth: 0.12, bevelEnabled: false, curveSegments: 1 });
    part(fg, cab, '#2a1830', 0, 0, -0.27);
    // (stood off the wall on brackets, clear of the cornice: its back's steel to the wall)
    for (const [x, y] of [[-kx * 9, cy + ky * 6], [kx * 9, cy + ky * 6], [-kx * 6, cy - ky * 6], [kx * 6, cy - ky * 6]] as const) tbox(fg, 0.1, 0.1, -0.27 - wall, x, y, (wall - 0.27) / 2, '#4a4450');
    tbox(fg, 0.7, foot - roof + 0.06, 0.3, 0, (roof + foot) / 2 - 0.03, -0.2, '#4a4450'); // the shoe under its tip, on the portico
    const front = -0.13;
    // its tube, just inside its edge
    const hw = kx * 32 + 0.6, hh = ky * 29 + 0.6, hcy = cy + ky * (11.92 - 17) / 2, px = 1024 / hw, ph = Math.round(hh * px);
    const toPx = (v: THREE.Vector2) => [(v.x + hw / 2) * px, (hcy + hh / 2 - v.y) * px] as const;
    neon(fg, hw, hh, 0, hcy, front + 0.012, neonTex(1024, ph, PINK, (c) => {
      c.strokeStyle = PINK; c.lineWidth = 0.075 * px; c.beginPath();
      outline(0.95).forEach((v, i) => { const [x, y] = toPx(v); if (i) c.lineTo(x, y); else c.moveTo(x, y); }); c.closePath(); c.stroke();
    }), { start, peak: 1.3 });
    // chasing bulbs inside the tube
    const bulb = [lampMaterial('#e8b878', 1.7, 0.5), lampMaterial('#e8b878', 1.7, 0.5)];
    marqueeBulbs.push(...bulb.map((m, i) => ({ m, phase: i, k: 1.7 })));
    {
      const ring = outline(0.86, 400), len: number[] = [0];
      for (let i = 1; i <= ring.length; i++) len.push(len[i - 1]! + ring[i % ring.length]!.distanceTo(ring[i - 1]!));
      const total = len[ring.length]!, n = Math.round(total / 0.42);
      for (let k = 0, j = 0; k < n; k++) {
        const at = (k / n) * total;
        while (len[j + 1]! < at) j++;
        const v = ring[j]!;
        ball(fg, 0.055, v.x, v.y, front + 0.03, bulb[k % 2]!);
      }
    }
    // the ribbon: its band behind the line, its tails folded back, the gold tube round them
    const rw = W + 0.5, rh = H + 0.24, tail = { in: 0.5, out: 1.15, notch: 0.42, top: rh / 2 - 0.55, bot: -rh / 2 - 0.42 };
    tbox(fg, rw, rh, 0.05, 0, 0, -0.05, '#22132a');
    const tails: THREE.Vector2[][] = [];
    for (const sd of [-1, 1]) {
      const x0 = sd * (rw / 2 - tail.in), x1 = sd * (rw / 2 + tail.out), mid = (tail.top + tail.bot) / 2;
      const pts = [new THREE.Vector2(x0, tail.top), new THREE.Vector2(x1, tail.top), new THREE.Vector2(x1 - sd * tail.notch, mid), new THREE.Vector2(x1, tail.bot), new THREE.Vector2(x0, tail.bot)];
      if (sd < 0) pts.reverse();
      tails.push(pts);
      part(fg, new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: 0.04, bevelEnabled: false }), '#1a0e20', 0, 0, -0.1);
      // the fold: a darker wedge from the band's foot down to the tail's
      part(fg, new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(sd * (rw / 2), -rh / 2), new THREE.Vector2(sd * (rw / 2), tail.bot), new THREE.Vector2(sd * (rw / 2 - tail.in * 0.9), tail.bot)].map((v, i, a) => (sd < 0 ? a[a.length - 1 - i]! : v))), { depth: 0.03, bevelEnabled: false }), '#0e0812', 0, 0, -0.065);
    }
    {
      const ow = rw + 2 * tail.out + 0.4, oh = rh + 1.1, opx = 1024 / ow, oph = Math.round(oh * opx), oy = -0.2;
      const P = (x: number, y: number) => [(x + ow / 2) * opx, (oy + oh / 2 - y) * opx] as const;
      neon(fg, ow, oh, 0, oy, 0.008, neonTex(1024, oph, C.amber, (c) => {
        c.strokeStyle = C.amber; c.lineWidth = 0.05 * opx; c.lineJoin = 'round';
        const inset = 0.09, poly = (pts: (readonly [number, number])[], close = true) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); if (close) c.closePath(); c.stroke(); };
        poly([P(-rw / 2 + inset, rh / 2 - inset), P(rw / 2 - inset, rh / 2 - inset), P(rw / 2 - inset, -rh / 2 + inset), P(-rw / 2 + inset, -rh / 2 + inset)]);
        for (const sd of [-1, 1]) { // the tails' outer edges (their inner ends are behind the band)
          const x0 = sd * (rw / 2 + 0.02), x1 = sd * (rw / 2 + tail.out - inset), mid = (tail.top + tail.bot) / 2;
          poly([P(x0, tail.top - inset), P(x1, tail.top - inset), P(x1 - sd * (tail.notch - inset), mid), P(x1, tail.bot + inset), P(x0, tail.bot + inset)], false);
        }
      }), { start, peak: SECONDARY * 1.15 });
    }
    // the bells either side, swung in toward it, and the rings over its cleft: each lit by its word
    const words = faces.filter((f) => Math.abs(f.s - sign.s) < 0.01).flatMap((f) => f.phrase.words);
    const wordAt = (name: string) => words.find((w) => w.w.toLowerCase().replace(/[^a-z]/g, '') === name)?.start ?? start;
    const lit = (w: number, h: number, x: number, y: number, rot: number, tex: THREE.Texture, at: number) => {
      const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, color: new THREE.Color().setScalar(0.12), side: THREE.DoubleSide });
      wordLit.push({ m, at, peak: 1.25 });
      const p = plane(fg, w, h, x, y, front + 0.02, m); p.rotation.z = rot; return p;
    };
    const bellTex = neonTex(256, 320, C.amber, (c) => {
      c.strokeStyle = C.amber; c.lineWidth = 11;
      c.beginPath(); c.moveTo(40, 250); c.quadraticCurveTo(70, 236, 74, 180); c.bezierCurveTo(78, 70, 178, 70, 182, 180); c.quadraticCurveTo(186, 236, 216, 250); c.closePath(); c.stroke();
      c.beginPath(); c.arc(128, 276, 16, 0, Math.PI * 2); c.stroke(); // its clapper
      c.beginPath(); c.arc(128, 66, 14, 0, Math.PI * 2); c.stroke(); // its loop
      c.beginPath(); c.moveTo(92, 214); c.lineTo(164, 214); c.stroke(); // a band round it
    });
    const bx = kx * 16 + 0.8, by = tail.top + 0.85;
    lit(1.2, 1.5, -bx, by, -0.28, bellTex, wordAt('he'));
    lit(1.2, 1.5, bx, by, 0.28, bellTex, wordAt('my'));
    lit(1.2, 0.74, 0, cy + ky * 7.8, 0, neonTex(416, 256, C.amber, (c) => {
      c.strokeStyle = C.amber; c.lineWidth = 12;
      for (const x of [158, 258]) { c.beginPath(); c.arc(x, 146, 74, 0, Math.PI * 2); c.stroke(); }
      c.beginPath(); c.moveTo(258, 72); c.lineTo(242, 40); c.lineTo(258, 18); c.lineTo(274, 40); c.closePath(); c.stroke(); // its stone
    }), wordAt('man'));
    // its pink on the wall round it and down on the lawn
    wash(fg, rw + 6, hh + 4, 0, hcy, wall + 0.01, PINK, 0.3);
  }

  /** The wedding chapel, in its lot's frame (its front at z 0, the lyric's neon on it). */
  function buildChapel(g: THREE.Object3D, lot: Lot, sign: Verse3Plan['signs'][number], fg: THREE.Object3D, W: number, H: number, start: number) {
    const Wl = lot.w, Hl = lot.h, D = lot.d - 1, K = CHAPEL;
    const siding = canvasTex(512, 512, (c) => { c.fillStyle = '#b4abc2'; c.fillRect(0, 0, 512, 512); for (let y = 0; y < 512; y += 32) { c.fillStyle = '#8e86a0'; c.fillRect(0, y + 28, 512, 4); c.fillStyle = '#c2bad0'; c.fillRect(0, y, 512, 3); } });
    siding.wrapS = siding.wrapT = THREE.RepeatWrapping; siding.repeat.set(Wl / 4, Hl / 4);
    const clap = toon({ map: siding }), trim = toon({ color: '#c8c0d4' }), roofM = toon({ color: '#3a3448' }), doorM = toon({ color: '#4a2a36' });
    // its body: the front wall, its sides and back, under a pitched roof running back from a gable
    plane(g, Wl, Hl, 0, Hl / 2, 0.02, clap);
    box(g, Wl - 0.02, Hl, D, 0, Hl / 2, -D / 2, toon({ color: '#8e86a0' }));
    const gable = new THREE.Shape([new THREE.Vector2(-Wl / 2, 0), new THREE.Vector2(Wl / 2, 0), new THREE.Vector2(0, K.gable)]);
    const gm = new THREE.Mesh(new THREE.ExtrudeGeometry(gable, { depth: 0.25, bevelEnabled: false }), clap); gm.position.set(0, Hl, -0.23); g.add(gm);
    // the roof: two slopes back from the gable, overhanging it a little
    const slope = Math.hypot(Wl / 2 + 0.4, K.gable + 0.3), pitch = Math.atan2(K.gable + 0.3, Wl / 2 + 0.4);
    for (const sd of [-1, 1]) { const r = box(g, slope, 0.18, D + 0.6, sd * (Wl / 4 + 0.1), Hl + K.gable / 2 - 0.05, -D / 2 + 0.3, roofM); r.rotation.z = -sd * pitch; }
    // its trim: the rake boards up the gable, the corner boards, a cornice under the gable, a skirt board
    for (const sd of [-1, 1]) { const r = box(g, slope + 0.2, 0.28, 0.14, sd * (Wl / 4 + 0.05), Hl + K.gable / 2 + 0.05, 0.08, trim); r.rotation.z = -sd * pitch; }
    for (const sd of [-1, 1]) box(g, 0.32, Hl, 0.12, sd * (Wl / 2 - 0.16), Hl / 2, 0.08, trim);
    box(g, Wl + 0.3, 0.3, 0.3, 0, Hl - 0.05, 0.12, trim);
    box(g, Wl, 0.4, 0.14, 0, 0.2, 0.08, toon({ color: '#6e6680' }));
    // the rose window in the gable, stained glass
    const glassTex = (arch: boolean) => canvasTex(256, arch ? 512 : 256, (c) => {
      const w = 256, h = arch ? 512 : 256, cols = ['#4a4260', '#3a5458', '#6a5a3e', '#5a3a4a', '#40485e', '#525a42'];
      c.fillStyle = '#1a1420'; c.fillRect(0, 0, w, h);
      if (arch) { for (let y = 0; y < h; y += 40) for (let x = 0; x < w; x += 42) { c.fillStyle = cols[(x / 42 + y / 40 * 2) % cols.length | 0]!; c.fillRect(x + 3, y + 3, 36, 34); } c.fillStyle = '#7a5a6e'; c.beginPath(); c.arc(128, 120, 50, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#1a1420'; c.lineWidth = 6; c.beginPath(); c.arc(128, 120, 50, 0, Math.PI * 2); c.stroke(); }
      else { for (let k = 0; k < 12; k++) { c.fillStyle = cols[k % cols.length]!; c.beginPath(); c.moveTo(128, 128); c.arc(128, 128, 118, (k / 12) * Math.PI * 2, ((k + 1) / 12) * Math.PI * 2); c.closePath(); c.fill(); } c.strokeStyle = '#1a1420'; c.lineWidth = 7; for (let k = 0; k < 12; k++) { c.beginPath(); c.moveTo(128, 128); c.lineTo(128 + 118 * Math.cos((k / 12) * Math.PI * 2), 128 + 118 * Math.sin((k / 12) * Math.PI * 2)); c.stroke(); } c.fillStyle = '#7a5a6e'; c.beginPath(); c.arc(128, 128, 30, 0, Math.PI * 2); c.fill(); }
    });
    const stained = (arch: boolean) => pic(glassTex(arch), { color: new THREE.Color().setScalar(0.62) });
    // (high in the gable, over the sign's heart and its rings)
    const rose = new THREE.Mesh(new THREE.CircleGeometry(0.6, 32), stained(false)); rose.position.set(0, Hl + K.gable * 0.6, 0.05); g.add(rose);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.08, 8, 32), trim); ring.position.copy(rose.position); g.add(ring);
    /** An arched window: its glass (a rectangle under a half disc), its trim round it, its sill. */
    const archWindow = (x: number, y0: number, w: number, h: number) => {
      const sh = new THREE.Shape(); sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(w / 2, h - w / 2); sh.absarc(0, h - w / 2, w / 2, 0, Math.PI, false); sh.lineTo(-w / 2, 0);
      const geo = new THREE.ShapeGeometry(sh, 16), uv = geo.getAttribute('uv'), p = geo.getAttribute('position');
      for (let j = 0; j < uv.count; j++) uv.setXY(j, (p.getX(j) + w / 2) / w, p.getY(j) / h);
      const m = new THREE.Mesh(geo, stained(true)); m.position.set(x, y0, 0.04); g.add(m);
      const outline = new THREE.Shape(); const o = 0.14; outline.moveTo(-w / 2 - o, 0); outline.lineTo(w / 2 + o, 0); outline.lineTo(w / 2 + o, h - w / 2); outline.absarc(0, h - w / 2, w / 2 + o, 0, Math.PI, false); outline.lineTo(-w / 2 - o, 0);
      outline.holes.push(new THREE.Path(sh.getPoints(16)));
      const t = new THREE.Mesh(new THREE.ExtrudeGeometry(outline, { depth: 0.1, bevelEnabled: false, curveSegments: 16 }), trim); t.position.set(x, y0, 0.0); g.add(t);
      box(g, w + 0.45, 0.1, 0.22, x, y0 - 0.05, 0.1, trim);
    };
    for (const x of [-3.9, 3.9, -5.4, 5.4]) archWindow(x, 0.75, 0.9, 2.3);
    archWindow(-Wl / 2 + 1.2, 4.3, 0.9, 2.2);
    // the portico: columns up to an entablature with the chapel's name, under a low pediment, the doors behind
    const P = K.portico;
    box(g, P.w + 0.4, 0.36, P.d + 0.2, 0, P.h + 0.18, P.d / 2, trim); // its roof slab
    box(g, P.w + 0.2, 0.42, 0.12, 0, P.h - 0.2, P.d + 0.02, trim); // the frieze
    plane(g, P.w - 0.3, 0.3, 0, P.h - 0.2, P.d + 0.09, pic(signFace('WEDDING CHAPEL', 1024, 72, '#5a3a5e', null, F.sign(700), 0.72, 0.18), { transparent: true }));
    // (flat-roofed: its sign's heart sits on it — a pediment stood where the heart's tip comes down)
    for (const x of [-P.w / 2 + 0.2, P.w / 2 - 0.2]) for (const z of [P.d - 0.15, 0.3]) {
      cyl(g, 0.15, P.h - 0.5, x, (P.h - 0.5) / 2 + 0.15, z, trim, 16);
      box(g, 0.42, 0.15, 0.42, x, 0.08, z, trim); box(g, 0.4, 0.12, 0.4, x, P.h - 0.47, z, trim); // its base, its capital
    }
    box(g, P.w + 0.2, 0.15, P.d + 0.2, 0, 0.075, P.d / 2, toon({ color: '#5a5266' })); // the step
    // the doors: a pair under an arched fanlight
    box(g, 1.5, 2.1, 0.1, 0, 1.05, 0.06, doorM);
    box(g, 0.04, 2.0, 0.04, 0, 1.05, 0.13, toon({ color: '#2a1820' }));
    for (const x of [-0.22, 0.22]) box(g, 0.05, 0.3, 0.05, x, 1.1, 0.14, gold);
    const fan = new THREE.Mesh(new THREE.CircleGeometry(0.72, 24, 0, Math.PI), stained(false)); fan.position.set(0, 2.1, 0.06); g.add(fan);
    // a lantern either side of the doors, dim and warm
    for (const x of [-1.2, 1.2]) { box(g, 0.22, 0.34, 0.22, x, 2.0, 0.2, toon({ color: '#2a2430' })); box(g, 0.14, 0.22, 0.14, x, 2.0, 0.2, lampMaterial('#e0a868', 1.4, 0.5)); }
    // the steeple: a tower on the roof's ridge behind the gable, its belfry open on four posts, the bell in it, the spire
    const S = K.steeple, sz = -S.back - S.side / 2, base = Hl + K.gable - 0.6;
    box(g, S.side, S.tower, S.side, 0, base + S.tower / 2, sz, clap);
    box(g, S.side + 0.3, 0.2, S.side + 0.3, 0, base + S.tower, sz, trim);
    for (const dx of [-1, 1]) for (const dz of [-1, 1]) box(g, 0.28, S.belfry, 0.28, dx * (S.side / 2 - 0.14), base + S.tower + S.belfry / 2, sz + dz * (S.side / 2 - 0.14), trim);
    box(g, S.side + 0.3, 0.22, S.side + 0.3, 0, base + S.tower + S.belfry, sz, trim);
    const bellPts = [[0, 0.9], [0.18, 0.88], [0.3, 0.7], [0.36, 0.35], [0.5, 0.06], [0.56, 0]].map(([x, y]) => new THREE.Vector2(x!, y!));
    const bell = new THREE.Mesh(new THREE.LatheGeometry(bellPts, 20), gold); bell.position.set(0, base + S.tower + 0.45, sz); g.add(bell);
    box(g, 0.08, 0.5, 0.08, 0, base + S.tower + S.belfry - 0.4, sz, dark);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(S.side * 0.74, S.spire, 4), roofM); spire.position.set(0, base + S.tower + S.belfry + 0.11 + S.spire / 2, sz); spire.rotation.y = Math.PI / 4; g.add(spire);
    const top = base + S.tower + S.belfry + S.spire;
    box(g, 0.1, 0.9, 0.1, 0, top + 0.4, sz, gold); box(g, 0.5, 0.1, 0.1, 0, top + 0.55, sz, gold);
    chapelSign(fg, sign, W, H, start, P.h + 0.36 - (sign.face.center.y - route.frameAt(sign.s).pos.y));
    // the lawn and its picket fence (a gate at the path), a monument sign on it: wedding bells, its hours
    const lawnM = toon({ color: '#3e5a44' });
    for (const sd of [-1, 1]) {
      const x0 = sd * (P.w / 2 + 0.3), x1 = sd * (Wl / 2 - 0.1), cx = (x0 + x1) / 2, w = Math.abs(x1 - x0);
      box(g, w, 0.18, K.lawn, cx, 0.24, K.lawn / 2, lawnM);
      const pickets = canvasTex(512, 128, (c) => { c.clearRect(0, 0, 512, 128); c.fillStyle = '#ffffff'; for (let x = 4; x < 512; x += 32) { c.beginPath(); c.moveTo(x, 128); c.lineTo(x, 24); c.lineTo(x + 9, 6); c.lineTo(x + 18, 24); c.lineTo(x + 18, 128); c.fill(); } c.fillRect(0, 40, 512, 10); c.fillRect(0, 96, 512, 10); });
      pickets.wrapS = THREE.RepeatWrapping; pickets.repeat.set(w / 2.4, 1);
      const fence = plane(g, w, 0.85, cx, 0.15 + 0.42, K.lawn + 0.02, new THREE.MeshLambertMaterial({ map: pickets, alphaTest: 0.5, color: '#a8a0b6', side: THREE.DoubleSide }));
      fence.name = 'fence';
      // (a shrub or two along the wall)
      for (let k = 0; k < 2; k++) ball(g, 0.42, cx + (k - 0.5) * w * 0.5, 0.5, 0.45, toon({ color: '#2e4a36' })).scale.set(1.2, 0.8, 0.8);
    }
    const ms = new THREE.Group(); ms.position.set(-Wl / 2 + 1.5, 0.3, K.lawn * 0.55); g.add(ms);
    for (const x of [-0.75, 0.75]) box(ms, 0.1, 1.3, 0.1, x, 0.65, 0, trim);
    box(ms, 1.8, 0.8, 0.12, 0, 1.0, 0, toon({ color: '#3a2a44' }));
    plane(ms, 1.66, 0.68, 0, 1.0, 0.065, litPic(canvasTex(512, 210, (c) => {
      c.fillStyle = '#3a2a44'; c.fillRect(0, 0, 512, 210);
      for (const [x, r] of [[70, -0.25], [120, 0.25]] as const) { c.save(); c.translate(x, 70); c.rotate(r); c.fillStyle = '#c8a050'; c.beginPath(); c.moveTo(-26, 34); c.quadraticCurveTo(-24, -26, 0, -30); c.quadraticCurveTo(24, -26, 26, 34); c.closePath(); c.fill(); c.beginPath(); c.arc(0, 40, 8, 0, Math.PI * 2); c.fill(); c.restore(); }
      c.fillStyle = '#d8c8d8'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = font(F.sign(700), 46); c.fillText('WEDDINGS', 330, 60, 330);
      c.font = font(F.sign(600), 34); c.fillText('NO WAITING · 24 HRS', 256, 160, 470);
    }), 0.7));
    // two low floodlights on the lawn, washing the front faintly warm
    for (const x of [-Wl / 2 + 3.2, Wl / 2 - 2.6]) { box(g, 0.3, 0.2, 0.3, x, 0.42, 0.9, toon({ color: '#2a2430' })); wash(g, 3.2, 5.5, x, 2.9, 0.06, '#c0a088', 0.07); }
    // the limo at the kerb in front, where the drive's block for it stands (the town parks none of its cars there), its
    // nose down the street: the far lane's way
    const lg = onRoad(limoS(sign.s, lot.side), lot.side * PARKED.lateral);
    const limo = stretchLimo(); limo.rotation.y = Math.PI; lg.add(limo);
  }

  // ---- the strip's other businesses (STRIP), on the lots between the lines' own: each its trade's sign over its glass,
  // its window's neon, its blade, its awning, its light on the sidewalk, people at its door; and over them the floors'
  // fire escapes, a sign on a roof here and there, the roofs' plant ----
  /** Every box sign's face on the strip: one atlas (a cell a trade), one material (lit low, as the windows are). */
  const boxed = Object.entries(STRIP).filter(([, t]) => t.sign === 'box'), BOX = { cols: 4, w: 512, h: 128 };
  const boxAtlas = canvasTex(BOX.cols * BOX.w, Math.ceil(boxed.length / BOX.cols) * BOX.h, (c) => boxed.forEach(([, t], k) => boxFace(c, (k % BOX.cols) * BOX.w, Math.floor(k / BOX.cols) * BOX.h, BOX.w, BOX.h, t.name, t.ink, t.bg, t.sub)));
  // (the check casher's brighter: the user wanted "a bright lit box sign")
  const boxMat = litPic(boxAtlas, 0.74), checksMat = litPic(boxAtlas, 0.86), boxCell = new Map(boxed.map(([, t], k) => [t, k]));
  /** A box sign's face (BOX's aspect: w = 4h) in `g`, the atlas's cell for `t`, at (x, y, z) facing +z. */
  const boxSign = (g: THREE.Object3D, t: StripTrade, h: number, x: number, y: number, z: number, mat = boxMat) => {
    const k = boxCell.get(t)!, rows = Math.ceil(boxed.length / BOX.cols), geo = new THREE.PlaneGeometry(4 * h, h), uv = geo.getAttribute('uv');
    for (let j = 0; j < uv.count; j++) uv.setXY(j, ((k % BOX.cols) + uv.getX(j)) / BOX.cols, 1 - (Math.floor(k / BOX.cols) + 1 - uv.getY(j)) / rows);
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m;
  };
  /** A striped (or plain) canvas awning over a front's glass: its slope out from the wall, its valance. */
  const awning = (g: THREE.Object3D, w: number, cols: readonly string[], y0 = 2.92, out = 1.3, drop = 0.42) => {
    const n = cols.length > 1 ? Math.max(6, Math.round(w / 0.45)) : 1, sw = w / n, len = Math.hypot(out, drop), a = Math.atan2(drop, out);
    for (let k = 0; k < n; k++) {
      const x = -w / 2 + sw * (k + 0.5), col = cols[k % cols.length]!;
      tbox(g, sw, 0.04, len, x, y0 - drop / 2, -0.2 + out / 2, col).rotation.x = a;
      tbox(g, sw, 0.26, 0.03, x, y0 - drop - 0.12, -0.2 + out, col);
    }
    for (const sd of [-1, 1]) { const arm = tbox(g, 0.03, 0.03, len, sd * (w / 2 - 0.05), y0 - drop / 2 - 0.05, -0.2 + out / 2, '#2a2630'); arm.rotation.x = a; }
  };
  /** A fire escape down a window column (x) of a front from its second floor up: each floor's landing and its rail, the
   *  stairs between, the ladder drawn up under the lowest, its brackets. */
  const fireEscape = (g: THREE.Object3D, x: number, top: number) => {
    const col = '#2a2630', w = 2.5, d = 1.0, z = -0.3 + d / 2;
    const floors: number[] = [];
    for (let y = 4.2; y + 1.9 < top; y += STREET.storey) floors.push(y);
    floors.forEach((y, k) => {
      tbox(g, w, 0.05, d, x, y, z, col);
      tbox(g, w, 0.04, 0.04, x, y + 0.95, z + d / 2 - 0.02, col); for (const sd of [-1, 1]) tbox(g, 0.04, 0.04, d, x + sd * (w / 2 - 0.02), y + 0.95, z, col);
      for (let b = 0; b <= 8; b++) tbox(g, 0.022, 0.95, 0.022, x - w / 2 + 0.02 + (b * (w - 0.04)) / 8, y + 0.47, z + d / 2 - 0.02, col);
      for (const sd of [-1, 1]) { const br = tbox(g, 0.04, 0.04, Math.hypot(d, 0.7), x + sd * (w / 2 - 0.15), y - 0.35, -0.3 + d / 2, col); br.rotation.x = -Math.atan2(0.7, d); }
      if (k + 1 < floors.length) { // the stair up to the next landing, along the rail's back half
        const rise = STREET.storey, run = w - 0.5, len = Math.hypot(run, rise), a = Math.atan2(rise, run);
        for (const dz of [-0.12, 0.28]) { const st = tbox(g, len, 0.05, 0.04, x, y + rise / 2, z + dz, col); st.rotation.z = (k % 2 ? 1 : -1) * a; }
        for (let q = 1; q < 9; q++) tbox(g, 0.14, 0.03, 0.4, x - (k % 2 ? -1 : 1) * (run / 2 - (q * run) / 9), y + (q * rise) / 9, z + 0.08, col);
      }
    });
    if (floors.length) for (const sd of [-0.3, 0.3]) tbox(g, 0.04, 1.6, 0.04, x + w / 2 - 0.5 + sd, floors[0]! - 0.6, z + d / 2 - 0.1, col); // (the ladder, drawn up)
  };
  /** A sign up on a frame on a roof, facing the street: its word in tube on a dark box, the legs and braces under it. */
  const roofSign = (g: THREE.Object3D, lot: Lot, word: string, color: string) => {
    const w = Math.min(lot.w * 0.72, 0.62 * word.length + 1.2), h = 1.35, y = lot.h + 1.3 + h / 2, z = -1.2;
    tbox(g, w + 0.3, h + 0.3, 0.3, 0, y, z - 0.2, '#1e1b22');
    neon(g, w, h, 0, y, z - 0.03, tubeWord(word, color, 1024, Math.round((1024 * h) / w)));
    for (const x of [-w / 2 + 0.4, 0, w / 2 - 0.4]) { tbox(g, 0.12, 1.3 + 0.2, 0.12, x, lot.h + 0.75, z - 0.25, '#3a3640'); const br = tbox(g, 0.08, 1.9, 0.08, x, lot.h + 0.7, z - 0.95, '#3a3640'); br.rotation.x = -0.7; }
    tbox(g, w + 0.4, 0.08, 0.7, 0, lot.h + 1.25, z - 0.1, '#3a3640'); // (its catwalk)
  };
  /** The check casher's front (the user, 2026-10-16, at 142 s: "the CHECKS CASHED green text sign in the bottom
   *  right-hand corner ... the storefront is, like, super bland. I don't know what it's supposed to be"): bars over its
   *  windows, its posters taped inside them (PAYDAY LOANS, MONEY ORDERS, a wire service's own), the ATM set in its wall
   *  by the door under its lit header, the camera on its bracket over the door, someone at the machine. */
  type Pane = { x: number; y: number; w: number; h: number; z: number; door: boolean };
  const dressChecks = (g: THREE.Object3D, windows: Pane[], door: Pane | undefined) => {
    const posters = canvasTex(768, 340, (c) => {
      const at = (k: number, draw: () => void) => { c.save(); c.translate(k * 256, 0); c.beginPath(); c.rect(0, 0, 256, 340); c.clip(); draw(); c.restore(); };
      c.textAlign = 'center'; c.textBaseline = 'middle';
      at(0, () => { c.fillStyle = '#d0ae3c'; c.fillRect(0, 0, 256, 340); c.fillStyle = '#8a2a24'; c.fillRect(0, 0, 256, 92); c.fillStyle = '#f0e6cc'; fitText(c, 'PAYDAY', 128, 48, 220, 60, 700, 0.04); c.fillStyle = '#2a1a14'; fitText(c, 'LOANS', 128, 140, 228, 78, 700, 0.04); fitText(c, '$100 – $1000', 128, 214, 220, 36, 700, 0.02); for (let k = 0; k < 4; k++) c.fillRect(40, 252 + k * 16, 176 - (k % 2) * 40, 6); });
      at(1, () => { c.fillStyle = '#d8d2c0'; c.fillRect(0, 0, 256, 340); c.fillStyle = '#2a3a6a'; fitText(c, 'MONEY', 128, 54, 220, 56, 700, 0.04); fitText(c, 'ORDERS', 128, 112, 220, 56, 700, 0.04); c.fillStyle = '#8a2a24'; fitText(c, '79¢', 128, 210, 200, 110, 700, 0); c.fillStyle = '#2a3a6a'; c.fillRect(30, 286, 196, 8); c.fillRect(56, 304, 144, 6); });
      at(2, () => { c.fillStyle = '#18181c'; c.fillRect(0, 0, 256, 340); c.strokeStyle = '#d8b030'; c.lineWidth = 7; c.beginPath(); c.arc(128, 116, 66, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.ellipse(128, 116, 28, 66, 0, 0, Math.PI * 2); c.stroke(); for (const dy of [-30, 0, 30]) { c.beginPath(); c.moveTo(128 - Math.sqrt(66 * 66 - dy * dy), 116 + dy); c.lineTo(128 + Math.sqrt(66 * 66 - dy * dy), 116 + dy); c.stroke(); } c.fillStyle = '#d8b030'; fitText(c, 'GLOBEWIRE', 128, 228, 228, 48, 700, 0.04); c.fillStyle = '#d8d4c8'; fitText(c, 'SEND MONEY WORLDWIDE', 128, 272, 220, 20, 600, 0.04); fitText(c, 'IN MINUTES', 128, 300, 220, 20, 600, 0.04); });
    });
    const posterMat = litPic(posters, 0.82);
    const poster = (k: number, x: number, y: number, z: number) => {
      const geo = new THREE.PlaneGeometry(0.62, 0.82), uv = geo.getAttribute('uv');
      for (let j = 0; j < uv.count; j++) uv.setX(j, (k + uv.getX(j)) / 3);
      const m = new THREE.Mesh(geo, posterMat); m.position.set(x, y, z); g.add(m);
    };
    // the ATM set in the wall at the far end of the window nearest the door (from the door: its queue's out of the way)
    const host = door && windows.length ? windows.reduce((a, b) => (Math.abs(a.x - door.x) < Math.abs(b.x - door.x) ? a : b)) : windows[0] ?? door!;
    const away = Math.sign(host.x - (door?.x ?? host.x - 1)) || 1, ax = host.x + away * (host.w / 2 - 0.55), zf = host.z + 0.3;
    windows.forEach((p, n) => {
      // the bars: a frame of flat steel, uprights every 15 cm, a rail across the middle (short of the ATM)
      const cut = p === host ? 1.1 : 0, w = p.w - cut, x = p.x - (p === host ? away * cut / 2 : 0), zb = p.z + 0.15, nb = Math.max(2, Math.floor(w / 0.15));
      for (let b = 1; b < nb; b++) tbox(g, 0.03, p.h, 0.03, x - w / 2 + (b * w) / nb, p.y, zb, '#2a2830');
      for (const y of [p.y - p.h / 2 + 0.03, p.y, p.y + p.h / 2 - 0.03]) tbox(g, w, 0.05, 0.04, x, y, zb, '#2a2830');
      for (const sd of [-1, 1]) tbox(g, 0.05, p.h, 0.04, x + sd * (w / 2 - 0.02), p.y, zb, '#2a2830');
      // its posters, taped inside the glass behind the bars
      const room = w - 0.3, k0 = n * 2;
      if (room > 1.5) { poster(k0 % 3, x - room * 0.25, 1.45, p.z + 0.012); poster((k0 + 1) % 3, x + room * 0.25, 1.35, p.z + 0.012); } else if (room > 0.7) poster(k0 % 3, x, 1.4, p.z + 0.012);
    });
    tbox(g, 1.0, 1.75, 0.08, ax, 1.2, zf - 0.04, '#4e525a'); // its surround
    tbox(g, 0.84, 1.2, 0.3, ax, 1.25, zf - 0.12, '#363a40');
    tbox(g, 1.04, 0.07, 0.42, ax, 2.1, zf - 0.02, '#4e525a'); // the hood over the screen
    const scr = plane(g, 0.38, 0.28, ax, 1.5, zf + 0.035, litPic(canvasTex(128, 96, (c) => { c.fillStyle = '#1e4a6a'; c.fillRect(0, 0, 128, 96); c.fillStyle = '#9ac8d8'; c.fillRect(12, 12, 104, 14); for (let k = 0; k < 3; k++) { c.fillRect(8, 38 + k * 18, 30, 10); c.fillRect(90, 38 + k * 18, 30, 10); } }), 0.9));
    scr.rotation.x = -0.12;
    const pad = tbox(g, 0.3, 0.05, 0.18, ax, 1.12, zf + 0.06, '#26262c'); pad.rotation.x = 0.35;
    tbox(g, 0.14, 0.025, 0.03, ax + 0.26, 1.28, zf + 0.04, '#0e0e10'); tbox(g, 0.4, 0.035, 0.03, ax, 0.96, zf + 0.04, '#0e0e10'); // the card's slot, the cash's
    plane(g, 0.84, 0.22, ax, 2.0, zf + 0.025, litPic(signFace('ATM', 256, 64, '#e8e2d0', '#1c5a3a', F.sign(700), 0.7, 0.3), 0.85));
    // the camera over the door, on its bracket, looking down the sidewalk; its light
    const cx = (door ?? host).x + 0.75, cz = host.z;
    tbox(g, 0.06, 0.06, 0.32, cx, 2.78, cz + 0.16, '#2a2a30');
    const cam = tbox(g, 0.16, 0.13, 0.34, cx, 2.7, cz + 0.42, '#c8c4bc'); cam.rotation.x = 0.4;
    tbox(g, 0.2, 0.03, 0.4, cx, 2.79, cz + 0.4, '#8a8680').rotation.x = 0.4;
    plane(g, 0.025, 0.025, cx + 0.05, 2.62, cz + 0.6, new THREE.MeshBasicMaterial({ color: new THREE.Color(1.1, 0.2, 0.15) }));
    // someone at the machine, reaching for its keys
    stander(g, ax, zf + 0.55, Math.PI).getObjectByName('armR')!.rotation.x = -1.0;
  };
  plan.lots.forEach((lot, i) => {
    if (lot.shop !== undefined) return;
    const g = frameOf(i), r = (k: number) => hash(i, k, 701), low = lot.h < 6, t = tradeOf.get(i), panes = panesOf.get(i) ?? [];
    // (the lot's frame runs along the road on the left, against it on the right: its up-street end is −x on the left)
    const upEnd = lot.side < 0 ? -lot.w / 2 + 0.5 : lot.w / 2 - 0.5;
    const world = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).applyMatrix4(g.matrix);
    // the roof's plant: an air conditioner or two (their fans), a vent stack
    for (let k = 0; k < 1 + Math.floor(r(15) * 2); k++) {
      const x = (r(16 + k) - 0.5) * lot.w * 0.6, z = -2 - r(20 + k) * (lot.d - 5);
      tbox(g, 1.5, 0.9, 1.2, x, lot.h + 0.45, z, '#4a4652'); tcyl(g, 0.4, 0.06, x, lot.h + 0.92, z, '#26242a', 14); tbox(g, 1.56, 0.06, 1.26, x, lot.h + 0.1, z, '#3a3640');
    }
    tcyl(g, 0.12, 1.1, (r(24) - 0.5) * lot.w * 0.7, lot.h + 0.55, -lot.d * 0.6, '#3e3a44', 8);
    // the floors above: a fire escape down a window column on some (at the down-street end, clear of a blade), a sign up
    // on the roof of a few — none where it would cross a view of the words
    if (lot.h > 9 && r(40) < 0.6) {
      const m = Math.max(0, Math.floor((lot.w - 1.2) / 2.6)), x = m > 1 ? -Math.sign(upEnd) * ((m - 1) / 2) * 2.6 : 0;
      if (m >= 1 && !inView(world(x, 4, 0.3), 1.4, lot.h - 4)) fireEscape(g, x, lot.h - 0.9);
    }
    if (lot.h > 9 && r(50) < 0.4) {
      const [word, col] = ROOF_WORDS[Math.floor(r(51) * ROOF_WORDS.length)]!;
      if (!inView(world(0, lot.h, -1.2), Math.min(lot.w * 0.4, 3.5), 3.2)) roofSign(g, lot, word, col);
    }
    fuse(g); // (the tinted parts so far: one mesh)
    if (!t) return; // (an apartment block: no shop)
    // its sign over its glass: a lit box on its band, or its name in tube on a raceway (a drawing in tube beside it)
    const y = 3.55, glowCol = t.sign === 'box' ? t.bg : t.ink;
    if (t.sign === 'box') {
      const h = Math.min(t === STRIP.checks ? 1.28 : t.sub ? 1.1 : 0.95, (lot.w - 1) / 4), w = 4 * h;
      tbox(g, w + 0.16, h + 0.16, 0.32, 0, y, 0.0, '#24212a'); tbox(g, w + 0.22, 0.05, 0.36, 0, y + h / 2 + 0.08, 0.0, '#3a3640');
      boxSign(g, t, h, 0, y, 0.165, t === STRIP.checks ? checksMat : boxMat);
    } else {
      const ih = t.icon ? 0.95 : 0, tw = Math.min(lot.w * 0.82 - ih - 0.3, 0.5 * t.name.length + 0.9), h = 0.95, x0 = (ih ? -(ih + 0.15) / 2 : 0);
      tbox(g, tw * 0.92, 0.16, 0.12, x0, y - 0.3, 0.0, '#2a2630'); // (the raceway the letters stand on)
      neon(g, tw, h, x0, y, 0.09, tubeWord(t.name, t.ink, 1024, Math.round((1024 * h) / tw)));
      if (t.icon) { const ix = x0 + tw / 2 + 0.15 + ih / 2; tbox(g, ih * 0.5, 0.14, 0.12, ix, y - 0.32, 0.0, '#2a2630'); neon(g, ih, ih, ix, y, 0.09, neonTex(256, 256, t.ink, (c) => drawIcon(c, t.icon!, t.ink))); }
    }
    wash(g, Math.min(lot.w, 8), 3.0, 0, 0.17, 1.5, glowCol, 0.14, true); // (its light on the sidewalk)
    if (r(11) < 0.5) reflect(lot.s, lot.side, Math.min(lot.w, 6), glowCol, 0.12);
    // the neon it hangs in its window (not in the door), just inside the glass
    // (a front of one bay: its door at one end of it, the rest its window)
    let shown = panes.filter((p) => !p.door), doors = panes.filter((p) => p.door).map((p) => ({ ...p, w: 1.1 }));
    if (!shown.length && panes.length) {
      const p = panes[0]!;
      doors = [{ ...p, x: p.x - p.w / 2 + 0.7, w: 1.1, door: true }];
      shown = [{ ...p, x: p.x + 0.65, w: p.w - 1.5, door: false }];
    }
    if (t.window && shown.length && !t.closed) {
      const p = shown[Math.floor(r(8) * shown.length)]!, [word, col] = t.window, w = Math.min(p.w - 0.4, 0.3 * word.length + 0.6);
      neon(g, w, 0.48, p.x, 1.85, p.z + 0.05, tubeWord(word, col, 512, Math.round((512 * 0.48) / w)), { peak: 0.9 });
    }
    // its door: the frame, the push bar (on a closed shop, its grille down)
    for (const p of doors) {
      if (t.closed) { grille(g, p.w, p.h, p.x, p.y + p.h / 2, p.z + 0.08); continue; }
      tbox(g, 1.1, 0.06, 0.06, p.x, 2.42, p.z + 0.04, '#1d1a22'); for (const sd of [-1, 1]) tbox(g, 0.06, 2.42, 0.06, p.x + sd * 0.55, 1.21, p.z + 0.04, '#1d1a22');
      tbox(g, 0.7, 0.04, 0.05, p.x, 1.05, p.z + 0.08, WORLD.chrome);
    }
    if (t.closed) for (const p of shown) grille(g, p.w, p.h * 0.55, p.x, p.y + p.h / 2, p.z + 0.08);
    // its awning, its blade (tall enough, wide enough, out of the views)
    if (t.awning) awning(g, Math.min(lot.w * 0.78, 9), t.awning);
    if (t.blade && !low && lot.w > 4.5 && r(1) < 0.7) {
      const [word, col] = t.blade, h = Math.min(lot.h - 4.4, 1.2 + word.length * 0.95);
      const p = atRoad(lot.s - lot.w / 2 + 0.5, lot.side * (STREET.front - 0.7), 3.8);
      if (h > 2.2 && !inView(p, 0.9, h)) blade(g, upEnd, 4.2, h, word, col, 1.0);
    }
    // the check casher's own front: bars on its windows, its posters inside them, the ATM in its wall, the camera over
    // its door, someone at the machine
    if (t === STRIP.checks) dressChecks(g, shown, doors[0]);
    // people at its door: a pair talking, on some (still: built once, and left)
    const door = doors[0];
    if (door && !t.closed && t !== STRIP.checks && r(30) < 0.45) {
      const at = [[door.x - 0.4, 1.3, Math.PI / 2], [door.x + 0.45, 1.25, -Math.PI / 2]] as const;
      if (at.every(([x, z]) => !inView(world(x, 0.15, z), 0.45, 1.85))) for (const [x, z, ry] of at) stander(g, x, z, ry + (r(31) - 0.5) * 0.6);
    }
    fuse(g);
  });

  // ---- the cross street: its asphalt off both sides, crosswalks, the signals ----
  {
    const [a, b] = plan.cross, mid = (a + b) / 2, w = b - a;
    for (const side of [-1, 1]) {
      const g = onRoad(mid, side * (ROAD_HALF + 28));
      const road = new THREE.Mesh(new THREE.PlaneGeometry(56, w), toon({ color: '#3a3444' })); road.rotation.x = -Math.PI / 2; road.position.y = 0.01; g.add(road);
      // (its own crosswalk across its mouth, along the main road's kerb)
      for (let k = 0; k < 9; k++) box(onRoad(mid, side * (ROAD_HALF + 1.6)), 2.6, 0.02, 0.5, 0, 0.02, -w / 2 + 0.9 + k * ((w - 1.8) / 8), toon({ color: '#9a94a0' }));
      // (the corners' kerbs, their returns and the sidewalks round them are the town's: drive/world.ts CORNER_WALK)
    }
    for (const s of [a - 1.4, b + 1.4]) for (let k = 0; k < 9; k++) box(onRoad(s, -ROAD_HALF + 0.5 + k * 0.9), 0.5, 0.02, 2.2, 0, 0.02, 0, toon({ color: '#9a94a0' }));
    // the signals: on the left's near corner an arm out over the oncoming lane; on the right's, a head on its post
    const green = lampMaterial('#5ca87a', 1.6, 0.5), off = toon({ color: '#2a2a2e' });
    const head = (g: THREE.Object3D, x: number, y: number, z: number, ry = 0) => {
      const h = new THREE.Group(); h.position.set(x, y, z); h.rotation.y = ry; g.add(h);
      box(h, 0.4, 1.15, 0.3, 0, 0, 0, toon({ color: '#5a4a2a' }));
      for (const [k, m] of [[0.35, off], [0, off], [-0.35, green]] as const) ball(h, 0.12, 0, k, 0.16, m);
    };
    const lp = onRoad(a - 1, -(ROAD_HALF + 0.6));
    box(lp, 0.22, 6.4, 0.22, 0, 3.2, 0, toon({ color: WORLD.post }));
    box(lp, 4.2, 0.16, 0.16, -2.0, 6.2, 0, toon({ color: WORLD.post })); // (the road's frame: +x is its left, so out over the lane is −x)
    head(lp, -3.0, 5.6, 0, Math.PI);
    // (the right's on the far corner: on the near one it stood by the lens of the take up the street)
    const rp = onRoad(b + 1, ROAD_HALF + 0.6);
    box(rp, 0.2, 3.6, 0.2, 0, 1.8, 0, toon({ color: WORLD.post }));
    head(rp, 0, 3.1, -0.2, Math.PI);
    // the cross street's name on a blade off the left pole, over the sidewalk, facing the coming traffic
    const blade_ = plane(lp, 2.2, 0.4, 1.2, 4.4, 0, litPic(signFace('LAS PALMAS AV', 512, 96, '#b8bcb0', '#1f4a36', F.sign(600), 0.6, 0.1), 0.7));
    blade_.rotation.y = Math.PI;
  }

  // ---- street lamps, both kerbs, staggered; none where they'd stand in a view of the words ----
  const lampAt: { s: number; side: number }[] = [];
  const lampHead = lampMaterial('#d8a060', LAMPS.glow, 0.4), lampPool = glowMaterial('#c08850', GLOW.pool * 0.6, true);
  for (const side of [-1, 1]) {
    for (let s = plan.span[0] + (side < 0 ? 15 : 28); s < plan.span[1] - 4; s += LAMPS.every) {
      if (s > plan.cross[0] - 3 && s < plan.cross[1] + 3) continue;
      const lateral = side * (ROAD_HALF + LAMPS.kerb);
      // (nor by any take's lens: its pole a dark bar down the frame's edge, its head's glare beside the words)
      const pole = atRoad(s, lateral, 0), head = atRoad(s, side * (ROAD_HALF + LAMPS.kerb - LAMPS.reach), LAMPS.h - 0.2);
      if (kerbClear.some((k) => k.side === side && Math.abs(k.s - s) < k.half + 1)) continue;
      if (inView(pole, 0.6, LAMPS.h + 0.4) || inView(head.clone().setY(head.y - 1), 1.6, 2) || lens.some((e) => Math.hypot(e.x - pole.x, e.z - pole.z) < 4.5 || e.distanceTo(head) < 6)) continue;
      const g = onRoad(s, lateral);
      lampAt.push({ s, side });
      // a tapered pole on its base, the arm out over the road, the cobra head's housing, its lamp's face under it
      part(g, new THREE.CylinderGeometry(0.075, 0.12, LAMPS.h, 10), WORLD.post, 0, LAMPS.h / 2, 0);
      tcyl(g, 0.17, 0.4, 0, 0.35, 0, WORLD.post, 10);
      tcyl(g, 0.05, LAMPS.reach, side * LAMPS.reach / 2, LAMPS.h - 0.12, 0, WORLD.post, 8).rotation.z = Math.PI / 2;
      part(g, new THREE.SphereGeometry(0.4, 12, 8).scale(1.3, 0.38, 0.62), WORLD.post, side * LAMPS.reach, LAMPS.h - 0.12, 0);
      fuse(g);
      const face = new THREE.Mesh(new THREE.CircleGeometry(0.34, 16), lampHead); face.rotation.x = Math.PI / 2; face.scale.set(1.2, 0.6, 1); face.position.set(side * LAMPS.reach, LAMPS.h - 0.25, 0); g.add(face);
      const pool = new THREE.Mesh(new THREE.CircleGeometry(5.5, 24), lampPool); pool.rotation.x = -Math.PI / 2; pool.position.set(side * LAMPS.reach, 0.04, 0); g.add(pool);
    }
  }

  // ---- the kerbs' furniture: hydrants, parking meters, bins (bags beside some), newspaper boxes in twos and threes, a
  // mailbox; low (nothing reaches 1.5 m), out of the views and away from the lenses and the lamps' feet. (The town's
  // own were a few coloured boxes each: world.ts leaves this stretch to these.) In 24 m pieces, each one mesh. ----
  {
    const pieces = new Map<string, { g: THREE.Group; inv: THREE.Matrix4 }>();
    /** A group at (s, lateral) in the road's frame (x to the road's left, z along it), in its piece of kerb. */
    const spot = (s: number, lateral: number, side: number) => {
      const key = `${side}:${Math.floor(s / 24)}`;
      let pc = pieces.get(key);
      if (!pc) { const g = onRoad(Math.floor(s / 24) * 24 + 12, lateral); pc = { g, inv: g.matrix.clone().invert() }; pieces.set(key, pc); }
      const t = onRoad(s, lateral); root.remove(t);
      const item = new THREE.Group(); item.matrixAutoUpdate = false; item.matrix.copy(pc.inv).multiply(t.matrix); pc.g.add(item);
      return item;
    };
    const half = (r: number) => new THREE.SphereGeometry(r, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    const hydrant = (g: THREE.Object3D, out: number) => {
      const red = '#8a3430';
      tcyl(g, 0.16, 0.05, 0, 0.175, 0, red); tcyl(g, 0.1, 0.48, 0, 0.42, 0, red); tcyl(g, 0.125, 0.06, 0, 0.66, 0, red);
      part(g, half(0.1), red, 0, 0.69, 0); tcyl(g, 0.025, 0.06, 0, 0.81, 0, '#6a2a26', 6);
      for (const dz of [-1, 1]) { const n = tcyl(g, 0.045, 0.1, 0, 0.52, dz * 0.13, red, 8); n.rotation.x = Math.PI / 2; }
      const p = tcyl(g, 0.065, 0.12, out * 0.14, 0.5, 0, '#a8a090', 10); p.rotation.z = Math.PI / 2; // (its pumper nozzle, to the street)
    };
    const meter = (g: THREE.Object3D, double: boolean) => {
      tcyl(g, 0.035, 1.0, 0, 0.65, 0, '#4a4e4a', 8);
      for (const dz of double ? [-0.12, 0.12] : [0]) {
        tbox(g, 0.16, 0.24, 0.12, 0, 1.26, dz, '#56665a'); part(g, half(0.08).scale(1, 1.1, 0.8), '#56665a', 0, 1.38, dz);
        for (const sx of [-1, 1]) tbox(g, 0.012, 0.08, 0.09, sx * 0.082, 1.31, dz, '#b8b4a0');
      }
      if (double) tbox(g, 0.06, 0.04, 0.3, 0, 1.13, 0, '#4a4e4a');
    };
    const bin = (g: THREE.Object3D, out: number, junk: number) => {
      tcyl(g, 0.27, 0.82, 0, 0.56, 0, '#2c4434', 14); tcyl(g, 0.29, 0.05, 0, 0.98, 0, '#22382a', 14); part(g, half(0.27).scale(1, 0.38, 1), '#22382a', 0, 1.0, 0);
      for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; tbox(g, 0.03, 0.78, 0.03, Math.cos(a) * 0.275, 0.56, Math.sin(a) * 0.275, '#3a5442'); }
      if (junk > 0.5) part(g, new THREE.SphereGeometry(0.24, 10, 8).scale(1, 0.75, 1.1), '#18181c', -out * 0.1, 0.33, 0.62);
      if (junk > 0.75) tbox(g, 0.42, 0.3, 0.36, -out * 0.25, 0.3, -0.62, '#6e5a3e');
    };
    const news = (g: THREE.Object3D, out: number, n: number, seed: number) => {
      for (let k = 0; k < n; k++) {
        const z = (k - (n - 1) / 2) * 0.5, col = ['#2a5a7a', '#8a2e2a', '#c4a648', '#cfcabe', '#3a6a4a'][Math.floor(hash(seed, k, 911) * 5)]!;
        tbox(g, 0.08, 0.34, 0.3, 0, 0.32, z, '#3a3a40'); tbox(g, 0.34, 0.04, 0.36, 0, 0.17, z, '#3a3a40');
        tbox(g, 0.4, 0.52, 0.42, 0, 0.75, z, col); tbox(g, 0.42, 0.05, 0.44, 0, 1.03, z, col);
        tbox(g, 0.012, 0.2, 0.3, -out * 0.205, 0.8, z, '#2e343c'); tbox(g, 0.014, 0.13, 0.24, -out * 0.21, 0.78, z, '#a8a49a'); // (its window, today's paper)
        tbox(g, 0.02, 0.1, 0.07, -out * 0.21, 0.94, z + 0.12, '#8a8a90');
      }
    };
    const mailbox = (g: THREE.Object3D) => {
      for (const dz of [-0.18, 0.18]) for (const dx of [-0.18, 0.18]) tbox(g, 0.05, 0.3, 0.05, dx, 0.3, dz, '#22385e');
      tbox(g, 0.48, 0.6, 0.5, 0, 0.75, 0, '#2a4a7a'); const top = tcyl(g, 0.24, 0.5, 0, 1.05, 0, '#2a4a7a', 14); top.rotation.x = Math.PI / 2; top.scale.set(1, 1, 0.5);
    };
    for (const side of [-1, 1]) {
      const out = side; // (in the road's frame +x is its left: toward the road from this kerb is +x on the right, −x on the left)
      for (let s = plan.span[0] + 5, k = 0; s < plan.span[1] - 3; s += KERB.every, k++) {
        const r = (j: number) => hash(k, side, 900 + j);
        if (r(0) > 0.8) continue;
        const sp = s + (r(2) - 0.5) * 2, lateral = side * (ROAD_HALF + KERB.in), p = atRoad(sp, lateral, 0.15);
        if (sp > plan.cross[0] - 3 && sp < plan.cross[1] + 3) continue;
        if (lampAt.some((l) => l.side === side && Math.abs(l.s - sp) < 1.6)) continue;
        if (kerbClear.some((k) => k.side === side && Math.abs(k.s - sp) < k.half + 0.6)) continue;
        if (lens.some((e) => Math.hypot(e.x - p.x, e.z - p.z) < 1.8) || inView(p, 0.4, 1.4)) continue;
        const g = spot(sp, lateral, side), u = r(1);
        if (u < 0.2) hydrant(g, out); else if (u < 0.48) meter(g, r(3) < 0.4); else if (u < 0.7) bin(g, out, r(4)); else if (u < 0.93) news(g, out, 2 + Math.floor(r(5) * 2), k * 3 + side); else mailbox(g);
        fuse(g);
      }
    }
  }

  // ---- people on the sidewalks: walking both ways, a few standing at the doors; none through a view ----
  const people: { g: THREE.Group; s0: number; v: number; lateral: number; side: number; stand: boolean }[] = [];
  const chapel = plan.signs.find((g) => g.theme === 'chapel')!, chapelLot = plan.lots[chapel.lot]!;
  for (const side of [-1, 1]) for (let k = 0; k < PEOPLE.perSide; k++) {
    const r = (j: number) => hash(k, side, 800 + j), stand = r(1) < 0.3;
    const s0 = plan.span[0] + (plan.span[1] - plan.span[0]) * r(2), dir = r(3) < 0.5 ? -1 : 1, v = stand ? 0 : dir * (PEOPLE.v[0] + (PEOPLE.v[1] - PEOPLE.v[0]) * r(4));
    // (on the left, the walkers keep to the kerb's side: the chapel's lawn and portico take the sidewalk's back half)
    const from = side < 0 ? Math.min(PEOPLE.from[0] + (PEOPLE.from[1] - PEOPLE.from[0]) * r(5), 1.15) : PEOPLE.from[0] + (PEOPLE.from[1] - PEOPLE.from[0]) * r(5);
    const lateral = side * (ROAD_HALF + (stand ? 2.6 : from));
    // (never through the cross street's mouth, never in a view of the words, never by the lens, never on the lawn)
    let ok = true;
    for (let t = plan.t[0]; t < plan.t[1] && ok; t += 0.1) {
      const s = s0 + v * (t - plan.t[0]);
      if (s > plan.cross[0] - 0.5 && s < plan.cross[1] + 0.5) ok = false;
      else if (stand && side === chapelLot.side && Math.abs(s - chapelLot.s) < chapelLot.w / 2 + 1) ok = false;
      else if (inView(atRoad(s, lateral, 0.15), 0.45, 1.85, t)) ok = false;
    }
    if (!ok) continue;
    const g = new THREE.Group(); g.matrixAutoUpdate = false; root.add(g);
    const p = walker(); p.rotation.y = v >= 0 ? 0 : Math.PI; if (stand) p.rotation.y = side < 0 ? -Math.PI / 2 : Math.PI / 2; g.add(p);
    people.push({ g, s0, v, lateral, side, stand });
  }

  // ---- the traffic: cars ahead in their lane, tail lights lit; cars coming the other way, headlights on (dipped:
  // white at full, they were the brightest things on the street) ----
  const traffic: { g: THREE.Group; s0: number; v: number; lateral: number }[] = [];
  const tail = lampMaterial('#c8302a', GLOW.tail * 0.6, 1.1), headL = lampMaterial('#e8d8b8', GLOW.head * 0.22, 1.1);
  const s0car = drive.motion.distanceAt(plan.t[0]);
  for (const [ahead, v] of TRAFFIC.ahead) traffic.push({ g: new THREE.Group(), s0: s0car + ahead, v, lateral: LANE });
  for (const [ahead, v] of TRAFFIC.oncoming) traffic.push({ g: new THREE.Group(), s0: s0car + ahead, v, lateral: TRAFFIC.oncomingLane });
  traffic.forEach((c, i) => {
    const car = sedan({ color: ['#2b2f3a', '#5a2a32', '#7a7686', '#2b4a66', '#3a3444'][i % 5]! }); c.g.add(car);
    c.g.matrixAutoUpdate = false; root.add(c.g);
    if (c.v < 0) car.rotation.y = Math.PI;
    for (const x of [0.62, -0.62]) { box(car, 0.26, 0.12, 0.04, x, 0.62, -2.33, tail); box(car, 0.24, 0.14, 0.04, x, 0.62, 2.33, headL); }
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1), glowMaterial('#c8302a', 0.35, true)); glow.rotation.x = -Math.PI / 2; glow.position.set(0, 0.03, -3); car.add(glow);
    const beam = new THREE.Mesh(new THREE.PlaneGeometry(3, 7), glowMaterial('#d8c8a8', 0.16, true)); beam.rotation.x = -Math.PI / 2; beam.position.set(0, 0.03, 5.6); car.add(beam);
  });

  // ---- steam off a manhole in the far lane, by the theatre ----
  const steam: THREE.Sprite[] = [];
  {
    const puff = canvasTex(128, 128, (c) => { const gr = c.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(200,190,210,0.5)'); gr.addColorStop(1, 'rgba(200,190,210,0)'); c.fillStyle = gr; c.fillRect(0, 0, 128, 128); });
    const s = plan.cross[0] - 4, at = atRoad(s, -LANE + 0.4, 0.05); // (in the far lane short of the crossing: the take up the street passes it)
    const lid = new THREE.Mesh(new THREE.CircleGeometry(0.4, 16), toon({ color: '#2a2630' })); lid.rotation.x = -Math.PI / 2; lid.position.copy(at).add(new THREE.Vector3(0, 0.02, 0)); root.add(lid);
    for (let k = 0; k < 7; k++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puff, transparent: true, depthWrite: false, opacity: 0.4, color: new THREE.Color(0.8, 0.74, 0.86) }));
      sp.position.copy(at); sp.userData.k = k; root.add(sp); steam.push(sp);
    }
    steam.forEach((sp) => (sp.userData.at = at.clone()));
  }

  return {
    group: root,
    update(t) {
      for (const f of flicker) {
        const lit = f.dance ? 0.75 + 0.25 * Math.sin(t * 11 + f.seed * 7) * Math.sin(t * 17 + f.seed) : f.start !== undefined ? flickAt(t, f.start) : 0.94 + 0.06 * Math.sin(t * 60 + f.seed * 3.1);
        f.m.color.setScalar(0.12 + (f.peak - 0.12) * Math.max(0.04, lit));
      }
      // the marquee's and the pawn shop's bulbs chase
      const ph = Math.floor(t * 6) % 2;
      for (const b of marqueeBulbs) b.m.uniforms.strength!.value = (b.phase + ph) % 2 === 0 ? b.k : b.k * 0.3;
      for (const w of wordLit) w.m.color.setScalar(0.12 + (w.peak - 0.12) * Math.min(1, Math.max(0, (t - w.at) / WORD_ON)));
      if (coin) (coin.material as THREE.MeshBasicMaterial).color.setRGB(...((t >= coinStart && (t * 2.2) % 1 < 0.5 ? [1.6, 0.4, 0.3] : [0.3, 0.08, 0.06]) as [number, number, number]));
      // people walking, legs scissoring
      for (const p of people) {
        const s = p.s0 + p.v * (t - plan.t[0]), f = route.frameAt(s), fwd = new THREE.Vector3(f.fwd.x, 0, f.fwd.z).normalize(), right = new THREE.Vector3(f.right.x, 0, f.right.z).normalize();
        p.g.matrix.makeBasis(right.clone().negate(), UP, fwd).setPosition(f.pos.clone().addScaledVector(f.right, p.lateral).add(new THREE.Vector3(0, 0.15, 0)));
        if (!p.stand) {
          const sw = 0.5 * Math.sin((s - p.s0) * 4.8);
          const w = p.g.children[0]!;
          stride(w, sw);
        }
      }
      for (const c of traffic) {
        const s = c.s0 + c.v * (t - plan.t[0]), f = route.frameAt(Math.max(0, s));
        c.g.matrix.makeBasis(f.right.clone().negate(), f.up, f.fwd).setPosition(f.pos.clone().addScaledVector(f.right, c.lateral));
        c.g.visible = t > plan.t[0] - 3 && t < plan.t[1] + 3;
      }
      for (const sp of steam) {
        const k = sp.userData.k as number, u = ((t * 0.45 + k / steam.length) % 1), at = sp.userData.at as THREE.Vector3;
        sp.position.set(at.x + Math.sin(k * 2.1 + t) * 0.3 + u * 0.8, at.y + 0.2 + u * 3.6, at.z + Math.cos(k * 1.3) * 0.3);
        sp.scale.setScalar(0.8 + u * 2.6);
        (sp.material as THREE.SpriteMaterial).opacity = 0.34 * Math.sin(Math.PI * u);
      }
    },
  };
}
