// Verse 1's newsstand, an Easter egg for the user's other video (the user, 2026-10-14: "a magazine stand somewhere which
// could have the cover of the magazine we use in that video"): a green LA sidewalk kiosk on the right of the street,
// its awning out over the walk, its racks full of magazines and the day's papers, a hand-lettered NEWS sign, the vendor
// reading behind the counter, and EFFORTLESS (look/effortless.ts: that video's cover, ported) front and centre: a poster
// of the issue on the end that faces the oncoming traffic, copies racked beside it and along the front. The camera
// meets it from the back seat while they tailgate the bus (drive/sets/verse1.ts AT.newsstand): it comes up to the
// right of the bus, on the sidewalk, never between the camera and the tail ad. Browser only (canvas).
import * as THREE from 'three';
import type { Drive } from '../../drive/drive';
import { AT } from '../../drive/sets/verse1';
import { toon } from '../../look/toon';
import { COVER, drawEffortless } from '../../look/effortless';
import { F, font } from '../../engine/type';
import { hash } from '../../engine/util';
import { ball, box, canvasTex, pic, plane, roadFrame } from './kit';

/** The kiosk (m): across (D) and along (L) the walk, its walls' height, the counter's, the sidewalk's kerb under it. */
const K = { D: 1.9, L: 3.2, H: 2.5, counter: 1.0, fascia: 0.45, kerb: 0.15 };
/** A magazine on the racks (m), and a folded paper. */
const MAG = { w: 0.2, h: 0.26 }, PAPER = { w: 0.3, h: 0.36 };
/** The other covers' atlas: COLS x ROWS cells of CELL px; the last row the newspapers. */
const COLS = 8, ROWS = 3, CELL = { w: 256, h: 336 };
const MAGS = 16;

const TITLES = ['GLOSS', 'TORQUE', 'SOUND', 'PULSE', 'WHEELS', 'SURF', 'STARLET', 'BOULEVARD', 'CANYON', 'TIDE', 'RIDE', 'SCENE', 'VELVET', 'HOMES', 'GAME DAY', 'FLASH'];
const PAPERS = [['The Daily Coast', 'HEAT WAVE HOLDS'], ['Valley Herald', 'FREEWAY REOPENS'], ['La Semana', 'NOCHE DE GALA'], ['Sunset Times', 'LATE RALLY WINS IT'],
  ['The Daily Coast', 'CITY HALL SAYS NO'], ['Harbor Ledger', 'FOG BY MORNING'], ['Valley Herald', 'RENTS UP AGAIN'], ['Sunset Times', 'STARS COME OUT']] as const;
const INKS = ['#c8102e', '#2b78a6', '#1f6b44', '#f6dd8f', '#ff5a36', '#141414', '#f4b6c2', '#cdb8e6', '#ffd65a', '#9cc3e0', '#e3907a', '#3a2a5a'];

/** One cover in the atlas: a magazine (a colour field, its masthead, a figure, a car, a sun or a palm, cover lines, a
 *  price) or a newspaper's top fold (its masthead, a headline, a photo, columns). */
function drawCell(c: CanvasRenderingContext2D, i: number) {
  const { w, h } = CELL, H = (k: number) => hash(i, k, 7);
  if (i < MAGS) {
    const bg = INKS[Math.floor(H(0) * INKS.length)]!, light = ['#f6dd8f', '#f4b6c2', '#cdb8e6', '#ffd65a', '#9cc3e0'].includes(bg);
    const ink = light ? '#141414' : '#f8f2e4', accent = INKS[(INKS.indexOf(bg) + 3 + Math.floor(H(1) * 6)) % INKS.length]!;
    c.fillStyle = bg; c.fillRect(0, 0, w, h);
    // the picture first, under the masthead as a magazine's is
    c.fillStyle = accent;
    const kind = i % 4;
    if (kind === 0) { // a face and shoulders
      c.beginPath(); c.ellipse(w * 0.55, h * 0.5, w * 0.17, w * 0.21, 0, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.moveTo(w * 0.12, h); c.quadraticCurveTo(w * 0.2, h * 0.7, w * 0.55, h * 0.7); c.quadraticCurveTo(w * 0.9, h * 0.7, w * 0.98, h); c.fill();
      c.fillStyle = ink; c.beginPath(); c.ellipse(w * 0.55, h * 0.38, w * 0.2, w * 0.12, 0, Math.PI, 0); c.fill(); // hair
    } else if (kind === 1) { // a car, side on
      c.fillRect(w * 0.08, h * 0.6, w * 0.84, h * 0.1); c.fillRect(w * 0.28, h * 0.52, w * 0.4, h * 0.09);
      c.fillStyle = ink; for (const x of [0.25, 0.75]) { c.beginPath(); c.arc(w * x, h * 0.71, w * 0.08, 0, Math.PI * 2); c.fill(); }
    } else if (kind === 2) { // a sun over stripes
      c.beginPath(); c.arc(w * 0.5, h * 0.62, w * 0.3, Math.PI, 0); c.fill();
      for (let k = 0; k < 5; k++) c.fillRect(0, h * (0.66 + k * 0.06), w, h * 0.025);
    } else { // a palm
      c.fillRect(w * 0.5, h * 0.4, w * 0.05, h * 0.6);
      for (let f = 0; f < 6; f++) { c.save(); c.translate(w * 0.525, h * 0.4); c.rotate(-Math.PI * 0.95 + (f / 5) * Math.PI * 0.9); c.beginPath(); c.ellipse(w * 0.16, 0, w * 0.17, w * 0.035, 0, 0, Math.PI * 2); c.fill(); c.restore(); }
    }
    // the masthead, as wide as the cover
    const fam = [F.archivo(125, 900), F.bodoni(900), F.archivo(62, 900), F.archivoItalic(100, 800)][Math.floor(H(2) * 4)]!, title = TITLES[i]!;
    c.fillStyle = ink; c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    c.font = font(fam, 100);
    const sz = Math.min(110, (100 * (w * 0.9)) / c.measureText(title).width);
    c.font = font(fam, sz); c.fillText(title, w * 0.05, h * 0.05 + sz * 0.78);
    // cover lines and the price
    c.font = font(F.archivo(75, 700), 17);
    for (let k = 0; k < 3; k++) c.fillText(['THE SUMMER ISSUE', '50 BEST TACOS', 'HOW TO DRIVE IT', 'ROAD TRIP!', 'NEW MUSIC', 'SECRETS OF L.A.', 'FALL LOOKS', 'BIG INTERVIEW'][Math.floor(H(3 + k) * 8)]!, w * 0.06, h * (0.42 + k * 0.08));
    // (the cover price the user's I Like Ur Look cover carries, look/effortless.ts: an Easter egg, the user, 2026-10-16)
    c.font = font(F.mono(600), 13); c.fillText('$9.99 US · $12.99 CAN', w * 0.06, h * 0.95, w * 0.6);
    c.fillStyle = '#f8f8f4'; c.fillRect(w * 0.68, h * 0.86, w * 0.26, h * 0.1);
    c.fillStyle = '#141414'; for (let x = 0; x < w * 0.22; x += 3) if (hash(i, x) > 0.4) c.fillRect(w * 0.7 + x, h * 0.875, 2, h * 0.07);
    return;
  }
  // a newspaper's top fold
  const [name, head] = PAPERS[(i - MAGS) % PAPERS.length]!;
  c.fillStyle = '#ece6d8'; c.fillRect(0, 0, w, h);
  c.fillStyle = '#141414'; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  c.font = font(F.bodoni(900), 100);
  const sz = Math.min(44, (100 * (w * 0.92)) / c.measureText(name).width);
  c.font = font(F.bodoni(900), sz); c.fillText(name, w / 2, 14 + sz * 0.8);
  c.fillRect(w * 0.04, 22 + sz, w * 0.92, 2); c.fillRect(w * 0.04, 40 + sz, w * 0.92, 1);
  c.font = font(F.mono(500), 10); c.fillText('FINAL · 75¢', w / 2, 36 + sz);
  c.font = font(F.archivo(62, 900), 100);
  const hs = Math.min(64, (100 * (w * 0.92)) / c.measureText(head).width);
  c.font = font(F.archivo(62, 900), hs); c.fillText(head, w / 2, 48 + sz + hs * 0.8);
  const top = 60 + sz + hs;
  c.fillStyle = '#8a847a'; c.fillRect(w * 0.04, top, w * 0.55, h - top - 10); // the photo
  c.fillStyle = '#5a554e'; c.beginPath(); c.arc(w * 0.31, top + (h - top) * 0.45, w * 0.1, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#9a948a';
  for (let y = top; y < h - 12; y += 7) c.fillRect(w * 0.63, y, w * 0.33 * (0.7 + 0.3 * hash(i, y)), 3);
}

/** A plane showing atlas cell `i`. */
function cellGeo(i: number, w: number, h: number) {
  const g = new THREE.PlaneGeometry(w, h), uv = g.attributes.uv as THREE.BufferAttribute, col = i % COLS, row = Math.floor(i / COLS);
  for (let k = 0; k < uv.count; k++) uv.setXY(k, (col + uv.getX(k)) / COLS, 1 - (row + 1) / ROWS + uv.getY(k) / ROWS);
  return g;
}

/** A painted sign's words: each letter by hand, a little off its neighbours' line and angle, over a dark shade, a
 *  pinstripe border; in the signs' face (F.sign). */
function handLettered(text: string, sub: string, w: number, h: number, bg: string, ink: string, seed: number) {
  return canvasTex(w, h, (c) => {
    c.fillStyle = bg; c.fillRect(0, 0, w, h);
    c.strokeStyle = ink; c.lineWidth = h * 0.025; c.strokeRect(h * 0.06, h * 0.06, w - h * 0.12, h - h * 0.12);
    const big = h * (sub ? 0.56 : 0.72), fam = F.sign(700), chars = Array.from(text);
    c.font = font(fam, big); c.textBaseline = 'middle'; c.textAlign = 'center';
    const adv = chars.map((ch) => c.measureText(ch).width), gap = big * 0.12, total = adv.reduce((a, b) => a + b, 0) + gap * (chars.length - 1);
    let x = (w - total) / 2;
    chars.forEach((ch, k) => {
      const cx = x + adv[k]! / 2, cy = h * (sub ? 0.42 : 0.53) + (hash(seed, k, 1) - 0.5) * big * 0.1, a = (hash(seed, k, 2) - 0.5) * 0.14;
      c.save(); c.translate(cx, cy); c.rotate(a);
      c.fillStyle = 'rgba(20,16,24,0.85)'; c.fillText(ch, big * 0.05, big * 0.05); // the shade
      c.fillStyle = ink; c.fillText(ch, 0, 0);
      c.restore();
      x += adv[k]! + gap;
    });
    if (sub) { c.fillStyle = '#1b1820'; c.font = font(F.sign(600), h * 0.15); c.fillText(sub, w / 2, h * 0.82); }
  });
}

export function buildNewsstand(drive: Drive, root: THREE.Object3D) {
  const s = drive.motion.distanceAt(AT.newsstand.passAt), stand = roadFrame(drive.route, root)(s, AT.newsstand.lateral);
  stand.name = 'newsstand';
  // (x toward the road: the stand's front; z forward, up the street: its end at -z faces the oncoming traffic)
  const g = new THREE.Group(); g.position.y = K.kerb; stand.add(g);
  const { D, L, H, counter, fascia } = K, top = H - fascia;
  const green = toon({ color: '#2f6e4c' }), trim = toon({ color: '#efe6cf' }), dark = toon({ color: '#1b1820' }), wire = toon({ color: '#3d3540' });
  // print, unlit (readable in the awning's shade), a touch under white
  const effortless = canvasTex(616, 800, (c) => { c.scale(616 / COVER.w, 800 / COVER.h); drawEffortless(c); });
  const posterTex = canvasTex(1155, 1500, (c) => { c.scale(1155 / COVER.w, 1500 / COVER.h); drawEffortless(c, { kissed: true }); }); // (she's been by: her kiss on the poster's barcode)
  const atlas = canvasTex(COLS * CELL.w, ROWS * CELL.h, (c) => {
    for (let i = 0; i < COLS * ROWS; i++) { c.save(); c.translate((i % COLS) * CELL.w, Math.floor(i / COLS) * CELL.h); c.beginPath(); c.rect(0, 0, CELL.w, CELL.h); c.clip(); drawCell(c, i); c.restore(); }
  });
  const printM = pic(atlas, { color: new THREE.Color(0.92, 0.92, 0.92) }), effM = pic(effortless, { color: new THREE.Color(0.95, 0.95, 0.95) });

  // ---- the kiosk: plinth, walls, the counter's opening in the front, the fascia over it, the roof ----
  box(g, D + 0.06, 0.1, L + 0.06, 0, 0.05, 0, dark);
  box(g, 0.08, H, L, -D / 2 + 0.04, H / 2, 0, green);
  for (const z of [-1, 1]) box(g, D, H, 0.08, 0, H / 2, z * (L / 2 - 0.04), green);
  box(g, 0.08, counter, L, D / 2 - 0.04, counter / 2, 0, green);
  box(g, 0.08, fascia, L, D / 2 - 0.04, top + fascia / 2, 0, green);
  for (const z of [-1, 1]) box(g, 0.08, top - counter, 0.95, D / 2 - 0.04, (counter + top) / 2, z * (L / 2 - 0.475), green);
  box(g, 0.36, 0.05, 1.36, D / 2 + 0.06, counter + 0.025, 0, trim); // the counter's ledge
  box(g, D + 0.36, 0.12, L + 0.3, 0.1, H + 0.06, 0, trim); // the roof, overhanging the front
  box(g, D + 0.3, 0.06, L + 0.24, 0.1, H + 0.15, 0, green);
  for (const y of [0.18, counter - 0.06]) box(g, 0.02, 0.04, L, D / 2 + 0.005, y, 0, trim); // trim lines round the front
  // inside: dark, shelves of candy and smokes behind him
  plane(g, L - 0.16, H, -D / 2 + 0.085, H / 2, 0, dark).rotation.y = Math.PI / 2;
  for (let k = 0; k < 12; k++) box(g, 0.14, 0.1, 0.2, -D / 2 + 0.2, 1.3 + Math.floor(k / 6) * 0.3, -0.75 + (k % 6) * 0.3, toon({ color: INKS[k % INKS.length]! }));

  // ---- the vendor, behind the counter, reading the paper (the cast's dark) ----
  {
    const cast = toon({ color: '#241f2a' }), v = new THREE.Group(); v.position.set(0.15, 0, 0.1); g.add(v);
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.42, 4, 10), cast); torso.position.y = 1.3; v.add(torso);
    ball(v, 0.13, 0, 1.78, 0, cast);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.07, 14), cast); cap.position.set(0, 1.87, 0); v.add(cap);
    box(v, 0.12, 0.02, 0.2, 0.15, 1.85, 0, cast); // its brim, toward the street
    const paper = new THREE.Mesh(cellGeo(MAGS + 3, 0.5, 0.42), new THREE.MeshBasicMaterial({ map: atlas, side: THREE.DoubleSide, color: new THREE.Color(0.85, 0.85, 0.85) }));
    paper.position.set(0.3, 1.4, 0); paper.rotation.set(0, Math.PI / 2, 0.15); v.add(paper);
    for (const z of [-0.26, 0.26]) ball(v, 0.05, 0.32, 1.38, z, cast); // his hands at its edges
  }

  // ---- the awning: striped canvas out over the walk from under the fascia, a scalloped valance ----
  {
    const out = 0.85, drop = 0.28, len = Math.hypot(out, drop), stripes = canvasTex(64, 512, (c) => { for (let k = 0; k < 16; k++) { c.fillStyle = k % 2 ? '#f4efe0' : '#2f6e4c'; c.fillRect(0, k * 32, 64, 32); } });
    const a = box(g, len, 0.03, L + 0.1, D / 2 + out / 2, top - drop / 2, 0, toon({ map: stripes }));
    a.rotation.z = -Math.atan2(drop, out);
    const val = canvasTex(512, 64, (c) => {
      for (let k = 0; k < 16; k++) {
        c.fillStyle = k % 2 ? '#f4efe0' : '#2f6e4c';
        c.beginPath(); c.moveTo(k * 32, 0); c.lineTo(k * 32 + 32, 0); c.lineTo(k * 32 + 32, 40); c.quadraticCurveTo(k * 32 + 16, 72, k * 32, 40); c.closePath(); c.fill();
      }
    });
    const v = plane(g, L + 0.1, 0.24, D / 2 + out + 0.01, top - drop - 0.1, 0, toon({ map: val, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide }));
    v.rotation.y = Math.PI / 2;
  }

  // ---- the signs: NEWS on the roof facing the street, and on the end facing the traffic ----
  {
    const board = new THREE.Group(); board.position.set(0.25, H + 0.2, 0); board.rotation.y = Math.PI / 2; g.add(board);
    box(board, 2.9, 0.78, 0.06, 0, 0.42, -0.04, green);
    plane(board, 2.8, 0.7, 0, 0.42, 0.0, pic(handLettered('NEWS', 'MAGAZINES · PAPERS · LOTTO', 1024, 256, '#f4ead2', '#c8202e', 3), { color: new THREE.Color(0.95, 0.95, 0.95) }));
  }
  /** The end facing the traffic, in its own frame: x to the camera's right as it comes up the street, z out of it. */
  const end = new THREE.Group(); end.position.z = -L / 2; end.rotation.y = Math.PI; g.add(end);
  plane(end, D, fascia - 0.04, 0, top + fascia / 2, 0.006, pic(handLettered('NEWS', '', 512, 136, '#f4ead2', '#c8202e', 5), { color: new THREE.Color(0.95, 0.95, 0.95) }));
  // the poster of the issue, framed, on the end's far side from the road (the van hides the near side longest)
  const PW = 1.0, PH = (PW * COVER.h) / COVER.w, px = 0.4, py = 1.36;
  box(end, PW + 0.08, PH + 0.08, 0.04, px, py, 0.02, dark);
  plane(end, PW, PH, px, py, 0.045, pic(posterTex, { color: new THREE.Color(0.95, 0.95, 0.95) }));
  /** A rack's row of covers on a wire lip, leaning back on the wall: covers (atlas cells, -1 for EFFORTLESS) centred
   *  at (x, y) in `on`'s frame, `dz` out. */
  const row = (on: THREE.Object3D, cells: number[], x: number, y: number, dz: number, size = MAG) => {
    const gap = 0.035, w = cells.length * size.w + (cells.length - 1) * gap;
    cells.forEach((cell, k) => {
      const m = new THREE.Mesh(cell < 0 ? new THREE.PlaneGeometry(size.w, size.h) : cellGeo(cell, size.w, size.h), cell < 0 ? effM : printM);
      m.position.set(x - w / 2 + size.w / 2 + k * (size.w + gap), y, dz + 0.03); m.rotation.x = -0.14; on.add(m);
    });
    box(on, w + 0.06, 0.02, 0.02, x, y - size.h / 2 + 0.02, dz + 0.07, wire);
  };
  // beside it, copies of the issue on the wire rack, the rest under them; the papers in a rack below
  row(end, [-1, -1, -1], -0.5, 1.8, 0.02);
  row(end, [-1, -1, -1], -0.5, 1.47, 0.02);
  row(end, [2, 9, 13], -0.5, 1.14, 0.02);
  box(end, D - 0.1, 0.62, 0.3, 0, 0.36, 0.15, green);
  row(end, [MAGS, MAGS + 1, MAGS + 2, MAGS + 4], 0, 0.6, 0.3, PAPER);

  // ---- the front: magazines racked either side of the counter, EFFORTLESS front and centre at eye height on the
  // traffic's side; the day's papers in two tiers under the counter ----
  const front = new THREE.Group(); front.position.x = D / 2; front.rotation.y = Math.PI / 2; g.add(front); // (x toward the end facing the traffic)
  const flank = (z: number, rows: number[][]) => rows.forEach((cells, k) => row(front, cells, z, top - 0.2 - k * 0.31, 0.0));
  flank(L / 2 - 0.475, [[0, 5, 10, 15], [-1, -1, -1, -1], [3, 7, 11, 14]]);
  flank(-(L / 2 - 0.475), [[1, 4, 6, 8], [12, 2, 9, 0], [5, 13, 3, 7]]);
  row(front, [MAGS, MAGS + 5, MAGS + 6, MAGS + 7, MAGS + 1, MAGS + 4, MAGS + 2, MAGS + 3, MAGS], 0, 0.72, 0.02, PAPER);
  row(front, [MAGS + 6, MAGS + 2, MAGS + 4, MAGS, MAGS + 7, MAGS + 3, MAGS + 1, MAGS + 5, MAGS + 6], 0, 0.3, 0.12, PAPER);
  box(front, L - 0.1, 0.04, 0.2, 0, 0.12, 0.1, green);
}
