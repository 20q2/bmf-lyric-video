// The player: the site (GitHub Pages) and the preview are one page. It plays the video in real time and lets the
// viewer leave the video's camera: fly about the drive while it plays, or circle the car (explore/cameras.ts); the
// video's camera then stands in the world (explore/rig.ts), and an inset can keep showing what it sees.
// The song is never bundled (vite.config.ts): the preview plays audio/song.wav from the repo; the site asks for the
// viewer's own copy (or plays without sound, on the wall clock).
import * as THREE from 'three';
import type { Engine } from './engine/engine';
import { resolveStretches } from './drive/stretches';
import { placeCamera } from './drive/camera';
import { FlyCam, OrbitCam, type Move } from './explore/cameras';
import { VIEW, type Eye } from './explore/view';
import { jump, partAt, partLoop } from './review';
import { CODA, CODA_ON } from './explore/coda';

type Mode = 'video' | 'free' | 'orbit';
const MODES: Mode[] = ['video', 'free', 'orbit'];
/** The repo's copy of the song (served in the preview only). */
const LOCAL_SONG = 'audio/song.wav';
/** A chosen song this far off the video's length (s) is probably another cut of it: say so. */
const LENGTH_SLACK = 1.5;
/** Drag this far (px) before a press counts as a drag rather than a click. */
const DRAG = 5;

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const store = {
  get(k: string) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* no storage */ } },
};

/** Song time: the audio's clock while there's a song (its coarse steps smoothed with performance.now), else the wall's. */
class SongClock {
  t = 0;
  playing = false;
  audio: HTMLAudioElement | null = null;
  private lastAudioT = -1;
  private lastPerf = 0;
  private wall = 0;
  constructor(private duration: number) {}

  use(a: HTMLAudioElement) {
    this.audio?.pause();
    this.audio = a;
    a.currentTime = this.t;
    this.lastAudioT = -1;
    if (this.playing) a.play().catch(() => this.pause());
  }
  seek(x: number) {
    this.t = Math.max(0, Math.min(this.duration - 0.001, x));
    if (this.audio) this.audio.currentTime = this.t;
    this.lastAudioT = -1;
    this.wall = performance.now();
  }
  play() {
    if (this.t >= this.duration - 0.01) this.seek(0);
    this.playing = true;
    this.wall = performance.now();
    if (this.audio) { this.audio.currentTime = this.t; this.lastAudioT = -1; this.audio.play().catch(() => this.pause()); }
  }
  pause() { this.playing = false; this.audio?.pause(); }
  /** The song time now; false once the song has ended. */
  tick() {
    if (!this.playing) return;
    const now = performance.now(), a = this.audio;
    if (a) {
      if (a.currentTime !== this.lastAudioT) { this.lastAudioT = a.currentTime; this.lastPerf = now; }
      this.t = Math.min(this.duration - 0.001, this.lastAudioT + (a.paused ? 0 : (now - this.lastPerf) / 1000));
      if (a.ended) this.playing = false;
    } else {
      this.t += (now - this.wall) / 1000;
      this.wall = now;
      if (this.t >= this.duration - 0.001) { this.t = this.duration - 0.001; this.playing = false; }
    }
  }
}

export function setupPlayer(engine: Engine, canvas: HTMLCanvasElement, from: number | null) {
  const params = new URLSearchParams(location.search);
  const DEBUG = import.meta.env.DEV || params.has('debug');
  const D = engine.duration;
  const song = new SongClock(D);
  const ui = $('ui'), scrub = $<HTMLInputElement>('scrub'), info = $('info'), marks = $('marks'), errs = $('errs');
  const playBtn = $('play'), timeEl = $('time'), intro = $('intro'), help = $('help'), toastEl = $('toast');
  const pip = $<HTMLCanvasElement>('pip'), pipCtx = pip.getContext('2d')!;
  scrub.max = String(D);
  scrub.step = '0.001';
  if (engine.errors.length) { errs.textContent = engine.errors.join('\n\n'); errs.style.display = 'block'; }
  if (!DEBUG) info.style.display = 'none';

  let toastTimer = 0;
  const toast = (msg: string, ms = 1600) => {
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toastTimer); toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), ms);
  };

  // ------------------------------------------------------------ the song
  // the volume, remembered in this browser; the slider hands the keyboard back once set (the arrows seek again)
  const volume = $<HTMLInputElement>('volume');
  { const v = parseFloat(store.get('lv.volume') ?? ''); if (v >= 0 && v <= 1) volume.value = String(v); }
  volume.oninput = () => { if (song.audio) song.audio.volume = parseFloat(volume.value); store.set('lv.volume', volume.value); };
  volume.onchange = () => volume.blur();
  const useAudio = (src: string) => {
    const a = new Audio(src);
    a.preload = 'auto';
    a.volume = parseFloat(volume.value);
    song.use(a);
    return a;
  };
  const picker = document.createElement('input');
  picker.type = 'file';
  picker.accept = 'audio/*,.mp3,.m4a,.aac,.wav,.ogg,.opus,.flac';
  let objectUrl = '';
  const useFile = (f: File) => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(f);
    const a = useAudio(objectUrl);
    a.addEventListener('loadedmetadata', () => {
      const off = a.duration - D;
      toast(Math.abs(off) > LENGTH_SLACK ? `${f.name} is ${clock(a.duration)}, the video's song ${clock(D)}: it may drift out of sync` : `playing along with ${f.name}`);
    }, { once: true });
    a.addEventListener('error', () => { toast(`couldn't play ${f.name} in this browser`); song.audio = null; }, { once: true });
    $('song').title = `playing along with ${f.name} (click to choose another)`;
    start();
  };
  picker.onchange = () => { const f = picker.files?.[0]; if (f) useFile(f); picker.value = ''; };
  $('song').onclick = () => picker.click();
  // a song dropped anywhere on the page
  window.addEventListener('dragover', (e) => { e.preventDefault(); document.body.classList.add('dropping'); });
  window.addEventListener('dragleave', (e) => { if (!e.relatedTarget) document.body.classList.remove('dropping'); });
  window.addEventListener('drop', (e) => {
    e.preventDefault(); document.body.classList.remove('dropping');
    const f = [...(e.dataTransfer?.files ?? [])].find((x) => x.type.startsWith('audio/') || /\.(mp3|m4a|aac|wav|ogg|opus|flac)$/i.test(x.name));
    if (f) useFile(f); else toast('drop an audio file (the song)');
  });
  // the intro (the controls, over the loading spinner): Play once the world's built; away at once in the preview, where
  // the repo's copy of the song plays
  const start = () => { intro.classList.add('gone'); song.play(); };
  const go = $<HTMLButtonElement>('go');
  go.onclick = start;
  go.disabled = false;
  go.textContent = 'Play ▶';
  document.body.classList.add('ready');
  fetch(LOCAL_SONG, { method: 'HEAD' }).then((r) => {
    if (!r.ok || !(r.headers.get('content-type') ?? '').startsWith('audio')) return;
    useAudio(LOCAL_SONG);
    $('song').style.display = 'none';
    intro.classList.add('gone');
  }).catch(() => { /* the site: no song of its own */ });

  // ------------------------------------------------------------ the timeline
  // the marks strip and the jump keys follow the drive's stretches (drive/stretches.ts)
  const parts = resolveStretches(engine.audio, engine.lyrics).map((s) => ({ id: s.id, start: s.start, end: s.end }));
  const starts = parts.map((p) => p.start);
  for (const p of parts) {
    const m = document.createElement('div');
    m.className = 'mark';
    m.style.left = `${(p.start / D) * 100}%`;
    m.style.width = `${((p.end - p.start) / D) * 100}%`;
    m.title = `${p.id} ${clock(p.start)}–${clock(p.end)}`;
    m.textContent = p.id;
    m.onclick = () => song.seek(p.start);
    marks.appendChild(m);
  }
  let loop: [number, number] | null = null;
  // (?coda=1 plays the coda: from its start, its crane the video's camera, explore/coda.ts)
  song.seek(from ?? (CODA_ON ? CODA.from : 0));
  const toggle = () => { if (song.playing) song.pause(); else { intro.classList.add('gone'); song.play(); } };
  playBtn.onclick = toggle;
  // (a clicked button gives the keyboard back: space would press it again as well as play/pause)
  document.addEventListener('click', (e) => { if ((e.target as HTMLElement).tagName === 'BUTTON') (e.target as HTMLElement).blur(); });
  scrub.oninput = () => song.seek(parseFloat(scrub.value));
  scrub.onchange = () => scrub.blur();

  // ------------------------------------------------------------ the cameras
  let mode: Mode = 'video';
  const fly = new FlyCam(), orbit = new OrbitCam();
  // (free of the car unless asked: the user, 2026-10-25, "let me fly free of the car"; a new key, so a remembered
  // follow from before doesn't stick)
  fly.follow = store.get('lv.followCar') === '1';
  let pipOn = store.get('lv.pip') === '1';
  const scratch = new THREE.PerspectiveCamera();
  /** Where the view is at song time t in the current mode. */
  const videoEye = (t: number): Eye => { placeCamera(scratch, VIEW.videoAt!(t)); return { pos: scratch.position.clone(), quat: scratch.quaternion.clone(), fov: scratch.fov }; };
  const eyeNow = (t: number): Eye => mode === 'free' ? fly.eye() : mode === 'orbit' ? orbit.eye(VIEW.carAt!(t)) : videoEye(t);
  const modeBtns = [...document.querySelectorAll<HTMLButtonElement>('[data-mode]')];
  const followBtn = $('follow'), pipBtn = $('pipbtn'), lightBtn = $('light'), reachBtn = $('reach');
  // the draw distance while flying or circling (the user, 2026-10-25: a frame's CPU is the walk of the whole world; past
  // it, still parts are left out); remembered
  const REACHES = [Infinity, 600, 250];
  { const r = Number(store.get('lv.reach')); if (REACHES.includes(r)) VIEW.reach = r; }
  // the lighting: Full (the video's: printed cast shadows) or Fast (none: each shadow map was another walk of the whole
  // world a frame — the user, 2026-10-25, "it's pretty laggy"); remembered in this browser
  VIEW.fast = store.get('lv.fast') === '1';
  const syncButtons = () => {
    for (const b of modeBtns) b.classList.toggle('on', b.dataset.mode === mode);
    followBtn.classList.toggle('on', fly.follow);
    followBtn.style.display = mode === 'free' ? '' : 'none';
    pipBtn.classList.toggle('on', pipOn);
    lightBtn.textContent = `Lighting: ${VIEW.fast ? 'Fast' : 'Full'}`;
    reachBtn.textContent = `Draw: ${VIEW.reach === Infinity ? 'Full' : `${VIEW.reach} m`}`;
    reachBtn.style.display = mode === 'video' ? 'none' : '';
    pipBtn.style.display = mode === 'video' ? 'none' : '';
    document.body.classList.toggle('flying', mode !== 'video');
    document.body.classList.toggle('pip', pipOn);
  };
  const setMode = (m: Mode) => {
    if (m === mode || !VIEW.videoAt) return;
    const t = song.t, was = eyeNow(t);
    if (m === 'free') fly.from(was);
    if (m === 'orbit') orbit.from(was, VIEW.carAt!(t));
    mode = m;
    syncButtons();
    toast(m === 'video' ? 'the video’s camera' : m === 'free' ? `flying${fly.follow ? ', keeping pace with the car' : ''}` : 'circling the car');
  };
  for (const b of modeBtns) b.onclick = () => { setMode(b.dataset.mode as Mode); b.blur(); };
  followBtn.onclick = () => { fly.follow = !fly.follow; store.set('lv.followCar', fly.follow ? '1' : '0'); syncButtons(); followBtn.blur(); toast(fly.follow ? 'keeping pace with the car' : 'staying put in the world'); };
  pipBtn.onclick = () => { pipOn = !pipOn; store.set('lv.pip', pipOn ? '1' : '0'); syncButtons(); pipBtn.blur(); };
  pip.onclick = () => setMode('video');
  reachBtn.onclick = () => {
    VIEW.reach = REACHES[(REACHES.indexOf(VIEW.reach) + 1) % REACHES.length]!;
    store.set('lv.reach', String(VIEW.reach));
    syncButtons();
    toast(VIEW.reach === Infinity ? 'drawing all of it' : `drawing ${VIEW.reach} m out`);
  };
  lightBtn.onclick = () => { VIEW.fast = !VIEW.fast; store.set('lv.fast', VIEW.fast ? '1' : '0'); syncButtons(); toast(VIEW.fast ? 'Fast lighting: no shadows' : 'Full lighting: the video’s shadows'); };
  syncButtons();

  // dragging looks round (from the video's camera it takes you flying); a press that doesn't move is play/pause;
  // two fingers pinch (flying: forward/back; orbit: closer/further)
  const down = new Map<number, { x: number; y: number }>();
  let dragged = false, pinch = 0;
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    down.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (down.size === 1) dragged = false;
    if (down.size === 2) { const [a, b] = [...down.values()]; pinch = Math.hypot(a!.x - b!.x, a!.y - b!.y); dragged = true; }
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = down.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    if (down.size === 2) {
      p.x = e.clientX; p.y = e.clientY;
      const [a, b] = [...down.values()], d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      if (mode === 'orbit') orbit.zoom((pinch - d) / 40);
      else { if (mode === 'video') setMode('free'); fly.pos.addScaledVector(new THREE.Vector3(0, 0, -1).applyQuaternion(fly.eye().quat), (d - pinch) * 0.05 * Math.sqrt(fly.speed)); }
      pinch = d;
      return;
    }
    if (!dragged && Math.hypot(dx, dy) < DRAG) return;
    if (!dragged) { dragged = true; document.body.classList.add('dragging'); if (mode === 'video') setMode('free'); }
    p.x = e.clientX; p.y = e.clientY;
    // (the view turns the way the hand goes — drag right, look right; drag up, look up — in both modes: flying dragged
    // the world instead, "reversed vertically" and then "horizontally too", the user, 2026-10-25. Scaled by the
    // canvas's on-screen size)
    const k = 1920 / canvas.getBoundingClientRect().width;
    if (mode === 'orbit') orbit.look(dx * k, dy * k); else fly.look(dx * k, dy * k);
  });
  const up = (e: PointerEvent) => {
    if (!down.delete(e.pointerId)) return;
    if (down.size === 0) { document.body.classList.remove('dragging'); if (!dragged && e.type === 'pointerup') toggle(); }
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const n = Math.sign(e.deltaY) * Math.min(3, Math.abs(e.deltaY) / 100 || 1);
    if (mode === 'orbit') orbit.zoom(n);
    else if (mode === 'free') { fly.faster(-n); toast(`flying at ${Math.round(fly.speed)} m/s`); }
  }, { passive: false });

  // ------------------------------------------------------------ keys
  const held = new Set<string>();
  const FLY_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE'];
  /** Flying, Space rises and Ctrl sinks (the user's ask, 2026-10-25; play/pause is then K or a click). */
  const CTRL = ['ControlLeft', 'ControlRight'];
  const openHelp = (on: boolean) => help.classList.toggle('open', on);
  $('helpbtn').onclick = () => openHelp(true);
  $('helpclose').onclick = () => openHelp(false);
  help.onclick = (e) => { if (e.target === help) openHelp(false); };
  $('full').onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.().catch(() => {}); };
  window.addEventListener('keydown', (ev) => {
    if ((ev.target as HTMLElement)?.tagName === 'INPUT' && (ev.target as HTMLInputElement).type !== 'range') return;
    // (Ctrl held down to sink, the fly keys still steer: Ctrl+W, +S, +A, +D are flying here, not the browser's — what
    // a page can't stop, Ctrl+W closing the tab, asks first: beforeunload, below)
    if (CTRL.includes(ev.code)) { if (mode === 'free') held.add(ev.code); return; }
    if (FLY_KEYS.includes(ev.code) && !ev.metaKey && !ev.altKey) {
      ev.preventDefault();
      held.add(ev.code);
      if (mode === 'video') setMode('free');
      return;
    }
    if (ev.ctrlKey || ev.metaKey) return;
    if (ev.key === '?' || (ev.key === 'Escape' && help.classList.contains('open'))) { openHelp(!help.classList.contains('open')); return; }
    if (ev.code === 'Space' && mode === 'free') { ev.preventDefault(); held.add('Space'); (document.activeElement as HTMLElement | null)?.blur?.(); return; }
    if (ev.key === 'k') toggle();
    if (ev.code === 'ShiftLeft' || ev.code === 'ShiftRight' || ev.code === 'AltLeft' || ev.code === 'AltRight') { held.add(ev.code); if (ev.key === 'Alt') ev.preventDefault(); }
    if (ev.key === ' ') { ev.preventDefault(); toggle(); (document.activeElement as HTMLElement | null)?.blur?.(); }
    if (ev.key === 'PageDown' || ev.key === 'PageUp') {
      ev.preventDefault();
      const to = jump(starts, song.t, ev.key === 'PageDown' ? 1 : -1);
      if (to !== undefined) song.seek(to);
    }
    if (ev.key === 'ArrowRight') { ev.preventDefault(); song.seek(song.t + (ev.shiftKey ? 5 : 1)); }
    if (ev.key === 'ArrowLeft') { ev.preventDefault(); song.seek(song.t - (ev.shiftKey ? 5 : 1)); }
    if (ev.key === '.') song.seek(song.t + 1 / 60);
    if (ev.key === ',') song.seek(song.t - 1 / 60);
    if (ev.key === 'l' && starts.length) { loop = loop ? null : partLoop(starts, song.t, D); toast(loop ? `looping ${parts[partAt(starts, song.t)]!.id}` : 'loop off'); }
    if (ev.key === 'h') ui.classList.toggle('hidden');
    if (ev.key === '1' || ev.key === '2' || ev.key === '3') setMode(MODES[+ev.key - 1]!);
    if (ev.key === 'c') setMode(MODES[(MODES.indexOf(mode) + 1) % MODES.length]!);
    if (ev.key === 'f') followBtn.click();
    if (ev.key === 'p') pipBtn.click();
    if (ev.key === 'g') lightBtn.click();
    if (ev.key === 'r') reachBtn.click();
    if (ev.key === 'v' && mode !== 'video') { fly.from(videoEye(song.t)); if (mode === 'orbit') { mode = 'free'; syncButtons(); } toast('at the video’s camera'); }
  });
  window.addEventListener('keyup', (ev) => held.delete(ev.code));
  window.addEventListener('beforeunload', (e) => { if (CTRL.some((c) => held.has(c))) e.preventDefault(); });
  window.addEventListener('blur', () => held.clear());

  // ------------------------------------------------------------ the frame
  let slow = 0, hinted = false;
  /** The floor under the flying camera, and where it was looked up from. */
  let under: { at: THREE.Vector3; floor: number | null } | null = null;
  // (?debug, and the preview: what a frame costs — the render's own time on the CPU, what it drew, the floor look-up)
  let floorMs = 0, renderMs = 0;
  if (DEBUG) engine.renderer.info.autoReset = false;
  let frames = 0, fpsT = performance.now(), fps = 0, lastReal = performance.now(), lastT = song.t, n = 0;
  const tick = () => {
    const now = performance.now(), realDt = Math.min(0.1, (now - lastReal) / 1000);
    lastReal = now;
    song.tick();
    // the last part's loop runs to the song's end, which the song reaches first: wrap there too, and play on
    if (loop && (song.t >= loop[1] || (song.audio?.ended ?? false) || (!song.playing && song.t >= D - 0.01))) { song.seek(loop[0]); song.play(); }
    const t = song.t;
    if (mode === 'free') {
      const k = (a: string, b: string) => (held.has(a) ? 1 : 0) - (held.has(b) ? 1 : 0);
      const move: Move = { x: k('KeyD', 'KeyA'), y: (held.has('KeyE') || held.has('Space') ? 1 : 0) - (held.has('KeyQ') || CTRL.some((c) => held.has(c)) ? 1 : 0), z: k('KeyW', 'KeyS'), boost: held.has('ShiftLeft') || held.has('ShiftRight'), creep: held.has('AltLeft') || held.has('AltRight') };
      const carried = VIEW.carAt!(t).pos.clone().sub(VIEW.carAt!(lastT).pos);
      // (onto whatever's under it, never through: looked for down from where it was or is, whichever's higher, so a roof
      // or a sign over the street isn't under it)
      // (looked up again only once it's moved a metre or two, or up or down past what it was looked up from: a look-up
      // walks the whole world, ~2 ms; between them the last one holds)
      const was = fly.pos.clone();
      fly.step(realDt, move, carried);
      const from = new THREE.Vector3(fly.pos.x, Math.max(was.y, fly.pos.y) + 0.05, fly.pos.z);
      if (!under || Math.hypot(from.x - under.at.x, from.z - under.at.z) > 1.5 || Math.abs(from.y - under.at.y) > 3) {
        const f0 = performance.now();
        under = { at: from, floor: VIEW.floorAt?.(from) ?? null };
        floorMs = performance.now() - f0;
      }
      if (under.floor != null) fly.floor(under.floor);
    }
    lastT = t;
    // the inset: the video as its camera sees it, every other frame (each costs a whole second render)
    if (pipOn && mode !== 'video' && n++ % 2 === 0) {
      VIEW.eye = null;
      engine.render(t, 1 / 60);
      pipCtx.drawImage(canvas, 0, 0, pip.width, pip.height);
    }
    VIEW.eye = mode === 'video' ? null : eyeNow(t);
    const r0 = performance.now();
    engine.render(t, 1 / 60);
    renderMs = performance.now() - r0;
    scrub.value = String(t);
    playBtn.textContent = song.playing ? '❚❚' : '▶';
    timeEl.textContent = `${clock(t)} / ${clock(D)}`;
    frames++;
    if (now - fpsT > 500) {
      fps = (frames * 1000) / (now - fpsT); frames = 0; fpsT = now;
      // (struggling with the full lighting, playing a while: say once that there's a lighter one)
      slow = song.playing && !VIEW.fast && fps < 28 ? slow + 1 : 0;
      if (slow >= 12 && !hinted) { hinted = true; toast('Laggy? Lighting: Fast (G) drops the shadows', 6000); }
    }
    if (DEBUG) {
      const l = engine.lyrics.lineAt(t), at = parts.length ? ` ▸${parts[partAt(starts, t)]!.id}` : '';
      const ri = engine.renderer.info.render;
      info.textContent = `${t.toFixed(2)}s  ${fps.toFixed(0)}fps  cpu ${renderMs.toFixed(1)}ms  ${(ri.calls / 1000).toFixed(1)}k draws  ${(ri.triangles / 1e6).toFixed(1)}M tris  floor ${floorMs.toFixed(1)}ms${VIEW.fast ? '  FAST' : ''}${at}   beat ${engine.audio.beatAt(t).toFixed(2)}  bar ${engine.audio.barAt(t).toFixed(2)}  ${l ? '“' + l.text + '”' : ''}${loop ? '  LOOP' : ''}`;
      engine.renderer.info.reset();
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
