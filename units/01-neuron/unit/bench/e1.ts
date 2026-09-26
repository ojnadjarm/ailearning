import { e1a, e1b } from '../../sim/generators';
import { RULES } from '../../sim/rules';
import { levelY } from '../layout';
import { base, clicksTo, ease, hv, lampWalk, M, near, pressIn, act, type BenchTask, type D } from './common';

const LABEL = 'What a weight does';

/** e1, rounds 1–2: set dial 1 so its product will match the ringed goal, then press in; the product sits under a cover until then. */
function product(round: 1 | 2): BenchTask {
  let c = e1a(round, 1);
  const lift = (d: D): void => ease(d, { cvP1: 0, cvSum: 0, cvOut: 0, noteRows: 1 });
  return {
    id: `e1.${round}`, of: 'e1', label: `${LABEL} · ${round} of 3`, ask: 'e1a', hands: [0],
    setup: (d, seed) => {
      c = e1a(round, seed);
      base(d, { x1: c.x1, x2: 0, w1: 0, w2: 0, cvP1: 1, cvSum: 1, cvOut: 1, noteRows: 0, goalOn: 1, goalKind: 0, goalV: c.p, plqOn: 1, plq: 0 });
    },
    commit: (d) => { lift(d); return { pass: near(c.x1 * hv(d)[0], c.p) }; },
    tap: pressIn,
    ok: 'e1ok', miss: 'e1miss',
    detect: (d, when) => {
      if (when !== 'miss') return null;
      const w = hv(d)[0], stop = c.add > 0 ? RULES.dial.max : RULES.dial.min;
      return near(w, c.add) || (Math.abs(c.add) > RULES.dial.max && near(w, stop)) ? M.adds : null;
    },
    look: (d) => lampWalk(d, ['tag1', 'dial1', 'goalP', 'dial1']),
    narrow: 'e1n',
    show: (d) => [act(0.4, () => lift(d)), ...clicksTo(d, 0, c.w, 0.7)],
  };
}

/** e1, round 3: dial 1 locked; bring the sum down to its ringed goal with dial 2 (only a negative weight reaches it). */
function sum(): BenchTask {
  let c = e1b(1);
  return {
    id: 'e1.3', of: 'e1', label: `${LABEL} · 3 of 3`, ask: 'e1b', hands: [1],
    setup: (d, seed) => {
      c = e1b(seed);
      base(d, { x1: c.x[0], x2: c.x[1], w1: c.w1, w2: 0, noteRows: 3, goalOn: 1, goalKind: 1, goalV: c.s }, 'drive', 'dial2');
    },
    verdict: (d) => (near(c.x[0] * c.w1 + c.x[1] * hv(d)[1], c.s) ? true : null),
    ok: 'e1ok',
    detect: (d, when) => {
      if (when !== 'play') return null;
      const moves = d.log.moves(1), ups = moves.filter((m) => m.to > m.from), fromZero = ups.filter((m) => near(m.from, 0)).length;
      const rests = d.log.rests(1.2, d.elapsed), last = rests[rests.length - 1];
      return (moves.length >= 2 && ups.length > 0 && last && last[1] >= 0) || fromZero >= 2 ? M.adds : null;
    },
    look: (d) => lampWalk(d, ['tag2', 'dial2', [62, levelY(c.s)], 'dial2']),
    narrow: 'e1n',
    show: (d) => clicksTo(d, 1, c.w2, 0.7),
  };
}

export const E1: BenchTask[] = [product(1), product(2), sum()];
