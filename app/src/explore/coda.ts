// The coda (the user, 2026-10-25): a short clip after the video's end card, pointing at the site. The opening plays
// again from outside the video: a spectator's crane over the corner while the car waits at the red light, the video's
// camera standing in the world at work (explore/rig.ts), coming to rest behind the liquor store over its flat roof,
// where EXPLORE THE SET is painted, as the light goes green on the first kick. Rendered on its own (render.ts video --coda: song time CODA.from..to, the song's opening
// under it) and joined onto the video (scripts/append-coda.ts); ?coda=1 in the player plays it live.
// Browser (the paint's canvas) and bun (the rest).
import * as THREE from 'three';
import type { Drive } from '../drive/drive';
import { LIQUOR } from '../drive/sets/intro';
import { F, font } from '../engine/type';
import { toon } from '../look/toon';
import type { Eye } from './view';

/** The song time it plays (s: the guitar intro's second half, the green on the first kick at 15.6, the car away), slowed
 *  to `rate` — the picture and the song together, so the light still goes green on the kick (the user, 2026-11-06: "a
 *  subtle and slowed down version of the intro"); its fades from and to black (s of the clip). */
export const CODA = { from: 6, to: 21, rate: 0.8, fadeIn: 1, fadeOut: 2.6 };
/** The clip's length (s). */
export const CODA_LENGTH = (CODA.to - CODA.from) / CODA.rate;
/** The song under it, slowed (pitch and all, as a record played slow), muffled and roomy, and quiet: under the picture,
 *  not over it. An ffmpeg filter for the song cut at CODA.from..to, sample rate `sr`. */
export function codaAudioFilter(sr: number) {
  const out = CODA_LENGTH - CODA.fadeOut;
  return [`asetrate=${Math.round(sr * CODA.rate)}`, `aresample=${sr}`, 'lowpass=f=3200', 'aecho=0.85:0.8:120|260|410:0.3|0.2|0.12',
    'volume=0.4', `afade=t=in:d=${CODA.fadeIn}`, `afade=t=out:st=${out.toFixed(3)}:d=${CODA.fadeOut}`].join(',');
}
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

/** The spectator's crane through song time: one glide along one curve through its keys (the eye, world), at an even
 *  pace along it eased by one profile (`GLIDE`): moving already as it fades in, fastest a third of the way, then slowing
 *  all the way down into its rest over the roof — no stops and starts (the user, 2026-11-06: "smoother camera movement":
 *  it had eased to a stop at the roof and started again at once, and sped up and slowed down at each key, the curve's
 *  keys taking equal time however far apart). Where it looks: on the car, then panning down onto the paint as the eye
 *  comes round behind the store. */
export function cranePath(drive: Drive, store: THREE.Matrix4) {
  const c = drive.carFrame(0), fwd = c.fwd.clone().setY(0).normalize(), left = c.right.clone().setY(0).normalize().negate(), h = LIQUOR.h;
  const at = (a: number, l: number, y: number) => c.pos.clone().addScaledVector(fwd, a).addScaledVector(left, l).addScaledVector(UP, y);
  const local = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).applyMatrix4(store);
  // behind the car and up off its left, the corner ahead; across the road and up over the cross street on its right,
  // looking back down at the car at the light; behind the store, over its roof, looking down across the paint to the
  // road. (Round the store's far side, never over its roof: crossing it low, the words filled the frame sideways and
  // upside down before the crane came to them — stills, 2026-11-06)
  const eyes = [at(-26, 9, 16), at(10, -22, 26), local(0, h + 13, -20), local(0, h + 11.2, -17.6)];
  const aims = [at(6, 0, 1), at(8, -2, 1), local(0, h, -5.6), local(0, h, -5.2)];
  const curve = new THREE.CatmullRomCurve3(eyes, false, 'centripetal');
  // (its length measured finely: the even pace is read off it, and a coarse table steps the speed)
  curve.arcLengthDivisions = 3000;
  const lengths = curve.getLengths(), whole = lengths[lengths.length - 1]!;
  const share = (k: number) => lengths[(k * 3000) / (eyes.length - 1)]! / whole; // (how far along key k is)
  const f1 = share(1), f2 = share(2);
  return (t: number) => {
    const p = glide((t - CODA.from) / (CODA.to - CODA.from));
    const eye = curve.getPointAt(p);
    const onCar = aims[0]!.clone().lerp(aims[1]!, smooth(p / f1)), onPaint = aims[2]!.clone().lerp(aims[3]!, smooth((p - f2) / (1 - f2)));
    return { eye, aim: onCar.lerp(onPaint, smooth((p - f1) / (f2 - f1))) };
  };
}

/** The glide's pace: its speed (x + a)(1 - x)^k over the clip (x 0..1): moving as it fades in, fastest at (1 - ka)/(1 + k),
 *  slowing to nothing at its end; most of the way (0.92) there by the green. Integrated once into a table. */
const GLIDE = { a: 0.1, k: 2.5, steps: 4000 };
const glideTable = (() => {
  const { a, k, steps } = GLIDE, cum = new Float64Array(steps + 1);
  for (let i = 1; i <= steps; i++) { const x = (i - 0.5) / steps; cum[i] = cum[i - 1]! + (x + a) * (1 - x) ** k; }
  for (let i = 1; i <= steps; i++) cum[i]! /= cum[steps]!;
  return cum;
})();
function glide(x: number) {
  const f = Math.min(1, Math.max(0, x)) * GLIDE.steps, i = Math.min(GLIDE.steps - 1, Math.floor(f));
  return glideTable[i]! + (glideTable[i + 1]! - glideTable[i]!) * (f - i);
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
    fade(t: number) {
      const c = (t - CODA.from) / CODA.rate; // (the clip's own time: its fades are of the slowed clip)
      return smooth(c / CODA.fadeIn) * (1 - smooth((c - (CODA_LENGTH - CODA.fadeOut)) / CODA.fadeOut));
    },
  };
}
