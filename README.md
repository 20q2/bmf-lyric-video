# BMF — a lyric video, rendered live

A code-rendered lyric video for SZA's "BMF": one drive through the city from golden hour to night, the words written
into the world as they're sung (three.js, rendered in the browser).

**The site** (GitHub Pages) plays the video in real time. You can watch it through the video's camera, fly anywhere
around the drive while it plays, or circle the car. The song isn't hosted: choose your own copy and it plays in sync,
or watch without sound.

- Run it locally: `cd app && bun install && bun run dev` → http://localhost:5990/
- Build the site: `bun run build` (→ `app/dist`), or `bun run preview` to view the build
- Deploy: `.github/workflows/pages.yml` publishes on every push to `main` (Settings → Pages → Source: GitHub Actions)
- Re-render the video: `bun run render:video` (→ `out/bmf.mp4`; needs the song as `audio/song.wav` and ffmpeg)

Details (the timing data, the drive, the render's options): [docs/ENGINE.md](docs/ENGINE.md).
