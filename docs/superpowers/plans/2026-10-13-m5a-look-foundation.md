# M5a — The Look Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the film its M5 base look (spec §2, `docs/superpowers/specs/2026-10-13-bmf-m5-fidelity-design.md`): the world stays a screen print, the car becomes a lit hero (candy clearcoat and chrome reflecting the sky of that moment), lights get a soft haze, the sky gets printed clouds and golden-hour rays, the air is graded per section, and a contact shade grounds things.

**Architecture:** Hero surfaces mark themselves by writing a marker alpha (0.5) into the scene's HDR colour target through a shader patch (three.js forces alpha to 1 on opaque materials, so the patch replaces `opaque_fragment`). The print pass reads that alpha and skips halftone and shadow tint there, keeping ink. The car's physical materials reflect a prefiltered environment map rendered from a second copy of the sky dome, rebuilt on fixed steps of song time (deterministic in export). Haze is a wide bloom tier in the engine's post. Air, clouds and rays are pure functions of song time in `drive/sky.ts` (tested under bun). The contact shade is a depth-based crease darkening inside the print pass, printed as halftone.

**Tech Stack:** TypeScript, three.js 0.186 (WebGL2, GLSL 3.00), bun test, Vite preview on :5990, `app/scripts/render.ts` for still sheets.

**Scope:** This is the first of three plans for the hero slice (spec §6). The world kit (M5b: facades, palms, street, the new Impala) and the breaks and sync (M5c) get their own plans, written after this one lands. Wet streets (spec §2) need night, which the hero slice (0:00–0:31, golden hour) doesn't have: they move to the rollout plan for the night sections.

## Conventions (read once)

- Run everything from `A:\LyricVideoCode\BMF\app` in Git Bash, after `source ../scripts/env.sh` (puts bun on PATH).
- Typecheck: `bun x tsc --noEmit -p .` (expect no output). Tests: `bun test` (expect all pass; 44 at the start of this plan, plus the new ones).
- The preview server is Vite on `http://localhost:5990` (the user's player). If it's down: `cd app && bun x vite --port 5990 --strictPort` in the background.
- Still sheets: `bun scripts/render.ts sheet --url http://localhost:5990 --times T1,T2,... --cols N --out <file.png>`. Write them to the session scratchpad (`C:\Users\andje\AppData\Local\Temp\claude\a--LyricVideoCode-BMF\57d7105d-04cb-46fc-b0dc-09ea80edc578\scratchpad`, below as `$SP`), never into the repo. Look at them with the Read tool.
- Commit after each task with the repo-local identity (already configured: Andrew B, the 20q2 noreply address). Never pass `-c user.email`. End messages with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Code style: match the surrounding code (dense, commented in full sentences of the domain, constants named and documented at the top of the module).
- The hero-slice check times (used throughout): `0.5,7,10.5,16.4,18.4,20.5,23.5,28.6`. They are the street signs, over the car at the red light, the wide back down the street, the barbershop take before and as the car crosses, chorus 1's road paint, the pink boards, and the skywriter's loop.

---

### Task 0: The before-sheet

**Files:** none (a scratch image).

- [ ] **Step 1: Render the hero slice as it is now**

```bash
cd /a/LyricVideoCode/BMF/app && source ../scripts/env.sh
SP=$(cygpath -w /c/Users/andje/AppData/Local/Temp/claude/a--LyricVideoCode-BMF/57d7105d-04cb-46fc-b0dc-09ea80edc578/scratchpad)
bun scripts/render.ts sheet --url http://localhost:5990 --times 0.5,7,10.5,16.4,18.4,20.5,23.5,28.6 --cols 4 --out "$SP/m5a-before.png"
```

Expected: the path is printed. Read the image: it's the reference every later task compares against.

- [ ] **Step 2: Time a small sheet (the cost before)**

```bash
time bun scripts/render.ts sheet --url http://localhost:5990 --times 7,16.4,20.5,28.6 --cols 2 --out "$SP/m5a-time-before.png"
```

Note the `real` time: Task 8 compares against it.

---

### Task 1: The quality switch

The preview and the export share all code; the export (`?export=1`, set by render.ts) runs at full quality and the preview a little lighter, so the player stays responsive as the look gets heavier.

**Files:**
- Create: `app/src/look/quality.ts`
- Modify: `app/src/scenes/drive.ts` (the `SHADOW` constant's use in `init()`)

- [ ] **Step 1: Create the module**

```ts
// Preview or final: the export (?export=1, scripts/render.ts) renders at full quality; the live player a little
// lighter so it stays responsive (spec §8). Everything visible stays the same function of song time: only the cost
// of a frame changes. Browser and bun (no location under bun: final).
const params = typeof location === 'undefined' ? null : new URLSearchParams(location.search);

/** Rendering at full quality (the export, and under bun). */
export const FINAL = !params || params.has('export');
/** The sun's shadow map (px), and how often the hero's sky reflection is remade (s of song time). */
export const QUALITY = { shadowMap: FINAL ? 2048 : 1536, envStep: FINAL ? 0.25 : 1 } as const;
```

- [ ] **Step 2: Use it for the shadow map**

In `app/src/scenes/drive.ts`, change the `SHADOW` constant to drop `map` and read it from `QUALITY`:

```ts
const SHADOW = { half: 110 };
```

and in `init()` replace `sh.mapSize.set(SHADOW.map, SHADOW.map);` with:

```ts
    sh.mapSize.set(QUALITY.shadowMap, QUALITY.shadowMap);
```

adding the import beside the other look imports:

```ts
import { QUALITY } from '../look/quality';
```

- [ ] **Step 3: Typecheck and test**

Run: `bun x tsc --noEmit -p . && bun test 2>&1 | tail -3`
Expected: no tsc output; `44 pass`, `0 fail`.

- [ ] **Step 4: Commit**

```bash
git add app/src/look/quality.ts app/src/scenes/drive.ts
git commit -m "A quality switch: the export at full quality, the preview a little lighter

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The hero mark, and the print pass leaving it be

**Files:**
- Create: `app/src/look/hero.ts`
- Modify: `app/src/look/print.ts` (FRAG: read the mark, exempt halftone and tint)

- [ ] **Step 1: Create the hero module**

```ts
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
```

- [ ] **Step 2: Teach the print pass the mark**

In `app/src/look/print.ts`, in `FRAG`, insert right after the line computing `c` (the misregistered sample):

```glsl
  // the hero (the car's paint and chrome, look/hero.ts): its alpha is low; it keeps its own light — no halftone, no
  // violet shade (its ink outline stays)
  float hero = 1.0 - smoothstep(0.6, 0.9, texture(src, vUv).a);
```

then change `sh *= 1.0 - 0.85 * keep;` to:

```glsl
  sh *= (1.0 - 0.85 * keep) * (1.0 - hero);
```

and change the dots line `c = mix(c, mix(shadeN * L, c, keep) * 0.55, dots * halftone * step(z0, far * 0.99));` to:

```glsl
  c = mix(c, mix(shadeN * L, c, keep) * 0.55, dots * halftone * step(z0, far * 0.99) * (1.0 - hero));
```

Also update the module's header comment: after the `tint` line add `//   hero     a hero surface (its alpha low: look/hero.ts) keeps its light: no halftone or tint, its ink kept`.

- [ ] **Step 3: Typecheck and test**

Run: `bun x tsc --noEmit -p . && bun test 2>&1 | tail -3`
Expected: no tsc output; all pass. (Nothing uses the mark yet: the frames are unchanged.)

- [ ] **Step 4: Commit**

```bash
git add app/src/look/hero.ts app/src/look/print.ts
git commit -m "The hero mark: lit surfaces write a marker alpha; the print pass leaves them their light

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: The sky as the hero sees it, and the car in it

**Files:**
- Create: `app/src/look/envsky.ts`
- Modify: `app/src/drive/world.ts` (`buildCar`: paint and chrome become hero)
- Modify: `app/src/look/dash.ts` (its chrome trim becomes hero)
- Modify: `app/src/scenes/drive.ts` (a sky helper; the environment each frame; shadows for physical materials)

- [ ] **Step 1: Create the environment module**

```ts
// The sky as the hero sees it (spec §2): a second sky dome, alone in its own scene at the origin, rendered into a
// prefiltered environment map for the car's candy paint and chrome — gold at sunset, violet at dusk. Remade only when
// song time crosses a step (QUALITY.envStep), from the sky at the step's own time: every frame (and every sample of a
// frame's motion blur) in a step gets the same map, so the export is deterministic. Browser only (WebGL).
import * as THREE from 'three';
import { SkyDome } from './skydome';
import type { SkyState } from '../drive/sky';

/** The sky at a song time: its state, the sun's direction (unit) and colour. */
export type SkyAt = (t: number) => { sky: SkyState; sunDir: THREE.Vector3; sunColor: THREE.Color };

export class SkyEnv {
  private scene = new THREE.Scene();
  private dome = new SkyDome();
  private origin = new THREE.Object3D();
  private pmrem: THREE.PMREMGenerator;
  private rt: THREE.WebGLRenderTarget | null = null;
  private key = NaN;

  constructor(renderer: THREE.WebGLRenderer, private step: number) {
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.scene.add(this.dome.mesh);
  }

  /** The environment map for song time t (remade when t enters a new step). */
  update(t: number, at: SkyAt): THREE.Texture {
    const key = Math.floor(t / this.step);
    if (key !== this.key || !this.rt) {
      this.key = key;
      const tk = key * this.step, s = at(tk);
      this.dome.update(s.sky, s.sunDir, s.sunColor, this.origin, tk);
      this.rt?.dispose();
      this.rt = this.pmrem.fromScene(this.scene, 0, 0.1, 6000);
    }
    return this.rt.texture;
  }

  dispose() { this.rt?.dispose(); this.pmrem.dispose(); }
}
```

- [ ] **Step 2: Make the car's paint and chrome hero**

In `app/src/drive/world.ts`, import the hero materials:

```ts
import { candyPaint, chrome as heroChrome } from '../look/hero';
```

and in `buildCar()` change the materials line from

```ts
  const paint = toon({ color: WORLD.car }), dark = toon({ color: WORLD.carDark }), chrome = toon({ color: WORLD.chrome });
```

to

```ts
  // (the hero: candy paint and chrome in real light, the sky in them; look/hero.ts)
  const paint = candyPaint(WORLD.car), dark = toon({ color: WORLD.carDark }), chrome = heroChrome();
```

In `app/src/look/dash.ts`, change `const chrome = toon({ color: WORLD.chrome }), dark = ...` inside `buildDash` so the trim is hero too:

```ts
  const chrome = heroChrome(), dark = toon({ color: '#0d0b10' });
```

with the import `import { chrome as heroChrome } from './hero';` (keep `WORLD` imported if still used; if tsc reports it unused, remove it from the import).

- [ ] **Step 3: Give the scene the sky helper and the environment**

In `app/src/scenes/drive.ts`:

Add the import:

```ts
import { SkyEnv } from '../look/envsky';
```

Add a field beside `private dome = new SkyDome();`:

```ts
  /** The sky as the hero sees it (its reflections). */
  private env!: SkyEnv;
```

In `init()`, after `renderer.shadowMap.type = THREE.PCFShadowMap;`:

```ts
    this.env = new SkyEnv(renderer, QUALITY.envStep);
```

Replace the shadow traverse's material test so physical materials (the hero) cast and take shadows too:

```ts
      const lit = o.material instanceof THREE.MeshToonMaterial || o.material instanceof THREE.MeshStandardMaterial;
```

Add this method to the class (above `roadS`):

```ts
  /** The sky at song time t: its state, where the sun is (unit) and its colour. */
  private skyAt(t: number) {
    const sky = skyStateAt(t), e = sky.sunElev;
    const sunDir = this.sunAz.clone().multiplyScalar(Math.cos(e)).add(new THREE.Vector3(0, Math.sin(e), 0)).normalize();
    const sunColor = SUN.high.clone().lerp(SUN.low, 1 - smooth(0, 10 * DEG, e));
    return { sky, sunDir, sunColor };
  }
```

In `render()`, replace the three lines that compute `sky`, `day`, `e`, `sunDir` and `sunColor`:

```ts
    const sky = skyStateAt(t), day = daylight(t), e = sky.sunElev;
    const sunDir = this.sunAz.clone().multiplyScalar(Math.cos(e)).add(new THREE.Vector3(0, Math.sin(e), 0)).normalize();
    const sunColor = SUN.high.clone().lerp(SUN.low, 1 - smooth(0, 10 * DEG, e));
```

with

```ts
    const { sky, sunDir, sunColor } = this.skyAt(t), day = daylight(t), e = sky.sunElev;
    // (the hero's reflections: the sky of this moment, remade on steps of song time)
    this.world.environment = this.env.update(t, (tau) => this.skyAt(tau));
```

and in `dispose()` add `this.env.dispose();`.

- [ ] **Step 4: Typecheck and test**

Run: `bun x tsc --noEmit -p . && bun test 2>&1 | tail -3`
Expected: no tsc output; all pass.

- [ ] **Step 5: Look at the car**

```bash
bun scripts/render.ts sheet --url http://localhost:5990 --times 7,16.4,18.4,20.5 --cols 2 --out "$SP/m5a-hero.png"
```

Read it, beside `m5a-before.png`. Check:
- the car's red is deep and glossy, with a bright sky streak and a sun glint along its curves;
- the chrome (bumpers, side spear, windshield frame) reads as mirror, picking up the gold sky;
- the car carries no halftone dots but keeps its ink outline;
- the world around it is unchanged.

If the paint reads too dark against the world, raise `envMapIntensity` in `candyPaint` (0.9 → 1.2). If the clearcoat glare washes the red out, raise `clearcoatRoughness` (0.06 → 0.12). Re-render after each change.

- [ ] **Step 6: Commit**

```bash
git add app/src/look/envsky.ts app/src/drive/world.ts app/src/look/dash.ts app/src/scenes/drive.ts
git commit -m "The car is the hero: candy clearcoat and chrome reflecting the sky of the moment

The sky dome is rendered again into a prefiltered environment map on fixed
steps of song time (deterministic in export); the car's paint and chrome
are physical materials carrying the hero mark, so the print pass leaves
them their light and keeps their ink.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: The haze round the lights

**Files:**
- Modify: `app/src/engine/post.ts` (a `haze` parameter: the widest bloom tier, added in colour)
- Modify: `app/src/scenes/drive.ts` (the scene asks for haze, stronger by night)

- [ ] **Step 1: Add the parameter**

In `app/src/engine/post.ts`:

In `PostParams`, after `halation: number; // neutral-white halation around highlights`:

```ts
  haze: number; // 0..1: a very wide glow in the light's own colour round HDR highlights (damp night air round neon)
```

In `DEFAULT_POST`, after `halation: 0,`:

```ts
  haze: 0,
```

In the final pass's fragment shader, change `uniform sampler2D src; uniform sampler2D bloomTex; uniform sampler2D haloTex;` to

```glsl
      uniform sampler2D src; uniform sampler2D bloomTex; uniform sampler2D haloTex; uniform sampler2D hazeTex; uniform float haze;
```

and after `col += vec3(1.0) * luma(ha) * halation; // neutral-white halation` add:

```glsl
        col += texture(hazeTex, uv).rgb * haze; // the haze: the widest tier, in the lights' own colour
```

In the final pass's uniforms object, after `haloTex: { value: null },` add `hazeTex: { value: null }, haze: { value: 0 },`.

In `render()`, after `f.haloTex!.value = this.ups[3]!.texture;` add:

```ts
    f.hazeTex!.value = this.ups[MIPS - 2]!.texture;
    f.haze!.value = p.haze;
```

- [ ] **Step 2: The scene asks for it**

In `app/src/scenes/drive.ts`, in the object `render()` returns, after `halation: 0.06,` add:

```ts
      haze: 0.1 + 0.3 * NIGHT.value, // (a breath of it round the sun by day; neon in damp air by night)
```

- [ ] **Step 3: Typecheck and test**

Run: `bun x tsc --noEmit -p . && bun test 2>&1 | tail -3`
Expected: no tsc output; all pass.

- [ ] **Step 4: Look at it, day and night**

```bash
bun scripts/render.ts sheet --url http://localhost:5990 --times 7,14,140,150 --cols 2 --out "$SP/m5a-haze.png"
```

Check:
- At 7 and 14 s, a soft warm glow spreads round the sun and the red light. It must not be a fog over the frame: the barbershop and the signs keep their contrast.
- At 140 and 150 s, the marquee bulbs and the chapel's neon sit in a soft halo of their own colour.

If the day frames go milky, lower the day term (0.1 → 0.05).

- [ ] **Step 5: Commit**

```bash
git add app/src/engine/post.ts app/src/scenes/drive.ts
git commit -m "Haze round the lights: the widest bloom tier in the lights' colour, stronger by night

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: The air, graded per section

**Files:**
- Modify: `app/src/drive/sky.ts` (AIR_KEYS, airAt)
- Create: `app/tests/sky.test.ts`
- Modify: `app/src/scenes/drive.ts` (the fog follows the air)

- [ ] **Step 1: Write the failing tests**

Create `app/tests/sky.test.ts`:

```ts
// The sky's pure functions: the air (fog) graded through the song, the printed clouds and the golden-hour rays.
import { expect, test } from 'bun:test';
import { AIR_KEYS, airAt } from '../src/drive/sky';

test('the air is keyed in time order and interpolates between its keys', () => {
  for (let k = 1; k < AIR_KEYS.length; k++) expect(AIR_KEYS[k]![0]).toBeGreaterThan(AIR_KEYS[k - 1]![0]);
  const [t0, n0, f0, , m0] = AIR_KEYS[0]!, [t1, n1, f1, , m1] = AIR_KEYS[1]!;
  const mid = airAt((t0 + t1) / 2);
  expect(mid.near).toBeCloseTo((n0 + n1) / 2, 5);
  expect(mid.far).toBeCloseTo((f0 + f1) / 2, 5);
  expect(mid.mix).toBeCloseTo((m0 + m1) / 2, 5);
});

test('the air always opens out: far well beyond near, its tint a share, all song', () => {
  for (let t = 0; t < 182; t += 0.5) {
    const a = airAt(t);
    expect(a.far).toBeGreaterThan(a.near + 300);
    expect(a.mix).toBeGreaterThanOrEqual(0);
    expect(a.mix).toBeLessThanOrEqual(1);
  }
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `bun test tests/sky.test.ts`
Expected: FAIL (`AIR_KEYS` / `airAt` not exported).

- [ ] **Step 3: Implement the air**

Append to `app/src/drive/sky.ts`:

```ts
/** The air through the song (spec §2: distance haze graded per section): [song s, fog's near and far (m), its tint
 *  (sRGB), how far the fog's colour leans from the horizon's toward the tint]. Golden dust on the corner and the
 *  boulevard, the city's warm haze, the freeway's clearer air, the neighbourhood's rose, sea haze on the coast, the
 *  night's violet. (By night the scene pulls the far end in further; in a tunnel the dark takes over.) */
export const AIR_KEYS: readonly [number, number, number, string, number][] = Object.freeze([
  [0, 70, 900, '#FFD39A', 0.3],
  [30, 90, 1000, '#F7B98A', 0.25],
  [60, 120, 1200, '#F0A07A', 0.2],
  [75, 80, 900, '#E88F8A', 0.25],
  [105, 120, 1300, '#FF9A6A', 0.3],
  [135, 140, 950, '#8E3D7C', 0.15],
  [182, 140, 900, '#3F2560', 0.15],
]);
const AIR_LIN = AIR_KEYS.map(([t, n, f, c, m]) => [t, n, f, new THREE.Color(c), m] as const); // (tints linear)

export interface Air { near: number; far: number; tint: THREE.Color; mix: number }

/** The air at t (its tint linear). */
export function airAt(t: number, out: Air = { near: 0, far: 0, tint: new THREE.Color(), mix: 0 }): Air {
  let k = 1;
  while (k < AIR_LIN.length - 1 && t > AIR_LIN[k]![0]) k++;
  const [t0, n0, f0, c0, m0] = AIR_LIN[k - 1]!, [t1, n1, f1, c1, m1] = AIR_LIN[k]!;
  const u = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
  out.near = n0 + (n1 - n0) * u;
  out.far = f0 + (f1 - f0) * u;
  out.tint.copy(c0).lerp(c1, u);
  out.mix = m0 + (m1 - m0) * u;
  return out;
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `bun test tests/sky.test.ts`
Expected: 2 pass.

- [ ] **Step 5: The fog follows the air**

In `app/src/scenes/drive.ts`, add `airAt` to the import from `'../drive/sky'`. Replace

```ts
    this.fogColor.copy(sky.horizon);
```

with

```ts
    const air = airAt(t);
    this.fogColor.copy(sky.horizon).lerp(air.tint, air.mix); // (graded per section: drive/sky.ts AIR_KEYS)
```

and replace

```ts
    const far = 1100 - 500 * NIGHT.value;
    fog.near = 140 - 130 * inside;
```

with

```ts
    const far = air.far - 500 * NIGHT.value;
    fog.near = air.near - (air.near - 10) * inside;
```

- [ ] **Step 6: Typecheck, test, look**

Run: `bun x tsc --noEmit -p . && bun test 2>&1 | tail -3`
Expected: no tsc output; all pass (46 now).

```bash
bun scripts/render.ts sheet --url http://localhost:5990 --times 10.5,20.5,64,92,113,140 --cols 3 --out "$SP/m5a-air.png"
```

Check:
- Distance warms into golden dust at 10.5 s (the street behind the car) and 20.5 s. The near world stays crisp.
- 64 s (the freeway) reads clearer; 92 s rosier; 113 s (the coast) has sea haze toward the horizon; 140 s is unchanged in feel.
- No section's far buildings vanish into a flat wall.

If one does, raise its key's `far`.

- [ ] **Step 7: Commit**

```bash
git add app/src/drive/sky.ts app/tests/sky.test.ts app/src/scenes/drive.ts
git commit -m "The air, graded per section: golden dust, city haze, the freeway's clear air, sea haze

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Printed clouds and golden-hour rays

**Files:**
- Modify: `app/src/drive/sky.ts` (cloudsAt, raysAt)
- Modify: `app/tests/sky.test.ts`
- Modify: `app/src/look/skydome.ts` (FRAG: rays, clouds; uniforms)
- Modify: `app/src/look/envsky.ts` and `app/src/scenes/drive.ts` (pass the new amounts)

- [ ] **Step 1: Write the failing tests**

Append to `app/tests/sky.test.ts` (and add `cloudsAt, raysAt, skyStateAt` to its import from `'../src/drive/sky'`):

```ts
test('the rays come with the low sun and go when it sets; clouds thin out by night', () => {
  const elev = (t: number) => (skyStateAt(t).sunElev * 180) / Math.PI;
  expect(raysAt(0)).toBeGreaterThan(0); // (22°: just beginning)
  expect(raysAt(0)).toBeLessThan(0.6);
  expect(raysAt(90)).toBeGreaterThan(0.9); // (4°: full)
  for (let t = 0; t < 182; t += 1) if (elev(t) < -1) expect(raysAt(t)).toBe(0);
  expect(cloudsAt(10)).toBeGreaterThan(cloudsAt(170));
  for (let t = 0; t < 182; t += 1) { expect(cloudsAt(t)).toBeGreaterThanOrEqual(0); expect(cloudsAt(t)).toBeLessThanOrEqual(1); }
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `bun test tests/sky.test.ts`
Expected: FAIL (`raysAt` / `cloudsAt` not exported).

- [ ] **Step 3: Implement the amounts**

Append to `app/src/drive/sky.ts`:

```ts
const ramp = (a: number, b: number, x: number) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
/** How strong the sun's printed rays are at t (0..1): they come as it sinks below ~26°, full under 16°, gone once it
 *  has set. */
export const raysAt = (t: number) => { const e = (skyStateAt(t).sunElev * 180) / Math.PI; return ramp(26, 16, e) * ramp(-1, 2, e); };
/** How much of the low sky the printed clouds cover at t (0..1): full by day, thinning to dark wisps by night. */
export const cloudsAt = (t: number) => 0.85 - 0.6 * skyStateAt(t).stars;
```

(`ramp(a, b, x)` with `a > b` falls from 1 to 0 as x rises past b toward a: `ramp(26, 16, 22)` ≈ 0.35, `ramp(26, 16, 4)` = 1.)

- [ ] **Step 4: Run the tests to see them pass**

Run: `bun test tests/sky.test.ts`
Expected: 3 pass.

- [ ] **Step 5: Draw them in the dome**

In `app/src/look/skydome.ts`, replace `FRAG` with:

```ts
const FRAG = /* glsl */ `
uniform vec3 zenith, horizon, sunDir, sunColor;
uniform float stars, bands, sunR, sunHDR, time, clouds, rays;
varying vec3 vDir;
const float PI_ = 3.14159265;
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), f.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
void main() {
  vec3 d = normalize(vDir);
  float h = max(d.y, 0.0);
  // the gradient, printed in bands (their edges anti-aliased)
  float g = pow(h, 0.42), b = g * bands, aa = fwidth(b);
  float q = (floor(b) + smoothstep(1.0 - aa, 1.0, fract(b))) / bands;
  q = mix(q, g, stars); // by night the bands melt into one gradient (seen looking up they'd ring the frame)
  vec3 c = mix(horizon, zenith, q);
  // the glow round the sun, warmest on the horizon, also banded
  float toSun = max(dot(d, sunDir), 0.0), glow = pow(toSun, 6.0) * (1.0 - g) ;
  float gq = floor(glow * 4.0 + 0.5) / 4.0;
  c += gq * sunColor * 0.35;
  // the low sun's rays: printed wedges fanning out round it, turning slowly
  if (rays > 0.0 && d.y > 0.0) {
    vec3 s = normalize(sunDir), d0 = normalize(d - s * dot(d, s) + 1e-5);
    vec3 ax = normalize(cross(s, vec3(0.0, 1.0, 0.0)) + 1e-5), ay = cross(ax, s);
    float phi = atan(dot(d0, ay), dot(d0, ax));
    float wedge = step(0.5, fract(phi * 9.0 / PI_ + time * 0.01));
    float reach = smoothstep(0.55, 0.995, dot(d, s));
    c += sunColor * 0.09 * wedge * reach * rays;
  }
  // the sun (above the horizon)
  float ang = acos(clamp(dot(d, sunDir), -1.0, 1.0)), px = fwidth(ang);
  c = mix(c, sunColor * sunHDR, smoothstep(sunR + px, sunR - px, ang) * step(0.0, d.y));
  // clouds: flat printed shapes in the low sky, drifting, two tones (lit on the sun's side), passing over the sun
  if (clouds > 0.0 && d.y > 0.0) {
    vec2 cp = d.xz / (d.y + 0.1) * 0.55 + vec2(time * 0.006, 0.0);
    float n = fbm(cp), na = fwidth(n) * 1.5;
    float cover = smoothstep(0.56 - na, 0.56 + na, n) * smoothstep(0.01, 0.06, d.y) * (1.0 - smoothstep(0.3, 0.6, d.y));
    vec3 fd = normalize(vec3(d.x, 0.0, d.z) + 1e-4), fs = normalize(vec3(sunDir.x, 0.0, sunDir.z) + 1e-4);
    float lit = step(0.5, dot(fd, fs) * 0.5 + 0.5 + (n - 0.62) * 1.5);
    vec3 shadeC = mix(zenith, horizon, 0.35) * 0.82, litC = mix(horizon, sunColor, 0.55) * 1.05;
    c = mix(c, mix(shadeC, litC, lit), cover * clouds);
  }
  // stars: one in some cells of a grid over the sky, twinkling
  if (stars > 0.0 && d.y > 0.02) {
    vec2 sp = vec2(atan(d.z, d.x), asin(d.y)) * 120.0;
    vec2 cell = floor(sp), f = fract(sp) - 0.5;
    float r = hash12(cell);
    if (r > 0.985) {
      vec2 o = vec2(hash12(cell + 7.1), hash12(cell + 3.3)) - 0.5;
      float s = smoothstep(0.09, 0.0, length(f - o * 0.6)) * (0.6 + 0.4 * sin(time * (1.0 + r * 3.0) + r * 40.0));
      c += vec3(1.0, 0.95, 0.9) * s * stars * (1.5 + 2.0 * fract(r * 97.0)) * smoothstep(0.02, 0.15, d.y);
    }
  }
  gl_FragColor = vec4(c, 1.0);
}`;
```

In the `SkyDome` constructor's uniforms, after `time: { value: 0 },` add `clouds: { value: 0 }, rays: { value: 0 },`. Change `update`'s signature and body to take the two amounts:

```ts
  update(s: SkyState, sunDir: THREE.Vector3, sunColor: THREE.Color, camera: THREE.Object3D, t: number, clouds = 0, rays = 0) {
    this.u.zenith!.value.copy(s.zenith);
    this.u.horizon!.value.copy(s.horizon);
    this.u.sunDir!.value.copy(sunDir);
    this.u.sunColor!.value.copy(sunColor);
    this.u.stars!.value = s.stars;
    this.u.time!.value = t;
    this.u.clouds!.value = clouds;
    this.u.rays!.value = rays;
    this.mesh.position.copy(camera.position);
  }
```

Update the module's header comment: after "the sun itself (HDR, so it blooms) until it sets," add "printed clouds drifting in the low sky and the low sun's rays fanning out round it (drive/sky.ts: cloudsAt, raysAt),".

- [ ] **Step 6: Pass the amounts**

In `app/src/scenes/drive.ts`, add `cloudsAt, raysAt` to the import from `'../drive/sky'`, and change the dome update `this.dome.update(sky, sunDir, sunColor, this.cam, t);` to:

```ts
    this.dome.update(sky, sunDir, sunColor, this.cam, t, cloudsAt(t), raysAt(t));
```

In `app/src/look/envsky.ts`, add `import { cloudsAt, raysAt } from '../drive/sky';` (beside the type import; make it a value import) and change the dome update in `update()` to:

```ts
      this.dome.update(s.sky, s.sunDir, s.sunColor, this.origin, tk, cloudsAt(tk), raysAt(tk));
```

- [ ] **Step 7: Typecheck, test, look**

Run: `bun x tsc --noEmit -p . && bun test 2>&1 | tail -3`
Expected: no tsc output; all pass (47).

```bash
bun scripts/render.ts sheet --url http://localhost:5990 --times 0.5,7,16.4,28.6,90,113 --cols 3 --out "$SP/m5a-sky.png"
```

Check:
- Flat-edged clouds in two tones drift in the low sky, lit on the sun's side.
- Rays fan faintly round the sun at 7 s and strongly at 90 and 113 s.
- At 0.5 s (looking up at the street signs) the sky stays clean behind the signs, with no cloud crossing their letters' edges into noise.
- The skywriting at 28.6 s still reads against the clouds.

If the clouds cross the hook's sky-writing, lower their band (`smoothstep(0.3, 0.6, d.y)` → `smoothstep(0.2, 0.45, d.y)`).

- [ ] **Step 8: Commit**

```bash
git add app/src/drive/sky.ts app/tests/sky.test.ts app/src/look/skydome.ts app/src/look/envsky.ts app/src/scenes/drive.ts
git commit -m "Printed clouds in the low sky and the low sun's rays (in the car's reflections too)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: The contact shade

**Files:**
- Modify: `app/src/look/print.ts` (PrintParams: `ao`, `aoPx`; FRAG: the crease darkening, printed as dots)

- [ ] **Step 1: Add the parameters**

In `PrintParams`, after the `tint` field add:

```ts
  /** The contact shade: how much nearer surfaces round a pixel darken it (0..1: where things meet the ground, in
   *  creases), and its reach (logical px, for a surface 12 m off; nearer reaches further). */
  ao: number; aoPx: number;
```

and in `PRINT` add `ao: 0.6, aoPx: 10` (keep the existing fields). Add `'ao', 'aoPx'` to the uniform-copy list in `render()`, and `ao: { value: PRINT.ao }, aoPx: { value: PRINT.aoPx },` to the constructor's uniforms. In `FRAG`, add `ao, aoPx` to the float uniform list.

- [ ] **Step 2: Compute it and print it**

In `FRAG`, after the ink loop's `e *= 1.0 - smoothstep(inkFar * 0.5, inkFar, z0);`, insert:

```glsl
  // the contact shade: nearer surfaces round this pixel (the ground under the car, a wall's foot, a crease) darken it;
  // a silhouette's far side doesn't count (the step's too big). Printed as the shadows are: dots and the violet shade.
  float occ = 0.0;
  vec2 ro = texel * aoPx * PX_SCALE * clamp(12.0 / z0, 0.25, 3.0);
  for (int k = 0; k < 8; k++) {
    float a = float(k) * PI / 4.0 + 0.39, rk = mod(float(k), 2.0) < 0.5 ? 1.0 : 0.55;
    float dz = z0 - lin(texture(depth, vUv + ro * vec2(cos(a), sin(a)) * rk).r);
    occ += smoothstep(0.08, 0.5, dz) * (1.0 - smoothstep(1.5, 4.0, dz));
  }
  occ = occ / 8.0 * ao * step(z0, far * 0.99) * (1.0 - hero);
```

Then change `float L = luma(c);` to

```glsl
  float L = luma(c) * (1.0 - 0.6 * occ);
```

and after the line `c = mix(c, shadeN * L, sh * tint);` add:

```glsl
  c *= 1.0 - 0.35 * occ;
```

Update the header comment: after the `halftone` line add `//   contact  a shade where things meet (nearer depth round a pixel), printed into the dots`.

- [ ] **Step 3: Typecheck and test**

Run: `bun x tsc --noEmit -p . && bun test 2>&1 | tail -3`
Expected: no tsc output; all pass.

- [ ] **Step 4: Look at it**

```bash
bun scripts/render.ts sheet --url http://localhost:5990 --times 7,10.5,16.4,18.4,23.5,92 --cols 3 --out "$SP/m5a-contact.png"
```

Check:
- A soft dotted shade sits where walls meet the sidewalk, under the awnings, under the signal heads, and on the road under the car's sills (18.4 s).
- No dark halo runs round silhouettes against the sky.
- Flat road far off stays clean.
- The lyric faces aren't dirtied: they're flat boards, so their own pixels have no nearer neighbours except at their frames.

If halos appear round distant silhouettes, tighten the range (`smoothstep(1.5, 4.0, dz)` → `smoothstep(1.0, 2.5, dz)`).

- [ ] **Step 5: Commit**

```bash
git add app/src/look/print.ts
git commit -m "A contact shade where things meet, printed into the halftone

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: The foundation, reviewed

**Files:**
- Modify: `docs/superpowers/specs/2026-10-13-bmf-m5-fidelity-design.md` (a "Built" note under §2)

- [ ] **Step 1: The whole suite, and the after-sheet**

Run: `bun x tsc --noEmit -p . && bun test 2>&1 | tail -3`
Expected: no tsc output; all pass (47).

```bash
bun scripts/render.ts sheet --url http://localhost:5990 --times 0.5,7,10.5,16.4,18.4,20.5,23.5,28.6 --cols 4 --out "$SP/m5a-after.png"
```

Read `m5a-before.png` and `m5a-after.png` together. The after-sheet must show:
- the glossy hero car;
- clouds and faint rays;
- golden haze in the distance;
- the contact shade;
- every lyric exactly as legible as before.

If any lyric reads worse, find which task's change causes it (re-render with that change reverted locally) and fix it before going on.

- [ ] **Step 2: Time the same small sheet (the cost after, spec §8)**

```bash
time bun scripts/render.ts sheet --url http://localhost:5990 --times 7,16.4,20.5,28.6 --cols 2 --out "$SP/m5a-time-after.png"
```

Compare its `real` time with Task 0's. If it's more than about 1.5x slower, look first at the environment step (`QUALITY.envStep`) and the contact shade's eight depth taps.

- [ ] **Step 3: Record what was built**

In the spec, under `## 2. The look`, append:

```markdown
**Built (M5a, 2026-10-13):** the hero mark and print exemption (`look/hero.ts`, `look/print.ts`), the sky environment
(`look/envsky.ts`, remade every `QUALITY.envStep` s), candy paint and chrome on the car and the dash trim, the haze
(engine post `haze`), the air graded per section (`drive/sky.ts` AIR_KEYS), printed clouds and rays (`cloudsAt`,
`raysAt`), and the contact shade (print pass `ao`). Wet streets wait for the night sections' rollout. The 4-frame cost
check went from <before> s to <after> s.
```

(Fill in the two times from Task 0 Step 2 and Step 2 above.)

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-10-13-bmf-m5-fidelity-design.md
git commit -m "M5a built: the look foundation (hero car, sky reflections, haze, air, clouds, contact shade)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Hand to the user**

Tell the user the look foundation is in the player at `http://localhost:5990` and what to look at: the car's paint and chrome at 0:07 and 0:16–0:19, the sky, the haze, the distance. Say plainly that the world is still blocky (that's M5b, the kit) and that the breaks and sync come in M5c. Ask for their read of the hero car and the sky before M5b's plan is written.
