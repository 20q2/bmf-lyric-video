// Sky-writing's dissolve (carrierart.ts draws it; the guards account for it). Pure.
import type { Carrier } from './carriers';

/** Sky-writing starts to dissolve this long after its phrase ends, and is gone this long after that (s). */
export const DISSOLVE = { after: 0.4, over: 1.5 };
/** How far through its dissolve a sky phrase is at t (0: whole, 1: gone; 0 for every other kind). */
export const dissolveAt = (c: Carrier, t: number) => (c.kind !== 'sky' ? 0 : Math.min(1, Math.max(0, (t - c.phrase.end - DISSOLVE.after) / DISSOLVE.over)));
