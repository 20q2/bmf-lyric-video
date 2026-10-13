// The car's cabin fittings (world.ts buildCar puts them on the body): the dash's gauges in front of him, its head unit
// playing the song (art, title, a progress bar; verse 1's radio line is written across the middle of its screen), and
// the two sun visors on the windshield's top rail, folded back flat — hers flips down in verse 1 (scenes/sets/verse1.ts
// turns it), a real mirror on its back for her lipstick. Browser only (canvas).
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { F } from '../engine/type';
import { WORLD, toon } from './toon';
import { HEAD_UNIT, VISOR } from '../drive/cabin';

const UP = new THREE.Vector3(0, 1, 0);
/** A group in a face's own frame (x along it, y its up, z out of it), at p. */
function faceFrame(p: THREE.Vector3, n: THREE.Vector3): THREE.Group {
  const up = UP.clone().addScaledVector(n, -n.dot(UP)).normalize(), g = new THREE.Group();
  g.matrixAutoUpdate = false;
  g.matrix.makeBasis(up.clone().cross(n).normalize(), up, n).setPosition(p);
  return g;
}
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** The head unit's screen: the player round the middle (where the lyric's panel goes), drawn once; its progress redrawn
 *  each second. */
function headUnit(): { mesh: THREE.Mesh; update(t: number, duration: number): void } {
  const W = 1024, H = Math.round((W * HEAD_UNIT.h) / HEAD_UNIT.w), px = W / HEAD_UNIT.w;
  const base = document.createElement('canvas'); base.width = W; base.height = H;
  const b = base.getContext('2d')!;
  b.fillStyle = '#04080a'; b.fillRect(0, 0, W, H);
  // the header: what's playing
  b.fillStyle = '#5f8fa0'; b.textBaseline = 'middle'; b.font = `26px "${F.sign(500)}"`; b.textAlign = 'left'; b.fillText('NOW PLAYING', 26, 34);
  b.textAlign = 'right'; b.fillStyle = '#9fd8ea'; b.fillText('SZA  —  BMF', W - 26, 34);
  b.fillStyle = '#123038'; b.fillRect(26, 58, W - 52, 2);
  // the art (on the right, clear of the wheel): a sunset over the street, a palm, the car
  const ax = W - 26 - 170, ay = 78, as = 170, sky = b.createLinearGradient(0, ay, 0, ay + as);
  sky.addColorStop(0, '#ffb35c'); sky.addColorStop(0.6, '#f28aa8'); sky.addColorStop(1, '#6b3a6e');
  b.fillStyle = sky; b.fillRect(ax, ay, as, as);
  b.fillStyle = '#fff1c8'; b.beginPath(); b.arc(ax + as * 0.62, ay + as * 0.55, as * 0.18, 0, Math.PI * 2); b.fill();
  b.fillStyle = '#2a1830'; b.fillRect(ax, ay + as * 0.8, as, as * 0.2);
  b.fillRect(ax + as * 0.22, ay + as * 0.25, 5, as * 0.6);
  for (let k = 0; k < 6; k++) { b.save(); b.translate(ax + as * 0.22 + 2, ay + as * 0.25); b.rotate(-2.6 + k * 0.95); b.fillRect(0, -3, as * 0.18, 6); b.restore(); }
  b.fillStyle = '#c8102e'; b.fillRect(ax + as * 0.45, ay + as * 0.72, as * 0.4, as * 0.08);
  // the controls under it
  b.fillStyle = '#9fd8ea';
  const tri = (x: number, y: number, s: number, dir: number) => { b.beginPath(); b.moveTo(x, y - s); b.lineTo(x, y + s); b.lineTo(x + dir * s * 1.4, y); b.fill(); };
  const cy = ay + as + 34;
  tri(ax + 30, cy, 11, -1); b.fillRect(ax + 30, cy - 11, 4, 22);
  b.fillRect(ax + as / 2 - 9, cy - 13, 6, 26); b.fillRect(ax + as / 2 + 3, cy - 13, 6, 26);
  tri(ax + as - 34, cy, 11, 1); b.fillRect(ax + as - 34, cy - 11, 4, 22);
  // the middle, where the lyric goes: the title, big, until it does
  const mid = W / 2 + HEAD_UNIT.lyricAt * px, mw = 0.42 * px;
  b.textAlign = 'center'; b.fillStyle = '#5fd8ff'; b.font = `${H * 0.26}px "${F.sign(700)}"`; b.fillText('BMF', mid, H * 0.42, mw);
  b.fillStyle = '#5f8fa0'; b.font = `${H * 0.09}px "${F.sign(500)}"`; b.fillText('SZA', mid, H * 0.62, mw);
  // the level meter on the left
  for (let k = 0; k < 7; k++) { b.fillStyle = k < 5 ? '#1f6f86' : '#8a3a2a'; b.fillRect(30, H * 0.72 - k * 26, 30, 18); }
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d')!, tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  let shown = -1;
  const draw = (t: number, duration: number) => {
    c.drawImage(base, 0, 0);
    // the progress: elapsed, the bar, the length
    const y = H - 40, x0 = 120, x1 = W - 120, u = Math.min(1, Math.max(0, t / duration));
    c.fillStyle = '#123038'; c.fillRect(x0, y - 4, x1 - x0, 8);
    c.fillStyle = '#5fd8ff'; c.fillRect(x0, y - 4, (x1 - x0) * u, 8);
    c.beginPath(); c.arc(x0 + (x1 - x0) * u, y, 10, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#9fd8ea'; c.textBaseline = 'middle'; c.font = `26px "${F.sign(500)}"`;
    c.textAlign = 'left'; c.fillText(fmt(Math.max(0, t)), 26, y); c.textAlign = 'right'; c.fillText(fmt(duration), W - 26, y);
    tex.needsUpdate = true;
  };
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(HEAD_UNIT.w, HEAD_UNIT.h), new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(1.5, 1.5, 1.5) }));
  return { mesh, update(t, duration) { const s = Math.floor(t); if (s !== shown) { shown = s; draw(t, duration); } } };
}

/** A gauge's face: ticks round a dark dial, its needle (the scene turns it), its number. */
function gauge(label: string): THREE.CanvasTexture {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const c = cv.getContext('2d')!;
  c.fillStyle = '#0d0b10'; c.beginPath(); c.arc(128, 128, 126, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#d9d3c4'; c.lineWidth = 6; c.beginPath(); c.arc(128, 128, 118, 0, Math.PI * 2); c.stroke();
  for (let k = 0; k <= 10; k++) {
    const a = Math.PI * (0.75 + 1.5 * (k / 10)), r0 = k % 5 ? 92 : 80;
    c.lineWidth = k % 5 ? 3 : 6; c.beginPath(); c.moveTo(128 + r0 * Math.cos(a), 128 + r0 * Math.sin(a)); c.lineTo(128 + 108 * Math.cos(a), 128 + 108 * Math.sin(a)); c.stroke();
  }
  c.fillStyle = '#d9d3c4'; c.textAlign = 'center'; c.font = `28px "${F.sign(500)}"`; c.fillText(label, 128, 190);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Fits the cabin into the car's body: returns what the scene runs each frame. */
export function buildDash(body: THREE.Group): { update(t: number, duration: number, speed: number): void } {
  const chrome = toon({ color: WORLD.chrome }), dark = toon({ color: '#0d0b10' });
  // the head unit, its chrome bezel round it, set into the dash
  const hu = headUnit(), screen = faceFrame(HEAD_UNIT.pos.clone().addScaledVector(HEAD_UNIT.normal, -0.004), HEAD_UNIT.normal);
  hu.mesh.position.x = -HEAD_UNIT.lyricAt; // (its middle off the lyric's panel's: the art that side)
  screen.add(hu.mesh);
  const bezel = new THREE.Mesh(new THREE.BoxGeometry(HEAD_UNIT.w + 0.04, HEAD_UNIT.h + 0.04, 0.03), chrome);
  bezel.position.set(-HEAD_UNIT.lyricAt, 0, -0.018); screen.add(bezel);
  body.add(screen);
  // the gauges in front of him, tipped back like the screen: a needle each
  const needles: THREE.Object3D[] = [];
  for (const [x, label] of [[0.3, 'MPH'], [0.58, 'RPM']] as const) {
    const g = faceFrame(new THREE.Vector3(x, 1.15, 0.54), HEAD_UNIT.normal);
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.075, 32), new THREE.MeshBasicMaterial({ map: gauge(label), color: new THREE.Color(1.3, 1.3, 1.3) }));
    g.add(face);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.078, 0.008, 6, 32), chrome); g.add(ring);
    const needle = new THREE.Group(); needle.position.z = 0.003; g.add(needle);
    const n = new THREE.Mesh(new THREE.PlaneGeometry(0.006, 0.062), new THREE.MeshBasicMaterial({ color: '#ff3a24' })); n.position.y = 0.028; needle.add(n);
    needles.push(needle);
    body.add(g);
  }
  // the shift indicator in front of him, under the gauges: P R N D L in the signs' face, its D a lamp the last chorus
  // flares on "Put it in drive" (scenes/sets/chorus4.ts, by name)
  {
    const g = faceFrame(new THREE.Vector3(0.44, 1.063, 0.558), HEAD_UNIT.normal);
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 112;
    const c = cv.getContext('2d')!;
    c.fillStyle = '#0d0b10'; c.fillRect(0, 0, 512, 112);
    c.strokeStyle = '#3a3540'; c.lineWidth = 6; c.strokeRect(4, 4, 504, 104);
    c.fillStyle = '#6a7580'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `58px "${F.sign(600)}"`;
    'PRNDL'.split('').forEach((ch, i) => c.fillText(ch, (0.14 + i * 0.18) * 512, 60));
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.057), new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(1.2, 1.2, 1.2) }));
    g.add(strip);
    const bez = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.075, 0.02), chrome); bez.position.z = -0.012; g.add(bez);
    const dcv = document.createElement('canvas'); dcv.width = dcv.height = 96;
    const dc = dcv.getContext('2d')!;
    dc.fillStyle = '#ffb000'; dc.textAlign = 'center'; dc.textBaseline = 'middle'; dc.font = `64px "${F.sign(700)}"`; dc.fillText('D', 48, 52);
    const dtex = new THREE.CanvasTexture(dcv); dtex.colorSpace = THREE.SRGBColorSpace;
    const dLamp = new THREE.Mesh(new THREE.PlaneGeometry(0.062, 0.062), new THREE.MeshBasicMaterial({ map: dtex, transparent: true, color: new THREE.Color(0.35, 0.35, 0.35), depthWrite: false }));
    dLamp.name = 'shiftD';
    dLamp.position.set((0.68 - 0.5) * 0.26, 0.001, 0.002); g.add(dLamp);
    body.add(g);
  }
  // her lipstick, lying against the visor's edge (the mirror verse writes with it: the prop explains the medium)
  {
    const tube = new THREE.Group();
    tube.position.set(-VISOR.x + VISOR.mirror.w / 2 + 0.06, VISOR.mirror.pos.y - VISOR.mirror.h / 2 + 0.012, VISOR.mirror.pos.z + 0.012);
    tube.rotation.z = 1.35; tube.rotation.y = 0.3;
    const caseM = toon({ color: '#15121a' }), red = toon({ color: '#e8173a' });
    const body2 = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.05, 10), caseM); tube.add(body2);
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.0075, 0.009, 0.022, 10), red); tip.position.y = 0.034; tube.add(tip);
    body.add(tube);
  }
  // the visors: hinged on the top rail over each seat, folded back flat; hers (on the car's right: −x) has a mirror
  const M = VISOR.mirror, flaps: THREE.Group[] = [];
  for (const side of [1, -1]) {
    const flap = new THREE.Group(); flap.name = side < 0 ? 'herVisor' : 'hisVisor';
    flap.position.set(side * VISOR.x, VISOR.hinge.y, VISOR.hinge.z); flap.rotation.x = Math.PI / 2;
    const board = faceFrame(new THREE.Vector3(side * VISOR.x, M.pos.y, M.pos.z).sub(flap.position), M.normal);
    const pad = new THREE.Mesh(new THREE.BoxGeometry(M.w + 0.08, M.h + 0.08, 0.03), toon({ color: '#d8c7a8' })); pad.position.z = -0.018; board.add(pad);
    if (side < 0) {
      // (its mirror: the cabin and the sky behind her in it; anything within clipBias of the glass — her lipstick —
      // left out of the reflection)
      const glass = new Reflector(new THREE.PlaneGeometry(M.w, M.h), { textureWidth: 512, textureHeight: 256, color: 0xc4ccd2, clipBias: 0.01 });
      glass.name = 'herMirror'; glass.position.z = 0.0005; board.add(glass);
      for (const [w, h, x, y] of [[M.w + 0.02, 0.01, 0, M.h / 2 + 0.005], [M.w + 0.02, 0.01, 0, -M.h / 2 - 0.005], [0.01, M.h, M.w / 2 + 0.005, 0], [0.01, M.h, -M.w / 2 - 0.005, 0]] as const) {
        const e = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.008), chrome); e.position.set(x, y, 0); board.add(e);
      }
    } else void dark;
    flap.add(board); body.add(flap); flaps.push(flap);
  }
  return {
    update(t, duration, speed) {
      hu.update(t, duration);
      // (the speedo reads their speed, the tach climbs with it, wobbling)
      needles[0]!.rotation.z = Math.PI * 0.75 - Math.min(1, speed / 40) * Math.PI * 1.5;
      needles[1]!.rotation.z = Math.PI * 0.75 - Math.min(1, 0.15 + speed / 60 + 0.03 * Math.sin(t * 7)) * Math.PI * 1.5;
    },
  };
}
