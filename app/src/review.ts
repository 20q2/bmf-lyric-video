// The preview's review aids, pure, tested under bun: where PageDown / PageUp land and what `l` loops
// (main.ts). A "part" is a song section now and a stretch of the drive from M2 on; callers pass its starts.

/** The index of the part playing at t, for parts starting at `starts` (ascending, the first at 0). */
export function partAt(starts: readonly number[], t: number): number {
  let k = 0;
  while (k + 1 < starts.length && t >= starts[k + 1]!) k++;
  return k;
}

/** What `l` loops from t: the part playing, from its start to the next one's (the last part to `end`). */
export function partLoop(starts: readonly number[], t: number, end: number): [number, number] {
  const k = partAt(starts, t);
  return [starts[k]!, starts[k + 1] ?? end];
}

/** The target to jump to from t: the next one more than 0.05 s ahead (dir 1), or the last one more than 0.3 s
 *  back (dir -1, so a PageUp just after a jump goes on to the part before). Undefined at either end. */
export function jump(at: readonly number[], t: number, dir: 1 | -1): number | undefined {
  if (dir === 1) return at.find((x) => x > t + 0.05);
  const back = at.filter((x) => x < t - 0.3);
  return back[back.length - 1];
}
