"""Stretched-word check: data/lyrics.json against the vocal stem.

The alignment's known failure is a word stretched across a silence or into a held note, so the next word
lights early or late. Two rules on the vocal stem's RMS (work/vocal_feats.npz, 5 ms hop, median-smoothed
over 25 ms):
  gap  : inside a word, a run of >= GAP_S where the voice is DROP_DB below the word's own level (or under
         FLOOR_DB). A hard flag: the word spans a silence; the report says where the silence is.
  held : a word starts inside a held note: the voice stays within HELD_DB of its level for the PRE_S before
         the start, never dips DIP_DB below it in the DIP_WIN around it, and (given the pitch track) stays
         voiced on the same note (within NOTE_ST semitones) across PITCH_S either side. A soft flag: check
         these by ear on the test card. (Without the pitch condition every legato word flags: BMF gave 164.)
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
PITCH_S = 0.08
NOTE_ST = 0.5
EDGE_S = 0.04  # ignore the word's own attack and release

# (line, word index) -> why a gap inside that word is what was sung (e.g. a held word broken by a breath).
ALLOW: dict[tuple[int, int], str] = {
    # the song's last phrase fades out at -51..-57 dB, under FLOOR_DB: the "silences" are its quiet notes
    (48, 1): "faint fade-out: 'make' sung at -52 dB",
    (48, 3): "faint fade-out: 'last' sung at -56 dB",
}


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


def held_start(r, hop, start, f0=None):
    """True when `start` sits inside a held note: no articulation (dip, unvoiced consonant or change of note)
    where the word begins. f0 (Hz, NaN = unvoiced) on the same hop as r; without it only the level is checked."""
    p0, p1 = int((start - PRE_S) / hop), int(start / hop)
    if p0 < 0 or p1 - p0 < 3:
        return False
    pre = r[p0:p1]
    ref = float(np.median(pre))
    if ref < FLOOR_DB + 10:
        return False
    w = r[max(0, int((start + DIP_WIN[0]) / hop)):int((start + DIP_WIN[1]) / hop)]
    if not (pre.min() > ref - HELD_DB and w.min() > ref - DIP_DB):
        return False
    if f0 is None:
        return True
    n = int(PITCH_S / hop)
    a, b = f0[p1 - n:p1], f0[p1:p1 + n]
    if np.isnan(a).any() or np.isnan(b).any():
        return False
    return bool(abs(12 * np.log2(np.median(b) / np.median(a))) < NOTE_ST)


def check(lines, r, hop, f0=None):
    """Flags over every lead word: dicts with line, word, text, start, end, rule, detail."""
    out = []
    for ln in lines:
        for k, w in enumerate(ln["words"]):
            base = dict(line=ln["i"], word=k, text=w["w"], start=w["start"], end=w["end"])
            for a, b in gap_runs(r, hop, w["start"], w["end"]):
                out.append(base | dict(rule="gap", detail=f"silent {a:.2f}-{b:.2f}"))
            if held_start(r, hop, w["start"], f0):
                out.append(base | dict(rule="held", detail="starts inside a sustained sound"))
    return out


def main():
    doc = json.loads((common.DATA / "lyrics.json").read_text(encoding="utf-8"))
    f = np.load(common.WORK / "vocal_feats.npz")
    hop = float(f["hop_s"])
    flags = check(doc["lines"], smooth(f["rms_db"], hop), hop, f["f0"])
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
