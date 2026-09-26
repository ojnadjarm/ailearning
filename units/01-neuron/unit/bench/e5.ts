import { e5 } from '../../sim/generators';
import { buildOf, complete, onBranch, passes, SEAT, TESTS, type Build } from '../../sim/build';
import { relu, type Vec2 } from '../../sim/neuron';
import { BUILD } from '../layout';
import { onPlaque } from '../placed';
import { HAND } from '../controls';
import { base, ease, lampAt, lampWalk, M, act, type BenchTask, type D } from './common';
import type { WalkStep } from 'explainer-kit';

const PARTS = [HAND.d1, HAND.d2, HAND.ch, HAND.va];
const RIGHT: Build = { d1: SEAT.dial1, d2: SEAT.dial2, ch: SEAT.join, va: SEAT.trunk };
const TRAY: Build = { d1: -1, d2: -1, ch: -1, va: -1 };
const seats = (b: Build): [number, number, number, number] => [b.d1, b.d2, b.ch, b.va];
/** The build a "Try again" poses: the seats the learner left, for the same case. */
let kept: { seed: number; b: Build } | null = null;

/** e5: seat the dials, the chamber and the valve on Fig. 1, press Test; three test examples run through the build, one after another. */
function assemble(): BenchTask {
  let w: Vec2 = e5(1), seed = 1;
  const place = (d: D, b: Build): void => { seats(b).forEach((v, k) => d.hands[PARTS[k]].place(v)); d.wake(); };
  const run = (d: D): WalkStep[] => [
    ...TESTS.map((x, i) => act(i ? 1.4 : 0.4, () => { d.pose({ x1: x[0], x2: x[1], target: relu(x[0] * w[0] + x[1] * w[1]), tst: i + 1 }); ease(d, { markOn: 1, flowOn: 1, noteRows: i + 1 }); })),
    act(1.6, () => undefined),
  ];
  return {
    id: 'e5', of: 'e5', label: 'Assemble the neuron', ask: 'e5', hands: PARTS,
    setup: (d, s) => {
      seed = s; w = e5(s);
      base(d, { fig7: 1, x1: TESTS[0][0], x2: TESTS[0][1], w1: w[0], w2: w[1], target: 0, flowOn: 0, stubOn: 1, noteMode: 3, noteRows: 0, tst: 0,
        plqOn: 1, plq: 3, sD1: -1, sD2: -1, sCh: -1, sVa: -1 }, 'drive', 'tray');
      place(d, kept?.seed === s ? kept.b : TRAY);
    },
    commit: (d) => {
      const b = buildOf(d.s);
      if (!complete(b)) return null;
      kept = { seed, b };
      return { pass: passes(b, w), walk: run(d) };
    },
    tap: (_d, wx, wy) => (onPlaque(wx, wy) ? 'commit' : false),
    ok: 'e5ok', miss: 'e5miss',
    detect: (d, when) => (when === 'miss' && onBranch(buildOf(d.s).va) ? M.valve : null),
    look: (d) => lampWalk(d, ['tray', 'dial1', 'dial2', 'chamber', 'trunk']),
    narrow: 'e5n',
    show: (d) => [
      act(0.3, () => place(d, TRAY)),
      ...seats(RIGHT).map((v, k) => act(0.8, () => { d.hands[PARTS[k]].place(v); ease(d, lampAt(BUILD.seats[v])); })),
      ...run(d),
    ],
    retry: { label: 'Try again', same: true },
    exit: () => { kept = null; },
  };
}

export const E5: BenchTask[] = [assemble()];
