// Verse 3's props (drive/sets/verse3.ts): the Strip as a street at night. The buildings are the town's fronts (the
// drive's blocks); on them, each business's own signs, mounted as it would mount them — the drugstore's neon on
// standoffs off its upper wall with its transformer and conduit, DRUGS down a blade at its corner, the green cross;
// the liquor store's sign on a steel frame on its roof, the champagne glass beside it; the theatre's marquee out over
// the sidewalk on tie rods, its bulbs chasing, NITE OWL down a blade over it; the tiki bar's big roof sign on its
// lattice at the corner, bamboo round it, torches at the kerb; the hotel's neon between its floors, HOTEL down its
// blade, the payphones at its kerb; the pawn shop's fascia under its three gold balls; the chapel's white front, its
// steeple and its heart. Round them the strip's own neon (blades, window signs, names over the shops), the cross
// street and its signals, street lamps, people on the sidewalks, the traffic's lights, the wet road holding every
// colour, steam off a manhole. Every lyric face is the carriers'; every sign's own word is set in the signs' face
// (F.sign), never the lyrics'. Browser only (canvas).
import * as THREE from 'three';
import type { Drive } from '../../drive/drive';
import { type Lot, MOUNT, STREET, type Theme, type Verse3Plan } from '../../drive/sets/verse3';
import { ROAD_HALF } from '../../drive/route';
import { LANE } from '../../drive/drive';
import { WORLD, toon } from '../../look/toon';
import { GLOW, glowMaterial, lampMaterial } from '../../look/night';
import { F, font } from '../../engine/type';
import { hash } from '../../engine/util';
import { ball, box, canvasTex, cyl, leftFront, onPanel, pic, plane, rightFront, roadFrame, sedan, signFace, walker } from './kit';

const UP = new THREE.Vector3(0, 1, 0);

/** A neon drawing as a texture: `draw` strokes tubes with a glow already set (two passes: the glow builds). */
function neonTex(w: number, h: number, glow: string, draw: (c: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  return canvasTex(w, h, (c) => {
    c.shadowColor = glow; c.shadowBlur = Math.max(10, h * 0.12); c.lineCap = 'round'; c.lineJoin = 'round';
    draw(c); draw(c);
    c.shadowBlur = 0; c.globalAlpha = 0.85; c.strokeStyle = '#ffffff'; c.lineWidth = 1; // (no core pass: the tubes' own white core is the bloom's)
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

/** The neon's colours, and each business's. */
const C = { pink: '#ff4fa3', green: '#4dff9e', teal: '#4de0c0', yellow: '#ffd65a', blue: '#5fd8ff', red: '#ff3b3b', orange: '#ff8a2a', white: '#f4f4f0', violet: '#b06bff' };
const SIGN_COLOUR: Record<Theme, string> = { pill: C.green, pop: C.yellow, marquee: C.yellow, tiki: C.teal, phone: C.blue, pawn: C.yellow, chapel: C.pink };
/** The strip's own neon, on the lots between the businesses: blades down a corner, words over a shop, signs in its
 *  window (seeded). */
const BLADES = [['BAR', C.red], ['HOTEL', C.blue], ['TATTOO', C.green], ['CLUB', C.violet], ['XXX', C.red], ['MOTEL', C.pink], ['BOOKS', C.yellow], ['LOUNGE', C.teal], ['ROOMS', C.orange], ['GIRLS', C.pink]] as const;
const WORDS = [['COCKTAILS', C.pink], ['LIVE NUDES', C.red], ['PSYCHIC', C.violet], ['ADULT BOOKS', C.yellow], ['CHECKS CASHED', C.green], ['BAIL BONDS 24 HRS', C.blue], ['PEEP SHOW', C.red], ['LIQUOR', C.yellow], ['DANCERS', C.pink], ['MOTEL · TV', C.teal]] as const;
const WINDOWS = [['OPEN', C.red], ['BEER', C.yellow], ['ATM', C.green], ['XXX', C.pink], ['24 HRS', C.blue], ['COLD BEER', C.teal]] as const;

/** People on the sidewalks: how many a side, their pace (m/s), and how far from the kerb's edge they walk (m). */
const PEOPLE = { perSide: 16, v: [0.9, 1.5] as [number, number], from: [0.6, 2.4] as [number, number] };
/** The traffic: cars ahead in their lane (m ahead of the car at the verse's start, m/s), oncoming in the other. */
const TRAFFIC = { ahead: [[26, 8.6], [52, 9]] as [number, number][], oncoming: [[60, -10], [110, -9], [150, -11]] as [number, number][] };
/** Street lamps on both kerbs: every `every` m (staggered), their height and reach over the road. */
const LAMPS = { every: 26, h: 7.4, reach: 2.4, kerb: 0.5 };

export function buildVerse3(drive: Drive): { group: THREE.Group; update(t: number): void } | null {
  const plan = drive.plans.verse3 as Verse3Plan | undefined;
  if (!plan) return null;
  const { route } = drive, root = new THREE.Group();
  const L = leftFront(route, root), R = rightFront(route, root), onRoad = roadFrame(route, root);
  /** A lot's own frame: x along its front (left to right from the road), y up from the road, z out toward the road
   *  (its front at z 0). */
  const lotFrame = (lot: Lot) => (lot.side < 0 ? L(lot.s, -STREET.front) : R(lot.s, STREET.front));
  const atRoad = (s: number, lateral: number, y: number) => { const f = route.frameAt(s); return f.pos.clone().addScaledVector(f.right, lateral).addScaledVector(UP, y); };
  const dark = toon({ color: '#1b1820' }), steel = toon({ color: '#4a4450' }), chrome = toon({ color: WORLD.chrome }), conduit = toon({ color: '#6b6670' });
  const bamboo = toon({ color: '#9e7a42' }), gold = new THREE.MeshBasicMaterial({ color: new THREE.Color('#e8b83a').multiplyScalar(1.1) }), white = toon({ color: '#f4f4f0' }), thatch = toon({ color: '#b08a4a' });

  /** Every flickering or buzzing neon material: its line's start (it flickers on with it; none: always lit, a slight
   *  buzz), its lit brightness, whether it dances (a torch's flame). */
  const flicker: { m: THREE.MeshBasicMaterial; start?: number; peak: number; dance?: boolean; seed: number }[] = [];
  /** The marquee's bulbs, in two phases (they chase); the payphones' coin light (it blinks while they're told to call). */
  const marqueeBulbs: { m: THREE.ShaderMaterial; phase: number }[] = [];
  let coin: THREE.Mesh | null = null, coinStart = 0;
  const neon = (g: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, tex: THREE.Texture, opts: { start?: number; peak?: number; dance?: boolean } = {}) => {
    const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, color: new THREE.Color().setScalar(opts.peak ?? 1.8), side: THREE.DoubleSide });
    flicker.push({ m, start: opts.start, peak: opts.peak ?? 1.8, dance: opts.dance, seed: flicker.length });
    return plane(g, w, h, x, y, z, m);
  };
  /** A lit picture (a sign's lightbox, a lit window): unlit material, a little over white so it blooms. */
  const litPic = (tex: THREE.Texture, k = 1.35) => pic(tex, { color: new THREE.Color(k, k, k), toneMapped: false });
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

  // ---- a business's ground floor: its glass lit, the trade's things inside, its door, the fascia with its small words,
  // an awning (over the town's own front, a hand proud of it) ----
  const TRADES: Record<Theme, { fascia: string; ink: string; shelf: string; wares: string[]; sign: string; awning?: string }> = {
    pill: { fascia: '#2f8a5a', ink: '#fff6e0', shelf: '#e8f4ee', wares: ['#4dff9e', '#ffffff', '#5fd8ff', '#ff4fa3'], sign: 'RX · DRUGS · COSMETICS · FILM' },
    pop: { fascia: '#6b1d2a', ink: '#ffd65a', shelf: '#f2e0c8', wares: ['#ffd65a', '#c8102e', '#2b78a6', '#4dff9e', '#f4f4f0'], sign: 'LIQUOR · BEER · WINE · ICE', awning: '#c8102e' },
    marquee: { fascia: '#c8202e', ink: '#ffd65a', shelf: '#1d1a22', wares: ['#ffd65a'], sign: 'NOW PLAYING' },
    tiki: { fascia: '#5a3518', ink: '#4de0c0', shelf: '#3a2a1a', wares: ['#ff8a2a', '#4de0c0', '#ffd65a'], sign: 'MAI TAIS · ZOMBIES · HAPPY HOUR 4-7' },
    phone: { fascia: '#1f3f66', ink: '#fff6e0', shelf: '#dfe8ee', wares: ['#5fd8ff', '#ffffff'], sign: 'ROOMS BY THE WEEK · LOBBY' },
    pawn: { fascia: '#2a2430', ink: '#ffd65a', shelf: '#f6dd8f', wares: ['#ffd65a', '#aaa498', '#f4f4f0'], sign: 'WE BUY GOLD · LOANS · GUNS' },
    chapel: { fascia: '#f4f4f0', ink: '#ff4fa3', shelf: '#ffffff', wares: ['#ff4fa3', '#ffffff'], sign: 'WEDDINGS · NO WAITING' },
  };
  const storefront = (g: THREE.Object3D, w: number, theme: Theme, glassTop = 2.9) => {
    const T = TRADES[theme], frame = toon({ color: '#1d1a22' });
    const interior = canvasTex(1024, 384, (c) => {
      c.fillStyle = theme === 'marquee' ? '#2a1016' : theme === 'tiki' ? '#3a1e12' : '#fff1d8'; c.fillRect(0, 0, 1024, 384);
      for (let y = 90; y < 384; y += 90) {
        c.fillStyle = T.shelf; c.fillRect(20, y, 984, 10);
        for (let x = 40; x < 1000; x += 36 + ((x * 7) % 23)) { c.fillStyle = T.wares[Math.floor(((x * 13) / 7) % T.wares.length)]!; const h = 36 + ((x * 11) % 40); c.fillRect(x, y - h, 22, h); }
      }
      c.fillStyle = 'rgba(255,230,180,0.35)'; c.fillRect(0, 0, 1024, 60);
    });
    const W = w - 0.6, panes = Math.max(2, Math.round(W / 2.4)), pw = W / panes, glassH = glassTop - 0.35;
    for (let i = 0; i < panes; i++) {
      const x = -W / 2 + pw * (i + 0.5);
      if (i === Math.floor(panes / 2)) { // the door
        box(g, pw - 0.2, glassTop - 0.05, 0.08, x, (glassTop - 0.05) / 2, 0.06, frame);
        plane(g, pw - 0.5, glassH - 0.25, x, 0.3 + (glassH - 0.25) / 2, 0.11, litPic(interior, 1.25));
        box(g, 0.05, 0.6, 0.05, x + pw / 2 - 0.45, 1.1, 0.13, chrome);
        continue;
      }
      plane(g, pw - 0.1, glassH, x, 0.35 + glassH / 2, 0.06, litPic(interior, 1.3));
      box(g, pw, 0.35, 0.2, x, 0.175, 0.08, toon({ color: '#3a3540' })); // the base course
    }
    for (let i = 0; i <= panes; i++) box(g, 0.1, glassTop, 0.12, -W / 2 + pw * i, glassTop / 2, 0.08, frame);
    box(g, W + 0.2, 0.1, 0.2, 0, glassTop, 0.08, frame);
    // the fascia over the glass (over the town's sign band), its words lit
    box(g, w - 0.2, 0.95, 0.24, 0, glassTop + 0.55, 0.12, toon({ color: T.fascia }));
    plane(g, Math.min(w - 0.8, 9), 0.55, 0, glassTop + 0.55, 0.25, litPic(signFace(T.sign, 1024, 64, T.ink, null, F.sign(600), 0.62, 0.16), 1.3));
    if (T.awning) { const a = box(g, w * 0.8, 0.08, 1.5, 0, glassTop - 0.15, 0.85, toon({ color: T.awning })); a.rotation.x = 0.2; }
    // its light spilling out on the sidewalk
    wash(g, w * 0.9, 3.4, 0, 0.17, 1.7, '#ffd9a0', 0.32, true);
  };

  /** A wall sign's hardware round its face (in the face's frame, the wall `back` m behind it): standoffs, the
   *  transformer box under it, the conduit from it down the wall, a tube round the panel's edge. */
  const wallMount = (g: THREE.Object3D, W: number, H: number, color: string, start: number, back = MOUNT.wall) => {
    for (const x of [-W / 2 + 0.4, W / 2 - 0.4]) for (const y of [-H / 2 + 0.3, H / 2 - 0.3]) box(g, 0.08, 0.08, back, x, y, -back / 2 - 0.04, steel);
    // the transformer on the wall at the panel's right foot (under it, it hid the fascia's words), its conduit up the
    // wall from it, and a run along the panel's foot
    box(g, 0.5, 0.8, 0.28, W / 2 + 0.6, -H / 2 + 0.4, -back + 0.14, toon({ color: '#3a3540' }));
    cyl(g, 0.04, H + 0.4 - 0.8, W / 2 + 0.6, (H / 2 + 0.4 - H / 2 + 0.8) / 2, -back + 0.06, conduit);
    const run = cyl(g, 0.035, W, 0, -H / 2 + 0.12, -back + 0.06, conduit); run.rotation.z = Math.PI / 2;
    const fw = W + 0.6, fh = H + 0.5, px = Math.round((1024 * fh) / fw);
    neon(g, fw, fh, 0, 0, 0.01, neonTex(1024, px, color, (c) => { c.strokeStyle = color; c.lineWidth = 8; c.beginPath(); c.roundRect(14, 14, 1024 - 28, px - 28, 22); c.stroke(); }), { start, peak: 1.6 });
  };
  /** A blade down a building's corner, out from its wall (in the lot's frame: at x, from y0 up h, out `out` m). */
  const blade = (g: THREE.Object3D, x: number, y0: number, h: number, word: string, color: string, out = 1.25, start?: number) => {
    const b = new THREE.Group(); b.position.set(x, y0 + h / 2, out / 2 + 0.05); b.rotation.y = Math.PI / 2; g.add(b);
    box(b, out, h, 0.3, 0, 0, 0, dark);
    for (const sd of [1, -1]) { const p = neon(b, out * 0.82, h * 0.94, 0, 0, sd * 0.16, bladeWord(word, color, true), { start, peak: 2 }); if (sd < 0) p.rotation.y = Math.PI; }
    for (const y of [-h / 2 + 0.4, h / 2 - 0.4]) box(g, 0.08, 0.08, out + 0.2, x, y0 + h / 2 + y, (out + 0.2) / 2, steel); // its brackets
    return b;
  };

  // ---- the businesses ----
  for (const sign of plan.signs) {
    const lot = plan.lots[sign.lot]!, g = lotFrame(lot), { face, theme } = sign, W = face.w, H = face.h, start = sign.starts[0]!;
    const fg = onPanel(face); root.add(fg);
    const groundY = -(face.center.y - route.frameAt(sign.s).pos.y), color = SIGN_COLOUR[theme];
    reflect(sign.s, sign.side, W, color);
    switch (theme) {
      case 'pill': {
        storefront(g, lot.w, 'pill');
        wallMount(fg, W, H, C.green, start);
        blade(g, -lot.w / 2 + 0.5, 3.8, 5.6, 'DRUGS', C.green, 1.3); // (down its up-street corner: seen coming)
        // the capsule beside the words, and the green cross on its bracket at the far corner
        neon(fg, 2.0, 1.15, -W / 2 - 1.4, 0.2, -0.1, neonTex(512, 288, C.green, (c) => {
          c.strokeStyle = C.green; c.lineWidth = 14; c.save(); c.translate(256, 144); c.rotate(-0.5);
          c.beginPath(); c.roundRect(-150, -62, 300, 124, 62); c.stroke(); c.beginPath(); c.moveTo(0, -62); c.lineTo(0, 62); c.stroke(); c.restore();
        }), { peak: 2 });
        const cross = new THREE.Group(); cross.position.set(lot.w / 2 - 0.6, 4.6, 0.9); cross.rotation.y = Math.PI / 2; g.add(cross);
        box(cross, 1.3, 1.3, 0.25, 0, 0, 0, dark);
        for (const sd of [1, -1]) { const p = neon(cross, 1.1, 1.1, 0, 0, sd * 0.14, canvasTex(128, 128, (c) => { c.fillStyle = C.green; c.fillRect(44, 10, 40, 108); c.fillRect(10, 44, 108, 40); }), { peak: 2.4 }); if (sd < 0) p.rotation.y = Math.PI; }
        box(g, 0.08, 0.08, 1.4, lot.w / 2 - 0.6, 5.0, 0.7, steel);
        wash(fg, W + 6, H + 4, 0, 0, -MOUNT.wall + 0.02, C.green, 0.25);
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
        neon(fg, 4.6, 1.15, 0, H / 2 + 0.75, -0.05, tubeWord('LIQUOR', C.yellow), { peak: 1.9 });
        box(fg, 4.8, 1.2, 0.12, 0, H / 2 + 0.75, -0.2, dark);
        for (const x of [-1.8, 1.8]) box(fg, 0.12, 0.8, 0.12, x, H / 2 + 0.2, -0.3, steel);
        // the champagne glass on its own frame at the sign's right, its bubbles, the cork away
        box(fg, 1.9, 2.4, 0.12, W / 2 + 1.15, 0, -0.2, dark);
        neon(fg, 1.6, 2.1, W / 2 + 1.15, 0, -0.1, neonTex(400, 520, C.yellow, (c) => {
          c.strokeStyle = C.yellow; c.lineWidth = 12;
          c.beginPath(); c.moveTo(100, 130); c.lineTo(300, 130); c.lineTo(200, 280); c.lineTo(200, 400); c.stroke();
          c.beginPath(); c.moveTo(130, 440); c.lineTo(270, 440); c.stroke();
          c.fillStyle = C.yellow; for (const [bx, by, r] of [[160, 86, 10], [210, 60, 13], [258, 92, 9], [228, 24, 8]] as const) { c.beginPath(); c.arc(bx, by, r, 0, Math.PI * 2); c.fill(); }
        }), { peak: 2.2 });
        box(fg, 0.14, legH + 1.2, 0.14, W / 2 + 1.15, roof + (legH + 1.2) / 2 - 0.1, -0.3, steel);
        // in its window: the neon the liquor store hangs there
        neon(g, 1.7, 0.6, -lot.w / 2 + 1.6, 2.1, 0.14, tubeWord('COLD BEER', C.blue, 512, 180), { peak: 2 });
        neon(g, 1.2, 0.5, lot.w / 2 - 1.5, 2.2, 0.14, tubeWord('LOTTO', C.red, 512, 200), { peak: 2 });
        break;
      }
      case 'marquee': {
        storefront(g, lot.w, 'marquee', 2.9);
        // the marquee: a box from the wall out to the face, bulbs round its front, its soffit lit, tie rods to the wall
        const out = MOUNT.marquee, mw = W + 1.4, mh = H + 0.9;
        box(fg, mw, mh, out - 0.05, 0, 0, -out / 2 - 0.03, toon({ color: '#c8202e' }));
        box(fg, mw + 0.2, 0.2, out + 0.1, 0, mh / 2 + 0.1, -out / 2, toon({ color: '#ffd65a' }));
        box(fg, mw + 0.2, 0.2, out + 0.1, 0, -mh / 2 - 0.1, -out / 2, toon({ color: '#ffd65a' }));
        const bulb = [lampMaterial('#ffe8b0', GLOW.lamp, 1.1), lampMaterial('#ffe8b0', GLOW.lamp * 0.25, 0.4)];
        marqueeBulbs.push(...bulb.map((m, i) => ({ m, phase: i })));
        const e = mw / 2 - 0.15, f = mh / 2 - 0.15, n = 22;
        for (let i = 0; i <= n; i++) for (const y of [f, -f]) ball(fg, 0.075, -e + (2 * e * i) / n, y, 0.04, bulb[i % 2]!);
        for (let i = 1; i < 6; i++) for (const x of [-e, e]) ball(fg, 0.075, x, -f + (2 * f * i) / 6, 0.04, bulb[i % 2]!);
        // its ends, the house's name on each (seen coming up the street)
        for (const sd of [-1, 1]) {
          const p = plane(fg, out - 0.3, mh - 0.4, sd * (mw / 2 + 0.01), 0, -out / 2, litPic(signFace('NITE OWL', 512, 256, '#ffd65a', '#c8202e', F.sign(700), 0.4, 0.1), 1.3));
          p.rotation.y = sd * Math.PI / 2;
        }
        // the soffit's lights under it, pooling on the sidewalk
        plane(fg, mw - 0.4, out - 0.3, 0, -mh / 2 - 0.21, -out / 2, new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.9, 1.3), toneMapped: false })).rotation.x = Math.PI / 2;
        wash(g, mw + 2, out + 2.5, 0, 0.18, out / 2 + 0.6, '#ffd9a0', 0.55, true);
        for (const x of [-mw / 2 + 0.5, mw / 2 - 0.5]) { const rod = box(fg, 0.05, Math.hypot(2.6, out), 0.05, x, mh / 2 + 1.3, -out / 2, steel); rod.rotation.x = -Math.atan2(out, 2.6); }
        // NITE OWL down a blade over it, its letters lit, ringed in bulbs
        const top = face.center.y - route.frameAt(sign.s).pos.y + mh / 2 + 0.6;
        blade(g, 0, top, Math.min(6.4, lot.h + 1.5 - top), 'NITEOWL', C.yellow, 1.6);
        // the ticket booth and the poster cases either side of it
        box(g, 2.0, 2.5, 0.8, 0, 1.25, 0.45, toon({ color: '#c8202e' }));
        for (const x of [-lot.w / 2 + 1.4, lot.w / 2 - 1.4]) {
          box(g, 1.3, 1.9, 0.1, x, 1.5, 0.12, toon({ color: '#ffd65a' }));
          plane(g, 1.05, 1.6, x, 1.5, 0.18, litPic(canvasTex(128, 192, (c) => { c.fillStyle = x > 0 ? '#7a3a7e' : '#2b1b4e'; c.fillRect(0, 0, 128, 192); c.fillStyle = '#ffd65a'; c.beginPath(); c.arc(64, 70, 36, 0, Math.PI * 2); c.fill(); c.fillStyle = '#16131a'; c.fillRect(20, 130, 88, 10); c.fillRect(30, 150, 68, 8); }), 1.2));
        }
        break;
      }
      case 'tiki': {
        storefront(g, lot.w, 'tiki', 2.6);
        // a thatched fringe over its front, tiki faces either side of its door
        const fr = box(g, lot.w + 0.4, 0.7, 1.4, 0, 3.4, 0.6, thatch); fr.rotation.x = 0.25;
        for (const x of [-1.6, 1.6]) { box(g, 0.7, 2.4, 0.5, x, 1.2, 0.35, toon({ color: '#6b4a2a' })); for (const y of [1.7, 0.9]) box(g, 0.5, 0.12, 0.1, x, y, 0.62, toon({ color: '#ff8a2a' })); }
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
        }), { peak: 1.8 });
        wash(fg, W + 6, H + 5, 0, 0, -0.3, C.teal, 0.2);
        // a thatched hat over its name, and a carved tiki standing up its left side from the roof, its eyes lit
        const hat = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, W + 2.4, 3), thatch);
        hat.rotation.z = Math.PI / 2; hat.scale.set(1, 1, 0.6); hat.position.set(0, H / 2 + 2.75, -0.2); fg.add(hat);
        for (let k = 0; k < 9; k++) { const f = box(fg, 0.12, 0.9, 0.05, -W / 2 - 0.9 + (k * (W + 1.8)) / 8, H / 2 + 2.2, 0.55, thatch); f.rotation.z = (k % 2 ? 0.15 : -0.15); } // its fringe
        const tx = -W / 2 - 1.15, ty0 = groundY + lot.h, th = H / 2 + 0.6 - ty0;
        box(fg, 0.9, th, 0.8, tx, ty0 + th / 2, -0.3, toon({ color: '#6b4a2a' }));
        for (let k = 0; k < 3; k++) {
          const y = H / 2 - 0.6 - k * 2.6;
          box(fg, 1.05, 0.25, 0.9, tx, y + 0.55, -0.25, toon({ color: '#5a3518' })); // its brow
          for (const ex of [-0.22, 0.22]) neon(fg, 0.22, 0.22, tx + ex, y + 0.2, 0.15, canvasTex(64, 64, (c) => { c.fillStyle = C.orange; c.beginPath(); c.arc(32, 32, 26, 0, Math.PI * 2); c.fill(); }), { peak: 2.4 });
          box(fg, 0.6, 0.18, 0.1, tx, y - 0.45, 0.16, toon({ color: '#f4f0e6' })); // its teeth
        }
        // the torches at the kerb, either side of its door
        for (const x of [-lot.w / 2 + 0.8, lot.w / 2 - 0.8]) {
          cyl(g, 0.08, 2.6, x, 1.3, 2.4, bamboo);
          neon(g, 0.8, 1.15, x, 3.15, 2.4, neonTex(220, 300, C.orange, (c) => { c.fillStyle = C.orange; c.beginPath(); c.moveTo(110, 20); c.quadraticCurveTo(190, 130, 110, 270); c.quadraticCurveTo(30, 130, 110, 20); c.fill(); }), { peak: 2.6, dance: true });
        }
        // the lyric rows light row by row: a tube under each line's rows flickers on with it
        break;
      }
      case 'phone': {
        storefront(g, lot.w, 'phone');
        wallMount(fg, W, H, C.blue, start);
        blade(g, lot.w / 2 - 0.6, 3.9, 7.2, 'HOTEL', C.red, 1.5);
        neon(fg, 6.4, 0.85, 0, H / 2 + 0.9, -MOUNT.wall + 0.05, tubeWord('PHONES · COLOR TV · ROOMS', C.blue, 1024, 140), { peak: 1.7 });
        wash(fg, W + 6, H + 4, 0, 0, -MOUNT.wall + 0.02, C.blue, 0.22);
        // the payphones at its kerb, under the words: two hooded boxes on a post, their coin light
        const kerb = new THREE.Group(); kerb.position.set(-lot.w / 2 + 2.2, 0.15, 2.5); g.add(kerb);
        box(kerb, 0.22, 2.4, 0.22, 0, 1.2, 0, dark);
        for (const x of [-0.55, 0.55]) {
          box(kerb, 0.9, 0.95, 0.5, x, 1.8, 0, toon({ color: '#1f6b86' }));
          box(kerb, 0.5, 0.5, 0.3, x, 1.75, 0.12, dark);
          box(kerb, 0.07, 0.4, 0.12, x - 0.28, 1.75, 0.2, chrome);
        }
        plane(kerb, 1.9, 0.3, 0, 2.45, 0.27, litPic(signFace('PHONE', 512, 80, '#ffffff', '#1f6b86', F.sign(700), 0.7, 0.2), 1.4));
        coin = plane(kerb, 0.1, 0.1, 0.55, 2.2, 0.26, new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.4, 0.3), toneMapped: false }));
        coinStart = sign.starts[0]!;
        break;
      }
      case 'pawn': {
        storefront(g, lot.w, 'pawn', 2.3);
        for (let x = -lot.w / 2 + 0.6; x < lot.w / 2 - 0.4; x += 0.35) box(g, 0.04, 2.0, 0.04, x, 1.3, 0.2, toon({ color: '#3a3540' })); // the bars
        // its fascia's gold frame ringed with bulbs (a lit sign, not a slate), lit from above by gooseneck lamps
        box(fg, W + 0.5, H + 0.5, 0.12, 0, 0, -0.1, toon({ color: '#d7a62e' }));
        const bulb = [lampMaterial('#ffe8b0', GLOW.lamp, 1.1), lampMaterial('#ffe8b0', GLOW.lamp * 0.25, 0.4)];
        marqueeBulbs.push(...bulb.map((m, i) => ({ m, phase: i })));
        { const e = W / 2 + 0.12, f = H / 2 + 0.12, n = 26, m = 12;
          for (let i = 0; i <= n; i++) for (const y of [f, -f]) ball(fg, 0.06, -e + (2 * e * i) / n, y, 0.0, bulb[i % 2]!);
          for (let i = 1; i < m; i++) for (const x of [-e, e]) ball(fg, 0.06, x, -f + (2 * f * i) / m, 0.0, bulb[i % 2]!); }
        for (const x of [-W / 3, 0, W / 3]) { box(fg, 0.06, 0.06, 0.9, x, H / 2 + 0.45, 0.3, steel); box(fg, 0.45, 0.14, 0.3, x, H / 2 + 0.4, 0.8, steel); }
        wash(fg, W + 1, H + 1, 0, 0.6, 0.02, '#fff1c8', 0.18);
        // PAWN on its roof's edge, lit
        box(fg, 3.4, 1.1, 0.15, 0, H / 2 + 1.25, -0.25, dark);
        neon(fg, 3.2, 1.0, 0, H / 2 + 1.25, -0.15, tubeWord('PAWN', C.yellow, 1024, 320, 700), { peak: 2 });
        // the three gold balls hung from an arm off its far corner, out over the sidewalk
        const bx = lot.w / 2 - 0.45, by = face.center.y - route.frameAt(sign.s).pos.y + H / 2 + 0.6;
        box(g, 0.1, 0.1, 2.3, bx, by + 1.0, 1.15, dark); // the arm
        const rod = box(g, 0.05, 1.3, 0.05, bx, by + 1.6, 0.7, dark); rod.rotation.x = 0.85; // its stay to the wall
        for (const [z, dy] of [[1.15, 0], [2.05, 0], [1.6, -0.72]] as const) { box(g, 0.03, 1.0 - dy, 0.03, bx, by + 0.5 + dy / 2, z, dark); ball(g, 0.32, bx, by + dy, z, gold); }
        neon(g, 2.6, 0.6, -lot.w / 2 + 2.0, 1.7, 0.16, tubeWord('GUNS · GOLD', C.red, 1024, 220), { peak: 2 });
        break;
      }
      case 'chapel': {
        // a white front over the town's, an arched door, a steeple on the roof
        // (floodlit: lit white, or the night shading turned it the street's blue-grey)
        plane(g, lot.w, lot.h, 0, lot.h / 2, 0.05, new THREE.MeshBasicMaterial({ color: '#e6d6ea' }));
        for (const x of [-lot.w / 3, lot.w / 3]) wash(g, 4, lot.h * 1.2, x, lot.h * 0.4, 0.08, '#ffffff', 0.18);
        box(g, lot.w + 0.2, 0.45, 0.4, 0, lot.h - 0.22, 0.2, toon({ color: '#e8d0e0' }));
        box(g, 1.8, 2.6, 0.2, 0, 1.3, 0.12, toon({ color: '#7a3a7e' }));
        const arch = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.2, 18, 1, false, Math.PI / 2, Math.PI), toon({ color: '#7a3a7e' })); arch.rotation.x = Math.PI / 2; arch.position.set(0, 2.6, 0.12); g.add(arch); // (its upper half, facing out)
        for (const x of [-lot.w / 2 + 1.6, lot.w / 2 - 1.6]) { box(g, 1.6, 2.2, 0.12, x, 1.6, 0.1, toon({ color: '#c9e7f0' })); wash(g, 1.6, 2.2, x, 1.6, 0.18, C.pink, 0.25); }
        box(g, 2.4, 3.6, 2.4, 0, lot.h + 1.8, -3, white);
        const spire = new THREE.Mesh(new THREE.ConeGeometry(1.6, 2.8, 4), toon({ color: '#7a3a7e' })); spire.position.set(0, lot.h + 5.0, -3); spire.rotation.y = Math.PI / 4; g.add(spire);
        box(g, 0.12, 1.2, 0.12, 0, lot.h + 6.9, -3, white); box(g, 0.6, 0.12, 0.12, 0, lot.h + 7.1, -3, white);
        wallMount(fg, W, H, C.pink, start);
        neon(fg, 2.0, 2.0, W / 2 + 1.4, 0.2, -0.1, neonTex(420, 420, C.pink, (c) => {
          c.strokeStyle = C.pink; c.lineWidth = 13; c.beginPath(); c.moveTo(210, 340);
          c.bezierCurveTo(60, 230, 60, 110, 160, 92); c.bezierCurveTo(196, 86, 210, 120, 210, 140);
          c.bezierCurveTo(210, 120, 224, 86, 260, 92); c.bezierCurveTo(360, 110, 360, 230, 210, 340); c.stroke();
          c.strokeStyle = C.white; c.lineWidth = 10; c.beginPath(); c.moveTo(60, 300); c.lineTo(340, 140); c.stroke();
          c.beginPath(); c.moveTo(340, 140); c.lineTo(300, 142); c.moveTo(340, 140); c.lineTo(330, 176); c.stroke();
        }), { peak: 2.1 });
        neon(fg, 5.2, 0.9, 0, H / 2 + 0.75, -MOUNT.wall + 0.05, tubeWord('WEDDING CHAPEL', C.violet, 1024, 170), { peak: 1.9 }); // (violet: white tubes washed out on its white front)
        neon(g, 1.5, 0.55, lot.w / 2 - 1.6, 1.7, 0.2, tubeWord('ALWAYS OPEN', C.pink, 1024, 360), { peak: 2.1 }); // (in its window)
        wash(fg, W + 6, H + 4, 0, 0, -MOUNT.wall + 0.02, C.pink, 0.25);
        break;
      }
    }
  }

  // ---- the strip's own neon, on the lots between ----
  plan.lots.forEach((lot, i) => {
    if (lot.shop !== undefined) return;
    const g = lotFrame(lot), r = (k: number) => hash(i, k, 701);
    const low = lot.h < 6;
    // a blade down its up-street corner (none on the right's low run: the tiki bar's sign is seen over it)
    // (the lot's frame runs along the road on the left, against it on the right: its up-street end is −x on the left)
    const upEnd = lot.side < 0 ? -lot.w / 2 + 0.5 : lot.w / 2 - 0.5;
    if (!low && r(1) < 0.6 && lot.w > 4.5) {
      const [word, col] = BLADES[Math.floor(r(2) * BLADES.length)]!, h = Math.min(lot.h - 3.4, 1.2 + word.length * 1.05);
      const p = atRoad(lot.s - lot.w / 2 + 0.5, lot.side * (STREET.front - 0.7), 3.8);
      if (!inView(p, 0.9, h)) blade(g, upEnd, 3.8, h, word, col, 1.15);
    }
    // a word in neon over its shop, on its upper wall
    if (!low && r(3) < 0.55) {
      const [word, col] = WORDS[Math.floor(r(4) * WORDS.length)]!, w = Math.min(lot.w - 1.6, 0.42 * word.length + 1);
      neon(g, w, 0.8, 0.4, 5.0 + (lot.h > 9 ? r(5) * 2.4 : 0), 0.1, tubeWord(word, col, 1024, Math.round(1024 * 0.8 / w)), { peak: 1.8 });
      wash(g, w + 3, 3, 0.4, 5.2, 0.05, col, 0.16);
    }
    // a sign in its window
    if (r(6) < 0.7) {
      const [word, col] = WINDOWS[Math.floor(r(7) * WINDOWS.length)]!;
      neon(g, 1.3, 0.55, (r(8) - 0.5) * (lot.w - 2.5), 1.9, 0.12, tubeWord(word, col, 512, 216), { peak: 2.2 });
    }
    // on the low run, a word along its parapet instead
    if (low && r(9) < 0.9) {
      const [word, col] = WORDS[Math.floor(r(10) * WORDS.length)]!, w = Math.min(lot.w - 1, 0.42 * word.length + 1);
      neon(g, w, 0.7, 0, 3.75, 0.2, tubeWord(word, col, 1024, Math.round(1024 * 0.7 / w)), { peak: 1.8 });
    }
    if (r(11) < 0.5) reflect(lot.s, lot.side, Math.min(lot.w, 6), [C.pink, C.blue, C.red, C.yellow, C.teal][Math.floor(r(12) * 5)]!, 0.35);
  });

  // ---- the cross street: its asphalt off both sides, crosswalks, the signals ----
  {
    const [a, b] = plan.cross, mid = (a + b) / 2, w = b - a;
    for (const side of [-1, 1]) {
      const g = onRoad(mid, side * (ROAD_HALF + 28));
      const road = new THREE.Mesh(new THREE.PlaneGeometry(56, w), toon({ color: '#3a3444' })); road.rotation.x = -Math.PI / 2; road.position.y = 0.01; g.add(road);
      // (its own crosswalk across its mouth, along the main road's kerb)
      for (let k = 0; k < 9; k++) box(onRoad(mid, side * (ROAD_HALF + 1.6)), 2.6, 0.02, 0.5, 0, 0.02, -w / 2 + 0.9 + k * ((w - 1.8) / 8), toon({ color: '#d8d0c4' }));
      // the corners' kerbs
      for (const s of [a, b]) box(onRoad(s, side * (ROAD_HALF + 28)), 56, 0.15, 0.3, 0, 0.075, 0, toon({ color: '#b8a894' }));
    }
    for (const s of [a - 1.4, b + 1.4]) for (let k = 0; k < 9; k++) box(onRoad(s, -ROAD_HALF + 0.5 + k * 0.9), 0.5, 0.02, 2.2, 0, 0.02, 0, toon({ color: '#d8d0c4' }));
    // the signals: on the left's near corner an arm out over the oncoming lane; on the right's, a head on its post
    const green = lampMaterial('#5cff9a', GLOW.lamp, 0.6), off = toon({ color: '#2a2a2e' });
    const head = (g: THREE.Object3D, x: number, y: number, z: number, ry = 0) => {
      const h = new THREE.Group(); h.position.set(x, y, z); h.rotation.y = ry; g.add(h);
      box(h, 0.4, 1.15, 0.3, 0, 0, 0, toon({ color: '#d7a62e' }));
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
    const blade_ = plane(lp, 2.2, 0.4, 1.2, 4.4, 0, litPic(signFace('LAS PALMAS AV', 512, 96, '#ffffff', '#1f6b44', F.sign(600), 0.6, 0.1), 1.1));
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
      box(g, 0.9, 0.2, 0.45, side * LAMPS.reach, LAMPS.h - 0.25, 0, lampMaterial('#ffcf8a'));
      const pool = new THREE.Mesh(new THREE.CircleGeometry(5.5, 24), glowMaterial('#ffb560', GLOW.pool, true)); pool.rotation.x = -Math.PI / 2; pool.position.set(side * LAMPS.reach, 0.04, 0); g.add(pool);
    }
  }

  // ---- people on the sidewalks: walking both ways, a few standing at the doors; none through a view ----
  const people: { g: THREE.Group; s0: number; v: number; lateral: number; side: number; stand: boolean }[] = [];
  for (const side of [-1, 1]) for (let k = 0; k < PEOPLE.perSide; k++) {
    const r = (j: number) => hash(k, side, 800 + j), stand = r(1) < 0.3;
    const s0 = plan.span[0] + (plan.span[1] - plan.span[0]) * r(2), dir = r(3) < 0.5 ? -1 : 1, v = stand ? 0 : dir * (PEOPLE.v[0] + (PEOPLE.v[1] - PEOPLE.v[0]) * r(4));
    const lateral = side * (ROAD_HALF + (stand ? 2.6 : PEOPLE.from[0] + (PEOPLE.from[1] - PEOPLE.from[0]) * r(5)));
    // (never through the cross street's mouth, never in a view of the words, never by the lens)
    let ok = true;
    for (let t = plan.t[0]; t < plan.t[1] && ok; t += 0.1) {
      const s = s0 + v * (t - plan.t[0]);
      if (s > plan.cross[0] - 0.5 && s < plan.cross[1] + 0.5) ok = false;
      else if (inView(atRoad(s, lateral, 0.15), 0.45, 1.85, t)) ok = false;
    }
    if (!ok) continue;
    const g = new THREE.Group(); g.matrixAutoUpdate = false; root.add(g);
    const p = walker(); p.rotation.y = v >= 0 ? 0 : Math.PI; if (stand) p.rotation.y = side < 0 ? -Math.PI / 2 : Math.PI / 2; g.add(p);
    people.push({ g, s0, v, lateral, side, stand });
  }

  // ---- the traffic: cars ahead in their lane, tail lights lit; cars coming the other way, headlights on ----
  const traffic: { g: THREE.Group; s0: number; v: number; lateral: number }[] = [];
  const tail = lampMaterial('#ff2a24', GLOW.tail, 1.1), headL = lampMaterial('#fff2d0', GLOW.head * 0.5, 1.1);
  const s0car = drive.motion.distanceAt(plan.t[0]);
  for (const [ahead, v] of TRAFFIC.ahead) traffic.push({ g: new THREE.Group(), s0: s0car + ahead, v, lateral: LANE });
  for (const [ahead, v] of TRAFFIC.oncoming) traffic.push({ g: new THREE.Group(), s0: s0car + ahead, v, lateral: -LANE });
  traffic.forEach((c, i) => {
    const car = sedan({ color: ['#2b2f3a', '#7a1d2a', '#d8d2c2', '#2b78a6', '#3a3444'][i % 5]! }); c.g.add(car);
    c.g.matrixAutoUpdate = false; root.add(c.g);
    if (c.v < 0) car.rotation.y = Math.PI;
    const back = new THREE.Group(); car.add(back);
    for (const x of [0.62, -0.62]) { box(car, 0.26, 0.12, 0.04, x, 0.62, -2.33, tail); box(car, 0.24, 0.14, 0.04, x, 0.62, 2.33, headL); }
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1), glowMaterial('#ff2a24', 0.5, true)); glow.rotation.x = -Math.PI / 2; glow.position.set(0, 0.03, -3); car.add(glow);
    const beam = new THREE.Mesh(new THREE.PlaneGeometry(3, 7), glowMaterial('#fff2d0', 0.35, true)); beam.rotation.x = -Math.PI / 2; beam.position.set(0, 0.03, 5.6); car.add(beam);
  });

  // ---- steam off a manhole in the far lane, by the theatre ----
  const steam: THREE.Sprite[] = [];
  {
    const puff = canvasTex(128, 128, (c) => { const gr = c.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(255,240,250,0.55)'); gr.addColorStop(1, 'rgba(255,240,250,0)'); c.fillStyle = gr; c.fillRect(0, 0, 128, 128); });
    const s = plan.cross[0] - 4, at = atRoad(s, -LANE + 0.4, 0.05); // (in the far lane short of the crossing: the take up the street passes it)
    const lid = new THREE.Mesh(new THREE.CircleGeometry(0.4, 16), toon({ color: '#2a2630' })); lid.rotation.x = -Math.PI / 2; lid.position.copy(at).add(new THREE.Vector3(0, 0.02, 0)); root.add(lid);
    for (let k = 0; k < 7; k++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puff, transparent: true, depthWrite: false, opacity: 0.5, color: new THREE.Color(1.2, 1.05, 1.2) }));
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
      // the marquee's bulbs chase
      const ph = Math.floor(t * 6) % 2;
      for (const b of marqueeBulbs) b.m.uniforms.strength!.value = (b.phase + ph) % 2 === 0 ? GLOW.lamp : GLOW.lamp * 0.25;
      if (coin) (coin.material as THREE.MeshBasicMaterial).color.setScalar(t >= coinStart && (t * 2.2) % 1 < 0.5 ? 3 : 0.3);
      // people walking, legs scissoring
      for (const p of people) {
        const s = p.s0 + p.v * (t - plan.t[0]), f = route.frameAt(s), fwd = new THREE.Vector3(f.fwd.x, 0, f.fwd.z).normalize(), right = new THREE.Vector3(f.right.x, 0, f.right.z).normalize();
        p.g.matrix.makeBasis(right.clone().negate(), UP, fwd).setPosition(f.pos.clone().addScaledVector(f.right, p.lateral).add(new THREE.Vector3(0, 0.15, 0)));
        if (!p.stand) {
          const sw = 0.5 * Math.sin((s - p.s0) * 4.8);
          const w = p.g.children[0]!;
          w.getObjectByName('legL')!.rotation.x = sw; w.getObjectByName('legR')!.rotation.x = -sw;
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
        (sp.material as THREE.SpriteMaterial).opacity = 0.42 * Math.sin(Math.PI * u);
      }
    },
  };
}
