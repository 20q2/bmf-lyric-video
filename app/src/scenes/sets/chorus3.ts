// Chorus 3's props (drive/sets/chorus3.ts): the beach town's welcome arch — its cream band (the lyric is the carriers'),
// a WELCOME TO header in the signs' face, an arc of stepped blocks over it, two pylons, bulbs along the band's foot —
// the dropping line's beach (the towel spread under its umbrella, the raked patch of sand and the figure with his stick,
// the surf rental shack under its surfboard sign), and the coast round them, so the beach reads as a beach people use
// (the user, 2026-10-14: "the world just needs more fleshing out… more fun to look around in"): a boardwalk along the
// sand with its stalls, benches and people walking, umbrellas and towels, lifeguard towers, volleyball nets, palms,
// cars parked along the road, the pier with its pilings, lamps, bait shop and people fishing off its rails, waves
// rolling in to the shore in lines of foam, boats offshore, gulls; and three gulls crossing under the "fly"
// sky-writing. Browser only (canvas).
import * as THREE from 'three';
import type { Drive } from '../../drive/drive';
import { ARCH, type Chorus3Plan } from '../../drive/sets/chorus3';
import { BEACH, SEA, SHOULDER } from '../../drive/world';
import { BLOCKS } from '../../drive/blocks';
import { printedGround } from '../../look/ground';
import { SUN_AZ_DEG, COAST_T } from '../../drive/sky';
import { WORLD, toon } from '../../look/toon';
import { GLOW, lampMaterial } from '../../look/night';
import { PALM, palmVariant } from '../../look/palms';
import { F } from '../../engine/type';
import { hash } from '../../engine/util';
import { box, canvasTex, cyl, onPanel, pic, plane, roadFrame, sedan, signFace, walker } from './kit';

/** The coast's furniture: the boardwalk's inner and outer edges (m off the road's centre, left negative), the stalls'
 *  fronts along its sea side, the umbrellas' band of sand, the lifeguard towers' line by the water, and how many of
 *  each along the chorus. */
const COAST = { walk: [-5.4, -9.6] as [number, number], stalls: -10.4, sand: [-12, -38] as [number, number], towers: -31, umbrellas: 80 };

export function buildChorus3(drive: Drive): { group: THREE.Group; update(t: number): void } | null {
  const plan = drive.plans.chorus3 as Chorus3Plan | undefined;
  if (!plan) return null;
  const { route } = drive, root = new THREE.Group(), onRoad = roadFrame(route, root);
  const cream = toon({ color: '#f6edd6' }), blue = toon({ color: '#2b4a66' }), wood = toon({ color: '#d9c7a2' });
  const bulb = lampMaterial('#ffe08a', GLOW.lamp, 0.8);
  const UP = new THREE.Vector3(0, 1, 0);
  /** A transform in the road's frame at s (x out to sea, y up, z along the road), `lateral` off its centre, `y` up,
   *  turned `yaw` about the vertical, scaled. */
  const frameM = (s: number, lateral: number, y = 0, yaw = 0, scale: THREE.Vector3 = new THREE.Vector3(1, 1, 1)) => {
    const f = route.frameAt(s), fwd = new THREE.Vector3(f.fwd.x, 0, f.fwd.z).normalize(), right = new THREE.Vector3(f.right.x, 0, f.right.z).normalize();
    const m = new THREE.Matrix4().makeBasis(right.clone().negate(), UP, fwd).setPosition(f.pos.clone().addScaledVector(f.right, lateral).addScaledVector(UP, y - 0.05));
    return m.multiply(new THREE.Matrix4().makeRotationY(yaw)).scale(scale);
  };
  /** Instances of one geometry and material at these transforms (tinted per instance, if colours are given). */
  const instanced = (geo: THREE.BufferGeometry, mat: THREE.Material, ms: THREE.Matrix4[], colors?: THREE.Color[]) => {
    if (!ms.length) return;
    const im = new THREE.InstancedMesh(geo, mat, ms.length);
    ms.forEach((m, i) => { im.setMatrixAt(i, m); if (colors) im.setColorAt(i, colors[i]!); });
    im.frustumCulled = false;
    root.add(im);
    return im;
  };

  // where the beach is spoken for: the words' own faces — the towel and the raked sand (nothing on them; nothing tall
  // between them and the lens over the boardwalk), the shack's lot, his boards and the mural before them (nothing tall
  // between them and their camera across the road) —, the arch's pylon, the pier's root, the tunnel's mouth ahead
  const faces = drive.carriers.filter((c) => (c.stretch === 'chorus3' || c.stretch === 'verse2') && c.kind !== 'sky' && c.kind !== 'banner' && c.kind !== 'arch' && !c.ride).map((c) => {
    const f = route.frameAt(c.s);
    return { c, lat: c.center.clone().sub(f.pos).dot(f.right), flat: Math.abs(c.normal.y) > 0.9 };
  });
  const boards = faces.filter(({ c }) => c.kind === 'billboard').map(({ c }) => [c.s - c.w / 2 - 4, c.s + c.w / 2 + 4] as const);
  const end = Math.min(plan.to - 18, drive.tunnels[0] ? drive.tunnels[0].s0 - 16 : Infinity);
  const busy = (s: number, lat: number, tall: boolean) =>
    s < plan.from + 64 || s > end
    || faces.some(({ c, lat: cl, flat }) => {
      const ds = Math.abs(s - c.s);
      if (flat) return (ds < c.w / 2 + 2 && Math.abs(lat - cl) < c.h / 2 + 2) || (tall && ds < c.w / 2 + 8 && lat > cl - 2);
      if (c.kind === 'surfshop' && ds < 8 && lat > cl - 8 && lat < cl + 4) return true; // (its shack, its rack, its flag)
      return tall && ds < c.w / 2 + 12 && lat > cl - 8;
    })
    || (Math.abs(s - plan.archS) < 9 && lat > -16)
    || (Math.abs(s - plan.pierS) < 7);
  // (where the beach's words are: the palms and stalls keep off it, and the fly line's road beyond — its camera looks
  // up past them)
  const take: [number, number] = [plan.towel.s - 14, plan.shop.s + 9];
  const sOf = (k: number, n: number) => plan.from + 64 + ((end - plan.from - 64) * (k + hash(k, n, 3) * 0.8)) / n;

  // ---- the arch: pylons, the band's box, WELCOME TO over it, a stepped arc on top, bulbs along the band's foot ----
  {
    const B = plan.band, A = ARCH, g = onPanel(B);
    box(g, 2 * plan.pylons + A.pylon.w, B.h + 0.6, 0.6, 0, 0, -0.35, cream); // the band's box (the carriers face it)
    box(g, 2 * plan.pylons + A.pylon.w + 0.3, 0.45, 0.8, 0, -B.h / 2 - 0.35, -0.3, blue); // its sill
    // WELCOME TO, the arch's own words, over the band
    box(g, 9.5, 1.15, 0.55, 0, B.h / 2 + 0.85, -0.32, blue);
    plane(g, 9, 0.95, 0, B.h / 2 + 0.85, -0.03, pic(signFace('WELCOME TO', 1024, 108, '#f6edd6', null, F.sign(600), 0.62, 0.24)));
    // the arc: stepped blocks rising to a keystone
    for (const [dx, dy, w] of [[-9, 1.9, 4], [9, 1.9, 4], [-5.4, 2.6, 4], [5.4, 2.6, 4], [-1.8, 3.1, 4.2], [1.8, 3.1, 4.2]] as const) {
      box(g, w, 0.7, 0.6, dx, B.h / 2 + dy, -0.35, cream);
    }
    box(g, 1.6, 1.1, 0.7, 0, B.h / 2 + 3.5, -0.35, blue); // the keystone
    // bulbs along the band's foot (dusk: they're already on)
    for (let i = 0; i <= 26; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), bulb);
      s.position.set(-plan.pylons + (2 * plan.pylons * i) / 26, -B.h / 2 - 0.08, 0.05); g.add(s);
    }
    root.add(g);
    // the pylons, down to the ground (their blocks are the drive's: here the stone)
    for (const side of [-1, 1]) {
      const p = onRoad(plan.archS, side * plan.pylons), h = B.bottom + B.h + 1;
      box(p, A.pylon.w, h, A.pylon.w, 0, h / 2, 0, cream);
      box(p, A.pylon.w + 0.4, 0.5, A.pylon.w + 0.4, 0, 1.1, 0, blue); // its base course
    }
  }

  // ---- the boardwalk: weathered planks along the sand by the road, a low kerb on its sea side ----
  {
    const planks = canvasTex(256, 256, (c) => {
      c.fillStyle = '#b39a80'; c.fillRect(0, 0, 256, 256);
      for (let k = 0; k < 16; k++) { c.fillStyle = `rgba(${90 + 40 * hash(k, 1)}, ${70 + 30 * hash(k, 2)}, ${55 + 20 * hash(k, 3)}, 0.35)`; c.fillRect(0, k * 16, 256, 14); }
      c.fillStyle = 'rgba(60, 40, 34, 0.55)'; for (let k = 0; k < 16; k++) c.fillRect(0, k * 16 + 14, 256, 2);
    });
    planks.wrapS = planks.wrapT = THREE.RepeatWrapping;
    const [a, b] = COAST.walk, pos: number[] = [], uv: number[] = [], idx: number[] = [];
    const s0 = plan.from + 60, s1 = end + 10;
    for (let s = s0, i = 0; s <= s1; s += 2, i++) {
      const f = route.frameAt(s);
      for (const [lat, u] of [[a, 0], [b, 1]] as const) { const p = f.pos.clone().addScaledVector(f.right, lat); pos.push(p.x, p.y - 0.02, p.z); uv.push(u * (b - a) / 4, (s - s0) / 4); }
      if (i) idx.push(2 * i - 2, 2 * i - 1, 2 * i, 2 * i - 1, 2 * i + 1, 2 * i);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    const walk = new THREE.Mesh(geo, toon({ map: planks, side: THREE.DoubleSide })); root.add(walk);
    // its sea-side kerb, and the benches, bins and bike racks along it
    const kerb: THREE.Matrix4[] = [], bench: THREE.Matrix4[] = [], bin: THREE.Matrix4[] = [];
    for (let s = s0; s < s1; s += 3) kerb.push(frameM(s, b - 0.15, 0.15, 0, new THREE.Vector3(0.3, 0.3, 3.05)));
    for (let k = 0; s0 + k * 23 < s1; k++) {
      const s = s0 + 9 + k * 23;
      if (busy(s, b, false)) continue;
      bench.push(frameM(s, b + 0.7, 0.45, 0, new THREE.Vector3(0.55, 0.12, 2)), frameM(s, b + 0.45, 0.75, 0, new THREE.Vector3(0.1, 0.5, 2)));
      bin.push(frameM(s + 2.2, b + 0.5, 0.45, 0, new THREE.Vector3(0.55, 0.9, 0.55)));
    }
    instanced(new THREE.BoxGeometry(1, 1, 1), toon({ color: '#cfc4b4' }), kerb);
    instanced(new THREE.BoxGeometry(1, 1, 1), toon({ color: '#6a4a3a' }), bench);
    instanced(new THREE.CylinderGeometry(0.5, 0.45, 1, 10), toon({ color: '#2f6f6a' }), bin);
  }

  // ---- umbrellas and towels across the sand: striped canopies tilted to the low sun, towels beside them, people
  // lying out on some (silhouettes), coolers ----
  {
    const stripes = (n: number) => canvasTex(256, 64, (c) => { for (let k = 0; k < n; k++) { c.fillStyle = k % 2 ? '#ffffff' : '#d8d2c8'; c.fillRect((k * 256) / n, 0, 256 / n + 1, 64); } });
    const canopyGeo = new THREE.ConeGeometry(1.2, 0.5, 16, 1, true); canopyGeo.translate(0, 2.25, 0);
    const poleGeo = new THREE.CylinderGeometry(0.03, 0.03, 2.4, 6); poleGeo.translate(0, 1.2, 0);
    const towelTex = canvasTex(128, 64, (c) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, 128, 64); c.fillStyle = '#cfc8be'; for (const x of [10, 24, 104, 118]) c.fillRect(x, 0, 6, 64); });
    const towelGeo = new THREE.BoxGeometry(1, 1, 1);
    const PAL = ['#e23d5a', '#2fa3c4', '#f2b134', '#3cb27a', '#f47a2a', '#7a5bd6', '#ff6fa8', '#1e6fd9'].map((h) => new THREE.Color(h));
    const canopies: THREE.Matrix4[] = [], poles: THREE.Matrix4[] = [], cc: THREE.Color[] = [], towels: THREE.Matrix4[] = [], tc: THREE.Color[] = [];
    const bodies: THREE.Matrix4[] = [], heads: THREE.Matrix4[] = [], coolers: THREE.Matrix4[] = [], coolC: THREE.Color[] = [];
    for (let k = 0; k < COAST.umbrellas; k++) {
      const s = sOf(k, COAST.umbrellas), lat = COAST.sand[0] + (COAST.sand[1] - COAST.sand[0]) * hash(k, 11);
      if (busy(s, lat, true)) continue;
      const tilt = 0.12 + 0.12 * hash(k, 12), yaw = hash(k, 13) * Math.PI * 2;
      const m = frameM(s, lat, 0, yaw).multiply(new THREE.Matrix4().makeRotationX(tilt));
      canopies.push(m); poles.push(m.clone()); cc.push(PAL[Math.floor(hash(k, 14) * PAL.length)]!);
      // a towel or two beside it, someone lying on one
      for (let j = 0; j < 1 + Math.floor(hash(k, 15) * 2); j++) {
        const ds = (j ? -1.4 : 1.3) + 0.3 * hash(k, j, 16), dl = -0.4 + 0.8 * hash(k, j, 17), ty = (hash(k, j, 18) - 0.5) * 0.5;
        towels.push(frameM(s + ds, lat + dl, 0.02, ty, new THREE.Vector3(0.95, 0.02, 1.85))); tc.push(PAL[Math.floor(hash(k, j, 19) * PAL.length)]!);
        if (hash(k, j, 20) < 0.55) {
          bodies.push(frameM(s + ds, lat + dl, 0.16, ty).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)));
          heads.push(frameM(s + ds + 0.82 * Math.cos(ty), lat + dl - 0.82 * Math.sin(ty), 0.14, ty));
        }
      }
      if (hash(k, 21) < 0.4) { coolers.push(frameM(s - 0.2, lat + 1.3, 0.22, yaw, new THREE.Vector3(0.6, 0.44, 0.4))); coolC.push(new THREE.Color(hash(k, 22) < 0.5 ? '#d8202e' : '#2f7ad6')); }
    }
    // and sunbathers out on their own (low: they may lie in front of his boards)
    for (let k = 0; k < 60; k++) {
      const s = sOf(k, 60) + 4 * hash(k, 23), lat = COAST.sand[0] + (COAST.sand[1] - COAST.sand[0]) * hash(k, 24), ty = (hash(k, 25) - 0.5) * 0.8;
      if (busy(s, lat, false)) continue;
      towels.push(frameM(s, lat, 0.02, ty, new THREE.Vector3(0.95, 0.02, 1.85))); tc.push(PAL[Math.floor(hash(k, 26) * PAL.length)]!);
      if (hash(k, 27) < 0.7) { bodies.push(frameM(s, lat, 0.16, ty).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2))); heads.push(frameM(s + 0.82 * Math.cos(ty), lat - 0.82 * Math.sin(ty), 0.14, ty)); }
    }
    instanced(canopyGeo, toon({ map: stripes(12), side: THREE.DoubleSide }), canopies, cc);
    instanced(poleGeo, toon({ color: '#ece6da' }), poles);
    instanced(towelGeo, toon({ map: towelTex }), towels, tc);
    const dark = toon({ color: '#241f2a' });
    instanced(new THREE.CapsuleGeometry(0.17, 1.15, 4, 8), dark, bodies);
    instanced(new THREE.SphereGeometry(0.12, 10, 8), dark, heads);
    instanced(new THREE.BoxGeometry(1, 1, 1), toon({ color: '#ffffff' }), coolers, coolC);
  }

  // ---- lifeguard towers by the water: a hut on stilts, a blue roof, a ramp down to the sand, a flag, its number ----
  {
    const T = { w: 3.4, d: 3, h: 1.9, top: 3.3 };
    for (let k = 0, n = 5; k < n; k++) {
      const s = sOf(k, n) + 6, lat = COAST.towers - 3 * hash(k, 31);
      if (busy(s, lat, true)) continue;
      const g = onRoad(s, lat), floor = T.top - T.h;
      g.matrix.multiply(new THREE.Matrix4().makeRotationY(-Math.PI / 2 + (hash(k, 32) - 0.5) * 0.5)); // (facing the water)
      box(g, T.w, T.h, T.d, 0, (floor + T.top) / 2, 0, cream);
      box(g, T.w + 0.8, 0.2, T.d + 0.8, 0, T.top + 0.1, 0, blue);
      box(g, T.w - 0.6, 0.7, 0.04, 0, floor + 1.15, T.d / 2 + 0.01, toon({ color: '#2c3440' })); // its window to the sea
      for (const x of [-T.w / 2 + 0.2, T.w / 2 - 0.2]) for (const z of [-T.d / 2 + 0.2, T.d / 2 - 0.2]) box(g, 0.16, floor, 0.16, x, floor / 2, z, wood);
      const run = 4.5, rl = Math.hypot(run, floor), ramp = box(g, rl, 0.08, 1.1, T.w / 2 + run / 2, floor / 2, 0, wood); ramp.rotation.z = -Math.atan2(floor, run);
      box(g, 0.06, 2.2, 0.06, -T.w / 2 + 0.4, T.top + 1.3, -T.d / 2 + 0.4, wood);
      box(g, 0.9, 0.5, 0.02, -T.w / 2 + 0.85, T.top + 2.1, -T.d / 2 + 0.4, toon({ color: '#c8102e' }));
      const num = pic(signFace(String(14 + k), 128, 128, '#2b4a66', '#f6edd6', F.sign(700), 0.7, 0));
      for (const sx of [-1, 1]) { const p = plane(g, 0.9, 0.9, sx * (T.w / 2 + 0.01), (floor + T.top) / 2, 0, num); p.rotation.y = (sx * Math.PI) / 2; }
      plane(g, 0.9, 0.9, 0, (floor + T.top) / 2, -T.d / 2 - 0.01, num).rotation.y = Math.PI;
    }
  }

  // ---- volleyball nets on the sand behind his boards: posts, the net with its white top band, a ball mid-rally, players ----
  const players: { g: THREE.Group; k: number }[] = [];
  {
    const netTex = canvasTex(256, 64, (c) => {
      c.strokeStyle = 'rgba(20, 18, 24, 0.9)'; c.lineWidth = 2;
      for (let x = 0; x <= 256; x += 8) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 64); c.stroke(); }
      for (let y = 0; y <= 64; y += 8) { c.beginPath(); c.moveTo(0, y); c.lineTo(256, y); c.stroke(); }
      c.fillStyle = '#f4f0e6'; c.fillRect(0, 0, 256, 9);
    });
    const net = new THREE.MeshBasicMaterial({ map: netTex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide }), post = toon({ color: '#e8e2d4' }), ballM = toon({ color: '#f6e27a' });
    const courts = boards.length ? [boards[0]![0] + 22, (boards[0]![0] + boards[boards.length - 1]![1]) / 2 + 6] : [];
    courts.forEach((s, k) => {
      const g = onRoad(s, -27); // (the net across the beach, the court's halves either side along it)
      for (const x of [-4.6, 4.6]) cyl(g, 0.06, 2.6, x, 1.3, 0, post, 8);
      plane(g, 9.2, 1, 0, 2.05, 0, net);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), ballM); ball.name = 'ball'; g.add(ball);
      for (const [x, z] of [[-2, -4], [2.2, -3], [-1.5, 4.2], [2.5, 3.5]] as const) {
        const p = walker(); p.position.set(x, 0, z); p.rotation.y = z < 0 ? 0 : Math.PI; g.add(p);
        players.push({ g: p, k: players.length });
      }
      g.userData = { k };
      players.push({ g, k: -1 - k });
    });
  }

  // ---- stalls along the boardwalk: a taco stand, an ice cream counter, a towel and souvenir shop with its flag towels
  // hung out, a juice bar — each a painted box with a striped awning and its name in the signs' face ----
  {
    const STALLS: [string, string, string, string][] = [
      ['TACOS', '#e8b23a', '#c8102e', '#fff4d6'], ['ICE CREAM', '#ffb6c8', '#2fa3c4', '#ffffff'], ['BEACH SHOP', '#9cd8c6', '#1e6fd9', '#ffffff'],
      ['JUICE BAR', '#f6dd8f', '#3cb27a', '#ffffff'], ['CHURROS', '#f4b6c2', '#f47a2a', '#fff4d6'], ['SURF WAX', '#a9d8e6', '#2b4a66', '#ffffff'],
    ];
    const awn = (a: string, b: string) => canvasTex(256, 32, (c) => { for (let k = 0; k < 16; k++) { c.fillStyle = k % 2 ? a : b; c.fillRect(k * 16, 0, 16, 32); } });
    let n = 0;
    for (let s = plan.from + 70; s < end && n < 40; s += 13 + 10 * hash(s, 41)) {
      if (busy(s, COAST.stalls, true)) continue;
      const [name, wall, stripe, ink] = STALLS[n++ % STALLS.length]!, W = 4.2, D = 3, Hh = 2.8;
      const g = onRoad(s, COAST.stalls);
      // (its counter faces the boardwalk: the road. In this frame x is out to sea: the box stands behind x = 0)
      g.matrix.multiply(new THREE.Matrix4().makeRotationY(-Math.PI / 2)); // x along the road, z toward the road
      const paint = toon({ color: wall });
      box(g, W, Hh, D, 0, Hh / 2, -D / 2, paint);
      box(g, W + 0.3, 0.18, D + 0.3, 0, Hh + 0.09, -D / 2, toon({ color: '#f4efe4' })); // its roof's lip
      box(g, W - 0.8, 1.0, 0.05, 0, 1.6, 0.01, toon({ color: '#2c2630' })); // its serving window
      box(g, W - 0.6, 0.08, 0.5, 0, 1.08, 0.25, toon({ color: '#f4efe4' })); // the counter
      const aw = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.4, 1.2), toon({ map: awn(stripe, '#ffffff'), side: THREE.DoubleSide }));
      aw.position.set(0, Hh - 0.2, 0.5); aw.rotation.x = -1.0; g.add(aw);
      box(g, W * 0.92, 0.7, 0.12, 0, Hh + 0.55, 0.0, toon({ color: stripe })); // its sign board
      plane(g, W * 0.86, 0.6, 0, Hh + 0.55, 0.07, pic(signFace(name, 512, 72, ink, null, F.sign(700), 0.7, 0.12)));
      if (name === 'BEACH SHOP') for (let j = 0; j < 4; j++) { // flag towels hung out on a rail beside it
        box(g, 0.05, 2.6, 0.05, W / 2 + 0.3 + j * 1.25, 1.3, 0.3, wood);
        const tw = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.7), toon({ color: ['#e23d5a', '#2fa3c4', '#f2b134', '#7a5bd6'][j]!, side: THREE.DoubleSide }));
        tw.position.set(W / 2 + 0.92 + j * 1.25, 1.65, 0.3); g.add(tw);
      }
      if (hash(s, 42) < 0.6) for (let j = 0; j < 2; j++) { // a table or two out front with an umbrella
        const x = (j ? 1 : -1) * (W / 2 + 1.6);
        cyl(g, 0.45, 0.06, x, 0.75, 1.6, toon({ color: '#f4efe4' }), 12); cyl(g, 0.04, 0.75, x, 0.37, 1.6, wood, 6);
        const um = new THREE.Mesh(new THREE.ConeGeometry(1.0, 0.4, 12, 1, true), toon({ color: stripe, side: THREE.DoubleSide })); um.position.set(x, 2.3, 1.6); g.add(um);
        cyl(g, 0.025, 2.2, x, 1.1, 1.6, wood, 6);
      }
    }
  }

  // ---- palms along the boardwalk, in twos and threes of different heights (the world's own stand by the water) ----
  {
    const bark = new THREE.Color(WORLD.trunk), scar = bark.clone().lerp(new THREE.Color('#c9a27a'), 0.35);
    const placed: THREE.Matrix4[][] = [[], [], []];
    for (let k = 0; k < 14; k++) {
      const s = sOf(k, 14) + 3;
      for (let j = 0; j < 2 + Math.floor(hash(k, 51) * 2); j++) {
        const ss = s + j * 2.6, lat = COAST.walk[1] - 1.6 - 1.5 * hash(k, j, 52), h = 7 + 8 * hash(k, j, 53);
        if (busy(ss, lat, true) || (ss > take[0] - 40 && ss < plan.to + 40)) continue; // (nor along the fly line: the camera looks up past them)
        placed[j % 3]!.push(new THREE.Matrix4().compose(new THREE.Vector3().setFromMatrixPosition(frameM(ss, lat)), new THREE.Quaternion().setFromAxisAngle(UP, hash(k, j, 54) * 6.28), new THREE.Vector3().setScalar(h / PALM.h)));
      }
    }
    const leaves = toon({ color: WORLD.crown, side: THREE.DoubleSide }), dead = toon({ color: '#7a5f3c', side: THREE.DoubleSide }), bk = toon({ vertexColors: true });
    placed.forEach((ms, v) => { const p = palmVariant(v + 7, bark, scar); instanced(p.trunk, bk, ms); instanced(p.skirt, dead, ms); instanced(p.crown, leaves, ms); });
  }

  // ---- cars parked along the road's right shoulder (not across from his boards: their camera stands there), and the
  // beach's parking lot across the road from his boards — low, under that camera's eye up over it — a pay booth at its
  // mouth, its sign on a pole ----
  {
    const COLORS = ['#e8e2d4', '#2b4a66', '#c8102e', '#3cb27a', '#f2b134', '#1d2026', '#9cc3e0', '#f4b6c2'];
    if (boards.length) {
      const a = boards[0]![0] - 10, b = boards[boards.length - 1]![1], L = [8, 30] as const;
      const pos: number[] = [], idx: number[] = [];
      for (let s = a, i = 0; s <= b; s += 2, i++) {
        const f = route.frameAt(s);
        for (const lat of L) { const p = f.pos.clone().addScaledVector(f.right, lat); pos.push(p.x, p.y - 0.03, p.z); }
        if (i) idx.push(2 * i - 2, 2 * i, 2 * i - 1, 2 * i - 1, 2 * i, 2 * i + 1);
      }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
      root.add(new THREE.Mesh(geo, toon({ color: '#5a4a5e', side: THREE.DoubleSide })));
      const stripes: THREE.Matrix4[] = [];
      for (const row of [12.5, 25.5]) for (let s = a + 3; s < b - 3; s += 2.8) {
        stripes.push(frameM(s, row, 0.0, 0, new THREE.Vector3(5, 0.02, 0.12)));
        if (hash(s, row, 65) < 0.72) { const g = onRoad(s + 1.4, row); g.matrix.multiply(new THREE.Matrix4().makeRotationY(row < 20 ? Math.PI / 2 : -Math.PI / 2)); g.add(sedan({ color: COLORS[Math.floor(hash(s, row, 66) * COLORS.length)]!, length: 4.3 + 0.5 * hash(s, row, 67) })); }
      }
      instanced(new THREE.BoxGeometry(1, 1, 1), toon({ color: '#f4f0e6' }), stripes);
      const booth = onRoad(a + 4, 9.5);
      box(booth, 2, 2.4, 2, 0, 1.2, 0, cream); box(booth, 2.4, 0.15, 2.4, 0, 2.47, 0, blue);
      box(booth, 0.06, 4.6, 0.06, 0, 2.3, -2.2, toon({ color: WORLD.post }));
      const ps = plane(booth, 2.6, 0.9, 0, 4.3, -2.26, pic(signFace('BEACH PARKING', 512, 176, '#ffffff', '#1e6fd9', F.sign(700), 0.38, 0.06), { side: THREE.DoubleSide }));
      ps.rotation.y = Math.PI; // (to the traffic coming along the road)
    }
    for (let k = 0, s = plan.from + 66; s < end; k++, s += 6.4 + 3 * hash(k, 61)) {
      if (hash(k, 62) < 0.25 || boards.some(([a, b]) => s > a - 30 && s < b + 10) || Math.abs(s - plan.archS) < 14) continue;
      const g = onRoad(s, 5.1);
      g.add(sedan({ color: COLORS[Math.floor(hash(k, 63) * COLORS.length)]!, length: 4.3 + 0.6 * hash(k, 64) }));
    }
  }

  // ---- the dropping line's beach: the towel under its umbrella (a cooler, flip-flops, a bag, a neighbour's towel), the
  // raked patch of sand with the figure who wrote in it and his stick, and the surf rental shack under its sign ----
  {
    // the towel: hot pink, a white-and-teal stripe across each end, a fringe; the print is the carrier's
    const T = plan.towel, g = onPanel(T); // (x along the print, y its up — out to sea —, z up out of the sand)
    const cloth = canvasTex(512, 320, (c) => {
      c.fillStyle = '#f0437c'; c.fillRect(0, 0, 512, 320);
      for (const x of [18, 474]) { c.fillStyle = '#ffffff'; c.fillRect(x, 0, 20, 320); c.fillStyle = '#19a6b8'; c.fillRect(x + (x < 100 ? 26 : -18), 0, 12, 320); }
      c.strokeStyle = '#ffffff'; c.lineWidth = 3; for (let y = 6; y < 320; y += 9) for (const x of [0, 506]) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + 6, y); c.stroke(); }
    });
    plane(g, T.w + 0.6, T.h + 0.4, 0, 0, -0.035, toon({ map: cloth }));
    root.add(g);
    // round it, in the road's frame at the towel (x out to sea, z along the road)
    const r = onRoad(T.s, 0), lat0 = -T.center.clone().sub(route.frameAt(T.s).pos).dot(route.frameAt(T.s).right);
    const umb = new THREE.Mesh(new THREE.ConeGeometry(1.5, 0.6, 16, 1, true), toon({ map: canvasTex(256, 32, (c) => { for (let k = 0; k < 12; k++) { c.fillStyle = k % 2 ? '#ffffff' : '#19a6b8'; c.fillRect(k * 22, 0, 22, 32); } }), side: THREE.DoubleSide }));
    umb.position.set(lat0 + 2.6, 2.35, 1.6); umb.rotation.z = 0.25; r.add(umb);
    cyl(r, 0.035, 2.5, lat0 + 2.45, 1.2, 1.6, toon({ color: '#ece6da' }), 6).rotation.z = 0.25;
    box(r, 0.5, 0.4, 0.75, lat0 + 1.6, 0.2, -2.0, toon({ color: '#2f7ad6' })); box(r, 0.52, 0.08, 0.77, lat0 + 1.6, 0.42, -2.0, toon({ color: '#ffffff' })); // a cooler
    for (const dz of [-0.12, 0.12]) box(r, 0.28, 0.03, 0.11, lat0 - 1.25, 0.02, -1.0 + dz, toon({ color: '#ffd65a' })); // flip-flops
    box(r, 0.35, 0.45, 0.6, lat0 + 1.4, 0.22, 2.4, toon({ color: '#f2b134' })); // a beach bag
    const dark = toon({ color: '#241f2a' });
    const lying = (x: number, z: number, yaw = 0) => { const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 1.15, 4, 8), dark); b.rotation.set(Math.PI / 2, 0, yaw); b.position.set(x, 0.17, z); r.add(b); const h = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), dark); h.position.set(x - Math.sin(yaw) * 0.82, 0.15, z + Math.cos(yaw) * 0.82); r.add(h); };
    box(r, 1.0, 0.02, 1.9, lat0 + 3.6, 0.02, -0.6, toon({ color: '#ffd65a' })); lying(lat0 + 3.6, -0.7); // the neighbours' towels, them on them
    box(r, 1.0, 0.02, 1.9, lat0 + 4.9, 0.02, -0.3, toon({ color: '#3cb27a' })); lying(lat0 + 4.9, -0.4, 0.1);
    // a sandcastle by the towel's foot (towers, a wall, a moat), its bucket and spade; a beach ball; a boogie board
    const sandy = toon({ color: '#e8c48a' });
    box(r, 1.1, 0.25, 1.1, lat0 - 0.6, 0.12, 3.2, sandy);
    for (const [dx, dz] of [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]] as const) { cyl(r, 0.18, 0.5, lat0 - 0.6 + dx, 0.25, 3.2 + dz, sandy, 10); const cn = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.25, 10), sandy); cn.position.set(lat0 - 0.6 + dx, 0.62, 3.2 + dz); r.add(cn); }
    cyl(r, 0.28, 0.75, lat0 - 0.6, 0.37, 3.2, sandy, 12);
    const bucket = cyl(r, 0.16, 0.3, lat0 + 0.4, 0.15, 3.9, toon({ color: '#e23d5a' }), 12); bucket.rotation.z = 1.4;
    box(r, 0.12, 0.03, 0.5, lat0 + 0.6, 0.02, 2.6, toon({ color: '#2f7ad6' }));
    const ballTex = canvasTex(128, 64, (c) => { ['#ffffff', '#e23d5a', '#ffffff', '#f2b134', '#ffffff', '#2fa3c4'].forEach((col, i) => { c.fillStyle = col; c.fillRect(i * 22, 0, 22, 64); }); });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), toon({ map: ballTex })); ball.position.set(lat0 - 1.7, 0.3, -2.6); r.add(ball);
    const bb = box(r, 0.6, 0.06, 1.1, lat0 + 1.9, 0.04, -3.6, toon({ color: '#19a6b8' })); bb.rotation.y = 0.4;
    // the raked words' patch: the beach smoothed flat for them, soft at its edges, raked in lines across
    const S = plan.sand, sg = onPanel(S);
    const raked = canvasTex(512, 192, (c) => {
      c.filter = 'blur(10px)'; c.fillStyle = 'rgba(248, 226, 182, 0.7)'; c.beginPath(); c.roundRect(26, 26, 460, 140, 50); c.fill(); c.filter = 'none';
      c.strokeStyle = 'rgba(140, 90, 55, 0.3)'; c.lineWidth = 2;
      for (let y = 40; y < 156; y += 7) { c.beginPath(); c.moveTo(46 + 10 * Math.sin(y), y); c.lineTo(466 - 10 * Math.cos(y), y + 3 * Math.sin(y)); c.stroke(); }
    });
    plane(sg, S.w + 3, S.h + 2.2, 0, 0, -0.01, toon({ map: raked, transparent: true, depthWrite: false }));
    root.add(sg);
    const wr = onRoad(S.s + S.w / 2 + 1.6, 0), slat = -S.center.clone().sub(route.frameAt(S.s).pos).dot(route.frameAt(S.s).right);
    const writer = walker(); writer.position.set(slat + 0.6, 0, 0); writer.rotation.y = -Math.PI / 2 - 0.4; wr.add(writer); // the one who wrote it, his back to the sea, admiring it
    const stick = cyl(wr, 0.025, 1.8, slat - 0.1, 0.8, 0.2, toon({ color: '#7a5f3c' }), 6); stick.rotation.x = 0.5;
    // the surf rental shack under its sign: a teal plank shack, its window and counter, boards racked beside it, a
    // feather flag; the sign a cream surfboard with a red stripe, on posts off the roof
    const P = plan.shop, pg = onPanel(P), roofY = -P.center.y + route.frameAt(P.s).pos.y - 0.05 + 3.2;
    // (a longboard's outline: full height most of its length, so the words never run off its rails)
    const boardTex = canvasTex(1024, 256, (c) => {
      const pill = (inset: number) => { c.beginPath(); c.roundRect(6 + inset, 6 + inset, 1012 - 2 * inset, 244 - 2 * inset, 122 - inset); };
      c.fillStyle = '#fbf1d8'; pill(0); c.fill();
      c.strokeStyle = '#d81e2c'; c.lineWidth = 12; pill(16); c.stroke();
      c.strokeStyle = '#19a6b8'; c.lineWidth = 6; pill(30); c.stroke();
    });
    plane(pg, P.w + 1.6, P.h + 0.4, 0, 0, -0.06, toon({ map: boardTex, transparent: true, alphaTest: 0.5 }));
    for (const x of [-P.w / 4, P.w / 4]) box(pg, 0.18, 1.4, 0.18, x, roofY + 0.5, -0.25, toon({ color: '#3a2a24' })); // its posts
    const teal = toon({ map: canvasTex(256, 128, (c) => { c.fillStyle = '#1f8a8a'; c.fillRect(0, 0, 256, 128); c.fillStyle = 'rgba(10, 50, 50, 0.45)'; for (let x = 0; x < 256; x += 16) c.fillRect(x, 0, 2, 128); }) });
    const SH = { w: 7.4, d: 4.2, h: 3.2, back: 0.6 }, base = roofY - SH.h;
    box(pg, SH.w, SH.h, SH.d, 0, base + SH.h / 2, -SH.back - SH.d / 2, teal);
    box(pg, SH.w + 0.6, 0.22, SH.d + 0.6, 0, roofY + 0.1, -SH.back - SH.d / 2, toon({ color: '#f4efe4' }));
    box(pg, 3.6, 1.2, 0.05, -1.2, base + 1.7, -SH.back + 0.01, toon({ color: '#2c2630' })); // its window
    box(pg, 3.8, 0.1, 0.55, -1.2, base + 1.05, -SH.back + 0.27, toon({ color: '#f4efe4' }));
    plane(pg, 2.4, 0.5, 2.2, base + 2.4, -SH.back + 0.02, pic(signFace('RENTALS', 512, 104, '#fbf1d8', '#d81e2c', F.sign(700), 0.62, 0.14)));
    // the rack of boards beside it: upright, nose up, each its own colours
    const BC = ['#f2b134', '#e23d5a', '#ffffff', '#2fa3c4', '#3cb27a', '#f47a2a', '#ff6fa8'];
    for (let j = 0; j < 7; j++) {
      const sb = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), toon({ color: BC[j]! }));
      sb.scale.set(0.27, 1.15, 0.05); sb.position.set(P.w / 2 + 0.9 + j * 0.62, base + 1.15, -0.4); sb.rotation.z = 0.05 * (j % 2 ? 1 : -1); pg.add(sb);
    }
    box(pg, 4.6, 0.1, 0.1, P.w / 2 + 2.75, base + 1.0, -0.6, toon({ color: '#3a2a24' }));
    for (const x of [P.w / 2 + 0.5, P.w / 2 + 5.0]) box(pg, 0.1, 1.4, 0.1, x, base + 0.7, -0.6, toon({ color: '#3a2a24' }));
    // its feather flag
    box(pg, 0.05, 3.6, 0.05, -P.w / 2 - 0.8, base + 1.8, 0.4, toon({ color: '#3a2a24' }));
    const flag = plane(pg, 0.7, 2.6, -P.w / 2 - 0.45, base + 2.2, 0.4, pic(canvasTex(64, 256, (c) => { c.fillStyle = '#d81e2c'; c.fillRect(0, 0, 64, 256); c.fillStyle = '#fbf1d8'; c.font = `bold 44px "${F.sign(700)}"`; c.textAlign = 'center'; for (const [i, ch] of [...'SURF'].entries()) c.fillText(ch, 32, 56 + i * 52); }), { side: THREE.DoubleSide }));
    flag.rotation.y = 0.3;
    root.add(pg);
  }

  // ---- the pier: from the boardwalk up a ramp and out to sea on piles; planks, rails, lamps, benches, a bait shop, people
  // fishing off its rails; a pavilion at its end. (The road's frame: +x out to sea) ----
  const fishers: THREE.Group[] = [];
  {
    const g = onRoad(plan.pierS, 0), deckM = toon({ map: canvasTex(64, 256, (c) => { c.fillStyle = '#7a6452'; c.fillRect(0, 0, 64, 256); c.fillStyle = 'rgba(40, 26, 20, 0.6)'; for (let y = 0; y < 256; y += 8) c.fillRect(0, y, 64, 1.5); }) });
    const pile = toon({ color: '#3a2a24' }), rail = toon({ color: '#ece6da' });
    const x0 = -COAST.walk[1] + 5, x1 = SEA * 0.62, y = 2.6, W = 7; // (from just past the boardwalk)
    const deck = box(g, x1 - x0, 0.3, W, (x0 + x1) / 2, y, 0, deckM);
    ((deck.material as THREE.MeshToonMaterial).map!).wrapT = THREE.RepeatWrapping;
    // the ramp up from the boardwalk
    const rl = Math.hypot(5, y), ramp = box(g, rl, 0.25, W - 1, x0 - 2.5, y / 2, 0, deckM); ramp.rotation.z = Math.atan2(y, 5);
    for (let x = x0 + 2; x < x1; x += 6) for (const dz of [-W / 2 + 0.4, 0, W / 2 - 0.4]) cyl(g, 0.22, y + 1.2, x, y / 2 - 0.6, dz, pile, 8);
    for (let x = x0 + 2; x < x1; x += 12) { const b = box(g, 0.12, 0.12, W - 0.6, x, y - 1.0, 0, pile); b.rotation.x = 0.35; } // cross bracing
    for (const dz of [-W / 2 + 0.05, W / 2 - 0.05]) {
      box(g, x1 - x0, 0.08, 0.08, (x0 + x1) / 2, y + 1.15, dz, rail);
      box(g, x1 - x0, 0.05, 0.05, (x0 + x1) / 2, y + 0.65, dz, rail);
      for (let x = x0 + 1; x < x1; x += 2.5) box(g, 0.08, 1.1, 0.08, x, y + 0.7, dz, rail);
    }
    // its entrance: a gateway over the ramp's foot with the pier's name
    for (const dz of [-W / 2 + 0.2, W / 2 - 0.2]) box(g, 0.5, 5, 0.5, x0 - 4.6, 2.5, dz, cream);
    box(g, 0.6, 1.2, W + 0.4, x0 - 4.6, 5.4, 0, blue);
    const nameP = plane(g, W, 0.9, x0 - 4.95, 5.4, 0, pic(signFace('PACIFIC PIER', 768, 110, '#f6edd6', null, F.sign(700), 0.62, 0.2)));
    nameP.rotation.y = -Math.PI / 2;
    // lamps along it
    for (let x = x0 + 6; x < x1 - 6; x += 12) for (const dz of [-W / 2 + 0.2, W / 2 - 0.2]) {
      box(g, 0.12, 3.6, 0.12, x, y + 1.95, dz, toon({ color: '#2b4a66' }));
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), bulb); b.position.set(x, y + 3.9, dz); g.add(b);
    }
    // benches down its middle
    for (let x = x0 + 12; x < x1 - 14; x += 18) box(g, 2, 0.45, 0.6, x, y + 0.38, 0, toon({ color: '#6a4a3a' }));
    // the bait shop on the deck: a shack, its sign
    const bx = x0 + 34;
    box(g, 6, 3, 4, bx, y + 1.65, -W / 2 + 2.3, toon({ color: '#c94f3a' }));
    box(g, 6.6, 0.2, 4.6, bx, y + 3.25, -W / 2 + 2.3, toon({ color: '#f4efe4' }));
    const bait = plane(g, 3.6, 0.8, bx - 3.02, y + 2.4, -W / 2 + 2.3, pic(signFace('BAIT & TACKLE', 640, 140, '#fff4d6', '#2b4a66', F.sign(700), 0.56, 0.08)));
    bait.rotation.y = -Math.PI / 2; // (on its end toward the shore)
    // people fishing along its rails: standing at the rail, rods out over the water, lines down
    const rod = toon({ color: '#1a1620' });
    for (let k = 0; k < 9; k++) {
      const x = x0 + 14 + k * ((x1 - x0 - 30) / 9) + 3 * hash(k, 71), side = k % 2 ? 1 : -1, z = side * (W / 2 - 0.6);
      const p = walker(); p.position.set(x, y + 0.15, z); p.rotation.y = side > 0 ? 0 : Math.PI; g.add(p); fishers.push(p);
      const r = cyl(g, 0.02, 3.2, x, y + 2.1, z + side * 1.3, rod, 4); r.rotation.x = side * 1.0;
      cyl(g, 0.006, y + 2.9, x, (y + 2.9) / 2, z + side * 2.65, rod, 3);
      if (k % 3 === 0) box(g, 0.45, 0.35, 0.3, x + 0.6, y + 0.33, z - side * 0.3, toon({ color: '#e8e2d4' })); // a bucket
    }
    // the pavilion at its end
    box(g, 9, 3, 9, x1 - 4, y + 1.65, 0, cream);
    box(g, 10, 0.35, 10, x1 - 4, y + 3.3, 0, blue);
    const pt = new THREE.Mesh(new THREE.ConeGeometry(6.6, 2.8, 4), blue); pt.position.set(x1 - 4, y + 4.8, 0); pt.rotation.y = Math.PI / 4; g.add(pt);
    for (const dz of [-2.5, 2.5]) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), bulb); b.position.set(x1 - 8.6, y + 2.4, dz * 1.45); g.add(b); }
  }

  // ---- boats offshore: sailboats (a hull, a mast, a white sail) and a fishing boat, rocking on the swell ----
  const boats: { g: THREE.Group; k: number; s: number; lat: number }[] = [];
  {
    const hullW = toon({ color: '#f4f0e6' }), sail = toon({ color: '#fbf7ee', side: THREE.DoubleSide }), red = toon({ color: '#c8102e' });
    const sailGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0.6, 0.2), new THREE.Vector3(0, 7.6, 0.2), new THREE.Vector3(0, 0.6, -3.2)]);
    sailGeo.computeVertexNormals();
    for (let k = 0; k < 6; k++) {
      const s = plan.from + 90 + k * ((end - plan.from - 60) / 6) + 15 * hash(k, 81), lat = -70 - 70 * hash(k, 82);
      const g = new THREE.Group(); g.matrixAutoUpdate = false; root.add(g);
      if (k === 3) { // the fishing boat: a red hull, a white wheelhouse, its outriggers
        box(g, 2.6, 1.0, 8, 0, 0.4, 0, red); box(g, 2.2, 1.6, 2.4, 0, 1.7, 1.2, hullW); box(g, 0.08, 4, 0.08, 0, 2.8, -1.5, toon({ color: '#2c2630' }));
        for (const sx of [-1, 1]) { const o = box(g, 0.06, 0.06, 5, sx * 2.2, 3.4, -1.5, toon({ color: '#2c2630' })); o.rotation.z = sx * 0.6; }
      } else {
        box(g, 1.6, 0.7, 5.4, 0, 0.3, 0, hullW); box(g, 1.62, 0.12, 5.42, 0, 0.6, 0, k % 2 ? red : blue);
        box(g, 0.08, 7.4, 0.08, 0, 3.9, 0.2, toon({ color: '#d8d2c8' }));
        g.add(new THREE.Mesh(sailGeo, sail));
      }
      boats.push({ g, k, s, lat });
    }
  }

  // ---- waves: lines of foam rolling in to the shore, set after set, thinning out as they run up the sand ----
  const WAVE = { sets: 3, period: 5.4, from: -BEACH - 26, to: -BEACH + 1.5, seg: 6 };
  const waveSegs: { s: number; len: number; k: number }[] = [];
  for (let k = 0; k < WAVE.sets; k++) for (let s = plan.from - 40; s < plan.to + 10; s += WAVE.seg) if (hash(k, s, 91) > 0.18) waveSegs.push({ s: s + 1.5 * hash(k, s, 92), len: WAVE.seg * (0.55 + 0.4 * hash(k, s, 93)), k });
  const waves = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), toon({ color: '#f4f0e6' }), waveSegs.length);
  waves.frustumCulled = false; root.add(waves);
  const segM = new THREE.Matrix4(), segScale = new THREE.Vector3();

  // ---- people strolling the boardwalk, both ways, at a walking pace ----
  const strollers = Array.from({ length: 16 }, (_, k) => {
    const holder = new THREE.Group(); holder.matrixAutoUpdate = false; root.add(holder);
    const p = walker(); p.scale.setScalar(0.92 + 0.16 * hash(k, 111)); holder.add(p);
    return { holder, p, k, s: plan.from + 70 + (k + 0.5) * ((end - plan.from - 70) / 16), dir: k % 2 ? 1 : -1, lat: k % 2 ? -6.4 : -8.6, v: 1.1 + 0.4 * hash(k, 112) };
  });
  const lo = plan.from + 66, span = end - lo;

  // ---- gulls: wheeling over the beach all chorus, and three crossing under the "fly" sky-writing; silhouettes (a
  // body, swept wings), three poses of a flap swapped in turn ----
  const gull = (lift: number) => canvasTex(256, 128, (c) => {
    c.fillStyle = '#241f2a'; c.strokeStyle = '#241f2a'; c.lineCap = 'round'; c.lineWidth = 14;
    // the body, head forward (left), a tail
    c.beginPath(); c.ellipse(128, 76, 26, 10, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.moveTo(150, 72); c.lineTo(166, 70); c.lineTo(152, 80); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(104, 74); c.lineTo(88, 66); c.lineTo(90, 84); c.closePath(); c.fill();
    // the wings: swept back, bent at the wrist, raised or lowered by `lift`
    for (const sx of [-1, 1]) {
      c.beginPath(); c.moveTo(128 + sx * 10, 74);
      c.quadraticCurveTo(128 + sx * 48, 74 - 30 * lift, 128 + sx * 70, 74 - 36 * lift);
      c.quadraticCurveTo(128 + sx * 100, 74 - 44 * lift, 128 + sx * 122, 74 - 60 * lift);
      c.stroke();
    }
  });
  const gullTex = [gull(1), gull(0.2), gull(-0.6)];
  const makeGull = () => {
    const g = new THREE.Group(); g.matrixAutoUpdate = false;
    const poses = gullTex.map((tex) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.3), new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2 + 0.3; g.add(m); return m; });
    root.add(g);
    return { g, poses };
  };
  const gulls = plan.fly ? [0, 1, 2].map((k) => ({ ...makeGull(), k })) : [];
  const wheeling = Array.from({ length: 10 }, (_, k) => ({ ...makeGull(), k, s: plan.from + 80 + k * ((end - plan.from - 80) / 10), lat: -14 - 22 * hash(k, 101), r: 6 + 6 * hash(k, 102), y: 9 + 7 * hash(k, 103) }));
  const flap = (poses: THREE.Mesh[], t: number, k: number) => {
    const beat = Math.floor((t * 7 + k * 1.9) / Math.PI) % 4, pose = beat === 3 ? 1 : beat; // (up, mid, down, mid)
    poses.forEach((m, i) => (m.visible = i === pose));
  };

  // ---- the sun's glitter path on the water: a streak of broken highlights lying along the sun's bearing — the one
  // prop that makes the sea read as sea while the sun goes down into it ----
  let glitter!: THREE.Mesh;
  {
    const tex = canvasTex(256, 1024, (c) => {
      for (let k = 0; k < 150; k++) {
        const u = (k * 0.618) % 1, v = (k * 0.382) % 1;
        const w = 10 + 50 * ((k * 0.27) % 1) * (1 - v * 0.6); // (narrower streaks far out)
        c.fillStyle = `rgba(255, 220, 170, ${0.14 + 0.3 * ((k * 0.73) % 1)})`;
        c.fillRect(128 + (u - 0.5) * (170 - 110 * v) - w / 2, v * 1024, w, 3.5 + 3 * ((k * 0.41) % 1));
      }
    });
    const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, color: new THREE.Color(2.2, 2.2, 2.2) });
    glitter = new THREE.Mesh(new THREE.PlaneGeometry(26, 190), m);
    // lying on the water along the sun's bearing FROM the arch wide's eye (a glitter path runs viewer-to-sun: it is
    // tuned for the one shot that holds the sea)
    const cf = route.frameAt(drive.motion.distanceAt(COAST_T)), fwd = new THREE.Vector3(cf.fwd.x, 0, cf.fwd.z).normalize(), right = new THREE.Vector3(cf.right.x, 0, cf.right.z).normalize();
    const az = (SUN_AZ_DEG * Math.PI) / 180;
    const dir = fwd.clone().multiplyScalar(Math.cos(az)).addScaledVector(right, -Math.sin(az)).normalize();
    const start = route.frameAt(plan.archS - 40).pos.clone().addScaledVector(right, -11);
    const mid = start.clone().addScaledVector(dir, 95);
    // (flat on the water, its long axis along the bearing: x across, y out along dir, z up)
    glitter.matrixAutoUpdate = false;
    glitter.matrix.makeBasis(new THREE.Vector3(0, 1, 0).clone().cross(dir).normalize(), dir, new THREE.Vector3(0, 1, 0)).setPosition(mid.x, 0.03, mid.z); // (a hair over the sea strip, or it drowns)
    root.add(glitter);
  }

  // ---- the far scenery the fly line's crane rises into view of (the user, 2026-10-15: "the ocean doesn't extend out
  // forever … the mountain in the distance is clipping"): the sea runs on past its strip out to the haze, and the hills
  // the road climbs to the overlook stand as land under it (from the coast the climb read as a ribbon floating in the
  // haze, its embankments' fill gone into the fog colour). Only while the coast is seen: the city spreads over that
  // side at the end, and the ending's own views stay as they are. ----
  const far = new THREE.Group(); root.add(far);
  {
    const coast = drive.stretches.filter((st) => BLOCKS[st.id]?.seaLeft);
    const a = drive.motion.distanceAt(coast[0]!.start) - 60, b = drive.motion.distanceAt(coast[coast.length - 1]!.end) + 60;
    // the coast's mean heading and its seaward side (flat)
    const T = new THREE.Vector3(), D = new THREE.Vector3();
    for (let s = a; s <= b; s += 10) { const f = route.frameAt(s); T.add(new THREE.Vector3(f.fwd.x, 0, f.fwd.z)); D.add(new THREE.Vector3(-f.right.x, 0, -f.right.z)); }
    T.normalize(); D.normalize();
    // the sea: from inside the sea strip's outer edge (under it) out past the haze, flaring away at either end
    const edge: THREE.Vector2[] = [];
    for (let s = a; s <= b + 1e-6; s += 4) { const f = route.frameAt(s), p = f.pos.clone().addScaledVector(f.right, -(SEA - 12)); edge.push(new THREE.Vector2(p.x, p.z)); }
    const FAR = 5000, e0 = edge[0]!, e1 = edge[edge.length - 1]!;
    const corner = (e: THREE.Vector2, k: number) => new THREE.Vector2(e.x + D.x * FAR + T.x * FAR * k, e.y + D.z * FAR + T.z * FAR * k);
    const shape = new THREE.Shape([...edge, corner(e1, 0.6), corner(e0, -0.6)]);
    const sea = new THREE.Mesh(new THREE.ShapeGeometry(shape).rotateX(Math.PI / 2).translate(0, route.frameAt(a).pos.y - 0.16, 0), toon({ color: WORLD.sea, side: THREE.DoubleSide }));
    sea.name = 'sea'; far.add(sea);
    // the hills: land under the climb to the overlook, falling from its verges' edges (SHOULDER out) to the plain
    const climb: THREE.Vector3[] = [];
    for (let s = b; s < route.length; s += 4) { const p = route.frameAt(s).pos; if (p.y > 0.3) climb.push(p.clone()); }
    if (climb.length) {
      const HILL = { fall: 0.32, cell: 6, scrub: 700 };
      const box = new THREE.Box3().setFromPoints(climb), reach = SHOULDER + Math.max(...climb.map((p) => p.y)) / HILL.fall + 10;
      const hAt = (x: number, z: number) => {
        let h = -0.6;
        for (const p of climb) { const d = Math.hypot(p.x - x, p.z - z); h = Math.max(h, p.y - 0.5 - HILL.fall * Math.max(0, d - SHOULDER)); }
        // (rolled a little: spurs and gullies down the slope)
        return h > -0.4 ? h + 1.6 * Math.sin(x * 0.045) * Math.sin(z * 0.05) * Math.min(1, h / 8) : h;
      };
      const x0 = box.min.x - reach, z0 = box.min.z - reach, nx = Math.ceil((box.max.x - box.min.x + 2 * reach) / HILL.cell) + 1, nz = Math.ceil((box.max.z - box.min.z + 2 * reach) / HILL.cell) + 1;
      const pos: number[] = [], idx: number[] = [];
      for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
        const x = x0 + i * HILL.cell, z = z0 + j * HILL.cell;
        pos.push(x, hAt(x, z), z);
        if (i && j) { const p = (j - 1) * nx + i - 1, q = j * nx + i - 1; idx.push(p, q, p + 1, p + 1, q, q + 1); }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
      const hills = new THREE.Mesh(geo, printedGround(toon({ color: '#6b6448', side: THREE.DoubleSide })));
      hills.name = 'hills'; far.add(hills);
      // chaparral over them, darker clumps
      const ms: THREE.Matrix4[] = [];
      for (let k = 0; k < HILL.scrub; k++) {
        const x = x0 + (nx - 1) * HILL.cell * hash(k, 201), z = z0 + (nz - 1) * HILL.cell * hash(k, 202), h = hAt(x, z), sz = 1.5 + 2.5 * hash(k, 203);
        if (h < 1.5 || climb.some((p) => Math.hypot(p.x - x, p.z - z) < SHOULDER + 4)) continue; // (not on the road's verges)
        ms.push(new THREE.Matrix4().compose(new THREE.Vector3(x, h - 0.3, z), new THREE.Quaternion(), new THREE.Vector3(sz * 1.4, sz * 0.7, sz * 1.2)));
      }
      const scrub = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), toon({ color: '#3a4030' }), ms.length);
      ms.forEach((m, i) => scrub.setMatrixAt(i, m));
      far.add(scrub);
    }
  }
  const farUntil = drive.tunnels[0] ? drive.stretches.find((st) => st.tunnel)!.end : 136;

  const smooth = (a: number, b: number, x: number) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
  const ON = [99, 124] as const, on = (t: number) => t > ON[0] && t < ON[1]; // (the coast's props move only while it's seen)
  /** The edge of ON the props were last posed at, while it's not seen. */
  let held = NaN;
  return {
    group: root,
    update(t) {
      // (unseen, the props hold their pose at the nearest edge of ON: never posed, the waves, boats, gulls and strollers
      // all stood at the world's origin, in the intro's street, until the coast had been played once)
      if (on(t)) held = NaN;
      else { const edge = t <= ON[0] ? ON[0] + 1e-3 : ON[1] - 1e-3; if (held !== edge) { this.update(edge); held = edge; } }
      far.visible = t < farUntil;
      // the glitter burns while the sun is low on the water, and goes with it
      const gm = glitter.material as THREE.MeshBasicMaterial;
      gm.opacity = smooth(99, 104, t) * (1 - smooth(112.5, 117, t));
      glitter.visible = gm.opacity > 0.01;
      if (!on(t)) return;
      // the waves: each set rolls in from out past the break to the sand over a period, thinning as it runs up
      waveSegs.forEach(({ s, len, k }, i) => {
        const u = ((t / WAVE.period + k / WAVE.sets) % 1 + 1) % 1, lat = WAVE.from + (WAVE.to - WAVE.from) * u * u * (3 - 2 * u) - 2 * Math.sin(s * 0.05 + k);
        segScale.set(0.4 + 1.6 * Math.sin(Math.PI * Math.min(1, u * 1.2)), 0.06, len);
        segM.copy(frameM(s, lat, -0.05, 0, segScale)); // (a hair over the sea strip)
        waves.setMatrixAt(i, segM);
      });
      waves.instanceMatrix.needsUpdate = true;
      // the boats rock and drift
      for (const { g, k, s, lat } of boats) {
        g.matrix.copy(frameM(s + 0.4 * t, lat, -0.05 + 0.15 * Math.sin(t * 1.3 + k), 0.6 * k));
        g.matrix.multiply(new THREE.Matrix4().makeRotationZ(0.05 * Math.sin(t * 1.1 + k * 2)));
      }
      // the gulls wheel in their circles over the sand
      for (const w of wheeling) {
        const a = t * (0.5 + 0.1 * (w.k % 3)) + w.k * 1.7, s = w.s + w.r * Math.cos(a), lat = w.lat + w.r * Math.sin(a);
        w.g.matrix.copy(frameM(s, lat, w.y + 0.6 * Math.sin(t * 1.4 + w.k), -a));
        flap(w.poses, t, w.k);
      }
      // the players: the ball over the net and back, the players bobbing; the strollers walk the boardwalk
      for (const { g, k } of players) {
        if (k < 0) { const ball = g.getObjectByName('ball')!, u = (t * 0.45 + k * 0.3) % 1, side = Math.floor(t * 0.45 + k * 0.3) % 2 ? 1 : -1; ball.position.set(-0.5 + u, 1.5 + 4.2 * Math.sin(Math.PI * u), side * (3.6 - 7.2 * u)); continue; }
        g.position.y = 0.12 * Math.max(0, Math.sin(t * 3 + k));
      }
      for (const [i, p] of fishers.entries()) p.rotation.z = 0.02 * Math.sin(t * 0.8 + i);
      for (const w of strollers) {
        const s = lo + ((((w.s - lo + w.dir * w.v * t) % span) + span) % span), swing = 0.45 * Math.sin(t * 5.2 * w.v + w.k);
        w.holder.matrix.copy(frameM(s, w.lat, 0.05, w.dir > 0 ? 0 : Math.PI));
        w.p.getObjectByName('legL')!.rotation.x = swing; w.p.getObjectByName('legR')!.rotation.x = -swing;
      }
      if (!plan.fly) return;
      const F0 = plan.fly, flying = t > F0.start - 0.8 && t < F0.end + 2;
      for (const { g, poses, k } of gulls) {
        g.visible = flying;
        if (!flying) continue;
        flap(poses, t, k);
        // ahead of the car, below the sky-writing, crossing left to right with a bob
        const f = drive.carFrame(t), fwd = new THREE.Vector3(f.fwd.x, 0, f.fwd.z).normalize();
        const u = t - F0.start + 0.8;
        const p = f.pos.clone().addScaledVector(fwd, 56 + 7 * k)
          .addScaledVector(f.right, -16 + 5.5 * u + 4 * k)
          .addScaledVector(UP, 20 + 2.2 * k + 0.8 * Math.sin(t * 1.7 + k * 2));
        g.matrix.makeBasis(f.right.clone(), UP.clone(), fwd.clone().negate()).setPosition(p);
      }
    },
  };
}
