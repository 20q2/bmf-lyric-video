// The sun's shadows, printed (the user, 2026-10-14: "the shadows in all of the scenes need a massive visual fidelity
// overhaul"). What it replaced: one 120 m shadow map, sampled with three's noisy 5-tap PCF and a depth bias of 1.2 m
// (-0.001 of a 1.2 km depth range) plus 12 cm of normal offset: shadows stair-stepped at 6 cm texels, none past ~60 m,
// and shadows starting well off their casters. Worse, its texel snap rebuilt the centre while still reading it, so the
// map landed tens of metres off the view: many shots had no cast shadows at all. Nothing by night.
//
//   cascades  three maps, each a square in the light's frame round a point along the lens's view (12 m, 45 m and
//             200 m either side): ~1 cm texels at the lens, the far one so whole blocks still cast. Each is snapped to
//             its texels (no crawl as the camera moves); a pixel reads the finest map that holds it, blending into the
//             next across a band at the edge.
//   contact   hardening: a few taps at a few depths over the pixel find how far above it the blockers stand; the
//             penumbra grows with that (the light a disc a few times the sun's): crisp at a car's tyres, soft at the
//             far end of a building's long sunset shadow. Every tap follows the receiver's own plane (its depth slope
//             from the derivatives), so a wide kernel on a face the light grazes doesn't shadow itself.
//   print     the soft edge printed as halftone dots (the print pass's screen and angle): solid in the core, dots
//             thinning out across the penumbra. The surface turned from the light takes the same tone (one shadow
//             ink for form and cast shadows, and no acne where the map can't decide).
//   moon      after sunset the same maps follow the moon (scenes/drive.ts aims them): the car and the props stay on
//             the ground by night.
// The lights that carry the maps are dark (intensity 0): three renders and binds their maps, the patch below reads
// them and masks the scene's own sun and moon (which cast nothing themselves). Browser and bun (no DOM).
import * as THREE from 'three';
import { SCALE } from '../engine/scale';

/** Each cascade's half-width (m, in the light's frame) and how far along the lens's view its centre stands (m). */
export const CASCADES = [
  { half: 12, ahead: 7 },
  { half: 45, ahead: 34 },
  { half: 200, ahead: 150 },
] as const;
/** The maps' light stands this far back from a cascade's centre and sees this deep (m). */
const RANGE = { back: 600, depth: 1500 };
/** The light's apparent radius, as penumbra (m) per metre the blocker stands above (the sun's is ~0.0047: three times
 *  it, so the soft ends read at playback size), and the penumbra's least and widest (m: past ~0.2 m a far caster's
 *  shadow smudged into streaks — the print wants an edge, softened, not a blur); how far round a pixel blockers are
 *  looked for (m: past the widest penumbra); the depth bias (m) and the normal offset (texels); how far (m) a face
 *  turned just off the light looks past its own depth; the steepest receiver slope followed (depth per depth). */
export const SOFT = { tan: 0.014, min: 0.012, max: 0.22, search: 0.5, bias: 0.04, normal: 1.5, away: 0.6, slope: 30 };
/** Faces turned from the light print in shadow from the first N.L to solid by the second (the toon ramp's dark band
 *  starts at -1/3: look/toon.ts). */
const FORM = [-0.336, -0.330] as const;
/** The halftone screen the penumbra is printed in (logical px a cell: the print pass's, look/print.ts). */
const CELL = 5.5;

/** Where the shadows' light comes from (world, unit, toward the light). */
export const SHADE_DIR: THREE.IUniform<THREE.Vector3> = { value: new THREE.Vector3(0, 1, 0) };
/** Per cascade: uv per metre across, depth per metre along the light, a texel (uv). */
const SHADE_CASCADE: THREE.IUniform<THREE.Vector4[]> = { value: CASCADES.map(() => new THREE.Vector4()) };

// (a Vogel disc: n points evenly over the unit disc)
const disc = (n: number, turn = 0) => Array.from({ length: n }, (_, i) => {
  const r = Math.sqrt((i + 0.5) / n), a = i * 2.399963 + turn;
  return `vec2(${(r * Math.cos(a)).toFixed(4)}, ${(r * Math.sin(a)).toFixed(4)})`;
}).join(', ');

const PARS = /* glsl */ `
#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS >= 3
uniform vec4 shadeCascade[ 3 ];
uniform vec3 shadeDir;
const vec2 SHADE_SEARCH[ 6 ] = vec2[ 6 ]( ${disc(6, 0.5)} );
const vec2 SHADE_PCF[ 16 ] = vec2[ 16 ]( ${disc(16)} );
// one tap, o (uv) off c, its depth following the receiver's own plane (g: depth per uv: a surface the light grazes
// doesn't shadow itself across a wide kernel), dz (depth units) nearer the light
float shadeTap( sampler2DShadow m, vec3 c, vec2 g, vec2 o, float dz ) { return texture( m, vec3( c.xy + o, c.z + dot( g, o ) - dz ) ); }
// the share of taps round c (radius r, uv) with something at least dz above them toward the light
float shadeOver( sampler2DShadow m, vec3 c, vec2 g, float r, float dz ) {
  float o = 1.0 - shadeTap( m, c, g, vec2( 0.0 ), dz );
  for ( int i = 0; i < 6; i ++ ) o += 1.0 - shadeTap( m, c, g, SHADE_SEARCH[ i ] * r, dz );
  return o / 7.0;
}
// how lit c is in one cascade's map (k: its scales; gm: the receiver's depth slope per metre), the penumbra as wide as
// the blockers stand high
float shadeIn( sampler2DShadow m, vec3 c, vec4 k, float lift, vec2 gm ) {
  c.z -= lift * k.y;
  vec2 g = gm / k.x;
  float r = ${SOFT.search.toFixed(2)} * k.x;
  float f0 = shadeOver( m, c, g, r, 0.15 * k.y );
  if ( f0 < 0.01 ) return 1.0;
  // (levels 6.5x apart: the blockers' height on a log scale, 0.15 m to ~40 m)
  float f1 = shadeOver( m, c, g, r, 1.0 * k.y ), f2 = shadeOver( m, c, g, r, 6.5 * k.y ), f3 = shadeOver( m, c, g, r, 42.0 * k.y );
  float above = 0.15 * pow( 6.5, ( f1 + f2 + f3 ) / f0 );
  float pen = clamp( above * ${SOFT.tan.toFixed(4)}, ${SOFT.min.toFixed(3)}, ${SOFT.max.toFixed(2)} ) * k.x;
  pen = max( pen, 1.2 * k.z );
  float s = 0.0;
  for ( int i = 0; i < 16; i ++ ) s += shadeTap( m, c, g, SHADE_PCF[ i ] * pen, 0.0 );
  return s / 16.0;
}
float shadeEdge( vec3 c ) { vec2 d = min( c.xy, 1.0 - c.xy ); return min( min( d.x, d.y ), 1.0 - c.z ); }
// the receiver's depth slope (depth units per metre across the light), from the finest map's coordinates' derivatives
// (taken before any branch: derivatives in one are undefined)
vec2 shadeSlope() {
  vec3 dx = dFdx( vDirectionalShadowCoord[ 0 ].xyz ), dy = dFdy( vDirectionalShadowCoord[ 0 ].xyz );
  mat2 J = mat2( dx.x, dy.x, dx.y, dy.y );
  if ( abs( determinant( J ) ) < 1e-14 ) return vec2( 0.0 );
  vec2 g = inverse( J ) * vec2( dx.z, dy.z ) * shadeCascade[ 0 ].x;
  float cap = ${SOFT.slope.toFixed(1)} * shadeCascade[ 0 ].y, l = length( g );
  return l > cap ? g * ( cap / l ) : g;
}
// the finest cascade that holds this point, blended into the next across its edge
float shadeLight( float lift, vec2 gm ) {
  const float B = 0.08;
  vec3 c0 = vDirectionalShadowCoord[ 0 ].xyz, c1 = vDirectionalShadowCoord[ 1 ].xyz, c2 = vDirectionalShadowCoord[ 2 ].xyz;
  float e0 = shadeEdge( c0 );
  if ( e0 > B ) return shadeIn( directionalShadowMap[ 0 ], c0, shadeCascade[ 0 ], lift, gm );
  float e1 = shadeEdge( c1 ), e2 = shadeEdge( c2 ), far = 1.0;
  if ( e2 > 0.0 && e1 < B ) far = mix( 1.0, shadeIn( directionalShadowMap[ 2 ], c2, shadeCascade[ 2 ], lift, gm ), smoothstep( 0.0, B, e2 ) );
  if ( e1 > 0.0 ) far = mix( far, shadeIn( directionalShadowMap[ 1 ], c1, shadeCascade[ 1 ], lift, gm ), smoothstep( 0.0, B, e1 ) );
  if ( e0 > 0.0 ) far = mix( far, shadeIn( directionalShadowMap[ 0 ], c0, shadeCascade[ 0 ], lift, gm ), smoothstep( 0.0, B, e0 ) );
  return far;
}
#endif
// a share of shadow printed: halftone dots (45 degrees), solid from ~0.97
float shadeDots( float a ) {
  if ( a < 0.004 ) return 0.0;
  if ( a > 0.996 ) return 1.0;
  vec2 q = mat2( 0.70711, -0.70711, 0.70711, 0.70711 ) * gl_FragCoord.xy / ${(CELL * SCALE).toFixed(2)};
  float d = length( fract( q ) - 0.5 ), r = 0.7071 * sqrt( a ), aa = ${(0.75 / (CELL * SCALE)).toFixed(4)};
  return smoothstep( r + aa, r - aa, d );
}`;

// (before the lights: how lit this point is by the shadows' light, smooth and as printed)
const LIT = /* glsl */ `
float shadeLit = 1.0, printLit = 1.0;
#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS >= 3
  vec2 shadeGm = shadeSlope();
  if ( receiveShadow ) {
    float nl = dot( normal, normalize( ( viewMatrix * vec4( shadeDir, 0.0 ) ).xyz ) );
    // (the toon ramp's dark band, turned well away, is in shadow; a face turned only a little from the light is in
    // the map itself, so it looks past its own depth: lit unless something else is over it)
    float form = smoothstep( ${FORM[0].toFixed(3)}, ${FORM[1].toFixed(3)}, nl );
    shadeLit = form > 0.0 ? min( form, shadeLight( ${SOFT.away.toFixed(2)} * ( 1.0 - smoothstep( 0.0, 0.15, nl ) ), shadeGm ) ) : 0.0;
    // (a trace of shadow leaves no dots, a near-full one prints solid: no stray dot fields across a lit face)
    printLit = 1.0 - shadeDots( smoothstep( 0.12, 0.92, 1.0 - shadeLit ) );
  }
#endif
`;

const DIR_INFO = 'getDirectionalLightInfo( directionalLight, directLight );';
const DIR_SHADOW = /\n\s*#if defined\( USE_SHADOWMAP \) && \( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS \)\n\s*directionalLightShadow = directionalLightShadows\[ i \];\n\s*directLight\.color \*= [^\n]*\n\s*#endif/;
/** three's lights chunk with the directional lights masked by `lit` (and their own shadow lookups gone: the maps'
 *  lights are dark, the sun and moon cast nothing). */
function lightsChunk(lit: string): string {
  const src = THREE.ShaderChunk.lights_fragment_begin;
  if (!src.includes(DIR_INFO) || !DIR_SHADOW.test(src)) throw new Error('look/shadows: three.js lights chunk changed');
  return LIT + src.replace(DIR_SHADOW, '').replace(DIR_INFO, `${DIR_INFO}\n\t\tdirectLight.color *= ${lit};`);
}
const CHUNK = { print: lightsChunk('printLit'), smooth: lightsChunk('shadeLit') };

/** Patches a lit material's shader to take the cascades' shadows: printed (dots, solid core) or, for the hero's own
 *  light, smooth. Returns the fragment shader's source; the caller adds its tone after the lights if it prints. */
export function shadePatch(sh: { uniforms: Record<string, THREE.IUniform>; fragmentShader: string }, printed = true) {
  sh.uniforms.shadeCascade = SHADE_CASCADE;
  sh.uniforms.shadeDir = SHADE_DIR;
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <shadowmap_pars_fragment>', `#include <shadowmap_pars_fragment>\n${PARS}`)
    .replace('#include <lights_fragment_begin>', printed ? CHUNK.print : CHUNK.smooth);
}

/** The cascades' lights: add `objects` to the scene, `update` each frame. */
export class Cascades {
  readonly lights = CASCADES.map(() => new THREE.DirectionalLight(0xffffff, 0));
  constructor(private size: number) {
    this.lights.forEach((l, i) => {
      const h = CASCADES[i]!.half, texel = (2 * h) / size;
      l.castShadow = true;
      l.shadow.mapSize.set(size, size);
      Object.assign(l.shadow.camera, { left: -h, right: h, top: h, bottom: -h, near: 1, far: RANGE.depth });
      l.shadow.camera.updateProjectionMatrix();
      l.shadow.bias = -SOFT.bias / (RANGE.depth - 1);
      l.shadow.normalBias = SOFT.normal * texel;
      SHADE_CASCADE.value[i]!.set(1 / (2 * h), 1 / (RANGE.depth - 1), 1 / size, 0);
    });
  }
  get objects(): THREE.Object3D[] { return this.lights.flatMap((l) => [l, l.target]); }

  /** Round the lens's view, from `toLight` (unit). */
  update(cam: THREE.Camera, toLight: THREE.Vector3) {
    SHADE_DIR.value.copy(toLight);
    const view = new THREE.Vector3(); cam.getWorldDirection(view);
    const lz = toLight.clone().normalize(), up = Math.abs(lz.y) > 0.99 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0);
    const lx = up.cross(lz).normalize(), ly = lz.clone().cross(lx);
    this.lights.forEach((l, i) => {
      const { half, ahead } = CASCADES[i]!, texel = (2 * half) / this.size, snap = (v: number) => Math.round(v / texel) * texel;
      const c = cam.position.clone().addScaledVector(view, ahead);
      // (snapped to its texels in the light's frame: edges stay put as the camera moves. The three coordinates are
      // read before c is rebuilt: the old map's snap read them off the half-rebuilt vector, which threw its square tens
      // of metres off the view — why whole shots had no shadows)
      const x = snap(c.dot(lx)), y = snap(c.dot(ly)), z = c.dot(lz);
      c.copy(lx).multiplyScalar(x).addScaledVector(ly, y).addScaledVector(lz, z);
      l.position.copy(c).addScaledVector(lz, RANGE.back);
      l.target.position.copy(c);
      l.updateMatrixWorld(); l.target.updateMatrixWorld();
    });
  }
}
