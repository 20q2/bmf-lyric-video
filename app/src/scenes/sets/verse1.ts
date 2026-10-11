// Verse 1's props (drive/sets/verse1.ts places them and the lyrics on them): the speed trailer by the road; the
// intersection (stop line, crosswalks, the cross street, the light on its mast, the DONT WALK hand); the bus in the
// other lane with its wrap ad, pulling up and away; the bus bench on the corner; the pickup ahead at the light, going on
// green; the burger stand with its menu board, its order screen and the receipt's slot. Browser only (canvas).
import * as THREE from 'three';
import type { Drive } from '../../drive/drive';
import { LANE } from '../../drive/drive';
import { AT, TAILGATE, type Verse1Plan, aheadS, busS } from '../../drive/sets/verse1';
import { ROAD_HALF } from '../../drive/route';
import { WORLD, toon } from '../../look/toon';
import { GLOW, lampMaterial } from '../../look/night';
import { drawAd } from '../../look/adart';
import { F, font } from '../../engine/type';
import { TEXT_SHARE } from '../../drive/ads';

const UP = new THREE.Vector3(0, 1, 0);
type Panel = Verse1Plan['panels'][keyof Verse1Plan['panels']];

/** A canvas texture `w` x `h` px drawn by `draw`. */
function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d')!);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
const box = (g: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material) => {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); return b;
};
const cyl = (g: THREE.Object3D, r: number, h: number, x: number, y: number, z: number, m: THREE.Material) => {
  const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 12), m); c.position.set(x, y, z); g.add(c); return c;
};
const plane = (g: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, m: THREE.Material) => {
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.set(x, y, z); g.add(p); return p;
};
/** A group in a panel's own frame (x along its text, y its up, z out of its face), origin at its centre. */
function onPanel(p: Panel): THREE.Group {
  const g = new THREE.Group(), along = p.up.clone().cross(p.normal).normalize();
  g.matrixAutoUpdate = false;
  g.matrix.makeBasis(along, p.up, p.normal).setPosition(p.center);
  return g;
}

export function buildVerse1(drive: Drive): { group: THREE.Group; update(t: number): void } | null {
  const plan = drive.plans.verse1 as Verse1Plan | undefined;
  if (!plan) return null;
  const { route } = drive, P = plan.panels, root = new THREE.Group();
  /** A group in the road's frame at s (like the car's: x to the road's left, y up, z forward), `lateral` right of its
   *  centre, on its surface. */
  const onRoad = (s: number, lateral: number) => {
    const f = route.frameAt(s), g = new THREE.Group(), fwd = new THREE.Vector3(f.fwd.x, 0, f.fwd.z).normalize(), right = new THREE.Vector3(f.right.x, 0, f.right.z).normalize();
    g.matrixAutoUpdate = false;
    g.matrix.makeBasis(right.negate(), UP, fwd).setPosition(f.pos.clone().addScaledVector(f.right, lateral));
    return g;
  };
  const dark = toon({ color: WORLD.post }), white = new THREE.MeshBasicMaterial({ color: '#f1ece0' }), black = toon({ color: '#1b1820' });

  // ---- the speed trailer: its display (the lyric's rows), a header over it, on a mast on a little trailer ----
  {
    const g = onPanel(P.trailer), { w, h } = P.trailer, drop = P.trailer.center.y - P.trailer.ground;
    box(g, w + 0.24, h + 0.62, 0.14, 0, 0.19, -0.09, black);
    const head = canvasTex(512, 120, (c) => {
      c.fillStyle = '#f4f2ea'; c.fillRect(0, 0, 512, 120);
      c.fillStyle = '#16131a'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = font(F.archivo(100, 900), 64); c.fillText('YOUR SPEED', 256, 62);
    });
    plane(g, w, 0.42, 0, h / 2 + 0.27, 0.0, new THREE.MeshBasicMaterial({ map: head }));
    box(g, 0.14, drop - h / 2 - 0.1, 0.14, 0, -(drop + h / 2) / 2 - 0.05, -0.2, dark);
    box(g, 1.7, 0.5, 1.2, 0, -drop + 0.55, -0.6, toon({ color: '#e8a33a' }));
    for (const x of [-0.75, 0.75]) { const wh = cyl(g, 0.28, 0.18, x, -drop + 0.28, -0.6, black); wh.rotation.z = Math.PI / 2; }
    root.add(g);
  }

  // ---- the intersection: the stop line, crosswalks, the cross street, the light on its mast, the DONT WALK hand ----
  const lightOn: { red: THREE.Object3D[]; green: THREE.Object3D[] } = { red: [], green: [] };
  {
    const s0 = plan.stopS, paint = new THREE.MeshBasicMaterial({ color: WORLD.dash }), asphalt = toon({ color: WORLD.asphalt });
    const at = (ds: number, lateral = 0) => onRoad(s0 + ds, lateral);
    const line = at(AT.stopLine); box(line, ROAD_HALF, 0.02, 0.45, -ROAD_HALF / 2, 0.03, 0, paint); root.add(line); // (their half)
    for (const [a, b] of [[AT.cross[0] - 2.6, AT.cross[0] - 0.2], [AT.cross[1] + 0.2, AT.cross[1] + 2.6]] as const) {
      const g = at((a + b) / 2);
      for (let x = -ROAD_HALF + 0.4; x < ROAD_HALF; x += 1) box(g, 0.5, 0.02, b - a, x, 0.03, 0, paint);
      root.add(g);
    }
    const [c0, c1] = AT.cross, cross = at((c0 + c1) / 2);
    for (const side of [-1, 1]) box(cross, 60, 0.04, c1 - c0, side * (ROAD_HALF + 30), 0.0, 0, asphalt);
    root.add(cross);
    // the light: a mast on the far right corner, its arm out over the lanes, a head over each, facing them
    const mast = at(AT.signal, ROAD_HALF + 1.4);
    cyl(mast, 0.12, 6.2, 0, 3.1, 0, dark);
    box(mast, ROAD_HALF + 3.6, 0.16, 0.16, (ROAD_HALF + 3.6) / 2, 5.9, 0, dark); // (out over the road: to its left)
    for (const x of [ROAD_HALF + 1.4 - LANE, ROAD_HALF + 1.4 + LANE]) {
      box(mast, 0.42, 1.2, 0.32, x, 5.25, 0, black);
      for (const [k, color] of [[0, '#ff2a24'], [1, '#ffb000'], [2, '#3dff7a']] as const) {
        const y = 5.62 - k * 0.37, off = plane(mast, 0.24, 0.24, x, y, -0.17, toon({ color: '#2a2630' }));
        off.rotation.y = Math.PI;
        if (k === 1) continue;
        const on = plane(mast, 0.24, 0.24, x, y, -0.172, lampMaterial(color, GLOW.lamp, 1.4)); on.rotation.y = Math.PI;
        (k === 0 ? lightOn.red : lightOn.green).push(on);
      }
    }
    root.add(mast);
    // the near corner: the DONT WALK hand on its pole, by the bench
    const ped = at(AT.stopLine - 0.6, ROAD_HALF + 0.7);
    cyl(ped, 0.07, 3.2, 0, 1.6, 0, dark);
    box(ped, 0.42, 0.42, 0.3, 0, 2.7, 0, black);
    const hand = canvasTex(128, 128, (c) => {
      c.fillStyle = '#ff7a1a'; c.beginPath(); c.roundRect(38, 40, 52, 60, 10); c.fill();
      for (let i = 0; i < 4; i++) { c.beginPath(); c.roundRect(38 + i * 13.5, 14, 11, 40, 5); c.fill(); }
      c.beginPath(); c.roundRect(20, 58, 24, 11, 5); c.fill();
    });
    const lit = plane(ped, 0.34, 0.34, 0, 2.7, -0.16, new THREE.MeshBasicMaterial({ map: hand, transparent: true, color: new THREE.Color(2, 2, 2) }));
    lit.rotation.y = Math.PI;
    root.add(ped);
  }

  // ---- the bus in the other lane, its wrap ad on the side facing them ----
  const bus = new THREE.Group();
  {
    const body = toon({ color: '#ece6d6' }), stripe = toon({ color: '#e0682b' });
    bus.matrixAutoUpdate = false;
    const inner = new THREE.Group(); bus.add(inner);
    box(inner, 2.5, 2.9, 11, 0, 0.35 + 1.45, 0, body);
    box(inner, 2.52, 0.18, 11.02, 0, 0.9, 0, stripe);
    box(inner, 2.52, 0.9, 10.4, 0, 2.55, 0.1, black); // the windows, round the far side and the ends
    for (const z of [-3.6, 3.8]) for (const x of [-1.15, 1.15]) { const wh = cyl(inner, 0.5, 0.3, x, 0.5, z, black); wh.rotation.z = Math.PI / 2; }
    // the wrap: the ad, its product on the right of its lyric's rows (the carriers), over the windows on this side
    const { w, h } = P.bus, share = TEXT_SHARE.bus ?? 0.66;
    const art = canvasTex(1024, Math.round((1024 * (h + 0.3)) / (w + 0.4)), (c) => drawAd(c, plan.busAd, c.canvas.width, c.canvas.height, share));
    const ad = plane(inner, w + 0.4, h + 0.3, -1.27, P.bus.center.y - P.bus.ground, 0, new THREE.MeshBasicMaterial({ map: art })); // (its right: toward them)
    ad.rotation.y = -Math.PI / 2;
    root.add(bus);
  }

  // ---- the bus bench on the corner: its back is the ad (the lyric's rows), on a seat ----
  {
    const g = onPanel(P.bench), { w, h } = P.bench, drop = P.bench.center.y - P.bench.ground;
    box(g, w + 0.16, h + 0.16, 0.08, 0, 0, -0.06, toon({ color: '#163d7a' }));
    box(g, w + 0.1, 0.08, 0.5, 0, -h / 2 - 0.12, 0.25, toon({ color: '#c9c2b0' }));
    for (const x of [-w / 2 + 0.1, w / 2 - 0.1]) box(g, 0.08, drop - h / 2, 0.5, x, -(drop + h / 2) / 2, 0.25, dark);
    // the stop's sign beside it
    cyl(g, 0.05, 3, w / 2 + 0.6, -drop + 1.5, 0.3, dark);
    const stop = canvasTex(160, 220, (c) => {
      c.fillStyle = '#e0682b'; c.fillRect(0, 0, 160, 220); c.fillStyle = '#ffffff'; c.textAlign = 'center';
      c.font = font(F.archivo(75, 900), 70); c.fillText('BUS', 80, 90); c.font = font(F.archivo(75, 700), 34); c.fillText('LINE 207', 80, 160);
    });
    plane(g, 0.4, 0.55, w / 2 + 0.6, -drop + 2.75, 0.36, new THREE.MeshBasicMaterial({ map: stop }));
    root.add(g);
  }

  // ---- the pickup ahead at the light: its tailgate carries the stickers and the plate (the carriers) ----
  const pickup = new THREE.Group();
  {
    pickup.matrixAutoUpdate = false;
    const paint = toon({ color: '#8fb3cf' }), chrome = toon({ color: WORLD.chrome }), B = AT.ahead.back;
    box(pickup, 1.9, 0.55, 5.4, 0, 0.62, 0.05, paint); // the body, low
    box(pickup, 1.86, 0.85, 1.6, 0, 1.3, 0.75, paint); // the cab
    box(pickup, 1.7, 0.5, 0.05, 0, 1.4, 1.56, black); // its windshield
    box(pickup, 1.7, 0.45, 0.05, 0, 1.45, -0.06, black); // its back window
    for (const x of [-0.92, 0.92]) box(pickup, 0.06, 0.45, 2.6, x, 1.12, -1.4, paint); // the bed's sides
    box(pickup, 1.9, TAILGATE.top - TAILGATE.bottom, 0.08, 0, (TAILGATE.top + TAILGATE.bottom) / 2, -B + 0.04, paint); // the tailgate
    box(pickup, 2, 0.16, 0.14, 0, 0.36, -B - 0.02, chrome);
    for (const x of [-0.78, 0.78]) plane(pickup, 0.14, 0.22, x, 1.08, -B - 0.01, lampMaterial('#ff2a24', GLOW.tail, 1.1)).rotation.y = Math.PI;
    for (const z of [1.55, -1.6]) for (const x of [-0.85, 0.85]) { const wh = cyl(pickup, 0.36, 0.26, x, 0.36, z, black); wh.rotation.z = Math.PI / 2; }
    root.add(pickup);
  }

  // ---- the burger stand: its building, its roof sign, the menu board on posts, the order screen on its pole ----
  {
    const s0 = plan.standS, bldg = onRoad(s0 + 5, ROAD_HALF + 6.5);
    box(bldg, 5, 3.4, 10, 0, 1.7, 0, toon({ color: '#f6dd8f' }));
    box(bldg, 5.1, 0.35, 10.1, 0, 3.3, 0, toon({ color: '#d23a2a' }));
    box(bldg, 0.05, 1.2, 2.4, 2.53, 1.6, -1.5, black); // its window, on the road (its left)
    const sign = canvasTex(1024, 256, (c) => {
      c.fillStyle = '#d23a2a'; c.fillRect(0, 0, 1024, 256); c.fillStyle = '#fff1d0'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = font(F.archivo(125, 900), 170); c.fillText('BURGERS', 512, 136);
    });
    const roof = plane(bldg, 7, 1.75, 2.2, 4.6, 0, new THREE.MeshBasicMaterial({ map: sign })); roof.rotation.y = Math.PI / 2;
    box(bldg, 0.12, 1.2, 0.12, 2.2, 3.6, -2.8, dark); box(bldg, 0.12, 1.2, 0.12, 2.2, 3.6, 2.8, dark);
    root.add(bldg);
    // the menu board: dark, framed, on two posts, MENU over it
    const m = onPanel(P.menu), { w, h } = P.menu, drop = P.menu.center.y - P.menu.ground;
    box(m, w + 0.2, h + 0.5, 0.1, 0, 0.15, -0.07, toon({ color: '#3a2a22' }));
    const head = canvasTex(512, 96, (c) => {
      c.fillStyle = '#d23a2a'; c.fillRect(0, 0, 512, 96); c.fillStyle = '#fff1d0'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = font(F.archivo(100, 900), 62); c.fillText('MENU', 256, 52);
    });
    plane(m, w, 0.32, 0, h / 2 + 0.2, 0.0, new THREE.MeshBasicMaterial({ map: head }));
    for (const x of [-w / 2 + 0.2, w / 2 - 0.2]) box(m, 0.1, drop - h / 2, 0.1, x, -(drop + h / 2) / 2, -0.1, dark);
    root.add(m);
    // the order screen on its pole, the receipt's slot under it
    const o = onPanel(P.order), oh = P.order.h, odrop = P.order.center.y - P.order.ground;
    box(o, P.order.w + 0.14, oh + 0.14, 0.12, 0, 0, -0.08, black);
    box(o, 0.12, odrop - oh / 2, 0.12, 0, -(odrop + oh / 2) / 2, -0.12, dark);
    box(o, P.receipt.w + 0.1, 0.07, 0.1, 0, -oh / 2 - 0.035, -0.06, black); // (the slot, behind the paper)
    root.add(o);
  }

  const place = (g: THREE.Group, s: number, lateral: number) => { g.matrix.copy(onRoad(s, lateral).matrix); };
  return {
    group: root,
    update(t) {
      const green = t >= plan.green;
      for (const o of lightOn.red) o.visible = !green;
      for (const o of lightOn.green) o.visible = green;
      place(bus, busS(plan, t), -LANE);
      place(pickup, aheadS(plan, t), LANE);
      bus.visible = Math.abs(busS(plan, t) - plan.stopS) < 400;
    },
  };
}
