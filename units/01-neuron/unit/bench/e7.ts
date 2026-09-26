import { e7, onMark, clicks } from '../../sim/generators';
import { base, hv, lampWalk, M, now, pathTo, type BenchTask } from './common';

const LABEL = 'Fix it';

/** e7: the needle is off its mark; the tubes are locked (a try rattles them), only the dials put it back. */
function round(r: 1 | 2): BenchTask {
  let c = e7(1);
  return {
    id: `e7.${r}`, of: 'e7', label: `${LABEL} · ${r} of 2`, ask: 'e7', hands: [0, 1, 2, 3],
    setup: (d, seed) => {
      c = e7(seed);
      base(d, { x1: c.x[0], x2: c.x[1], w1: c.w[0], w2: c.w[1], target: c.t, markOn: 1, tT: 1, locks: 1, noteRows: 5 }, 'drive', 'mark');
    },
    verdict: (d) => (Math.abs(now(d).out - c.t) < 0.01 ? true : null),
    ok: 'e7ok',
    detect: (d, when) => (when === 'play' && d.log.tries().length > 0 ? M.input : null),
    look: (d) => lampWalk(d, ['mark', 'tubes', 'dial1', 'dial2']),
    narrow: 'e7n',
    show: (d) => {
      const w = hv(d), to = onMark(c.x, c.t).sort((a, b) => clicks(w, a) - clicks(w, b))[0];
      return pathTo(d, to, 0.7);
    },
  };
}

export const E7: BenchTask[] = [round(1), round(2)];
