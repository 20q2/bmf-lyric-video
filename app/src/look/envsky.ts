// The sky as the hero sees it (spec §2): a second sky dome, alone in its own scene at the origin, rendered into a
// prefiltered environment map for the car's candy paint and chrome — gold at sunset, violet at dusk. Remade only when
// song time crosses a step (QUALITY.envStep), from the sky at the step's own time: every frame (and every sample of a
// frame's motion blur) in a step gets the same map, so the export is deterministic. Browser only (WebGL).
import * as THREE from 'three';
import { SkyDome } from './skydome';
import { type SkyState, cloudsAt, raysAt } from '../drive/sky';

/** The sky at a song time: its state, the sun's direction (unit) and colour. */
export type SkyAt = (t: number) => { sky: SkyState; sunDir: THREE.Vector3; sunColor: THREE.Color };

export class SkyEnv {
  private scene = new THREE.Scene();
  private dome = new SkyDome();
  private origin = new THREE.Object3D();
  private pmrem: THREE.PMREMGenerator;
  private rt: THREE.WebGLRenderTarget | null = null;
  private key = NaN;

  constructor(renderer: THREE.WebGLRenderer, private step: number) {
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.dome.withGround();
    this.scene.add(this.dome.mesh);
  }

  /** The environment map for song time t (remade when t enters a new step). */
  update(t: number, at: SkyAt): THREE.Texture {
    const key = Math.floor(t / this.step);
    if (key !== this.key || !this.rt) {
      this.key = key;
      const tk = key * this.step, s = at(tk);
      this.dome.update(s.sky, s.sunDir, s.sunColor, this.origin, tk, cloudsAt(tk), raysAt(tk));
      this.rt?.dispose();
      this.rt = this.pmrem.fromScene(this.scene, 0, 0.1, 6000);
    }
    return this.rt.texture;
  }

  /** The mountains' direction (as the main dome's). */
  setMountains(dir: THREE.Vector3) { this.dome.setMountains(dir); this.key = NaN; }

  dispose() { this.rt?.dispose(); this.pmrem.dispose(); }
}
