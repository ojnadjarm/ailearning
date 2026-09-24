import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startPagesSim } from '../lib/pages-sim.mjs';

test('pages-sim behaves like GitHub Pages under the base', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'sim-'));
  mkdirSync(join(dir, 'u/01-neuron'), { recursive: true });
  writeFileSync(join(dir, 'index.html'), 'home');
  writeFileSync(join(dir, 'u/01-neuron/index.html'), 'unit');
  writeFileSync(join(dir, '404.html'), 'sheet not found');
  const sim = await startPagesSim({ dir, base: '/ailearning/' });
  const origin = new URL(sim.url).origin;
  const get = (p) => fetch(origin + p, { redirect: 'manual' });
  try {
    assert.equal((await get('/ailearning')).headers.get('location'), '/ailearning/');
    assert.equal(await (await get('/ailearning/')).text(), 'home');
    const dirNoSlash = await get('/ailearning/u/01-neuron');
    assert.equal(dirNoSlash.status, 301);
    assert.equal(dirNoSlash.headers.get('location'), '/ailearning/u/01-neuron/');
    const miss = await get('/ailearning/u/99-nothing/');
    assert.equal(miss.status, 404);
    assert.equal(await miss.text(), 'sheet not found');
    assert.equal((await get('/other/')).status, 404);
    assert.equal((await get('/ailearning/../secret')).status, 404);
  } finally {
    await sim.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('pages-sim serves its default 404 as HTML when there is no 404.html', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'sim-'));
  writeFileSync(join(dir, 'index.html'), 'home');
  const sim = await startPagesSim({ dir, base: '/ailearning/' });
  try {
    const miss = await fetch(new URL(sim.url).origin + '/ailearning/nothing/');
    assert.equal(miss.status, 404);
    assert.match(miss.headers.get('content-type'), /^text\/html/);
  } finally {
    await sim.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
