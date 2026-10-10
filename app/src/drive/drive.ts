// The drive as a pure model: the stretches, the car's motion, the road, the signs and the camera. The scene renders it
// (scenes/drive.ts) and the guards check it (tests/sung.test.ts) — the same object, so what is checked is what shows.
import { Route } from './route';
import type { Motion } from './motion';
import type { Stretch } from './stretches';

const DEG = Math.PI / 180;

/** The road through the stretches: each stretch's segment is the distance the car covers in it. */
export function routeFor(R: readonly Stretch[], motion: Motion): Route {
  return new Route(R.map((s) => ({ s0: motion.distanceAt(s.start), s1: motion.distanceAt(s.end), turn: s.turn * DEG, rise: s.rise })));
}
