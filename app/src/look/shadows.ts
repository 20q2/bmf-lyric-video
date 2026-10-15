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
//             thinning out across the penumbra. The shade is a warm tone of the lit colour (look/toon.ts), not the
//             light taken away: under a low sun that left next to nothing (the user, 2026-10-14: too dark at dusk).
//             Faces turned from the light are the toon ramp's dark band and take no cast shadow on top.
//   moon      after sunset the same maps follow the moon (scenes/drive.ts aims them): the car and the props stay on
//             the ground by night.
//   cost      three draws every caster into every map whose box it touches, walking the whole world once a map: with
//             three maps that walk and those draws took ~45 ms of a ~100 ms frame (the user, 2026-10-15: "brutally
//             destroyed"). So a caster is drawn only into a map whose texels it spans (a pebble isn't drawn into the
//             far map, where it'd print as a speck at most) and only if its shadow can fall in the lens's view
//             (`sees`): ~6500 draws a frame became ~1900. scenes/zones.ts uses `sees` to hide whole parts of the world.
// The lights that carry the maps are dark (intensity 0): three renders and binds their maps, the patch below reads
// them and masks the scene's own sun and moon (which cast nothing themselves). Browser and bun (no DOM).
import * as THREE from 'three';
import { SCALE } from '../engine/scale';

/** Each cascade's half-width (m, in the light's frame), how far along the lens's view its centre stands (m), and the
 *  least caster drawn into it (m, bounding radius: about its least penumbra, 1.2 texels; smaller, its shadow is a
 *  speck the halftone doesn't print). */
export const CASCADES = [
  { half: 12, ahead: 7, least: 0 },
  { half: 45, ahead: 34, least: 0.06 },
  { half: 200, ahead: 150, least: 0.3 },
] as const;
/** The cascades move out along the view at most this far (m) to where the frame's foot meets the ground. */
const GROUND_REACH = 120;
/** The maps' light stands this far back from a cascade's centre and sees this deep (m). */
const RANGE = { back: 600, depth: 1500 };
/** The light's apparent radius, as penumbra (m) per metre the blocker stands above (the sun's is ~0.0047: three times
 *  it, so the soft ends read at playback size), and the penumbra's least and widest (m: past ~0.2 m a far caster's
 *  shadow smudged into streaks — the print wants an edge, softened, not a blur); how far round a pixel blockers are
 *  looked for (m: past the widest penumbra); the depth bias (m) and the normal offset (texels); how far (m) a face
 *  turned just off the light looks past its own depth; the steepest receiver slope followed (depth per depth). */
export const SOFT = { tan: 0.014, min: 0.012, max: 0.22, search: 0.5, bias: 0.04, normal: 1.5, away: 0.6, slope: 30 };
/** Faces turned further from the light than this N.L are the toon ramp's dark band (look/toon.ts): no cast shadow on
 *  them. */
const FORM = -0.333;
/** Casters further than these (m along the light) cast fainter, then not at all: shade from out of shot, up to the
 *  far end of a long sunset shadow, fades (the user, 2026-10-14: shade at a low sun was too dark and too dominant). */
const FADE = [160, 320] as const;
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
  // (a caster far off along the light — a headland a few hundred metres up the coast, under a sun a few degrees up —
  // threw the whole frame into shade from somewhere out of shot: its shadow fades out between these reaches)
  float gone = 0.5 * ( shadeOver( m, c, g, r, ${FADE[0].toFixed(1)} * k.y ) + shadeOver( m, c, g, r, ${FADE[1].toFixed(1)} * k.y ) ) / f0;
  return mix( s / 16.0, 1.0, clamp( gone, 0.0, 1.0 ) );
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
    // (a face turned well away from the light is the toon ramp's dark band already: its form shadow is the ramp's, so
    // it takes no cast shadow on top — twice darkened it went near black. A face turned only a little from the light
    // is in the map itself, so it looks past its own depth: lit unless something else is over it)
    if ( nl > ${FORM.toFixed(3)} ) {
      shadeLit = shadeLight( ${SOFT.away.toFixed(2)} * ( 1.0 - smoothstep( 0.0, 0.15, nl ) ), shadeGm );
      // (a trace of shadow leaves no dots, a near-full one prints solid: no stray dot fields across a lit face)
      printLit = 1.0 - shadeDots( smoothstep( 0.12, 0.92, 1.0 - shadeLit ) );
    }
  }
#endif
`;

const DIR_INFO = 'getDirectionalLightInfo( directionalLight, directLight );';
const DIR_SHADOW = /\n\s*#if defined\( USE_SHADOWMAP \) && \( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS \)\n\s*directionalLightShadow = directionalLightShadows\[ i \];\n\s*directLight\.color \*= [^\n]*\n\s*#endif/;
/** three's lights chunk with the directional lights' own shadow lookups gone (the maps' lights are dark, the sun and
 *  moon cast nothing), and their light masked by `lit` if given. Only the directional loop is touched: point and spot
 *  lights (the tunnel's sodium lamps, the headlights) light every material as three lights them. */
function lightsChunk(lit?: string): string {
  const src = THREE.ShaderChunk.lights_fragment_begin;
  if (!src.includes(DIR_INFO) || !DIR_SHADOW.test(src)) throw new Error('look/shadows: three.js lights chunk changed');
  const out = LIT + src.replace(DIR_SHADOW, '');
  return lit ? out.replace(DIR_INFO, `${DIR_INFO}\n\t\tdirectLight.color *= ${lit};`) : out;
}
/** (printed: the light stays, the shade is printed over it as a tone of the lit colour (look/toon.ts) — taking the
 *  light away as well went near black under a low sun, where it's nearly all the light there is) */
const CHUNK = { print: lightsChunk(), smooth: lightsChunk('shadeLit') };

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
  /** The lens's view this frame, and the way to the light. */
  private view = new THREE.Frustum();
  private toLight = new THREE.Vector3(0, 1, 0);
  private far = new THREE.Vector3();
  constructor(private size: number) {
    const sphere = new THREE.Sphere();
    this.lights.forEach((l, i) => {
      // (three asks each map's box which casters to draw: only those big enough for it whose shadow can be seen)
      const box = l.shadow.getFrustum(), least = CASCADES[i]!.least;
      box.intersectsObject = (o: THREE.Object3D) => {
        const inst = o as THREE.InstancedMesh;
        if (inst.isInstancedMesh) { if (!inst.boundingSphere) inst.computeBoundingSphere(); sphere.copy(inst.boundingSphere!); }
        else { const g = (o as THREE.Mesh).geometry; if (!g.boundingSphere) g.computeBoundingSphere(); sphere.copy(g.boundingSphere!); }
        sphere.applyMatrix4(o.matrixWorld);
        return sphere.radius >= least && box.intersectsSphere(sphere) && this.sees(sphere);
      };
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

  /** Whether anything in `s` (world) can be in the lens's view this frame, or cast a shadow there: the sphere swept
   *  away from the light as far as a shadow still prints (FADE) touches the view. (A little wider: the blocker search
   *  and the soft edge read the map round a pixel.) */
  sees(s: THREE.Sphere): boolean {
    const r = s.radius + SOFT.search;
    this.far.copy(s.center).addScaledVector(this.toLight, -FADE[1]);
    for (const p of this.view.planes) if (p.distanceToPoint(s.center) < -r && p.distanceToPoint(this.far) < -r) return false;
    return true;
  }

  /** Whether the maps are drawn this frame (not while nothing would show them: deep in a tunnel). */
  set live(on: boolean) { for (const l of this.lights) l.shadow.autoUpdate = on; }

  /** Round the lens's view of the ground (at height `ground`), from `toLight` (unit). */
  update(cam: THREE.PerspectiveCamera, toLight: THREE.Vector3, ground: number) {
    SHADE_DIR.value.copy(toLight);
    this.toLight.copy(toLight).normalize();
    this.view.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    const view = new THREE.Vector3(); cam.getWorldDirection(view);
    // (the cascades start where the frame's foot meets the ground, not at the lens: a camera high over the road
    // looking down — chorus 2's top-down take, ~30 m up — sees nothing nearer, and its fine cascades were spent on
    // air, leaving the road to the coarse far one: stair-stepped edges)
    const camUp = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
    const foot = view.clone().multiplyScalar(Math.cos((cam.fov * Math.PI) / 360)).addScaledVector(camUp, -Math.sin((cam.fov * Math.PI) / 360));
    const near = foot.y < -1e-3 ? Math.min(GROUND_REACH, ((cam.position.y - ground) / -foot.y) * foot.dot(view)) : 0;
    const lz = toLight.clone().normalize(), up = Math.abs(lz.y) > 0.99 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0);
    const lx = up.cross(lz).normalize(), ly = lz.clone().cross(lx);
    this.lights.forEach((l, i) => {
      const { half, ahead } = CASCADES[i]!, texel = (2 * half) / this.size, snap = (v: number) => Math.round(v / texel) * texel;
      const c = cam.position.clone().addScaledVector(view, Math.max(0, near) + ahead);
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
