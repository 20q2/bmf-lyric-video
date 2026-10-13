# BMF — M5: fidelity, style breaks and sync heft (design)

Date: 2026-10-13
Status: approved in brainstorming, part by part; the written spec awaits the user's review
Branch: `m5` (from `m3` at 851121d; the draft stays as it is there)

The user, 2026-10-13: the draft is "in a state that I'm comfortable moving on", and the next step is to "take this out
of the kind of blocky draft state and significantly increase the graphical fidelity", and to "introduce more chunky
moments and stylistic options", to "give the video and the song and its sync some heft". This is the beautifying pass
promised at the 35% alignment (2026-10-11). The flow, the set-pieces and the lyric placements are settled; M5 changes
how the film looks and how hard it hits, not what goes where.

## 1. Decisions

| Question | Decision |
|---|---|
| How style varies | **One elevated look, plus signature style breaks**: the world stays coherent; the big moments punch out of it for a beat or a bar, cut on the music (not a look per section; not one uniform look) |
| The base look | **Hybrid: a printed world, a lit hero.** The world stays the screen print (flat three-tone toon, ink, halftone, misregistration); the car, the light sources and the night streets get real light |
| The first breaks | Six: the kick (plates split), "dropping" (the print slips), "fly" (the comic panel), "backwards" (the rewind), "crash" (the xerox smash), "Put it in drive" (the launch). Three in reserve: "crip walkin'" on twos, "say my name" marquee flood, "Cruise all night" poster freeze |
| Sync heft | **Graduated**: one intensity dial through the song, verses restrained, choruses punchy, chorus 4 hardest; breaks always the loudest |
| Order of work | **Hero slice first**: the first 31 s (intro and chorus 1) built to final quality and signed off in the player; then the kit rolls across the film; then the remaining breaks |
| Unchanged | The lyric faces and their reading rules, the set-pieces' placements and takes, the people as flat silhouettes, the '64 Impala in red, the review loop in the live player |

Look evidence: the same four frames rendered print / lit / comic with a throwaway switch (not committed), in
`.superpowers/brainstorm/919610-1791874862/content/` (`look-*.png`). The lit mock lost the graphic character; that's why
the lighting is kept to the hero things.

## 2. The look

The world keeps `look/toon.ts` and `look/print.ts` as its base. On top:

- **The car is the hero.** Candy-apple clearcoat paint and chrome (physical materials) reflecting the actual sky of that
  moment in the film: gold at sunset, violet at dusk, the city's lights at night. The environment is captured from the
  sky dome (and, at night, the city's lights) into a prefiltered map, refreshed as the sky changes. The print pass
  skips halftone and shadow tint on hero surfaces but keeps their ink outline: a hero mask written alongside the colour
  (a second render target, or the stencil) tells it which pixels are hero.
- **Light glows.** Neon, sign bulbs, headlights, tail lights and streetlights get a soft halo, as in damp night air,
  under the existing bloom: a screen-space glow from the emissive pixels, not real volumetrics.
- **Wet streets at night.** From dusk, every light source drops a long, stretched streak onto the asphalt. It's the
  poster painter's rain-slick reflection, drawn as quads from the lights' positions, not screen-space reflections:
  cheap, deterministic and on-style. Lights already in the model (streetlights, sign bulbs, neon carriers, the car's
  lamps) feed it.
- **Sky and air.** The banded sky dome gains printed cloud layers and, at golden hour, sun rays; distance haze graded
  per section; soft contact shadows (a darkening under objects, printed as halftone) so nothing floats.

Lyric faces are untouched: their materials, colours and the guard's checks stay as they are.

## 3. The world kit

Everything generates from the plans the guard already checks: a block's footprint (blocks.ts) stays the box the guard
tests; the kit fills it with detail that never sticks out past it toward the road.

- **Buildings.** Each block becomes an LA facade instead of a box with a window grid:
  - a ground-floor storefront (glass, door, awning, a sign band in the signs' face, F.sign);
  - upper floors with framed windows and sills, a cornice or parapet, rooftop clutter;
  - a mix of types, seeded per block: two-storey stucco commercial, mid-century apartment blocks, art-deco corners,
    and low houses with lawns in the neighbourhood (verse 2).
  The night-window shader carries over to the new windows.
- **Palms.** Tall, gently curved, segmented trunks with frond crowns (cards with cut-out fronds), the LA silhouette,
  instanced.
- **The street.**
  - Kerbs and sidewalks instead of flat verges.
  - Lane paint, manholes, patched asphalt (printed texture).
  - Power poles with sagging wires (generalising today's).
  - Cobra-head streetlights, bus benches, hydrants, newspaper boxes.
  - A few parked cars and some passing traffic in the far lane.
  - Flat-silhouette pedestrians, matching the two of them.
  Furniture keeps out of the takes' sightlines: the guard's occluders gain the furniture it places (poles, parked cars),
  as they did for blocks.
- **The Impala.** A proper '64 body (lofted panels, not an extruded profile), chrome trim, wire-spoke lowrider wheels,
  a real interior (bench seats, dash with the existing gauges and head unit, steering wheel). The body stays within
  `CAR_BOX`, the cabin within `CABIN`, so the guard's occlusion model holds. The silhouettes stay flat.
- **Set-piece props.** The barbershop, the liquor store, the chicken spot, the car wash, the bus, the van and the rest
  are upgraded with the same kit as their sections come up.

## 4. The style breaks

A break is a small, self-contained effect pinned to its word's timing (or its hit's), composed from up to three tools:

- **Time control.** The world rendered at a remapped time while the song plays on: a freeze holds a frame ("fly"), a
  scrub runs it back ("backwards"). The renderer is a pure function of t, so this is a remap of the scene's t, not a
  captured frame: deterministic in export.
- **A screen treatment.** A full-screen pass after the print pass: CMYK plate separation (the kick), a slipped sheet
  with a torn edge (dropping), one-bit xerox strips (crash), a radial zoom smear (drive).
- **Graphics on top.** Drawn overlays: the comic panel's border and halftone burst, speed lines (along the plane's loop;
  radial for the launch), the rewind glyph and VHS tracking bands.

| Break | When | Tools | Length |
|---|---|---|---|
| The kick: plates split | 0:15.6, the green | treatment: CMYK separation slamming back into register | 1 beat |
| "dropping": the print slips | each chorus's "dropping" | treatment: the frame drops with a torn edge, lands with the car's squat; bigger each chorus | ~1 beat |
| "fly": the comic panel | the second "fly", each chorus | freeze at the loop's top; overlay: panel border, halftone burst, speed lines | 1 beat, whip out |
| "backwards": the rewind | 1:41 | scrub back 0.5 s; overlay: VHS bands, rewind glyph | ~1 beat |
| "crash": the xerox smash | 2:10, the tunnel | treatment: one-bit xerox strips juddering, over the built crash event | a few frames to 1 beat |
| "Put it in drive": the launch | 2:38 | treatment: radial zoom smear; overlay: radial speed lines; a camera punch | 1 beat |

Rules:

- **No break hides a lyric being read.** The word it lands on stays legible through it. The guard checks the remapped
  frame for any phrase being read (treatments that wreck legibility, such as the xerox, keep the lyric's pixels out of
  the effect, or last under a readable threshold).
- A break lasts a beat to a bar, then cuts hard back into the world.
- Every break is one entry in a list (`BREAKS`): off in one line, so the user can keep or cut each after review.

## 5. The sync layer

One intensity dial, `heft(t)`: low in the verses, high in the choruses, highest in chorus 4, its own settings in the
bridge and the outro. Everything below scales with it, driven by the song's analysed features in `data/audio.json`
(drums, bass, high, onsets, beats, downbeats at 100 fps):

- **Kick punches.** A short camera push-in and a small frame jolt on each kick (onsets in the drum stem): barely there
  in the verses, strong in the choruses. Generalises today's kick punch.
- **The car rides the bass.** The 808 hits bounce the Impala on its hydraulics (hydraulics.ts), on top of the dances
  already built.
- **Lights pulse.** Neon, sign bulbs and streetlights breathe with the bass; at night the bulbs twinkle on the
  hi-hats.
- **Cuts land on the beat.** A cut not pinned to a word snaps to the nearest downbeat or half-beat (most already do;
  it becomes a rule the guard checks).

The breaks sit above all of it. The dial ducks toward zero while a long line is being read, so the frame never shakes
under words.

## 6. The hero slice

0:00–0:31: the intro corner (the street behind, the motel, the liquor store), the barbershop take, and chorus 1's
boulevard (the road paint, his campaign's pink boards, the sky-writing, the first skywriter loop). It gets:

- the look (§2), all of it;
- the kit (§3): buildings, palms, street furniture and the new Impala;
- the kick, "dropping" and "fly" breaks;
- the sync layer through it.

It's reviewed in the live player and signed off by the user before the rollout. The sign-off fixes the bar: later
sections are measured against it.

## 7. Rollout and finish

1. Hero slice (§6), review, sign-off.
2. The kit across the rest, section by section in film order, with a review after each: verse 1, chorus 2, verse 2,
   chorus 3, the bridge, verse 3, chorus 4, the outro.
3. The remaining breaks: "backwards", "crash", "drive". Then the reserve three only if the user wants them after seeing
   the six.
4. The final render (M6).

Every step is its own commit on `m5`.

## 8. Checks and cost

- **The guard stays green**, with three new checks:
  - every break lands on its word;
  - no break hides a lyric being read;
  - the heft dial is low under long lines.
  Plus the kit's furniture as occluders (§3).
- **Preview speed.** Richer geometry, the hero environment map and the glow passes will slow the live player. A
  preview-quality switch (fewer samples, a smaller shadow map, a cheaper environment refresh) keeps it responsive; the
  final render runs at full quality.
- **Determinism.** Everything stays a pure function of song time: no simulation state, seeded randomness only.

## 9. Not in M5

- Changing what goes where (placements, takes, cuts) beyond what a break or the beat rule requires.
- Faces or detailed people.
- New lyric medium types.
- The reserve breaks, unless the user asks after the first six.

## 10. Risks

- **The hybrid's seam.** A lit car in a printed world can look pasted on. The hero keeps the print's ink outline and
  the sky's palette in its reflections so it belongs; the hero slice is where this gets judged.
- **Busy frames behind the lyrics.** More detail competes with the words. The kit keeps detail in the mid-ground,
  away from the faces; the lyric faces keep their contrast.
- **Render time.** Higher fidelity multiplies frame cost; the export's adaptive sampling should absorb it, and a
  rough time per minute of film is measured on the hero slice.
