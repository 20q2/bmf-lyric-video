// The lit hero (spec §2): the few surfaces that get real light in the printed world — the car's candy paint and its
// chrome. A hero surface writes HERO_ALPHA into the scene's colour target instead of 1 (three.js forces alpha to 1 on
// opaque materials, so the patch replaces that chunk); the print pass reads it and leaves the surface its light: no
// halftone, no violet shade, its ink outline kept. Its reflections come from the scene's environment (look/envsky.ts);
// its diffuse light is the world's (the sun, the hemisphere light), not the environment's too — lit twice, it washed
// out pale.
// Browser and bun (no DOM).
import * as THREE from 'three';

/** The alpha a hero surface writes (the print pass treats anything under ~0.75 as hero). */
export const HERO_ALPHA = 0.5;

/** Marks a material as hero (in place; returned for chaining). `coat`: a tint for its clear coat's reflections (a
 *  candy coat: the sky comes back in the paint's colour, not cream). */
export function heroize<T extends THREE.Material>(m: T, coat?: THREE.ColorRepresentation): T {
  const tint = coat === undefined ? null : new THREE.Color(coat), glsl = tint ? `vec3( ${tint.r.toFixed(4)}, ${tint.g.toFixed(4)}, ${tint.b.toFixed(4)} )` : '';
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <lights_fragment_maps>', `#include <lights_fragment_maps>
	iblIrradiance = vec3( 0.0 );`)
      .replace('( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;', `( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat${tint ? ` * ${glsl}` : ''};`)
      .replace('#include <opaque_fragment>', `gl_FragColor = vec4( outgoingLight, ${HERO_ALPHA.toFixed(2)} );`);
  };
  m.customProgramCacheKey = () => `hero${glsl}`;
  return m;
}

/** Candy-apple paint: a deep colour, its own sheen faint (a broad highlight from the low sun smears it beige), under a
 *  sharp candy coat: the sky comes back in streaks of the paint's own colour, the sun a hard glint. */
export const candyPaint = (color: THREE.ColorRepresentation, coat: THREE.ColorRepresentation = color) =>
  heroize(new THREE.MeshPhysicalMaterial({ color, roughness: 0.6, metalness: 0, specularIntensity: 0.25, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1 }), coat);
/** Chrome: a bright mirror, a touch soft. */
export const chrome = (color: THREE.ColorRepresentation = '#f1ece2') =>
  heroize(new THREE.MeshStandardMaterial({ color, metalness: 1, roughness: 0.14, envMapIntensity: 1.1 }));
