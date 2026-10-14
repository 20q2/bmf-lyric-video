# M5d: the style breaks and the sync layer (plan)

Date: 2026-10-13. Branch `m5`. Builds M5 spec §4 (the six breaks) and §5 (the sync layer), after M5a–c.

## The breaks

`drive/breaks.ts` (pure): `breaksOf(audio, lyrics)` finds each break's moment from the words and the drums, as a
list of `Break { id, kind, at, len, size, word }`; `BREAKS_ON` turns each kind off in one line. `breakAt(breaks, t)`
gives the active break and its progress k (0..1); `worldTime(breaks, t)` remaps song time for the world: the comic
panel freezes it, the rewind scrubs it back. The skywriter's `LOOP` moves here (the comic freeze lands at the loop's
top, `LOOP_TOP`).

| Break | Lands on | Length | Treatment (look/breaks.ts, a pass after the print) |
|---|---|---|---|
| plates | the drums' first kick (0:15.6) | 1 beat | the R, G and B plates pulled apart, slamming back into register |
| slip | each "dropping" (sizes 1, 1.5, 2) | 1 beat | the frame drops with a torn edge, paper above, lands with a bounce (the car's squat) |
| comic | each hook's second "fly", at its loop's top | 1 beat | the world frozen; a panel border, a burst and speed lines over it |
| rewind | "backwards" (1:41) | 1 beat | the world scrubbed back 0.5 s; VHS bands, a tracking bar, the REW glyph |
| xerox | "crash" in the tunnel (2:11.5) | 0.6 beat | one-bit xerox strips juddering (the lyric's glow stays white: legible) |
| launch | "drive" (2:38.8) | 1 beat | a radial zoom smear, radial speed lines, a camera punch (the centre clear: the words) |

`BreaksPass` runs between the print pass and the engine's post when a break is active (the print renders to an
intermediate target then). Overlays are canvases drawn once per kind. Everything is a function of t (judder seeded
by the frame).

## The sync layer

`drive/heft.ts` (pure): `heftOf(drive)`: one dial through the song, per stretch (verses low, choruses high, chorus 4
highest), eased across stretch boundaries, ducked while a long line is being read (its reading window; the drive
exposes `reading`). The scene scales with it: the kick punch-in and a small frame jolt, the car's bounce on the kick
(on top of the hydraulics), and the lights' pulse with the bass (a `PULSE` uniform the lamps and glows read; hats
twinkle the bulbs at night).

## Checks

tests/breaks.test.ts: every break lands on its word (its `at` is the word's start, or the loop's top for comic);
breaks never overlap; the heft dial is low under long lines; `worldTime` is the identity outside breaks.

Cuts on the beat (spec §5) is reported, not enforced, for now: most cuts are pinned to words by design.
