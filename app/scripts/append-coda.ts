#!/usr/bin/env bun
// Joins the coda (render.ts video --coda: its picture and its slowed song already faded in and out) onto the end of the
// video, after its end card, without re-encoding either: the two concatenated stream for stream. Both must come from
// render.ts's own encoder (same size, rate, codecs, the same song's sample rate): it checks.
//   bun scripts/append-coda.ts [--video ../out/bmf_m6.mp4] [--coda ../out/bmf_coda.mp4] [--out ../out/bmf_m6_coda.mp4]
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const argv = process.argv.slice(2);
const opt = (k: string, d: string) => { const i = argv.lastIndexOf(`--${k}`); return i >= 0 ? argv[i + 1]! : d; };
const ROOT = path.resolve(import.meta.dir, '../..');
const VIDEO = path.resolve(opt('video', path.join(ROOT, 'out/bmf_m6.mp4')));
const CLIP = path.resolve(opt('coda', path.join(ROOT, 'out/bmf_coda.mp4')));
const OUT = path.resolve(opt('out', path.join(ROOT, 'out/bmf_m6_coda.mp4')));

async function run(cmd: string[]) {
  const p = Bun.spawn(cmd, { stdout: 'pipe', stderr: 'pipe' });
  const [out, err, code] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited]);
  if (code !== 0) throw new Error(`${cmd[0]} failed (${code}):\n${err}`);
  return out;
}
/** Each stream's codec, size, pixel format, frame rate, sample rate and channels, and the file's length. */
async function probe(f: string) {
  const j = JSON.parse(await run(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type,codec_name,profile,width,height,pix_fmt,r_frame_rate,sample_rate,channels:format=duration', '-of', 'json', f]));
  const v = j.streams.find((s: any) => s.codec_type === 'video'), a = j.streams.find((s: any) => s.codec_type === 'audio');
  return { video: v && [v.codec_name, v.profile, v.width, v.height, v.pix_fmt, v.r_frame_rate].join(' '), audio: a && [a.codec_name, a.sample_rate, a.channels].join(' '), duration: +j.format.duration };
}

const [main, clip] = [await probe(VIDEO), await probe(CLIP)];
if (main.video !== clip.video) throw new Error(`the coda's video (${clip.video}) doesn't match the video's (${main.video}): render it with the same render.ts settings`);
if (!clip.audio) throw new Error('the coda has no audio (rendered with --noaudio?)');
if (main.audio !== clip.audio) throw new Error(`the coda's audio (${clip.audio}) doesn't match the video's (${main.audio})`);
const tmp = mkdtempSync(path.join(tmpdir(), 'coda-'));
try {
  const d = clip.duration, list = path.join(tmp, 'list.txt');
  writeFileSync(list, [VIDEO, CLIP].map((f) => `file '${f.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`).join('\n'));
  await run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', OUT]);
  const done = await probe(OUT);
  console.log(`wrote ${OUT}: ${main.duration.toFixed(2)} s + ${d.toFixed(2)} s coda = ${done.duration.toFixed(2)} s`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
