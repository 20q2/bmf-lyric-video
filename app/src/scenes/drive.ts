// The drive: the video's one scene (spec §3). The car on the road through the stretches, the sky from golden hour to
// night, the lyrics written into the world phrase by phrase (drive/carriers.ts), and the camera the shot director gives (drive/drive.ts). M2: greybox.
import * as THREE from 'three';
import { Scene, type Frame } from '../engine/scene';
import { H, W, makeRT } from '../engine/gl';
import { LENS, placeCamera } from '../drive/camera';
import { type Drive, makeDrive } from '../drive/drive';
import { CarrierArt, wallColor } from '../drive/carrierart';
import { type Carrier, centerAt } from '../drive/carriers';
import { daylight, skyAt } from '../drive/sky';
import { buildCar, buildCarrier, buildWorld, flutter } from '../drive/world';
import { TUNNEL, insideAt, nearTunnel } from '../drive/tunnel';

/** The sodium lamps' light (candela, and how far it reaches, m) and the dark a tunnel's far end fades into. */
const TUNNEL_LIGHT = { intensity: 30, reach: 13 };
const TUNNEL_DARK = new THREE.Color('#120a05');
/** A banner's plane is in the sky from this long before its line until this long after (s). */
const BANNER_SKY = { before: 2, after: 4 };
/** Carriers whose phrase is within this many seconds of t keep their faces current. */
const FACE_WINDOW = 12;

export default class DriveScene extends Scene {
  cam = new THREE.PerspectiveCamera(LENS.fov, W / H, LENS.near, LENS.far);
  world = new THREE.Scene();
  private rt = makeRT(W, H, { samples: 4 });
  private drive!: Drive;
  private car = buildCar();
  private arts: CarrierArt[] = [];
  private sun = new THREE.DirectionalLight('#fff3df', 2.2);
  private hemi = new THREE.HemisphereLight('#ffffff', '#3a3326', 1.2);
  private sky = new THREE.Color();
  /** Carriers that move (towed banners), with their objects. */
  private flying: [Carrier, THREE.Object3D][] = [];
  /** In a tunnel: the sodium light of the lamps nearest the camera. */
  private sodium = [0, 1, 2].map(() => new THREE.PointLight('#ffa24a', 0, TUNNEL_LIGHT.reach, 1.5));

  override init() {
    const { audio, lyrics } = this.ctx;
    this.drive = makeDrive(audio, lyrics);
    this.world.add(buildWorld(this.drive), this.car, this.sun, this.sun.target, this.hemi, ...this.sodium);
    for (const c of this.drive.carriers) {
      const art = new CarrierArt(c);
      this.arts.push(art);
      const o = buildCarrier(c, art.texture, wallColor(c), this.drive.route);
      if (c.vel) this.flying.push([c, o]);
      this.world.add(o);
    }
    this.world.fog = new THREE.Fog(0xffffff, 150, 900);
  }

  override render(f: Frame, out: THREE.WebGLRenderTarget) {
    const { renderer, comp } = this.ctx, t = f.t, d = this.drive;
    // the car on the road
    const cf = d.carFrame(t);
    this.car.matrixAutoUpdate = false;
    this.car.matrix.makeBasis(cf.right.clone().negate(), cf.up, cf.fwd).setPosition(cf.pos);
    // banners where they've flown to; each plane in the sky only around its line
    for (const [c, o] of this.flying) {
      const line = this.ctx.lyrics.lines[c.phrase.line]!;
      o.visible = t > line.words[0]!.start - BANNER_SKY.before && t < line.end + BANNER_SKY.after;
      o.matrix.setPosition(centerAt(c, t));
      if (o.visible) flutter(o, c, t);
    }
    // the lyric faces near now
    this.arts.forEach((a, i) => { const p = d.carriers[i]!.phrase; if (t > p.start - FACE_WINDOW && t < p.end + FACE_WINDOW) a.update(t); });
    // the sky, its light and the fog
    skyAt(t, this.sky);
    const day = daylight(t);
    this.world.background = this.sky;
    (this.world.fog as THREE.Fog).color.copy(this.sky);
    this.sun.intensity = 2.2 * day;
    this.sun.color.copy(this.sky).lerp(new THREE.Color('#ffffff'), 0.5);
    this.sun.position.set(cf.pos.x - 200, cf.pos.y + 300 * day + 30, cf.pos.z - 150);
    this.sun.target.position.copy(cf.pos);
    this.hemi.color.copy(this.sky);
    this.hemi.intensity = 0.4 + 0.8 * day;
    placeCamera(this.cam, d.camera(t));
    // in a tunnel (by where the camera is): the daylight shut out, the lamps' light on the tiles and the car
    const camS = this.roadS(this.cam.position, d.motion.distanceAt(t)), inside = insideAt(d.tunnels, camS);
    if (inside > 0) {
      const tn = nearTunnel(d.tunnels, camS)!;
      let i = tn.lamps.findIndex((s) => s > camS);
      if (i < 0) i = tn.lamps.length;
      this.sodium.forEach((l, k) => {
        const s = tn.lamps[Math.min(tn.lamps.length - 1, Math.max(0, i - 1 + k))]!, f = d.route.frameAt(s);
        l.position.copy(f.pos).addScaledVector(f.up, TUNNEL.h - 0.6);
        l.intensity = TUNNEL_LIGHT.intensity * inside;
      });
    } else this.sodium.forEach((l) => (l.intensity = 0));
    this.sun.intensity *= 1 - inside;
    this.hemi.intensity *= 1 - 0.85 * inside;
    this.sky.lerp(TUNNEL_DARK, inside);
    const fog = this.world.fog as THREE.Fog;
    fog.color.copy(this.sky);
    fog.near = 150 - 140 * inside;
    fog.far = 900 - 760 * inside;
    renderer.setRenderTarget(this.rt);
    renderer.render(this.world, this.cam);
    comp.draw(renderer, this.rt.texture, out, { mode: 'replace' });
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
