// Every runtime URL must go through the Pages base: checks the sources for page- or root-relative URLs and dist for URLs outside BASE.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const BASE = process.env.BASE ?? '/ailearning/';
const OK_URL = (u) => u.startsWith(BASE) || /^(data:|https?:|#|mailto:)/.test(u);
const walk = (d) => (existsSync(d) ? readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)])) : []);

const SOURCE_RULES = {
  '.html': [[/(?:href|src)="\/(?!\/)/, 'root-absolute href/src (use a relative path; Vite adds the base)']],
  '.ts': [
    [/fetch\(\s*(['"]|`(?!\$\{))/, 'fetch() of a literal URL (prefix import.meta.env.BASE_URL)'],
    [/url\((?!\$\{)[^)]*\.(woff2?|png|svg|avif|opus|m4a|json)/, 'url() in a script without the base'],
    [/loadBundle\(\s*['"]/, 'loadBundle() of a literal path (prefix the base)'],
  ],
};
const DIST_JS = /["'`]\/?(bundles|fonts|assets)\//;
/** Vite's dependency map for a lazy chunk lists base-relative files its preload helper prefixes with the base; it is not a page URL. */
const VITE_DEPS = /^const __vite__mapDeps=.*$/m;

const faults = [];
const sources = ['index.html', '404.html', ...walk('u'), ...walk('units'), ...walk('src')].filter((f) => existsSync(f));
for (const f of sources) {
  const rules = SOURCE_RULES[extname(f)] ?? [];
  readFileSync(f, 'utf8').split('\n').forEach((line, i) => rules.forEach(([re, why]) => re.test(line) && faults.push(`${f}:${i + 1}: ${why}`)));
}
for (const f of walk('dist')) {
  const text = extname(f) === '.html' || extname(f) === '.css' || extname(f) === '.js' ? readFileSync(f, 'utf8') : '';
  if (extname(f) === '.html') for (const [, u] of text.matchAll(/(?:href|src)="([^"]*)"/g)) if (!OK_URL(u)) faults.push(`${f}: ${u} is outside ${BASE}`);
  if (extname(f) === '.css') for (const [, u] of text.matchAll(/url\(\s*['"]?([^'")]*)/g)) if (!OK_URL(u)) faults.push(`${f}: url(${u}) is outside ${BASE}`);
  if (extname(f) === '.js') { const m = text.replace(VITE_DEPS, '').match(DIST_JS); if (m) faults.push(`${f}: page-relative asset string ${m[0]}`); }
}
faults.forEach((m) => console.error(`base-check: ${m}`));
console.log(`base-check: ${sources.length} sources + dist under ${BASE}, ${faults.length} faults`);
process.exit(faults.length ? 1 : 0);
