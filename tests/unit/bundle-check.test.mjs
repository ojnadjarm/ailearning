import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

/** Builds a throwaway bundle with the given audio files, runs the check on it, removes it. */
function check(files) {
  const dir = mkdtempSync(join(tmpdir(), 'bundle-'));
  try {
    mkdirSync(join(dir, 'bundles/01-x/audio'), { recursive: true });
    writeFileSync(join(dir, 'bundles/01-x/cues.json'), JSON.stringify({ clips: { w1: { src: 'audio/w1' }, twin: { src: 'audio/twin' } } }));
    for (const f of files) writeFileSync(join(dir, 'bundles/01-x/audio', f), 'x');
    return spawnSync(process.execPath, ['tools/bundle-check.mjs', dir], { encoding: 'utf8' }).status;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('passes when every clip has both formats', () => assert.equal(check(['w1.opus', 'w1.m4a', 'twin.opus', 'twin.m4a']), 0));
test('fails on a missing AAC clip', () => assert.equal(check(['w1.opus', 'w1.m4a', 'twin.opus']), 1));
test('fails on a missing Opus clip', () => assert.equal(check(['w1.m4a', 'twin.opus', 'twin.m4a']), 1));
test('the committed bundles are complete', () => assert.equal(spawnSync(process.execPath, ['tools/bundle-check.mjs', 'public']).status, 0));
