// Verse 1's props (drive/sets/verse1.ts places them and the lyrics on them): the speed trailer by the road; the bus
// they tailgate, its tail ad (and the channel's own on its side), turning off right at a cross street (the light
// green, the crosswalks, the DONT WALK hand); the van ahead, closing in; her phone in her hand, lifted from her lap; the burger stand with its menu board and its marquee on a pole;
// her visor (the car's own: look/dash.ts) flipping down; and the newsstand they pass behind the bus (./newsstand). (The
// city's blocks are the drive's: blocks.ts.) Browser only (canvas).
import * as THREE from 'three';
import type { Drive } from '../../drive/drive';
import { LANE } from '../../drive/drive';
import { carMatrix, riseAt } from '../../drive/carriers';
import { AT, BUS, PACE, SIDE, VAN, busAlong, type Verse1Plan, vanAheadAt, vanThere } from '../../drive/sets/verse1';
import { ROAD_HALF } from '../../drive/route';
import { WORLD, toon } from '../../look/toon';
import { GLOW, lampMaterial } from '../../look/night';
import { drawAd } from '../../look/adart';
import { F, font } from '../../engine/type';
import { TEXT_SHARE } from '../../drive/ads';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { fuse, paint, part, sedan, tball, tbox, tcyl } from './kit';
import { buildNewsstand } from './newsstand';
import { holdPhone, lapGrip } from '../../look/cast3d';
import { LEAD } from '../../drive/shots';

const UP = new THREE.Vector3(0, 1, 0);
type Panel = Verse1Plan['panels'][keyof Verse1Plan['panels']];

/** A canvas texture `w` x `h` px drawn by `draw`. */
function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d')!);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
const box = (g: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material) => {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); return b;
};
const cyl = (g: THREE.Object3D, r: number, h: number, x: number, y: number, z: number, m: THREE.Material) => {
  const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 12), m); c.position.set(x, y, z); g.add(c); return c;
};
const plane = (g: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, m: THREE.Material) => {
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.set(x, y, z); g.add(p); return p;
};
/** A group in a panel's own frame (x along its text, y its up, z out of its face), origin at its centre. */
function onPanel(p: Panel): THREE.Group {
  const g = new THREE.Group(), along = p.up.clone().cross(p.normal).normalize();
  g.matrixAutoUpdate = false;
  g.matrix.makeBasis(along, p.up, p.normal).setPosition(p.center);
  return g;
}
const moving = () => { const g = new THREE.Group(); g.matrixAutoUpdate = false; return g; };

/** Her phone's screen round the thread (m): its status bar and his name above, the text field below; the Read receipt's
 *  width, and its gap under the last bubble. */
const PHONE = { top: 0.034, bottom: 0.022, receipt: { w: 0.07 } };
/** Her hold on it (look/cast3d.ts holdPhone): her left hand on its foot this far in from its edge on her side (m). It
 *  rests in her hand in her lap through the verse (from the cut into it to the first cut once it's back down), and she
 *  lifts it to her face over `lift` s, finished as she's on it, and lowers it after (the user, 2026-10-16: in the
 *  mirror "it just kind of clips into existence. It'd be nice if she actually brought that up from somewhere"); in her
 *  lap it's `small` of its size (it's drawn big for its close-up: full size it lay along her thigh like a tray). */
const HOLD = { inset: 0.045, lift: 0.85, small: 0.55 };
const P_GAP = 0.006;
/** The ad on the bus's street side (m, its frame: x its left, z forward): its size, its centre's height and how far
 *  forward of the middle (between the wheel arches, under the windows). */
const SIDE_AD = { w: 3.0, h: 0.68, y: 1.5, z: 0.05 };
/** The channel's ad (the user's Easter egg, 2026-10-16: "Lyrics by Desaign ... the spelling is intentional"): its
 *  logo, the neon play button the user sent (an outlined triangle glowing red at its foot, violet up its back, blue
 *  to cyan at its tip, on black), drawn here at the panel's size; the wordmark; the channel's handle under it ("the
 *  big AI callout isn't super needed ... just a nice @LyricsByDesaign would suffice", the user, 2026-10-16). */
function drawSideAd(c: CanvasRenderingContext2D, W: number, H: number) {
  const bg = c.createLinearGradient(0, 0, W, 0);
  bg.addColorStop(0, '#05030a'); bg.addColorStop(0.6, '#120a22'); bg.addColorStop(1, '#22103a');
  c.fillStyle = bg; c.fillRect(0, 0, W, H);
  // the logo: a rounded triangle, stroked with its colours round it (a conic sweep from its centre), a soft glow under
  const cx = H * 0.62, cy = H * 0.5, r = H * 0.34;
  const A = [cx - r * 0.62, cy - r * 0.95], B = [cx + r * 0.98, cy], C = [cx - r * 0.62, cy + r * 0.95];
  const g = c.createConicGradient(0, cx + r * 0.05, cy);
  for (const [at, ink] of [[0, '#7fe6ff'], [0.12, '#9a7cf6'], [0.24, '#ff5ab0'], [0.33, '#ff1f3a'], [0.45, '#ff5ab4'], [0.58, '#c472f0'], [0.68, '#8a6cff'], [0.82, '#4a62ff'], [0.93, '#46c8ff'], [1, '#7fe6ff']] as const) g.addColorStop(at, ink);
  const tri = () => { c.beginPath(); c.moveTo(A[0]!, A[1]!); c.lineTo(B[0]!, B[1]!); c.lineTo(C[0]!, C[1]!); c.closePath(); };
  c.lineJoin = 'round'; c.strokeStyle = g;
  c.save(); c.filter = `blur(${Math.round(H * 0.05)}px)`; c.globalAlpha = 1; c.lineWidth = H * 0.12; tri(); c.stroke(); c.restore();
  c.lineWidth = H * 0.065; tri(); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = H * 0.016; tri(); c.stroke(); // (its hot core)
  // the wordmark, "Lyrics by" in the film's Bodoni italic and Desaign bold, and the handle under it in the logo's
  // colours; the two centred in the room right of the logo
  const x0 = H * 1.3, room = W - x0 - H * 0.3;
  const serif = (k: number) => font(F.bodoni(700, { italic: true }), H * 0.3 * k), bold = (k: number) => font(F.archivo(100, 900), H * 0.44 * k);
  c.font = serif(1); const lead = c.measureText('Lyrics by ').width; c.font = bold(1); const tail = c.measureText('Desaign').width;
  const k = Math.min(1, (room * 0.92) / (lead + tail)), wordW = (lead + tail) * k, left = x0 + (room - wordW) / 2, base = H * 0.55;
  c.textBaseline = 'alphabetic'; c.textAlign = 'left'; c.fillStyle = '#f6f0ff';
  c.font = serif(k); c.fillText('Lyrics by', left, base);
  c.font = bold(k); c.fillText('Desaign', left + lead * k, base);
  const handle = '@LyricsByDesaign';
  c.font = font(F.archivo(100, 800), H * 0.17);
  const hw = c.measureText(handle).width, hx = left + (wordW - hw) / 2;
  const hg = c.createLinearGradient(hx, 0, hx + hw, 0); hg.addColorStop(0, '#ff7cc4'); hg.addColorStop(0.5, '#c09aff'); hg.addColorStop(1, '#8ae4ff');
  c.fillStyle = hg; c.fillText(handle, hx, H * 0.82);
}

export function buildVerse1(drive: Drive): { group: THREE.Group; update(t: number, car: THREE.Object3D): void } | null {
  const plan = drive.plans.verse1 as Verse1Plan | undefined;
  if (!plan) return null;
  const { route } = drive, P = plan.panels, root = new THREE.Group();
  /** A group in the road's frame at s (like the car's: x to the road's left, y up, z forward), `lateral` right of its
   *  centre, on its surface. */
  const onRoad = (s: number, lateral: number) => {
    const f = route.frameAt(s), g = new THREE.Group(), fwd = new THREE.Vector3(f.fwd.x, 0, f.fwd.z).normalize(), right = new THREE.Vector3(f.right.x, 0, f.right.z).normalize();
    g.matrixAutoUpdate = false;
    g.matrix.makeBasis(right.negate(), UP, fwd).setPosition(f.pos.clone().addScaledVector(f.right, lateral));
    return g;
  };
  const dark = toon({ color: WORLD.post }), black = toon({ color: '#1b1820' }), tail = lampMaterial('#ff2a24', GLOW.tail, 1.1);

  // ---- the speed trailer: its display (the lyric's rows), a header over it, on a mast on a little trailer ----
  {
    const g = onPanel(P.trailer), { w, h } = P.trailer, drop = P.trailer.center.y - P.trailer.ground;
    box(g, w + 0.24, h + 0.62, 0.14, 0, 0.19, -0.09, black);
    const head = canvasTex(512, 120, (c) => {
      c.fillStyle = '#f4f2ea'; c.fillRect(0, 0, 512, 120);
      c.fillStyle = '#16131a'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = font(F.sign(600), 60); c.fillText('YOUR SPEED', 256, 62);
    });
    plane(g, w, 0.42, 0, h / 2 + 0.27, 0.0, new THREE.MeshBasicMaterial({ map: head }));
    box(g, 0.14, drop - h / 2 - 0.1, 0.14, 0, -(drop + h / 2) / 2 - 0.05, -0.2, dark);
    box(g, 1.7, 0.5, 1.2, 0, -drop + 0.55, -0.6, toon({ color: '#e8a33a' }));
    for (const x of [-0.75, 0.75]) { const wh = cyl(g, 0.28, 0.18, x, -drop + 0.28, -0.6, black); wh.rotation.z = Math.PI / 2; }
    root.add(g);
  }
  // under the display, the trailer's live readout (the world working before the lyric hijacks the board): their real
  // speed and SLOW DOWN, blinking in turn, amber LEDs
  const readout = { planes: [] as THREE.Mesh[] };
  {
    const g = onPanel(P.trailer), { h } = P.trailer;
    box(g, 1.1, 0.4, 0.1, 0, -h / 2 - 0.33, -0.07, black);
    const led = (text: string) => {
      const tex = canvasTex(512, 160, (c) => {
        c.fillStyle = '#0e0d10'; c.fillRect(0, 0, 512, 160);
        c.fillStyle = '#ffb000'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.font = font(F.mono(700), text.length > 4 ? 72 : 120); c.fillText(text, 256, 86);
      });
      return plane(g, 1.0, 0.31, 0, -h / 2 - 0.33, -0.01, new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(1.6, 1.6, 1.6) }));
    };
    readout.planes = [led(String(Math.round(PACE.rush))), led('SLOW DOWN')];
    root.add(g);
  }

  // ---- the cross street the bus turns into: crosswalks, its asphalt, the light (green for them), the DONT WALK hand ----
  {
    const paint = new THREE.MeshBasicMaterial({ color: WORLD.dash }), asphalt = toon({ color: WORLD.asphalt }), half = 4.25;
    for (const ds of [-half - 1.4, half + 1.4]) {
      const g = onRoad(plan.crossS + ds, 0);
      for (let x = -ROAD_HALF + 0.4; x < ROAD_HALF; x += 1) box(g, 0.5, 0.02, 2.4, x, 0.03, 0, paint);
      root.add(g);
    }
    const cross = onRoad(plan.crossS, 0);
    for (const side of [-1, 1]) box(cross, 60, 0.04, 2 * half, side * (ROAD_HALF + 30), 0, 0, asphalt);
    root.add(cross);
    const mast = onRoad(plan.crossS + half + 3, ROAD_HALF + 1.4);
    cyl(mast, 0.12, 6.2, 0, 3.1, 0, dark);
    box(mast, ROAD_HALF + 3.6, 0.16, 0.16, (ROAD_HALF + 3.6) / 2, 5.9, 0, dark); // (out over the road: to its left)
    for (const x of [ROAD_HALF + 1.4 - LANE, ROAD_HALF + 1.4 + LANE]) {
      box(mast, 0.42, 1.2, 0.32, x, 5.25, 0, black);
      for (const k of [0, 1, 2]) {
        const p = plane(mast, 0.24, 0.24, x, 5.62 - k * 0.37, -0.17, k < 2 ? toon({ color: '#2a2630' }) : lampMaterial('#3dff7a', GLOW.lamp, 1.4));
        p.rotation.y = Math.PI;
      }
    }
    root.add(mast);
    const ped = onRoad(plan.crossS - half - 3, ROAD_HALF + 0.7);
    cyl(ped, 0.07, 3.2, 0, 1.6, 0, dark);
    box(ped, 0.42, 0.42, 0.3, 0, 2.7, 0, black);
    const hand = canvasTex(128, 128, (c) => {
      c.fillStyle = '#ff7a1a'; c.beginPath(); c.roundRect(38, 40, 52, 60, 10); c.fill();
      for (let i = 0; i < 4; i++) { c.beginPath(); c.roundRect(38 + i * 13.5, 14, 11, 40, 5); c.fill(); }
      c.beginPath(); c.roundRect(20, 58, 24, 11, 5); c.fill();
    });
    plane(ped, 0.34, 0.34, 0, 2.7, -0.16, new THREE.MeshBasicMaterial({ map: hand, transparent: true, color: new THREE.Color(2, 2, 2) })).rotation.y = Math.PI;
    root.add(ped);
  }

  // ---- the bus they tailgate: its tail ad (the lyric's rows over it), turning off at the cross street; on its street
  // side, the one the lens sees as it pulls out across them, the channel's own ad (drawSideAd) ----
  const bus = moving();
  {
    const BODY = '#ece6d6', INK = '#1b1820', H = BUS.half;
    // (its shell tinted and fused: one mesh, not forty — it moves, so the batcher can't merge it)
    // (the user, 2026-10-16: "increase the bus fidelity" — it was a box with a black slab down each side) its body, the
    // roof stepped in on rounded shoulders; its livery: a maroon skirt, the orange band, a rub rail, a pinstripe under
    // the windows; the windows each framed, pillars between them in its body colour, rubber above and below; the front
    // door on its curb side, split glass; wheel arches, chrome hubcaps; amber markers at its corners; a roof hatch
    const GLASS = '#2a3440', RUBBER = '#33323a', CHROME = '#c9c6bd';
    tbox(bus, 2.5, 2.6, 2 * H, 0, 0.35 + 1.3, 0, BODY);
    tbox(bus, 2.1, 0.3, 2 * H - 0.1, 0, 3.1, 0, BODY);
    for (const x of [-1.05, 1.05]) tcyl(bus, 0.2, 2 * H - 0.1, x, 2.95, 0, BODY, 10).rotation.x = Math.PI / 2;
    tbox(bus, 2.52, 0.3, 2 * H + 0.02, 0, 0.5, 0, '#7a2236');
    tbox(bus, 2.52, 0.18, 2 * H + 0.02, 0, 0.9, 0, '#e0682b');
    tbox(bus, 2.54, 0.05, 2 * H + 0.02, 0, 1.05, 0, CHROME);
    tbox(bus, 2.52, 0.04, 2 * H + 0.02, 0, 2.02, 0, '#c9a24a');
    const w0 = -H + 0.9, w1 = H - 0.3;
    tbox(bus, 2.52, 0.9, w1 - w0, 0, 2.55, (w0 + w1) / 2, GLASS); // the windows down its sides
    for (const y of [2.08, 3.02]) tbox(bus, 2.56, 0.05, w1 - w0, 0, y, (w0 + w1) / 2, RUBBER);
    for (let z = w0; z <= w1 + 0.01; z += (w1 - w0) / Math.round((w1 - w0) / 1.1)) tbox(bus, 2.56, 0.9, 0.12, 0, 2.55, z, BODY);
    { const zd = H - 0.85; // (its door, on its right: the bus's frame has x to its left)
      tbox(bus, 0.04, 2.35, 1.0, -1.265, 1.55, zd, RUBBER);
      for (const dz of [-0.24, 0.24]) { tbox(bus, 0.03, 1.05, 0.42, -1.29, 2.2, zd + dz, GLASS); tbox(bus, 0.03, 0.75, 0.42, -1.29, 1.05, zd + dz, GLASS); } }
    for (const z of [-H + 1.6, H - 1.5]) for (const x of [-1.15, 1.15]) {
      tbox(bus, 0.04, 0.78, 1.28, x * 1.093, 0.6, z, '#16141a'); // (its arch)
      tcyl(bus, 0.5, 0.28, x, 0.5, z, INK).rotation.z = Math.PI / 2;
      tcyl(bus, 0.24, 0.3, x * 1.02, 0.5, z, CHROME).rotation.z = Math.PI / 2;
      tcyl(bus, 0.08, 0.32, x * 1.03, 0.5, z, '#55525a', 8).rotation.z = Math.PI / 2;
    }
    for (const x of [-1.265, 1.265]) for (const z of [-H + 0.15, H - 0.15]) tbox(bus, 0.03, 0.08, 0.16, x, 1.25, z, '#ffb000');
    tbox(bus, 0.7, 0.08, 0.7, 0, 3.29, -0.6, '#d8d2c2');
    for (const x of [-1.05, 1.05]) plane(bus, 0.2, 0.3, x, 0.75, -H - 0.01, tail).rotation.y = Math.PI;
    // its back: the rear window over the ad, an amber route sign over that, the engine's louvres under it, a bumper, a
    // plate; an air-conditioning pod on the roof (QA: a bare box filling the frame for seconds)
    const glassM = toon({ color: '#28323c' });
    // (the window to y 3.03, the route sign's box over it from 3.05, both in front of the body: the sign's foot sat
    // inside the window's box — the user, 2026-10-14)
    tbox(bus, 2.22, 0.64, 0.03, 0, 2.71, -H - 0.005, INK);
    plane(bus, 2.1, 0.52, 0, 2.71, -H - 0.025, glassM).rotation.y = Math.PI;
    const route = canvasTex(512, 48, (c) => { c.fillStyle = '#120c06'; c.fillRect(0, 0, 512, 48); c.fillStyle = '#ffb000'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = font(F.sign(700), 34); c.fillText('210  CRENSHAW', 256, 26); });
    tbox(bus, 1.7, 0.19, 0.03, 0, 3.14, -H - 0.005, INK);
    plane(bus, 1.6, 0.15, 0, 3.14, -H - 0.025, new THREE.MeshBasicMaterial({ map: route, color: new THREE.Color(1.6, 1.6, 1.6) })).rotation.y = Math.PI;
    for (let k = 0; k < 5; k++) tbox(bus, 1.5, 0.035, 0.03, 0, 1.0 + k * 0.08, -H - 0.01, INK);
    tbox(bus, 2.56, 0.28, 0.16, 0, 0.48, -H - 0.06, INK);
    plane(bus, 0.5, 0.25, 0, 0.75, -H - 0.012, toon({ color: '#f2f1ea' })).rotation.y = Math.PI;
    tbox(bus, 1.7, 0.32, 2.2, 0, 3.41, -H + 1.9, BODY);
    const { w, h, pos } = plan.tailAd, share = TEXT_SHARE.bus ?? 0.8;
    const art = canvasTex(1024, Math.round((1024 * (h + 0.2)) / (w + 0.08)), (c) => drawAd(c, plan.busAd, c.canvas.width, c.canvas.height, share));
    plane(bus, w + 0.08, h + 0.2, 0, pos.y, -H - 0.02, new THREE.MeshBasicMaterial({ map: art })).rotation.y = Math.PI;
    // its front (seen now, as it pulls out of the side street toward the lens): the windshield in two panes, the route
    // over it lit amber, headlamps either side of a grille, a bumper, its mirrors on stalks
    tbox(bus, 2.3, 1.45, 0.03, 0, 2.35, H + 0.005, INK);
    for (const x of [-0.56, 0.56]) plane(bus, 1.04, 1.3, x, 2.35, H + 0.025, glassM);
    for (const x of [-0.5, 0.6]) tbox(bus, 0.72, 0.03, 0.02, x, 1.85, H + 0.04, INK).rotation.z = 0.45; // (its wipers)
    tbox(bus, 1.8, 0.24, 0.03, 0, 3.22, H + 0.005, INK);
    plane(bus, 1.7, 0.18, 0, 3.22, H + 0.025, new THREE.MeshBasicMaterial({ map: route, color: new THREE.Color(1.6, 1.6, 1.6) }));
    const lens = toon({ color: '#f4efd8' });
    for (const x of [-0.95, 0.95]) { tbox(bus, 0.34, 0.2, 0.04, x, 0.95, H + 0.01, INK); plane(bus, 0.28, 0.14, x, 0.95, H + 0.035, lens); }
    tbox(bus, 1.1, 0.34, 0.03, 0, 0.95, H + 0.01, INK);
    tbox(bus, 2.56, 0.28, 0.16, 0, 0.48, H + 0.06, INK);
    for (const x of [-1.4, 1.4]) { tbox(bus, 0.05, 0.05, 0.5, x, 2.6, H - 0.1, INK); tbox(bus, 0.08, 0.36, 0.2, x * 1.04, 2.4, H + 0.12, INK); }
    // the ad on its street side, in the long frame bus ads come in (a "king"), between its wheels under the windows:
    // its aluminium frame, the print in it a couple of cm proud of the panel, painted and lit as the bus is
    const A = SIDE_AD, side = 1.25;
    tbox(bus, 0.03, A.h + 0.1, A.w + 0.1, side + 0.005, A.y, A.z, '#b9b4aa');
    plane(bus, A.w, A.h, side + 0.022, A.y, A.z, paint(canvasTex(2048, Math.round((2048 * A.h) / A.w), (c) => drawSideAd(c, c.canvas.width, c.canvas.height)))).rotation.y = Math.PI / 2;
    fuse(bus);
    root.add(bus);
  }

  // ---- the side street the bus comes out of (by the speed trailer): stop signs at its corners and for their lane,
  // white stop lines across their lane and the side street's ----
  {
    const f0 = route.frameAt(plan.sideS), fwd = new THREE.Vector3(f0.fwd.x, 0, f0.fwd.z).normalize(), right = new THREE.Vector3(f0.right.x, 0, f0.right.z).normalize();
    const at = (along: number, lateral: number, y = 0) => f0.pos.clone().addScaledVector(fwd, along).addScaledVector(right, lateral).add(new THREE.Vector3(0, y, 0));
    const face = canvasTex(256, 256, (c) => {
      const oct = (r: number) => { c.beginPath(); for (let k = 0; k < 8; k++) { const a = (Math.PI / 8) * (2 * k + 1); c.lineTo(128 + r * Math.cos(a), 128 + r * Math.sin(a)); } c.closePath(); };
      oct(126); c.fillStyle = '#ffffff'; c.fill(); oct(116); c.fillStyle = '#c8102e'; c.fill();
      c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = font(F.sign(700), 74); c.fillText('STOP', 128, 134);
    });
    const faceM = new THREE.MeshBasicMaterial({ map: face, transparent: true, alphaTest: 0.5 }), backM = toon({ color: '#9a9aa0' }), post = toon({ color: '#7a7a80' });
    // (a sign: its post, its face toward `toward` (flat, unit), its plain back)
    const sign = (p: THREE.Vector3, toward: THREE.Vector3) => {
      const g = new THREE.Group(); g.position.copy(p); g.lookAt(p.clone().add(toward)); root.add(g);
      box(g, 0.07, SIDE.signH, 0.07, 0, SIDE.signH / 2, -0.04, post);
      plane(g, 0.76, 0.76, 0, SIDE.signH, 0.005, faceM);
      const back = plane(g, 0.76, 0.76, 0, SIDE.signH, -0.002, backM); back.rotation.y = Math.PI;
    };
    sign(at(-SIDE.half - SIDE.sign, ROAD_HALF + 0.6), fwd.clone().negate()); // theirs, at the line, facing them
    sign(at(SIDE.half + SIDE.sign, ROAD_HALF + 3.4), right); // the side street's, facing the bus as it comes down
    sign(at(SIDE.half + SIDE.sign, -(ROAD_HALF + 0.6)), fwd); // the oncoming lane's (a four-way stop)
    const paint = new THREE.MeshBasicMaterial({ color: WORLD.dash, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 });
    const bar = (along: number, lateral: number, across: number, deep: number, y: number) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(across, deep).rotateX(-Math.PI / 2), paint); m.position.copy(at(along, lateral, y)); m.lookAt(m.position.clone().add(fwd)); m.rotateX(0); root.add(m); return m; };
    bar(-SIDE.half - SIDE.line + 0.2, LANE, ROAD_HALF - 0.4, 0.4, 0.03); // theirs, across their lane
    { const m = bar(SIDE.lane, ROAD_HALF + 3.3, 0.4, SIDE.half - 0.4, 0.045); m.position.copy(at(SIDE.lane, ROAD_HALF + 3.3, 0.045)); } // the side street's, across its lane
  }

  // ---- the van ahead of the bus: its back doors carry the stickers, its bumper the plate (the carriers) ----
  const van = moving();
  {
    // (the user, 2026-10-17: "a quick model fidelity improvement for ... the truck we're behind" — it was a box with two
    // red planes and four drums) a '70s delivery van, a step van's tall box: its shell one section lofted down its
    // length (tucked under at the sill, upright to the belt, leaning in to rounded roof shoulders, a white roof), a brown
    // stripe round it, road grime up its flanks; its back doors two leaves (shut lines, the seam, hinges, a handle,
    // small windows high up over the stickers), tail lamps in chrome housings on its corner posts, three ID lamps over
    // the doors, a plate lamp, a chrome step bumper, mud flaps; arches with tyres, steel wheels and dog-dish hubcaps;
    // West Coast mirrors out on arms (they show either side of its back); a cab door and window each side, the sliding
    // door on its curb side, a ladder on a roof rack. Tinted and fused (it moves: the batcher can't merge it), the lamps'
    // lenses one mesh in their glow. What carries the lyric stays put: the stickers (VAN.stickersY, 2 cm off the doors —
    // nothing within their rectangle stands out further than 1 cm) and the plate (VAN.plateY, 6 cm off the back, its
    // holder 3.5 cm behind it).
    const H = VAN.half, [D0, D1] = VAN.doors;
    const PAINT = '#d9d4c7', ROOF = '#efece4', STRIPE = '#7a4a2a', DIRT = '#7d705c', RUST = '#8a4a26', CHROME = '#c9c6bd', INK = '#1b1820';
    const SHUT = '#5a554c', RUBBER = '#2b2a30', GLASS = '#2a3440', TYRE = '#1d1b20', STEEL = '#d8d4c6', ALU = '#b9b5ab';
    // its section (x its left, y up): Y0 its sill, W0 its half-width to the belt, W1 at its shoulders, their radius R
    const Y0 = 0.4, BELT = 1.3, TOP = 2.52, R = 0.22, W0 = 1.02, W1 = 0.97;
    const lean = Math.atan2(W0 - W1, TOP - R - BELT), hw = (y: number) => (y <= BELT ? W0 : W0 - (W0 - W1) * Math.min(1, (y - BELT) / (TOP - R - BELT)));
    const half: [number, number][] = [[0, Y0], [W0 - 0.06, Y0], [W0 - 0.015, Y0 + 0.015], [W0, Y0 + 0.06], [W0, 0.75], [W0, BELT], [W1, TOP - R]];
    for (let k = 1; k <= 6; k++) { const a = (k / 6) * (Math.PI / 2); half.push([W1 - R + R * Math.cos(a), TOP - R + R * Math.sin(a)]); }
    const outline = [...half, [0, TOP + 0.015] as [number, number], ...half.slice(1).reverse().map(([x, y]) => [-x, y] as [number, number])];
    const shell = part(van, new THREE.ExtrudeGeometry(new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y))), { depth: 2 * H, bevelEnabled: false }).translate(0, 0, -H), PAINT);
    { // (the roof white, its belly dark, grime up its flanks from the sill to the belt; its ends left clean)
      const g = shell.geometry, p = g.attributes.position!, n = g.attributes.normal!, c = g.attributes.color!, k = new THREE.Color(), dirt = new THREE.Color(DIRT), roof = new THREE.Color(ROOF), belly = new THREE.Color('#2a2622');
      for (let i = 0; i < p.count; i++) {
        if (Math.abs(n.getZ(i)) > 0.5) continue;
        k.setRGB(c.getX(i), c.getY(i), c.getZ(i));
        if (n.getY(i) > 0.9) k.copy(roof); else if (n.getY(i) < -0.9) k.copy(belly); else k.lerp(dirt, 0.8 * Math.min(1, Math.max(0, (1.1 - p.getY(i)) / 0.7)));
        c.setXYZ(i, k.r, k.g, k.b);
      }
    }
    /** A tinted box on a flank (side `sx`: 1 its left) at height y, standing `out` m proud of it, leaning with it. */
    const onSide = (sx: number, w: number, h: number, l: number, y: number, z: number, out: number, color: string) => {
      const b = tbox(van, w, h, l, sx * (hw(y) + out), y, z, color); b.rotation.z = sx * lean; return b;
    };
    /** A door's upright shut line on a flank from y0 to y1: upright under the belt, leaning with it above. */
    const shutLine = (sx: number, z: number, y0: number, y1: number) => {
      tbox(van, 0.012, BELT - y0, 0.014, sx * (W0 + 0.004), (y0 + BELT) / 2, z, SHUT);
      onSide(sx, 0.012, y1 - BELT, 0.014, (BELT + y1) / 2, z, 0.004, SHUT);
    };
    // the stripe, round it under the belt (behind the stickers, across the back)
    for (const sx of [1, -1]) tbox(van, 0.008, 0.12, 2 * H - 0.02, sx * (W0 + 0.002), 1.22, 0, STRIPE);
    tbox(van, 2 * W0 - 0.02, 0.12, 0.008, 0, 1.22, -H - 0.003, STRIPE);
    tbox(van, 2 * W0 - 0.02, 0.12, 0.008, 0, 1.22, H + 0.003, STRIPE);

    // ---- its back ----
    const zB = -H, dm = (D0 + D1) / 2, dh = D1 - D0, LEAF = 0.86;
    // the doors' shut lines and seam (1.2 cm proud: under the stickers' 2), the sill under them grimy
    for (const x of [-LEAF, 0, LEAF]) tbox(van, 0.014, dh, 0.02, x, dm, zB - 0.002, SHUT);
    for (const y of [D0, D1]) tbox(van, 2 * LEAF, 0.014, 0.02, 0, y, zB - 0.002, SHUT);
    tbox(van, 2 * W0 - 0.04, D0 - Y0 - 0.03, 0.008, 0, (D0 + Y0) / 2 + 0.005, zB - 0.002, '#b3a993');
    // their windows, high up, in rubber (their foot behind the top sticker)
    for (const sx of [1, -1]) { tbox(van, 0.68, 0.32, 0.016, sx * 0.42, 2.23, zB - 0.002, RUBBER); tbox(van, 0.62, 0.26, 0.016, sx * 0.42, 2.23, zB - 0.006, GLASS); }
    // hinges on the leaves' outer edges, a chrome handle and lock on the curb-side leaf under the stickers
    for (const sx of [1, -1]) for (const y of [1.35, 1.85, 2.3]) { tbox(van, 0.07, 0.13, 0.035, sx * 0.875, y, zB - 0.017, '#6f6b63'); tcyl(van, 0.014, 0.15, sx * 0.905, y, zB - 0.03, CHROME, 6); }
    tbox(van, 0.2, 0.028, 0.02, -0.25, 0.87, zB - 0.035, CHROME);
    for (const x of [-0.34, -0.16]) tbox(van, 0.025, 0.028, 0.035, x, 0.87, zB - 0.018, CHROME);
    tcyl(van, 0.016, 0.02, -0.09, 0.87, zB - 0.01, CHROME, 8).rotation.x = Math.PI / 2;
    // the plate's holder (its face 3.5 cm behind the plate: they z-fought once), the lamp's chrome hood over it
    tbox(van, 0.7, 0.36, 0.02, 0, VAN.plateY, zB - 0.015, INK);
    tbox(van, 0.16, 0.035, 0.08, 0, VAN.plateY + 0.175, zB - 0.04, CHROME);
    // the tail lamps' chrome housings on the corner posts (their lenses below), reversing lamps under them
    for (const sx of [1, -1]) { tbox(van, 0.14, 0.62, 0.04, sx * 0.945, 0.86, zB - 0.012, CHROME); tbox(van, 0.1, 0.12, 0.012, sx * 0.945, 0.66, zB - 0.035, '#ece8da'); }
    // the ID lamps' bases over the doors, the corner clearance lamps'
    for (const x of [-0.2, 0, 0.2]) tbox(van, 0.11, 0.06, 0.012, x, 2.468, zB - 0.006, CHROME);
    for (const sx of [1, -1]) tbox(van, 0.09, 0.07, 0.012, sx * 0.93, 2.36, zB - 0.006, CHROME);
    // the step bumper: chrome, a rubber tread on top, black brackets under; its ends wrapping round
    tbox(van, 2.12, 0.12, 0.1, 0, 0.38, zB - 0.07, '#e2e0da');
    tbox(van, 2.13, 0.022, 0.104, 0, 0.405, zB - 0.07, '#f7f6f1');
    tbox(van, 2.08, 0.03, 0.08, 0, 0.307, zB - 0.065, INK);
    tbox(van, 0.7, 0.012, 0.08, 0, 0.446, zB - 0.07, RUBBER);
    for (const sx of [1, -1]) { tbox(van, 0.06, 0.15, 0.16, sx * 1.03, 0.37, zB + 0.02, CHROME); tbox(van, 0.08, 0.1, 0.12, sx * 0.55, 0.26, zB - 0.04, INK); }
    // grime and rust: streaks down the corner posts, rust at the doors' feet and the sill's corners
    for (const sx of [1, -1]) for (const [x, y, h] of [[0.93, 1.75, 0.5], [0.97, 1.6, 0.35]] as const) tbox(van, 0.018, h, 0.006, sx * x, y, zB - 0.003, '#a99d86');
    for (const [x, y, w, h] of [[0.7, D0 + 0.02, 0.1, 0.035], [-0.62, D0 + 0.015, 0.06, 0.025], [0.96, 0.47, 0.07, 0.06], [-0.95, 0.5, 0.05, 0.08]] as const) tbox(van, w, h, 0.016, x, y, zB - 0.004, RUST);
    // under it: the mud flaps behind the rear wheels, the axle and its pumpkin, the tailpipe out on the curb side
    const zR = -H + 1.0, zF = H - 0.95;
    for (const sx of [1, -1]) tbox(van, 0.24, 0.36, 0.012, sx * 0.9, 0.25, zR - 0.55, INK);
    tcyl(van, 0.05, 1.7, 0, 0.38, zR, '#2a2622', 8).rotation.z = Math.PI / 2;
    tball(van, 0.13, 0.1, 0.37, zR, '#2a2622');
    tcyl(van, 0.032, 0.5, -0.72, 0.23, zB + 0.15, '#57524a', 8).rotation.x = Math.PI / 2;

    // ---- its wheels: in their arches (dark half-discs, a lip round each, rust on the rear ones' lips), tyres a
    // centimetre proud, steel wheels in its body colour, chrome dog-dish caps ----
    for (const z of [zR, zF]) for (const sx of [1, -1]) {
      const arch = part(van, new THREE.CylinderGeometry(0.47, 0.47, 0.012, 14, 1, false, 0, Math.PI), '#16141a', sx * W0, 0.38, z); arch.rotation.z = Math.PI / 2;
      const lip = part(van, new THREE.TorusGeometry(0.47, 0.022, 5, 14, Math.PI), PAINT, sx * (W0 + 0.004), 0.38, z); lip.rotation.y = Math.PI / 2;
      tcyl(van, 0.38, 0.22, sx * 0.92, 0.38, z, TYRE, 18).rotation.z = Math.PI / 2;
      tcyl(van, 0.25, 0.012, sx * 1.034, 0.38, z, STEEL, 16).rotation.z = Math.PI / 2;
      tcyl(van, 0.18, 0.02, sx * 1.044, 0.38, z, CHROME, 16).rotation.z = Math.PI / 2;
      tcyl(van, 0.055, 0.02, sx * 1.058, 0.38, z, '#8a8780', 10).rotation.z = Math.PI / 2;
      if (z === zR) for (const a of [0.5, 2.5]) tbox(van, 0.012, 0.035, 0.07, sx * (W0 + 0.012), 0.38 + 0.48 * Math.sin(a), z + 0.48 * Math.cos(a), RUST).rotation.x = Math.PI / 2 - a;
    }

    // ---- its flanks: a cab door each side, its window and vent wing, a handle; a cargo window on its left; the
    // sliding door on its curb side (right), its window, handle and track; marker lamps fore and aft; the mirrors ----
    const cab0 = 0.2, cab1 = 1.12;
    for (const sx of [1, -1]) {
      for (const z of [cab0, cab1]) shutLine(sx, z, 0.5, 2.2);
      onSide(sx, 0.012, 0.6, 0.98, 1.85, (cab0 + cab1) / 2, 0.003, RUBBER);
      onSide(sx, 0.016, 0.54, 0.92, 1.85, (cab0 + cab1) / 2, 0.006, GLASS);
      onSide(sx, 0.02, 0.54, 0.02, 1.85, cab1 - 0.26, 0.012, RUBBER); // (the vent wing's divider)
      tbox(van, 0.04, 0.03, 0.14, sx * (W0 + 0.01), 1.36, cab0 + 0.14, CHROME);
      tbox(van, 0.012, 0.07, 0.04, sx * (W0 + 0.004), 0.95, -H + 0.12, PAINT); // (the rear marker's base: its lens below)
      onSide(sx, 0.012, 0.06, 0.05, 2.2, H - 0.12, 0.004, '#ffb000');
      // the West Coast mirror: a tall head out on two arms
      for (const y of [1.62, 1.92]) tcyl(van, 0.012, 0.28, sx * (W0 + 0.1), y, cab1 + 0.08, CHROME, 6).rotation.z = Math.PI / 2;
      tbox(van, 0.04, 0.4, 0.17, sx * (W0 + 0.24), 1.77, cab1 + 0.08, INK);
      tbox(van, 0.01, 0.36, 0.14, sx * (W0 + 0.262), 1.77, cab1 + 0.08, '#8fa0ad');
    }
    onSide(1, 0.012, 0.62, 1.1, 1.85, -0.9, 0.003, RUBBER); onSide(1, 0.016, 0.56, 1.04, 1.85, -0.9, 0.006, GLASS);
    { const s0 = -1.05, s1 = 0.12, sx = -1;
      for (const z of [s0, s1]) shutLine(sx, z, 0.46, 2.2);
      tbox(van, 0.012, 0.014, s1 - s0, sx * (W0 + 0.004), 0.47, (s0 + s1) / 2, SHUT);
      onSide(sx, 0.012, 0.6, 0.98, 1.85, (s0 + s1) / 2, 0.003, RUBBER); onSide(sx, 0.016, 0.54, 0.92, 1.85, (s0 + s1) / 2, 0.006, GLASS);
      tbox(van, 0.04, 0.03, 0.16, sx * (W0 + 0.01), 1.28, s1 - 0.12, CHROME);
      tbox(van, 0.014, 0.025, H + s0 - 0.2, sx * (hw(1.4) + 0.006), 1.4, (-H + 0.2 + s0) / 2, '#4a463f'); // (its track, aft)
      tbox(van, 0.012, 0.09, 0.22, sx * (W0 + 0.004), 0.6, s0 + 0.2, RUST); }

    // ---- its front (seen least): the windshield in two panes, a grille between round headlamps, a chrome bumper ----
    tbox(van, 1.84, 0.7, 0.012, 0, 1.86, H + 0.003, RUBBER);
    tbox(van, 1.78, 0.64, 0.016, 0, 1.86, H + 0.006, GLASS);
    tbox(van, 0.04, 0.66, 0.02, 0, 1.86, H + 0.01, RUBBER);
    tbox(van, 1.1, 0.32, 0.016, 0, 0.92, H + 0.006, INK);
    for (const x of [-0.75, 0.75]) { tcyl(van, 0.1, 0.02, x, 0.92, H + 0.01, CHROME, 14).rotation.x = Math.PI / 2; tcyl(van, 0.08, 0.02, x, 0.92, H + 0.02, '#f4efd8', 14).rotation.x = Math.PI / 2; }
    tbox(van, 2.1, 0.14, 0.1, 0, 0.42, H + 0.05, CHROME);

    // ---- on its roof: a vent, the rack (rails on posts, cross bars), an aluminium ladder lashed to it ----
    tbox(van, 0.5, 0.08, 0.5, -0.3, TOP + 0.04, 0.8, '#d7d3ca');
    for (const sx of [1, -1]) {
      for (const z of [-1.9, -0.6, 0.7, 1.9]) tbox(van, 0.03, 0.14, 0.03, sx * 0.8, TOP + 0.06, z, INK);
      tcyl(van, 0.02, 3.86, sx * 0.8, TOP + 0.13, 0, INK, 6).rotation.x = Math.PI / 2;
    }
    for (const z of [-1.9, -0.6, 0.7, 1.9]) tcyl(van, 0.018, 1.62, 0, TOP + 0.13, z, INK, 6).rotation.z = Math.PI / 2;
    for (const x of [0.12, 0.54]) tbox(van, 0.04, 0.05, 3.7, x, TOP + 0.175, 0.05, ALU);
    for (let z = -1.7; z <= 1.8; z += 0.3) tbox(van, 0.42, 0.025, 0.03, 0.33, TOP + 0.175, z, ALU);
    fuse(van);

    // the lamps' lenses, lit as the bus's are: the tail lamps, the ID and clearance lamps, the rear markers; the plate's
    const red: THREE.BufferGeometry[] = [], lens = (w: number, h: number, d: number, x: number, y: number, z: number) => red.push(new THREE.BoxGeometry(w, h, d).translate(x, y, z));
    for (const sx of [1, -1]) { lens(0.1, 0.4, 0.012, sx * 0.945, 0.96, zB - 0.037); lens(0.07, 0.04, 0.02, sx * 0.93, 2.36, zB - 0.018); lens(0.02, 0.05, 0.09, sx * (W0 + 0.01), 0.95, -H + 0.12); }
    for (const x of [-0.2, 0, 0.2]) lens(0.08, 0.04, 0.03, x, 2.468, zB - 0.017);
    van.add(new THREE.Mesh(mergeGeometries(red, false)!, tail));
    van.add(new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.006, 0.05).translate(0, VAN.plateY + 0.157, zB - 0.045), lampMaterial('#fff2d8', GLOW.tail, 1.0)));
    root.add(van);
  }

  // ---- her phone, in her hand: the screen's rows are the carriers; the phone round them; the Read receipt under the
  // last sent bubble (he's seen them and said nothing) ----
  const phone = moving(), grip = new THREE.Matrix4(), gripLocal = new THREE.Matrix4();
  let slab!: THREE.Group;
  let receipt!: THREE.Mesh;
  {
    const p = plan.phone, along = p.up.clone().cross(p.normal).normalize();
    slab = new THREE.Group();
    slab.matrixAutoUpdate = false;
    slab.matrix.makeBasis(along, p.up, p.normal).setPosition(p.pos);
    // (its screen: a status bar and his name over the thread, the text field under it; the bubbles are the carriers)
    const P = PHONE, H = p.h + P.top + P.bottom, mid = (P.top - P.bottom) / 2;
    const body = new THREE.Mesh(new THREE.BoxGeometry(p.w + 0.024, H + 0.03, 0.012), toon({ color: '#121016' }));
    body.position.set(0, mid, -0.008); slab.add(body);
    const px = 512 / p.w, screen = canvasTex(512, Math.round(H * px), (c) => {
      const w = 512, h = c.canvas.height, top = P.top * px, bottom = P.bottom * px;
      // the wallpaper: a photo of the sun going down over the hills, palms along the foot (the user, 2026-10-14: the
      // first one — stars that ran in a line, a flat disc of a moon — "looks kind of weird")
      const sky = c.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#120c24'); sky.addColorStop(0.42, '#4a1f52'); sky.addColorStop(0.7, '#b4475a'); sky.addColorStop(0.79, '#f08a5a'); sky.addColorStop(0.84, '#f6b34a');
      c.fillStyle = sky; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(255,255,255,0.4)'; for (let k = 1; k <= 26; k++) { const x = ((k * 0.7548776662) % 1) * w, y = top + ((k * 0.5698402910) % 1) * h * 0.32; c.beginPath(); c.arc(x, y, 1 + ((k * 0.37) % 1), 0, Math.PI * 2); c.fill(); } // a few stars high up
      const hz = h * 0.8;
      c.fillStyle = '#ffe4a8'; c.beginPath(); c.arc(w * 0.62, hz, w * 0.1, Math.PI, 0); c.fill(); // the sun, half down
      c.fillStyle = '#2a1830'; c.beginPath(); c.moveTo(0, h); c.lineTo(0, hz + h * 0.02); c.quadraticCurveTo(w * 0.2, hz - h * 0.05, w * 0.42, hz + h * 0.01); c.quadraticCurveTo(w * 0.7, hz - h * 0.06, w, hz + h * 0.015); c.lineTo(w, h); c.closePath(); c.fill(); // the hills' line
      c.fillStyle = '#160e1c'; // the palms, over the hills
      for (const [px, ph, lean] of [[w * 0.12, h * 0.3, 0.03], [w * 0.84, h * 0.27, -0.04], [w * 0.3, h * 0.2, 0.05]] as const) {
        const tp = h - ph;
        c.beginPath(); c.moveTo(px - 4, h); c.lineTo(px + 4, h); c.lineTo(px + 3 + lean * ph, tp); c.lineTo(px - 3 + lean * ph, tp); c.closePath(); c.fill();
        for (let f = 0; f < 7; f++) { const a = -Math.PI * 0.9 + (f / 6) * Math.PI * 0.8; c.save(); c.translate(px + lean * ph, tp); c.rotate(a); c.beginPath(); c.ellipse(w * 0.07, 0, w * 0.075, w * 0.016, 0, 0, Math.PI * 2); c.fill(); c.restore(); }
      }
      c.fillStyle = 'rgba(11,11,16,0.85)'; c.fillRect(0, 0, w, top); c.fillRect(0, h - bottom, w, bottom); // the bars, dark
      c.fillStyle = '#e8e8ee'; c.textBaseline = 'middle'; c.font = font(F.sign(600), top * 0.22); c.textAlign = 'left'; c.fillText('7:41', w * 0.08, top * 0.18);
      c.fillRect(w * 0.82, top * 0.12, w * 0.09, top * 0.12); c.fillStyle = '#0b0b10'; c.fillRect(w * 0.905, top * 0.15, w * 0.006, top * 0.06); // (the battery)
      c.fillStyle = '#5a5f6e'; c.beginPath(); c.arc(w / 2, top * 0.5, top * 0.17, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#e8e8ee'; c.textAlign = 'center'; c.font = font(F.sign(500), top * 0.17); c.fillText('Him', w / 2, top * 0.82);
      c.fillStyle = '#26262e'; c.fillRect(0, top - 2, w, 2);
      c.strokeStyle = '#3a3a46'; c.lineWidth = 3; c.beginPath(); c.roundRect(w * 0.06, h - bottom * 0.78, w * 0.74, bottom * 0.56, bottom * 0.28); c.stroke();
      c.fillStyle = '#5a5f6e'; c.textAlign = 'left'; c.font = font(F.sign(400), bottom * 0.26); c.fillText('iMessage', w * 0.11, h - bottom * 0.5);
      c.fillStyle = '#2f7cf6'; c.beginPath(); c.arc(w * 0.88, h - bottom * 0.5, bottom * 0.26, 0, Math.PI * 2); c.fill();
    });
    // (as bright as the bubbles' panels: lit displays are drawn at 1.6, world.ts buildCarrier — no seam round the thread)
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(p.w + 0.01, H), new THREE.MeshBasicMaterial({ map: screen, color: new THREE.Color(1.6, 1.6, 1.6) }));
    glass.position.set(0, mid, -0.0015); slab.add(glass);
    // her hand on it — hers, her left, from her arm (the user, 2026-10-15: the phone's own hand "reads as floating"): at
    // its foot, on her side, the thumb round onto the text field (never over the thread); where, in the car's body
    // (the phone rides it as she does: the slab's frame, at its back's foot)
    gripLocal.makeTranslation(p.w / 2 + 0.012 - HOLD.inset, -p.h / 2 - P.bottom - 0.015, -0.014);
    grip.copy(slab.matrix).multiply(gripLocal);
    gripLocal.invert(); // (the phone from her grip on it)
    // the Read receipt: grey, small, right-aligned with the bubbles' right edge (carrierart.ts: 0.96 of the face's width)
    const readTex = canvasTex(512, 64, (c) => {
      c.fillStyle = '#8f96a8'; c.textAlign = 'right'; c.textBaseline = 'middle';
      c.font = font(F.sign(500), 34); c.fillText('Read 7:41 PM', 506, 34);
    });
    receipt = new THREE.Mesh(new THREE.PlaneGeometry(P.receipt.w, P.receipt.w / 8), new THREE.MeshBasicMaterial({ map: readTex, transparent: true, color: new THREE.Color(1.3, 1.3, 1.3) }));
    receipt.position.set(p.w * 0.46 - P.receipt.w / 2, 0, 0.002);
    slab.add(receipt);
    phone.add(slab);
    root.add(phone);
  }

  // ---- the one oncoming car, past them in the other lane during the radio's insert ----
  const oncoming = moving();
  oncoming.add(sedan({ color: '#6a7d5a' }));
  root.add(oncoming);

  // ---- the burger stand: its building and roof sign, the menu board on posts, the marquee up on its pole ----
  {
    const s0 = plan.menuS, bldg = onRoad(s0 + 4, ROAD_HALF + 6.5);
    box(bldg, 5, 3.4, 12, 0, 1.7, 0, toon({ color: '#f6dd8f' }));
    box(bldg, 5.1, 0.35, 12.1, 0, 3.3, 0, toon({ color: '#d23a2a' }));
    box(bldg, 0.05, 1.2, 2.4, 2.53, 1.6, -2, black); // its window, on the road (its left)
    const sign = canvasTex(1024, 256, (c) => {
      c.fillStyle = '#d23a2a'; c.fillRect(0, 0, 1024, 256); c.fillStyle = '#fff1d0'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = font(F.sign(700), 150); c.fillText('BURGERS', 400, 136);
      // a burger beside the name (the user: a burger somewhere on the burger store): bun, lettuce, cheese, patty, bun
      const bx = 870, by = 128;
      c.fillStyle = '#e8a04a'; c.beginPath(); c.ellipse(bx, by - 46, 110, 48, 0, Math.PI, 0); c.fill(); // the top bun
      c.fillStyle = '#fff1d0'; for (const [dx, dy] of [[-50, -70], [-10, -82], [35, -72], [70, -56]] as const) { c.beginPath(); c.ellipse(bx + dx, by + dy, 7, 4, -0.4, 0, Math.PI * 2); c.fill(); } // sesame
      c.fillStyle = '#4caf50'; c.beginPath(); for (let i = 0; i <= 12; i++) { const x = bx - 120 + i * 20; c.lineTo(x, by - 46 + (i % 2 ? 14 : 2)); } c.lineTo(bx + 120, by - 30); c.lineTo(bx - 120, by - 30); c.closePath(); c.fill(); // lettuce
      c.fillStyle = '#ffb21a'; c.beginPath(); c.moveTo(bx - 112, by - 32); c.lineTo(bx + 112, by - 32); c.lineTo(bx + 118, by - 10); c.lineTo(bx + 80, by - 4); c.lineTo(bx - 118, by - 10); c.closePath(); c.fill(); // cheese
      c.fillStyle = '#5a2a1a'; c.beginPath(); c.roundRect(bx - 108, by - 18, 216, 34, 14); c.fill(); // the patty
      c.fillStyle = '#e8a04a'; c.beginPath(); c.roundRect(bx - 112, by + 14, 224, 38, 16); c.fill(); // the bottom bun
    });
    plane(bldg, 7, 1.75, 2.2, 4.6, 0, new THREE.MeshBasicMaterial({ map: sign })).rotation.y = Math.PI / 2;
    box(bldg, 0.12, 1.2, 0.12, 2.06, 3.6, -2.8, dark); box(bldg, 0.12, 1.2, 0.12, 2.06, 3.6, 2.8, dark); // (its posts behind it)
    root.add(bldg);
    // the menu board: dark, framed, on two posts, MENU over it
    const m = onPanel(P.menu), { w, h } = P.menu, drop = P.menu.center.y - P.menu.ground;
    box(m, w + 0.2, h + 0.5, 0.1, 0, 0.15, -0.07, toon({ color: '#3a2a22' }));
    const head = canvasTex(512, 96, (c) => {
      c.fillStyle = '#d23a2a'; c.fillRect(0, 0, 512, 96); c.fillStyle = '#fff1d0'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = font(F.sign(600), 60); c.fillText('MENU', 256, 52);
    });
    plane(m, w, 0.32, 0, h / 2 + 0.2, 0.0, new THREE.MeshBasicMaterial({ map: head }));
    for (const x of [-w / 2 + 0.2, w / 2 - 0.2]) box(m, 0.1, drop - h / 2, 0.1, x, -(drop + h / 2) / 2, -0.1, dark);
    root.add(m);
    // the marquee: changeable letters on a lit board in a red frame, BURGERS over it, up on its pole
    const q = onPanel(P.marquee), qw = P.marquee.w, qh = P.marquee.h, qdrop = P.marquee.center.y - P.marquee.ground;
    box(q, qw + 0.3, qh + 0.3, 0.3, 0, 0, -0.17, toon({ color: '#d23a2a' }));
    const top = canvasTex(1024, 256, (c) => {
      c.fillStyle = '#ffd65a'; c.fillRect(0, 0, 1024, 256); c.fillStyle = '#d23a2a'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = font(F.sign(700), 176); c.fillText('BURGERS', 512, 136);
    });
    plane(q, qw + 0.3, 0.95, 0, qh / 2 + 0.62, -0.02, new THREE.MeshBasicMaterial({ map: top, color: new THREE.Color(1.3, 1.3, 1.3) }));
    box(q, 0.3, qdrop - qh / 2 - 0.15, 0.3, 0, -(qdrop + qh / 2) / 2 - 0.07, -0.2, dark);
    root.add(q);
  }

  // ---- the newsstand up the street (the user's Easter egg: his other video's magazine on its racks) ----
  buildNewsstand(drive, root);

  // her phone's time in her lap: from the cut into the verse to the first cut after it's back down at the end
  const cuts = drive.shots.filter((x) => x.move === 'cut').map((x) => (typeof x.at === 'number' ? x.at : x.at.start - LEAD));
  const last = plan.phone.held[plan.phone.held.length - 1]![1] + HOLD.lift;
  const inLap: [number, number] = [Math.max(-Infinity, ...cuts.filter((c) => c <= plan.start)), Math.min(Infinity, ...cuts.filter((c) => c >= last))];
  const LAP = lapGrip(), lap = new THREE.Matrix4(), now = new THREE.Matrix4(), _k = new THREE.Matrix4(), _one = new THREE.Vector3(1, 1, 1);
  const _p0 = new THREE.Vector3(), _p1 = new THREE.Vector3(), _q0 = new THREE.Quaternion(), _q1 = new THREE.Quaternion(), _s = new THREE.Vector3();

  /** The bus at t: waiting at its stop, pulling out ahead of them into their lane, riding ahead of them until it
   *  turns, then on and round the corner into the cross street. */
  const busMatrix = (t: number): THREE.Matrix4 => {
    if (t < plan.joinAt) {
      // down the side street, rolling over its line without stopping (drive/sets/verse1.ts busAlong), on along its turn
      // into their lane, coming up to their speed, eased onto its place a tailgate's length ahead of them as it joins
      const f0 = route.frameAt(plan.sideS), fwd = new THREE.Vector3(f0.fwd.x, 0, f0.fwd.z).normalize(), right = new THREE.Vector3(f0.right.x, 0, f0.right.z).normalize();
      const at = (along: number, lateral: number) => f0.pos.clone().addScaledVector(fwd, along).addScaledVector(right, lateral);
      const pose = (p: THREE.Vector3, head: THREE.Vector3) => new THREE.Matrix4().makeBasis(UP.clone().cross(head).normalize(), UP, head).setPosition(p);
      const R = SIDE.R, straight = SIDE.wait - LANE - R, arc = (Math.PI / 2) * R, lane0 = plan.sideS + SIDE.lane + R;
      const own = busAlong(plan, t);
      const ride = straight + arc + drive.motion.distanceAt(t) + plan.busAhead - lane0;
      const w = Math.min(1, Math.max(0, (t - (plan.joinAt - 1.5)) / 1.5)), d = own + (ride - own) * w * w * (3 - 2 * w);
      if (d < straight) return pose(at(SIDE.lane, SIDE.wait - d), right.clone().negate());
      if (d < straight + arc) {
        const a = (d - straight) / R, C = at(SIDE.lane + R, LANE + R);
        return pose(C.clone().addScaledVector(fwd, -R * Math.cos(a)).addScaledVector(right, -R * Math.sin(a)), fwd.clone().multiplyScalar(Math.sin(a)).addScaledVector(right, -Math.cos(a)).normalize());
      }
      const f = route.frameAt(lane0 + d - straight - arc), fw = new THREE.Vector3(f.fwd.x, 0, f.fwd.z).normalize();
      return pose(f.pos.clone().addScaledVector(f.right, LANE), fw);
    }
    if (t <= plan.turnAt) return carMatrix(drive.carFrame(t, plan.busAhead));
    const f = drive.carFrame(plan.turnAt, plan.busAhead), fwd = new THREE.Vector3(f.fwd.x, 0, f.fwd.z).normalize(), right = new THREE.Vector3(f.right.x, 0, f.right.z).normalize();
    const d = (t - plan.turnAt) * PACE.cruise, arc = (BUS.R * Math.PI) / 2, C = f.pos.clone().addScaledVector(fwd, BUS.lead).addScaledVector(right, BUS.R);
    let pos: THREE.Vector3, head: THREE.Vector3;
    if (d < BUS.lead) { pos = f.pos.clone().addScaledVector(fwd, d); head = fwd; }
    else if (d < BUS.lead + arc) {
      const a = (d - BUS.lead) / BUS.R;
      pos = C.clone().addScaledVector(right, -BUS.R * Math.cos(a)).addScaledVector(fwd, BUS.R * Math.sin(a));
      head = fwd.clone().multiplyScalar(Math.cos(a)).addScaledVector(right, Math.sin(a));
    } else { pos = C.clone().addScaledVector(fwd, BUS.R).addScaledVector(right, d - BUS.lead - arc); head = right; }
    return new THREE.Matrix4().makeBasis(UP.clone().cross(head).normalize(), UP, head).setPosition(pos);
  };
  return {
    group: root,
    update(t, car) {
      // (they're only there for the verse: the bus from its stop, the van once the bus is out of its way)
      bus.visible = t >= plan.busFrom && t < plan.turnAt + BUS.gone;
      if (bus.visible) bus.matrix.copy(busMatrix(t));
      van.visible = vanThere(plan, t);
      if (van.visible) van.matrix.copy(carMatrix(drive.carFrame(t, vanAheadAt(plan, t))));
      // (on the car's body, as she is: lifted and rocked with it on its hydraulics, in her hand: resting in her lap,
      // lifted to her face and lowered again, eased; her hand on it all the while)
      const body = car.getObjectByName('body')!, her = body.getObjectByName('her');
      body.updateMatrix();
      phone.matrix.multiplyMatrices(car.matrix, body.matrix);
      phone.visible = t >= inLap[0] && t < inLap[1];
      const u = plan.phone.held.reduce((m, [a, b]) => Math.max(m, Math.min(1, (t - a + HOLD.lift) / HOLD.lift, (b + HOLD.lift - t) / HOLD.lift)), 0);
      const e = u < 0.5 ? 4 * u * u * u : 1 - 4 * (1 - u) * (1 - u) * (1 - u);
      if (her && phone.visible) {
        her.updateMatrix();
        lap.multiplyMatrices(her.matrix, LAP);
        lap.decompose(_p0, _q0, _s); grip.decompose(_p1, _q1, _s);
        // (on a little arc: up off her lap before it comes forward to her face)
        _p0.lerp(_p1, e).y += 0.05 * Math.sin(Math.PI * e);
        now.compose(_p0, _q0.slerp(_q1, e), _one);
        const k = HOLD.small + (1 - HOLD.small) * e;
        slab.matrix.copy(now).multiply(_k.makeScale(k, k, k)).multiply(gripLocal);
        holdPhone(body, now, 1, e);
      } else holdPhone(body, grip, 0);
      // the Read receipt, under the last sent bubble of the thread on screen
      const thread = plan.phone.held.findIndex(([a, b]) => t >= a && t < b), sent = plan.read.bubbles.filter((b) => b.thread === thread && t >= b.start);
      // (not while her next text is up but not yet sent: it would sit between them)
      const drafting = drive.carriers.some((c) => c.kind === 'phone' && t >= c.reveal && t < c.phrase.start && t >= (c.from ?? -Infinity) && t < (c.until ?? Infinity));
      receipt.visible = thread === 0 && t >= plan.read.at[thread]! && sent.length > 0 && !drafting; // (the second thread is received: no receipt)
      if (receipt.visible) { const last = sent[sent.length - 1]!; receipt.position.y = last.dy + riseAt(last.carrier, t) - P_GAP; }
      // their real speed, blinking with SLOW DOWN in turn on the trailer's readout
      const phase = Math.floor(t / 0.55) % 2;
      readout.planes.forEach((p, i) => (p.visible = i === phase));
      // the oncoming car, closing and gone
      const O = plan.oncoming, os = O.s0 - O.v * (t - O.t0);
      oncoming.visible = Math.abs(os - drive.motion.distanceAt(t)) < 90;
      if (oncoming.visible) {
        const f = route.frameAt(os), fwd = new THREE.Vector3(f.fwd.x, 0, f.fwd.z).normalize(), right = new THREE.Vector3(f.right.x, 0, f.right.z).normalize();
        // (in the other lane, nose back down the road)
        oncoming.matrix.makeBasis(right, UP, fwd.clone().negate()).setPosition(f.pos.clone().addScaledVector(f.right, -LANE));
      }
      // her visor (the car's: look/dash.ts): folded back flat, flipping down for her line, back up after; its mirror
      // only reflects while it's down
      const down = Math.min(1, Math.max(0, (t - plan.visor.down) / AT.mirror.flip)) * (1 - Math.min(1, Math.max(0, (t - plan.visor.up) / AT.mirror.flip)));
      const flap = car.getObjectByName('herVisor'), glass = car.getObjectByName('herMirror');
      if (flap) flap.rotation.x = (Math.PI / 2) * (1 - down * down * (3 - 2 * down));
      if (glass) glass.visible = down > 0.05;
    },
  };
}
