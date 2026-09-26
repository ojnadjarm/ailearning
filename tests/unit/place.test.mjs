// U01's layout: every value box, balloon and the plaque sits in clear paper (the kit's placer, U01's outlines), in every pose the lesson reaches.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dist, boxOf } from 'explainer-kit';
import { FAULTS, PLACED, PLAQUE_BOX, faultsNow, inventory, balloon, layoutOf } from '../../units/01-neuron/unit/place.ts';
import { OUTLINES } from '../../units/01-neuron/unit/outlines.ts';
import { afterWatch } from '../../units/01-neuron/unit/watch.ts';
import { initialState } from '../../units/01-neuron/unit/state.ts';
import { samples } from '../lib/framing.mjs';
import { chapterEnds, SPEC } from '../lib/lesson.mjs';

test('place: every value box, balloon and the plaque found a clear slot', () => {
  assert.deepEqual(FAULTS, []);
  assert.equal(PLACED.filter((e) => e.kind === 'marker').length, 19);
});

test('place: nothing overlaps once the explanation is over (numbers only), in every play pose, and at every chapter end', () => {
  const bad = [];
  const check = (at, s, named) => bad.push(...faultsNow(s, named).map((f) => `${at}: ${f}`));
  check('your turn', { ...initialState(), ...afterWatch() }, false);
  for (const { at, s } of samples().filter(({ at }) => !at.includes('.'))) check(at, s, false);
  const ends = chapterEnds();
  ends.forEach(({ numeral, s }, i) => check(`chapter ${numeral} end`, s, i < ends.length - 1));
  assert.deepEqual(bad, []);
});

test('place: every numbered part has a balloon, its leader starts on the part, and the plaque keeps 40 units from the casing', () => {
  for (const p of SPEC.parts.filter((p) => p.n)) assert.ok(balloon(p.n).at.every(Number.isFinite), `part ${p.id} (${p.n})`);
  const casing = OUTLINES[0].shapes[0], { x, y, w, h } = PLAQUE_BOX;
  assert.ok(dist(boxOf(x - w / 2, y - h / 2, x + w / 2, y + h / 2), casing) >= 40 - 1e-9);
});

test('place: the mark\'s balloon and the target box follow the mark to every target; a pencil or goal ring out moves the balloons clear of its whole sweep', () => {
  const play = { ...initialState(), ...afterWatch(), markOn: 1, tT: 1 }, bad = [];
  const check = (at, s) => bad.push(...faultsNow(s, false).map((f) => `${at}: ${f}`));
  for (let t = -1.5; t <= 5; t += 0.25) check(`target ${t}`, { ...play, target: t });
  const bench = { ...play, markOn: 0, tT: 0 };
  const covered = { ...bench, cvP1: 1, cvP2: 1, cvSum: 1, cvOut: 1, stubOn: 1, missOn: 0, tMiss: 0 };
  for (const cue of [1, 0]) {
    for (let k = -45; k <= 45; k++) check(`pencil 1 at ${k / 10}, cue ${cue}`, { ...covered, pen1On: 1, pen1: k / 10, pen2On: 1, pen2: 0, pen1Cue: cue, pen2Cue: cue });
    for (let k = -15; k <= 50; k++) check(`pencil 2 at ${k / 10}, cue ${cue}`, { ...covered, pen2On: 1, pen2: k / 10, pen1On: 1, pen1: 0, pen1Cue: cue, pen2Cue: cue });
  }
  for (let v = -1.5; v <= 0; v += 0.25) check(`sum ring at ${v}`, { ...bench, goalOn: 1, goalKind: 1, goalV: v });
  for (const k of [0, 2]) check(`goal ring ${k}`, { ...bench, goalOn: 1, goalKind: k, goalV: 1 });
  assert.deepEqual(bad, []);
  const out2 = layoutOf({ ...bench, pen2On: 1, pen2Cue: 1 }, false).hidden;
  assert.deepEqual(['9', '10', '13'].filter((n) => out2.has(n)), [], 'the gauge\'s balloons stay while pencil 2 is out: its needle turns on the face, its cue arcs over the rim');
});


test('place: in Tuning, with each input set loaded and its target on the mark, nothing overlaps and the tubes\' balloons are gone', async () => {
  const { LEVELS } = await import('../../units/01-neuron/sim/race.ts');
  const bad = [], base = { ...initialState(), ...afterWatch(), markOn: 1, tT: 1, fig6: 1, fig6k: 3, exN: 4, tune: 1 };
  for (const [l, lv] of LEVELS.entries()) lv.ex.forEach((e, k) => {
    const s = { ...base, tSel: k, x1: e.x[0], x2: e.x[1], target: e.target };
    bad.push(...faultsNow(s, false).map((f) => `level ${l + 1} set ${k + 1}: ${f}`));
    const drawn = inventory(s, false).map((i) => i.id);
    for (const id of ['tube1', 'tube2', '1', '2', '14', 'inlets']) if (drawn.includes(id)) bad.push(`level ${l + 1} set ${k + 1}: ${id} drawn`);
    for (const id of ['inputs', 'feeds', 'lamps']) if (!drawn.includes(id)) bad.push(`level ${l + 1} set ${k + 1}: no ${id}`);
  });
  assert.deepEqual(bad, []);
});
