// The coda (the user, 2026-10-25): a short clip after the video's end card, pointing at the site. The opening plays
// again from outside the video: a spectator's crane over the corner while the car waits at the red light, the video's
// camera standing in the world at work (explore/rig.ts), coming to rest behind the liquor store over its flat roof,
// where EXPLORE THE SET is painted, as the light goes green on the first kick and the car pulls away left to right
// across the top of the frame. Rendered on its own (render.ts video --coda: song time CODA.from..to, the song's opening
// under it) and joined onto the video (scripts/append-coda.ts); ?coda=1 in the player plays it live.
// Browser (the paint's canvas) and bun (the rest).
import * as THREE from 'three';
import type { Drive } from '../drive/drive';
import { LIQUOR } from '../drive/sets/intro';
import { F, font } from '../engine/type';
import { toon } from '../look/toon';
import type { Eye } from './view';

/** The song time it plays (s: the guitar intro's second half, the green on the first kick at 15.6, the car away), and
 *  its fades from and to black (s). */
export const CODA = { from: 6, to: 21, fadeIn: 0.8, fadeOut: 1.4 };
export const CODA_ON = typeof location !== 'undefined' && new URLSearchParams(location.search).has('coda');
/** The paint's words: the call, then what's there, then where. */
export const CODA_WORDS = ['EXPLORE THE SET', 'fly around it live in your browser', 'source on GitHub · link in the description'] as const;
/** The painted panel on the roof (m, in the store's frame: x along the road backward, z toward the road, its front at 0;
 *  behind the roof sign, which stands 1.6 m back from the front); the spectator's lens (degrees); how big the video's
 *  camera stands in it (times its own size: from 20–30 m off it read as a speck). */
export const PAINT = { w: 12.4, h: 8.2, z: -7.3 };
export const LENS_FOV = 42;
export const RIG_SIZE = 2;

const UP = new THREE.Vector3(0, 1, 0);
const smooth = (x: number) => { const u = Math.min(1, Math.max(0, x)); return u * u * (3 - 2 * u); };

/** The liquor store's frame (as scenes/sets/intro.ts builds it: kit.ts rightFront). */
export function storeFrame(drive: Drive) {
  const L = LIQUOR, s = (L.s[0] + L.s[1]) / 2, f = drive.route.frameAt(s);
  const fwd = new THREE.Vector3(f.fwd.x, 0, f.fwd.z).normalize(), right = new THREE.Vector3(f.right.x, 0, f.right.z).normalize();
  return new THREE.Matrix4().makeBasis(fwd.clone().negate(), UP, right.clone().negate()).setPosition(f.pos.clone().addScaledVector(f.right, L.back));
}

/** The spectator's crane through song time: keys (s; the eye and where it looks, world), joined by one smooth curve
 *  up to the roof, then a slow push in while the words are read. */
export function cranePath(drive: Drive, store: THREE.Matrix4) {
  const c = drive.carFrame(0), fwd = c.fwd.clone().setY(0).normalize(), left = c.right.clone().setY(0).normalize().negate(), h = LIQUOR.h;
  const at = (a: number, l: number, y: number) => c.pos.clone().addScaledVector(fwd, a).addScaledVector(left, l).addScaledVector(UP, y);
  const local = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).applyMatrix4(store);
  // behind the car and up off its left, the corner ahead; risen over the left side of the intersection, looking across
  // at the store; behind the store, over its roof, looking down across the paint to the road
  const eyes = [at(-26, 9, 16), at(8, 7, 24), local(0, h + 13, -20)];
  const aims = [at(6, 0, 1), at(22, -9, 3), local(0, h, -5.6)];
  const keys = [CODA.from, 10.5, 15.2];
  const rest = { eye: local(0, h + 11.2, -17.6), aim: local(0, h, -5.2) };
  const eyeCurve = new THREE.CatmullRomCurve3(eyes, false, 'centripetal'), aimCurve = new THREE.CatmullRomCurve3(aims, false, 'centripetal');
  return (t: number) => {
    if (t <= keys[2]!) {
      const u = smooth((t - keys[0]!) / (keys[2]! - keys[0]!));
      return { eye: eyeCurve.getPoint(u), aim: aimCurve.getPoint(u) };
    }
    const u = Math.min(1, (t - keys[2]!) / (CODA.to - keys[2]!)), e = 1 - (1 - u) * (1 - u);
    return { eye: eyes[2]!.clone().lerp(rest.eye, e), aim: aims[2]!.clone().lerp(rest.aim, e) };
  };
}

/** The roof's paint: white road paint, worn, inside a yellow border; the link line in yellow. */
function paintTexture() {
  const W = 2048, H = Math.round((W * PAINT.h) / PAINT.w), cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d')!, white = '#f2efe6', yellow = '#ffd24a';
  c.strokeStyle = yellow; c.lineWidth = 34; c.strokeRect(40, 40, W - 80, H - 80);
  c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  const line = (text: string, family: string, size: number, y: number, color: string, maxW: number) => {
    c.font = font(family, size);
    const k = Math.min(1, maxW / c.measureText(text).width);
    c.font = font(family, size * k);
    c.fillStyle = color; c.fillText(text, W / 2, y);
  };
  line(CODA_WORDS[0], F.archivo(75, 900), 420, H * 0.47, white, W - 260);
  line(CODA_WORDS[1], F.archivo(87, 700), 130, H * 0.68, white, W - 320);
  line(CODA_WORDS[2], F.archivo(87, 700), 120, H * 0.84, yellow, W - 320);
  // (worn: paint lifted in flecks and a few scuffs where feet and gear crossed it)
  let seed = 9;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  c.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 9000; i++) { c.globalAlpha = 0.35 + 0.65 * rnd(); c.beginPath(); c.arc(rnd() * W, rnd() * H, 1 + 4 * rnd() ** 3, 0, Math.PI * 2); c.fill(); }
  c.lineCap = 'round';
  for (let i = 0; i < 14; i++) { c.globalAlpha = 0.25 + 0.3 * rnd(); c.lineWidth = 6 + 18 * rnd(); const x = rnd() * W, y = rnd() * H, a = rnd() * Math.PI; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * 260, y + Math.sin(a) * 260); c.stroke(); }
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return tex;
}

/** The coda's own pieces (the store's tar roof and its paint) and its camera. */
export function buildCoda(drive: Drive) {
  const store = storeFrame(drive), L = LIQUOR, w = L.s[1] - L.s[0];
  const group = new THREE.Group();
  group.name = 'coda';
  group.matrixAutoUpdate = false;
  group.matrix.copy(store);
  // a tar roof inside the parapet (the store's box is pale green all over: white paint on it would barely read)
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w - 0.5, 0.06, L.d - 0.5), toon({ color: '#3d3b3e' }));
  roof.position.set(0, L.h + 0.03, -L.d / 2);
  roof.castShadow = roof.receiveShadow = true;
  // the paint, its text running down the road (the car's way: left to right as the crane sees it), its top toward it
  const paint = new THREE.Mesh(new THREE.PlaneGeometry(PAINT.w, PAINT.h), toon({ map: paintTexture(), transparent: true, depthWrite: false }));
  paint.matrixAutoUpdate = false;
  paint.matrix.makeBasis(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0)).setPosition(0, L.h + 0.08, PAINT.z);
  paint.castShadow = false; paint.receiveShadow = true;
  group.add(roof, paint);
  const path = cranePath(drive, store), m = new THREE.Matrix4();
  return {
    group,
    eye(t: number): Eye {
      const { eye, aim } = path(t);
      return { pos: eye, quat: new THREE.Quaternion().setFromRotationMatrix(m.lookAt(eye, aim, UP)), fov: LENS_FOV };
    },
    /** From and to black at its ends (an exposure factor). */
    fade(t: number) { return smooth((t - CODA.from) / CODA.fadeIn) * (1 - smooth((t - (CODA.to - CODA.fadeOut)) / CODA.fadeOut)); },
  };
}
