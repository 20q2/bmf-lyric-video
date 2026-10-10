// The billboards' ads (drive/ads.ts picks which): each a 70s print ad — a colour field, the product drawn on the right
// in a spotlight, a small maker's mark, and the lyric as its headline on the left (carrierart.ts sets it). The product
// is all shape, no words. Browser only (canvas).
import type { Ad } from '../drive/ads';

/** Per ad: its colour field, its headline's colours (sung, the word being sung), and the spotlight behind the product. */
export const AD_STYLE: Record<Ad, { bg: string; ink: string; now: string; spot: string }> = {
  phone: { bg: '#ff5a36', ink: '#fff3e0', now: '#ffd65a', spot: '#ff8a5c' },
  cash: { bg: '#1f5c3c', ink: '#f3ead2', now: '#f6c445', spot: '#2e7a52' },
  car: { bg: '#f6dd8f', ink: '#36143c', now: '#c8102e', spot: '#fbeab6' },
  lipstick: { bg: '#ff7aa8', ink: '#36143c', now: '#ffffff', spot: '#ffa0c2' },
  perfume: { bg: '#cdb8e6', ink: '#36143c', now: '#c8102e', spot: '#e2d4f2' },
  shades: { bg: '#9cc3e0', ink: '#16131a', now: '#ff5a36', spot: '#ffd27a' },
  diamond: { bg: '#22284a', ink: '#f3ead2', now: '#ff7aa8', spot: '#343c6a' },
  cocktail: { bg: '#2b8a87', ink: '#fbf7ee', now: '#f6dd8f', spot: '#3aa6a2' },
};

/** Draw the ad's field, its product and its mark (not its headline) on a canvas W x H, the headline taking the left
 *  `text` share of the width. */
export function drawAd(c: CanvasRenderingContext2D, ad: Ad, W: number, H: number, text: number) {
  const st = AD_STYLE[ad];
  c.fillStyle = st.bg; c.fillRect(0, 0, W, H);
  const x0 = W * text, iw = W - x0, cx = x0 + iw / 2, cy = H * 0.5, R = Math.min(iw, H) * 0.42;
  // the spotlight
  c.fillStyle = st.spot; c.beginPath(); c.arc(cx, cy, R * 1.05, 0, Math.PI * 2); c.fill();
  c.save(); c.translate(cx, cy); c.scale(R / 100, R / 100); // the product, drawn in a 200 x 200 box round (0, 0)
  PRODUCT[ad](c);
  c.restore();
  // the maker's mark: a star in a ring, bottom right
  const m = H * 0.07, mx = W - m * 1.8, my = H - m * 1.8;
  c.strokeStyle = st.ink; c.lineWidth = m * 0.18; c.beginPath(); c.arc(mx, my, m, 0, Math.PI * 2); c.stroke();
  c.fillStyle = st.ink; star(c, mx, my, m * 0.7, m * 0.3, 5);
  // a hairline between headline and product
  c.fillStyle = st.ink; c.globalAlpha = 0.35; c.fillRect(x0 - W * 0.004, H * 0.15, W * 0.004, H * 0.7); c.globalAlpha = 1;
}

function star(c: CanvasRenderingContext2D, x: number, y: number, r: number, r2: number, n: number) {
  c.beginPath();
  for (let i = 0; i < n * 2; i++) { const a = (i * Math.PI) / n - Math.PI / 2, rr = i % 2 ? r2 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  c.closePath(); c.fill();
}
const rr = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => { c.beginPath(); c.roundRect(x, y, w, h, r); c.fill(); };

const PRODUCT: Record<Ad, (c: CanvasRenderingContext2D) => void> = {
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
  cocktail: (c) => { // a martini, a cherry
    c.fillStyle = '#fbf7ee'; c.globalAlpha = 0.9;
    c.beginPath(); c.moveTo(-70, -60); c.lineTo(70, -60); c.lineTo(0, 10); c.closePath(); c.fill(); c.globalAlpha = 1;
    c.fillStyle = '#f6dd8f'; c.beginPath(); c.moveTo(-56, -50); c.lineTo(56, -50); c.lineTo(0, 4); c.closePath(); c.fill();
    c.fillStyle = '#fbf7ee'; c.fillRect(-4, 8, 8, 60); rr(c, -36, 66, 72, 10, 5);
    c.fillStyle = '#c8102e'; c.beginPath(); c.arc(18, -38, 12, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#36143c'; c.lineWidth = 3; c.beginPath(); c.moveTo(18, -48); c.quadraticCurveTo(26, -70, 44, -78); c.stroke();
  },
};
