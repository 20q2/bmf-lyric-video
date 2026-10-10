// The drive: the video's one scene (spec §3). The car on the road through the stretches, the sky from golden hour to
// night, the lyrics written into the world phrase by phrase (drive/carriers.ts), and the camera the shot director gives (drive/drive.ts). M2: greybox.
import * as THREE from 'three';
import { Scene, type Frame } from '../engine/scene';
import { H, W, makeRT } from '../engine/gl';
import { LENS, placeCamera } from '../drive/camera';
import { type Drive, makeDrive } from '../drive/drive';
import { CarrierArt, wallColor } from '../drive/carrierart';
import { daylight, skyAt } from '../drive/sky';
import { buildCar, buildCarrier, buildWorld } from '../drive/world';

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

  override init() {
    const { audio, lyrics } = this.ctx;
    this.drive = makeDrive(audio, lyrics);
    this.world.add(buildWorld(this.drive), this.car, this.sun, this.sun.target, this.hemi);
    for (const c of this.drive.carriers) {
      const art = new CarrierArt(c);
      this.arts.push(art);
      this.world.add(buildCarrier(c, art.texture, wallColor(c), this.drive.route));
    }
    this.world.fog = new THREE.Fog(0xffffff, 150, 900);
  }

  override render(f: Frame, out: THREE.WebGLRenderTarget) {
    const { renderer, comp } = this.ctx, t = f.t, d = this.drive;
    // the car on the road
    const cf = d.carFrame(t);
    this.car.matrixAutoUpdate = false;
    this.car.matrix.makeBasis(cf.right.clone().negate(), cf.up, cf.fwd).setPosition(cf.pos);
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
    renderer.setRenderTarget(this.rt);
    renderer.render(this.world, this.cam);
    comp.draw(renderer, this.rt.texture, out, { mode: 'replace' });
  }

  override dispose() {
    for (const a of this.arts) a.dispose();
    this.rt.dispose();
    this.world.clear();
  }
}
