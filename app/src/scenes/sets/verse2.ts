// Verse 2's props (drive/sets/verse2.ts): Handle It Hardware on the corner of Slauson — its tall pole sign at the curb
// (its name over the lightbox, a giant wrench on top, the trades under it), the side street, chalk A-frames on the
// sidewalk, the store itself (its false front and sign board, awnings, windows onto the shop floor with posters taped in
// them: the carriers; its stock out on the sidewalk, its banner tied up under the board, Mr. Handle It himself on his
// plinth); the fried chicken spot past it, the big sign on its roof ringed with bulbs and the chicken standing on it;
// the hand car wash on the right (its sign an ad: HAND WASH over the words, suds and a shining car right of them, the
// price under; its bays); his giant mural on the end wall of its building. The lyrics are the carriers. Browser only (canvas).
import * as THREE from 'three';
import { wallMaterial } from '../../look/walls';
import type { Drive } from '../../drive/drive';
import { GIANT, SHACK, type Verse2Plan, WASH } from '../../drive/sets/verse2';
import { ROAD_HALF } from '../../drive/route';
import { WORLD, toon } from '../../look/toon';
import { GLOW, lampMaterial } from '../../look/night';
import { F, font } from '../../engine/type';
import { ball, box, canvasTex, cyl, leftFront, onPanel, pic, plane, roadFrame, sedan, signFace, walker } from './kit';
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
/** The shopper on the hardware store's sidewalk: from this song time, at this pace (m/s), this far out from its front. */
const SHOPPER = { t0: 80, v: 1.1, z: 3.6 };
// ---- the hardware store's pieces (the user, 2026-10-14: "make this like the coolest hardware store we've ever seen") ----
const HW = { orange: '#d9651f', deep: '#a84e18', cream: '#fff3dc', navy: '#1f2a44', ink: '#16131a', steel: '#c9c4b8', tile: '#8e3420', frame: '#2a2a30' };
const V3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
/** A rod (a limb, a rope, a handle) from a to b in g: radius r at a, r2 at b. */
function limb(g: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, r: number, m: THREE.Material, r2 = r) {
  const d = b.clone().sub(a), mesh = new THREE.Mesh(new THREE.CylinderGeometry(r2, r, d.length(), 12), m);
  mesh.position.copy(a).addScaledVector(d, 0.5); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); g.add(mesh);
  return mesh;
}
/** A combination wrench `L` long: its ring end at the origin, its open jaw up +y, flat in xy, `t` thick. (The pole
 *  sign's was a stick with a disc each end: it read as a spoon.) */
function wrench(L: number, m: THREE.Material, t = 0.1): THREE.Group {
  const g = new THREE.Group(), k = L / 2.6, ext = (s: THREE.Shape) => new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 18 });
  const add = (s: THREE.Shape, y: number, rot = 0) => { const me = new THREE.Mesh(ext(s), m); me.position.set(0, y, -t / 2); me.rotation.z = rot; g.add(me); };
  const hw = 0.11 * k, handle = new THREE.Shape();
  handle.moveTo(-hw, 0.15 * k); handle.lineTo(hw, 0.15 * k); handle.lineTo(hw * 0.75, L / 2); handle.lineTo(hw, L - 0.25 * k); handle.lineTo(-hw, L - 0.25 * k); handle.lineTo(-hw * 0.75, L / 2); handle.closePath();
  add(handle, 0);
  const ring = new THREE.Shape(); ring.absarc(0, 0, 0.27 * k, 0, Math.PI * 2, false);
  const hole = new THREE.Path(); hole.absarc(0, 0, 0.13 * k, 0, Math.PI * 2, true); ring.holes.push(hole);
  add(ring, 0);
  // the open jaw: a C open at its top, set over at 15° as a wrench's is
  const jaw = new THREE.Shape(), gap = 0.55;
  jaw.absarc(0, 0, 0.36 * k, Math.PI / 2 + gap, Math.PI * 2.5 - gap, false);
  jaw.absarc(0, 0, 0.16 * k, Math.PI * 2.5 - gap, Math.PI / 2 + gap, true);
  add(jaw, L, 0.26);
  return g;
}
/** Lay a group whose length runs up its +y along a→(its direction), its flat face turned toward `face`. */
function lay(o: THREE.Object3D, at: THREE.Vector3, dir: THREE.Vector3, face: THREE.Vector3) {
  const y = dir.clone().normalize(), z = face.clone().addScaledVector(y, -face.dot(y)).normalize(), x = y.clone().cross(z);
  o.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z)); o.position.copy(at);
}

/** Mr. Handle It himself: a fibreglass roadside giant (the Muffler Men of the 60s), 6 m to his crown on his plinth —
 *  bald, a gold earring, a wink, a tight white tee over a barrel chest, navy work pants, a tool belt with a hammer in
 *  its loop; one fist on his hip, a giant wrench over his other shoulder. (He was a flat painting on the wall that read
 *  as a bowling pin: "not passing the mark", the user, 2026-10-14.) Feet on the plinth's top, facing +z. */
function mrHandleIt(g: THREE.Object3D) {
  const skin = toon({ color: '#9a5b3a' }), tee = toon({ color: '#f7f4ec' }), pants = toon({ color: '#283a63' }), boot = toon({ color: '#3f2a20' });
  const leather = toon({ color: '#8a5a32' }), gold = toon({ color: '#f6c445' }), ink = toon({ color: HW.ink }), steel = toon({ color: HW.steel });
  // the plinth, his name across its front
  box(g, 1.9, 0.8, 1.6, 0, 0.4, 0, toon({ color: HW.deep }));
  box(g, 2.0, 0.1, 1.7, 0, 0.85, 0, toon({ color: HW.cream }));
  plane(g, 1.7, 0.44, 0, 0.42, 0.805, pic(signFace('MR. HANDLE IT', 512, 132, HW.cream, HW.navy, F.sign(700), 0.58, 0.04)));
  const y0 = 0.9;
  for (const s of [-1, 1]) {
    box(g, 0.48, 0.34, 0.8, s * 0.34, y0 + 0.17, 0.08, boot);
    limb(g, V3(s * 0.34, y0 + 0.3, 0), V3(s * 0.36, y0 + 2.2, 0), 0.26, pants, 0.31);
  }
  box(g, 1.14, 0.5, 0.68, 0, y0 + 2.3, 0, pants);
  box(g, 1.2, 0.2, 0.74, 0, y0 + 2.5, 0, leather); box(g, 0.22, 0.16, 0.05, 0, y0 + 2.5, 0.38, gold);
  // a claw hammer in his belt's loop, head up
  limb(g, V3(-0.66, y0 + 1.85, 0.2), V3(-0.64, y0 + 2.62, 0.2), 0.035, toon({ color: '#c9a97a' }));
  box(g, 0.12, 0.13, 0.44, -0.64, y0 + 2.66, 0.22, steel);
  // the chest: a tee stretched over a wedge, the pecs in it, the sleeves at the shoulders
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.56, 1.75, 18), tee); torso.scale.z = 0.62; torso.position.set(0, y0 + 3.45, 0); g.add(torso);
  for (const s of [-1, 1]) { ball(g, 0.3, s * 0.8, y0 + 4.1, 0, tee); limb(g, V3(s * 0.8, y0 + 4.1, 0), V3(s * 0.92, y0 + 3.85, 0.02), 0.29, tee, 0.28); } // (his sleeves, tight on his arms)
  limb(g, V3(0, y0 + 4.2, 0), V3(0, y0 + 4.5, 0.02), 0.23, skin, 0.21); // his neck
  const head = ball(g, 0.45, 0, y0 + 4.84, 0.05, skin); head.scale.set(0.92, 1.08, 0.98);
  for (const s of [-1, 1]) ball(g, 0.1, s * 0.41, y0 + 4.8, 0.02, skin);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.018, 6, 14), gold); ring.position.set(-0.45, y0 + 4.66, 0.03); ring.rotation.y = Math.PI / 2; g.add(ring);
  // his face: an eye open, the other winking under a lowered brow, a nose, a big grin
  ball(g, 0.06, 0.16, y0 + 4.92, 0.42, ink);
  box(g, 0.15, 0.035, 0.03, -0.16, y0 + 4.9, 0.425, ink).rotation.z = 0.12;
  box(g, 0.2, 0.05, 0.04, 0.16, y0 + 5.06, 0.4, ink).rotation.z = -0.18;
  box(g, 0.2, 0.05, 0.04, -0.16, y0 + 5.0, 0.41, ink).rotation.z = 0.05;
  ball(g, 0.08, 0, y0 + 4.82, 0.47, skin);
  const grin = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.03, 6, 16, Math.PI), ink); grin.position.set(0, y0 + 4.72, 0.4); grin.rotation.z = Math.PI; grin.rotation.x = -0.3; g.add(grin);
  // his left fist on his hip
  const L0 = V3(-0.84, y0 + 4.02, 0), Le = V3(-1.34, y0 + 3.28, -0.06), Lh = V3(-0.7, y0 + 2.66, 0.14);
  limb(g, L0, Le, 0.27, skin, 0.21); limb(g, Le, Lh, 0.21, skin, 0.16); ball(g, 0.19, Le.x, Le.y, Le.z, skin); ball(g, 0.2, Lh.x, Lh.y, Lh.z, skin);
  // the giant wrench over his right shoulder, his hand round its handle
  const R0 = V3(0.84, y0 + 4.02, 0), Re = V3(1.32, y0 + 3.32, 0.26), Rh = V3(0.98, y0 + 4.06, 0.48);
  limb(g, R0, Re, 0.27, skin, 0.21); limb(g, Re, Rh, 0.21, skin, 0.16); ball(g, 0.19, Re.x, Re.y, Re.z, skin);
  // (up past his head, its jaw against the sky: laid back over his shoulder it hid behind his head and read as a bat)
  const dir = V3(0.22, 0.9, -0.38).normalize(), w = wrench(2.9, steel, 0.16);
  lay(w, Rh.clone().addScaledVector(dir, -0.8), dir, V3(-0.3, 0, 1));
  g.add(w);
  ball(g, 0.21, Rh.x, Rh.y, Rh.z, skin);
}

/** The shop's floor through its window, lit warm: tubes in a dark ceiling, a pegboard wall hung with tools, gondolas
 *  of stock (paint cans, boxes, rope), an aisle sign; the glass's sheen over it. (Its windows were a dark grey slab.) */
function interior(c: CanvasRenderingContext2D, W: number, H: number, seed: number) {
  const r = (k: number) => { const v = Math.sin(seed * 91.7 + k * 12.9898) * 43758.5453; return v - Math.floor(v); };
  c.fillStyle = '#f2dfb0'; c.fillRect(0, 0, W, H);
  c.fillStyle = '#4a3a34'; c.fillRect(0, 0, W, H * 0.13);
  for (let x = W * 0.04; x < W; x += W * 0.2) { c.fillStyle = '#fffbe8'; c.fillRect(x, H * 0.075, W * 0.12, H * 0.035); }
  // the pegboard, its holes, the tools hung on it
  const p0 = H * 0.15, p1 = H * 0.5;
  c.fillStyle = '#c99a5e'; c.fillRect(0, p0, W, p1 - p0);
  c.fillStyle = 'rgba(70,44,26,0.35)';
  for (let y = p0 + 6; y < p1; y += 12) for (let x = 6; x < W; x += 12) c.fillRect(x, y, 3, 3);
  const tools = ['#c8102e', '#1f2a44', '#f6c445', '#2b78a6', '#d9651f', '#3a7a4a'];
  for (let i = 0, x = W * 0.02; x < W - 30; i++, x += 34 + 26 * r(i)) {
    const col = tools[Math.floor(r(i + 50) * tools.length)]!, y = p0 + 10, kind = Math.floor(r(i + 99) * 5);
    c.fillStyle = col; c.strokeStyle = col; c.lineWidth = 5;
    if (kind === 0) { c.fillRect(x + 12, y + 4, 6, (p1 - p0) * 0.75); c.fillStyle = '#5a5a60'; c.fillRect(x, y, 30, 12); } // a hammer
    else if (kind === 1) { c.beginPath(); c.arc(x + 15, y + 14, 11, 0, Math.PI * 2); c.fill(); c.fillStyle = '#16131a'; c.beginPath(); c.arc(x + 15, y + 14, 5, 0, Math.PI * 2); c.fill(); } // a tape measure
    else if (kind === 2) { c.fillStyle = '#9a9aa2'; c.beginPath(); c.moveTo(x, y + 8); c.lineTo(x + 30, y + 8); c.lineTo(x + 30, y + (p1 - p0) * 0.7); c.closePath(); c.fill(); c.fillStyle = col; c.fillRect(x - 2, y, 14, 20); } // a saw
    else if (kind === 3) { c.beginPath(); c.arc(x + 15, y + 18, 13, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.arc(x + 15, y + 18, 7, 0, Math.PI * 2); c.stroke(); } // a coil of rope
    else { c.fillStyle = '#9a9aa2'; c.fillRect(x + 12, y, 7, (p1 - p0) * 0.62); c.fillStyle = col; c.fillRect(x + 10, y + (p1 - p0) * 0.4, 11, (p1 - p0) * 0.3); } // a screwdriver
  }
  // the gondolas: three shelves of stock
  c.fillStyle = '#3a2e2a'; c.fillRect(0, H * 0.52, W, H * 0.48);
  for (let row = 0; row < 3; row++) {
    const top = H * (0.54 + row * 0.15), base = top + H * 0.13;
    for (let i = 0, x = 0; x < W; i++) {
      const pw = 14 + 22 * r(row * 300 + i), ph = H * (0.06 + 0.06 * r(row * 300 + i + 7)), col = ['#c8102e', '#f6c445', '#2b78a6', '#f7f4ec', '#d9651f', '#3a7a4a', '#8a5a32'][Math.floor(r(row * 300 + i + 3) * 7)]!;
      c.fillStyle = col; c.fillRect(x, base - ph, pw - 3, ph);
      if (r(row * 300 + i + 11) < 0.5) { c.fillStyle = 'rgba(255,255,255,0.45)'; c.fillRect(x, base - ph, pw - 3, ph * 0.18); } // a paint can's lid
      x += pw;
    }
    c.fillStyle = '#7a6a5a'; c.fillRect(0, base, W, H * 0.018);
  }
  // an aisle sign hung from the ceiling
  c.fillStyle = HW.orange; c.fillRect(W * 0.62, H * 0.13, W * 0.16, H * 0.07);
  c.fillStyle = HW.cream; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = font(F.sign(700), H * 0.05); c.fillText(seed % 2 ? 'PAINT · AISLE 4' : 'TOOLS · AISLE 2', W * 0.7, H * 0.168, W * 0.15);
  // the glass's sheen
  c.fillStyle = 'rgba(255,246,230,0.16)';
  for (const [a, b] of [[0.08, 0.16], [0.22, 0.25], [0.55, 0.62], [0.68, 0.7]] as const) { c.beginPath(); c.moveTo(W * a, 0); c.lineTo(W * b, 0); c.lineTo(W * b - H * 0.6, H); c.lineTo(W * a - H * 0.6, H); c.closePath(); c.fill(); }
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
    // a giant wrench laid across its top, the store's mark (on two stubs to the header)
    const steel = toon({ color: HW.steel }), wdir = V3(1, 0.42, 0).normalize(), top = P.h / 2 + 1.55;
    const wr = wrench(3.4, steel, 0.16); lay(wr, V3(0, top + 0.75, -0.27).addScaledVector(wdir, -1.7), wdir, V3(0, 0, 1)); g.add(wr);
    for (const x of [-0.9, 0.9]) { const h = 0.75 + x * (wdir.y / wdir.x); box(g, 0.12, h, 0.1, x, top + h / 2, -0.27, dark); }
    cyl(g, 0.2, drop - P.h / 2 - 0.2, 0, -(drop + P.h / 2 + 0.2) / 2, -0.27, dark);
    // a reader under the lightbox on the pole: the trades
    box(g, 4.4, 0.75, 0.3, 0, -P.h / 2 - 0.85, 0, toon({ color: HW.navy })); // (in front of the pole: it ran through its face)
    plane(g, 4.2, 0.6, 0, -P.h / 2 - 0.85, 0.155, pic(signFace('KEYS CUT · PAINT · TOOLS', 1024, 146, HW.cream, HW.navy, F.sign(700), 0.5, 0.06)));
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

  // ---- the hardware store (the user, 2026-10-14: "it is not passing the vibe check"): a 60s neighbourhood store with
  // a tall false front — its sign board under goosenecks, a HARDWARE blade at the corner with a key hung under it, the
  // banner tied up under the board, striped awnings over deep windows lit onto the shop floor (posters taped in them:
  // the carriers), a recessed glass door; its stock out on the sidewalk; Mr. Handle It himself on his plinth by the
  // banner; its end wall toward the corner painted as an ad ----
  let roofChicken!: THREE.Group, shopper!: THREE.Group, shopperAt!: (walked: number) => number;
  {
    const B = plan.shop, Sh = SHACK.shop, g = front(B.s, Sh.face), w = B.w, h = Sh.h, X = (a: number) => a - w / 2, W = Sh.window;
    const cream = toon({ color: '#f7ecd6' }), ink = toon({ color: HW.ink }), frame = toon({ color: HW.frame }), tile = toon({ color: HW.tile }), steel = toon({ color: HW.steel });
    // its body behind a front 0.5 m thick, the windows and the door set into it (the shop floor shows in their depth)
    const R = 0.5;
    box(g, w, h, Sh.d - R, 0, h / 2, -R - (Sh.d - R) / 2, wallMaterial('#f7ecd6', new THREE.Vector3(w, h, Sh.d - R), 0, false));
    const wins = Sh.windows.map((a) => [X(a) - W.w / 2, X(a) + W.w / 2] as const), door = (Sh.windows[0]! + Sh.windows[1]!) / 2, dw = 1.5, dh = 2.6;
    const D = [X(door) - dw / 2, X(door) + dw / 2] as const, wTop = W.y + W.h / 2, wBot = W.y - W.h / 2;
    const skin = (a: number, b: number, y0: number, y1: number, m: THREE.Material = cream) => box(g, b - a, y1 - y0, R, (a + b) / 2, (y0 + y1) / 2, -R / 2, m);
    skin(-w / 2, w / 2, wTop, h); // the header, to the parapet
    for (const [a, b] of [[-w / 2, wins[0]![0]], [wins[0]![1], D[0]], [D[1], wins[1]![0]], [wins[1]![1], w / 2]] as const) skin(a, b, 0, wTop); // the piers
    skin(D[0], D[1], dh, wTop); // over the door
    for (const [a, b] of wins) { skin(a, b, 0, wBot, tile); box(g, b - a + 0.1, 0.06, 0.16, (a + b) / 2, wBot + 0.03, 0.05, steel); } // the tiled stall risers, a sill
    box(g, w + 0.08, 0.35, 0.06, 0, 0.175, 0.02, toon({ color: HW.deep })); // the base course
    // the windows: the shop floor at the back of their depth, a display riser in each with its stock, bunting along the
    // top, a dark storefront frame
    Sh.windows.forEach((a, i) => {
      const cx = X(a), shop = canvasTex(1024, Math.round((1024 * W.h) / W.w), (c) => interior(c, c.canvas.width, c.canvas.height, i + 1));
      plane(g, W.w, W.h, cx, W.y, -R + 0.01, pic(shop));
      box(g, W.w - 0.1, 0.12, 0.34, cx, wBot + 0.06, -0.2, toon({ color: '#5a3a2a' }));
      // (low: the posters stand over them)
      for (let k = 0; k < 6; k++) cyl(g, 0.12, 0.17, cx - W.w / 2 + 0.4 + (k % 4) * 0.27 + (k >= 4 ? 0.14 : 0), wBot + 0.21 + (k >= 4 ? 0.17 : 0), -0.2, toon({ color: ['#c8102e', '#2b78a6', '#f6c445', '#f7f4ec'][(k + i) % 4]! }));
      box(g, 0.55, 0.26, 0.26, cx + W.w / 2 - 0.6, wBot + 0.25, -0.22, toon({ color: i ? '#2b78a6' : '#c8102e' }));
      box(g, 0.3, 0.04, 0.04, cx + W.w / 2 - 0.6, wBot + 0.42, -0.22, ink);
      plane(g, W.w - 0.1, 0.26, cx, wTop - 0.2, -0.08, pic(canvasTex(1024, 40, (c) => {
        c.strokeStyle = '#3a2e2a'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 3); c.lineTo(1024, 3); c.stroke();
        for (let k = 0; k < 24; k++) { c.fillStyle = ['#c8102e', '#f6c445', '#fff3dc', '#2b78a6'][k % 4]!; c.beginPath(); c.moveTo(k * 42.7 + 2, 3); c.lineTo(k * 42.7 + 40, 3); c.lineTo(k * 42.7 + 21, 38); c.closePath(); c.fill(); }
      }), { transparent: true }));
      for (const y of [wTop - 0.04, wBot + 0.04]) box(g, W.w, 0.08, 0.08, cx, y, -0.04, frame);
      for (const x of [cx - W.w / 2 + 0.04, cx + W.w / 2 - 0.04]) box(g, 0.08, W.h, 0.08, x, W.y, -0.04, frame);
    });
    // the door, recessed: glass in a dark frame, a push bar, OPEN lit in it, a mat; a lamp over the entry
    {
      const dx = X(door);
      box(g, dw, 0.04, R, dx, 0.02, -R / 2, toon({ color: '#b9ada0' }));
      box(g, 1.1, 2.3, 0.06, dx, 1.15, -R + 0.05, frame);
      plane(g, 0.86, 1.7, dx, 1.3, -R + 0.085, pic(canvasTex(256, 512, (c) => interior(c, 256, 512, 2))));
      box(g, 0.8, 0.05, 0.06, dx, 1.05, -R + 0.12, steel);
      plane(g, 0.42, 0.16, dx, 1.85, -R + 0.09, new THREE.MeshBasicMaterial({ map: signFace('OPEN', 256, 96, '#ff4a4a', '#16131a', F.sign(700), 0.7, 0.12) }));
      box(g, 0.9, 0.02, 0.6, dx, 0.01, 0.35, toon({ color: '#3a2e2a' }));
      box(g, 0.3, 0.1, 0.25, dx, dh + 0.25, 0.12, ink);
      box(g, 0.22, 0.04, 0.18, dx, dh + 0.18, 0.12, lampMaterial('#ffe8b0', GLOW.lamp * 0.6, 0.9));
    }
    // the awnings: striped canvas over each window, its valance lettered with the trades
    const stripes = canvasTex(512, 64, (c) => { for (let k = 0; k < 16; k++) { c.fillStyle = k % 2 ? HW.cream : HW.orange; c.fillRect(k * 32, 0, 32, 64); } });
    const canvas = toon({ map: stripes, side: THREE.DoubleSide });
    Sh.windows.forEach((a, i) => {
      const cx = X(a), aw = W.w + 0.3, P = 1.25, y1 = wTop + 0.38, y2 = wTop + 0.02, len = Math.hypot(P, y1 - y2);
      const sheet = plane(g, aw, len, cx, (y1 + y2) / 2, P / 2, canvas); sheet.rotation.x = -Math.atan2(P, y1 - y2);
      const val = canvasTex(1024, 48, (c) => {
        c.fillStyle = HW.orange; c.fillRect(0, 0, 1024, 34);
        for (let k = 0; k < 32; k++) { c.beginPath(); c.arc(k * 32 + 16, 34, 16, 0, Math.PI); c.fill(); }
        c.fillStyle = HW.cream; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = font(F.sign(700), 24);
        c.fillText(i ? 'PAINT  ·  GARDEN  ·  KEYS CUT' : 'TOOLS  ·  HARDWARE  ·  LUMBER', 512, 19, 980);
      });
      plane(g, aw, 0.32, cx, y2 - 0.16, P, pic(val, { transparent: true, side: THREE.DoubleSide }));
      for (const s of [-1, 1]) limb(g, V3(cx + (s * aw) / 2, y1 - 0.9, 0), V3(cx + (s * aw) / 2, y2, P), 0.02, frame);
    });
    // the sign board on the false front, under goosenecks; the parapet's cap
    const bw = w - 1.2, by = h - 0.75;
    box(g, bw + 0.2, 1.1, 0.25, 0, by, 0.125, toon({ color: HW.deep }));
    plane(g, bw, 0.95, 0, by, 0.255, pic(canvasTex(4096, Math.round((4096 * 0.95) / bw), (c) => {
      const Wc = c.canvas.width, Hc = c.canvas.height;
      c.fillStyle = HW.orange; c.fillRect(0, 0, Wc, Hc);
      c.strokeStyle = HW.cream; c.lineWidth = 8; c.strokeRect(14, 14, Wc - 28, Hc - 28);
      c.fillStyle = HW.cream; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = font(F.sign(700), Hc * 0.62); (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${Hc * 0.08}px`;
      c.fillText('HANDLE IT HARDWARE', Wc / 2, Hc * 0.54, Wc * 0.66);
      (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px';
      c.font = font(F.sign(600), Hc * 0.24); c.fillText('SINCE', Wc * 0.09, Hc * 0.36); c.font = font(F.sign(700), Hc * 0.36); c.fillText('1962', Wc * 0.09, Hc * 0.66);
      c.font = font(F.sign(600), Hc * 0.24); c.fillText('WE', Wc * 0.91, Hc * 0.36); c.font = font(F.sign(700), Hc * 0.3); c.fillText('FIX IT', Wc * 0.91, Hc * 0.66);
      c.fillRect(Wc * 0.16, Hc * 0.2, 6, Hc * 0.6); c.fillRect(Wc * 0.84 - 6, Hc * 0.2, 6, Hc * 0.6);
    })));
    box(g, w + 0.3, 0.2, 0.6, 0, h + 0.1, -0.15, toon({ color: HW.deep }));
    const lamp = lampMaterial('#ffe8b0', GLOW.lamp * 0.7, 0.9);
    for (let k = 0; k < 5; k++) {
      const lx = -bw / 2 + 1.5 + (k * (bw - 3)) / 4;
      limb(g, V3(lx, h + 0.15, -0.1), V3(lx, h + 0.5, 0.15), 0.03, ink); limb(g, V3(lx, h + 0.5, 0.15), V3(lx, h + 0.42, 0.75), 0.03, ink);
      const shade = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.2, 12, 1, true), ink); shade.position.set(lx, h + 0.36, 0.8); shade.rotation.x = 0.5; g.add(shade);
      ball(g, 0.07, lx, h + 0.3, 0.82, lamp);
    }
    for (const [x, z] of [[-w / 4, -4], [w / 5, -8], [w / 3, -3.5]]) box(g, 1.6, 0.9, 1.6, x!, h + 0.45, z!, toon({ color: '#b9ada0' })); // its air units
    // the HARDWARE blade at the corner, lettered both sides, a key hung under it on chains: KEYS CUT
    {
      const bx = -w / 2 + 0.45, y0 = wTop + 0.7, bh = 3.0, out = 0.25, depth = 1.0;
      box(g, 0.22, bh + 0.16, depth + 0.16, bx, y0 + bh / 2, out + depth / 2, toon({ color: HW.navy }));
      const blade = canvasTex(256, Math.round((256 * bh) / depth), (c) => {
        const Wc = c.canvas.width, Hc = c.canvas.height;
        c.fillStyle = HW.orange; c.fillRect(0, 0, Wc, Hc); c.strokeStyle = HW.cream; c.lineWidth = 8; c.strokeRect(10, 10, Wc - 20, Hc - 20);
        c.fillStyle = HW.cream; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = font(F.sign(700), Hc * 0.1);
        [...'HARDWARE'].forEach((ch, k) => c.fillText(ch, Wc / 2, Hc * (0.08 + k * 0.12)));
      });
      for (const s of [-1, 1]) { const p = plane(g, depth, bh, bx + s * 0.115, y0 + bh / 2, out + depth / 2, pic(blade)); p.rotation.y = s * Math.PI / 2; }
      limb(g, V3(bx, y0 - 0.02, 0.02), V3(bx, y0 - 0.02, out + depth), 0.03, ink);
      const key = canvasTex(512, 192, (c) => {
        c.fillStyle = '#f6c445'; c.strokeStyle = HW.ink; c.lineWidth = 6;
        c.beginPath(); c.arc(90, 96, 80, 0, Math.PI * 2); c.fill(); c.stroke();
        c.fillStyle = HW.ink; c.beginPath(); c.arc(60, 96, 22, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#f6c445'; c.beginPath(); c.moveTo(160, 60); c.lineTo(500, 60); c.lineTo(500, 118); c.lineTo(470, 118); c.lineTo(455, 150); c.lineTo(435, 118); c.lineTo(405, 118); c.lineTo(390, 160); c.lineTo(370, 118); c.lineTo(160, 118); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = HW.ink; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = font(F.sign(700), 40); c.fillText('KEYS CUT', 300, 90, 270);
      });
      const kp = plane(g, 1.05, 0.4, bx, y0 - 0.45, out + depth / 2, pic(key, { transparent: true, side: THREE.DoubleSide })); kp.rotation.y = -Math.PI / 2;
      for (const z of [out + 0.15, out + depth - 0.15]) limb(g, V3(bx, y0 - 0.02, z), V3(bx, y0 - 0.28, z), 0.01, steel);
    }
    // its end wall toward the corner, painted as an ad by a sign painter
    {
      const ew = Sh.d - 1.4, eh = h - 1.0, mural = canvasTex(2048, Math.round((2048 * eh) / ew), (c) => {
        const Wc = c.canvas.width, Hc = c.canvas.height;
        c.fillStyle = '#efe0bf'; c.fillRect(0, 0, Wc, Hc);
        c.fillStyle = HW.orange; c.fillRect(0, Hc * 0.6, Wc, Hc * 0.13);
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillStyle = HW.orange; c.font = font(F.sign(700), Hc * 0.24); c.fillText('HANDLE IT', Wc / 2, Hc * 0.2, Wc * 0.9);
        c.fillStyle = HW.navy; c.font = font(F.sign(700), Hc * 0.2); c.fillText('HARDWARE', Wc / 2, Hc * 0.43, Wc * 0.8);
        c.fillStyle = HW.cream; c.font = font(F.sign(700), Hc * 0.07); c.fillText('TOOLS · PAINT · KEYS · LUMBER · GARDEN', Wc / 2, Hc * 0.665, Wc * 0.92);
        // under the band a row of tools painted big (its lower half stands behind the A-frames: no words there)
        c.fillStyle = HW.navy;
        const tool = (k: number, x: number) => {
          const y = Hc * 0.78, s = Hc * 0.16;
          c.save(); c.translate(x, y + s * 0.5); c.rotate([0.5, -0.4, 0.3, -0.5, 0.45][k]!);
          if (k === 0) { c.fillRect(-s * 0.06, -s * 0.5, s * 0.12, s); c.fillRect(-s * 0.3, -s * 0.62, s * 0.6, s * 0.2); } // a hammer
          else if (k === 1) { c.fillRect(-s * 0.07, -s * 0.4, s * 0.14, s * 0.8); c.beginPath(); c.arc(0, -s * 0.5, s * 0.2, 0, Math.PI * 2); c.fill(); c.clearRect(-s * 0.07, -s * 0.75, s * 0.14, s * 0.25); } // a wrench
          else if (k === 2) { c.beginPath(); c.moveTo(-s * 0.15, -s * 0.5); c.lineTo(s * 0.15, -s * 0.5); c.lineTo(s * 0.15, s * 0.3); c.lineTo(-s * 0.15, s * 0.1); c.fill(); c.fillStyle = HW.orange; c.fillRect(-s * 0.18, s * 0.25, s * 0.36, s * 0.25); c.fillStyle = HW.navy; } // a saw
          else if (k === 3) { c.fillRect(-s * 0.04, -s * 0.5, s * 0.08, s * 0.6); c.fillStyle = HW.orange; c.fillRect(-s * 0.09, s * 0.1, s * 0.18, s * 0.4); c.fillStyle = HW.navy; } // a screwdriver
          else { c.fillRect(-s * 0.05, -s * 0.1, s * 0.1, s * 0.6); c.fillStyle = HW.orange; c.fillRect(-s * 0.2, -s * 0.5, s * 0.4, s * 0.4); c.fillStyle = HW.navy; } // a brush
          c.restore();
        };
        for (let k = 0; k < 5; k++) tool(k, Wc * (0.14 + k * 0.18));
        // the paint worn in patches
        c.fillStyle = 'rgba(160,120,90,0.1)';
        for (let k = 0; k < 50; k++) { const u = (k * 0.618) % 1, v = (k * 0.381) % 1; c.beginPath(); c.ellipse(u * Wc, v * Hc, Wc * 0.03 * (0.5 + ((k * 0.7) % 1)), Hc * 0.025, u * 3, 0, Math.PI * 2); c.fill(); }
      });
      const p = plane(g, ew, eh, -w / 2 - 0.012, 0.5 + eh / 2, -0.7 - ew / 2, pic(mural)); p.rotation.y = -Math.PI / 2;
    }
    // painted on the front left of the banner: a paint can tipped, its paint running down to the word
    {
      const pw = 4.4, ph = 2.4;
      plane(g, pw, ph, X(3.4), Sh.banner.y, 0.012, pic(canvasTex(1024, Math.round((1024 * ph) / pw), (c) => {
        const Wc = c.canvas.width, Hc = c.canvas.height;
        c.save(); c.translate(Wc * 0.2, Hc * 0.32); c.rotate(0.5); // the can, tipped toward the word
        c.fillStyle = '#c8102e'; c.fillRect(-90, -110, 180, 220); c.fillStyle = '#9a9aa2'; c.fillRect(-96, -122, 192, 22); c.fillRect(-96, 104, 192, 14);
        c.fillStyle = HW.cream; c.fillRect(-70, -40, 140, 80); c.fillStyle = HW.navy; c.font = font(F.sign(700), 34); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('HANDLE', 0, -12); c.fillText('IT', 0, 22);
        c.restore();
        // its paint pouring out and running in drips along the top of the word
        c.fillStyle = HW.orange; c.beginPath(); c.moveTo(Wc * 0.31, Hc * 0.2); c.quadraticCurveTo(Wc * 0.375, Hc * 0.22, Wc * 0.375, Hc * 0.5); c.lineTo(Wc * 0.345, Hc * 0.5); c.quadraticCurveTo(Wc * 0.345, Hc * 0.28, Wc * 0.3, Hc * 0.25); c.closePath(); c.fill();
        c.beginPath(); c.moveTo(Wc * 0.3, Hc * 0.47);
        for (let x = Wc * 0.3; x <= Wc * 0.96; x += 8) c.lineTo(x, Hc * (0.47 - 0.012 * Math.sin(x * 0.03)));
        c.lineTo(Wc * 0.96, Hc * 0.53); c.lineTo(Wc * 0.3, Hc * 0.53); c.closePath(); c.fill();
        for (let k = 0; k < 9; k++) { const x = Wc * (0.33 + k * 0.07), l = Hc * (0.03 + 0.08 * ((k * 0.61) % 1)); c.beginPath(); c.roundRect(x, Hc * 0.5, 22, l, 11); c.fill(); }
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillStyle = 'rgba(31,42,68,0.25)'; c.font = font(F.sign(700), Hc * 0.27); c.fillText('PAINT', Wc * 0.665 + 8, Hc * 0.78 + 8, Wc * 0.62);
        c.fillStyle = HW.navy; c.fillText('PAINT', Wc * 0.665, Hc * 0.78, Wc * 0.62);
        c.font = font(F.sign(600), Hc * 0.075); c.fillText('MIXED WHILE U WAIT', Wc * 0.665, Hc * 0.95, Wc * 0.62);
      }), { transparent: true }));
    }
    box(g, 0.06, 0.5, Sh.d, -w / 2 - 0.03, 0.25, -Sh.d / 2, toon({ color: HW.deep }));
    cyl(g, 0.07, h, w / 2 - 0.12, h / 2, 0.06, toon({ color: '#d9d0c0' })); // a downpipe at its far corner
    // the stock on the sidewalk: a ladder against the corner pier, two wheelbarrows, a pallet of potting soil, a barrel of
    // rakes, shovels and brooms by the door (their heads up: bare handles read as cables — the user, 2026-10-14: "wires
    // plugged into a window"), a pyramid of paint, a rack of coiled hoses, the propane cage
    {
      const alu = toon({ color: '#b8bcc4' }), wood = toon({ color: '#c9a97a' });
      { const lx = X(0.45); for (const s of [-1, 1]) limb(g, V3(lx + s * 0.22, 0, 0.95), V3(lx + s * 0.22, wTop - 0.4, 0.06), 0.03, alu); for (let k = 1; k < 9; k++) { const u = k / 9; box(g, 0.44, 0.04, 0.04, lx, u * (wTop - 0.4), 0.95 - u * 0.89, alu); } }
      const barrow = (a: number, z: number, rot: number, col: string) => {
        const b = new THREE.Group(); b.position.set(X(a), 0, z); b.rotation.y = rot; g.add(b);
        const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.32, 0.36, 4, 1), toon({ color: col })); tray.rotation.y = Math.PI / 4; tray.scale.set(0.8, 1, 1.25); tray.position.y = 0.55; b.add(tray);
        const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.06, 8, 16), ink); wheel.rotation.y = Math.PI / 2; wheel.position.set(0, 0.22, 0.62); b.add(wheel);
        for (const s of [-1, 1]) { limb(b, V3(s * 0.2, 0.3, 0.62), V3(s * 0.28, 0.62, -0.95), 0.025, frame); limb(b, V3(s * 0.22, 0, -0.3), V3(s * 0.22, 0.42, -0.25), 0.02, frame); }
      };
      barrow(2.3, 1.4, 0.35, '#c8102e'); barrow(3.9, 1.15, -0.25, '#2f7a5a');
      box(g, 1.2, 0.14, 1.0, X(6.4), 0.07, 0.9, toon({ color: '#b08a5a' }));
      for (let k = 0; k < 6; k++) { const bag = box(g, 0.55, 0.2, 0.42, X(6.4) + (k % 2 ? 0.28 : -0.28), 0.24 + Math.floor(k / 2) * 0.2, 0.9 + ((k % 3) - 1) * 0.05, toon({ color: k % 2 ? '#3a6a3a' : '#6a4a2a' })); bag.rotation.y = (k % 3) * 0.06; }
      // the barrel of long-handled tools, heads up
      { const bx = X(7.95), bz = 0.55;
        cyl(g, 0.3, 0.75, bx, 0.375, bz, toon({ color: '#8a5a32' })); for (const y of [0.15, 0.6]) cyl(g, 0.31, 0.05, bx, y, bz, frame);
        const heads: [number, number, 'rake' | 'shovel' | 'broom'][] = [[-0.5, -0.2, 'rake'], [-0.15, 0.15, 'shovel'], [0.2, -0.1, 'broom'], [0.45, 0.2, 'rake'], [-0.35, 0.3, 'shovel'], [0.05, -0.35, 'broom']];
        heads.forEach(([ax, az, kind], k) => {
          const top = V3(bx + ax * 0.5, 1.75 + (k % 3) * 0.12, bz + az * 0.5);
          limb(g, V3(bx + ax * 0.12, 0.3, bz + az * 0.12), top, 0.025, wood);
          const hd = new THREE.Group(); lay(hd, top, top.clone().sub(V3(bx, 0.3, bz)), V3(0, 0, 1)); g.add(hd);
          if (kind === 'rake') { box(hd, 0.45, 0.05, 0.05, 0, 0, 0, steel); for (let t = 0; t < 8; t++) box(hd, 0.02, 0.1, 0.02, -0.2 + t * 0.057, 0.06, 0, steel); }
          else if (kind === 'shovel') { const s = box(hd, 0.26, 0.34, 0.03, 0, 0.17, 0, toon({ color: '#5a6a7a' })); s.scale.x = 1; box(hd, 0.08, 0.1, 0.04, 0, 0, 0, steel); }
          else { box(hd, 0.4, 0.07, 0.1, 0, 0, 0, toon({ color: HW.orange })); box(hd, 0.38, 0.14, 0.08, 0, 0.1, 0, toon({ color: '#e0b060' })); }
        });
      }
      // a pyramid of gallon cans, 4-3-2-1
      { let k = 0; for (let row = 0; row < 4; row++) for (let i = 0; i < 4 - row; i++, k++) { const cx = X(10.75) + (i - (3 - row) / 2) * 0.3, y = 0.11 + row * 0.22; cyl(g, 0.13, 0.2, cx, y, 0.75, toon({ color: ['#c8102e', '#2b78a6', '#f6c445', '#f7f4ec', '#2f7a5a'][k % 5]! })); cyl(g, 0.132, 0.02, cx, y + 0.1, 0.75, steel); } }
      // the hose rack: green, orange and yellow coils on a low rail
      { const rx = X(15.3); for (const s of [-1, 1]) box(g, 0.06, 1.0, 0.06, rx + s * 0.9, 0.5, 0.95, frame); box(g, 1.9, 0.05, 0.05, rx, 0.98, 0.95, frame);
        ['#2f7a5a', HW.orange, '#f6c445', '#2f7a5a'].forEach((col, k) => { for (const r of [0.13, 0.18, 0.23]) { const coil = new THREE.Mesh(new THREE.TorusGeometry(r, 0.022, 6, 20), toon({ color: col })); coil.position.set(rx - 0.6 + k * 0.4, 0.98 - r, 0.98 + r * 0.1); g.add(coil); } }); }
      // the propane cage: a white wire cage, its tanks inside, its sign on top
      { const px = X(21.6), pz = 0.65, cw = 1.3, ch = 1.6, cd = 0.7, white = toon({ color: '#f4f4f0' });
        const tank = toon({ color: '#2b78a6' });
        for (let k = 0; k < 4; k++) { const tx = px - 0.3 + (k % 2) * 0.6, ty = k > 1 ? 1.0 : 0.26; cyl(g, 0.15, 0.48, tx, ty, pz, tank); ball(g, 0.15, tx, ty + 0.24, pz, tank); }
        box(g, cw, 0.04, cd, px, 0.7, pz, white);
        for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) box(g, 0.04, ch, 0.04, px + (x * cw) / 2, ch / 2, pz + (z * cd) / 2, white);
        for (const y of [0.02, ch]) { box(g, cw, 0.04, 0.04, px, y, pz + cd / 2, white); box(g, cw, 0.04, 0.04, px, y, pz - cd / 2, white); }
        plane(g, cw, ch, px, ch / 2, pz + cd / 2 + 0.01, pic(canvasTex(128, 160, (c) => { c.strokeStyle = 'rgba(244,244,240,0.9)'; c.lineWidth = 2; for (let x = 0; x <= 128; x += 10) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 160); c.stroke(); } for (let y = 0; y <= 160; y += 10) { c.beginPath(); c.moveTo(0, y); c.lineTo(128, y); c.stroke(); } }), { transparent: true }));
        plane(g, cw, 0.3, px, ch + 0.17, pz + cd / 2, pic(signFace('PROPANE', 512, 118, '#ffffff', '#2b78a6', F.sign(700), 0.62, 0.1)));
      }
    }
    // Mr. Handle It on his plinth, past the banner, turned a little toward the coming street
    { const man = new THREE.Group(); man.position.set(X(Sh.statue.at), 0, Sh.statue.out); man.rotation.y = -0.35; g.add(man); mrHandleIt(man); }
    // its customers (the cast's silhouettes): one looking up at him, one walking up the sidewalk with a gallon of paint
    // (both clear of the posters while they're read: right of them, out by the curb)
    { const fan = walker(); fan.position.set(X(Sh.statue.at + 2.2), 0, 3.0); fan.rotation.y = Math.atan2(-2.2, Sh.statue.out - 3.0); g.add(fan);
      shopper = walker(); shopper.rotation.y = -Math.PI / 2; g.add(shopper); shopperAt = (k) => X(Sh.len + 4 - k);
      cyl(shopper, 0.1, 0.17, 0, 0.72, 0.2, toon({ color: '#c8102e' })); }
    root.add(g);
  }
  // the banner: its white hem, grommets, tied at its corners to hooks in the wall and up to the sign board (its words and
  // red are the carriers')
  {
    const bn = onPanel(plan.banner), chrome = toon({ color: WORLD.chrome }), rope = toon({ color: '#e8dcc0' }), bw = plan.banner.w, bh = plan.banner.h;
    // (one white hem round the whole banner: its phrases are one banner, not three)
    const hem = toon({ color: '#ffffff' });
    for (const y of [bh / 2, -bh / 2]) box(bn, bw + 0.08, 0.06, 0.02, 0, y, 0.005, hem);
    for (const x of [bw / 2, -bw / 2]) box(bn, 0.06, bh, 0.02, x, 0, 0.005, hem);
    for (const [px, py] of [[-1, 1], [1, 1], [-1, -1], [1, -1]] as const) {
      const at = V3((px * bw) / 2 - px * 0.12, (py * bh) / 2 - py * 0.1, 0.012), hook = V3((px * bw) / 2 + px * 0.45, (py * bh) / 2 + py * 0.22, -0.1);
      ball(bn, 0.05, at.x, at.y, at.z, chrome); limb(bn, at, hook, 0.012, rope); ball(bn, 0.04, hook.x, hook.y, hook.z, chrome);
    }
    for (let k = 1; k < 5; k++) { const x = -bw / 2 + (k * bw) / 5; ball(bn, 0.04, x, bh / 2 - 0.1, 0.012, chrome); limb(bn, V3(x, bh / 2 - 0.1, 0.012), V3(x, bh / 2 + 0.2, 0.0), 0.01, rope); }
    root.add(bn);
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
    for (const [a, b] of [[-w / 2, -0.75], [0.75, w / 2]] as const) box(g, b - a, 0.5, 0.06, (a + b) / 2, 0.25, 0.03, redM); // the red base, either side of the door (it ran through it: the user, 2026-10-14)
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
      // the shopper walking up the hardware store's sidewalk toward the corner, legs scissoring with their stride
      { const walked = Math.max(0, t - SHOPPER.t0) * SHOPPER.v; shopper.position.set(shopperAt(walked), 0, SHOPPER.z); const swing = 0.5 * Math.sin(walked * 4.8); shopper.getObjectByName('legL')!.rotation.x = swing; shopper.getObjectByName('legR')!.rotation.x = -swing; }
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
