# What makes a good lyric video — and what it means for BMF

Research notes, 2026-10-10. Sources at the end. Each tenet says where BMF stands and what to do.

## 1. Readability comes first

The words must read against moving, busy backgrounds, and on a phone (where thin strokes vanish and compression
smears them). Professionals use contrast tools — blur or darken what's behind, glows, drop shadows, background
plates — and avoid ornate faces at small sizes.

- **BMF now:** the guard checks every phrase is in frame, faces the camera, reads upright left to right and is at
  least 36 px tall. Sky-writing on the bright sunset is low-contrast (white on pale orange); the Bodoni signs' hairlines
  thin out when small.
- **Do:** raise the size floor to ~48 px (≈4.5% of frame height, phone-sized subtitle territory); port the reference
  project's contrast checker (4.5:1 floor) in M3 and give sky-writing a contrast aid (a darker patch of sky, a soft
  shadow, or clouds behind the words); keep lyric faces sturdy where small.

## 2. Give the eye time to read

Subtitle standards (the closest measured evidence): about 0.3 s per word (BBC), at least ⅚ s on screen, at most
~17–20 characters per second (Netflix). Text that appears and is cut away in under a second is not read.

- **BMF now:** many verse phrases last 0.5–0.9 s, and the camera cuts to the next phrase's carrier on its cue, so some
  phrases are on screen for less than ⅚ s.
- **Do:** a dwell rule in the guard — each phrase readable for at least max(⅚ s, 0.3 s × words), counting time before
  it's sung (road paint and walls are visible ahead) and after; in fast passages, frame several phrases together
  (a run of walls or paint seen at once) instead of cutting phrase by phrase.

## 3. Keep text in the title-safe area

Text belongs inside the central 90% of the frame, clear of edges that phones and players crop or cover.

- **BMF now:** the guard allows corners 1.5% from the edge.
- **Do:** tighten the guard's margin to title-safe (5% each side).

## 4. One voice, with hierarchy

Professional lyric videos use one or two typefaces in varied weights, and give a powerful word a bigger, heavier
treatment.

- **BMF now:** the greybox mixes Bodoni (signs, sky) and Archivo (paint, walls) as placeholders.
- **Do (M3):** pick the type system with the user — at most two families across all surfaces — and mark hero words
  ("fly", "handsome", "ransom", "crash", "drive") for a bigger, heavier set.

## 5. Timing is everything

Text that lands even a fraction of a second off the beat feels wrong; align entrances with the music's transients.

- **BMF now:** strong — word timing signed off by ear (M1), camera moves start on word cues and land on the beat grid.
- **Do:** keep it; let carriers' own motion (a sign flipping, paint stamping, sky letters puffing out) hit word onsets.

## 6. Motion should mean something

The movement should reinforce the meaning and rhythm of the words, not decorate them (NPR's example: words sliding out
of each other and flipping like pop-up cut-outs, timed to the song's pulse).

- **BMF now:** the world carries the meaning (paint, sky, walls); the motion is mostly the camera.
- **Do (M4):** tie a few moments to their words — "crash" swerves, "Put it in drive" on the gear shift, bills blowing
  on "Blowin' money fast", "fly" in the sky (done).

## 7. It's its own art form

Scholarship treats lyric videos as a genre of their own: they amplify the song's meaning and express the artist's
persona, rather than standing in for a music video.

- **BMF now:** the concept (the cruise, the song's own places and references) is exactly this.

## Sources

- [NPR — More Than Words: The Art of the Lyric Video](https://www.npr.org/2012/02/29/147637692/more-than-words-the-art-of-the-lyric-video)
- [McLaren, *The Lyric Video as Genre* (University of Ottawa thesis)](https://ruor.uottawa.ca/items/cbbc0707-f0ff-4be9-bb90-8ae9f631c013)
- [Subtitle reading speeds and durations (Limecraft, on Netflix and BBC standards)](https://support.limecraft.com/support/solutions/articles/48001249679)
- [Netflix Timed Text Style Guide (Supplementals)](https://backlothelp.netflix.com/hc/en-us/articles/115000239632-Timed-Text-Style-Guide-Supplementals-Marketing-Assets)
- General typography and kinetic-type tips (lower-quality, consistent with the above): [font for lyrics video](https://sandbox.dss.ucdavis.edu/font-for-lyrics-video), [kinetic typography video](https://carat.im/en/prompt-gallery/kinetic-typography-video)
