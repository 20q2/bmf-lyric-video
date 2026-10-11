// Verse 1's props (drive/sets/verse1.ts places them and the lyrics on them): the speed trailer by the road; the bus
// they tailgate, its tail ad, turning off right at a cross street (the light green, the crosswalks, the DONT WALK hand);
// the van ahead, closing in; her phone in her hand; the burger stand with its menu board and its marquee on a pole. (The
// city's blocks are the drive's: blocks.ts.) Browser only (canvas).
import * as THREE from 'three';
import type { Drive } from '../../drive/drive';
import { LANE } from '../../drive/drive';
import { carMatrix } from '../../drive/carriers';
import { AT, BUS, PACE, VAN, type Verse1Plan, vanAheadAt, vanThere } from '../../drive/sets/verse1';
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
const wheel = (g: THREE.Object3D, r: number, x: number, z: number, m: THREE.Material) => { const w = cyl(g, r, 0.28, x, r, z, m); w.rotation.z = Math.PI / 2; };
/** A group in a panel's own frame (x along its text, y its up, z out of its face), origin at its centre. */
function onPanel(p: Panel): THREE.Group {
  const g = new THREE.Group(), along = p.up.clone().cross(p.normal).normalize();
  g.matrixAutoUpdate = false;
  g.matrix.makeBasis(along, p.up, p.normal).setPosition(p.center);
  return g;
}
const moving = () => { const g = new THREE.Group(); g.matrixAutoUpdate = false; return g; };

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
  const dark = toon({ color: WORLD.post }), black = toon({ color: '#1b1820' }), tail = lampMaterial('#ff2a24', GLOW.tail, 1.1);

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

  // ---- the cross street the bus turns into: crosswalks, its asphalt, the light (green for them), the DONT WALK hand ----
  {
    const paint = new THREE.MeshBasicMaterial({ color: WORLD.dash }), asphalt = toon({ color: WORLD.asphalt }), half = 4.25;
    for (const ds of [-half - 1.4, half + 1.4]) {
      const g = onRoad(plan.crossS + ds, 0);
      for (let x = -ROAD_HALF + 0.4; x < ROAD_HALF; x += 1) box(g, 0.5, 0.02, 2.4, x, 0.03, 0, paint);
      root.add(g);
    }
    const cross = onRoad(plan.crossS, 0);
    for (const side of [-1, 1]) box(cross, 60, 0.04, 2 * half, side * (ROAD_HALF + 30), 0, 0, asphalt);
    root.add(cross);
    const mast = onRoad(plan.crossS + half + 3, ROAD_HALF + 1.4);
    cyl(mast, 0.12, 6.2, 0, 3.1, 0, dark);
    box(mast, ROAD_HALF + 3.6, 0.16, 0.16, (ROAD_HALF + 3.6) / 2, 5.9, 0, dark); // (out over the road: to its left)
    for (const x of [ROAD_HALF + 1.4 - LANE, ROAD_HALF + 1.4 + LANE]) {
      box(mast, 0.42, 1.2, 0.32, x, 5.25, 0, black);
      for (const k of [0, 1, 2]) {
        const p = plane(mast, 0.24, 0.24, x, 5.62 - k * 0.37, -0.17, k < 2 ? toon({ color: '#2a2630' }) : lampMaterial('#3dff7a', GLOW.lamp, 1.4));
        p.rotation.y = Math.PI;
      }
    }
    root.add(mast);
    const ped = onRoad(plan.crossS - half - 3, ROAD_HALF + 0.7);
    cyl(ped, 0.07, 3.2, 0, 1.6, 0, dark);
    box(ped, 0.42, 0.42, 0.3, 0, 2.7, 0, black);
    const hand = canvasTex(128, 128, (c) => {
      c.fillStyle = '#ff7a1a'; c.beginPath(); c.roundRect(38, 40, 52, 60, 10); c.fill();
      for (let i = 0; i < 4; i++) { c.beginPath(); c.roundRect(38 + i * 13.5, 14, 11, 40, 5); c.fill(); }
      c.beginPath(); c.roundRect(20, 58, 24, 11, 5); c.fill();
    });
    plane(ped, 0.34, 0.34, 0, 2.7, -0.16, new THREE.MeshBasicMaterial({ map: hand, transparent: true, color: new THREE.Color(2, 2, 2) })).rotation.y = Math.PI;
    root.add(ped);
  }

  // ---- the bus they tailgate: its tail ad (the lyric's rows over it), turning off at the cross street ----
  const bus = moving();
  {
    const body = toon({ color: '#ece6d6' }), stripe = toon({ color: '#e0682b' }), H = BUS.half;
    box(bus, 2.5, 2.9, 2 * H, 0, 0.35 + 1.45, 0, body);
    box(bus, 2.52, 0.18, 2 * H + 0.02, 0, 0.9, 0, stripe);
    box(bus, 2.52, 0.9, 2 * H - 1.2, 0, 2.55, 0.3, black); // the windows down its sides
    for (const z of [-H + 1.9, H - 1.7]) for (const x of [-1.15, 1.15]) wheel(bus, 0.5, x, z, black);
    for (const x of [-1.05, 1.05]) plane(bus, 0.2, 0.3, x, 0.75, -H - 0.01, tail).rotation.y = Math.PI;
    const { w, h, pos } = plan.tailAd, share = TEXT_SHARE.bus ?? 0.8;
    const art = canvasTex(1024, Math.round((1024 * (h + 0.2)) / (w + 0.08)), (c) => drawAd(c, plan.busAd, c.canvas.width, c.canvas.height, share));
    plane(bus, w + 0.08, h + 0.2, 0, pos.y, -H - 0.02, new THREE.MeshBasicMaterial({ map: art })).rotation.y = Math.PI;
    root.add(bus);
  }

  // ---- the van ahead of the bus: its back doors carry the stickers, its bumper the plate (the carriers) ----
  const van = moving();
  {
    const paint = toon({ color: '#d9d4c7' }), chrome = toon({ color: WORLD.chrome }), H = VAN.half;
    box(van, 2.0, 2.0, 2 * H, 0, 0.35 + 1.0, 0, paint);
    box(van, 0.02, VAN.doors[1] - VAN.doors[0], 0.02, 0, (VAN.doors[0] + VAN.doors[1]) / 2, -H - 0.01, black); // the doors' seam
    box(van, 2.06, 0.16, 0.14, 0, 0.36, -H - 0.04, chrome);
    for (const x of [-0.9, 0.9]) plane(van, 0.14, 0.3, x, 1.0, -H - 0.01, tail).rotation.y = Math.PI;
    for (const z of [-H + 0.8, H - 0.9]) for (const x of [-0.9, 0.9]) wheel(van, 0.36, x, z, black);
    root.add(van);
  }

  // ---- her phone, in her hand: the screen's rows are the carriers; the phone round them ----
  const phone = moving();
  {
    const p = plan.phone, along = p.up.clone().cross(p.normal).normalize(), slab = new THREE.Group();
    slab.matrixAutoUpdate = false;
    slab.matrix.makeBasis(along, p.up, p.normal).setPosition(p.pos);
    const body = new THREE.Mesh(new THREE.BoxGeometry(p.w + 0.024, p.h + 0.05, 0.012), toon({ color: '#121016' }));
    body.position.z = -0.008; slab.add(body);
    phone.add(slab);
    root.add(phone);
  }

  // ---- her sun visor, hinged on the windshield's top rail, flipping down: its mirror carries her lipstick (the
  // carriers) ----
  const visor = moving(), flap = new THREE.Group();
  {
    const Mi = AT.mirror, hinge = new THREE.Vector3(Mi.pos.x, 1.46, 0.9);
    visor.add(flap); flap.position.copy(hinge);
    // (hanging down from the hinge: the mirror on its back, toward her, a padded board round it; in the mirror's own
    // frame, like its carriers)
    const board = new THREE.Group(); flap.add(board);
    const up = new THREE.Vector3(0, 1, 0).addScaledVector(Mi.normal, -Mi.normal.y).normalize();
    board.matrixAutoUpdate = false;
    board.matrix.makeBasis(up.clone().cross(Mi.normal).normalize(), up, Mi.normal).setPosition(Mi.pos.clone().sub(hinge));
    const pad = new THREE.Mesh(new THREE.BoxGeometry(Mi.w + 0.06, Mi.h + 0.06, 0.03), toon({ color: '#d8c7a8' }));
    pad.position.z = -0.02; board.add(pad);
    root.add(visor);
  }

  // ---- the burger stand: its building and roof sign, the menu board on posts, the marquee up on its pole ----
  {
    const s0 = plan.menuS, bldg = onRoad(s0 + 4, ROAD_HALF + 6.5);
    box(bldg, 5, 3.4, 12, 0, 1.7, 0, toon({ color: '#f6dd8f' }));
    box(bldg, 5.1, 0.35, 12.1, 0, 3.3, 0, toon({ color: '#d23a2a' }));
    box(bldg, 0.05, 1.2, 2.4, 2.53, 1.6, -2, black); // its window, on the road (its left)
    const sign = canvasTex(1024, 256, (c) => {
      c.fillStyle = '#d23a2a'; c.fillRect(0, 0, 1024, 256); c.fillStyle = '#fff1d0'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = font(F.archivo(125, 900), 170); c.fillText('BURGERS', 512, 136);
    });
    plane(bldg, 7, 1.75, 2.2, 4.6, 0, new THREE.MeshBasicMaterial({ map: sign })).rotation.y = Math.PI / 2;
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
    // the marquee: changeable letters on a lit board in a red frame, BURGERS over it, up on its pole
    const q = onPanel(P.marquee), qw = P.marquee.w, qh = P.marquee.h, qdrop = P.marquee.center.y - P.marquee.ground;
    box(q, qw + 0.3, qh + 0.3, 0.3, 0, 0, -0.17, toon({ color: '#d23a2a' }));
    const top = canvasTex(1024, 256, (c) => {
      c.fillStyle = '#ffd65a'; c.fillRect(0, 0, 1024, 256); c.fillStyle = '#d23a2a'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = font(F.archivo(125, 900), 180); c.fillText('BURGERS', 512, 136);
    });
    plane(q, qw + 0.3, 0.95, 0, qh / 2 + 0.62, -0.02, new THREE.MeshBasicMaterial({ map: top, color: new THREE.Color(1.3, 1.3, 1.3) }));
    box(q, 0.3, qdrop - qh / 2 - 0.15, 0.3, 0, -(qdrop + qh / 2) / 2 - 0.07, -0.2, dark);
    root.add(q);
  }

  /** The bus at t: waiting at its stop, pulling out ahead of them into their lane, riding ahead of them until it
   *  turns, then on and round the corner into the cross street. */
  const busMatrix = (t: number): THREE.Matrix4 => {
    if (t < plan.joinAt) {
      const tA = plan.joinV / BUS.accel, left = Math.min(tA, plan.joinAt - t), u = 1 - left / tA, e = u * u * (3 - 2 * u);
      const s = drive.motion.distanceAt(plan.joinAt) + plan.busAhead - (plan.joinV * left - 0.5 * BUS.accel * left * left);
      const f = route.frameAt(s), fwd = new THREE.Vector3(f.fwd.x, 0, f.fwd.z).normalize(), right = new THREE.Vector3(f.right.x, 0, f.right.z).normalize();
      return new THREE.Matrix4().makeBasis(right.clone().negate(), UP, fwd).setPosition(f.pos.clone().addScaledVector(f.right, BUS.curb + (LANE - BUS.curb) * e));
    }
    if (t <= plan.turnAt) return carMatrix(drive.carFrame(t, plan.busAhead));
    const f = drive.carFrame(plan.turnAt, plan.busAhead), fwd = new THREE.Vector3(f.fwd.x, 0, f.fwd.z).normalize(), right = new THREE.Vector3(f.right.x, 0, f.right.z).normalize();
    const d = (t - plan.turnAt) * PACE.cruise, arc = (BUS.R * Math.PI) / 2, C = f.pos.clone().addScaledVector(fwd, BUS.lead).addScaledVector(right, BUS.R);
    let pos: THREE.Vector3, head: THREE.Vector3;
    if (d < BUS.lead) { pos = f.pos.clone().addScaledVector(fwd, d); head = fwd; }
    else if (d < BUS.lead + arc) {
      const a = (d - BUS.lead) / BUS.R;
      pos = C.clone().addScaledVector(right, -BUS.R * Math.cos(a)).addScaledVector(fwd, BUS.R * Math.sin(a));
      head = fwd.clone().multiplyScalar(Math.cos(a)).addScaledVector(right, Math.sin(a));
    } else { pos = C.clone().addScaledVector(fwd, BUS.R).addScaledVector(right, d - BUS.lead - arc); head = right; }
    return new THREE.Matrix4().makeBasis(UP.clone().cross(head).normalize(), UP, head).setPosition(pos);
  };
  return {
    group: root,
    update(t) {
      // (they're only there for the verse: the bus from its stop, the van once the bus is out of its way)
      bus.visible = t >= plan.start - BUS.early && t < plan.turnAt + BUS.gone;
      if (bus.visible) bus.matrix.copy(busMatrix(t));
      van.visible = vanThere(plan, t);
      if (van.visible) van.matrix.copy(carMatrix(drive.carFrame(t, vanAheadAt(plan, t))));
      phone.matrix.copy(carMatrix(drive.carFrame(t)));
      phone.visible = plan.phone.held.some(([a, b]) => t >= a && t < b);
      // her visor: up against the rail, flipping down for her line, back up after
      visor.visible = t >= plan.visor.down - 0.5 && t < plan.visor.up + AT.mirror.flip;
      if (visor.visible) {
        visor.matrix.copy(carMatrix(drive.carFrame(t)));
        const down = Math.min(1, Math.max(0, (t - plan.visor.down) / AT.mirror.flip)) * (1 - Math.min(1, Math.max(0, (t - plan.visor.up) / AT.mirror.flip)));
        flap.rotation.x = (-Math.PI / 2) * (1 - down * down * (3 - 2 * down));
      }
    },
  };
}
