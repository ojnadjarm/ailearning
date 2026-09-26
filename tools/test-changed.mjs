// Runs only the checks that cover the changed files: typecheck, kit-verify, hygiene, the node tests, a build and the e2e jobs each path maps to.
// Usage: node tools/test-changed.mjs [--dry] [path ...]   (no paths: every file `git status` lists as changed or new)
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const E2E = ['home-perf', 'sheet-change', 'sheet-cold', 'lesson', 'unit', 'flow', 'geometry', 'home', 'site', 'pencils'];
const NODE = readdirSync('tests/unit').filter((f) => f.endsWith('.test.mjs')).map((f) => f.slice(0, -'.test.mjs'.length));
const ALL = { node: NODE, e2e: E2E, typecheck: true, kit: true, build: true };
const UNIT_NODE = ['lesson', 'place', 'place-arrow', 'framing', 'play', 'next-sheet', 'chapter-numbers'];

/** Path pattern → what covers it; the first match wins. */
const MAP = [
  [/^(package(-lock)?\.json|tsconfig\.json|vite\.config\.ts|tests\/lib\/register\.mjs)$/, ALL],
  [/^units\/[^/]+\/sim\//, { node: ['play', 'lesson', 'framing', 'place', 'place-arrow'], e2e: ['unit', 'geometry', 'lesson'], typecheck: true }],
  [/^units\/[^/]+\/(unit\/|unit\.json)/, { node: UNIT_NODE, e2e: ['unit', 'flow', 'pencils', 'geometry', 'lesson'], typecheck: true }],
  [/^(units\/|u\/)/, { e2e: ['unit', 'flow', 'pencils', 'geometry', 'site'], typecheck: true, build: true }],
  [/^public\/bundles\//, { node: ['bundle-check', 'lesson'], e2e: ['unit', 'lesson'], build: true }],
  [/^public\/sound\//, { node: ['bundle-check'], e2e: ['sheet-change'], build: true }],
  [/^public\//, { e2e: ['site', 'home'], build: true }],
  [/^src\/kit\/explainer\//, { node: UNIT_NODE, e2e: ['unit', 'flow', 'geometry'], typecheck: true, kit: true }],
  [/^src\/kit\/cutaway\//, { node: ['framing'], e2e: ['site', 'home'], typecheck: true, kit: true }],
  [/^src\/kit\//, { kit: true }],
  [/^(src\/site\/homepage\/|content\/|index\.html$)/, { node: ['content', 'link-check', 'next-sheet'], e2e: ['home', 'home-perf', 'site'], build: true }],
  [/^(src\/site\/|src\/core\/|404\.html$)/, { e2e: ['site', 'sheet-change', 'sheet-cold', 'unit'], typecheck: true, build: true }],
  [/^tools\/(kit-verify\.mjs|sync-kit\.sh)$/, { kit: true }],
  [/^tools\/([\w-]+?)(-check)?\.mjs$/, (m) => ({ node: [m[1] + (m[2] ?? ''), m[1]], hygiene: true, build: m[1] !== 'test-changed' })],
  [/^tools\//, { hygiene: true }],
  [/^tests\/unit\/([\w-]+)\.test\.mjs$/, (m) => ({ node: [m[1]] })],
  [/^tests\/e2e\/([\w-]+)\.mjs$/, (m) => ({ e2e: [m[1]], build: true })],
  [/^tests\/run-e2e\.mjs$/, { e2e: E2E, build: true }],
  [/^tests\/lib\/([\w-]+\.mjs)$/, (m) => users(m[1])],
  [/(\.md|^LICENSE.*|^\.gitignore)$/, { hygiene: true }],
];

/** The node tests and e2e jobs that import tests/lib/`name`, directly or through another lib file. */
function users(name, seen = new Set()) {
  const out = { node: [], e2e: [], build: false };
  if (seen.has(name)) return out;
  seen.add(name);
  const scan = (dir, suffix) => readdirSync(dir).filter((f) => f.endsWith(suffix) && readFileSync(`${dir}/${f}`, 'utf8').includes(`../lib/${name}`));
  out.node = scan('tests/unit', '.test.mjs').map((f) => f.slice(0, -'.test.mjs'.length));
  out.e2e = scan('tests/e2e', '.mjs').map((f) => f.slice(0, -4));
  for (const f of readdirSync('tests/lib').filter((f) => f !== name && readFileSync(`tests/lib/${f}`, 'utf8').includes(`./${name}`))) {
    const up = users(f, seen);
    out.node.push(...up.node);
    out.e2e.push(...up.e2e);
  }
  out.build = out.e2e.length > 0;
  return out;
}

/** Merges what covers each path into one plan; a path no rule knows runs everything. */
export function plan(paths) {
  const p = { node: new Set(), e2e: new Set(), typecheck: false, kit: false, hygiene: false, build: false, unmapped: [] };
  for (const path of paths) {
    const rule = MAP.find(([re]) => re.test(path));
    if (!rule) p.unmapped.push(path);
    const got = !rule ? ALL : typeof rule[1] === 'function' ? rule[1](path.match(rule[0])) : rule[1];
    (got.node ?? []).filter((n) => NODE.includes(n)).forEach((n) => p.node.add(n));
    (got.e2e ?? []).filter((e) => E2E.includes(e)).forEach((e) => p.e2e.add(e));
    for (const k of ['typecheck', 'kit', 'hygiene', 'build']) p[k] ||= !!got[k];
  }
  p.build ||= p.e2e.size > 0;
  return { ...p, node: [...p.node].sort(), e2e: E2E.filter((e) => p.e2e.has(e)) };
}

/** The changed and new files `git status` lists, relative to the repo root. */
function changed() {
  const out = execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], { encoding: 'utf8' });
  return out.split('\n').filter(Boolean).map((l) => l.slice(3).split(' -> ').pop().replace(/^"|"$/g, ''));
}

/** The commands for a plan, in the order ci runs them. */
export function commands(p) {
  const cmds = [];
  if (p.typecheck) cmds.push(['npm', 'run', 'typecheck']);
  if (p.kit) cmds.push(['npm', 'run', 'kit:verify']);
  if (p.hygiene && !p.build) cmds.push(['npm', 'run', 'hygiene']);
  if (p.node.length) cmds.push(['node', '--import', './tests/lib/register.mjs', '--test', ...p.node.map((n) => `tests/unit/${n}.test.mjs`)]);
  if (p.build) cmds.push(['npm', 'run', 'build']);
  if (p.e2e.length) cmds.push(['node', 'tests/run-e2e.mjs', ...p.e2e]);
  return cmds;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), dry = args.includes('--dry');
  const paths = args.filter((a) => a !== '--dry').map((a) => a.replace(/^\.\//, ''));
  const files = paths.length ? paths : changed();
  const p = plan(files);
  const cmds = commands(p);
  console.log(`test:changed: ${files.length} files → ${cmds.length} steps${p.unmapped.length ? ` (unmapped, so everything: ${p.unmapped.slice(0, 5).join(', ')})` : ''}`);
  cmds.forEach((c) => console.log(`  ${c.join(' ')}`));
  if (dry || !cmds.length) process.exit(0);
  for (const c of cmds) {
    const r = spawnSync(c[0], c.slice(1), { stdio: 'inherit' });
    if (r.status) process.exit(r.status);
  }
  console.log('test:changed: all steps passed');
}
