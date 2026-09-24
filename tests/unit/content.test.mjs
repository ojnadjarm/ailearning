import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validate } from '../../tools/content-check.mjs';

const DOC = JSON.parse(readFileSync('content/homepage.json', 'utf8'));

/** Validates a mutated deep copy of the real content. */
const run = (mutate) => { const d = structuredClone(DOC); mutate(d); return validate(d); };

test('the real content passes', () => assert.deepEqual(run(() => {}), []));

const faults = [
  ['a missing unit', (d) => d.units.pop(), 'schema'],
  ['credits not Claude', (d) => { d.site.credits.drawn = 'Someone'; }, 'schema'],
  ['a wrong plate numeral', (d) => { d.units[2].plate = 'II'; }, 'plate is'],
  ['a wrong slug prefix', (d) => { d.units[3].slug = '03-x'; }, 'slug'],
  ['a duplicate title', (d) => { d.units[4].title = 'Loss'; }, 'duplicate unit title'],
  ['a later requirement', (d) => { d.units[1].requires = ['U05']; }, 'not earlier'],
  ['an unknown requirement', (d) => { d.units[1].requires = ['U99']; }, 'unknown'],
  ['an undefined silhouette', (d) => { d.units[1].silhouette = 'nope'; }, 'not defined'],
  ['an unused silhouette', (d) => { d.units[5].silhouette = 'graph'; }, 'unused'],
  ['a long promise', (d) => { d.site.promise[0] = 'one two three four five six seven eight nine ten eleven twelve thirteen'; }, 'words'],
  ['a question', (d) => { d.units[0].line = 'What does a neuron do?'; }, 'question mark'],
  ['a 13th silhouette', (d) => { for (const k of 'abcdefghijklm'.slice(0, 13 - Object.keys(d.silhouettes).length)) d.silhouettes[`extra-${k}`] = { name: 'x', draws: 'x' }; }, 'silhouettes'],
];
for (const [name, mutate, expect] of faults) {
  test(`fails on ${name}`, () => { const e = run(mutate); assert.ok(e.some((m) => m.includes(expect)), e.join('\n')); });
}
