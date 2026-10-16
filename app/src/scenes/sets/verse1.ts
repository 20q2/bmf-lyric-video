// Verse 1's props (drive/sets/verse1.ts places them and the lyrics on them): the speed trailer by the road; the bus
// they tailgate, its tail ad (and the channel's own on its side), turning off right at a cross street (the light
// green, the crosswalks, the DONT WALK hand); the van ahead, closing in; her phone in her hand, lifted from her lap; the burger stand with its menu board and its marquee on a pole;
// her visor (the car's own: look/dash.ts) flipping down; and the newsstand they pass behind the bus (./newsstand). (The
// city's blocks are the drive's: blocks.ts.) Browser only (canvas).
import * as THREE from 'three';
import type { Drive } from '../../drive/drive';
import { LANE } from '../../drive/drive';
import { carMatrix, riseAt } from '../../drive/carriers';
import { AT, BUS, PACE, SIDE, VAN, type Verse1Plan, vanAheadAt, vanThere } from '../../drive/sets/verse1';
import { ROAD_HALF } from '../../drive/route';
import { WORLD, toon } from '../../look/toon';
import { GLOW, lampMaterial } from '../../look/night';
import { drawAd } from '../../look/adart';
import { F, font } from '../../engine/type';
import { TEXT_SHARE } from '../../drive/ads';
import { fuse, paint, sedan, tbox, tcyl } from './kit';
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
const wheel = (g: THREE.Object3D, r: number, x: number, z: number, m: THREE.Material) => { const w = cyl(g, r, 0.28, x, r, z, m); w.rotation.z = Math.PI / 2; };
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
const SIDE_AD = { w: 4.1, h: 0.8, y: 1.5, z: 0.05 };
/** The channel's ad (the user's Easter egg, 2026-10-16: "Lyrics by Desaign ... the spelling is intentional ...
 *  because we use AI to make our videos"): a play button with a note on it, the wordmark with its AI picked out in
 *  gold, the line under it, a wink at the end; in the film's dusk plums, so it sits in the street and never reads as
 *  a lyric. */
function drawSideAd(c: CanvasRenderingContext2D, W: number, H: number) {
  const bg = c.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#1e1033'); bg.addColorStop(0.55, '#3d1a4a'); bg.addColorStop(1, '#7a2c52');
  c.fillStyle = bg; c.fillRect(0, 0, W, H);
  // a sunset band sweeping across behind it all, and fine scan lines (a screen's)
  const band = c.createLinearGradient(0, 0, W, 0);
  band.addColorStop(0, 'rgba(240,138,90,0)'); band.addColorStop(0.5, 'rgba(240,138,90,0.28)'); band.addColorStop(1, 'rgba(246,179,74,0.5)');
  c.fillStyle = band; c.beginPath(); c.moveTo(W * 0.3, H); c.lineTo(W * 0.42, 0); c.lineTo(W, 0); c.lineTo(W, H); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.035)'; for (let y = 0; y < H; y += 8) c.fillRect(0, y, W, 3);
  // the badge: a play button in a sunset disc, an eighth note riding its rim
  const cx = H * 0.62, cy = H * 0.5, r = H * 0.34;
  const disc = c.createLinearGradient(cx - r, cy - r, cx + r, cy + r); disc.addColorStop(0, '#ff5a8a'); disc.addColorStop(1, '#f6b34a');
  c.fillStyle = disc; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#fff6e8'; c.beginPath(); c.moveTo(cx - r * 0.3, cy - r * 0.45); c.lineTo(cx + r * 0.5, cy); c.lineTo(cx - r * 0.3, cy + r * 0.45); c.closePath(); c.fill();
  const nx = cx + r * 0.95, ny = cy - r * 0.55;
  c.fillStyle = '#fff6e8'; c.beginPath(); c.ellipse(nx, ny + r * 0.5, r * 0.2, r * 0.15, -0.4, 0, Math.PI * 2); c.fill();
  c.fillRect(nx + r * 0.13, ny - r * 0.45, r * 0.07, r * 0.95);
  c.beginPath(); c.moveTo(nx + r * 0.2, ny - r * 0.45); c.quadraticCurveTo(nx + r * 0.55, ny - r * 0.2, nx + r * 0.45, ny + r * 0.15); c.quadraticCurveTo(nx + r * 0.42, ny - r * 0.12, nx + r * 0.2, ny - r * 0.2); c.closePath(); c.fill();
  // the wink at the end, a gold-ringed tag; the wordmark and its line fill the room between the badge and it
  const tagW = H * 1.3, tagX = W - H * 0.25 - tagW / 2;
  c.save(); c.translate(tagX, H * 0.5); c.rotate(-0.08);
  c.strokeStyle = '#ffc94a'; c.lineWidth = H * 0.022; c.beginPath(); c.roundRect(-tagW / 2, -H * 0.22, tagW, H * 0.44, H * 0.22); c.stroke();
  c.fillStyle = '#ffc94a'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = font(F.bodoni(700, { italic: true }), H * 0.12);
  c.fillText('yes, the AI', 0, -H * 0.065); c.fillText('is on purpose', 0, H * 0.085);
  c.restore();
  // the wordmark: "Lyrics by" in the film's Bodoni italic, Desaign bold, its "ai" gold with a spark over it (sized to
  // the room it has)
  const x0 = H * 1.3, room = tagX - tagW / 2 - H * 0.2 - x0, base = H * 0.57;
  const serif = (k: number) => font(F.bodoni(700, { italic: true }), H * 0.28 * k), bold = (k: number) => font(F.archivo(100, 900), H * 0.4 * k);
  c.font = serif(1); const lead = c.measureText('Lyrics by ').width; c.font = bold(1);
  const k = Math.min(1, room / (lead + c.measureText('Desaign').width));
  c.textBaseline = 'alphabetic'; c.textAlign = 'left';
  c.fillStyle = '#fff1dc'; c.font = serif(k); c.fillText('Lyrics by', x0, base);
  let x = x0 + lead * k;
  c.font = bold(k);
  const part = (t: string, ink: string) => { c.fillStyle = ink; c.fillText(t, x, base); x += c.measureText(t).width; };
  part('Des', '#fff1dc'); const ax = x; part('ai', '#ffc94a'); const aw = x - ax; part('gn', '#fff1dc');
  const sx = ax + aw * 0.5, sy = base - H * 0.4 * k, sr = H * 0.065; // (the spark: a four-pointed star)
  c.fillStyle = '#ffc94a'; c.beginPath();
  for (let i = 0; i < 8; i++) { const a = (Math.PI / 4) * i, rr = i % 2 ? sr * 0.3 : sr; c.lineTo(sx + rr * Math.sin(a), sy - rr * Math.cos(a)); }
  c.closePath(); c.fill();
  // the line under it, letterspaced across the wordmark's width
  const line = 'LYRIC VIDEOS, MADE WITH AI', span = x - x0;
  c.fillStyle = 'rgba(255,241,220,0.88)'; c.font = font(F.archivo(100, 600), H * 0.11);
  const plain = [...line].reduce((w, ch) => w + c.measureText(ch).width, 0), gap = Math.max(0, (span - plain) / (line.length - 1));
  let lx = x0 + H * 0.01; for (const ch of line) { c.fillText(ch, lx, H * 0.82); lx += c.measureText(ch).width + gap; }
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
    tbox(bus, 2.5, 2.9, 2 * H, 0, 0.35 + 1.45, 0, BODY);
    tbox(bus, 2.52, 0.18, 2 * H + 0.02, 0, 0.9, 0, '#e0682b');
    tbox(bus, 2.52, 0.9, 2 * H - 1.2, 0, 2.55, 0.3, INK); // the windows down its sides
    for (const z of [-H + 1.6, H - 1.5]) for (const x of [-1.15, 1.15]) tcyl(bus, 0.5, 0.28, x, 0.5, z, INK).rotation.z = Math.PI / 2;
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
    const paint = toon({ color: '#d9d4c7' }), chrome = toon({ color: WORLD.chrome }), H = VAN.half;
    box(van, 2.0, 2.0, 2 * H, 0, 0.35 + 1.0, 0, paint);
    box(van, 2.06, 0.16, 0.14, 0, 0.36, -H - 0.04, chrome);
    for (const x of [-0.9, 0.9]) plane(van, 0.14, 0.3, x, 1.0, -H - 0.01, tail).rotation.y = Math.PI;
    for (const z of [-H + 0.8, H - 0.9]) for (const x of [-0.9, 0.9]) wheel(van, 0.36, x, z, black);
    // its rear windows over the stickers, its roof's cap, the cab's side windows, its mirrors
    const glassM = toon({ color: '#28323c' });
    for (const x of [-0.47, 0.47]) plane(van, 0.82, 0.3, x, 2.13, -H - 0.012, glassM).rotation.y = Math.PI;
    box(van, 2.0, 0.08, 2 * H, 0, 2.39, 0, toon({ color: '#ece8de' }));
    box(van, 2.02, 0.5, 1.5, 0, 1.92, H - 0.95, glassM);
    for (const x of [-1.08, 1.08]) box(van, 0.08, 0.22, 0.12, x, 1.75, H - 0.45, black);
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
      // down the side street to its line, waiting there, then out: on along its turn into their lane, coming up to
      // their speed (drive/sets/verse1.ts busRamp), eased onto its place a tailgate's length ahead of them as it joins
      const f0 = route.frameAt(plan.sideS), fwd = new THREE.Vector3(f0.fwd.x, 0, f0.fwd.z).normalize(), right = new THREE.Vector3(f0.right.x, 0, f0.right.z).normalize();
      const at = (along: number, lateral: number) => f0.pos.clone().addScaledVector(fwd, along).addScaledVector(right, lateral);
      const pose = (p: THREE.Vector3, head: THREE.Vector3) => new THREE.Matrix4().makeBasis(UP.clone().cross(head).normalize(), UP, head).setPosition(p);
      if (t < plan.busPull) {
        const u = Math.min(1, Math.max(0, (plan.busArrive - t) / SIDE.approach));
        return pose(at(SIDE.lane, SIDE.wait + (SIDE.from - SIDE.wait) * u * u), right.clone().negate());
      }
      const R = SIDE.R, straight = SIDE.wait - LANE - R, arc = (Math.PI / 2) * R, lane0 = plan.sideS + SIDE.lane + R;
      const tau = t - plan.busPull, rb = plan.busRamp, v = plan.joinV, S = (x: number) => x * x * x - (x * x * x * x) / 2;
      const own = tau < rb ? v * rb * S(tau / rb) : (v * rb) / 2 + v * (tau - rb);
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
      bus.visible = t >= plan.busArrive - SIDE.approach && t < plan.turnAt + BUS.gone;
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
