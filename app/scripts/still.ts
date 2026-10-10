// One still from the running preview server (M1 only; M2's render.ts replaces this).
// Usage (from app/): bun scripts/still.ts [t=16] [url=http://localhost:5890/]  -> ../out/still_<t>.png
import { chromium } from 'playwright-core';

const t = +(process.argv[2] ?? 16);
const url = process.argv[3] ?? 'http://localhost:5890/';
const b = await chromium.launch({ channel: process.env.LV_BROWSER ?? 'msedge' });
try {
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await p.goto(`${url}?export=1`);
  await p.waitForFunction(() => (window as any).__lv?.ready || (window as any).__lv?.error, null, { timeout: 60000 });
  const err = await p.evaluate(() => (window as any).__lv.error ?? (window as any).__lv.errors.join('\n'));
  if (err) throw new Error(err);
  await p.evaluate((x) => (window as any).__lv.still(x), t);
  const png = await p.evaluate(() => (window as any).__lv.png());
  const out = `../out/still_${t.toFixed(2)}.png`;
  await Bun.write(out, Buffer.from(png, 'base64'));
  console.log('wrote', out);
} finally {
  await b.close();
}
