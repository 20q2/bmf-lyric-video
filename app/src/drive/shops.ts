// The town's shops: their names (the signs over the street fronts, look/facades.ts, and on the rooftops behind,
// drive/world.ts) and who gets which. A broad '60s–'70s LA street, the corner market to the dentist upstairs, a few by
// their owners' names. Dealt along the road, not hashed block by block: hashed, a few names came up over and over (the
// user, 2026-10-18: "tacos shows up four times and tire shows up a bunch of times. And income tax shows up a bunch of
// times, and I don't know what an income tax shop would do for me exactly"). Pure.
import { hash } from '../engine/util';
import type { Block } from './blocks';
import type { Drive } from './drive';

/** What a shop shows through its glass (look/night.ts nightGlass's `trade`): shelves of stock, a rail of clothes, a
 *  counter under a menu board, bills taped up inside the glass, an office's blinds, a salon's chairs under its mirror,
 *  a laundromat's machines. */
export const TRADE = { shelves: 0, clothes: 1, counter: 2, bills: 3, office: 4, salon: 5, washers: 6 } as const;
type Trade = keyof typeof TRADE;

/** A shop: its sign's words (the signs' face, F.sign: never the lyrics'), what's behind its glass, and its line of
 *  business (a set's own business of that line keeps the town's away from it: SET_TRADES). `once`: at most one in the
 *  film; `pinned`: only where a set puts it (pins). */
export interface Shop { name: string; trade: Trade; kind: string; once?: boolean; pinned?: boolean }
export const SHOPS: readonly Shop[] = [
  // the corner's food
  { name: "ROSA'S BAKERY", trade: 'counter', kind: 'bakery' }, { name: 'PANADERIA', trade: 'counter', kind: 'bakery' },
  { name: 'DONUT HUT', trade: 'counter', kind: 'donut' }, { name: 'TACOS EL PRIMO', trade: 'counter', kind: 'tacos' },
  { name: 'SUNSET CAFE', trade: 'counter', kind: 'cafe' }, { name: "SOL'S DELI", trade: 'counter', kind: 'deli' },
  { name: 'CHOP SUEY', trade: 'counter', kind: 'chinese' }, { name: "LEON'S BAR-B-Q", trade: 'counter', kind: 'bbq' },
  { name: "TONY'S PIZZA", trade: 'counter', kind: 'pizza' }, { name: 'HOT DOGS', trade: 'counter', kind: 'hotdog' },
  { name: "MARIA'S TAMALES", trade: 'counter', kind: 'tamales' }, { name: 'TORTILLERIA', trade: 'counter', kind: 'tortilla' },
  { name: "FROSTY'S ICE CREAM", trade: 'counter', kind: 'icecream' }, { name: 'CARNICERIA', trade: 'shelves', kind: 'butcher' },
  { name: 'MEAT MARKET', trade: 'shelves', kind: 'butcher' }, { name: 'CORNER MARKET', trade: 'shelves', kind: 'market' },
  { name: 'LIQUOR', trade: 'shelves', kind: 'liquor' }, { name: 'HEALTH FOODS', trade: 'shelves', kind: 'health' },
  { name: 'CANDY & NUTS', trade: 'shelves', kind: 'candy' },
  // the trades' counters and workbenches
  { name: "MILT'S SHOE REPAIR", trade: 'bills', kind: 'shoe' }, { name: "HAL'S TV REPAIR", trade: 'bills', kind: 'tv' },
  { name: 'RADIO & TV', trade: 'shelves', kind: 'tv' }, { name: 'WATCH REPAIR', trade: 'bills', kind: 'watch' },
  { name: 'VACUUM REPAIR', trade: 'bills', kind: 'vacuum' }, { name: 'KEYS · LOCKS', trade: 'bills', kind: 'locksmith' },
  { name: 'TYPEWRITERS', trade: 'bills', kind: 'typewriter' }, { name: 'SEWING MACHINES', trade: 'shelves', kind: 'sewing' },
  { name: 'UPHOLSTERY', trade: 'bills', kind: 'upholstery' }, { name: 'QUICK PRINT', trade: 'bills', kind: 'printing' },
  { name: 'PHOTO STUDIO', trade: 'bills', kind: 'photo' }, { name: 'TROPHIES', trade: 'shelves', kind: 'trophies' },
  { name: 'GLASS & MIRRORS', trade: 'shelves', kind: 'glass' },
  // the stores
  { name: 'HARDWARE', trade: 'shelves', kind: 'hardware' }, { name: 'PAINT & WALLPAPER', trade: 'shelves', kind: 'paint' },
  { name: 'PHARMACY', trade: 'shelves', kind: 'drug' }, { name: 'FIVE & DIME', trade: 'shelves', kind: 'dime' },
  { name: 'VARIETY STORE', trade: 'shelves', kind: 'dime' }, { name: 'RECORD SHOP', trade: 'shelves', kind: 'record' },
  { name: 'DISCOTECA', trade: 'shelves', kind: 'record' }, { name: 'USED BOOKS', trade: 'shelves', kind: 'books' },
  { name: 'BOOKSTORE', trade: 'shelves', kind: 'books' }, { name: 'CAMERAS · FILM', trade: 'shelves', kind: 'camera' },
  { name: 'MUSIC CITY', trade: 'shelves', kind: 'music' }, { name: 'GUITARS', trade: 'shelves', kind: 'music' },
  { name: 'PIANOS', trade: 'shelves', kind: 'pianos' }, { name: 'HI-FI STEREO', trade: 'shelves', kind: 'stereo' },
  { name: 'APPLIANCES', trade: 'shelves', kind: 'appliance' }, { name: 'FURNITURE', trade: 'shelves', kind: 'furniture' },
  { name: 'MUEBLES', trade: 'shelves', kind: 'furniture' }, { name: 'MATTRESSES', trade: 'shelves', kind: 'mattress' },
  { name: 'CARPETS', trade: 'shelves', kind: 'carpet' }, { name: 'LAMPS', trade: 'shelves', kind: 'lamps' },
  { name: 'SPORTING GOODS', trade: 'shelves', kind: 'sporting' }, { name: 'BICYCLES', trade: 'shelves', kind: 'bikes' },
  { name: 'TOYS · HOBBIES', trade: 'shelves', kind: 'toys' }, { name: 'PET SHOP', trade: 'shelves', kind: 'pets' },
  { name: "IRENE'S FLOWERS", trade: 'shelves', kind: 'florist' }, { name: 'FLORIST', trade: 'shelves', kind: 'florist' },
  { name: 'JEWELRY', trade: 'shelves', kind: 'jewelry' }, { name: 'LUGGAGE', trade: 'shelves', kind: 'luggage' },
  { name: 'GIFTS & CARDS', trade: 'shelves', kind: 'gifts' }, { name: 'OFFICE SUPPLY', trade: 'shelves', kind: 'office' },
  { name: 'NEWSSTAND', trade: 'shelves', kind: 'news' }, { name: 'SMOKE SHOP', trade: 'shelves', kind: 'tobacco' },
  { name: 'BOTANICA', trade: 'shelves', kind: 'botanica' }, { name: 'AUTO PARTS', trade: 'shelves', kind: 'autoparts' },
  { name: 'FAMILY SHOES', trade: 'shelves', kind: 'shoes' }, { name: 'BEAUTY SUPPLY', trade: 'shelves', kind: 'beautysupply' },
  // the clothes
  { name: 'BRIDAL SHOP', trade: 'clothes', kind: 'bridal' }, { name: 'TAILOR', trade: 'clothes', kind: 'tailor' },
  { name: 'ALTERATIONS', trade: 'clothes', kind: 'tailor' }, { name: "MEN'S WEAR", trade: 'clothes', kind: 'menswear' },
  { name: 'BOUTIQUE', trade: 'clothes', kind: 'boutique' }, { name: 'WESTERN WEAR', trade: 'clothes', kind: 'western' },
  { name: 'THRIFT STORE', trade: 'clothes', kind: 'thrift' }, { name: 'ARMY · NAVY', trade: 'clothes', kind: 'surplus' },
  { name: 'UNIFORMS', trade: 'clothes', kind: 'uniforms' }, { name: 'FABRICS', trade: 'clothes', kind: 'fabric' },
  { name: 'DRAPERIES', trade: 'clothes', kind: 'drapes' }, { name: 'WIGS', trade: 'clothes', kind: 'wigs' },
  { name: 'ONE HOUR CLEANERS', trade: 'clothes', kind: 'cleaners' }, { name: 'DRY CLEANERS', trade: 'clothes', kind: 'cleaners' },
  // the chairs, the machines
  { name: "DOT'S BEAUTY SALON", trade: 'salon', kind: 'beauty' }, { name: 'BEAUTY SALON', trade: 'salon', kind: 'beauty' },
  { name: "ED'S BARBERS", trade: 'salon', kind: 'barber' }, { name: 'LAUNDROMAT', trade: 'washers', kind: 'laundry' },
  { name: 'WASH-O-MAT', trade: 'washers', kind: 'laundry' },
  // the offices, the studios
  { name: 'INSURANCE', trade: 'office', kind: 'insurance' }, { name: 'AUTO INSURANCE', trade: 'office', kind: 'insurance' },
  { name: 'HOMES · REALTY', trade: 'office', kind: 'realty' }, { name: 'DENTIST', trade: 'office', kind: 'dentist' },
  { name: 'EYE EXAMS', trade: 'office', kind: 'optometrist' }, { name: 'CHIROPRACTOR', trade: 'office', kind: 'chiro' },
  { name: 'NOTARY PUBLIC', trade: 'office', kind: 'notary' }, { name: 'ABOGADO', trade: 'office', kind: 'lawyer' },
  { name: 'TRAVEL AGENCY', trade: 'bills', kind: 'travel' }, { name: 'KARATE', trade: 'bills', kind: 'karate' },
  { name: 'DANCE STUDIO', trade: 'bills', kind: 'dance' }, { name: 'MUSIC LESSONS', trade: 'bills', kind: 'lessons' },
  { name: 'BAIL BONDS', trade: 'office', kind: 'bail', once: true }, { name: 'CHECKS CASHED', trade: 'bills', kind: 'checks', once: true },
  { name: 'PAWN SHOP', trade: 'bills', kind: 'pawn', once: true }, { name: 'TAX SERVICE', trade: 'office', kind: 'tax', once: true },
  // (the one verse 2's set dresses: drive/sets/verse2.ts tireShop)
  { name: 'TIRES', trade: 'bills', kind: 'tires', pinned: true },
];
export type ShopName = string;
const INDEX = new Map(SHOPS.map((s, k) => [s.name, k]));
/** A shop's place in SHOPS (the sign atlas's cell: look/facades.ts). */
export const shopIndex = (name: ShopName) => INDEX.get(name) ?? 0;
export const shopOf = (name: ShopName): Shop => SHOPS[shopIndex(name)]!;
/** The ones dealt to the town (not the pinned), each its place in a shuffle (the tie-break among the least used). */
const DEALT = SHOPS.filter((s) => !s.pinned).map((s, k) => ({ s, rank: hash(k, 911) }));

/** The businesses the sets build themselves, by stretch (their lines of business: Shop.kind): the town deals none of
 *  them in that stretch or within WINDOW of it. */
export const SET_TRADES: Readonly<Record<string, readonly string[]>> = {
  intro: ['liquor', 'motel'], // (scenes/sets/intro.ts: the corner's liquor store, the pink motel)
  chorus1: ['barber'], // (the barber shop on the corner: scenes/sets/chorus1.ts)
  verse1: ['burger'], // (the burger stand: scenes/sets/verse1.ts)
  verse2: ['hardware', 'chicken', 'carwash', 'tires', 'paint'], // (Handled Hardware, the fried chicken spot, Sudsy's, the tire shop)
  chorus3: ['tacos'], // (the taco stand on the coast road: scenes/sets/chorus3.ts)
  // (the Strip's own: its lines' businesses and the trades dealt between them, scenes/sets/verse3.ts STRIP)
  verse3: ['drug', 'pawn', 'checks', 'donut', 'cafe', 'record', 'motel', 'laundry', 'bail', 'tacos', 'pizza', 'barber', 'shoe', 'liquor'],
  chorus4: ['cafe'], // (the diner: scenes/sets/chorus4.ts)
};

/** No name twice within this much road (m), nor in the same stretch if it can be helped. */
export const WINDOW = 150;

/** Whether a block's front is low apartments over a carport (no shop): look/facades.ts builds it so. */
export const isApartments = (b: Block) => b.h <= 9 && hash(b.s, b.lateral, 2) > 0.72 && !b.corner;
/** Whether a block on a row behind the street carries a shop's sign on its roof, facing the road (drive/world.ts). */
export const roofSign = (b: Block) => Math.abs(b.lateral) > 30 && b.h >= 8 && b.w >= 8 && hash(b.s, b.lateral, 77) < 0.2;

export interface ShopPlanOptions {
  /** The stretches' stretches of road ([a, b) in s), by id: no name twice in one, and none of its set's own trades. */
  stretches?: readonly { id: string; a: number; b: number }[];
  /** Blocks a set needs to be a certain shop (verse 2's tire shop). */
  pins?: readonly (readonly [Block, ShopName])[];
  /** Names or lines of business (Shop.kind) to deal none of (a set's own fronts: the town's names near them). */
  avoid?: readonly string[];
}
/** Deals the shops to the blocks that show a name (a storefront, or a sign on the roof): along the road, each the least
 *  used so far that isn't within WINDOW, nor in the same stretch, nor a set's own trade near it, nor the same line of
 *  business as one within WINDOW (in that order of need); among equals the one last used farthest away, then the
 *  shuffle's. So every name is used about as often, and none twice in a view. */
export function planShops(blocks: readonly Block[], o: ShopPlanOptions = {}): Map<Block, ShopName> {
  const out = new Map<Block, ShopName>(), used: { s: number; shop: Shop; st: string }[] = [], count = new Map<string, number>();
  const stOf = (s: number) => o.stretches?.find((x) => s >= x.a && s < x.b)?.id ?? '';
  const put = (b: Block, shop: Shop) => { out.set(b, shop.name); used.push({ s: b.s, shop, st: stOf(b.s) }); count.set(shop.name, (count.get(shop.name) ?? 0) + 1); };
  for (const [b, name] of o.pins ?? []) put(b, shopOf(name));
  const todo = blocks.filter((b) => !b.concrete && !b.prop && !out.has(b) && (!isApartments(b) || roofSign(b))).sort((a, b) => a.s - b.s || a.lateral - b.lateral);
  for (const b of todo) {
    const st = stOf(b.s), barred = new Set(o.avoid ?? []);
    for (const x of o.stretches ?? []) if (b.s > x.a - WINDOW && b.s < x.b + WINDOW) for (const k of SET_TRADES[x.id] ?? []) barred.add(k);
    let best: Shop | undefined, bestKey: number[] = [];
    for (const { s: shop, rank } of DEALT) {
      if (barred.has(shop.kind) || barred.has(shop.name) || (shop.once && count.get(shop.name))) continue;
      let near = Infinity, same = 0, kin = 0;
      for (const u of used) {
        const d = Math.abs(u.s - b.s);
        if (u.shop === shop) { near = Math.min(near, d); if (st && u.st === st) same = 1; }
        else if (u.shop.kind === shop.kind && d < WINDOW) kin = 1;
      }
      const key = [near < WINDOW ? 1 : 0, same, count.get(shop.name) ?? 0, kin, -Math.min(near, 1e6), rank];
      const i = key.findIndex((v, j) => v !== bestKey[j]);
      if (!best || (i >= 0 && key[i]! < bestKey[i]!)) { best = shop; bestKey = key; }
    }
    put(b, best ?? DEALT[0]!.s);
  }
  return out;
}

/** What a set building its own fronts in stretch `id` should deal none of: its own trades and the names the town's
 *  fronts carry within WINDOW of it. */
export function shopsNear(drive: Pick<Drive, 'shops' | 'stretches' | 'motion'>, id: string): string[] {
  const st = drive.stretches.find((x) => x.id === id);
  if (!st) return [];
  const a = drive.motion.distanceAt(st.start), b = drive.motion.distanceAt(st.end);
  return [...(SET_TRADES[id] ?? []), ...[...drive.shops].filter(([k]) => k.s > a - WINDOW && k.s < b + WINDOW).map(([, n]) => n)];
}
