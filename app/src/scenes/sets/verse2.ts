// Verse 2's props (drive/sets/verse2.ts): the fried chicken spot on the corner of Slauson — its tall pole sign at the
// curb (its name over the lightbox), the side street, chalk A-frames on the sidewalk, its white front with a red fascia,
// two big windows (painted: the carriers), the door, the banner's grommets under the eaves, the big sign on its roof
// ringed with bulbs and the chicken standing on it; the hand car wash on the right (its sign an ad: HAND WASH over the
// words, suds and a shining car right of them, the price under; its bays); his giant mural on the end wall of its
// building. The lyrics are the carriers. Browser only (canvas).
import * as THREE from 'three';
import { wallMaterial } from '../../look/walls';
import type { Drive } from '../../drive/drive';
import { GIANT, SHACK, type Verse2Plan, WASH } from '../../drive/sets/verse2';
import { ROAD_HALF } from '../../drive/route';
import { WORLD, toon } from '../../look/toon';
import { GLOW, lampMaterial } from '../../look/night';
import { F, font } from '../../engine/type';
import { ball, box, canvasTex, cyl, leftFront, onPanel, pic, plane, roadFrame, sedan, signFace } from './kit';
import { glassTex } from './chorus1';

/** The chicken: white, a red comb and wattle, an orange beak, its tail; standing at (0, y, 0) of g, facing +z. */
function chicken(g: THREE.Object3D, y: number, k = 1) {
  const white = toon({ color: '#f7f2e6' }), red = toon({ color: '#d4202e' }), orange = toon({ color: '#f29a1a' });
  for (const x of [-0.35, 0.35]) box(g, 0.1 * k, 0.9 * k, 0.1 * k, x * k, y + 0.45 * k, 0, orange); // its legs
  const body = ball(g, 1.2 * k, 0, y + 2.0 * k, 0, white); body.scale.set(1, 0.9, 1.25);
  ball(g, 0.6 * k, 0, y + 3.3 * k, 0.9 * k, white);
  for (let i = 0; i < 3; i++) box(g, 0.14 * k, 0.32 * k, 0.22 * k, 0, y + 3.95 * k, (0.75 + i * 0.2) * k, red);
  ball(g, 0.16 * k, 0, y + 2.95 * k, 1.4 * k, red).scale.set(0.7, 1.4, 0.7);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.16 * k, 0.45 * k, 10), orange); beak.rotation.x = Math.PI / 2; beak.position.set(0, y + 3.25 * k, 1.6 * k); g.add(beak);
  // its tail, a fan of three feathers; its wings folded at its sides; its eyes
  for (const a of [-0.35, 0, 0.35]) { const f = ball(g, 0.55 * k, 0, y + 2.6 * k, -1.45 * k, white); f.scale.set(0.35, 1.3, 0.55); f.rotation.x = -0.5; f.rotation.z = a; }
  for (const x of [-1, 1]) { const wing = ball(g, 0.85 * k, x * 0.95 * k, y + 2.05 * k, -0.15 * k, toon({ color: '#ece4d2' })); wing.scale.set(0.3, 0.6, 1.0); wing.rotation.x = 0.25; }
  for (const x of [-1, 1]) ball(g, 0.07 * k, x * 0.38 * k, y + 3.42 * k, 1.32 * k, toon({ color: '#141218' }));
}
/** A row of bulbs along a line in g (from a to b): each takes a material from `ms` in turn (the chase's phases). */
function bulbs(g: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, n: number, ms: readonly THREE.Material[], phase0 = 0) {
  for (let i = 0; i <= n; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), ms[(phase0 + i) % ms.length]!); s.position.copy(a.clone().lerp(b, i / n)); g.add(s); }
}

/** The mural on the end wall up the street: a painting, not his campaign's ad (the user: "lazy") — a sunset in flat
 *  bands over a row of palms, a lowrider in the foreground, the sun behind; the words (the carriers') on its left,
 *  where the sky is plain. */
function mural(c: CanvasRenderingContext2D, W: number, H: number, text: number) {
  const bands = ['#2b1b4e', '#7a3a7e', '#d9567a', '#f28a5a', '#f6b34a', '#ffd27a'];
  bands.forEach((col, i) => { c.fillStyle = col; c.fillRect(0, (H * i) / bands.length - 1, W, H / bands.length + 2); });
  const x0 = W * text, cx = x0 + (W - x0) * 0.5, horizon = H * 0.72;
  c.fillStyle = '#fff1c8'; c.beginPath(); c.arc(cx, horizon - H * 0.02, H * 0.2, 0, Math.PI * 2); c.fill(); // the sun
  c.fillStyle = '#5a2a4e'; c.fillRect(0, horizon, W, H - horizon); // the ground, dark
  c.fillStyle = '#2a1830'; // the palms, from the words' edge across
  for (let k = 0; k < 7; k++) {
    const px = x0 + (W - x0) * (0.05 + k * 0.15), lean = (k % 2 ? 1 : -1) * 0.06, h = H * (0.45 + 0.12 * ((k * 0.37) % 1)), top = horizon - h;
    c.beginPath(); c.moveTo(px - 8, horizon); c.lineTo(px + 8, horizon); c.lineTo(px + 6 + lean * h, top); c.lineTo(px - 6 + lean * h, top); c.closePath(); c.fill();
    for (let f = 0; f < 7; f++) { const a = -Math.PI * 0.85 + (f / 6) * Math.PI * 0.7; c.save(); c.translate(px + lean * h, top); c.rotate(a); c.beginPath(); c.ellipse(H * 0.07, 0, H * 0.075, H * 0.016, 0, 0, Math.PI * 2); c.fill(); c.restore(); }
  }
  // the lowrider, low in the foreground, its candy red and whitewalls
  const cw = (W - x0) * 0.55, ch = cw * 0.22, lx = cx - cw / 2, ly = H * 0.86;
  c.fillStyle = '#c8102e'; c.beginPath(); c.roundRect(lx, ly - ch, cw, ch, ch * 0.3); c.fill(); c.beginPath(); c.roundRect(lx + cw * 0.28, ly - ch * 1.7, cw * 0.42, ch * 0.8, ch * 0.3); c.fill();
  c.fillStyle = '#1d2026'; c.fillRect(lx + cw * 0.31, ly - ch * 1.6, cw * 0.36, ch * 0.55);
  for (const wx of [lx + cw * 0.22, lx + cw * 0.78]) { c.fillStyle = '#1d2026'; c.beginPath(); c.arc(wx, ly, ch * 0.42, 0, Math.PI * 2); c.fill(); c.fillStyle = '#f4efe4'; c.beginPath(); c.arc(wx, ly, ch * 0.28, 0, Math.PI * 2); c.fill(); c.fillStyle = '#aaa498'; c.beginPath(); c.arc(wx, ly, ch * 0.14, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = '#aaa498'; c.fillRect(lx - cw * 0.02, ly - ch * 0.35, cw * 1.04, ch * 0.1);
  // weathering: the paint worn in patches
  c.fillStyle = 'rgba(90,42,78,0.12)'; for (let k = 0; k < 40; k++) { const u = (k * 0.618) % 1, v = (k * 0.381) % 1; c.beginPath(); c.ellipse(u * W, v * H, W * 0.03 * (0.5 + ((k * 0.7) % 1)), H * 0.02, u * 3, 0, Math.PI * 2); c.fill(); }
}

export function buildVerse2(drive: Drive): { group: THREE.Group; update(t: number): void } | null {
  const plan = drive.plans.verse2 as Verse2Plan | undefined;
  if (!plan) return null;
  const drifting: THREE.Mesh[] = [];
  const { route } = drive, root = new THREE.Group(), onRoad = roadFrame(route, root), front = leftFront(route, root);
  const dark = toon({ color: WORLD.post }), red = '#c8202e';
  // the roof sign's bulbs chase in three phases on the half-beat (classic chicken-shack energy)
  const chase = [0, 1, 2].map(() => lampMaterial('#ffe08a', GLOW.lamp, 0.9));
  const name = (text: string, w: number, h: number, ink = '#fff6e0', bg = red) => pic(signFace(text, 1024, Math.round((1024 * h) / w), ink, bg, F.sign(700), 0.56, 0.12));
  const orange = '#d9651f';

  // ---- the pole sign at the curb: its name over the lightbox (the lyric's: the carriers), a chicken on top, up on a
  // pole ----
  {
    const P = plan.pole, g = onPanel(P), drop = P.center.y - route.frameAt(P.s).pos.y;
    box(g, P.w + 0.4, P.h + 0.4, 0.5, 0, 0, -0.27, toon({ color: orange }));
    plane(g, P.w + 0.4, 1.3, 0, P.h / 2 + 0.9, 0.0, name('HANDLE IT HARDWARE', P.w + 0.4, 1.3, '#fff6e0', orange));
    box(g, P.w + 0.4, 1.3, 0.5, 0, P.h / 2 + 0.9, -0.27, toon({ color: '#a84e18' }));
    { // a wrench on top, a hardware store's mark
      const steel = toon({ color: '#c9c4b8' }), wr = new THREE.Group(); wr.position.set(0, P.h / 2 + 1.55 + 0.9, -0.27); wr.rotation.z = -0.5; g.add(wr);
      box(wr, 0.22, 1.6, 0.12, 0, 0, 0, steel);
      for (const dy of [-1, 1]) { const head = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.12, 12), steel); head.rotation.x = Math.PI / 2; head.position.set(0, dy * 0.95, 0); wr.add(head); box(wr, 0.26, 0.3, 0.14, 0, dy * 1.12, 0, toon({ color: orange })); }
    }
    cyl(g, 0.2, drop - P.h / 2 - 0.2, 0, -(drop + P.h / 2 + 0.2) / 2, -0.27, dark);
    root.add(g);
  }

  // ---- the side street (Slauson): its asphalt off to the left, a crosswalk across its mouth ----
  {
    const C = plan.corner, asphalt = toon({ color: WORLD.asphalt }), paint = new THREE.MeshBasicMaterial({ color: WORLD.dash });
    box(onRoad(C.s, 0), 150, 0.04, C.w, ROAD_HALF + 75, 0.0, 0, asphalt); // (x: the road's left; on past the rows behind the street)
    for (let x = ROAD_HALF + 8; x < 150; x += 6) box(onRoad(C.s, 0), 3, 0.02, 0.15, x, 0.03, 0, paint); // its centre dashes
    const walk = onRoad(C.s, -ROAD_HALF - 1.6);
    for (let z = -C.w / 2 + 0.6; z < C.w / 2; z += 1) box(walk, 2.4, 0.02, 0.5, 0, 0.03, z, paint);
  }

  // ---- the A-frames: a chalkboard each (the carriers), its wooden frame, its legs and back board to the ground ----
  for (const A of plan.aframes) {
    const g = onPanel(A), drop = A.center.y - route.frameAt(A.s).pos.y, wood = toon({ color: '#8a5a3a' });
    box(g, A.w + 0.16, A.h + 0.16, 0.06, 0, 0, -0.04, wood);
    for (const x of [-A.w / 2, A.w / 2]) box(g, 0.08, drop + A.h / 2, 0.08, x, (A.h / 2 - drop) / 2, -0.06, wood);
    const backBoard = box(g, A.w + 0.16, A.h + 0.16, 0.05, 0, -0.05, -0.5, wood); backBoard.rotation.x = -0.35;
    root.add(g);
  }

  // ---- the hardware store: cream stucco, an orange fascia with its name, its windows (painted: the carriers), the
  // door between, the banner's grommets under the eaves, its strongman painted beside the banner ----
  let roofChicken!: THREE.Group;
  {
    const B = plan.shop, Sh = SHACK.shop, g = front(B.s, Sh.face), x = (s: number) => s - B.s, w = B.w;
    box(g, w, Sh.h, Sh.d, 0, Sh.h / 2, -Sh.d / 2, wallMaterial('#f7f1e3', new THREE.Vector3(w, Sh.h, Sh.d), 0, false)); // (stucco, look/walls.ts: flat white, it read as a box)
    box(g, w + 0.3, 0.1, 0.55, 0, Sh.h - 0.85, 0.2, toon({ color: '#7a5a58' })); // the shadow under the fascia's soffit
    cyl(g, 0.06, Sh.h - 0.9, w / 2 - 0.5, (Sh.h - 0.9) / 2, 0.08, toon({ color: '#d9d0c0' })); // a drainpipe
    // its end toward the corner: two windows, an orange band; on the roof, its air units
    const endGlass = toon({ color: '#28323c' });
    for (const z of [-3.2, -8.8]) { const p = plane(g, 3, 1.8, -w / 2 - 0.012, 2.1, z, endGlass); p.rotation.y = -Math.PI / 2; }
    box(g, 0.06, 0.5, Sh.d, -w / 2 - 0.03, 0.25, -Sh.d / 2, toon({ color: orange }));
    for (const [x, z] of [[-w / 4, -4], [w / 5, -8], [w / 3, -3.5]]) box(g, 1.6, 0.9, 1.6, x!, Sh.h + 0.45, z!, toon({ color: '#b9ada0' }));
    box(g, w + 0.06, 0.5, 0.06, 0, 0.25, 0.03, toon({ color: orange }));
    box(g, w + 0.3, 0.8, 0.5, 0, Sh.h - 0.4, 0.2, toon({ color: orange }));
    for (let k = 0; k < 2; k++) plane(g, 9, 0.7, -w / 2 + 6 + k * 11, Sh.h - 0.4, 0.46, name('HANDLE IT HARDWARE', 9, 0.7, '#fff6e0', orange));
    // his strongman, painted on the wall past the banner: bald, arms crossed, a white tee, an earring (Mr. Clean's cousin)
    plane(g, 2.2, 3.2, x(B.s + B.w / 2) - 2.4, 2.0, 0.02, pic(canvasTex(256, 384, (c) => {
      c.fillStyle = '#16131a'; c.lineJoin = 'round';
      const body = () => { c.beginPath(); c.moveTo(40, 384); c.lineTo(44, 230); c.quadraticCurveTo(40, 150, 90, 130); c.lineTo(100, 118); c.quadraticCurveTo(78, 96, 86, 60); c.quadraticCurveTo(96, 14, 128, 14); c.quadraticCurveTo(160, 14, 170, 60); c.quadraticCurveTo(178, 96, 156, 118); c.lineTo(166, 130); c.quadraticCurveTo(216, 150, 212, 230); c.lineTo(216, 384); c.closePath(); };
      body(); c.fill();
      c.fillStyle = '#f7f1e3'; c.save(); c.beginPath(); c.moveTo(52, 376); c.lineTo(56, 236); c.quadraticCurveTo(54, 164, 96, 146); c.lineTo(160, 146); c.quadraticCurveTo(202, 164, 200, 236); c.lineTo(204, 376); c.closePath(); c.fill(); c.restore(); // the tee
      c.fillStyle = '#e8c39e'; c.beginPath(); c.ellipse(128, 66, 36, 46, 0, 0, Math.PI * 2); c.fill(); // the head, bald
      c.fillStyle = '#e8c39e'; c.beginPath(); c.roundRect(60, 190, 136, 44, 22); c.fill(); // the arms, crossed
      c.fillStyle = '#16131a'; c.lineWidth = 6; c.strokeStyle = '#16131a'; c.beginPath(); c.moveTo(60, 212); c.lineTo(196, 212); c.stroke();
      c.beginPath(); c.moveTo(112, 58); c.lineTo(122, 56); c.moveTo(134, 56); c.lineTo(144, 58); c.stroke(); // the brows
      c.fillStyle = '#f6c445'; c.beginPath(); c.arc(93, 86, 5, 0, Math.PI * 2); c.fill(); // the earring
      c.fillStyle = '#d9651f'; c.font = 'bold 26px sans-serif'; c.textAlign = 'center'; c.fillText('MR.', 128, 290); c.fillText('HANDLE IT', 128, 322);
    }), { transparent: true }));
    const glass = pic(glassTex()), trim = toon({ color: '#f8f4ea' }), W = Sh.window;
    for (const s of plan.windows) {
      plane(g, W.w, W.h, x(s), W.y, 0.015, glass);
      for (const dy of [-1, 1]) box(g, W.w + 0.24, 0.12, 0.1, x(s), W.y + (dy * (W.h + 0.12)) / 2, 0.04, trim);
      for (const dx of [-1, 1]) box(g, 0.12, W.h, 0.1, x(s) + (dx * (W.w + 0.12)) / 2, W.y, 0.04, trim);
    }
    const door = (plan.windows[0]! + plan.windows[1]!) / 2;
    box(g, 1.3, 2.5, 0.06, x(door), 1.25, 0.03, toon({ color: '#1d2026' }));
    box(g, 0.3, 0.12, 0.3, x(door), 2.8, 0.15, toon({ color: '#1d2026' })); // the lamp over the door
    box(g, 0.2, 0.05, 0.2, x(door), 2.72, 0.15, lampMaterial('#ffe8b0', GLOW.lamp * 0.6, 0.9));
    plane(g, 0.8, 1.3, x(door), 1.6, 0.065, glass);
    // a rack of brooms and a stack of paint cans by the door, a hardware store's sidewalk
    for (let k = 0; k < 4; k++) { cyl(g, 0.02, 1.4, x(door) + 1.2 + k * 0.14, 0.7, 0.3, toon({ color: '#c9a97a' })); box(g, 0.1, 0.22, 0.06, x(door) + 1.2 + k * 0.14, 1.5, 0.3, toon({ color: '#e0b060' })); }
    for (const [dx, dy] of [[-1.5, 0.16], [-1.2, 0.16], [-1.35, 0.48]] as const) cyl(g, 0.16, 0.32, x(door) + dx, dy, 0.4, toon({ color: ['#2b78a6', '#c8102e', '#f6dd8f'][Math.round((dx + 1.5) * 3) % 3]! }));
    root.add(g);
  }
  // ---- the chicken spot past it: its own thing (the user: a surprise for its one line) — cream walls, a red mansard
  // roof with white stripes, FRIED CHICKEN on it, a striped awning over its windows, a bucket on a pole ----
  {
    const B = plan.chicken, Ck = SHACK.chicken, Sh = SHACK.shop, g = front(B.s, Sh.face), w = B.w, h = Ck.h;
    const cream = toon({ color: '#fff6e0' }), redM = toon({ color: red }), white = toon({ color: '#ffffff' });
    box(g, w, h, Ck.d, 0, h / 2, -Ck.d / 2, wallMaterial('#fff6e0', new THREE.Vector3(w, h, Ck.d), 0, false));
    // the mansard: a red band round the top, white stripes across it, a cap
    box(g, w + 0.6, 1.5, Ck.d + 0.6, 0, h - 0.4, -Ck.d / 2, redM);
    for (let x = -w / 2 + 0.9; x < w / 2; x += 1.8) box(g, 0.5, 1.52, 0.02, x, h - 0.4, 0.31, white);
    box(g, w + 0.8, 0.12, Ck.d + 0.8, 0, h + 0.4, -Ck.d / 2, cream);
    plane(g, 7, 0.9, 0, h - 0.4, 0.33, name('FRIED CHICKEN', 7, 0.9, '#fff6e0', red));
    // its windows under a striped awning, the door, a step
    const glass = pic(glassTex());
    for (const wx of [-w / 2 + 3.5, w / 2 - 3.5]) { plane(g, 4.6, 2.2, wx, 2.0, 0.015, glass); box(g, 4.8, 0.1, 0.1, wx, 3.15, 0.04, cream); box(g, 4.8, 0.1, 0.1, wx, 0.85, 0.04, cream); }
    for (let x = -w / 2 + 0.6; x < w / 2 - 0.3; x += 1.2) box(g, 1.2, 0.12, 1.3, x + 0.6, 3.35, 0.65, Math.round(x / 1.2) % 2 ? redM : white); // the awning, striped
    box(g, 1.4, 2.6, 0.06, 0, 1.3, 0.03, toon({ color: '#1d2026' })); plane(g, 0.9, 1.4, 0, 1.6, 0.065, glass);
    box(g, w, 0.5, 0.06, 0, 0.25, 0.03, redM); // the red base
    // the bucket sign on a pole by the road end, turning slowly
    const bucket = new THREE.Group(); bucket.position.set(w / 2 - 1.2, h + 2.6, 0.4); g.add(bucket);
    cyl(g, 0.12, h + 2.0, w / 2 - 1.2, (h + 2.0) / 2, 0.4, dark);
    { const b = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 0.8, 1.6, 16), redM); bucket.add(b); for (let k = 0; k < 8; k++) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.62, 0.05), white); const a = (k / 8) * Math.PI * 2; st.position.set(Math.sin(a) * 0.9, 0, Math.cos(a) * 0.9); st.rotation.y = a; bucket.add(st); } const lid = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.12, 16), white); lid.position.y = 0.85; bucket.add(lid); }
    drifting.push(Object.assign(new THREE.Mesh(), { userData: { bucket } }) as THREE.Mesh);
    root.add(g);
  }
  {
    const B = plan.chicken, Ck = SHACK.chicken;
    void B;
    // the banner's grommets (its words and red are the carriers')
    const bn = onPanel(plan.banner), chrome = toon({ color: WORLD.chrome });
    for (const [px, py] of [[-1, 1], [1, 1], [-1, -1], [1, -1]] as const) ball(bn, 0.05, (px * plan.banner.w) / 2 - px * 0.12, (py * plan.banner.h) / 2 - py * 0.1, 0.01, chrome);
    // (one white hem round the whole banner: its phrases are one banner, not three)
    const hem = toon({ color: '#ffffff' }), bw = plan.banner.w, bh = plan.banner.h;
    for (const y of [bh / 2, -bh / 2]) box(bn, bw + 0.08, 0.06, 0.02, 0, y, 0.005, hem);
    for (const x of [bw / 2, -bw / 2]) box(bn, 0.06, bh, 0.02, x, 0, 0.005, hem);
    root.add(bn);
    // the roof sign: its red frame, bulbs round it (chasing), legs down to the roof, the chicken standing on it
    const R = plan.sign, rg = onPanel(R), legs = R.center.y - R.h / 2 - (route.frameAt(B.s).pos.y + Ck.h);
    box(rg, R.w + 0.5, R.h + 0.5, 0.35, 0, 0, -0.2, toon({ color: red }));
    const e = (R.w + 0.25) / 2, f = (R.h + 0.25) / 2;
    bulbs(rg, new THREE.Vector3(-e, f, 0.02), new THREE.Vector3(e, f, 0.02), 24, chase);
    bulbs(rg, new THREE.Vector3(e, -f, 0.02), new THREE.Vector3(-e, -f, 0.02), 24, chase, 1); // (back along the foot: the chase runs round)
    bulbs(rg, new THREE.Vector3(-e, -f, 0.02), new THREE.Vector3(-e, f, 0.02), 9, chase, 2);
    bulbs(rg, new THREE.Vector3(e, f, 0.02), new THREE.Vector3(e, -f, 0.02), 9, chase, 1);
    for (const lx of [-R.w / 3, R.w / 3]) box(rg, 0.2, legs, 0.2, lx, -R.h / 2 - legs / 2, -0.25, dark);
    roofChicken = new THREE.Group(); roofChicken.position.set(0, R.h / 2 + 0.25, -0.2); rg.add(roofChicken); chicken(roofChicken, 0, 0.9);
    root.add(rg);
  }

  // ---- the car wash on the right: its sign an ad on two posts (HAND WASH over the words, suds and a shining car right
  // of them, the price under), its building's blue roof edge and its bays, open to the road, suds at the entrance ----
  {
    const Wb = plan.wash.board, g = onPanel(Wb), drop = Wb.center.y - route.frameAt(plan.wash.s).pos.y, B = WASH.board;
    const pxm = 1024 / Wb.w, H = Math.round(Wb.h * pxm), head = B.head * pxm, foot = B.foot * pxm;
    const ad = canvasTex(1024, H, (c) => {
      c.fillStyle = '#1f8fd6'; c.fillRect(0, 0, 1024, H);
      // suds: bubbles of every size, thick right of the words, a few drifting behind them
      const bub = (x: number, y: number, r: number) => {
        c.fillStyle = 'rgba(255,255,255,0.22)'; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
        c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = Math.max(2, r * 0.08); c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.9)'; c.beginPath(); c.ellipse(x - r * 0.35, y - r * 0.4, r * 0.22, r * 0.12, -0.6, 0, Math.PI * 2); c.fill();
      };
      const right = (B.pad + 3.4 + 0.15) * pxm, inner = H - head - foot;
      for (let k = 0; k < 26; k++) bub(right + ((k * 0.618) % 1) * (1024 - right), head + ((k * 0.381) % 1) * inner, 14 + 48 * ((k * 0.73) % 1));
      for (let k = 0; k < 7; k++) bub(((k * 0.29) % 1) * right, head + ((k * 0.57) % 1) * inner, 10 + 16 * ((k * 0.41) % 1));
      // the shining car among them
      const cx = right + (1024 - right) * 0.5, cy = H - foot - 70;
      c.fillStyle = '#ffffff'; c.beginPath(); c.roundRect(cx - 120, cy - 30, 240, 50, 18); c.fill(); c.beginPath(); c.roundRect(cx - 70, cy - 70, 130, 50, 20); c.fill();
      c.fillStyle = '#0b3a66'; for (const wx of [-70, 70]) { c.beginPath(); c.arc(cx + wx, cy + 22, 24, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = '#ffd65a';
      for (const [sx, sy, sr] of [[cx - 150, cy - 80, 20], [cx + 140, cy - 60, 14], [cx + 40, cy - 110, 16]] as const) {
        c.beginPath(); for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4, r = i % 2 ? sr * 0.3 : sr; c.lineTo(sx + r * Math.cos(a), sy + r * Math.sin(a)); } c.fill();
      }
      // HAND WASH across the top, the price along the foot (the signs' face)
      c.fillStyle = '#ffd65a'; c.fillRect(0, 0, 1024, head);
      c.fillStyle = '#0b3a66'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = font(F.sign(700), head * 0.62); c.fillText('HAND WASH', 512, head * 0.54);
      c.fillRect(0, H - foot, 1024, foot);
      c.fillStyle = '#ffffff'; c.font = font(F.sign(600), foot * 0.5); c.fillText('$9.99  ·  INSIDE & OUT  ·  OPEN 7 DAYS', 512, H - foot * 0.46, 990);
      c.strokeStyle = '#ffffff'; c.lineWidth = 10; c.strokeRect(5, 5, 1014, H - 10);
    });
    plane(g, Wb.w, Wb.h, 0, 0, -0.02, pic(ad));
    box(g, Wb.w + 0.2, Wb.h + 0.2, 0.14, 0, 0, -0.11, toon({ color: '#0b3a66' }));
    for (const px of [-Wb.w / 3, Wb.w / 3]) box(g, 0.22, drop - Wb.h / 2, 0.22, px, -(drop + Wb.h / 2) / 2, -0.2, dark);
    root.add(g);
    // (its building is the drive's block: here its blue roof edge and its bays, open to the road)
    const b = onRoad(plan.wash.s + WASH.building.ds, WASH.building.lateral), blue = toon({ color: '#1f8fd6' });
    box(b, 10.4, 0.6, 18.4, 0, 4.6, 0, blue);
    for (const z of [-5, 0, 5]) box(b, 0.05, 3, 3.6, 5.03, 1.5, z, toon({ color: '#1d2230' }));
    const suds = toon({ color: '#ffffff' });
    for (let k = 0; k < 14; k++) ball(b, 0.25 + 0.35 * ((k * 0.37) % 1), 5.6 + ((k * 0.61) % 1.4), 0.3 + ((k * 0.43) % 1) * 1.8, -7 + k, suds);
    // a few soap bubbles drifting up from the bays (background of the sign's shot, never near the board)
    for (const [k, z] of [-6, -2, 3].entries()) drifting.push(ball(b, 0.14 + 0.05 * k, 5.9, 0.5, z, suds));
  }

  // ---- parked lowriders at the left curb (the neighbourhood's own), one laid nose-down on its suspension ----
  {
    const spots = [
      { s: plan.pole.s - 14, color: '#8a5f9e', low: true },
      { s: plan.shop.s + plan.shop.w / 2 + 16, color: '#2f7a5a', low: false },
    ];
    for (const sp of spots) {
      const g = onRoad(sp.s, -(ROAD_HALF - 1.15)), car = sedan({ color: sp.color, length: 5.2, low: sp.low });
      g.add(car);
    }
  }

  // ---- his giant mural, painted on the end wall of its building: his portrait on the right (its words: the carriers) ----
  {
    const G = plan.giant, wall = onPanel(G), Bk = plan.giantBlock, GB = GIANT.building;
    const art = canvasTex(2048, Math.round((2048 * G.h) / G.w), (c) => mural(c, c.canvas.width, c.canvas.height, GIANT.text));
    plane(wall, G.w, G.h, 0, 0, 0, pic(art));
    // (the building: its end wall round the mural, down to the ground; a parapet along its top)
    const above = G.center.y - route.frameAt(Bk.s).pos.y;
    box(wall, Bk.w, Bk.h, GB.d, 0, Bk.h / 2 - above, -GB.d / 2 - 0.05, toon({ color: '#e3907a' }));
    box(wall, Bk.w + 0.3, 0.5, 0.5, 0, Bk.h - above + 0.25, -0.2, toon({ color: '#c46f5c' }));
    root.add(wall);
  }

  const beat = drive.beats.length > 1 ? drive.beats[1]! - drive.beats[0]! : 0.47;
  return {
    group: root,
    update(t) {
      // the chase, stepping on the half-beat
      const step = Math.floor(t / (beat / 2)) % 3;
      chase.forEach((m, i) => {
        const lit = i === step;
        m.uniforms.day!.value = lit ? 1.5 : 0.3;
        m.uniforms.strength!.value = GLOW.lamp * (lit ? 1.2 : 0.3);
      });
      // the roof chicken hops on the word "chickens", settling
      const tau = t - plan.chickens;
      if (tau >= 0 && tau < 1.1) {
        const up = tau < 0.3 ? Math.sin((Math.PI * tau) / 0.3) : 0.3 * Math.exp(-(tau - 0.3) * 7) * Math.cos((tau - 0.3) * 18);
        roofChicken.position.y = (plan.sign.h / 2 + 0.25) + 0.45 * up;
        roofChicken.rotation.z = 0.1 * up;
      } else { roofChicken.position.y = plan.sign.h / 2 + 0.25; roofChicken.rotation.z = 0; }
      // soap bubbles drifting up from the bays
      drifting.forEach((b, k) => {
        if (b.userData.bucket) { (b.userData.bucket as THREE.Group).rotation.y = t * 0.6; return; } // the bucket sign turns
        const u = (t * 0.22 + k * 0.37) % 1;
        b.position.y = 0.5 + u * 2.6;
        b.position.x = 5.9 + 0.4 * Math.sin(t * 0.8 + k * 2.1);
        b.scale.setScalar(1 - 0.35 * u);
      });
    },
  };
}
