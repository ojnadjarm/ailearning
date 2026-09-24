import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const run = (root, env = {}) => spawnSync(process.execPath, ['tools/hygiene.mjs', '--root', root], { env: { ...process.env, ...env }, encoding: 'utf8' });

/** Builds a throwaway repo tree with one file, runs hygiene on it, removes it. */
function plant(rel, text, env) {
  const root = mkdtempSync(join(tmpdir(), 'hygiene-'));
  try {
    mkdirSync(join(root, rel, '..'), { recursive: true });
    writeFileSync(join(root, rel), text);
    return run(root, typeof env === 'function' ? env(root) : env);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('the repo itself is clean', () => assert.equal(run('.').status, 0, run('.').stderr));
test('a clean fixture passes', () => assert.equal(plant('units/x/unit.json', '{"title": "The neuron"}').status, 0));

const leaks = {
  'home path': ['tools/a.sh', 'cp /' + 'home/someone/x .'],
  'agents path': ['CLAUDE.md', 'see ~' + '/agents/kits'],
  'tailnet host': ['src/a.ts', 'const u = "https://box.example.ts' + '.net/";'],
  'email': ['README.md', 'mail someone' + '@example.org'],
  'local port': ['units/x/main.ts', 'fetch("https://host:84' + '70/")'],
  'internal id in public copy': ['units/x/unit.json', '{"title": "from T' + '71"}'],
  'internal id in tooling': ['tools/a.mjs', '// see T' + '71'],
  'internal wording in public copy': ['README.md', 'Built by the fle' + 'et.'],
  'maintainer wording in agent notes': ['CLAUDE.md', 'The ow' + 'ner pushes daily.'],
  'work-item wording': ['tests/e2e/a.mjs', '// tic' + 'ket 12'],
  'raw audio': ['public/bundles/x/w1.wav', 'RIFF'],
  'raw flac audio': ['public/bundles/x/w1.flac', 'fLaC'],
};
for (const [name, [rel, text]] of Object.entries(leaks)) {
  test(`fails on a planted ${name}`, () => assert.equal(plant(rel, text).status, 1));
}

test('internal ids in the vendored kits are allowed', () => assert.equal(plant('src/kit/cutaway/a.ts', '// see T' + '71').status, 0));

test('fails on a name from the external deny-list', () => {
  const deny = join(mkdtempSync(join(tmpdir(), 'deny-')), 'deny.txt');
  writeFileSync(deny, '# names\nacme\\s?corp\n');
  assert.equal(plant('README.md', 'Made at Acme Corp.', { HYGIENE_DENY: deny }).status, 1);
  assert.equal(plant('README.md', 'Made by Claude.', { HYGIENE_DENY: deny }).status, 0);
});

test('an allowed credit span passes only in its own file, and only the span itself', () => {
  const dir = mkdtempSync(join(tmpdir(), 'deny-'));
  const deny = join(dir, 'deny.txt');
  writeFileSync(deny, '\\bada\\b\nlovelace\nallow README.md Directed by Ada Lovelace\nallow units/*/plate.ts ^const SIGNED = \\{ approved: \'Ada Lovelace\' \\};$\n');
  const env = { HYGIENE_DENY: deny };
  assert.equal(plant('README.md', 'Drawn by Claude · Directed by Ada Lovelace', env).status, 0);
  assert.equal(plant('units/x/plate.ts', "const SIGNED = { approved: 'Ada Lovelace' };", env).status, 0);
  assert.equal(plant('CLAUDE.md', 'Directed by Ada Lovelace', env).status, 1);
  assert.equal(plant('README.md', 'Directed by Ada Lovelace, thanks Ada', env).status, 1);
  assert.equal(plant('README.md', 'Directed by Ada Lovelace, ada' + '@example.org', env).status, 1);
  assert.equal(plant('units/x/plate.ts', "const SIGNED = { drawn: 'Ada Lovelace' };", env).status, 1);
  rmSync(dir, { recursive: true, force: true });
});

test('the homepage credit spots pass, and the name anywhere else on the homepage fails', () => {
  const [, name, url] = readFileSync('README.md', 'utf8').match(/Directed by \[([^\]]+)\]\(([^)]+)\)/);
  const credits = readFileSync('src/site/homepage/credits.mjs', 'utf8');
  const spots = `<td><small>Approved</small>${name}</td>\n<p class="col1">Drawn by Claude · Directed by <a rel="author" href="${url}">${name}</a></p>\n`;
  const re = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const dir = mkdtempSync(join(tmpdir(), 'deny-'));
  const deny = join(dir, 'deny.txt');
  writeFileSync(deny, [...name.toLowerCase().split(' ').map((w) => `\\b${w}\\b`),
    `allow src/site/homepage/credits.mjs ^${re(credits.split('\n').find((l) => l.includes(name)))}$`,
    ...spots.trim().split('\n').map((s) => `allow dist/index.html ${re(s)}`)].join('\n'));
  const env = { HYGIENE_DENY: process.env.HYGIENE_DENY || deny };
  const dist = (html) => { const r = mkdtempSync(join(tmpdir(), 'hygiene-')); mkdirSync(join(r, 'dist')); writeFileSync(join(r, 'dist/index.html'), html); const s = spawnSync(process.execPath, ['tools/hygiene.mjs', '--root', r, '--dist'], { env: { ...process.env, ...env }, encoding: 'utf8' }).status; rmSync(r, { recursive: true, force: true }); return s; };
  assert.equal(plant('src/site/homepage/credits.mjs', credits, env).status, 0);
  assert.equal(plant('src/site/homepage/render/sections.mjs', `const by = '${name}';`, env).status, 1);
  assert.equal(plant('src/site/homepage/credits.mjs', `${credits}// ${name}\n`, env).status, 1);
  assert.equal(dist(`<table>${spots}</table>`), 0);
  assert.equal(dist(`<table>${spots}</table><h1>${name}</h1>`), 1);
  assert.equal(dist(`<td><small>Drawn</small>${name}</td>`), 1);
  rmSync(dir, { recursive: true, force: true });
});
