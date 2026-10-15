// Verse 3's props (drive/sets/verse3.ts): the Strip as a street at night. The buildings are the set's own lots (the
// drive's blocks, built here from the town's front geometry, look/facades.ts, in the strip's own night colours); on
// them, each business's own signs, mounted as it would mount them — the drugstore's neon on standoffs off its upper
// wall, DRUGS down a blade at its corner, the green cross; the liquor store's sign on a steel frame on its roof, the
// champagne glass beside it; the theatre's marquee out over the sidewalk on tie rods, its bulbs chasing, NITE OWL down
// a blade over it; the tiki bar's big roof sign on its lattice at the corner, bamboo round it, torches at the kerb; the
// hotel's neon between its floors, HOTEL down its blade, its canopy over the door, the payphones on its wall; the pawn
// shop's board under its big PAWN sign (LOANS, WE BUY GOLD), the three gold balls, barred windows full of guitars
// and watches; the wedding chapel's clapboard front, gable, steeple and bell, its portico, stained glass, lawn and
// picket fence, the limo at the kerb. Round them the strip's own neon (blades, a word over each shop, signs in the
// windows), the cross street and its signals, street lamps, people on the sidewalks, the traffic's lights, the wet
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
import { type Lot, MOUNT, SHOPS, STREET, type Theme, type Verse3Plan, lotBlock } from '../../drive/sets/verse3';
import { ROAD_HALF } from '../../drive/route';
import { LANE } from '../../drive/drive';
import { WORLD, toon } from '../../look/toon';
import { GLOW, glowMaterial, lampMaterial } from '../../look/night';
import { facadeOf } from '../../look/facades';
import { F, font } from '../../engine/type';
import { hash } from '../../engine/util';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ball, box, canvasTex, cyl, leftFront, onPanel, pic, plane, rightFront, roadFrame, sedan, signFace, stride, walker } from './kit';

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

/** The flicker on: dark before, stuttering on over the last 1.1 s before `start`, lit from it. */
const flickAt = (t: number, start: number) => {
  if (t >= start) return 1;
  const u = 1 - (start - t) / 1.1;
  if (u < 0) return 0.04;
  return (t * 13) % 1 < 0.25 + 0.55 * u ? 1 : 0.05;
};

/** The lines' pink (carrierart.ts's neon), for what belongs to them: their frames, their light on the wet road. */
const PINK = '#ff4fa3';
/** Everything else's neon: greyed, so no other colour stands up to the pink — dusty teal, amber, slate blue, brick,
 *  sage, lavender. */
const C = { teal: '#5d9a92', amber: '#c29a5c', blue: '#6c84b0', red: '#b25454', green: '#6aa884', violet: '#8f7db4', orange: '#bf7f4c', rose: '#b07a92' };
/** How bright the strip's own neon shines (x its colour), against the lines' GLOW.neon (2.6): under half, so it reads
 *  as lit without blooming over them. */
const SECONDARY = 1.05;
/** The strip's own neon, on the lots between the businesses: blades down a corner, a word over a shop, signs in its
 *  window (seeded). (No HOTEL or PAWN among them: the strip's hotel and pawn shop are the lines' own.) */
const BLADES = [['BAR', C.red], ['TATTOO', C.green], ['CLUB', C.violet], ['XXX', C.red], ['MOTEL', C.rose], ['BOOKS', C.amber], ['LOUNGE', C.teal], ['ROOMS', C.orange], ['GIRLS', C.rose]] as const;
const WORDS = [['COCKTAILS', C.rose], ['LIVE NUDES', C.red], ['PSYCHIC', C.violet], ['ADULT BOOKS', C.amber], ['CHECKS CASHED', C.green], ['BAIL BONDS', C.blue], ['PEEP SHOW', C.red], ['DANCERS', C.rose], ['TATTOOS', C.teal], ['DISCOUNT', C.amber]] as const;
const WINDOWS = [['OPEN', C.red], ['BEER', C.amber], ['ATM', C.green], ['XXX', C.rose], ['24 HRS', C.blue], ['COLD BEER', C.teal]] as const;
/** The shops' names on the fillers' sign bands (the town's atlas layout, look/facades.ts: 4 x 4 cells), painted dim. */
const FILL_NAMES = ['DONUTS', 'TACOS', 'BEAUTY SUPPLY', 'CHECKS CASHED', 'LAUNDROMAT', 'WIGS', 'BAIL BONDS', 'MARKET', 'NAILS', 'RECORDS', 'SHOES', 'CAMERAS', 'DISCOUNT', 'BURGERS', 'LUGGAGE', 'SMOKE SHOP'];

/** People on the sidewalks: how many a side, their pace (m/s), and how far from the kerb's edge they walk (m). */
const PEOPLE = { perSide: 16, v: [0.9, 1.5] as [number, number], from: [0.6, 2.4] as [number, number] };
/** The traffic: cars ahead in their lane (m ahead of the car at the verse's start, m/s), oncoming in the other. */
const TRAFFIC = { ahead: [[26, 8.6], [52, 9]] as [number, number][], oncoming: [[60, -10], [110, -9], [150, -11]] as [number, number][] };
/** Street lamps on both kerbs: every `every` m (staggered), their height and reach over the road, their glow (a dim
 *  sodium amber: at the town's full strength their heads were the frame's brightest white). */
const LAMPS = { every: 26, h: 7.4, reach: 2.4, kerb: 0.5, glow: 1.4 };
/** How bright the windows' rooms are lit (x their drawn colours): low, so the glass reads as rooms, not lightboxes. */
const ROOMS = { fill: 0.72, shop: 0.7 };
/** The chapel (m, in its front's frame): its gable's rise over the wall, the portico (width, depth, height to its
 *  roof), the steeple (its tower's side, how far back on the roof, the belfry's height, the spire's), the lawn's
 *  depth to its picket fence; the limo at the kerb (its length, how far up the street of the chapel's middle). */
const CHAPEL = { gable: 3.2, portico: { w: 4.6, d: 1.6, h: 2.95 }, steeple: { side: 2.3, back: 2.2, tower: 3.6, belfry: 2.2, spire: 3.6 }, lawn: 1.3, limo: { len: 7.4, at: -5.0 } };

/** The rooms seen through the fillers' windows: an atlas of 8 x 3 cells, each a room of its own. Shops' ground-floor
 *  rooms, the floors' rooms above, and dark ones (the user, 2026-10-15: "it's kind of just like a repeating texture.
 *  all of the windows"). */
const ATLAS = { cols: 8, rows: 3, cell: 256 };
const CELLS = {
  shopLit: [0, 1, 2, 3, 4, 7, 8, 9], shopDark: [5, 6],
  roomLit: [10, 11, 12, 13, 14, 15, 16, 20, 21, 22], roomDark: [17, 18, 19, 23],
};
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

  // ---- the fronts: the town's geometry (look/facades.ts) for every lot but the chapel's (its own, below), in the
  // strip's colours: the stucco greyed and dimmed, the trim off white, each window a room of its own (the atlas), a
  // word in neon or a dim painted name over each filler's shop ----
  const bandWord = new Set<number>(); // (the fillers whose sign band carries a neon word instead of a painted name)
  plan.lots.forEach((lot, i) => {
    const B = lotBlock(route, lot, i), apartments = lot.h <= 9 && hash(B.s, B.lateral, 2) > 0.72; // (as look/facades.ts decides: no shop, no band)
    if (lot.shop === undefined && !apartments && hash(i, 3, 701) < 0.55) bandWord.add(i);
  });
  /** Each filler's lit ground-floor panes (world centre, for the neon hung in them). */
  const shopPanes = new Map<number, THREE.Vector3[]>();
  {
    const walls: THREE.BufferGeometry[] = [], trim: THREE.BufferGeometry[] = [], glass: THREE.BufferGeometry[] = [], signs: THREE.BufferGeometry[] = [];
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
      if (!shop && !bandWord.has(i)) signs.push(f.signs);
      // its panes: each a room from the atlas (some dark), mirrored back on the left (the front's own mirror)
      const pos = f.glass.getAttribute('position'), uv = f.glass.getAttribute('uv'), lit = f.glass.getAttribute('lit');
      const keep: number[] = [], panes: THREE.Vector3[] = [];
      for (let p = 0; p * 4 < pos.count; p++) {
        const c = new THREE.Vector3();
        for (let j = 0; j < 4; j++) c.add(new THREE.Vector3().fromBufferAttribute(pos, p * 4 + j));
        c.multiplyScalar(0.25);
        const low = c.y - ground < 3.2;
        if (shop && low) continue; // (a business's ground floor is its own, below)
        keep.push(p);
        const r = (k: number) => hash(i, p, k);
        const on = lit.getX(p * 4) > 0.5 && (low || r(1) < 0.72);
        const set = low ? (on ? CELLS.shopLit : CELLS.shopDark) : on ? CELLS.roomLit : CELLS.roomDark;
        const k = set[Math.floor(r(2) * set.length)]!, cx = k % ATLAS.cols, cy = Math.floor(k / ATLAS.cols);
        if (low && on) panes.push(c);
        for (let j = 0; j < 4; j++) {
          const v = p * 4 + j, u0 = uv.getX(v), v0 = uv.getY(v);
          uv.setXY(v, (cx + (lot.side < 0 ? 1 - u0 : u0)) / ATLAS.cols, 1 - (cy + 1 - v0) / ATLAS.rows);
        }
      }
      shopPanes.set(i, panes);
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
    if (signs.length) {
      const atlas = canvasTex(512 * 4, 112 * 4, (c) => FILL_NAMES.forEach((name, k) => {
        const x = (k % 4) * 512, y = Math.floor(k / 4) * 112, [bg, ink] = [['#2a2430', '#b8a888'], ['#30282a', '#a89070'], ['#262c34', '#98a4b0'], ['#2c2a26', '#b0a080']][k % 4]!;
        c.fillStyle = bg; c.fillRect(x, y, 512, 112); c.strokeStyle = ink; c.lineWidth = 3; c.strokeRect(x + 8, y + 8, 496, 96);
        c.fillStyle = ink; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = font(F.sign(700), 52); c.fillText(name, x + 256, y + 60, 450);
      }));
      fronts.add(new THREE.Mesh(m(signs), pic(atlas, { color: new THREE.Color().setScalar(0.62) })));
    }
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
    pawn: { fascia: '#4a1a1a', ink: '#c8a050', sign: 'WE BUY GOLD · LOANS · GUNS · TOOLS' },
  };
  /** A business's glass front (in its lot's frame), `solid` the stretches of its front (x from, to) kept wall instead
   *  of glass (the hotel's payphones'), `fascia` false for a front whose board covers its fascia's place. */
  const storefront = (g: THREE.Object3D, w: number, theme: Exclude<Theme, 'chapel'>, glassTop = 2.9, opts: { solid?: [number, number][]; fascia?: boolean; wall?: string } = {}) => {
    const T = TRADES[theme], frame = toon({ color: '#1d1a22' });
    const W = w - 0.6, panes = Math.max(2, Math.round(W / 2.4)), pw = W / panes, glassH = glassTop - 0.35;
    const solidAt = (x: number) => (opts.solid ?? []).some(([a, b]) => x > a && x < b);
    for (let i = 0; i < panes; i++) {
      const x = -W / 2 + pw * (i + 0.5);
      if (solidAt(x)) { box(g, pw, glassTop, 0.1, x, glassTop / 2, 0.04, toon({ color: opts.wall ?? '#4a4258' })); continue; }
      if (i === Math.floor(panes / 2)) { // the door
        box(g, pw - 0.2, glassTop - 0.05, 0.08, x, (glassTop - 0.05) / 2, 0.06, frame);
        plane(g, pw - 0.5, glassH - 0.25, x, 0.3 + (glassH - 0.25) / 2, 0.11, pic(roomOf(theme, i), { color: new THREE.Color().setScalar(ROOMS.shop * 0.85) }));
        box(g, 0.05, 0.6, 0.05, x + pw / 2 - 0.45, 1.1, 0.13, chrome);
        continue;
      }
      plane(g, pw - 0.1, glassH, x, 0.35 + glassH / 2, 0.06, pic(roomOf(theme, i), { color: new THREE.Color().setScalar(ROOMS.shop) }));
      box(g, pw, 0.35, 0.2, x, 0.175, 0.08, toon({ color: '#3a3540' })); // the base course
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
  const boxSignTex = (text: string, ink: string, bg: string, w: number, h: number, balls = false, sub = '') => canvasTex(w, h, (c) => {
    c.fillStyle = bg; c.fillRect(0, 0, w, h);
    c.strokeStyle = ink; c.lineWidth = h * 0.04; c.strokeRect(h * 0.06, h * 0.06, w - h * 0.12, h * 0.88);
    const x0 = balls ? h * 0.95 : 0;
    if (balls) for (const [bx, by] of [[0.32, 0.36], [0.68, 0.36], [0.5, 0.68]] as const) { c.fillStyle = ink; c.beginPath(); c.arc(h * 0.14 + bx * h * 0.75, by * h, h * 0.13, 0, Math.PI * 2); c.fill(); }
    const big = sub ? 0.5 : 0.66;
    c.fillStyle = ink; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = font(F.sign(700), h * big);
    (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${h * 0.08}px`;
    c.fillText(text, x0 + (w - x0) / 2, sub ? h * 0.38 : h * 0.55, (w - x0) * 0.86);
    if (sub) { c.font = font(F.sign(600), h * 0.2); (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${h * 0.03}px`; c.fillText(sub, x0 + (w - x0) / 2, h * 0.76, (w - x0) * 0.86); }
  });

  /** Where a limo parks (m off the road's centre: the kerb's parked cars' line). */
  const PARKED_LIMO = ROAD_HALF - 1.05;
  // ---- the businesses ----
  for (const sign of plan.signs) {
    const lot = plan.lots[sign.lot]!, g = lotFrame(lot), { face, theme } = sign, W = face.w, H = face.h, start = sign.starts[0]!;
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
        // its ends, the house's name on each (seen coming up the street)
        for (const sd of [-1, 1]) {
          const p = plane(fg, out - 0.3, mh - 0.4, sd * (mw / 2 + 0.01), 0, -out / 2, litPic(signFace('NITE OWL', 512, 256, '#c8a060', '#5a1e26', F.sign(700), 0.4, 0.1), 0.75));
          p.rotation.y = sd * Math.PI / 2;
        }
        // the soffit's lights under it, pooling on the sidewalk
        plane(fg, mw - 0.4, out - 0.3, 0, -mh / 2 - 0.21, -out / 2, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.72, 0.5) })).rotation.x = Math.PI / 2;
        wash(g, mw + 2, out + 2.5, 0, 0.18, out / 2 + 0.6, '#c8a078', 0.35, true);
        for (const x of [-mw / 2 + 0.5, mw / 2 - 0.5]) { const rod = box(fg, 0.05, Math.hypot(2.6, out), 0.05, x, mh / 2 + 1.3, -out / 2, steel); rod.rotation.x = -Math.atan2(out, 2.6); }
        // NITE OWL down a blade over it
        const top = face.center.y - route.frameAt(sign.s).pos.y + mh / 2 + 0.6;
        blade(g, 0, top, Math.min(6.4, lot.h + 1.5 - top), 'NITEOWL', C.amber, 1.6);
        // the ticket booth and the poster cases either side of it
        box(g, 2.0, 2.5, 0.8, 0, 1.25, 0.45, toon({ color: '#6a2a32' }));
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
        // a thatched hat over its name, and a carved tiki standing up its left side from the roof, its eyes lit
        const hat = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, W + 2.4, 3), thatch);
        hat.rotation.z = Math.PI / 2; hat.scale.set(1, 1, 0.6); hat.position.set(0, H / 2 + 2.75, -0.2); fg.add(hat);
        for (let k = 0; k < 9; k++) { const f = box(fg, 0.12, 0.9, 0.05, -W / 2 - 0.9 + (k * (W + 1.8)) / 8, H / 2 + 2.2, 0.55, thatch); f.rotation.z = (k % 2 ? 0.15 : -0.15); } // its fringe
        const tx = -W / 2 - 1.15, ty0 = groundY + lot.h, th = H / 2 + 0.6 - ty0;
        box(fg, 0.9, th, 0.8, tx, ty0 + th / 2, -0.3, toon({ color: '#5a3e24' }));
        for (let k = 0; k < 3; k++) {
          const y = H / 2 - 0.6 - k * 2.6;
          box(fg, 1.05, 0.25, 0.9, tx, y + 0.55, -0.25, toon({ color: '#4a2e18' })); // its brow
          for (const ex of [-0.22, 0.22]) neon(fg, 0.22, 0.22, tx + ex, y + 0.2, 0.15, canvasTex(64, 64, (c) => { c.fillStyle = C.orange; c.beginPath(); c.arc(32, 32, 26, 0, Math.PI * 2); c.fill(); }), { peak: 1.1 });
          box(fg, 0.6, 0.18, 0.1, tx, y - 0.45, 0.16, toon({ color: '#a89c88' })); // its teeth
        }
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
        // windows". Its words now on its fascia and its canopy, its payphones on a stretch of its own wall.)
        const phoneX = -lot.w / 2 + 1.5; // (the payphones' wall: the front's up-street end)
        storefront(g, lot.w, 'phone', 2.9, { solid: [[-lot.w / 2, -lot.w / 2 + 3.0]], wall: '#3e3a52' });
        wallMount(fg, W, H, start);
        blade(g, lot.w / 2 - 0.6, 3.9, 7.2, 'HOTEL', C.red, 1.5);
        wash(fg, W + 6, H + 4, 0, 0, -MOUNT.wall + 0.02, PINK, 0.18);
        // the canopy out over its door, HOTEL along its front edge, its tie rods to the wall, its soffit's light
        const door = (() => { const Wd = lot.w - 0.6, n = Math.max(2, Math.round(Wd / 2.4)), pw = Wd / n; return -Wd / 2 + pw * (Math.floor(n / 2) + 0.5); })();
        // (cantilevered: tie rods up to the wall crossed the words over it)
        const cw = 3.4, cd = 1.4, cy = 3.05;
        box(g, cw, 0.32, cd, door, cy, cd / 2, toon({ color: '#1f3450' }));
        plane(g, cw - 0.2, 0.26, door, cy, cd + 0.005, litPic(signFace('HOTEL · LOBBY', 1024, 80, '#b8b0a0', '#1f3450', F.sign(700), 0.7, 0.2), 0.8));
        plane(g, cw - 0.4, cd - 0.3, door, cy - 0.17, cd / 2, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 0.5, 0.36) })).rotation.x = Math.PI / 2;
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
        break;
      }
      case 'pawn': {
        // (the user, 2026-10-15, at 148 s: "I have no idea what the word on the sign is ... it looks like P-A-M-E ... oh,
        // it's a pawn shop. I see. Okay, yeah, that was not clear to me at all." Now its name is a big lit box sign over
        // the board, the balls in it and hung off its corner, LOANS and WE BUY GOLD under it, its windows barred and full of
        // what it's lent on, WE BUY GOLD on its glass; the board, the lines', framed as its front's own.)
        storefront(g, lot.w, 'pawn', 2.2, { fascia: false });
        for (let x = -lot.w / 2 + 0.6; x < lot.w / 2 - 0.4; x += 0.34) box(g, 0.045, 2.0, 0.045, x, 1.2, 0.2, toon({ color: '#2a2630' })); // the bars
        for (const y of [0.35, 2.15]) box(g, lot.w - 0.8, 0.06, 0.06, 0, y, 0.2, toon({ color: '#2a2630' }));
        // WE BUY GOLD lettered on the glass, gold leaf
        for (const [x, text] of [[-lot.w / 2 + 2.6, 'WE BUY GOLD'], [lot.w / 2 - 2.6, 'LOANS · GUNS · TV']] as const) plane(g, 3.4, 0.5, x, 1.75, 0.1, pic(signFace(text, 1024, 150, '#c8a050', null, F.sign(700), 0.62, 0.1), { transparent: true, color: new THREE.Color(0.9, 0.9, 0.9) }));
        // the board's frame: an oxblood surround with a gold edge, its bulbs warm and low
        box(fg, W + 0.9, H + 0.5, 0.14, 0, 0, -0.12, toon({ color: '#4a1a1e' }));
        box(fg, W + 0.5, H + 0.3, 0.15, 0, 0, -0.1, toon({ color: '#8a6a2e' }));
        const bulb = [lampMaterial('#e8b878', 1.3, 0.6), lampMaterial('#e8b878', 0.4, 0.3)];
        marqueeBulbs.push(...bulb.map((m, i) => ({ m, phase: i, k: 1.3 })));
        { const e = W / 2 + 0.33, f = H / 2 + 0.2, n = 22, m = 9;
          for (let i = 0; i <= n; i++) for (const y of [f, -f]) ball(fg, 0.06, -e + (2 * e * i) / n, y, 0.0, bulb[i % 2]!);
          for (let i = 1; i < m; i++) for (const x of [-e, e]) ball(fg, 0.06, x, -f + (2 * f * i) / m, 0.0, bulb[i % 2]!); }
        // PAWN: a big lit box sign on its wall over the board, the three balls before the word, LOANS and WE BUY GOLD
        // under it (on it: a blade down its corner stood between the crane and the board's first letters)
        const bw = Math.min(lot.w - 1.2, 7.2), bh = 2.0, by = face.center.y - route.frameAt(sign.s).pos.y + H / 2 + 0.35 + bh / 2;
        box(g, bw + 0.3, bh + 0.3, 0.4, 0, by, 0.25, toon({ color: '#3a1416' }));
        plane(g, bw, bh, 0, by, 0.46, pic(boxSignTex('PAWN', '#d8ac58', '#5a1a1c', 1024, 284, true, 'LOANS · WE BUY GOLD'), { color: new THREE.Color().setScalar(0.92) }));
        for (const x of [-bw / 3, bw / 3]) box(g, 0.1, 0.1, 0.5, x, by - bh / 2 - 0.1, 0.2, steel);
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
    const rose = new THREE.Mesh(new THREE.CircleGeometry(0.85, 32), stained(false)); rose.position.set(0, Hl + K.gable * 0.42, 0.05); g.add(rose);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.1, 8, 32), trim); ring.position.copy(rose.position); g.add(ring);
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
    const ped = new THREE.Shape([new THREE.Vector2(-P.w / 2 - 0.2, 0), new THREE.Vector2(P.w / 2 + 0.2, 0), new THREE.Vector2(0, 0.3)]);
    const pm = new THREE.Mesh(new THREE.ExtrudeGeometry(ped, { depth: P.d + 0.2, bevelEnabled: false }), trim); pm.position.set(0, P.h + 0.36, -0.1); g.add(pm);
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
    // the lyric's mounting on the wall, its heart beside it (a smaller, dimmer pink: the line's own), wedding bells
    wallMount(fg, W, H, start);
    neon(fg, 1.6, 1.6, W / 2 + 1.6, -0.1, -0.1, neonTex(420, 420, PINK, (c) => {
      c.strokeStyle = PINK; c.lineWidth = 13; c.beginPath(); c.moveTo(210, 340);
      c.bezierCurveTo(60, 230, 60, 110, 160, 92); c.bezierCurveTo(196, 86, 210, 120, 210, 140);
      c.bezierCurveTo(210, 120, 224, 86, 260, 92); c.bezierCurveTo(360, 110, 360, 230, 210, 340); c.stroke();
      c.strokeStyle = C.amber; c.lineWidth = 9; c.beginPath(); c.moveTo(60, 300); c.lineTo(340, 140); c.stroke();
      c.beginPath(); c.moveTo(340, 140); c.lineTo(300, 142); c.moveTo(340, 140); c.lineTo(330, 176); c.stroke();
    }), { peak: 1.3, start });
    wash(fg, W + 5, H + 3, 0, 0, -MOUNT.wall + 0.02, PINK, 0.2);
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
    // the limo at the kerb in front (white, held to a lavender grey), up the street of its middle, its nose down it
    const limoS = sign.s + CHAPEL.limo.at * (lot.side < 0 ? 1 : -1);
    const lp = atRoad(limoS, lot.side * PARKED_LIMO, 0);
    if (!inView(lp, 1.2, 1.6)) {
      const lg = onRoad(limoS, lot.side * PARKED_LIMO);
      const limo = sedan({ color: '#9690a6', length: K.limo.len }); limo.rotation.y = Math.PI; lg.add(limo);
      for (const z of [-1.5, -0.2, 1.1]) box(limo, 1.48, 0.34, 1.1, 0, 1.0, z, toon({ color: '#1d2026' })); // (its long cabin's glass)
      box(limo, 1.44, 0.04, K.limo.len * 0.62, 0, 1.2, -0.1, toon({ color: '#9690a6' }));
      // a ribbon and cans off its back bumper: just married
      for (let k = 0; k < 3; k++) cyl(limo, 0.06, 0.12, (k - 1) * 0.3, 0.1, -K.limo.len / 2 - 0.5 - k * 0.12, toon({ color: '#8a8a90' }));
    }
  }

  // ---- the strip's own neon, on the lots between: a blade down a corner, a word over its shop (on its sign band, in
  // place of a painted name), a sign hung in a lit window ----
  plan.lots.forEach((lot, i) => {
    if (lot.shop !== undefined) return;
    const g = lotFrame(lot), r = (k: number) => hash(i, k, 701);
    const low = lot.h < 6;
    // (the lot's frame runs along the road on the left, against it on the right: its up-street end is −x on the left)
    const upEnd = lot.side < 0 ? -lot.w / 2 + 0.5 : lot.w / 2 - 0.5;
    if (!low && r(1) < 0.5 && lot.w > 4.5) {
      const [word, col] = BLADES[Math.floor(r(2) * BLADES.length)]!, h = Math.min(lot.h - 4.4, 1.2 + word.length * 0.95);
      const p = atRoad(lot.s - lot.w / 2 + 0.5, lot.side * (STREET.front - 0.7), 3.8);
      if (h > 2.2 && !inView(p, 0.9, h)) blade(g, upEnd, 4.2, h, word, col, 1.0);
    }
    // a word in neon on its sign band, over its shop's glass (the band of look/facades.ts: 3.15 to 3.95 m up, its
    // face 0.135 m behind the lot's front)
    if (bandWord.has(i)) {
      const [word, col] = WORDS[Math.floor(r(4) * WORDS.length)]!, w = Math.min(lot.w * 0.62, 9, 0.42 * word.length + 1);
      neon(g, w, 0.7, 0, 3.55, -0.1, tubeWord(word, col, 1024, Math.round(1024 * 0.7 / w)));
    }
    // a sign hung in one of its lit windows, just inside the glass
    const panes = shopPanes.get(i) ?? [];
    if (panes.length && r(6) < 0.6) {
      const [word, col] = WINDOWS[Math.floor(r(7) * WINDOWS.length)]!, at = panes[Math.floor(r(8) * panes.length)]!;
      const local = at.clone().applyMatrix4(g.matrix.clone().invert());
      neon(g, 1.2, 0.5, local.x, 1.9, local.z + 0.06, tubeWord(word, col, 512, 216), { peak: 0.9 });
    }
    // an awning over its glass, a dull canvas, on most
    if (!low && r(13) < 0.55) { const a = box(g, lot.w * 0.7, 0.08, 1.5, 0, 2.95, 0.6, toon({ color: ['#5a2a30', '#2a4448', '#5e4a2a', '#2a3048', '#3e3a30'][Math.floor(r(14) * 5)]! })); a.rotation.x = 0.22; }
    // the roof's clutter: an air conditioner or two, a vent
    for (let k = 0; k < 1 + Math.floor(r(15) * 2); k++) box(g, 1.5, 1.0, 1.2, (r(16 + k) - 0.5) * lot.w * 0.6, lot.h + 0.5, -2 - r(20 + k) * (lot.d - 5), toon({ color: '#4a4652' }));
    if (r(11) < 0.4) reflect(lot.s, lot.side, Math.min(lot.w, 6), [C.rose, C.blue, C.red, C.amber, C.teal][Math.floor(r(12) * 5)]!, 0.14);
  });

  // ---- the cross street: its asphalt off both sides, crosswalks, the signals ----
  {
    const [a, b] = plan.cross, mid = (a + b) / 2, w = b - a;
    for (const side of [-1, 1]) {
      const g = onRoad(mid, side * (ROAD_HALF + 28));
      const road = new THREE.Mesh(new THREE.PlaneGeometry(56, w), toon({ color: '#3a3444' })); road.rotation.x = -Math.PI / 2; road.position.y = 0.01; g.add(road);
      // (its own crosswalk across its mouth, along the main road's kerb)
      for (let k = 0; k < 9; k++) box(onRoad(mid, side * (ROAD_HALF + 1.6)), 2.6, 0.02, 0.5, 0, 0.02, -w / 2 + 0.9 + k * ((w - 1.8) / 8), toon({ color: '#9a94a0' }));
      // the corners' kerbs
      for (const s of [a, b]) box(onRoad(s, side * (ROAD_HALF + 28)), 56, 0.15, 0.3, 0, 0.075, 0, toon({ color: '#8a8090' }));
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
  for (const side of [-1, 1]) {
    for (let s = plan.span[0] + (side < 0 ? 15 : 28); s < plan.span[1] - 4; s += LAMPS.every) {
      if (s > plan.cross[0] - 3 && s < plan.cross[1] + 3) continue;
      const lateral = side * (ROAD_HALF + LAMPS.kerb);
      // (nor by any take's lens: its pole a dark bar down the frame's edge, its head's glare beside the words)
      const pole = atRoad(s, lateral, 0), head = atRoad(s, side * (ROAD_HALF + LAMPS.kerb - LAMPS.reach), LAMPS.h - 0.2);
      if (inView(pole, 0.6, LAMPS.h + 0.4) || inView(head.clone().setY(head.y - 1), 1.6, 2) || lens.some((e) => Math.hypot(e.x - pole.x, e.z - pole.z) < 4.5 || e.distanceTo(head) < 6)) continue;
      const g = onRoad(s, lateral);
      box(g, 0.2, LAMPS.h, 0.2, 0, LAMPS.h / 2, 0, toon({ color: WORLD.post }));
      box(g, LAMPS.reach, 0.14, 0.14, side * LAMPS.reach / 2, LAMPS.h - 0.1, 0, toon({ color: WORLD.post }));
      box(g, 0.9, 0.2, 0.45, side * LAMPS.reach, LAMPS.h - 0.25, 0, lampMaterial('#d8a060', LAMPS.glow, 0.4));
      const pool = new THREE.Mesh(new THREE.CircleGeometry(5.5, 24), glowMaterial('#c08850', GLOW.pool * 0.6, true)); pool.rotation.x = -Math.PI / 2; pool.position.set(side * LAMPS.reach, 0.04, 0); g.add(pool);
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
  for (const [ahead, v] of TRAFFIC.oncoming) traffic.push({ g: new THREE.Group(), s0: s0car + ahead, v, lateral: -LANE });
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
