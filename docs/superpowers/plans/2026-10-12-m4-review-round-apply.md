# M4 review round — apply all changes: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline, this session).
> Steps use checkbox (`- [ ]`) syntax for tracking. The guards (`bun test`, `tsc`) are the test
> harness for every task: the drive is a pure model and `tests/sung.test.ts` checks what shows.

**Goal:** Apply the 2026-10-12 scene review in full — life in the built scenes (intro, verses 1–2,
chorus 2), and the four remaining set-pieces (chorus 3's coast arch, verse 3's neon strip,
chorus 4's gear-shift insert and ransom gantry, the outro's constellations and city blackout) —
completing M4's section-by-section pass.

**Architecture:** Each section keeps the established split: a pure set-piece in `app/src/drive/sets/`
(owns lines, places carriers, scripts the camera, exports a plan) and its props in
`app/src/scenes/sets/` (browser-only, reads the plan). Atmosphere that is prop-only (traffic,
pedestrians, parked cars, bulb chases) lives in the scene files and never touches the guard-checked
model; anything that could hide a lyric or swallow the camera becomes a `Block`/`solid` so the guard
sees it. New carrier kinds are added only where no existing kind fits (`arch`); everywhere else the
set-pieces reuse existing kinds so the "every kind is used" guard keeps meaning.

**Tech stack:** three.js + canvas textures, bun test, tsc. No new dependencies.

**Facts from the model dump (2026-10-12), which the tasks below cite:**
- Tunnel: s = 1411.3–1765.7. Verse 3 runs 135.60–150.60 s, car s 1766→1901 at ~9 m/s; its 8 lines
  sit at car-s ≈ 1782/1800/1817/1833/1850/1866/1882/1896.
- Chorus 3 runs 105.60–120.60 s at 18 m/s, s 1149–1411. The "South of somewhere" line L26 is sung
  109.10–112.76 (car s ≈ 1212→1278); the next line's first sign stands at s = 1285. Sun elevation
  crosses 0° at ~107.6 s today.
- Chorus 4: L41 campaign 150.60–154.36, L42 ransom 154.36–158.10 (gantries), L43 "Put it in drive"
  158.10–161.84 (today: night sky-writing — wrong), L44 hill 161.84–165.41. Word "drive" ≈ 158.8.
- Outro: only L45 (165.64–170.20) and L46 (170.28–171.90) are shown (AUDIBLE = 174); L46 is today a
  towed banner at night — wrong. The outro "crash" word falls at 176.50, after AUDIBLE: the city
  blackout is a scene event, not a lyric's.
- Night sky-writing also occurs today at verse 3's L36.1 — removed by task 7.

---

### Task 1: Groundwork in the pure model

**Files:** Modify `app/src/drive/carriers.ts`, `app/src/drive/sky.ts`.

- [x] `carriers.ts`: a fast line in a tunnel stretch stays on the tunnel wall — the FAST_LEFT
  fallback would place its lyric on a storefront pushed past the far mouth while it is sung inside.
  Guard: `isFast(line) && kind !== 'sky' && kind !== 'tunnel' && !PAIRABLE.has(kind)`.
- [x] `PATTERNS.outro1` → `['sky']` (no banner planes at night; both outro lines become
  sky-writing, drawn as stars by task 9). Delete `PATTERNS.verse3` and `FAST_LEFT.verse3`
  (task 7's set-piece owns every verse 3 line).
- [x] `HOOK.campaign` → `[1, 1.25, 1.5, 1.9]`: chorus 4's campaign line becomes his biggest
  boards, on the hill stretch, through the existing billboard machinery. Update the stale
  PATTERNS comment ("its own set-piece is to come").
- [x] Add kind `'arch'` (SetKind union, KINDS, SET_KINDS, CAPS) with
  `LAYOUT.arch = { rowH: 2.3, w: 26, advance: 0.55, emOfRow: 0.78, wrap: 20 }`.
- [x] `sky.ts`: key `[112, '#7C3A7E', '#F7745F', -1]` → elevation `0`: the sun touches the sea at
  112 s, inside the arch shot (109–112.4), instead of at 107.6.
- [x] Run `bun test` (KINDS test will fail until tasks 6–7 use `arch` and re-cover
  `storefront`/`marquee`: if so, note and defer the red to task 7's checkpoint, or keep KINDS
  green by running tasks 1+6+7 before the first full-suite checkpoint. Typecheck must stay green.)

### Task 2: The intro lives

**Files:** Modify `app/src/drive/cast.ts`, `app/src/drive/sets/intro.ts`,
`app/src/scenes/sets/intro.ts`, `app/src/scenes/sets/kit.ts`.

- [x] `cast.ts`: before the first sung word the two of them idle — his head bobs gently to the
  guitar's beat (no drums gate), her head turns slowly once toward the motel. Pure of stretches:
  gate on `t < lyrics.lines[0].start`.
- [x] `kit.ts`: shared prop builders `sedan(g, opts)` (blocky body + cab + wheels + chrome bumper,
  length ~4.6 m, color param, optional lowrider stance) and `walker(g)` (flat dark silhouette:
  legs that scissor, body capsule, head) for every scene's extras.
- [x] `sets/intro.ts` plan additions: `walker: { from, to, at }` — a pedestrian crosses the main
  road on the near crosswalk (s = C.cross[0] − 1.4) right→left, starting at bar 4's cut, done
  ≥ 1 s before the green; `cross: { at, v }` — one car crosses the intersection along the cross
  street (its light is green) during the wide shot (bars[2]→bars[3]).
- [x] `scenes/sets/intro.ts`: build and animate both from the plan.
- [x] Checkpoint: `bun test` (sung/camera guards unaffected — props only), typecheck, commit.

### Task 3: Verse 1 — receipt, live speed, oncoming car

**Files:** Modify `app/src/drive/sets/verse1.ts`, `app/src/scenes/sets/verse1.ts`.

- [x] Plan additions: `readAt` (the "can you?" phrase's end + 0.35 s), and
  `oncoming: { s0, t0, v: 11 }` timed so one car passes in the opposite lane (lateral −1.9)
  during the radio insert L8 (45.6–49.2 s), visible through the windshield beyond the dash — it
  cannot occlude an interior surface.
- [x] Props: a small amber readout on the trailer below the display, flashing their real speed
  ("16", blinking) — the world working before the lyric hijacks the main display; a "Read"
  receipt label fading in under the last text bubble at `readAt` (the cocky no-reply); the
  oncoming sedan via `kit.sedan`, driven along the route by `s(t) = s0 − v·(t − t0)`.
- [x] Checkpoint: `bun test`, typecheck, commit.

### Task 4: Chorus 2 — speed via traffic, catenary continuity

**Files:** Modify `app/src/drive/sets/chorus2.ts` (plan only), `app/src/scenes/sets/chorus2.ts`.

- [x] Plan addition: `traffic: { s0, v, lat }[]` — three slower sedans (v ≈ 17–20 m/s,
  lateral ≈ +4.6, spread so the hero overtakes all three inside 60.6–75.6 s). Sightline check
  (done in review): poster text sits at y 3.45+, the shoulder camera's rays to the gantry panels
  pass ≥ 2.5 m up — a 1.4 m sedan can't clip either.
- [x] Props: the sedans via `kit.sedan`, matrices from route frames each frame; catenary poles
  continue through the poster run, placed at the poster *gaps* (midpoints of `plan.posters`
  neighbours) instead of skipped, so the rhythm of poles never visibly breaks.
- [x] Checkpoint: `bun test`, typecheck, commit.

### Task 5: Verse 2 — chase bulbs, chicken bob, parked lowriders, suds

**Files:** Modify `app/src/drive/sets/verse2.ts`, `app/src/scenes/sets/verse2.ts`.

- [x] Plan addition: `chickens` — the word "chickens" start (≈ 92 s).
- [x] Props: the roof sign's bulbs chase in three phases on the half-beat (three lamp materials,
  `drive.beats` give the rate); the roof chicken hops once on "chickens" (damped settle, like
  hydraulics'); two parked lowriders on the left curb at s ≈ poleS − 14 and shop-end + 16
  (clear of the A-frame and along-take camera paths; one nose-down); three soap bubbles drifting
  up from the wash bays (background of the wash shot, never near the board's sightline).
- [x] Checkpoint: `bun test`, typecheck, commit.

### Task 6: Chorus 3 — the coast set-piece

**Files:** Create `app/src/drive/sets/chorus3.ts`, `app/src/scenes/sets/chorus3.ts`.
Modify `app/src/drive/sets/index.ts`, `app/src/scenes/drive.ts` (register; `SUN_AZ` 35°→26° so the
low sun sits inside the arch frame, still over the sea).

- [x] Set-piece owns only `/south of somewhere/i`. Split the line "The boy from | South of
  somewhere | came walking in"; the three phrases stack as the lettering band of a beach-town
  welcome arch spanning the road at s = carS(111.6) ≈ 1258 (the car passes under mid-"came
  walking in"; 27 m clear of the next line's sign at 1285). Kind `arch`, normal −fwd.
  Pylons at lateral ±11 enter `blocks` (prop, bare) so the guard sees them.
- [x] The take (the film's first true wide): camera fixed at arch − 50 m, lateral ≈ +1, y 4.2,
  aimed at the band — sea left, the sun (SUN_AZ 26°) kissing the water in frame-left, the car
  sweeping under the camera at ≈ 108.9 and shrinking toward the arch. Cut at L26.0's cue.
  Readability at 50 m: em ≈ 1.7–2.0 → 50–60 px ✓.
- [x] Props: the arch (two pylons, an arc over the band, a small "WELCOME TO" header in the signs'
  face, bulbs along the arc — dusk); two lifeguard towers on the sand (s ≈ 1240, 1330, lateral
  ≈ +19, clear of the dropping-line signs); three gulls (flapping V silhouettes) crossing under
  the fly line's sky-writing during 117–119 s.
- [x] Checkpoint: `bun test`, typecheck, commit.

### Task 7: Verse 3 — the Strip set-piece

**Files:** Create `app/src/drive/sets/verse3.ts`, `app/src/scenes/sets/verse3.ts`.
Modify `app/src/drive/sets/index.ts` (register).

- [x] Owns all 8 lines. One sign per line on the left (lateral −15, first at s ≥ 1782 — past the
  tunnel mouth + TUNNEL_CLEAR; then the line-mid car positions ≈ 1800…1896, each nudged apart by
  face width + 3 m). Kinds reused so the KINDS guard keeps meaning: `neon` for the pharmacy pill
  ("Ecstasy…"), champagne-cork liquor ("Pop it up…"), tiki pair ("…be your Jane" and "…Tarzan,
  toss me up"), payphone ("…call me up"), and chapel heart ("That's why he my man");
  `marquee` (scale ≈ 3, on its own board + posts) for "…say my name"; `storefront` for the pawn
  shop ("Know my baby packing…"). Solids via `solidFor` so each sign's dark building stands and
  the guard sees it.
- [x] One slow take, no cut inside the verse: eye drifts on the right (lateral ≈ +4, y 2.2) from
  first-sign − 8 to last + 6, aim swinging line by line (verse 2's `along()` pattern); the take
  cuts in at L33.0's cue (≈ 134.74, still inside the tunnel: the burst-out IS the time-skip cut).
  Plan carries each sign's face + its line's start for the props' flicker.
- [x] `Placed.floor = lastSign + 18` so chorus 4's campaign boards start clear of the strip.
- [x] Props: per-sign shapes that flicker on with their line (landmarks.ts' stutter): neon pill
  capsule + PHARMACY header; champagne glass with bubble dots; marquee bulb frame + "NITE OWL"
  header; TARZAN & JANE bamboo frame + two torches (flame flicker); payphone booth + handset +
  blinking coin light on "call me up"; three gold pawn balls + PAWN; chapel heart + arrow.
  All sign headers in the signs' face (IBM Plex / F.sign), never the lyric face.
- [x] Checkpoint: `bun test` (KINDS test green again: arch + marquee + storefront + neon all
  used), typecheck, commit.

### Task 8: Chorus 4 — the D insert and the ransom gantry

**Files:** Create `app/src/drive/sets/chorus4.ts`, `app/src/scenes/sets/chorus4.ts`.
Modify `app/src/drive/sets/index.ts` (register), `app/src/look/dash.ts` (PRND indicator),
`app/src/drive/carrierart.ts` (ransom style).

- [x] `dash.ts`: a PRND2 indicator strip on the dash in front of him (right of the head unit,
  gauge row), its letters in the signs' face; a named `shiftD` lamp plane over the D, dim by
  default. It exists for the whole film (continuity with verse 1's inserts).
- [x] Set-piece owns L43 only ("Put it in drive…"): its three phrases stacked on the head unit
  (`radio` kind, riding, `from` ≈ cue − 0.5, `until` L44 start + 1 — disjoint from verse 1's radio
  window); one interior shot (eye ≈ EYE.radio, aim between screen and indicator) held for the
  line; plan carries `driveAt` (the word "drive"'s start) and the window.
- [x] `scenes/sets/chorus4.ts`: flare `shiftD` from `driveAt` (bright HDR, settling), a touch of
  glow.
- [x] `carrierart.ts`: ransom style for `gantry` carriers in stretch `chorus4` — the route shield
  copy stays (a real sign hijacked); each letter on its own pasted scrap: seeded per-letter
  background patch (palette), family (Archivo 900 / Bodoni italic / Plex bold), size and tilt
  jitter; unsung dim, the word being sung tilted a touch more.
- [x] Checkpoint: `bun test`, typecheck, commit. If the scale-1.9 campaign boards trip the guard
  on the switchback (terrain or overlap), drop `HOOK.campaign[3]` to 1.6 and re-run.

### Task 9: The outro — constellations and the blackout

**Files:** Modify `app/src/drive/carrierart.ts`, `app/src/look/city.ts`, `app/src/scenes/drive.ts`.

- [x] `carrierart.ts`: sky-writing at night (daylight < 0.35) draws as constellations — each
  word rasterised to a scratch canvas, sampled on a coarse grid (~0.2 em), four-point star
  sparkles at the sampled points (word-level karaoke colours and the dissolve drift preserved).
- [x] `city.ts`: a `sleep` attribute per light — block-quantised (street-grid cell hash) delay —
  and an `offAt` uniform; `vA *= 1 − smoothstep(sleep, sleep + 0.4, t − offAt)`. Freeway lights
  get the longest sleeps (they die last, still streaming).
- [x] `scenes/drive.ts`: `offAt` = the last "crash" word (176.50 — from lyrics, even past
  AUDIBLE: the end is the scene's own), blackout rolling out over ~2.5 s, done before the end
  card cut (179.2); their tail lights (always-lit lamp material) are the last thing lit, then the
  motel's NO goes out (built).
- [x] Checkpoint: `bun test`, typecheck, commit.

### Task 10: Docs and the final gate

**Files:** Modify `docs/superpowers/specs/2026-10-11-bmf-flow-plan.md` (build notes; strike the
stale §1 "crane down into the car" out-note), `docs/ENGINE.md` (route table current).

- [x] Build notes for this round appended to the flow plan (what was built per section, fixes
  found on the way), the §1/§2 supersessions marked inline.
- [x] Full `bun test` + `bun run typecheck` green; commit.

## Self-review

- Spec coverage: every review item has a task — intro life (2), chorus 1's South Detroit beat
  (verified intended: `world.ts` placeSigns callbacks; no change), verse 1 trio (3), chorus 2
  speed + poles (4), verse 2 quartet (5), chorus 3 arch/sea/sun/gulls (6), tunnel handoff +
  verse 3 strip (7), chorus 4 D + ransom + biggest campaign (1, 8), outro constellations +
  blackout + banner removal (1, 9), fast-line tunnel trap (1), doc drift (10).
- No placeholders: geometry, timings and acceptance are concrete; the code is written in-session
  by the same agent that derived them (inline execution; the guards are the tests).
- Type consistency: new plan fields are named once per task and consumed only by that task's
  scene file; `arch` is the only new Kind.
