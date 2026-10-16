// The sea: one toon material over the coast's water, its waves drawn in its shader (the user, 2026-10-16: "the ocean
// wave fidelity needs to be improved" — a flat blue with white boxes sliding over it). Printed, not photoreal:
//   swell     long trains rolling in parallel to the shore, crossed by shorter chop: the light's toon bands follow the
//             slopes, and the water's own tone steps in three (troughs deeper, crests paler), as a print's plates would
//   shallows  teal over the sand bar, deeper blue out past the break
//   sky       the swell's back slopes reflecting the sky (the scene's hemisphere light: the horizon's glow, the zenith),
//             strongest at a grazing look, in three printed steps: at dusk the sea reads by the sunset in it
//   surf      breakers standing up out past the break, the lines peeling into whitewater in sections and fully broken
//             nearer in, slowing and bunching as they shoal: a white lip, the face in its own shade before it, the
//             foam it leaves trailing behind in torn patches; foam takes the sky's glow, as surf does
//   shore     foam along the waterline; on the sand (the swash mesh) each wave's wash running up and back, its lace
//             edge, the wet sand it leaves
//   glints    the sun's (and the moon's) light caught on the chop's facets: broken dashes along its path that burn as
//             bright as the light is, gone with it
// Lit by whatever lights the world: the colours are the surface's, the scene's sun tints and shades them. Each mesh
// carries `uv` = (s along the shore, d out from the waterline: m, negative up the sand) and `seaOff` (the way out to
// sea, world xz, unit). The waves move with SEA_TIME (the song's time, set by the coast's set each frame): the meshes
// never move. Browser and bun (shaders are strings).
import * as THREE from 'three';
import { printShadows, toon, WORLD } from './toon';

/** The song's time (s): the waves' clock. */
export const SEA_TIME: THREE.IUniform<number> = { value: 0 };

/** The surf: breakers' spacing (m, at the waterline: they bunch up as they shoal) and speed (m/s, out where they
 *  break), where the break is (m out from the waterline: whitewater inside, standing lines out to `swell`), and how
 *  far a wash runs up the sand (m). */
export const SURF = { L: 14, C: 3.0, broken: 26, swell: 55, runup: 3.4 };

const PARS = /* glsl */ `
uniform float seaTime;
varying vec2 vSea;
varying vec2 vSeaOff;
float seaHash( vec2 p ) { p = fract( p * vec2( 123.34, 456.21 ) ); p += dot( p, p + 45.32 ); return fract( p.x * p.y ); }
float seaNoise( float x ) { float i = floor( x ), f = fract( x ); return mix( seaHash( vec2( i, 1.7 ) ), seaHash( vec2( i + 1.0, 1.7 ) ), f * f * ( 3.0 - 2.0 * f ) ); }
float seaNoise2( vec2 p ) {
  vec2 i = floor( p ), f = fract( p ), u = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( seaHash( i ), seaHash( i + vec2( 1.0, 0.0 ) ), u.x ), mix( seaHash( i + vec2( 0.0, 1.0 ) ), seaHash( i + vec2( 1.0, 1.0 ) ), u.x ), u.y );
}
// a printed dot screen in the sea's own metres: covering share a (0..1) of it; its average where the dots are finer
// than a pixel (no shimmer far off)
float seaDots( vec2 p, float a, float cell ) {
  vec2 q = mat2( 0.70711, -0.70711, 0.70711, 0.70711 ) * p / cell;
  float d = length( fract( q ) - 0.5 ), r = 0.7071 * sqrt( clamp( a, 0.0, 1.0 ) ), aa = length( fwidth( q ) );
  return mix( smoothstep( r + aa, r - aa, d ), clamp( a, 0.0, 1.0 ), smoothstep( 0.25, 0.6, aa ) );
}
// a wave train: amplitude a, wave vector k (per m along s and d: d's part positive, so it rolls in), speed w (rad/s);
// adds its height and slope to h, faded out where it's finer than the pixels
void seaTrain( vec2 p, float a, vec2 k, float w, inout vec3 h ) {
  float ph = dot( k, p ) + w * seaTime, fade = 1.0 - smoothstep( 0.5, 1.4, fwidth( dot( k, p ) ) );
  h += a * fade * vec3( sin( ph ), cos( ph ) * k );
}
`;

/** The sea's shader patch (after the prints' shadows). `swash`: the wash up the sand (transparent). */
function seaPatch(swash: boolean) {
  return (sh: { uniforms: Record<string, THREE.IUniform>; vertexShader: string; fragmentShader: string }) => {
    printShadows(sh);
    sh.uniforms.seaTime = SEA_TIME;
    const S = SURF, f = (v: number) => v.toFixed(3);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
attribute vec2 seaOff;
varying vec2 vSea;
varying vec2 vSeaOff;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
vSea = uv; vSeaOff = seaOff;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\n${PARS}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
  float sAlong = vSea.x, dOut = vSea.y;
  vec2 seaP = vec2( sAlong, max( dOut, 0.0 ) );
  // ---- the swell: a long train parallel to the shore (its lines are what reads), two shorter across it, faint (they
  // break the lines' slopes up: crossed at full strength they printed a checkerboard); the fine chop (the glints') ----
  vec3 sw = vec3( 0.0 ), cross = vec3( 0.0 ), chop = vec3( 0.0 );
  seaTrain( seaP, 1.0, vec2( 0.011, 0.27 ), 1.2, sw );
  seaTrain( seaP, 0.3, vec2( 0.03, 0.55 ), 2.1, sw );
  seaTrain( seaP, 0.12, vec2( -0.15, 0.40 ), 1.75, cross );
  seaTrain( seaP, 0.07, vec2( 0.30, 0.58 ), 2.4, cross );
  seaTrain( seaP, 1.0, vec2( 1.1, 1.9 ), 4.2, chop );
  seaTrain( seaP, 0.8, vec2( -1.7, 1.3 ), 3.7, chop );
  // the water's tone in three steps by the long swell's height (troughs deep, crests pale), teal over the shallows
  float band = floor( clamp( ( sw.x + 0.6 * cross.x ) / 1.6 * 0.5 + 0.5, 0.0, 0.999 ) * 3.0 ) - 1.0;
  float shallow = 1.0 - smoothstep( 4.0, 36.0, dOut ), deep = smoothstep( 60.0, 160.0, dOut );
  diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.06, 0.42, 0.40 ), 0.6 * shallow );
  diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.012, 0.09, 0.2 ), 0.45 * deep );
  diffuseColor.rgb *= 1.0 + 0.36 * band;
  sw += cross;
  // ---- the surf: breakers rolling in, slowing and bunching as they shoal (wD: d stretched out from the shore); wave
  // nW's line, fW across it (0 at its crest, rising behind it out to sea) ----
  float wob = 1.3 * sin( sAlong * 0.07 ) + 0.7 * sin( sAlong * 0.19 + 1.3 );
  float wD = dOut + 0.012 * dOut * dOut;
  float pb = ( wD + wob ) / ${f(S.L)} + seaTime * ${f(S.C / S.L)}, nW = floor( pb ), fW = fract( pb );
  float broken = 1.0 - smoothstep( ${f(S.broken)}, ${f(S.broken + 10)}, dOut );
  // (each line breaks in sections, tapering at their ends; nearer in it's all whitewater)
  float brk = max( smoothstep( 0.22, 0.6, seaNoise( sAlong * 0.04 + nW * 5.17 ) ), 1.0 - smoothstep( 4.0, 9.0, dOut ) ) * broken;
  float lines = 1.0 - smoothstep( ${f(S.swell - 20)}, ${f(S.swell)}, dOut );
  // the lip: thick where it's curling over, thinner where it's spilling, tapering out with its section; scalloped
  float lip = ( 0.05 + 0.07 * seaNoise( sAlong * 0.3 + nW * 1.7 ) ) * sqrt( brk ) * ( 0.8 + 0.2 * seaNoise( sAlong * 2.2 + nW * 9.1 ) );
  // (everything with a derivative in it worked out before any branch: derivatives in one are undefined)
  float above = step( 0.0, dOut );
  float f0 = fract( wob / ${f(S.L)} + seaTime * ${f(S.C / S.L)} ), n0 = floor( wob / ${f(S.L)} + seaTime * ${f(S.C / S.L)} );
  // the face before each crest, in its own shade; on the standing lines out past the break, a pale crest
  diffuseColor.rgb *= 1.0 - 0.4 * above * lines * smoothstep( 0.84, 0.97, fW );
  diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.55, 0.78, 0.82 ), 0.6 * above * lines * ( 1.0 - brk ) * ( 1.0 - smoothstep( 0.0, 0.06, fW ) ) );
  // whitewater: the lip solid, the foam it leaves behind it in streaks and patches that break up and thin out
  float behind = smoothstep( lip, 0.6, fW );
  float patches = step( 0.5 + 0.45 * behind, seaNoise2( vec2( sAlong * 0.32, dOut * 0.75 ) + nW * 3.7 ) * 0.7 + 0.3 * seaNoise2( vec2( sAlong * 1.1, dOut * 2.3 ) ) );
  float foam = brk * max( step( fW, lip ), patches * ( 1.0 - step( 0.45, fW ) ) );
  // the waterline: a band of foam, broad as each wave comes in, its edge torn; dots out from it
  float line = 0.8 + 0.6 * seaNoise( sAlong * 0.5 ) + 1.8 * ( 1.0 - smoothstep( 0.0, 0.45, f0 ) );
  foam = above * max( foam, max( step( dOut, line ), seaDots( vec2( sAlong, dOut ), 0.8 * ( 1.0 - smoothstep( line, line + 2.5, dOut ) ), 0.5 ) ) );
  ${swash ? `
  // ---- the wash up the sand: each wave's, from when it reaches the waterline (f0 wraps there), up and back ----
  float x = -dOut;
  float R = ${f(S.runup)} * ( 0.6 + 0.4 * seaNoise( sAlong * 0.05 + n0 * 4.1 ) ), Rw = ${f(S.runup)} * ( 0.85 + 0.15 * seaNoise( sAlong * 0.13 ) );
  float run = R * sin( 3.14159 * clamp( f0 / 0.75, 0.0, 1.0 ) );
  float film = seaDots( vec2( sAlong, x ), 0.5 * smoothstep( run - 1.6, run, x ), 0.4 );
  if ( x > Rw && x > run ) discard;
  float lace = 0.25 + 0.35 * seaNoise( sAlong * 1.3 + n0 * 3.0 );
  if ( x < run - lace ) { diffuseColor.rgb = mix( vec3( 0.25, 0.55, 0.52 ), vec3( 0.95, 0.93, 0.88 ), film ); diffuseColor.a = 0.8; }
  else if ( x < run ) { diffuseColor.rgb = vec3( 0.95, 0.93, 0.88 ); diffuseColor.a = 1.0; }
  else { diffuseColor.rgb = vec3( 0.3, 0.2, 0.14 ); diffuseColor.a = 0.5 * ( 1.0 - smoothstep( Rw * 0.7, Rw, x ) ); } // (the wet sand it leaves)
  ` : `
  diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.95, 0.93, 0.88 ), foam );`}
  float seaFoam = ${swash ? '1.0' : 'foam'};`)
      // the slopes: the swell's (and on the open water a little of the chop's) tilting the normal for the light's bands
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  vec2 seaT = vec2( -vSeaOff.y, vSeaOff.x );
  vec2 gSw = ( sw.y * seaT + sw.z * vSeaOff ) * 0.42 * ( 1.0 - seaFoam ), gCh = ( chop.y * seaT + chop.z * vSeaOff ) * 0.025;
  vec3 seaNw = normalize( vec3( -gSw.x, 1.0, -gSw.y ) );
  normal = normalize( ( viewMatrix * vec4( seaNw, 0.0 ) ).xyz );
  vec3 seaGn = normalize( ( viewMatrix * vec4( normalize( vec3( -gSw.x - gCh.x, 1.0, -gSw.y - gCh.y ) ), 0.0 ) ).xyz );`)
      // the glints: the lights' highlight on the chop's facets, broken into dashes that drift with it; none in shade
      .replace('#include <opaque_fragment>', `#if NUM_HEMI_LIGHTS > 0
  {
    // the sky in the water: what a wave's slope turns to the lens reflects of the sky — the glow along the horizon
    // at a glance, the zenith's colour looking down — strong at a grazing look, in three printed steps. (The sky's
    // colours are the scene's hemisphere light: its sky the zenith, its ground the horizon at 0.35 — scenes/drive.ts)
    vec3 seaV = normalize( vViewPosition );
    float c = clamp( dot( normal, seaV ), 0.0, 1.0 ), F = 0.02 + 0.98 * pow( 1.0 - c, 5.0 ); // (the swell's slopes: the chop's are only for the glints)
    float Fq = F < 0.06 ? 0.0 : F < 0.16 ? 0.14 : F < 0.36 ? 0.3 : 0.5;
    vec3 rW = ( vec4( reflect( -seaV, normal ), 0.0 ) * viewMatrix ).xyz;
    vec3 sky = mix( hemisphereLights[ 0 ].groundColor / 0.35, hemisphereLights[ 0 ].skyColor, smoothstep( 0.02, 0.45, rW.y ) );
    outgoingLight = mix( outgoingLight, sky, Fq * ( 1.0 - seaFoam ) );
    // (foam scatters the whole sky's light back: it takes its glow — white in the day, the sunset's rose at dusk, dim at
    // night — and stands out from the water round it as surf does)
    vec3 glow = max( hemisphereLights[ 0 ].groundColor / 0.35, hemisphereLights[ 0 ].skyColor );
    outgoingLight = mix( outgoingLight, max( outgoingLight, glow * diffuseColor.rgb ), seaFoam );
  }
#endif
#if NUM_DIR_LIGHTS > 0
  {
    vec3 seaV = normalize( vViewPosition ), gl = vec3( 0.0 );
    float spark = step( 0.6, seaNoise2( vec2( sAlong * 0.9 + seaTime * 0.35, dOut * 2.2 - seaTime * 0.9 ) ) );
    for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
      float sp = dot( seaGn, normalize( directionalLights[ i ].direction + seaV ) );
      gl += directionalLights[ i ].color * step( 0.975, sp );
    }
    outgoingLight += gl * spark * ( 1.0 - seaFoam ) * ( 1.0 - ( 1.0 - printLit ) * printShade ) * 1.6;
  }
#endif
#include <opaque_fragment>`);
  };
}

let WATER: THREE.MeshToonMaterial | null = null, SWASH: THREE.MeshToonMaterial | null = null;
/** The sea's water (one material for every sea mesh: their `uv` and `seaOff` say where each fragment is). */
export function seaWater(): THREE.MeshToonMaterial {
  if (WATER) return WATER;
  const m = toon({ color: WORLD.sea, side: THREE.DoubleSide });
  m.onBeforeCompile = seaPatch(false);
  m.customProgramCacheKey = () => 'sea';
  return (WATER = m);
}
/** The wash up the sand (a strip from the waterline up the beach SURF.runup and a little: transparent, over it). */
export function seaSwash(): THREE.MeshToonMaterial {
  if (SWASH) return SWASH;
  const m = toon({ color: WORLD.sea, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  m.onBeforeCompile = seaPatch(true);
  m.customProgramCacheKey = () => 'seaSwash';
  return (SWASH = m);
}
