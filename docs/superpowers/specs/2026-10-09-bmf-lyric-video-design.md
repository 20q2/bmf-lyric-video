# "BMF" — code-rendered lyric video: design

Date: 2026-10-09
Status: approved in brainstorming

A word-synced lyric video for SZA, "BMF" (*SOS Deluxe: Lana*, 2024), where every frame is a deterministic
function of song time. It is built on a fork of the engine from the "I Like Ur Look" video
(`A:\Coding\LyricVideo`, itself forked from mexicat/pdoom-video, MIT). The same code drives a live
browser preview and the final offline 1080p60 render.

## 1. Decisions

| Question | Decision |
|---|---|
| Scope | Full production: one world, a distinct set-piece per section, review rounds |
| World | **The Cruise**: one drive from golden hour to night, the lyrics set into the world it passes |
| Look | **Graphic 3D**: three.js world, flat posterised shading, designed sky palette; optional print-grain / mis-registration finishing pass |
| Camera | **Car as the hero**: chase cam around the car, with cuts to interior details (radio, mirror, dash, gear shift) |
| People | **Flat silhouettes** of the two of them in the car (him driving, her riding); never detailed faces |
| Explicit words | **Printed as sung** |
| Destination | YouTube, 16:9, 1920×1080 logical, 60 fps (4K via `--scale 2` if wanted) |
| Audio | `SZA - BMF (Lyrics).mp3` as supplied (192 kbps, 181.6 s), decoded once to `audio/song.wav`; all timing data is bound to that file |
| Lyrics | Genius text in `lyrics/lyrics.txt`; lines where Whisper hears something different (e.g. "this can be my man", "Compliment my energy", the chorus-2 "West side of Compton" line) are confirmed by the alignment and the user's ear in M1 |
| Engine | Fork the I Like Ur Look app (not Theatre.js, not upstream pdoom) |

## 2. Concept

The song is breezy bossa-nova pop: its hook interpolates "The Girl from Ipanema" ("the boy from South
Detroit came walking in"). It is flirty and cocky, it name-checks LA (West side of Compton, crip walkin',
Slauson), the title points at the *BMF* TV series and spells out "Blowin' Money Fast", and it ends in a
car: "Put it in drive… cruise all night".

So the video is that drive. He picks her up at a pink motel in the last of the sun and they cruise across
LA until it's night; the city around them carries the lyrics on its signs, plates, neon, receipts and
radio. The sky darkens continuously across the whole song.

## 3. The route

Times are the rough Whisper pass; in code every stretch is anchored to lyric lines, never to these numbers.

| # | Time | Section | Where | Lyrics live on… | Camera |
|---|---|---|---|---|---|
| 0 | 0:00–0:15 | Intro (guitar) | Parked outside a pink stucco motel, palms, low sun | The motel marquee: *BMF*, then the credit in changeable letters | Slow push in on the marquee; the headlights blink on with the first downbeat |
| 1 | 0:15–0:29 | Chorus 0 | Pulling out onto the boulevard | Billboards and storefront signs, one line each; "He's so fly, fly" on a plane's banner | Chase cam alongside; each billboard snaps into frame on its line |
| 2 | 0:30–1:00 | Verse 1 | City streets, stop-and-go: lights, crosswalks, gas station, drive-thru | Street furniture: a speed sign ("Going too fast"), a crosswalk signal, the drive-thru menu board, a gas-price sign, the receipt | Stop-start with the lights: snaps on the beat, holds at reds |
| 3 | 1:00–1:14 | Chorus 1 | The freeway on-ramp | Green freeway gantry signs (Compton, W Side), an overhead LED board | Rise above the car as it merges; the signs sweep overhead |
| 4 | 1:15–1:43 | Verse 2 | Off the freeway into the neighbourhood: Slauson exit, corner store, lowriders, car wash | The exit sign ("Took me to Slauson"), a walk signal whose figure crip-walks, a vanity plate ("Mr. Handle It"), murals, awnings | Low and close; the camera swings round the car at the corners |
| 5 | 1:43–1:58 | Chorus 2 | Coast road (the Ipanema nod): ocean, pier lights, palms | Beach-town signs, the pier arch, a lifeguard tower | Wide and sweeping, the car small against the sunset sea |
| 6 | 2:00–2:14 | Bridge | The coast road, speeding up | Banknotes flying out of the window with the words printed on them; "we might crash" on a swerving road sign | Behind the car in the storm of bills; bills tumble past the lens on the beat |
| 7 | 2:15–2:29 | Verse 3 | The Strip at night: neon, a club, a jungle tiki bar | One neon sign per line: a pill-shaped pharmacy sign, a TARZAN & JANE tiki marquee, a payphone ("call me up") | Each neon flickers on with its line; the camera tracks along the strip |
| 8 | 2:30–2:44 | Chorus 3 | Up into the hills: an overlook, city lights below | The dashboard: the gear shift (P R N **D**), the speedometer, the radio display "CRUISE ALL NIGHT" | Interior cuts, then pull back out over the city grid |
| 9 | 2:45–3:02 | Outro | Parked at the overlook | The city grid's lights spell the outro; the last bill floats down | A slow crane up and away; the taillights are the last thing lit |

**Recurring threads.** The **radio** (its dial and display show the hook; the bossa intro is literally on
the radio). **"He's so fly, fly"** always arrives on something in the air (plane banner, gulls at the
pier, a billboard flipping). The **silhouettes** are seen at the start, in each chorus and at the end.

## 4. Style rules

Carried over from the last video as checkable rules, not rediscovered in review:

- **Lyrics are set into the world**, never subtitles. Unsung words sit as a faint ghost and fill in word
  by word as they are sung (the reference's `wordProgress` karaoke), or the sign lights up on its word.
- **Type roles.** The lyric face is reserved for lyrics. Signs' own non-lyric copy (route numbers, store
  names, prices) uses the sign's real-world face and must not read as a lyric.
- **Every lyric is legible while sung**: in frame, in focus and at a minimum on-screen size (the
  `sung.test.ts` guard, extended to sign geometry).
- **Physical over fades.** Things arrive by driving into view, flipping, lighting, blowing in; nothing
  fades in or out.
- **In-world copy reads real.** Store names, prices, plates and small print look like the real thing,
  with a few quiet references (Detroit, Ipanema, Slauson); no puns that retell the song. No real brands.
- **Bounce with restraint.** The beat groove is calm while a lyric is sung and full in the gaps.

The palette, the car's model, the sign families and the finishing pass are chosen in M3 from side-by-side
options in the live preview.

## 5. Architecture

```
BMF/
  audio/song.wav               the single time reference (git-ignored, like the mp3)
  lyrics/lyrics.txt            [Section]-tagged lyrics; (parentheses) = backing vocals
  analysis/                    ported from the reference: Demucs stems, CTC alignment cross-checked with
                               Whisper, beats/downbeats/sections/stem energy, QA plots; plus a new
                               stretched-word check; reuses the reference's model cache and uv cache
  data/lyrics.json, audio.json committed outputs
  app/                         bun + Vite + three.js, forked from the reference app
    src/engine/                kept: engine loop, audio, lyrics, post, gl, type, stroke, util, scale
    src/drive/                 new: route (spline road + stretches), car + silhouettes, world kit
                               (buildings, palms, gantries, props), sky palette over time
    src/signs/                 new: one type/layout toolkit drawn to canvas textures, sign families
    src/stretches/             one module per stretch (§3): its props, signs and shots
    src/shots.ts               the shot director (kept): frame, cue (word/beat), move (snap/land/glide)
    scripts/render.ts          headless Edge -> ffmpeg (kept)
  docs/                        this spec, ENGINE.md (updated as batches merge), plans
  scripts/env.sh               tool paths for Git Bash (bun, ffmpeg, uv)
```

**Removed from the fork:** the magazine, pages, paper, lamp, lipstick, kiss, cut-outs and the spreads.

**Data flow.** song.wav + lyrics.txt → analysis → lyrics.json / audio.json → the app. Stretches find
their lyrics by content (`lyrics.get('Took me to Slauson')`); camera cues read words and beats.

## 6. Milestones

Each ends with the user's sign-off in the live preview.

| | What | Gate |
|---|---|---|
| **M1** | Timing: port the analysis; `lyrics.json` / `audio.json`; the stretched-word check (flags any word spanning a silence or running into a held note in the vocal stem); the karaoke test card; one listening pass with the user focused on word onsets | "Every word is on time" |
| **M2** | Engine fork and greybox of the whole drive: blocky road, car and signs, the route and shot director working, every lyric on a placeholder sign from start to finish; the test card rendered to a short MP4 once to prove A/V sync | The drive and pacing feel right |
| **M3** | The look, on stretches 0–2: car, silhouettes, palette, sky, sign families, finishing pass, motion sliders | The quality bar ("good enough") |
| **M4** | Stretches 3–9 in batches, then review rounds | Watch-through approved |
| **M5** | Final 1080p60 render, the only long render | — |

## 7. Review and verification

- **The live preview is the review tool.** A Vite dev server on port 5890 (`?t=` to jump, space to play,
  arrows to scrub, next/previous stretch, loop a stretch), plus sliders for motion feel (groove, camera
  kick, drive speed) whose chosen values are committed once.
- **Still sheets per stretch** at its cue times, self-reviewed before the user sees them ("can you read
  it? is anything off camera, blank or cheap?").
- **Guards:** `tsc`; every `lyrics.get` resolves; `sung.test.ts` (each lyric in frame, in focus and big
  enough while sung); determinism (the same `t` renders the same pixels within 2 levels).
- **Performance:** under 25 ms/frame at 1080p in the preview on the RTX 3060 Ti, measured with GPU-heavy
  games closed.

## 8. Process

- Subagents only for independent stretches once the pattern is set: two or three at a time, Sonnet for
  routine work, one review each focused on what shows on screen, review-round fixes done directly.
- Check a plan's numbers (framings, cue times) against the director's limits before building.
- Keep ENGINE.md and the route table current as each batch merges.

## 9. Risks

- **Alignment.** The hook's bossa phrasing and stacked backing vocals ("Oh-woah", "Mmm") will partly
  defeat forced alignment; budget a correction pass. The automatic stretched-word check exists for this.
- **A 3D world for 3 minutes.** Ten distinct places is a lot of modelling. The world kit is procedural and
  reused across stretches (a building, a palm, a sign post, a gantry), and each stretch is mostly signs
  and props on that kit.
- **Readability at speed.** Signs flying past are hard to read; the shot director holds or matches speed
  on each sung sign, and the guard enforces it.
- **Copyright.** The song and lyrics belong to their rights holders; the audio stays local and git-ignored.
  A public upload will likely be Content ID-claimed.
