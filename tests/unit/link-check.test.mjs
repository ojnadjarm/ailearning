import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

/** Builds a throwaway dist with a home page holding `body` and one live unit page, runs the checker on it. */
function check(body) {
  const dist = mkdtempSync(join(tmpdir(), 'links-'));
  try {
    mkdirSync(join(dist, 'u/01-neuron'), { recursive: true });
    writeFileSync(join(dist, 'u/01-neuron/index.html'), '<p>U01</p>');
    writeFileSync(join(dist, 'index.html'), `<svg><symbol id="s-gauge"/></svg><h2 id="path">Parts</h2>${body}`);
    return spawnSync(process.execPath, ['tools/link-check.mjs', dist], { encoding: 'utf8', env: { ...process.env, BASE: '/ailearning/' } }).status;
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
}

test('links to built pages and existing ids pass', () => assert.equal(check('<a href="/ailearning/u/01-neuron/">I</a><a href="#path">P</a><use href="#s-gauge"/>'), 0));
test('a link to an unbuilt unit fails', () => assert.equal(check('<a href="/ailearning/u/02-layers/">II</a>'), 1));
test('a fragment with no target fails', () => assert.equal(check('<a href="#nowhere">x</a>'), 1));
test('a link outside the base fails', () => assert.equal(check('<a href="/elsewhere/">x</a>'), 1));
