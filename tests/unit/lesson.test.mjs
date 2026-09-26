import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lintUnit } from 'explainer-kit';
import { evalAssert } from '../../src/kit/explainer/src/content/asserts.ts';
import { num, signed, op, fix, sfix, tags, noteRows, example } from '../../units/01-neuron/sim/format.ts';
import { derive, env, forward, gradient, totalMiss, tunerPath } from '../../units/01-neuron/sim/neuron.ts';
import { EXAMPLES, TUNER } from '../../units/01-neuron/sim/rules.ts';
import { initialState } from '../../units/01-neuron/unit/state.ts';
import { SPOTS } from '../../units/01-neuron/unit/spots.ts';
import { LIVE } from '../../units/01-neuron/unit/live.ts';
import { uses, afterWatch, NAMES } from '../../units/01-neuron/unit/watch.ts';
import { SPEC, CUES, settled, speaking } from '../lib/lesson.mjs';

test('the script passes the content lint against its cue sheet', () => assert.deepEqual(lintUnit(SPEC, CUES), []));

test('words vs numbers: every sentence assert holds on the settled plate, with prev as the plate before the last change', () => {
  let prev = null, before = null, checked = 0;
  for (const { l, v } of settled()) {
    const now = env(v), key = JSON.stringify(now);
    if (before !== null && key !== before.key) prev = before.env;
    for (const a of l.asserts ?? []) { assert.ok(evalAssert(a, now, prev ?? {}), `${l.clip}.${l.cue}: ${a}`); checked++; }
    before = { key, env: now };
  }
  assert.ok(checked >= 60, `only ${checked} asserts`);
});

test('display exactness: the tags, NOTE rows and Fig. 3 gauges each sentence shows are what the sim and the number rules draw', () => {
  let rows = 0;
  for (const { l, s, v } of settled()) {
    const drawn = tags(v);
    for (const [k, want] of Object.entries(l.tags ?? {})) assert.equal(drawn[k], want, `${l.clip}.${l.cue} tag ${k}`);
    if (l.note) { assert.deepEqual(noteRows(v, s.noteMode).slice(0, Math.round(s.noteRows)), l.note, `${l.clip}.${l.cue} note`); rows += l.note.length; }
    if (l.fig3) assert.deepEqual(v.ex.map((e) => example(e, v.two ? 2 : 1)), l.fig3, `${l.clip}.${l.cue} fig3`);
  }
  assert.ok(rows > 200);
});

test('each sentence draws what it speaks of: its number tags, the note, Fig. 3 and the marks of the parts it lights are on the plate while it is said', () => {
  const missing = [];
  for (const { l, s } of speaking()) for (const k of uses(l)) if (s[k] < 0.5) missing.push(`${l.clip}.${l.cue}: ${k}`);
  assert.deepEqual(missing, []);
});

test('every drawn row checks by hand from its own digits', () => {
  const read = (x) => Number(x.replace(/[()+]/g, '').replace('−', '-'));
  for (const { v, s } of settled()) {
    for (const r of [...noteRows(v, 0), ...noteRows(v, 1)]) {
      let m = /product \d: (\S+) × (\S+) = (\S+)$/.exec(r);
      if (m) assert.ok(Math.abs(read(m[1]) * read(m[2]) - read(m[3])) < 0.0051, r);
      m = /sum: (\S+) \+ (\S+) = (\S+)$/.exec(r);
      if (m) assert.ok(Math.abs(read(m[1]) + read(m[2]) - read(m[3])) < 0.0051, r);
      m = /miss: (\S+) − (\S+) = (\S+)$/.exec(r);
      if (m) assert.ok(Math.abs(read(m[1]) - read(m[2]) - read(m[3])) < 0.0051, r);
    }
    const [t] = noteRows(v, 2), m = /total miss: (.+) = (\S+)$/.exec(t);
    assert.ok(Math.abs(m[1].split(' + ').map(read).reduce((a, b) => a + b, 0) - read(m[2])) < 0.0051, t);
    assert.ok(s.x1 >= 0 && s.x1 <= 3 && s.x2 >= 0 && s.x2 <= 3);
  }
});

test('the tuner the watch draws is the real gradient path: it lands on the script setting and the drawn total never rises', () => {
  const path = tunerPath([1.5, -0.5]);
  assert.equal(path.length, TUNER.steps + 1);
  assert.deepEqual(path[1].map((w) => Math.round(w * 1e4) / 1e4), [1.525, -0.35]);
  assert.deepEqual(path.at(-1).map((w) => Math.round(w * 1e4) / 1e4), [1.0106, 0.4829]);
  let last = Infinity;
  for (const w of path) { const t = Math.round(totalMiss(w.map((x) => Math.round(x * 100) / 100), EXAMPLES) * 100); assert.ok(t <= last, `total rose to ${t}`); last = t; }
  assert.deepEqual(gradient([1, 1], [{ x: [1, 1], target: 0 }]).map((g) => g > 0), [true, true]);
  assert.equal(forward([1, -2], [1, 1]).out, 0);
});

test('number rules: a true minus, the shortest exact weight, brackets on negative operands, one decimal on the clicks and two off them', () => {
  assert.deepEqual([num(2), num(2.5), num(0.25), num(-1), num(-0.001)], ['2', '2.5', '0.25', '−1', '0']);
  assert.deepEqual([signed(1.5), signed(-0.5), signed(0), signed(1.525)], ['+1.5', '−0.5', '0', '+1.52']);
  assert.deepEqual([op(-1), fix(3), fix(-0.04), sfix(0.5), sfix(0), sfix(-1, 2)], ['(−1)', '3.0', '0.0', '+0.5', '0.0', '−1.00']);
  const v = derive({ x1: 2, x2: 1, w1: 1.525, w2: -0.35, target: 2.5 });
  assert.equal(v.two, true);
  assert.deepEqual(tags(v).w1, '+1.52');
  assert.deepEqual(noteRows(v, 0)[0], 'product 1: 2 × 1.52 = 3.04');
});

test('every drawn number and every part has a callout with live values, and every part has a spot; no parts list', () => {
  const callouts = new Set(SPEC.callouts.map((c) => c.id)), parts = new Set(SPEC.parts.map((p) => p.id));
  const s = { ...initialState(), w1: 1.5, w2: -0.5, target: 2.5 };
  for (const [id, sp] of Object.entries(SPOTS)) {
    assert.ok(parts.has(sp.part), `spot ${id}: no part ${sp.part}`);
    const known = callouts.has(sp.term) || SPEC.introduces.some((t) => t.id === sp.term);
    assert.ok(known, `spot ${id}: no callout ${sp.term}`);
  }
  for (const n of ['x1', 'x2', 'w1', 'w2', 'p1', 'p2', 'sum', 'out', 't', 'miss', 'total', 'e1', 'e2', 'e3', 'e4', 'tstep', 'click', 'note', 'goal', 'pen', 'arrow', 'fig6', 'race', 'fig5', 'tray', 'plaque']) {
    assert.ok(Object.values(SPOTS).some((sp) => sp.term === n), `number ${n} has no spot`);
    assert.ok(LIVE.now(n, s), `callout ${n} has no live line`);
  }
  for (const p of parts) assert.ok(Object.values(SPOTS).some((sp) => sp.part === p), `part ${p} has no spot`);
  assert.equal(LIVE.now('sum', s), 'sum: 3.0 + (−0.5) = 2.5');
  assert.equal(LIVE.value, undefined, 'no parts-list values');
  for (const p of SPEC.parts) assert.deepEqual(Object.keys(p).filter((k) => ['quantity', 'line', 'cue'].includes(k)), [], `part ${p.id} carries parts-list data`);
});

test('your turn opens on the machine alone, numbers only: no named label, no tuner block, examples or tally from the watch', () => {
  const s = afterWatch();
  for (const k of ['tunerOn', 'fig3', 'tally', 'tTotal', 'bracket', ...NAMES]) assert.equal(s[k], 0, k);
  assert.ok(NAMES.includes('lblInput') && NAMES.includes('lblMiss'), 'the names cover the term labels');
  assert.equal(s.bOn, 1, 'the numbers show');
});
