// The edit: which scene plays when: the drive (scenes/drive.ts), the whole song;
// ?card=<scene> plays a diagnostic scene instead (?card=1 is shorthand for the karaoke test
// card that checks the aligned data over the whole song).
import type { TimelineEntry } from './engine/engine';
import type { SceneClass } from './engine/scene';
import type { Lyrics } from './engine/lyrics';
import type { AudioData } from './engine/audio';

// Scene modules are discovered lazily so a missing/broken scene never breaks the build.
const modules = import.meta.glob<{ default: SceneClass }>('./scenes/*.ts');
const scene = (name: string) => () => {
  const m = modules[`./scenes/${name}.ts`];
  return m ? m() : Promise.reject(new Error(`scene module not found: scenes/${name}.ts`));
};

/** The video's scene. */
const DEFAULT_SCENE = 'drive';

export function makeTimeline(_ly: Lyrics, au: AudioData): TimelineEntry[] {
  // ?card=<scene> plays one full-length diagnostic scene instead of the video (?card=1 = the test card).
  const card = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('card');
  const name = card ? (card === '1' ? 'testcard' : card) : DEFAULT_SCENE;
  return [{ id: name, load: scene(name), start: 0, end: au.duration }];
}
