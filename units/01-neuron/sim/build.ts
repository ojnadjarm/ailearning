import { relu, type Vec2 } from './neuron';
import { fix, num } from './format';

/** The assembly bench (e5): six seats on Fig. 1 (a dial and a valve seat on each branch, the join, the trunk) and the flow through whatever the learner seated. Pure. */
export const SEAT = { dial1: 0, valve1: 1, dial2: 2, valve2: 3, join: 4, trunk: 5 } as const;
export type Part = 'dial' | 'chamber' | 'valve';
/** Where each part sits: a seat index, or −1 in the tray. */
export interface Build { d1: number; d2: number; ch: number; va: number }
/** The three test examples: no negative product, a negative product with a positive sum, a negative sum. */
export const TESTS: Vec2[] = [[2, 0], [2, 1], [0, 2]];

/** Which seats a part fits: dials on the branches, the chamber at the join, the valve on a branch or the trunk. */
export const fits = (part: Part, seat: number): boolean =>
  part === 'dial' ? seat === SEAT.dial1 || seat === SEAT.dial2 : part === 'chamber' ? seat === SEAT.join : ([SEAT.valve1, SEAT.valve2, SEAT.trunk] as number[]).includes(seat);
export const complete = (b: Build): boolean => b.d1 >= 0 && b.d2 >= 0 && b.ch >= 0 && b.va >= 0;
const onTrunk = (seat: number): boolean => seat === SEAT.trunk;
export const onBranch = (seat: number): boolean => seat === SEAT.valve1 || seat === SEAT.valve2;

/** One example through the build: each branch through the dial seated on it (a dial labelled for input k carries weight k), then a branch valve; the join adds; a trunk valve acts on the sum. */
export function flow(b: Build, w: Vec2, x: Vec2): { v: Vec2; sum: number; out: number } {
  const branch = (i: 0 | 1): number => {
    const seat = i ? SEAT.dial2 : SEAT.dial1, k = b.d1 === seat ? w[0] : b.d2 === seat ? w[1] : 1, v = x[i] * k;
    return b.va === (i ? SEAT.valve2 : SEAT.valve1) ? relu(v) : v;
  };
  const v: Vec2 = [branch(0), branch(1)], sum = v[0] + v[1];
  return { v, sum, out: onTrunk(b.va) ? relu(sum) : sum };
}

/** Each test's output through the build, and its mark (what a neuron gives). */
const tests = (b: Build, w: Vec2): { x: Vec2; out: number; mark: number }[] =>
  TESTS.map((x) => ({ x, out: flow(b, w, x).out, mark: relu(x[0] * w[0] + x[1] * w[1]) }));
export const passes = (b: Build, w: Vec2): boolean => tests(b, w).every((t) => Math.abs(t.out - t.mark) < 1e-9);

/** The build a plate state holds: each part's seat (−1 the tray). */
export const buildOf = (s: { sD1: number; sD2: number; sCh: number; sVa: number }): Build => ({ d1: Math.round(s.sD1), d2: Math.round(s.sD2), ch: Math.round(s.sCh), va: Math.round(s.sVa) });
/** The NOTE rows of the tests: each test's inputs, its output through the build and its mark. */
export const testRows = (b: Build, w: Vec2): string[] =>
  tests(b, w).map((t, i) => `test ${i + 1} (${num(t.x[0])}, ${num(t.x[1])}): output ${fix(t.out)}, mark ${fix(t.mark)}`);
