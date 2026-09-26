// Every narration clip in every cue sheet ships in both formats: .opus (Chromium, Firefox) and .m4a (Safari).
// Audio budget per format: a unit's first chapter (from units/<unit>/unit.json) at most 600 kB.
// The sheet sounds in <dir>/sound/ ship the same pair, each file at most 20 kB.
// Usage: node tools/bundle-check.mjs [dir]   (default dist; the bundles sit in <dir>/bundles/<unit>/cues.json)
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2] ?? 'dist';
const bundles = join(dir, 'bundles');
const units = existsSync(bundles) ? readdirSync(bundles).filter((u) => existsSync(join(bundles, u, 'cues.json'))) : [];
const faults = units.length ? [] : [`no cue sheets under ${bundles}`];
const FIRST_MAX = 600 * 1024;
let clips = 0;
for (const u of units) {
  const sheet = JSON.parse(readFileSync(join(bundles, u, 'cues.json'), 'utf8')).clips ?? {};
  const spec = join('units', u, 'unit.json');
  const first = new Set(existsSync(spec) ? JSON.parse(readFileSync(spec, 'utf8')).chapters?.[0]?.clips ?? [] : []);
  const size = { '.opus': [0, 0], '.m4a': [0, 0] };
  for (const [id, clip] of Object.entries(sheet)) {
    clips++;
    for (const ext of ['.opus', '.m4a']) {
      const f = join(bundles, u, clip.src + ext);
      if (!existsSync(f)) { faults.push(`${u}/${id}: ${clip.src}${ext} is missing`); continue; }
      const b = statSync(f).size;
      size[ext][0] += b;
      if (first.has(id)) size[ext][1] += b;
    }
  }
  for (const [ext, [, one]] of Object.entries(size)) {
    if (one > FIRST_MAX) faults.push(`${u}: first chapter ${ext} audio is ${(one / 1024).toFixed(0)} kB, over 600 kB`);
  }
  console.log(`bundle-check: ${u} audio ${(size['.opus'][0] / 1024).toFixed(0)} / ${(size['.m4a'][0] / 1024).toFixed(0)} kB (opus / m4a), first chapter ${(size['.opus'][1] / 1024).toFixed(0)} / ${(size['.m4a'][1] / 1024).toFixed(0)} kB`);
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
