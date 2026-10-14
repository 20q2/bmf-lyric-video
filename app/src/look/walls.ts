// The walls of a lyric's building (world.ts buildCarrier: the box a neon, a storefront or a marquee stands on). One
// plain box read as a blank slab (the stranger test, 2026-10-13), so its material prints it as a wall: stucco grain
// and faint block courses in its own space, a darker base band at the ground, and windows above the ground floor on
// every wall but the sign's own column (where the face hangs), some lit at night (look/night.ts NIGHT). Browser and
// bun (a shader patch).
import * as THREE from 'three';
import { GLOW, NIGHT } from './night';
import { printShadows, toon } from './toon';

/** The windows' grid (m): a cell's width, a floor's height; the ground floor's height (no windows in it). */
export const WALL = { cell: 3.0, floor: 3.2, ground: 3.4 };

/** A wall material for a box of `size` (its local frame: x along the road, y up, z toward it), its sign hanging on its
 *  front within `maskX` of its middle. */
export function wallMaterial(color: THREE.ColorRepresentation, size: THREE.Vector3, maskX: number): THREE.MeshToonMaterial {
  const m = toon({ color });
  m.onBeforeCompile = (sh) => {
    printShadows(sh);
    sh.uniforms.night = NIGHT;
    sh.uniforms.wallFloor = { value: -size.y / 2 };
    sh.uniforms.wallMaskX = { value: maskX };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
varying vec3 vWallPos; varying vec3 vWallN;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
vWallPos = position; vWallN = normal;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float night, wallFloor, wallMaskX; varying vec3 vWallPos; varying vec3 vWallN;
float wallHash(vec3 p) { p = fract(p * .1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
  float wMask = 0.0, wLit = 0.0; vec3 wWarm = vec3(1.0);
  if (abs(vWallN.y) < 0.5) {
    vec2 q = abs(vWallN.x) > 0.5 ? vWallPos.zy : vWallPos.xy;
    // the stucco's grain and the block courses, a darker base at the ground
    diffuseColor.rgb *= 0.95 + 0.09 * wallHash(vec3(floor(q * 2.5), 3.0));
    diffuseColor.rgb *= 1.0 - 0.07 * step(0.94, fract(q.y / 0.62));
    if (vWallPos.y < wallFloor + 0.7) diffuseColor.rgb *= 0.8;
    // the windows: above the ground floor, off the sign's column on the front
    bool front = abs(vWallN.z) > 0.5 && abs(vWallPos.x) < wallMaskX;
    if (!front && vWallPos.y > wallFloor + ${WALL.ground.toFixed(1)}) {
      vec2 g = vec2(q.x / ${WALL.cell.toFixed(1)}, (vWallPos.y - wallFloor - ${WALL.ground.toFixed(1)}) / ${WALL.floor.toFixed(1)}), cell = floor(g), f = fract(g);
      wMask = step(0.24, f.x) * step(f.x, 0.76) * step(0.22, f.y) * step(f.y, 0.72);
      // (lit on the front only: the ends' lit cells, seen edge-on past the sign, split into bright stripes)
      wLit = step(0.5, wallHash(vec3(cell, 11.0))) * step(0.5, abs(vWallN.z));
      wWarm = mix(vec3(1.0, 0.62, 0.28), vec3(0.55, 0.75, 1.0), step(0.85, wallHash(vec3(cell.yx, 7.0))));
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.16, 0.19, 0.23), wMask * (1.0 - wLit * night));
    }
  }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  totalEmissiveRadiance += wWarm * wMask * wLit * night * ${GLOW.window.toFixed(2)};`);
  };
  m.customProgramCacheKey = () => 'wall';
  return m;
}
