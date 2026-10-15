// EFFORTLESS, the fashion magazine of the user's other lyric video ("I Like Ur Look", A:\Coding\LyricVideo): its cover
// as it is once printed in full, an Easter egg on verse 1's newsstand (the user, 2026-10-14: "a magazine stand somewhere
// which could have the cover of the magazine we use in that video"). Ported from that repo's spreads/cover.ts (the
// layout, the small print, the barcode, the cover lines, "Better.") and spreads/art.ts (the jacket on its hanger, her
// cut line, the scissors) with the bits of engine/drawing.ts they need, drawn exactly as there, in its page units
// (770 x 1000, origin top-left). Same fonts (this repo ships the same Bodoni Moda and Plex Mono files). Only the kiss
// is simplified: there it's the narrator's lipstick pressed in by engine/kiss.ts's wax brush; here, her lips' same
// outlines filled in pink with the creases left open (it's ~25 px on screen). Browser only (canvas).
import { F, font, measure } from '../engine/type';
import { type V2, hash, noise1, polylineLengths } from '../engine/util';

/** The cover's page, in its units. */
export const COVER = { w: 770, h: 1000 } as const;
/** Its print palette (that repo's engine/palette.ts). */
const HEX = { paper: '#F2EDE4', ink: '#141414', graphite: '#8A847A', lipstick: '#FF2E88', lipstickDeep: '#C8155F' } as const;
const HAIRLINE_PU = 0.5;

// ---- the art (spreads/art.ts, unchanged) ----
const HANGER = [
  'M396 286 L396 272 C396 258 410 254 414 244 C418 234 408 224 398 228',
  'M396 286 L266 346 Q260 350 266 352 L526 352 Q532 350 526 346 Z',
];
const OUTLINE = ['M298 350 C282 356 274 372 272 392 L264 690 L304 696 L312 468 C318 500 324 528 323 556 C322 600 316 660 313 712 L366 716 C380 690 392 650 396 612 C400 650 412 690 426 716 L479 712 C476 660 470 600 469 556 C468 528 474 500 480 468 L488 696 L528 690 L520 392 C518 372 510 356 494 350 L440 340 C428 348 364 348 352 340 Z'];
const LAPELS = [
  'M352 340 L338 386 L346 395 L328 402 C332 452 360 514 396 556',
  'M440 340 L454 386 L446 395 L464 402 C460 452 432 514 396 556',
  'M364 346 L396 556', 'M428 346 L396 556',
  'M396 556 L396 612',
];
const circle = (cx: number, cy: number, r: number, n = 32): V2[] => {
  const pts: V2[] = [];
  for (let k = 0; k < n; k++) pts.push({ x: cx + r * Math.cos((k / n) * 2 * Math.PI), y: cy + r * Math.sin((k / n) * 2 * Math.PI) });
  pts.push({ ...pts[0]! });
  return pts;
};
const POCKETS = [
  'M326 648 L376 648 L376 662 L326 662 Z', 'M416 648 L466 648 L466 662 L416 662 Z',
  'M438 503 L467 497 L468 505 L439 511 Z',
  circle(396, 566, 5, 20), circle(396, 604, 5, 20),
];
const STITCHES = [
  'M318 706 L364 710', 'M428 710 L474 706',
  'M266 682 L305 688', 'M487 688 L526 682',
  'M355 350 L343 384', 'M437 350 L449 384',
  'M334 408 C338 454 364 512 393 548', 'M458 408 C454 454 428 512 399 548',
  'M329 655 L373 655', 'M419 655 L463 655',
];
const SHADE: V2[][] = [
  [{ x: 312, y: 468 }, { x: 316, y: 491 }, { x: 320, y: 513 }, { x: 323, y: 535 }, { x: 323, y: 556 }, { x: 321, y: 592 }, { x: 319, y: 631 },
    { x: 316, y: 672 }, { x: 313, y: 712 }, { x: 325, y: 712 }, { x: 328, y: 672 }, { x: 331, y: 631 }, { x: 333, y: 592 }, { x: 335, y: 556 },
    { x: 335, y: 535 }, { x: 332, y: 513 }, { x: 328, y: 491 }, { x: 324, y: 472 }],
  [{ x: 272, y: 392 }, { x: 284, y: 396 }, { x: 276, y: 690 }, { x: 264, y: 690 }],
  [{ x: 440, y: 340 }, { x: 454, y: 386 }, { x: 446, y: 395 }, { x: 420, y: 398 }, { x: 428, y: 346 }],
];
const HER = [[
  'M608 274 C623 274 636 284 638 300 L641 344 C641 350 636 353 630 353 L618 353',
  'L617 362 C630 364 648 366 657 374',
  'C662 378 664 386 664 398 L671 566 C673 580 672 596 667 600 C663 602 660 596 660 586 L659 568 L651 412',
  'C650 432 634 454 632 478 C630 500 652 516 653 544 C653 590 647 660 642 706',
  'L634 706 C637 736 634 790 628 828 C630 838 629 848 624 854 C620 849 618 838 619 828 C617 790 615 740 614 706',
  'L602 706',
  'C601 740 599 790 597 828 C598 838 596 849 592 854 C587 848 586 838 588 828 C582 790 579 736 582 706',
  'L574 706 C569 660 563 590 563 544 C564 516 586 500 584 478 C582 454 566 432 565 412',
  'L557 568 L556 586 C556 596 553 602 549 600 C544 596 543 580 545 566 L552 398',
  'C552 386 554 378 559 374 C568 366 586 364 599 362 L598 353 L586 353 C580 353 575 350 575 344 L578 300 C580 284 593 274 608 274 Z',
].join(' ')];
const SCISSORS = [circle(654, 266, 5, 16), circle(668, 272, 5, 16), 'M658 270 L684 254', 'M664 268 L686 264'];

// ---- drawing (engine/drawing.ts: the path parser, hand-inked wobble, hatching) ----
const CURVE_SEGMENTS = 16;
const TOKEN = /[MLHVCQZmlhvcqz]|-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/g;
/** SVG path data (M L H V C Q Z, absolute) -> one polyline per subpath. (The art is all absolute.) */
function parsePath(d: string): V2[][] {
  const tok = d.match(TOKEN) ?? [], out: V2[][] = [];
  let cur: V2[] = [], x = 0, y = 0, sx = 0, sy = 0, i = 0, cmd = '';
  const num = () => +tok[i++]!;
  const flush = () => { if (cur.length > 1) out.push(cur); cur = []; };
  while (i < tok.length) {
    if (/^[A-Za-z]$/.test(tok[i]!)) cmd = tok[i++]!;
    switch (cmd) {
      case 'M': flush(); x = num(); y = num(); sx = x; sy = y; cur.push({ x, y }); cmd = 'L'; break;
      case 'L': x = num(); y = num(); cur.push({ x, y }); break;
      case 'H': x = num(); cur.push({ x, y }); break;
      case 'V': y = num(); cur.push({ x, y }); break;
      case 'C': {
        const x1 = num(), y1 = num(), x2 = num(), y2 = num(), x3 = num(), y3 = num();
        for (let k = 1; k <= CURVE_SEGMENTS; k++) {
          const t = k / CURVE_SEGMENTS, u = 1 - t;
          cur.push({ x: u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3, y: u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3 });
        }
        x = x3; y = y3;
        break;
      }
      case 'Q': {
        const x1 = num(), y1 = num(), x2 = num(), y2 = num();
        for (let k = 1; k <= CURVE_SEGMENTS; k++) { const t = k / CURVE_SEGMENTS, u = 1 - t; cur.push({ x: u * u * x + 2 * u * t * x1 + t * t * x2, y: u * u * y + 2 * u * t * y1 + t * t * y2 }); }
        x = x2; y = y2;
        break;
      }
      case 'Z': cur.push({ x: sx, y: sy }); x = sx; y = sy; flush(); cur = [{ x, y }]; break;
      default: throw new Error(`effortless: unsupported path command "${cmd}"`);
    }
  }
  flush();
  return out;
}
function subdivide(pts: readonly V2[], maxSeg: number): V2[] {
  const out: V2[] = [pts[0]!];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!, b = pts[i]!, n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / maxSeg));
    for (let k = 1; k < n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
    out.push(b);
  }
  return out;
}
/** A drawing's polylines, hand-inked: wobbled by `wobble` pu (makeDrawing's, same seeds, so the same line as there). */
function strokesOf(items: readonly (string | readonly V2[])[], wobble = 0, seed = 1): (readonly V2[])[] {
  const strokes = items.flatMap((it) => (typeof it === 'string' ? parsePath(it) : [it]));
  if (!(wobble > 0)) return strokes;
  return strokes.map((p, si) => {
    const closed = p.length > 2 && Math.hypot(p[0]!.x - p[p.length - 1]!.x, p[0]!.y - p[p.length - 1]!.y) < 1e-9;
    const q = subdivide(p, 6), L = polylineLengths(q);
    const r = q.map((pt, k) => ({ x: pt.x + wobble * noise1(L[k]! / 40, seed + si * 13), y: pt.y + wobble * noise1(L[k]! / 40, seed + si * 13 + 7) }));
    if (closed) r[r.length - 1] = { ...r[0]! };
    return r;
  });
}
function stroke(c: CanvasRenderingContext2D, strokes: readonly (readonly V2[])[]) {
  c.beginPath();
  for (const s of strokes) { c.moveTo(s[0]!.x, s[0]!.y); for (let k = 1; k < s.length; k++) c.lineTo(s[k]!.x, s[k]!.y); }
  c.stroke();
}
function hatchLines(poly: readonly V2[], angle: number, spacing: number): V2[][] {
  const ca = Math.cos(angle), sa = Math.sin(angle), P = poly.map((p) => ({ u: p.x * ca + p.y * sa, v: -p.x * sa + p.y * ca }));
  let vmin = Infinity, vmax = -Infinity;
  for (const p of P) { vmin = Math.min(vmin, p.v); vmax = Math.max(vmax, p.v); }
  const out: V2[][] = [];
  for (let v = Math.ceil(vmin / spacing) * spacing; v <= vmax; v += spacing) {
    const xs: number[] = [];
    for (let k = 0; k < P.length; k++) {
      const a = P[k]!, b = P[(k + 1) % P.length]!;
      if ((a.v <= v && b.v > v) || (b.v <= v && a.v > v)) xs.push(a.u + ((v - a.v) / (b.v - a.v)) * (b.u - a.u));
    }
    xs.sort((m, n) => m - n);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const u0 = xs[k]!, u1 = xs[k + 1]!;
      if (u1 - u0 > 1e-9) out.push([{ x: u0 * ca - v * sa, y: u0 * sa + v * ca }, { x: u1 * ca - v * sa, y: u1 * sa + v * ca }]);
    }
  }
  return out;
}

// ---- the kiss (engine/kiss.ts's lips, in mouth-width units: x right, y down, origin mid-mouth) ----
function bez(q: number[], n = 20): V2[] {
  const out: V2[] = [{ x: q[0]!, y: q[1]! }];
  for (let i = 2; i + 5 < q.length; i += 6) {
    const x0 = q[i - 2]!, y0 = q[i - 1]!, x1 = q[i]!, y1 = q[i + 1]!, x2 = q[i + 2]!, y2 = q[i + 3]!, x3 = q[i + 4]!, y3 = q[i + 5]!;
    for (let k = 1; k <= n; k++) {
      const t = k / n, u = 1 - t;
      out.push({ x: u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3, y: u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3 });
    }
  }
  return out;
}
const LIPS = [
  { outer: bez([-0.48, 0.01, -0.4, -0.02, -0.3, -0.17, -0.16, -0.18, -0.08, -0.19, -0.035, -0.14, 0, -0.125, 0.035, -0.145, 0.085, -0.195, 0.165, -0.185, 0.31, -0.175, 0.41, -0.025, 0.48, 0.005]),
    inner: bez([-0.48, 0.01, -0.34, -0.025, -0.14, -0.05, 0.02, 0.01, 0.17, -0.055, 0.34, -0.03, 0.48, 0.005]), focus: { x: 0, y: 0.42 }, creases: 30 },
  { outer: bez([-0.45, 0.035, -0.39, 0.18, -0.2, 0.29, 0.02, 0.285, 0.22, 0.285, 0.39, 0.16, 0.44, 0.03]),
    inner: bez([-0.45, 0.035, -0.3, 0.06, -0.14, 0.03, 0, 0.035, 0.15, 0.03, 0.3, 0.055, 0.44, 0.03]), focus: { x: 0, y: -0.36 }, creases: 34 },
];
/** The narrator's kiss on the barcode (cover.ts KISS), simplified: each lip filled in lipstick, a deeper rim, the
 *  skin's creases fanning out from its focus left as paper. */
function kiss(c: CanvasRenderingContext2D, x: number, y: number, size: number, rot: number) {
  c.save();
  c.translate(x, y); c.rotate(rot); c.scale(size, size);
  LIPS.forEach((l, li) => {
    const p = new Path2D();
    p.moveTo(l.outer[0]!.x, l.outer[0]!.y);
    for (const q of l.outer) p.lineTo(q.x, q.y + 0.004 * noise1(q.x * 43, li));
    for (let k = l.inner.length - 1; k >= 0; k--) p.lineTo(l.inner[k]!.x, l.inner[k]!.y);
    p.closePath();
    c.save();
    c.clip(p);
    c.fillStyle = HEX.lipstick; c.globalAlpha = 0.88; c.fill(p);
    c.globalAlpha = 0.35; c.strokeStyle = HEX.lipstickDeep; c.lineWidth = 0.03; c.stroke(p);
    c.globalAlpha = 0.75; c.strokeStyle = HEX.paper; c.lineCap = 'round';
    for (let k = 0; k < l.creases; k++) {
      const u = -0.46 + (0.92 * (k + 0.5 + (hash(li, k, 1) - 0.5) * 0.8)) / l.creases, dx = u - l.focus.x, dy = (li ? 0.15 : -0.08) - l.focus.y, n = Math.hypot(dx, dy);
      const a = 0.05 + 0.2 * hash(li, k, 2), b = a + 0.25 + 0.35 * hash(li, k, 3), my = li ? 0.15 : -0.08;
      c.lineWidth = 0.004 + 0.007 * hash(li, k, 4);
      c.beginPath(); c.moveTo(u + (dx / n) * (0.2 - a), my + (dy / n) * (0.2 - a)); c.lineTo(u + (dx / n) * (0.2 - b), my + (dy / n) * (0.2 - b)); c.stroke();
    }
    c.restore();
  });
  c.restore();
}

// ---- the cover (spreads/cover.ts's drawPrint and drawMarks, at the end of its spread: everything printed) ----
const MAST = { x: 48, y: 150, w: 674 };
const BARCODE = { x: 604, y: 892, w: 112, h: 52 };
const KISS = { x: 660, y: 918, size: 140, rot: -0.14 };
const COVER_ITALIC = () => F.bodoni(700, { italic: true });
const GROUPS = () => [
  { s: strokesOf(HANGER, 0.5, 11), width: 1.6, dash: [] as number[] },
  { s: strokesOf(OUTLINE, 0.7, 12), width: 2.0, dash: [] },
  { s: strokesOf(LAPELS, 0.6, 13), width: 1.5, dash: [] },
  { s: strokesOf(POCKETS, 0.4, 14), width: 1.3, dash: [] },
  { s: strokesOf(STITCHES, 0, 15), width: 0.9, dash: [3, 3] },
  { s: SHADE.flatMap((p) => hatchLines(p, 1.1, 6)), width: 0.7, dash: [] },
];

/** Draw the cover into `c` in its own units (scale the context to the canvas first): the paper, the print, and with
 *  `kissed`, her kiss on the barcode as the cover is left at the end of the opening. */
export function drawEffortless(c: CanvasRenderingContext2D, o: { kissed?: boolean } = {}) {
  c.save();
  c.fillStyle = HEX.paper; c.fillRect(0, 0, COVER.w, COVER.h);
  c.textBaseline = 'alphabetic';
  c.fillStyle = HEX.ink;
  const mast = F.bodoni(900);
  c.font = font(mast, 100 * (MAST.w / measure('EFFORTLESS', mast, 100)));
  c.textAlign = 'left';
  c.fillText('EFFORTLESS', MAST.x, MAST.y);
  const mono = (text: string, x: number, y: number, align: CanvasTextAlign, size: number) => { c.font = font(F.mono(600), size); c.textAlign = align; c.fillText(text, x, y); };
  mono('THE FALL ISSUE · NO. 47', 48, 182, 'left', 11);
  mono('OCTOBER 11, 2026', 722, 182, 'right', 11);
  mono('+ HOW TO BE SEEN, P. 2', 722, 212, 'right', 10);
  c.textAlign = 'left';
  c.font = font(F.mono(500), 9);
  c.fillText('$9.99 US · $12.99 CAN', BARCODE.x, BARCODE.y - 10);
  for (let x = BARCODE.x, i = 0; x < BARCODE.x + BARCODE.w; i++) {
    const w = 1 + Math.floor(hash(i, 4) * 3);
    if (i % 2 === 0) c.fillRect(x, BARCODE.y, w, BARCODE.h);
    x += w;
  }
  c.font = font(F.mono(400), 8);
  c.fillText('0 74470 47000 9', BARCODE.x, BARCODE.y + BARCODE.h + 12);
  // him: the jacket on its hanger (the coat opaque: filled with paper over the hanger inside it)
  c.strokeStyle = HEX.ink; c.lineJoin = 'round'; c.lineCap = 'round';
  GROUPS().forEach((g, i) => {
    if (i === 1) { c.fillStyle = HEX.paper; c.fill(new Path2D(OUTLINE[0])); c.fillStyle = HEX.ink; }
    c.lineWidth = g.width; c.setLineDash(g.dash); stroke(c, g.s);
  });
  c.setLineDash([]);
  // the cover lines, outlined by a hairline (the display cut's t crossbars)
  const italic = COVER_ITALIC();
  c.lineWidth = HAIRLINE_PU;
  for (const l of [{ text: 'The Look', x: 48, y: 470 }, { text: 'of the', x: 68, y: 524 }, { text: 'Season', x: 48, y: 578 }]) {
    c.font = font(italic, 50); c.fillText(l.text, l.x, l.y); c.strokeText(l.text, l.x, l.y);
  }
  c.font = font(F.mono(600), 9); c.fillText('HIM, WORN WELL — P. 6', 48, 610);
  // her: a dotted cut line round an empty space, and the scissors
  c.strokeStyle = HEX.graphite; c.lineWidth = 1.2; c.setLineDash([5, 5]);
  stroke(c, strokesOf(HER, 0.3, 21));
  c.setLineDash([]); c.lineWidth = 1;
  stroke(c, strokesOf(SCISSORS, 0, 22));
  // "Better." (its lyric, sung in full)
  c.font = font(italic, 64); c.fillStyle = HEX.ink; c.strokeStyle = HEX.ink; c.lineWidth = HAIRLINE_PU;
  c.fillText('Better.', 48, 905); c.strokeText('Better.', 48, 905);
  if (o.kissed) kiss(c, KISS.x, KISS.y, KISS.size, KISS.rot);
  c.restore();
}
