import { e8, type PairCase } from '../../sim/generators';
import { forward, type Vec2 } from '../../sim/neuron';
import { base, hv, lampWalk, M, near, pathTo, restsOf, type BenchTask, type S } from './common';

const LABEL = 'Two examples, one setting';

/** The bench keys of two examples. */
export const pair = (ex: { x: Vec2; t: number }[]): S => ({
  exN: 2, ex1a: ex[0].x[0], ex1b: ex[0].x[1], ex1t: ex[0].t, ex2a: ex[1].x[0], ex2b: ex[1].x[1], ex2t: ex[1].t, x1: ex[0].x[0], x2: ex[0].x[1], target: ex[0].t,
});
const meets = (w: Vec2, e: { x: Vec2; t: number }): boolean => Math.abs(forward(w, e.x).out - e.t) < 0.01;

/** Setting for one example, then for the other, then back to the first: a setting per example. */
function perExample(rests: Vec2[], ex: { x: Vec2; t: number }[]): boolean {
  const seen: { k: 0 | 1; w: Vec2 }[] = [];
  for (const w of rests) {
    const a = meets(w, ex[0]), b = meets(w, ex[1]);
    if (a === b) continue;
    const k = a ? 0 : 1, prev = seen[seen.length - 1];
    if (prev?.k !== k && seen.length >= 2 && seen.some((s) => s.k === k && near(s.w[0], w[0]) && near(s.w[1], w[1]))) return true;
    if (prev?.k !== k) seen.push({ k, w });
  }
  return false;
}

/** e8: two examples on Fig. 6 share one set of dials; put both needles on their marks. */
function round(r: 1 | 2): BenchTask {
  let c: PairCase = e8(1);
  return {
    id: `e8.${r}`, of: 'e8', label: `${LABEL} · ${r} of 2`, ask: 'e8', hands: [0, 1], hold: 0.5,
    setup: (d, seed) => {
      c = e8(seed);
      base(d, { ...pair(c.ex), w1: 0.5, w2: 0.5, markOn: 1, tT: 1, fig6: 1, fig6k: 2, bracket: 1 }, 'wide', 'slotA');
    },
    verdict: (d) => (c.ex.every((e) => meets(hv(d), e)) ? true : null),
    ok: 'e8ok',
    detect: (d, when) => (when === 'play' && perExample(restsOf(d), c.ex) ? M.perEx : null),
    look: (d) => lampWalk(d, ['slotA', 'slotB', 'dial1', 'dial2']),
    narrow: 'e8n',
    show: (d) => pathTo(d, c.w, 0.7),
  };
}

export const E8: BenchTask[] = [round(1), round(2)];
