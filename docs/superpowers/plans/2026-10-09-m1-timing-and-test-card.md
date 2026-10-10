# M1: Timing Data and Test Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every sung word of BMF has a start and end time the user signs off on by ear, shown on a karaoke test card in the live browser preview.

**Architecture:** Port the reference project's analysis pipeline (Demucs stems → CTC forced alignment cross-checked with Whisper → beat grid and sections) with its song-specific tables emptied, add an automatic stretched-word check, and fork the reference app's engine core (time-driven three.js engine, audio/lyrics data, preview player) with only the karaoke test card as its scene. The magazine, pages, lipstick and spreads are not copied.

**Tech Stack:** Python 3.12 via uv (demucs, torchaudio, faster-whisper, librosa, pytest); bun + Vite + three.js + TypeScript (bun test).

**Spec:** `docs/superpowers/specs/2026-10-09-bmf-lyric-video-design.md` (§5 architecture, §6 M1, §7 review).

**Reference project:** `A:/Coding/LyricVideo` (read-only; written below as `$REF`). Copy from it; never edit it.

---

## Conventions for every task

- **Shell:** Git Bash. Before any `bun`, `uv` or `ffmpeg` command run `source scripts/env.sh` (Task 1 creates it) from the repo root `A:/LyricVideoCode/BMF`.
- **Git identity is repo-local** (`Andrew B <8950616+20q2@users.noreply.github.com>`, already configured). Never pass `-c user.email=...` and never use the global identity.
- Every commit message ends with a blank line and `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- No video renders in M1. The user reviews in the live preview.

## File map

| Path | Responsibility | Origin |
|---|---|---|
| `scripts/env.sh` | Puts bun, uv, ffmpeg on Git Bash's PATH | new |
| `docs/ENGINE.md` | How to run the analysis, preview and tests | new |
| `analysis/common.py`, `separate.py`, `ctc_emissions.py`, `ctcalign.py`, `whisper_run.py`, `vocal_feats.py`, `lyrics_src.py`, `qa_plot.py`, `zoom.py` | Unchanged pipeline stages | copied |
| `analysis/align.py` | Alignment; song-specific `ANCHORS`/`FIX`/`EXTRA_DESC` emptied, then refilled for BMF | copied + edited |
| `analysis/analyze.py` | Beat grid, sections, envelopes | copied, one comment edited |
| `analysis/pron.py` | Pronunciation spellings (`Mr.` → `mister`) | copied + edited |
| `analysis/stretch_check.py` | New: flags words spanning a silence or starting inside a held note | new |
| `analysis/tests/*` | Pipeline tests (+ `test_stretch_check.py`) | copied/edited/new |
| `analysis/.cache` | Directory junction to `$REF/analysis/.cache` (models, ~5 GB, not re-downloaded) | junction, git-ignored |
| `data/lyrics.json`, `data/audio.json` | Committed timing data | generated |
| `app/` config: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html` | App shell | copied + edited |
| `app/src/engine/{engine,audio,lyrics,gl,scale,post,scene,type,util}.ts`, `glsl/common.ts` | Engine core | copied (engine/post edited) |
| `app/src/engine/palette.ts` | Placeholder palette (`bg`, `ink`, `dim`, `accent`) until M3 | new |
| `app/src/scenes/testcard.ts` | Karaoke test card | copied + recoloured |
| `app/src/timeline.ts` | Which scene plays (`testcard` until M2 adds `drive`) | copied + edited |
| `app/src/review.ts` | Pure helpers: section jumps and loops for the preview keys | new |
| `app/src/main.ts` | Preview player + export API, without the magazine | rewritten from the reference |
| `app/public/fonts/` | Bodoni Moda, Archivo, IBM Plex Mono (not `stroke/`) | copied |
| `app/tests/review.test.ts`, `util.test.ts` | Unit tests | new / copied |

---

### Task 1: Environment script and analysis port

**Files:**
- Create: `scripts/env.sh`, `analysis/` (copied files), `analysis/.cache` (junction)
- Modify: `analysis/align.py`, `analysis/analyze.py`, `analysis/pron.py`, `analysis/tests/test_pron.py`

- [ ] **Step 1: Create `scripts/env.sh`**

```bash
# Source me from Git Bash: puts this machine's bun, uv and ffmpeg on PATH (WinGet installs; not on PATH by default).
WG=/c/Users/andje/AppData/Local/Microsoft/WinGet/Packages
export PATH="$WG/Oven-sh.Bun_Microsoft.Winget.Source_8wekyb3d8bbwe/bun-windows-x64:$WG/astral-sh.uv_Microsoft.Winget.Source_8wekyb3d8bbwe:$WG/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin:$PATH"
```

Run: `source scripts/env.sh && bun --version && uv --version && ffmpeg -version | head -1`
Expected: three version lines, no "command not found".

- [ ] **Step 2: Copy the pipeline**

```bash
REF=A:/Coding/LyricVideo
mkdir -p analysis/tests
for f in align.py analyze.py common.py ctc_emissions.py ctcalign.py lyrics_src.py pron.py qa_plot.py separate.py vocal_feats.py whisper_run.py zoom.py pyproject.toml uv.lock; do cp "$REF/analysis/$f" analysis/; done
for f in conftest.py test_analyze.py test_data_contract.py test_lyrics_src.py test_pron.py; do cp "$REF/analysis/tests/$f" analysis/tests/; done
cmd //c mklink /J "A:\\LyricVideoCode\\BMF\\analysis\\.cache" "A:\\Coding\\LyricVideo\\analysis\\.cache"
ls analysis/.cache/torch/hub/checkpoints
```

Expected: the junction is created; the listing shows `model.pt` and `wav2vec2_fairseq_large_lv60k_asr_ls960.pth`.

- [ ] **Step 3: Empty align.py's song-specific tables**

In `analysis/align.py`, replace the whole `ANCHORS = { ... }` dict literal (from `ANCHORS = {` to its closing `}`) with:

```python
ANCHORS = {}
```

Replace the whole `FIX = { ... }` dict literal with:

```python
FIX = {}
```

Keep the explanatory comment blocks above each (they describe the format) but delete every comment that names a line, word or time of "I Like Ur Look" (anything mentioning L3, L7, L17–L19, L24–L27, L31, L35–L39, "So extreme", "effortlessly", "Tonight", "yeah", "Woo"). `EXTRA_DESC = []` and `LINE_WINDOWS = {}` are already empty; keep them.

In `NOTES` at the bottom, replace `'syl' = per-part timings of hyphenated tokens (b-better).` with `'syl' = per-part timings of hyphenated tokens (ooh-oh).`

Run: `grep -nE "L[0-9]+ |extreme|effortless|Tonight|b-better" analysis/align.py`
Expected: no output.

- [ ] **Step 4: Retarget analyze.py's tempo comment**

In `analysis/analyze.py` replace the line

```python
BPM_RANGE = (100.0, 150.0)  # tempo search window: spans less than a 2:1 tempo octave, contains ~134
```

with

```python
BPM_RANGE = (100.0, 150.0)  # tempo search window: spans less than a 2:1 tempo octave, contains ~129 (BMF's drum stem)
```

Run: `grep -nE "134|Kim|Petras" analysis/*.py`
Expected: no output (if a hit remains, it is a reference-song comment: rewrite it generically).

- [ ] **Step 5: Write the failing pronunciation test**

Replace `test_brand_name_is_spelled_as_sung` in `analysis/tests/test_pron.py` with:

```python
def test_abbreviation_is_spelled_as_sung():
    assert pron("Mr.") == ["mister"]
```

and replace `assert pron("effortlessly") == ["effortlessly"]` in `test_generic_tokens` with `assert pron("ooh-oh") == ["ooh", "oh"]`.

- [ ] **Step 6: Create the venv and run the test to see it fail**

```bash
source scripts/env.sh && cd analysis && uv sync && uv run pytest tests/test_pron.py -q
```

Expected: `uv sync` resolves from the local uv cache (CUDA torch from the cu128 index); 1 test FAILS: `['mr'] != ['mister']`.

- [ ] **Step 7: Set BMF's pronunciations**

In `analysis/pron.py` replace the `PRON` dict with:

```python
PRON = {
    "Mr.": "mister",
}
```

- [ ] **Step 8: Run the lyric-independent tests**

Run: `cd analysis && uv run pytest tests/test_pron.py tests/test_lyrics_src.py tests/test_analyze.py -q`
Expected: all pass. (`test_every_lyric_token_is_alignable` runs over BMF's `lyrics/lyrics.txt`; if it fails on a token, add that token's sung spelling to `PRON` and say why in a comment.)

- [ ] **Step 9: Commit**

```bash
git add scripts/env.sh analysis/
git commit -m "analysis: port the reference pipeline for BMF — song tables emptied, Mr. spelled as sung

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(`analysis/.cache` is a junction and git-ignored; `git status` must not list it.)

---

### Task 2: First pass of the timing data

**Files:**
- Create: `data/lyrics.json`, `data/audio.json` (generated)

- [ ] **Step 1: Make sure the time reference exists**

Run: `ls -la audio/song.wav`
Expected: ~32 MB file (decoded from the mp3 during brainstorming). If missing: `source scripts/env.sh && ffmpeg -y -i "SZA - BMF (Lyrics).mp3" -c:a pcm_s16le -ar 44100 audio/song.wav`.

- [ ] **Step 2: Run the pipeline**

Close GPU-heavy games first if possible (the GPU has 8 GB; the alignment models need ~4 GB).

```bash
source scripts/env.sh && cd analysis
uv run python separate.py
uv run python ctc_emissions.py
uv run python whisper_run.py
uv run python vocal_feats.py
uv run python align.py --plots
uv run python analyze.py --plots
```

Expected: `align.py` prints `wrote .../data/lyrics.json` and a list of low-confidence words; `analyze.py` prints a tempo near 129.2 BPM and writes `data/audio.json`; `analysis/qa/line_XX.png` exists for every lead line (49).

- [ ] **Step 3: Run the full analysis test suite**

Run: `cd analysis && uv run pytest tests -q`
Expected: all pass. If `test_minimum_word_duration` fails, do not add to `SHORT_OK`: note the word for Task 4.

- [ ] **Step 4: Record the disputed lyric lines**

Compare `analysis/work/whisper_large.json` (unprompted transcript) with `lyrics/lyrics.txt` line by line and list every line where the words differ in substance (not spelling). Known candidates from brainstorming: V1 "Going too fast" (Whisper: "Move your face"), V1 "pretend this can be my man" (Whisper: "pretend. Just keep me moving"), V1 "Compliment my energy", chorus 2 "The boy West side of Compton came walking in", V2 "slut me out", V3 "Love to play your ruler, be your Jane". Write the list, with each line's start time from `data/lyrics.json`, to `analysis/DISPUTED.md` as a table: `| time | line as in lyrics.txt | Whisper heard |`.

- [ ] **Step 5: Commit**

```bash
git add data/ analysis/DISPUTED.md
git commit -m "data: BMF first-pass timing (CTC + Whisper, no manual fixes) and the disputed lines

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: The stretched-word check

The alignment's known failure (reference HOTWASH): a word is stretched across a silence or into a held note, so the next word lights early or late. This check finds those words automatically so they are fixed in one sitting, not one by one in review.

**Files:**
- Create: `analysis/stretch_check.py`, `analysis/tests/test_stretch_check.py`

- [ ] **Step 1: Write the failing tests**

`analysis/tests/test_stretch_check.py`:

```python
import numpy as np

from stretch_check import gap_runs, held_start

HOP = 0.005
QUIET, VOICE = -60.0, -20.0


def track(spans, dur=3.0):
    """An RMS track (dB, 5 ms hop): QUIET except VOICE over each (t0, t1) span."""
    r = np.full(int(dur / HOP), QUIET)
    for a, b in spans:
        r[int(a / HOP):int(b / HOP)] = VOICE
    return r


def test_a_silence_inside_a_word_is_a_gap():
    r = track([(1.0, 1.3), (1.8, 2.0)])
    (g,) = gap_runs(r, HOP, 1.0, 2.0)
    assert abs(g[0] - 1.3) <= 0.01 and abs(g[1] - 1.8) <= 0.01


def test_a_breath_is_not_a_gap():
    r = track([(1.0, 1.45), (1.55, 2.0)])  # 0.10 s dip, shorter than GAP_S
    assert gap_runs(r, HOP, 1.0, 2.0) == []


def test_a_continuous_word_has_no_gap():
    assert gap_runs(track([(1.0, 2.0)]), HOP, 1.0, 2.0) == []


def test_a_start_inside_a_sustained_note_is_held():
    assert held_start(track([(0.5, 2.0)]), HOP, 1.2)


def test_a_start_after_a_dip_is_not_held():
    r = track([(0.5, 1.17), (1.20, 2.0)])  # 30 ms gap right before the start
    assert not held_start(r, HOP, 1.2)


def test_a_start_in_silence_is_not_held():
    assert not held_start(track([]), HOP, 1.2)
```

- [ ] **Step 2: Run them to see them fail**

Run: `cd analysis && uv run pytest tests/test_stretch_check.py -q`
Expected: FAIL with `ModuleNotFoundError: No module named 'stretch_check'`.

- [ ] **Step 3: Implement `analysis/stretch_check.py`**

```python
"""Stretched-word check: data/lyrics.json against the vocal stem.

The alignment's known failure is a word stretched across a silence or into a held note, so the next word
lights early or late. Two rules on the vocal stem's RMS (work/vocal_feats.npz, 5 ms hop, median-smoothed
over 25 ms):
  gap  : inside a word, a run of >= GAP_S where the voice is DROP_DB below the word's own level (or under
         FLOOR_DB). A hard flag: the word spans a silence; the report says where the silence is.
  held : a word starts while the sound before it is still sustained: the voice stays within HELD_DB of its
         level for the PRE_S before the start and never dips DIP_DB below it in the DIP_WIN around it.
         A soft flag: legato singing does this legitimately; check these by ear on the test card.
Run: uv run python stretch_check.py   (exit 1 while any gap flag is not in ALLOW)
"""
import json
import sys

import numpy as np

import common

GAP_S = 0.15
DROP_DB = 20.0
FLOOR_DB = -50.0
PRE_S = 0.25
HELD_DB = 10.0
DIP_DB = 6.0
DIP_WIN = (-0.12, 0.06)
EDGE_S = 0.04  # ignore the word's own attack and release

# (line, word index) -> why a gap inside that word is what was sung (e.g. a held word broken by a breath).
ALLOW: dict[tuple[int, int], str] = {}


def runs(mask):
    """(start_idx, end_idx_exclusive) of each run where mask is True. (align.py has the same helper, but importing
    align loads torchaudio.)"""
    m = np.concatenate([[False], mask, [False]]).astype(np.int8)
    d = np.diff(m)
    return list(zip(np.where(d == 1)[0], np.where(d == -1)[0]))


def smooth(rms_db, hop):
    from scipy.ndimage import median_filter
    return median_filter(rms_db, max(3, int(round(0.025 / hop)) | 1))


def gap_runs(r, hop, start, end):
    """Silences of >= GAP_S inside [start, end], as (t0, t1) pairs."""
    j0, j1 = int(start / hop), max(int(end / hop), int(start / hop) + 1)
    level = np.percentile(r[j0:j1], 90)
    i0, i1 = int((start + EDGE_S) / hop), int((end - EDGE_S) / hop)
    if i1 - i0 < 2:
        return []
    low = r[i0:i1] < max(level - DROP_DB, FLOOR_DB)
    return [(round((i0 + a) * hop, 3), round((i0 + b) * hop, 3))
            for a, b in runs(low) if (b - a) * hop >= GAP_S]


def held_start(r, hop, start):
    """True when `start` sits inside a sustained sound: no articulation (dip) where the word begins."""
    p0, p1 = int((start - PRE_S) / hop), int(start / hop)
    if p0 < 0 or p1 - p0 < 3:
        return False
    pre = r[p0:p1]
    ref = float(np.median(pre))
    if ref < FLOOR_DB + 10:
        return False
    w = r[max(0, int((start + DIP_WIN[0]) / hop)):int((start + DIP_WIN[1]) / hop)]
    return bool(pre.min() > ref - HELD_DB and w.min() > ref - DIP_DB)


def check(lines, r, hop):
    """Flags over every lead word: dicts with line, word, text, start, end, rule, detail."""
    out = []
    for ln in lines:
        for k, w in enumerate(ln["words"]):
            base = dict(line=ln["i"], word=k, text=w["w"], start=w["start"], end=w["end"])
            for a, b in gap_runs(r, hop, w["start"], w["end"]):
                out.append(base | dict(rule="gap", detail=f"silent {a:.2f}-{b:.2f}"))
            if held_start(r, hop, w["start"]):
                out.append(base | dict(rule="held", detail="starts inside a sustained sound"))
    return out


def main():
    doc = json.loads((common.DATA / "lyrics.json").read_text(encoding="utf-8"))
    f = np.load(common.WORK / "vocal_feats.npz")
    hop = float(f["hop_s"])
    flags = check(doc["lines"], smooth(f["rms_db"], hop), hop)
    rows = [f"{x['rule']:4s}  L{x['line']:02d}.{x['word']:<2d} {x['start']:7.2f}-{x['end']:7.2f}  "
            f"{x['text']:<14s} {x['detail']}" for x in flags]
    report = "\n".join(rows) or "no flags"
    (common.QA / "stretch_check.txt").write_text(report + "\n", encoding="utf-8")
    print(report)
    hard = [x for x in flags if x["rule"] == "gap" and (x["line"], x["word"]) not in ALLOW]
    print(f"\n{len(hard)} gap flags (hard), {sum(x['rule'] == 'held' for x in flags)} held flags (check by ear)")
    return 1 if hard else 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `cd analysis && uv run pytest tests/test_stretch_check.py -q`
Expected: 6 passed.

- [ ] **Step 5: Run the check on the real data**

Run: `cd analysis && uv run python stretch_check.py; echo "exit $?"`
Expected: a table of flags and a count line. Exit 1 is expected at this point (fixes come in Task 4). If there are more than ~25 held flags, the rule is too loose for this song's legato: raise `DIP_DB` to 8 and rerun, and say so in the commit message.

- [ ] **Step 6: Commit**

```bash
git add analysis/stretch_check.py analysis/tests/test_stretch_check.py
git commit -m "analysis: stretched-word check — gaps inside words (hard) and starts inside held notes (by ear)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Fix the flagged words from evidence

**Files:**
- Modify: `analysis/align.py` (`FIX`, `ANCHORS`), `analysis/stretch_check.py` (`ALLOW`), `data/lyrics.json`, `data/audio.json`

- [ ] **Step 1: Inspect each gap flag**

For each `gap` row in `analysis/qa/stretch_check.txt`, open `analysis/qa/line_XX.png` for its line (Read tool) and, where the plot is too coarse, print the vocal stem's 25 ms RMS around it:

```bash
cd analysis && uv run python -c "
import numpy as np; f=np.load('work/vocal_feats.npz'); h=float(f['hop_s']); r=f['rms_db']
t0,t1=T0,T1
for i in range(int(t0/h), int(t1/h), 5): print(f'{i*h:7.3f} {r[i:i+5].mean():6.1f} dB')"
```

(replace `T0,T1` with a window ~1 s either side of the word). Decide where the word really starts and ends: the voice's re-entry after the silence, or the end of the sound before it.

- [ ] **Step 2: Record each decision as a FIX entry with its evidence**

Add an entry per word to `FIX` in `analysis/align.py`, keyed `(line, word index)`, in the reference's format, with a comment giving the evidence. Example of the format (times are illustrative, use the measured ones):

```python
FIX = {
    # L4 "Going": CTC stretched it over the 0.5 s rest after the chorus (stem at its -58 dB floor
    # 29.10-29.62); the voice re-enters at 29.64.
    (4, 0): dict(start=29.64, conf=0.75),
}
```

If a whole line is placed wrongly (several words off by more than a beat), constrain the path with an `ANCHORS` entry instead (format documented above the dict) and say why. If a gap is really sung (a held word broken by a breath), add it to `ALLOW` in `stretch_check.py` with the reason.

- [ ] **Step 3: Regenerate and recheck**

```bash
cd analysis && uv run python align.py --plots && uv run python analyze.py && uv run python stretch_check.py; echo "exit $?"; uv run pytest tests -q
```

Expected: `stretch_check.py` exits 0 (no unexplained gap flags); all tests pass. Repeat Steps 1–3 until it does.

- [ ] **Step 4: Commit**

```bash
git add analysis/align.py analysis/stretch_check.py data/
git commit -m "data: BMF word timing fixed from the vocal stem — every gap flag fixed or explained

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

The remaining `held` flags are not fixed here: they go to the user's listening pass (Task 8).

---

### Task 5: App shell and engine core

**Files:**
- Create: `app/package.json`, `app/vite.config.ts`, `app/tsconfig.json`, `app/index.html`, `app/.gitignore`, `app/src/engine/*` (copied), `app/src/engine/palette.ts`, `app/public/fonts/` (copied), `app/tests/util.test.ts`

- [ ] **Step 1: Copy the shell, the engine core and the fonts**

```bash
REF=A:/Coding/LyricVideo/app
mkdir -p app/src/engine/glsl app/src/scenes app/tests app/public/fonts
cp "$REF/package.json" "$REF/bun.lock" "$REF/vite.config.ts" "$REF/tsconfig.json" "$REF/index.html" "$REF/.gitignore" app/
for f in engine audio lyrics gl scale post scene type util; do cp "$REF/src/engine/$f.ts" app/src/engine/; done
cp "$REF/src/engine/glsl/common.ts" app/src/engine/glsl/
cp "$REF"/public/fonts/*.ttf app/public/fonts/
cp -r "$REF/public/fonts/src" app/public/fonts/
cp "$REF/tests/util.test.ts" app/tests/
```

- [ ] **Step 2: Write the placeholder palette**

`app/src/engine/palette.ts`:

```typescript
import { hexToLinear } from './util';

// Placeholder palette for the test card and the greybox. The video's palette is chosen in M3 (spec §4).
export const HEX = {
  bg: '#F4EFE6', // background
  ink: '#16131A', // text
  dim: '#8C8578', // secondary text, unsung words
  accent: '#FF5A36', // highlights: the word being sung, beat marks
} as const;

export type PaletteKey = keyof typeof HEX;

/** Linear RGB triplets for GL uniforms. */
export const LIN: Record<PaletteKey, [number, number, number]> = Object.fromEntries(
  Object.entries(HEX).map(([k, v]) => [k, hexToLinear(v)]),
) as Record<PaletteKey, [number, number, number]>;

/** CSS rgba() for Canvas2D. */
export function rgba(key: PaletteKey | string, a = 1): string {
  const hex = (HEX as Record<string, string>)[key] ?? key;
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
```

- [ ] **Step 3: Detach engine.ts and post.ts from the magazine**

In `app/src/engine/engine.ts`:
- delete the line `import { loadStrokeFonts } from './stroke';`
- in `init`, replace
  `[this.audio, this.lyrics] = await Promise.all([AudioData.load(), Lyrics.load(), loadFonts(), loadStrokeFonts()]) as [AudioData, Lyrics, void, void];`
  with
  `[this.audio, this.lyrics] = await Promise.all([AudioData.load(), Lyrics.load(), loadFonts()]) as [AudioData, Lyrics, void];`
- replace `LIN.paper` with `LIN.bg`, and in the comment above it `empty paper frame` with `empty frame`.

In `app/src/engine/post.ts`:
- replace `contrastPivot: LIN.paper[0],` with `contrastPivot: LIN.bg[0],`
- the three comments that justify settings by the magazine's palette ("no orange in this palette; pink is reserved for the narrator", "The palette has no colour but pink: no chromatic aberration by default (it fringed every page edge…", "this palette has no orange, pink is reserved for the narrator") no longer hold: reduce each to what the setting does (e.g. `// neutral-white halation around highlights`, `// no chromatic aberration by default`). The post defaults themselves stay until M3 tunes the look.

Run: `grep -rnE "paper|lipstick|narrator|magazine|spread|stroke" app/src/engine/`
Expected: no hits except inside `glsl/common.ts` helper names if any (report them; don't rename GLSL helpers in M1).

- [ ] **Step 4: Rename the app**

- `app/package.json`: keep as copied (name `app`).
- `app/index.html`: `<title>I Like Ur Look</title>` → `<title>BMF</title>`; replace every `#ff2e88` with `#ff5a36` (the preview UI's accent).
- `app/vite.config.ts`: change the server comment and port to `// 5491: this project's default (5391 is the I Like Ur Look project's); if busy, vite takes the next free port` and `port: 5491`.

- [ ] **Step 5: Install and typecheck the core**

```bash
source scripts/env.sh && cd app && bun install && bun x tsc --noEmit -p tsconfig.json
```

Expected: install succeeds. tsc may only fail on modules not yet copied (`./scenes/...`, `../timeline`): none at this point because `main.ts` and `timeline.ts` don't exist yet. If an engine file imports another reference module (e.g. `./palette` keys that no longer exist), fix the import to the new palette keys (`paper`→`bg`, `graphite`→`dim`, `lipstick`→`accent`).

- [ ] **Step 6: Run the copied unit tests**

Run: `cd app && bun test`
Expected: `util.test.ts` passes.

- [ ] **Step 7: Commit**

```bash
git add app/
git commit -m "app: engine core forked from I Like Ur Look — no magazine, stroke fonts or narrator palette

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Review helpers (section jumps and loops)

**Files:**
- Create: `app/src/review.ts`, `app/tests/review.test.ts`

- [ ] **Step 1: Write the failing tests**

`app/tests/review.test.ts`:

```typescript
import { expect, test } from 'bun:test';
import { jump, partAt, partLoop } from '../src/review';

const STARTS = [0, 14.9, 29.8, 59.6];

test('partAt: the part playing at t (the last start at or before it)', () => {
  expect(partAt(STARTS, 0)).toBe(0);
  expect(partAt(STARTS, 14.89)).toBe(0);
  expect(partAt(STARTS, 14.9)).toBe(1);
  expect(partAt(STARTS, 100)).toBe(3);
});

test('partLoop: from the part start to the next start, the last one to the end', () => {
  expect(partLoop(STARTS, 20, 181.6)).toEqual([14.9, 29.8]);
  expect(partLoop(STARTS, 70, 181.6)).toEqual([59.6, 181.6]);
});

test('jump forward: the next target more than 0.05 s ahead', () => {
  expect(jump(STARTS, 0, 1)).toBe(14.9);
  expect(jump(STARTS, 14.88, 1)).toBe(29.8); // 0.02 s before a target counts as on it
  expect(jump(STARTS, 60, 1)).toBeUndefined();
});

test('jump back: the last target more than 0.3 s behind, so a second PageUp keeps going back', () => {
  expect(jump(STARTS, 15.0, -1)).toBe(0); // just after 14.9: skip it
  expect(jump(STARTS, 20, -1)).toBe(14.9);
  expect(jump(STARTS, 0.1, -1)).toBeUndefined();
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `cd app && bun test tests/review.test.ts`
Expected: FAIL, cannot find module `../src/review`.

- [ ] **Step 3: Implement `app/src/review.ts`**

```typescript
// The preview's review aids, pure, tested under bun: where PageDown / PageUp land and what `l` loops
// (main.ts). A "part" is a song section now and a stretch of the drive from M2 on; callers pass its starts.

/** The index of the part playing at t, for parts starting at `starts` (ascending, the first at 0). */
export function partAt(starts: readonly number[], t: number): number {
  let k = 0;
  while (k + 1 < starts.length && t >= starts[k + 1]!) k++;
  return k;
}

/** What `l` loops from t: the part playing, from its start to the next one's (the last part to `end`). */
export function partLoop(starts: readonly number[], t: number, end: number): [number, number] {
  const k = partAt(starts, t);
  return [starts[k]!, starts[k + 1] ?? end];
}

/** The target to jump to from t: the next one more than 0.05 s ahead (dir 1), or the last one more than 0.3 s
 *  back (dir -1, so a PageUp just after a jump goes on to the part before). Undefined at either end. */
export function jump(at: readonly number[], t: number, dir: 1 | -1): number | undefined {
  if (dir === 1) return at.find((x) => x > t + 0.05);
  const back = at.filter((x) => x < t - 0.3);
  return back[back.length - 1];
}
```

- [ ] **Step 4: Run them to see them pass**

Run: `cd app && bun test tests/review.test.ts`
Expected: 4 pass.

- [ ] **Step 5: Commit**

```bash
git add app/src/review.ts app/tests/review.test.ts
git commit -m "app: preview review helpers — part jumps and loops

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Test card, timeline and preview player

**Files:**
- Create: `app/src/scenes/testcard.ts` (copied, recoloured), `app/src/timeline.ts` (copied, edited), `app/src/main.ts` (rewritten)

- [ ] **Step 1: Copy and recolour the test card**

```bash
REF=A:/Coding/LyricVideo/app
cp "$REF/src/scenes/testcard.ts" app/src/scenes/
sed -i "s/'lipstick'/'accent'/g; s/'graphite'/'dim'/g; s/'paper'/'bg'/g; s/LIN\.paper/LIN.bg/g; s/LIN\.lipstick/LIN.accent/g; s/LIN\.graphite/LIN.dim/g" app/src/scenes/testcard.ts
grep -nE "lipstick|graphite|paper|Paper" app/src/scenes/testcard.ts
```

Rewrite each remaining hit (they are comments) in the new terms: the header comment becomes
`// Background. Centre: the current line in Bodoni, karaoke word by word (unsung = dim, sung = ink, the word being sung underlined in accent as it progresses); low-confidence words (conf < 0.5) carry a dotted underline. Previous and next lines small above/below. Top: section, time, bar.beat, tempo; four beat cells (downbeat cell wider) and an accent kick dot. Bottom: the section strip with downbeat ticks and a playhead.`
Rerun the grep: no output.

- [ ] **Step 2: Copy and point the timeline at the test card**

```bash
cp A:/Coding/LyricVideo/app/src/timeline.ts app/src/timeline.ts
```

Then in `app/src/timeline.ts`:
- replace the header comment's first two lines (`The edit: … the magazine (scenes/magazine.ts hosts every spread);`) with `// The edit: which scene plays when. Until M2 adds the drive (scenes/drive.ts) the default is the karaoke test card;`
- replace `const name = card ? (card === '1' ? 'testcard' : card) : 'magazine';` with

```typescript
const name = card ? (card === '1' ? 'testcard' : card) : DEFAULT_SCENE;
```

- and add above `export function makeTimeline`:

```typescript
/** The video's scene. M2 changes this to 'drive'. */
const DEFAULT_SCENE = 'testcard';
```

- [ ] **Step 3: Write `app/src/main.ts`**

The reference `main.ts` minus the magazine (spread jumps, the flatplan's turns, the keys check). PageDown/PageUp and `l` work on song sections for now.

```typescript
// Entry: preview player (default) or export mode (?export=1, driven by scripts/render.ts from M2).
import { Engine, type AdaptiveSampling } from './engine/engine';
import { PW, PH, SCALE } from './engine/gl';
import { jump, partAt, partLoop } from './review';
import { makeTimeline } from './timeline';

const params = new URLSearchParams(location.search);
const EXPORT = params.has('export');
const ONLY = params.get('only'); // comma-separated scene ids to load (faster stills)
const FROM = params.get('t') ? parseFloat(params.get('t')!) : null;

const canvas = document.getElementById('c') as HTMLCanvasElement;
// physical size: 1920x1080 times ?scale= (the page CSS keeps showing it at 1920x1080)
canvas.width = PW;
canvas.height = PH;

const engine = new Engine(canvas, makeTimeline);

declare global {
  interface Window { __lv: any }
}

let TIMELINE: typeof engine.timeline = [];

async function boot() {
  const onlySet = ONLY ? new Set(ONLY.split(',')) : null;
  await engine.init(onlySet ? (e) => onlySet.has(e.id) : undefined);
  TIMELINE = engine.timeline;
  // an id matching no entry would load nothing and render every frame as an unloaded scene
  const unknown = onlySet ? [...onlySet].filter((id) => !TIMELINE.some((e) => e.id === id)) : [];
  if (unknown.length) throw new Error(`?only=${ONLY}: no timeline entry ${unknown.join(', ')} (the timeline has ${TIMELINE.map((e) => e.id).join(', ')})`);
  if (EXPORT) setupExport();
  else setupPlayer();
}

// ------------------------------------------------------------------ export API
function setupExport() {
  document.body.classList.add('export');
  window.__lv = {
    engine,
    duration: engine.duration,
    errors: engine.errors,
    /** Output size in px (1920x1080 times scale); stream() sends frames of width*height*4 bytes. */
    scale: SCALE,
    width: PW,
    height: PH,
    timeline: TIMELINE.map(({ id, start, end }) => ({ id, start, end })),
    /** Render a single frame at t (seeks as needed). */
    still(t: number, samples: number | AdaptiveSampling = 1, shutter = 0.5) { return engine.render(t, 1 / 60, true, samples, shutter); },
    /** The last rendered frame as a full-resolution (PW x PH) PNG, base64 (for stills at scale > 1). */
    async png() {
      const px = await engine.readPixelsAsync(), row = PW * 4;
      const img = new ImageData(PW, PH);
      for (let y = 0; y < PH; y++) img.data.set(px.subarray((PH - 1 - y) * row, (PH - y) * row), y * row); // bottom-up -> top-down
      const oc = new OffscreenCanvas(PW, PH);
      oc.getContext('2d')!.putImageData(img, 0, 0);
      const b = new Uint8Array(await (await oc.convertToBlob({ type: 'image/png' })).arrayBuffer());
      let s = '';
      for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
      return btoa(s);
    },
    /**
     * Render [from, to) at fps and stream raw RGBA frames (bottom-up) over a WebSocket. Returns when all frames
     * were sent, with a histogram of sub-frames per frame. With `inflight`, the receiver acknowledges each frame it
     * has handed on (a text message with its running count) and at most `inflight` frames are unacknowledged:
     * backpressure from the encoder, so a slow encode (4K) cannot pile frames up in the receiver's memory.
     */
    async stream(opts: { from: number; to: number; fps: number; ws: string; samples?: number | AdaptiveSampling; shutter?: number; inflight?: number }) {
      const ws = new WebSocket(opts.ws);
      ws.binaryType = 'arraybuffer';
      let acked = 0;
      ws.onmessage = (e) => { if (typeof e.data === 'string') acked = Math.max(acked, +e.data || 0); };
      await new Promise<void>((res, rej) => { ws.onopen = () => res(); ws.onerror = (e) => rej(e); });
      const dt = 1 / opts.fps;
      const n0 = Math.round(opts.from * opts.fps), n1 = Math.round(opts.to * opts.fps);
      const buf = new Uint8Array(PW * PH * 4);
      // warm-up: render one frame before the range so the first frame is sequential for stateful scenes
      const S = opts.samples ?? 1, SH = opts.shutter ?? 0.5;
      // (adaptive sampling only runs stateless scenes: one sample is enough for the warm-up)
      if (n0 > 0) engine.render((n0 - 1) * dt, dt, false, typeof S === 'number' ? S : 1, SH);
      const used: Record<number, number> = {}; // sub-frames per frame -> frames
      for (let n = n0; n < n1; n++) {
        const k = engine.render(n * dt, dt, false, S, SH);
        used[k] = (used[k] ?? 0) + 1;
        await engine.readPixelsAsync(buf);
        if (opts.inflight) while (n - n0 - acked >= opts.inflight) await new Promise((r) => setTimeout(r, 2));
        while (ws.bufferedAmount > 64 * 1024 * 1024) await new Promise((r) => setTimeout(r, 2));
        ws.send(buf);
        if (n % 30 === 0) await new Promise((r) => setTimeout(r, 0)); // let the socket flush
      }
      while (ws.bufferedAmount > 0) await new Promise((r) => setTimeout(r, 5));
      ws.close();
      return used;
    },
  };
  window.__lv.ready = true;
}

// ------------------------------------------------------------------ preview player
function setupPlayer() {
  const audio = new Audio('audio/song.wav');
  audio.preload = 'auto';
  const ui = document.getElementById('ui')!;
  const scrub = document.getElementById('scrub') as HTMLInputElement;
  const info = document.getElementById('info')!;
  const marks = document.getElementById('marks')!;
  const errs = document.getElementById('errs')!;
  scrub.max = String(engine.duration);
  scrub.step = '0.001';
  // the volume, remembered in this browser (storage can be missing or blocked: then it starts at full each time); it
  // hands the keyboard back once set, so the arrows seek again rather than nudging it
  const volume = document.getElementById('volume') as HTMLInputElement;
  try { const v = parseFloat(localStorage.getItem('lv.volume') ?? ''); if (v >= 0 && v <= 1) volume.value = String(v); } catch { /* no storage */ }
  audio.volume = parseFloat(volume.value);
  volume.oninput = () => {
    audio.volume = parseFloat(volume.value);
    try { localStorage.setItem('lv.volume', volume.value); } catch { /* no storage */ }
  };
  volume.onchange = () => volume.blur();
  if (engine.errors.length) { errs.textContent = engine.errors.join('\n\n'); errs.style.display = 'block'; }

  // the marks strip and the jump keys follow the song's sections (M2 switches them to the drive's stretches)
  const parts = engine.audio.sections.map((s) => ({ id: s.name, start: s.start, end: s.end }));
  const starts = parts.map((p) => p.start);
  for (const p of parts) {
    const m = document.createElement('div');
    m.className = 'mark';
    m.style.left = `${(p.start / engine.duration) * 100}%`;
    m.style.width = `${((p.end - p.start) / engine.duration) * 100}%`;
    m.title = `${p.id} ${p.start.toFixed(2)}–${p.end.toFixed(2)}`;
    m.textContent = p.id;
    m.onclick = () => seek(p.start);
    marks.appendChild(m);
  }

  let t = FROM ?? 0;
  let playing = false;
  let loop: [number, number] | null = null;
  let lastAudioT = 0, lastPerf = 0;
  const seek = (x: number) => { t = Math.max(0, Math.min(engine.duration - 0.001, x)); audio.currentTime = t; };
  seek(t);

  const toggle = () => { playing = !playing; if (playing) { audio.currentTime = t; audio.play(); } else audio.pause(); };
  canvas.onclick = toggle;
  scrub.oninput = () => seek(parseFloat(scrub.value));
  window.addEventListener('keydown', (ev) => {
    if (ev.key === ' ') { ev.preventDefault(); toggle(); }
    if (ev.key === 'PageDown' || ev.key === 'PageUp') {
      ev.preventDefault();
      const to = jump(starts, t, ev.key === 'PageDown' ? 1 : -1);
      if (to !== undefined) seek(to);
    }
    if (ev.key === 'ArrowRight') seek(t + (ev.shiftKey ? 5 : 1));
    if (ev.key === 'ArrowLeft') seek(t - (ev.shiftKey ? 5 : 1));
    if (ev.key === '.') seek(t + 1 / 60);
    if (ev.key === ',') seek(t - 1 / 60);
    if (ev.key === 'l' && starts.length) loop = loop ? null : partLoop(starts, t, engine.duration);
    if (ev.key === 'h') ui.classList.toggle('hidden');
  });

  let frames = 0, fpsT = performance.now(), fps = 0;
  const tick = () => {
    if (playing) {
      // smooth the coarse audio clock with performance.now()
      const now = performance.now();
      if (audio.currentTime !== lastAudioT) { lastAudioT = audio.currentTime; lastPerf = now; }
      t = lastAudioT + (audio.paused ? 0 : (now - lastPerf) / 1000);
      // the last part's loop runs to the song's end, which the wav reaches first: wrap there too, and play on
      if (loop && (t >= loop[1] || audio.ended)) { seek(loop[0]); if (audio.paused) audio.play(); }
      if (audio.ended) playing = false;
    }
    engine.render(t, 1 / 60);
    scrub.value = String(t);
    frames++;
    const now = performance.now();
    if (now - fpsT > 500) { fps = (frames * 1000) / (now - fpsT); frames = 0; fpsT = now; }
    const l = engine.lyrics.lineAt(t), up = parts.length ? ` ▸${parts[partAt(starts, t)]!.id}` : '';
    info.textContent = `${t.toFixed(2)}s  beat ${engine.audio.beatAt(t).toFixed(2)}  bar ${engine.audio.barAt(t).toFixed(2)}${up}  ${fps.toFixed(0)}fps   ${l ? '“' + l.text + '”' : ''}${loop ? '  LOOP' : ''}`;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

boot().catch((e) => {
  console.error(e);
  document.body.insertAdjacentHTML('beforeend', `<pre style="color:#f55;position:fixed;top:0;left:0">${String(e?.stack ?? e)}</pre>`);
  window.__lv = { error: String(e?.stack ?? e) };
});
```

If `engine.audio.sections` is not the field name in `app/src/engine/audio.ts`, use the one it defines for `data/audio.json`'s `sections` (check with `grep -n "sections" app/src/engine/audio.ts`).

- [ ] **Step 4: Typecheck and test**

Run: `source scripts/env.sh && cd app && bun x tsc --noEmit -p tsconfig.json && bun test`
Expected: no type errors; all tests pass.

- [ ] **Step 5: Start the preview and check it boots**

Run in the background (Bash `run_in_background: true`):

```bash
source scripts/env.sh && cd app && bun x vite --port 5990 --strictPort
```

Then check the page and the data are served:

```bash
curl -s http://localhost:5990/ | grep -o "<title>BMF</title>"
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5990/data/lyrics.json
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5990/audio/song.wav
```

Expected: `<title>BMF</title>`, `200`, `200`.

- [ ] **Step 6: Look at the test card**

Render one still through headless Edge with a small helper, `app/scripts/still.ts` (it lives under `app/` so it
resolves `playwright-core` from `app/node_modules`; M2's `render.ts` replaces it):

```bash
mkdir -p out app/scripts && cat > app/scripts/still.ts <<'EOF'
// One still from the running preview server (M1 only; M2's render.ts replaces this). Usage: bun scripts/still.ts
import { chromium } from 'playwright-core';
const b = await chromium.launch({ channel: 'msedge' });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await p.goto('http://localhost:5990/?export=1');
await p.waitForFunction(() => (window as any).__lv?.ready || (window as any).__lv?.error, null, { timeout: 60000 });
const err = await p.evaluate(() => (window as any).__lv.error ?? (window as any).__lv.errors.join('\n'));
if (err) throw new Error(err);
await p.evaluate(() => (window as any).__lv.still(16.0));
const png = await p.evaluate(() => (window as any).__lv.png());
await Bun.write('../out/testcard_16s.png', Buffer.from(png, 'base64'));
await b.close();
EOF
cd app && bun scripts/still.ts
```

Open `out/testcard_16s.png` with the Read tool. Expected: the chorus's first line ("Young and fine and dark and handsome") in the centre with some words inked, the section name at top left, the beat cells, the section strip at the bottom; placeholder colours (warm off-white background, near-black text, orange-red accents). Fix anything unreadable before the user sees it. (`out/` is git-ignored.)

- [ ] **Step 7: Commit**

```bash
git add app/src/ app/scripts/still.ts
git commit -m "app: the karaoke test card in the preview — section jumps and loops, BMF title

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: The listening pass with the user (M1 gate)

**Files:**
- Modify (as the user's notes require): `analysis/align.py` (`FIX`), `lyrics/lyrics.txt`, `data/lyrics.json`, `data/audio.json`, `analysis/DISPUTED.md`

- [ ] **Step 1: Hand the test card to the user**

Make sure the preview from Task 7 is still running on :5990. Tell the user:
- the URL `http://localhost:5990/` (space plays, ←/→ ±1 s, shift ±5 s, PageDown/PageUp jump sections, `l` loops a section, the volume slider is bottom right);
- what to listen for: each word inks when it is sung, **especially word onsets**;
- a short list of times to check first: every `held` flag from `analysis/qa/stretch_check.txt`, every low-confidence word (dotted underline), and every line in `analysis/DISPUTED.md` (ask them which words they hear).

- [ ] **Step 2: Apply each note**

For each word the user reports early or late: measure it as in Task 4 Step 1 (when the stem and the user's ear disagree, go with the ear), add a `FIX` entry with the evidence and the user's report in its comment, then regenerate:

```bash
source scripts/env.sh && cd analysis && uv run python align.py --plots && uv run python analyze.py && uv run python stretch_check.py && uv run pytest tests -q
```

For each disputed line the user settles: edit `lyrics/lyrics.txt`, rerun the whole Task 2 Step 2 sequence from `whisper_run.py` (its prompt and the alignment read the lyrics), then Task 4 Step 3, and mark the line settled in `analysis/DISPUTED.md`.

The preview reloads the data on refresh; tell the user to hard-refresh (Ctrl+F5) after each data change.

- [ ] **Step 3: Commit each round**

```bash
git add analysis/ data/ lyrics/
git commit -m "data: <words moved, with old -> new times> (the user heard <...>)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 4: Gate**

M1 is done when the user says every word is on time. Then write `docs/ENGINE.md` (Task 9) and plan M2.

---

### Task 9: Running notes

**Files:**
- Create: `docs/ENGINE.md`

- [ ] **Step 1: Write `docs/ENGINE.md`**

```markdown
# Running BMF

Every command assumes Git Bash at the repo root after `source scripts/env.sh`.

## Timing data (analysis/, Python via uv)

The models live in `analysis/.cache`, a junction to the I Like Ur Look project's cache (nothing is re-downloaded).
The time reference is `audio/song.wav` (decoded once from the mp3; git-ignored).

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
ear wins.

## Preview (app/, bun + Vite + three.js)

    cd app
    bun install
    bun test
    bun x vite --port 5990 --strictPort   # http://localhost:5990/?t=60

Keys: space play/pause, ←/→ ±1 s (shift ±5 s), `,`/`.` ±1 frame, PageDown/PageUp next/previous section, `l` loop the
section, `h` hide the UI. `?card=testcard` forces the karaoke test card (the default scene until M2).
```

- [ ] **Step 2: Commit**

```bash
git add docs/ENGINE.md
git commit -m "docs: running the analysis and the preview

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
