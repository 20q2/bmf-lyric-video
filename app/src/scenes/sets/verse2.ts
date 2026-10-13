// Verse 2's props (drive/sets/verse2.ts): the fried chicken spot on the corner of Slauson — its tall pole sign at the
// curb (its name over the lightbox), the side street, chalk A-frames on the sidewalk, its white front with a red fascia,
// two big windows (painted: the carriers), the door, the banner's grommets under the eaves, the big sign on its roof
// ringed with bulbs and the chicken standing on it; the hand car wash on the right (its sign an ad: HAND WASH over the
// words, suds and a shining car right of them, the price under; its bays); his giant mural on the end wall of its
// building. The lyrics are the carriers. Browser only (canvas).
import * as THREE from 'three';
import type { Drive } from '../../drive/drive';
import { GIANT, SHACK, type Verse2Plan, WASH } from '../../drive/sets/verse2';
import { ROAD_HALF } from '../../drive/route';
import { WORLD, toon } from '../../look/toon';
import { GLOW, lampMaterial } from '../../look/night';
import { drawAd } from '../../look/adart';
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
  ball(g, 0.8 * k, 0, y + 2.2 * k, -1.4 * k, white).scale.set(0.5, 1.2, 0.7); // its tail
}
/** A row of bulbs along a line in g (from a to b): each takes a material from `ms` in turn (the chase's phases). */
function bulbs(g: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, n: number, ms: readonly THREE.Material[], phase0 = 0) {
  for (let i = 0; i <= n; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), ms[(phase0 + i) % ms.length]!); s.position.copy(a.clone().lerp(b, i / n)); g.add(s); }
}

export function buildVerse2(drive: Drive): { group: THREE.Group; update(t: number): void } | null {
  const plan = drive.plans.verse2 as Verse2Plan | undefined;
  if (!plan) return null;
  const drifting: THREE.Mesh[] = [];
  const { route } = drive, root = new THREE.Group(), onRoad = roadFrame(route, root), front = leftFront(route, root);
  const dark = toon({ color: WORLD.post }), red = '#c8202e';
  // the roof sign's bulbs chase in three phases on the half-beat (classic chicken-shack energy)
  const chase = [0, 1, 2].map(() => lampMaterial('#ffe08a', GLOW.lamp, 0.9));
  const name = (w: number, h: number) => pic(signFace('FRIED CHICKEN', 1024, Math.round((1024 * h) / w), '#fff6e0', red, F.sign(700), 0.56, 0.12));

  // ---- the pole sign at the curb: its name over the lightbox (the lyric's: the carriers), a chicken on top, up on a
  // pole ----
  {
    const P = plan.pole, g = onPanel(P), drop = P.center.y - route.frameAt(P.s).pos.y;
    box(g, P.w + 0.4, P.h + 0.4, 0.5, 0, 0, -0.27, toon({ color: red }));
    plane(g, P.w + 0.4, 1.3, 0, P.h / 2 + 0.9, 0.0, name(P.w + 0.4, 1.3));
    box(g, P.w + 0.4, 1.3, 0.5, 0, P.h / 2 + 0.9, -0.27, toon({ color: '#9a1220' }));
    const top = new THREE.Group(); top.position.set(0, P.h / 2 + 1.55, -0.27); g.add(top); chicken(top, 0, 0.45);
    cyl(g, 0.2, drop - P.h / 2 - 0.2, 0, -(drop + P.h / 2 + 0.2) / 2, -0.27, dark);
    root.add(g);
  }

  // ---- the side street (Slauson): its asphalt off to the left, a crosswalk across its mouth ----
  {
    const C = plan.corner, asphalt = toon({ color: WORLD.asphalt }), paint = new THREE.MeshBasicMaterial({ color: WORLD.dash });
    box(onRoad(C.s, 0), 60, 0.04, C.w, ROAD_HALF + 30, 0.0, 0, asphalt); // (x: the road's left)
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

  // ---- the shop: white, a red fascia with its name, a red base; its windows (painted: the carriers), the door between,
  // the banner's grommets under the eaves, the sign on its roof with the chicken standing on it ----
  let roofChicken!: THREE.Group;
  {
    const B = plan.shop, Sh = SHACK.shop, g = front(B.s, Sh.face), x = (s: number) => s - B.s, w = B.w;
    box(g, w, Sh.h, Sh.d, 0, Sh.h / 2, -Sh.d / 2, toon({ color: '#f7f1e3' }));
    box(g, w + 0.06, 0.5, 0.06, 0, 0.25, 0.03, toon({ color: red }));
    box(g, w + 0.3, 0.8, 0.5, 0, Sh.h - 0.4, 0.2, toon({ color: red }));
    for (let k = 0; k < 3; k++) plane(g, 8, 0.7, -w / 2 + 6 + k * 11, Sh.h - 0.4, 0.46, name(8, 0.7));
    const glass = pic(glassTex()), trim = toon({ color: '#f8f4ea' }), W = Sh.window;
    for (const s of plan.windows) {
      plane(g, W.w, W.h, x(s), W.y, 0.015, glass);
      for (const dy of [-1, 1]) box(g, W.w + 0.24, 0.12, 0.1, x(s), W.y + (dy * (W.h + 0.12)) / 2, 0.04, trim);
      for (const dx of [-1, 1]) box(g, 0.12, W.h, 0.1, x(s) + (dx * (W.w + 0.12)) / 2, W.y, 0.04, trim);
    }
    const door = (plan.windows[0]! + plan.windows[1]!) / 2;
    box(g, 1.3, 2.5, 0.06, x(door), 1.25, 0.03, toon({ color: '#1d2026' }));
    plane(g, 0.8, 1.3, x(door), 1.6, 0.065, glass);
    root.add(g);
    // the banner's grommets (its words and red are the carriers')
    const bn = onPanel(plan.banner), chrome = toon({ color: WORLD.chrome });
    for (const [px, py] of [[-1, 1], [1, 1], [-1, -1], [1, -1]] as const) ball(bn, 0.05, (px * plan.banner.w) / 2 - px * 0.12, (py * plan.banner.h) / 2 - py * 0.1, 0.01, chrome);
    // (one white hem round the whole banner: its phrases are one banner, not three)
    const hem = toon({ color: '#ffffff' }), bw = plan.banner.w, bh = plan.banner.h;
    for (const y of [bh / 2, -bh / 2]) box(bn, bw + 0.08, 0.06, 0.02, 0, y, 0.005, hem);
    for (const x of [bw / 2, -bw / 2]) box(bn, 0.06, bh, 0.02, x, 0, 0.005, hem);
    root.add(bn);
    // the roof sign: its red frame, bulbs round it (chasing), legs down to the roof, the chicken standing on it
    const R = plan.sign, rg = onPanel(R), legs = R.center.y - R.h / 2 - (route.frameAt(B.s).pos.y + Sh.h);
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
    const art = canvasTex(2048, Math.round((2048 * G.h) / G.w), (c) => drawAd(c, 'him', c.canvas.width, c.canvas.height, GIANT.text));
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
        const u = (t * 0.22 + k * 0.37) % 1;
        b.position.y = 0.5 + u * 2.6;
        b.position.x = 5.9 + 0.4 * Math.sin(t * 0.8 + k * 2.1);
        b.scale.setScalar(1 - 0.35 * u);
      });
    },
  };
}
