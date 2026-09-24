// Internal links: every href/src in dist/**/*.html under the base resolves to a built file (dir/ → index.html), every #id exists.
// Usage: node tools/link-check.mjs [distDir]; runs after every build. External URLs are check-links.sh's job.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';

const BASE = process.env.BASE ?? '/ailearning/';
const dist = process.argv[2] ?? 'dist';
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const faults = [];
let links = 0;
for (const page of walk(dist).filter((f) => f.endsWith('.html'))) {
  const html = readFileSync(page, 'utf8'), ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const at = '/' + relative(dist, dirname(page)).split('\\').join('/');
  for (const [, url] of html.matchAll(/\s(?:href|src)="([^"]*)"/g)) {
    if (/^(https?:|data:|mailto:)/.test(url) || url === '') continue;
    links++;
    const [path, frag] = url.split('#');
    if (!path) { if (frag && !ids.has(frag)) faults.push(`${page}: #${frag} has no target`); continue; }
    const abs = path.startsWith('/') ? path : join(BASE, at, path);
    if (!abs.startsWith(BASE)) { faults.push(`${page}: ${url} is outside ${BASE}`); continue; }
    const file = join(dist, abs.slice(BASE.length).split('?')[0]);
    const ok = abs.endsWith('/') ? existsSync(join(file, 'index.html')) : existsSync(file) && statSync(file).isFile();
    if (!ok) faults.push(`${page}: ${url} → missing page or file`);
  }
}
faults.forEach((f) => console.error(`link-check: ${f}`));
console.log(`link-check: ${links} internal links in ${dist}, ${faults.length} broken`);
process.exit(faults.length ? 1 : 0);
