import { e4 } from '../../sim/generators';
import { RULES } from '../../sim/rules';
import { base, clicksTo, hv, lampWalk, M, act, now, pressIn, STEP, type BenchTask, type D } from './common';
import type { WalkStep } from 'explainer-kit';

const LABEL = 'As low as it goes';

/** The dial that moves the sum most per click and can still turn in direction `dir`. */
function strongest(d: D, dir: 1 | -1): 0 | 1 {
  const w = hv(d), x = [d.s.x1, d.s.x2], free = (i: number): boolean => (dir < 0 ? w[i] > RULES.dial.min : w[i] < RULES.dial.max) && x[i] > 0;
  return free(1) && (!free(0) || x[1] > x[0]) ? 1 : 0;
}
/** Clicks in direction `dir` until the sum crosses zero, then `more` clicks. */
function across(d: D, dir: 1 | -1, more: number): WalkStep[] {
  const i = strongest(d, dir), w = hv(d), x = [d.s.x1, d.s.x2], sum = w[0] * x[0] + w[1] * x[1];
  const need = Math.max(0, Math.floor((dir < 0 ? sum : -sum) / (x[i] * STEP)) + 1) + more;
  const to = Math.min(RULES.dial.max, Math.max(RULES.dial.min, w[i] + dir * need * STEP));
  return [...lampWalk(d, ['valve']), ...clicksTo(d, i, to, 0.8), ...lampWalk(d, ['graph'], 0.6), act(1.2, () => undefined)];
}

/** e4, round 1: no target; get the needle as low as it goes and press Done; the valve's floor at zero shows itself. */
const low: BenchTask = {
  id: 'e4.1', of: 'e4', label: `${LABEL} · 1 of 2`, ask: 'e4', hands: [0, 1],
  setup: (d, seed) => { const c = e4(1, seed); base(d, { x1: c.x[0], x2: c.x[1], w1: c.w[0], w2: c.w[1], noteRows: 4, plqOn: 1, plq: 2 }, 'drive', 'gauge'); },
  commit: (d) => {
    if (now(d).out === 0) return { pass: true };
    void d.say('e4miss');
    return null;
  },
  tap: pressIn,
  ok: 'e4ok',
  after: (d) => { const i = strongest(d, -1); return [act(0.5, () => d.hands[i].turn(-1)), act(1.6, () => d.hands[i].turn(1)), act(0.8, () => undefined)]; },
  detect: (d, when) => {
    if (when !== 'play') return null;
    const x = [d.s.x1, d.s.x2], moves = d.log.moves().filter((m) => m.hand < 2), w = hv(d);
    const at = [moves.find((m) => m.hand === 0)?.from ?? w[0], moves.find((m) => m.hand === 1)?.from ?? w[1]];
    let floor = false, down = 0;
    for (const m of moves) {
      at[m.hand] = m.to;
      if (!floor) { floor = at[0] * x[0] + at[1] * x[1] <= 0; continue; }
      if (m.to > m.from) return null;
      down++;
    }
    return floor && down >= 4 ? M.any : null;
  },
  look: (d) => lampWalk(d, ['valve', 'graph', 'gauge']),
  narrow: 'e4n',
  show: (d) => across(d, -1, 2),
};

/** e4, round 2: the sum starts below zero with the needle at rest; turn until the needle leaves zero. */
const off: BenchTask = {
  id: 'e4.2', of: 'e4', label: `${LABEL} · 2 of 2`, ask: 'e4b', hands: [0, 1],
  setup: (d, seed) => { const c = e4(2, seed); base(d, { x1: c.x[0], x2: c.x[1], w1: c.w[0], w2: c.w[1], noteRows: 4 }, 'drive', 'chamber'); },
  verdict: (d) => (now(d).out > 0 ? true : null),
  ok: 'e4okb',
  look: (d) => lampWalk(d, ['chamber', 'valve', 'graph']),
  narrow: 'e4n',
  show: (d) => across(d, 1, 0),
};

export const E4: BenchTask[] = [low, off];
