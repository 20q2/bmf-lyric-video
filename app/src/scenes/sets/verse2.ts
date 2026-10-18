// Verse 2's props (drive/sets/verse2.ts): Handled Hardware (Mr. Handle It's: "slightly less on the nose" than Handle It
// Hardware, the user, 2026-10-16) on the corner of Slauson — its tall pole sign at the curb (its name over the lightbox,
// a giant wrench on top, the trades under it), the side street, chalk A-frames on the sidewalk, the store itself (its
// false front and sign board, awnings, windows onto the shop floor with posters taped in them: the carriers; its stock
// out on the sidewalk, its banner tied up under the board, Mr. Handle It himself on his plinth, winking as he's named);
// the fried chicken spot past it, open and busy, the big sign on its roof ringed with bulbs and the chicken standing on it;
// the hand car wash on the right (its '60s sign in its lot: the words' board in a bulb-ringed bezel, a breaking wave
// over it with HAND WASH across it, its mascot and a finned sedan right of the words, a $9.99 starburst, on braced
// columns over a planter; its bays); the big painted billboard on the sand up the street, on its legs, its catwalk,
// lamps and ladder. The lyrics are the carriers. Browser only (canvas).
import * as THREE from 'three';
import { wallMaterial } from '../../look/walls';
import { FACADE, facadeMeshes, facades } from '../../look/facades';
import type { Block } from '../../drive/blocks';
import type { Drive } from '../../drive/drive';
import { GIANT, SHACK, type Verse2Plan, WASH, tireShop } from '../../drive/sets/verse2';
import { LAYOUT } from '../../drive/carriers';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ROAD_HALF } from '../../drive/route';
import { CORNER_WALK, SIDEWALKS } from '../../drive/world';
import { WORLD, toon } from '../../look/toon';
import { GLOW, lampMaterial } from '../../look/night';
import { F, font } from '../../engine/type';
import { UP, ball, box, canvasTex, cyl, fuse, leftFront, onPanel, paint, part, pic, plane, roadFrame, sedan, signFace, stride, tball, tbox, tcyl, walker } from './kit';
import { glassTex } from './chorus1';

/** Slauson, the side street (m, along it from the main road's edge): its fronts from `from` to `len` (out into the
 *  haze), their depth, the sidewalk's width; an awning's height at the wall, how far it reaches out, its fall. */
const SLAUSON = { from: 22, len: 700, depth: 14, walk: 3, awning: { y: 2.95, out: 1.4, fall: 0.2 } };

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
/** The paint cans' colours, in the windows and on the sidewalk: house paint's — putty, greige, off-white, slate, a
 *  dusty blue, sage, a muted brick (the user, 2026-10-15: in primaries, row on row, "it kind of looks like library
 *  books"). */
const CANS = ['#b9b2a2', '#8f897c', '#e2dccd', '#6f777a', '#7f8f99', '#8d9682', '#9a6f62'];
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
function mrHandleIt(man: THREE.Object3D) {
  // (his still parts in a group of their own, batched into a few meshes: his wink's movers beside it, not in it)
  const g = new THREE.Group(); man.add(g);
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
  // his face: big cartoon eyes, open (whites, pupils looking down at the street, lids with a dark line along their rims),
  // brows, a nose, a big grin. His right eye (the near one from the street) winks as he's named: its lid comes down, his
  // cheek lifts under it, its brow dips (the movers, returned; the user, 2026-10-16: "it should have its eyes open, and
  // then it should give us a wink"). (He was painted mid-wink, an eye a dash.)
  const white = toon({ color: '#f7f4ec' }), eyes: { lid: THREE.Mesh; brow: THREE.Mesh; cheek: THREE.Mesh }[] = [];
  for (const s of [-1, 1]) {
    const ex = s * 0.17, ey = y0 + 4.93, eye = new THREE.Group(); eye.position.set(ex, ey, 0.4); eye.rotation.y = s * 0.32; eye.scale.set(1, 1.25, 0.6); (s < 0 ? man : g).add(eye);
    ball(eye, 0.11, 0, 0, 0, white);
    ball(eye, 0.05, -0.025, -0.02, 0.095, ink).scale.z = 0.35; // (the pupil, a disc on the white: toward the street below, inside the shut lid)
    // the lids: skin domes over its top and its foot, the upper's rim lined dark; the upper turns down to meet the lower
    // (rotation.x: open LID.open, shut LID.shut), its line then a curve across the shut eye
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.125, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), skin); lid.rotation.x = LID.open; eye.add(lid);
    const under = new THREE.Mesh(new THREE.SphereGeometry(0.124, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), skin); under.rotation.x = 0.59; eye.add(under);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.012, 6, 24), ink); rim.rotation.x = Math.PI / 2; lid.add(rim);
    const brow = box(s < 0 ? man : g, 0.22, 0.05, 0.08, ex, ey + 0.2, 0.36, ink); brow.rotation.z = -s * 0.12;
    const cheek = ball(s < 0 ? man : g, 0.1, ex - s * 0.02, ey - 0.17, 0.4, skin); cheek.scale.set(1.3, 0.8, 0.7);
    if (s < 0) { lid.name = 'lid'; brow.name = 'brow'; cheek.name = 'cheek'; } // (named, the batching leaves them be)
    eyes.push({ lid, brow, cheek });
  }
  ball(g, 0.08, 0, y0 + 4.8, 0.47, skin);
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
  return eyes[0]!; // (his right: the winking one)
}
/** His upper lids' turn (radians about their eye's x): open, and shut down onto the lower lid. */
const LID = { open: -0.45, shut: 0.7 };
/** His wink at `t` (s since it starts): how shut his eye is, 0..1 — down in 0.08 s, held 0.12, up in 0.16. */
const winkAt = (t: number) => (t < 0 || t > 0.36 ? 0 : t < 0.08 ? Math.sin((Math.PI / 2) * (t / 0.08)) : t < 0.2 ? 1 : 0.5 + 0.5 * Math.cos((Math.PI * (t - 0.2)) / 0.16));

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
  // the gondolas: three shelves of stock — gallon cans of house paint, their lids and labels, in runs of a colour with
  // gaps between and a carton now and then (a shop's shelves, not a display: the user, 2026-10-15)
  c.fillStyle = '#3a2e2a'; c.fillRect(0, H * 0.52, W, H * 0.48);
  for (let row = 0; row < 3; row++) {
    const top = H * (0.54 + row * 0.15), base = top + H * 0.13, ch = H * 0.085, cw = ch * 0.9;
    for (let i = 0, x = 4; x < W - cw; i++) {
      const k = row * 300 + i, kind = r(k + 3);
      if (kind < 0.18) { x += cw * (1 + 2 * r(k + 5)); continue; } // a gap on the shelf
      if (kind < 0.3) { const bw = cw * 2.2, bh = ch * 1.15; c.fillStyle = '#a88a64'; c.fillRect(x, base - bh, bw - 3, bh); c.fillStyle = 'rgba(60,40,24,0.35)'; c.fillRect(x, base - bh + bh * 0.42, bw - 3, 3); x += bw; continue; } // a carton
      const col = CANS[Math.floor(r(Math.floor(k / 4) + 77) * CANS.length)]!; // (a run of a colour)
      c.fillStyle = col; c.fillRect(x, base - ch, cw - 4, ch);
      c.fillStyle = '#c9c4b8'; c.fillRect(x - 1, base - ch - 3, cw - 2, 4); // its lid's rim
      c.fillStyle = 'rgba(246,240,226,0.7)'; c.fillRect(x, base - ch * 0.62, cw - 4, ch * 0.3); // its label
      c.fillStyle = 'rgba(30,24,22,0.25)'; c.fillRect(x + cw - 9, base - ch, 5, ch); // its shade
      x += cw;
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

// ---- the chicken spot's pieces (the user, 2026-10-16: "I really like the fried chicken store ... improve the fidelity
// of the building by a bit, add some smaller details. My vibe is that the place looks closed") ----
/** The town's sidewalk (drive/world.ts SIDEWALKS): its width off the road's edge, its kerb's height. */
const WALK = { width: 3, kerb: 0.15 };
/** Quads (four corners each, counter-clockwise from outside) as one geometry, flat-shaded. */
function quads(qs: readonly THREE.Vector3[][]): THREE.BufferGeometry {
  const pos: number[] = [];
  for (const [a, b, c, d] of qs) for (const p of [a, b, c, a, c, d]) pos.push(p!.x, p!.y, p!.z);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.computeVertexNormals();
  return geo;
}
/** The chicken spot's customers' clothes (their own, not the passers-by's: kit's walker() dresses by its turn, and one
 *  more here would re-dress every passer-by after). */
const DINERS = [
  { skin: '#6b4330', top: '#2f5d7c', legs: '#2a3550', shoes: '#f0ece2', hair: '#141012' },
  { skin: '#d9a67e', top: '#d9a23a', legs: '#3a3a40', shoes: '#1a1618', hair: '#4a2e1a' },
  { skin: '#8f5e40', top: '#3c6b4a', legs: '#6a5a46', shoes: '#5a3a26', hair: '#141012' },
  { skin: '#4a2e22', top: '#b85a7a', legs: '#1e2228', shoes: '#f0ece2', hair: '#2a1a12' },
];
/** A customer, as kit's walker() builds a passer-by (tinted parts, fused): sitting on a seat `seat` high, hands forward
 *  on the table (or standing, seat 0), facing +z, feet at y 0; eating a drumstick (his right hand up to his mouth) or
 *  carrying a bucket. */
function diner(look: number, seat = 0, hold?: 'eat' | 'bucket'): THREE.Group {
  const P = DINERS[look % DINERS.length]!, g = new THREE.Group(), hip = seat ? seat + 0.08 : 0.88;
  const cap = (to: THREE.Object3D, r: number, len: number, color: string, x: number, y: number, z: number, rx = 0, sx = 1, sz = 1) => { const m = part(to, new THREE.CapsuleGeometry(r, len, 3, 8).scale(sx, 1, sz), color, x, y, z); m.rotation.x = rx; return m; };
  tbox(g, 0.3, 0.16, 0.2, 0, hip + 0.05, 0, P.legs); // the hips
  for (const x of [-0.085, 0.085]) {
    if (seat) { cap(g, 0.07, 0.3, P.legs, x, hip, 0.2, Math.PI / 2); cap(g, 0.06, hip - 0.2, P.legs, x, hip / 2, 0.4); tbox(g, 0.1, 0.07, 0.25, x, 0.035, 0.46, P.shoes); }
    else { cap(g, 0.07, 0.66, P.legs, x, 0.46, 0); tbox(g, 0.1, 0.07, 0.25, x, 0.035, 0.05, P.shoes); }
  }
  const ty = hip + 0.36;
  cap(g, 0.15, 0.34, P.top, 0, ty, 0, 0, 1.22, 0.72); // the torso
  tcyl(g, 0.048, 0.1, 0, ty + 0.28, 0, P.skin, 10);
  part(g, new THREE.SphereGeometry(0.105, 12, 9).scale(0.92, 1.08, 1), P.skin, 0, ty + 0.415, 0.005);
  part(g, new THREE.SphereGeometry(0.11, 12, 9).scale(0.96, 0.74, 1), P.hair, 0, ty + 0.455, -0.018);
  // the arms from the shoulders: forward to the table sitting, at the sides standing; the right up to the mouth eating
  for (const [x, right] of [[0.205, false], [-0.205, true]] as const) {
    const eat = right && hold === 'eat', sh = new THREE.Group(), el = new THREE.Group();
    sh.position.set(x, ty + 0.17, 0); sh.rotation.x = eat ? -0.9 : seat ? -1.05 : right && hold === 'bucket' ? -0.15 : 0.08; g.add(sh);
    el.position.set(0, -0.27, 0); el.rotation.x = eat ? -2.1 : seat ? -0.3 : 0; sh.add(el); // (the elbow: the forearm up to the mouth eating)
    cap(sh, 0.05, 0.22, P.top, 0, -0.14, 0); cap(el, 0.04, 0.22, P.skin, 0, -0.12, 0); tball(el, 0.045, 0, -0.28, 0.01, P.skin);
    if (eat) { part(el, new THREE.CapsuleGeometry(0.045, 0.06, 3, 8), '#c8742a', 0, -0.36, 0.03); tcyl(el, 0.012, 0.08, 0, -0.28, 0.03, '#f4ead2', 6); }
    if (right && hold === 'bucket') { tcyl(el, 0.12, 0.2, 0, -0.45, 0.02, '#c8202e'); tcyl(el, 0.122, 0.05, 0, -0.41, 0.02, '#ffffff'); }
    fuse(sh); fuse(el);
  }
  fuse(g);
  return g;
}
/** A person seen through the shop's glass (canvas, `s` px a metre, the top of their head at `top`): head, shoulders,
 *  body down past the bottom; from behind (hair over the head), or turned (`face` ±1: their face and their cap's brim
 *  that way); in a cap. */
function person(c: CanvasRenderingContext2D, x: number, top: number, s: number, o: { body: string; skin: string; hair: string; cap?: string; face?: number; arm?: number }) {
  const hr = 0.115 * s, cy = top + hr;
  c.fillStyle = o.body; c.beginPath(); c.roundRect(x - 0.24 * s, cy + hr * 1.25, 0.48 * s, 1.4 * s, 0.13 * s); c.fill();
  if (o.arm) { c.strokeStyle = o.body; c.lineCap = 'round'; c.lineWidth = 0.1 * s; c.beginPath(); c.moveTo(x + o.arm * 0.15 * s, cy + hr * 1.8); c.lineTo(x + o.arm * 0.5 * s, cy + hr * 3.4); c.stroke(); c.fillStyle = o.skin; c.beginPath(); c.arc(x + o.arm * 0.52 * s, cy + hr * 3.45, 0.05 * s, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = o.skin; c.fillRect(x - 0.05 * s, cy + hr * 0.5, 0.1 * s, hr * 0.9);
  c.beginPath(); c.ellipse(x, cy, hr * 0.92, hr, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = o.hair; c.beginPath();
  if (!o.face) c.ellipse(x, cy - hr * 0.05, hr * 0.95, hr * 0.98, 0, 0, Math.PI * 2);
  else { c.ellipse(x - o.face * hr * 0.2, cy - hr * 0.3, hr * 0.85, hr * 0.75, 0, Math.PI * 0.9, Math.PI * 2.1); }
  c.fill();
  if (o.face) { c.fillStyle = o.skin; c.beginPath(); c.ellipse(x + o.face * hr * 0.85, cy + hr * 0.1, hr * 0.2, hr * 0.16, 0, 0, Math.PI * 2); c.fill(); } // the nose
  if (o.cap) { c.fillStyle = o.cap; c.beginPath(); c.ellipse(x, cy - hr * 0.45, hr * 0.98, hr * 0.62, 0, Math.PI, Math.PI * 2); c.fill(); c.fillRect(x + (o.face ?? 0) * hr * 0.4 - hr * 0.55, cy - hr * 0.5, hr * 1.1 + Math.abs(o.face ?? 0) * hr * 0.5, hr * 0.18); }
}
/** The chicken spot through a window, lit: tubes in its ceiling, a band of tile; the counter under the menu board with
 *  the staff behind it and two customers at it, the heat lamps' case of chicken on it (`side` 0), or the booths with
 *  people eating, posters on the wall (1); a card taped in the glass; the glass's sheen as the shop glass's (chorus1
 *  glassTex) over it, the awning's shade at its head. */
function fryWindow(c: CanvasRenderingContext2D, W: number, H: number, side: number) {
  const s = H / 2.2 * 0.85; // (px a metre, a little back from the glass)
  const wall = c.createLinearGradient(0, 0, 0, H); wall.addColorStop(0, '#fff3cc'); wall.addColorStop(1, '#ffcf80');
  c.fillStyle = wall; c.fillRect(0, 0, W, H);
  c.fillStyle = '#7a3a22'; c.fillRect(0, 0, W, H * 0.09);
  for (let x = W * 0.04; x < W; x += W * 0.21) { c.fillStyle = '#fffbea'; c.fillRect(x, H * 0.05, W * 0.13, H * 0.024); }
  for (let x = 0; x < W; x += 24) { c.fillStyle = (x / 24) % 2 ? '#e8d8b8' : '#c8202e'; c.fillRect(x, H * 0.5, 24, 12); } // the tile band
  if (side === 0) {
    // the menu board, lit: three panels, a header, a picture, its rows
    const mx = W * 0.05, my = H * 0.13, mw = W * 0.9, mh = H * 0.3, pw = mw / 3;
    c.save(); c.shadowColor = 'rgba(255,214,120,0.95)'; c.shadowBlur = 26; c.fillStyle = '#2a1212'; c.fillRect(mx, my, mw, mh); c.restore();
    const items = [['2 PC MEAL', '3 PC MEAL', 'TENDERS', 'SANDWICH'], ['8 PC', '12 PC', '16 PC', 'FAMILY'], ['BISCUITS', 'FRIES', 'SLAW', 'MAC'] ];
    ['MEALS', 'BUCKETS', 'SIDES'].forEach((t, k) => {
      const px = mx + k * pw;
      c.strokeStyle = '#ffcf4a'; c.lineWidth = 3; c.strokeRect(px + 7, my + 7, pw - 14, mh - 14);
      c.fillStyle = '#ffcf4a'; c.font = font(F.sign(700), mh * 0.17); c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(t, px + 20, my + mh * 0.2, pw * 0.6);
      c.fillStyle = '#f4ead2'; c.beginPath(); c.ellipse(px + pw * 0.77, my + mh * 0.62, pw * 0.15, mh * 0.13, 0, 0, Math.PI * 2); c.fill();
      for (let j = 0; j < 3; j++) { c.fillStyle = j % 2 ? '#c8742a' : '#e09a3a'; c.beginPath(); c.ellipse(px + pw * (0.71 + j * 0.06), my + mh * (0.56 - (j % 2) * 0.05), pw * 0.05, mh * 0.08, 0.6, 0, Math.PI * 2); c.fill(); }
      c.font = font(F.sign(600), mh * 0.1);
      items[k]!.forEach((it, j) => { const yy = my + mh * (0.42 + j * 0.14); c.fillStyle = '#fff6e0'; c.fillText(it, px + 20, yy, pw * 0.36); c.fillStyle = '#ffcf4a'; c.fillText(k === 1 && j === 0 ? '9.99' : `${(2.99 + k * 4 + j * 1.5).toFixed(2)}`, px + pw * 0.43, yy); }); // (the 8 PC the card's $9.99)
    });
    // the staff behind the counter: red shirts, caps
    person(c, W * 0.3, H * 0.46, s, { body: '#c8202e', skin: '#8f5e40', hair: '#141012', cap: '#c8202e', face: 1, arm: 1 });
    person(c, W * 0.6, H * 0.48, s, { body: '#c8202e', skin: '#d9a67e', hair: '#4a2e1a', cap: '#c8202e', face: -1, arm: -1 });
    // the counter: its steel top, its red front with a white stripe; the register; the heat lamps' case, chicken in it
    c.fillStyle = '#d9d4cc'; c.fillRect(0, H * 0.7, W, H * 0.035);
    c.fillStyle = '#b81f2a'; c.fillRect(0, H * 0.735, W, H * 0.3); c.fillStyle = '#f4ead2'; c.fillRect(0, H * 0.8, W, H * 0.035);
    c.fillStyle = '#2a2a30'; c.fillRect(W * 0.43, H * 0.6, W * 0.07, H * 0.1); c.fillStyle = '#7ad0a0'; c.fillRect(W * 0.44, H * 0.61, W * 0.05, H * 0.035);
    c.save(); c.shadowColor = 'rgba(255,150,60,0.9)'; c.shadowBlur = 22; c.fillStyle = '#ffb04a'; c.fillRect(W * 0.69, H * 0.56, W * 0.27, H * 0.14); c.restore();
    for (let k = 0; k < 9; k++) { c.fillStyle = k % 2 ? '#c8742a' : '#e09a3a'; c.beginPath(); c.ellipse(W * (0.71 + k * 0.028), H * (0.665 - (k % 3) * 0.018), W * 0.018, H * 0.028, 0.5 + k, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(W * 0.69, H * 0.56, W * 0.27, H * 0.012);
    // two customers at the counter, their backs to us, nearer (bigger), dark against the light
    person(c, W * 0.18, H * 0.53, s * 1.15, { body: '#2f3a55', skin: '#4a2e22', hair: '#141012' });
    person(c, W * 0.8, H * 0.55, s * 1.15, { body: '#5a2e3a', skin: '#b47c56', hair: '#2a1a12' });
    // a card taped in the glass
    c.fillStyle = '#fff6e0'; c.fillRect(W * 0.03, H * 0.8, W * 0.16, H * 0.14); c.fillStyle = '#c8202e'; c.textAlign = 'center'; c.font = font(F.sign(700), H * 0.05); c.fillText('NOW', W * 0.11, H * 0.845); c.fillText('HIRING', W * 0.11, H * 0.905, W * 0.15);
  } else {
    // posters on the wall (a bucket, the chicken himself), sconces
    c.fillStyle = '#c8202e'; c.fillRect(W * 0.08, H * 0.16, W * 0.18, H * 0.27); c.fillStyle = '#fff6e0'; c.beginPath(); c.moveTo(W * 0.12, H * 0.22); c.lineTo(W * 0.22, H * 0.22); c.lineTo(W * 0.205, H * 0.38); c.lineTo(W * 0.135, H * 0.38); c.closePath(); c.fill();
    c.fillStyle = '#c8202e'; for (let k = 0; k < 3; k++) c.fillRect(W * (0.135 + k * 0.03), H * 0.22, W * 0.013, H * 0.16);
    c.fillStyle = '#f2c230'; c.fillRect(W * 0.62, H * 0.15, W * 0.22, H * 0.28); c.fillStyle = '#fff6e0'; c.beginPath(); c.arc(W * 0.73, H * 0.31, H * 0.08, 0, Math.PI * 2); c.fill(); c.beginPath(); c.arc(W * 0.76, H * 0.22, H * 0.045, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#d4202e'; c.fillRect(W * 0.755, H * 0.165, W * 0.012, H * 0.03); c.fillStyle = '#f29a1a'; c.beginPath(); c.moveTo(W * 0.778, H * 0.215); c.lineTo(W * 0.8, H * 0.225); c.lineTo(W * 0.778, H * 0.235); c.fill();
    for (const x of [0.38, 0.5, 0.92]) { c.save(); c.shadowColor = 'rgba(255,230,160,1)'; c.shadowBlur = 30; c.fillStyle = '#fff6d8'; c.beginPath(); c.arc(W * x, H * 0.28, H * 0.035, 0, Math.PI * 2); c.fill(); c.restore(); }
    // the booths: their backs, a table each, two eating at each, facing each other
    for (const [bx, k] of [[0.27, 0], [0.73, 1]] as const) {
      const cx = W * bx;
      person(c, cx - W * 0.1, H * 0.47, s, { body: k ? '#3c6b4a' : '#e8dcc0', skin: k ? '#d9a67e' : '#6b4330', hair: '#141012', face: 1, arm: 1 });
      person(c, cx + W * 0.1, H * 0.49, s, { body: k ? '#6a4a8a' : '#2f5d7c', skin: k ? '#4a2e22' : '#b47c56', hair: k ? '#2a1a12' : '#8a6a3a', face: -1, arm: -1 });
      c.fillStyle = '#8a1a20'; c.fillRect(cx - W * 0.2, H * 0.6, W * 0.04, H * 0.4); c.fillRect(cx + W * 0.16, H * 0.6, W * 0.04, H * 0.4); // the booths' backs
      c.fillStyle = '#c8202e'; c.fillRect(cx - W * 0.07, H * 0.71, W * 0.14, H * 0.03); c.fillStyle = '#5a5a60'; c.fillRect(cx - W * 0.008, H * 0.74, W * 0.016, H * 0.26);
      c.fillStyle = '#c9c9cc'; c.fillRect(cx - W * 0.012, H * 0.67, W * 0.024, H * 0.04); c.fillStyle = '#ffffff'; c.fillRect(cx - W * 0.009, H * 0.66, W * 0.018, H * 0.012); // napkins
      c.fillStyle = '#c8202e'; c.fillRect(cx + W * 0.025, H * 0.665, W * 0.03, H * 0.045); c.fillStyle = '#fff6e0'; c.fillRect(cx + W * 0.025, H * 0.68, W * 0.03, H * 0.01);
    }
    // a card taped in the glass
    c.fillStyle = '#fff6e0'; c.fillRect(W * 0.8, H * 0.76, W * 0.17, H * 0.18); c.fillStyle = '#c8202e'; c.textAlign = 'center'; c.font = font(F.sign(700), H * 0.05);
    // (its price the I Like Ur Look cover's, an Easter egg: the user, 2026-10-16)
    c.fillText('8 PC BUCKET', W * 0.885, H * 0.82, W * 0.16); c.font = font(F.sign(700), H * 0.08); c.fillText('$9.99', W * 0.885, H * 0.9);
  }
  // the awning's shade at its head; the glass's sheen (the shop glass's streaks of sky)
  const sh = c.createLinearGradient(0, 0, 0, H * 0.25); sh.addColorStop(0, 'rgba(60,24,12,0.45)'); sh.addColorStop(1, 'rgba(60,24,12,0)'); c.fillStyle = sh; c.fillRect(0, 0, W, H * 0.25);
  for (const [a, b, al] of [[0.06, 0.2, 0.14], [0.27, 0.31, 0.09], [0.58, 0.68, 0.12], [0.74, 0.76, 0.08]] as const) {
    c.fillStyle = `rgba(255,240,222,${al})`; c.beginPath(); c.moveTo(W * a, 0); c.lineTo(W * b, 0); c.lineTo(W * b - H * 0.8, H); c.lineTo(W * a - H * 0.8, H); c.closePath(); c.fill();
  }
}
/** Through its door, propped open: the shop lit, a checked floor, the end of the counter, one waiting at it. */
function fryDoorway(c: CanvasRenderingContext2D, W: number, H: number) {
  const s = (W / 1.16) * 0.8;
  const wall = c.createLinearGradient(0, 0, 0, H); wall.addColorStop(0, '#fff3cc'); wall.addColorStop(1, '#ffd08a');
  c.fillStyle = wall; c.fillRect(0, 0, W, H);
  c.fillStyle = '#7a3a22'; c.fillRect(0, 0, W, H * 0.07); c.fillStyle = '#fffbea'; c.fillRect(W * 0.2, H * 0.04, W * 0.6, H * 0.018);
  c.save(); c.shadowColor = 'rgba(255,214,120,0.95)'; c.shadowBlur = 16; c.fillStyle = '#2a1212'; c.fillRect(W * 0.45, H * 0.12, W * 0.6, H * 0.14); c.restore();
  c.fillStyle = '#ffcf4a'; for (let k = 0; k < 3; k++) c.fillRect(W * 0.52, H * (0.15 + k * 0.035), W * 0.3, H * 0.012);
  // the floor, red and cream checks going back
  const f0 = H * 0.76;
  for (let r = 0; r < 6; r++) {
    const y0 = f0 + ((H - f0) * r * r) / 36, y1 = f0 + ((H - f0) * (r + 1) * (r + 1)) / 36, n = 6;
    for (let k = -2; k < n + 2; k++) { c.fillStyle = (k + r) % 2 ? '#e8dcc0' : '#b81f2a'; c.fillRect((W * k) / n, y0, W / n + 1, y1 - y0 + 1); }
  }
  c.fillStyle = '#d9d4cc'; c.fillRect(W * 0.62, H * 0.5, W * 0.4, H * 0.025); c.fillStyle = '#b81f2a'; c.fillRect(W * 0.64, H * 0.525, W * 0.38, H * 0.25); c.fillStyle = '#f4ead2'; c.fillRect(W * 0.64, H * 0.58, W * 0.38, H * 0.025);
  person(c, W * 0.35, H * 0.33, s, { body: '#d9a23a', skin: '#6b4330', hair: '#141012' });
  c.fillStyle = '#2a3550'; c.fillRect(W * 0.35 - 0.2 * s, H * 0.33 + 0.86 * s, 0.4 * s, H * 0.8 - (H * 0.33 + 0.86 * s)); // (his jeans, down to the floor)
}
/** A neon OPEN: red letters in a blue border, glowing; on a clear ground. */
function neonOpen(): THREE.CanvasTexture {
  return canvasTex(512, 220, (c) => {
    c.lineJoin = 'round';
    c.save(); c.shadowColor = '#3ab8ff'; c.shadowBlur = 22; c.strokeStyle = '#7ad8ff'; c.lineWidth = 10; c.beginPath(); c.roundRect(20, 20, 472, 180, 40); c.stroke(); c.restore();
    c.strokeStyle = '#e8f8ff'; c.lineWidth = 3; c.beginPath(); c.roundRect(20, 20, 472, 180, 40); c.stroke();
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = font(F.sign(700), 128);
    c.save(); c.shadowColor = '#ff2a2a'; c.shadowBlur = 28; c.fillStyle = '#ff4a3a'; c.fillText('OPEN', 256, 116); c.restore();
    c.strokeStyle = '#ffd8c8'; c.lineWidth = 3; c.strokeText('OPEN', 256, 116);
  });
}
/** Grime for a wall `w` x `h` m (a clear canvas): dirt up from its foot, drips down from its head, smudges, a crack. */
function grimeTex(W: number, H: number, w: number, h: number, seed: number): THREE.CanvasTexture {
  return canvasTex(W, H, (c) => {
    const r = (k: number) => { const v = Math.sin(seed * 51.3 + k * 12.9898) * 43758.5453; return v - Math.floor(v); }, px = W / w;
    const foot = c.createLinearGradient(0, H, 0, H - Math.min(H, 0.8 * px)); foot.addColorStop(0, 'rgba(58,40,30,0.4)'); foot.addColorStop(1, 'rgba(58,40,30,0)');
    c.fillStyle = foot; c.fillRect(0, 0, W, H);
    if (h > 1) {
      for (let k = 0; k < w * 3; k++) { const x = r(k) * W, l = (0.3 + 1.2 * r(k + 40)) * px, gr = c.createLinearGradient(0, 0, 0, l); gr.addColorStop(0, 'rgba(80,58,44,0.22)'); gr.addColorStop(1, 'rgba(80,58,44,0)'); c.fillStyle = gr; c.fillRect(x, 0, 2 + 4 * r(k + 80), l); }
      for (let k = 0; k < w * 2; k++) { c.fillStyle = `rgba(90,70,55,${0.04 + 0.06 * r(k + 120)})`; c.beginPath(); c.ellipse(r(k + 160) * W, (0.3 + 0.6 * r(k + 200)) * H, (0.2 + 0.5 * r(k + 240)) * px, (0.1 + 0.3 * r(k + 280)) * px, r(k) * 3, 0, Math.PI * 2); c.fill(); }
      c.strokeStyle = 'rgba(70,50,40,0.45)'; c.lineWidth = 1.5; c.beginPath(); let x = W * (0.05 + 0.2 * r(300)), y = H * 0.55; c.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (r(310 + k) - 0.3) * px * 0.25; y += px * 0.12; c.lineTo(x, y); } c.stroke();
    }
  });
}

/** A row of bulbs along a line in g (from a to b): each takes a material from `ms` in turn (the chase's phases). */
function bulbs(g: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, n: number, ms: readonly THREE.Material[], phase0 = 0) {
  for (let i = 0; i <= n; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), ms[(phase0 + i) % ms.length]!); s.position.copy(a.clone().lerp(b, i / n)); g.add(s); }
}

/** The billboard's face up the street, `wM` m wide: a sign painter's bulletin, not his campaign's ad (the user:
 *  "lazy") — a sunset in flat bands, the sun striped as it sets into the sea, its glitter on the water, palms
 *  crossing over it, a candy lowrider laid low on the front; the words (the carriers') on its left, where the sky is
 *  plain. Painted on steel sheets: their seams and bolts show, rust runs from the bolts, the sun has faded its top
 *  and the weather dirtied its foot. */
function mural(c: CanvasRenderingContext2D, W: number, H: number, text: number, wM: number) {
  const bands = ['#2b1b4e', '#7a3a7e', '#d9567a', '#f28a5a', '#f6b34a', '#ffd27a'];
  const horizon = H * 0.7, front = H * 0.85, x0 = W * text, cx = x0 + (W - x0) * 0.5, px = W / wM;
  bands.forEach((col, i) => { c.fillStyle = col; c.fillRect(0, (horizon * i) / bands.length - 1, W, horizon / bands.length + 2); });
  // the sun, half down into the sea, striped across its lower half
  {
    const r = H * 0.26, sun = document.createElement('canvas'); sun.width = Math.ceil(2 * r); sun.height = Math.ceil(r);
    const s = sun.getContext('2d')!, g = s.createLinearGradient(0, 0, 0, r); g.addColorStop(0, '#fff6d8'); g.addColorStop(1, '#ffc35a');
    s.fillStyle = g; s.beginPath(); s.arc(r, r, r, Math.PI, 0); s.fill();
    s.globalCompositeOperation = 'destination-out';
    for (let k = 0; k < 6; k++) { const y = r * (0.42 + k * 0.1), t = r * (0.012 + k * 0.011); s.fillRect(0, y, 2 * r, t); }
    c.drawImage(sun, cx - r, horizon - r);
  }
  // the sea to the front, the sun's glitter on it, dashes narrowing to the horizon
  const sea = c.createLinearGradient(0, horizon, 0, front); sea.addColorStop(0, '#4a2f72'); sea.addColorStop(1, '#2e1d52'); c.fillStyle = sea; c.fillRect(0, horizon, W, front - horizon);
  c.fillStyle = '#ffd27a';
  for (let k = 0; k < 14; k++) { const u = k / 13, y = horizon + 6 + (front - horizon - 14) * u * u, w = H * (0.22 - 0.1 * u) * (0.6 + 0.4 * ((k * 0.618) % 1)), dx = (((k * 0.381) % 1) - 0.5) * H * 0.08; c.fillRect(cx + dx - w / 2, y, w, 3 + 6 * u); }
  c.fillStyle = '#f4b6c2'; c.fillRect(0, horizon - 1, W, 3); // (the horizon's line)
  // the promenade along the front, its kerb
  c.fillStyle = '#2a1830'; c.fillRect(0, front, W, H - front); c.fillStyle = '#7a3a7e'; c.fillRect(0, front, W, H * 0.012);
  // the palms: curved trunks with their rings, drooping fronds; two crossing
  c.fillStyle = '#1e1028'; c.strokeStyle = '#1e1028'; c.lineCap = 'round';
  const palm = (bx: number, h: number, lean: number) => {
    const tx = bx + lean * h, ty = front - h, mx = bx + lean * h * 0.15, my = front - h * 0.55;
    const at = (u: number) => [(1 - u) * (1 - u) * bx + 2 * u * (1 - u) * mx + u * u * tx, (1 - u) * (1 - u) * front + 2 * u * (1 - u) * my + u * u * ty] as const;
    const half = (u: number) => H * (0.012 - 0.005 * u);
    c.beginPath();
    for (let k = 0; k <= 24; k++) { const [x, y] = at(k / 24); c.lineTo(x - half(k / 24), y); }
    for (let k = 24; k >= 0; k--) { const [x, y] = at(k / 24); c.lineTo(x + half(k / 24), y); }
    c.closePath(); c.fill();
    // (its rings, faint)
    c.save(); c.strokeStyle = 'rgba(120,70,110,0.45)'; c.lineWidth = 2;
    for (let k = 1; k < 24; k++) { const u = k / 24, [x, y] = at(u); c.beginPath(); c.moveTo(x - half(u) * 0.8, y); c.lineTo(x + half(u) * 0.8, y + 2); c.stroke(); }
    c.restore();
    for (let f = 0; f < 9; f++) {
      const a = -Math.PI + (f / 8) * Math.PI + (f % 2 ? 0.08 : -0.08), L = H * (0.13 + 0.04 * ((f * 0.37) % 1)), droop = Math.abs(Math.cos(a)) * L * 0.55;
      const ex = tx + Math.cos(a) * L, ey = ty + Math.sin(a) * L * 0.55 + droop;
      c.lineWidth = H * 0.016; c.beginPath(); c.moveTo(tx, ty); c.quadraticCurveTo(tx + Math.cos(a) * L * 0.55, ty + Math.sin(a) * L * 0.7 - L * 0.12, ex, ey); c.stroke();
      for (let j = 1; j < 6; j++) { const u = j / 6, qx = tx + (ex - tx) * u, qy = ty + (ey - ty) * u - L * 0.12 * Math.sin(Math.PI * u); c.lineWidth = H * 0.006; c.beginPath(); c.moveTo(qx, qy); c.lineTo(qx + Math.cos(a + 1.4) * L * 0.12, qy + L * 0.13); c.stroke(); c.beginPath(); c.moveTo(qx, qy); c.lineTo(qx + Math.cos(a - 1.4) * L * 0.12, qy + L * 0.13); c.stroke(); }
    }
  };
  const span = W - x0;
  palm(x0 + span * 0.12, H * 0.62, 0.1); palm(x0 + span * 0.3, H * 0.74, -0.16); palm(x0 + span * 0.36, H * 0.56, 0.2);
  palm(x0 + span * 0.78, H * 0.7, -0.12); palm(x0 + span * 0.92, H * 0.6, 0.08);
  // the lowrider on the front, laid low, candy red, its chrome, whitewalls on wire wheels
  {
    const cw = span * 0.62, k = cw / 300, lx = cx - cw / 2, ly = H * 0.925;
    const P = (x: number, y: number) => [lx + x * k, ly - y * k] as const;
    const poly = (pts: readonly (readonly [number, number])[]) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(...P(x, y)) : c.moveTo(...P(x, y)))); c.closePath(); };
    c.fillStyle = 'rgba(10,4,14,0.55)'; c.beginPath(); c.ellipse(...P(150, 2), 160 * k, 7 * k, 0, 0, Math.PI * 2); c.fill();
    const candy = c.createLinearGradient(0, ly - 60 * k, 0, ly); candy.addColorStop(0, '#ff3a52'); candy.addColorStop(0.5, '#c8102e'); candy.addColorStop(1, '#6e0818');
    poly([[2, 10], [0, 22], [6, 30], [80, 34], [104, 58], [190, 60], [214, 36], [286, 36], [300, 46], [298, 24], [294, 10]]); c.fillStyle = candy; c.fill();
    c.fillStyle = '#1d2026'; poly([[110, 36], [124, 54], [150, 55], [150, 36]]); c.fill(); poly([[156, 36], [156, 55], [184, 56], [204, 37]]); c.fill();
    c.fillStyle = 'rgba(255,240,220,0.35)'; poly([[118, 40], [128, 52], [134, 52], [124, 40]]); c.fill();
    c.fillStyle = '#e8e2d6'; poly([[10, 22], [290, 26], [290, 29], [10, 25]]); c.fill(); // (its chrome spear)
    poly([[-4, 8], [16, 8], [16, 16], [-4, 15]]); c.fill(); poly([[284, 8], [304, 8], [304, 15], [284, 16]]); c.fill();
    for (const wx of [62, 240]) {
      const [x, y] = P(wx, 12), r = 15 * k;
      c.fillStyle = '#16131a'; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#f4efe4'; c.beginPath(); c.arc(x, y, r * 0.72, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#9a968e'; c.beginPath(); c.arc(x, y, r * 0.5, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#e8e2d6'; c.lineWidth = Math.max(1, r * 0.06);
      for (let s = 0; s < 12; s++) { const a = (s / 12) * Math.PI * 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5); c.stroke(); }
    }
  }
  // the steel sheets: their seams (~1.2 m apart), the bolts along the top and foot, rust run down from some
  const sheet = Math.max(1, Math.round(wM / 1.2)), sw = W / sheet;
  for (let k = 1; k < sheet; k++) {
    const x = k * sw;
    c.fillStyle = 'rgba(20,10,25,0.32)'; c.fillRect(x - 1.5, 0, 3, H);
    c.fillStyle = 'rgba(255,240,220,0.12)'; c.fillRect(x + 1.5, 0, 2, H);
  }
  for (let k = 0; k <= sheet; k++) for (const y of [H * 0.02, H * 0.5, H * 0.98]) {
    const x = Math.min(W - 4, Math.max(4, k * sw));
    c.fillStyle = 'rgba(30,20,30,0.5)'; c.beginPath(); c.arc(x, y, 3.5, 0, Math.PI * 2); c.fill();
    if (((k * 7 + Math.round(y)) % 5) === 0) { const run = c.createLinearGradient(0, y, 0, y + H * (0.08 + 0.12 * ((k * 0.618) % 1))); run.addColorStop(0, 'rgba(120,55,30,0.32)'); run.addColorStop(1, 'rgba(120,55,30,0)'); c.fillStyle = run; c.fillRect(x - 3, y, 6, H * 0.2); }
  }
  // the weather: the top faded by the sun, the paint worn in patches, the foot dirtied
  const fade = c.createLinearGradient(0, 0, 0, H * 0.5); fade.addColorStop(0, 'rgba(255,236,220,0.1)'); fade.addColorStop(1, 'rgba(255,236,220,0)'); c.fillStyle = fade; c.fillRect(0, 0, W, H * 0.5);
  c.fillStyle = 'rgba(255,236,220,0.05)'; for (let k = 0; k < 40; k++) { const u = (k * 0.618) % 1, v = (k * 0.381) % 1; c.beginPath(); c.ellipse(u * W, v * H, px * 0.6 * (0.5 + ((k * 0.7) % 1)), px * 0.25, u * 3, 0, Math.PI * 2); c.fill(); }
  const dirt = c.createLinearGradient(0, H, 0, H * 0.9); dirt.addColorStop(0, 'rgba(40,22,30,0.35)'); dirt.addColorStop(1, 'rgba(40,22,30,0)'); c.fillStyle = dirt; c.fillRect(0, H * 0.9, W, H * 0.1);
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
    plane(g, P.w + 0.4, 1.3, 0, P.h / 2 + 0.9, 0.0, name('HANDLED HARDWARE', P.w + 0.4, 1.3, '#fff6e0', orange));
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
    const S = SLAUSON, st = onRoad(C.s, 0); // (x: the road's left, down Slauson; z along the main road)
    box(st, S.len, 0.04, C.w, ROAD_HALF + S.len / 2, 0.0, 0, asphalt);
    for (let x = ROAD_HALF + 8; x < S.len; x += 6) box(st, 3, 0.02, 0.15, x, 0.03, 0, paint); // its centre dashes
    const walk = onRoad(C.s, -ROAD_HALF - 1.6);
    for (let z = -C.w / 2 + 0.6; z < C.w / 2; z += 1) box(walk, 2.4, 0.02, 0.5, 0, 0.03, z, paint);
    // a street, not a strip into the void (the user, 2026-10-15: at 80 s "the road ... goes out into the nothingness"):
    // level ground under the blocks either side, sidewalks, storefronts wall to wall behind the corner lots out into
    // the haze, power poles with their wires, street lamps, cars parked at the kerbs
    // (its fronts are the town's street fronts, look/facades.ts — a storefront, framed windows, a frieze and cornice, a
    // coping round the roof — on the town's shared materials. They were boxes printed with the walls' window grid,
    // which ran from each box's middle through every wall, from below the ground to past the roof: at 82 s, the corner
    // seen end-on behind the SLAUSON blade, "their window textures are clipping into the sides and tops, and it looks
    // really bad", the user, 2026-10-15. And each its own materials, fascia and canvas sign: some 300 draws.)
    const ground = toon({ color: '#b39a7a' }), walkM = toon({ color: '#cbbba7' }), dark = toon({ color: WORLD.post });
    const lotWall = toon({ color: '#d9cdb8' }), awnings = ['#c8202e', '#2b78a6', '#e0a526'].map((color) => toon({ color })), fronts: Block[] = [];
    // (the blocks' ground is level, in the corner's frame; the main road falls past the hardware store, ~1 m by the
    // chicken spot. Level all the way along it, it came up out of the lot through the chicken spot's front at 93.6 s:
    // "kind of like creeping up, and it's really weird to look at", the user, 2026-10-16. So it's level under
    // Slauson's blocks and the hardware store, which stands on it, and beyond them down under the road's grade.)
    const cf = route.frameAt(C.s), cFwd = V3(cf.fwd.x, 0, cf.fwd.z).normalize();
    const alongMain = (s: number) => route.frameAt(s).pos.clone().sub(cf.pos).dot(cFwd); // (z in the corner's frame)
    for (const side of [-1, 1]) {
      const zs = side * (C.w / 2), zw = zs + side * S.walk / 2, L = S.len - S.from + 40, Lx = ROAD_HALF + (S.from + S.len) / 2;
      const zNear = S.walk, zFar = S.walk + S.depth + 60;
      const zLevel = Math.max(S.walk + S.depth + 2, side > 0 ? alongMain(plan.shop.s + plan.shop.w / 2) - zs : 0);
      let low = 0;
      for (let z = zLevel; z <= zFar; z += 2) low = Math.min(low, route.frameAt(C.s + side * (Math.abs(zs) + z)).pos.y - cf.pos.y);
      box(st, L, 8, zLevel - zNear, Lx, -4 - 0.06, zs + side * (zNear + zLevel) / 2, ground); // the blocks' ground, down out of sight
      box(st, L, 8, zFar - zLevel, Lx, -4 - 0.12 + low, zs + side * (zLevel + zFar) / 2, ground); // (beyond them, under the grade)
      const w0 = CORNER_WALK.to, w1 = ROAD_HALF + S.len + 10; // (on from the corner's own walk: drive/world.ts CORNER_WALK)
      box(st, w1 - w0, 0.16, S.walk, (w0 + w1) / 2, 0.08, zw, walkM); // the sidewalk
      // the fronts: varied widths and heights, an awning on some, a lot now and then
      let x = ROAD_HALF + S.from, k = 0, built = 0;
      while (x < S.len - 20) {
        const r = (n: number) => { const v = Math.sin((k + 1) * 12.9898 * (side + 3) + n * 78.233) * 43758.5453; return v - Math.floor(v); };
        // (the first building from the corner, past a lot if one's on it, two storeys, its shop round its end: the nearest
        // building as the street's named, its end to the camera — look/facades.ts)
        const corner = built === 0 && r(4) >= 0.12, w = 9 + 13 * r(1), zc = zs + side * (S.walk + S.depth / 2);
        const h = corner ? 7.6 + 1.6 * r(3) : 4 + (r(2) < 0.3 ? 7 * r(3) : 3 * r(3));
        if (r(4) < 0.12) { // a lot: a low wall along the walk
          box(st, w - 1, 0.9, 0.3, x + w / 2, 0.45, zs + side * (S.walk + 0.2), lotWall);
        } else {
          // its box in the street's frame (x down Slauson, z across it), 6 m down into the ground under it; facadeOf's
          // +x, its front, toward the street (on the near side, its lateral −1, mirrored)
          const m = new THREE.Matrix4().makeBasis(V3(0, 0, -1), V3(0, 1, 0), V3(1, 0, 0)).scale(V3(S.depth, h + 6, w - 0.4)).setPosition(x + w / 2, (h - 6) / 2, zc);
          fronts.push({ s: 1000 * (side + 3) + x, lateral: side, w: w - 0.4, h, d: S.depth, color: r(5), matrix: m, ...(corner ? { corner: -1 as const } : {}) });
          if (r(7) < 0.45) {
            const A = S.awning, front = zs + side * S.walk;
            const aw = box(st, w - 1.4, 0.08, A.out, x + w / 2, A.y, front - side * A.out / 2, awnings[Math.floor(r(8) * 3)]!);
            aw.rotation.x = -side * A.fall; // (its outer edge the lower)
          }
        }
        if (r(4) >= 0.12) built++;
        x += w; k++;
      }
      // power poles along the near side and street lamps along the far side, every few lots
      for (let px = ROAD_HALF + S.from + 6; px < S.len - 20; px += 32) {
        const pz = zs + side * 0.6;
        if (side < 0) {
          cyl(st, 0.14, 9.5, px, 4.75, pz, dark); box(st, 0.12, 0.12, 2.4, px, 8.9, pz, dark);
          if (px + 32 < S.len - 20) for (const dz of [-0.9, 0, 0.9]) box(st, 32, 0.03, 0.03, px + 16, 8.75 - 0.25, pz + dz, dark); // its wires to the next
        } else {
          cyl(st, 0.08, 6.5, px + 16, 3.25, pz, dark); box(st, 1.6, 0.08, 0.08, px + 16, 6.45, pz - 0.8, dark);
          box(st, 0.5, 0.12, 0.25, px + 16, 6.35, pz - 1.5, lampMaterial('#ffe0a0', GLOW.lamp * 0.6, 0.9));
        }
      }
      // cars parked at the kerb, nose along the street
      for (let cx = ROAD_HALF + S.from + 10; cx < S.len * 0.6; cx += 23 + 11 * ((cx * 7) % 1)) {
        if (((cx * 13) % 3) < 1) continue;
        const car = sedan({ color: ['#e8e2d2', '#5a6a7d', '#b0532e', '#2f7a5a', '#8a5f9e'][Math.floor(cx) % 5]! });
        car.position.set(cx, 0, zs - side * 1.1); car.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2; st.add(car);
      }
    }
    st.add(facadeMeshes(facades(fronts)));
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
  let roofChicken!: THREE.Group, shopper!: THREE.Group, shopperAt!: (walked: number) => number, wink!: ReturnType<typeof mrHandleIt>;
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
    // the windows: the shop floor at the back of their depth, a display riser in each with a few cans on it, a dark
    // storefront frame
    const canM = CANS.map((color) => toon({ color }));
    Sh.windows.forEach((a, i) => {
      const cx = X(a), shop = canvasTex(1024, Math.round((1024 * W.h) / W.w), (c) => interior(c, c.canvas.width, c.canvas.height, i + 1));
      plane(g, W.w, W.h, cx, W.y, -R + 0.01, pic(shop));
      box(g, W.w - 0.1, 0.12, 0.34, cx, wBot + 0.06, -0.2, toon({ color: '#5a3a2a' }));
      // a few cans on it at one end, two and one on top (low: the posters stand over them). (Six in primaries, a toolbox
      // and bunting along the head were a display: "it doesn't need to be a whole display in the front", the user,
      // 2026-10-15)
      for (let k = 0; k < 3; k++) {
        const kx = cx - W.w / 2 + 0.45 + (k % 2) * 0.27 + (k === 2 ? 0.135 : 0), ky = wBot + 0.21 + (k === 2 ? 0.17 : 0);
        cyl(g, 0.12, 0.17, kx, ky, -0.2, canM[(k + i * 2) % canM.length]!); cyl(g, 0.122, 0.015, kx, ky + 0.085, -0.2, steel);
      }
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
      c.fillText('HANDLED HARDWARE', Wc / 2, Hc * 0.54, Wc * 0.66);
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
        c.fillStyle = HW.orange; c.font = font(F.sign(700), Hc * 0.24); c.fillText('HANDLED', Wc / 2, Hc * 0.2, Wc * 0.9);
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
    // on the front left of the banner, a sign painter's board: a paint can tipped, its paint running down to the word.
    // (It was lettered straight onto the wall: "it should have a backdrop on it, so it's not painted directly onto the
    // brick", the user, 2026-10-15 — a navy board in an orange frame, screwed to the wall: navy, as the pole's reader.)
    {
      const pw = 4.4, ph = 2.4, px = X(3.4), py = Sh.banner.y;
      box(g, pw + 0.18, ph + 0.18, 0.08, px, py, 0.04, toon({ color: HW.deep })); // its frame
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) cyl(g, 0.035, 0.02, px + sx * (pw / 2 - 0.1), py + sy * (ph / 2 - 0.1), 0.09, steel).rotation.x = Math.PI / 2; // its screws
      plane(g, pw, ph, px, py, 0.081, pic(canvasTex(1024, Math.round((1024 * ph) / pw), (c) => {
        const Wc = c.canvas.width, Hc = c.canvas.height;
        c.fillStyle = HW.navy; c.fillRect(0, 0, Wc, Hc);
        c.strokeStyle = HW.cream; c.lineWidth = 5; c.strokeRect(22, 22, Wc - 44, Hc - 44);
        c.save(); c.translate(Wc * 0.2, Hc * 0.34); c.rotate(0.5); c.scale(0.85, 0.85); // the can, tipped toward the word
        c.fillStyle = '#c8102e'; c.fillRect(-90, -110, 180, 220); c.fillStyle = '#9a9aa2'; c.fillRect(-96, -122, 192, 22); c.fillRect(-96, 104, 192, 14);
        c.fillStyle = HW.cream; c.fillRect(-70, -40, 140, 80); c.fillStyle = HW.navy; c.font = font(F.sign(700), 34); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('HANDLED', 0, 6, 130);
        c.restore();
        // its paint pouring out and running in drips along the top of the word
        c.fillStyle = HW.orange; c.beginPath(); c.moveTo(Wc * 0.31, Hc * 0.22); c.quadraticCurveTo(Wc * 0.375, Hc * 0.24, Wc * 0.375, Hc * 0.5); c.lineTo(Wc * 0.345, Hc * 0.5); c.quadraticCurveTo(Wc * 0.345, Hc * 0.3, Wc * 0.3, Hc * 0.27); c.closePath(); c.fill();
        c.beginPath(); c.moveTo(Wc * 0.3, Hc * 0.47);
        for (let x = Wc * 0.3; x <= Wc * 0.93; x += 8) c.lineTo(x, Hc * (0.47 - 0.012 * Math.sin(x * 0.03)));
        c.lineTo(Wc * 0.93, Hc * 0.53); c.lineTo(Wc * 0.3, Hc * 0.53); c.closePath(); c.fill();
        for (let k = 0; k < 9; k++) { const x = Wc * (0.33 + k * 0.066), l = Hc * (0.03 + 0.07 * ((k * 0.61) % 1)); c.beginPath(); c.roundRect(x, Hc * 0.5, 22, l, 11); c.fill(); }
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillStyle = 'rgba(0,0,0,0.3)'; c.font = font(F.sign(700), Hc * 0.25); c.fillText('PAINT', Wc * 0.645 + 7, Hc * 0.76 + 7, Wc * 0.56);
        c.fillStyle = HW.cream; c.fillText('PAINT', Wc * 0.645, Hc * 0.76, Wc * 0.56);
        c.fillStyle = '#f6c445'; c.font = font(F.sign(600), Hc * 0.07); c.fillText('MIXED WHILE U WAIT', Wc * 0.645, Hc * 0.9, Wc * 0.56);
      })));
    }
    box(g, 0.06, 0.5, Sh.d, -w / 2 - 0.03, 0.25, -Sh.d / 2, toon({ color: HW.deep }));
    cyl(g, 0.07, h, w / 2 - 0.12, h / 2, 0.06, toon({ color: '#d9d0c0' })); // a downpipe at its far corner
    // (the stock, Mr. Handle It and his customers up on the sidewalk, which now runs back to the shop's front and round
    // its corner — drive/world.ts CORNER_WALK: at the road's level they stood sunk in it)
    const onWalk = new THREE.Group(); onWalk.position.y = SIDEWALKS.kerb; g.add(onWalk);
    // the stock on the sidewalk: a ladder against the corner pier, two wheelbarrows, a pallet of potting soil, a barrel of
    // rakes, shovels and brooms by the door (their heads up: bare handles read as cables — the user, 2026-10-14: "wires
    // plugged into a window"), a pyramid of paint, a rack of coiled hoses, the propane cage
    {
      const g = onWalk;
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
      // a pyramid of gallon cans, 3-2-1, in house paint's colours
      { let k = 0; for (let row = 0; row < 3; row++) for (let i = 0; i < 3 - row; i++, k++) { const cx = X(10.75) + (i - (2 - row) / 2) * 0.3, y = 0.11 + row * 0.22; cyl(g, 0.13, 0.2, cx, y, 0.75, canM[(k * 3) % canM.length]!); cyl(g, 0.132, 0.02, cx, y + 0.1, 0.75, steel); } }
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
    { const man = new THREE.Group(); man.position.set(X(Sh.statue.at), 0, Sh.statue.out); man.rotation.y = -0.35; onWalk.add(man); wink = mrHandleIt(man); }
    // its customers (the cast's silhouettes): one looking up at him, one walking up the sidewalk with a gallon of paint
    // (both clear of the posters while they're read: right of them, out by the curb)
    { const fan = walker(); fan.position.set(X(Sh.statue.at + 2.2), 0, 3.0); fan.rotation.y = Math.atan2(-2.2, Sh.statue.out - 3.0); onWalk.add(fan);
      shopper = walker(); shopper.rotation.y = -Math.PI / 2; onWalk.add(shopper); shopperAt = (k) => X(Sh.len + 4 - k);
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
  // roof with white stripes, FRIED CHICKEN on it, a striped awning over its windows, a bucket on a pole. Open and busy
  // (the user, 2026-10-16: "the place looks closed ... it just doesn't match the vibe"): its windows lit onto the
  // counter, the staff, the menu board and the booths, a neon OPEN in one, OPEN LATE lit over its door, propped open,
  // the light spilling out onto its apron; a picnic table out front with two eating at it, one on the bench under the
  // other window, one coming out with a bucket; steam off the fryers' vent; a trash can, a newspaper box, grime. It
  // stands level on the falling road (the drive's chickenFloor): its floor a step up from its apron at the door, the
  // apron flush with the sidewalk down the grade, its foundation showing at its low end ----
  let bucketSign!: THREE.Group;
  const steam: THREE.Sprite[] = [], steamAt = new THREE.Vector3();
  {
    // (its still parts in a group of their own, batched into a few meshes; the bucket sign and the steam beside it)
    const B = plan.chicken, Ck = SHACK.chicken, Sh = SHACK.shop, at = front(B.s, Sh.face), g = new THREE.Group(), w = B.w, h = Ck.h;
    at.matrix.elements[13] = plan.chickenFloor; at.add(g);
    const inv = at.matrix.clone().invert();
    const cream = toon({ color: '#fff6e0' }), redM = toon({ color: red }), white = toon({ color: '#ffffff' }), ink = toon({ color: '#1d2026' });
    box(g, w, h, Ck.d, 0, h / 2, -Ck.d / 2, wallMaterial('#fff6e0', new THREE.Vector3(w, h, Ck.d), 0, false));
    // its apron: from its front to the sidewalk's back, flush with it, sampled along the road round its bend (in its
    // frame); apronY, its top along its front
    const edge: THREE.Vector3[] = [];
    for (let s = B.s - w / 2 - 1.2; s <= B.s + w / 2 + 1.2 + 1e-6; s += 0.6) {
      const f = route.frameAt(s);
      edge.push(f.pos.clone().addScaledVector(f.right, -(ROAD_HALF + WALK.width)).addScaledVector(UP, WALK.kerb + 0.004).applyMatrix4(inv));
    }
    const apronY = (x: number) => {
      const i = Math.min(edge.length - 1, Math.max(1, edge.findIndex((p) => p.x >= x))), a = edge[i - 1]!, b = edge[i]!;
      return a.y + (b.y - a.y) * Math.min(1, Math.max(0, (x - a.x) / (b.x - a.x)));
    };
    const deep = Math.min(...edge.map((p) => p.y)) - WALK.kerb - 0.4, qs: THREE.Vector3[][] = [];
    const inner = (p: THREE.Vector3) => V3(p.x, p.y, -0.05), down = (p: THREE.Vector3) => V3(p.x, deep, p.z);
    for (let i = 0; i + 1 < edge.length; i++) { const a = edge[i]!, b = edge[i + 1]!; qs.push([inner(a), a, b, inner(b)], [a, down(a), down(b), b]); }
    const e0 = edge[0]!, e1 = edge[edge.length - 1]!;
    qs.push([inner(e0), down(inner(e0)), down(e0), e0], [e1, down(e1), down(inner(e1)), inner(e1)]);
    part(g, quads(qs), '#c9b8a0');
    tbox(g, w + 0.04, 0.02 - deep, Ck.d + 0.04, 0, (0.02 + deep) / 2, -Ck.d / 2, '#8f877b'); // its foundation
    // the mansard: a red band round the top, white stripes across it, a cap
    box(g, w + 0.6, 1.5, Ck.d + 0.6, 0, h - 0.4, -Ck.d / 2, redM);
    for (let x = -w / 2 + 0.9; x < w / 2; x += 1.8) box(g, 0.5, 1.52, 0.02, x, h - 0.4, 0.31, white);
    box(g, w + 0.8, 0.12, Ck.d + 0.8, 0, h + 0.4, -Ck.d / 2, cream);
    plane(g, 7, 0.9, 0, h - 0.4, 0.33, name('FRIED CHICKEN', 7, 0.9, '#fff6e0', red));
    // its windows, lit onto the shop (the counter, the menu board and the staff in one, the booths in the other): their
    // glass's sheen as it was, the light behind it; their sills and heads, a frame and a mullion; a neon OPEN in the first
    const wins = [-w / 2 + 3.5, w / 2 - 3.5], WW = 4.6, WH = 2.2, WY = 2.0;
    wins.forEach((wx, i) => {
      plane(g, WW, WH, wx, WY, 0.015, pic(canvasTex(1024, Math.round((1024 * WH) / WW), (c) => fryWindow(c, c.canvas.width, c.canvas.height, i))));
      box(g, 4.8, 0.1, 0.1, wx, 3.15, 0.04, cream); box(g, 4.8, 0.1, 0.1, wx, 0.85, 0.04, cream);
      for (const x of [wx - WW / 2 + 0.03, wx, wx + WW / 2 - 0.03]) tbox(g, 0.06, WH, 0.05, x, WY, 0.04, '#2a2a30');
    });
    plane(g, 1.05, 0.45, wins[0]! + 1.25, 1.42, 0.04, pic(neonOpen(), { transparent: true, depthWrite: false }));
    // the door, propped open on a wedge (glass in an aluminium frame, a push bar, a kick plate), the shop through it; a
    // step up to it; OPEN LATE lit over it
    tbox(g, 1.4, 2.22, 0.06, 0, 1.11, 0.03, '#1d2026');
    plane(g, 1.16, 2.1, 0, 1.05, 0.062, pic(canvasTex(256, 464, (c) => fryDoorway(c, 256, 464))));
    {
      const leaf = new THREE.Group(); leaf.position.set(0.58, 0.02, 0.07); leaf.rotation.y = 1.68; g.add(leaf); // (its free edge out from the wall)
      for (const [x, y, lw, lh] of [[-0.55, 0.06, 1.1, 0.12], [-0.55, 2.0, 1.1, 0.1], [-0.04, 1.03, 0.08, 2.06], [-1.06, 1.03, 0.08, 2.06]] as const) tbox(leaf, lw, lh, 0.05, x, y, 0, '#8a8c92');
      tbox(leaf, 0.98, 0.26, 0.055, -0.55, 0.25, 0, '#b9bcc2');
      tbox(leaf, 0.8, 0.04, 0.09, -0.55, 1.05, 0, '#d9dbe0');
      const glassM = pic(glassTex());
      for (const z of [0.027, -0.027]) { const p = plane(leaf, 0.94, 1.56, -0.55, 1.16, z, glassM); if (z < 0) p.rotation.y = Math.PI; }
      fuse(leaf);
      tbox(g, 0.1, 0.05, 0.16, 0.72, 0.025, 1.12, '#e0b030'); // the wedge
    }
    tbox(g, 1.9, 0.4, 0.5, 0, -0.2, 0.31, '#bfae96');
    // (low over the door: from the street, the awning's valance hides the wall above 2.6 m)
    tbox(g, 1.5, 0.36, 0.16, 0, 2.39, 0.08, red);
    plane(g, 1.4, 0.3, 0, 2.39, 0.165, pic(signFace('OPEN LATE', 512, 110, '#fff6e0', '#e02a36', F.sign(700), 0.7, 0.1)));
    tbox(g, 1.4, 0.36, 0.06, 0, 2.39, 0.03, '#1d2026'); // (the frame's head, up to it)
    for (const [a, b] of [[-w / 2, -0.75], [0.75, w / 2]] as const) box(g, b - a, 0.5, 0.06, (a + b) / 2, 0.25, 0.03, redM); // the red base, either side of the door (it ran through it: the user, 2026-10-14)
    // its awning, one striped sheet along its front over the windows and the door, its valance lettered (it was a row of
    // slabs, a ledge)
    {
      const aw = w - 0.6, P = 1.3, y1 = 3.42, y2 = 3.06, len = Math.hypot(P, y1 - y2);
      const stripes = canvasTex(1024, 64, (c) => { for (let k = 0; k < 24; k++) { c.fillStyle = k % 2 ? '#fff6e0' : red; c.fillRect((k * 1024) / 24, 0, 1024 / 24 + 1, 64); } });
      const sheet = plane(g, aw, len, 0, (y1 + y2) / 2, P / 2, toon({ map: stripes, side: THREE.DoubleSide })); sheet.rotation.x = -Math.atan2(P, y1 - y2);
      const val = canvasTex(2048, 80, (c) => {
        c.fillStyle = red; c.fillRect(0, 0, 2048, 58);
        for (let k = 0; k < 48; k++) { c.beginPath(); c.arc(k * 42.67 + 21.3, 58, 21.3, 0, Math.PI); c.fill(); }
        c.fillStyle = '#fff6e0'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = font(F.sign(700), 38);
        for (const [x, t] of [[0.2, 'FRESH  ·  HOT  ·  CRISPY'], [0.5, 'CHICKEN  ·  BISCUITS  ·  SIDES'], [0.8, 'FRESH  ·  HOT  ·  CRISPY']] as const) c.fillText(t, 2048 * x, 31, 560);
      });
      plane(g, aw, 0.4, 0, y2 - 0.2, P, paint(val, { transparent: true, side: THREE.DoubleSide }));
      for (const s of [-1, 0, 1]) if (s) limb(g, V3((s * aw) / 2, y1 - 0.8, 0), V3((s * aw) / 2, y2, P), 0.02, ink);
    }
    // the light out of the windows and the door, warm on the apron (lying on it, down its fall)
    {
      const spill = canvasTex(256, 128, (c) => { const gr = c.createRadialGradient(128, 0, 6, 128, 0, 150); gr.addColorStop(0, 'rgba(255,196,110,1)'); gr.addColorStop(1, 'rgba(255,196,110,0)'); c.fillStyle = gr; c.fillRect(0, 0, 256, 128); });
      const spillM = new THREE.MeshBasicMaterial({ map: spill, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.4, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
      for (const [x, sw] of [[wins[0]!, 5.4], [0, 2.2], [wins[1]!, 5.4]] as const) {
        const geo = new THREE.PlaneGeometry(sw, 1.9).rotateX(-Math.PI / 2).rotateZ(Math.atan((apronY(x + 1) - apronY(x - 1)) / 2));
        const m = new THREE.Mesh(geo, spillM); m.position.set(x, apronY(x) + 0.012, 0.95); g.add(m);
      }
    }
    // grime: dirt up from the ground, drips from under the mansard, smudges; on the front, the red base, the end wall
    {
      const gm = (tex: THREE.Texture) => paint(tex, { transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
      const top = h - 1.15;
      plane(g, w, top, 0, top / 2, 0.008, gm(grimeTex(1024, 236, w, top, 1)));
      for (const [a, b] of [[-w / 2, -0.75], [0.75, w / 2]] as const) plane(g, b - a, 0.5, (a + b) / 2, 0.25, 0.062, gm(grimeTex(512, 32, b - a, 0.5, 2)));
      const end = plane(g, Ck.d, top, -w / 2 - 0.008, top / 2, -Ck.d / 2, gm(grimeTex(1024, 272, Ck.d, top, 3))); end.rotation.y = -Math.PI / 2;
    }
    // its near end: a steel side door, a meter on its conduit, a wall light, an exhaust grille; a downpipe at the far
    // corner of its front
    {
      const ex = -w / 2 - 0.03;
      tbox(g, 0.06, 2.3, 1.12, ex, 1.15, -8.4, '#3a3a40'); tbox(g, 0.07, 2.16, 0.96, ex - 0.005, 1.08, -8.4, '#8a2a26'); tbox(g, 0.1, 0.04, 0.14, ex - 0.04, 1.05, -8.05, '#c9c4b8');
      tbox(g, 0.2, 0.5, 0.34, ex - 0.07, 1.45, -3.2, '#9a9a96'); tcyl(g, 0.025, h - 2.9, ex - 0.04, 1.7 + (h - 2.9) / 2, -3.2, '#9a9a96', 6);
      tbox(g, 0.14, 0.18, 0.28, ex - 0.04, 2.7, -8.4, '#2a2a30');
      tbox(g, 0.05, 0.6, 1.0, ex - 0.01, 2.75, -11.2, '#6a6a6a');
      for (let k = 0; k < 5; k++) tbox(g, 0.06, 0.04, 0.92, ex - 0.03, 2.53 + k * 0.11, -11.2, '#3a3a3a');
      tcyl(g, 0.07, h - 0.6, w / 2 - 0.15, (h - 0.6) / 2, 0.1, '#d9d0c0');
    }
    // the fryers' vent up through the roof at the near end, its rain cap (its steam rises past the sign's left, up and
    // away from the words)
    {
      const vx = -w / 2 + 1.1, vz = -5;
      tcyl(g, 0.22, 2.0, vx, h + 0.9, vz, '#a39b8e'); tcyl(g, 0.36, 0.08, vx, h + 2.0, vz, '#7d766b');
      for (const s of [-1, 1]) tbox(g, 0.03, 0.14, 0.03, vx + s * 0.18, h + 1.92, vz, '#7d766b');
      steamAt.set(vx, h + 2.1, vz);
      // (its puffs soft, pale against the sky, the sun through them: shaded as solid balls they read as smoke, then beads)
      const puff = canvasTex(128, 128, (c) => { const gr = c.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(255,248,240,1)'); gr.addColorStop(0.55, 'rgba(255,246,236,0.6)'); gr.addColorStop(1, 'rgba(255,244,232,0)'); c.fillStyle = gr; c.fillRect(0, 0, 128, 128); });
      for (let k = 0; k < 12; k++) { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: puff, transparent: true, depthWrite: false })); m.name = 'steam'; at.add(m); steam.push(m); }
    }
    // out front: the picnic table before the first window, two eating at it (a bucket, cups, the napkins between them)
    {
      const tx = wins[0]! - 0.3, tz = 1.0, y = apronY(tx), leg = '#6a6a70';
      tbox(g, 0.8, 0.05, 1.5, tx, y + 0.74, tz, red);
      for (const sx of [-1, 1]) {
        tbox(g, 0.3, 0.04, 1.5, tx + sx * 0.62, y + 0.44, tz, red);
        for (const sz of [-1, 1]) { tbox(g, 0.05, 0.74, 0.05, tx + sx * 0.3, y + 0.37, tz + sz * 0.6, leg); tbox(g, 0.05, 0.44, 0.05, tx + sx * 0.62, y + 0.22, tz + sz * 0.6, leg); }
      }
      const top = y + 0.765;
      tcyl(g, 0.11, 0.18, tx, top + 0.09, tz - 0.4, red); tcyl(g, 0.112, 0.05, tx, top + 0.11, tz - 0.4, '#ffffff');
      for (let k = 0; k < 3; k++) tball(g, 0.05, tx - 0.04 + k * 0.04, top + 0.19, tz - 0.4 + (k % 2) * 0.03, k % 2 ? '#c8742a' : '#e09a3a');
      for (const [x, z] of [[-0.2, 0.25], [0.2, 0.45]] as const) { tcyl(g, 0.04, 0.13, tx + x, top + 0.065, tz + z, '#ffffff'); tcyl(g, 0.041, 0.03, tx + x, top + 0.09, tz + z, red); }
      tbox(g, 0.12, 0.14, 0.09, tx, top + 0.07, tz + 0.05, '#c9c9cc'); tbox(g, 0.1, 0.03, 0.07, tx, top + 0.15, tz + 0.05, '#ffffff'); // the napkin dispenser
      for (const sx of [-1, 1]) { tbox(g, 0.24, 0.04, 0.17, tx + sx * 0.2, top + 0.02, tz + 0.1, red); tbox(g, 0.2, 0.012, 0.13, tx + sx * 0.2, top + 0.045, tz + 0.1, '#f4ead2'); }
      const a = diner(0, 0.46), b = diner(1, 0.46, 'eat');
      a.position.set(tx - 0.66, y, tz - 0.1); a.rotation.y = Math.PI / 2; b.position.set(tx + 0.66, y, tz + 0.15); b.rotation.y = -Math.PI / 2; g.add(a, b);
    }
    // the bench under the other window, one eating on it; one coming out of the door with a bucket
    {
      const bx = wins[1]! + 0.6, y = apronY(bx), seat = '#c8202e';
      tbox(g, 1.7, 0.05, 0.4, bx, y + 0.45, 0.38, seat); tbox(g, 1.7, 0.3, 0.04, bx, y + 0.72, 0.17, seat);
      for (const s of [-1, 1]) tbox(g, 0.05, 0.45, 0.36, bx + s * 0.75, y + 0.225, 0.38, '#3a3a40');
      tbox(g, 0.12, 0.14, 0.09, bx + 0.65, y + 0.545, 0.38, '#c9c9cc'); tbox(g, 0.1, 0.03, 0.07, bx + 0.65, y + 0.625, 0.38, '#ffffff'); // napkins at its end
      const c = diner(2, 0.46, 'eat'); c.position.set(bx - 0.25, y, 0.3); g.add(c);
      const d = diner(3, 0, 'bucket'); d.position.set(-1.25, apronY(-1.25), 0.85); d.rotation.y = -0.6; g.add(d);
    }
    // a trash can by the door, a newspaper box at the near end
    {
      const y = apronY(2.1);
      tcyl(g, 0.27, 0.85, 2.1, y + 0.425, 1.55, '#3d4a44'); part(g, new THREE.SphereGeometry(0.29, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.55, 1), '#2f3a35', 2.1, y + 0.85, 1.55);
      tbox(g, 0.3, 0.12, 0.02, 2.1, y + 0.82, 1.83, '#141618');
      const nx = -w / 2 - 0.6, ny = apronY(nx);
      for (const s of [-1, 1]) tbox(g, 0.05, 0.4, 0.05, nx + s * 0.2, ny + 0.2, 1.5, '#2a2a30');
      tbox(g, 0.52, 0.78, 0.44, nx, ny + 0.79, 1.5, '#2b5d9a'); tbox(g, 0.54, 0.12, 0.46, nx, ny + 1.2, 1.5, '#f2c230');
      tbox(g, 0.42, 0.3, 0.02, nx, ny + 0.92, 1.725, '#e8e0c8'); tbox(g, 0.3, 0.04, 0.03, nx, ny + 0.72, 1.73, '#1d2026');
    }
    // the bucket sign on a pole by the road end, turning slowly (its pole down to the apron)
    const px = w / 2 - 1.2, py = apronY(px);
    bucketSign = new THREE.Group(); bucketSign.position.set(px, h + 2.6, 0.4); at.add(bucketSign);
    cyl(g, 0.12, h + 2.0 - py, px, (h + 2.0 + py) / 2, 0.4, dark);
    { const b = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 0.8, 1.6, 16), redM); bucketSign.add(b); for (let k = 0; k < 8; k++) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.62, 0.05), white); const a = (k / 8) * Math.PI * 2; st.position.set(Math.sin(a) * 0.9, 0, Math.cos(a) * 0.9); st.rotation.y = a; bucketSign.add(st); } const lid = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.12, 16), white); lid.position.y = 0.85; bucketSign.add(lid); }
    fuse(g);
  }
  {
    const Ck = SHACK.chicken;
    // the roof sign: its red frame, bulbs round it (chasing), legs down to the roof, the chicken standing on it
    const R = plan.sign, rg = onPanel(R), legs = R.center.y - R.h / 2 - (plan.chickenFloor + Ck.h);
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

  // ---- the car wash on the right: its sign a '60s roadside cabinet in its lot (the user, 2026-10-16: "pretty good
  // contrast-wise… maybe you could facelift it a little bit more"). The words' blue board as it was, in a red enamel
  // bezel ringed with chasing bulbs; over it a breaking wave, HAND WASH across it in a sign-painter's italic, bulbs
  // along its crest; Sudsy the droplet, the wash's mascot, on the roof of a finned sedan right of the words, a sponge
  // in his hand; a $9.99 starburst off its corner; on two steel columns braced over a brick planter, floodlights in the
  // planter. Its building's blue roof edge and its bays, open to the road, suds at the entrance ----
  {
    const Wb = plan.wash.board, g = onPanel(Wb), drop = Wb.center.y - route.frameAt(plan.wash.s).pos.y, B = WASH.board;
    const w = Wb.w, h = Wb.h, R = 0.25, L = w / 2 + R, top = h / 2 + R; // (the bezel round the board: its half-width, half-height)
    const NAVY = '#0b3a66', RED = '#d8262e', CREAM = '#fff4dc', YEL = '#ffd65a', BLUE = '#1f8fd6';
    /** A rounded rectangle centred on the origin. */
    const rrect = (rw: number, rh: number, r: number) => {
      const s = new THREE.Shape(), x = -rw / 2, y = -rh / 2;
      s.moveTo(x + r, y); s.lineTo(x + rw - r, y); s.quadraticCurveTo(x + rw, y, x + rw, y + r); s.lineTo(x + rw, y + rh - r);
      s.quadraticCurveTo(x + rw, y + rh, x + rw - r, y + rh); s.lineTo(x + r, y + rh); s.quadraticCurveTo(x, y + rh, x, y + rh - r);
      s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
      return s;
    };
    const extrude = (s: THREE.Shape, depth: number, z0: number) => new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 6 }).translate(0, 0, z0);
    /** Bulbs at these points (in g, at z): each takes the chase's phase in turn, one mesh a phase. */
    const bulbRun = (pts: readonly THREE.Vector2[], z: number, phase0 = 0) => {
      const per: THREE.BufferGeometry[][] = [[], [], []];
      pts.forEach((p, i) => per[(phase0 + i) % 3]!.push(new THREE.SphereGeometry(0.055, 8, 6).translate(p.x, p.y, z)));
      per.forEach((gs, k) => { if (gs.length) g.add(new THREE.Mesh(mergeGeometries(gs, false)!, chase[k]!)); });
    };

    // the board's face: the words' column on the left (the carriers), Sudsy and the car on the right
    const pxm = 1024 / w, H = Math.round(h * pxm), head = B.head * pxm, foot = B.foot * pxm, inner = H - head - foot;
    const right = (B.pad + LAYOUT.carwash.w + 0.15) * pxm;
    const ad = canvasTex(1024, H, (c) => {
      c.fillStyle = BLUE; c.fillRect(0, 0, 1024, H);
      c.lineJoin = 'round'; c.lineCap = 'round';
      // the car, a '59 sedan side on (design units: 300 long, its wheels' feet at 0), and Sudsy on its roof
      const x0 = right + 4, cw = Math.min(300, 1024 - x0 - 70), k = cw / 300, yb = H - foot - 26;
      const P = (x: number, y: number) => [x0 + x * k, yb - y * k] as const;
      const poly = (pts: readonly (readonly [number, number])[]) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(...P(x, y)) : c.moveTo(...P(x, y)))); c.closePath(); };
      const roof = yb - 82 * k, s = Math.min(96, (roof - head - 26) / 2.6), mx = x0 + 150 * k, my = roof - 1.3 * s;
      // a soft sunburst behind him (faint: the words read over it)
      c.fillStyle = 'rgba(255,255,255,0.07)';
      for (let i = 0; i < 18; i++) { const a0 = (i / 18) * Math.PI * 2; c.beginPath(); c.moveTo(mx, my); c.arc(mx, my, 1500, a0, a0 + Math.PI / 18); c.closePath(); c.fill(); }
      // suds: bubbles of every size round him, a few drifting behind the words
      const bub = (x: number, y: number, r: number) => {
        c.fillStyle = 'rgba(255,255,255,0.22)'; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
        c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = Math.max(2, r * 0.08); c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.9)'; c.beginPath(); c.ellipse(x - r * 0.35, y - r * 0.4, r * 0.22, r * 0.12, -0.6, 0, Math.PI * 2); c.fill();
      };
      for (let i = 0; i < 18; i++) bub(right + ((i * 0.618) % 1) * (1024 - right), head + 24 + ((i * 0.381) % 1) * (inner - 48), 9 + 30 * ((i * 0.73) % 1));
      for (let i = 0; i < 7; i++) bub(((i * 0.29) % 1) * right, head + ((i * 0.57) % 1) * inner, 8 + 14 * ((i * 0.41) % 1));
      // the car: white, a red spear down its side, chrome bumpers, whitewalls, its fin up at the tail
      c.strokeStyle = NAVY; c.lineWidth = 5;
      poly([[4, 12], [0, 24], [3, 37], [12, 44], [92, 50], [122, 81], [196, 82], [226, 54], [280, 57], [300, 76], [298, 40], [295, 12]]);
      c.fillStyle = '#ffffff'; c.fill(); c.stroke();
      c.lineWidth = 3; c.fillStyle = '#9fd8f5';
      poly([[100, 52], [126, 77], [157, 78], [157, 52]]); c.fill(); c.stroke();
      poly([[164, 52], [164, 78], [192, 79], [215, 54]]); c.fill(); c.stroke();
      c.fillStyle = RED; poly([[26, 29], [276, 38], [292, 47], [276, 45], [26, 36]]); c.fill();
      c.fillStyle = '#c9d3dc'; poly([[-4, 12], [16, 12], [16, 24], [-4, 22]]); c.fill(); c.stroke(); poly([[284, 12], [304, 12], [304, 22], [284, 24]]); c.fill(); c.stroke();
      for (const wx of [64, 236]) {
        const [cx, cy] = P(wx, 15), r = 17 * k;
        c.fillStyle = '#16131a'; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#ffffff'; c.beginPath(); c.arc(cx, cy, r * 0.66, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#c9d3dc'; c.beginPath(); c.arc(cx, cy, r * 0.38, 0, Math.PI * 2); c.fill();
      }
      // sparkles off its chrome
      c.fillStyle = YEL;
      for (const [sx, sy, sr] of [[22, 70, 15], [262, 104, 12], [300, 92, 9], [60, 96, 9]] as const) {
        const [px, py] = P(sx, sy);
        c.beginPath(); for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4, r = (i % 2 ? 0.28 : 1) * sr; c.lineTo(px + r * Math.cos(a), py + r * Math.sin(a)); } c.fill();
      }
      // Sudsy: a droplet in white gloves, red sneakers on the roof, waving, a yellow sponge in his other hand
      const lw = Math.max(4, s * 0.07);
      c.strokeStyle = NAVY; c.lineWidth = lw;
      for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(mx + sx * 0.28 * s, my + 0.9 * s); c.lineTo(mx + sx * 0.36 * s, my + 1.22 * s); c.stroke(); }
      c.fillStyle = RED; for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(mx + sx * 0.44 * s, my + 1.24 * s, 0.2 * s, 0.09 * s, 0, 0, Math.PI * 2); c.fill(); c.stroke(); }
      c.beginPath(); c.moveTo(mx - 0.72 * s, my + 0.35 * s); c.quadraticCurveTo(mx - 1.1 * s, my + 0.2 * s, mx - 1.2 * s, my - 0.35 * s); c.stroke();
      c.beginPath(); c.moveTo(mx + 0.72 * s, my + 0.4 * s); c.lineTo(mx + 1.1 * s, my + 0.1 * s); c.stroke();
      c.save(); c.translate(mx + 1.26 * s, my - 0.02 * s); c.rotate(-0.35);
      c.fillStyle = YEL; c.beginPath(); c.roundRect(-0.32 * s, -0.21 * s, 0.64 * s, 0.42 * s, 0.1 * s); c.fill(); c.lineWidth = lw * 0.7; c.stroke();
      c.fillStyle = '#e0a526'; for (const [hx, hy] of [[-0.17, -0.06], [0.05, 0.08], [0.18, -0.09], [-0.05, -0.12]] as const) { c.beginPath(); c.arc(hx * s, hy * s, 0.045 * s, 0, Math.PI * 2); c.fill(); }
      c.restore();
      c.lineWidth = lw;
      const body = c.createLinearGradient(mx - 0.8 * s, my - s, mx + 0.8 * s, my + s); body.addColorStop(0, '#ffffff'); body.addColorStop(1, '#b8ecff');
      c.beginPath(); c.moveTo(mx, my - 1.25 * s);
      c.bezierCurveTo(mx + 0.3 * s, my - 0.75 * s, mx + 0.8 * s, my - 0.3 * s, mx + 0.8 * s, my + 0.25 * s);
      c.arc(mx, my + 0.25 * s, 0.8 * s, 0, Math.PI);
      c.bezierCurveTo(mx - 0.8 * s, my - 0.3 * s, mx - 0.3 * s, my - 0.75 * s, mx, my - 1.25 * s);
      c.fillStyle = body; c.fill(); c.stroke();
      c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(mx - 0.4 * s, my - 0.2 * s, 0.11 * s, 0.25 * s, 0.45, 0, Math.PI * 2); c.fill();
      for (const [gx, gy] of [[mx - 1.2 * s, my - 0.4 * s], [mx + 1.08 * s, my + 0.12 * s]] as const) { c.fillStyle = '#ffffff'; c.beginPath(); c.arc(gx, gy, 0.17 * s, 0, Math.PI * 2); c.fill(); c.stroke(); }
      for (const sx of [-1, 1]) {
        const ex = mx + sx * 0.27 * s, ey = my + 0.08 * s;
        c.fillStyle = '#ffffff'; c.lineWidth = lw * 0.6; c.beginPath(); c.ellipse(ex, ey, 0.15 * s, 0.21 * s, 0, 0, Math.PI * 2); c.fill(); c.stroke();
        c.fillStyle = NAVY; c.beginPath(); c.arc(ex + 0.04 * s, ey + 0.04 * s, 0.085 * s, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#ffffff'; c.beginPath(); c.arc(ex + 0.07 * s, ey, 0.03 * s, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.moveTo(ex - 0.13 * s, ey - 0.27 * s); c.quadraticCurveTo(ex, ey - 0.38 * s, ex + 0.13 * s, ey - 0.27 * s); c.stroke();
        c.fillStyle = 'rgba(255,110,140,0.45)'; c.beginPath(); c.arc(mx + sx * 0.5 * s, my + 0.4 * s, 0.1 * s, 0, Math.PI * 2); c.fill();
      }
      c.lineWidth = lw * 0.7; c.fillStyle = '#7a1020';
      c.beginPath(); c.moveTo(mx - 0.34 * s, my + 0.4 * s); c.quadraticCurveTo(mx, my + 0.88 * s, mx + 0.34 * s, my + 0.4 * s); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#ff7a96'; c.beginPath(); c.ellipse(mx, my + 0.58 * s, 0.13 * s, 0.06 * s, 0, 0, Math.PI * 2); c.fill();
      // the header: SUDSY'S, its band's foot scalloped; the services along the foot (the signs' face)
      c.fillStyle = YEL; c.fillRect(0, 0, 1024, head);
      for (let x = 0; x < 1024; x += 32) { c.beginPath(); c.arc(x + 16, head - 1, 16, 0, Math.PI); c.fill(); }
      c.fillStyle = NAVY; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = font(F.sign(700), head * 0.6);
      (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${Math.round(head * 0.08)}px`;
      c.fillText("★ SUDSY'S ★", 512, head * 0.52);
      (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px';
      c.fillRect(0, H - foot, 1024, foot);
      c.fillStyle = '#ffffff'; c.font = font(F.sign(600), foot * 0.46); c.fillText('INSIDE & OUT  ·  HAND DRIED  ·  OPEN 7 DAYS', 470, H - foot * 0.46, 860);
    });
    plane(g, w, h, 0, 0, -0.02, pic(ad));
    // the cabinet: a cream box, the red bezel proud of its face round the board, bulbs round the bezel
    part(g, extrude(rrect(2 * L, 2 * top, 0.45), 0.42, -0.47), CREAM);
    const ring = rrect(2 * L, 2 * top, 0.45); ring.holes.push(rrect(w, h, 0.16));
    part(g, extrude(ring, 0.12, -0.05), RED);
    bulbRun(rrect(w + R, h + R, 0.3).getSpacedPoints(64).slice(0, 64), 0.11);

    // the wave over it: its crest rising to the right and breaking, its tube open on the right; HAND WASH across it
    const CX = 1.75, base = top - 0.12;
    const crestPts: [number, number][] = [[-L, 0]];
    for (let i = 0; i <= 20; i++) { const x = -L + ((CX + L) * i) / 20; crestPts.push([x, 1.0 + 0.55 * Math.pow((x + L) / (CX + L), 1.7)]); }
    const lip = crestPts.length; // (the crest's top edge runs to here, over the curl to its front)
    crestPts.push([2.25, 1.62], [2.7, 1.53], [2.98, 1.27], [2.92, 1.01], [2.68, 0.95], [2.52, 1.09], [2.6, 0.85], [2.85, 0.75], [L, 0.7], [L, 0]);
    const crestShape = new THREE.Shape(crestPts.map(([x, y]) => new THREE.Vector2(x, y)));
    part(g, extrude(crestShape, 0.26, -0.36).translate(0, base, 0), '#1a93ad');
    const CT = 1.7, pxc = 1024 / (2 * L), Hc = Math.round(CT * pxc);
    const X = (x: number) => (x + L) * pxc, Y = (y: number) => (CT - y) * pxc;
    const crestTex = canvasTex(1024, Hc, (c) => {
      c.lineJoin = 'round'; c.lineCap = 'round';
      c.beginPath(); crestPts.forEach(([x, y], i) => (i ? c.lineTo(X(x), Y(y)) : c.moveTo(X(x), Y(y)))); c.closePath();
      const sea = c.createLinearGradient(0, 0, 0, Hc); sea.addColorStop(0, '#6fdcea'); sea.addColorStop(1, '#1689a8'); c.fillStyle = sea; c.fill();
      c.save(); c.clip();
      // water lines across it, the tube's swirl, the foam along the crest, its outline inside the edge
      c.strokeStyle = 'rgba(255,255,255,0.3)'; c.lineWidth = 5;
      for (const [a, b, y] of [[-2.9, -1.2, 0.3], [-0.6, 1.4, 0.18], [1.9, 2.9, 0.38]] as const) { c.beginPath(); c.moveTo(X(a), Y(y)); c.lineTo(X(b), Y(y)); c.stroke(); }
      c.strokeStyle = 'rgba(11,58,102,0.55)'; c.lineWidth = 7; c.beginPath(); c.arc(X(2.62), Y(1.21), 0.26 * pxc, Math.PI * 0.9, Math.PI * 2.3); c.stroke();
      c.strokeStyle = '#ffffff'; c.lineWidth = 0.2 * pxc; c.beginPath(); crestPts.slice(1, lip + 3).forEach(([x, y], i) => (i ? c.lineTo(X(x), Y(y)) : c.moveTo(X(x), Y(y)))); c.stroke();
      c.fillStyle = '#ffffff';
      for (let i = 1; i < lip + 2; i++) { const [x, y] = crestPts[i]!; c.beginPath(); c.arc(X(x), Y(y - 0.1), 0.07 * pxc, 0, Math.PI * 2); c.fill(); }
      c.strokeStyle = NAVY; c.lineWidth = 12; c.beginPath(); crestPts.forEach(([x, y], i) => (i ? c.lineTo(X(x), Y(y)) : c.moveTo(X(x), Y(y)))); c.closePath(); c.stroke();
      c.restore();
      // HAND WASH: a sign-painter's italic, red in a white keyline over a navy drop (the sign's own face: not the
      // lyrics' heavy Archivo)
      const text = 'Hand Wash', tx = X(-0.65), ty = Y(0.28);
      let size = 0.78 * pxc; c.font = font(F.bodoni(700, { italic: true }), size);
      const fit = (3.7 * pxc) / c.measureText(text).width; if (fit < 1) { size *= fit; c.font = font(F.bodoni(700, { italic: true }), size); }
      c.textAlign = 'center'; c.textBaseline = 'alphabetic';
      c.fillStyle = NAVY; c.fillText(text, tx + size * 0.05, ty + size * 0.05);
      c.strokeStyle = '#ffffff'; c.lineWidth = size * 0.13; c.strokeText(text, tx, ty);
      c.fillStyle = RED; c.fillText(text, tx, ty);
    });
    plane(g, 2 * L, CT, 0, base + CT / 2, -0.09, pic(crestTex, { alphaTest: 0.5 }));
    // bulbs along its crest, over the curl
    {
      const edge = crestPts.slice(1, lip + 3).map(([x, y]) => new THREE.Vector2(x, base + y - 0.1)), pts: THREE.Vector2[] = [];
      let carry = 0;
      for (let i = 1; i < edge.length; i++) {
        const a = edge[i - 1]!, b = edge[i]!, len = a.distanceTo(b);
        for (let d = carry; d < len; d += 0.3) pts.push(a.clone().lerp(b, d / len));
        carry = (carry - len) % 0.3; if (carry < 0) carry += 0.3;
      }
      bulbRun(pts.filter((p) => p.x > -L + 0.15), -0.05, 1);
    }
    // the starburst off its lower corner: ONLY $9.99
    {
      const n = 14, ro = 0.8, ri = 0.58, bx = w / 2 + 0.35, by = -h / 2 + 0.45, star = new THREE.Shape();
      for (let i = 0; i < 2 * n; i++) {
        const a = Math.PI / 2 + (i * Math.PI) / n, r = i % 2 ? ri : ro;
        if (i) star.lineTo(r * Math.cos(a), r * Math.sin(a)); else star.moveTo(r * Math.cos(a), r * Math.sin(a));
      }
      part(g, extrude(star, 0.16, 0.14).translate(bx, by, 0), YEL);
      const burst = canvasTex(512, 512, (c) => {
        const S = 256 / ro, at = (r: number, a: number) => [256 + r * S * Math.cos(a), 256 - r * S * Math.sin(a)] as const;
        const path = (k: number) => { c.beginPath(); for (let i = 0; i < 2 * n; i++) { const a = Math.PI / 2 + (i * Math.PI) / n; c.lineTo(...at((i % 2 ? ri : ro) * k, a)); } c.closePath(); };
        path(1); c.fillStyle = RED; c.fill();
        path(0.88); c.fillStyle = YEL; c.fill();
        c.fillStyle = NAVY; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.font = font(F.sign(700), 58); c.fillText('ONLY', 256, 182);
        c.fillStyle = RED; c.font = font(F.sign(700), 100); c.fillText('$9.99', 256, 282, 300);
      });
      plane(g, 2 * ro, 2 * ro, bx, by, 0.31, pic(burst, { alphaTest: 0.5 }));
    }

    // its stand: two steel columns up into the cabinet, a rail across under it and an X between them, on footings in a
    // brick planter, shrubs in it and two floodlights turned up at the face
    const ground = -drop, colX = 1.75, cz = -0.26, under = -top + 0.05, brace = -top - 0.45, coping = ground + 0.55;
    for (const x of [-colX, colX]) {
      tcyl(g, 0.13, under - ground + 0.3, x, (under + 0.3 + ground) / 2, cz, '#178a9c', 14);
      tbox(g, 0.36, 0.06, 0.36, x, coping + 0.03, cz, '#5a646c'); // (its base plate on the planter's coping)
    }
    tcyl(g, 0.07, 2 * colX, 0, brace, cz, '#178a9c').rotation.z = Math.PI / 2;
    tbox(g, 2 * colX, 0.08, 0.1, 0, under - 0.04, cz, '#178a9c'); // (the cabinet's channel on them)
    {
      const y0 = coping + 0.25, dy = brace - y0, len = Math.hypot(2 * colX, dy);
      for (const sx of [-1, 1]) tcyl(g, 0.04, len, 0, (y0 + brace) / 2, cz, '#178a9c', 8).rotation.z = -sx * Math.atan2(2 * colX, dy);
    }
    tbox(g, 4.6, 0.5, 1.1, 0, ground + 0.25, cz, '#9c4a32'); // the planter
    tbox(g, 4.72, 0.06, 1.22, 0, coping - 0.02, cz, '#d9cfbf');
    for (const [x, r] of [[-1.05, 0.3], [-0.25, 0.36], [0.6, 0.28], [1.2, 0.24]] as const) tball(g, r, x, coping + r * 0.55, cz - 0.1, '#3f7a3a');
    for (const x of [-1.25, 1.25]) tbox(g, 0.34, 0.22, 0.28, x, coping + 0.17, cz + 0.42, '#2a2a30');
    fuse(g);
    for (const x of [-1.25, 1.25]) {
      const lens = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.16), lampMaterial('#fff1c8', GLOW.lamp, 0.9));
      lens.position.set(x, coping + 0.29, cz + 0.36); lens.rotation.x = -2.0; g.add(lens);
    }
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

  // ---- the tire shop across the road past the car wash (the town's block: drive/sets/verse2.ts tireShop): its near end
  // stands face-on in the wash sign's shot, and was bare stucco (the user, 2026-10-18: "at 97.3, on the left side of the
  // tire shop building, add some interest there, it's too blank"). Dressed as an LA tire shop's side: a sign painter's
  // TIRES panel across its top, LLANTAS NUEVAS Y USADAS on a band under it, a whitewall rolling toward the shop's front;
  // the trades lettered on the stucco; a roll-up service door; used tires stacked and leaning along its foot; a downpipe;
  // tags buffed out in near-matching stucco, drips from the coping, splash along the ground. In the low sun's shade, its
  // paint muted: the wash's sign is the shot's ----
  {
    const b = tireShop(drive.blocks, plan.wash.s);
    if (b) {
      const col = (k: number) => V3(0, 0, 0).setFromMatrixColumn(b.matrix, k), c = V3(0, 0, 0).setFromMatrixPosition(b.matrix);
      // its frame: x along the end toward the road (the shot's right), y up from the road's level, z out of the end's face
      // (the box's x runs away from the road's right, its z along the road: facadeOf's ends stand FACADE.end in from its)
      const out = col(2).normalize().negate(), o = c.clone().addScaledVector(out, b.w / 2 - FACADE.end);
      o.y = c.y + col(1).length() / 2 - b.h;
      const g = new THREE.Group(); g.matrixAutoUpdate = false;
      g.matrix.makeBasis(UP.clone().cross(out).normalize(), UP, out).setPosition(o); root.add(g);
      // the wall: from its back (−x) to the front's depth (+x), up to the coping
      const xl = -b.d / 2 + 0.06, xr = b.d / 2 - FACADE.depth - 0.06, yb = 0.02, yt = b.h - FACADE.coping[0] - 0.04;
      const rnd = (n: number) => { const v = Math.sin(n * 12.9898 + 4.1) * 43758.5453; return v - Math.floor(v); };
      const ink = '#2a2a2e', oxblood = '#9e2f28', cream = '#e6d9bb';
      const door = { x0: xl + 0.7, w: 3.4, h: 3.0 }, Pn = { x0: Math.max(xl + 0.35, xr - 8.3), x1: xr - 0.35, y0: door.h + 0.75, y1: yt - 0.3 }; // (the panel toward the street: the wash's shot cuts off the end's back 2 m)
      const stucco = new THREE.Color(WORLD.stucco[Math.floor(b.color * WORLD.stucco.length)]!); // (its wall's: look/facades.ts)
      const Wc = 2048, k = Wc / (xr - xl), Hc = Math.round((yt - yb) * k), px = (x: number) => (x - xl) * k, py = (y: number) => (yt - y) * k;
      const wall = canvasTex(Wc, Hc, (cx) => {
        const text = (s: string, x: number, y: number, size: number, fill: string, maxW: number, align: CanvasTextAlign = 'left') => {
          cx.font = font(F.sign(700), size * k); cx.textAlign = align; cx.textBaseline = 'middle'; cx.fillStyle = fill; cx.fillText(s, px(x), py(y), maxW * k);
        };
        // tags buffed out, rolled over in a stucco not quite the wall's
        for (const [x0, y0, w, h, d] of [[-0.9, 0.35, 2.4, 1.5, 0.9], [2.4, 1.0, 1.7, 0.85, 1.08], [door.x0 + door.w + 0.1, 3.05, 1.3, 0.6, 0.93]] as const) {
          cx.fillStyle = `#${stucco.clone().multiplyScalar(d).getHexString()}`; cx.fillRect(px(x0), py(y0 + h), w * k, h * k);
        }
        // the panel: a cream field in an oxblood border, an ink keyline in it
        const tR = (Pn.y1 - Pn.y0) / 2 + 0.15, tX = Pn.x1 - tR + 0.12, tY = (Pn.y0 + Pn.y1) / 2;
        cx.fillStyle = oxblood; cx.beginPath(); cx.roundRect(px(Pn.x0), py(Pn.y1), (Pn.x1 - Pn.x0) * k, (Pn.y1 - Pn.y0) * k, 0.18 * k); cx.fill();
        cx.fillStyle = cream; cx.beginPath(); cx.roundRect(px(Pn.x0 + 0.12), py(Pn.y1 - 0.12), (Pn.x1 - Pn.x0 - 0.24) * k, (Pn.y1 - Pn.y0 - 0.24) * k, 0.1 * k); cx.fill();
        cx.strokeStyle = ink; cx.lineWidth = 0.035 * k; cx.beginPath(); cx.roundRect(px(Pn.x0 + 0.22), py(Pn.y1 - 0.22), (Pn.x1 - Pn.x0 - 0.44) * k, (Pn.y1 - Pn.y0 - 0.44) * k, 0.06 * k); cx.stroke();
        // TIRES, shadowed; LLANTAS NUEVAS Y USADAS on an ink band under it (the signs' face: never the lyrics')
        const tx0 = Pn.x0 + 0.4, tw = tX - tR - 1.1 - tx0, ty = Pn.y1 - 0.25 - (Pn.y1 - Pn.y0 - 0.5) * 0.36;
        text('TIRES', tx0 + 0.07, ty - 0.07, 1.2, ink, tw);
        text('TIRES', tx0, ty, 1.2, oxblood, tw);
        const bandY = Pn.y0 + 0.62;
        cx.fillStyle = ink; cx.fillRect(px(Pn.x0 + 0.3), py(bandY + 0.28), (tX - tR - 0.2 - Pn.x0 - 0.3) * k, 0.56 * k);
        text('LLANTAS NUEVAS Y USADAS', (Pn.x0 + 0.3 + tX - tR - 0.2) / 2, bandY, 0.3, cream, tX - tR - 0.5 - Pn.x0 - 0.3, 'center');
        // a whitewall rolling toward the shop's front (the road's way), breaking out of the panel; speed lines behind it
        cx.fillStyle = oxblood;
        for (const [dy, len] of [[0.55, 0.7], [0.15, 0.95], [-0.25, 0.7]] as const) { cx.beginPath(); cx.roundRect(px(tX - tR - 0.1 - len), py(tY + dy + 0.07), len * k, 0.14 * k, 0.07 * k); cx.fill(); }
        const X0 = px(tX), Y0 = py(tY), R = tR * k, disc = (r: number, fill: string) => { cx.fillStyle = fill; cx.beginPath(); cx.arc(X0, Y0, r * R, 0, Math.PI * 2); cx.fill(); };
        disc(1, '#1d1d20');
        cx.fillStyle = '#3c3c42'; // its tread's blocks round the rim
        for (let i = 0; i < 30; i++) { const a = (i / 30) * Math.PI * 2; cx.save(); cx.translate(X0, Y0); cx.rotate(a); cx.fillRect(R * 0.9, -R * 0.045, R * 0.1, R * 0.09); cx.restore(); }
        disc(0.74, '#efeadf'); disc(0.62, '#1d1d20'); disc(0.56, '#8f969c'); disc(0.42, '#c6c9cc');
        cx.fillStyle = '#6b7075';
        for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + 0.3; cx.beginPath(); cx.arc(X0 + Math.cos(a) * R * 0.25, Y0 + Math.sin(a) * R * 0.25, R * 0.05, 0, Math.PI * 2); cx.fill(); }
        disc(0.12, '#8f969c');
        // the trades, lettered straight on the stucco over the stacked tires (clear of the door)
        const lx0 = door.x0 + door.w + 0.45, lw = xr - 0.55 - lx0;
        text('BRAKES · ALIGNMENT', lx0, 2.8, 0.42, ink, lw);
        text('FLATS FIXED $10', lx0, 2.25, 0.42, oxblood, lw);
        text('SE HABLA ESPAÑOL', lx0, 1.78, 0.26, ink, lw);
        // the paint worn: flaked through to the stucco in patches and specks
        cx.globalCompositeOperation = 'destination-out';
        for (let i = 0; i < 320; i++) {
          const u = rnd(i), v = rnd(i + 500), r = (0.02 + 0.2 * rnd(i + 900) ** 3) * k;
          cx.fillStyle = `rgba(0,0,0,${0.2 + 0.45 * rnd(i + 1300)})`;
          cx.beginPath(); cx.ellipse(px(xl + u * (xr - xl)), py(1.6 + v * (yt - 1.6)), r * 1.6, r, u * 3, 0, Math.PI * 2); cx.fill();
        }
        cx.globalCompositeOperation = 'source-over';
        // drips down from the coping; splash up from the ground
        for (let i = 0; i < 46; i++) {
          const x = rnd(i + 2000) * Wc, len = (0.4 + 2.4 * rnd(i + 2100) ** 2) * k, w = (0.03 + 0.08 * rnd(i + 2200)) * k, gd = cx.createLinearGradient(0, 0, 0, len);
          gd.addColorStop(0, `rgba(48,36,32,${0.12 + 0.14 * rnd(i + 2300)})`); gd.addColorStop(1, 'rgba(48,36,32,0)');
          cx.fillStyle = gd; cx.fillRect(x, 0, w, len);
        }
        const sp = cx.createLinearGradient(0, py(0), 0, py(1.3));
        sp.addColorStop(0, 'rgba(45,32,28,0.45)'); sp.addColorStop(1, 'rgba(45,32,28,0)');
        cx.fillStyle = sp; cx.fillRect(0, py(1.3), Wc, py(0) - py(1.3));
      });
      // (a few cm off the stucco, and pulled forward by the depth buffer's own steps: it's seen from 40 m and more)
      plane(g, xr - xl, yt - yb, (xl + xr) / 2, (yb + yt) / 2, 0.03, paint(wall, { transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }));
      // the roll-up service door: its curtain's slats, bottom bar and handle, the guides either side, the coil's hood over it
      const dcx = door.x0 + door.w / 2;
      tbox(g, door.w, door.h, 0.06, dcx, door.h / 2, 0.03, '#8e8c86');
      for (let i = 1; i < 12; i++) tbox(g, door.w, 0.035, 0.03, dcx, (i * door.h) / 12, 0.075, '#74726d');
      tbox(g, door.w, 0.1, 0.1, dcx, 0.05, 0.06, '#5f5d58');
      tbox(g, 0.32, 0.05, 0.06, dcx, 0.5, 0.1, ink);
      for (const s of [-1, 1]) tbox(g, 0.1, door.h + 0.1, 0.14, dcx + s * (door.w / 2 + 0.05), (door.h + 0.1) / 2, 0.07, '#6a6863');
      tbox(g, door.w + 0.4, 0.5, 0.42, dcx, door.h + 0.3, 0.21, '#7d7b75');
      // a downpipe down the front corner from a scupper's head under the coping, its shoe at the ground
      const pX = xr - 0.25;
      tcyl(g, 0.065, yt - 0.4, pX, 0.15 + (yt - 0.4) / 2, 0.1, '#bdb5a6', 8);
      tbox(g, 0.34, 0.32, 0.26, pX, yt - 0.2, 0.13, '#a9a194');
      tbox(g, 0.14, 0.12, 0.3, pX, 0.1, 0.17, '#bdb5a6');
      // used tires along its foot: stacked, and a row stood leaning on the wall by the corner
      const rubber = ['#2a2a2e', '#323237', '#252528'], tire = () => new THREE.TorusGeometry(0.28, 0.105, 6, 18);
      const sx0 = door.x0 + door.w + 0.6;
      ([[0, 5, 0.48], [0.88, 3, 0.48], [1.76, 6, 0.48], [1.3, 2, 1.05], [2.65, 4, 0.5]] as const).forEach(([x, n, z], j) => {
        for (let i = 0; i < n; i++) {
          const m = part(g, tire(), rubber[(i + j) % 3]!, sx0 + x + (rnd(j * 10 + i) - 0.5) * 0.08, 0.105 + i * 0.21, z + (rnd(j * 10 + i + 50) - 0.5) * 0.08);
          m.rotation.x = Math.PI / 2;
        }
      });
      for (const [x, z, lean, turn] of [[3.4, 0.5, -0.1, -0.6], [4.15, 0.62, -0.05, -1.0]] as const) part(g, tire(), rubber[1]!, sx0 + x, 0.385, z).rotation.set(lean, turn, 0, 'YXZ');
      fuse(g);
    }
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

  // ---- the big painted billboard on the sand at the end of the street (its words: the carriers): a hand-painted
  // bulletin on its steel sheets, a cream frame round it; up on three I-beam legs, kicker braces back to their
  // footings, X-bracing between the legs; a catwalk along its foot with its rail and brackets, gooseneck lamps out
  // over it, a caged ladder up from the sand at its far end; the sign company's plate on the frame ----
  {
    const G = plan.giant, wall = onPanel(G), above = G.center.y - route.frameAt(plan.giantBlock.s).pos.y;
    const art = canvasTex(2048, Math.round((2048 * G.h) / G.w), (c) => mural(c, c.canvas.width, c.canvas.height, GIANT.text, G.w));
    // (lit by its lamps at dusk: its paint as painted, the low sun behind it)
    plane(wall, G.w, G.h, 0, 0, 0, pic(art));
    const hw = G.w / 2, hh = G.h / 2, ground = -above, STEEL = '#59616b', FRAME = '#efe4cc', RAIL = '#c9c2b0', CONC = '#b9b1a3';
    /** A strut from a to b (in the wall's frame), `t` thick. */
    const strut = (a: THREE.Vector3, b: THREE.Vector3, t: number, color: string) => {
      const d = b.clone().sub(a), q = new THREE.Quaternion().setFromUnitVectors(UP, d.clone().normalize());
      part(wall, new THREE.BoxGeometry(t, d.length(), t).applyQuaternion(q), color, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    };
    // the face's steel behind it, the stringers across its back, the frame round its edge (proud of it, over its edges)
    tbox(wall, G.w, G.h, 0.2, 0, 0, -0.12, '#6d756f');
    for (const y of [-hh + 1, 0, hh - 1]) { tbox(wall, G.w, 0.4, 0.08, 0, y, -0.45, STEEL); tbox(wall, G.w, 0.06, 0.3, 0, y + 0.17, -0.33, STEEL); tbox(wall, G.w, 0.06, 0.3, 0, y - 0.17, -0.33, STEEL); }
    for (const s of [-1, 1]) { tbox(wall, G.w + 0.9, 0.45, 0.32, 0, s * (hh + 0.2), 0.0, FRAME); tbox(wall, 0.45, G.h, 0.32, s * (hw + 0.2), 0, 0.0, FRAME); }
    for (const s of [-1, 1]) { tbox(wall, G.w + 0.04, 0.06, 0.03, 0, s * (hh - 0.03), 0.17, '#7a2a3a'); tbox(wall, 0.06, G.h + 0.04, 0.03, s * (hw - 0.03), 0, 0.17, '#7a2a3a'); } // (its pinstripe)
    // three I-beam legs from their footings up the face's back, each kicked back to a footing behind
    const legs = [-7.5, 0, 7.5], lz = -0.85, bottom = -hh - 0.42;
    for (const x of legs) {
      const len = hh - 0.5 - ground, cy = (hh - 0.5 + ground) / 2;
      tbox(wall, 0.08, len, 0.5, x, cy, lz, STEEL);
      for (const dz of [-0.25, 0.25]) tbox(wall, 0.42, len, 0.05, x, cy, lz + dz, STEEL);
      tbox(wall, 1.0, 0.5, 1.0, x, ground + 0.2, lz, CONC);
      strut(new THREE.Vector3(x, bottom + 2.2, lz - 0.3), new THREE.Vector3(x, ground + 0.4, lz - 4.6), 0.26, STEEL);
      tbox(wall, 0.9, 0.45, 0.9, x, ground + 0.18, lz - 4.6, CONC);
    }
    // X-bracing between them under the face, and a tie across
    for (let i = 1; i < legs.length; i++) {
      const a = legs[i - 1]! + 0.25, b = legs[i]! - 0.25, y0 = ground + 1.0, y1 = bottom - 0.4;
      strut(new THREE.Vector3(a, y0, lz), new THREE.Vector3(b, y1, lz), 0.12, STEEL);
      strut(new THREE.Vector3(a, y1, lz), new THREE.Vector3(b, y0, lz), 0.12, STEEL);
    }
    tbox(wall, legs[2]! - legs[0]!, 0.16, 0.16, 0, bottom - 0.3, lz, STEEL);
    // the catwalk along its foot: its grating, the brackets under it, its rail
    const deck = bottom - 0.12, dz0 = 0.12, dz1 = 1.2, dzc = (dz0 + dz1) / 2;
    tbox(wall, G.w + 0.8, 0.06, dz1 - dz0, 0, deck, dzc, '#8a8f8f');
    for (let x = -hw; x <= hw + 0.01; x += G.w / 8) {
      tbox(wall, 0.08, 0.14, dz1 - dz0 + 0.3, x, deck - 0.1, dzc - 0.15, STEEL);
      strut(new THREE.Vector3(x, deck - 0.12, dz1 - 0.1), new THREE.Vector3(x, deck - 1.0, -0.3), 0.08, STEEL);
    }
    for (let x = -hw - 0.35; x <= hw + 0.36; x += (G.w + 0.7) / 10) tbox(wall, 0.05, 1.05, 0.05, x, deck + 0.53, dz1 - 0.03, RAIL);
    for (const y of [0.55, 1.05]) tbox(wall, G.w + 0.75, 0.05, 0.05, 0, deck + y, dz1 - 0.03, RAIL);
    tbox(wall, G.w + 0.75, 0.12, 0.02, 0, deck + 0.09, dz1 - 0.02, RAIL); // (its toe board)
    // gooseneck lamps out from the rail, their heads turned up at the face
    const heads: number[] = [];
    for (let k = 0; k < 7; k++) {
      const x = -hw + 1.6 + (k * (G.w - 3.2)) / 6; heads.push(x);
      strut(new THREE.Vector3(x, deck + 1.0, dz1), new THREE.Vector3(x, deck + 1.35, dz1 + 0.75), 0.06, '#2a2a30');
      strut(new THREE.Vector3(x, deck + 1.35, dz1 + 0.75), new THREE.Vector3(x, deck + 1.25, dz1 + 1.05), 0.06, '#2a2a30');
      const hd = new THREE.BoxGeometry(0.6, 0.2, 0.38).rotateX(-0.75);
      part(wall, hd, '#2a2a30', x, deck + 1.3, dz1 + 1.12);
    }
    // the caged ladder up from the sand at its far end to the catwalk
    {
      const lx = -hw - 0.75, lzz = 0.7, top = deck + 1.1;
      for (const dx of [-0.22, 0.22]) tbox(wall, 0.05, top - ground, 0.05, lx + dx, (top + ground) / 2, lzz, RAIL);
      for (let y = ground + 0.3; y < top; y += 0.3) tbox(wall, 0.44, 0.03, 0.03, lx, y, lzz, RAIL);
      for (let y = ground + 2.4; y < top; y += 0.8) part(wall, new THREE.TorusGeometry(0.38, 0.022, 4, 12, Math.PI), RAIL, lx, y, lzz + 0.02).rotation.set(Math.PI / 2, 0, 0);
      tbox(wall, 0.8, 0.06, 1.0, lx + 0.1, deck, 0.65, '#8a8f8f'); // (a landing off the catwalk's end)
    }
    fuse(wall);
    // the sign company's plate on the frame's foot
    plane(wall, 2.6, 0.3, hw - 2.4, -hh - 0.2, 0.17, paint(signFace('PACIFIC OUTDOOR', 1024, 118, '#3a2a30', FRAME, F.sign(700), 0.6, 0.18)));
    root.add(wall);
  }

  const beat = drive.beats.length > 1 ? drive.beats[1]! - drive.beats[0]! : 0.47, wink0 = { cheek: wink.cheek.position.y, brow: wink.brow.position.y };
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
      { const walked = Math.max(0, t - SHOPPER.t0) * SHOPPER.v; shopper.position.set(shopperAt(walked), 0, SHOPPER.z); const swing = 0.5 * Math.sin(walked * 4.8); stride(shopper, swing); }
      // Mr. Handle It winks as he's named: his lid down, his cheek up under it, his brow down a touch
      { const k = winkAt(t - plan.wink); wink.lid.rotation.x = LID.open + k * (LID.shut - LID.open); wink.cheek.position.y = wink0.cheek + 0.04 * k; wink.brow.position.y = wink0.brow - 0.045 * k; wink.brow.rotation.z = 0.12 - 0.1 * k; }
      // the bucket sign turns; the steam rises off the fryers' vent, drifting off left and back, swelling and thinning
      bucketSign.rotation.y = t * 0.6;
      steam.forEach((m, k) => {
        const u = (((t * 0.26 + k / steam.length) % 1) + 1) % 1;
        m.position.set(steamAt.x - 1.5 * u + 0.15 * Math.sin(t * 1.3 + k * 2.4), steamAt.y + 3.0 * u, steamAt.z - 0.7 * u);
        m.scale.setScalar(0.7 + 2.0 * u);
        m.material.opacity = 0.5 * Math.min(1, u * 5) * (1 - u);
      });
      // soap bubbles drifting up from the bays
      drifting.forEach((b, i) => {
        const k = i + 1, u = (t * 0.22 + k * 0.37) % 1; // (k from 1: the bucket sign was the first in this list)
        b.position.y = 0.5 + u * 2.6;
        b.position.x = 5.9 + 0.4 * Math.sin(t * 0.8 + k * 2.1);
        b.scale.setScalar(1 - 0.35 * u);
      });
    },
  };
}
