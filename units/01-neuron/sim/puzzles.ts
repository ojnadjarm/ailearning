import { drawnTotal, relu, type Example, type Vec2 } from './neuron';
import { DETENTS, bestOnClicks, winners, type Level } from './race';
import { RULES } from './rules';
import { picker } from './seed';
import { clicks } from './generators';

/** A random tuning puzzle: four examples, a start, and the goal on the drawn total (0 when exact, else the grid's best). */
interface Puzzle extends Level { kind: PuzzleKind; goal: number; at: Vec2[] }
export type PuzzleKind = 'exact' | 'best';

const PAIRS: Vec2[] = [0, 1, 2, 3].flatMap((a) => [0, 1, 2, 3].map((b): Vec2 => [a, b])).filter(([a, b]) => a + b > 0);
const MIN_CLICKS = 4;

/** An exact puzzle: a hidden setting on the clicks makes every target, so the goal is 0; a best one: two examples share inputs with different targets, so the goal is the smallest total the clicks allow (above 0). */
export function puzzle(kind: PuzzleKind, seed: number): Puzzle {
  const p = picker(seed);
  for (let i = 0; i < 20000; i++) {
    const w: Vec2 = [p.one(DETENTS.filter((v) => Math.abs(v) <= 2)), p.one(DETENTS.filter((v) => Math.abs(v) <= 2))];
    const xs: Vec2[] = [];
    while (xs.length < (kind === 'exact' ? 4 : 3)) { const x = p.one(PAIRS); if (!xs.some((y) => y[0] === x[0] && y[1] === x[1])) xs.push(x); }
    const ex: Example[] = xs.map((x) => ({ x, target: relu(w[0] * x[0] + w[1] * x[1]) }));
    if (kind === 'best') {
      const k = p.int(0, 2), t = ex[k].target + p.one([-1.5, -1, 1, 1.5]);
      ex.splice(p.int(0, 3), 0, { x: [...ex[k].x], target: t });
    }
    if (ex.some((e) => e.target < 0 || e.target > RULES.gauge.max) || ex.filter((e) => e.target > 0).length < 3) continue;
    const { total, at } = kind === 'exact' ? { total: 0, at: winners(ex) } : bestOnClicks(ex);
    if (!at.length || (kind === 'best' && total <= 0)) continue;
    const start: Vec2 = [p.one(DETENTS), p.one(DETENTS)];
    if (at.some((a) => clicks(a, start) < MIN_CLICKS) || drawnTotal(start, ex) < total + 2) continue;
    return { id: `${kind}-${seed}`, kind, ex, start, exact: kind === 'exact', goal: total, at };
  }
  throw new Error(`no ${kind} puzzle for seed ${seed}`);
}
