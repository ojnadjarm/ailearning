// Public-repo hygiene: fails on home paths, private hosts, emails, internal wording or raw audio.
// Usage: node tools/hygiene.mjs [--dist] [--root <dir>]; HYGIENE_DENY=<file outside the repo> adds one regex per line,
// and its `allow <path-glob> <regex>` lines exempt exactly those spans in those files from the deny-list (never from the leak checks).
// Sources = the files git would commit (tracked + untracked, not ignored); outside a git repo, every file under the root.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { spawnSync } from 'node:child_process';

const LEAK = [/\/home\//, /\.ts\.net\b/, /[\w.+-]+@[\w-]+\.[a-z]{2,}\b/i, /~\/agents/, /\bprivate\//, /:8[04][79]0\b/];
const WORDING = [/\bT\d{2}[a-z]?\b/, /ateli[e]r/i, /\bfleet\b/i, /orchestrat[o]r/i, /\bdrop\b(?!-shadow)/i, /\bthe owner\b/i, /\btickets?\b/i];
const VENDORED = /^src\/kit\//;
const RAW_AUDIO = new Set(['.wav', '.flac', '.aiff', '.mp3']);
const TEXT = new Set(['', '.ts', '.js', '.mjs', '.cjs', '.json', '.html', '.css', '.md', '.txt', '.sh', '.yml', '.yaml', '.svg', '.xml']);
const SKIP_DIR = new Set(['node_modules', '.git', '.vite', 'out', '.render']);

const args = process.argv.slice(2);
const root = args.includes('--root') ? args[args.indexOf('--root') + 1] : '.';
const dist = args.includes('--dist');
const scanRoot = dist ? join(root, 'dist') : root;
const rules = process.env.HYGIENE_DENY
  ? readFileSync(process.env.HYGIENE_DENY, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
  : [];
const glob = (g) => new RegExp('^' + g.split('**').map((p) => p.split('*').map((q) => q.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*')).join('.*') + '$');
const allow = rules.filter((l) => l.startsWith('allow ')).map((l) => {
  const [, path, ...re] = l.split(' ');
  return { path: glob(path), re: new RegExp(re.join(' '), 'g') };
});
const deny = rules.filter((l) => !l.startsWith('allow ')).map((l) => new RegExp(l, 'i'));

const walk = (d) => readdirSync(d).flatMap((f) => {
  const p = join(d, f);
  if (statSync(p).isDirectory()) return SKIP_DIR.has(f) || f.endsWith('.raw') || (!dist && f === 'dist') ? [] : walk(p);
  return [p];
});
const committable = () => {
  const git = spawnSync('git', ['-C', root, 'ls-files', '-co', '--exclude-standard', '-z'], { encoding: 'utf8' });
  const top = spawnSync('git', ['-C', root, 'rev-parse', '--show-prefix'], { encoding: 'utf8' });
  if (git.status !== 0 || top.stdout.trim() !== '') return walk(root);
  return git.stdout.split('\0').filter((f) => f && existsSync(join(root, f))).map((f) => join(root, f));
};

const hits = [];
if (!existsSync(scanRoot)) { console.error(`hygiene: ${scanRoot} does not exist`); process.exit(2); }
for (const file of dist ? walk(scanRoot) : committable()) {
  const rel = relative(root, file);
  if (RAW_AUDIO.has(extname(file))) { hits.push(`${rel}: raw audio`); continue; }
  if (!TEXT.has(extname(file))) continue;
  const patterns = [...LEAK, ...(dist || !VENDORED.test(rel) ? WORDING : [])];
  const spans = allow.filter((a) => a.path.test(rel)).map((a) => a.re);
  readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    const denyLine = spans.reduce((l, re) => l.replace(re, ' '), line);
    for (const [re, text] of [...patterns.map((p) => [p, line]), ...deny.map((p) => [p, denyLine])]) {
      const m = text.match(re);
      if (m) hits.push(`${rel}:${i + 1}: ${re} matched ${JSON.stringify(m[0])}`);
    }
  });
}
hits.forEach((h) => console.error(`hygiene: ${h}`));
console.log(`hygiene: ${dist ? 'dist' : 'sources'}, ${hits.length} hits${deny.length ? `, ${deny.length} deny-list patterns, ${allow.length} allowed spans` : ''}`);
process.exit(hits.length ? 1 : 0);
