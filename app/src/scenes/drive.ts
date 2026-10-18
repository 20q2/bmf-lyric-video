// The drive: the video's one scene (spec §3). The car on the road through the stretches, the sky from golden hour to
// night, the lyrics written into the world phrase by phrase (drive/carriers.ts), and the camera the shot director gives
// (drive/drive.ts). M3, the look: toon-shaded world under a low sun that sets over the sea (long hard shadows, then
// moonlight), a sky printed in bands (look/skydome.ts), and the frame screen-printed (look/print.ts): ink outlines,
// halftone shadows, violet shade; bloom and paper grain in the engine's post.
import * as THREE from 'three';
import { PRINT_SHADE } from '../look/toon';
import { Scene, type Frame } from '../engine/scene';
import type { PostOverrides } from '../engine/scene';
import { H, W, makeRT } from '../engine/gl';
import { heftOf } from '../drive/heft';
import { LENS, placeCamera } from '../drive/camera';
import { type Drive, makeDrive } from '../drive/drive';
import { CarrierArt, wallColor } from '../drive/carrierart';
import { type Carrier, FLY, centerAt, riseAt } from '../drive/carriers';
import { COAST_T, SUN_AZ_DEG, airAt, cloudsAt, daylight, raysAt, skyStateAt } from '../drive/sky';
import { CAR, buildCar, buildCarrier, buildPlane, buildWorld, flutter, spinProp } from '../drive/world';
import { TUNNEL, insideAt, nearTunnel } from '../drive/tunnel';
import { SkyDome } from '../look/skydome';
import { PrintPass } from '../look/print';
import { QUALITY } from '../look/quality';
import { Cascades } from '../look/shadows';
import { Zones } from './zones';
import { warmPortrait } from '../look/adart';
import { SkyEnv } from '../look/envsky';
import { GLOW, NIGHT, PULSE } from '../look/night';
import { buildCity } from '../look/city';
import { type Stance, hydraulics } from '../drive/hydraulics';
import { neonAt } from '../drive/landmarks';
import { type Cast, castOf } from '../drive/cast';
import { poseCast } from '../look/cast3d';
import { FINALE } from '../drive/drive';
import { AUDIBLE } from '../drive/stretches';
import { carMatrix } from '../drive/carriers';
import { buildChorus2 } from './sets/chorus2';
import { buildIntro } from './sets/intro';
import { rollSedans } from './sets/kit';
import { buildChorus1 } from './sets/chorus1';
import type { buildDash } from '../look/dash';
import { buildVerse2 } from './sets/verse2';
import { buildVerse1 } from './sets/verse1';
import { buildChorus3 } from './sets/chorus3';
import { buildVerse3 } from './sets/verse3';
import { buildChorus4 } from './sets/chorus4';
import { buildBridge1 } from './sets/bridge1';

/** The sodium lamps' light (candela, and how far it reaches, m); how many of them light at once, those nearest a point
 *  `look` m along the camera's view down the bore (the user, 2026-10-14: the graffiti glowed apart from the bore's light
 *  — painted and lit like the tiles, a piece far from the lens fell into the dark round the three lamps over it); how
 *  far either side of the car to look for the camera (m); and the dark a tunnel's far end fades into. */
const TUNNEL_LIGHT = { intensity: 30, reach: 13, lamps: 7, look: 16, search: 110 };
/** In a tunnel, the car's headlights' light (candela; from this far ahead of its centre and up, m; the cone's half
 *  angle, rad, and its soft edge). */
const HEADLIGHT = { intensity: 45, ahead: 2.8, up: 0.75, reach: 45, angle: 0.5, penumbra: 0.7 };
/** From the climb on, by night: the street lamps light the world for real (their pools on the road and the ground
 *  whatever its shape, and the car and the two of them as they pass under — the user, 2026-10-16: the car "entirely
 *  unaffected by the lights"): the tunnel's lights, out of it, on the lamps (world.ts streetlights) nearest a point
 *  `look` m along the camera's view, each fading out as it drops to the edge of the set; their colour, candela, reach
 *  (m). And the headlights throw real light up the road ahead (candela; the drawn throw stays, world.ts). */
const LAMP_LIGHT = { color: new THREE.Color('#ffb766'), intensity: 70, reach: 16, look: 30, gap: 18, headlight: 70 };
const TUNNEL_DARK = new THREE.Color('#120a05');
const _rise = new THREE.Matrix4();
/** A banner's plane is in the sky from this long before its line is revealed until this long after the line (s). */
const BANNER_SKY = { before: 0.8, after: 4 };
/** The skywriter flies on this long after its phrase (s), this fast along it and up (m/s). */
const SKYWRITER = { after: 1.4, speed: 30, climb: 8, size: 0.7 };
/** On the hook's last word (the second "fly": the user, 2026-10-12) it dips below the word and loops round it as it's
 *  written: in this long (s), this far clear of the word (shares of its row's height), starting this far round
 *  (radians) before the bottom of the loop. */
/** On the hook's last word (the second "fly") the skywriter dips below the word and loops round it as it's written: in
 *  this long (s), this far clear of the word (shares of its row's height), starting this far round (radians) before
 *  the bottom of the loop. */
const LOOP = { over: 1.8, clear: [0.3, 0.32] as [number, number], before: 0.5 };
/** The dive into the loop starts this far through the word before it (a share of its length): in the gap between the
 *  words it was a flicker down (the user, 2026-10-13). The third hook's plane comes in along the words' underside. */
const DIVE = { from: 0.35, underFrom: 2 };
/** Road paint stays this long after its phrase (s). */
const PAINT_LASTS = 3;
/** Carriers further along the road than this from the car (m) are put away. */
const FAR_CARRIER = 320;
/** Carriers whose phrase is within this many seconds of t keep their faces current. */
const FACE_WINDOW = 12;
/** The sync layer (drive/heft.ts): the kick's punch-in (at dial 0, and what the dial adds), the car's bounce on it
 *  (m), the lights' pulse with the bass and the bulbs' twinkle on the hats (shares). Small: felt, not seen. */
const SYNC = { punch: [0.002, 0.004] as [number, number], bounce: 0.012, pulse: 0.12, twinkle: 0.08 };
/** The sun sets over the sea: it stands SUN_AZ_DEG left of the coast road's heading (sky.ts) — inside the arch
 *  wide's frame, kissing the water (sets/chorus3.ts shares the bearing for its glitter path). */
const SUN_AZ = (SUN_AZ_DEG * Math.PI) / 180;
/** Sunlight (low and warm, warmest as it sets) and moonlight (cool, from high in the east; `shade`: how much its
 *  shadows print, of the sun's). */
const SUN = { intensity: 2.8, high: new THREE.Color('#ffe6b8'), low: new THREE.Color('#ff8a4c') };
const MOON = { intensity: 0.55, color: new THREE.Color('#9fa8ff'), elev: (38 * Math.PI) / 180, shade: 0.6 };
const DEG = Math.PI / 180;
/** The hill sign's mast beacon: lit this long (s) in every `every`. */
const BEACON = { on: 0.5, every: 1.6 };
/** At the end the moon hangs over downtown in the view from the overlook: this far right of the parked car's heading
 *  and this high (radians). */
const END_MOON = { bearing: (22 * Math.PI) / 180, elev: (10.5 * Math.PI) / 180 };
/** The shadows turn from the sun to the moon at this sun height, where neither prints. */
const SHADE_SWITCH = -2 * DEG;
/** The end's near plane (m: from the cut to the last line; elsewhere LENS.near, for the cabin's close shots). */
const END_NEAR = 0.5;
/** The world is posed this often (s of song time) to find its still parts (scenes/zones.ts). */
const ZONE_STEP = 2;
const smooth = (a: number, b: number, x: number) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };

export default class DriveScene extends Scene {
  cam = new THREE.PerspectiveCamera(LENS.fov, W / H, LENS.near, LENS.far);
  world = new THREE.Scene();
  private rt = makeRT(W, H, { samples: 4 });
  private drive!: Drive;
  private car = buildCar();
  private arts: CarrierArt[] = [];
  private sun = new THREE.DirectionalLight('#fff3df', 2.2);
  private moon = new THREE.DirectionalLight('#9fa8ff', 0);
  private hemi = new THREE.HemisphereLight('#ffffff', '#3a3326', 1.2);
  /** The shadows (look/shadows.ts). */
  private shade = new Cascades(QUALITY.shadowMap);
  private dome = new SkyDome();
  /** The sky as the hero sees it (its reflections). */
  private env!: SkyEnv;
  private print = new PrintPass();
  /** The sync layer's dial (drive/heft.ts). */
  private heft!: (t: number) => number;
  private fogColor = new THREE.Color();
  private city!: ReturnType<typeof buildCity>;
  /** (debugging: the named parts hidden, ?hide=) */
  private hidden: string[] = [];
  /** The motel sign's neon (its material and its two faces), and the car's body on its hydraulics. */
  private sign!: { neon: THREE.MeshBasicMaterial; faces: { no: THREE.Texture; vacancy: THREE.Texture } };
  private stance!: (t: number) => Stance;
  private cast!: (t: number) => Cast;
  /** Where the sun sets (flat, unit). */
  private sunAz = new THREE.Vector3();
  /** Every carrier with its object (far from the car, they're put away: across a loop of the road they'd stand
   *  in another stretch's sky). */
  private placed: [Carrier, THREE.Object3D][] = [];
  /** Carriers that move (towed banners, the hook's sky-writing), with their objects. */
  private flying: [Carrier, THREE.Object3D][] = [];
  /** The skywriter: a plane at the head of the sky-writing as it's written, flying on and up after. */
  private writer = buildPlane(1);
  private skies: Carrier[] = [];
  /** In a tunnel: the sodium light of the lamps nearest where the camera looks, and the car's headlights. */
  private sodium = Array.from({ length: TUNNEL_LIGHT.lamps }, () => new THREE.PointLight('#ffa24a', 0, TUNNEL_LIGHT.reach, 1.5));
  private headlight = new THREE.SpotLight('#ffd08a', 0, HEADLIGHT.reach, HEADLIGHT.angle, HEADLIGHT.penumbra, 1.2);
  /** The set-pieces' props (scenes/sets/), moved each frame. */
  private sets: { group: THREE.Group; update(t: number, car: THREE.Object3D): void }[] = [];
  /** Carriers riding in the car (the radio), with their place in its frame. */
  private riding: [THREE.Object3D, THREE.Matrix4, number, Carrier][] = [];
  /** The red beacon on the hill sign's mast (it blinks). */
  private beacons: THREE.MeshBasicMaterial[] = [];
  /** The hills the climb runs up (world.ts), shown from the climb's first cut on: from the coast they'd stand in its
   *  views. */
  private climb: THREE.Object3D | null = null;
  private climbFrom = Infinity;
  /** The street lamps lit for real from the climb on (their bulbs). */
  private lamps: THREE.Vector3[] = [];
  /** Where the moon hangs at the end (unit). */
  private endMoon = new THREE.Vector3();
  /** The world's still parts, hidden while off screen. */
  private zones!: Zones;

  override async init() {
    const { audio, lyrics, renderer } = this.ctx;
    this.drive = makeDrive(audio, lyrics);
    this.rt.depthTexture = new THREE.DepthTexture(this.rt.width, this.rt.height, THREE.FloatType);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    this.env = new SkyEnv(renderer, QUALITY.envStep);
    const world = buildWorld(this.drive);
    this.sign = world.userData.sign;
    this.climb = world.getObjectByName('climb') ?? null;
    this.climbFrom = this.drive.stretches.find((st) => st.id === 'chorus4')?.start ?? Infinity;
    this.lamps = (world.getObjectByName('streetlights')?.userData.lamps as THREE.Vector3[] | undefined) ?? [];
    this.stance = hydraulics(audio, lyrics, this.drive.stretches);
    this.heft = heftOf(this.drive.stretches, this.drive.reading);
    this.cast = castOf(audio, lyrics);
    this.skies = this.drive.carriers.filter((c) => c.kind === 'sky');
    this.writer.matrixAutoUpdate = false;
    this.world.add(world, this.writer, this.car, this.sun, this.sun.target, this.moon, this.moon.target, this.hemi, this.dome.mesh, ...this.sodium, this.headlight, this.headlight.target);
    for (const c of this.drive.carriers) {
      const art = new CarrierArt(c);
      this.arts.push(art);
      const o = buildCarrier(c, art.texture, wallColor(c), this.drive.route);
      if (c.vel) this.flying.push([c, o]);
      if (c.kind === 'hill') { const b = o.getObjectByName('beacon') as THREE.Mesh | null; if (b) this.beacons.push(b.material as THREE.MeshBasicMaterial); }
      this.placed.push([c, o]);
      this.world.add(o);
    }
    for (const c of this.drive.carriers) if (c.ride) {
      const r = c.ride, local = new THREE.Matrix4().makeBasis(r.up.clone().cross(r.normal).normalize(), r.up, r.normal).setPosition(r.pos);
      this.riding.push([this.placed.find(([k]) => k === c)![1], local, r.ahead ?? 0, c]);
    }
    for (const [k, set] of [buildIntro(this.drive), buildChorus1(this.drive), buildVerse1(this.drive), buildChorus2(this.drive), buildVerse2(this.drive), buildChorus3(this.drive), buildBridge1(this.drive), buildVerse3(this.drive), buildChorus4(this.drive)].entries()) if (set) { set.group.name = `set-${['intro', 'chorus1', 'verse1', 'chorus2', 'verse2', 'chorus3', 'bridge1', 'verse3', 'chorus4'][k]}`; this.sets.push(set); this.world.add(set.group); }
    // (debugging: ?hide=blocks,palms,... hides the world's named parts in the preview)
    this.hidden = typeof location === 'undefined' ? [] : (new URLSearchParams(location.search).get('hide') ?? '').split(',').filter(Boolean);
    if (this.hidden.length) this.world.traverse((o) => { if (this.hidden.includes(o.name)) o.visible = false; });
    // everything solid casts and takes shadows; the lettering (unlit) and the sky don't
    this.world.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const lit = o.material instanceof THREE.MeshToonMaterial || o.material instanceof THREE.MeshStandardMaterial;
      o.castShadow = o.receiveShadow = lit;
    });
    // (the shadows are the cascades' (look/shadows.ts): the sun and the moon cast nothing themselves)
    this.world.add(...this.shade.objects);
    // (nothing up in the sky casts: the skywriter, the banners' tow planes — their shadows fell on the facades out of
    // nowhere)
    for (const o of [this.writer, ...this.flying.map(([, f]) => f)]) o.traverse((m) => { if (m instanceof THREE.Mesh) m.castShadow = false; });
    // (the set-pieces posed through the song, the car on the road for the sets that ride with it; the world's own
    // pieces never move)
    const dur = this.ctx.audio.duration;
    const sets = this.sets.map((s) => s.group);
    this.zones = new Zones([world, ...sets], sets, (t) => {
      const cf = this.drive.carFrame(t);
      this.car.matrixAutoUpdate = false;
      this.car.matrix.makeBasis(cf.right.clone().negate(), cf.up, cf.fwd).setPosition(cf.pos);
      this.car.updateMatrixWorld(true);
      for (const set of this.sets) set.update(t, this.car);
    }, Array.from({ length: Math.ceil(dur / ZONE_STEP) + 1 }, (_, i) => Math.min(i * ZONE_STEP, dur)));
    const coast = this.drive.route.frameAt(this.drive.motion.distanceAt(COAST_T));
    this.sunAz.set(coast.fwd.x, 0, coast.fwd.z).normalize().multiplyScalar(Math.cos(SUN_AZ))
      .addScaledVector(new THREE.Vector3(coast.right.x, 0, coast.right.z).normalize(), -Math.sin(SUN_AZ)).normalize();
    // the mountains: on the far side from the sea, where the sun sets
    const hills = this.sunAz.clone().negate();
    this.dome.setMountains(hills);
    this.env.setMountains(hills);
    this.world.fog = new THREE.Fog(0xffffff, 140, 1100);
    // the city below the overlook, ahead of where the car parks, lit to the cut to the motel (its lights went out block
    // by block on the outro's "we might crash": the user, 2026-10-18, "let's not fade out the cityscape, just let it
    // linger till we cut to the motel sign")
    const end = this.drive.carFrame(this.ctx.audio.duration);
    this.city = buildCity(end.pos, end.fwd, end.right, -0.4, undefined, this.drive.lastCut ?? 0);
    { const f = new THREE.Vector3(end.fwd.x, 0, end.fwd.z).normalize(), r = new THREE.Vector3(end.right.x, 0, end.right.z).normalize();
      this.endMoon.copy(f).multiplyScalar(Math.cos(END_MOON.bearing)).addScaledVector(r, Math.sin(END_MOON.bearing)).multiplyScalar(Math.cos(END_MOON.elev)).setY(Math.sin(END_MOON.elev)).normalize(); }
    this.world.add(this.city.group);
    // every shader compiled now, while it loads, not on first sight: each one compiled mid-play froze the frame (the
    // user, 2026-10-15: "it just freezes in those parts" — 32 at once at the first cut). Everything shown for it (a
    // hidden prop's material is still a shader to come), the sky's reflection in place (the hero's paint compiles
    // with it); compileAsync lets the driver compile them in parallel
    this.world.environment = this.env.update(0, (tau) => this.skyAt(tau));
    const shown: THREE.Object3D[] = [];
    this.world.traverse((o) => { if (!o.visible) { o.visible = true; shown.push(o); } });
    this.world.updateMatrixWorld(true);
    // (into the scene's own target, as it renders: a shader is built for its target — its tone mapping, its colour
    // space — and compiled for the screen, every one was compiled again at the first frame)
    const was = renderer.getRenderTarget();
    renderer.setRenderTarget(this.rt);
    await renderer.compileAsync(this.world, this.cam);
    // (and one render, every caster in every shadow map: the maps' depth shaders are made as things are first drawn
    // into them, ~0.5 s each, three at the first cut)
    this.shade.everything = true;
    renderer.clear(true, true, true);
    renderer.render(this.world, this.cam);
    this.shade.everything = false;
    renderer.setRenderTarget(was);
    for (const o of shown) o.visible = false;
    // (every texture sent to the GPU now, its mips made — first drawn, a cut to a street of signs and fronts sent them
    // all at once: 1.4 s; and his portrait's paths built, ~0.5 s, before the first board that shows him)
    const sent = new Set<THREE.Texture>();
    this.world.traverse((o) => {
      const ms = (o as THREE.Mesh).material; if (!ms) return;
      for (const m of Array.isArray(ms) ? ms : [ms]) for (const v of Object.values(m)) if ((v as THREE.Texture)?.isTexture && !sent.has(v as THREE.Texture)) { sent.add(v as THREE.Texture); renderer.initTexture(v as THREE.Texture); }
    });
    warmPortrait();
    for (const a of this.arts) a.warm();
    // (and waited for: the GPU's done with it all before the first frame is asked for)
    { const gl = renderer.getContext(); renderer.setRenderTarget(null); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); renderer.setRenderTarget(was); }
  }

  override render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer } = this.ctx, t = f.t, d = this.drive;
    // the car on the road
    const cf = d.carFrame(t);
    this.car.matrixAutoUpdate = false;
    this.car.matrix.makeBasis(cf.right.clone().negate(), cf.up, cf.fwd).setPosition(cf.pos);
    const st = this.stance(t), body = this.car.getObjectByName('body')!;
    // (the sync layer, felt rather than seen — the user, 2026-10-13: the thumps were "way too intense": a breath of a
    // bounce on the kick, the lights pulsing with the bass, the bulbs twinkling on the hats at night)
    const heft = this.heft(t), drums = smooth(0.12, 0.3, f.a.drums), lift = st.lift + SYNC.bounce * heft * f.a.kick * drums;
    PULSE.value = heft * (SYNC.pulse * f.a.bass + SYNC.twinkle * f.a.hat * NIGHT.value);
    body.position.y = lift; body.rotation.set(st.pitch, st.swerve, st.roll);
    for (const strut of this.car.getObjectByName('struts')!.children) { // from the hub up to the chassis
      const top = 0.18 + lift, bottom = CAR.wheelR;
      strut.scale.y = Math.max(0.01, top - bottom); strut.position.y = (top + bottom) / 2;
    }
    // the wire wheels roll with the road (their spokes turning: they'd read as hubcaps standing still)
    for (const w of (this.car.userData.wheels as THREE.Object3D[] | undefined) ?? []) w.rotation.x = d.motion.distanceAt(t) / CAR.wheelR;
    // the two of them: her arm up (it swings out and over), her look to him, his nod — and at the end her lean into
    // him, her head on his shoulder, his arm round her (look/cast3d.ts poseCast)
    const cast = this.cast(t);
    cast.steer *= Math.min(1, d.motion.speedAt(t) / 3); // (still once they've pulled in)
    poseCast(body, cast);
    // the headlights' throw follows the speed: parked, the beams settle to a glow at the nose
    const beams = this.car.getObjectByName('beams') as THREE.Mesh | undefined;
    if (beams) (beams.material as THREE.ShaderMaterial).uniforms.strength!.value = GLOW.beam * Math.min(1, 0.15 + d.motion.speedAt(t) / 4);
    // the motel's neon: flickering on, and at the end its NO going out
    const neon = neonAt(t, f.beat);
    this.sign.neon.color.setScalar(0.25 + 1.45 * neon.lit);
    const face = neon.no ? this.sign.faces.no : this.sign.faces.vacancy;
    if (this.sign.neon.map !== face) { this.sign.neon.map = face; this.sign.neon.needsUpdate = true; }
    const carS = d.motion.distanceAt(t);
    // (at the cut to the last line every word sung before it goes: the end starts clean)
    const cleared = d.lastCut !== null && t >= d.lastCut ? d.lastCut : -Infinity;
    // (road paint is retired a little after it's sung: from the shots after it'd read upside down)
    for (const [c, o] of this.placed) if (!c.vel) o.visible = Math.abs(c.s - carS) < FAR_CARRIER && c.phrase.end > cleared && (c.kind !== 'road' || t < c.phrase.end + PAINT_LASTS) && t < (c.until ?? Infinity) && t >= (c.from ?? -Infinity);
    // the radio, in the car; the set-pieces' props, where they've moved to
    // (in the car, on its body: lifted, pitched and rolled with it on its hydraulics)
    const bodyM = new THREE.Matrix4().compose(new THREE.Vector3(0, lift, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(st.pitch, 0, st.roll)), new THREE.Vector3(1, 1, 1));
    for (const [o, local, ahead, c] of this.riding) {
      o.matrix.multiplyMatrices(ahead ? carMatrix(d.carFrame(t, ahead)) : carMatrix(cf).multiply(bodyM), local);
      if (c.ride!.rise) o.matrix.multiply(_rise.makeTranslation(0, riseAt(c, t), 0)); // (her texts, pushed up as each new one comes in)
    }
    for (const set of this.sets) set.update(t, this.car);
    rollSedans(); // (the traffic's wheels, by how far each car moved)
    (this.car.userData.dash as ReturnType<typeof buildDash> | undefined)?.update(t, this.ctx.audio.duration, d.motion.speedAt(t), f.a.kick);
    // banners where they've flown to; each plane in the sky only around its line
    for (const [c, o] of this.flying) {
      const line = this.ctx.lyrics.lines[c.phrase.line]!;
      const first = d.carriers.find((k) => k.phrase.line === c.phrase.line)!;
      // (the last line's banner only from the cut to it: flown in early, it would cross "crash")
      // (the last line's banner from the cut to it, gone as the song fades out of hearing)
      const last = !!c.finale;
      o.visible = (last ? d.lastCut !== null && t >= d.lastCut : t > first.reveal - BANNER_SKY.before) && t < (last ? AUDIBLE : line.end + BANNER_SKY.after) && c.phrase.end > cleared;
      o.matrix.setPosition(centerAt(c, t));
      if (o.visible && c.kind === 'banner') flutter(o, c, t); // (cloth ripples; travelling sky-writing doesn't)
    }
    // the skywriter, writing the line being written: at the head of each phrase along its top as it's sung, gliding on
    // over the gap to the next phrase's start (one flight across the line), then away after the last
    const started = this.skies.filter((c) => t > c.phrase.start - 0.3 && t < c.phrase.end + SKYWRITER.after).pop();
    const line = started ? this.skies.filter((c) => c.phrase.line === started.phrase.line) : [];
    const i = Math.max(0, line.findLastIndex((c) => t >= c.phrase.start)), w = line[i], next = line[i + 1];
    // (the hook's last word, alone after the first: looped round)
    const loops = (c: Carrier) => line.length > 1 && c === line[line.length - 1] && FLY.test(this.ctx.lyrics.lines[c.phrase.line]!.text);
    const done = w ? (loops(w) ? w.phrase.start + LOOP.over : w.phrase.end) : 0;
    this.writer.visible = !!w && t < (next ? Infinity : done + SKYWRITER.after);
    if (w) {
      // (over the top of phrase c, a share u along it: sized by a row of its writing, never across the words)
      const over = (c: Carrier, u: number, below = false) => {
        const a = c.up.clone().cross(c.normal).normalize(), k = SKYWRITER.size * (c.h / c.rows.length / 9);
        return { a, k, at: centerAt(c, t).addScaledVector(a, -c.w / 2 + u * c.w).addScaledVector(c.up, (below ? -1 : 1) * (c.h / 2 + 1.2 * k)), up: c.up.clone() };
      };
      // (which hook this is: the third's plane flies under the words instead of over them, a different approach)
      const hookIndex = this.ctx.lyrics.lines.filter((l) => FLY.test(l.text)).map((l) => l.i).indexOf(w.phrase.line), below = hookIndex >= DIVE.underFrom;
      // (round phrase c, a share u of the way: an inside loop, anticlockwise on screen, from below its left end, under
      // it heading right, up its right side, over the top upside down, down its left side and out along the bottom;
      // its wings level to the loop, its top toward the word; placed by its middle)
      const round = (c: Carrier, u: number) => {
        const a = c.up.clone().cross(c.normal).normalize(), k = SKYWRITER.size * (c.h / c.rows.length / 9), rowH = c.h / c.rows.length;
        const rx = c.w / 2 + LOOP.clear[0] * rowH, ry = c.h / 2 + LOOP.clear[1] * rowH;
        const th = -Math.PI / 2 - LOOP.before + (2 * Math.PI + LOOP.before) * u, C = centerAt(c, t);
        const p = C.clone().addScaledVector(a, rx * Math.cos(th)).addScaledVector(c.up, ry * Math.sin(th));
        const head = a.clone().multiplyScalar(-rx * Math.sin(th)).addScaledVector(c.up, ry * Math.cos(th)).normalize();
        const top = C.clone().sub(p); top.addScaledVector(head, -top.dot(head)).normalize();
        return { a: head, k, at: p.addScaledVector(head, -3 * k), up: top };
      };
      const dur = Math.max(0.3, w.phrase.end - w.phrase.start), u = Math.min(1, Math.max(0, (t - w.phrase.start) / dur));
      let { a, k, at, up } = loops(w) ? round(w, Math.min(1, Math.max(0, (t - w.phrase.start) / LOOP.over))) : over(w, u, below);
      const past = Math.max(0, t - done), diveFrom = next && loops(next) && !loops(w) ? w.phrase.start + dur * DIVE.from : Infinity;
      if (next && loops(next) && t > diveFrom) {
        // diving to loop it: one smooth curve from level flight along the phrase (from part-way along it: the whole of
        // the rest of the word is the descent) down and round into the loop's entry under the next word, the plane's
        // nose along it — a Hermite curve, its ends' tangents the two headings
        const g = Math.min(1, (t - diveFrom) / Math.max(1e-3, next.phrase.start - diveFrom));
        const from = over(w, DIVE.from, below), to = round(next, 0), P0 = from.at.clone(), a0 = from.a, L = P0.distanceTo(to.at) * 1.3, h00 = 2 * g ** 3 - 3 * g * g + 1, h10 = g ** 3 - 2 * g * g + g, h01 = -2 * g ** 3 + 3 * g * g, h11 = g ** 3 - g * g;
        at = P0.clone().multiplyScalar(h00).addScaledVector(a0, L * h10).addScaledVector(to.at, h01).addScaledVector(to.a, L * h11);
        const d00 = 6 * g * g - 6 * g, d10 = 3 * g * g - 4 * g + 1, d01 = -6 * g * g + 6 * g, d11 = 3 * g * g - 2 * g;
        const head = P0.clone().multiplyScalar(d00).addScaledVector(a0, L * d10).addScaledVector(to.at, d01).addScaledVector(to.a, L * d11).normalize();
        k = from.k + (to.k - from.k) * g; up = from.up.clone().lerp(to.up, g).normalize(); a = head;
      } else if (past > 0 && next) { // on across the gap to the next phrase's start
        const g = Math.min(1, past / Math.max(1e-3, next.phrase.start - w.phrase.end));
        {
          const e = g * g * (3 - 2 * g), to = over(next, 0);
          at = at.lerp(to.at, e); k += (to.k - k) * e;
          a = a.clone().lerp(to.a, e).normalize(); up = up.clone().lerp(to.up, e).normalize();
        }
      } else if (past > 0) at.addScaledVector(a, past * SKYWRITER.speed).addScaledVector(w.up, past * SKYWRITER.climb); // away
      up.addScaledVector(a, -up.dot(a)).normalize();
      this.writer.matrix.makeBasis(a, up, a.clone().cross(up)).scale(new THREE.Vector3(k, k, k)).setPosition(at);
      spinProp(this.writer, t);
    }
    if (this.climb) this.climb.visible = t >= this.climbFrom;
    // the hill sign stays floodlit to the end (it's the view they parked for); the beacon on its mast blinks
    for (const m of this.beacons) m.visible = (t % BEACON.every) < BEACON.on;
    // the lyric faces near now
    this.arts.forEach((a, i) => { const p = d.carriers[i]!.phrase; if (t > p.start - FACE_WINDOW && t < p.end + FACE_WINDOW) a.update(t); });
    placeCamera(this.cam, d.camera(t));
    // (the end's lens, behind the two of them, a metre clear of the car, looks out over the city 2 km off: its near plane
    // pulled out, the depth buffer resolves the towers finely enough that their windows stop flickering — at 0.1 m it
    // couldn't tell a window from the face of a tower a metre behind another's, nor the city's plain from the ground)
    { const near = d.lastCut !== null && t >= d.lastCut ? END_NEAR : LENS.near; if (this.cam.near !== near) { this.cam.near = near; this.cam.updateProjectionMatrix(); } }

    // the sky, the sun or the moon, the fog
    const { sky, sunDir, sunColor } = this.skyAt(t), day = daylight(t), e = sky.sunElev;
    // (the hero's reflections: the sky of this moment, remade on steps of song time)
    this.world.environment = this.env.update(t, (tau) => this.skyAt(tau));
    const moonDir = this.sunAz.clone().multiplyScalar(-Math.cos(MOON.elev)).add(new THREE.Vector3(0, Math.sin(MOON.elev), 0));
    // (the moon up once the sun's well down; from the cut to the last line it hangs in the view they parked for, low
    // over downtown: up where it lights from, it never made the end's frame)
    const shownMoon = d.lastCut !== null && t >= d.lastCut ? this.endMoon : moonDir;
    this.dome.update(sky, sunDir, sunColor, this.cam, t, cloudsAt(t), raysAt(t), shownMoon, smooth(-2 * DEG, -9 * DEG, e));
    // the sun lights from no lower than 4° (its shadows stay finite), fading out as it sets
    const lightDir = this.sunAz.clone().multiplyScalar(Math.cos(Math.max(e, 4 * DEG))).add(new THREE.Vector3(0, Math.sin(Math.max(e, 4 * DEG)), 0));
    // the shadows round the lens's view: the sun's, and once it's down (both lights near nothing) the moon's
    this.shade.update(this.cam, e > SHADE_SWITCH ? lightDir.clone().normalize() : moonDir, cf.pos.y);
    this.sun.position.copy(cf.pos).addScaledVector(lightDir, 500);
    this.sun.target.position.copy(cf.pos);
    this.sun.color.copy(sunColor);
    this.sun.intensity = SUN.intensity * smooth(-3 * DEG, 3 * DEG, e);
    this.moon.position.copy(cf.pos).addScaledVector(moonDir, 500);
    this.moon.target.position.copy(cf.pos);
    this.moon.color.copy(MOON.color);
    this.moon.intensity = MOON.intensity * smooth(-2 * DEG, -9 * DEG, e);
    this.hemi.color.copy(sky.zenith);
    this.hemi.groundColor.copy(sky.horizon).multiplyScalar(0.35);
    this.hemi.intensity = 0.7 + 0.6 * day; // (QA: low sun left roofs in shadow near black: the sky's fill)
    const air = airAt(t);
    this.fogColor.copy(sky.horizon).lerp(air.tint, air.mix); // (graded per section: drive/sky.ts AIR_KEYS)
    NIGHT.value = smooth(2 * DEG, -8 * DEG, e); // the lights come on as the sun goes

    // in a tunnel (by where the camera is): the daylight shut out, the lamps' light on the tiles and the car
    // (searched far either side of the car: the bridge's eye waits up to ~90 m down the bore from it)
    const camS = this.roadS(this.cam.position, d.motion.distanceAt(t), TUNNEL_LIGHT.search), inside = insideAt(d.tunnels, camS);
    if (inside > 0) {
      // the lamps nearest where the camera looks, `look` m down the bore along its view; each fading out as it drops
      // to the edge of the set (another takes its place unseen)
      const tn = nearTunnel(d.tunnels, camS)!, view = new THREE.Vector3();
      this.cam.getWorldDirection(view);
      const focus = camS + TUNNEL_LIGHT.look * view.dot(d.route.frameAt(camS).fwd);
      const byNear = tn.lamps.map((s) => ({ s, d: Math.abs(s - focus) })).sort((a, b) => a.d - b.d);
      const edge = byNear[this.sodium.length]?.d ?? Infinity, gap = (tn.s1 - tn.s0) / Math.max(1, tn.lamps.length);
      this.sodium.forEach((l, k) => {
        const lamp = byNear[k];
        if (!lamp) { l.intensity = 0; return; }
        const fr = d.route.frameAt(lamp.s);
        l.position.copy(fr.pos).addScaledVector(fr.up, TUNNEL.h - 0.6);
        l.color.set('#ffa24a'); l.distance = TUNNEL_LIGHT.reach;
        l.intensity = TUNNEL_LIGHT.intensity * inside * Math.min(1, (edge - lamp.d) / gap);
      });
      // the car's headlights throw real light down the bore: it sweeps the tiles and the paint on them as it passes
      // (the beams' cones are only drawn: world.ts)
      this.headlight.position.copy(cf.pos).addScaledVector(cf.fwd, HEADLIGHT.ahead).addScaledVector(cf.up, HEADLIGHT.up);
      this.headlight.target.position.copy(cf.pos).addScaledVector(cf.fwd, HEADLIGHT.ahead + 20).addScaledVector(cf.up, HEADLIGHT.up - 0.6);
      this.headlight.intensity = HEADLIGHT.intensity * inside;
    } else if (t >= this.climbFrom && NIGHT.value > 0) {
      // the street lamps nearest where the camera looks (as the tunnel's lamps), their light the bulbs'
      const view = new THREE.Vector3(); this.cam.getWorldDirection(view);
      const focus = this.cam.position.clone().addScaledVector(view, LAMP_LIGHT.look);
      const byNear = this.lamps.map((p) => ({ p, d: p.distanceTo(focus) })).sort((a, b) => a.d - b.d);
      const edge = byNear[this.sodium.length]?.d ?? Infinity;
      this.sodium.forEach((l, k) => {
        const lamp = byNear[k];
        if (!lamp) { l.intensity = 0; return; }
        l.position.copy(lamp.p);
        l.color.copy(LAMP_LIGHT.color);
        l.distance = LAMP_LIGHT.reach;
        l.intensity = LAMP_LIGHT.intensity * NIGHT.value * Math.min(1, (edge - lamp.d) / LAMP_LIGHT.gap);
      });
      // the headlights up the road ahead, with the speed (parked at the overlook they'd searchlight the wall)
      this.headlight.position.copy(cf.pos).addScaledVector(cf.fwd, HEADLIGHT.ahead).addScaledVector(cf.up, HEADLIGHT.up);
      this.headlight.target.position.copy(cf.pos).addScaledVector(cf.fwd, HEADLIGHT.ahead + 20).addScaledVector(cf.up, HEADLIGHT.up - 1.2);
      this.headlight.intensity = LAMP_LIGHT.headlight * NIGHT.value * Math.min(1, d.motion.speedAt(t) / 4);
    } else { this.sodium.forEach((l) => (l.intensity = 0)); this.headlight.intensity = 0; }
    this.sun.intensity *= 1 - inside;
    // the printed shadows (look/toon.ts): the sun's, then fainter, the moon's
    PRINT_SHADE.value = Math.max(smooth(-1 * DEG, 4 * DEG, e), MOON.shade * smooth(-3 * DEG, -9 * DEG, e)) * (1 - inside);
    this.moon.intensity *= 1 - inside;
    this.hemi.intensity *= 1 - 0.85 * inside;
    this.fogColor.lerp(TUNNEL_DARK, inside);
    const fog = this.world.fog as THREE.Fog;
    fog.color.copy(this.fogColor);
    // (by night the fog pulls in: the far world melts into the dark — the climbing switchback's embankment would
    // otherwise loom behind the Strip as an unlit wall)
    const far = air.far - 500 * NIGHT.value;
    fog.near = air.near - (air.near - 10) * inside;
    fog.far = far - (far - 140) * inside;

    this.city.update(t, this.cam.position, this.rt.width / W);
    // (the maps aren't drawn while nothing shows them: deep in a tunnel; nor is what can't be seen: scenes/zones.ts)
    this.shade.live = PRINT_SHADE.value > 0 || this.sun.intensity > 0 || this.moon.intensity > 0;
    this.zones.hide((s) => this.shade.sees(s));
    renderer.setRenderTarget(this.rt);
    renderer.clear(true, true, true); // the engine leaves autoClear off; the dome draws the sky, so nothing else clears
    renderer.render(this.world, this.cam);
    this.zones.restore();
    // screen-printed: halftone fades out at night (neon noir is clean), its tones following the light
    this.print.render(renderer, this.rt, this.cam, out, { halftone: 0.55 * day * (1 - inside), lo: 0.004 + 0.02 * day, hi: 0.04 + 0.18 * day });
    // the beat: while the drums play, the frame punches in a touch on each kick (no jolt, no flash: the user cut every
    // impact frame, the crash's too)
    // the end: the motel fades away
    const [f0, f1] = FINALE.fade, gone = Math.min(1, Math.max(0, (t - f0) / (f1 - f0)));
    return {
      bloom: 0.32, bloomThreshold: 1.15, bloomKnee: 0.45, halation: 0.06,
      haze: 0.06 + 0.32 * NIGHT.value, // (a breath of it round the sun by day; neon in damp air by night)
      grain: 0.072, vignette: 0.22,
      zoom: 1 + (SYNC.punch[0] + SYNC.punch[1] * heft) * f.a.kick * drums,
      exposure: 1 - gone * gone,
    };
  }

  /** The sky at song time t: its state, where the sun is (unit) and its colour. */
  private skyAt(t: number) {
    const sky = skyStateAt(t), e = sky.sunElev;
    const sunDir = this.sunAz.clone().multiplyScalar(Math.cos(e)).add(new THREE.Vector3(0, Math.sin(e), 0)).normalize();
    const sunColor = SUN.high.clone().lerp(SUN.low, 1 - smooth(0, 10 * DEG, e));
    return { sky, sunDir, sunColor };
  }

  /** Where along the road `p` is nearest, searching `span` m either side of `near` (m). */
  private roadS(p: THREE.Vector3, near: number, span = 40): number {
    let best = near, bd = Infinity;
    for (let s = Math.max(0, near - span); s <= near + span; s += 1) {
      const dd = this.drive.route.frameAt(s).pos.distanceToSquared(p);
      if (dd < bd) { bd = dd; best = s; }
    }
    return best;
  }

  override dispose() {
    for (const a of this.arts) a.dispose();
    this.rt.dispose();
    this.env.dispose();
    this.world.clear();
  }
}
