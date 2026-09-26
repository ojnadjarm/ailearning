// U01's layout under the arc arrow: over every One-turn-ahead case the arrow and its words keep clear, checked on worker threads (the
// slowest node check; a file of its own, so node's test runner starts it beside the others).
import { test } from 'node:test';
import { Worker } from 'node:worker_threads';
import { availableParallelism } from 'node:os';
import assert from 'node:assert/strict';
import { afterWatch } from '../../units/01-neuron/unit/watch.ts';
import { initialState } from '../../units/01-neuron/unit/state.ts';
import { e3 } from '../../units/01-neuron/sim/generators.ts';

/**
 * The faults of every [label, state] pose (numbers only), as "label: fault", checked on up to `n` worker threads. Poses with the same
 * `group` go to one thread, so the layout it caches serves them all; the largest groups are dealt first, each to the lightest thread.
 */
async function faultsOn(poses, group, n = Math.min(8, availableParallelism())) {
  const shares = Array.from({ length: n }, () => []);
  for (const g of [...Map.groupBy(poses, ([, s]) => group(s)).values()].sort((a, b) => b.length - a.length)) shares.reduce((a, b) => (b.length < a.length ? b : a)).push(...g);
  const run = (share) => new Promise((ok, no) => new Worker(new URL('../lib/faults-worker.mjs', import.meta.url), { workerData: share }).once('message', ok).once('error', no));
  return (await Promise.all(shares.filter((p) => p.length).map(run))).flat();
}

test('place: over every One-turn-ahead case (400 seeds per kind) and every click of its count-down, the arc arrow and its words keep clear', async () => {
  const bench = { ...initialState(), ...afterWatch(), markOn: 0, tT: 0, stubOn: 1, noteRows: 4, arrOn: 1, missOn: 0, tMiss: 0, plqOn: 1, plq: 0, pen2On: 1, pen2Cue: 1 }, poses = [], seen = new Set();
  for (const kind of ['up', 'down', 'zero', 'below']) for (let seed = 1; seed <= 400; seed++) {
    const c = e3(kind, seed), id = `${c.dial}|${c.w}|${c.x}|${c.n}`;
    if (seen.has(id)) continue;
    seen.add(id);
    for (let i = 0; i < Math.abs(c.n); i++) {
      const w = [...c.w];
      w[c.dial] += i * Math.sign(c.n) * 0.5;
      const s = { ...bench, x1: c.x[0], x2: c.x[1], w1: w[0], w2: w[1], pen2: c.out0, arrDial: c.dial, arrN: c.n - i * Math.sign(c.n), arrW0: c.w[c.dial] };
      poses.push([`${kind} ${seed} click ${i}`, s]);
    }
  }
  assert.ok(seen.size > 300, `${seen.size} cases`);
  assert.deepEqual(await faultsOn(poses, (s) => `${s.arrDial}|${s.arrW0}`), []);
});
