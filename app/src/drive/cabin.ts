// The car's cabin fittings' places (the car's frame: x its left, y up from the road, z forward; m), for the lyrics that
// ride on them (sets/verse1.ts) and the fittings themselves (look/dash.ts). Pure.
import * as THREE from 'three';

/** The sun visors: hinged on the windshield's top rail over each seat (x either side), folded back flat until hers
 *  flips down; her mirror's centre and facing once down (tipped a little toward her: from her eye it shows the street
 *  behind them and the sky, not the floor), its size. */
export const VISOR = { x: 0.44, hinge: { y: 1.46, z: 0.9 }, mirror: { pos: new THREE.Vector3(-0.44, 1.36, 0.875), normal: new THREE.Vector3(0, -0.12, -0.993).normalize(), w: 0.34, h: 0.16 } };
/** The dash's head unit: where the lyric's panel sits on its screen (verse 1's radio line) and the way it faces
 *  (tipped back toward them); the screen's size, and how far right of its middle the lyric's panel sits (m: left, the art
 *  on its right, clear of the wheel). */
export const HEAD_UNIT = { pos: new THREE.Vector3(-0.02, 1.12, 0.52), normal: new THREE.Vector3(0, 0.3, -0.954).normalize(), w: 0.7, h: 0.27, lyricAt: -0.07 }; // (proud of the dash's fascia, whose face is at z 0.53: world.ts buildCar)

/** His steering wheel: its hub's centre, its tilt (radians about x: its top tipped back toward him, the hub facing
 *  him), and his grip on it, low on its rim at about half seven (from the hub). At gauge height in front of them, its
 *  column into the dash under the hood over the gauges (the user, 2026-10-15: at belt + 0.38 it was "plugged into the
 *  top of the dashboard"). */
export const WHEEL = { hub: new THREE.Vector3(0.44, 1.15, 0.36), tilt: 0.6, grip: new THREE.Vector3(0.134, -0.111, -0.076) };

/** The car's body (m): its length, width, beltline height, its wheels' distance from its middle and their radius
 *  (world.ts buildCar, look/impala.ts). */
export const CAR = { length: 5.4, width: 1.96, belt: 0.98, wheelZ: 1.55, wheelR: 0.36 };
