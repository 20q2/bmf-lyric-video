// The night's lights. One uniform, NIGHT (0 by day, 1 once the sun is well down: the scene sets it each frame), turns
// them on together:
//   windows   lit windows on the buildings, cell by cell (some lit, some dark), warm and a few cool
//   beams     the car's headlights, cones of light ahead of it on the road
//   pools     the streetlights' circles of light on the road
// All additive or emissive HDR, so they bloom. Browser and bun (shaders are strings).
import * as THREE from 'three';
import { printShadows, toon } from './toon';

export const NIGHT: THREE.IUniform<number> = { value: 0 };
/** The lights' pulse with the beat (the sync layer, drive/heft.ts: the scene sets it): lamps and glows shine this
 *  much brighter, 0 at rest. */
export const PULSE: THREE.IUniform<number> = { value: 0 };
/** How bright the lights shine (HDR multiples). */
export const GLOW = { window: 1.6, lamp: 6, beam: 0.55, pool: 0.5, neon: 2.6, tail: 4, head: 8 };

/** Windows in a toon material's buildings (instanced boxes): a grid on their walls (3 m wide, 3.2 m floors), dark glass
 *  by day; by night some lit, by the cell's hash, from NIGHT. */
export function withWindows(m: THREE.MeshToonMaterial): THREE.MeshToonMaterial {
  m.onBeforeCompile = (sh) => {
    printShadows(sh);
    sh.uniforms.night = NIGHT;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWinPos; varying vec3 vWinN;')
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
  vec4 wpw = vec4(transformed, 1.0);
  vec3 wn = objectNormal;
  #ifdef USE_INSTANCING
    wpw = instanceMatrix * wpw;
    wn = mat3(instanceMatrix) * wn;
  #endif
  wpw = modelMatrix * wpw;
  vWinPos = wpw.xyz;
  vWinN = normalize(mat3(modelMatrix) * wn);`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float night; varying vec3 vWinPos; varying vec3 vWinN;
float winHash(vec3 p) { p = fract(p * .1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }`)
      // the window grid on the walls (3 m wide, 3.2 m floors): dark glass by day, some lit by night
      .replace('#include <color_fragment>', `#include <color_fragment>
  float winMask = 0.0, winLit = 0.0; vec3 winWarm = vec3(1.0);
  if (abs(vWinN.y) < 0.5) {
    float u = abs(vWinN.x) > abs(vWinN.z) ? vWinPos.z : vWinPos.x;
    vec2 g = vec2(u / 3.0, (vWinPos.y - 0.6) / 3.2), cell = floor(g), f = fract(g);
    winMask = step(0.22, f.x) * step(f.x, 0.78) * step(0.25, f.y) * step(f.y, 0.75) * step(0.0, cell.y);
    winLit = step(0.55, winHash(vec3(cell, floor(vWinPos.x * 0.05) + floor(vWinPos.z * 0.05))));
    winWarm = mix(vec3(1.0, 0.62, 0.28), vec3(0.55, 0.75, 1.0), step(0.85, winHash(vec3(cell.yx, 7.0))));
    diffuseColor.rgb *= 1.0 - 0.42 * winMask * (1.0 - winLit * night); // the glass, darker than the stucco
  }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  totalEmissiveRadiance += winWarm * winMask * winLit * night * ${GLOW.window.toFixed(2)};`);
  };
  m.customProgramCacheKey = () => 'withWindows';
  return m;
}

const VERT = /* glsl */ `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main() {
  vUv = uv;
  vec4 p = vec4(position, 1.0);
  vec3 n = normal;
  #ifdef USE_INSTANCING
    p = instanceMatrix * p;
    n = mat3(instanceMatrix) * n;
  #endif
  vec4 mv = modelViewMatrix * p;
  vN = normalize(normalMatrix * n);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;

/** A lamp's bulb: dim by day, GLOW.lamp x its colour by night (unlit, so it blooms). */
export function lampMaterial(color: THREE.ColorRepresentation, strength = GLOW.lamp, day = 0.25): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { night: NIGHT, pulse: PULSE, color: { value: new THREE.Color(color) }, strength: { value: strength }, day: { value: day } },
    vertexShader: VERT,
    fragmentShader: `uniform float night, strength, day, pulse; uniform vec3 color; void main() { gl_FragColor = vec4(color * mix(day, strength * (1.0 + pulse), night), 1.0); }`,
  });
}

/** An additive glow that fades along its geometry's v (from the source at v = 0 to nothing at v = 1), out from its
 *  middle (`radial`), or as headlights' throw on the road (`throwOnRoad`: bright near, fading far and to the sides); and
 *  with NIGHT. */
export function glowMaterial(color: THREE.ColorRepresentation, strength: number, radial = false, throwOnRoad = false): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { night: NIGHT, pulse: PULSE, color: { value: new THREE.Color(color) }, strength: { value: strength } },
    vertexShader: VERT,
    fragmentShader: `uniform float night, strength, pulse; uniform vec3 color; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main() {
  // (multisampling can sample just past an edge, where uv runs outside 0..1: pow of a negative is NaN, which the bloom
  // spreads into a white bar)
  vec2 uv = clamp(vUv, 0.0, 1.0);
  // a pool: out from its middle; a beam: from just ahead of its lamp, and soft where its cone is seen edge-on
  float a = ${radial ? 'pow(max(0.0, 1.0 - length(uv - 0.5) * 2.0), 1.6)'
    : throwOnRoad ? 'pow(uv.y, 1.6) * smoothstep(0.0, 0.45, 1.0 - uv.y) * pow(max(0.0, 1.0 - abs(uv.x - 0.5) * 2.0), 2.2) * smoothstep(0.05, 0.5, abs(dot(normalize(vN), normalize(vV))))'
    : 'pow(1.0 - uv.y, 2.2) * smoothstep(0.0, 0.12, uv.y) * pow(abs(dot(normalize(vN), normalize(vV))), 1.5)'};
  gl_FragColor = vec4(color * a * strength * (1.0 + pulse) * night, 1.0);
}`,
    blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
  });
}

/** What a pane's `behind` attribute says is behind it (nightGlass). */
export const BEHIND = { shop: 0, room: 1, dark: 2 } as const;
// (A shop pane's `trade` attribute (drive/shops.ts TRADE, its shop's) picks what's behind it: 0 shelves of stock, 1
// clothes on a rail, 2 a lunch counter under its menu board, 3 bills taped up inside the glass, 4 an office's vertical
// blinds, 5 a salon's chairs under its mirror, 6 a laundromat's machines.
// Every shop window in town showed the same three shelves of stock: the user, 2026-10-16, "every front of the store
// has the same texture on the front of it".)

/** Window glass on the street fronts (look/facades.ts): an interior seen through it (the user, 2026-10-13: "all the
 *  windows are blacked out ... little things going on inside") — by its `behind` attribute (BEHIND), a shop's back wall
 *  and shelves of stock in muted colours (bright reds, yellows and blues read as "library books": the user,
 *  2026-10-15), or upstairs a room: blinds, curtains or a net, a lamp, a picture on the wall — dim by day under the
 *  glass's tint; by night lit where its `lit` attribute is 1, warm. */
export function nightGlass(): THREE.MeshToonMaterial {
  const m = toon({ color: '#28323c' });
  m.onBeforeCompile = (sh) => {
    printShadows(sh);
    sh.uniforms.night = NIGHT;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
attribute float lit; attribute float behind; attribute float trade; varying float vLit; varying float vBehind; varying float vTrade; varying vec2 vGlassUv; varying vec3 vGlassPos;`).replace('#include <begin_vertex>', `#include <begin_vertex>
vLit = lit; vBehind = behind; vTrade = trade; vGlassUv = uv; vGlassPos = position;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform float night; varying float vLit; varying float vBehind; varying float vTrade; varying vec2 vGlassUv; varying vec3 vGlassPos;
float glassHash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
  vec2 q = vGlassUv; float seed = floor(vGlassPos.x * 0.7 + vGlassPos.y * 0.37 + vGlassPos.z * 1.3);
  vec3 interior; float cover = 0.0; // (how much of it hangs right behind the glass, catching the day)
  if (vBehind < 0.5 && vTrade > 0.5) {
    // a shop of another kind (its trade), all in the same muted colours
    if (vTrade < 1.5) {
      // clothes: a rail across the top, garments hanging off it at their own lengths, a pale back wall
      vec3 wall = mix(vec3(0.62, 0.56, 0.50), vec3(0.50, 0.48, 0.52), step(0.5, glassHash(vec2(seed, 41.0))));
      float rail = step(abs(q.y - 0.84), 0.014), slot = floor(q.x * 13.0 + seed), fx = fract(q.x * 13.0);
      float len = 0.32 + 0.32 * glassHash(vec2(slot, 42.0)), pk = glassHash(vec2(slot, 44.0));
      float hang = step(q.y, 0.83) * step(0.83 - len, q.y) * step(0.07, fx) * step(fx, 0.93) * step(0.2, glassHash(vec2(slot, 43.0)));
      vec3 cloth = mix(mix(vec3(0.70, 0.60, 0.52), vec3(0.42, 0.46, 0.52), step(0.35, pk)), mix(vec3(0.58, 0.42, 0.40), vec3(0.80, 0.76, 0.68), step(0.5, glassHash(vec2(slot, 45.0)))), step(0.65, pk));
      interior = mix(mix(wall, vec3(0.32, 0.30, 0.29), rail), cloth * (0.9 + 0.1 * sin(fx * 18.0)), hang);
    } else if (vTrade < 2.5) {
      // a lunch counter: its front and top across the pane's foot, a menu board up the back wall, its rows of items
      vec3 wall = vec3(0.40, 0.33, 0.29);
      float menu = step(0.66, q.y) * step(q.y, 0.92) * step(0.1, q.x) * step(q.x, 0.9);
      float rows = step(0.55, fract(q.y * 16.0)) * step(0.12, fract(q.x * 3.0)) * step(fract(q.x * 3.0), 0.8);
      vec3 board = mix(vec3(0.84, 0.79, 0.66), vec3(0.34, 0.29, 0.27), rows * 0.65);
      vec3 front = mix(vec3(0.55, 0.43, 0.35), vec3(0.58, 0.36, 0.33), step(0.5, glassHash(vec2(seed, 51.0))));
      interior = mix(mix(wall, board, menu), front * (0.9 + 0.1 * step(0.5, fract(q.x * 12.0))), step(q.y, 0.32));
      interior = mix(interior, vec3(0.80, 0.78, 0.72), step(abs(q.y - 0.33), 0.02));
    } else if (vTrade < 3.5) {
      // bills taped up inside the glass over a dim shop: notices, a menu, a sale, their lines of type
      vec2 f = fract(vec2(q.x * 3.0, q.y * 2.0));
      float cell = floor(q.x * 3.0) + 3.0 * floor(q.y * 2.0) + seed, pk = glassHash(vec2(cell, 62.0));
      float paper = step(0.4, glassHash(vec2(cell, 61.0))) * step(0.12, f.x) * step(f.x, 0.88) * step(0.1, f.y) * step(f.y, 0.86);
      vec3 pc = mix(mix(vec3(0.88, 0.84, 0.74), vec3(0.80, 0.68, 0.50), step(0.45, pk)), vec3(0.62, 0.70, 0.72), step(0.8, pk));
      float lines = step(0.6, fract(f.y * 7.0)) * step(0.24, f.x) * step(f.x, 0.76) * step(0.2, f.y) * step(f.y, 0.62);
      interior = mix(vec3(0.30, 0.28, 0.29), mix(pc, vec3(0.32, 0.27, 0.27), lines * 0.7), paper); cover = paper;
    } else if (vTrade < 4.5) {
      // an office: vertical blinds drawn part way across, a dim room past them
      float drawn = step(q.x, 0.35 + 0.65 * glassHash(vec2(seed, 72.0)));
      vec3 blinds = mix(vec3(0.84, 0.82, 0.76), vec3(0.68, 0.66, 0.61), step(0.84, fract(q.x * 18.0)));
      interior = mix(vec3(0.40, 0.38, 0.36), blinds, drawn); cover = drawn;
    } else if (vTrade < 5.5) {
      // a salon, a barber's: a long mirror across the back wall over a shelf, chairs in a row before it, their backs
      // in a muted oxblood or sage
      vec3 wall = mix(vec3(0.60, 0.56, 0.50), vec3(0.52, 0.55, 0.53), step(0.5, glassHash(vec2(seed, 81.0))));
      float mirror = step(0.5, q.y) * step(q.y, 0.84) * step(0.06, q.x) * step(q.x, 0.94);
      float shelf = step(abs(q.y - 0.47), 0.025);
      float fx = fract(q.x * 3.0), chair = step(abs(fx - 0.5), 0.17) * step(0.2, q.y) * step(q.y, 0.42);
      float seat = step(abs(fx - 0.5), 0.22) * step(abs(q.y - 0.2), 0.035);
      vec3 hide = mix(vec3(0.46, 0.30, 0.29), vec3(0.42, 0.47, 0.40), step(0.5, glassHash(vec2(seed, 82.0))));
      interior = mix(mix(mix(wall, vec3(0.70, 0.74, 0.76) * (0.9 + 0.1 * q.y), mirror), vec3(0.82, 0.80, 0.74), shelf), hide, max(chair, seat));
      interior = mix(interior, vec3(0.30, 0.29, 0.30), step(abs(fx - 0.5), 0.03) * step(q.y, 0.12)); // (the chair's stem)
    } else {
      // a laundromat: a row of washers along the foot, dryers stacked over them, their round doors; a pale wall
      vec3 wall = vec3(0.66, 0.66, 0.62);
      vec2 cell = vec2(fract(q.x * 4.0), q.y);
      float washer = step(0.06, cell.x) * step(cell.x, 0.94) * step(0.06, q.y) * step(q.y, 0.42);
      float dryer = step(0.06, cell.x) * step(cell.x, 0.94) * step(0.48, q.y) * step(q.y, 0.84);
      float door = step(length((vec2(cell.x, q.y) - vec2(0.5, q.y < 0.45 ? 0.24 : 0.66)) * vec2(1.0, 3.0)), 0.3);
      vec3 enamel = vec3(0.82, 0.81, 0.77);
      interior = mix(wall, enamel, max(washer, dryer));
      interior = mix(interior, vec3(0.30, 0.33, 0.36), door * max(washer, dryer));
    }
  } else if (vBehind < 0.5) {
    // a shop: a warm back wall, three shelves across the pane, stock standing on them with gaps between, in putty,
    // sage, muted brick, now and then a slate (a pane's own seed)
    vec3 wall = mix(vec3(0.58, 0.48, 0.38), vec3(0.46, 0.50, 0.50), step(0.5, glassHash(vec2(seed, 3.0))));
    float shelfY = fract(q.y * 3.0 + 0.15), shelf = step(0.9, shelfY);
    float slot = floor(q.x * 9.0 + seed), item = step(0.5, glassHash(vec2(slot, floor(q.y * 3.0) + seed)));
    float itemH = 0.35 + 0.4 * glassHash(vec2(slot, 7.0 + seed)), onShelf = step(shelfY, itemH) * step(0.15, fract(q.x * 9.0)) * step(fract(q.x * 9.0), 0.85) * item;
    float pick = glassHash(vec2(slot, 5.0 + seed));
    vec3 ware = mix(mix(vec3(0.74, 0.68, 0.57), vec3(0.56, 0.60, 0.51), step(0.4, pick)), vec3(0.63, 0.46, 0.40), step(0.75, pick));
    ware = mix(ware, vec3(0.46, 0.52, 0.58), step(0.88, glassHash(vec2(slot, 11.0 + seed))));
    interior = mix(mix(wall, vec3(0.80, 0.74, 0.65), shelf), ware, onShelf);
  } else if (vBehind < 1.5) {
    // a room upstairs: its back wall, shaded toward the ceiling and the floor; a picture on it, a lamp's shade; and
    // across the glass blinds let down part way, curtains drawn to the sides, or a net
    float c = glassHash(vec2(seed, 21.0)), h2 = glassHash(vec2(seed, 22.0));
    vec3 wall = mix(vec3(0.52, 0.45, 0.38), vec3(0.42, 0.45, 0.47), step(0.5, glassHash(vec2(seed, 23.0))));
    vec3 room = wall * mix(0.6, 1.0, smoothstep(0.98, 0.45, q.y)) * mix(0.7, 1.0, smoothstep(0.0, 0.3, q.y));
    float px = 0.3 + 0.4 * glassHash(vec2(seed, 24.0));
    float pic = step(abs(q.x - px), 0.13) * step(abs(q.y - 0.6), 0.1) * step(0.45, glassHash(vec2(seed, 25.0)));
    float picIn = step(abs(q.x - px), 0.1) * step(abs(q.y - 0.6), 0.075);
    room = mix(room, mix(vec3(0.25, 0.2, 0.17), mix(vec3(0.55, 0.58, 0.5), vec3(0.62, 0.5, 0.42), h2), picIn), pic);
    float lx = mix(0.18, 0.82, glassHash(vec2(seed, 26.0)));
    float lamp = step(abs(q.x - lx), 0.1 - (q.y - 0.24) * 0.3) * step(0.24, q.y) * step(q.y, 0.38) * step(0.55, glassHash(vec2(seed, 27.0)));
    room = mix(room, vec3(0.9, 0.82, 0.62), lamp);
    vec3 cloth = mix(mix(vec3(0.70, 0.52, 0.48), vec3(0.72, 0.64, 0.42), step(0.33, h2)), mix(vec3(0.52, 0.58, 0.50), vec3(0.82, 0.78, 0.68), step(0.5, glassHash(vec2(seed, 28.0)))), step(0.66, h2));
    if (c < 0.4) {
      float drop = 0.3 + 0.55 * glassHash(vec2(seed, 29.0)), blind = step(1.0 - drop, q.y);
      vec3 slats = mix(vec3(0.86, 0.82, 0.72), vec3(0.66, 0.62, 0.55), step(0.82, fract(q.y * 16.0)));
      interior = mix(room, slats, blind); cover = blind;
    } else if (c < 0.8) {
      float w = 0.18 + 0.2 * glassHash(vec2(seed, 30.0)), panel = step(q.x, w) + step(1.0 - w, q.x);
      vec3 folds = cloth * (0.82 + 0.18 * sin(q.x * 44.0));
      interior = mix(room, folds, min(panel, 1.0)); cover = min(panel, 1.0);
    } else {
      interior = mix(room, vec3(0.86, 0.84, 0.8), 0.62); cover = 0.6;
    }
  } else {
    interior = vec3(0.12, 0.11, 0.12); // the dark
  }
  // (dim by day under the glass's tint, bright and warm by night where lit; unlit at night, the dark shop)
  float litNow = vLit * night;
  vec3 dayLook = mix(diffuseColor.rgb, interior * mix(0.55, 0.8, cover), 0.75 + 0.1 * cover);
  diffuseColor.rgb = mix(dayLook, interior * 0.9, litNow) * (1.0 - 0.5 * night * (1.0 - vLit));`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
totalEmissiveRadiance += interior * vec3(1.0, 0.8, 0.55) * litNow * ${(GLOW.window * 0.7).toFixed(2)};`);
  };
  m.customProgramCacheKey = () => 'nightGlass';
  return m;
}
