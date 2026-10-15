// The bridge's props (drive/sets/bridge1.ts): the tunnel furnished as a real, built LA bore (the user, 2026-10-15:
// "give it another quality pass") — housings and ceiling hangers for the two lit overhead signs (their lettering is the
// carriers'), lane-control signals down the bore (green arrows that flip to red X on "we might crash", back to green as
// "tryna make it last" answers), dim strip lights along both walls so the bore reads as a tube receding; jet fans hung
// in pairs, their blades turning; the road worn, its double yellow line, edge lines, raised markers and kerb reflectors
// catching the light; the walkways' rail and handrail, conduit and a cable tray along the walls; emergency phones and
// exit doors under lit signs, distance boards between; the other lane's traffic coming at them, head and tail lights;
// the wall tagged round the lyric pieces (small, unreadable, never over a piece) and water-stained from the haunch; and
// a concrete headwall at each portal with the tunnel's name and its date. Browser only (canvas).
import * as THREE from 'three';
import type { Drive } from '../../drive/drive';
import { type Bridge1Plan, FANS, ONCOMING, SIGNALS } from '../../drive/sets/bridge1';
import { TUNNEL } from '../../drive/tunnel';
import { ROAD_HALF } from '../../drive/route';
import { boxAt } from '../../drive/blocks';
import { hash } from '../../engine/util';
import { WORLD, toon } from '../../look/toon';
import { F, font } from '../../engine/type';
import { box, canvasTex, pic, plane, roadFrame, sedan, signFace } from './kit';

/** The exit's haze: veils this far back from the mouth (m), each adding this much of EXIT_GLOW. */
const EXIT_HAZE: readonly [number, number][] = [[2, 0.1], [6, 0.06], [12, 0.03]];
/** The haze's colour (the night beyond shows through it: the user wants to see time has passed — no glare). */
const EXIT_GLOW = '#d8c0e0';
/** The walkway along each wall (world.ts PORTAL.walk): its width and step. */
const WALK = { w: 0.7, h: 0.3 };
/** The wall's emergency points (m): a phone niche every `every` from `first` in, an exit door halfway between, on the
 *  right wall; on the left only where the paint leaves room; a distance board every `boards` m between them. */
const POINTS = { first: 40, every: 84, boards: 28 };
/** Tags on the walls: one tried every `step` m a side, kept at this share, thicker within `near` m of a piece; none
 *  within `clear` m of a lyric piece's face (the paint stays the focus). */
const TAGS = { step: 0.8, keep: 0.55, near: 16, clear: 0.35 };
/** The headwall round each portal: its half width, top (m over the road), how far it stands proud of the rock. */
const HEADWALL = { half: 11.2, top: 10.9, proud: 0.35 };
/** The tunnel's name and its date, cast in its headwalls. */
const NAME = 'MT. SOMEWHERE TUNNEL', BUILT = 'A.D. 1937';

export function buildBridge1(drive: Drive): { group: THREE.Group; update(t: number): void } | null {
  const plan = drive.plans.bridge1 as Bridge1Plan | undefined;
  if (!plan) return null;
  const { route } = drive, root = new THREE.Group(), onRoad = roadFrame(route, root);
  const { halfW: W, h: H } = TUNNEL, kerb = W - WALK.w;
  const dark = toon({ color: '#15121a' }), steel = toon({ color: WORLD.post }), galv = toon({ color: '#8e9096' }), crete = toon({ color: '#b5ab9c' });
  const UP = new THREE.Vector3(0, 1, 0);
  const lit = (r: number, g: number, b: number) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b) });
  /** Instanced unit boxes along the road (blocks.ts boxAt: s, lateral, across, high, along, base). */
  const boxes = (m: THREE.Material, list: [number, number, number, number, number, number][]) => {
    if (!list.length) return;
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), m, list.length);
    list.forEach(([s, l, a, h, d, y], i) => im.setMatrixAt(i, boxAt(route, s, l, a, h, d, y)));
    root.add(im);
    return im;
  };
  /** A profile (lateral, height) swept down the bore from a to b (uv: along in m, across the profile in m). */
  const sweep = (a: number, b: number, profile: [number, number][], m: THREE.Material, step = 1) => {
    const n = Math.max(2, Math.ceil((b - a) / step) + 1), k = profile.length, pos: number[] = [], uv: number[] = [], idx: number[] = [];
    const len = [0]; for (let j = 1; j < k; j++) len.push(len[j - 1]! + Math.hypot(profile[j]![0] - profile[j - 1]![0], profile[j]![1] - profile[j - 1]![1]));
    for (let i = 0; i < n; i++) {
      const s = a + ((b - a) * i) / (n - 1), f = route.frameAt(s);
      profile.forEach(([x, y], j) => { const p = f.pos.clone().addScaledVector(f.right, x).addScaledVector(UP, y); pos.push(p.x, p.y, p.z); uv.push(s - a, len[j]!); });
      if (i) for (let j = 0; j < k - 1; j++) { const p = (i - 1) * k + j, q = i * k + j; idx.push(p, q, p + 1, p + 1, q, q + 1); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    m.side = THREE.DoubleSide; // (seen from either side: a profile's winding isn't checked)
    const mesh = new THREE.Mesh(geo, m); root.add(mesh);
    return mesh;
  };
  const tube = (x: number, y: number, r: number, m: THREE.Material) => sweep(plan.s0, plan.s1, Array.from({ length: 9 }, (_, i): [number, number] => [x + r * Math.cos((i / 8) * Math.PI * 2), y + r * Math.sin((i / 8) * Math.PI * 2)]), m, 2);
  const ribbon = (a: number, b: number, l0: number, l1: number, y: number, m: THREE.Material) => sweep(a, b, [[l0, y], [l1, y]], m, 2);

  // ---- the overhead signs' housings: a dark box BEHIND each face (the face looks back down the bore at the coming
  // car: +z in the road's frame is onward), hangers up to the ceiling ----
  for (const p of plan.panels) {
    const g = onRoad(p.s, 0), F0 = p.face, yC = F0.center.y - route.frameAt(p.s).pos.y;
    box(g, F0.w + 0.6, F0.h + 0.5, 0.3, 0, yC, 0.22, dark);
    for (const x of [-F0.w / 3, F0.w / 3]) box(g, 0.12, H - yC - F0.h / 2, 0.12, x, (H + yC + F0.h / 2) / 2, 0.22, steel);
  }

  // ---- the lane-control signals: green arrow by default, red X from "crash" until the calm; in a hooded housing ----
  const arrow = canvasTex(128, 128, (c) => {
    c.fillStyle = '#060708'; c.fillRect(0, 0, 128, 128);
    c.strokeStyle = '#3dff7a'; c.lineWidth = 13; c.lineCap = 'round';
    c.beginPath(); c.moveTo(64, 104); c.lineTo(64, 30); c.moveTo(38, 56); c.lineTo(64, 28); c.lineTo(90, 56); c.stroke();
  });
  const cross = canvasTex(128, 128, (c) => {
    c.fillStyle = '#060708'; c.fillRect(0, 0, 128, 128);
    c.strokeStyle = '#ff2a24'; c.lineWidth = 15; c.lineCap = 'round';
    c.beginPath(); c.moveTo(36, 36); c.lineTo(92, 92); c.moveTo(92, 36); c.lineTo(36, 92); c.stroke();
  });
  const heads: THREE.MeshBasicMaterial[] = [];
  for (const s of plan.signals) {
    const g = onRoad(s, 0);
    box(g, 0.74, 0.74, 0.3, 0, SIGNALS.y, 0, dark);
    box(g, 0.78, 0.05, 0.26, 0, SIGNALS.y + 0.38, -0.25, dark); // its hood
    box(g, 0.1, H - SIGNALS.y - 0.37, 0.1, 0, (H + SIGNALS.y + 0.37) / 2, 0, steel);
    const m = new THREE.MeshBasicMaterial({ map: arrow, color: new THREE.Color(2, 2, 2) });
    const face = plane(g, 0.56, 0.56, 0, SIGNALS.y, -0.16, m);
    face.rotation.y = Math.PI; // (facing the coming car)
    heads.push(m);
  }

  // ---- strip lights along both walls at the haunch: the bore reads as a tube receding, the fog takes the far end;
  // each swept along the road, so they follow the bore round its bend (straight boxes kinked against the wall) ----
  const strip = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.15, 0.72, 0.38), side: THREE.DoubleSide });
  const strips: number[] = [];
  for (let s = plan.s0 + 4; s < plan.s1 - 4; s += 10) {
    for (const side of [-1, 1]) {
      for (let a = s + 0.3; a < s + 9.7 - 1e-6; a += 1) {
        const ring = [a, Math.min(a + 1, s + 9.7)].flatMap((u) => {
          const f = route.frameAt(u), at = f.pos.clone().addScaledVector(f.right, side * (W - 0.17));
          return [at.clone().setY(at.y + H - 0.795), at.clone().setY(at.y + H - 0.705)];
        });
        const [p0, p1, q0, q1] = ring as [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3];
        for (const v of [p0, q0, p1, p1, q0, q1]) strips.push(v.x, v.y, v.z);
      }
    }
  }
  const stripGeo = new THREE.BufferGeometry();
  stripGeo.setAttribute('position', new THREE.Float32BufferAttribute(strips, 3));
  root.add(new THREE.Mesh(stripGeo, strip));

  // ---- the light at the end: veils across the bore by the exit, thickening toward it, the light spilling in ----
  const veil = new THREE.PlaneGeometry(2 * W, H).translate(0, H / 2, 0);
  for (const [back, k] of EXIT_HAZE) {
    const g = onRoad(plan.s1 - back, 0);
    g.add(new THREE.Mesh(veil, new THREE.MeshBasicMaterial({ color: new THREE.Color(EXIT_GLOW).multiplyScalar(k), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false })));
  }

  // ---- the road: worn asphalt kerb to kerb (the verges' sand showed through between the lanes and the walkways),
  // darker wheel paths, an oil line down each lane, grit drifted against the kerbs, patches, joints across ----
  const worn = canvasTex(256, 1024, (c) => {
    const across = (l: number) => ((l + kerb) / (2 * kerb)) * 256, mPx = 256 / (2 * kerb), along = 1024 / 40;
    c.fillStyle = '#5a4c63'; c.fillRect(0, 0, 256, 1024);
    for (let k = 0; k < 2500; k++) { c.fillStyle = `rgba(${hash(k, 1) < 0.5 ? '20,14,24' : '120,104,120'},${(0.06 + 0.1 * hash(k, 2)).toFixed(2)})`; c.fillRect(256 * hash(k, 3), 1024 * hash(k, 4), 1 + 2 * hash(k, 5), 1 + 3 * hash(k, 6)); }
    const band = (l: number, w: number, col: string) => { c.fillStyle = col; c.fillRect(across(l) - (w * mPx) / 2, 0, w * mPx, 1024); };
    for (const lane of [-1.9, 1.9]) { for (const d of [-0.85, 0.85]) band(lane + d, 0.55, 'rgba(22,16,26,0.32)'); band(lane, 0.3, 'rgba(14,10,16,0.22)'); }
    for (const side of [-1, 1]) { const g = c.createLinearGradient(across(side * ROAD_HALF), 0, across(side * kerb), 0); g.addColorStop(0, 'rgba(170,150,130,0)'); g.addColorStop(1, 'rgba(170,150,130,0.4)'); c.fillStyle = g; c.fillRect(Math.min(across(side * ROAD_HALF), across(side * kerb)), 0, Math.abs(across(side * kerb) - across(side * ROAD_HALF)), 1024); }
    for (let k = 0; k < 7; k++) { c.fillStyle = `rgba(${hash(k, 9) < 0.5 ? '30,24,36,0.35' : '110,96,110,0.3'})`; c.fillRect(across(-kerb + 2 * kerb * hash(k, 10)) - 20, 1024 * hash(k, 11), 20 + 50 * hash(k, 12), 30 + 90 * hash(k, 13)); }
    c.strokeStyle = 'rgba(18,12,20,0.55)'; c.lineWidth = 2;
    for (const v of [0, 0.5]) { c.beginPath(); c.moveTo(0, v * 1024 + 1); c.lineTo(256, v * 1024 + 1); c.stroke(); }
    for (let k = 0; k < 6; k++) { c.beginPath(); let x = 256 * hash(k, 14), y = 1024 * hash(k, 15); c.moveTo(x, y); for (let j = 0; j < 6; j++) { x += (hash(k, j, 16) - 0.5) * 30; y += 10 + 25 * hash(k, j, 17); c.lineTo(x, y); } c.stroke(); }
    void along;
  });
  worn.wrapS = worn.wrapT = THREE.RepeatWrapping;
  {
    const floor = ribbon(plan.s0, plan.s1, -kerb, kerb, 0.008, toon({ map: worn, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }));
    const uv = floor.geometry.attributes.uv!;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, i % 2, uv.getX(i) / 40);
  }
  // the markings: a double yellow line down the middle (two-way), white edge lines; raised markers (amber between the
  // yellows, white along the edges) and the walkways' kerb reflectors catching the light
  const paint = (c: string) => toon({ color: c, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
  for (const x of [-0.17, 0.07]) ribbon(plan.s0, plan.s1, x, x + 0.1, 0.014, paint('#e8b428'));
  for (const side of [-1, 1]) ribbon(plan.s0, plan.s1, side * (ROAD_HALF - 0.05), side * (ROAD_HALF + 0.1), 0.014, paint('#ece4cc'));
  const studs: [number, number, number, number, number, number][] = [], whites: [number, number, number, number, number, number][] = [], reflect: [number, number, number, number, number, number][] = [], reflectW: [number, number, number, number, number, number][] = [];
  for (let s = plan.s0 + 3; s < plan.s1 - 3; s += 6) {
    if (Math.round((s - plan.s0) / 6) % 2 === 0) studs.push([s, -0.05, 0.1, 0.03, 0.1, 0.012]);
    for (const side of [-1, 1]) whites.push([s + 3, side * (ROAD_HALF + 0.3), 0.09, 0.025, 0.09, 0.012]);
  }
  for (let s = plan.s0 + 2; s < plan.s1 - 2; s += 5) { reflect.push([s, -(kerb - 0.012), 0.02, 0.08, 0.16, 0.12]); reflectW.push([s, kerb - 0.012, 0.02, 0.08, 0.16, 0.12]); }
  boxes(lit(2.4, 1.5, 0.35), studs); boxes(lit(1.6, 1.6, 1.5), whites); boxes(lit(2.6, 1.6, 0.35), reflect); boxes(lit(1.9, 1.9, 1.8), reflectW);

  // ---- the walkways: a pipe rail along the right one's edge, a handrail on the left wall; conduit low along both walls
  // (under the paint), a cable tray high on the right (the left is the painted wall) ----
  const posts: [number, number, number, number, number, number][] = [], brackets: [number, number, number, number, number, number][] = [];
  for (let s = plan.s0 + 1; s < plan.s1 - 1; s += 2.5) posts.push([s, kerb + 0.08, 0.06, 1.05, 0.06, WALK.h]);
  for (let s = plan.s0 + 1.5; s < plan.s1 - 1; s += 3) {
    brackets.push([s, -(W - 0.06), 0.12, 0.05, 0.05, 1.22]);
    for (const side of [-1, 1]) brackets.push([s, side * (W - 0.05), 0.1, 0.3, 0.05, 0.62]);
    brackets.push([s, W - 0.25, 0.5, 0.05, 0.06, 4.88]);
  }
  boxes(galv, posts); boxes(steel, brackets);
  const rail = toon({ color: '#b9b4a8' }), pipe = toon({ color: '#6d6870' }), conduit = toon({ color: '#8a8c90' });
  tube(kerb + 0.08, WALK.h + 1.05, 0.035, rail); tube(kerb + 0.08, WALK.h + 0.55, 0.025, rail);
  tube(-(W - 0.1), 1.25, 0.03, rail);
  for (const side of [-1, 1]) { tube(side * (W - 0.09), 0.72, 0.05, conduit); tube(side * (W - 0.09), 0.84, 0.035, pipe); tube(side * (W - 0.1), 0.94, 0.04, conduit); }
  sweep(plan.s0, plan.s1, [[W - 0.02, 5.07], [W - 0.52, 5.07], [W - 0.52, 4.93], [W - 0.02, 4.93]], toon({ color: '#9a9ca2', side: THREE.DoubleSide }), 2);
  tube(W - 0.3, 5.0, 0.07, toon({ color: '#2a2a30' }));

  // ---- jet fans, in pairs under the ceiling: a galvanised drum on hangers, bell mouths, wire guards, blades turning ----
  const blades: THREE.Group[] = [];
  {
    const R = FANS.r, L = FANS.len, drumGeo = new THREE.CylinderGeometry(R, R, L, 24, 1, true).rotateX(Math.PI / 2), bellGeo = new THREE.CylinderGeometry(R + 0.08, R + 0.04, 0.24, 24, 1, true).rotateX(Math.PI / 2);
    const drumM = toon({ color: '#9b9ea4', side: THREE.DoubleSide }), back = toon({ color: '#121014', side: THREE.DoubleSide }), wire = toon({ color: '#3a3a40' });
    for (const s of plan.fans) for (const side of [-1, 1]) {
      const g = onRoad(s, side * FANS.x), y = FANS.y;
      const drum = new THREE.Mesh(drumGeo, drumM); drum.position.y = y; g.add(drum);
      for (const z of [-L / 2 + 0.1, L / 2 - 0.1]) { const b = new THREE.Mesh(bellGeo, drumM); b.position.set(0, y, z); g.add(b); }
      const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.9, 12).rotateX(Math.PI / 2), back); motor.position.set(0, y, 0); g.add(motor);
      const plate = new THREE.Mesh(new THREE.CircleGeometry(R - 0.01, 24), back); plate.position.set(0, y, 0); g.add(plate);
      for (const end of [-1, 1]) {
        const rot = new THREE.Group(); rot.position.set(0, y, end * (L / 2 - 0.45)); g.add(rot); blades.push(rot);
        for (let k = 0; k < 6; k++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(0.16, R - 0.12, 0.02), galv); bl.position.set(Math.cos((k / 6) * Math.PI * 2) * (R / 2), Math.sin((k / 6) * Math.PI * 2) * (R / 2), 0); bl.rotation.z = (k / 6) * Math.PI * 2 - Math.PI / 2; bl.rotation.y = 0.5; rot.add(bl); }
        for (const a of [0, Math.PI / 2]) { const bar = box(g, 2 * R, 0.025, 0.025, 0, y, end * (L / 2 + 0.02), wire); bar.rotation.z = a; }
      }
      for (const z of [-L / 3, L / 3]) box(g, 0.1, H - y - R, 0.1, 0, (H + y + R) / 2, z, steel);
      box(g, 0.3, 0.18, 0.4, 0, y + R + 0.09, 0, steel); // its junction box
    }
  }

  // ---- the emergency points: phone niches and exit doors under lit signs, distance boards between ----
  const phoneSign = pic(signFace('EMERGENCY PHONE', 512, 112, '#ffffff', '#1d5fae', F.sign(700), 0.5, 0.06), { color: new THREE.Color(1.7, 1.7, 1.7) });
  const exitSign = pic(canvasTex(512, 192, (c) => {
    c.fillStyle = '#0d8a4c'; c.fillRect(0, 0, 512, 192);
    c.strokeStyle = '#f4fff6'; c.lineWidth = 6; c.strokeRect(8, 8, 496, 176);
    // the running man, out through a door
    c.fillStyle = '#f4fff6'; c.strokeStyle = '#f4fff6'; c.lineCap = 'round'; c.lineWidth = 16;
    c.beginPath(); c.arc(92, 50, 15, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.moveTo(84, 72); c.lineTo(72, 118); c.moveTo(80, 90); c.lineTo(110, 98); c.moveTo(80, 86); c.lineTo(54, 100); c.moveTo(72, 118); c.lineTo(100, 150); c.moveTo(72, 118); c.lineTo(46, 136); c.lineTo(36, 160); c.stroke();
    c.lineWidth = 8; c.strokeRect(124, 34, 40, 126);
    c.font = font(F.sign(700), 96); c.textBaseline = 'middle'; c.fillText('EXIT', 196, 100);
  }), { color: new THREE.Color(1.9, 1.9, 1.9) });
  const board = (text: string) => pic(signFace(text, 384, 96, '#f4fff6', '#0d6e3e', F.sign(700), 0.52, 0.04), { color: new THREE.Color(1.4, 1.4, 1.4) });
  const door = toon({ color: '#2c5a46' }), niche = toon({ color: '#1a1820' }), orange = toon({ color: '#e8701e' });
  /** A group on a wall (side: -1 left, 1 right) at s, x along the road (reading left to right from the road), y up, z
   *  out of the wall toward the road. */
  const onWall = (s: number, side: number) => {
    const f = route.frameAt(s), g = new THREE.Group(), fwd = new THREE.Vector3(f.fwd.x, 0, f.fwd.z).normalize(), right = new THREE.Vector3(f.right.x, 0, f.right.z).normalize();
    g.matrixAutoUpdate = false;
    g.matrix.makeBasis(side > 0 ? fwd.clone().negate() : fwd, UP, right.clone().multiplyScalar(-side)).setPosition(f.pos.clone().addScaledVector(f.right, side * W));
    root.add(g);
    return g;
  };
  const paintAt = drive.carriers.filter((c) => c.kind === 'tunnel').map((c) => ({ a: c.s - c.w / 2, b: c.s + c.w / 2, lo: c.foot - c.h / 2, hi: c.foot + c.h / 2 }));
  const taken: { side: number; a: number; b: number; lo: number; hi: number }[] = [];
  const exits: { s: number; side: number }[] = [];
  const phone = (s: number) => {
    const g = onWall(s, 1);
    box(g, 1.7, 2.3, 0.1, 0, WALK.h + 1.15, 0.05, crete); box(g, 1.3, 1.95, 0.02, 0, WALK.h + 1.05, 0.11, niche);
    box(g, 0.42, 0.6, 0.22, 0, WALK.h + 1.2, 0.2, orange); box(g, 0.12, 0.3, 0.06, 0.08, WALK.h + 1.25, 0.33, dark);
    plane(g, 1.6, 0.35, 0, WALK.h + 2.55, 0.13, phoneSign);
    box(g, 0.14, 0.14, 0.14, 0, WALK.h + 2.85, 0.12, lit(2.4, 1.0, 0.2)); // its beacon
    taken.push({ side: 1, a: s - 1.2, b: s + 1.2, lo: 0, hi: WALK.h + 3.1 });
  };
  const exit = (s: number, side: number) => {
    const g = onWall(s, side);
    box(g, 1.5, 2.45, 0.12, 0, WALK.h + 1.22, 0.06, crete); box(g, 1.1, 2.15, 0.04, 0, WALK.h + 1.08, 0.13, door);
    box(g, 0.75, 0.06, 0.06, 0.05, WALK.h + 1.05, 0.18, galv); // its push bar
    plane(g, 1.2, 0.45, 0, WALK.h + 2.75, 0.14, exitSign);
    exits.push({ s, side });
    taken.push({ side, a: s - 1.1, b: s + 1.1, lo: 0, hi: WALK.h + 3.1 });
  };
  for (let s = plan.s0 + POINTS.first; s < plan.s1 - 20; s += POINTS.every) {
    phone(s);
    if (s + POINTS.every / 2 < plan.s1 - 20) exit(s + POINTS.every / 2, 1);
  }
  for (let s = plan.s0 + POINTS.first + POINTS.every / 4; s < plan.s1 - 20; s += POINTS.every) {
    if (!paintAt.some((p) => s > p.a - 3 && s < p.b + 3)) exit(s, -1);
  }
  for (let s = plan.s0 + 14; s < plan.s1 - 14; s += POINTS.boards) {
    for (const side of [-1, 1]) {
      const sp = s + (side < 0 ? POINTS.boards / 2 : 0);
      if (taken.some((k) => k.side === side && sp > k.a - 2.5 && sp < k.b + 2.5) || (side < 0 && paintAt.some((p) => sp > p.a - 1.5 && sp < p.b + 1.5))) continue;
      const mine = exits.filter((e) => e.side === side), ahead = mine.filter((e) => e.s > sp).sort((x, y) => x.s - y.s)[0], behind = mine.filter((e) => e.s < sp).sort((x, y) => y.s - x.s)[0];
      const to = !behind || (ahead && ahead.s - sp < sp - behind.s) ? ahead : behind;
      if (!to) continue;
      // (the arrow toward it: forward is the board's left on the right wall, its right on the left)
      const fwdOnBoard = side > 0 ? '←' : '→', backOnBoard = side > 0 ? '→' : '←', m = Math.round(Math.abs(to.s - sp) / 5) * 5;
      const g = onWall(sp, side);
      plane(g, 0.9, 0.24, 0, WALK.h + 1.75, 0.02, board(to.s > sp ? `EXIT ${m}m ${fwdOnBoard}` : `${backOnBoard} EXIT ${m}m`));
      taken.push({ side, a: sp - 0.6, b: sp + 0.6, lo: WALK.h + 1.5, hi: WALK.h + 2 });
    }
  }

  // ---- tags: small, unreadable handstyles, throw-ups, stickers and water stains, layered round the pieces (never over
  // one), thickest near them, so the lyric wall reads as a tagged wall in a used tunnel ----
  {
    const CELL = 256, COLS = 8, ROWS = 4, inks = ['#141218', '#e9e6ea', '#c8202e', '#2b6fd6', '#1e9c5a', '#b8b8c4', '#f2c230', '#7a2d9a'];
    const letters = 'AEKMNORSTVWXYZ';
    const kinds: string[] = [];
    const atlas = canvasTex(CELL * COLS, CELL * ROWS, (c) => {
      for (let i = 0; i < COLS * ROWS; i++) {
        const x0 = (i % COLS) * CELL, y0 = Math.floor(i / COLS) * CELL, r = (k: number) => hash(i, k, 61);
        c.save(); c.beginPath(); c.rect(x0, y0, CELL, CELL); c.clip(); c.translate(x0 + CELL / 2, y0 + CELL / 2);
        const kind = i < 4 ? 'stain' : i < 8 ? 'throw' : i < 10 ? 'sticker' : 'tag';
        kinds.push(kind);
        const word = Array.from({ length: 3 + Math.floor(r(1) * 3) }, (_, k) => letters[Math.floor(hash(i, k, 62) * letters.length)]).join('');
        const ink = inks[Math.floor(r(2) * inks.length)]!;
        if (kind === 'stain') { // water and rust run down from the haunch
          for (let k = 0; k < 5; k++) { const w = 10 + 30 * hash(i, k, 63), gx = (hash(i, k, 64) - 0.5) * 120, g = c.createLinearGradient(0, -CELL / 2, 0, CELL / 2); g.addColorStop(0, `rgba(${k % 2 ? '90,50,24' : '40,30,28'},0.8)`); g.addColorStop(1, 'rgba(60,40,30,0)'); c.fillStyle = g; c.fillRect(gx - w / 2, -CELL / 2, w, CELL * (0.5 + 0.5 * hash(i, k, 65))); }
        } else if (kind === 'throw') { // bubble letters: a fill, a fat outline
          c.rotate((r(3) - 0.5) * 0.3); c.font = font(F.graffiti(), 96); c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
          const t2 = word.slice(0, 3); c.lineWidth = 22; c.strokeStyle = ink === '#e9e6ea' ? '#141218' : ink; c.strokeText(t2, 0, 0, CELL * 0.9);
          c.fillStyle = r(4) < 0.5 ? '#e9e6ea' : '#b8b8c4'; c.fillText(t2, 0, 0, CELL * 0.9);
        } else if (kind === 'sticker') { // a slap: HELLO my name is, scrawled over
          c.rotate((r(3) - 0.5) * 0.4); c.fillStyle = r(4) < 0.5 ? '#d8262e' : '#2b6fd6'; c.fillRect(-70, -48, 140, 96); c.fillStyle = '#f6f2ea'; c.fillRect(-62, -12, 124, 52);
          c.font = font(F.sign(700), 18); c.textAlign = 'center'; c.fillText('HELLO', 0, -24);
          c.strokeStyle = '#141218'; c.lineWidth = 5; c.beginPath(); c.moveTo(-50, 20); for (let k = 0; k < 8; k++) c.lineTo(-50 + k * 14, 20 + (hash(i, k, 66) - 0.5) * 30); c.stroke();
        } else { // a handstyle: the letters stretched, leaning, run together, an underline swoosh, a drip or two
          c.rotate((r(3) - 0.5) * 0.5 - 0.1); c.transform(1, 0, -0.45, 1, 0, 0); c.scale(1.35, 0.8);
          c.font = font(F.graffiti(), 70 + 40 * r(5)); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = ink; c.strokeStyle = ink;
          c.lineWidth = 3; c.strokeText(word, 0, 0, CELL * 0.7); c.fillText(word, 0, 0, CELL * 0.7);
          c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(-80, 34); c.quadraticCurveTo(0, 60 + 20 * r(6), 90, 22); c.stroke();
          for (let k = 0; k < 2; k++) if (hash(i, k, 67) < 0.6) c.fillRect(-60 + 120 * hash(i, k, 68), 10, 3, 20 + 40 * hash(i, k, 69));
          if (r(7) < 0.25) { c.strokeStyle = '#141218'; c.lineWidth = 7; c.beginPath(); c.moveTo(-90, -30); c.lineTo(90, 30); c.stroke(); } // crossed out
        }
        c.restore();
      }
    });
    const pos: number[] = [], uv: number[] = [], nrm: number[] = [];
    const quad = (s: number, side: number, y: number, w: number, h: number, cell: number) => {
      const f = route.frameAt(s), fwd = new THREE.Vector3(f.fwd.x, 0, f.fwd.z).normalize(), n = new THREE.Vector3(f.right.x, 0, f.right.z).normalize().multiplyScalar(-side);
      const along = side > 0 ? fwd.clone().negate() : fwd, c0 = f.pos.clone().addScaledVector(f.right, side * (W - 0.02)).addScaledVector(UP, y);
      const u0 = (cell % COLS) / COLS, v0 = 1 - Math.floor(cell / COLS) / ROWS, du = 1 / COLS, dv = 1 / ROWS;
      const P = (a: number, b: number) => c0.clone().addScaledVector(along, (a * w) / 2).addScaledVector(UP, (b * h) / 2);
      const corners: [THREE.Vector3, number, number][] = [[P(-1, -1), u0, v0 - dv], [P(1, -1), u0 + du, v0 - dv], [P(1, 1), u0 + du, v0], [P(-1, 1), u0, v0]];
      for (const k of [0, 1, 2, 0, 2, 3]) { const [p, a, b] = corners[k]!; pos.push(p.x, p.y, p.z); uv.push(a, b); nrm.push(n.x, n.y, n.z); }
    };
    const clearOf = (side: number, a: number, b: number, lo: number, hi: number) =>
      !(side < 0 && paintAt.some((p) => b > p.a - TAGS.clear && a < p.b + TAGS.clear && hi > p.lo - TAGS.clear && lo < p.hi + TAGS.clear))
      && !taken.some((k) => k.side === side && b > k.a && a < k.b && hi > k.lo && lo < k.hi);
    let n = 0;
    for (let s = plan.s0 + 6; s < plan.s1 - 6; s += TAGS.step) for (const side of [-1, 1]) {
      n++;
      const near = paintAt.some((p) => s > p.a - TAGS.near && s < p.b + TAGS.near) && side < 0;
      if (hash(n, 71) > TAGS.keep * (near ? 1.8 : 1)) continue;
      const cell = 4 + Math.floor(hash(n, 72) * (COLS * ROWS - 4)), kind = kinds[cell]!;
      const w = kind === 'sticker' ? 0.28 : kind === 'throw' ? 1.6 + 1.8 * hash(n, 73) : 1 + 1.4 * hash(n, 73), h = kind === 'sticker' ? 0.22 : w * (kind === 'throw' ? 0.6 : 0.45);
      const high = hash(n, 74) < 0.15, y = high ? 3 + 1.4 * hash(n, 75) : WALK.h + 0.5 + 1.8 * hash(n, 75);
      const sp = s + hash(n, 76) * TAGS.step;
      if (!clearOf(side, sp - w / 2, sp + w / 2, y - h / 2, y + h / 2)) continue;
      quad(sp, side, y, w, h, cell);
    }
    // water stains from the haunch, every so often, down both walls
    for (let s = plan.s0 + 9; s < plan.s1 - 9; s += 7 + 9 * hash(s, 77)) for (const side of [-1, 1]) {
      if (hash(s, side, 78) < 0.45) continue;
      const w = 0.6 + 1.2 * hash(s, side, 79), h = 2 + 2.4 * hash(s, side, 80), y = H - 0.9 - h / 2;
      if (!clearOf(side, s - w / 2, s + w / 2, y - h / 2, y + h / 2)) continue;
      quad(s, side, y, w, h, Math.floor(hash(s, side, 81) * 4));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    const tags = new THREE.Mesh(geo, toon({ map: atlas, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }));
    tags.renderOrder = -1; // (under the pieces' paint, should they ever touch)
    root.add(tags);
  }

  // ---- the headwalls: concrete faces round each portal (pilasters, a stepped parapet), the name and the date cast in ----
  {
    const nameTex = signFace(NAME, 1024, 128, '#3b332c', '#e9e1d2', F.sign(700), 0.56, 0.14), dateTex = signFace(BUILT, 512, 128, '#3b332c', '#e9e1d2', F.sign(600), 0.5, 0.18);
    const lintelTop = H + 1.4, Hw = HEADWALL;
    for (const [s, dir] of [[plan.s0, -1], [plan.s1, 1]] as const) {
      const f = route.frameAt(s), g = new THREE.Group();
      g.matrixAutoUpdate = false;
      // (x across, y up, z out of the face, away from the bore)
      const out = new THREE.Vector3(f.fwd.x, 0, f.fwd.z).normalize().multiplyScalar(dir), across = UP.clone().cross(out).normalize();
      g.matrix.makeBasis(across, UP, out).setPosition(f.pos);
      root.add(g);
      const z = Hw.proud / 2, jamb = W + 1.2;
      for (const side of [-1, 1]) box(g, Hw.half - jamb, Hw.top, Hw.proud, side * (jamb + Hw.half) / 2, Hw.top / 2, z, crete);
      box(g, 2 * jamb, Hw.top - lintelTop, Hw.proud, 0, (Hw.top + lintelTop) / 2, z, crete);
      // pilasters, a band, the stepped parapet
      for (const x of [-(jamb + 0.9), jamb + 0.9, -(Hw.half - 0.6), Hw.half - 0.6]) { box(g, 1.1, Hw.top + 0.5, 0.35, x, (Hw.top + 0.5) / 2, Hw.proud + 0.15, crete); box(g, 1.3, 0.3, 0.45, x, Hw.top + 0.6, Hw.proud + 0.15, crete); }
      box(g, 2 * Hw.half, 0.25, 0.2, 0, Hw.top - 0.4, Hw.proud + 0.1, crete);
      box(g, 7, 0.5, Hw.proud, 0, Hw.top + 0.25, z, crete); box(g, 4, 0.45, Hw.proud, 0, Hw.top + 0.7, z, crete);
      plane(g, 9.4, 1.18, 0, lintelTop + 0.95, Hw.proud + 0.01, pic(nameTex));
      plane(g, 3.2, 0.8, 0, Hw.top + 0.25, Hw.proud + 0.01, pic(dateTex));
      // wall lanterns either side of the bore
      for (const side of [-1, 1]) { box(g, 0.3, 0.45, 0.3, side * (jamb + 0.9), 4.2, Hw.proud + 0.5, dark); box(g, 0.22, 0.3, 0.22, side * (jamb + 0.9), 4.18, Hw.proud + 0.5, lit(2.2, 1.5, 0.7)); }
    }
  }

  // ---- the oncoming traffic: cars in the other lane coming through, lit ----
  const cars: { g: THREE.Group; enter: number }[] = [];
  {
    const paints = ['#2a3f5a', '#d8d2c4', '#1c1c22', '#7a7a80', '#3d5a3a', '#5a4a6e']; // (no reds: the hero's is the one red car; no yellows: under sodium they glare)
    const head = lit(4, 3.6, 2.8), tail = lit(3, 0.25, 0.2);
    plan.oncoming.forEach((enter, k) => {
      const g = sedan({ color: paints[k % paints.length]!, length: 4.4 + 0.5 * hash(k, 91) });
      g.matrixAutoUpdate = false; g.visible = false;
      const L = 4.6;
      for (const x of [0.62, -0.62]) { box(g, 0.24, 0.12, 0.05, x, 0.62, L / 2 + 0.03, head); box(g, 0.26, 0.09, 0.05, x, 0.62, -L / 2 - 0.03, tail); }
      root.add(g);
      cars.push({ g, enter });
    });
  }

  return {
    group: root,
    update(t) {
      const red = t >= plan.crashAt && t < plan.calm;
      for (const m of heads) {
        const want = red ? cross : arrow;
        if (m.map !== want) { m.map = want; m.needsUpdate = true; }
        // (the red X burns harder than the green: the scare reads down the bore)
        m.color.setScalar(red ? 3 : 2);
      }
      for (const b of blades) b.rotation.z = t * 7;
      for (const { g, enter } of cars) {
        const s = plan.s1 + 3 - ONCOMING.v * (t - enter);
        g.visible = s > plan.s0 - 6 && s < plan.s1 + 6;
        if (!g.visible) continue;
        const f = route.frameAt(s), back = new THREE.Vector3(-f.fwd.x, 0, -f.fwd.z).normalize(), r = new THREE.Vector3(f.right.x, 0, f.right.z).normalize();
        g.matrix.makeBasis(r, UP, back).setPosition(f.pos.clone().addScaledVector(f.right, ONCOMING.lane));
      }
    },
  };
}
