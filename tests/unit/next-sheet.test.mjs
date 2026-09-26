import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chapterList } from 'explainer-kit';
import { NEXT, FINISHED, PRACTICE_WAYS, SECTIONS } from '../../units/01-neuron/unit/ways.ts';
import { SPEC, CUES } from '../lib/lesson.mjs';

const HOME = JSON.parse(readFileSync('content/homepage.json', 'utf8'));

test('the end card names the next sheet from the homepage, a phantom (no link) until that unit is drawn', () => {
  const u = HOME.units.find((x) => x.n === 2);
  assert.equal(NEXT.label, `Next: Sheet ${u.plate} · ${u.title}`);
  assert.equal('href' in NEXT, u.status === 'drawn');
});

test('the closing chapter is the last listed, a beat chapter timed by its two clips; its closing line names the next sheet', () => {
  const last = SPEC.chapters.at(-1);
  assert.deepEqual([last.numeral, last.title, last.beat, last.clips], ['XIV', "What one neuron can't do", 'click', ['payoff', 'close']]);
  for (const id of last.clips) assert.ok(CUES.clips[id]?.duration > 0, `clip ${id} is rendered`);
  const close = SPEC.clips.find((c) => c.id === 'close').sentences;
  assert.match(close.join(' '), /next sheet/);
  assert.match(close.at(-1), /^See you/, 'the lesson ends on a goodbye');
  assert.ok(CUES.clips.close.words.some((w) => w.w === 'See'), 'the goodbye is voiced in the close clip');
  const row = chapterList(SPEC.chapters, {}, 0, { furthest: 0, visited: new Set(['click']), completed: new Set(['click']) }).at(-1);
  assert.deepEqual([row.beat, row.t, row.reached, row.done], ['click', undefined, true, true]);
});

test('a finished lesson lands on the end chooser; Practice is a section outside the chapters with its way back', () => {
  assert.deepEqual(FINISHED.choices, PRACTICE_WAYS);
  assert.deepEqual(PRACTICE_WAYS.map((c) => [c.label, c.to, c.kind]), [['Practice exercises', 'practice', 'primary'], ['Practice tuning', 'tunes', 'secondary'], ['Watch again', 'watch', 'quiet']]);
  assert.deepEqual(SECTIONS.map((s) => [s.name, s.tabs.map((t) => t.beat)]), [['Practice', ['practice', 'tunes']]]);
  assert.ok(!SPEC.chapters.some((c) => ['practice', 'tunes'].includes(c.beat)), 'Practice is no chapter');
});
