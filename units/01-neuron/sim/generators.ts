import { relu, type Vec2 } from './neuron';
import { RULES } from './rules';
import { DETENTS } from './race';
import { picker } from './seed';

/** Seeded case generators for the drive and the Workbench: each draws until its keep-rules hold, so a seed always poses the same case. */
type Pick = ReturnType<typeof picker>;
const STEP = RULES.dial.step;
const near = (a: number, b: number): boolean => Math.abs(a - b) < 1e-6;
const isDetent = (w: number): boolean => w >= RULES.dial.min - 1e-9 && w <= RULES.dial.max + 1e-9 && near(w / STEP, Math.round(w / STEP));
const out = (w: Vec2, x: Vec2): number => relu(w[0] * x[0] + w[1] * x[1]);
const range = (a: number, b: number): number[] => DETENTS.filter((v) => v >= a - 1e-9 && v <= b + 1e-9);
const INPUTS = [1, 2, 3];

/** Clicks between two settings. */
export const clicks = (a: Vec2, b: Vec2): number => Math.round((Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1])) / STEP);
/** Every setting on the clicks whose output meets `t` for inputs `x`. */
export const onMark = (x: Vec2, t: number): Vec2[] => DETENTS.flatMap((a) => DETENTS.filter((b) => near(out([a, b], x), t)).map((b): Vec2 => [a, b]));

function draw<T>(seed: number, make: (p: Pick) => T, keep: (c: T) => boolean): T {
  const p = picker(seed);
  for (let i = 0; i < 20000; i++) { const c = make(p); if (keep(c)) return c; }
  throw new Error(`no case for seed ${seed}`);
}

/** d3: new inputs and a mark some setting meets, at least three clicks from (0, 0). */
interface MarkCase { x: Vec2; t: number }
export const d3 = (seed: number): MarkCase => draw(seed, (p) => {
  const x: Vec2 = [p.int(0, 3), p.int(0, 3)];
  return { x, t: x[0] * p.one(DETENTS) + x[1] * p.one(DETENTS) };
}, (c) => (c.x[0] > 0 || c.x[1] > 0) && c.t >= 1 && c.t <= 4.5 && Math.min(...onMark(c.x, c.t).map((w) => clicks([0, 0], w))) >= 3);

/** e1 rounds 1–2: one input, a goal product; `add` is the additive reading (the weight that adds up to the goal). */
interface ProductCase { x1: number; w: number; p: number; add: number }
export const e1a = (round: 1 | 2, seed: number): ProductCase => draw(seed, (p) => {
  const x1 = round === 1 ? 2 : 3, w = p.one(DETENTS);
  return { x1, w, p: x1 * w, add: x1 * w - x1 };
}, (c) => !near(c.w, 0) && !near(c.w, 1) && Math.abs(c.p) <= 7.5 && !near(c.add, c.w));

/** e1 round 3: dial 1 locked, a goal sum at or below zero that only a negative second weight reaches. */
interface SumCase { x: Vec2; w1: number; s: number; w2: number }
export const e1b = (seed: number): SumCase => draw(seed, (p) => {
  const x: Vec2 = [p.one(INPUTS), p.one(INPUTS)], w1 = p.one([1, 1.5, 2]), s = p.one([0, -0.5, -1, -1.5]);
  return { x, w1, s, w2: (s - x[0] * w1) / x[1] };
}, (c) => c.x[0] * c.w1 <= 4.5 && isDetent(c.w2) && c.w2 >= -3 && c.w2 <= -0.5);

/** e2: a whole case to predict: rounds 1–2 open the valve and keep pass-through and mean readings a unit away; round 3 shuts it. */
interface ChainCase { x: Vec2; w: Vec2; sum: number; out: number }
const W2 = range(-1.5, 2.5).filter((v) => !near(v, 0));
export const e2 = (round: 1 | 2 | 3, seed: number): ChainCase => draw(seed, (p) => {
  const x: Vec2 = [p.one(INPUTS), p.one(INPUTS)], w: Vec2 = [p.one(W2), p.one(W2)], sum = w[0] * x[0] + w[1] * x[1];
  return { x, w, sum, out: relu(sum) };
}, (c) => c.x[0] + c.x[1] <= 5 && !(near(c.w[0], 1) && near(c.w[1], 1)) && (round < 3
  ? c.sum >= 0.5 && c.sum <= 4.5 && Math.abs(c.out - (c.x[0] + c.x[1])) >= 1 && Math.abs(c.out - (c.x[0] + c.x[1]) / 2) >= 1
  : c.sum >= -2 && c.sum <= -0.5));

/** e3: one dial turns `n` clicks (signed); the needle's landing is to be predicted. `naive` is the same-size reading. */
export type TurnKind = 'up' | 'down' | 'zero' | 'below';
interface TurnCase { x: Vec2; w: Vec2; dial: 0 | 1; n: number; out0: number; sum: number; out: number; naive: number }
export const e3 = (kind: TurnKind, seed: number): TurnCase => draw(seed, (p) => {
  const x: Vec2 = [p.one(INPUTS), p.one(INPUTS)], w: Vec2 = [p.one(DETENTS), p.one(DETENTS)], dial = p.one([0, 1] as const);
  const n = p.int(1, 3) * (kind === 'up' ? 1 : -1), w2: Vec2 = [...w];
  w2[dial] += n * STEP;
  const sum0 = w[0] * x[0] + w[1] * x[1], sum = w2[0] * x[0] + w2[1] * x[1];
  return { x, w, dial, n, out0: relu(sum0), sum, out: relu(sum), naive: relu(sum0) + n * STEP };
}, (c) => {
  const s0 = c.w[0] * c.x[0] + c.w[1] * c.x[1], wd = c.w[c.dial] + c.n * STEP;
  const ok = kind === 'up' ? c.sum > s0 && c.out <= 5 : kind === 'down' ? c.sum < s0 && c.sum > 0 : kind === 'zero' ? near(c.sum, 0) : c.sum >= -3 && c.sum <= -0.5;
  return c.x[c.dial] >= 2 && isDetent(wd) && s0 > 0 && c.out0 >= 1 && c.out0 <= 4 && ok && Math.abs(c.naive - c.out) >= 0.5;
});

/** e4: round 1 starts with the needle between 2 and 4; round 2 with the sum below zero. */
interface FloorCase { x: Vec2; w: Vec2; sum: number }
export const e4 = (round: 1 | 2, seed: number): FloorCase => draw(seed, (p) => {
  const x: Vec2 = [p.one(INPUTS), p.one(INPUTS)], pool = round === 1 ? [0.5, 1, 1.5] : range(-1.5, 1), w: Vec2 = [p.one(pool), p.one(pool)];
  return { x, w, sum: w[0] * x[0] + w[1] * x[1] };
}, (c) => (round === 1 ? c.sum >= 2 && c.sum <= 4 : c.sum >= -3 && c.sum <= -1));

/** e5: the preset weights of the two dials in the tray. */
export const e5 = (seed: number): Vec2 => { const p = picker(seed); return [p.one([1, 1.5, 2]), p.one([-1.5, -1, -0.5])]; };

/** e6: a miss to set with dial 1 (input 2 empty); both the right output and the flipped one are on the dial and the gauge. */
interface MissCase { x1: number; t: number; m: number; out: number; flipped: number }
const reach = (x1: number, v: number): boolean => DETENTS.some((w) => w > 0 && near(x1 * w, v));
export const e6 = (sign: 1 | -1, seed: number): MissCase => draw(seed, (p) => {
  const x1 = p.one(INPUTS), t = p.int(2, 8) / 2, m = (sign * p.int(1, 5)) / 2;
  return { x1, t, m, out: t - m, flipped: t + m };
}, (c) => c.out >= 0.5 && c.out <= 4.5 && reach(c.x1, c.out) && c.flipped >= 0.5 && c.flipped <= 5 && reach(c.x1, c.flipped));

/** e7: the needle off its mark; a refill of input 1 would meet it (the tempting wrong fix), the dials must. */
interface RepairCase { x: Vec2; w: Vec2; t: number; out0: number }
export const e7 = (seed: number): RepairCase => draw(seed, (p) => {
  const x: Vec2 = [p.int(1, 2), p.int(1, 2)], pool = range(-1, 2).filter((v) => !near(v, 0)), w: Vec2 = [p.one(pool), p.one(pool)];
  return { x, w, t: p.int(1, 9) / 2, out0: out(w, x) };
}, (c) => {
  const s0 = c.w[0] * c.x[0] + c.w[1] * c.x[1], marks = onMark(c.x, c.t);
  return c.out0 <= 5 && Math.abs(s0) <= 4.5 && Math.abs(c.t - c.out0) >= 1 && marks.length > 0 && Math.min(...marks.map((m) => clicks(c.w, m))) >= 2
    && [0, 1, 2, 3].some((x1) => near(out(c.w, [x1, c.x[1]]), c.t));
});

/** e8: two examples, one setting on the clicks meets both (their inputs are not parallel). */
export interface PairCase { ex: { x: Vec2; t: number }[]; w: Vec2 }
const E8W = range(-2.5, 2.5);
export const e8 = (seed: number): PairCase => draw(seed, (p) => {
  const xs: Vec2[] = [[p.one(INPUTS), p.one(INPUTS)], [p.one(INPUTS), p.one(INPUTS)]], w: Vec2 = [p.one(E8W), p.one(E8W)];
  return { ex: xs.map((x) => ({ x, t: w[0] * x[0] + w[1] * x[1] })), w };
}, (c) => {
  const [a, b] = c.ex, start: Vec2 = [0.5, 0.5];
  return a.x[0] * b.x[1] - a.x[1] * b.x[0] !== 0 && c.ex.every((e) => e.t >= 0.5 && e.t <= 4.5 && !near(out(start, e.x), e.t)) && clicks(start, c.w) >= 3;
});
