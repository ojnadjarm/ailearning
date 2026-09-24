// Every narration clip in every cue sheet ships in both formats: .opus (Chromium, Firefox) and .m4a (Safari).
// The sheet sounds in <dir>/sound/ ship the same pair, each file at most 20 kB.
// Usage: node tools/bundle-check.mjs [dir]   (default dist; the bundles sit in <dir>/bundles/<unit>/cues.json)
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2] ?? 'dist';
const bundles = join(dir, 'bundles');
const units = existsSync(bundles) ? readdirSync(bundles).filter((u) => existsSync(join(bundles, u, 'cues.json'))) : [];
const faults = units.length ? [] : [`no cue sheets under ${bundles}`];
let clips = 0;
for (const u of units) {
  for (const [id, clip] of Object.entries(JSON.parse(readFileSync(join(bundles, u, 'cues.json'), 'utf8')).clips ?? {})) {
    clips++;
    for (const ext of ['.opus', '.m4a']) if (!existsSync(join(bundles, u, clip.src + ext))) faults.push(`${u}/${id}: ${clip.src}${ext} is missing`);
  }
}
const sound = join(dir, 'sound');
const sounds = existsSync(sound) ? [...new Set(readdirSync(sound).map((f) => f.replace(/\.(opus|m4a)$/, '')))] : [];
for (const s of sounds) {
  for (const ext of ['.opus', '.m4a']) {
    const f = join(sound, s + ext);
    if (!existsSync(f)) faults.push(`sound/${s}${ext} is missing`);
    else if (statSync(f).size > 20480) faults.push(`sound/${s}${ext} is over 20 kB`);
  }
}
faults.forEach((f) => console.error(`bundle-check: ${f}`));
console.log(`bundle-check: ${units.length} bundles, ${clips} clips, ${sounds.length} sheet sounds, ${faults.length} faults`);
process.exit(faults.length ? 1 : 0);
