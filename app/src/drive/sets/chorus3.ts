// Chorus 3, the coast road (flow plan §5): the ritual by the sea, wide, the car small against it.
//   "The boy from South of somewhere came walking in"   the beach town's welcome arch over the road, its lettering
//        band the lyric (WELCOME TO is the arch's own header). It stands before his first board, so the film's first
//        true wide looks down the whole chorus through it: sea left, the sun kissing the water (sky.ts puts it on the
//        horizon at 112 s), the car passing under early in the line and shrinking beyond, framed by the arch
//   "And I can't keep my panties from dropping"          three numbered lifeguard towers down the sand on the right,
//        a phrase each, the take gliding tower to tower
// His campaign boards (standing in the surf on the left) and the "fly" sky-writing stay the drive's own (carriers.ts).
// Pure.
import * as THREE from 'three';
import { type Carrier, type Kind, glideTake, layout, lookFrom } from '../carriers';
import { type Phrase, phrasesOf } from '../phrases';
import { ROAD_HALF } from '../route';
import { fitSign } from '../camera';
import { type Block, boxAt } from '../blocks';
import type { Placed, SetContext, SetFrame, SetPiece } from './index';

const UP = new THREE.Vector3(0, 1, 0);
const flat = (v: THREE.Vector3) => new THREE.Vector3(v.x, 0, v.z).normalize();
const PLACE = /south of somewhere/i, DROP = /panties from dropping/i;

/** The arch: this far before his first campaign board (m: clear of its take's rays); its band's underside over the
 *  road, its pylons (off the road's centre, their plan size), and the wide's eye (m back from the arch, off the road's
 *  centre, up). */
export const ARCH = { before: 15, bottom: 6.2, pylon: { lateral: 11, w: 2.4 }, eye: { back: 50, lateral: 1, y: 4.2 } };
/** The lifeguard towers: off the road's centre on the sand, their board's centre height, the hut behind it (its size,
 *  how far past the board), and the board's toe toward the road (radians, like the roadside signs'). */
export const TOWER = { lateral: 19, y: 4.0, hut: { w: 3.4, d: 3, h: 3.1, back: 1.9 }, toe: (25 * Math.PI) / 180 };

interface Face { center: THREE.Vector3; normal: THREE.Vector3; up: THREE.Vector3; w: number; h: number }
export interface Chorus3Plan {
  /** The arch (m along the road), its band, its pylons' lateral; the towers (m along the road, their boards); the
   *  fly line (s: the gulls cross under its sky-writing). */
  archS: number;
  band: Face & { bottom: number };
  pylons: number;
  towers: { s: number; board: Face }[];
  fly: { start: number; end: number } | null;
}

export const CHORUS3: SetPiece = {
  owns: (line) => PLACE.test(line.text) || DROP.test(line.text),

  place(ctx: SetContext): Placed {
    const { st, route, motion } = ctx;
    const carS = (t: number) => motion.distanceAt(t);
    const atRoad = (s: number, lateral: number, y: number) => { const f = route.frameAt(s); return f.pos.clone().addScaledVector(f.right, lateral).addScaledVector(UP, y); };
    const ground = (s: number) => route.frameAt(s).pos.y;
    const carriers: Carrier[] = [], frames = new Map<string, SetFrame>();
    const add = (kind: Kind, ph: Phrase, id: string, s: number, center: THREE.Vector3, normal: THREE.Vector3, up: THREE.Vector3, lay: ReturnType<typeof layout>) => {
      const c: Carrier = { id, phrase: ph, kind, stretch: st.id, reveal: ph.start, s, center, normal, up, ...lay, foot: center.y - ground(s), solid: null };
      carriers.push(c);
      return c;
    };

    // ---- the arch: the line's phrases stacked as its lettering band; it stands just before his first board, so the
    // wide looks down the chorus through it and the car passes under early in the line ----
    const place = st.lines.find((l) => PLACE.test(l.text))!, pps = phrasesOf(place, ctx.nextStart(place.i), ctx.solo);
    const campaign = st.lines[0]!, cp0 = phrasesOf(campaign, ctx.nextStart(campaign.i), ctx.solo)[0]!;
    const firstBoard = Math.max(ctx.floor ?? -Infinity, carS((cp0.start + cp0.end) / 2));
    const A = ARCH, archS = firstBoard - A.before, af = route.frameAt(archS), an = flat(af.fwd).negate();
    const lays = pps.map((ph) => layout('arch', ph.text, ph.solo)), H = lays.reduce((a, l) => a + l.h, 0);
    let top = A.bottom + H;
    const bandW = Math.max(...lays.map((l) => l.w));
    pps.forEach((ph, i) => {
      // (a hair in front of the band's own box: the prop draws the structure behind)
      const L = lays[i]!, c = atRoad(archS, 0, top - L.h / 2).addScaledVector(an, 0.35);
      top -= L.h;
      add('arch', ph, `L${place.i}.${i}`, archS, c, an.clone(), UP.clone(), L);
    });
    // the wide: a fixed eye down the road, the sea and the low sun left, the arch's band ahead, the whole chorus
    // seen through it; the car passes under and drives small beyond
    const bandC = atRoad(archS, 0, A.bottom + H / 2);
    const wide = lookFrom(atRoad(archS - A.eye.back, A.eye.lateral, A.eye.y), bandC);
    carriers.forEach((c, i) => frames.set(c.id, { to: () => wide, move: i ? 'snap' : 'cut' }));

    // ---- the dropping line: a phrase a lifeguard tower, the take gliding down the sand ----
    const drop = st.lines.find((l) => DROP.test(l.text))!, dps = phrasesOf(drop, ctx.nextStart(drop.i), ctx.solo);
    const towers: Chorus3Plan['towers'] = [];
    const towerCs = dps.map((ph, i) => {
      const s = carS((ph.start + ph.end) / 2), f = route.frameAt(s);
      const back = flat(f.fwd).negate(), toRoad = flat(f.right).negate();
      const n = back.multiplyScalar(Math.cos(TOWER.toe)).addScaledVector(toRoad, Math.sin(TOWER.toe)).normalize();
      const lay = layout('sign', ph.text, ph.solo), c = atRoad(s, TOWER.lateral, TOWER.y);
      towers.push({ s, board: { center: c, normal: n, up: UP.clone(), w: lay.w, h: lay.h } });
      return add('sign', ph, `L${drop.i}.${i}`, s, c, n, UP.clone(), lay);
    });
    const takes = towerCs.map((c) => { const p = fitSign({ center: c.center, normal: c.normal, w: c.w, h: c.h }); return () => p; });
    const glide = glideTake(towerCs, takes);
    towerCs.forEach((c, i) => frames.set(c.id, { to: glide, move: i ? 'snap' : 'cut' }));

    // the arch's band and pylons, and the towers' huts, stand as blocks: the guard checks them (the carriers' own
    // solids stay null — a face zone on the centre line would push its own pylons out)
    const blocks: Block[] = [
      { s: archS, lateral: 0, w: 0.6, h: H + 0.6, d: 2 * A.pylon.lateral + A.pylon.w, color: 0.8, bare: true, prop: true, matrix: boxAt(route, archS, 0, 2 * A.pylon.lateral + A.pylon.w, H + 0.6, 0.6, A.bottom - 0.3) },
      ...[-1, 1].map((side): Block => ({ s: archS, lateral: side * A.pylon.lateral, w: A.pylon.w, h: A.bottom + H + 1, d: A.pylon.w, color: 0.8, bare: true, prop: true, matrix: boxAt(route, archS, side * A.pylon.lateral, A.pylon.w, A.bottom + H + 1, A.pylon.w) })),
      ...towers.map(({ s }): Block => {
        const T = TOWER.hut, lat = TOWER.lateral + T.back;
        return { s, lateral: lat, w: T.w, h: TOWER.y + T.h / 2 - 1.2, d: T.d, color: 0.7, bare: true, prop: true, matrix: boxAt(route, s, lat, T.d, TOWER.y + T.h / 2 - 1.2, T.w) };
      }),
    ];
    const clear = [
      ...[-1, 1].map((side) => ({ side, a: archS - 10, b: archS + 10 })),
      { side: 1, a: towers[0]!.s - 15, b: towers[towers.length - 1]!.s + 15 },
    ];
    const flyLine = st.lines.find((l) => /\bfly\b/i.test(l.text));
    const plan: Chorus3Plan = {
      archS,
      band: { center: bandC, normal: an.clone(), up: UP.clone(), w: bandW, h: H, bottom: A.bottom },
      pylons: ARCH.pylon.lateral,
      towers,
      fly: flyLine ? { start: flyLine.words[0]!.start, end: flyLine.end } : null,
    };
    return { carriers, frames, clear, blocks, plan };
  },
};
