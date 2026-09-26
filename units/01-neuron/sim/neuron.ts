import { EXAMPLES, RULES, TUNER } from './rules';

/** One neuron with two inputs and no bias: pure, deterministic arithmetic. */
export type Vec2 = [number, number];
export interface NeuronObs { contrib: Vec2; sum: number; out: number; }

export const relu = (x: number): number => Math.max(0, x);

export function forward(w: Vec2, x: Vec2): NeuronObs {
  const contrib: Vec2 = [w[0] * x[0], w[1] * x[1]];
  const sum = contrib[0] + contrib[1];
  return { contrib, sum, out: relu(sum) };
}

export interface Example { x: Vec2; target: number; }

/** Total size of the misses over a set of examples. */
export function totalMiss(w: Vec2, ex: Example[]): number {
  return ex.reduce((a, e) => a + Math.abs(e.target - forward(w, e.x).out), 0);
}

/** Mean squared miss gradient, the signal the tuner follows. */
export function gradient(w: Vec2, ex: Example[]): Vec2 {
  const g: Vec2 = [0, 0];
  for (const e of ex) {
    const o = forward(w, e.x);
    if (o.sum <= 0) continue;
    const d = (2 * (o.out - e.target)) / ex.length;
    g[0] += d * e.x[0]; g[1] += d * e.x[1];
  }
  return g;
}

/** The tuner's settings from `w`: `steps` gradient steps at `lr`, the start included. */
export function tunerPath(w: Vec2, ex: Example[] = EXAMPLES, steps = TUNER.steps, lr = TUNER.lr): Vec2[] {
  const out: Vec2[] = [w];
  for (let i = 0; i < steps; i++) { const p = out[i], g = gradient(p, ex); out.push([p[0] - lr * g[0], p[1] - lr * g[1]]); }
  return out;
}

/** A weight as the plate draws it: two decimals, rounded from its exact binary value (1.525 draws as 1.52). */
const drawn = (w: number): number => Number(w.toFixed(2));

/** One example worked through with the drawn weights. */
export interface Worked { x: Vec2; t: number; p1: number; p2: number; sum: number; out: number; miss: number }
const work = (w: Vec2, x: Vec2, t: number): Worked => { const o = forward(w, x); return { x, t, p1: o.contrib[0], p2: o.contrib[1], sum: o.sum, out: o.out, miss: t - o.out }; };

/** Every number the plate shows for one state, from the drawn weights: products, sum, valve, output, target, miss, the four examples and the total. */
export interface Derived extends Worked {
  x1: number; x2: number; w1: number; w2: number; open: boolean;
  /** A weight is off the clicks (a tuner frame): computed numbers show two decimals. */
  two: boolean;
  ex: Worked[]; total: number; click: number; tube_max: number;
  /** The examples on the bench (e8, the tuning levels) worked through with the learner's dials, and their total miss. */
  bench: Worked[]; btotal: number;
  /** The reference plate of a contrast pair. */
  a: Worked & { w: Vec2 };
}

type ExKey = `ex${1 | 2 | 3 | 4}${'a' | 'b' | 't'}`;
/** The plate state `derive` reads: Fig. 1's numbers, and optionally the bench examples (`exN` of them) and the reference plate. */
type Plated = { x1: number; x2: number; w1: number; w2: number; target: number }
  & Partial<Record<ExKey | 'exN' | 'aX1' | 'aX2' | 'aW1' | 'aW2' | 'aT' | 'fig6k', number>>;

/** The examples on the bench: `ex1a`, `ex1b`, `ex1t`, … for `exN` of them. */
function benchExamples(s: Plated): Example[] {
  return Array.from({ length: s.exN ?? 0 }, (_, i) => ({ x: [s[`ex${i + 1}a` as ExKey] ?? 0, s[`ex${i + 1}b` as ExKey] ?? 0] as Vec2, target: s[`ex${i + 1}t` as ExKey] ?? 0 }));
}

/** A total miss as drawn: two decimals, from the drawn weights. */
export const drawnTotal = (w: Vec2, ex: Example[]): number => Number(totalMiss([drawn(w[0]), drawn(w[1])], ex).toFixed(2));

export function derive(s: Plated): Derived {
  const w: Vec2 = [drawn(s.w1), drawn(s.w2)], x: Vec2 = [s.x1, s.x2], step = RULES.dial.step, list = benchExamples(s);
  const ex = EXAMPLES.map((e) => work(w, e.x, e.target)), aw: Vec2 = [drawn(s.aW1 ?? 0), drawn(s.aW2 ?? 0)];
  const bench = list.map((e) => work(w, e.x, e.target));
  return {
    ...work(w, x, s.target), x1: s.x1, x2: s.x2, w1: w[0], w2: w[1], open: forward(w, x).sum > 0,
    two: w.some((v) => Math.abs(v / step - Math.round(v / step)) > 1e-9),
    ex, total: ex.reduce((a, e) => a + Math.abs(e.miss), 0), click: step, tube_max: RULES.tube.max,
    bench, btotal: bench.reduce((a, e) => a + Math.abs(e.miss), 0),
    a: { ...work(aw, [s.aX1 ?? 0, s.aX2 ?? 0], s.aT ?? 0), w: aw },
  };
}

/** The named numbers of one state, as the sentence asserts read them. */
export function env(v: Derived): Record<string, number> {
  const out: Record<string, number> = { x1: v.x1, x2: v.x2, w1: v.w1, w2: v.w2, p1: v.p1, p2: v.p2, sum: v.sum, out: v.out, t: v.t, miss: v.miss, total: v.total, click: v.click, tube_max: v.tube_max };
  v.ex.forEach((e, i) => { out[`e${i + 1}_out`] = e.out; out[`e${i + 1}_miss`] = e.miss; });
  return out;
}
