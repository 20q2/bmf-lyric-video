// The explorer's window on the drive (the site player, src/player.ts ↔ scenes/drive.ts): where to look from instead of
// the video's camera, and where the car and the video's camera are at any song time. The export never sets `eye`, so a
// render is the video's own camera, as before. Browser and bun.
import type * as THREE from 'three';
import type { Pose } from '../drive/camera';
import type { RouteFrame } from '../drive/route';

/** A camera's place, its orientation (three's: looking down its -z) and vertical field of view (degrees). */
export interface Eye { pos: THREE.Vector3; quat: THREE.Quaternion; fov: number }

export const VIEW = {
  /** Set: the scene renders from here and shows the video's camera standing in the world (null: the video's camera). */
  eye: null as Eye | null,
  /** Filled in by the drive scene once it's loaded: the car's frame and the video camera's pose at song time t (pure). */
  carAt: null as ((t: number) => RouteFrame) | null,
  videoAt: null as ((t: number) => Pose) | null,
  /** The site's Fast lighting: no cast shadows (look/shadows.ts Cascades.disabled), for slower machines. */
  fast: false,
  /** The explorer's draw distance (m; Infinity: all of it): the world's still parts past it left out, the fog pulled in to
   *  it. Only while the explorer's own eye is used: the video's camera always sees what it was framed to. */
  reach: Infinity,
  /** The height of the solid surface under a point (explore/floor.ts), as the world stands at the last frame. */
  floorAt: null as ((p: THREE.Vector3) => number | null) | null,
};
