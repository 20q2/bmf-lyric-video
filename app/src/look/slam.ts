// The slam card: "CRASH", full frame, on the word: a printed card held up to the lens for a beat, white capitals on red,
// tilted and shaking. Drawn over the finished frame (the scene composites it after the print pass), so nothing in the
// world prints over it. Browser only (canvas).
import * as THREE from 'three';
import { F } from '../engine/type';

/** How long the slam holds (s): the last "crash" (before black) and any other (the tunnel's). */
export const SLAM = { last: 0.4, other: 0.28 };

export class SlamCard {
  readonly texture: THREE.CanvasTexture;
  constructor() {
    const c = document.createElement('canvas'); c.width = 1920; c.height = 1080;
    const x = c.getContext('2d')!;
    x.fillStyle = '#c8102e'; x.fillRect(0, 0, 1920, 1080);
    // the print's halftone in the red, so it belongs with the rest
    x.fillStyle = 'rgba(80,0,20,0.25)';
    for (let yy = 0; yy < 1080; yy += 9) for (let xx = (yy / 9) % 2 ? 4.5 : 0; xx < 1920; xx += 9) { x.beginPath(); x.arc(xx, yy, 1.6, 0, Math.PI * 2); x.fill(); }
    x.save(); x.translate(960, 560); x.rotate(-0.08);
    x.font = `520px "${F.archivo(62, 900)}"`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.lineWidth = 30; x.strokeStyle = '#16131a'; x.strokeText('CRASH', 0, 0);
    x.fillStyle = '#fbf7ee'; x.fillText('CRASH', 0, 0);
    x.restore();
    this.texture = new THREE.CanvasTexture(c);
    this.texture.colorSpace = THREE.SRGBColorSpace;
  }

  /** Where to draw it at k (0..1 through its hold): zoomed in a touch (so its shake never shows an edge), punching
   *  in from a little bigger, jittering. */
  placement(k: number, t: number): { scale: [number, number]; offset: [number, number] } {
    const z = 0.92 - 0.06 * (1 - k);
    return { scale: [z, z], offset: [0.006 * Math.sin(t * 97), 0.008 * Math.cos(t * 83)] };
  }
}
