// Materials for the screen-printed world: toon shading in three flat tones (shadow, mid, lit), and the palette the
// world is printed in — LA stucco pastels, dark palm silhouettes, warm asphalt. Browser and bun (no DOM).
import * as THREE from 'three';

/** The three tones a lit surface prints in (shares of the light it gets). */
export const TONES = [0.5, 0.78, 1] as const;
const ramp = new THREE.DataTexture(new Uint8Array(TONES.map((v) => Math.round(v * 255))), TONES.length, 1, THREE.RedFormat);
ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
ramp.generateMipmaps = false;
ramp.needsUpdate = true;

export const toon = (o: THREE.MeshToonMaterialParameters = {}) => new THREE.MeshToonMaterial({ gradientMap: ramp, ...o });

/** The world's colours (sRGB). */
export const WORLD = {
  ground: '#d9ac5c', sand: '#f0d39b', sea: '#2b78a6', asphalt: '#4a3c55', dash: '#f4e7c2',
  trunk: '#4a3034', crown: '#22383a', rock: '#8a5e55', motel: '#f28aa8',
  car: '#c8102e', carDark: '#140d18', chrome: '#e6e1d6', post: '#3d3540', backing: '#2a2430',
  /** Buildings: stucco pastels, picked per plot. */
  stucco: ['#f4b6c2', '#f7c9a0', '#a9d8c6', '#f3e4c4', '#e3907a', '#cdb8e6', '#f6dd8f', '#9cc3e0'],
} as const;
