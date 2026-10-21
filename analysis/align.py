"""Word-level lyric alignment -> data/lyrics.json

Pipeline
  1. ctc_emissions.py  : frame-wise CTC log-probs of the vocal stem from two
                         acoustic models (MMS_FA, wav2vec2 LV60K).
  2. whisper_run.py    : faster-whisper large-v3 word timestamps (cross-check).
  3. vocal_feats.py    : vocal-stem RMS / pitch / onset features (5 ms hop).
  4. this script       : one global constrained CTC Viterbi pass over the whole
                         song on the fused emissions (garbage "star" token
                         between lines), with manually verified anchors for hard
                         spots, then signal-based refinement of word starts/ends,
                         confidence scoring, QA plots.

Run:  uv run python align.py [--plots]
"""
import common
import json
import re
import sys
from difflib import SequenceMatcher

import numpy as np

from ctcalign import FRAME, align, emissions, word_table
from pron import pron

# Primary emission set: mixture of both CTC models on the demucs vocal stem's
# mono sum, left and right channel (choruses are double-tracked L/R).
PRIMARY = "fused6"
# Independent-ish alternatives, used for agreement-based confidence.
ALTS = ("mms", "lv60k", "fused_vocL", "fused_vocR")

# Per-line time windows (seconds) where the automatic path is ambiguous.
LINE_WINDOWS = {
    # Bridge and outro, four two-bar phrases each: "Blowin' money fast, (oh) it won't last (oh) / Tryna make it last
    # (oh) / Blowin' money fast, (mmm) we might crash (oh) / Tryna make it last (we'll be, oh-oh)". The "oh"s are higher ad-libs
    # (~420 Hz) between lead phrases (~210-320 Hz). Unconstrained, CTC stretched lines over them (e.g. bridge "Blowin'"
    # 118.74-121.57, over the held chorus "fly" to 120.15). Windows: from the phrase's entry to just before the next
    # line's lead; the bridge enters at 120.64 after a silence 120.20-120.62. (The user heard "it won't last" at ~125
    # s: the lead's 277 -> 155 Hz phrase 123.46-124.18, which an earlier pass had taken for "Tryna".)
    29: (120.60, 124.20), 30: (125.25, 126.65), 31: (127.05, 131.78), 32: (132.30, 133.62),
    45: (164.95, 169.10), 46: (170.25, 171.60), 47: (173.00, 176.62), 48: (177.05, 178.70),
}

# ---------------------------------------------------------------------------
# Manual anchors (seconds) for the CTC path, established by inspecting the QA
# plots (spectrogram / pitch / envelopes).  Key: (line, token, subword) ->
# (earliest allowed start, latest allowed end) of that subword's chars.
ANCHORS = {}

# Final manual corrections of word boundaries after refinement, only where the
# plots clearly show the automatic result is wrong.  (line, token) ->
# dict(start=..., end=..., conf=...).  A manual end is authoritative: main()
# pushes the following word later instead of cutting the fixed word short.
# entries are added only after inspecting the QA plots for this song
FIX = {
    # L16 "Ooh, he bossy, ooh, he crip walkin'": the second "ooh" (206 Hz) ends at 77.45 (-28 -> -41 dB), the stem
    # stays near -44 dB to 77.70 and "he" enters at 77.72 (-39 -> -17 dB). CTC ran "ooh" through the silence.
    (16, 3): dict(end=77.45, conf=0.75),
    (16, 4): dict(start=77.72, conf=0.75),
    # L17 "...and he slut me out": "and" (261 Hz) falls away at 81.17; a faint -40 dB tail to 81.40, then the voice
    # re-enters at 81.43 (onset 2.1). "he" 81.43-81.60 (dip to -32 dB at 81.62), "slut" from 81.67 (onset 2.0).
    (17, 5): dict(start=81.43, end=81.60, conf=0.7),
    (17, 6): dict(start=81.67, conf=0.7),
    # L19 "...call him Mr. Handle It": "call" 88.48-88.69 (onset 5.2 at 88.50), the stem near -40..-48 dB to 88.93,
    # "him" enters at 88.95 (229 Hz) and "Mr." rises to 260 Hz from 89.20. CTC put "him" on the end of "call".
    (19, 6): dict(start=88.95, end=89.19, conf=0.7),
    (19, 7): dict(start=89.20, conf=0.7),
    # L28 chorus-3 "fly" (the last one) is held to 120.15 (-20 -> -45 dB by 120.20); the bridge enters at 120.64.
    (28, 3): dict(end=120.17, conf=0.8),
    # L29 bridge "Blowin'": the voice enters at 120.64 (282 Hz) after the silence that ends "fly"; refinement had 120.88.
    (29, 0): dict(start=120.64, conf=0.8),
    # L33 verse-3 "Ecstasy": 134.15-135.57 is L32's ad-lib "(we'll be, oh-oh)": "we'll be" 410 -> 263 Hz, then two held
    # "oh"s (237 Hz, then 267-278 Hz from 134.85). A dip at 135.57-135.60, and "Ecstasy" enters at 135.62 (onset 3.2,
    # 359 Hz; syllable onsets 135.77, 136.00); "is" from 136.10. CTC started it on the ad-lib at 134.12 (the user saw it
    # underline "way too early").
    (33, 0): dict(start=135.62, end=136.09, conf=0.75),
    (33, 1): dict(start=136.10, conf=0.7),
    # L47 outro "Blowin'": 172.15-173.00 is the falling "oh" ad-lib (312 -> 207 Hz); "Blowin'" enters at 173.05 on
    # the 277 Hz note L45 starts on (165.69). Whisper: "Girl" (= Blowin') 173.06.
    (47, 0): dict(start=173.05, conf=0.7),
    # L47 outro: the bridge's melody (see L31) — "Blowin'" 277 -> 311 Hz, "money" from the step up to 351 Hz at
    # 174.10, through its 139 Hz tail to 174.85; "fast" the 209-230 Hz note 175.00-175.38 (the user, 2026-10-16, of
    # L31's: the highlight a full second early).
    (47, 1): dict(start=174.10, end=174.85, conf=0.6),
    (47, 2): dict(start=175.00, end=175.38, conf=0.6),
    # L47 outro "...we might crash" (the user confirmed the words), faint: after the high "mmm" (420 Hz, 175.45-176.20)
    # the lead's short phrase 176.30-176.62 (-50 dB, 174 -> 156 Hz, the bridge's "crash" contour), spaced as L31's.
    (47, 3): dict(start=176.30, end=176.40, conf=0.4),
    (47, 4): dict(start=176.40, end=176.50, conf=0.4),
    (47, 5): dict(start=176.50, end=176.62, conf=0.4),
    # L29 bridge "...fast, it won't last", sung as L31's "we might crash" (set by the user's ear): "it won't" on the
    # 415 Hz note after "fast" (122.99-123.42; it had been taken for an "oh" ad-lib), "last" the low phrase from 123.44
    # (277 -> 314 Hz, falling to 156) held over the 415 Hz note to 124.80. (The user, 2026-10-20: "it won't last is a
    # little bit delayed in its highlighting"; then "won't and last need to be delayed by like 1/4 of a second":
    # won't 123.48, last 123.69.)
    (29, 2): dict(end=122.85, conf=0.7),
    (29, 3): dict(start=122.99, end=123.47, conf=0.7),
    (29, 4): dict(start=123.48, end=123.68, conf=0.7),
    (29, 5): dict(start=123.69, conf=0.7),
    # L30 bridge "Tryna": after the "oh" ad-lib (420 Hz, 124.22-124.84) and a silence, the lead re-enters at 125.29
    # (onset 2.5, 282 Hz). Whisper: "make" 125.62.
    (30, 0): dict(start=125.29, conf=0.75),
    # L31 bridge "...fast, we might crash": "we might crash" 130.50-131.76 (below), then the "oh" ad-lib (415 Hz)
    # 131.80-132.25; L32 "Tryna" re-enters at 132.34 (onset 1.1, 272 Hz).
    # Its first half sings L29's melody — "Blow" 277 Hz, "in'" 311, "mon" 351, "ey" low, "fast" 209 — after a falling
    # "oh" ad-lib 127.15-128.05 (314 -> 207 Hz, as before L47's "Blowin'"). So "Blowin'" from 128.17 (277 Hz), "money"
    # from the step up to 351 Hz at 129.09 (CTC: 129.04) through its 138 Hz tail to 129.85, "fast" 129.99-130.38 (210
    # -> 230 Hz); the 415-470 Hz note after it is "we might" (below). (These were one note early, the ad-lib taken for
    # "Blowin'": the user, 2026-10-16, "money doesn't start till around 129".)
    (31, 0): dict(start=128.17, end=129.05, conf=0.7),
    (31, 1): dict(start=129.09, end=129.85, conf=0.7),
    (31, 2): dict(start=129.99, end=130.38, conf=0.7),
    # "we might crash" by the user's ear (2026-10-16: 130.47 We, 131.14 Might, 131.70 Crash; then, watching, "might" and
    # "crash" half a second earlier, then "might" a quarter later again): "we" on the high note after "fast" (entry
    # 130.50, 422 Hz), "might" from 130.89,
    # "crash" from 131.20 held over the 415 Hz note to its fall
    # before "Tryna" (132.25). (All three had been packed into 131.27-131.76, the high note taken for an ad-lib.)
    (31, 3): dict(start=130.47, end=130.88, conf=0.8),
    (31, 4): dict(start=130.89, end=131.19, conf=0.8),
    (31, 5): dict(start=131.20, end=132.25, conf=0.8),
    (32, 0): dict(start=132.34, conf=0.7),
    # L48, the song's last phrase, fades out at -51..-56 dB: two notes, 177.35-177.85 (310 Hz) and 178.05-178.55
    # (280-309 Hz), the stem at its floor from 178.60. Whisper: Tryna 177.10, make 177.56, it 177.86, last 178.10.
    (48, 0): dict(start=177.35, end=177.55, conf=0.5),
    (48, 1): dict(start=177.56, end=177.85, conf=0.5),
    (48, 2): dict(start=177.86, end=178.04, conf=0.5),
    (48, 3): dict(start=178.05, end=178.56, conf=0.5),
}

# ---------------------------------------------------------------------------


def load_feats():
    f = dict(np.load(common.WORK / "vocal_feats.npz"))
    f["hop"] = float(f.pop("hop_s"))
    return f


def activity(f, rel_db=22.0, abs_db=-48.0, win_s=1.5):
    """Vocal activity mask: RMS above an absolute floor and within rel_db of the
    local (±win) maximum."""
    from scipy.ndimage import maximum_filter1d, median_filter
    r = median_filter(f["rms_db"], 5)
    loc = maximum_filter1d(r, int(win_s / f["hop"]))
    return (r > abs_db) & (r > loc - rel_db), r


def runs(mask):
    """Return list of (start_idx, end_idx_exclusive) runs where mask is True."""
    m = np.concatenate([[False], mask, [False]]).astype(np.int8)
    d = np.diff(m)
    return list(zip(np.where(d == 1)[0], np.where(d == -1)[0]))


FRIC_START = re.compile(r"(s|sh|ch|z|f|th|j|c[eiy]|x|h)")
VOICED_TH = {"the", "there", "there's", "that", "that's", "they", "this", "then"}
FRIC_END = re.compile(r"(s|z|f|x|ce|se|ze|sh|ch)$")


def refine(words, f, fix=None):
    """Signal-based refinement of CTC boundaries, per sub-word unit (a word, or
    one spelled letter / syllable of an acronym like "ay gee eye").

    1. rest-onset : a rest (>=50 ms silence) precedes the unit and the voice
                    re-enters >40 ms before the first CTC char -> start there
                    (CTC fires late on held vowels, e.g. the opening "I").
    2. onset-snap : otherwise snap to the strongest vocal onset (spectral flux)
                    in a window just before the CTC start (legato word starts
                    with glottal/vowel onsets that CTC places late).
    3. fricative  : for s/sh/ch/z/f/th/j/h-initial units, CTC emits the consonant
                    at the END of the frication; move start back to where the
                    4-10 kHz noise begins.
    end: next unit's start when the voice continues (legato), else the moment
         the voice stops (RMS >15 dB below the word's level for >=60 ms).
    """
    from scipy.ndimage import uniform_filter1d
    from scipy.signal import find_peaks
    hop = f["hop"]
    act, r = activity(f, rel_db=27.0)
    n = len(r)
    sil = ~act
    sib = uniform_filter1d(f["sib_ratio"], 3)
    on = f["onset"]
    on_thr = 0.3 * np.percentile(on, 99)
    pk_idx, _ = find_peaks(on, height=on_thr, distance=int(0.04 / hop))
    units = []
    for k, w in enumerate(words):
        w["ctc_start"], w["ctc_end"] = w["start"], w["end"]
        w["ctc_subs"] = [tuple(x) for x in w["subs"]]
        for j, (a, b) in enumerate(w["subs"]):
            units.append(dict(k=k, j=j, text=pron(w["w"])[j], cs=a, ce=b, s=a, rule="ctc"))
    fix = fix or {}
    for u_i, u in enumerate(units):
        w = words[u["k"]]
        fx = fix.get((w["li"], w["ti"]))
        if fx is not None:
            starts = [fx.get("start")] + list(fx.get("syl", []))
            if u["j"] < len(starts) and starts[u["j"]] is not None:
                u["s"], u["rule"] = starts[u["j"]], "manual"
                continue
        pu = units[u_i - 1] if u_i else None
        prev_ce = pu["ce"] if pu else 0.0
        prev_cs = pu["cs"] if pu else 0.0
        s = u["cs"]
        # 1. rest-onset
        i0, i1 = int(prev_ce / hop), int(s / hop)
        done = False
        if i1 - i0 > int(0.05 / hop):
            rs = [(a, b) for a, b in runs(sil[i0:i1]) if (b - a) * hop >= 0.05]
            if rs:
                onset = (i0 + rs[-1][1]) * hop
                if s - onset > 0.04:
                    u["s"], u["rule"] = onset, "rest-onset"
                done = True
        # 2. onset snap
        if not done:
            vowel_init = u["text"][0] in "aeiou"
            lo = max(prev_ce - 0.06, prev_cs + 0.08, s - (0.25 if vowel_init else 0.12))
            hi = s + 0.04
            # ignore onsets that are followed by frication (they are the final
            # consonant cluster of the previous word, e.g. the "ks" of "sparks")
            cand = [p for p in pk_idx if lo <= p * hop <= hi
                    and np.median(sib[p:p + int(0.06 / hop)]) < -5]
            best, bsc = None, 0.0
            for p in cand:
                dt = s - p * hop
                wgt = 1.0 if dt < 0.06 else max(0.4, 1 - (dt - 0.06) / 0.4)
                if on[p] * wgt > bsc:
                    best, bsc = p, on[p] * wgt
            if best is not None:
                t = best * hop - 0.01
                if abs(t - s) > 0.02:
                    u["s"], u["rule"] = t, "onset-snap"
        # 3. fricative
        if FRIC_START.match(u["text"]) and u["text"] not in VOICED_TH:
            prev_fric_end = pu is not None and FRIC_END.search(pu["text"]) is not None
            lo_t = prev_ce + 0.02 if prev_fric_end else prev_ce - 0.10
            if pu is not None:
                lo_t = max(lo_t, pu["s"] + 0.10)
            lo = int(max(lo_t, s - 0.30, 0) / hop)
            a, b = max(int((s - 0.15) / hop), lo), int((s + 0.06) / hop)
            if b > a:
                pk = a + int(np.argmax(sib[a:b]))
                base = np.percentile(sib[max(0, lo - int(0.4 / hop)):lo + 1], 25) if lo > 0 else -40
                if sib[pk] >= base + 8:
                    thr = 0.5 * (base + sib[pk])
                    j = pk
                    while j - 1 >= lo and sib[j - 1] > thr:
                        j -= 1
                    if j * hop < u["s"] - 0.02:
                        u["s"], u["rule"] = j * hop, "fricative"
    # monotonic unit starts
    for u_i in range(1, len(units)):
        units[u_i]["s"] = max(units[u_i]["s"], units[u_i - 1]["s"] + 0.03)
    for k, w in enumerate(words):
        us = [u for u in units if u["k"] == k]
        w["start"] = us[0]["s"]
        w["start_rule"] = us[0]["rule"]
        w["unit_starts"] = [u["s"] for u in us]
    for k, w in enumerate(words):
        nxt = words[k + 1]["start"] if k + 1 < len(words) else len(r) * hop
        e = max(w["ctc_end"], w["start"] + 0.08)
        j0 = int(w["start"] / hop)
        j1 = int(e / hop)
        level = np.percentile(r[j0:max(j1, j0 + 1)], 90)
        jn = int(nxt / hop)
        low = r < level - 15.0
        q = None
        j = j1
        need = int(0.06 / hop)
        while j < min(jn, n - need):
            if low[j] and low[j:j + need].all():
                q = j * hop
                break
            j += 1
        end = min(q, nxt) if q is not None else nxt
        end = max(end, w["start"] + 0.04)
        if nxt - end < 0.03:
            end = nxt
        fx = fix.get((w["li"], w["ti"]))
        if fx is not None:
            w["manual"] = True
            if "end" in fx:
                end = fx["end"]
        w["end"] = end
        us = w["unit_starts"]
        w["subs"] = [(us[i], us[i + 1] if i + 1 < len(us) else end) for i in range(len(us))]
    return words


# (t0, t1, description) -- known non-lyric vocal regions, identified from the QA plots.
EXTRA_DESC = []


def detect_extras(words, f):
    """Vocal activity (vocal stem) not covered by any lyric word."""
    hop = f["hop"]
    r = median_filter_1d(f["rms_db"], 9)
    act = r > -36
    cover = np.zeros_like(act)
    for w in words:
        cover[int((w["start"] - 0.1) / hop):int((w["end"] + 0.1) / hop)] = True
    m = act & ~cover
    out = []
    for a, b in runs(m):
        if out and a * hop - out[-1][1] < 0.4:
            out[-1][1] = b * hop
        else:
            out.append([a * hop, b * hop])
    out = [x for x in out if x[1] - x[0] >= 0.5]
    ext = []
    for a, b in out:
        desc = next((d for (t0, t1, d) in EXTRA_DESC if a < t1 and b > t0), None)
        ext.append(dict(start=round(a, 2), end=round(b, 2),
                        desc=desc or "unlisted vocal (backing vocal / ad-lib / breath)"))
    # also list known extras that overlap lyric words (e.g. backing pads)
    for (t0, t1, d) in EXTRA_DESC:
        if not any(e["desc"] == d for e in ext):
            ext.append(dict(start=t0, end=t1, desc=d))
    ext.sort(key=lambda e: e["start"])
    return ext


def median_filter_1d(x, n):
    from scipy.ndimage import median_filter
    return median_filter(x, n)


def whisper_words():
    W = json.loads((common.WORK / "whisper_large_prompt.json").read_text())
    return [(w["word"].strip(), w["start"], w["end"]) for s in W["segments"] for w in s.get("words", [])]


def norm(t):
    return re.sub(r"[^a-z]", "", t.lower())


def map_whisper(words, ww):
    """Fuzzy sequence alignment of whisper words to lyric tokens."""
    a = [norm("".join(pron(w["w"]))) for w in words]
    b = [norm(x[0]) for x in ww]
    sm = SequenceMatcher(a=a, b=b, autojunk=False)
    m = {}
    for blk in sm.get_opcodes():
        tag, i1, i2, j1, j2 = blk
        if tag == "equal":
            for d in range(i2 - i1):
                m[i1 + d] = ww[j1 + d]
        elif tag == "replace" and (i2 - i1) == (j2 - j1):
            for d in range(i2 - i1):
                m[i1 + d] = ww[j1 + d]
    # replace blocks of unequal length: map by time proximity later (skip)
    for i, w in enumerate(words):
        x = m.get(i)
        # reject mapping if wildly off in time (fuzzy false matches)
        if x is not None and abs(x[1] - w["start"]) > 1.5:
            x = None
        w["whisper"] = None if x is None else (round(x[1], 3), round(x[2], 3))
    return words


def confidence(words, alt):
    for i, w in enumerate(words):
        ds = [abs(a[i]["start"] - w["ctc_start"]) for a in alt.values()]
        agree = np.mean([d <= 0.06 for d in ds])
        p = min(1.0, w["conf"] / 0.5)
        wh = w.get("whisper")
        wagree = 0.5 if wh is None else float(abs(wh[0] - w["start"]) <= 0.15)
        c = 0.35 + 0.3 * agree + 0.2 * p + 0.15 * wagree
        if w.get("manual"):
            fx = FIX.get((w["li"], w["ti"]), {})
            c = fx.get("conf", max(c, 0.8))
        if w.get("pushed"):
            c = min(c, 0.3)
        w["conf_final"] = round(float(np.clip(c, 0, 1)), 2)
    return words


def main(plots=False):
    lines_src, adlibs = common.load_lyrics()
    toks = [l["text"].split(" ") for l in lines_src]
    E = emissions(PRIMARY)
    sp, score, _, _ = align(E, toks, anchors=ANCHORS, line_windows=LINE_WINDOWS)
    words = word_table(sp, toks)
    alt = {}
    for k in ALTS:
        s2, _, _, _ = align(emissions(k), toks, anchors=ANCHORS, line_windows=LINE_WINDOWS)
        alt[k] = word_table(s2, toks)
    f = load_feats()
    words = refine(words, f, FIX)
    # enforce monotonic / non-overlap; a manual FIX end pushes the next word later.
    # Words pushed that way (and any they push in turn) no longer sit where the
    # acoustic evidence put them: flagged "pushed", confidence() caps them.
    for k in range(1, len(words)):
        p, w = words[k - 1], words[k]
        floor = p["start"] + 0.02
        by_fix = "end" in FIX.get((p["li"], p["ti"]), {})
        if by_fix:
            floor = max(floor, p["end"])
        if w["start"] < floor:
            if by_fix or p.get("pushed"):
                assert "start" not in FIX.get((w["li"], w["ti"]), {}), (w["li"], w["ti"])
                w["pushed"] = True
            w["start"] = floor
            w["end"] = max(w["end"], w["start"] + 0.04)
        if p["end"] > w["start"]:
            p["end"] = w["start"]
    for w in words:  # keep sub-word spans inside the (possibly moved) word bounds
        s = w["subs"]
        cl = lambda t: min(max(t, w["start"]), w["end"])
        w["subs"] = [(w["start"] if i == 0 else cl(a), w["end"] if i == len(s) - 1 else cl(b))
                     for i, (a, b) in enumerate(s)]
    words = map_whisper(words, whisper_words())
    words = confidence(words, alt)
    (common.WORK / "align_debug.json").write_text(json.dumps(dict(words=words, alt=alt), indent=1, default=float))

    lines = []
    for li, src in enumerate(lines_src):
        ws = [w for w in words if w["li"] == li]
        assert [w["w"] for w in ws] == src["text"].split(" ")
        out = []
        for w in ws:
            d = dict(w=w["w"], start=round(w["start"], 3), end=round(w["end"], 3), conf=w["conf_final"])
            if len(w["subs"]) > 1:
                d["syl"] = [[round(a, 3), round(b, 3)] for a, b in w["subs"]]
            out.append(d)
        lines.append(dict(i=li, text=src["text"], section=src["section"],
                          start=out[0]["start"], end=out[-1]["end"], words=out))
    doc = dict(lines=lines, adlibs=adlibs, extras=detect_extras(words, f), notes=NOTES)
    (common.DATA / "lyrics.json").write_text(json.dumps(doc, indent=2, ensure_ascii=False), encoding="utf-8")
    print("wrote", common.DATA / "lyrics.json", "score", score)
    low = [(l["i"], w["w"], float(w["start"]), float(w["conf"])) for l in lines for w in l["words"] if w["conf"] < 0.5]
    print(f"{len(low)} low-confidence words (conf < 0.5):", low)
    if plots:
        make_plots(words, alt, lines_src)
    return words, alt


def make_plots(words, alt, L):
    from qa_plot import plot
    ww = whisper_words()
    for li, src in enumerate(L):
        ws = [w for w in words if w["li"] == li]
        t0 = min(ws[0]["start"], ws[0]["ctc_start"]) - 0.8
        t1 = max(ws[-1]["end"], ws[-1]["ctc_end"]) + 0.6
        t1 = min(t1, t0 + 7)
        tracks = [
            ("final", [(w["w"], w["start"], w["end"]) for w in words]),
            ("fused-ctc", [(w["w"], w["ctc_start"], w["ctc_end"]) for w in words]),
            ("subwords", [(" ".join(pron(w["w"])).split()[i] if len(w["subs"]) > 1 else "", a, b)
                          for w in words for i, (a, b) in enumerate(w["subs"])]),
            ("mms", [(w["w"], w["start"], w["end"]) for w in alt["mms"]]),
            ("lv60k", [(w["w"], w["start"], w["end"]) for w in alt["lv60k"]]),
            ("whisper", ww),
        ]
        plot(t0, t1, tracks, common.QA / f"line_{li:02d}.png", title=f"L{li} [{src['section']}]: {src['text']}")


NOTES = (
    "Timeline = audio/song.wav (ffmpeg decode of the mp3); stems separated from the same file, "
    "zero offset. Method: CTC emissions (20 ms) of the Demucs vocal stem from torchaudio MMS_FA "
    "and wav2vec2-large-lv60k-960h on the mono sum and L/R channels, fused as a probability "
    "mixture; one global constrained Viterbi alignment of all lead lines with a garbage token "
    "between lines to absorb ad-libs (parenthesised lyrics, listed under 'adlibs'); signal "
    "refinement of word starts/ends on the vocal stem; cross-check against faster-whisper "
    "large-v3 word timestamps. conf: 0.35 + agreement of independent alignments + CTC posterior "
    "+ Whisper agreement. 'syl' = per-part timings of hyphenated tokens (ooh-oh)."
)

if __name__ == "__main__":
    main(plots="--plots" in sys.argv)
