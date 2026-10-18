// Chorus 4's props (drive/sets/chorus4.ts): his biggest campaign — the giant painted board on the uphill side (its
// words are the carriers'; his portrait and the board's paint are here), its posts and catwalk; the town behind it
// (the user, 2026-10-16: "the scene behind the billboard is looking pretty unfinished") — the board stands in a lot
// with cars in its bays and its lights, and past it the Strip's back street runs on to the foot of the hills, its
// street fronts lit, a second row standing over them, lamps, power poles, people on the sidewalk, a diner's pole sign;
// and the shift indicator's D flaring on the word "drive" (the indicator is the car's: look/dash.ts). Browser only
// (canvas).
import * as THREE from 'three';
import type { Drive } from '../../drive/drive';
import { BOARD, type Chorus4Plan } from '../../drive/sets/chorus4';
import { WORLD, toon } from '../../look/toon';
import { drawAd } from '../../look/adart';
import { UP, box, canvasTex, cyl, onPanel, pic, plane, roadFrame, sedan, signFace, stride, walker } from './kit';
import { PALM, palmVariant } from '../../look/palms';
import { GLOW, glowMaterial, lampMaterial } from '../../look/night';
import { facadeMeshes, facades } from '../../look/facades';
import { shopsNear } from '../../drive/shops';
import type { Block } from '../../drive/blocks';
import { hash } from '../../engine/util';
import { F } from '../../engine/type';

/** The town behind the board (m, off the road's centre, right; along it from the board's s): verse 3's back street
 *  carried on (its lot from `lot[0]` to `lot[1]`, its near sidewalk to `street[0]`, the street to `street[1]`, its far
 *  sidewalk to the fronts at `front`, each a touch over the Strip's own where they meet), from `from` to the building
 *  closing its end at `to`; the lot's bays as far as `lotTo`; the second row's fronts at `back`. */
const TOWN = { from: -9.5, to: 80, lotTo: 30, lot: [7, 32], street: [34.5, 41.5], front: 44, back: 68, kerb: 0.16 };

export function buildChorus4(drive: Drive): { group: THREE.Group; update(t: number, car: THREE.Object3D): void } | null {
  const plan = drive.plans.chorus4 as Chorus4Plan | undefined;
  if (!plan) return null;
  const root = new THREE.Group(), B = plan.board, dark = toon({ color: WORLD.post });

  // the board: his ad painted across it (the words' column is the carriers'), a frame, posts down the slope, a catwalk
  {
    const g = onPanel(B);
    const art = canvasTex(2048, Math.round((2048 * B.h) / B.w), (c) => drawAd(c, 'him', c.canvas.width, c.canvas.height, BOARD.text));
    plane(g, B.w, B.h, 0, 0, -0.03, pic(art));
    box(g, B.w + 0.8, B.h + 0.8, 0.5, 0, 0, -0.35, toon({ color: '#3a3043' }));
    const drop = B.center.y - drive.route.frameAt(plan.boardBlock.s).pos.y;
    for (const x of [-B.w / 3, 0, B.w / 3]) box(g, 0.5, drop + 2, 0.5, x, -(drop + 2) / 2 + B.h / 4 - 2, -0.7, dark);
    box(g, B.w * 0.9, 0.18, 1.1, 0, -B.h / 2 - 0.35, 0.35, dark); // the painters' catwalk
    for (let x = -B.w * 0.45; x <= B.w * 0.45; x += 3) box(g, 0.05, 1.0, 0.05, x, -B.h / 2 + 0.15, 0.85, dark); // its rail's posts
    box(g, B.w * 0.9, 0.05, 0.05, 0, -B.h / 2 + 0.65, 0.85, dark);
    // the floodlights: gooseneck lamps along the top edge lighting the board (it's night up here), their hoods and
    // bulbs, and the light's wash down the face
    const bulb = lampMaterial('#fff0c8', GLOW.lamp * 1.2, 0.5);
    for (let i = 0; i < 6; i++) {
      const x = -B.w / 2 + (B.w * (i + 0.5)) / 6;
      box(g, 0.08, 0.08, 2.2, x, B.h / 2 + 0.9, 0.9, dark); box(g, 0.08, 1.0, 0.08, x, B.h / 2 + 0.4, -0.2, dark); // the neck
      box(g, 0.7, 0.3, 0.5, x, B.h / 2 + 0.75, 1.9, dark); // the hood
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), bulb); b.position.set(x, B.h / 2 + 0.55, 1.9); g.add(b);
    }
    const wash = new THREE.Mesh(new THREE.PlaneGeometry(B.w, B.h), glowMaterial('#fff0c8', 0.5));
    wash.position.z = 0.04; wash.rotation.z = Math.PI; g.add(wash); // (the glow fades along v from its top edge: the plane turned, its top at the lamps)
    // cross bracing between the posts
    for (const x of [-B.w / 6, B.w / 6]) { const br = box(g, 0.2, Math.hypot(B.w / 3, 6), 0.2, x, -B.h / 2 - 4, -0.7, dark); br.rotation.z = Math.atan2(B.w / 3, 6); }
    root.add(g);
  }

  root.add(town(drive, plan));

  return {
    group: root,
    update(t, car) {
      // the D, flaring on "drive" and settling to lit for the rest of the night
      const d = car.getObjectByName('shiftD') as THREE.Mesh | undefined;
      if (!d) return;
      const tau = t - plan.driveAt;
      const base = tau >= 0 ? 2.2 : 0.35;
      const punch = tau >= 0 && tau < 0.8 ? 1.6 * Math.exp(-tau * 5) : 0;
      (d.material as THREE.MeshBasicMaterial).color.setScalar(base + punch);
    },
  };
}

/** The town behind the board (TOWN), in the road's frame at the board (straight and level here: the climb starts past
 *  it). Only behind the board's plane, as the camera sees it, stands anything taller than a car: in front it would
 *  stand across the words. */
function town(drive: Drive, plan: Chorus4Plan): THREE.Group {
  const T = TOWN, bs = plan.board.s, holder = new THREE.Group(), g = roadFrame(drive.route, holder)(bs, 0);
  // (the frame's x runs to the road's left: a place `lat` right of it, `a` along it)
  const X = (lat: number) => -lat;
  const f0 = drive.route.frameAt(bs), B = plan.board;
  const behind = (a: number, lat: number, by = 1.5) => f0.pos.clone().addScaledVector(f0.fwd, a).addScaledVector(f0.right, lat).sub(B.center).dot(B.normal) < -by;
  const r = (...k: number[]) => hash(bs, 4.4, ...k);
  const slab = (lat0: number, lat1: number, a0: number, a1: number, top: number, m: THREE.Material) => box(g, lat1 - lat0, top + 0.5, a1 - a0, X((lat0 + lat1) / 2), (top - 0.5) / 2, (a0 + a1) / 2, m);
  const asphalt = toon({ color: WORLD.asphalt }), lotM = toon({ color: '#6b5b66' }), walkM = toon({ color: '#cbbba7' }), ground = toon({ color: '#5a4e5c' });
  const dark = toon({ color: WORLD.post }), lines = toon({ color: WORLD.dash, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 });

  // the ground: the lot, the near sidewalk, the back street, its far sidewalk, and level ground under the fronts out to
  // the second row and past it (slabs down into the ground, a centimetre over the Strip's ribbons where they overlap)
  slab(T.lot[0], T.lot[1], T.from, T.lotTo + 4, 0.016, lotM);
  slab(T.lot[1], T.street[0], T.from, T.to, T.kerb, walkM);
  slab(T.street[0], T.street[1], T.from, T.to, 0.02, asphalt);
  slab(T.street[1], T.front, T.from, T.to + 3, T.kerb, walkM);
  slab(T.front, 130, 0, T.to + 40, 0.0, ground);
  slab(T.lot[1] - 6, T.front, T.to, T.to + 3, T.kerb, walkM); // (the sidewalk across the street's end, before the closing front)
  // the back street's centre line, and the lot's bays (a row along its far side, behind the board)
  for (let a = T.from + 2; a + 3 < T.to - 2; a += 8) box(g, 0.14, 0.01, 3, X((T.street[0] + T.street[1]) / 2), 0.026, a + 1.5, lines);
  for (let a = -2; a < T.lotTo; a += 2.8) if (behind(a, T.lot[1] - 3)) box(g, 5, 0.01, 0.12, X(T.lot[1] - 3.1), 0.022, a, lines);

  // the street fronts (the town's own: look/facades.ts), wall to wall along the back street, the second row over them,
  // one closing the street's end; each box 6 m down into the ground
  const fronts: Block[] = [];
  const front = (k: number, a0: number, w: number, lat0: number, d: number, h: number, faceAlong = false, corner?: -1 | 1) => {
    const m = faceAlong
      ? new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0)).scale(new THREE.Vector3(d, h + 6, w)).setPosition(X(lat0 + w / 2), (h - 6) / 2, a0 + d / 2)
      : new THREE.Matrix4().scale(new THREE.Vector3(d, h + 6, w)).setPosition(X(lat0 + d / 2), (h - 6) / 2, a0 + w / 2);
    fronts.push({ s: 7000 + k * 13.7, lateral: 1, w, h, d, color: r(k, 1), matrix: m, ...(corner ? { corner } : {}) });
  };
  for (let a = 2.5, k = 0; a < T.to - 6; k++) {
    const w = Math.min(T.to - a, 10 + 11 * r(k, 2)), h = r(k, 3) < 0.35 ? 9 + 7 * r(k, 4) : 5 + 3.5 * r(k, 4);
    front(k, a, w - 0.4, T.front, 16 + 4 * r(k, 5), h);
    a += w;
  }
  for (let a = 6, k = 40; a < T.to; k++) {
    const w = 14 + 10 * r(k, 2);
    front(k, a, w - 1, T.back, 18 + 4 * r(k, 5), 14 + 14 * r(k, 3));
    a += w + 2 + 4 * r(k, 6);
  }
  front(90, T.to + 3, 32, T.lot[1] - 4, 16, 8.5, true, 1); // (closing the street's end, facing down it: its shop round the corner)
  g.add(facadeMeshes(facades(fronts, { vary: true, avoid: shopsNear(drive, 'chorus4') })));
  // the roofs' clutter on the first row: water tanks on legs, the boxes of the air conditioning
  const tank = toon({ color: '#8d7a6a' }), unit = toon({ color: '#9a9590' });
  for (const b of fronts.slice(0, 6)) {
    const p = new THREE.Vector3().setFromMatrixPosition(b.matrix), top = b.h, k = b.s;
    if (hash(k, 7) < 0.5) { cyl(g, 1.1, 2.2, p.x - 2, top + 2.9, p.z, tank, 12); for (const [dx, dz] of [[-0.7, -0.7], [0.7, -0.7], [0.7, 0.7], [-0.7, 0.7]] as const) box(g, 0.1, 1.8, 0.1, p.x - 2 + dx, top + 0.9, p.z + dz, dark); }
    box(g, 1.6, 1.0, 1.2, p.x + 2, top + 0.5, p.z - b.w / 4, unit);
  }

  // the lot behind the board: cars in its bays, nosed in; lights on tall poles over them
  const COLOURS = ['#e8e2d2', '#5a6a7d', '#b0532e', '#2b4a6b', '#8a8f8a', '#d9b24a', '#3a3a40', '#7a9a6a'];
  for (let a = -2 + 1.4, k = 0; a < T.lotTo; a += 2.8, k++) {
    if (!behind(a, T.lot[1] - 3, 3) || r(k, 20) < 0.35) continue;
    const c = sedan({ color: COLOURS[Math.floor(r(k, 21) * COLOURS.length)]! });
    c.position.set(X(T.lot[1] - 3.1), 0.016, a); c.rotation.y = -Math.PI / 2; g.add(c);
  }
  const head = lampMaterial('#ffd9a0', GLOW.lamp, 0.4), poolM = glowMaterial('#ffb560', GLOW.pool, true);
  Object.assign(poolM, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8 });
  const pool = (lat: number, a: number, rad: number, y: number) => { const m = new THREE.Mesh(new THREE.CircleGeometry(rad, 28), poolM); m.rotation.x = -Math.PI / 2; m.position.set(X(lat), y + 0.03, a); g.add(m); };
  for (const a of [12, 27]) {
    const lat = T.lot[1] - 7;
    if (!behind(a, lat, 3)) continue;
    cyl(g, 0.12, 9, X(lat), 4.5, a, dark, 8);
    box(g, 2.6, 0.12, 0.12, X(lat), 8.95, a, dark);
    for (const s2 of [-1, 1]) { box(g, 0.7, 0.18, 0.4, X(lat) + s2 * 1.2, 8.85, a, dark); box(g, 0.6, 0.05, 0.32, X(lat) + s2 * 1.2, 8.74, a, head); }
    pool(lat, a, 8, 0.016);
  }

  // street lamps along the far sidewalk, their arms out over the street; power poles along the near one, their wires
  for (let a = 6; a < T.to - 4; a += 22) {
    const lat = T.street[1] + 0.9;
    cyl(g, 0.09, 7, X(lat), 3.5 + T.kerb, a, dark, 8);
    box(g, 2.4, 0.1, 0.1, X(lat - 1.2), 6.95 + T.kerb, a, dark);
    box(g, 0.8, 0.16, 0.36, X(lat - 2.4), 6.9 + T.kerb, a, dark); box(g, 0.66, 0.05, 0.28, X(lat - 2.4), 6.8 + T.kerb, a, head);
    pool(lat - 2.6, a, 6.5, 0.02);
  }
  const poles: number[] = []; for (let a = 0; a < T.to; a += 27) poles.push(a);
  const wood = toon({ color: '#4a3d3a' }), porcelain = toon({ color: '#d8d2c4' });
  poles.forEach((a, i) => {
    const lat = T.lot[1] + 0.5;
    cyl(g, 0.15, 10.5, X(lat), 5.25 + T.kerb, a, wood, 8);
    box(g, 2.6, 0.14, 0.14, X(lat), 9.6 + T.kerb, a, dark);
    for (const dx of [-1.1, 0, 1.1]) {
      box(g, 0.08, 0.2, 0.08, X(lat) + dx, 9.78 + T.kerb, a, porcelain);
      const b = poles[i + 1];
      if (b !== undefined) { // (sagging: three spans each, the middle one lower)
        const y = 9.85 + T.kerb, sag = 0.55, pts = [0, 1 / 3, 2 / 3, 1].map((u) => new THREE.Vector3(X(lat) + dx, y - sag * 4 * u * (1 - u), a + (b - a) * u));
        for (let j = 0; j < 3; j++) { const p0 = pts[j]!, p1 = pts[j + 1]!, w = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, p0.distanceTo(p1)), dark); w.position.copy(p0).add(p1).multiplyScalar(0.5); w.lookAt(p1); g.add(w); }
      }
    }
  });

  // cars at the back street's near kerb; people on the far sidewalk, by the shops
  for (let a = 4, k = 60; a < T.to - 8; a += 7 + 9 * r(k, 1), k++) {
    if (r(k, 2) < 0.3) continue;
    const c = sedan({ color: COLOURS[Math.floor(r(k, 3) * COLOURS.length)]! });
    c.position.set(X(T.street[0] + 1.1), 0.02, a); c.rotation.y = r(k, 4) < 0.5 ? 0 : Math.PI; g.add(c);
  }
  for (const [a, turn, step] of [[16, -Math.PI / 2, 0.35], [17.2, Math.PI / 2, -0.2], [38, 0, 0.3], [52, Math.PI, 0.25], [53.4, Math.PI, -0.3]] as const) {
    const p = walker(); p.position.set(X(T.street[1] + 1.4), T.kerb, a); p.rotation.y = turn; stride(p, step); g.add(p);
  }

  // palms on the near sidewalk toward the street's end, standing up over its roofs against the sky left of the board
  {
    const bark = new THREE.Color(WORLD.trunk), scar = bark.clone().lerp(new THREE.Color('#c9a27a'), 0.35), p = palmVariant(11, bark, scar);
    const at = ([[66, 33.4, 14], [74, 33.2, 16.5], [79.5, 33.6, 18]] as const).map(([a, lat, h], k) => new THREE.Matrix4().compose(new THREE.Vector3(X(lat), T.kerb, a), new THREE.Quaternion().setFromAxisAngle(UP, 1.3 + 2.1 * k), new THREE.Vector3().setScalar(h / PALM.h)));
    for (const [geo, mat] of [[p.trunk, toon({ vertexColors: true })], [p.skirt, toon({ color: '#7a5f3c', side: THREE.DoubleSide })], [p.crown, toon({ color: WORLD.crown, side: THREE.DoubleSide })]] as const) {
      const im = new THREE.InstancedMesh(geo, mat, at.length); at.forEach((m, i) => im.setMatrixAt(i, m)); g.add(im);
    }
  }

  // the diner's pole sign at the lot's edge, lit: its name over OPEN 24 HRS, a row of bulbs along its top and foot
  {
    const a = 36, lat = T.lot[1] + 0.6, top = 11;
    if (behind(a, lat, 3)) {
      cyl(g, 0.22, top, X(lat), top / 2, a, toon({ color: '#c9c2b4' }), 10);
      const sg = new THREE.Group(); sg.position.set(X(lat), top - 1.4, a); sg.rotation.y = Math.PI / 2 - 0.5; g.add(sg); // (turned toward the road coming up)
      box(sg, 5.6, 2.6, 0.5, 0, 0, 0, toon({ color: '#c8202e' }));
      const name = pic(signFace('DINER', 640, 184, '#fff6e0', '#c8202e', F.sign(700), 0.7, 0.2), { color: new THREE.Color(1.6, 1.6, 1.6) });
      const open = pic(signFace('OPEN 24 HRS', 640, 100, '#1d2026', '#ffd65a', F.sign(700), 0.62, 0.14), { color: new THREE.Color(1.4, 1.4, 1.4) });
      for (const z of [0.26, -0.26]) {
        const n = plane(sg, 5.2, 1.5, 0, 0.35, z, name), o = plane(sg, 4.4, 0.7, 0, -0.85, z, open);
        if (z < 0) { n.rotation.y = Math.PI; o.rotation.y = Math.PI; }
      }
      const bulbs = lampMaterial('#ffe8b0', GLOW.lamp * 0.8, 0.5);
      for (let i = 0; i < 14; i++) { const x = -2.8 + (5.6 * i) / 13; for (const y of [1.3, -1.3]) for (const z of [0.27, -0.27]) box(sg, 0.12, 0.12, 0.04, x, y, z, bulbs); }
    }
  }
  return holder;
}
