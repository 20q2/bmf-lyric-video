# Running BMF

Every command assumes Git Bash at the repo root after `source scripts/env.sh` (bun, uv and ffmpeg aren't on
Git Bash's PATH on this machine).

## Timing data (analysis/, Python via uv)

The models live in `analysis/.cache`, a directory junction to the I Like Ur Look project's cache, so nothing is
re-downloaded (create it from PowerShell with
`New-Item -ItemType Junction -Path analysis\.cache -Target A:\Coding\LyricVideo\analysis\.cache`).
The time reference is `audio/song.wav`, decoded once from the mp3 (git-ignored).

    cd analysis
    uv run python separate.py        # Demucs stems -> analysis/stems, work/vocals16k.wav
    uv run python ctc_emissions.py   # CTC emissions (MMS_FA, wav2vec2 LV60K)
    uv run python whisper_run.py     # Whisper cross-check transcripts
    uv run python vocal_feats.py     # vocal-stem RMS / pitch / onsets
    uv run python align.py --plots   # -> data/lyrics.json, analysis/qa/line_XX.png
    uv run python analyze.py --plots # -> data/audio.json
    uv run python rms.py T0 T1       # the vocal stem around a word: the evidence for a FIX entry
    uv run python stretch_check.py   # gap flags (must be fixed or in ALLOW) and held flags (check by ear)
    uv run pytest tests -q

Hand fixes go in `align.py`'s `FIX` table, each with its evidence. When the stem and the user's ear disagree, the
ear wins. Close GPU-heavy games first if you can: the GPU has 8 GB and the models share it.

## Preview (app/, bun + Vite + three.js)

    cd app
    bun install
    bun test
    bun x tsc --noEmit -p tsconfig.json
    bun x vite --port 5990 --strictPort   # http://localhost:5990/?t=60
    bun scripts/render.ts stills --t 17,45 --url http://localhost:5990          # -> out/stills (no trailing slash on --url)
    bun scripts/render.ts sheet --from 1 --to 180 --n 40 --cols 8 --url http://localhost:5990 --out ../out/sheet.png
    bun scripts/render.ts perf --from 60 --to 70                                # ms per frame (close GPU-heavy games first)

Without `--url` the renderer starts its own private server. Look at stills and sheets (Read tool) before handing work
to the user. Only the final export renders video (M5).

## The site (GitHub Pages)

The page is the site: the same player serves the preview and GitHub Pages (`src/player.ts`). It plays the video live
and lets the viewer leave the video's camera — `1` the video's camera, `2` fly (drag to look, WASD, Space/Ctrl or E/Q up/down,
wheel for speed; K plays/pauses, `F` keep pace with the car), `3` orbit the car; `P` keeps the video in a corner inset, `V` jumps to where
the video's camera is, `?` lists every key. While the view is elsewhere the video's camera stands in the world as an
orange film camera with its frame drawn ahead of it (`explore/rig.ts`). The scene reads the view from
`explore/view.ts` (`VIEW.eye`); the export never sets it, so renders are the video's camera, unchanged.

The song is never bundled: the preview plays `audio/song.wav` from the repo (no intro); the site asks visitors for
their own copy (a file picker, or drop it on the page) or plays without sound on the wall clock.

    cd app
    bun run build      # -> app/dist (relative paths: serves from any subpath)
    bun run preview    # http://localhost:5994/ — the built site, as Pages will serve it

`.github/workflows/pages.yml` typechecks, tests, builds and publishes `app/dist` on every push to `main` (or by hand
from the Actions tab). One-time setup on GitHub: Settings → Pages → Source: GitHub Actions.

## Re-rendering the video

The site doesn't replace the render: `scripts/render.ts` drives the same app in headless Edge (`?export=1`).

    cd app
    bun run render:video   # the final settings -> ../out/bmf.mp4 (1080p60, adaptive motion blur; ~3 h on this machine)
    bun run render:draft   # player quality, one sample a frame -> ../out/bmf_draft.mp4 (minutes: to check a change)
    bun run render:video --from 60 --to 70 --out ../out/clip.mp4   # a stretch; later options override the script's

`render:video` is `render.ts video --samples auto --max-samples 36 --shutter 0.2`, the m6 final's settings
(`out/bmf_m6.mp4`, fb2be77). It needs `audio/song.wav` (or `--noaudio`) and ffmpeg (`source scripts/env.sh`).
`--scale 2` renders 4K.

## The drive (app/src/drive/)

- `stretches.ts`: the route table (spec §3) — each stretch's section, pace, bend, climb, home chase framing, sign kind.
- `motion.ts`, `route.ts`: the car's distance on song time (exact integral of eased speed keys) and the road it drives.
- `camera.ts`, `shots.ts`: world camera poses and the shot director (snap / land / glide on the beat grid; each move
  eases from the previous move's pose at the same t, so a hand-off from the moving car to a fixed sign is continuous).
- `phrases.ts`: lines into phrases of 1-4 words (the cheapest split under a phrase-reading cost: breaks at commas, gaps
  and before "and / from / with...", never after "the / my...").
- `carriers.ts`, `carrierart.ts`: where each phrase is written — road paint, sky-writing; on the road's left walls,
  billboards, shop fascias and neon (two phrases stacked per building, read top-down); on the right short signs and
  street blades; banners towed by planes; freeway gantries (per-stretch patterns; "fly" lines in the sky) — and how the camera frames it; faces
  drawn in the browser. Each carrier's solid (building or backing board) is in the model, so the guard checks
  occlusion against what the scene builds.
- `sets/` (M4, the flow plan: docs/superpowers/specs/2026-10-11-bmf-flow-plan.md): a stretch that is its own scene. Its
  set-piece scripts the car's pace (`pace: { kind: 'set' }`), places its phrases on its own surfaces (SetKind: a speed
  trailer, a bus's wrap, a bench, stickers and a plate, the radio riding in the dash, a menu board, an order screen, a
  receipt), frames each (cut / whip / snap), keeps its ground clear and adds its own blocks; `scenes/sets/` builds its
  props from its plan. The guard checks it like the rest; from inside the car only the cabin (drive.ts CABIN) can hide
  a word. `intro.ts`: the red light on a real corner (shops back down the street, the motel, a liquor store), its
  street signs, green on the first kick. `chorus1.ts`: its first line in gold leaf on the barbershop's windows (it owns
  one line). `verse1.ts`: the city at speed (the bus, her mirror and phone, the van, the head unit, the burger stand).
  `chorus2.ts`: the freeway (his posters wiped into view by the Metro, the big sign; it owns two lines). `verse2.ts`:
  Slauson at a crawl (the chicken spot's pole sign, A-frames, windows, banner and roof sign; the car wash's ad; their
  car's banner, hood, plate and bumper stickers; his giant mural on its building). `chorus3.ts`: the coast (the beach
  town's welcome arch before his boards — the wide looks down the chorus through it, the sun on the water at 112 s —
  and the dropping line on three numbered lifeguard towers; it owns two lines). `verse3.ts`: the Strip (every line on
  its own shaped sign — neon, the marquee, the pawn fascia — one slow take, each sign flickering on with its line).
  `chorus4.ts`: his biggest board on the climb and the "Put it in drive" insert (the head unit's line, the shift
  indicator's D flaring); the ransom line keeps its gantries, restyled (carrierart.ts). A set-piece's own buildings can
  be its props' (Block.prop: world.ts leaves them out, the guard still sees them). The car's cabin fittings (visors,
  gauges, head unit, the shift indicator) are `look/dash.ts`, placed by `drive/cabin.ts`.
- `tunnel.ts`: a stretch marked `tunnel` (the bridge) runs through a headland — its mouths, a lamp over the car on
  every beat; world.ts builds the bore, headland and lamps, the scene darkens and lights it by where the camera is.
- `dissolve.ts`: when text shows — blank until the camera first comes for it (`reveal`: never more than one phrase,
  or 2 s, ahead), sky-writing dissolving after.
- `drive.ts`: the model the scene renders and `tests/sung.test.ts` checks (while sung every phrase's carrier is in the
  title-safe frame, facing the camera, upright left to right, not hidden by another carrier, type >= 48 px; each
  phrase readable for dwellFor; nothing revealed early; the car never over road paint while it's sung).
- `world.ts`, `sky.ts`, `scenes/drive.ts`: the world, the sky over time, the scene.
- `look/` (M3, Sunset Print; docs/superpowers/plans/2026-10-10-m3-look.md): `skydome.ts` (banded sky, sun, stars),
  `toon.ts` (three-tone materials, the palette), `print.ts` (ink, halftone, violet shade), `night.ts` (windows,
  streetlights, glows; the NIGHT uniform), `city.ts` (the finale's lights, out block by block on the last "crash"),
  `money.ts` (the bills). Night sky-writing draws as constellations (carrierart.ts: the outro's lines in stars).

Keys: space play/pause, ←/→ ±1 s (shift ±5 s), `,`/`.` ±1 frame, PageDown/PageUp next/previous stretch, `l` loop the
stretch, `h` hide the UI. `?card=testcard` forces the karaoke test card (the drive is the default scene).
