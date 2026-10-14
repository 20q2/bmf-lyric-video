// The billboards' ads (drive/ads.ts picks which): each a 70s print ad — a colour field, the product drawn on the right
// in a spotlight, a small maker's mark, and the lyric as its headline on the left (carrierart.ts sets it). The product
// is all shape, no words. Browser only (canvas).
import type { Ad } from '../drive/ads';

/** Per ad: its colour field, its headline's colours (sung, the word being sung), and the spotlight behind the product. */
export const AD_STYLE: Record<Ad, { bg: string; ink: string; now: string; spot: string }> = {
  him: { bg: '#f6b34a', ink: '#16131a', now: '#c8102e', spot: '#ffd27a' },
  bandage: { bg: '#9cc3e0', ink: '#16131a', now: '#c8102e', spot: '#bcd8ec' },
  tape: { bg: '#f6dd8f', ink: '#16131a', now: '#c8102e', spot: '#fbeab6' },
  keys: { bg: '#16131a', ink: '#f3ead2', now: '#ffd65a', spot: '#2c2433' },
  heart: { bg: '#ff7aa8', ink: '#36143c', now: '#ffffff', spot: '#ffa0c2' },
  phone: { bg: '#ff5a36', ink: '#fff3e0', now: '#ffd65a', spot: '#ff8a5c' },
  cash: { bg: '#1f5c3c', ink: '#f3ead2', now: '#f6c445', spot: '#2e7a52' },
  car: { bg: '#f6dd8f', ink: '#36143c', now: '#c8102e', spot: '#fbeab6' },
  lipstick: { bg: '#ff7aa8', ink: '#36143c', now: '#ffffff', spot: '#ffa0c2' },
  perfume: { bg: '#cdb8e6', ink: '#36143c', now: '#c8102e', spot: '#e2d4f2' },
  shades: { bg: '#9cc3e0', ink: '#16131a', now: '#ff5a36', spot: '#ffd27a' },
  diamond: { bg: '#22284a', ink: '#f3ead2', now: '#ff7aa8', spot: '#343c6a' },
  cocktail: { bg: '#2b8a87', ink: '#fbf7ee', now: '#f6dd8f', spot: '#3aa6a2' },
  heels: { bg: '#16131a', ink: '#f3ead2', now: '#ff3e6c', spot: '#2c2433' },
  roses: { bg: '#f3e4c4', ink: '#36143c', now: '#c8102e', spot: '#fbf1dc' },
  chain: { bg: '#3d2a5c', ink: '#f6dd8f', now: '#ffffff', spot: '#523a78' },
  record: { bg: '#e3907a', ink: '#16131a', now: '#ffffff', spot: '#eeaa96' },
  suitcase: { bg: '#a9d8c6', ink: '#16131a', now: '#c8102e', spot: '#c4e6d8' },
  crown: { bg: '#7a1432', ink: '#f6dd8f', now: '#ffffff', spot: '#9a2246' },
};

/** Draw the ad's product and its mark (not its headline) on a canvas W x H, the headline taking the left `text` share
 *  of the width; on its own colour field (a billboard), or on the face's own ground (`ink`: the face's type colour —
 *  a roadside sign, a painted wall, a shop's fascia). */
export function drawAd(c: CanvasRenderingContext2D, ad: Ad, W: number, H: number, text: number, ink?: string) {
  const st = ink ? { ...AD_STYLE[ad], ink } : AD_STYLE[ad];
  if (!ink) { c.fillStyle = st.bg; c.fillRect(0, 0, W, H); }
  const x0 = W * text, iw = W - x0, cx = x0 + iw / 2, cy = H * 0.5, R = Math.min(iw, H) * 0.42;
  // the spotlight
  c.fillStyle = st.spot; c.beginPath(); c.arc(cx, cy, R * 1.05, 0, Math.PI * 2); c.fill();
  c.save(); c.translate(cx, cy); c.scale(R / 100, R / 100); // the product, drawn in a 200 x 200 box round (0, 0)
  PRODUCT[ad](c);
  c.restore();
  // a hairline between headline and product
  c.fillStyle = st.ink; c.globalAlpha = 0.35; c.fillRect(x0 - W * 0.004, H * 0.15, W * 0.004, H * 0.7); c.globalAlpha = 1;
}

/** A route sign's art, on the right: a shield and an arrow ahead, in the sign's white. */
export function drawRoute(c: CanvasRenderingContext2D, W: number, H: number, text: number) {
  // (sized to fit both, shield and arrow, inside the panel and the sign's border)
  const x0 = W * text, cx = x0 + (W - x0) / 2, cy = H / 2, R = Math.min((W - x0) * 0.24, H * 0.3);
  c.fillStyle = '#f4f4f0';
  const sx = cx - R * 0.95, ax = cx + R * 0.95;
  c.beginPath(); c.moveTo(sx - R * 0.7, cy - R * 0.8); c.lineTo(sx + R * 0.7, cy - R * 0.8); c.lineTo(sx + R * 0.7, cy + R * 0.2);
  c.quadraticCurveTo(sx + R * 0.7, cy + R, sx, cy + R); c.quadraticCurveTo(sx - R * 0.7, cy + R, sx - R * 0.7, cy + R * 0.2); c.fill();
  c.fillStyle = '#1f6b44'; star(c, sx, cy, R * 0.38, R * 0.16, 5);
  c.fillStyle = '#f4f4f0';
  c.beginPath(); c.moveTo(ax, cy - R); c.lineTo(ax + R * 0.65, cy - R * 0.25); c.lineTo(ax + R * 0.22, cy - R * 0.25);
  c.lineTo(ax + R * 0.22, cy + R); c.lineTo(ax - R * 0.22, cy + R); c.lineTo(ax - R * 0.22, cy - R * 0.25); c.lineTo(ax - R * 0.65, cy - R * 0.25); c.fill();
}

function star(c: CanvasRenderingContext2D, x: number, y: number, r: number, r2: number, n: number) {
  c.beginPath();
  for (let i = 0; i < n * 2; i++) { const a = (i * Math.PI) / n - Math.PI / 2, rr = i % 2 ? r2 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  c.closePath(); c.fill();
}
const rr = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => { c.beginPath(); c.roundRect(x, y, w, h, r); c.fill(); };

const PRODUCT: Record<Ad, (c: CanvasRenderingContext2D) => void> = {
  him: (c) => { // him, by his things, no face (a profile read as someone else): a crown, his shades, a rope chain
    c.fillStyle = '#f6c445';
    c.beginPath(); c.moveTo(-58, -36); c.lineTo(-62, -82); c.lineTo(-34, -56); c.lineTo(0, -92); c.lineTo(34, -56); c.lineTo(62, -82); c.lineTo(58, -36); c.closePath(); c.fill(); // the crown
    c.fillStyle = '#c8102e'; for (const x of [-34, 0, 34]) { c.beginPath(); c.arc(x, -48, 6, 0, Math.PI * 2); c.fill(); } // its jewels
    c.fillStyle = '#16131a'; rr(c, -64, -36, 128, 12, 4); // its band
    // the shades: two dark lenses in a thin frame, the bridge between
    c.fillStyle = '#16131a';
    for (const x of [-38, 38]) { c.beginPath(); c.ellipse(x, 2, 34, 24, 0, 0, Math.PI * 2); c.fill(); }
    c.fillRect(-8, -4, 16, 6); c.fillRect(-82, -6, 14, 5); c.fillRect(68, -6, 14, 5);
    c.fillStyle = 'rgba(255,255,255,0.35)'; for (const x of [-38, 38]) { c.beginPath(); c.ellipse(x - 10, -8, 10, 6, -0.5, 0, Math.PI * 2); c.fill(); }
    // the chain, a rope of links hanging below
    c.strokeStyle = '#f6c445'; c.lineWidth = 7; c.setLineDash([9, 5]); c.beginPath(); c.arc(0, 30, 58, 0.25, Math.PI - 0.25); c.stroke(); c.setLineDash([]);
    c.fillStyle = '#f6c445'; rr(c, -16, 76, 32, 22, 5); c.fillStyle = '#16131a'; c.font = 'bold 18px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('BMF', 0, 88);
  },
  bandage: (c) => { // two crossed bandages
    for (const a of [0.7, -0.7]) {
      c.save(); c.rotate(a); c.fillStyle = '#f3d2b0'; rr(c, -85, -24, 170, 48, 24);
      c.fillStyle = '#e8bc94'; rr(c, -26, -18, 52, 36, 6); c.fillStyle = '#c99a72';
      for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(-14 + (i % 3) * 14, -8 + Math.floor(i / 3) * 16, 3, 0, Math.PI * 2); c.fill(); }
      c.restore();
    }
  },
  tape: (c) => { // a measuring tape, pulled out
    c.fillStyle = '#f6c445'; c.fillRect(-10, 22, 110, 26);
    c.fillStyle = '#16131a'; for (let i = 0; i < 11; i++) c.fillRect(-6 + i * 10, 22, 2, i % 2 ? 9 : 15);
    c.fillStyle = '#c8102e'; rr(c, -95, -45, 100, 100, 22);
    c.fillStyle = '#16131a'; c.beginPath(); c.arc(-45, 5, 20, 0, Math.PI * 2); c.fill();
  },
  keys: (c) => { // car keys on a ring, a tag
    c.strokeStyle = '#f6c445'; c.lineWidth = 7; c.beginPath(); c.arc(-30, -40, 24, 0, Math.PI * 2); c.stroke();
    for (const [a, l] of [[0.5, 85], [0.95, 70]] as const) {
      c.save(); c.translate(-30, -40); c.rotate(a); c.fillStyle = '#d8d2c4'; rr(c, 18, -12, 34, 24, 6); c.fillRect(48, -6, l - 30, 12);
      for (let i = 0; i < 4; i++) c.fillRect(56 + i * 10, 6, 6, 8); c.restore();
    }
    c.fillStyle = '#c8102e'; rr(c, -95, -10, 50, 60, 6);
  },
  heart: (c) => { // a heart, glossy
    c.fillStyle = '#c8102e';
    c.beginPath(); c.moveTo(0, 75); c.bezierCurveTo(-110, 0, -60, -90, 0, -35); c.bezierCurveTo(60, -90, 110, 0, 0, 75); c.fill();
    c.fillStyle = '#ffffff'; c.globalAlpha = 0.5; c.beginPath(); c.ellipse(-38, -30, 14, 8, -0.7, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
  },
  phone: (c) => { // a rotary telephone
    c.fillStyle = '#fff3e0';
    c.beginPath(); c.moveTo(-70, 70); c.lineTo(70, 70); c.lineTo(50, -5); c.lineTo(-50, -5); c.closePath(); c.fill();
    c.fillStyle = '#36143c'; c.beginPath(); c.arc(0, 32, 28, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fff3e0'; for (let i = 0; i < 10; i++) { const a = -Math.PI * 0.8 + i * 0.16 * Math.PI; c.beginPath(); c.arc(Math.cos(a) * 19, 32 + Math.sin(a) * 19, 4.5, 0, Math.PI * 2); c.fill(); }
    c.lineWidth = 20; c.strokeStyle = '#fff3e0'; c.lineCap = 'round';
    c.beginPath(); c.arc(0, -20, 62, Math.PI * 1.08, Math.PI * 1.92); c.stroke();
    rr(c, -82, -48, 34, 22, 8); rr(c, 48, -48, 34, 22, 8);
  },
  cash: (c) => { // a stack of bills and a gold coin
    for (let i = 2; i >= 0; i--) {
      c.save(); c.translate(-18 + i * 9, 18 - i * 12); c.rotate(-0.12 + i * 0.06);
      c.fillStyle = '#9fc59a'; rr(c, -70, -32, 140, 64, 4);
      c.strokeStyle = '#3d6b48'; c.lineWidth = 5; c.strokeRect(-62, -24, 124, 48);
      c.fillStyle = '#3d6b48'; c.beginPath(); c.ellipse(0, 0, 16, 20, 0, 0, Math.PI * 2); c.fill();
      c.restore();
    }
    c.fillStyle = '#f6c445'; c.beginPath(); c.arc(52, 42, 34, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#c9952a'; c.beginPath(); c.arc(52, 42, 25, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#f6c445'; star(c, 52, 42, 17, 7, 5);
  },
  car: (c) => { // the Impala, side on
    c.fillStyle = '#c8102e';
    c.beginPath(); c.moveTo(-95, 20); c.lineTo(-92, -2); c.lineTo(-40, -8); c.lineTo(-22, -30); c.lineTo(22, -30); c.lineTo(36, -8); c.lineTo(92, -4); c.lineTo(96, 20); c.closePath(); c.fill();
    c.fillStyle = '#e6e1d6'; c.fillRect(-90, 2, 180, 4);
    for (const x of [-55, 55]) { c.fillStyle = '#16131a'; c.beginPath(); c.arc(x, 22, 17, 0, Math.PI * 2); c.fill(); c.fillStyle = '#f4efe4'; c.beginPath(); c.arc(x, 22, 10, 0, Math.PI * 2); c.fill(); c.fillStyle = '#aaa498'; c.beginPath(); c.arc(x, 22, 5, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#36143c'; c.fillRect(-120, 40, 240, 3);
  },
  lipstick: (c) => { // a lipstick, uncapped
    c.fillStyle = '#d9a640'; rr(c, -26, 10, 52, 75, 4);
    c.fillStyle = '#16131a'; rr(c, -22, -20, 44, 34, 3);
    c.fillStyle = '#c8102e'; c.beginPath(); c.moveTo(-18, -20); c.lineTo(-18, -70); c.lineTo(18, -88); c.lineTo(18, -20); c.closePath(); c.fill();
    c.fillStyle = '#ffffff'; c.globalAlpha = 0.5; c.fillRect(-12, -66, 5, 44); c.globalAlpha = 1;
  },
  perfume: (c) => { // a faceted bottle
    c.fillStyle = '#36143c'; rr(c, -14, -85, 28, 26, 4);
    c.fillStyle = '#f4b6c2'; c.beginPath(); c.moveTo(-55, -55); c.lineTo(55, -55); c.lineTo(70, 75); c.lineTo(-70, 75); c.closePath(); c.fill();
    c.fillStyle = '#e3907a'; c.beginPath(); c.moveTo(0, -55); c.lineTo(55, -55); c.lineTo(70, 75); c.lineTo(10, 75); c.closePath(); c.fill();
    c.fillStyle = '#ffffff'; c.globalAlpha = 0.55; c.beginPath(); c.moveTo(-40, -45); c.lineTo(-28, -45); c.lineTo(-38, 60); c.lineTo(-50, 60); c.closePath(); c.fill(); c.globalAlpha = 1;
  },
  shades: (c) => { // sunglasses, the sunset in their lenses
    c.fillStyle = '#16131a'; c.fillRect(-90, -26, 180, 10);
    for (const x of [-48, 48]) {
      c.save(); c.beginPath(); c.ellipse(x, 6, 42, 32, 0, 0, Math.PI * 2); c.clip();
      const bands = ['#36143c', '#7c3a7e', '#d9567a', '#ff9a6a', '#ffe0a6'];
      bands.forEach((b, i) => { c.fillStyle = b; c.fillRect(x - 45, -26 + i * 14, 90, 14); });
      c.restore();
      c.strokeStyle = '#16131a'; c.lineWidth = 7; c.beginPath(); c.ellipse(x, 6, 42, 32, 0, 0, Math.PI * 2); c.stroke();
    }
  },
  diamond: (c) => { // a brilliant, sparkling
    c.fillStyle = '#e8f4ff'; c.beginPath(); c.moveTo(-70, -25); c.lineTo(-40, -60); c.lineTo(40, -60); c.lineTo(70, -25); c.lineTo(0, 75); c.closePath(); c.fill();
    c.strokeStyle = '#9cc3e0'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(-70, -25); c.lineTo(70, -25); c.moveTo(-40, -60); c.lineTo(-20, -25); c.lineTo(0, -60); c.lineTo(20, -25); c.lineTo(40, -60);
    c.moveTo(-20, -25); c.lineTo(0, 75); c.lineTo(20, -25); c.stroke();
    c.fillStyle = '#ffffff'; star(c, 52, -62, 20, 4, 4); star(c, -60, 30, 12, 3, 4);
  },
  heels: (c) => { // a red stiletto
    c.fillStyle = '#ff3e6c';
    c.beginPath(); c.moveTo(-80, 40); c.quadraticCurveTo(-60, -10, -10, 0); c.quadraticCurveTo(40, 10, 70, -50); c.lineTo(80, -40);
    c.quadraticCurveTo(60, 30, 30, 45); c.lineTo(-80, 50); c.closePath(); c.fill();
    c.fillRect(56, -42, 9, 100); // the heel
    c.fillStyle = '#16131a'; c.globalAlpha = 0.35; c.beginPath(); c.ellipse(-30, 20, 30, 8, -0.2, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
  },
  roses: (c) => { // three roses: cupped petals, leaves on the stems
    c.strokeStyle = '#3d6b48'; c.lineWidth = 7;
    for (const [x, a] of [[-30, -0.3], [0, 0], [30, 0.3]] as const) { c.beginPath(); c.moveTo(x * 0.3, 85); c.lineTo(x + Math.sin(a) * 40, -30); c.stroke(); }
    c.fillStyle = '#3d6b48'; for (const [x, y, a] of [[-14, 30, -0.8], [12, 45, 0.8]] as const) { c.beginPath(); c.ellipse(x, y, 16, 7, a, 0, Math.PI * 2); c.fill(); }
    for (const [x, y] of [[-42, -40], [0, -58], [42, -40]] as const) {
      c.fillStyle = '#9e0c24'; c.beginPath(); c.moveTo(x - 26, y - 8); c.quadraticCurveTo(x, y + 40, x + 26, y - 8); c.quadraticCurveTo(x, y + 4, x - 26, y - 8); c.fill(); // the cup
      c.fillStyle = '#c8102e'; c.beginPath(); c.ellipse(x, y - 8, 22, 15, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#7a0a1c'; c.lineWidth = 3.5; c.beginPath(); c.arc(x, y - 8, 11, 3.6, 8.2); c.stroke(); c.beginPath(); c.arc(x + 2, y - 9, 5, 0, 5); c.stroke();
    }
  },
  chain: (c) => { // a gold rope chain, a pendant
    c.strokeStyle = '#f6c445'; c.lineWidth = 10;
    for (let i = 0; i < 14; i++) { const a = Math.PI * (0.1 + 0.8 * (i / 13)), x = Math.cos(a) * 80, y = -Math.sin(a) * -60 - 40; c.beginPath(); c.ellipse(x, y, 10, 6, a, 0, Math.PI * 2); c.stroke(); }
    c.fillStyle = '#f6c445'; star(c, 0, 50, 34, 14, 5);
  },
  record: (c) => { // a vinyl record and its label
    c.fillStyle = '#16131a'; c.beginPath(); c.arc(0, 0, 88, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#3a3240'; c.lineWidth = 2; for (let r = 40; r < 86; r += 7) { c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke(); }
    c.fillStyle = '#ff5a36'; c.beginPath(); c.arc(0, 0, 30, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#16131a'; c.beginPath(); c.arc(0, 0, 4, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ffffff'; c.globalAlpha = 0.18; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 86, -1.2, -0.7); c.fill(); c.globalAlpha = 1;
  },
  suitcase: (c) => { // a hard-shell suitcase, stickered
    c.fillStyle = '#c8102e'; rr(c, -80, -45, 160, 115, 14);
    c.strokeStyle = '#16131a'; c.lineWidth = 8; c.beginPath(); c.roundRect(-28, -75, 56, 34, 10); c.stroke();
    c.fillStyle = '#7a0a1c'; c.fillRect(-80, 5, 160, 8);
    c.fillStyle = '#f6dd8f'; c.beginPath(); c.arc(-40, 35, 16, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#9cc3e0'; rr(c, 20, 22, 40, 26, 4);
  },
  crown: (c) => { // a crown
    c.fillStyle = '#f6c445';
    c.beginPath(); c.moveTo(-80, 50); c.lineTo(-90, -40); c.lineTo(-45, 0); c.lineTo(0, -60); c.lineTo(45, 0); c.lineTo(90, -40); c.lineTo(80, 50); c.closePath(); c.fill();
    c.fillRect(-82, 50, 164, 22);
    for (const [x, col] of [[-45, '#c8102e'], [0, '#2b78a6'], [45, '#c8102e']] as const) { c.fillStyle = col; c.beginPath(); c.arc(x, 60, 8, 0, Math.PI * 2); c.fill(); }
  },
  cocktail: (c) => { // a martini, a cherry
    c.fillStyle = '#fbf7ee'; c.globalAlpha = 0.9;
    c.beginPath(); c.moveTo(-70, -60); c.lineTo(70, -60); c.lineTo(0, 10); c.closePath(); c.fill(); c.globalAlpha = 1;
    c.fillStyle = '#f6dd8f'; c.beginPath(); c.moveTo(-56, -50); c.lineTo(56, -50); c.lineTo(0, 4); c.closePath(); c.fill();
    c.fillStyle = '#fbf7ee'; c.fillRect(-4, 8, 8, 60); rr(c, -36, 66, 72, 10, 5);
    c.fillStyle = '#c8102e'; c.beginPath(); c.arc(18, -38, 12, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#36143c'; c.lineWidth = 3; c.beginPath(); c.moveTo(18, -48); c.quadraticCurveTo(26, -70, 44, -78); c.stroke();
  },
};
