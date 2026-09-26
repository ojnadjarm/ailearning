import { flow } from '../../sim/build';
import { forward, type Vec2 } from '../../sim/neuron';
import { HAND } from '../controls';
import { pair } from './e8';
import { base, hv, M, near, now, type BenchTask, type D, type S } from './common';

/** Fig. 1 lettered A (1) or B (2); the other plate drawn in Fig. 6. */
interface Pair { id: string; plate: 1 | 2; o: S; ref: S; hands: number[]; pass(d: D): boolean }
const ref = (x: Vec2, w: Vec2, t = 0): S => ({ aX1: x[0], aX2: x[1], aW1: w[0], aW2: w[1], aT: t });
const fig1 = (x: Vec2, w: Vec2): S => ({ x1: x[0], x2: x[1], w1: w[0], w2: w[1] });

/** A contrast pair: two plates side by side that differ in the one thing the misconception gets wrong; held when Fig. 1 matches the other plate. */
function contrast(p: Pair): BenchTask {
  return {
    id: p.id, label: 'Plate A and plate B', ask: p.id, hands: p.hands,
    setup: (d) => base(d, { markOn: 0, noteRows: 4, fig6: 1, fig6k: 1, plate: p.plate, ...p.o, ...p.ref }, 'wide', 'slotR'),
    verdict: (d) => (p.pass(d) ? true : null),
    ok: () => [],
  };
}

const B = 2, A = 1;
export const CONTRASTS: Record<string, BenchTask> = {
  [M.pass]: contrast({ id: 'k1', plate: B, o: fig1([2, 1], [-0.5, 2]), ref: ref([2, 1], [1, 1]), hands: [0, 1], pass: (d) => near(now(d).out, 3) }),
  [M.adds]: contrast({ id: 'k2', plate: B, o: fig1([3, 0], [0, 0]), ref: ref([2, 0], [1.5, 0]), hands: [0], pass: (d) => near(3 * hv(d)[0], 3) }),
  [M.sumOut]: contrast({ id: 'k9', plate: B, o: fig1([2, 1], [1, -3]), ref: ref([2, 1], [1, -2.5]), hands: [1], pass: (d) => near(now(d).sum, -0.5) }),
  [M.click]: contrast({ id: 'k8', plate: A, o: fig1([1, 1], [0.5, 0]), ref: { ...ref([3, 1], [1, 0]), aClick: 1 }, hands: [0], pass: (d) => near(now(d).out, 2) }),
  [M.any]: contrast({ id: 'k3', plate: B, o: fig1([2, 2], [1, -1.5]), ref: ref([2, 2], [1, -0.5]), hands: [1], pass: (d) => now(d).out > 0 }),
  [M.valve]: contrast({
    id: 'k4', plate: B, o: { ...fig1([2, 1], [1.5, -0.5]), fig7: 1, sD1: 0, sD2: 2, sCh: 4, sVa: 3, stubOn: 1 }, ref: { ...ref([2, 1], [1.5, -0.5]), aBuild: 1 },
    hands: [HAND.va], pass: (d) => near(flow({ d1: d.s.sD1, d2: d.s.sD2, ch: d.s.sCh, va: d.hands[HAND.va].value() }, [1.5, -0.5], [2, 1]).out, 2.5),
  }),
  [M.sign]: contrast({ id: 'k5', plate: B, o: { ...fig1([2, 0], [2, 0]), target: 3, markOn: 1, tT: 1, missOn: 1, tMiss: 1 }, ref: ref([2, 0], [1, 0], 3), hands: [0], pass: (d) => near(3 - now(d).out, 1) }),
  [M.input]: contrast({ id: 'k6', plate: A, o: { ...fig1([1, 2], [1, 0.5]), locks: 1 }, ref: ref([2, 2], [1, 0.5]), hands: [0, 1, 2, 3], pass: (d) => near(now(d).out, 3) }),
  [M.perEx]: contrast({
    id: 'k7', plate: A, o: { ...pair([{ x: [2, 1], t: 2.5 }, { x: [1, 2], t: 2 }]), w1: 1.5, w2: -0.5, fig6k: 4, markOn: 1, tT: 1, bracket: 1 }, ref: ref([2, 1], [1, 0.5]), hands: [0, 1],
    pass: (d) => [[2, 1, 2.5], [1, 2, 2]].every(([a, b, t]) => near(forward(hv(d), [a, b]).out, t)),
  }),
};
