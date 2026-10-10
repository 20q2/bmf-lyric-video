# M2: Greybox Drive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The whole song plays in the live preview as a rough drive: a blocky car on a road through ten stretches, the
sky darkening from golden hour to night, every lyric line on a placeholder sign that the camera frames while it's sung.
The gate is the user's "the drive and pacing feel right" (spec §6 M2).

**Architecture:** One new scene, `drive`, replaces the test card as the default. The world is in metres. A route
(a spline road) is built from the stretch table; the car's position along it is the integral of a per-stretch speed
profile on song time. Signs are placed on the route where the car is when their line is sung. The camera comes from a
3D shot director, the reference's (snap / land / glide on the beat grid) generalised from a flat page to world space:
a shot frames the car (chase presets that move with it) or a sign (fixed), and each move eases from whatever the
previous move resolves to *at the same t*, so a hand-off from a moving car to a fixed sign stays continuous. A guard
test checks every line's sign is in frame, facing the camera and big enough while it's sung.

**Tech Stack:** TypeScript, three.js, bun test, Vite preview on :5990, headless Edge for stills.

**Deviation from the writing-plans template, on purpose:** this plan is executed inline by its author in the same
session, so it gives interfaces, numbers, tests for the pure modules and acceptance checks, not every line of
implementation code (writing all of it twice would double the cost of a milestone whose look is thrown away in M3).

---

## Design decisions (fixed for M2)

| Thing | Decision |
|---|---|
| Units | metres, y up; the route starts at the origin heading +z |
| Stretches | 10: `intro` = [0, the downbeat of L0's bar), then one per `data/audio.json` section (chorus1, verse1, chorus2, verse2, chorus3, bridge1, verse3, chorus4, outro1), each starting on its section's start |
| Speeds (m/s) | intro 0 → pulls away in its last bar; chorus1 14; verse1 stop-and-go (2 bars at 9, 1 bar stopped, repeat); chorus2 26 (freeway); verse2 10; chorus3 18 (coast); bridge 24; verse3 8 (the Strip); chorus4 12 (hills, climbing 15 m); outro decelerating to a stop by its third bar |
| Turns | each stretch's road bends by its `turn` (degrees) spread over its length: intro 0, chorus1 0, verse1 90 (two 45° corners), chorus2 −20, verse2 −90, chorus3 30, bridge 10, verse3 0, chorus4 120 (switchbacks), outro 0 |
| Speed changes | eased over 1 s (smoothstep) so the camera never sees a jolt |
| Signs (greybox) | one per lyric line, 6 × 1.6 m board, centre 3.2 m up, 6.5 m off the road edge (alternating right / left per line within a stretch; chorus2 gantries: over the road at 6 m, facing the car), placed where the car is at the line's midpoint, its face turned 25° toward the road from facing straight back down it |
| Sign text | the line in Bodoni Moda italic (the test card's lyric face), fitted to the board; karaoke: unsung words `dim`, sung words `ink`, the word being sung in `accent` |
| Car | box body 4.8 × 1.4 × 1.9 m, cabin, 4 wheels, two flat dark silhouettes (driver left, passenger right) |
| World | ground plane, road ribbon (8 m) along the route with a centre dash, deterministic seeded blocks either side (buildings 10–30 m tall, 16+ m off the road so signs stand in front of them), per-stretch landmark blocks (motel, freeway gantry posts, ocean plane, pier, neon strip, hills) |
| Sky | background + fog colour keyed over song time: golden (#FFC56B) → sunset (#F2865E, 1:00) → magenta (#C2457A, 1:45) → violet (#3D2260, 2:15) → night (#0E0C22, 3:00) |
| Lens | 40° vertical FOV |
| Camera pose | `{ target: V3, dist, yaw, pitch, roll }`: the camera sits `dist` from `target` at compass `yaw` (radians, 0 = +z) and elevation `pitch`, looking at it |
| Chase presets (car-relative; yaw added to the car's heading) | `side` (yaw 90°, pitch 8°, dist 9), `behind` (180°, 12°, 11), `front3q` (35°, 8°, 9), `high` (180°, 50°, 30); target = car centre + 1 m up |
| Sign framing | from in front of the sign along its normal, pitch 4°, at the distance where the board spans 70% of the frame width |
| Default shots per stretch | glide to the stretch's chase preset on its first downbeat; for each line, `snap` to its sign on the first word's cue; after the line, `land` back on the chase preset unless the next line starts within 1.2 s |
| Guard (`sung.test.ts`) | at 30 samples/s through every line: the sign's 4 corners within the frame (3% margin), its face toward the camera (angle < 60°), and its text at least 36 px tall at 1080p |

## File map

| Path | Responsibility |
|---|---|
| `app/src/drive/stretches.ts` | The stretch table (the numbers above) and `resolveStretches(audio, lyrics)` → each stretch's `[start, end)` and lines |
| `app/src/drive/motion.ts` | `SpeedKey`s → `distanceAt(t)` (exact integral of eased piecewise speeds) |
| `app/src/drive/route.ts` | `Route`: spline from the stretch table; `frameAt(s)` → `{ pos, fwd, right, up, heading }`, `length` |
| `app/src/drive/camera.ts` | `Pose`, `placeCamera`, `lerpPose` (log distance, shortest-way yaw), `chase(preset, carFrame)`, `fitSign(sign)` |
| `app/src/drive/shots.ts` | The 3D director: `Shot`, `plan`, `evaluate` (recursive from-resolution), beat-grid helpers ported from the reference |
| `app/src/drive/signs.ts` | `Sign` placement for every line; `SignArt` (a canvas texture per sign, redrawn only when its karaoke key changes) |
| `app/src/drive/drive.ts` | `makeDrive(audio, lyrics)`: the pure model the scene and the guard share (stretches, route, car distance, signs, camera(t)) |
| `app/src/drive/world.ts` | The greybox meshes: ground, road, blocks, landmarks, car + silhouettes |
| `app/src/drive/sky.ts` | Sky/fog colour at t |
| `app/src/scenes/drive.ts` | The scene: poses the car, updates sign textures, places the camera, renders |
| `app/src/timeline.ts` | `DEFAULT_SCENE = 'drive'` |
| `app/src/main.ts` | Marks strip and PageDown/PageUp/`l` follow the stretches |
| `app/scripts/render.ts` | Ported (stills, sheet, perf, video, gpu; the keys check and `--cuts` removed); replaces `scripts/still.ts` |
| `app/tests/{motion,route,camera,shots,stretches,sung}.test.ts` | Unit tests + the guard |

---

### Task 1: Stretches and motion

- [ ] Test (`tests/stretches.test.ts`): stretches tile [0, duration) with no gaps; 10 of them in the order above;
  `intro` ends on a downbeat at or before L0's start; every lyric line falls in exactly one stretch (by its start).
- [ ] Test (`tests/motion.test.ts`): constant speed v over T gives v·T; a stop holds the distance flat; distance is
  monotonic non-decreasing and continuous (no step > v_max/60 between frames); speed changes are smooth (the second
  difference at 60 fps stays below 1 m/s² × dt²·k).
- [ ] Implement `stretches.ts`, `motion.ts`; tests pass; commit.

### Task 2: Route and camera poses

- [ ] Test (`tests/route.test.ts`): `frameAt(0)` is the origin heading +z; `length` ≥ the car's total distance + 50 m
  (the route runs past the end); frames are orthonormal; heading change across a stretch ≈ its `turn` (±5°);
  chorus4 climbs ~40 m.
- [ ] Test (`tests/camera.test.ts`): `placeCamera` puts the camera `dist` from the target, looking at it; `lerpPose`
  takes the short way round yaw (350° → 10° passes 0°); `fitSign` makes the board span 70% ± 2% of the frame width.
- [ ] Implement `route.ts`, `camera.ts`; tests pass; commit.

### Task 3: The 3D shot director

- [ ] Port the beat-grid helpers and the landing rules (`SNAP_S` 0.25, `LEAD` 0.04, land ≥ 0.25 s on a beat, glide to
  the downbeat a bar on) from the reference `spreads/shots.ts`.
- [ ] Test (`tests/shots.test.ts`): a snap lands SNAP_S after its cue; a word cue resolves LEAD early; two shots at the
  same time throw; the pose is continuous across a move's start (|pose(at−ε) − pose(at)| tiny) **including when the
  previous target is moving** (a car-chase → sign hand-off with the car at speed); after landing on a moving target
  the camera tracks it exactly.
- [ ] Implement `shots.ts` (`Move.to` is a target function `(t) => Pose`; `evaluate` resolves a move's `from` as the
  previous move's pose at the same t); tests pass; commit.

### Task 4: Signs and the drive model

- [ ] `signs.ts`: place one sign per line as the decisions table says; `SignArt` draws the board (bg, a thin `ink`
  border, the line fitted in Bodoni italic, karaoke colours) into a 1024 × 273 canvas, key = the line's sung-word
  count + the current word's index, redrawn only on a key change.
- [ ] `drive.ts`: `makeDrive` composes stretches, motion, route, signs and the default shots into `camera(t)`.
- [ ] Guard (`tests/sung.test.ts`) as in the decisions table, over every line; fix placements/shots until it passes
  (expected trouble: lines shorter than a snap, lines that start < 0.25 s after the previous one ends: those keep the
  camera on the previous sign's framing only if the new sign is also in frame, else snap directly sign to sign).
- [ ] Commit.

### Task 5: The scene, world and sky

- [ ] `world.ts`, `sky.ts`, `scenes/drive.ts`; timeline default `drive`; main.ts parts = stretches.
- [ ] Typecheck, tests, preview boots on :5990 without errors; commit.

### Task 6: Renderer port and self-review

- [ ] Copy the reference `scripts/render.ts`; remove the `keys` mode, `KEYS`, `--cuts`/`--offsets` and `__lv.turns`
  uses; default server port 5491; delete `scripts/still.ts`.
- [ ] `bun scripts/render.ts sheet --from 0 --to 181 --n 40 --cols 8 --out ../out/m2_sheet.png`; look at it; fix
  anything unreadable, off camera, blank or broken before the user sees it. Measure `perf` over 20 s (target < 25 ms
  per frame with the game closed; with it open, just note the number).
- [ ] Commit; hand the user the preview with what to look at (pacing of the drive, where the camera goes, sign
  timing), not polish (M3).

## Revision after the user's first look (2026-10-09)

"The theme is a bit boring… show some phrases as road paint or clouds in the sky instead of just signs… too many words
on the signs, needs to be more dynamic." Done on m2:

- Lines split into phrases of 1-4 words (`drive/phrases.ts`), 151 in all, each on its own carrier.
- Carriers (`drive/carriers.ts`): road paint (draped on the road; the camera holds high over it and the car drives up to
  it), sky-writing (appears as sung, dissolves after; camera low behind the car looking up), painted walls (camera
  slides along from across the road), short signs, freeway gantries. Each stretch has a pattern of kinds per line;
  "fly" lines are always in the sky. The user chose all four surfaces.
- The chase framings between lines orbit the car slowly, so the camera never sits still.
- Guards: every phrase's carrier in frame, facing the camera, type >= 36 px while sung; the car never covers road paint
  while it's sung.
- Fixes found in self-review: the ground was a 640 m strip folding over the hairpin (now shoulders + a base plane); the
  hill climb was 30° at worst (40 m -> 15 m).
