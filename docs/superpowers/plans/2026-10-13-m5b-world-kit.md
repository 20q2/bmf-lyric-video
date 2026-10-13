# M5b — The World Kit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Take the film out of the blocky draft (spec §3, `docs/superpowers/specs/2026-10-13-bmf-m5-fidelity-design.md`), leading with what fills the most screen. That means a town with depth (rows of buildings behind the street, mountains on the horizon), LA street fronts on every building, real palms, kerbs and sidewalks, a properly shaped '64 Impala on wire wheels, and the hero slice's motel and billboard structures.

**Architecture:**
- **Pure (bun-tested):** the back rows are blocks like the rest (`drive/blocks.ts`), so the guard checks them. A new test keeps every building off the road. Facade geometry is a pure builder (`look/facades.ts`) that keeps every part inside its block's box (tested). The Impala's body is a pure lofted hull (`look/impala.ts`) inside `CAR_BOX` (tested).
- **Browser-only:** palms, kerbs and sidewalks, the motel, the billboard structure, the wire wheels and the shop-sign atlas.
- **The rule from the user's M5a review (memory: bold-visible-changes):** every task is judged on full-frame sheets at playback size, before beside after.

**Tech Stack:** TypeScript, three.js 0.186 (`three/addons/utils/BufferGeometryUtils.js` for merging), bun test, Vite preview on :5990, `app/scripts/render.ts`.

**Scope:** Second of three hero-slice plans (M5a done; M5c, the breaks and sync, follows). Street furniture, parked cars, passing traffic and pedestrians wait for a later plan: they move, or crowd the lyric faces, and need the guard extended first.

## Conventions (read once)

- Run from `A:\LyricVideoCode\BMF\app` in Git Bash after `source ../scripts/env.sh`.
- Typecheck: `bun x tsc --noEmit -p .` (expect no output). Tests: `bun test` (47 pass at the start).
- Preview: Vite on `http://localhost:5990`.
- Sheets: `bun scripts/render.ts sheet --url http://localhost:5990 --times ... --cols N --out "$SP/<name>.png"`, with `SP=$(cygpath -w /c/Users/andje/AppData/Local/Temp/claude/a--LyricVideoCode-BMF/57d7105d-04cb-46fc-b0dc-09ea80edc578/scratchpad)`. Read them with the Read tool.
- Side-by-side comparison (used at every visual check): `python -c "from PIL import Image; a=Image.open(r'$SP/A.png'); b=Image.open(r'$SP/B.png'); c=Image.new('RGB',(a.width,a.height+b.height)); c.paste(a,(0,0)); c.paste(b,(0,a.height)); c.save(r'$SP/A-vs-B.png')"` (before on top).
- Commit after each task (repo-local identity; never `-c user.email`); messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Check times:
  - **hero:** `0.5,7,10.5,16.4,18.4,20.5,23.5,28.6`;
  - **town:** `10.5,20.5,33.5,50.5,64,92,140,150`;
  - **car:** `7,17.9,99,101,166`.

---

### Task 0: Before-sheets

- [ ] **Step 1: Render the three sets as they are**

```bash
cd /a/LyricVideoCode/BMF/app && source ../scripts/env.sh
SP=$(cygpath -w /c/Users/andje/AppData/Local/Temp/claude/a--LyricVideoCode-BMF/57d7105d-04cb-46fc-b0dc-09ea80edc578/scratchpad)
bun scripts/render.ts sheet --url http://localhost:5990 --times 0.5,7,10.5,16.4,18.4,20.5,23.5,28.6 --cols 4 --out "$SP/m5b-hero-before.png"
bun scripts/render.ts sheet --url http://localhost:5990 --times 10.5,20.5,33.5,50.5,64,92,140,150 --cols 4 --out "$SP/m5b-town-before.png"
bun scripts/render.ts sheet --url http://localhost:5990 --times 7,17.9,99,101,166 --cols 3 --out "$SP/m5b-car-before.png"
```

Expected: three paths printed.

---

### Task 1: No building on the road (the guard first)

**Files:**
- Create: `app/tests/town.test.ts`

- [ ] **Step 1: Write the test**

```ts
// The town's buildings: none stands on the road anywhere (a row set back from one stretch can stand on the road where
// it bends back past them), and every facade stays inside the box the guard checks (look/facades.ts).
import { expect, test } from 'bun:test';
import * as THREE from 'three';
import { makeDrive } from '../src/drive/drive';
import { ROAD_HALF } from '../src/drive/route';
import { ROAD_START } from '../src/drive/world';
import { audio, lyrics } from './data';

const drive = makeDrive(audio, lyrics);
/** The road's centre line every 2 m (flat: x, z). */
const road: [number, number][] = [];
for (let s = ROAD_START; s <= drive.route.length; s += 2) { const p = drive.route.frameAt(s).pos; road.push([p.x, p.z]); }
/** A footprint's sample points: a 5 x 5 grid over its base, in the unit box. */
const GRID = [-0.5, -0.25, 0, 0.25, 0.5].flatMap((x) => [-0.5, -0.25, 0, 0.25, 0.5].map((z) => [x, z] as const));

test('no building stands on the road', () => {
  const on: string[] = [];
  drive.blocks.forEach((b, i) => {
    if (b.concrete) return; // (a freeway's barriers and walls stand at its edge by design)
    let near = Infinity;
    for (const [x, z] of GRID) {
      const p = new THREE.Vector3(x, -0.5, z).applyMatrix4(b.matrix);
      for (const [rx, rz] of road) near = Math.min(near, Math.hypot(rx - p.x, rz - p.z));
    }
    if (near < ROAD_HALF + 0.5) on.push(`block ${i} s=${b.s.toFixed(0)} lateral=${b.lateral.toFixed(0)}: ${near.toFixed(1)} m from the centre line`);
  });
  expect(on).toEqual([]);
});
```

- [ ] **Step 2: Run it**

Run: `bun test tests/town.test.ts`
Expected: PASS today (the near row stands 18 m out). It's the guard for Task 2's back rows. If it fails now, list the blocks it names in the commit message and fix their placement before going on.

- [ ] **Step 3: Commit**

```bash
git add app/tests/town.test.ts
git commit -m "The guard: no building stands on the road

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The town's depth — rows behind the street

**Files:**
- Modify: `app/src/drive/blocks.ts`

- [ ] **Step 1: Give each stretch its rows behind**

In `BLOCKS`'s type, add `back?: [rows: number, hMin: number, hMax: number]`, and set it per stretch (others unchanged):

```ts
export const BLOCKS: Record<string, { h: [number, number]; empty: number; seaLeft?: boolean; far?: number; back?: [number, number, number] }> = {
  intro: { h: [6, 10], empty: 0.5, back: [2, 8, 16] },
  chorus1: { h: [8, 22], empty: 0.3, back: [2, 10, 26] },
  verse1: { h: [14, 40], empty: 0.1, back: [3, 18, 50] },
  chorus2: { h: [6, 14], empty: 0.6, far: 40, back: [1, 8, 18] },
  verse2: { h: [4, 8], empty: 0.3, back: [1, 6, 10] },
  chorus3: { h: [5, 10], empty: 0.6, seaLeft: true, back: [1, 6, 12] },
  bridge1: { h: [5, 9], empty: 1, seaLeft: true }, // in the tunnel
  verse3: { h: [8, 18], empty: 0.05, back: [2, 12, 28] },
  chorus4: { h: [3, 6], empty: 0.8 },
  outro1: { h: [0, 0], empty: 1 },
};
```

Update its doc comment's first line to: `/** Per stretch: building heights (m, min–max), how many plots stay empty, which side is the sea, how far back (m) the near row starts, and the rows behind it (how many, their heights). */`

- [ ] **Step 2: Build the rows**

Add, below `const NEAR = 18;`:

```ts
/** The rows behind the street: the first this far off the road's centre (m), each next one this much further; none
 *  within this far of the road (wherever it bends back past them); a quarter of their plots empty (lots, parking). */
export const BACK = { from: 44, step: 26, road: 8, empty: 0.25 };
/** A footprint's sample points (the unit box's base). */
const FOOTPRINT = [-0.5, -0.25, 0, 0.25, 0.5].flatMap((x) => [-0.5, -0.25, 0, 0.25, 0.5].map((z) => [x, z] as const));
```

Add the import `import { ROAD_HALF } from './route';` (beside `import type { Route } from './route';`, merged into one import: `import { ROAD_HALF, type Route } from './route';`).

At the end of `blocksOf`, before `return out;`:

```ts
  // the rows behind the street: the town's depth (none by the sea, in a tunnel's rock, or across the valley a hill sign
  // is seen over), never on the road where it bends back past them
  const roadPts: [number, number][] = [];
  for (let s = 0; s <= route.length; s += 4) { const p = route.frameAt(s).pos; roadPts.push([p.x, p.z]); }
  const offRoad = (m: THREE.Matrix4) => FOOTPRINT.every(([x, z]) => {
    const p = new THREE.Vector3(x, -0.5, z).applyMatrix4(m);
    return roadPts.every(([rx, rz]) => Math.hypot(rx - p.x, rz - p.z) >= ROAD_HALF + BACK.road);
  });
  for (let k = 0; k * PLOT < route.length; k++) {
    for (const side of [1, -1]) {
      const s = k * PLOT + PLOT / 2, b = BLOCKS[stretchAtS(s).id]!;
      if (!b.back || (side === -1 && b.seaLeft) || nearTunnel(tunnels, s, TUNNEL_CLEAR) || hills.some((t) => t.side === side && s > t.a && s < t.b)) continue;
      const [rows, h0, h1] = b.back;
      for (let r = 0; r < rows; r++) {
        if (hash(k, side, 20 + r) < BACK.empty) continue;
        const w = 14 + 10 * hash(k, side, 30 + r), d = 14 + 8 * hash(k, side, 40 + r), h = h0 + (h1 - h0) * hash(k, side, 50 + r);
        const at = s + (hash(k, side, 70 + r) - 0.5) * 6, lateral = side * (BACK.from + r * BACK.step + d / 2 + 6 * hash(k, side, 60 + r));
        const lift = route.frameAt(at).pos.y + 0.4, m = boxAt(route, at, lateral, d, h + lift, w, -lift);
        if (!offRoad(m)) continue;
        out.push({ s: at, lateral, w, h, d, color: hash(k, side, 80 + r), matrix: m });
      }
    }
  }
```

- [ ] **Step 3: Typecheck and run the whole suite**

Run: `bun x tsc --noEmit -p . && bun test 2>&1 | tail -15`
Expected: no tsc output; all pass.

If the guard reports a phrase **hidden by a building** (a back-row building in front of sky-writing, a banner or the hill sign), note its stretch and s. Then skip back rows on that side within the phrase's s ± 120 m. Add that as a rule beside the hills test in the loop's `continue`: collect `sky`, `banner` and `hill` carriers into a list of `{ side, a, b }` zones, the way `hills` is built, using the carrier's side of the road. Re-run until green.

If the guard reports **the camera in a building**, raise `BACK.from` to 50 and re-run.

- [ ] **Step 4: Look at it**

```bash
bun scripts/render.ts sheet --url http://localhost:5990 --times 10.5,20.5,33.5,50.5,64,92,140,150 --cols 4 --out "$SP/m5b-town-rows.png"
```

Compose `m5b-town-before.png` over `m5b-town-rows.png` and read it. The empty desert behind the street should now be a skyline: rows of buildings receding into the golden haze, taller in the city (33.5, 50.5 s) and lower in the neighbourhood (92 s). Nothing should stand on the road.

- [ ] **Step 5: Commit**

```bash
git add app/src/drive/blocks.ts
git commit -m "The town's depth: rows of buildings behind the street, taller in the city, never on the road

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Mountains on the horizon

**Files:**
- Modify: `app/src/look/skydome.ts` (two printed ranges, away from the sea)
- Modify: `app/src/look/envsky.ts`, `app/src/scenes/drive.ts` (tell the domes where the mountains stand)

- [ ] **Step 1: Draw the ranges**

In `skydome.ts`'s `FRAG`, change the uniform line to

```glsl
uniform vec3 zenith, horizon, sunDir, sunColor, mountainDir;
uniform float stars, bands, sunR, sunHDR, time, groundMix, clouds, rays, mountains;
```

and insert right after the banded sun glow (`c += gq * sunColor * 0.35;`):

```glsl
  // the mountains: two printed ranges on the horizon on the far side from the sea (the far one hazed toward the sky,
  // the near one darker); their ridges noise round the compass (sampled on a circle: no seam)
  if (mountains > 0.0 && d.y > -0.02) {
    vec2 fd2 = normalize(d.xz + 1e-5), md = normalize(mountainDir.xz + 1e-5);
    float face = smoothstep(-0.35, 0.15, dot(fd2, md)), pa = fwidth(d.y) * 1.2;
    float far1 = (0.012 + 0.06 * fbm(fd2 * 2.5 + vec2(2.7))) * face, near1 = (0.004 + 0.035 * fbm(fd2 * 5.5 + vec2(8.3, 3.1))) * face;
    vec3 farC = mix(horizon, zenith, 0.45) * 0.92, nearC = mix(horizon, zenith, 0.7) * 0.62;
    c = mix(c, farC, smoothstep(far1 + pa, far1 - pa, d.y) * step(0.001, far1) * mountains);
    c = mix(c, nearC, smoothstep(near1 + pa, near1 - pa, d.y) * step(0.001, near1) * mountains);
  }
```

In the constructor's uniforms add `mountainDir: { value: new THREE.Vector3(1, 0, 0) }, mountains: { value: 0 },`. Add a method beside `withGround()`:

```ts
  /** The mountains stand round this direction (flat), away from the sea. */
  setMountains(dir: THREE.Vector3) { this.u.mountainDir!.value.copy(dir); this.u.mountains!.value = 1; }
```

Add to the module's header comment, after the clouds and rays: `two printed mountain ranges on the horizon away from the sea,`.

- [ ] **Step 2: Point them**

In `envsky.ts`, add a method to `SkyEnv`:

```ts
  /** The mountains' direction (as the main dome's). */
  setMountains(dir: THREE.Vector3) { this.dome.setMountains(dir); this.key = NaN; }
```

In `scenes/drive.ts` `init()`, after the `this.sunAz.set(...)` statement:

```ts
    // the mountains: on the far side from the sea, where the sun sets
    const hills = this.sunAz.clone().negate();
    this.dome.setMountains(hills);
    this.env.setMountains(hills);
```

- [ ] **Step 3: Typecheck, test, look**

Run: `bun x tsc --noEmit -p . && bun test 2>&1 | tail -3`
Expected: no tsc output; all pass.

```bash
bun scripts/render.ts sheet --url http://localhost:5990 --times 7,10.5,20.5,50.5,113,140 --cols 3 --out "$SP/m5b-mountains.png"
```

Check:
- Low mountain ranges sit on the horizon behind the town in two tones.
- They never sit on the sea side, where the sun sets (the coast at 113 s keeps its open horizon).
- At 140 s they're a dark silhouette against the night.

If they're too tall (they compete with the skyline), halve the `0.06`/`0.035` amplitudes.

- [ ] **Step 4: Commit**

```bash
git add app/src/look/skydome.ts app/src/look/envsky.ts app/src/scenes/drive.ts
git commit -m "Mountains on the horizon, away from the sea: two printed ranges

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Street fronts — the facade kit

**Files:**
- Create: `app/src/look/facades.ts`
- Modify: `app/src/look/night.ts` (`nightGlass`)
- Modify: `app/tests/town.test.ts` (facades inside their boxes)
- Modify: `app/src/drive/world.ts` (the town drawn as facades)

- [ ] **Step 1: Write the failing test**

Append to `app/tests/town.test.ts` (and add `import { facadeOf } from '../src/look/facades';`):

```ts
test('every facade stays inside its block: the box the guard checks', () => {
  const out: string[] = [];
  drive.blocks.forEach((b, i) => {
    if (b.concrete || b.prop) return;
    const inv = b.matrix.clone().invert(), f = facadeOf(b);
    for (const [name, g] of Object.entries(f)) {
      const p = g.getAttribute('position'), v = new THREE.Vector3();
      for (let k = 0; k < p.count; k++) {
        v.fromBufferAttribute(p, k).applyMatrix4(inv);
        if (Math.max(Math.abs(v.x), Math.abs(v.y), Math.abs(v.z)) > 0.5 + 1e-3) { out.push(`block ${i} ${name}: (${v.toArray().map((x) => x.toFixed(3)).join(', ')})`); break; }
      }
    }
  });
  expect(out).toEqual([]);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `bun test tests/town.test.ts`
Expected: FAIL (`facades` module not found).

- [ ] **Step 3: Write the kit**

Create `app/src/look/facades.ts`:

```ts
// The town's buildings as LA street fronts (spec §3), not boxes with a window grid. Each block (blocks.ts) gets:
//   - a stucco body standing a hand's width behind its box's front;
//   - in that depth, its storefront (glass bays, a door, a base course, a sign band with a shop's name) or, on low
//     apartments, a carport's dark mouth;
//   - its upper floors' windows (frames, sills; on its two ends too);
//   - pilasters up the taller ones, and a cornice.
// Every part stays inside the block's box, which is what the guard checks (tests/town.test.ts). Seeded by the block's
// place. The geometry is pure (bun builds it under test); world.ts gives it materials, and the sign atlas is drawn in
// the browser (signAtlas).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { hash } from '../engine/util';
import { WORLD } from './toon';
import { F, font } from '../engine/type';
import type { Block } from '../drive/blocks';

/** How deep the front's detail is (m: the body stands this far behind the box's front); the storefront (its glass's
 *  top, the sign band, a bay's width); the floors above (their height, a window's width, height, the gap between);
 *  the cornice's height; the pilasters from this height up (m). */
export const FACADE = { depth: 0.3, shop: { top: 3.0, band: [3.15, 3.95] as [number, number], bay: 3.2 }, floor: 3.3, win: { w: 1.3, h: 1.7, gap: 1.3 }, cornice: 0.55, pilasters: 14 };
/** The shops' names (the signs' face, F.sign: never the lyrics'), and how many the atlas holds a row. */
export const SHOPS = ['LIQUOR', 'DONUTS', 'TACOS', 'TIRES', 'BEAUTY SUPPLY', 'CHECKS CASHED', 'LAUNDROMAT', 'PAWN', 'WIGS', 'BAIL BONDS', 'PHO', 'MARKET', 'NAILS', 'DENTIST', 'INCOME TAX', 'RECORDS'] as const;
const ATLAS_COLS = 4;
const SIGN_COLOURS: readonly [string, string][] = [['#f4f0e6', '#c8202e'], ['#1d2026', '#ffd65a'], ['#c8202e', '#fff6e0'], ['#2b78a6', '#ffffff'], ['#ffd65a', '#1d2026'], ['#1f6b44', '#f4f0e6']];

export interface FacadeGeometry { walls: THREE.BufferGeometry; trim: THREE.BufferGeometry; glass: THREE.BufferGeometry; signs: THREE.BufferGeometry }

/** Collects a facade's parts in its block's local frame (x across, + out of its front; y up from its ground; z along). */
class Parts {
  walls: THREE.BufferGeometry[] = []; trim: THREE.BufferGeometry[] = []; glass: THREE.BufferGeometry[] = []; signs: THREE.BufferGeometry[] = [];
  constructor(private wall: THREE.Color, private trimC: THREE.Color) {}
  private coloured(g: THREE.BufferGeometry, c: THREE.Color) {
    const n = g.getAttribute('position').count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    return g;
  }
  box(to: 'walls' | 'trim', w: number, h: number, d: number, x: number, y: number, z: number) {
    const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z);
    this[to].push(this.coloured(g, to === 'walls' ? this.wall : this.trimC));
  }
  /** A pane facing +x (out of the front) or along ±z (an end), lit at night if `lit`. */
  pane(w: number, h: number, x: number, y: number, z: number, facing: 'x' | 'z+' | 'z-', lit: boolean) {
    const g = new THREE.PlaneGeometry(w, h);
    if (facing === 'x') g.rotateY(Math.PI / 2); else if (facing === 'z-') g.rotateY(Math.PI);
    g.translate(x, y, z);
    g.setAttribute('lit', new THREE.BufferAttribute(new Float32Array(g.getAttribute('position').count).fill(lit ? 1 : 0), 1));
    this.glass.push(g);
  }
  /** A shop's sign on its band, facing +x, its texture the atlas's cell `k`. */
  sign(w: number, h: number, x: number, y: number, z: number, k: number) {
    const g = new THREE.PlaneGeometry(w, h); g.rotateY(Math.PI / 2); g.translate(x, y, z);
    const uv = g.getAttribute('uv'), rows = Math.ceil(SHOPS.length / ATLAS_COLS), cx = k % ATLAS_COLS, cy = Math.floor(k / ATLAS_COLS);
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (cx + uv.getX(i)) / ATLAS_COLS, 1 - (cy + 1 - uv.getY(i)) / rows);
    this.signs.push(g);
  }
}

/** Reverses a geometry's triangles' winding (in place). */
function flipWinding(g: THREE.BufferGeometry) {
  const ix = g.getIndex();
  if (ix) { for (let i = 0; i < ix.count; i += 3) { const b = ix.getX(i + 1); ix.setX(i + 1, ix.getX(i + 2)); ix.setX(i + 2, b); } ix.needsUpdate = true; return; }
  for (const name of Object.keys(g.attributes)) {
    const a = g.getAttribute(name), n = a.itemSize, tmp = new Array<number>(n);
    for (let i = 0; i < a.count; i += 3) for (let k = 0; k < n; k++) { tmp[k] = a.getComponent(i + 1, k); a.setComponent(i + 1, k, a.getComponent(i + 2, k)); a.setComponent(i + 2, k, tmp[k]!); }
  }
}

const empty = () => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(0), 3)); return g; };
const merged = (gs: THREE.BufferGeometry[]) => (gs.length ? mergeGeometries(gs)! : empty());

/** One block's street front, in world space. */
export function facadeOf(b: Block): FacadeGeometry {
  // (the block's box: its matrix scales a unit cube; unscaled, it's the local frame. Its x axis runs away from the
  // road's right: on the road's right the front is +x, on its left -x; a mirror in x puts every front at +x)
  const sx = new THREE.Vector3().setFromMatrixColumn(b.matrix, 0).length(), sy = new THREE.Vector3().setFromMatrixColumn(b.matrix, 1).length(), sz = new THREE.Vector3().setFromMatrixColumn(b.matrix, 2).length();
  const side = Math.sign(b.lateral) || 1;
  const local = b.matrix.clone().multiply(new THREE.Matrix4().makeScale(side / sx, 1 / sy, 1 / sz)).multiply(new THREE.Matrix4().makeTranslation(0, -sy / 2, 0));
  const D = sx, H = sy, W = sz, A = FACADE, front = D / 2, body = front - A.depth;
  const stucco = new THREE.Color(WORLD.stucco[Math.floor(b.color * WORLD.stucco.length)]!);
  const r = (k: number) => hash(b.s, b.lateral, k);
  const trimC = r(1) < 0.5 ? stucco.clone().lerp(new THREE.Color('#ffffff'), 0.55) : stucco.clone().multiplyScalar(0.62);
  const P = new Parts(stucco, trimC);
  // (the ground: the road's level is its box's bottom plus its lift; the facade starts at the road)
  const g0 = H - b.h;
  // the body, behind the front's depth
  P.box('walls', D - A.depth, H, W - 0.02, -A.depth / 2, H / 2, 0);
  // the ground floor: a storefront (bays of glass, a door, a base course, the sign band), or a carport on low apartments
  const apartments = b.h <= 9 && r(2) > 0.72, xf = body;
  if (!apartments) {
    const n = Math.max(1, Math.floor((W - 1) / A.shop.bay)), bw = (W - 1) / n, door = Math.floor(r(3) * n);
    for (let i = 0; i < n; i++) {
      const z = -W / 2 + 0.5 + bw * (i + 0.5);
      P.pane(bw - 0.24, A.shop.top - 0.45, xf + 0.02, g0 + 0.35 + (A.shop.top - 0.45) / 2, z, 'x', i !== door && r(10 + i) > 0.45);
      if (i > 0) P.box('trim', 0.12, A.shop.top, 0.12, xf + 0.06, g0 + A.shop.top / 2, z - bw / 2);
    }
    P.box('trim', 0.08, 0.35, W - 0.6, xf + 0.04, g0 + 0.175, 0); // the base course
    const [b0, b1] = A.shop.band;
    P.box('trim', 0.16, b1 - b0, W - 0.4, xf + 0.08, g0 + (b0 + b1) / 2, 0);
    P.sign(Math.min(W * 0.62, 9), (b1 - b0) * 0.78, xf + 0.165, g0 + (b0 + b1) / 2, (r(4) - 0.5) * W * 0.2, Math.floor(r(5) * SHOPS.length));
  } else {
    P.pane(Math.min(W * 0.5, 7), 2.4, xf + 0.02, g0 + 1.2, (r(6) - 0.5) * W * 0.3, 'x', false); // the carport's dark mouth
  }
  // the floors above: framed windows with sills, on its front and its two ends
  const y0 = g0 + (apartments ? 3.3 : 4.3), top = H - A.cornice - 0.4;
  const across = (len: number) => Math.max(0, Math.floor((len - 1.2) / (A.win.w + A.win.gap)));
  for (let k = 0; ; k++) {
    const y = y0 + k * A.floor + A.win.h / 2;
    if (y + A.win.h / 2 > top) break;
    const m = across(W), pitch = A.win.w + A.win.gap;
    for (let i = 0; i < m; i++) {
      const z = (i - (m - 1) / 2) * pitch, lit = r(100 + k * 37 + i) > 0.5;
      P.pane(A.win.w, A.win.h, xf + 0.01, y, z, 'x', lit);
      P.box('trim', 0.08, 0.08, A.win.w + 0.16, xf + 0.04, y + A.win.h / 2 + 0.04, z);
      P.box('trim', 0.08, A.win.h, 0.08, xf + 0.04, y, z - A.win.w / 2 - 0.04);
      P.box('trim', 0.08, A.win.h, 0.08, xf + 0.04, y, z + A.win.w / 2 + 0.04);
      P.box('trim', 0.16, 0.1, A.win.w + 0.3, xf + 0.08, y - A.win.h / 2 - 0.05, z); // its sill
    }
    // its ends: a column of windows each (in the depth behind the front's detail)
    const e = across(D - A.depth - 1);
    for (let i = 0; i < e; i++) {
      const x = body - 0.8 - A.win.w / 2 - i * pitch;
      if (x - A.win.w / 2 < -D / 2 + 0.4) break;
      for (const sz2 of [1, -1] as const) P.pane(A.win.w, A.win.h, x, y, sz2 * (W / 2 - 0.005), sz2 > 0 ? 'z+' : 'z-', r(300 + k * 41 + i + (sz2 > 0 ? 0 : 7)) > 0.55);
    }
  }
  // pilasters up the taller ones, a cornice along the top of the front
  if (b.h > A.pilasters) {
    const m = across(W), pitch = A.win.w + A.win.gap;
    for (let i = 0; i <= m; i += 2) P.box('trim', 0.2, H - A.cornice - y0, 0.4, xf + 0.1, (y0 + H - A.cornice) / 2, (i - m / 2) * pitch);
  }
  P.box('trim', A.depth, A.cornice, W, front - A.depth / 2, H - A.cornice / 2, 0);
  const out = { walls: merged(P.walls), trim: merged(P.trim), glass: merged(P.glass), signs: merged(P.signs) };
  // (mirrored on the road's left: its triangles' winding turned back, so their fronts face out)
  for (const g of Object.values(out)) { if (side < 0) flipWinding(g); g.applyMatrix4(local); }
  return out;
}

/** The whole town's street fronts, merged per material. */
export function facades(blocks: readonly Block[]): FacadeGeometry {
  const all = blocks.map(facadeOf);
  return { walls: merged(all.map((f) => f.walls)), trim: merged(all.map((f) => f.trim)), glass: merged(all.map((f) => f.glass)), signs: merged(all.map((f) => f.signs)) };
}

/** The shops' signs, a cell each (browser only: a canvas). */
export function signAtlas(): THREE.CanvasTexture {
  const cw = 512, ch = 112, rows = Math.ceil(SHOPS.length / ATLAS_COLS), cv = document.createElement('canvas');
  cv.width = cw * ATLAS_COLS; cv.height = ch * rows;
  const c = cv.getContext('2d')!;
  SHOPS.forEach((name, k) => {
    const x = (k % ATLAS_COLS) * cw, y = Math.floor(k / ATLAS_COLS) * ch, [bg, ink] = SIGN_COLOURS[k % SIGN_COLOURS.length]!;
    c.fillStyle = bg; c.fillRect(x, y, cw, ch);
    c.strokeStyle = ink; c.lineWidth = 4; c.strokeRect(x + 6, y + 6, cw - 12, ch - 12);
    c.fillStyle = ink; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = font(F.sign(700), ch * 0.5);
    c.fillText(name, x + cw / 2, y + ch * 0.54, cw * 0.88);
  });
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
```

**Note on the mirror:** `makeScale(side / sx, ...)` mirrors x on the road's left, so every front is built at +x; `flipWinding` turns those triangles back so they face out. (Normals are mirrored with the positions by `applyMatrix4`.)

- [ ] **Step 4: Run the test to see it pass**

Run: `bun test tests/town.test.ts`
Expected: 2 pass. If a part pokes out (it names the block and the part), shrink that part's offset; the depth budget is `FACADE.depth`.

- [ ] **Step 5: The glass that lights at night**

Append to `app/src/look/night.ts` (import `toon` from `'./toon'` at its top):

```ts
/** Window glass on the street fronts (look/facades.ts): dark by day; by night lit where its `lit` attribute is 1, warm. */
export function nightGlass(): THREE.MeshToonMaterial {
  const m = toon({ color: '#28323c' });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.night = NIGHT;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float lit; varying float vLit;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvLit = lit;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float night; varying float vLit;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(1.0, 0.66, 0.32) * vLit * night * ${GLOW.window.toFixed(2)};`);
  };
  m.customProgramCacheKey = () => 'nightGlass';
  return m;
}
```

- [ ] **Step 6: Draw the town with it**

In `app/src/drive/world.ts`, import `import { facades, signAtlas } from '../look/facades';` and add `nightGlass` to the import from `'../look/night'`. Replace the town block lines:

```ts
  const blocks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), withWindows(toon()), Math.max(1, towns.length));
  towns.forEach((b, i) => { blocks.setMatrixAt(i, b.matrix); blocks.setColorAt(i, new THREE.Color(WORLD.stucco[Math.floor(b.color * WORLD.stucco.length)]!)); });
  blocks.count = towns.length;
  g.add(named(blocks, 'blocks'));
```

with

```ts
  // (each a street front: look/facades.ts — its body, storefront, windows, sign and cornice, inside its box)
  const town = facades(towns), fronts = new THREE.Group();
  fronts.add(new THREE.Mesh(town.walls, toon({ vertexColors: true })), new THREE.Mesh(town.trim, toon({ vertexColors: true })));
  fronts.add(new THREE.Mesh(town.glass, nightGlass()), new THREE.Mesh(town.signs, new THREE.MeshBasicMaterial({ map: signAtlas() })));
  g.add(named(fronts, 'blocks'));
```

If tsc reports `withWindows` unused in world.ts, keep it if `buildCarrier` still uses it (it does: the left faces' buildings). Otherwise drop it from the import.

- [ ] **Step 7: Typecheck, test, look**

Run: `bun x tsc --noEmit -p . && bun test 2>&1 | tail -3`
Expected: no tsc output; all pass (49).

```bash
bun scripts/render.ts sheet --url http://localhost:5990 --times 10.5,20.5,33.5,50.5,64,92,140,150 --cols 4 --out "$SP/m5b-town-fronts.png"
bun scripts/render.ts sheet --url http://localhost:5990 --times 0.5,7,10.5,16.4,18.4,20.5,23.5,28.6 --cols 4 --out "$SP/m5b-hero-fronts.png"
```

Compose before over after (town and hero) and read them. Check:
- Buildings read as street fronts: storefront glass, signs in the signs' face, framed windows with sills, cornices.
- Fronts are on the road side, on both sides of the road. If one side shows plain walls toward the road, or walls you can see through, the mirror or `flipWinding` is wrong: see the note in Step 3.
- At 140 and 150 s, windows are lit warm at random.
- No lyric reads worse.

If the shop signs pull the eye from the lyrics, dim them: give their material `color: new THREE.Color(0.8, 0.8, 0.8)`.

- [ ] **Step 8: Commit**

```bash
git add app/src/look/facades.ts app/src/look/night.ts app/tests/town.test.ts app/src/drive/world.ts
git commit -m "Street fronts: every building a storefront, framed windows, a sign and a cornice, inside its box

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Palms

**Files:**
- Create: `app/src/look/palms.ts`
- Modify: `app/src/drive/world.ts` (the palms loop builds instances of the new palm)

- [ ] **Step 1: Write the palm**

Create `app/src/look/palms.ts`:

```ts
// The LA palm (spec §3), not a ball on a stick:
//   - a tall trunk, a little curved and leaning, flaring at its foot, banded where old fronds were cut;
//   - a skirt of dead fronds under the crown;
//   - a crown of arching fronds, each a spine with its leaflets hanging off both sides.
// A few seeded variants, 12 m tall, scaled per palm (instanced). Browser and bun (geometry only).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { hash } from '../engine/util';

/** The model's height (m), its trunk's radius at the top and at the flared foot, its fronds (how many, how long, how
 *  many leaflet pairs). */
export const PALM = { h: 12, r: [0.2, 0.42] as [number, number], fronds: 14, frond: 3.4, leaflets: 10 };

/** A trunk up a gentle S, banded (vertex colours: bark and its lighter scars). */
function trunk(seed: number, bark: THREE.Color, scar: THREE.Color): THREE.BufferGeometry {
  const rings = 26, sides = 8, lean = 0.6 + 0.9 * hash(seed, 1), az = hash(seed, 2) * Math.PI * 2, pos: number[] = [], col: number[] = [], idx: number[] = [];
  const at = (u: number) => new THREE.Vector3(Math.cos(az) * lean * u * u + 0.25 * Math.sin(Math.PI * u) * Math.sin(az), PALM.h * u, Math.sin(az) * lean * u * u - 0.25 * Math.sin(Math.PI * u) * Math.cos(az));
  for (let i = 0; i <= rings; i++) {
    const u = i / rings, c = at(u), r = PALM.r[0] + (PALM.r[1] - PALM.r[0]) * Math.pow(1 - u, 6), band = i % 2 ? scar : bark;
    for (let j = 0; j < sides; j++) { const a = (j / sides) * Math.PI * 2; pos.push(c.x + r * Math.cos(a), c.y, c.z + r * Math.sin(a)); col.push(band.r, band.g, band.b); }
    if (i) for (let j = 0; j < sides; j++) { const a = (i - 1) * sides + j, b = (i - 1) * sides + ((j + 1) % sides), c2 = i * sides + j, d = i * sides + ((j + 1) % sides); idx.push(a, c2, b, b, c2, d); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx);
  g.computeVertexNormals();
  g.userData.top = at(1);
  return g;
}

/** The crown: fronds arching out and down from the top, each a spine with leaflets either side. */
function crown(seed: number, top: THREE.Vector3): THREE.BufferGeometry {
  const pos: number[] = [];
  for (let f = 0; f < PALM.fronds; f++) {
    const az = f * 2.39996 + hash(seed, 10 + f) * 0.4, el = 0.75 - 1.1 * (f / PALM.fronds) + 0.2 * hash(seed, 30 + f), L = PALM.frond * (0.85 + 0.3 * hash(seed, 50 + f));
    const dir = new THREE.Vector3(Math.cos(az), 0, Math.sin(az)), side = new THREE.Vector3(-dir.z, 0, dir.x);
    const spine = (t: number) => top.clone().addScaledVector(dir, L * t * Math.cos(el)).add(new THREE.Vector3(0, L * t * Math.sin(el) - 1.6 * t * t, 0));
    for (let k = 0; k < PALM.leaflets; k++) {
      const t0 = k / PALM.leaflets, t1 = (k + 1) / PALM.leaflets, a = spine(t0), b = spine(t1), w = 0.9 * Math.sin(Math.PI * (t0 + 0.5 / PALM.leaflets)) + 0.1;
      for (const s of [1, -1]) {
        const tip = b.clone().addScaledVector(side, s * w).add(new THREE.Vector3(0, -0.45 * w, 0));
        pos.push(a.x, a.y, a.z, b.x, b.y, b.z, tip.x, tip.y, tip.z);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/** A palm variant: its trunk, its dead skirt and its crown (separate: three materials). */
export function palmVariant(seed: number, bark: THREE.Color, scar: THREE.Color): { trunk: THREE.BufferGeometry; skirt: THREE.BufferGeometry; crown: THREE.BufferGeometry } {
  const t = trunk(seed, bark, scar), top = t.userData.top as THREE.Vector3;
  const skirt = new THREE.ConeGeometry(0.75, 1.5, 10, 1, true); skirt.translate(top.x, top.y - 0.55, top.z);
  return { trunk: t, skirt, crown: mergeGeometries([crown(seed, top)])! };
}
```

- [ ] **Step 2: Plant them**

In `app/src/drive/world.ts`, import `import { PALM, palmVariant } from '../look/palms';`. Replace the palms block, from `// palms: a trunk and a crown, behind the roadside signs' line` through `g.add(named(trunk, 'palms'), named(crown, 'palms'));`, with:

```ts
  // palms: LA's (look/palms.ts), behind the roadside signs' line, a few seeded variants instanced, each its own height
  // and turn
  const VARIANTS = 4, placed: THREE.Matrix4[][] = Array.from({ length: VARIANTS }, () => []);
  for (let k = 0; k * 30 < route.length; k++) {
    const s = k * 30 + 5;
    if (!PALMS.has(stretchAtS(s).id) || s < CORNER.cross[1] + 15) continue; // (none on the intro's corner: the signs stand against the sky)
    for (const side of [1, -1]) {
      if (side === -1 && BLOCKS[stretchAtS(s).id]!.seaLeft) continue;
      if (nearTunnel(drive.tunnels, s, TUNNEL_CLEAR)) continue; // nor in the rock
      // none by a face on the left: they'd stand between it and the camera across the road (on the right too: a wide
      // pair shot stands back past them)
      if (drive.carriers.some((c) => PAIRABLE.has(c.kind) && Math.abs(c.s - s) < c.w / 2 + (side === -1 ? 8 : 28))) continue;
      const h = 10 + 6 * hash(k, side, 8), f = route.frameAt(s), at = f.pos.clone().addScaledVector(f.right, side * 11.5);
      const m = new THREE.Matrix4().compose(at, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), hash(k, side, 9) * Math.PI * 2), new THREE.Vector3().setScalar(h / PALM.h));
      placed[Math.floor(hash(k, side, 7) * VARIANTS)]!.push(m);
    }
  }
  const bark = new THREE.Color(WORLD.trunk), scar = bark.clone().lerp(new THREE.Color('#c9a27a'), 0.35);
  const palms = new THREE.Group(), leaves = toon({ color: WORLD.crown, side: THREE.DoubleSide }), dead = toon({ color: '#7a5f3c', side: THREE.DoubleSide }), wood = toon({ vertexColors: true });
  placed.forEach((ms, v) => {
    if (!ms.length) return;
    const p = palmVariant(v + 1, bark, scar);
    for (const [geo, mat] of [[p.trunk, wood], [p.skirt, dead], [p.crown, leaves]] as const) {
      const im = new THREE.InstancedMesh(geo, mat, ms.length);
      ms.forEach((m, i) => im.setMatrixAt(i, m));
      palms.add(im);
    }
  });
  g.add(named(palms, 'palms'));
```

- [ ] **Step 3: Typecheck, test, look**

Run: `bun x tsc --noEmit -p . && bun test 2>&1 | tail -3`
Expected: no tsc output; all pass.

```bash
bun scripts/render.ts sheet --url http://localhost:5990 --times 7,16.4,20.5,28.6,140,150 --cols 3 --out "$SP/m5b-palms.png"
```

Check:
- The palms read as LA palms at playback size: a thin tall trunk and a starburst crown of drooping fronds, silhouetted against the sky at 28.6 s.
- The palms behind the skywriting don't cross its words more than before (same places).
- If a crown reads as a dark blob, thin it: `PALM.fronds` 14 → 11, leaflet width 0.9 → 0.7.

- [ ] **Step 4: Commit**

```bash
git add app/src/look/palms.ts app/src/drive/world.ts
git commit -m "LA palms: tall banded trunks, a dead skirt, crowns of arching fronds

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Kerbs and sidewalks

**Files:**
- Modify: `app/src/drive/sets/index.ts` (Placed.openings), `app/src/drive/drive.ts` (Drive.openings)
- Modify: `app/src/drive/sets/intro.ts`, `app/src/drive/sets/verse1.ts`, `app/src/drive/sets/verse2.ts` (their cross streets)
- Modify: `app/src/drive/world.ts` (the kerb and the sidewalk along the town's stretches)

- [ ] **Step 1: The sets name their openings**

In `sets/index.ts`, add to `Placed` (after `floor?`):

```ts
  /** Where its cross streets open the kerb: [s from, s to] on a side (−1 left, +1 right). */
  openings?: { side: number; a: number; b: number }[];
```

In `drive.ts`, add to the `Drive` interface (after `blocks`): `/** Where cross streets open the kerb (the set-pieces'). */ openings: { side: number; a: number; b: number }[];`. In `makeDrive`, declare `const openings: { side: number; a: number; b: number }[] = [];` beside `clears`, push in the stretch loop (`if (p.openings) openings.push(...p.openings);` after `clears.push(...)`), and add `openings` to the returned object.

In `sets/intro.ts`'s return, add `openings: [-1, 1].map((side) => ({ side, a: C.cross[0], b: C.cross[1] }))`.

In `sets/verse1.ts`'s return, add `openings: [-1, 1].map((side) => ({ side, a: crossS - 4.25, b: crossS + 4.25 }))` (the cross street's half-width is 4.25 in its props).

In `sets/verse2.ts`'s return, add `openings: [{ side: -1, a: cornerS - S.corner.w / 2, b: cornerS + S.corner.w / 2 }]`.

- [ ] **Step 2: The kerb and the sidewalk**

In `app/src/drive/world.ts`, add below `PALMS`:

```ts
/** Kerbs and sidewalks along the town's streets (not the freeway, the coast, the tunnel or the hills): the kerb's
 *  height, the sidewalk's width (m) and its concrete; broken where a cross street opens (the set-pieces' openings). */
const SIDEWALKS = { stretches: new Set(['intro', 'chorus1', 'verse1', 'verse2', 'verse3']), kerb: 0.15, width: 3, colour: '#cbbba7' };

/** A ribbon along the road from s0 to s1: at each sample, from (lateral a, height ya) to (lateral b, height yb) over the
 *  road's level; uv in metres (along, across). */
function ribbon(route: Route, s0: number, s1: number, a: number, ya: number, b: number, yb: number): THREE.BufferGeometry {
  const n = Math.max(2, Math.ceil((s1 - s0) / STEP) + 1), pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i < n; i++) {
    const s = s0 + ((s1 - s0) * i) / (n - 1), f = route.frameAt(s);
    const p = f.pos.clone().addScaledVector(f.right, a), q = f.pos.clone().addScaledVector(f.right, b);
    pos.push(p.x, p.y + ya, p.z, q.x, q.y + yb, q.z);
    uv.push(s, 0, s, Math.hypot(b - a, yb - ya));
    if (i) { const o = (i - 1) * 2; idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
```

and, in `buildWorld`, after the dashes are added:

```ts
  // the kerbs and the sidewalks, along the town's stretches, broken at the cross streets
  {
    const tex = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const c = cv.getContext('2d')!; c.fillStyle = SIDEWALKS.colour; c.fillRect(0, 0, 128, 128); c.fillStyle = 'rgba(60,40,50,0.35)'; c.fillRect(0, 0, 3, 128); c.fillRect(0, 0, 128, 2); const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / 1.5, 1 / 1.5); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    const walk = toon({ map: tex }), kerb = toon({ color: '#b8a894' }), K = SIDEWALKS;
    const spans: [number, number][] = [];
    for (const st of drive.stretches) if (K.stretches.has(st.id)) spans.push([st.k === 0 ? ROAD_START : motion.distanceAt(st.start), motion.distanceAt(st.end)]);
    for (const side of [-1, 1]) {
      const cuts = drive.openings.filter((o) => o.side === side).sort((x, y) => x.a - y.a);
      for (const [a0, b0] of spans) {
        let a = a0;
        for (const o of [...cuts.filter((o) => o.b > a0 && o.a < b0), { a: b0, b: b0 }]) {
          if (o.a - a > 1) {
            const r0 = side * ROAD_HALF, r1 = side * (ROAD_HALF + K.width);
            g.add(named(new THREE.Mesh(ribbon(route, a, o.a, r0, K.kerb, r1, K.kerb), walk), 'sidewalks'));
            g.add(named(new THREE.Mesh(ribbon(route, a, o.a, r0, 0, r0, K.kerb), kerb), 'sidewalks'));
          }
          a = Math.max(a, o.b);
        }
      }
    }
  }
```

(The ribbon's winding depends on `side`. Both materials are single-sided. If one side's sidewalk is invisible from above, give `walk` and `kerb` `side: THREE.DoubleSide`.)

- [ ] **Step 3: Typecheck, test, look**

Run: `bun x tsc --noEmit -p . && bun test 2>&1 | tail -3`
Expected: no tsc output; all pass.

```bash
bun scripts/render.ts sheet --url http://localhost:5990 --times 7,10.5,16.4,18.4,33.5,80.5 --cols 3 --out "$SP/m5b-kerbs.png"
```

Check:
- Concrete sidewalks with joints run along the street on both sides, with a kerb edge at the road.
- They break at the intro's cross street (7, 10.5, 16.4 s), at verse 1's (33.5 s) and at the Slauson corner (80.5 s).
- The A-frames and the barbershop's foot sit right on them.

- [ ] **Step 4: Commit**

```bash
git add app/src/drive/sets/index.ts app/src/drive/drive.ts app/src/drive/sets/intro.ts app/src/drive/sets/verse1.ts app/src/drive/sets/verse2.ts app/src/drive/world.ts
git commit -m "Kerbs and sidewalks along the town's streets, broken at the cross streets

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: The Impala, properly shaped

**Files:**
- Create: `app/src/look/impala.ts` (the lofted hull, pure; the wire wheel)
- Create: `app/tests/impala.test.ts`
- Modify: `app/src/drive/world.ts` (`buildCar` uses them; its details rebuilt)
- Modify: `app/src/scenes/drive.ts` (the wheels roll)

- [ ] **Step 1: Write the failing test**

Create `app/tests/impala.test.ts`:

```ts
// The Impala's body stays inside the box the guard knows the car by (drive.ts CAR_BOX), and keeps the surfaces the
// lyrics ride on: the hood (verse 2's lettering), the tail (its plate).
import { expect, test } from 'bun:test';
import * as THREE from 'three';
import { CAR_BOX } from '../src/drive/drive';
import { IMPALA, impalaHull } from '../src/look/impala';

test("the hull stays inside the car's box", () => {
  const b = new THREE.Box3().setFromBufferAttribute(impalaHull().getAttribute('position') as THREE.BufferAttribute);
  expect(b.min.x).toBeGreaterThanOrEqual(-CAR_BOX.w / 2);
  expect(b.max.x).toBeLessThanOrEqual(CAR_BOX.w / 2);
  expect(b.min.y).toBeGreaterThanOrEqual(0);
  expect(b.max.y).toBeLessThanOrEqual(CAR_BOX.h);
  expect(b.min.z).toBeGreaterThanOrEqual(-CAR_BOX.l / 2);
  expect(b.max.z).toBeLessThanOrEqual(CAR_BOX.l / 2);
});

test('the hood stands where its lettering lies, and the cockpit is open', () => {
  expect(IMPALA.top(1.62)).toBeGreaterThan(0.94); // (verse 2's hood lettering at y 1.0)
  expect(IMPALA.top(1.62)).toBeLessThan(1.0);
  expect(IMPALA.top(0)).toBeLessThan(0.6); // (the tub: the two of them sit in it)
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `bun test tests/impala.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write the hull and the wheel**

Create `app/src/look/impala.ts`:

```ts
// The '64 Impala's body (spec §3), lofted instead of extruded:
//   - a long low slab, its section a superellipse (crisp, slightly rounded), drawing in a touch toward its top;
//   - its plan tapering at the nose and tail;
//   - the hood falling to the grille, the deck to the tail;
//   - the open cockpit a tub between them;
//   - the sill rising into an arch over each wheel.
// The hull stays inside CAR_BOX (tests/impala.test.ts) and keeps the surfaces the lyrics ride on. Also the wire wheel:
// whitewall tyre, chrome rim, cross-laced spokes, a knock-off spinner. Browser and bun (geometry only).
import * as THREE from 'three';
import { CAR } from '../drive/world';

const HL = CAR.length / 2, HW = CAR.width / 2, ARCH = 0.5, N = 5;
/** Where the cockpit opens (z: from behind the bench to the dash), its floor's height. */
const COCKPIT = { z: [-1.25, 0.95] as [number, number], floor: 0.52 };
export const IMPALA = {
  /** Its half-width at z: tapering over the last 0.45 m at either end. */
  halfWidth: (z: number) => { const e = Math.max(0, Math.abs(z) - (HL - 0.45)) / 0.45; return HW * (1 - 0.13 * e * e); },
  /** Its top at z: the hood falling to the grille, the cockpit's floor, the deck falling to the tail. */
  top: (z: number) => {
    if (z > COCKPIT.z[1]) { const u = (z - COCKPIT.z[1]) / (HL - COCKPIT.z[1]); return 0.975 - 0.075 * u - 0.06 * u ** 4; }
    if (z < COCKPIT.z[0]) { const u = (COCKPIT.z[0] - z) / (HL + COCKPIT.z[0]); return 0.97 - 0.03 * u - 0.08 * u ** 4; }
    return COCKPIT.floor;
  },
  /** Its bottom at z: the sill, rising into an arch over each wheel. */
  bottom: (z: number) => { let y = 0.3; for (const zw of [CAR.wheelZ, -CAR.wheelZ]) { const dz = z - zw; if (Math.abs(dz) < ARCH) y = Math.max(y, 0.3 + Math.sqrt(ARCH * ARCH - dz * dz)); } return y; },
  /** Where the side's outer surface is at height y (for its chrome spear). */
  sideAt(z: number, y: number) {
    const t = this.top(z), b = this.bottom(z), yc = (t + b) / 2, hh = (t - b) / 2, v = Math.min(1, Math.abs((y - yc) / hh));
    return this.halfWidth(z) * Math.pow(1 - Math.pow(v, N), 1 / N) * (1 - 0.07 * Math.max(0, (y - yc) / hh));
  },
  cockpit: COCKPIT,
};

/** The hull: superellipse sections along z (a ring every station, the cockpit's edges doubled so its walls stand
 *  sheer), capped at both ends. */
export function impalaHull(): THREE.BufferGeometry {
  const zs: number[] = [];
  for (let i = 0; i <= 90; i++) zs.push(-HL + (2 * HL * i) / 90);
  for (const z of COCKPIT.z) zs.push(z - 0.005, z + 0.005);
  zs.sort((a, b) => a - b);
  const R = 40, pos: number[] = [], idx: number[] = [];
  for (const z of zs) {
    const t = IMPALA.top(z), b = IMPALA.bottom(z), yc = (t + b) / 2, hh = (t - b) / 2, w = IMPALA.halfWidth(z);
    for (let j = 0; j < R; j++) {
      const a = (j / R) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      const y = yc + hh * Math.sign(s) * Math.pow(Math.abs(s), 2 / N), x = w * Math.sign(c) * Math.pow(Math.abs(c), 2 / N) * (1 - 0.07 * Math.max(0, (y - yc) / hh));
      pos.push(x, y, z);
    }
  }
  for (let i = 1; i < zs.length; i++) for (let j = 0; j < R; j++) {
    const a = (i - 1) * R + j, b = (i - 1) * R + ((j + 1) % R), c = i * R + j, d = i * R + ((j + 1) % R);
    idx.push(a, b, c, b, d, c);
  }
  // (the end caps: a fan from each end's middle)
  for (const [i, flip] of [[0, true], [zs.length - 1, false]] as const) {
    const z = zs[i]!, centre = pos.length / 3;
    pos.push(0, (IMPALA.top(z) + IMPALA.bottom(z)) / 2, z);
    for (let j = 0; j < R; j++) { const a = i * R + j, b = i * R + ((j + 1) % R); if (flip) idx.push(centre, b, a); else idx.push(centre, a, b); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** A wire wheel, its axle along x, centred at its hub: a whitewall tyre, a chrome rim, cross-laced spokes, a three-eared
 *  knock-off. `out` (±1): which side its face looks to. */
export function wireWheel(r: number, out: number, rubber: THREE.Material, white: THREE.Material, chrome: THREE.Material): THREE.Group {
  const g = new THREE.Group(), add = (geo: THREE.BufferGeometry, m: THREE.Material) => { const o = new THREE.Mesh(geo, m); g.add(o); return o; };
  // the tyre: a lathe of a rounded section, turned onto the axle
  const pts: THREE.Vector2[] = [];
  for (let k = 0; k <= 12; k++) { const a = -Math.PI / 2 + (k / 12) * Math.PI; pts.push(new THREE.Vector2(r - 0.07 + 0.07 * Math.cos(a), 0.11 * Math.sin(a))); }
  const tyre = add(new THREE.LatheGeometry(pts, 28), rubber); tyre.rotation.z = Math.PI / 2;
  const wall = add(new THREE.RingGeometry(r * 0.62, r * 0.84, 28), white); wall.rotation.y = (out * Math.PI) / 2; wall.position.x = out * 0.112;
  const rim = add(new THREE.TorusGeometry(r * 0.6, 0.022, 8, 28), chrome); rim.rotation.y = Math.PI / 2; rim.position.x = out * 0.09;
  const hub = add(new THREE.CylinderGeometry(0.055, 0.07, 0.1, 12), chrome); hub.rotation.z = Math.PI / 2; hub.position.x = out * 0.08;
  // the spokes, laced in two crossing sets from the hub's two flanges to the rim
  for (let k = 0; k < 36; k++) {
    const a = (k / 36) * Math.PI * 2, a2 = a + (k % 2 ? 0.35 : -0.35), flange = k % 2 ? 0.05 : 0.11;
    const p = new THREE.Vector3(out * flange, 0.05 * Math.sin(a), 0.05 * Math.cos(a)), q = new THREE.Vector3(out * 0.09, r * 0.6 * Math.sin(a2), r * 0.6 * Math.cos(a2));
    const s = add(new THREE.CylinderGeometry(0.0045, 0.0045, p.distanceTo(q), 4), chrome);
    s.position.copy(p).add(q).multiplyScalar(0.5); s.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), q.clone().sub(p).normalize());
  }
  // the knock-off: three ears
  for (let k = 0; k < 3; k++) { const e = add(new THREE.BoxGeometry(0.03, 0.03, 0.13), chrome); e.position.x = out * 0.15; e.rotation.x = (k * Math.PI * 2) / 3; e.translateZ(0.05); }
  return g;
}
```

- [ ] **Step 4: Run the test to see it pass**

Run: `bun test tests/impala.test.ts`
Expected: 2 pass.

(The hull's triangles must face out. If Step 7's stills show the body inside-out, with its far side visible through the near one, swap the ring winding to `idx.push(a, c, b, b, c, d)` and the caps' two branches.)

- [ ] **Step 5: Build the car with it**

In `app/src/drive/world.ts`, import `import { IMPALA, impalaHull, wireWheel } from '../look/impala';`. In `buildCar()`, make these replacements:

(a) Replace the body's shape — from `// the body: its side profile (z along, y up), wheel arches cut from the sill` through `add(shell, paint, 0, 0, 0);` — with:

```ts
  // the body: the lofted hull (look/impala.ts), the cockpit's sides up to the beltline either side of its tub, a
  // chrome strip along their tops, its floor dark
  add(impalaHull(), paint, 0, 0, 0);
  const [cz0, cz1] = IMPALA.cockpit.z, cl = cz1 - cz0, cm = (cz0 + cz1) / 2;
  for (const x of [1, -1]) {
    box(0.07, belt - IMPALA.cockpit.floor, cl, x * (IMPALA.halfWidth(cm) - 0.035), (belt + IMPALA.cockpit.floor) / 2, cm, paint);
    box(0.09, 0.025, cl, x * (IMPALA.halfWidth(cm) - 0.04), belt + 0.012, cm, chrome);
  }
  box(Wd - 0.2, 0.02, cl - 0.05, 0, IMPALA.cockpit.floor + 0.012, cm, seat); // the floor's carpet
  box(Wd - 0.2, belt - IMPALA.cockpit.floor, 0.05, 0, (belt + IMPALA.cockpit.floor) / 2, cz1 - 0.03, dark); // the firewall under the dash
```

(b) Replace the chrome spear and bumpers and grille — from `// chrome: the spear down each side, the bumpers` through `box(Wd - 0.5, 0.2, 0.04, 0, 0.66, hl + 0.06, dark); // the grille` — with:

```ts
  // chrome: the spear along each side's crease, the bumpers wrapping the ends, the grille's bars over its dark mouth,
  // bezels round the quad headlights and the triple tail lights
  for (const sx of [1, -1]) {
    const pts: THREE.Vector3[] = [];
    for (let z = -2.2; z <= 2.25; z += 0.15) pts.push(new THREE.Vector3(sx * (IMPALA.sideAt(z, 0.74) + 0.006), 0.74, z));
    add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.018, 6), chrome, 0, 0, 0);
  }
  for (const zEnd of [hl + 0.065, -hl - 0.065]) { const bumper = add(new THREE.CapsuleGeometry(0.065, Wd - 0.1, 6, 12), chrome, 0, 0.42, zEnd); bumper.rotation.z = Math.PI / 2; }
  box(Wd - 0.5, 0.24, 0.04, 0, 0.64, hl + 0.005, dark); // the grille's mouth
  for (let k = 0; k < 4; k++) box(Wd - 0.52, 0.018, 0.03, 0, 0.55 + k * 0.06, hl + 0.025, chrome);
  for (const x of [0.72, 0.45, -0.45, -0.72]) add(new THREE.TorusGeometry(0.1, 0.014, 6, 18), chrome, x, 0.68, hl + 0.03);
  for (const x of [0.78, 0.55, 0.32, -0.32, -0.55, -0.78]) add(new THREE.TorusGeometry(0.085, 0.012, 6, 18), chrome, x, 0.68, -hl - 0.03);
```

(c) Replace the wheels block — from `// wheels: tyre, whitewall, chrome cap` through its closing `}` — with:

```ts
  // wire wheels on whitewalls (look/impala.ts), each on a pivot at its hub: the scene rolls them (userData.wheels)
  const wheels: THREE.Object3D[] = [];
  for (const z of [wheelZ, -wheelZ]) for (const x of [Wd / 2 - 0.13, -Wd / 2 + 0.13]) {
    const w = wireWheel(wheelR, Math.sign(x), dark, white, chrome); w.position.set(x, wheelR, z); g.add(w); wheels.push(w);
  }
  g.userData.wheels = wheels;
```

(d) Move the headlights and tail lights onto the new ends: change `hl + 0.07` (headlights) to `hl + 0.035` and `-hl - 0.07` (tail lights) to `-hl - 0.035`.

Leave everything else in `buildCar` as it is: the seats, windshield, dash, struts, beams and the two of them.

- [ ] **Step 6: The wheels roll**

In `app/src/scenes/drive.ts` `render()`, after the struts loop:

```ts
    // the wire wheels roll with the road (their spokes turning: they'd read as hubcaps standing still)
    for (const w of (this.car.userData.wheels as THREE.Object3D[] | undefined) ?? []) w.rotation.x = d.motion.distanceAt(t) / CAR.wheelR;
```

- [ ] **Step 7: Typecheck, test, look**

Run: `bun x tsc --noEmit -p . && bun test 2>&1 | tail -3`
Expected: no tsc output; all pass (51).

```bash
bun scripts/render.ts sheet --url http://localhost:5990 --times 7,17.9,99,101,166 --cols 3 --out "$SP/m5b-car.png"
```

Compose `m5b-car-before.png` over it, and read a full-size still of 17.9 s cropped to the car (the M5a Task 3 crop recipe). Check:
- The body reads as a '64 Impala: a long low slab with softened edges, the hood falling to the grille, wheel arches cut over wire wheels, chrome bumpers wrapping the ends, the spear along the side.
- The candy paint now shows its sheen sliding along curves.
- Verse 2's hood lettering (99 s) and plate and stickers (101 s) still sit right.
- The two of them still sit in the cockpit.

If the hull's ends look pinched, soften the taper (`0.13` → `0.08`).

- [ ] **Step 8: Commit**

```bash
git add app/src/look/impala.ts app/tests/impala.test.ts app/src/drive/world.ts app/src/scenes/drive.ts
git commit -m "The Impala, lofted: a superellipse hull with arches, chrome spear and wrapped bumpers, wire wheels that roll

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: The motel and the billboards' steel

**Files:**
- Modify: `app/src/drive/world.ts` (the motel; the billboard's structure in `buildCarrier`)

- [ ] **Step 1: The motel**

In `buildWorld`, replace the motel box (`const motel = new THREE.Mesh(...)` through `{ const M = ...; motel.matrix.copy(boxAt(...)); }`) with a call, and keep `g.add(motel, sign)`:

```ts
  const motel = buildMotel(route);
```

and add this function above `buildMotelSign`:

```ts
/** The motel on the corner (the intro's, the end's): a two-storey pink wing running back from the road, its rooms'
 *  doors and windows facing its lot (toward the corner), the upper walkway with its railing and posts, the stair at its
 *  far end, a white parapet. Its box: s −17, 20 m right of the road, 30 m deep from the road, 14 m along it, 9 m high. */
function buildMotel(route: Route): THREE.Group {
  const M = { s: -17, lateral: 20, w: 30, h: 9, d: 14 }, f = route.frameAt(M.s), g = new THREE.Group();
  g.matrixAutoUpdate = false;
  g.matrix.makeBasis(f.right.clone().negate(), new THREE.Vector3(0, 1, 0), new THREE.Vector3(f.fwd.x, 0, f.fwd.z).normalize()).setPosition(f.pos.clone().addScaledVector(f.right, M.lateral));
  const pink = withWindows(toon({ color: WORLD.motel })), white = toon({ color: '#f8f4ea' }), teal = toon({ color: '#1f6f78' }), glass = toon({ color: '#28323c' });
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); };
  const H = 6.6, front = M.d / 2 - 1.8; // (its rooms' face, the walkway in front of it to the box's edge)
  box(M.w, H, M.d - 1.8, 0, H / 2, -0.9, pink);
  box(M.w + 0.3, 0.5, M.d - 1.5, 0, H + 0.25, -0.9, white); // the parapet
  for (const [y0, fl] of [[0, 0], [3.3, 1]] as const) {
    for (let k = 0; k < 9; k++) {
      const x = -M.w / 2 + 2 + k * 3.2;
      box(1.0, 2.1, 0.06, x, y0 + 1.05, front + 0.03, teal); // its door
      box(1.3, 1.0, 0.04, x + 1.35, y0 + 1.5, front + 0.02, glass); // its window
      box(1.5, 0.1, 0.16, x + 1.35, y0 + 0.95, front + 0.08, white); // its sill
    }
    if (fl) { // the upper walkway: its slab, its railing, the posts holding it
      box(M.w, 0.22, 1.8, 0, y0 - 0.11, front + 0.9, white);
      box(M.w, 0.08, 0.08, 0, y0 + 1.0, M.d / 2 - 0.05, white);
      for (let x = -M.w / 2; x <= M.w / 2; x += 1.5) box(0.05, 1.0, 0.05, x, y0 + 0.5, M.d / 2 - 0.05, white);
      for (let x = -M.w / 2 + 0.2; x <= M.w / 2; x += 6) box(0.2, y0, 0.2, x, y0 / 2, M.d / 2 - 0.15, white);
    }
  }
  const stair = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.2, 4.6), white); // the stair up to the walkway, at its far end
  stair.position.set(M.w / 2 - 1, 1.65, front + 0.5 - 2.2); stair.rotation.x = Math.atan2(3.3, 4.2); g.add(stair);
  return g;
}
```

(The motel was never a guard block; this keeps its old box's footprint. `withWindows` still prints the window grid on its back and ends, which the camera only sees from afar.)

- [ ] **Step 2: The billboards' steel**

In `buildCarrier`, replace the `case 'billboard':` line with:

```ts
    case 'billboard': {
      // a steel structure: two I-beam legs, the catwalk under the board with its railing, gooseneck lamps over its top
      const steel = grey('#4a4450');
      if (c.stack !== 'bottom') for (const x of [-(c.w / 2 - 2), c.w / 2 - 2]) {
        const drop = y0 + c.h / 2;
        box(0.36, drop, 0.12, x, c.h / 2 - drop / 2, -0.35, steel); box(0.12, drop, 0.5, x, c.h / 2 - drop / 2, -0.35, steel);
      }
      if (c.stack !== 'top') {
        box(c.w, 0.08, 1.1, 0, -c.h / 2 - 0.35, 0.45, steel);
        box(c.w, 0.05, 0.05, 0, -c.h / 2 + 0.6, 0.98, steel);
        for (let x = -c.w / 2; x <= c.w / 2; x += 1.8) box(0.05, 0.95, 0.05, x, -c.h / 2 + 0.12, 0.98, steel);
      }
      if (c.stack !== 'bottom') for (const x of [-c.w / 3, 0, c.w / 3]) {
        box(0.06, 0.06, 1.2, x, c.h / 2 + 0.35, 0.45, steel);
        box(0.5, 0.14, 0.3, x, c.h / 2 + 0.3, 1.05, steel);
      }
      break;
    }
```

- [ ] **Step 3: Typecheck, test, look**

Run: `bun x tsc --noEmit -p . && bun test 2>&1 | tail -3`
Expected: no tsc output; all pass.

```bash
bun scripts/render.ts sheet --url http://localhost:5990 --times 1,7,10.5,23.5,113,178 --cols 3 --out "$SP/m5b-motel.png"
```

Check:
- The motel at 10.5 s and at the end card (178 s) reads as a two-storey motel with doors, a walkway and a railing; its sign is unchanged.
- The pink boards at 23.5 s stand on steel with a catwalk and lamps.
- Lamps don't cross any board's words.

- [ ] **Step 4: Commit**

```bash
git add app/src/drive/world.ts
git commit -m "The motel's rooms, walkway and stair; the billboards on steel with a catwalk and lamps

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: The kit, reviewed

**Files:**
- Modify: `docs/superpowers/specs/2026-10-13-bmf-m5-fidelity-design.md` (a "Built" note under §3)

- [ ] **Step 1: The suite, and the after-sheets**

Run: `bun x tsc --noEmit -p . && bun test 2>&1 | tail -3`
Expected: no tsc output; all pass (51).

```bash
bun scripts/render.ts sheet --url http://localhost:5990 --times 0.5,7,10.5,16.4,18.4,20.5,23.5,28.6 --cols 4 --out "$SP/m5b-hero-after.png"
bun scripts/render.ts sheet --url http://localhost:5990 --times 10.5,20.5,33.5,50.5,64,92,140,150 --cols 4 --out "$SP/m5b-town-after.png"
bun scripts/render.ts sheet --url http://localhost:5990 --times 7,17.9,99,101,166 --cols 3 --out "$SP/m5b-car-after.png"
```

Compose each before-sheet over its after-sheet (`m5b-hero-before-vs-after.png`, `m5b-town-...`, `m5b-car-...`) and read them. Every lyric must read as before. Anything worse gets fixed before Step 2.

- [ ] **Step 2: Record what was built**

In the spec, under `## 3. The world kit`, append:

```markdown
**Built (M5b, 2026-10-13):** the town's depth (rows behind the street, `blocks.ts` BACK, never on the road: tests/town.test.ts), mountains on the horizon (`look/skydome.ts`), street fronts on every town block (`look/facades.ts`, inside their boxes: tests/town.test.ts), LA palms (`look/palms.ts`), kerbs and sidewalks (`world.ts` SIDEWALKS, broken at the sets' openings), the lofted Impala on rolling wire wheels (`look/impala.ts`, inside CAR_BOX: tests/impala.test.ts), the motel's rooms and walkway, the billboards' steel. Street furniture, parked cars, traffic and pedestrians wait for a later plan.
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-10-13-bmf-m5-fidelity-design.md
git commit -m "M5b built: the world kit (depth, mountains, street fronts, palms, sidewalks, the Impala, the motel)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 4: Hand to the user**

Show the three before-over-after images in the companion or describe them, and point the user to the player at the times that changed most: 0:10, 0:16–0:19, 0:33, 0:50 and 1:41. Ask for their read before M5c's plan (the breaks and sync).
