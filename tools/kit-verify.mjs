// Checks the vendored kit files against src/kit/VERSION (sha256 per file); --write records them.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOTS = ['src/kit/cutaway', 'src/kit/explainer', 'public/fonts'];
const VERSION = 'src/kit/VERSION';
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const sha = (f) => createHash('sha256').update(readFileSync(f)).digest('hex');
const now = ROOTS.flatMap(walk).sort().map((f) => `${sha(f)}  ${relative('.', f)}`);

if (process.argv.includes('--write')) {
  writeFileSync(VERSION, now.join('\n') + '\n');
  console.log(`kit-verify: recorded ${now.length} files`);
} else {
  const want = existsSync(VERSION) ? readFileSync(VERSION, 'utf8').trim().split('\n') : [];
  const a = new Set(want), b = new Set(now);
  const bad = [...want.filter((l) => !b.has(l)).map((l) => `changed or missing: ${l.slice(66)}`), ...now.filter((l) => !a.has(l)).map((l) => `not in VERSION: ${l.slice(66)}`)];
  bad.forEach((m) => console.error(`kit-verify: ${m}`));
  console.log(`kit-verify: ${now.length} files, ${bad.length} faults`);
  process.exit(bad.length ? 1 : 0);
}
