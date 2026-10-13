// The lit hero (spec §2): the few surfaces that get real light in the printed world — the car's candy paint and its
// chrome. A hero surface writes HERO_ALPHA into the scene's colour target instead of 1 (three.js forces alpha to 1 on
// opaque materials, so the patch replaces that chunk); the print pass reads it and leaves the surface its light: no
// halftone, no violet shade, its ink outline kept. Its reflections come from the scene's environment (look/envsky.ts).
// Browser and bun (no DOM).
import * as THREE from 'three';

/** The alpha a hero surface writes (the print pass treats anything under ~0.75 as hero). */
export const HERO_ALPHA = 0.5;

/** Marks a material as hero (in place; returned for chaining). */
export function heroize<T extends THREE.Material>(m: T): T {
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `gl_FragColor = vec4( outgoingLight, ${HERO_ALPHA.toFixed(2)} );`);
  };
  m.customProgramCacheKey = () => 'hero';
  return m;
}

/** Candy-apple paint: a deep colour under a mirror clearcoat. */
export const candyPaint = (color: THREE.ColorRepresentation) =>
  heroize(new THREE.MeshPhysicalMaterial({ color, roughness: 0.32, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 0.9 }));
/** Chrome: a bright mirror, a touch soft. */
export const chrome = (color: THREE.ColorRepresentation = '#f1ece2') =>
  heroize(new THREE.MeshStandardMaterial({ color, metalness: 1, roughness: 0.14, envMapIntensity: 1.1 }));
