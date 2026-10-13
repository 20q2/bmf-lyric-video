// Where each phrase is written in the world (its "carrier"), and how the camera finds it. Every lyric line takes one
// kind of carrier from its stretch's pattern (the "fly" lines always the sky), and each of its phrases gets its own:
//   road   painted on the asphalt just past where the car is when the phrase ends, written to be read from ahead: the
//          camera holds high in front of the words looking back, the car drives toward it, down the screen, up to them
//          (never over them while they're sung), and each next phrase lies further on: lower on screen, read top-down
//   sky    written in the sky ahead as it's sung, then dissolving (carrierart.ts); the camera sits low behind the
//          car and looks up at it
//   left   on the road's left, facing it: a mural on a building's wall, a billboard on posts, a shop's fascia, neon on
//          a dark wall (the Strip at night); from across the road the camera looks left, so the car drives left to
//          right on screen. Two phrases share a building, one over the other (read top-down, then on to the next
//          building, on the right): a slow verse's run keeps up with the car. Any two share a frame (pairFraming)
//   sign   a short roadside board on the right; `street` a green street-name blade; the camera snaps to it
//   gantry a green freeway sign over the road; the camera snaps to it
//   banner towed across the sky by a plane flying left to right, the plane leading, so the words read the way it
//          flies; a line's banners in formation, one over the next, keeping pace ahead of the car; framed like
//          sky-writing, the camera following them as they move (Carrier.vel)
//   hill   giant white capitals standing on a hillside across the valley, as LA signs its hills (the last chorus's
//          payoff, "Cruise all night"), framed from behind the climbing car, lit at night
//   tunnel lit up along a tunnel's left wall (the bridge, tunnel.ts), framed from across the bore like the left faces
// A set-piece (sets/) places the lines it owns (a stretch's, or some of them) on its own surfaces (SetKind: a speed
// trailer, the bus ahead's tail ad, the van ahead's stickers, her phone, the radio, a burger stand's boards, murals…)
// and frames them itself; placeCarriers skips them.
// Each phrase's text is blank until the camera first comes for it (`reveal`, set by makeDrive): the world ahead
// shows its signs and walls, never the song beyond the next phrase.
// Placement and text layout (rows and type size, in metres) are pure, so the guards can check legibility under bun;
// the scene draws the faces to match (carrierart.ts). A carrier's text runs along `along` = up x normal, upright along `up`.
import * as THREE from 'three';
import { OBB } from 'three/addons/math/OBB.js';
import { hash } from '../engine/util';
import { LENS, type Pose, fitSign, linePose } from './camera';
import type { Motion } from './motion';
import type { Phrase } from './phrases';
import { SETTLE, type Solo, dwellFor, phrasesOf } from './phrases';
import type { Route, RouteFrame } from './route';
import type { Stretch } from './stretches';
import type { Line } from '../engine/lyrics';
import { TUNNEL, TUNNEL_CLEAR, type Tunnel, nearTunnel } from './tunnel';
import { AD, ADVERTISED, type Ad, TEXT_SHARE, adFor } from './ads';

export type LeftKind = 'billboard' | 'storefront' | 'neon';
/** The set-pieces' surfaces (sets/). */
export type SetKind = 'barber' | 'speed' | 'bus' | 'mirror' | 'sticker' | 'plate' | 'phone' | 'radio' | 'menu' | 'marquee' | 'poster' | 'freeway' | 'polesign' | 'aframe' | 'window' | 'vinyl' | 'roofsign' | 'carwash' | 'visor' | 'hood' | 'giant' | 'arch' | 'tunnelsign';
export type Kind = 'road' | 'sky' | 'banner' | LeftKind | 'sign' | 'street' | 'gantry' | 'tunnel' | 'hill' | SetKind;
export const KINDS: readonly Kind[] = ['road', 'sky', 'banner', 'billboard', 'storefront', 'neon', 'sign', 'street', 'gantry', 'tunnel', 'hill',
  'barber', 'speed', 'bus', 'mirror', 'sticker', 'plate', 'phone', 'radio', 'menu', 'marquee', 'poster', 'freeway', 'polesign', 'aframe', 'window', 'vinyl', 'roofsign', 'carwash', 'visor', 'hood', 'giant', 'arch', 'tunnelsign'];
/** The set-pieces' kinds (world.ts draws just their faces: their props stand round them). */
export const SET_KINDS: ReadonlySet<Kind> = new Set<SetKind>(['barber', 'speed', 'bus', 'mirror', 'sticker', 'plate', 'phone', 'radio', 'menu', 'marquee', 'poster', 'freeway', 'polesign', 'aframe', 'window', 'vinyl', 'roofsign', 'carwash', 'visor', 'hood', 'giant', 'arch', 'tunnelsign']);
/** Kinds two phrases can share a frame on (pairFraming): the faces on the road's left, side by side. (Paint on a moving
 *  road lies too far on, and two sky phrases too far apart, for a frame that holds both at a readable size: measured,
 *  tests/sung.test.ts.) */
export const PAIRABLE: ReadonlySet<Kind> = new Set<LeftKind>(['billboard', 'storefront', 'neon']);

export interface Carrier {
  id: string;
  phrase: Phrase;
  kind: Kind;
  stretch: string;
  /** When its text first shows (s): the start of the first shot that frames it (makeDrive; until then, its first
   *  word's start). */
  reveal: number;
  /** Where along the road it stands (m). */
  s: number;
  center: THREE.Vector3;
  /** The face's outward normal and its text's up (unit, orthogonal). */
  normal: THREE.Vector3;
  up: THREE.Vector3;
  w: number;
  h: number;
  rows: string[];
  em: number;
  /** How high its centre stands over the ground (m). */
  foot: number;
  /** Its solid part in its own frame (basisOf): a board's backing, or the building it's on; null where it has none of
   *  its own (road paint, sky-writing, the lower of two faces stacked on one building). */
  solid: { at: THREE.Vector3; size: THREE.Vector3 } | null;
  /** On the left, two phrases share a building, one over the other: which this is (none: alone). */
  stack?: 'top' | 'bottom';
  /** Where its shots aim, from its centre (m): the middle of its stack (two faces on a building) or its formation (a
   *  line's banners), so the shot holds them all, read top-down. */
  aim?: THREE.Vector3;
  /** A carrier that moves (a towed banner): its velocity (m/s); `center` is where it is as its phrase starts. */
  vel?: THREE.Vector3;
  /** Sky-writing held whole (not dissolving) until then (s): a line written as one. */
  hold?: number;
  /** The last line's: shot low behind the parked car, its tail lights, the writing over it (the end). */
  finale?: boolean;
  /** A billboard: the product its ad sells (ads.ts); its lyric is the headline. */
  ad?: Ad;
  /** Riding in the car (the radio, her phone), or on a vehicle `ahead` m in front of it in its lane (the bus, the van
   *  they follow): where it is in that frame (x its left, y up from the road, z forward); `center`, `normal` and `up`
   *  are where it is as its phrase starts (rideAt). */
  ride?: { pos: THREE.Vector3; normal: THREE.Vector3; up: THREE.Vector3; ahead?: number };
  /** Not there before `from`, gone from `until` (s): its prop comes and goes (the van closing in, the bus turning off,
   *  her phone in her hand). */
  from?: number;
  until?: number;
}

/** The car's frame as a matrix: x its left, y up, z forward, at its position on the road. */
export const carMatrix = (f: RouteFrame) => new THREE.Matrix4().makeBasis(f.right.clone().negate(), f.up, f.fwd).setPosition(f.pos);
/** Where a riding carrier is when the car's frame is f. */
export function rideAt(c: Carrier, f: RouteFrame): Pick<Carrier, 'center' | 'normal' | 'up'> {
  const m = carMatrix(f), n = new THREE.Matrix3().setFromMatrix4(m);
  return { center: c.ride!.pos.clone().applyMatrix4(m), normal: c.ride!.normal.clone().applyMatrix3(n).normalize(), up: c.ride!.up.clone().applyMatrix3(n).normalize() };
}
/** Where a carrier's centre is at t (a new vector: callers may change it). */
export const centerAt = (c: Pick<Carrier, 'center' | 'vel' | 'phrase'>, t: number) => (c.vel ? c.center.clone().addScaledVector(c.vel, t - c.phrase.start) : c.center.clone());

/** Each stretch's carriers, line by line (cycled); a line with "fly" in it is always written in the sky. */
export const PATTERNS: Record<string, readonly Kind[]> = {
  intro: ['sign'],
  chorus1: ['road', 'road', 'billboard', 'sky', 'street'],
  chorus2: ['gantry', 'gantry', 'road', 'sky'],
  chorus3: ['sign', 'banner', 'sign', 'sky'], // (its own look: chorus 1 has the road paint; its set owns the arch's line)
  bridge1: ['tunnel'],
  // (verse3 has no pattern: its set-piece owns every line, sets/verse3.ts)
  chorus4: ['road', 'gantry', 'sky', 'hill'], // (its set owns the campaign's line — his biggest board, on the hillside — and the drive insert's)
  // (the outro has no pattern: no lines are shown past AUDIBLE — the end is the scene's own)
};
/** A fast line moves to the road's left (so it can pair); which face it takes there, cycled line by line. */
export const FAST_LEFT: Record<string, readonly LeftKind[]> = {};

/** Per kind: a row's height and the face's width (m), and the face's type: its average advance per character (a share
 *  of the em) and the share of a row the em may take. */
export const LAYOUT: Record<Kind, { rowH: number; w: number; advance: number; emOfRow: number; wrap?: number }> = {
  road: { rowH: 3.4, w: 7.8, advance: 0.62, emOfRow: 0.7, wrap: 8 }, // (wide: the road's own width, less a hand's either side; stacked like a road marking's SLOW over DOWN, its letters big: the take sees it from high)
  sky: { rowH: 9, w: 40, advance: 0.55, emOfRow: 0.72 },
  banner: { rowH: 5, w: 34, advance: 0.6, emOfRow: 0.72 },
  billboard: { rowH: 2.6, w: 17, advance: 0.52, emOfRow: 0.72 },
  storefront: { rowH: 2.3, w: 14, advance: 0.62, emOfRow: 0.68 },
  neon: { rowH: 2.4, w: 11, advance: 0.42, emOfRow: 0.7 },
  sign: { rowH: 1.3, w: 5.4, advance: 0.42, emOfRow: 0.55 }, // (Bodoni's descenders stay inside the board's border)
  street: { rowH: 1, w: 5.2, advance: 0.55, emOfRow: 0.66 },
  gantry: { rowH: 2, w: 9.5, advance: 0.55, emOfRow: 0.62 },
  tunnel: { rowH: 2, w: 10, advance: 0.62, emOfRow: 0.7 },
  hill: { rowH: 13, w: 120, advance: 0.62, emOfRow: 0.82 },
  // (the set-pieces' surfaces, each phrase its own panel's rows: `wrap` the longest row it holds)
  barber: { rowH: 1, w: 5.6, advance: 0.6, emOfRow: 0.7, wrap: 10 },
  speed: { rowH: 0.4, w: 1.8, advance: 0.6, emOfRow: 0.66, wrap: 15 },
  bus: { rowH: 0.36, w: 2.4, advance: 0.55, emOfRow: 0.72, wrap: 17 },
  mirror: { rowH: 0.068, w: 0.32, advance: 0.5, emOfRow: 0.72, wrap: 18 },
  sticker: { rowH: 0.26, w: 1.6, advance: 0.55, emOfRow: 0.66, wrap: 16 },
  plate: { rowH: 0.3, w: 0.62, advance: 0.6, emOfRow: 0.62, wrap: 10 },
  phone: { rowH: 0.042, w: 0.18, advance: 0.55, emOfRow: 0.62, wrap: 16 },
  radio: { rowH: 0.05, w: 0.42, advance: 0.6, emOfRow: 0.66, wrap: 28 },
  menu: { rowH: 0.34, w: 2.6, advance: 0.5, emOfRow: 0.7, wrap: 24 },
  marquee: { rowH: 0.6, w: 3.6, advance: 0.58, emOfRow: 0.7, wrap: 18 },
  poster: { rowH: 1.3, w: 10, advance: 0.52, emOfRow: 0.72 },
  freeway: { rowH: 1.4, w: 6, advance: 0.55, emOfRow: 0.62, wrap: 10 },
  // (the chicken spot's: its pole sign's lightbox, chalk A-frames, its painted windows, the vinyl banner under its eaves,
  // the big sign on its roof)
  polesign: { rowH: 0.95, w: 5.2, advance: 0.6, emOfRow: 0.68, wrap: 15 },
  aframe: { rowH: 0.5, w: 2.5, advance: 0.6, emOfRow: 0.68, wrap: 9 },
  window: { rowH: 0.8, w: 5.4, advance: 0.6, emOfRow: 0.68, wrap: 14 },
  vinyl: { rowH: 0.62, w: 10, advance: 0.6, emOfRow: 0.7, wrap: 30 },
  roofsign: { rowH: 1.1, w: 10.5, advance: 0.6, emOfRow: 0.68, wrap: 22 },
  // (the car wash's ad: the words on its left, the suds on its right: the prop's)
  carwash: { rowH: 0.5, w: 3.4, advance: 0.55, emOfRow: 0.7, wrap: 14 },
  visor: { rowH: 0.26, w: 1.7, advance: 0.6, emOfRow: 0.72, wrap: 16 },
  hood: { rowH: 0.38, w: 1.6, advance: 0.6, emOfRow: 0.7, wrap: 12 },
  giant: { rowH: 2.8, w: 13.6, advance: 0.55, emOfRow: 0.72, wrap: 20 },
  // (the beach town's welcome arch over the coast road: its lettering band, a phrase a row; the face fits between
  // the pylons, so no letter stands behind one)
  arch: { rowH: 2.3, w: 19.5, advance: 0.55, emOfRow: 0.78, wrap: 20 },
  // (a lit overhead sign hung in the tunnel's bore, read down it: the bridge's "Tryna make it last" lines)
  tunnelsign: { rowH: 0.8, w: 7, advance: 0.55, emOfRow: 0.7, wrap: 20 },
};
/** The hooks: "He's so fly, fly" written bigger each chorus (scale per chorus), "Cruise all night" a giant banner. */
export const FLY = /\bso fly\b/i, CRUISE = /^cruise all night/i, CAMPAIGN = /young and (he )?fine/i;
export const HOOK = { campaign: [1, 1.25, 1.5], fly: [1.15, 1.6, 2.05], recede: 0.12, rise: 9, lift: 10, cruise: 1.7, gap: 1, bannerIn: 'chorus2' };
/** Kinds set in capitals. */
export const CAPS: ReadonlySet<Kind> = new Set<Kind>(['road', 'barber', 'billboard', 'storefront', 'tunnel', 'banner', 'hill', 'speed', 'bus', 'sticker', 'plate', 'radio', 'menu', 'marquee', 'poster', 'polesign', 'aframe', 'window', 'vinyl', 'roofsign', 'carwash', 'hood', 'giant', 'arch', 'tunnelsign']);
/** The hill sign: how far along the road from the car as its line starts, how far off to the side (m, left: the
 *  valley), how high its letters' centre stands over the road there. (Far enough out that the parked outro sits NEAR
 *  the sign, not under it: its letters and scaffold were looming over the whole ending.) */
export const HILL = { ahead: 230, side: -70, y: 16 };
/** A phrase longer than this (characters) takes two rows. */
export const WRAP_AT = 13;
const TEXT_W = 0.9;

/** Placement: paint begins this far past where the car's centre is at the phrase's end (m); sky text this far ahead of the car at
 *  its start, this high (every other one higher by `lift`), this far off to alternate sides; walls this far off the road, their text this high; signs and
 *  gantries as before. */
export const ROAD_AHEAD = 4.5;
/** Road paint is framed from this far (m, or perLength x its length if more) and this steeply (radians) behind it. */
export const ROAD_VIEW = { dist: 11, pitch: 0.95, perLength: 2.3, withCar: 0.12, perGap: 2.2, push: 0.1 };
/** The looks a face on the left is shot with (one per phrase, seeded): eye height (m) and distance (x WALL_VIEW.dist). */
export const WALL_LOOKS = [{ eye: 2.2, dist: 1 }, { eye: 1.2, dist: 1.08 }, { eye: 6, dist: 1.1 }];
/** Walls are watched from this far out along their normal (m), sliding with the car up to this far either way. */
export const WALL_VIEW = { dist: 20, slide: 7, eye: 2.2 };
export const SKY = { ahead: 75, up: 27, side: 17, lift: 7 };
/** Banners fly this far ahead of the car as their line starts, this high, this far to its side (left: clear of the
 *  sky-writing still dissolving on the right), drifting this fast (m, m/s); the plane flies `tow` ahead of its banner,
 *  and a formation's banners stand `gap` apart; a banner seen from further off than `view` is made bigger to match. */
export const BANNER = { ahead: 60, up: 42, side: -12, speed: 6, tow: 9, gap: 6.5, view: 58, under: 4, finale: { ahead: 42, up: 15 } };
/** A banner holds one row up to this many characters. */
export const BANNER_ROW = 22;
/** The faces on the left stand this far off the road's centre (m). Per kind: how high a lone face's centre stands, and
 *  where the lower of two stacked faces starts (its bottom edge); the two stand STACK_GAP apart. */
export const LEFT_LATERAL = 15;
export const LEFT: Record<LeftKind, { y: number; base: number }> = {
  billboard: { y: 8, base: 5.5 },
  storefront: { y: 3.4, base: 2 },
  neon: { y: 6, base: 2.2 },
};
export const STACK_GAP = 0.8;
/** The faces on the left stand at least this far apart (m, between their edges): a street frontage, not a row of
 *  lots, so a slow verse's run of them keeps up with the car. */
export const LEFT_GAP = 3;
/** The ground under a face on the left. */
const groundY = (c: Carrier) => c.center.y - c.foot;
export const SIGN = { lateral: 7.5, y: 3, toe: (25 * Math.PI) / 180, gap: 14 };
export const STREET = { lateral: 6.5, y: 3.6 };
export const GANTRY_Y = 6;
/** Tunnel lettering's centre stands this high on the wall (m); the camera frames it from this far out, across the bore,
 *  sliding with the car up to `slide` either way, from `eye` m up: the car passes between, so it looks over it. */
export const TUNNEL_TEXT = { y: 3.8, dist: 2 * TUNNEL.halfW - 1.5, slide: 11, eye: 2.6, aimDown: 1.2 };
/** A gantry stands at least this far past the last face on the left (m). */
export const GANTRY_CLEAR = 20;

/** A line sung faster than people read (0.3 s a word, subtitle standards: docs/LYRIC_VIDEO_TENETS.md §2). */
export const isFast = (line: { words: readonly { start: number }[]; end: number }) =>
  line.end - line.words[0]!.start < 0.3 * line.words.length;

/** A phrase's rows: one, or two balanced; a punctuating word (Phrase.solo) on a row of its own, the rest on one row
 *  unless it runs past SOLO_WRAP_AT (three rows make too tall a face). */
export function rowsFor(text: string, solo?: Phrase['solo'], wrap = WRAP_AT): string[] {
  if (!solo) return rowsOf(text, wrap);
  const words = text.split(' '), rest = (solo === 'first' ? words.slice(1) : words.slice(0, -1)).join(' ');
  const restRows = rest.length <= Math.max(SOLO_WRAP_AT, wrap) ? [rest] : rowsOf(rest, wrap);
  return solo === 'first' ? [words[0]!, ...restRows] : [...restRows, words[words.length - 1]!];
}
export const SOLO_WRAP_AT = 18;

export function rowsOf(text: string, wrap = WRAP_AT): string[] {
  if (text.length <= wrap) return [text];
  const words = text.split(' ');
  let best = 1, bestD = Infinity;
  for (let k = 1; k < words.length; k++) {
    const d = Math.abs(words.slice(0, k).join(' ').length - words.slice(k).join(' ').length);
    if (d < bestD) { bestD = d; best = k; }
  }
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
}

/** Laid out at `scale` x its kind's size (a banner seen from further off is made bigger). */
export function layout(kind: Kind, text: string, solo?: Phrase['solo'], scale = 1) {
  const L = LAYOUT[kind], set = CAPS.has(kind) ? text.toUpperCase() : text;
  const rows = kind === 'banner' ? (set.length <= BANNER_ROW ? [set] : rowsOf(set)) : rowsFor(set, solo, L.wrap);
  const longest = Math.max(...rows.map((r) => r.length));
  // a billboard's lyric is its ad's headline: it has the ad's left part, and the board is at least an ad's height
  // the lyric has the board's text share (its art has the rest); a billboard is at least an ad's height
  // (sky-writing is as wide as its words: the guard frames the face, and a wide empty face won't fit two in a shot)
  const w = kind === 'sky' ? Math.min(L.w, (longest * L.advance * L.rowH * L.emOfRow) / TEXT_W + 2) : L.w;
  const textW = w * (TEXT_SHARE[kind] ?? 1), h = L.rowH * rows.length;
  const em = scale * Math.min(L.rowH * L.emOfRow, (textW * TEXT_W) / (longest * L.advance));
  return { rows, em, w: scale * w, h: scale * (kind === 'billboard' || kind === 'poster' ? Math.max(h, AD.minH) : h) };
}

const WORLD_UP = new THREE.Vector3(0, 1, 0);
const ZERO = new THREE.Vector3();
/** The text's up for a face with this normal: world up, made orthogonal to it (paint on the road: the road's forward). */
const uprightFor = (normal: THREE.Vector3, fallback: THREE.Vector3) => {
  const u = WORLD_UP.clone().addScaledVector(normal, -normal.dot(WORLD_UP));
  return u.lengthSq() < 1e-6 ? fallback.clone() : u.normalize();
};
const flat = (v: THREE.Vector3) => new THREE.Vector3(v.x, 0, v.z).normalize();

export function placeCarriers(R: readonly Stretch[], motion: Motion, route: Route, tunnels: readonly Tunnel[] = [], solo?: Solo, skip: (line: Line, st: Stretch) => boolean = () => false, floor: Readonly<Record<string, number>> = {}): Carrier[] {
  const out: Carrier[] = [];
  // anything standing by the road stands clear of a tunnel and its mouths
  const clear = (s: number) => { const tn = nearTunnel(tunnels, s, TUNNEL_CLEAR); return tn ? tn.s1 + TUNNEL_CLEAR : s; };
  const last: Record<string, number> = {};
  const room = (key: string, s: number, gap: number) => { const v = Math.max(s, (last[key] ?? -Infinity) + gap); last[key] = v; return v; };
  const lines = R.flatMap((st) => st.lines), lastLine = lines[lines.length - 1]?.i ?? -1;
  let flyCount = 0, campaignCount = 0;
  const nextStart = (i: number) => lines.find((l) => l.i > i)?.words[0]!.start ?? Infinity;
  for (const st of R) {
    const pattern = PATTERNS[st.id] ?? ['sign'];
    st.lines.forEach((line, li) => {
      // (a set-piece's line: it places its own; a campaign's still counts, so the next chorus's grows on)
      if (skip(line, st)) { if (CAMPAIGN.test(line.text) && st.id.startsWith('chorus')) campaignCount++; return; }
      // ("fly" goes in the sky: written there in the first and last choruses, flown on banners in the second)
      let kind: Kind = /\bfly\b/i.test(line.text) ? (st.id === HOOK.bannerIn ? 'banner' : 'sky') : pattern[li % pattern.length]!;
      // the campaign: "Young and fine and dark and handsome" opens each chorus as his billboards, bigger each time (the
      // last chorus's keeps its pattern's kind: bigger boards there push its gantries into the sky-writing's way; its
      // own set-piece is to come, flow plan §8)
      const his = CAMPAIGN.test(line.text), campaign = his && st.id.startsWith('chorus') && campaignCount < HOOK.campaign.length;
      if (campaign) kind = 'billboard';
      const campaignScale = campaign ? HOOK.campaign[Math.min(campaignCount++, HOOK.campaign.length - 1)]! : 1;
      // a fast line is framed two phrases at a time (pairFraming): on the left, where faces pair side by side (a sign's
      // next stands behind it; paint on a moving road lies too far on to share a readable frame). Never in a tunnel:
      // a left face would be pushed past its far mouth while the line is sung inside.
      if (isFast(line) && kind !== 'sky' && kind !== 'tunnel' && !PAIRABLE.has(kind)) { const fl = FAST_LEFT[st.id] ?? ['storefront']; kind = fl[li % fl.length]!; }
      const phs = phrasesOf(line, nextStart(line.i), solo);
      phs.forEach((ph, pi) => {
        // a line's first phrase too short to read alone, straight after the line before, stays on that line's kind of
        // carrier, so the frame before can show it coming (pairFraming)
        const prev = out[out.length - 1];
        const alone = (phs[pi + 1]?.start ?? nextStart(line.i)) - ph.start - SETTLE;
        let kind_: Kind = pi === 0 && prev && PAIRABLE.has(prev.kind) && !PAIRABLE.has(kind) && ph.start - prev.phrase.end < 0.4 && alone < dwellFor(ph.words.length) ? prev.kind : kind;
        // a street blade holds one row
        if (kind_ === 'street' && rowsFor(ph.text, ph.solo).length > 1) kind_ = 'sign';
        let lay = layout(kind_, ph.text, ph.solo, campaign && kind_ === 'billboard' ? campaignScale : 1);
        const id = `L${line.i}.${pi}`;
        let s: number, center: THREE.Vector3, normal: THREE.Vector3, up: THREE.Vector3, foot: number | undefined, stack: Carrier['stack'], aim: THREE.Vector3 | undefined, vel: THREE.Vector3 | undefined, hold: number | undefined;
        let solid: Carrier['solid'] | undefined;
        if (kind_ === 'road') {
          s = room('road', motion.distanceAt(ph.end) + ROAD_AHEAD + lay.h / 2, lay.h + 2); const f = route.frameAt(s);
          center = f.pos.clone().addScaledVector(f.up, 0.03);
          normal = f.up.clone();
          up = f.fwd.clone().negate();
        } else if (kind_ === 'banner') {
          // a line's banners fly in formation, one over the next (read top-down), ahead in the sky, facing the car
          // halfway through the line; flying left to right (the way their words run), crossing the middle as it's sung
          // (the last line's lower and nearer: seen from low behind the car, over it)
          const T0 = phs[0]!.start, T1 = phs[phs.length - 1]!.end, fin = line.i === lastLine;
          s = motion.distanceAt(T0) + (fin ? BANNER.finale.ahead : BANNER.ahead); const f = route.frameAt(s);
          const mid = f.pos.clone().addScaledVector(WORLD_UP, fin ? BANNER.finale.up : BANNER.up).addScaledVector(f.right, fin ? 0 : BANNER.side);
          const cf = route.frameAt(motion.distanceAt((T0 + T1) / 2)), car = cf.pos;
          normal = car.clone().sub(mid).normalize();
          up = uprightFor(normal, WORLD_UP);
          // sized for how far off the camera (low behind the car: framing) sees it, so its type reads the same anywhere
          const eye = car.clone().addScaledVector(flat(cf.fwd), -8).addScaledVector(WORLD_UP, 1.6);
          const scale = Math.max(1, eye.distanceTo(mid) / BANNER.view) * (CRUISE.test(line.text) ? HOOK.cruise : 1);
          lay = layout(kind_, ph.text, ph.solo, scale);
          // keeping pace with the car (its average speed over the line), drifting left to right across the frame
          const pace = (motion.distanceAt(T1) - motion.distanceAt(T0)) / Math.max(1e-3, T1 - T0);
          vel = up.clone().cross(normal).normalize().multiplyScalar(BANNER.speed).addScaledVector(flat(f.fwd), pace);
          const rank = pi - (phs.length - 1) / 2; // its place in the formation, from the middle (+: lower)
          center = mid.addScaledVector(vel, ph.start - (T0 + T1) / 2).addScaledVector(up, -rank * BANNER.gap * scale);
          aim = up.clone().multiplyScalar(rank * BANNER.gap * scale);
          solid = null;
        } else if (kind_ === 'sky') {
          // sky-writing: a line's phrases side by side on one baseline across the sky, left to right as they're sung,
          // keeping pace with the car; the hook ("He's so fly, fly") bigger each chorus, held whole until it's sung,
          // the shot holding the whole of it (aimed at the line's middle)
          const fly = FLY.test(line.text), k = flyCount, scale = fly ? HOOK.fly[Math.min(k, HOOK.fly.length - 1)]! : 1;
          lay = layout(kind_, ph.text, ph.solo, scale);
          const T0 = phs[0]!.start, T1 = phs[phs.length - 1]!.end;
          // (further off and higher, but less than it grows: it reads bigger each time)
          const far = 1 + (scale - 1) * HOOK.recede;
          s = motion.distanceAt(T0) + SKY.ahead * far; const f = route.frameAt(s);
          // (high, over the sun and the town's roofs; over the headland by the third)
          const mid = f.pos.clone().addScaledVector(WORLD_UP, SKY.up * far + (fly ? HOOK.lift : 0) + HOOK.rise * (scale - 1));
          const car = route.frameAt(motion.distanceAt((T0 + T1) / 2)).pos;
          normal = car.clone().sub(mid).normalize();
          up = uprightFor(normal, WORLD_UP);
          // the phrases side by side, as one line written across the sky, `gap` apart
          const along = up.clone().cross(normal).normalize(), ws = phs.map((p) => layout(kind_, p.text, p.solo, scale).w), gap = HOOK.gap * scale;
          const total = ws.reduce((a, b) => a + b, 0) + gap * (ws.length - 1), x = -total / 2 + ws.slice(0, pi).reduce((a, b) => a + b, 0) + gap * pi + ws[pi]! / 2;
          center = mid.clone().addScaledVector(along, x);
          if (fly) aim = mid.clone().sub(center); // (the line's middle, from this phrase: both travel together)
          // keeping pace with the car over the line, so the shot holds as it's written
          const pace = (motion.distanceAt(T1) - motion.distanceAt(T0)) / Math.max(1e-3, T1 - T0);
          vel = flat(f.fwd).multiplyScalar(pace);
          center.addScaledVector(vel, ph.start - T0);
          if (fly && pi === phs.length - 1) flyCount++;
          if (fly) hold = T1; // the hook stays written whole until it's sung
        } else if (PAIRABLE.has(kind_) && prev && !prev.stack && PAIRABLE.has(prev.kind) && prev.stretch === st.id && !campaign && prev.ad !== 'him') {
          // (not the campaign's: his boards stand one by one down the road)
          // under the face before, on its building: that one moves up to make room
          kind_ = prev.kind; lay = layout(kind_, ph.text, ph.solo);
          const L = LEFT[kind_ as LeftKind], fB = L.base + lay.h / 2, fT = L.base + lay.h + STACK_GAP + prev.h / 2;
          prev.center.addScaledVector(WORLD_UP, fT - prev.foot);
          prev.foot = fT; prev.stack = 'top'; prev.aim = WORLD_UP.clone().multiplyScalar((fB - fT) / 2);
          prev.solid = solidFor(kind_, Math.max(prev.w, lay.w), prev.h, fT, { h: lay.h, dy: fB - fT });
          s = prev.s; normal = prev.normal.clone(); up = prev.up.clone();
          center = prev.center.clone().addScaledVector(WORLD_UP, fB - fT);
          foot = fB; solid = null; stack = 'bottom'; aim = WORLD_UP.clone().multiplyScalar((fT - fB) / 2);
        } else if (PAIRABLE.has(kind_)) {
          // on the left (seen from the right, the drive runs left to right on screen); on a bend, on along the road
          // until it stands clear of the one before (their buildings swing into each other on the inside of a turn)
          const L = LEFT[kind_ as LeftKind], before = out.findLast((c) => PAIRABLE.has(c.kind) && c.solid);
          const at = (s: number) => { const f = route.frameAt(s); return { center: f.pos.clone().addScaledVector(f.right, -LEFT_LATERAL).addScaledVector(WORLD_UP, L.y), normal: flat(f.right.clone()), up: WORLD_UP.clone() }; };
          // (past a set-piece's ground: its city stands there; `floor`)
          s = room('left', Math.max(clear(motion.distanceAt((ph.start + ph.end) / 2)), floor[st.id] ?? -Infinity), lay.w + LEFT_GAP);
          solid = solidFor(kind_, lay.w, lay.h, L.y);
          while (before && overlaps(before, { ...at(s), solid })) s += 1;
          last.left = s;
          ({ center, normal, up } = at(s));
          foot = L.y;
        } else if (kind_ === 'hill') {
          // across the valley, facing the car halfway through its line
          const T0 = phs[0]!.start, T1 = phs[phs.length - 1]!.end;
          s = motion.distanceAt(T0) + HILL.ahead; const f = route.frameAt(s);
          center = f.pos.clone().addScaledVector(f.right, HILL.side).addScaledVector(WORLD_UP, HILL.y);
          const car = route.frameAt(motion.distanceAt((T0 + T1) / 2)).pos;
          normal = flat(car.clone().sub(center));
          up = WORLD_UP.clone();
          foot = center.y + 0.4; solid = null; // (its mound stands on the plain)
        } else if (kind_ === 'tunnel') {
          // on the bore's left wall
          // far enough in that its camera, sliding with the car, stays in the bore
          const tn = nearTunnel(tunnels, motion.distanceAt(ph.start), TUNNEL_CLEAR);
          s = room('tunnel', Math.max(motion.distanceAt((ph.start + ph.end) / 2), tn ? tn.s0 + TUNNEL_TEXT.slide + lay.w / 2 + 4 : -Infinity), lay.w + 4); const f = route.frameAt(s);
          center = f.pos.clone().addScaledVector(f.right, -(TUNNEL.halfW - 0.05)).addScaledVector(WORLD_UP, TUNNEL_TEXT.y);
          normal = flat(f.right.clone());
          up = WORLD_UP.clone();
          foot = TUNNEL_TEXT.y; solid = null;
        } else if (kind_ === 'gantry') {
          // past the faces on the left (a verse's run of them may still be going when the freeway starts)
          s = room('gantry', clear(Math.max(motion.distanceAt((ph.start + ph.end) / 2), (last.left ?? -Infinity) + GANTRY_CLEAR)), 14); const f = route.frameAt(s);
          center = f.pos.clone().addScaledVector(f.up, GANTRY_Y);
          normal = flat(f.fwd.clone().negate());
          up = WORLD_UP.clone();
        } else {
          // signs and street blades on the right: the left is taken
          const P = kind_ === 'street' ? STREET : SIGN;
          s = room('right', clear(motion.distanceAt((ph.start + ph.end) / 2)), SIGN.gap); const f = route.frameAt(s);
          center = f.pos.clone().addScaledVector(f.right, P.lateral).addScaledVector(WORLD_UP, P.y);
          const back = flat(f.fwd.clone().negate()), toRoad = flat(f.right.clone().negate());
          normal = back.multiplyScalar(Math.cos(SIGN.toe)).addScaledVector(toRoad, Math.sin(SIGN.toe)).normalize();
          up = WORLD_UP.clone();
        }
        foot ??= center.y - route.frameAt(s).pos.y;
        if (solid === undefined) solid = solidFor(kind_, lay.w, lay.h, foot);
        out.push({ id, phrase: ph, kind: kind_, stretch: st.id, reveal: ph.start, s, center, normal, up, ...lay, foot, solid, ...(stack ? { stack } : {}), ...(aim ? { aim } : {}), ...(vel ? { vel } : {}), ...(hold ? { hold } : {}), ...(ADVERTISED.has(kind_) ? { ad: his ? 'him' : adFor(ph.text, ph.start * 1000, out.findLast((o) => o.ad)?.ad) } : {}), ...(line.i === lastLine ? { finale: true } : {}) });
      });
    });
  }
  return out;
}

/** How tall the building behind a face on the left stands (m; a billboard stands on posts, none). */
export const BUILDING_H: Partial<Record<LeftKind, number>> = { storefront: 7, neon: 12 };
/** The carrier's own frame: x along its text, y its text's up, z its face's normal, origin at its centre. */
export const basisOf = (c: Carrier) => new THREE.Matrix4().makeBasis(c.up.clone().cross(c.normal).normalize(), c.up, c.normal).setPosition(c.center);
/** A face's solid part, in its own frame (m): the building it's on (its foot on the ground, at least 1.5 m above the
 *  text), or its backing board, taking in a face stacked `under` it (its height, and its centre's offset). */
export function solidFor(kind: Kind, w: number, h: number, foot: number, under?: { h: number; dy: number }): Carrier['solid'] {
  if (kind === 'road' || kind === 'sky' || kind === 'banner' || kind === 'hill') return null;
  const H = BUILDING_H[kind as LeftKind];
  if (H) { const top = Math.max(H, foot + h / 2 + 1.5); return { at: new THREE.Vector3(0, top / 2 - foot, -5.06), size: new THREE.Vector3(w + LEFT_GAP, top, 10) }; }
  const lo = under ? under.dy - under.h / 2 : -h / 2;
  return { at: new THREE.Vector3(0, (lo + h / 2) / 2, -0.1), size: new THREE.Vector3(w + 0.2, h / 2 - lo + 0.2, 0.15) };
}
/** A carrier's solid parts, which can hide another's face. The scene builds them from this (world.ts), so the guard
 *  checks what shows. */
export const solidsOf = (c: Pick<Carrier, 'solid'>) => (c.solid ? [c.solid] : []);
/** Everything of a carrier that can stand in front of another's words, for the guard: its solids, and a gantry's beam
 *  across the road and its legs (world.ts builds them at these sizes). */
export function occludersOf(c: Pick<Carrier, 'solid' | 'kind' | 'h' | 'foot'>): { at: THREE.Vector3; size: THREE.Vector3 }[] {
  const out = solidsOf(c);
  if (c.kind === 'gantry') {
    out.push({ at: new THREE.Vector3(0, c.h / 2 + 0.2, -0.2), size: new THREE.Vector3(13.4, 0.4, 0.4) });
    for (const x of [-6.5, 6.5]) out.push({ at: new THREE.Vector3(x, (c.h / 2 - c.foot) / 2, -0.2), size: new THREE.Vector3(0.2, c.foot + c.h / 2, 0.2) });
  }
  return out;
}

/** Whether two carriers' solids come within CLEAR of each other. */
type Placed = Pick<Carrier, 'center' | 'normal' | 'up' | 'solid'>;
const CLEAR = 0.5;
function overlaps(a: Placed, b: Placed): boolean {
  // (OBB keeps the centre it's given and moves it: hand it a copy, or the carrier's own solid is moved into the world)
  const obbs = (c: Placed) => { const m = basisOf(c as Carrier); return solidsOf(c as Carrier).map(({ at, size }) => new OBB(at.clone(), size.clone().addScalar(CLEAR).multiplyScalar(0.5)).applyMatrix4(m)); };
  const bs = obbs(b);
  return obbs(a).some((x) => bs.some((y) => x.intersectsOBB(y)));
}

/** The back-seat shot of sky-writing and banners (in these stretches): this far behind the car's centre and this high
 *  (m, over the car's bulk: drive.ts CAR_BOX), aimed this far (radians) under the writing. */
/** The end's tail-light shot: how far behind the car, off its side and up (m), and how far under the writing it aims. */
export const TAIL = { back: 7.5, side: 1.4, up: 0.9, under: 5 };
export const CABIN = { stretches: new Set(['chorus1']), back: 3.4, up: 2.3, under: (8 * Math.PI) / 180 };

/** The pose for a camera at `eye` looking at `at`. */
export function lookFrom(eye: THREE.Vector3, at: THREE.Vector3): Pose {
  const d = eye.clone().sub(at), dist = d.length();
  return { tx: at.x, ty: at.y, tz: at.z, dist, yaw: Math.atan2(d.x, d.z), pitch: Math.asin(d.y / dist), roll: 0 };
}

/** How the camera frames a carrier while its phrase is sung: a function of t (most follow the car). */
export function framing(c: Carrier, car: (t: number) => RouteFrame, carS: (t: number) => number): (t: number) => Pose {
  const jitter = (k: number) => hash(c.phrase.start * 1000, k) * 2 - 1; // a seeded variation, so runs don't repeat
  if (PAIRABLE.has(c.kind) || c.kind === 'tunnel') {
    // out from the face across the road (or the bore), sliding along with the car's progress past it (clamped); a
    // stacked face's shot holds its whole stack, read top-down
    // (faces on the left vary their look phrase by phrase: eye level, low and heroic, or high; the tunnel keeps its own)
    const V = c.kind === 'tunnel' ? TUNNEL_TEXT : WALL_VIEW, look = c.kind === 'tunnel' ? WALL_LOOKS[0]! : WALL_LOOKS[Math.floor(hash(c.phrase.start * 1000, 13) * WALL_LOOKS.length)]!;
    const along = c.up.clone().cross(c.normal).normalize(), dir = Math.sign(along.dot(car(c.phrase.start).fwd)) || 1;
    // (in the tunnel aimed under the lettering: the car runs through the bottom of the frame)
    const aim = c.center.clone().add(c.aim ?? ZERO).addScaledVector(WORLD_UP, c.kind === 'tunnel' ? -TUNNEL_TEXT.aimDown : 0);
    return (t) => {
      const slide = Math.max(-V.slide, Math.min(V.slide, carS(t) - c.s)) + 2 * jitter(4);
      const big = Math.max(1, c.w / LAYOUT[c.kind].w); // (a bigger face, the campaign's: stand back to match)
      const eye = aim.clone().addScaledVector(c.normal, V.dist * look.dist * big).addScaledVector(along, dir * slide);
      eye.y = groundY(c) + (c.kind === 'tunnel' ? V.eye : look.eye); // over the ground across from it (not the car's: it may be on a grade)
      return lookFrom(eye, aim);
    };
  }
  switch (c.kind) {
    case 'road': {
      // high in front of the words, looking back down the road at them, held: the car drives toward us, up to them; as
      // steeply to the road's own surface wherever it climbs (the paint's up runs back down the road)
      // aimed between the words and where the car pulls up to them (as the phrase ends), back far enough to hold it
      // whole: it drives into the frame and finishes in it
      const grade = -Math.asin(Math.max(-1, Math.min(1, c.up.y)));
      const carAt = car(c.phrase.end).pos, gap = carAt.distanceTo(c.center);
      const aim = c.center.clone().lerp(carAt, ROAD_VIEW.withCar).addScaledVector(c.normal, 0.5);
      const p: Pose = { tx: aim.x, ty: aim.y, tz: aim.z, dist: Math.max(ROAD_VIEW.dist, c.h * ROAD_VIEW.perLength, gap * ROAD_VIEW.perGap), yaw: Math.atan2(c.up.x, c.up.z) + Math.PI + 0.2 * jitter(1), pitch: ROAD_VIEW.pitch + grade + 0.08 * jitter(2), roll: 0 };
      // pushing in slowly as it's sung
      return (t) => ({ ...p, dist: p.dist * (1 - ROAD_VIEW.push * Math.min(1, Math.max(0, (t - c.phrase.start) / Math.max(0.5, c.phrase.end - c.phrase.start)))) });
    }
    case 'hill': return (t) => {
      // from behind the climbing car, a little above it: the car in the foot of the frame, the sign across the valley
      const f = car(t), eye = f.pos.clone().addScaledVector(flat(f.fwd), -11).addScaledVector(WORLD_UP, 3.2);
      return lookFrom(eye, c.center.clone().addScaledVector(WORLD_UP, -c.h * 0.35));
    };
    case 'sky': case 'banner': {
      if (c.finale) return (t) => {
        // low behind the parked car, its tail lights in the frame's foot, looking up over it at the writing
        const f = car(t), eye = f.pos.clone().addScaledVector(flat(f.fwd), -TAIL.back).addScaledVector(f.right, TAIL.side).addScaledVector(WORLD_UP, TAIL.up);
        return lookFrom(eye, centerAt(c, t).add(c.aim ?? ZERO).addScaledVector(WORLD_UP, -TAIL.under));
      };
      // in some stretches from the back seat: just behind the two of them, over their shoulders, aimed a little under
      // the writing so their silhouettes sit along the frame's foot; otherwise low behind the car, looking up at it
      const cabin = CABIN.stretches.has(c.stretch);
      return (t) => {
        const f = car(t), at = centerAt(c, t).add(c.aim ?? ZERO);
        // (towed banners: aimed a little under the formation, so the horizon anchors the frame's foot — a banner on
        // nothing but sky flatlines)
        if (c.kind === 'banner') at.addScaledVector(WORLD_UP, -BANNER.under);
        if (!cabin) return lookFrom(f.pos.clone().addScaledVector(flat(f.fwd), -8).addScaledVector(f.right, 2.5 * jitter(3)).add(new THREE.Vector3(0, 1.6, 0)), at);
        const eye = f.pos.clone().addScaledVector(f.fwd, -CABIN.back).addScaledVector(f.up, CABIN.up).addScaledVector(f.right, 0.25 * jitter(3));
        return lookFrom(eye, at.addScaledVector(WORLD_UP, -eye.distanceTo(at) * Math.tan(CABIN.under)));
      };
    }
    default: {
      const p = fitSign({ center: c.center, normal: c.normal, w: c.w, h: c.h });
      return () => ({ ...p, yaw: p.yaw + 0.2 * jitter(5) });
    }
  }
}

/** Two phrases framed at once, the one being sung and the next (`n`), so the next can be read before it's sung — for
 *  fast lines: two faces on the left, from out across the road between them (the next is to the right). Null where the
 *  pair can't share a frame (not both on the left). */
export function pairFraming(c: Carrier, n: Carrier): ((t: number) => Pose) | null {
  if (!PAIRABLE.has(c.kind) || !PAIRABLE.has(n.kind)) return null;
  // (centred nearer the one being sung: it leads the frame, the next one comes in at its side)
  const mid = c.center.clone().lerp(n.center, PAIR.toNext), span = c.center.distanceTo(n.center);
  const dist = Math.max(WALL_VIEW.dist, (span + Math.max(c.w, n.w)) * PAIR.wall);
  const eye = mid.clone().addScaledVector(c.normal, dist);
  // further out than usual, it stands back past the signs on the right: up over them
  eye.y = (groundY(c) + groundY(n)) / 2 + 2.2 + (dist - WALL_VIEW.dist) * PAIR.lift;
  const p = lookFrom(eye, mid);
  return () => p;
}
const aimOf = (c: Carrier) => c.center.clone().add(c.aim ?? ZERO);
/** How far back a framing of two neighbouring faces stands (m). */
const pairDist = (c: Carrier, n: Carrier) => Math.max(WALL_VIEW.dist, (aimOf(c).distanceTo(aimOf(n)) + Math.max(c.w, n.w)) * PAIR.wall);
/** Whether two neighbouring faces can share a take: standing back to hold both keeps their type at least
 *  PAIR.takePx tall (px at 1080p, head on). */
export const takeable = (c: Carrier, n: Carrier) => (Math.min(c.em, n.em) * 1080) / (2 * Math.tan((LENS.fov * Math.PI) / 360) * pairDist(c, n)) >= PAIR.takePx;
/** A line's faces on the left in one take: the camera drifts along them as they're sung, on the first as it's sung,
 *  between each and the one before at its cue (both in frame, standing back to hold the two: the one just sung is
 *  still being read), on the last as the line ends. No cut inside the line. */
export function lineTake(cs: readonly Carrier[], previews: readonly boolean[]): (t: number) => Pose {
  const aims = cs.map(aimOf), dists = cs.slice(1).map((n, i) => pairDist(cs[i]!, n));
  // (how far back at p: each pair's distance between them, eased across the faces)
  const distAt = (p: number) => { const x = Math.min(dists.length - 1, Math.max(0, p - 0.5)), i = Math.min(dists.length - 2, Math.floor(x)); return i < 0 ? dists[0]! : dists[i]! + (dists[i + 1]! - dists[i]!) * (x - i); };
  // (held while each is sung: between it and the one before, still being read; or, when it previews the next, between
  // it and that one, nearer it (PAIR.toNext); sliding on once it's sung, over PAIR.slide, by the next cue if there's
  // room: else just after, the next already in frame)
  const keys: [number, number][] = [];
  cs.forEach((c, i) => {
    const p = previews[i] && i < cs.length - 1 ? i + PAIR.toNext : Math.max(0, i - 0.5), held = keys[keys.length - 1]?.[0] ?? -Infinity;
    const from = Math.max(c.phrase.start, held + PAIR.slide);
    keys.push([from, p], [Math.max(from, c.phrase.end), p]);
  });
  keys.push([keys[keys.length - 1]![0] + PAIR.slide, cs.length - 1]);
  for (let k = 1; k < keys.length; k++) keys[k]![1] = Math.max(keys[k]![1], keys[k - 1]![1]);
  const along = (t: number) => { // where along the faces the take is at t (0: the first; i + 0.5: between i and i + 1)
    if (t <= keys[0]![0]) return 0;
    for (let k = 1; k < keys.length; k++) if (t < keys[k]![0]) { const [t0, p0] = keys[k - 1]!, [t1, p1] = keys[k]!; const u = (t - t0) / Math.max(1e-3, t1 - t0); return p0 + (p1 - p0) * (u * u * (3 - 2 * u)); }
    return cs.length - 1;
  };
  return (t) => {
    const p = along(t), a = Math.min(cs.length - 2, Math.floor(p)), f = p - a;
    const aim = aims[a]!.clone().lerp(aims[a + 1]!, f), c = cs[a]!, n = cs[a + 1]!, dist = distAt(p);
    const eye = aim.clone().addScaledVector(c.normal.clone().lerp(n.normal, f).normalize(), dist);
    eye.y = groundY(c) + (groundY(n) - groundY(c)) * f + 2.2 + (dist - WALL_VIEW.dist) * PAIR.lift;
    return lookFrom(eye, aim);
  };
}
/** A line painted on the road, in one take (the user, 2026-10-13: hopping from phrase to phrase was "clippy"): high
 *  ahead of the car, looking back down the road at it, travelling on with it the whole line. Each phrase lies where
 *  the car is as it ends (it must never drive over one being sung), so they follow the car's pace; the aim runs through
 *  each phrase's middle a little before its middle moment (seen from high ahead, a phrase sliding up toward the car
 *  shrinks: it leaves the frame's top sooner than its foot). Each phrase slides up the screen toward the car as it's sung, the next
 *  rising into the frame below it (top to bottom), and the car drives on toward the lens, over each once it's sung. */
export const ROAD_TAKE = { dist: 30, pitch: 1.1, toward: -3, ease: 0.1, at: 0.4 };
export function roadTake(cs: readonly Carrier[], route: Route): (t: number) => Pose {
  const keys = cs.map((c) => [c.phrase.start + (c.phrase.end - c.phrase.start) * ROAD_TAKE.at, c.s] as const);
  const slope = keys.length > 1 ? (keys[keys.length - 1]![1] - keys[0]![1]) / (keys[keys.length - 1]![0] - keys[0]![0]) : 0;
  // (where along the road the aim is at t: through each phrase's middle at its middle moment, easing — a third of its
  // speed through each phrase, catching up between: never still, never a jump — and steady at that pace before and
  // after)
  const E = ROAD_TAKE.ease, ease = (u: number) => E * u + (1 - E) * u * u * (3 - 2 * u);
  const sAt = (t: number) => {
    if (t <= keys[0]![0]) return keys[0]![1] + E * slope * (t - keys[0]![0]);
    for (let k = 1; k < keys.length; k++) if (t <= keys[k]![0]) { const [t0, s0] = keys[k - 1]!, [t1, s1] = keys[k]!; return s0 + (s1 - s0) * ease((t - t0) / (t1 - t0)); }
    const [tl, sl] = keys[keys.length - 1]!;
    return sl + E * slope * (t - tl);
  };
  return (t) => {
    // (aimed a little toward the lens of the phrase's middle: the frame reaches further up the road, toward the car)
    const s = sAt(t) + ROAD_TAKE.toward, f = route.frameAt(s), grade = Math.asin(Math.max(-1, Math.min(1, f.fwd.y)));
    return { tx: f.pos.x, ty: f.pos.y + 0.03, tz: f.pos.z, dist: ROAD_TAKE.dist, yaw: Math.atan2(f.fwd.x, f.fwd.z), pitch: ROAD_TAKE.pitch - grade, roll: 0 };
  };
}
/** A line on one kind of sign elsewhere (paint, signs, gantries, the tunnel's lettering) in one take: each phrase's own
 *  framing held while it's sung, gliding on to the next's once it's sung (over the gap; a whip, PAIR.whip, at least). */
export function glideTake(cs: readonly Carrier[], frames: readonly ((t: number) => Pose)[]): (t: number) => Pose {
  const keys: [number, number][] = [];
  cs.forEach((c, i) => {
    const from = Math.max(c.phrase.start, (keys[keys.length - 1]?.[0] ?? -Infinity) + PAIR.whip);
    keys.push([from, i], [Math.max(from, c.phrase.end), i]);
  });
  return (t) => {
    let k = 1;
    while (k < keys.length && t >= keys[k]![0]) k++;
    if (k >= keys.length) return frames[cs.length - 1]!(t);
    const [t0, p0] = keys[k - 1]!, [t1, p1] = keys[k]!;
    if (t < t0 || p0 === p1) return frames[t < t0 ? 0 : p0]!(t);
    const u = (t - t0) / Math.max(1e-3, t1 - t0);
    // (the eye on a straight line between theirs: a pose's orbit would swing it through a wall)
    return linePose(frames[p0]!(t), frames[p1]!(t), u * u * (3 - 2 * u));
  };
}
/** How far back a pair framing stands, per metre of the pair's extent; and how far it rises (m) per metre further out
 *  than WALL_VIEW.dist. */
export const PAIR = { wall: 0.95, lift: 0.5, toNext: 0.45, takePx: 54, slide: 0.25, whip: 0.12 };
