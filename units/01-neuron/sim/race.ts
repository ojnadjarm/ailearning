import { drawnTotal, totalMiss, type Example, type Vec2 } from './neuron';
import { RULES } from './rules';

/** One level: its four examples and where the dials start; `exact` false means no setting meets every mark. */
export interface Level { id: string; ex: Example[]; start: Vec2; exact: boolean }
const ex = (rows: [number, number, number][]): Example[] => rows.map(([a, b, t]) => ({ x: [a, b], target: t }));

export const LEVELS: Level[] = [
  { id: 'L1', ex: ex([[2, 1, 1.0], [1, 2, 3.5], [3, 1, 0.5], [0, 2, 4.0]]), start: [0.5, 0.5], exact: true },
  { id: 'L2', ex: ex([[1, 1, 1.5], [2, 2, 3.0], [3, 3, 4.5], [0, 3, 0.0]]), start: [0, 1], exact: true },
  { id: 'L3', ex: ex([[1, 1, 1.0], [1, 1, 2.0], [2, 1, 2.5], [1, 2, 2.0]]), start: [2.5, -0.5], exact: false },
];

/** The detents of a dial, low to high. */
export const DETENTS: number[] = Array.from({ length: Math.round((RULES.dial.max - RULES.dial.min) / RULES.dial.step) + 1 }, (_, i) => RULES.dial.min + i * RULES.dial.step);

/** Every setting on the clicks that meets every mark. */
export const winners = (e: Example[]): Vec2[] => DETENTS.flatMap((a) => DETENTS.filter((b) => totalMiss([a, b], e) < 0.01).map((b): Vec2 => [a, b]));

/** The smallest total miss on the clicks, and the settings that reach it. */
export function bestOnClicks(e: Example[]): { total: number; at: Vec2[] } {
  let total = Infinity, at: Vec2[] = [];
  for (const a of DETENTS) for (const b of DETENTS) {
    const m = drawnTotal([a, b], e);
    if (m < total - 1e-9) { total = m; at = [[a, b]]; } else if (Math.abs(m - total) < 1e-9) at.push([a, b]);
  }
  return { total, at };
}

/** Each level's goal on the drawn total: 0 where a setting meets every mark, else the smallest total the clicks allow. */
export const GOALS: number[] = LEVELS.map((l) => (l.exact ? 0 : bestOnClicks(l.ex).total));
/** The drawn total at `w` meets level k's goal (k from 0). */
export const reached = (w: Vec2, k: number): boolean => drawnTotal(w, LEVELS[k].ex) <= GOALS[k] + 1e-9;
