import { test } from 'node:test';
import assert from 'node:assert/strict';
import { plan, commands } from '../../tools/test-changed.mjs';

test('a unit sim file runs its node tests and the unit, geometry and lesson e2e, no homepage', () => {
  const p = plan(['units/01-neuron/sim/neuron.ts']);
  assert.ok(p.node.includes('place') && p.node.includes('lesson'));
  assert.deepEqual(p.e2e, ['lesson', 'unit', 'geometry']);
  assert.ok(p.typecheck && p.build);
});
test('a homepage file runs content, link-check and next-sheet, then home, home-perf and site', () => {
  const p = plan(['src/site/homepage/draw/draft.mjs']);
  assert.deepEqual(p.node, ['content', 'link-check', 'next-sheet']);
  assert.deepEqual(p.e2e, ['home-perf', 'home', 'site']);
});
test('a test lib reaches every e2e that imports it through another lib', () => {
  const p = plan(['tests/lib/pages-sim.mjs']);
  assert.deepEqual(p.node, ['pages-sim']);
  assert.equal(p.e2e.length, 10);
});
test('a tool runs the node test of its name; a note runs hygiene only', () => {
  assert.deepEqual(plan(['tools/bundle-check.mjs']).node, ['bundle-check']);
  assert.deepEqual(commands(plan(['CLAUDE.md'])), [['npm', 'run', 'hygiene']]);
});
test('a path no rule knows runs everything', () => {
  const p = plan(['somewhere/new.txt']);
  assert.deepEqual(p.unmapped, ['somewhere/new.txt']);
  assert.equal(p.e2e.length, 10);
  assert.ok(p.typecheck && p.kit && p.build);
});
