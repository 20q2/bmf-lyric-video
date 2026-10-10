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

## The drive (app/src/drive/)

- `stretches.ts`: the route table (spec §3) — each stretch's section, pace, bend, climb, home chase framing, sign kind.
- `motion.ts`, `route.ts`: the car's distance on song time (exact integral of eased speed keys) and the road it drives.
- `camera.ts`, `shots.ts`: world camera poses and the shot director (snap / land / glide on the beat grid; each move
  eases from the previous move's pose at the same t, so a hand-off from the moving car to a fixed sign is continuous).
- `phrases.ts`: lines into phrases of 1-4 words (the cheapest split under a phrase-reading cost: breaks at commas, gaps
  and before "and / from / with...", never after "the / my...").
- `carriers.ts`, `carrierart.ts`: where each phrase is written — road paint, sky-writing; on the road's left walls,
  billboards, shop fascias and neon (two phrases stacked per building, read top-down); on the right short signs and
  street blades; freeway gantries (per-stretch patterns; "fly" lines in the sky) — and how the camera frames it; faces
  drawn in the browser. Each carrier's solid (building or backing board) is in the model, so the guard checks
  occlusion against what the scene builds.
- `dissolve.ts`: when text shows — blank until the camera first comes for it (`reveal`: never more than one phrase,
  or 2 s, ahead), sky-writing dissolving after.
- `drive.ts`: the model the scene renders and `tests/sung.test.ts` checks (while sung every phrase's carrier is in the
  title-safe frame, facing the camera, upright left to right, not hidden by another carrier, type >= 48 px; each
  phrase readable for dwellFor; nothing revealed early; the car never over road paint while it's sung).
- `world.ts`, `sky.ts`, `scenes/drive.ts`: the greybox world, the sky over time, the scene.

Keys: space play/pause, ←/→ ±1 s (shift ±5 s), `,`/`.` ±1 frame, PageDown/PageUp next/previous stretch, `l` loop the
stretch, `h` hide the UI. `?card=testcard` forces the karaoke test card (the drive is the default scene).
