import { e3, type TurnKind } from '../../sim/generators';
import { base, lampWalk, M, act, clicksTo, pressIn, cueFor, tagFor, watchCue, type BenchTask, type D } from './common';
import type { WalkStep } from 'explainer-kit';

const LABEL = 'One turn ahead';
const KINDS: TurnKind[] = ['up', 'down', 'zero', 'below'];
const OK = 0.25;

/** e3: an arc arrow shows which dial will turn and how many clicks; place the pencil where the needle will land, press in, then watch the dial turn. */
function round(kind: TurnKind, i: number): BenchTask {
  let c = e3(kind, 1);
  /** The drawn clicks, one per 0.3 s; the arrow counts down as the dial turns. */
  const turn = (d: D, gap = 0.3): WalkStep[] => [
    ...clicksTo(d, c.dial, c.w[c.dial] + c.n * 0.5, gap).map((st) => act(st.gap, () => { st.run(); d.s.arrN -= Math.sign(c.n); })),
    act(0.6, () => { d.s.arrOn = 0; d.wake(); }),
  ];
  return {
    id: `e3.${kind}`, of: 'e3', label: `${LABEL} · ${i + 1} of 4`, ask: 'e3', hands: [5],
    setup: (d, seed) => {
      c = e3(kind, seed);
      base(d, { x1: c.x[0], x2: c.x[1], w1: c.w[0], w2: c.w[1], noteRows: 4, stubOn: 1, pen2On: 1, pen2: c.out0, pen2Cue: cueFor('pen2'), pen2Tag: tagFor('e3'), arrOn: 1, arrDial: c.dial, arrN: c.n,
        arrW0: c.w[c.dial], plqOn: 1, plq: 0 }, 'drive', c.dial ? 'dial2' : 'dial1');
    },
    update: (d) => watchCue(d, 'pen2', c.out0, 'e3'),
    commit: (d) => ({ pass: Math.abs(d.hands[5].value() - c.out) <= OK, walk: turn(d) }),
    tap: pressIn,
    ok: 'e3ok', miss: 'e3miss',
    detect: (d, when) => {
      if (when !== 'miss') return null;
      return c.x[c.dial] !== 1 && Math.abs(d.hands[5].value() - c.naive) <= OK ? M.click : null;
    },
    look: (d) => lampWalk(d, [c.dial ? 'dial2' : 'dial1', c.dial ? 'tag2' : 'tag1', c.dial ? 'dial2' : 'dial1']),
    narrow: 'e3n',
    show: (d) => [...turn(d, 0.9), act(1.2, () => undefined)],
  };
}

export const E3: BenchTask[] = KINDS.map((k, i) => round(k, i));
