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


def pitch(spans, dur=3.0):
    """An f0 track (Hz, 5 ms hop): NaN (unvoiced) except each (t0, t1, hz) span."""
    f = np.full(int(dur / HOP), np.nan)
    for a, b, hz in spans:
        f[int(a / HOP):int(b / HOP)] = hz
    return f


def test_a_start_on_the_same_held_note_is_held():
    assert held_start(track([(0.5, 2.0)]), HOP, 1.2, pitch([(0.5, 2.0, 440.0)]))


def test_a_legato_change_of_note_is_not_held():
    f0 = pitch([(0.5, 1.2, 440.0), (1.2, 2.0, 494.0)])  # a whole tone up at the start
    assert not held_start(track([(0.5, 2.0)]), HOP, 1.2, f0)


def test_an_unvoiced_start_is_not_held():
    f0 = pitch([(0.5, 1.15, 440.0), (1.25, 2.0, 440.0)])  # a consonant: no pitch around the start
    assert not held_start(track([(0.5, 2.0)]), HOP, 1.2, f0)
