// The drive: the video's one scene (spec §3). The car on the road through the stretches, the sky from golden hour to
// night, the lyrics written into the world phrase by phrase (drive/carriers.ts), and the camera the shot director gives
// (drive/drive.ts). M3, the look: toon-shaded world under a low sun that sets over the sea (long hard shadows, then
// moonlight), a sky printed in bands (look/skydome.ts), and the frame screen-printed (look/print.ts): ink outlines,
// halftone shadows, violet shade; bloom and paper grain in the engine's post.
import * as THREE from 'three';
import { Scene, type Frame } from '../engine/scene';
import type { PostOverrides } from '../engine/scene';
import { H, W, makeRT } from '../engine/gl';
import { LENS, placeCamera } from '../drive/camera';
import { type Drive, makeDrive } from '../drive/drive';
import { CarrierArt, wallColor } from '../drive/carrierart';
import { type Carrier, centerAt } from '../drive/carriers';
import { daylight, skyStateAt } from '../drive/sky';
import { buildCar, buildCarrier, buildWorld, flutter } from '../drive/world';
import { TUNNEL, insideAt, nearTunnel } from '../drive/tunnel';
import { SkyDome } from '../look/skydome';
import { PrintPass } from '../look/print';
import { NIGHT } from '../look/night';
import { buildCity } from '../look/city';
import { Money } from '../look/money';

/** The sodium lamps' light (candela, and how far it reaches, m) and the dark a tunnel's far end fades into. */
const TUNNEL_LIGHT = { intensity: 30, reach: 13 };
const TUNNEL_DARK = new THREE.Color('#120a05');
/** A banner's plane is in the sky from this long before its line until this long after (s). */
const BANNER_SKY = { before: 2, after: 4 };
/** Carriers further along the road than this from the car (m) are put away. */
const FAR_CARRIER = 320;
/** Carriers whose phrase is within this many seconds of t keep their faces current. */
const FACE_WINDOW = 12;
/** The sun sets over the sea: it stands this far (radians) left of the coast road's heading (at COAST_T). */
const SUN_AZ = (35 * Math.PI) / 180, COAST_T = 110;
/** Sunlight (low and warm, warmest as it sets), moonlight (cool, from high in the east), and the shadows' reach (m). */
const SUN = { intensity: 2.8, high: new THREE.Color('#ffe6b8'), low: new THREE.Color('#ff8a4c') };
const MOON = { intensity: 0.55, color: new THREE.Color('#9fa8ff'), elev: (38 * Math.PI) / 180 };
const SHADOW = { half: 110, map: 2048 };
const DEG = Math.PI / 180;
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
  private dome = new SkyDome();
  private print = new PrintPass();
  private fogColor = new THREE.Color();
  private city!: ReturnType<typeof buildCity>;
  private money!: Money;
  /** When the word "crash" is sung (s). */
  private crashes: number[] = [];
  /** Where the sun sets (flat, unit). */
  private sunAz = new THREE.Vector3();
  /** Every carrier with its object (far from the car, they're put away: across a loop of the road they'd stand
   *  in another stretch's sky). */
  private placed: [Carrier, THREE.Object3D][] = [];
  /** Carriers that move (towed banners), with their objects. */
  private flying: [Carrier, THREE.Object3D][] = [];
  /** In a tunnel: the sodium light of the lamps nearest the camera. */
  private sodium = [0, 1, 2].map(() => new THREE.PointLight('#ffa24a', 0, TUNNEL_LIGHT.reach, 1.5));

  override init() {
    const { audio, lyrics, renderer } = this.ctx;
    this.drive = makeDrive(audio, lyrics);
    this.rt.depthTexture = new THREE.DepthTexture(this.rt.width, this.rt.height, THREE.FloatType);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    this.world.add(buildWorld(this.drive), this.car, this.sun, this.sun.target, this.moon, this.moon.target, this.hemi, this.dome.mesh, ...this.sodium);
    for (const c of this.drive.carriers) {
      const art = new CarrierArt(c);
      this.arts.push(art);
      const o = buildCarrier(c, art.texture, wallColor(c), this.drive.route);
      if (c.vel) this.flying.push([c, o]);
      this.placed.push([c, o]);
      this.world.add(o);
    }
    // everything solid casts and takes shadows; the lettering (unlit) and the sky don't
    this.world.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const lit = o.material instanceof THREE.MeshToonMaterial;
      o.castShadow = o.receiveShadow = lit;
    });
    const sh = this.sun.shadow;
    sh.mapSize.set(SHADOW.map, SHADOW.map);
    Object.assign(sh.camera, { left: -SHADOW.half, right: SHADOW.half, top: SHADOW.half, bottom: -SHADOW.half, near: 1, far: 1200 });
    sh.camera.updateProjectionMatrix();
    sh.bias = -0.001; sh.normalBias = 0.12;
    this.sun.castShadow = true;
    const coast = this.drive.route.frameAt(this.drive.motion.distanceAt(COAST_T));
    this.sunAz.set(coast.fwd.x, 0, coast.fwd.z).normalize().multiplyScalar(Math.cos(SUN_AZ))
      .addScaledVector(new THREE.Vector3(coast.right.x, 0, coast.right.z).normalize(), -Math.sin(SUN_AZ)).normalize();
    this.world.fog = new THREE.Fog(0xffffff, 140, 1100);
    // the city below the overlook, ahead of where the car parks
    const end = this.drive.carFrame(this.ctx.audio.duration);
    this.city = buildCity(end.pos, end.fwd, end.right, -0.4);
    this.world.add(this.city.points);
    this.money = new Money(lyrics, (t) => this.drive.carFrame(t), (t) => this.drive.motion.speedAt(t));
    this.world.add(this.money.mesh);
    this.crashes = lyrics.lines.flatMap((l) => l.words.filter((w) => /^crash/i.test(w.w)).map((w) => w.start));
  }

  override render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer } = this.ctx, t = f.t, d = this.drive;
    // the car on the road
    const cf = d.carFrame(t);
    this.car.matrixAutoUpdate = false;
    this.car.matrix.makeBasis(cf.right.clone().negate(), cf.up, cf.fwd).setPosition(cf.pos);
    const carS = d.motion.distanceAt(t);
    for (const [c, o] of this.placed) if (!c.vel) o.visible = Math.abs(c.s - carS) < FAR_CARRIER;
    // banners where they've flown to; each plane in the sky only around its line
    for (const [c, o] of this.flying) {
      const line = this.ctx.lyrics.lines[c.phrase.line]!;
      o.visible = t > line.words[0]!.start - BANNER_SKY.before && t < line.end + BANNER_SKY.after;
      o.matrix.setPosition(centerAt(c, t));
      if (o.visible) flutter(o, c, t);
    }
    // the lyric faces near now
    this.arts.forEach((a, i) => { const p = d.carriers[i]!.phrase; if (t > p.start - FACE_WINDOW && t < p.end + FACE_WINDOW) a.update(t); });
    placeCamera(this.cam, d.camera(t));

    // the sky, the sun or the moon, the fog
    const sky = skyStateAt(t), day = daylight(t), e = sky.sunElev;
    const sunDir = this.sunAz.clone().multiplyScalar(Math.cos(e)).add(new THREE.Vector3(0, Math.sin(e), 0)).normalize();
    const sunColor = SUN.high.clone().lerp(SUN.low, 1 - smooth(0, 10 * DEG, e));
    this.dome.update(sky, sunDir, sunColor, this.cam, t);
    // the sun lights from no lower than 4° (its shadows stay finite), fading out as it sets
    const lightDir = this.sunAz.clone().multiplyScalar(Math.cos(Math.max(e, 4 * DEG))).add(new THREE.Vector3(0, Math.sin(Math.max(e, 4 * DEG)), 0));
    this.sun.position.copy(cf.pos).addScaledVector(lightDir, 500);
    this.sun.target.position.copy(cf.pos);
    this.sun.color.copy(sunColor);
    this.sun.intensity = SUN.intensity * smooth(-3 * DEG, 3 * DEG, e);
    const moonDir = this.sunAz.clone().multiplyScalar(-Math.cos(MOON.elev)).add(new THREE.Vector3(0, Math.sin(MOON.elev), 0));
    this.moon.position.copy(cf.pos).addScaledVector(moonDir, 500);
    this.moon.target.position.copy(cf.pos);
    this.moon.color.copy(MOON.color);
    this.moon.intensity = MOON.intensity * smooth(-2 * DEG, -9 * DEG, e);
    this.hemi.color.copy(sky.zenith);
    this.hemi.groundColor.copy(sky.horizon).multiplyScalar(0.35);
    this.hemi.intensity = 0.55 + 0.75 * day;
    this.fogColor.copy(sky.horizon);
    NIGHT.value = smooth(2 * DEG, -8 * DEG, e); // the lights come on as the sun goes

    // in a tunnel (by where the camera is): the daylight shut out, the lamps' light on the tiles and the car
    const camS = this.roadS(this.cam.position, d.motion.distanceAt(t)), inside = insideAt(d.tunnels, camS);
    if (inside > 0) {
      const tn = nearTunnel(d.tunnels, camS)!;
      let i = tn.lamps.findIndex((s) => s > camS);
      if (i < 0) i = tn.lamps.length;
      this.sodium.forEach((l, k) => {
        const s = tn.lamps[Math.min(tn.lamps.length - 1, Math.max(0, i - 1 + k))]!, fr = d.route.frameAt(s);
        l.position.copy(fr.pos).addScaledVector(fr.up, TUNNEL.h - 0.6);
        l.intensity = TUNNEL_LIGHT.intensity * inside;
      });
    } else this.sodium.forEach((l) => (l.intensity = 0));
    this.sun.intensity *= 1 - inside;
    this.moon.intensity *= 1 - inside;
    this.hemi.intensity *= 1 - 0.85 * inside;
    this.fogColor.lerp(TUNNEL_DARK, inside);
    const fog = this.world.fog as THREE.Fog;
    fog.color.copy(this.fogColor);
    fog.near = 140 - 130 * inside;
    fog.far = 1100 - 960 * inside;

    this.city.update(t, this.cam.position, this.rt.width / W);
    // the lyrics showing now, for the bills to keep out of
    const showing = d.carriers.filter((c) => t > c.reveal && t < c.phrase.end + 1).map((c) => ({ at: centerAt(c, t), r: Math.hypot(c.w, c.h) / 2 }));
    this.money.update(t, this.cam.position, showing);
    renderer.setRenderTarget(this.rt);
    renderer.clear(true, true, true); // the engine leaves autoClear off; the dome draws the sky, so nothing else clears
    renderer.render(this.world, this.cam);
    // screen-printed: halftone fades out at night (neon noir is clean), its tones following the light
    this.print.render(renderer, this.rt, this.cam, out, { halftone: 0.55 * day * (1 - inside), lo: 0.004 + 0.02 * day, hi: 0.04 + 0.18 * day });
    // the beat: while the drums play, the frame punches in a touch on each kick; "crash" jolts it, with a flash
    const drums = smooth(0.12, 0.3, f.a.drums), hit = this.crashes.reduce((m, c) => (t >= c && t < c + 0.6 ? Math.max(m, Math.exp(-(t - c) * 7)) : m), 0);
    const jolt = 14 * hit;
    return {
      bloom: 0.32, bloomThreshold: 1.15, bloomKnee: 0.45, halation: 0.06, grain: 0.055, vignette: 0.22,
      zoom: 1 + 0.007 * f.a.kick * drums + 0.03 * hit,
      shake: [jolt * Math.sin(t * 91), jolt * Math.cos(t * 77)],
      flash: 0.12 * hit,
    };
  }

  /** Where along the road `p` is nearest, searching around `near` (m). */
  private roadS(p: THREE.Vector3, near: number): number {
    let best = near, bd = Infinity;
    for (let s = Math.max(0, near - 40); s <= near + 40; s += 1) {
      const dd = this.drive.route.frameAt(s).pos.distanceToSquared(p);
      if (dd < bd) { bd = dd; best = s; }
    }
    return best;
  }

  override dispose() {
    for (const a of this.arts) a.dispose();
    this.rt.dispose();
    this.world.clear();
  }
}
