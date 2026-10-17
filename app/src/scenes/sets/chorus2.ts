// Chorus 2's props (drive/sets/chorus2.ts): the freeway's left side — the median barrier, the Metro's tracks at grade
// with their catenary, the train (three Metro light-rail cars, metroCar) racing past, the sound wall (the drive's concrete
// blocks; his posters on it are carriers) — the big freeway sign's legs and beam, and the SLAUSON exit sign. Browser
// only (canvas).
import * as THREE from 'three';
import type { Drive } from '../../drive/drive';
import { type Chorus2Plan, GANTRY, MEDIAN, TRAIN, FREEWAY_EDGE, LANES, WALL, laneEdge, trafficS } from '../../drive/sets/chorus2';
import { ROAD_HALF, type Route } from '../../drive/route';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { WORLD, toon } from '../../look/toon';
import { GLOW, lampMaterial } from '../../look/night';
import { F, font } from '../../engine/type';
import { fuse, part, sedan, tbox, tcyl } from './kit';

const UP = new THREE.Vector3(0, 1, 0);
function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d')!);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
const box = (g: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material) => {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); return b;
};

/** A run along the road, swept as one piece from s0 to s1 (sampled every `step` m): its middle `lateral` right of the
 *  road's centre (or that at s), `w` across, from `y` to `y + h` over the road's surface, following its bends and its
 *  grade; its two sides, its top and its ends (uv in metres: along, round). (Laid as boxes end to end, each tangent to
 *  the road at its middle, the runs opened wedges on the outside of every bend and over every crest — the user,
 *  2026-10-16, of the sound wall from overhead: "the wall pieces … aren't fully connected, so there's gaps".) */
function sweep(route: Route, s0: number, s1: number, lateral: number | ((s: number) => number), w: number, h: number, y: number, step = 2): THREE.BufferGeometry {
  const n = Math.max(2, Math.ceil((s1 - s0) / step) + 1), lat = typeof lateral === 'number' ? () => lateral : lateral;
  // the section's corners (across, up), round from the inside foot; each face its own strip of vertices (sharp edges
  // between them, smooth along the run)
  const corners: [number, number][] = [[-w / 2, y], [-w / 2, y + h], [w / 2, y + h], [w / 2, y]];
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const at = (f: ReturnType<Route['frameAt']>, l: number, [a, b]: [number, number]) => f.pos.clone().addScaledVector(f.right, l + a).addScaledVector(f.up, b);
  const frames = Array.from({ length: n }, (_, i) => { const s = s0 + ((s1 - s0) * i) / (n - 1); return { s, f: route.frameAt(s) }; });
  let round = 0;
  for (let k = 0; k < 3; k++) {
    const A = corners[k]!, B = corners[k + 1]!, o = pos.length / 3, len = Math.hypot(B[0] - A[0], B[1] - A[1]);
    for (const { s, f } of frames) {
      const l = lat(s);
      for (const [c, v] of [[A, round], [B, round + len]] as const) { const p = at(f, l, c); pos.push(p.x, p.y, p.z); uv.push(s, v); }
    }
    // (wound to face out: from the inside foot up, over and down, along the road)
    for (let i = 1; i < n; i++) { const a = o + (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    round += len;
  }
  // its ends
  for (const [{ s, f }, dir] of [[frames[0]!, -1], [frames[n - 1]!, 1]] as const) {
    const o = pos.length / 3, l = lat(s);
    for (const c of corners) { const p = at(f, l, c); pos.push(p.x, p.y, p.z); uv.push(c[0], c[1]); }
    idx.push(...(dir > 0 ? [o, o + 1, o + 2, o, o + 2, o + 3] : [o, o + 2, o + 1, o, o + 3, o + 2]));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  // (the ends' four corners are shared by their two triangles only: their normals come out flat)
  g.computeVertexNormals();
  return g;
}

/** One of the train's cars: an LA Metro light-rail vehicle (a high-floor, double-ended, articulated car, after the
 *  Kinkisharyo P3010s that run the freeway-median lines), in its own frame (x across, y up from the rails' foot, z
 *  forward along the track), TRAIN.car long and 2·TRAIN.half wide. Its shell lofted from its side profile (raked cab
 *  faces at both ends, the roof's shoulders rounded); silver, a charcoal skirt, the gold stripe; windows between
 *  pillars, two double doors a section, the articulation's bellows; three trucks with their wheels on the rails; on
 *  the roof the air-conditioning units and a single-arm pantograph raised to the catenary's wire (5.6 m); couplers,
 *  anticlimbers and lamp housings at both ends (coupled cab to cab, as Metro runs them). Its static parts one fused
 *  mesh (kit.ts tinted parts); `tail` / `lead` light its lamps and destination sign. (It was a silver box with a
 *  stripe and a dark band: the user, 2026-10-17, asked for a model fidelity pass.) */
function metroCar(tail: boolean, lead: boolean): THREE.Group {
  const c = new THREE.Group(), L2 = TRAIN.car / 2, X = TRAIN.half - 0.05, B = 0.16;
  const SILVER = '#cfcfca', DOOR = '#b8b8b3', SKIRT = '#4b4751', GOLD = '#cf9a34', GLASS = '#1f2230', DARK = '#2d2a32', TRUCK = '#3b3840', ROOF = '#a6a6a2', PAN = '#4a4850', INSUL = '#8a5a44';
  // the shell: its side profile (along, up; anticlockwise), the raked cab faces at both ends, drawn in by the bevel's
  // reach so the bevel rounds it back out to it; extruded across
  const FACE = { foot: 1.95, top: 3.4, back: 0.55 }, ROOF_Y = 3.72;
  const half: [number, number][] = [[L2, 0.85], [L2, FACE.foot], [L2 - FACE.back, FACE.top], [L2 - 0.8, 3.64], [L2 - 1.1, ROOF_Y]];
  const outline: [number, number][] = [...half, ...[...half].reverse().map(([u, v]) => [-u, v] as [number, number])];
  const n = outline.length, inner = outline.map((p, i) => {
    const a = outline[(i + n - 1) % n]!, b = outline[(i + 1) % n]!;
    const e = (q: [number, number], r: [number, number]) => { const l = Math.hypot(r[0] - q[0], r[1] - q[1]); return [-(r[1] - q[1]) / l, (r[0] - q[0]) / l]; };
    const n1 = e(a, p), n2 = e(p, b), m = [n1[0]! + n2[0]!, n1[1]! + n2[1]!], ml = Math.hypot(m[0]!, m[1]!), d = B / ((m[0]! * n1[0]! + m[1]! * n1[1]!) / ml);
    return new THREE.Vector2(p[0] + (m[0]! / ml) * d, p[1] + (m[1]! / ml) * d);
  });
  const W = 2 * X - 2 * B, shell = new THREE.ExtrudeGeometry(new THREE.Shape(inner), { depth: W, bevelEnabled: true, bevelThickness: B, bevelSize: B, bevelSegments: 2, curveSegments: 1 });
  shell.rotateY(-Math.PI / 2); shell.translate(W / 2, 0, 0);
  part(c, shell, SILVER);
  /** A box rotated about x by `rx`. */
  const rbox = (w: number, h: number, d: number, x: number, y: number, z: number, rx: number, color: string) => { const m = tbox(c, w, h, d, x, y, z, color); m.rotation.x = rx; return m; };
  /** A rod from (y0, z0) to (y1, z1) at x, `t` thick. */
  const rod = (x: number, y0: number, z0: number, y1: number, z1: number, t: number, color: string) =>
    rbox(t, t, Math.hypot(y1 - y0, z1 - z0), x, (y0 + y1) / 2, (z0 + z1) / 2, Math.atan2(-(y1 - y0), z1 - z0), color);

  // the sides: each section (forward and back of the articulation) its windows between pillars, two double doors
  const DOORS = [3.3, 8.5], BAND = { y0: 1.98, y1: 2.92 }, STRIPE = { y0: 1.3, y1: 1.52 };
  for (const s of [-1, 1]) {
    const at = (d: number) => s * (X + d - 0.03); // (a 6 cm skin whose face is d proud of the side)
    tbox(c, 0.06, 0.28, 2 * L2 - 0.3, at(0.04), 0.99, 0, SKIRT);
    tbox(c, 0.06, STRIPE.y1 - STRIPE.y0, 2 * L2 - 0.3, at(0.04), (STRIPE.y0 + STRIPE.y1) / 2, 0, GOLD);
    for (const sec of [-1, 1]) {
      const z0 = 0.45, z1 = L2 - 0.62, mid = (z0 + z1) / 2;
      tbox(c, 0.06, BAND.y1 - BAND.y0, z1 - z0, at(0.04), (BAND.y0 + BAND.y1) / 2, sec * mid, GLASS);
      // pillars every 1.45 m, clear of the doors
      for (let z = z0 + 0.05; z <= z1 - 0.02; z += 1.45) if (DOORS.every((d) => Math.abs(z - d) > 0.85)) tbox(c, 0.06, BAND.y1 - BAND.y0 + 0.04, 0.11, at(0.06), (BAND.y0 + BAND.y1) / 2, sec * z, SILVER);
      for (const d of DOORS) {
        const z = sec * d;
        tbox(c, 0.06, 2.12, 1.38, at(0.07), 2.06, z, DOOR);
        for (const o of [-0.34, 0.34]) tbox(c, 0.06, 1.0, 0.44, at(0.1), 2.42, z + o, GLASS);
        tbox(c, 0.06, STRIPE.y1 - STRIPE.y0, 1.3, at(0.1), (STRIPE.y0 + STRIPE.y1) / 2, z, GOLD);
        tbox(c, 0.06, 2.12, 0.04, at(0.12), 2.06, z, DARK); // (the leaves' seam)
        tbox(c, 0.06, 0.06, 1.5, at(0.08), 0.97, z, DARK); // (the step's edge)
      }
    }
  }
  // the articulation: the bellows ring between the sections, ribbed
  tbox(c, 2 * X + 0.14, 2.75, 0.66, 0, 2.3, 0, DARK);
  for (const z of [-0.22, 0, 0.22]) tbox(c, 2 * X + 0.2, 2.6, 0.07, 0, 2.3, z, '#3d3a44');
  tbox(c, 2 * X - 0.3, 0.12, 0.66, 0, ROOF_Y + 0.02, 0, DARK);

  // the roof: an air-conditioning unit on each section (its fans' grilles on top), an equipment box, the pantograph
  for (const z of [-(L2 - 3.0), L2 - 3.0]) {
    tbox(c, 1.6, 0.24, 2.5, 0, ROOF_Y + 0.1, z, ROOF);
    for (const o of [-0.6, 0.6]) tcyl(c, 0.36, 0.04, 0, ROOF_Y + 0.23, z + o, DARK, 16);
    for (const x of [-0.7, 0.7]) tbox(c, 0.04, 0.16, 2.3, x, ROOF_Y + 0.08, z, DARK); // (its side louvres)
  }
  tbox(c, 1.3, 0.26, 2.0, 0, ROOF_Y + 0.11, -4.6, ROOF);
  // the high-voltage conduits from the pantograph back along the roof, over the bellows, to the equipment box; the
  // roof's walkway strips either side
  for (const x of [-0.3, 0.3]) tbox(c, 0.09, 0.07, 9.0, x, ROOF_Y + 0.035, 0, DARK);
  for (const x of [-1.05, 1.05]) for (const z of [-5.2, 5.2]) tbox(c, 0.28, 0.03, 5.6, x, ROOF_Y + 0.015, z, '#9c9c97');
  for (const x of [-0.66, 0.66]) tbox(c, 0.04, 0.18, 1.8, x, ROOF_Y + 0.1, -4.6, DARK);
  {
    const pz = 4.6, base = ROOF_Y + 0.27, head = 5.565;
    for (const x of [-0.6, 0.6]) for (const dz of [-0.6, 0.6]) tcyl(c, 0.07, 0.2, x, ROOF_Y + 0.1, pz + dz, INSUL, 8);
    tbox(c, 1.4, 0.08, 1.5, 0, base - 0.04, pz, PAN);
    // its lower arm from the hinge back to the knee, the upper arm's two tubes on up to the head; a damper
    const hinge = [base + 0.05, pz + 0.6] as const, knee = [base + 0.95, pz - 0.95] as const, top = [head - 0.05, pz + 0.1] as const;
    rod(0, hinge[0], hinge[1], knee[0], knee[1], 0.09, PAN);
    for (const x of [-0.18, 0.18]) rod(x, knee[0], knee[1], top[0], top[1], 0.045, PAN);
    rod(0.12, base + 0.02, pz + 0.2, base + 0.55, pz - 0.5, 0.04, PAN);
    // the head: a contact strip across the wire, its horns curling down at each end
    tbox(c, 1.3, 0.05, 0.22, 0, head, pz + 0.1, PAN);
    tbox(c, 0.9, 0.07, 0.07, 0, head - 0.06, pz + 0.1, PAN);
    for (const sx of [-1, 1]) { const m = tbox(c, 0.36, 0.05, 0.12, sx * 0.8, head - 0.08, pz + 0.1, PAN); m.rotation.z = sx * -0.5; }
  }

  // underneath: the frame, its equipment boxes, three trucks (end trucks under the cabs, one under the articulation)
  for (const [z, l] of [[-5.2, 6.6], [5.2, 6.6]] as const) {
    tbox(c, 2 * X - 0.5, 0.22, l, 0, 0.78, z, DARK);
    for (const s of [-1, 1]) for (const [dz, bl, bh] of [[-2.0, 1.8, 0.3], [0.4, 2.2, 0.36], [2.5, 1.2, 0.26]] as const) tbox(c, 0.5, bh, bl, s * (X - 0.45), 0.86 - bh / 2, z + dz * Math.sign(z), s > 0 ? '#3a3741' : TRUCK);
  }
  for (const zt of [-(L2 - 2.3), 0, L2 - 2.3]) {
    tbox(c, 0.9, 0.3, 0.7, 0, 0.62, zt, DARK); // (the motor and gearbox)
    tbox(c, 2.1, 0.12, 0.5, 0, 0.8, zt, TRUCK); // (the bolster)
    for (const s of [-1, 1]) {
      tbox(c, 0.14, 0.24, 2.6, s * 1.0, 0.64, zt, TRUCK);
      for (const dz of [-0.95, 0.95]) {
        const w = tcyl(c, 0.36, 0.1, s * 0.78, 0.66, zt + dz, '#29272d', 18); w.rotation.z = Math.PI / 2;
        tbox(c, 0.22, 0.22, 0.32, s * 1.04, 0.62, zt + dz, '#57545c'); // (the axle box)
        tcyl(c, 0.08, 0.12, s * 1.0, 0.8, zt + dz * 0.6, '#57545c', 8); // (a spring)
      }
    }
  }

  // the ends: both cabs' faces (windscreen, lamp housings, the stripe carried round, anticlimber, coupler)
  const rake = Math.atan2(FACE.back, FACE.top - FACE.foot), len = Math.hypot(FACE.back, FACE.top - FACE.foot);
  for (const e of [-1, 1]) {
    // (on the raked face: the point at height v, `out` along its outward normal; up, along)
    const onFace = (v: number, out: number) => { const f = (v - FACE.foot) / (FACE.top - FACE.foot); return [v + out * Math.sin(rake), e * (L2 - FACE.back * f + out * Math.cos(rake))] as const; };
    const [gy, gz] = onFace(FACE.foot + 0.78, 0.03);
    rbox(2 * X - 0.42, len - 0.32, 0.06, 0, gy, gz, e * -rake, GLASS);
    const [sy, sz] = onFace(FACE.top - 0.2, 0.06);
    rbox(1.5, 0.24, 0.04, 0, sy, sz, e * -rake, '#121116'); // (the destination sign's black)
    tbox(c, 2 * X - 0.16, STRIPE.y1 - STRIPE.y0, 0.06, 0, (STRIPE.y0 + STRIPE.y1) / 2, e * (L2 + 0.01), GOLD);
    tbox(c, 2 * X - 0.16, 0.28, 0.06, 0, 0.99, e * (L2 + 0.01), SKIRT);
    for (const x of [-0.92, 0.92]) tbox(c, 0.46, 0.28, 0.06, x, 1.76, e * (L2 + 0.03), DARK);
    tbox(c, 2 * X - 0.3, 0.22, 0.16, 0, 1.0, e * (L2 + 0.1), DARK); // (the anticlimber)
    tbox(c, 0.22, 0.18, 0.3, 0, 0.74, e * (L2 + 0.15), DARK);
    tbox(c, 0.34, 0.3, 0.1, 0, 0.74, e * (L2 + 0.25), '#57545c'); // (the coupler's head: met by the next car's)
  }
  fuse(c);

  // the lamps (real light: unlit): the lead's headlights and lit destination sign, the tail's red lamps and its sign
  const lamp = (color: string, glow: number, day: number, w: number, h: number, x: number, y: number, z: number, ry: number, rx = 0) => {
    const l = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lampMaterial(color, glow, day)); l.position.set(x, y, z); l.rotation.set(rx, ry, 0, 'YXZ'); c.add(l);
  };
  for (const [on, e, color, glow] of [[lead, 1, '#fff2d0', GLOW.head], [tail, -1, '#ff2a24', GLOW.tail]] as const) {
    if (!on) continue;
    for (const x of [-0.92, 0.92]) lamp(color, glow, 1.1, 0.32, 0.18, x, 1.76, e * (L2 + 0.09), e > 0 ? 0 : Math.PI);
    const f = (FACE.top - 0.2 - FACE.foot) / (FACE.top - FACE.foot), out = 0.1;
    lamp('#ffb52e', GLOW.neon, 1.0, 1.36, 0.14, 0, FACE.top - 0.2 + out * Math.sin(rake), e * (L2 - FACE.back * f + out * Math.cos(rake)), e > 0 ? 0 : Math.PI, -rake);
  }
  return c;
}

export function buildChorus2(drive: Drive): { group: THREE.Group; update(t: number): void } | null {
  const plan = drive.plans.chorus2 as Chorus2Plan | undefined;
  if (!plan) return null;
  const { route } = drive, root = new THREE.Group();
  // (the freeway's furniture is put away as its stretch ends, before verse 2's first cut: its sound wall and catenary
  // stood in the chicken spot's frames)
  const freewayEnd = drive.stretches.find((st) => st.id === 'chorus2')?.end ?? Infinity;
  /** The road's frame at s (x to its left, y its up, z forward along it, up or down its grade), `lateral` right of its
   *  centre, on its surface. (Level pieces, on the freeway's rise, stood in steps — "train track step things", the dark
   *  lanes sinking into the ground: the user, 2026-10-14.) */
  const frameAt = (s: number, lateral: number, m = new THREE.Matrix4()) => {
    const f = route.frameAt(s);
    return m.makeBasis(f.right.clone().negate(), f.up.clone(), f.fwd.clone()).setPosition(f.pos.clone().addScaledVector(f.right, lateral));
  };
  const onRoad = (s: number, lateral: number) => { const g = new THREE.Group(); g.matrixAutoUpdate = false; frameAt(s, lateral, g.matrix); root.add(g); return g; };
  const concrete = toon({ color: '#b9ada0' }), steel = toon({ color: '#6d6a72' });

  // the runs along the road, each swept in one piece (sweep): the sound wall (the guard's blocks, drive/sets/chorus2.ts:
  // as far as they reach), the median barrier, the tracks' ballast, their rails and the catenary's wire over them; and
  // on the right, the barrier past the two more lanes, following the road's edge as the lanes merge in and out
  const piece = new THREE.Matrix4(), runs = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const run = (lateral: number | ((s: number) => number), w: number, h: number, y: number, mat: THREE.Material, s0 = plan.s0, s1 = plan.s1) =>
    (runs.get(mat) ?? runs.set(mat, []).get(mat)!).push(sweep(route, s0, s1, lateral, w, h, y));
  run(WALL.face - WALL.d / 2, WALL.d, WALL.h, 0, concrete, plan.s0, plan.s0 + Math.ceil((plan.s1 - plan.s0) / WALL.seg) * WALL.seg);
  run(MEDIAN.barrier, 0.6, MEDIAN.barrierH, 0, concrete);
  run((s) => laneEdge(plan.lanes, s) + LANES.barrier / 2 + 0.2, LANES.barrier, 1.0, 0, concrete);
  const ballast = toon({ color: '#7b6f68' });
  run(MEDIAN.tracks, 4.2, 0.18, 0, ballast);
  for (const x of [-0.75, 0.75]) run(MEDIAN.tracks + x, 0.08, 0.12, 0.18, steel);
  run(MEDIAN.tracks, 0.04, 0.04, 5.6, steel);
  for (const [mat, geos] of runs) root.add(new THREE.Mesh(mergeGeometries(geos)!, mat));
  // the right side: the two more lanes are the road's own ribbon (world.ts, plan.lanes); here the dashed lines along
  // them
  for (const lateral of [ROAD_HALF, ROAD_HALF + LANES.w]) {
    const dashes = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), toon({ color: WORLD.dash }), Math.ceil((plan.s1 - plan.s0 - 2 * plan.lanes.merge) / 9));
    for (let k = 0; k < dashes.count; k++) { frameAt(plan.s0 + plan.lanes.merge + k * 9 + 4.5, lateral, piece); dashes.setMatrixAt(k, piece.multiply(new THREE.Matrix4().makeTranslation(0, 0.025, 0)).multiply(new THREE.Matrix4().makeScale(0.15, 0.02, 3))); }
    root.add(dashes);
  }
  // the catenary: a pole every 40 m between the tracks and the wall (its wire's a run, above); through the posters'
  // run the poles keep their rhythm but stand at the boards' gaps, never over his face or the words
  const span = [plan.posters[0]! - 15, plan.posters[plan.posters.length - 1]! + 15];
  const poleAt = (s: number) => {
    const p = onRoad(s, MEDIAN.tracks - 2.6);
    box(p, 0.22, 6, 0.22, 0, 3, 0, steel);
    box(p, 2.8, 0.1, 0.1, -1.4, 5.8, 0, steel); // (its arm out over the tracks: to the road's right, the frame's -x)
  };
  for (let s = plan.s0 + 20; s < plan.s1; s += 40) if (s <= span[0]! || s >= span[1]!) poleAt(s);
  for (let i = 1; i < plan.posters.length; i += 2) poleAt((plan.posters[i - 1]! + plan.posters[i]!) / 2);

  // the train: three Metro light-rail cars (metroCar), the last's tail lamps red, the first's headlights lit
  const cars: THREE.Group[] = [];
  for (let k = 0; k < TRAIN.cars; k++) {
    const c = metroCar(k === 0, k === TRAIN.cars - 1); c.matrixAutoUpdate = false;
    cars.push(c); root.add(c);
  }

  // the big freeway sign: its legs either side, its beam over the tops of its panels, a dark backing behind each
  {
    const top = Math.max(...plan.panels.map((p) => p.center.y + p.h / 2)) - route.frameAt(plan.gantryS).pos.y;
    const g = onRoad(plan.gantryS, 0);
    for (const lat of GANTRY.legs) box(g, 0.45, top + 0.6, 0.45, -lat, (top + 0.6) / 2, 0.4, steel); // (the frame's x is the road's left)
    box(g, GANTRY.legs[1] - GANTRY.legs[0] + 0.4, 0.5, 0.5, -(GANTRY.legs[0] + GANTRY.legs[1]) / 2, top + 0.35, 0.4, steel);
    for (const p of plan.panels) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(p.w + 0.2, p.h + 0.2, 0.12), toon({ color: '#154d31' }));
      b.position.copy(p.center).addScaledVector(p.normal, -0.08); b.lookAt(b.position.clone().add(p.normal)); root.add(b);
    }
  }

  // slower traffic in the outside lane, overtaken (the cheapest speed there is); the two beside him through the
  // dropping line surging away (drive/sets/chorus2.ts SURGE)
  const traffic = plan.traffic.map((T, i) => {
    const g = new THREE.Group(); g.matrixAutoUpdate = false;
    g.add(sedan({ color: ['#e8e2d2', '#5a6a7d', '#b0532e'][i % 3]! }));
    root.add(g);
    return { T, g };
  });

  // the SLAUSON exit sign on the right shoulder, on two posts (on a cantilever over their lane it crossed the planes'
  // take: the user, 2026-10-14)
  {
    const g = onRoad(plan.exitS, FREEWAY_EDGE + 2.0), tex = canvasTex(1024, 512, (c) => {
      c.fillStyle = '#1f6b44'; c.fillRect(0, 0, 1024, 512); c.strokeStyle = '#f4f4f0'; c.lineWidth = 12; c.strokeRect(18, 18, 988, 476);
      c.fillStyle = '#f4f4f0'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = font(F.sign(600), 140); c.fillText('Slauson Av', 512, 190);
      c.font = font(F.sign(500), 76); c.fillText('EXIT  1/4 MILE', 512, 360);
      c.fillStyle = '#ffd65a'; c.fillRect(760, 30, 230, 80); c.fillStyle = '#1f6b44'; c.font = font(F.sign(700), 50); c.fillText('EXIT 12', 875, 72);
    });
    for (const x of [-0.4, -3.6]) box(g, 0.2, 4.0, 0.2, x, 2.0, 0, steel); // (out to the right: the frame's -x)
    box(g, 4.1, 2.1, 0.08, -2.0, 3.0, -0.05, toon({ color: '#154d31' }));
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 2.0), new THREE.MeshBasicMaterial({ map: tex }));
    sign.position.set(-2.0, 3.0, -0.12); sign.rotation.y = Math.PI; g.add(sign);
  }

  const T = plan.train;
  return {
    group: root,
    update(t) {
      root.visible = t < freewayEnd && drive.motion.distanceAt(t) > plan.s0 - 400;
      const there = t >= T.from && t < T.until;
      for (const [k, c] of cars.entries()) {
        c.visible = there;
        if (there) frameAt(T.tailS + TRAIN.v * (t - T.at) + (k + 0.5) * TRAIN.car + k * TRAIN.gap, MEDIAN.tracks, c.matrix);
      }
      for (const { T: tr, g } of traffic) {
        const s = trafficS(tr, t);
        g.visible = s > plan.s0 + 10 && s < plan.s1 - 5;
        if (g.visible) frameAt(s, tr.lat, g.matrix);
      }
    },
  };
}
