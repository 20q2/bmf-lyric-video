// The ground printed, not a flat fill (the user, 2026-10-13: "lack of detail"): in world space, worn lighter patches and
// darker scrub in flat tones, and a fine speck, over whatever colour the ground has (each section's own: the verges'
// vertex colours). The sea along the coast (bluer than it is red) is left as it is. Browser and bun (a shader patch).
import type * as THREE from 'three';
import { printShadows } from './toon';

export function printedGround<T extends THREE.MeshToonMaterial>(m: T): T {
  m.onBeforeCompile = (sh) => {
    printShadows(sh);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
varying vec3 vGroundPos;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
vGroundPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vGroundPos;
float gHash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float gNoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(gHash(i), gHash(i + vec2(1.0, 0.0)), f.x), mix(gHash(i + vec2(0.0, 1.0)), gHash(i + vec2(1.0, 1.0)), f.x), f.y); }
float gFbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * gNoise(p); p = p * 2.07 + 11.3; a *= 0.5; } return s; }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
  if (diffuseColor.b < diffuseColor.r) { // (the land: the sea is bluer than it is red)
    vec2 q = vGroundPos.xz;
    float worn = step(0.57, gFbm(q * 0.035)), scrub = step(0.63, gFbm(q * 0.11 + 7.0)), speck = step(0.94, gHash(floor(q * 2.5)));
    diffuseColor.rgb *= 1.0 + 0.1 * worn - 0.09 * scrub - 0.06 * speck;
  }`);
  };
  m.customProgramCacheKey = () => 'printedGround';
  return m;
}
