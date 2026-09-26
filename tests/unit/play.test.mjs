// U01's play, from the sim: every generated case over 400 seeds keeps its rules and is solved on the clicks by the scripted right play,
// while the scripted wrong move misses; the assembly passes only when built as a neuron; every tuner level is solvable by hand; the
// exercises lint against the script with a detector for every misconception.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lintPlay } from 'explainer-kit';
import { d3, e1a, e1b, e2, e3, e4, e5, e6, e7, e8, onMark, clicks } from '../../units/01-neuron/sim/generators.ts';
import { forward, totalMiss } from '../../units/01-neuron/sim/neuron.ts';
import { DETENTS, LEVELS, GOALS, reached, bestOnClicks, winners } from '../../units/01-neuron/sim/race.ts';
import { flow, passes, fits, SEAT, TESTS } from '../../units/01-neuron/sim/build.ts';
import { M } from '../../units/01-neuron/unit/bench/common.ts';
import { right, wrong, DETECTS } from '../lib/solve.mjs';
import { SPEC } from '../lib/lesson.mjs';

const SEEDS = Array.from({ length: 400 }, (_, i) => i + 1);
const near = (a, b, e = 1e-6) => Math.abs(a - b) < e;
const out = (w, x) => forward(w, x).out;
const detent = (v) => DETENTS.some((d) => near(d, v));
/** The dials a scripted play leaves (dial moves and single clicks from `w`). */
const dialsAfter = (moves, w) => moves.reduce((v, [op, i, a]) => (op === 'dial' ? Object.assign([...v], { [i]: a }) : op === 'click' ? Object.assign([...v], { [i]: v[i] + a * 0.5 }) : v), w);
const pens = (moves) => Object.fromEntries(moves.filter(([op]) => op === 'pen').map(([, i, v]) => [i, v]));

test('generators: the same seed poses the same case, and every case keeps its rules over 400 seeds', () => {
  for (const seed of SEEDS) {
    assert.deepEqual(e8(seed), e8(seed));
    const m = d3(seed);
    assert.ok(m.t >= 1 && m.t <= 4.5 && Math.min(...onMark(m.x, m.t).map((w) => clicks([0, 0], w))) >= 3, `d3 ${seed}`);
    for (const r of [1, 2]) { const c = e1a(r, seed); assert.ok(detent(c.w) && near(c.p, c.x1 * c.w) && !near(c.add, c.w), `e1a ${r} ${seed}`); }
    const b = e1b(seed);
    assert.ok(detent(b.w2) && b.w2 <= -0.5 && near(b.x[0] * b.w1 + b.x[1] * b.w2, b.s) && b.s <= 0, `e1b ${seed}`);
    for (const r of [1, 2, 3]) {
      const c = e2(r, seed), xs = c.x[0] + c.x[1];
      assert.ok(r < 3 ? c.out >= 0.5 && Math.abs(c.out - xs) >= 1 && Math.abs(c.out - xs / 2) >= 1 : c.sum <= -0.5 && c.out === 0, `e2 ${r} ${seed}`);
    }
    for (const k of ['up', 'down', 'zero', 'below']) {
      const c = e3(k, seed), w = [...c.w];
      w[c.dial] += c.n * 0.5;
      assert.ok(detent(w[c.dial]) && near(out(w, c.x), c.out) && Math.abs(c.naive - c.out) >= 0.5, `e3 ${k} ${seed}`);
      assert.ok(k === 'zero' ? c.out === 0 && near(c.sum, 0) : k === 'below' ? c.sum < 0 : k === 'up' ? c.n > 0 : c.n < 0 && c.out > 0, `e3 ${k} ${seed} kind`);
    }
    assert.ok(e4(1, seed).sum >= 2 && e4(2, seed).sum <= -1, `e4 ${seed}`);
    const w5 = e5(seed);
    assert.ok(w5[0] > 0 && w5[1] < 0, `e5 ${seed}`);
    for (const s of [1, -1]) { const c = e6(s, seed); assert.ok(near(c.out, c.t - c.m) && Math.sign(c.m) === s && detent(c.out / c.x1) && detent(c.flipped / c.x1), `e6 ${s} ${seed}`); }
    const r7 = e7(seed);
    assert.ok(Math.abs(out(r7.w, r7.x) - r7.t) >= 1 && onMark(r7.x, r7.t).length > 0, `e7 ${seed}`);
    const p = e8(seed);
    assert.ok(p.ex.every((e) => near(out(p.w, e.x), e.t)) && winners(p.ex.map((e) => ({ x: e.x, target: e.t }))).length === 1, `e8 ${seed}: one setting meets both`);
  }
});

test('trap vs solve: over 400 seeds the scripted right play meets each case on the clicks, and the scripted wrong move misses it', () => {
  for (const seed of SEEDS) {
    const c1 = e1a(1, seed), s1 = { x1: c1.x1, x2: 0, w1: 0, w2: 0, goalV: c1.p };
    assert.ok(near(s1.x1 * dialsAfter(right('e1.1', s1), [0, 0])[0], c1.p), `e1.1 right ${seed}`);
    const bad = wrong('e1.1', s1);
    if (bad) assert.ok(!near(s1.x1 * dialsAfter(bad, [0, 0])[0], c1.p), `e1.1 wrong ${seed}`);
    const c2 = e2(3, seed), s2 = { x1: c2.x[0], x2: c2.x[1], w1: c2.w[0], w2: c2.w[1] };
    assert.ok(Math.abs(pens(right('e2.3', s2))[5] - c2.out) <= 0.25 && Math.abs(pens(wrong('e2.3', s2))[4] - c2.sum) > 0.25, `e2.3 ${seed}`);
    const c3 = e3('up', seed), s3 = { x1: c3.x[0], x2: c3.x[1], w1: c3.w[0], w2: c3.w[1], arrDial: c3.dial, arrN: c3.n };
    assert.ok(near(pens(right('e3.up', s3))[5], c3.out) && near(pens(wrong('e3.up', s3))[5], c3.naive), `e3 ${seed}`);
    const c4 = e4(1, seed), s4 = { x1: c4.x[0], x2: c4.x[1], w1: c4.w[0], w2: c4.w[1] };
    assert.equal(out(dialsAfter(right('e4.1', s4), c4.w), c4.x), 0, `e4 ${seed}`);
    const c6 = e6(-1, seed), s6 = { x1: c6.x1, x2: 0, w1: 0, w2: 0, target: c6.t, goalV: c6.m };
    assert.ok(near(c6.t - c6.x1 * dialsAfter(right('e6.1', s6), [0, 0])[0], c6.m) && near(c6.x1 * dialsAfter(wrong('e6.1', s6), [0, 0])[0] - c6.t, c6.m), `e6 ${seed}`);
    const c7 = e7(seed), s7 = { x1: c7.x[0], x2: c7.x[1], w1: c7.w[0], w2: c7.w[1], target: c7.t };
    assert.ok(near(out(dialsAfter(right('e7.1', s7), c7.w), c7.x), c7.t), `e7 ${seed}`);
    const c8 = e8(seed), s8 = { w1: 0.5, w2: 0.5, exN: 2, ex1a: c8.ex[0].x[0], ex1b: c8.ex[0].x[1], ex1t: c8.ex[0].t, ex2a: c8.ex[1].x[0], ex2b: c8.ex[1].x[1], ex2t: c8.ex[1].t };
    assert.deepEqual(dialsAfter(right('e8.1', s8), [0.5, 0.5]), c8.w, `e8 ${seed}`);
  }
  assert.deepEqual(Object.keys(DETECTS).filter((id) => !id.startsWith('L')).map((id) => id.split('.')[0]).filter((e, i, l) => l.indexOf(e) === i), ['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8']);
});

test('assembly: of every build that seats all four parts, only the neuron (dials on their branches, the valve on the trunk) passes the three tests', () => {
  const builds = [];
  for (const d1 of [0, 1, 2, 3, 4, 5]) for (const d2 of [0, 1, 2, 3, 4, 5]) for (const va of [0, 1, 2, 3, 4, 5]) {
    const seats = [d1, d2, SEAT.join, va];
    if (!fits('dial', d1) || !fits('dial', d2) || !fits('valve', va) || new Set(seats).size < 4) continue;
    builds.push({ d1, d2, ch: SEAT.join, va });
  }
  assert.equal(builds.length, 6);
  for (const seed of SEEDS) {
    const w = e5(seed), ok = builds.filter((b) => passes(b, w));
    assert.deepEqual(ok, [{ d1: SEAT.dial1, d2: SEAT.dial2, ch: SEAT.join, va: SEAT.trunk }], `e5 ${seed}`);
    for (const x of TESTS) assert.ok(near(flow(ok[0], w, x).out, out(w, x)));
  }
});

/** The fewest single clicks from a level's start to a setting that meets its goal (breadth first over the detent grid). */
function fewestClicks(k) {
  const n = DETENTS.length, at = (v) => DETENTS.findIndex((d) => Math.abs(d - v) < 1e-9), s = LEVELS[k].start.map(at);
  const seen = new Set([s.join()]);
  for (let q = [s], depth = 0; q.length; depth++) {
    if (q.some(([a, b]) => reached([DETENTS[a], DETENTS[b]], k))) return depth;
    q = q.flatMap(([a, b]) => [[a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]]).filter(([a, b]) => a >= 0 && b >= 0 && a < n && b < n && !seen.has(`${a},${b}`) && seen.add(`${a},${b}`));
  }
  return null;
}

test('tuner levels: a grid search over every detent pair finds each goal (0 on L1 and L2, the best the clicks allow on L3), 5 clicks from the start, and a hand that always lowers the total gets there', () => {
  const [l1, l2, l3] = LEVELS;
  assert.deepEqual(GOALS, [0, 0, 1]);
  assert.deepEqual(winners(l1.ex), [[-0.5, 2]]);
  assert.equal(winners(l2.ex).length, 4);
  assert.deepEqual(winners(l3.ex), []);
  assert.deepEqual(bestOnClicks(l3.ex), { total: 1, at: [[1, 0.5]] });
  LEVELS.forEach((l, k) => {
    const grid = DETENTS.flatMap((a) => DETENTS.map((b) => [a, b])).filter((w) => reached(w, k));
    assert.ok(grid.length > 0, `${l.id}: some setting on the clicks meets the goal`);
    assert.ok(!reached(l.start, k), `${l.id} does not start solved`);
    assert.equal(fewestClicks(k), 5, `${l.id}: fewest clicks to the goal`);
    let w = [...l.start], moves = 0;
    for (;;) {
      const next = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, b]) => [w[0] + a * 0.5, w[1] + b * 0.5])
        .filter((v) => v.every((x) => x >= DETENTS[0] && x <= DETENTS.at(-1))).sort((a, b) => totalMiss(a, l.ex) - totalMiss(b, l.ex))[0];
      if (totalMiss(next, l.ex) >= totalMiss(w, l.ex) - 1e-9) break;
      w = next; moves++;
    }
    assert.ok(reached(w, k) && moves <= 3, `${l.id}: a click on one or both dials that always lowers the total reaches the goal (${moves} moves, at ${w})`);
  });
});

test('lintPlay: every exercise is play (continuous or construct), catches a known misconception, and every misconception has a detector, a refutation and a contrast', () => {
  const detectors = Object.values(M), clips = SPEC.clips.map((c) => c.id);
  assert.deepEqual(lintPlay(SPEC, { clips, detectors }), []);
  assert.deepEqual([...new Set(Object.values(DETECTS))].sort(), [...detectors].sort(), 'the e2e scripts a wrong move for every detector');
});

test('endless tuning: over 400 seeds per kind every puzzle\'s goal is reachable on the clicks (0 when exact, the grid\'s best and above 0 when not), 4+ clicks from its start', async () => {
  const { puzzle } = await import('../../units/01-neuron/sim/puzzles.ts');
  const { drawnTotal } = await import('../../units/01-neuron/sim/neuron.ts');
  const grid = DETENTS.flatMap((a) => DETENTS.map((b) => [a, b]));
  for (const kind of ['exact', 'best']) for (let seed = 1; seed <= 400; seed++) {
    const z = puzzle(kind, seed), at = `${kind} seed ${seed}`, best = Math.min(...grid.map((w) => drawnTotal(w, z.ex)));
    assert.deepEqual(puzzle(kind, seed), z, `${at}: the same seed poses the same puzzle`);
    assert.equal(z.ex.length, 4, at);
    assert.ok(Math.abs(best - z.goal) < 1e-9, `${at}: goal ${z.goal}, grid best ${best}`);
    assert.ok(kind === 'exact' ? z.goal === 0 : z.goal > 0, `${at}: goal ${z.goal}`);
    assert.ok(z.at.length && z.at.every((w) => drawnTotal(w, z.ex) <= z.goal + 1e-9), `${at}: every listed setting meets the goal`);
    assert.ok(z.at.every((w) => clicks(w, z.start) >= 4) && drawnTotal(z.start, z.ex) >= z.goal + 2, `${at}: the start is not already solved`);
  }
});

test('tuning lamps: a lamp per target, lit only while that target is met at the dials\' setting; all four only where the level is solved', async () => {
  const { fig6Slots } = await import('../../units/01-neuron/plate/views.ts');
  const { derive } = await import('../../units/01-neuron/sim/neuron.ts');
  const { initialState } = await import('../../units/01-neuron/unit/state.ts');
  for (const [l, lv] of LEVELS.entries()) {
    const ex = Object.fromEntries(lv.ex.flatMap((e, i) => [[`ex${i + 1}a`, e.x[0]], [`ex${i + 1}b`, e.x[1]], [`ex${i + 1}t`, e.target]]));
    for (const w1 of DETENTS) for (const w2 of DETENTS) {
      const s = { ...initialState(), ...ex, exN: 4, fig6: 1, fig6k: 3, tune: 1, w1, w2 }, lit = fig6Slots(s, derive(s)).map((v) => v.hit);
      lv.ex.forEach((e, i) => assert.equal(lit[i], Math.abs(forward([w1, w2], e.x).out - e.target) < 1e-9, `L${l + 1} at ${w1}, ${w2}: lamp ${i + 1}`));
      if (lv.exact) assert.equal(lit.every(Boolean), reached([w1, w2], l), `L${l + 1} at ${w1}, ${w2}: all four lit exactly where the level passes`);
    }
  }
});
