// Boards are advertisements, and their lyric is the ad's headline: a 70s print ad for a product the words could be
// selling — "call him Mr. Handle It" sells a telephone, "Blowin' money fast" a bank, "Cruise all night" a car dealer;
// a line about him, perfume or a diamond; the rest lipstick, sunglasses or a cocktail, seeded per board. The headline
// takes the board's left part (TEXT_SHARE of its width: carriers.ts lays the lyric out in it, so the guard measures
// the type as drawn); the product is drawn on the right (look/adart.ts). Pure.
import { hash } from '../engine/util';
import type { Kind } from './carriers';

export type Ad = 'phone' | 'cash' | 'car' | 'lipstick' | 'perfume' | 'shades' | 'diamond' | 'cocktail';
export const ADS: readonly Ad[] = ['phone', 'cash', 'car', 'lipstick', 'perfume', 'shades', 'diamond', 'cocktail'];

/** A billboard's least height (m). */
export const AD = { minH: 4.4 };
/** The share of each board's width its lyric takes; the rest, on the right, is its art: a product (ADVERTISED kinds)
 *  or, on route signs, a shield and an arrow. The art stays: it's built round the words, never fades for them. Faces
 *  not listed are all lyric. */
export const TEXT_SHARE: Partial<Record<Kind, number>> = { billboard: 0.62, sign: 0.6, wall: 0.68, storefront: 0.72, street: 0.7, gantry: 0.72 };
export const ADVERTISED: ReadonlySet<Kind> = new Set<Kind>(['billboard', 'sign', 'wall', 'storefront']);

/** Words that pick a product, checked in this order. */
const BY_WORD: readonly [RegExp, Ad][] = [
  [/\bcall|\bhear\b/i, 'phone'],
  [/money|ransom|cash|rich|trickin|pay|fast\b/i, 'cash'],
  [/drive|ride|cruise|roll|slauson|pull|pop it|hood/i, 'car'],
  [/handsome|my man|be your|ruler|tarzan|jane/i, 'diamond'],
  [/\bhe\b|\bhim\b|boy|baby|laying|next to me/i, 'perfume'],
  [/fly|sun|west|south|show|look/i, 'shades'],
  [/energy|cute|fine|name|kiss|lips|panties/i, 'lipstick'],
];
const ANY: readonly Ad[] = ['lipstick', 'perfume', 'shades', 'diamond', 'cocktail'];

/** The product a billboard's lyric sells. */
export function adFor(text: string, seed: number): Ad {
  for (const [re, ad] of BY_WORD) if (re.test(text)) return ad;
  return ANY[Math.floor(hash(seed, 31) * ANY.length)]!;
}
