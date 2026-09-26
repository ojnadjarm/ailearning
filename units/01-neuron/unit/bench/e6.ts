import { e6 } from '../../sim/generators';
import { base, clicksTo, ease, hv, lampWalk, M, near, pressIn, act, type BenchTask, type D } from './common';

const LABEL = 'Set the miss';

/** e6: dial 1 alone drives the needle; turn it until the miss (under its cover) will be the ringed value, then press in. */
function round(r: 1 | 2 | 3): BenchTask {
  let c = e6(1, 1);
  const lift = (d: D): void => ease(d, { cvMiss: 0, missOn: 1, noteRows: 5 });
  return {
    id: `e6.${r}`, of: 'e6', label: `${LABEL} · ${r} of 3`, ask: 'e6', hands: [0],
    setup: (d, seed) => {
      c = e6(r === 1 ? 1 : r === 2 ? -1 : seed % 2 ? 1 : -1, seed);
      base(d, { x1: c.x1, x2: 0, w1: 0, w2: 0, target: c.t, markOn: 1, tT: 1, tOut: 1, tMiss: 1, missOn: 0, cvMiss: 1, noteRows: 0,
        goalOn: 1, goalKind: 2, goalV: c.m, plqOn: 1, plq: 0 }, 'drive', 'goalM');
    },
    commit: (d) => { lift(d); return { pass: near(c.t - c.x1 * hv(d)[0], c.m) }; },
    tap: pressIn,
    ok: 'e6ok', miss: 'e6miss',
    detect: (d, when) => (when === 'miss' && near(c.x1 * hv(d)[0] - c.t, c.m) ? M.sign : null),
    look: (d) => lampWalk(d, ['gauge', 'mark', 'goalM', 'dial1']),
    narrow: 'e6n',
    show: (d) => [act(0.4, () => lift(d)), ...clicksTo(d, 0, c.out / c.x1, 0.7), act(1.2, () => undefined)],
  };
}

export const E6: BenchTask[] = [round(1), round(2), round(3)];
