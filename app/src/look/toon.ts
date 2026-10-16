// Materials for the screen-printed world: toon shading in three flat tones (shadow, mid, lit), and the palette the
// world is printed in — LA stucco pastels, dark palm silhouettes, warm asphalt. Browser and bun (no DOM).
import * as THREE from 'three';
import { shadePatch } from './shadows';

/** The three tones a lit surface prints in (shares of the light it gets). */
export const TONES = [0.5, 0.78, 1] as const;
const ramp = new THREE.DataTexture(new Uint8Array(TONES.map((v) => Math.round(v * 255))), TONES.length, 1, THREE.RedFormat);
ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
ramp.generateMipmaps = false;
ramp.needsUpdate = true;

/** How much the sun's cast shadows print (0..1): the scene sets it by the sun's height (none at night or in a tunnel). */
export const PRINT_SHADE: THREE.IUniform<number> = { value: 0 };
/** What a surface in the sun's shadow keeps of its lit colour, per channel (linear): the print's shadow ink, a warm
 *  rose — a tone of the surface, never near black (the user, 2026-10-14: shade at dusk too dark and too dominant).
 *  The print pass pulls it the rest of the way toward its violet. */
export const SHADE_INK = new THREE.Color(0.5, 0.33, 0.37);

/** Printed shadows: the shadow (look/shadows.ts: cascaded, contact-hardening, its soft edge printed in halftone dots)
 *  prints the whole surface in a tone of its lit colour (SHADE_INK), not by taking away the direct light it blocks
 *  (under a low sun that's next to all the light: the shade went near black, or where the ground got little direct
 *  light, barely showed and poles and the car seemed to hover). A patch for a toon material's shader: materials with
 *  their own patch call it first. */
export function printShadows(sh: { uniforms: Record<string, THREE.IUniform>; vertexShader: string; fragmentShader: string }) {
  shadePatch(sh);
  sh.uniforms.printShade = PRINT_SHADE;
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', `#include <common>
uniform float printShade;`)
    .replace('#include <opaque_fragment>', `outgoingLight *= mix(vec3(1.0), vec3(${SHADE_INK.toArray().map((v) => v.toFixed(3)).join(', ')}), (1.0 - printLit) * printShade);
#include <opaque_fragment>`);
}

export const toon = (o: THREE.MeshToonMaterialParameters = {}) => {
  const m = new THREE.MeshToonMaterial({ gradientMap: ramp, ...o });
  m.onBeforeCompile = printShadows;
  m.customProgramCacheKey = () => 'toon';
  return m;
};

/** The world's colours (sRGB). */
export const WORLD = {
  ground: '#d9ac5c', sand: '#f0d39b', sea: '#2b78a6', asphalt: '#4a3c55', dash: '#f4e7c2',
  trunk: '#4a3034', crown: '#22383a', rock: '#8a5e55', motel: '#f28aa8',
  car: '#c8102e', carDark: '#140d18', chrome: '#aaa498', post: '#3d3540', backing: '#2a2430',
  /** Buildings: stucco pastels, picked per plot. */
  stucco: ['#f4b6c2', '#f7c9a0', '#a9d8c6', '#f3e4c4', '#e3907a', '#cdb8e6', '#f6dd8f', '#9cc3e0'],
} as const;
