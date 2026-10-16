// Boards are advertisements, and their lyric is the ad's headline: a 70s print ad for a product the words could be
// selling — "call him Mr. Handle It" sells a telephone, "Blowin' money fast" a bank, "Cruise all night" a car dealer;
// a line about him, perfume or a diamond; the rest lipstick, sunglasses or a cocktail, seeded per board. The headline
// takes the board's left part (TEXT_SHARE of its width: carriers.ts lays the lyric out in it, so the guard measures
// the type as drawn); the product is drawn on the right (look/adart.ts). Pure.
import { hash } from '../engine/util';
import type { Kind } from './carriers';

export type Ad = 'him' | 'phone' | 'cash' | 'car' | 'lipstick' | 'perfume' | 'shades' | 'diamond' | 'cocktail' | 'heels' | 'roses' | 'chain' | 'record' | 'suitcase' | 'crown' | 'bandage' | 'tape' | 'keys' | 'heart' | 'sale';
/** (`sale` is a shop's own promotional poster, never a billboard's: set-pieces set it.) */
export const ADS: readonly Ad[] = ['him', 'phone', 'cash', 'car', 'lipstick', 'perfume', 'shades', 'diamond', 'cocktail', 'heels', 'roses', 'chain', 'record', 'suitcase', 'crown', 'bandage', 'tape', 'keys', 'heart'];
/** Each ad's maker and its line: the board's copy until its lyric flips in (never a lyric: nothing of the song shows
 *  ahead). */
export const BRAND: Record<Ad, [brand: string, tagline: string]> = {
  him: ['HANDSOME', 'the fragrance for him'], phone: ['BELL & CO.', 'call anytime'], cash: ['GOLDEN STATE', 'savings & loan'],
  car: ['SLAUSON MOTORS', 'low down, no money down'], lipstick: ['ROUGE NOIR', 'kiss-proof'], perfume: ['NUIT', 'eau de parfum'],
  shades: ['SOLEIL', 'optics of LA'], diamond: ['CARAT & CO.', 'forever, financed'], cocktail: ['GOLDEN HOUR', 'lounge • open late'],
  heels: ['STILETTO', 'walk tall'], roses: ['ROSE BOWL', 'florist'], chain: ['ROPE & GOLD', '14k • since 1964'],
  record: ['SIDE B', 'records & tapes'], suitcase: ['JETSET', 'luggage for the road'], crown: ['ROYALE', 'for the ruler'],
  bandage: ['FIRST AID', 'for what hurts'], tape: ['TRUE MEASURE', 'tools'], keys: ['CRUISE RENTALS', 'keys in an hour'], heart: ['SWEETHEART', 'candy co.'],
  sale: ['HANDLED HARDWARE', 'this week only'],
};

/** A billboard's least height (m). */
export const AD = { minH: 4.4 };
/** The share of each board's width its lyric takes; the rest, on the right, is its art: a product (ADVERTISED kinds)
 *  or, on route signs, a shield and an arrow. The art stays: it's built round the words, never fades for them. Faces
 *  not listed are all lyric. */
export const TEXT_SHARE: Partial<Record<Kind, number>> = { billboard: 0.62, sign: 0.6, storefront: 0.72, street: 0.7, gantry: 0.72, bus: 0.8, menu: 0.76, poster: 0.62, window: 0.72 };
export const ADVERTISED: ReadonlySet<Kind> = new Set<Kind>(['billboard', 'sign', 'storefront']);

/** Words that pick a product, checked in this order. */
const BY_WORD: readonly [RegExp, Ad][] = [
  [/handsome|the boy|my man|\bhe my|\bhe's\b/i, 'him'],
  [/hurt/i, 'bandage'],
  [/ruler|measure/i, 'tape'],
  [/\bcall|\bhear\b/i, 'phone'],
  [/packing|stuck|took me/i, 'suitcase'],
  [/bossy|bossing|keep up/i, 'crown'],
  [/money|ransom|cash|rich|trickin|pay|fast\b/i, 'cash'],
  [/drive|ride|cruise|roll|slauson|pop it|hood/i, 'car'],
  [/pull up|going|fast/i, 'keys'],
  [/be your|tarzan|jane/i, 'diamond'],
  [/lies|pretend|screw/i, 'roses'],
  [/different|tell me|feel/i, 'record'],
  [/play too|action/i, 'heels'],
  [/cute|love|different laying/i, 'heart'],
  [/hood|chickens|strong/i, 'chain'],
  [/\bhe\b|\bhim\b|boy|baby|laying|next to me/i, 'perfume'],
  [/fly|sun|west|south|show|look/i, 'shades'],
  [/energy|cute|fine|name|kiss|lips|panties/i, 'lipstick'],
];
const ANY: readonly Ad[] = ['lipstick', 'perfume', 'shades', 'diamond', 'cocktail', 'heels', 'roses', 'record', 'chain'];

/** The product a billboard's lyric sells: what its words say, else one seeded per board; never the same as the board
 *  just before (`after`), so neighbours differ. */
export function adFor(text: string, seed: number, after?: Ad): Ad {
  for (const [re, ad] of BY_WORD) if (re.test(text) && ad !== after) return ad;
  const pool = ANY.filter((a) => a !== after);
  return pool[Math.floor(hash(seed, 31) * pool.length)]!;
}
