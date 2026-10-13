// The Impala's body stays inside the box the guard knows the car by (drive.ts CAR_BOX), and keeps the surfaces the
// lyrics ride on: the hood (verse 2's lettering), the tail (its plate).
import { expect, test } from 'bun:test';
import * as THREE from 'three';
import { CAR_BOX } from '../src/drive/drive';
import { IMPALA, impalaHull } from '../src/look/impala';

test("the hull stays inside the car's box", () => {
  const b = new THREE.Box3().setFromBufferAttribute(impalaHull().getAttribute('position') as THREE.BufferAttribute);
  expect(b.min.x).toBeGreaterThanOrEqual(-CAR_BOX.w / 2);
  expect(b.max.x).toBeLessThanOrEqual(CAR_BOX.w / 2);
  expect(b.min.y).toBeGreaterThanOrEqual(0);
  expect(b.max.y).toBeLessThanOrEqual(CAR_BOX.h);
  expect(b.min.z).toBeGreaterThanOrEqual(-CAR_BOX.l / 2);
  expect(b.max.z).toBeLessThanOrEqual(CAR_BOX.l / 2);
});

test('the hood stands where its lettering lies, and the cockpit is open', () => {
  expect(IMPALA.top(1.62)).toBeGreaterThan(0.94); // (verse 2's hood lettering at y 1.0)
  expect(IMPALA.top(1.62)).toBeLessThan(1.0);
  expect(IMPALA.top(0)).toBeLessThan(0.6); // (the tub: the two of them sit in it)
});
