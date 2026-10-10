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
    bun scripts/still.ts 16               # one still from the running preview -> out/still_16.00.png

Keys: space play/pause, ←/→ ±1 s (shift ±5 s), `,`/`.` ±1 frame, PageDown/PageUp next/previous section, `l` loop the
section, `h` hide the UI. `?card=testcard` forces the karaoke test card (the default scene until M2).
