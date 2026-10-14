# M5c: the stranger test's fixes (plan)

Date: 2026-10-13. Branch `m5`. Follows the M5 spec (§3, the world kit's deferred street items) and the user's ask:
"stranger test and make large fidelity improvements across the music video".

## The test

Four reviewers, each shown two contact sheets of the film (one frame every 2 s, 0–180 s), asked what a first-time
viewer would see as cheap, unfinished or wrong, ranked by how much of the frame it fills and for how long. Their lists
agreed. Merged and ranked:

1. **Empty ground beside the road.** Flat fills with nothing on them through about half the film: no kerb or gutter
   outside the town, no parked cars, no poles, hydrants, bins, meters or benches.
2. **Shadows too faint.** Under the low sun the ground gets little direct light, so cast shadows barely show: poles,
   the car and the bus seem to hover; the scenes read as props on a mat.
3. **The car's interior.** About 15 s of full-frame placeholder dash (0:34–0:48, 1:00, 2:40): flat planes, a thin
   ring for a wheel, a screen on a stick, a glowing stick for a lever.
4. **Verse 3's neon on blank slabs**, the neighbouring buildings windowless boxes.
5. **Back-row buildings** in the wide shots: stamped windows, bare flat roofs, no parapets or wall ads.
6. **The tunnel**: a tiled test room with a black half; its entrance a flat slab.
7. Smaller: clouds as blurry smears in a print world; the phone shot (no bezel, no hand); the chicken spot's flat
   wall; the coast's flat ground; palms as starbursts; the billboard catwalk cutting DROPPIN.

Kept (the reviewers' "already good"): the signs' type and colour, the Impala, the sun and rays, the halftone, the
marquee bulbs, the sky-banners, the silhouettes.

## The batches

Each batch is one commit, judged on full-frame before/after sheets at playback size (memory: bold-visible-changes).

- **A. The street.** Printed shadows (the sun's shadow mask darkens the whole surface to a flat tone, not just its
  direct light, so a low sun throws long, hard shadows); edge lines on every road outside the town; parked cars on the
  left kerb through the town (as `Block`s with `car`, so the guard sees them); kerb furniture on the sidewalks
  (hydrants, meters, bins, newspaper boxes, benches), instanced.
- **B. The cabin.** A '64 dash: the long horizontal speedo strip under a chrome bezel, vents, the glovebox line, the
  head unit set into the dash, a proper wheel with spokes and a horn ring, the lever with a chrome knob (no bloom),
  A-pillars and a rear-view mirror.
- **C. Verse 3's walls.** The neon boards become building end walls: stucco grain, a cornice, a raceway under the
  tubes, the neon's wash on the wall; the neighbours get windows.
- **D. The wide town.** Back rows: parapets, rooftop clutter, a few painted wall ads, varied window proportions.
- **E. The tunnel.** A kerb walkway band, fixture housings with pools on the road, grime streaks; a concrete portal
  face with a chamfered mouth and warning bands.
- **F. The rest.** Hard-edged printed clouds; the phone's bezel and a thumb; the chicken spot's wall; the coast's
  shoulder; palm fronds that droop.

Not in this plan: traffic and pedestrians (time-dependent: the guard would have to check them per frame), the breaks
and the sync layer (M5 §4–5, next).

## Built (2026-10-13)

All six batches, one commit each (fb7d829, 9feb731, 2fe1336, 997e51e, f820a5b, 7e036c2). Found on the way: the
Impala's chrome spear ran down the middle of the cabin (the hull's side is nothing along the cockpit), the bright
post under the head unit in every in-car shot. Left out: the palms (the fronds already arch; their leaflets read as
spikes only at the corner), the phone's hand (it has one: the cast's dark on the cabin's dark; the cabin's new
colours lift it). The "DROPPIN" cut at 0:26 is the board's flip reveal in progress, not the catwalk.
