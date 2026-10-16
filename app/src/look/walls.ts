// The walls of a lyric's building (world.ts buildCarrier: the box a neon, a storefront or a marquee stands on). One
// plain box read as a blank slab (the stranger test, 2026-10-13), so its material prints it as a wall: stucco grain
// and faint block courses in its own space, a darker base band at the ground, and windows above the ground floor on
// every wall but the sign's own column (where the face hangs), some lit at night (look/night.ts NIGHT). Browser and
// bun (a shader patch).
// Its windows are laid out per wall, from the box's size: as many whole bays as the wall is wide, centred on it, and
// as many floors as fit whole under its parapet, each with a sill under it and the head's shadow in its glass. (Its
// grid ran from the box's middle through every wall, so a bay fell across a corner, half on each wall, and the top
// floor's windows ran on into the roof's edge, cut off by it — on Slauson's boxes at 82 s, "their window textures are
// clipping into the sides and tops, and it looks really bad", the user, 2026-10-15. Those are street fronts now,
// scenes/sets/verse2.ts; the lyrics' own buildings still print theirs.)
import * as THREE from 'three';
import { GLOW, NIGHT } from './night';
import { printShadows, toon } from './toon';

/** The windows' grid (m): a bay's width, a floor's height; the ground floor's height (no windows in it); the parapet
 *  (no window's head nearer the top than this). */
export const WALL = { cell: 3.0, floor: 3.2, ground: 3.4, parapet: 0.7 };

/** A wall material for a box of `size` (its local frame: x along the road, y up, z toward it), its sign hanging on its
 *  front within `maskX` of its middle. */
export function wallMaterial(color: THREE.ColorRepresentation, size: THREE.Vector3, maskX: number, windows = true): THREE.MeshToonMaterial {
  const m = toon({ color });
  m.onBeforeCompile = (sh) => {
    printShadows(sh);
    sh.uniforms.night = NIGHT;
    sh.uniforms.wallFloor = { value: -size.y / 2 };
    sh.uniforms.wallSize = { value: size.clone() };
    sh.uniforms.wallMaskX = { value: windows ? maskX : 1e6 }; // (no windows: the whole front is the sign's column, the ends go dark)
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
varying vec3 vWallPos; varying vec3 vWallN;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
vWallPos = position; vWallN = normal;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float night, wallFloor, wallMaskX; uniform vec3 wallSize; varying vec3 vWallPos; varying vec3 vWallN;
float wallHash(vec3 p) { p = fract(p * .1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
  float wMask = 0.0, wLit = 0.0; vec3 wWarm = vec3(1.0);
  if (abs(vWallN.y) < 0.5) {
    vec2 q = abs(vWallN.x) > 0.5 ? vWallPos.zy : vWallPos.xy;
    // the stucco's grain and the block courses, a darker base at the ground
    diffuseColor.rgb *= 0.95 + 0.09 * wallHash(vec3(floor(q * 2.5), 3.0));
    diffuseColor.rgb *= 1.0 - 0.07 * step(0.94, fract(q.y / 0.62));
    if (vWallPos.y < wallFloor + 0.7) diffuseColor.rgb *= 0.8;
    // the windows: above the ground floor, off the sign's column on the front; whole bays centred on each wall (so none
    // reaches round a corner), whole floors under the parapet (so none runs into the roof's edge)
    bool front = abs(vWallN.z) > 0.5 && abs(vWallPos.x) < wallMaskX;
    float faceW = abs(vWallN.x) > 0.5 ? wallSize.z : wallSize.x, bays = floor(faceW / ${WALL.cell.toFixed(1)});
    float y0 = wallFloor + ${WALL.ground.toFixed(1)}, rows = floor((wallSize.y - ${(WALL.ground + WALL.parapet).toFixed(2)} - 0.72 * ${WALL.floor.toFixed(1)}) / ${WALL.floor.toFixed(1)}) + 1.0;
    if (!front && wallMaskX < 1e5 && vWallPos.y > y0) {
      vec2 g = vec2(q.x / ${WALL.cell.toFixed(1)} + bays * 0.5, (vWallPos.y - y0) / ${WALL.floor.toFixed(1)}), cell = floor(g), f = fract(g);
      float inGrid = step(0.0, cell.x) * step(cell.x, bays - 1.0) * step(cell.y, rows - 1.0);
      wMask = step(0.24, f.x) * step(f.x, 0.76) * step(0.22, f.y) * step(f.y, 0.72) * inGrid;
      // its sill, a lighter ledge under it; in its glass, the head's shadow along its top and the jamb's down one side
      float sill = step(0.21, f.x) * step(f.x, 0.79) * step(0.17, f.y) * step(f.y, 0.22) * inGrid;
      float reveal = max(step(0.65, f.y), step(f.x, 0.3));
      diffuseColor.rgb *= 1.0 + 0.22 * sill;
      // (lit on the front only: the ends' lit cells, seen edge-on past the sign, split into bright stripes)
      wLit = step(0.5, wallHash(vec3(cell, 11.0))) * step(0.5, abs(vWallN.z));
      wWarm = mix(vec3(1.0, 0.62, 0.28), vec3(0.55, 0.75, 1.0), step(0.85, wallHash(vec3(cell.yx, 7.0))));
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.16, 0.19, 0.23) * (1.0 - 0.35 * reveal), wMask * (1.0 - wLit * night));
    }
  }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  totalEmissiveRadiance += wWarm * wMask * wLit * night * ${GLOW.window.toFixed(2)};`);
  };
  m.customProgramCacheKey = () => (windows ? 'wall' : 'wallPlain');
  return m;
}
