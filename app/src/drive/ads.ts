// Billboards are advertisements, and their lyric is the ad's headline: a 70s print ad for a product the words could be
// selling — "call him Mr. Handle It" sells a telephone, "Blowin' money fast" a bank, "Cruise all night" a car dealer;
// a line about him, perfume or a diamond; the rest lipstick, sunglasses or a cocktail, seeded per board. The headline
// takes the ad's left part (AD.text of its width: carriers.ts lays the lyric out in it, so the guard measures the type
// as drawn); the product is drawn on the right (look/adart.ts). Pure.
import { hash } from '../engine/util';

export type Ad = 'phone' | 'cash' | 'car' | 'lipstick' | 'perfume' | 'shades' | 'diamond' | 'cocktail';
export const ADS: readonly Ad[] = ['phone', 'cash', 'car', 'lipstick', 'perfume', 'shades', 'diamond', 'cocktail'];

/** The share of a billboard's width its headline takes (the product has the rest), and its least height (m). */
export const AD = { text: 0.62, minH: 4.4 };

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
