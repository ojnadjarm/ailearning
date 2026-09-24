import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const notices = readFileSync('public/THIRD-PARTY-NOTICES.txt', 'utf8');

for (const [name, range] of Object.entries(pkg.dependencies)) {
  test(`notices name ${name} at its installed version`, () => {
    const { version } = JSON.parse(readFileSync(`node_modules/${name}/package.json`, 'utf8'));
    assert.match(notices, new RegExp(`\\b${name}\\S*\\s+${version.replaceAll('.', '\\.')}`, 'i'), `${name} ${version} (${range}) missing`);
  });
}
