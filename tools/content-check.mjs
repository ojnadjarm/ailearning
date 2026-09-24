// Homepage content check: JSON Schema (ajv, draft 2020-12), then path, copy and silhouette rules. Private names are hygiene's job.
// Usage: node tools/content-check.mjs [file]; exits 1 on any error.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';

const ROOT = new URL('..', import.meta.url);
const SCHEMA = JSON.parse(readFileSync(new URL('content/homepage.schema.json', ROOT), 'utf8'));
const ROMAN = [[40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
const MAX_SILHOUETTES = 12;
const MAX_PROMISE_WORDS = 12;
const schemaCheck = new Ajv2020({ allErrors: true }).compile(SCHEMA);

const roman = (n) => ROMAN.reduce((out, [v, s]) => { while (n >= v) { out += s; n -= v; } return out; }, '');
const strings = (node) => typeof node === 'string' ? [node]
  : Array.isArray(node) ? node.flatMap(strings)
  : node && typeof node === 'object' ? Object.entries(node).flatMap(([k, v]) => [k, ...strings(v)]) : [];
const dups = (list) => [...new Set(list.filter((v, i) => list.indexOf(v) !== i))].sort();
const pad = (n) => String(n).padStart(2, '0');

/** Each check yields error strings for one rule. */
export const CHECKS = {
  *numbering(doc) {
    for (const [i, u] of doc.units.entries()) {
      const want = { n: i + 1, id: `U${pad(i + 1)}`, plate: roman(i + 1) };
      for (const [k, v] of Object.entries(want)) if (u[k] !== v) yield `${u.id}: ${k} is ${JSON.stringify(u[k])}, expected ${JSON.stringify(v)}`;
      if (!u.slug.startsWith(`${pad(i + 1)}-`)) yield `${u.id}: slug ${JSON.stringify(u.slug)} must start with ${pad(i + 1)}-`;
    }
  },
  *unique(doc) {
    for (const k of ['id', 'slug', 'title']) for (const d of dups(doc.units.map((u) => u[k]))) yield `duplicate unit ${k}: ${JSON.stringify(d)}`;
    for (const d of dups(doc.units.map((u) => u.game).filter(Boolean))) yield `duplicate game: ${JSON.stringify(d)}`;
  },
  *requires(doc) {
    const order = Object.fromEntries(doc.units.map((u) => [u.id, u.n]));
    for (const u of doc.units) for (const r of u.requires) {
      if (!(r in order)) yield `${u.id}: requires unknown ${r}`;
      else if (order[r] >= u.n) yield `${u.id}: requires ${r}, which is not earlier on the path`;
    }
  },
  *rings(doc) {
    const rings = new Set(doc.rings.map((r) => r.n));
    let last = 0;
    for (const u of doc.units) {
      if (!rings.has(u.ring)) yield `${u.id}: ring ${u.ring} is not defined`;
      if (u.ring < last) yield `${u.id}: ring ${u.ring} after ring ${last}`;
      last = u.ring;
    }
  },
  *silhouettes(doc) {
    const defined = new Set(Object.keys(doc.silhouettes)), used = new Set(doc.units.map((u) => u.silhouette));
    if (defined.size > MAX_SILHOUETTES) yield `${defined.size} silhouettes, max ${MAX_SILHOUETTES}`;
    for (const s of [...used].filter((s) => !defined.has(s)).sort()) yield `silhouette ${JSON.stringify(s)} is used but not defined`;
    for (const s of [...defined].filter((s) => !used.has(s)).sort()) yield `silhouette ${JSON.stringify(s)} is defined but unused`;
  },
  *copy(doc) {
    for (const line of doc.site.promise) if (line.split(/\s+/).length > MAX_PROMISE_WORDS) yield `promise over ${MAX_PROMISE_WORDS} words: ${JSON.stringify(line)}`;
    for (const s of strings(doc)) if (s.includes('?')) yield `question mark in copy (no opening questions): ${JSON.stringify(s)}`;
  },
};

/** Schema errors alone when there are any, else every rule's errors. */
export function validate(doc) {
  if (!schemaCheck(doc)) return schemaCheck.errors.map((e) => `schema: ${e.instancePath || '/'} ${e.message}`);
  return Object.values(CHECKS).flatMap((check) => [...check(doc)]);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const file = process.argv[2] ?? new URL('content/homepage.json', ROOT);
  const errors = validate(JSON.parse(readFileSync(file, 'utf8')));
  errors.forEach((e) => console.error(`content: ${e}`));
  console.log(`content: ${errors.length} error(s)`);
  process.exit(errors.length ? 1 : 0);
}
