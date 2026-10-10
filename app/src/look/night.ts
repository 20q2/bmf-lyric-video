// The night's lights. One uniform, NIGHT (0 by day, 1 once the sun is well down: the scene sets it each frame), turns
// them on together:
//   windows   lit windows on the buildings, cell by cell (some lit, some dark), warm and a few cool
//   beams     the car's headlights, cones of light ahead of it on the road
//   pools     the streetlights' circles of light on the road
// All additive or emissive HDR, so they bloom. Browser and bun (shaders are strings).
import * as THREE from 'three';

export const NIGHT: THREE.IUniform<number> = { value: 0 };
/** How bright the lights shine (HDR multiples). */
export const GLOW = { window: 1.6, lamp: 6, beam: 0.55, pool: 0.5, neon: 2.6, tail: 4, head: 8 };

/** Light windows into a toon material's buildings (instanced boxes): a grid of windows on their walls (3 m wide, 3.2 m
 *  floors), some lit, by the cell's hash, from NIGHT. */
export function withWindows(m: THREE.MeshToonMaterial): THREE.MeshToonMaterial {
  m.onBeforeCompile = (sh) => {
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
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  if (night > 0.0 && abs(vWinN.y) < 0.5) {
    // along the wall, and up it
    float u = abs(vWinN.x) > abs(vWinN.z) ? vWinPos.z : vWinPos.x;
    vec2 g = vec2(u / 3.0, (vWinPos.y - 0.6) / 3.2), cell = floor(g), f = fract(g);
    float lit = step(0.55, winHash(vec3(cell, floor(vWinPos.x * 0.05) + floor(vWinPos.z * 0.05))));
    float win = step(0.22, f.x) * step(f.x, 0.78) * step(0.25, f.y) * step(f.y, 0.75) * step(0.0, cell.y);
    vec3 warm = mix(vec3(1.0, 0.62, 0.28), vec3(0.55, 0.75, 1.0), step(0.85, winHash(vec3(cell.yx, 7.0))));
    totalEmissiveRadiance += warm * win * lit * night * ${GLOW.window.toFixed(2)};
  }`);
  };
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
    uniforms: { night: NIGHT, color: { value: new THREE.Color(color) }, strength: { value: strength }, day: { value: day } },
    vertexShader: VERT,
    fragmentShader: `uniform float night, strength, day; uniform vec3 color; void main() { gl_FragColor = vec4(color * mix(day, strength, night), 1.0); }`,
  });
}

/** An additive glow that fades along its geometry's v (from the source at v = 0 to nothing at v = 1), out from its
 *  middle (`radial`), or as headlights' throw on the road (`throwOnRoad`: bright near, fading far and to the sides); and
 *  with NIGHT. */
export function glowMaterial(color: THREE.ColorRepresentation, strength: number, radial = false, throwOnRoad = false): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { night: NIGHT, color: { value: new THREE.Color(color) }, strength: { value: strength } },
    vertexShader: VERT,
    fragmentShader: `uniform float night, strength; uniform vec3 color; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main() {
  // (multisampling can sample just past an edge, where uv runs outside 0..1: pow of a negative is NaN, which the bloom
  // spreads into a white bar)
  vec2 uv = clamp(vUv, 0.0, 1.0);
  // a pool: out from its middle; a beam: from just ahead of its lamp, and soft where its cone is seen edge-on
  float a = ${radial ? 'pow(max(0.0, 1.0 - length(uv - 0.5) * 2.0), 1.6)'
    : throwOnRoad ? 'pow(uv.y, 1.4) * smoothstep(0.0, 0.25, 1.0 - uv.y) * pow(max(0.0, 1.0 - abs(uv.x - 0.5) * 2.0), 1.3)'
    : 'pow(1.0 - uv.y, 2.2) * smoothstep(0.0, 0.12, uv.y) * pow(abs(dot(normalize(vN), normalize(vV))), 1.5)'};
  gl_FragColor = vec4(color * a * strength * night, 1.0);
}`,
    blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
  });
}
