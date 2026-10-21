// The overlook at the end of the drive, and the hill across the canyon (the finale; the user, 2026-10-15: "this looks
// like the perfect final scene to like expand on ... make it look just like really nice at the end"). Built, not a
// placeholder:
//   the lot     an asphalt turnout where the road ends — patched, cracked, tyre-worn — its bays painted along the wall,
//               the car's own at the arc's middle (it turns into it off its lane: drive.ts BAY), a hatched viewing
//               strip a bay over on the city's side, a concrete wheel stop in each bay, a kerb round its sides; three
//               cars parked dark in the bays
//   the wall    a low wall of laid stone along an arc at the lip, capped, pillars at its ends, a two-pipe rail on posts
//   at the wall two coin telescopes, a bench, a bin
//   the lamps   two cobra-heads over the lot and two lanterns at its far side, each with its warm pool (and real light
//               on the car and the two of them: the scene's toon materials take it)
//   the trees   pines silhouetted on the city's side; on the sign's side only low oaks and scrub (anything tall there
//               stood across CRUISE ALL NIGHT as it's read from the road coming up)
//   the slope   chaparral (scrubGround) falling from the wall to the plain
// and on Mount Lee (dressHill, world.ts buildCarrier 'hill'): chaparral on its slope and bushes along its ridge, a
// floodlight under each letter throwing its beam up onto it, the mast a lattice tower with its red lights.
// Deterministic (hashed). Browser only (canvas).
import * as THREE from 'three';
import { hash } from '../engine/util';
import { F } from '../engine/type';
import type { Route } from '../drive/route';
import { ROAD_HALF } from '../drive/route';
import { WORLD, printShadows, toon } from './toon';
import { glowMaterial, lampMaterial } from './night';
import { sedan } from '../scenes/sets/kit';
import { BAY, bayPath } from '../drive/drive';
import { CAR } from '../drive/cabin';

/** The lot, laid round the car's bay (m, in its own frame: x right of the car's bay's centre line, z forward along
 *  the road from the lot's datum): it starts this far short of the datum, spans this far either side; the wall's arc
 *  (its middle, over the car's bay, this far ahead of the datum; its radius, its height); the bays along it, radial off
 *  the arc, one centred on its middle (wide, deep from the wall's line, their wheel stops this far out from it); the
 *  bays given over to the hatched viewing strip (the telescopes, the bench: a bay over from the car's, toward the city —
 *  the car stopped right in front of them, the user, 2026-10-20), and those with a car parked in them (counted from
 *  the car's: + to the right). */
export const LOT = { entry: 14, half: 22, wall: { z: 9, R: 40, h: 0.62 }, bay: { w: 2.7, d: 5.8, stop: 1.6 }, strip: [2, 4] as [number, number], parked: [[-2, '#232b38'], [-5, '#2e3833'], [6, '#3a2731']] as [number, string][] };
/** Where the car stops in the lot's frame (z; x is 0, its bay's centre): its front tyres against its bay's wheel stop.
 *  The lot's datum is this far short of where it parks (world.ts). */
export const PARKED_Z = LOT.wall.z - LOT.bay.stop - 0.11 - (CAR.wheelZ + CAR.wheelR);
/** The slope from the wall down to the plain: how far out it runs (m), and how wide. */
const FALL = { along: 196, across: 150 };
const DARK = '#1a2430';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
/** The wall's line: how far ahead of the car it stands at x. */
export const wallZ = (x: number) => LOT.wall.z - LOT.wall.R + Math.sqrt(LOT.wall.R ** 2 - x * x);
/** A point `r` m in from the wall's line along the radial at x (from the arc's point there toward its centre). */
const inward = (x: number, r: number) => { const a = Math.asin(x / LOT.wall.R); return { x: x - Math.sin(a) * r, z: wallZ(x) - Math.cos(a) * r }; };
/** The row's bays either side of the car's (k: bays from it, + to the right), as many as fit short of the lot's sides. */
const ROW = Math.floor((LOT.half - 1.5 - LOT.bay.w / 2) / LOT.bay.w);
const inStrip = (k: number) => k >= LOT.strip[0] && k <= LOT.strip[1];
/** The bays' lines (x at the wall): between each bay and the next, the strip's sides, the row's ends; none inside the
 *  strip. */
const bayLines = () => Array.from({ length: 2 * ROW + 2 }, (_, i) => i - ROW - 1).filter((j) => !(inStrip(j) && inStrip(j + 1))).map((j) => (j + 0.5) * LOT.bay.w);

function canvas(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, repeat = false): THREE.CanvasTexture {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d')!);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Ground grown over with chaparral: in world space, clumps of dark sage scrub over the dusty ground's own colour, its
 *  worn paths lighter, a fine speck (the hills read as smooth pale dunes by moonlight). A toon material's patch. */
export function scrubGround<T extends THREE.MeshToonMaterial>(m: T, scrub: THREE.ColorRepresentation = '#232c24', scale = 0.2): T {
  const sc = new THREE.Color(scrub);
  m.onBeforeCompile = (sh) => {
    printShadows(sh);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
varying vec3 vScrubPos;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
vec4 scrubW = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
  scrubW = instanceMatrix * scrubW;
#endif
vScrubPos = (modelMatrix * scrubW).xyz;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vScrubPos;
float sHash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float sNoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(sHash(i), sHash(i + vec2(1.0, 0.0)), f.x), mix(sHash(i + vec2(0.0, 1.0)), sHash(i + vec2(1.0, 1.0)), f.x), f.y); }
float sFbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * sNoise(p); p = p * 2.07 + 11.3; a *= 0.5; } return s; }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
  {
    vec2 q = vScrubPos.xz * ${scale.toFixed(3)};
    float n = sFbm(q), aa = fwidth(n) * 1.2;
    float clump = smoothstep(0.47 - aa, 0.47 + aa, n), core = smoothstep(0.56 - aa, 0.56 + aa, n);
    float path = smoothstep(0.62, 0.66, sFbm(q * 0.31 + 4.0)) * (1.0 - clump);
    float speck = step(0.93, sHash(floor(vScrubPos.xz * 1.7)));
    vec3 scrub = vec3(${sc.r.toFixed(4)}, ${sc.g.toFixed(4)}, ${sc.b.toFixed(4)});
    diffuseColor.rgb = mix(diffuseColor.rgb * (1.0 + 0.16 * path - 0.07 * speck), mix(scrub, scrub * 0.72, core), clump * 0.92);
  }`);
  };
  m.customProgramCacheKey = () => `scrubGround${scrub}${scale}`;
  return m;
}

/** A pine: a trunk and its crown in stacked tiers, dark (a silhouette against the lights). The tiers squat and wide,
 *  each stepping in from the one under it, a little ragged, so the silhouette is notched skirt over skirt (four tall
 *  cones overlapping lined up into one black triangle). */
function pine(h: number, r: number, mat: THREE.Material, trunk: THREE.Material): THREE.Group {
  const g = new THREE.Group(), tiers = 6;
  const t = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, h * 0.35, 8), trunk); t.position.y = h * 0.175; g.add(t);
  for (let k = 0; k < tiers; k++) {
    const u = k / (tiers - 1), rag = 0.88 + 0.24 * hash(h, k, 61);
    const tier = new THREE.Mesh(new THREE.ConeGeometry(r * (1.05 - 0.72 * u) * rag, h * (0.24 - 0.06 * u), 9), mat);
    tier.position.y = h * (0.36 + 0.115 * k); tier.rotation.set(0.06 * (hash(h, k, 62) - 0.5), k * 0.9, 0.06 * (hash(h, k, 63) - 0.5)); tier.scale.z = 0.88 + 0.24 * hash(h, k, 64);
    g.add(tier);
  }
  return g;
}

/** The lot's face: asphalt, patched and cracked, worn lighter where the cars run in; the bays' lines along the wall,
 *  each drawn once, the viewing strip's hatching between two of them, oil under where cars stand. Drawn over the lot's
 *  extent (x right of the car's bay's centre, z forward; `zTop` its far edge; the road's centre at x `road`). */
function lotTexture(zTop: number, bays: { x: number; z: number; yaw: number }[], road: number): THREE.CanvasTexture {
  const W = 2048, H = 1088, L = LOT;
  const X = (x: number) => ((x + L.half) / (2 * L.half)) * W, Z = (z: number) => (1 - (z + L.entry) / (zTop + L.entry)) * H;
  const pxm = W / (2 * L.half);
  return canvas(W, H, (c) => {
    c.fillStyle = '#5a5262'; c.fillRect(0, 0, W, H);
    let k = 0; const r = () => hash(++k, 9.1);
    // patches: repairs in a darker, newer tar, their seams darker still
    for (let i = 0; i < 16; i++) {
      const w = (2 + 6 * r()) * pxm, h = (1.5 + 5 * r()) * pxm, x = r() * W, y = r() * H;
      c.fillStyle = r() < 0.5 ? '#4e4757' : '#625a69'; c.fillRect(x, y, w, h);
      c.strokeStyle = 'rgba(30,24,36,0.6)'; c.lineWidth = 3; c.strokeRect(x, y, w, h);
    }
    // the worn tracks in from the road, lighter where the tyres run: along the car's path off its lane into its bay
    c.strokeStyle = 'rgba(140,128,140,0.22)'; c.lineWidth = 0.7 * pxm; c.lineCap = 'butt';
    for (const dx of [-0.85, 0.85]) {
      c.beginPath();
      for (let z = -L.entry; z <= PARKED_Z + 1.6; z += 0.5) {
        const p = bayPath(PARKED_Z - z), n = Math.hypot(1, p.slope); // (each wheel square off the path)
        c.lineTo(X(p.lateral - BAY.x + dx / n), Z(z - (dx * p.slope) / n));
      }
      c.stroke();
    }
    // the grain: a speck, light and dark
    for (let i = 0; i < 60000; i++) { c.fillStyle = r() < 0.5 ? 'rgba(20,16,26,0.35)' : 'rgba(170,160,170,0.3)'; c.fillRect(r() * W, r() * H, 2, 2); }
    // cracks
    c.strokeStyle = 'rgba(24,18,30,0.75)'; c.lineWidth = 2.5;
    for (let i = 0; i < 26; i++) {
      let x = r() * W, y = r() * H; c.beginPath(); c.moveTo(x, y);
      const a = r() * Math.PI * 2;
      for (let j = 0; j < 7; j++) { x += Math.cos(a + (r() - 0.5) * 1.6) * 30; y += Math.sin(a + (r() - 0.5) * 1.6) * 30; c.lineTo(x, y); }
      c.stroke();
    }
    // oil in the bays, under where the engines stand
    for (const b of bays) { c.fillStyle = 'rgba(22,16,26,0.45)'; c.beginPath(); c.ellipse(X(b.x - Math.sin(b.yaw) * 1.6), Z(b.z + Math.cos(b.yaw) * 1.6 - 1.0), 0.6 * pxm, 0.9 * pxm, -b.yaw, 0, Math.PI * 2); c.fill(); }
    // the bays' lines: radial off the wall, one between each bay and the next and one at each end of the row (the
    // viewing strip's sides among them, each drawn once: the strip had its own edge beside a bay's line, the two
    // crossing at its corner)
    c.strokeStyle = '#ece4cf'; c.lineWidth = 0.13 * pxm; c.lineCap = 'butt';
    const r0 = 0.35, r1 = r0 + L.bay.d;
    for (const x of bayLines()) { const a = inward(x, r0), b = inward(x, r1); c.beginPath(); c.moveTo(X(a.x), Z(a.z)); c.lineTo(X(b.x), Z(b.z)); c.stroke(); }
    // the viewing strip between two of them: closed across its back, hatched within
    {
      const xa = (L.strip[0] - 0.5) * L.bay.w, xb = (L.strip[1] + 0.5) * L.bay.w, ab = inward(xa, r1), bb = inward(xb, r1), steps = 24;
      c.beginPath(); c.moveTo(X(ab.x), Z(ab.z)); c.lineTo(X(bb.x), Z(bb.z)); c.stroke();
      c.save(); c.beginPath();
      for (let i = 0; i <= steps; i++) { const p = inward(xa + ((xb - xa) * i) / steps, r0); c.lineTo(X(p.x), Z(p.z)); }
      c.lineTo(X(bb.x), Z(bb.z)); c.lineTo(X(ab.x), Z(ab.z)); c.closePath(); c.clip();
      c.lineWidth = 0.11 * pxm; c.strokeStyle = 'rgba(236,228,207,0.85)';
      for (let x = -W; x < 2 * W; x += 0.9 * pxm) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + H * 0.8, H); c.stroke(); }
      c.restore();
    }
    // a scuffed stop bar where the road comes in
    c.fillStyle = 'rgba(236,228,207,0.7)'; c.fillRect(X(road - ROAD_HALF + 0.3), Z(-L.entry + 0.6), X(road + ROAD_HALF - 0.3) - X(road - ROAD_HALF + 0.3), 0.35 * pxm);
  });
}

/** The stone of the wall: courses of rough-cut stones, warm greys, in dark mortar (one block's face). */
function stoneTexture(): THREE.CanvasTexture {
  return canvas(640, 256, (c) => {
    c.fillStyle = '#3a3238'; c.fillRect(0, 0, 640, 256);
    let k = 0; const r = () => hash(++k, 3.7);
    const tones = ['#9c8e7f', '#ad9f8c', '#8a7d72', '#b8ab98', '#958676', '#a39280'];
    for (let y = 4; y < 256; ) {
      const h = 52 + 30 * r();
      for (let x = -40 * r(); x < 640; ) {
        const w = 70 + 90 * r();
        c.fillStyle = tones[Math.floor(r() * tones.length)]!;
        c.beginPath(); c.roundRect(x + 4, y, w - 8, Math.min(h, 256 - y) - 7, 10 + 8 * r()); c.fill();
        c.fillStyle = 'rgba(255,245,230,0.12)'; c.fillRect(x + 10, y + 4, w - 22, 6); // (a lit top edge)
        c.fillStyle = 'rgba(30,20,30,0.18)'; c.fillRect(x + 10, y + h - 18, w - 22, 8); // (its shaded foot)
        x += w;
      }
      y += h;
    }
  });
}

/** The VISTA POINT sign's face (the sign's own words: F.sign). */
function vistaFace(): THREE.CanvasTexture {
  return canvas(512, 192, (c) => {
    c.fillStyle = '#6b4a2a'; c.fillRect(0, 0, 512, 192); c.strokeStyle = '#f4f0e6'; c.lineWidth = 8; c.strokeRect(10, 10, 492, 172);
    c.fillStyle = '#f4f0e6'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `700 70px "${F.sign(700)}"`; c.fillText('VISTA POINT', 256, 96);
  });
}

/** The overlook, in the lot's frame: `datum` the road's frame at the lot's datum (PARKED_Z short of where the car
 *  stops), `lip` where the road ends; the verges reach `shoulder` m out. */
export function buildLookout(datum: { pos: THREE.Vector3; fwd: THREE.Vector3; right: THREE.Vector3 }, lipAhead: number, shoulder: number): THREE.Group {
  const L = LOT, root = new THREE.Group();
  const fwd = V(datum.fwd.x, 0, datum.fwd.z).normalize(), right = V(datum.right.x, 0, datum.right.z).normalize(), y0 = datum.pos.y;
  // (the frame: x to the left, as the car's — a mirrored frame would mirror the sign's words)
  root.matrixAutoUpdate = false;
  root.matrix.makeBasis(right.clone().negate(), V(0, 1, 0), fwd).setPosition(datum.pos.x, y0, datum.pos.z);
  // (the lot laid round the car's bay, BAY.x right of the road's centre)
  const g = new THREE.Group(); g.position.set(-BAY.x, 0, 0); root.add(g);
  /** A place on the lot: x right of the car's bay's centre line, y up off the road, z forward of the lot's datum. */
  const P = (x: number, y: number, z: number) => V(-x, y, z);
  /** The road's centre line, in the lot's x. */
  const road = -BAY.x;
  const put = (geo: THREE.BufferGeometry, m: THREE.Material, p: THREE.Vector3, yaw = 0, to: THREE.Object3D = g) => { const o = new THREE.Mesh(geo, m); o.position.copy(p); o.rotation.y = yaw; to.add(o); return o; };
  /** Facing out from the wall at x (radians about y, in the frame: 0 is forward). */
  const outAt = (x: number) => -Math.asin(x / L.wall.R);
  const steel = toon({ color: WORLD.post }), concrete = toon({ color: '#b9ae9f' }), dark = toon({ color: DARK }), trunk = toon({ color: '#2a1f22' });

  // the bays along the wall, the car's at the middle, but for the viewing strip's: where their wheel stops stand,
  // where cars park (k: from the car's)
  const bays: { k: number; x: number; z: number; yaw: number }[] = [];
  for (let k = -ROW; k <= ROW; k++) if (!inStrip(k)) { const x = k * L.bay.w; bays.push({ k, x, z: wallZ(x), yaw: outAt(x) }); }

  // the lot: its surface over the road's end, out to the wall (a grid bent to the wall's arc)
  {
    const zTop = L.wall.z + 0.35, nx = 44, nz = 24, geo = new THREE.PlaneGeometry(1, 1, nx, nz), p = geo.attributes.position!, uv = geo.attributes.uv!;
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) + 0.5, v = p.getY(i) + 0.5, x = -L.half + 2 * L.half * u, top = wallZ(x) + 0.35, z = -L.entry + v * (top + L.entry);
      p.setXYZ(i, -x, 0.03, z); uv.setXY(i, u, (z + L.entry) / (zTop + L.entry));
    }
    geo.computeVertexNormals();
    // (over the road's own end, drawn over it at any distance)
    const lot = new THREE.Mesh(geo, toon({ map: lotTexture(zTop, bays, road), polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 }));
    lot.name = 'lot'; g.add(lot);
    // its kerb round the sides and either side of where the road comes in; its gravel shoulder beyond
    const kerb = (x0: number, z0: number, x1: number, z1: number) => { const d = V(x1 - x0, 0, z1 - z0); put(new THREE.BoxGeometry(0.25, 0.15, d.length()), concrete, P((x0 + x1) / 2, 0.075, (z0 + z1) / 2), Math.atan2(-(x1 - x0), z1 - z0)); };
    for (const s of [-1, 1]) {
      kerb(s * L.half, -L.entry, s * L.half, wallZ(L.half) - 0.2);
      kerb(s * L.half, -L.entry, road + s * (ROAD_HALF + 0.6), -L.entry);
    }
    const gravel = new THREE.Mesh(new THREE.RingGeometry(L.half, L.half + 7, 40, 1, -Math.PI / 2 + 0.6, 2 * Math.PI - 1.2), scrubGround(toon({ color: '#7a6d62' }), '#2a3229', 0.3));
    gravel.rotation.x = -Math.PI / 2; gravel.position.set(0, -0.02, -1.5); gravel.scale.set(1, 0.62, 1); g.add(gravel);
  }

  // the wall: laid stone on its arc, capped, a pillar at each end; the rail's posts and its two pipes on them
  {
    const R = L.wall.R, a0 = Math.asin(L.half / R), n = Math.ceil((2 * a0 * R) / 1.55), seg = (2 * a0 * R) / n;
    const stone = toon({ map: stoneTexture() }), cap = toon({ color: '#c2b6a5' }), C = V(0, 0, L.wall.z - R);
    const on = (a: number, r = R) => V(-Math.sin(a) * r, 0, Math.cos(a) * r).add(C); // (a: radians round to the right)
    for (let i = 0; i < n; i++) {
      const a = -a0 + (i + 0.5) * (2 * a0) / n, p = on(a), yaw = -a;
      put(new THREE.BoxGeometry(seg + 0.01, L.wall.h, 0.5), stone, p.clone().setY(L.wall.h / 2), yaw);
      put(new THREE.BoxGeometry(seg + 0.02, 0.09, 0.64), cap, p.clone().setY(L.wall.h + 0.045), yaw);
    }
    for (const s of [-1, 1]) { const p = on(s * a0); put(new THREE.BoxGeometry(0.75, 0.95, 0.75), stone, p.clone().setY(0.475), -s * a0); put(new THREE.BoxGeometry(0.85, 0.1, 0.85), cap, p.clone().setY(1.0), -s * a0); }
    const posts = Math.round(n / 2), rail = toon({ color: '#4a4450' });
    for (let i = 0; i <= posts; i++) {
      const a = -a0 + 0.02 + ((2 * a0 - 0.04) * i) / posts, p = on(a);
      put(new THREE.CylinderGeometry(0.035, 0.035, 0.52, 8), rail, p.clone().setY(L.wall.h + 0.09 + 0.26));
      if (i < posts) {
        const q = on(-a0 + 0.02 + ((2 * a0 - 0.04) * (i + 1)) / posts), d = q.clone().sub(p);
        for (const y of [0.98, 1.2]) { const pipe = put(new THREE.CylinderGeometry(0.028, 0.028, d.length() + 0.04, 8), rail, p.clone().add(q).multiplyScalar(0.5).setY(y)); pipe.rotation.order = 'YXZ'; pipe.rotation.set(Math.PI / 2, Math.atan2(d.x, d.z), 0); }
      }
    }
  }

  // the wheel stops (the car's front tyres come up against its own), and cars parked dark in the bays, noses to the
  // wall, their front tyres at their stops
  {
    const at = (b: (typeof bays)[number], r: number) => { const p = inward(b.x, r); return P(p.x, 0, p.z); };
    for (const b of bays) put(new THREE.BoxGeometry(1.75, 0.13, 0.22), concrete, at(b, L.bay.stop).setY(0.065), b.yaw);
    for (const [k, colour] of L.parked) {
      const b = bays.find((q) => q.k === k)!, car = sedan({ color: colour, length: 4.7 });
      car.position.copy(at(b, L.bay.stop + 0.11 + (4.7 / 2 - 0.85) + 0.3)); car.rotation.y = b.yaw; g.add(car); // (kit.ts sedan: its wheels 0.85 m in from its ends, 0.3 m in radius)
    }
  }

  // at the wall: two coin telescopes looking out, a bench facing the view, a bin
  {
    const paint = toon({ color: '#2f5f52' }), lens = toon({ color: '#0e1216' }), chrome = toon({ color: WORLD.chrome });
    for (const x of [5.0, 11.3]) { // (in the viewing strip, either end of it)
      const v = new THREE.Group(); v.position.copy(P(x, 0, wallZ(x) - 0.95)); v.rotation.y = outAt(x); g.add(v);
      // its footing, a plinth standing well up off the lot (3 cm over it, the lot's paint — drawn pulled toward the lens —
      // came through its top from the end's low eye: the user, 2026-10-20)
      put(new THREE.CylinderGeometry(0.28, 0.32, 0.16, 16), concrete, V(0, 0.08, 0), 0, v);
      put(new THREE.CylinderGeometry(0.06, 0.085, 1.05, 12), paint, V(0, 0.58, 0), 0, v); // the pedestal
      put(new THREE.BoxGeometry(0.16, 0.2, 0.12), paint, V(0, 0.95, -0.08), 0, v); // the coin box
      put(new THREE.BoxGeometry(0.03, 0.03, 0.01), chrome, V(0, 0.99, -0.145), 0, v); // its slot
      put(new THREE.BoxGeometry(0.42, 0.08, 0.1), paint, V(0, 1.12, 0), 0, v); // the yoke
      const head = new THREE.Group(); head.position.set(0, 1.3, 0); head.rotation.x = 0.12; v.add(head);
      put(new THREE.BoxGeometry(0.36, 0.26, 0.4), paint, V(0, 0, 0), 0, head); // its body
      for (const s of [-1, 1]) {
        const tube = put(new THREE.CylinderGeometry(0.075, 0.07, 0.2, 14), paint, V(s * 0.1, 0.02, 0.27), 0, head); tube.rotation.x = Math.PI / 2; // the lenses' barrels, out to the view
        const glass = put(new THREE.CircleGeometry(0.06, 14), lens, V(s * 0.1, 0.02, 0.371), 0, head); glass.rotation.y = 0;
        const eye = put(new THREE.CylinderGeometry(0.035, 0.04, 0.09, 10), lens, V(s * 0.07, 0.04, -0.24), 0, head); eye.rotation.x = Math.PI / 2; // the eyepieces
      }
      put(new THREE.BoxGeometry(0.3, 0.05, 0.2), paint, V(0, 0.15, -0.12), 0, head); // its hood over the eyepieces
    }
    // the bench: slats on cast-iron ends, its back to the lot
    const wood = toon({ color: '#6a4632' }), iron = toon({ color: '#211c24' }), bx = 7.1, bench = new THREE.Group();
    bench.position.copy(P(bx, 0, wallZ(bx) - 1.25)); bench.rotation.y = outAt(bx); g.add(bench);
    for (const s of [-0.85, 0.85]) { put(new THREE.BoxGeometry(0.07, 0.44, 0.48), iron, V(s, 0.22, 0), 0, bench); put(new THREE.BoxGeometry(0.07, 0.5, 0.06), iron, V(s, 0.68, -0.24), 0, bench).rotation.x = -0.2; }
    for (let k = 0; k < 3; k++) put(new THREE.BoxGeometry(2, 0.04, 0.13), wood, V(0, 0.46, -0.16 + k * 0.15), 0, bench);
    for (let k = 0; k < 2; k++) put(new THREE.BoxGeometry(2, 0.11, 0.035), wood, V(0, 0.62 + k * 0.17, -0.25 - 0.035 * k), 0, bench).rotation.x = -0.2;
    // the bin: a steel can with its domed lid and its mouth
    const bin = toon({ color: '#33473c' }), bnx = 9.0, bp = P(bnx, 0, wallZ(bnx) - 1.0);
    put(new THREE.CylinderGeometry(0.3, 0.28, 0.9, 16), bin, bp.clone().setY(0.45));
    for (const y of [0.18, 0.72]) put(new THREE.TorusGeometry(0.3, 0.02, 6, 20), bin, bp.clone().setY(y)).rotation.x = Math.PI / 2;
    put(new THREE.SphereGeometry(0.31, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), bin, bp.clone().setY(0.9));
    put(new THREE.BoxGeometry(0.22, 0.1, 0.05), dark, bp.clone().setY(1.0).add(V(0, 0, -0.28)));
  }

  // the lamps: cobra-heads over the lot on the city's side, short lanterns on the sign's (taller there, they stood across
  // the letters from the road), each with its pool and a real light
  {
    const head = lampMaterial('#ffcf8a'), pole = toon({ color: '#3b3640' });
    const pool = (x: number, z: number, r: number) => { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 32), glowMaterial('#ffb35a', 0.62, true)); m.rotation.x = -Math.PI / 2; m.position.copy(P(x, 0.06, z)); g.add(m); };
    const light = (x: number, y: number, z: number, i: number, reach: number) => { const l = new THREE.PointLight('#ffb766', i, reach, 1.5); l.position.copy(P(x, y, z)); g.add(l); };
    for (const [x, z, toward] of [[16.5, -3, -1], [10.3, wallZ(10.3) - 0.8, -1]] as const) {
      const h = 7.4, arm = 1.8;
      put(new THREE.CylinderGeometry(0.07, 0.12, h, 10), pole, P(x, h / 2, z));
      put(new THREE.CylinderGeometry(0.2, 0.26, 0.5, 10), pole, P(x, 0.25, z)); // its base
      const a = put(new THREE.CylinderGeometry(0.045, 0.045, arm, 8), pole, P(x + toward * arm / 2, h - 0.05, z)); a.rotation.z = Math.PI / 2;
      put(new THREE.BoxGeometry(0.75, 0.16, 0.34), pole, P(x + toward * arm, h - 0.08, z)); // the head
      put(new THREE.BoxGeometry(0.6, 0.04, 0.26), head, P(x + toward * arm, h - 0.17, z)); // its lens
      pool(x + toward * arm, z, 6.5);
      light(x + toward * arm, h - 0.6, z, 26, 28); // (reaching the parked car: a warm side on it from the lamp beside it)
    }
    for (const [x, z] of [[-15.5, -5], [-20.5, 2.5]] as const) {
      put(new THREE.CylinderGeometry(0.05, 0.08, 3.1, 8), pole, P(x, 1.55, z));
      put(new THREE.BoxGeometry(0.34, 0.06, 0.34), pole, P(x, 3.12, z));
      put(new THREE.CylinderGeometry(0.12, 0.09, 0.32, 8), head, P(x, 3.32, z)); // the lantern's glass
      put(new THREE.ConeGeometry(0.22, 0.18, 8), pole, P(x, 3.57, z)); // its cap
      pool(x, z, 3.6);
      light(x, 3.0, z, 7, 9);
    }
  }

  // the trees: pines on the city's side, silhouettes against its lights; low oaks on the sign's side; chaparral
  {
    const crown = toon({ color: '#141c1e' }), oak = toon({ color: '#1b2420' });
    for (const [x, z, y, h] of [[17.5, 11, -2.2, 11.5], [24.5, 3, 0, 9.5], [28, -7, 0, 12.5], [21, -16, 0, 10.5], [33, 6, -1.5, 13]] as const) {
      const t = pine(h, 2.1 + 0.15 * h / 4, crown, trunk); t.position.copy(P(x, y, z)); t.rotation.y = x; g.add(t);
    }
    for (const [x, z, s] of [[-26, -9, 2.6], [-28.5, 3.5, 2.2], [-24.5, -18, 2.4]] as const) {
      for (let k = 0; k < 3; k++) { const b = put(new THREE.SphereGeometry(1, 10, 8), oak, P(x + (k - 1) * s * 0.55, s * 0.75 + 0.15 * k, z + 0.4 * k)); b.scale.set(s * 0.8, s * 0.55, s * 0.7); }
      put(new THREE.CylinderGeometry(0.12, 0.18, s * 0.7, 6), trunk, P(x, s * 0.35, z));
    }
    const scrubM: THREE.Matrix4[] = [], q = new THREE.Quaternion(), up = V(0, 1, 0);
    for (let i = 0; i < 140; i++) { // round the lot's edge, not ahead of the wall nor on the road in
      const a = hash(i, 11) * Math.PI * 2, r = 1 + 11 * hash(i, 12) ** 1.4, x = Math.cos(a) * (L.half + r), z = -1.5 + Math.sin(a) * (L.entry + r) * 0.9;
      if (z > wallZ(Math.min(Math.abs(x), L.half - 0.01)) - 1 || (Math.abs(x - road) < ROAD_HALF + 2 && z < 0)) continue;
      const sz = 0.45 + 0.9 * hash(i, 13);
      scrubM.push(new THREE.Matrix4().compose(P(x, -0.15 - 0.3 * hash(i, 14), z), q.setFromAxisAngle(up, hash(i, 15) * 6).clone(), V(sz * 1.3, sz * 0.75, sz)));
    }
    const drop = y0 + 0.4;
    for (let i = 0; i < 260; i++) { // down the slope, thinning (none near the lip: over the wall they stood up as black domes)
      const u = 0.2 + 0.78 * hash(i, 21) ** 0.8, x = (hash(i, 22) - 0.5) * FALL.across, sz = 0.6 + 1.3 * hash(i, 23), z = lipAhead - 0.5 + u * FALL.along, e = u * u * (3 - 2 * u);
      scrubM.push(new THREE.Matrix4().compose(P(x, -drop * e + 0.1 + slopeRoll(x, u), z), q.setFromAxisAngle(up, hash(i, 24) * 6).clone(), V(sz * 1.3, sz * 0.8, sz)));
    }
    const scrub = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), toon({ color: '#1b241f' }), scrubM.length);
    scrubM.forEach((m, i) => scrub.setMatrixAt(i, m));
    g.add(scrub);
  }

  // the VISTA POINT sign where the road comes into the lot
  {
    const x = road + ROAD_HALF + 1.6, z = -L.entry - 1.5;
    put(new THREE.BoxGeometry(0.1, 2.4, 0.1), steel, P(x, 1.2, z));
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.6), new THREE.MeshBasicMaterial({ map: vistaFace() }));
    face.position.copy(P(x, 2.2, z - 0.06)); face.rotation.y = Math.PI; g.add(face);
  }

  // the slope: from the wall down to the plain, rolling, in chaparral
  {
    const geo = new THREE.PlaneGeometry(FALL.across, FALL.along, 30, 44).rotateX(-Math.PI / 2), p = geo.attributes.position!, drop = y0 + 0.4;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), u = (p.getZ(i) + FALL.along / 2) / FALL.along, e = u * u * (3 - 2 * u);
      p.setXYZ(i, -x, -drop * e + slopeRoll(x, u) - 0.1, lipAhead - 0.5 + u * FALL.along);
    }
    geo.computeVertexNormals();
    // (the frame flips x: turn the faces back up)
    const idx = geo.index!; for (let i = 0; i < idx.count; i += 3) { const a = idx.getX(i + 1); idx.setX(i + 1, idx.getX(i + 2)); idx.setX(i + 2, a); }
    geo.computeVertexNormals();
    const slope = new THREE.Mesh(geo, scrubGround(toon({ color: '#6a5a52' }), '#222b23', 0.16)); slope.name = 'slope'; g.add(slope);
  }
  return root;
}

/** The hills the climb runs up (from `s0` to the road's end `s1`, the road's frame by `frameAt`): ground that rises
 *  from the plain to meet the road's verges (`verge(s)` m out, at least `shoulder`; falling `slope` m per m beyond),
 *  rolling, grown over with chaparral and its bushes — narrowed to a shoulder, the climb's verges would otherwise show
 *  the road standing on a bank over the coast's sea (and 40 m wide, they read as a band floating in the fog). Each 2 m
 *  of road holds up the ground square off it (fanning out a little round bends), none past the road's end: the canyon
 *  ahead of the overlook stays the lookout's own. Never over a road or its verges: under them it stays below (`under` m
 *  under a verge, held a little under the road itself). On the plain it lies at `floor`, under the world's ground
 *  (world.ts base, at -0.4: lying at its level, the two fought across the plain round the climb's foot — the flicker by
 *  the taco shop behind chorus 4's board, the user, 2026-10-16), rising out of it where the hills begin. (The scene
 *  shows it from the climb's first cut: from the coast it would stand in other sections' views.) */ 
export const CLIMB = { shoulder: 7.5, slope: 0.6, cell: 4, margin: 110, roll: 2.2, fan: 0.12, under: 2.5, floor: -0.55 };
export function buildClimbHills(frameAt: (s: number) => { pos: THREE.Vector3; fwd: THREE.Vector3 }, s0: number, s1: number, verge: (s: number) => number): THREE.Group {
  const C = CLIMB, pts: THREE.Vector3[] = [], fwds: THREE.Vector3[] = [], reach: number[] = [];
  for (let s = s0; s <= s1; s += 2) { const f = frameAt(s); pts.push(f.pos.clone()); fwds.push(V(f.fwd.x, 0, f.fwd.z).normalize()); reach.push(Math.max(C.shoulder, verge(s))); }
  const lo = pts.reduce((m, p) => m.min(p), V(Infinity, 0, Infinity)).subScalar(C.margin), hi = pts.reduce((m, p) => m.max(p), V(-Infinity, 0, -Infinity)).addScalar(C.margin);
  const nx = Math.ceil((hi.x - lo.x) / C.cell), nz = Math.ceil((hi.z - lo.z) / C.cell);
  /** The ground at (x, z), and how far it is from the edge of the nearest verge (m). */
  const ground = (x: number, z: number) => {
    let h = C.floor, cap = Infinity, edge = Infinity;
    pts.forEach((p, k) => {
      const dx = x - p.x, dz = z - p.z, f = fwds[k]!, along = dx * f.x + dz * f.z, across = Math.abs(dx * f.z - dz * f.x);
      if (Math.hypot(dx, dz) < C.shoulder) cap = Math.min(cap, p.y - 0.15);
      // (and well under its verges, all of their width, coming back up over a cell past their edge: capped only within
      // the shoulder, another leg's slope rose through the hairpin's 40 m verge, its coarse facets and their scrub
      // standing out of it in jagged dark shapes — the user, 2026-10-16: "it looks like a glitch"; held just under the
      // verge, the grid's 4 m facets still broke through it. Off the road, from the verge's edge down the skirt hides it)
      if (Math.abs(along) <= 1.05 + C.fan * across + C.cell && across < reach[k]! + C.cell) {
        const under = Math.min(1, Math.max(0, (reach[k]! + C.cell - across) / C.cell)) * Math.min(1, Math.max(0, (across - ROAD_HALF - 1) / 2));
        cap = Math.min(cap, p.y - 0.15 - C.under * under);
      }
      if (Math.abs(along) > 1.05 + C.fan * across || (k === pts.length - 1 && along > 0) || (k === 0 && along < 0)) return;
      edge = Math.min(edge, across - reach[k]!);
      h = Math.max(h, p.y - 0.15 - Math.max(0, across - reach[k]!) * C.slope);
    });
    // (rolling, away from the road and up off the plain)
    const roll = C.roll * (Math.sin(x * 0.045 + z * 0.02) * Math.sin(z * 0.05 - x * 0.013) + 0.5 * Math.sin(x * 0.11 + 2.0) * Math.sin(z * 0.09 + 1.0));
    const k = Math.min(1, Math.max(0, edge / 20)) * Math.min(1, Math.max(0, (h + 0.4) / 6));
    return { y: Math.min(cap, Math.max(C.floor, h + roll * k)), edge };
  };
  const geo = new THREE.PlaneGeometry(1, 1, nx, nz).rotateX(-Math.PI / 2), p = geo.attributes.position!;
  for (let i = 0; i < p.count; i++) {
    const x = lo.x + (p.getX(i) + 0.5) * (hi.x - lo.x), z = lo.z + (p.getZ(i) + 0.5) * (hi.z - lo.z);
    p.setXYZ(i, x, ground(x, z).y, z);
  }
  geo.computeVertexNormals();
  const g = new THREE.Group();
  g.add(new THREE.Mesh(geo, scrubGround(toon({ color: '#6b5a50' }), '#1f271f', 0.18)));
  // its bushes, where the ground stands up off the plain, clear of the verges
  const q = new THREE.Quaternion(), up = V(0, 1, 0), bushes: THREE.Matrix4[] = [];
  for (let i = 0; i < 2600; i++) {
    const x = lo.x + (hi.x - lo.x) * hash(i, 81), z = lo.z + (hi.z - lo.z) * hash(i, 82), { y, edge } = ground(x, z);
    if (y < 0.5 || edge < 2) continue;
    const sz = 0.5 + 0.9 * hash(i, 83);
    bushes.push(new THREE.Matrix4().compose(V(x, y + sz * 0.15, z), q.setFromAxisAngle(up, hash(i, 84) * 6).clone(), V(sz * 1.3, sz * 0.75, sz)));
  }
  const bm = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 9, 6), toon({ color: '#1b231e' }), bushes.length);
  bushes.forEach((m, i) => bm.setMatrixAt(i, m)); g.add(bm);
  return g;
}

/** The slope's roll (m), across it at x and down it at u (0 at the lip, 1 at the plain). */
function slopeRoll(x: number, u: number) { return (1.6 * Math.sin(x * 0.07 + u * 9) + 1.1 * Math.sin(x * 0.19 - u * 5)) * Math.sin(Math.PI * u); }

/** Mount Lee's dressing (world.ts buildCarrier 'hill', in the sign's frame: x along its letters, y up from their
 *  middle, z toward the overlook; `rise(x, z)` the hill's ground there): bushes along its ridge and over its slope
 *  (none in front of the letters), a floodlight in front of each letter's foot throwing a beam up onto it, the mast a
 *  lattice tower with red lights (sharing the beacon's material: it blinks them together). (An observatory on the hill's
 *  shoulder stood right behind the two of them in the end's frame.) */
export function dressHill(g: THREE.Group, c: { w: number; h: number; rows: string[] }, rise: (x: number, z: number) => number, mast: { x: number; z: number; h: number }, beacon: THREE.Material) {
  const q = new THREE.Quaternion(), up = V(0, 1, 0), bushes: THREE.Matrix4[] = [];
  for (let i = 0; i < 1500; i++) {
    const x = -420 + 560 * hash(i, 61), z = -150 + 190 * hash(i, 62), y = rise(x, z);
    if (y < -55 || (Math.abs(x) < c.w / 2 + 6 && z > -14)) continue;
    const s = 1.4 + 2.6 * hash(i, 63);
    bushes.push(new THREE.Matrix4().compose(V(x, y + s * 0.25, z), q.setFromAxisAngle(up, hash(i, 64) * 6).clone(), V(s * 1.4, s * 0.8, s)));
  }
  const bm = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 7, 5), toon({ color: '#161d19', fog: false }), bushes.length);
  bushes.forEach((m, i) => bm.setMatrixAt(i, m)); bm.name = 'bushes'; g.add(bm);
  // the floodlights: a lamp on the slope in front of each letter, its beam up the letter's face
  const n = c.rows[0]!.length, cell = c.w / n, lamp = lampMaterial('#fff2d6', 7, 0.3), housing = toon({ color: '#2a2630' });
  [...c.rows[0]!].forEach((ch, i) => {
    if (ch === ' ') return;
    const x = -c.w / 2 + cell * (i + 0.5), z = 7, y = rise(x, z) + 0.6;
    const h = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 0.9), housing); h.position.set(x, y, z); h.rotation.x = -0.6; g.add(h);
    const lens = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.6), lamp); lens.position.set(x, y + 0.38, z - 0.2); lens.rotation.x = -0.6; g.add(lens);
    // (the beam: an open cone from the lamp up to the letter's face, fading as it goes)
    const top = V(x, -c.h * 0.05, -0.3), from = V(x, y + 0.3, z - 0.3), len = top.distanceTo(from);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(cell * 0.42, 0.35, len, 16, 1, true), glowMaterial('#fff0d0', 0.1));
    beam.position.copy(top).add(from).multiplyScalar(0.5); beam.quaternion.setFromUnitVectors(up, top.clone().sub(from).normalize()); g.add(beam);
  });
  // the mast: a lattice tower on the ridge, red lights up it
  {
    const steel = toon({ color: '#2c2832' }), { x, z, h } = mast, y0 = rise(x, z), legs: THREE.Vector3[][] = [];
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, -1], [-1, 1]] as const) legs.push([V(x + sx * 1.6, y0, z + sz * 1.6), V(x + sx * 0.3, y0 + h, z + sz * 0.3)]);
    const bar = (a: THREE.Vector3, b: THREE.Vector3, r: number) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, a.distanceTo(b), 5), steel); m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(up, b.clone().sub(a).normalize()); g.add(m); };
    for (const [a, b] of legs) bar(a!, b!, 0.13);
    for (let k = 0; k < 8; k++) for (let j = 0; j < 4; j++) {
      const u0 = k / 8, u1 = (k + 1) / 8, A = legs[j]!, B = legs[(j + 1) % 4]!;
      bar(A[0]!.clone().lerp(A[1]!, u0), B[0]!.clone().lerp(B[1]!, u1), 0.06);
    }
    for (const u of [0.35, 0.7]) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.6, 10, 6), beacon); b.position.set(x, y0 + h * u, z); g.add(b); }
  }
}
