import { expect, test } from 'bun:test';
import { jump, partAt, partLoop } from '../src/review';

const STARTS = [0, 14.9, 29.8, 59.6];

test('partAt: the part playing at t (the last start at or before it)', () => {
  expect(partAt(STARTS, 0)).toBe(0);
  expect(partAt(STARTS, 14.89)).toBe(0);
  expect(partAt(STARTS, 14.9)).toBe(1);
  expect(partAt(STARTS, 100)).toBe(3);
});

test('partLoop: from the part start to the next start, the last one to the end', () => {
  expect(partLoop(STARTS, 20, 181.6)).toEqual([14.9, 29.8]);
  expect(partLoop(STARTS, 70, 181.6)).toEqual([59.6, 181.6]);
});

test('jump forward: the next target more than 0.05 s ahead', () => {
  expect(jump(STARTS, 0, 1)).toBe(14.9);
  expect(jump(STARTS, 14.88, 1)).toBe(29.8); // 0.02 s before a target counts as on it
  expect(jump(STARTS, 60, 1)).toBeUndefined();
});

test('jump back: the last target more than 0.3 s behind, so a second PageUp keeps going back', () => {
  expect(jump(STARTS, 15.0, -1)).toBe(0); // just after 14.9: skip it
  expect(jump(STARTS, 20, -1)).toBe(14.9);
  expect(jump(STARTS, 0.1, -1)).toBeUndefined();
});
