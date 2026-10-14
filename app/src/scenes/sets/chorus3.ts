// Chorus 3's props (drive/sets/chorus3.ts): the beach town's welcome arch — its cream band (the lyric is the carriers'),
// a WELCOME TO header in the signs' face, an arc of stepped blocks over it, two pylons, bulbs along the band's foot —
// the numbered lifeguard towers down the sand (their boards are the carriers), and three gulls crossing under the
// "fly" sky-writing. Browser only (canvas).
import * as THREE from 'three';
import type { Drive } from '../../drive/drive';
import { ARCH, type Chorus3Plan, TOWER } from '../../drive/sets/chorus3';
import { BEACH, SEA } from '../../drive/world';
import { SUN_AZ_DEG, COAST_T } from '../../drive/sky';
import { WORLD, toon } from '../../look/toon';
import { GLOW, lampMaterial } from '../../look/night';
import { F } from '../../engine/type';
import { box, canvasTex, onPanel, pic, plane, roadFrame, signFace } from './kit';

export function buildChorus3(drive: Drive): { group: THREE.Group; update(t: number): void } | null {
  const plan = drive.plans.chorus3 as Chorus3Plan | undefined;
  if (!plan) return null;
  const { route } = drive, root = new THREE.Group(), onRoad = roadFrame(route, root);
  const cream = toon({ color: '#f6edd6' }), blue = toon({ color: '#2b4a66' }), wood = toon({ color: '#d9c7a2' });
  const bulb = lampMaterial('#ffe08a', GLOW.lamp, 0.8);

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

  // ---- the lifeguard towers on the beach: a hut on stilts behind each board (toward the water), a blue roof, a ramp
  // down to the sand on the road side, a flag; the board framed as a panel on the hut's wall; its number ----
  // (all in the board's own frame, x along it, y up, z toward the take's eye: the hut stands straight behind the board,
  // so the board hides it but for its stilts below and its flag above — beside it, it stood in front)
  plan.towers.forEach(({ s, board }, i) => {
    const T = TOWER.hut, g = onPanel(board), sand = -(board.center.y - route.frameAt(s).pos.y), hz = -T.back;
    const floor = sand + T.top - T.h, roof = sand + T.top;
    box(g, T.w, T.h, T.d, 0, (floor + roof) / 2, hz, cream);
    box(g, T.w + 0.8, 0.2, T.d + 0.8, 0, roof + 0.1, hz, blue); // its roof
    box(g, T.w + 0.9, 0.06, T.d + 0.9, 0, roof + 0.22, hz, cream); // its roof's cap
    for (const x of [-T.w / 2 + 0.2, T.w / 2 - 0.2]) for (const z of [-T.d / 2 + 0.2, T.d / 2 - 0.2]) {
      box(g, 0.16, T.top - T.h, 0.16, x, (sand + floor) / 2, hz + z, wood); // its stilts, down to the sand
    }
    // the ramp, from the floor down to the sand along the beach, a rail each side
    const run = 4.5, rise = T.top - T.h, rl = Math.hypot(run, rise), tilt = Math.atan2(rise, run);
    const ramp = box(g, rl, 0.08, 1.1, T.w / 2 + run / 2, (sand + floor) / 2, hz, wood); ramp.rotation.z = tilt;
    for (const dz of [-0.6, 0.6]) { const r = box(g, rl, 0.9, 0.05, T.w / 2 + run / 2, (sand + floor) / 2 + 0.45, hz + dz, wood); r.rotation.z = tilt; }
    // the flag on a pole at a back corner
    box(g, 0.06, 2.2, 0.06, -T.w / 2 + 0.4, roof + 1.3, hz - T.d / 2 + 0.4, wood);
    box(g, 0.9, 0.5, 0.02, -T.w / 2 + 0.85, roof + 2.1, hz - T.d / 2 + 0.4, toon({ color: '#c8102e' }));
    // its number, on the hut's end toward the ramp
    const n = plane(g, 0.8, 0.8, T.w / 2 + 0.01, (floor + roof) / 2, hz, pic(signFace(String(7 + i), 128, 128, '#2b4a66', '#f6edd6', F.sign(700), 0.7, 0)));
    n.rotation.y = Math.PI / 2;
    // the board's panel: a blue frame behind the carrier's face, two posts into the sand
    box(g, board.w + 0.4, board.h + 0.4, 0.12, 0, 0, -0.08, blue);
    for (const x of [-board.w / 2 + 0.4, board.w / 2 - 0.4]) box(g, 0.16, -sand + board.h / 2, 0.16, x, (sand + board.h / 2) / 2, -0.1, wood);
    root.add(g);
  });

  // ---- the pier: a deck on piles running out from the beach to sea, a rail, lamps along it, a pavilion at the end ----
  {
    const g = onRoad(plan.pierS, 0), deck = toon({ color: '#6b5a4a' }), pile = toon({ color: '#3a2a24' }), rail = toon({ color: '#8a7a68' });
    const x0 = BEACH - 4, x1 = SEA * 0.62, y = 2.6; // (the frame's +x is left: out to sea)
    box(g, x1 - x0, 0.3, 5, (x0 + x1) / 2, y, 0, deck);
    for (let x = x0 + 2; x < x1; x += 7) for (const dz of [-1.9, 1.9]) box(g, 0.32, y + 0.3, 0.32, x, y / 2 - 0.1, dz, pile);
    for (const dz of [-2.4, 2.4]) { box(g, x1 - x0, 0.06, 0.06, (x0 + x1) / 2, y + 1.15, dz, rail); for (let x = x0 + 1; x < x1; x += 3.5) box(g, 0.08, 1.1, 0.08, x, y + 0.7, dz, rail); }
    for (let x = x0 + 8; x < x1 - 4; x += 16) {
      box(g, 0.12, 3.6, 0.12, x, y + 1.95, 2.6, pile);
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), bulb); b.position.set(x, y + 3.9, 2.6); g.add(b);
    }
    box(g, 9, 3, 7, x1 - 4, y + 1.65, 0, cream); // the pavilion
    box(g, 10, 0.35, 8, x1 - 4, y + 3.3, 0, blue);
    const pt = new THREE.Mesh(new THREE.ConeGeometry(5.5, 2.6, 4), blue); pt.position.set(x1 - 4, y + 4.6, 0); pt.rotation.y = Math.PI / 4; g.add(pt); // its pyramid roof
    for (const dz of [-2.5, 2.5]) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), bulb); b.position.set(x1 - 4, y + 2.4, dz * 1.45); g.add(b); }
    root.add(g);
  }

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

  // ---- the gulls, crossing under the fly line's sky-writing: silhouettes (a body, swept wings), three poses of a
  // flap swapped in turn (they were two rectangles) ----
  const gulls: { g: THREE.Group; poses: THREE.Mesh[]; k: number }[] = [];
  if (plan.fly) {
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
    const texes = [gull(1), gull(0.2), gull(-0.6)];
    for (let k = 0; k < 3; k++) {
      const g = new THREE.Group(); g.matrixAutoUpdate = false;
      const poses = texes.map((tex) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.3), new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2 + 0.3; g.add(m); return m; });
      root.add(g);
      gulls.push({ g, poses, k });
    }
  }

  const UP = new THREE.Vector3(0, 1, 0);
  const smooth = (a: number, b: number, x: number) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
  return {
    group: root,
    update(t) {
      // the glitter burns while the sun is low on the water, and goes with it
      const gm = glitter.material as THREE.MeshBasicMaterial;
      gm.opacity = smooth(99, 104, t) * (1 - smooth(112.5, 117, t));
      glitter.visible = gm.opacity > 0.01;
      if (!plan.fly) return;
      const F0 = plan.fly, on = t > F0.start - 0.8 && t < F0.end + 2;
      for (const { g, poses, k } of gulls) {
        g.visible = on;
        if (!on) continue;
        const beat = Math.floor((t * 7 + k * 1.9) / Math.PI) % 4, pose = beat === 3 ? 1 : beat; // (up, mid, down, mid)
        poses.forEach((m, i) => (m.visible = i === pose));
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
