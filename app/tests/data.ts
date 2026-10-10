// The committed timing data, for tests that need the real song (data/audio.json, data/lyrics.json).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { AudioData } from '../src/engine/audio';
import { Lyrics } from '../src/engine/lyrics';

const read = (f: string) => JSON.parse(readFileSync(path.join(import.meta.dir, '../../data', f), 'utf8'));
export const audio = new AudioData(read('audio.json'));
export const lyrics = new Lyrics(read('lyrics.json'));
