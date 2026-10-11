// The greybox world (M2): ground, road, blocks of buildings, palms, a few landmarks, the sign boards and the car with
// its two silhouettes. Plain lit colours, no textures but the lyric faces: the look comes in M3. Deterministic
// (seeded by position along the road).
import * as THREE from 'three';
import { hash } from '../engine/util';
import { WORLD, toon } from '../look/toon';
import { F } from '../engine/type';
import { GLOW, glowMaterial, lampMaterial, withWindows } from '../look/night';
import type { Drive } from './drive';
import { ROAD_HALF, type Route } from './route';
import { BANNER, type Carrier, LAYOUT, PAIRABLE, type SetKind, basisOf, solidsOf } from './carriers';
const SET_KINDS: ReadonlySet<string> = new Set<SetKind>(['speed', 'bus', 'mirror', 'sticker', 'plate', 'phone', 'radio', 'menu', 'marquee']);
import { TUNNEL, TUNNEL_CLEAR, type Tunnel, nearTunnel } from './tunnel';
import type { Stretch } from './stretches';
import { BLOCKS, boxAt } from './blocks';
import { MOTEL_SIGN, motelSign } from './landmarks';

export { ROAD_HALF }; // (route.ts: the road's own measure)
/** The ground is a flat base plane under shoulders that follow the road this far out (m; the sea, further): a strip much
 *  wider than the road's tightest bend folds over the road there (the hairpin into the hills). */
export const SHOULDER = 40;
export const SEA = 200;
const BASE = 12000;
/** Where the road climbs above the plain, its verges slope down to it this much out per metre down (an embankment). */
export const SLOPE = 1;
/** The road runs on this far past where the car parks, to the overlook's edge (m). */
const OVERLOOK_LIP = 9;
const STEP = 2;

/** Each section's ground (sRGB; others the golden fields). */
const GROUND: Record<string, string> = { verse1: '#c99a7a', chorus2: '#b8a99a', verse2: '#9fae62', chorus3: '#f0d39b', verse3: '#6a5a78', chorus4: '#7d6a5c' };
const PALMS = new Set(['intro', 'chorus1', 'verse2', 'verse3']); // (none on the coast road: they'd stand in the hook's sky)

/** A strip along the road from `a` to `b` metres off its centre line (negative: left; numbers, or functions of s),
 *  coloured per sample. */
function strip(route: Route, a: number | ((s: number) => number), b: number | ((s: number) => number), dy: number, colorAt: (s: number) => THREE.Color, end = route.length): THREE.BufferGeometry {
  const at = (x: number | ((s: number) => number), s: number) => (typeof x === 'number' ? x : x(s));
  const n = Math.ceil(end / STEP) + 1, pos = new Float32Array(n * 6), col = new Float32Array(n * 6), idx: number[] = [];
  for (let i = 0; i < n; i++) {
    const s = Math.min(end, i * STEP), f = route.frameAt(s), c = colorAt(s);
    const p = f.pos.clone().addScaledVector(f.right, at(a, s)), q = f.pos.clone().addScaledVector(f.right, at(b, s));
    pos.set([p.x, p.y + dy, p.z, q.x, q.y + dy, q.z], i * 6);
    col.set([c.r, c.g, c.b, c.r, c.g, c.b], i * 6);
    if (i > 0) { const o = (i - 1) * 2; idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** An embankment along one side of the road (side: -1 left, +1 right): from the verge's edge (`edge` m out) down to
 *  the plain at SLOPE, wherever the road stands above it. */
function skirt(route: Route, side: number, edge: (s: number) => number, end = route.length): THREE.BufferGeometry {
  const n = Math.ceil(end / STEP) + 1, pos = new Float32Array(n * 6), col = new Float32Array(n * 6), idx: number[] = [];
  const c = new THREE.Color(WORLD.ground).multiplyScalar(0.8);
  for (let i = 0; i < n; i++) {
    const s = Math.min(end, i * STEP), f = route.frameAt(s), h = Math.max(0, f.pos.y + 0.4), e = edge(s);
    const p = f.pos.clone().addScaledVector(f.right, side * e).addScaledVector(f.up, -0.05);
    const q = f.pos.clone().addScaledVector(f.right, side * (e + SLOPE * h)); q.y = -0.4;
    pos.set([p.x, p.y, p.z, q.x, q.y, q.z], i * 6);
    col.set([c.r, c.g, c.b, c.r, c.g, c.b], i * 6);
    if (i > 0) { const o = (i - 1) * 2; idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}


export function buildWorld(drive: Drive): THREE.Group {
  const { route, motion } = drive, g = new THREE.Group();
  const stretchAtS = (s: number): Stretch => {
    for (const st of drive.stretches) if (s < motion.distanceAt(st.end)) return st;
    return drive.stretches[drive.stretches.length - 1]!;
  };
  const lambert = (o: THREE.MeshToonMaterialParameters = {}) => toon({ vertexColors: true, ...o });

  // ground either side (the sea to the left along the coast), the road, its centre dashes
  const grass = new THREE.Color(WORLD.ground), sand = new THREE.Color(WORLD.sand), sea = new THREE.Color(WORLD.sea), asphalt = new THREE.Color(WORLD.asphalt);
  const seaLeft = (s: number) => !!BLOCKS[stretchAtS(s).id]!.seaLeft;
  // the road ends at the overlook, a few metres past where the car parks: a cliff, the city below
  const end = Math.min(route.length, motion.distanceAt(drive.stretches[drive.stretches.length - 1]!.end) + OVERLOOK_LIP);
  const named = <T extends THREE.Object3D>(o: T, name: string) => { o.name = name; return o; };
  // each section its own ground: the city's paving, the freeway's concrete, the neighbourhood's lawns, the coast's sand
  const groundOf = (s: number) => { const g0 = GROUND[stretchAtS(s).id]; return g0 ? new THREE.Color(g0) : grass; };
  g.add(named(new THREE.Mesh(strip(route, (s) => (seaLeft(s) ? -SEA : -SHOULDER), -ROAD_HALF, -0.05, (s) => (seaLeft(s) ? sea : groundOf(s)), end), lambert()), 'verges'));
  g.add(named(new THREE.Mesh(strip(route, ROAD_HALF, SHOULDER, -0.05, (s) => (seaLeft(s) ? sand : groundOf(s)), end), lambert()), 'verges'));
  const fe = route.frameAt(end), cliff = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), toon({ color: WORLD.rock }));
  cliff.matrixAutoUpdate = false;
  cliff.matrix.copy(boxAt(route, end + 1, 0, 2 * SHOULDER, fe.pos.y + 0.4, 2, -(fe.pos.y + 0.4))); // (the verges' width: any wider and its edge cuts across the town seen from the Strip)
  g.add(named(cliff, 'cliff'));
  // embankments where the road has climbed: from each verge's edge down to the plain
  for (const side of [-1, 1]) g.add(named(new THREE.Mesh(skirt(route, side, (s) => (side < 0 && seaLeft(s) ? SEA : SHOULDER), end), lambert()), 'skirts'));
  const box3 = new THREE.Box3();
  for (let s = 0; s < route.length; s += 50) box3.expandByPoint(route.frameAt(s).pos);
  const base = new THREE.Mesh(new THREE.PlaneGeometry(BASE, BASE), toon({ color: grass.clone().multiplyScalar(0.85) }));
  base.rotation.x = -Math.PI / 2;
  base.position.set((box3.min.x + box3.max.x) / 2, -0.4, (box3.min.z + box3.max.z) / 2);
  g.add(named(base, 'base'));
  g.add(named(new THREE.Mesh(strip(route, -ROAD_HALF, ROAD_HALF, 0, () => asphalt, end), lambert()), 'road'));
  // the centre line's dashes, but none under road paint (they'd cut through its letters; left out, not squashed
  // flat: a flat box's normals are NaN, and the bloom spreads a NaN into a white dot)
  const paint = drive.carriers.filter((c) => c.kind === 'road');
  const dashAt: number[] = [];
  for (let s = 0; s < end; s += 8) if (!paint.some((c) => Math.abs(c.s - s) < c.h / 2 + 2)) dashAt.push(s);
  const dashes = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), toon({ color: WORLD.dash }), dashAt.length);
  dashAt.forEach((s, i) => dashes.setMatrixAt(i, boxAt(route, s, 0, 0.15, 0.02, 3, 0.01)));
  g.add(named(dashes, 'dashes'));

  // the town's buildings (blocks.ts: the guard checks them too)
  const blocks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), withWindows(toon()), drive.blocks.length);
  drive.blocks.forEach((b, i) => { blocks.setMatrixAt(i, b.matrix); blocks.setColorAt(i, new THREE.Color(WORLD.stucco[Math.floor(b.color * WORLD.stucco.length)]!)); });
  g.add(named(blocks, 'blocks'));
  g.add(named(dressing(drive), 'dressing'));
  g.add(named(placeSigns(drive), 'places'));

  // palms: a trunk and a crown, behind the roadside signs' line
  const trunks: THREE.Matrix4[] = [], crowns: THREE.Matrix4[] = [];
  for (let k = 0; k * 30 < route.length; k++) {
    const s = k * 30 + 5;
    if (!PALMS.has(stretchAtS(s).id)) continue;
    for (const side of [1, -1]) {
      if (side === -1 && BLOCKS[stretchAtS(s).id]!.seaLeft) continue;
      if (nearTunnel(drive.tunnels, s, TUNNEL_CLEAR)) continue; // nor in the rock
      // none by a face on the left: they'd stand between it and the camera across the road (on the right too: a wide
      // pair shot stands back past them)
      if (drive.carriers.some((c) => PAIRABLE.has(c.kind) && Math.abs(c.s - s) < c.w / 2 + (side === -1 ? 8 : 28))) continue;
      const h = 9 + 4 * hash(k, side, 8);
      trunks.push(boxAt(route, s, side * 11.5, 0.35, h, 0.35));
      crowns.push(boxAt(route, s, side * 11.5, 3.2, 1.2, 3.2, h));
    }
  }
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.5, 0.6, 1, 6), toon({ color: WORLD.trunk }), trunks.length);
  trunks.forEach((m, i) => trunk.setMatrixAt(i, m));
  const crown = new THREE.InstancedMesh(new THREE.SphereGeometry(0.5, 7, 4), toon({ color: WORLD.crown }), crowns.length);
  crowns.forEach((m, i) => crown.setMatrixAt(i, m));
  g.add(named(trunk, 'palms'), named(crown, 'palms'));

  for (const tn of drive.tunnels) g.add(buildTunnel(route, tn));
  g.add(named(buildStreetlights(drive), 'streetlights'));

  // the motel on the corner, behind the car waiting at the light
  const motel = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), withWindows(toon({ color: WORLD.motel })));
  motel.matrixAutoUpdate = false;
  { // (before the road's start: frameAt clamps there, so laid off its first frame by hand)
    const f = route.frameAt(0), M = { s: -17, lateral: 20, w: 30, h: 9, d: 14 };
    motel.matrix.makeBasis(f.right.clone().negate(), new THREE.Vector3(0, 1, 0), f.fwd).scale(new THREE.Vector3(M.w, M.h, M.d))
      .setPosition(f.pos.clone().addScaledVector(f.fwd, M.s).addScaledVector(f.right, M.lateral).add(new THREE.Vector3(0, M.h / 2, 0)));
  }
  const sign = buildMotelSign(route);
  g.add(motel, sign);
  g.userData.sign = sign.userData;
  return g;
}

/** A profile (lateral, height; m) swept along the road from s0 to s1: its uv in metres over `tile`. */
function sweep(route: Route, s0: number, s1: number, profile: readonly [number, number][], tile: number): THREE.BufferGeometry {
  const n = Math.ceil((s1 - s0) / 1) + 1, m = profile.length, pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const len = [0];
  for (let j = 1; j < m; j++) len.push(len[j - 1]! + Math.hypot(profile[j]![0] - profile[j - 1]![0], profile[j]![1] - profile[j - 1]![1]));
  for (let i = 0; i < n; i++) {
    const s = Math.min(s1, s0 + i), f = route.frameAt(s);
    profile.forEach(([x, y], j) => {
      const v = f.pos.clone().addScaledVector(f.right, x).addScaledVector(f.up, y);
      pos.push(v.x, v.y, v.z); uv.push((s - s0) / tile, len[j]! / tile);
    });
    if (i > 0) for (let j = 0; j < m - 1; j++) { const a = (i - 1) * m + j, b = i * m + j; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Glazed wall tiles, 4 to a texture repeat. */
function tiles(): THREE.Texture {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d')!;
  x.fillStyle = '#ddd3bc'; x.fillRect(0, 0, 256, 256);
  x.fillStyle = '#9a907c';
  for (let k = 0; k < 4; k++) { x.fillRect(k * 64, 0, 5, 256); x.fillRect(0, k * 64, 256, 5); } // big tiles, heavy grout: no shimmer
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

/** A tunnel (tunnel.ts): the tiled bore, the headland over it with a mouth at each end, and its lamps. */
function buildTunnel(route: Route, tn: Tunnel): THREE.Group {
  const g = new THREE.Group(), { halfW: W, h: H, hill, hillHalfW } = TUNNEL;
  const bore: [number, number][] = [[-W, 0], [-W, H], [W, H], [W, 0]];
  g.add(new THREE.Mesh(sweep(route, tn.s0, tn.s1, bore, 2), toon({ map: tiles(), side: THREE.DoubleSide })));
  const rock = toon({ color: WORLD.rock, side: THREE.DoubleSide });
  const outside: [number, number][] = [[-hillHalfW, -0.3], [-W - 1, H + hill], [W + 1, H + hill], [hillHalfW, -0.3]];
  g.add(new THREE.Mesh(sweep(route, tn.s0, tn.s1, outside, 4), rock));
  // the mouths: the headland's face with the bore cut out
  const face = new THREE.Shape(outside.map(([x, y]) => new THREE.Vector2(x, y)));
  face.holes.push(new THREE.Path(bore.map(([x, y]) => new THREE.Vector2(x, y))));
  for (const s of [tn.s0, tn.s1]) {
    const f = route.frameAt(s), mouth = new THREE.Mesh(new THREE.ShapeGeometry(face), rock);
    mouth.matrixAutoUpdate = false;
    mouth.matrix.makeBasis(f.right, f.up, f.fwd).setPosition(f.pos);
    g.add(mouth);
  }
  // a sodium lamp over the car on every beat
  const lamps = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: '#ffb347' }), tn.lamps.length);
  tn.lamps.forEach((s, i) => lamps.setMatrixAt(i, boxAt(route, s, 0, 1.6, 0.15, 0.6, H - 0.15)));
  g.add(lamps);
  return g;
}

/** The town's dressing: awnings over the buildings' ground floors on the road side, rooftop clutter (AC units, water
 *  tanks), and power lines on poles along the right where the town is low (the neighbourhood, the coast). */
const POWER = { stretches: new Set(['verse2', 'chorus3']), lateral: 13, every: 34, h: 9 };
function dressing(drive: Drive): THREE.Group {
  const g = new THREE.Group(), { route } = drive, awn: THREE.Matrix4[] = [], awnCol: THREE.Color[] = [], roof: THREE.Matrix4[] = [];
  const palette = ['#ff5a36', '#2b78a6', '#1f6b44', '#f6dd8f', '#c8102e', '#ffffff'];
  drive.blocks.forEach((b, i) => {
    const side = Math.sign(b.lateral), front = Math.abs(b.lateral) - b.d / 2;
    if (b.h > 4 && hash(i, 41) < 0.6) {
      // an awning, 1.6 m out from the face toward the road, over the door
      awn.push(boxAt(route, b.s, side * (front - 0.8), b.w * 0.7, 0.25, 1.6, 3.1));
      awnCol.push(new THREE.Color(palette[Math.floor(hash(i, 42) * palette.length)]!));
    }
    for (let k = 0; k < 1 + Math.floor(hash(i, 43) * 3); k++) {
      const u = hash(i, 44 + k) - 0.5, v = hash(i, 50 + k) - 0.5, tank = hash(i, 56 + k) < 0.25;
      roof.push(boxAt(route, b.s + u * b.w * 0.6, b.lateral + v * b.d * 0.6, tank ? 2.2 : 1.6, tank ? 2.6 : 1.1, tank ? 2.2 : 1.2, b.h));
    }
  });
  const awnings = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), toon(), awn.length);
  awn.forEach((m, i) => { awnings.setMatrixAt(i, m); awnings.setColorAt(i, awnCol[i]!); });
  const roofs = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), toon({ color: '#b9ada0' }), roof.length);
  roof.forEach((m, i) => roofs.setMatrixAt(i, m));
  g.add(awnings, roofs);
  // power lines: poles, and three wires sagging between each pair
  const at: number[] = [];
  for (let s = 0; s < route.length; s += POWER.every) {
    const st = drive.stretchAt(drive.stretches.find((x) => s < drive.motion.distanceAt(x.end))?.start ?? 0);
    if (!POWER.stretches.has(st.id) || nearTunnel(drive.tunnels, s, TUNNEL_CLEAR) || drive.carriers.some((c) => Math.abs(c.s - s) < 14 && c.solid)) { at.push(NaN); continue; }
    at.push(s);
  }
  const poles = at.filter((s) => !Number.isNaN(s));
  const pm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), toon({ color: WORLD.trunk }), poles.length * 2);
  poles.forEach((s, i) => { pm.setMatrixAt(2 * i, boxAt(route, s, POWER.lateral, 0.3, POWER.h, 0.3)); pm.setMatrixAt(2 * i + 1, boxAt(route, s, POWER.lateral, 2.4, 0.14, 0.14, POWER.h - 0.6)); });
  g.add(pm);
  const wire: number[] = [];
  for (let i = 1; i < at.length; i++) {
    const a = at[i - 1]!, b = at[i]!;
    if (Number.isNaN(a) || Number.isNaN(b)) continue;
    for (const off of [-1, 0, 1]) {
      for (let k = 0; k < 8; k++) {
        const u0 = k / 8, u1 = (k + 1) / 8, p = (u: number) => {
          const f = route.frameAt(a + (b - a) * u);
          return f.pos.clone().addScaledVector(f.right, POWER.lateral + off).add(new THREE.Vector3(0, POWER.h - 0.6 - 1.4 * Math.sin(Math.PI * u), 0));
        };
        const q0 = p(u0), q1 = p(u1);
        wire.push(q0.x, q0.y, q0.z, q1.x, q1.y, q1.z);
      }
    }
  }
  const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wire, 3));
  g.add(new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color: '#1c0f22' })));
  return g;
}

/** The song's places, as city signs by the road just after the line that names them (callbacks, never ahead of the
 *  words): South Detroit, Compton, Slauson; and "South of somewhere": SOUTH OF, DETROIT crossed out, somewhere sprayed. */
export const PLACES: readonly [RegExp, string, string, boolean][] = [
  [/south detroit/i, 'SOUTH DETROIT', 'CITY LIMIT', false],
  [/compton/i, 'COMPTON', 'WEST SIDE', false],
  [/slauson/i, 'SLAUSON AV', 'NEXT RIGHT', false],
  [/south of somewhere/i, 'SOUTH OF', 'DETROIT', true],
];
const PLACE_SIGN = { after: 45, lateral: 12, w: 11, h: 5.2, y: 5 };
function placeSigns(drive: Drive): THREE.Group {
  const g = new THREE.Group(), { route, motion } = drive;
  const lines = new Map<number, { text: string; end: number }>();
  for (const c of drive.carriers) { const l = lines.get(c.phrase.line); lines.set(c.phrase.line, { text: (l ? l.text + ' ' : '') + c.phrase.text, end: Math.max(l?.end ?? 0, c.phrase.end) }); }
  for (const [, l] of lines) {
    const place = PLACES.find(([re]) => re.test(l.text));
    if (!place) continue;
    const [, name, sub, sprayed] = place, P = PLACE_SIGN;
    let s = motion.distanceAt(l.end) + P.after;
    while (drive.carriers.some((c) => Math.abs(c.s - s) < 16)) s += 6; // clear of the words' own faces
    const cv = document.createElement('canvas'); cv.width = 768; cv.height = Math.round((768 * P.h) / P.w);
    const x = cv.getContext('2d')!, W = cv.width, H = cv.height;
    x.fillStyle = '#1f6b44'; x.fillRect(0, 0, W, H);
    x.strokeStyle = '#f4f4f0'; x.lineWidth = 10; x.strokeRect(14, 14, W - 28, H - 28);
    x.fillStyle = '#f4f4f0'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = `${H * 0.3}px "${F.archivo(100, 700)}"`; x.fillText(name, W / 2, H * 0.36, W * 0.88);
    x.font = `${H * 0.17}px "${F.archivo(100, 700)}"`; x.fillText(sub, W / 2, H * 0.72, W * 0.8);
    if (sprayed) { // the old name struck out, the new one sprayed over in pink
      const wSub = x.measureText(sub).width;
      x.strokeStyle = '#ff4fa3'; x.lineWidth = 9; x.beginPath(); x.moveTo(W / 2 - wSub / 2 - 10, H * 0.74); x.lineTo(W / 2 + wSub / 2 + 10, H * 0.68); x.stroke();
      x.fillStyle = '#ff4fa3'; x.save(); x.translate(W * 0.62, H * 0.6); x.rotate(-0.12);
      x.font = `${H * 0.26}px "${F.bodoni(700, { italic: true })}"`; x.fillText('somewhere', 0, 0); x.restore();
    }
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const f = route.frameAt(s), face = f.fwd.clone().negate().addScaledVector(f.right, -0.5).setY(0).normalize(); // toward the oncoming car and the road
    const sign = new THREE.Group();
    sign.add(new THREE.Mesh(new THREE.PlaneGeometry(P.w, P.h), new THREE.MeshBasicMaterial({ map: tex })));
    for (const px of [-P.w / 2 + 0.6, P.w / 2 - 0.6]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, P.y + P.h / 2, 0.2), toon({ color: WORLD.post })); leg.position.set(px, (P.h / 2 - P.y) / 2, -0.12); sign.add(leg); } // (legs: the ground to the board's top)
    sign.matrixAutoUpdate = false;
    sign.matrix.makeBasis(new THREE.Vector3(0, 1, 0).cross(face).normalize(), new THREE.Vector3(0, 1, 0), face).setPosition(f.pos.clone().addScaledVector(f.right, P.lateral).add(new THREE.Vector3(0, P.y, 0)));
    g.add(sign);
  }
  return g;
}

/** Streetlights on the road's right from dusk: one passes the car every STREETLIGHTS.beats beats (at least `gap` m
 *  apart), a pole with an arm over the road, a bulb and its pool of light; none in a tunnel or by its mouths, nor
 *  close to a sign (it would stand in front of it) or across from a face on the left (beside the camera that films it). */
export const STREETLIGHTS = { from: 92, beats: 2, gap: 18, lateral: 6.2, h: 7.2, reach: 3.6 };
function buildStreetlights(drive: Drive): THREE.Group {
  const { route, motion } = drive, g = new THREE.Group(), at: number[] = [];
  const signs = drive.carriers.filter((c) => c.kind === 'sign' || c.kind === 'street' || c.kind === 'gantry');
  for (const b of drive.beats.filter((b, i) => b >= STREETLIGHTS.from && i % STREETLIGHTS.beats === 0)) {
    const s = motion.distanceAt(b);
    if (at.length && s - at[at.length - 1]! < STREETLIGHTS.gap) continue;
    if (nearTunnel(drive.tunnels, s, TUNNEL_CLEAR) || signs.some((c) => Math.abs(c.s - s) < 12)) continue;
    // nor where the camera stands across the road from a face on the left (it would stand beside the lens)
    if (drive.carriers.some((c) => PAIRABLE.has(c.kind) && Math.abs(c.s - s) < c.w / 2 + 28)) continue;
    at.push(s);
  }
  const L = STREETLIGHTS, n = at.length;
  const poles = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), toon({ color: WORLD.post }), n * 2);
  const bulbs = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), lampMaterial('#ffcf8a'), n);
  const pools = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 24), glowMaterial('#ffb560', GLOW.pool, true), n);
  at.forEach((s, i) => {
    poles.setMatrixAt(2 * i, boxAt(route, s, L.lateral, 0.22, L.h, 0.22));
    poles.setMatrixAt(2 * i + 1, boxAt(route, s, (L.lateral + L.reach) / 2, L.lateral - L.reach, 0.16, 0.16, L.h - 0.1));
    bulbs.setMatrixAt(i, boxAt(route, s, L.reach + 0.3, 0.9, 0.18, 0.45, L.h - 0.3));
    const f = route.frameAt(s), m = new THREE.Matrix4().makeBasis(f.right, f.fwd, f.up).scale(new THREE.Vector3(6.5, 6.5, 1));
    pools.setMatrixAt(i, m.setPosition(f.pos.clone().addScaledVector(f.right, L.reach - 0.5).addScaledVector(f.up, 0.04)));
  });
  pools.frustumCulled = false;
  g.add(poles, bulbs, pools);
  return g;
}

/** The motel's roadside sign (landmarks.ts), the video's title in the world: SZA over BMF in pink neon, NO VACANCY
 *  lit below. Two faces — with the NO, and without (VACANCY, the end) — the scene picks one and lights it (userData). */
function signFace(no: boolean): THREE.CanvasTexture {
  const M = MOTEL_SIGN, c = document.createElement('canvas'); c.width = 512; c.height = Math.round((512 * M.h) / M.w);
  const x = c.getContext('2d')!, W = c.width, H = c.height;
  x.fillStyle = '#163a40'; x.fillRect(0, 0, W, H);
  x.strokeStyle = '#f3e6c4'; x.lineWidth = 14; x.strokeRect(14, 14, W - 28, H - 28);
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillStyle = '#f3e6c4'; x.font = `${H * 0.11}px "${F.archivo(100, 900)}"`; x.fillText('SZA', W / 2, H * 0.17);
  x.shadowColor = 'rgba(255,79,163,1)'; x.shadowBlur = 28; x.fillStyle = '#ffd0e8';
  x.font = `${H * 0.27}px "${F.bodoni(700, { italic: true })}"`; x.fillText('BMF', W / 2, H * 0.48, W * 0.8);
  x.font = `${H * 0.075}px "${F.archivo(100, 700)}"`;
  const vac = 'VACANCY', gap = x.measureText(' ').width, wNo = x.measureText('NO').width, wVac = x.measureText(vac).width, x0 = W / 2 - (wNo + gap + wVac) / 2;
  x.textAlign = 'left';
  x.shadowColor = no ? 'rgba(255,60,40,1)' : 'rgba(0,0,0,0)'; x.fillStyle = no ? '#ff8a70' : '#4a2a2a'; x.fillText('NO', x0, H * 0.82);
  x.shadowColor = 'rgba(255,60,40,1)'; x.fillStyle = '#ff8a70'; x.fillText(vac, x0 + wNo + gap, H * 0.82);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return tex;
}
function buildMotelSign(route: Route): THREE.Group {
  const M = MOTEL_SIGN, at = motelSign(route), faces = { no: signFace(true), vacancy: signFace(false) };
  const mat = new THREE.MeshBasicMaterial({ map: faces.no, side: THREE.DoubleSide });
  const g = new THREE.Group();
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(M.w, M.h), mat);
  panel.position.set(0, M.y, 0); g.add(panel);
  const pole = new THREE.Mesh(new THREE.BoxGeometry(0.35, M.y - M.h / 2, 0.35), toon({ color: WORLD.post }));
  pole.position.set(0, (M.y - M.h / 2) / 2, -0.1); g.add(pole);
  g.matrixAutoUpdate = false;
  g.matrix.makeBasis(new THREE.Vector3(0, 1, 0).cross(at.normal).normalize(), new THREE.Vector3(0, 1, 0), at.normal).setPosition(at.foot);
  g.userData = { neon: mat, faces };
  return g;
}

/** A small high-wing plane, nose along +x from its tail at 0, `k` times life size (banners' tugs, the skywriter). */
export function buildPlane(k = 1): THREE.Group {
  const g = new THREE.Group(), body = toon({ color: '#e9e4da' }), trim = toon({ color: '#b3122e' });
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); };
  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.55 * k, 0.22 * k, 6 * k, 10), body);
  fuselage.rotation.z = -Math.PI / 2; fuselage.position.set(3 * k, 0, 0); g.add(fuselage);
  box(1.5 * k, 0.12 * k, 10 * k, 3.9 * k, 0.6 * k, 0, body); // the wing, over the cabin
  box(0.8 * k, 0.08 * k, 3.4 * k, 0.35 * k, 0.1 * k, 0, body); // tailplane
  box(1 * k, 1.5 * k, 0.08 * k, 0.4 * k, 0.75 * k, 0, trim); // fin
  const prop = new THREE.Mesh(new THREE.CircleGeometry(1.1 * k, 16), new THREE.MeshBasicMaterial({ color: '#2a2a30', transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
  prop.rotation.y = Math.PI / 2; prop.position.set(6.05 * k, 0, 0); g.add(prop); // spinning, a blur
  return g;
}

/** A towed banner ripples: a wave running back from its leading (right) edge, growing toward its trailing edge. Small
 *  enough to leave the words readable. */
export const FLUTTER = { segments: 40, amp: 0.025, waves: 2.5, hz: 1.3 };
/** Ripple a banner carrier's face (its object from buildCarrier) at t. */
export function flutter(o: THREE.Object3D, c: Carrier, t: number) {
  const face = o.getObjectByName('face') as THREE.Mesh, p = face.geometry.attributes.position!;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), back = (c.w / 2 - x) / c.w; // 0 at the leading edge, 1 at the trailing
    p.setZ(i, FLUTTER.amp * c.w * back * Math.sin(2 * Math.PI * (FLUTTER.waves * back - FLUTTER.hz * t)));
  }
  p.needsUpdate = true;
}

/** A carrier with its face's texture: a board on posts (a sign, a billboard), a street blade on its pole, a gantry over
 *  the road, a building with the face on its front (a wall, a shop's fascia, neon), paint on the road, or writing in the
 *  sky. */
export function buildCarrier(c: Carrier, face: THREE.Texture, wall: THREE.Color, route: Route): THREE.Object3D {
  const clear = c.kind === 'road' || c.kind === 'sky' || c.kind === 'neon' || c.kind === 'tunnel' || c.kind === 'hill' || c.kind === 'bus'; // the face is only its letters
  const mat = new THREE.MeshBasicMaterial({ map: face, transparent: clear, depthWrite: !clear, fog: c.kind !== 'sky', polygonOffset: c.kind === 'road', polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  if (c.kind === 'neon' || c.kind === 'tunnel') mat.color.setScalar(GLOW.neon); // lit lettering: HDR, it blooms
  if (c.kind === 'hill') mat.color.setScalar(1.5); // floodlit at night
  if (c.kind === 'road') return drapedOnRoad(c, mat, route);
  if (c.kind === 'speed' || c.kind === 'radio' || c.kind === 'phone') mat.color.setScalar(1.6); // (lit displays: they bloom a little)
  if (SET_KINDS.has(c.kind)) { // a set-piece's surface: just the face; its props stand round it (scenes/sets/)
    const m = new THREE.Mesh(new THREE.PlaneGeometry(c.w, c.h), mat);
    m.name = 'face'; m.matrixAutoUpdate = false; m.matrix.copy(basisOf(c));
    return m;
  }
  const g = new THREE.Group();
  const board = new THREE.Mesh(new THREE.PlaneGeometry(c.w, c.h, c.kind === 'banner' ? FLUTTER.segments : 1, 1), mat);
  board.name = 'face';
  g.add(board);
  const grey = (hex: string) => toon({ color: hex });
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); return b;
  };
  // the face's centre stands this high over the ground (the road's height where it stands)
  const y0 = c.foot;
  // legs from the board's top down to the ground, at these x
  const legs = (xs: number[], drop = y0 + c.h / 2) => { for (const x of xs) box(0.2, drop, 0.2, x, c.h / 2 - drop / 2, -0.2, grey(WORLD.post)); };
  // its backing board or its building (carriers.ts solidsOf: what the guard checks for hiding other faces)
  const building = PAIRABLE.has(c.kind) && c.kind !== 'billboard';
  // (a face's building a shade darker than the face, with windows: against a sunset sky it reads as a building; neon's
  // wall plain dark brick, nothing lit behind its tubes)
  for (const { at, size } of solidsOf(c)) box(size.x, size.y, size.z, at.x, at.y, at.z, building ? (c.kind === 'neon' ? toon({ color: wall }) : withWindows(toon({ color: wall.clone().multiplyScalar(0.78) }))) : grey(WORLD.backing)).name = building ? 'facade' : 'backing';
  switch (c.kind) {
    case 'sign': legs([-(c.w / 2 - 0.5), c.w / 2 - 0.5]); break;
    case 'billboard': if (c.stack !== 'bottom') legs([-(c.w / 2 - 2), c.w / 2 - 2]); if (c.stack !== 'top') box(c.w, 0.12, 1.2, 0, -c.h / 2 - 0.3, 0.4, grey(WORLD.post)); break;
    case 'street': legs([-c.w / 2 - 0.15], y0 + c.h / 2 + 0.4); break;
    case 'banner': {
      // the plane ahead of it (to its right, nose that way: it flies the way the words run), a high-wing tug on a tow
      // line from the banner's leading edge; as big as the banner was made (carriers.ts BANNER.view)
      const k = c.w / LAYOUT.banner.w, tow = BANNER.tow * k, x0 = c.w / 2 + tow;
      box(tow, 0.05 * k, 0.05 * k, c.w / 2 + tow / 2, 0, 0, grey('#3a3a40'));
      const plane = buildPlane(k); plane.position.x = x0; g.add(plane);
      break;
    }
    case 'hill': {
      // the mound it stands on (from the plain up to the letters' feet), and the scaffold behind each letter
      const mh = c.foot - c.h / 2 + 2, mound = new THREE.Mesh(new THREE.ConeGeometry(c.w * 0.75, mh, 24, 1), toon({ color: '#5a4a52' }));
      mound.position.set(0, -c.h / 2 + 2 - mh / 2, -6); mound.scale.z = 0.5; g.add(mound);
      for (let i = 0; i < 16; i++) box(0.4, c.h * 0.9, 0.4, -c.w * 0.45 + (i * c.w * 0.9) / 15, -c.h * 0.05, -1.2, grey(WORLD.post));
      break;
    }
    case 'gantry': legs([-6.5, 6.5]); box(13.4, 0.4, 0.4, 0, c.h / 2 + 0.2, -0.2, grey(WORLD.post)); break;
  }
  g.matrixAutoUpdate = false;
  g.matrix.copy(basisOf(c));
  return g;
}

/** Road paint laid on the road itself, row of vertices by row along it, so it follows the road's bends and grade. The
 *  face's own axes decide which way its texture runs: its up along the road (forward or back) and its run across it. */
function drapedOnRoad(c: Carrier, mat: THREE.Material, route: Route): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(c.w, c.h, 1, Math.max(2, Math.ceil(c.h / 0.5)));
  const p = geo.attributes.position!, f0 = route.frameAt(c.s);
  const upSign = Math.sign(c.up.dot(f0.fwd)), runSign = Math.sign(c.up.clone().cross(c.normal).dot(f0.right));
  for (let i = 0; i < p.count; i++) {
    const f = route.frameAt(c.s + upSign * p.getY(i)), v = f.pos.clone().addScaledVector(f.right, runSign * p.getX(i)).addScaledVector(f.up, 0.03);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, mat);
}

/** The car: a '64 Impala convertible, the LA lowrider (nose +z): a long low body (its side profile extruded across its
 *  width, wheel arches cut), a chrome spear down the side, chrome bumpers, whitewalls with chrome caps, quad headlights
 *  and the triple round tail lights (they glow at night, the headlights throw beams); the two of them as flat
 *  silhouettes: him at the wheel (on its left) in a cap, her riding, her hair down her back. */
export const CAR = { length: 5.4, width: 1.96, belt: 0.98, wheelZ: 1.55, wheelR: 0.36 };
export function buildCar(): THREE.Group {
  // the body (and the two of them) on its hydraulics (hydraulics.ts moves it, by name); the wheels on the road
  const g = new THREE.Group(), body = new THREE.Group(), { length: L, width: Wd, belt, wheelZ, wheelR } = CAR, hl = L / 2;
  body.name = 'body';
  g.add(body);
  const paint = toon({ color: WORLD.car }), dark = toon({ color: WORLD.carDark }), chrome = toon({ color: WORLD.chrome });
  const white = toon({ color: '#f4efe4' }), seat = toon({ color: '#3a1820' });
  const add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, to: THREE.Object3D = body) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); to.add(o); return o; };
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material) => add(new THREE.BoxGeometry(w, h, d), m, x, y, z);

  // the body: its side profile (z along, y up), wheel arches cut from the sill
  const side = new THREE.Shape();
  side.moveTo(-hl, 0.3);
  side.lineTo(-wheelZ - 0.5, 0.3); side.absarc(-wheelZ, 0.3, 0.5, Math.PI, 0, true);
  side.lineTo(wheelZ - 0.5, 0.3); side.absarc(wheelZ, 0.3, 0.5, Math.PI, 0, true);
  side.lineTo(hl, 0.3); side.lineTo(hl + 0.06, 0.55); side.lineTo(hl - 0.05, 0.84);
  side.lineTo(hl - 0.35, 0.9); side.lineTo(0.95, belt); // the long hood
  side.lineTo(-1.25, belt); // the open cockpit's beltline
  side.lineTo(-hl + 0.2, belt - 0.02); side.lineTo(-hl, 0.86); side.lineTo(-hl - 0.05, 0.55); // the deck, the tail
  side.closePath();
  const shell = new THREE.ExtrudeGeometry(side, { depth: Wd - 0.08, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2, curveSegments: 10 });
  shell.rotateY(-Math.PI / 2); shell.translate((Wd - 0.08) / 2, 0, 0);
  add(shell, paint, 0, 0, 0);
  // the cockpit: seats and the windshield
  box(Wd - 0.3, 0.5, 0.18, 0, belt + 0.15, -0.55, seat); // the bench's back
  box(Wd - 0.12, 0.05, 0.05, 0, belt + 0.48, 0.92, chrome); // the windshield's top rail
  for (const x of [Wd / 2 - 0.08, -Wd / 2 + 0.08]) box(0.05, 0.5, 0.05, x, belt + 0.24, 0.95, chrome);
  box(1.7, 0.22, 0.36, 0, 1.1, 0.73, dark); // the dash
  const bezel = box(0.5, 0.2, 0.03, -0.02, 1.12, 0.545, chrome); bezel.rotation.x = Math.asin(0.3); // the radio's face, tipped back
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(Wd - 0.2, 0.46), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.06, depthWrite: false }));
  glass.position.set(0, belt + 0.24, 0.94); glass.rotation.x = -0.25; body.add(glass);
  // chrome: the spear down each side, the bumpers
  for (const x of [Wd / 2, -Wd / 2]) box(0.03, 0.05, L - 0.9, x, 0.74, 0.05, chrome);
  box(Wd + 0.06, 0.13, 0.14, 0, 0.42, hl + 0.06, chrome);
  box(Wd + 0.06, 0.13, 0.14, 0, 0.42, -hl - 0.06, chrome);
  box(Wd - 0.5, 0.2, 0.04, 0, 0.66, hl + 0.06, dark); // the grille
  // under it: the chassis (it rides with the body), and a strut down to each wheel's hub (the scene stretches them as
  // the hydraulics lift it: named 'struts')
  box(Wd - 0.5, 0.16, L - 1.6, 0, 0.22, 0, dark);
  const struts = new THREE.Group(); struts.name = 'struts'; g.add(struts);
  for (const z of [wheelZ, -wheelZ]) for (const x of [Wd / 2 - 0.35, -Wd / 2 + 0.35]) add(new THREE.CylinderGeometry(0.05, 0.05, 1, 8), chrome, x, 0.5, z, struts);
  // wheels: tyre, whitewall, chrome cap
  for (const z of [wheelZ, -wheelZ]) for (const x of [Wd / 2 - 0.13, -Wd / 2 + 0.13]) {
    const sgn = Math.sign(x);
    const tyre = add(new THREE.CylinderGeometry(wheelR, wheelR, 0.24, 20), dark, x, wheelR, z, g); tyre.rotation.z = Math.PI / 2;
    const wall = add(new THREE.RingGeometry(wheelR * 0.55, wheelR * 0.8, 24), white, x + sgn * 0.125, wheelR, z, g); wall.rotation.y = (sgn * Math.PI) / 2;
    const cap = add(new THREE.CircleGeometry(wheelR * 0.5, 16), chrome, x + sgn * 0.127, wheelR, z, g); cap.rotation.y = (sgn * Math.PI) / 2;
  }
  // lights: quad headlights, triple round tail lights; the beams ahead on the road
  const head = lampMaterial('#fff2d8', GLOW.head, 0.9), tail = lampMaterial('#ff2a24', GLOW.tail, 1.1);
  for (const x of [0.72, 0.45, -0.45, -0.72]) add(new THREE.CircleGeometry(0.09, 14), head, x, 0.68, hl + 0.07);
  for (const x of [0.78, 0.55, 0.32, -0.32, -0.55, -0.78]) { const t = add(new THREE.CircleGeometry(0.075, 14), tail, x, 0.68, -hl - 0.07); t.rotation.y = Math.PI; }
  // the headlights' throw: light on the road ahead, widening and fading
  const throwGeo = new THREE.PlaneGeometry(1, 1, 1, 1);
  throwGeo.rotateX(-Math.PI / 2);
  const P = throwGeo.attributes.position!;
  for (let i = 0; i < P.count; i++) { const far = P.getZ(i) < 0 ? 1 : 0; P.setXYZ(i, P.getX(i) * (far ? 7 : 1.6), 0.04, hl + 0.4 + far * 22); }
  const lit = new THREE.Mesh(throwGeo, glowMaterial('#ffe6bd', GLOW.beam, false, true));
  g.add(lit); // (on the road, not on the body)
  // the two of them: him at the wheel (+x: the car's left) in a cap, a hand on it; her, her hair down her back, an arm
  // that goes up (cast.ts); their heads on pivots at the neck (hers turns to him, his nods): named for the scene
  const wheel = add(new THREE.TorusGeometry(0.19, 0.025, 8, 24), dark, 0.44, belt + 0.38, 0.42); wheel.rotation.x = -0.9;
  for (const [x, him] of [[0.44, true], [-0.44, false]] as const) {
    add(new THREE.CapsuleGeometry(0.21, 0.4, 4, 10), dark, x, belt + 0.3, -0.25);
    const head = new THREE.Group(); head.name = him ? 'hisHead' : 'herHead'; head.position.set(x, belt + 0.66, -0.22); body.add(head);
    add(new THREE.SphereGeometry(0.14, 14, 10), dark, 0, 0.12, 0, head);
    if (him) {
      add(new THREE.SphereGeometry(0.15, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), dark, 0, 0.18, 0, head); // the cap's crown
      const brim = add(new THREE.BoxGeometry(0.2, 0.025, 0.16), dark, 0, 0.18, 0.16, head); void brim; // its brim, forward
      const reach = add(new THREE.CapsuleGeometry(0.055, 0.5, 4, 8), dark, x - 0.02, belt + 0.45, 0.1); reach.rotation.x = 1.1; // his arm, to the wheel
    } else {
      const hair = add(new THREE.SphereGeometry(0.17, 14, 10), dark, 0, -0.04, -0.12, head); hair.scale.set(1, 1.9, 0.75);
      const arm = new THREE.Group(); arm.name = 'herArm'; arm.position.set(x - 0.2, belt + 0.55, -0.2); body.add(arm);
      add(new THREE.CapsuleGeometry(0.055, 0.55, 4, 8), dark, 0, -0.3, 0, arm);
      add(new THREE.SphereGeometry(0.075, 10, 8), dark, 0, -0.62, 0, arm); // her hand
    }
  }
  return g;
}
