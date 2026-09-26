import { e2 } from '../../sim/generators';
import { RULES } from '../../sim/rules';
import { base, ease, lampWalk, M, act, pressIn, cueFor, tagFor, watchCue, type BenchTask, type D } from './common';

const LABEL = 'Where the needle lands';
const OK = 0.25;

/** e2: the working is covered; place a pencil where the sum will be and one where the needle will land, then lift the cover. */
function round(r: 1 | 2 | 3): BenchTask {
  let c = e2(r, 1);
  const lift = (d: D): void => ease(d, { cvP1: 0, cvP2: 0, cvSum: 0, cvOut: 0, noteRows: 4 });
  const pens = (d: D): [number, number] => [d.hands[4].value(), d.hands[5].value()];
  return {
    id: `e2.${r}`, of: 'e2', label: `${LABEL} · ${r} of 3`, ask: 'e2', hands: [4, 5],
    setup: (d, seed) => {
      c = e2(r, seed);
      base(d, { x1: c.x[0], x2: c.x[1], w1: c.w[0], w2: c.w[1], cvP1: 1, cvP2: 1, cvSum: 1, cvOut: 1, noteRows: 0, stubOn: 1,
        pen1On: 1, pen2On: 1, pen1: RULES.chamber.min, pen2: RULES.gauge.max, pen1Cue: cueFor('pen1'), pen2Cue: cueFor('pen2'), pen2Tag: tagFor('e2'), plqOn: 1, plq: 1 }, 'drive', 'chamber');
    },
    update: (d) => { watchCue(d, 'pen1', RULES.chamber.min); watchCue(d, 'pen2', RULES.gauge.max, 'e2'); },
    commit: (d) => {
      const [s, o] = pens(d);
      lift(d);
      return { pass: Math.abs(s - c.sum) <= OK && Math.abs(o - c.out) <= OK };
    },
    tap: pressIn,
    ok: 'e2ok', miss: 'e2miss',
    detect: (d, when) => {
      if (when !== 'miss') return null;
      const [s, o] = pens(d), xs = c.x[0] + c.x[1];
      if (r < 3) return Math.abs(o - xs) <= OK || Math.abs(o - xs / 2) <= OK ? M.pass : null;
      return Math.abs(o - s) <= OK && c.sum < 0 ? M.sumOut : null;
    },
    look: (d) => lampWalk(d, ['dial1', 'dial2', 'chamber', 'valve', 'gauge']),
    narrow: 'e2n',
    show: (d) => [
      act(0.3, () => ease(d, { cvP1: 0, cvP2: 0 })),
      ...lampWalk(d, ['dial1']), act(0.3, () => ease(d, { noteRows: 1 })),
      ...lampWalk(d, ['dial2']), act(0.3, () => ease(d, { noteRows: 2 })),
      ...lampWalk(d, ['chamber']), act(0.3, () => ease(d, { cvSum: 0, noteRows: 3 })),
      ...lampWalk(d, ['valve']), act(0.3, () => ease(d, { cvOut: 0, noteRows: 4 })),
      act(1.6, () => undefined),
    ],
  };
}

export const E2: BenchTask[] = [round(1), round(2), round(3)];
