import type { Derived, Worked } from './neuron';

/** The number rules of the plate: a true minus sign (U+2212), weights in their shortest exact form, computed numbers at one decimal (two in a tuner frame). */
const MINUS = '−';

/** A value in its shortest exact form: 2, 2.5, 0.25, −1. */
export function num(v: number): string {
  const r = Number(v.toFixed(2));
  return (r < 0 ? MINUS : '') + String(Math.abs(r));
}

/** A dial setting, always signed: +1, −0.5, 0. */
export const signed = (v: number): string => (Number(v.toFixed(2)) === 0 ? '0' : (v > 0 ? '+' : '') + num(v));

/** A value inside a sum or product: bracketed when negative, so 2 × (−1) never reads as a subtraction. */
export const op = (v: number): string => (Number(v.toFixed(2)) < 0 ? `(${num(v)})` : num(v));

/** A computed number with `dp` decimals: 3.0, −1.5, 2.69. */
export function fix(v: number, dp = 1): string {
  const s = Math.abs(v).toFixed(dp);
  return (v < 0 && Number(s) !== 0 ? MINUS : '') + s;
}
/** A computed number with its sign: +0.5, −1.0, 0.0 (a miss). */
export const sfix = (v: number, dp = 1): string => (Number(Math.abs(v).toFixed(dp)) === 0 ? fix(0, dp) : (v > 0 ? '+' : '') + fix(v, dp));
/** A computed operand: bracketed when negative. */
const fop = (v: number, dp: number): string => (v < 0 && Number(Math.abs(v).toFixed(dp)) !== 0 ? `(${fix(v, dp)})` : fix(v, dp));

/** Decimals of the computed numbers in this frame. */
export const dp = (v: Derived): number => (v.two ? 2 : 1);

/** The value tags on Fig. 1, by name. */
export function tags(v: Derived): Record<string, string> {
  const d = dp(v);
  return { x1: num(v.x1), x2: num(v.x2), w1: signed(v.w1), w2: signed(v.w2), p1: fix(v.p1, d), p2: fix(v.p2, d), sum: fix(v.sum, d),
    out: fix(v.out, d), t: fix(v.t, d), miss: sfix(v.miss, d), total: fix(v.total, d) };
}

/** One example's rows of working: products, sum, valve, miss (the NOTE block). */
export function working(e: Worked, w: [number, number], d: number, pre = ''): string[] {
  const valve = e.sum > 0 ? 'is above 0' : e.sum < 0 ? 'is below 0' : 'is not above 0';
  return [
    `${pre}product 1: ${num(e.x[0])} × ${op(w[0])} = ${fix(e.p1, d)}`,
    `${pre}product 2: ${num(e.x[1])} × ${op(w[1])} = ${fix(e.p2, d)}`,
    `${pre}sum: ${fop(e.p1, d)} + ${fop(e.p2, d)} = ${fix(e.sum, d)}`,
    `${pre}valve: ${fix(e.sum, d)} ${valve}, so output ${fix(e.out, d)}`,
    `${pre}miss: ${fix(e.t, d)} − ${fix(e.out, d)} = ${sfix(e.miss, d)}`,
  ];
}

/** The NOTE block's rows for a mode: Fig. 1 (0), example 2 worked through (1), or the total miss (2). */
export function noteRows(v: Derived, mode: number): string[] {
  const d = dp(v), w: [number, number] = [v.w1, v.w2];
  if (mode === 1) return working(v.ex[1], w, d, 'E2 ');
  if (mode === 2) return [`total miss: ${v.ex.map((e) => fix(Math.abs(e.miss), d)).join(' + ')} = ${fix(v.total, d)}`];
  return working(v, w, d);
}

/** One small gauge of Fig. 3: its inputs, target, output and miss. */
export const example = (e: Worked, d: number): { x: number[]; t: string; out: string; miss: string } =>
  ({ x: [...e.x], t: fix(e.t, d), out: fix(e.out, d), miss: sfix(e.miss, d) });
