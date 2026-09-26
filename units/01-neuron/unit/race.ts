import { Bench, type Task } from 'explainer-kit';
import type { A01State } from './state';
import { LEVELS, GOALS, reached, winners, bestOnClicks } from '../sim/race';
import { puzzle, type PuzzleKind } from '../sim/puzzles';
import { drawnTotal, type Example, type Vec2 } from '../sim/neuron';
import { clicks } from '../sim/generators';
import { base, ease, hv, M, near, pressIn, act, pathTo, type BenchTask, type D, type S } from './bench/common';
import { refute } from './bench';
import { FIG6, INPUTS } from './layout';

const LABEL = 'Tuning';
/** Four examples on the bench, Fig. 1 on the first, the dials at `w`, the tally at step 0 with its goal (−1: as small as it goes). */
const posed = (ex: Example[], w: Vec2, goalT: number): S => ({
  exN: 4, ...Object.fromEntries(ex.flatMap((e, i) => [[`ex${i + 1}a`, e.x[0]], [`ex${i + 1}b`, e.x[1]], [`ex${i + 1}t`, e.target]])),
  x1: ex[0].x[0], x2: ex[0].x[1], target: ex[0].target, w1: w[0], w2: w[1], tStepR: 0,
  markOn: 1, tT: 1, fig6: 1, fig6k: 3, goalT, tunerOn: 0, tune: 1, tSel: 0,
});
const goalOf = (k: number): number => (LEVELS[k].exact ? GOALS[k] : -1);
/** The setting among `at` fewest clicks from the dials now. */
const nearest = (d: D, at: Vec2[]): Vec2 => at.reduce((a, b) => (clicks(b, hv(d)) < clicks(a, hv(d)) ? b : a));
/** Each settled click of a dial is one tuning step. */
const steps = (d: D): void => {
  const n = d.log.moves().filter((m) => m.hand < 2).length;
  if (n !== d.s.tStepR) { d.s.tStepR = n; d.wake(); }
};
/** A press on a set card or on a Fig. 6 gauge loads that example into the machine: its inputs into the tubes' hands, its target onto the mark. */
function load(d: D, wx: number, wy: number): boolean {
  if (d.s.tune < 0.5) return false;
  const card = wx >= INPUTS.x0 && wx <= INPUTS.x1 ? INPUTS.ys.findIndex((y) => Math.abs(wy - y) <= INPUTS.h / 2) : -1;
  const k = card >= 0 ? card : FIG6.slots.slice(0, 4).findIndex(([x, y]) => Math.hypot(wx - x, wy - y) <= FIG6.r + 12);
  if (k < 0) return false;
  const e = (c: 'a' | 'b' | 't'): number => d.s[`ex${k + 1}${c}` as keyof S] as number;
  d.controls.forEach((c) => { if (c.key === 'x1') c.hand.place(e('a')); if (c.key === 'x2') c.hand.place(e('b')); });
  Object.assign(d.s, { x1: e('a'), x2: e('b'), target: e('t'), tSel: k });
  d.wake();
  return true;
}
/** The dial settings the learner rested on (loading a set is not a move of the dials). */
function dialRests(d: D, gap = 1): Vec2[] {
  const m = d.log.moves().filter((c) => c.hand < 2), out: Vec2[] = [];
  const w: Vec2 = [m.find((c) => c.hand === 0)?.from ?? hv(d)[0], m.find((c) => c.hand === 1)?.from ?? hv(d)[1]];
  m.forEach((c, k) => { w[c.hand] = c.to; if ((m[k + 1]?.t ?? d.elapsed) - c.t >= gap) out.push([w[0], w[1]]); });
  return out;
}
const same = (a: Vec2, b: Vec2): boolean => near(a[0], b[0]) && near(a[1], b[1]);
/** The first setting the learner found on level 2 (the second round asks for another). */
let first: Vec2 = [1.5, 0];

/** L1, L2: the dials are live at once; the level passes when the drawn total miss reaches its goal. */
function level(k: 0 | 1): BenchTask {
  const l = LEVELS[k];
  return {
    id: l.id, of: k ? 'L2' : undefined, label: `${LABEL} · level ${k + 1} of 3`, ask: k ? 't1' : 't0', hands: [0, 1],
    setup: (d) => base(d, posed(l.ex, l.start, goalOf(k)), 'wide', 'race'),
    update: steps,
    verdict: (d) => { if (!reached(hv(d), k)) return null; if (k) first = hv(d); return true; },
    hold: 0.3,
    ok: () => ['l1'],
    narrow: 'thint',
    answer: (d) => pathTo(d, nearest(d, winners(l.ex))),
  };
}

/** L2, second round: another setting that meets every mark; the lettered ticks show them all. */
const another: BenchTask = {
  id: 'L2b', of: 'L2', label: `${LABEL} · level 2 of 3`, ask: 'l2more', hands: [0, 1],
  setup: (d) => base(d, posed(LEVELS[1].ex, first, goalOf(1)), 'wide', 'dial1'),
  update: steps,
  verdict: (d) => (reached(hv(d), 1) && !same(hv(d), first) ? true : null),
  hold: 0.3,
  ok: (d) => { ease(d, { pairs: 1 }); return ['l2']; },
  detect: (d, when) => (when === 'play' && dialRests(d).filter((w) => same(w, first)).length >= 2 ? M.one : null),
  answer: (d) => [...pathTo(d, nearest(d, winners(LEVELS[1].ex).filter((w) => !same(w, first)))), act(0.6, () => ease(d, { pairs: 1 }))],
};

/** L3: no setting meets every mark; get the total as small as it goes and press Done. Above the floor, Done says so and play goes on. */
function floor(): BenchTask {
  const l = LEVELS[2], best = GOALS[2];
  return {
    id: 'L3', label: `${LABEL} · level 3 of 3`, ask: 'l3go', hands: [0, 1],
    setup: (d) => base(d, { ...posed(l.ex, l.start, goalOf(2)), plqOn: 1, plq: 2, floorOn: 0, floorV: best }, 'wide', 'race'),
    update: steps,
    commit: (d) => {
      if (reached(hv(d), 2)) return { pass: true, walk: [act(0.6, () => ease(d, { floorOn: 1 })), act(1, () => undefined)] };
      void d.say('l3more');
      return null;
    },
    tap: pressIn,
    ok: () => ['l3', 'ttuned'],
    detect: (d, when) => {
      if (when !== 'play') return null;
      const moves = d.log.moves().filter((m) => m.hand < 2), w: Vec2 = [NaN, NaN];
      const start: Vec2 = [moves.find((m) => m.hand === 0)?.from ?? hv(d)[0], moves.find((m) => m.hand === 1)?.from ?? hv(d)[1]];
      w[0] = start[0]; w[1] = start[1];
      const at = moves.findIndex((m) => { w[m.hand] = m.to; return drawnTotal(w, l.ex) <= best + 1e-9; });
      return at >= 0 && moves.length - at - 1 >= 20 ? M.exact : null;
    },
    answer: (d) => [...pathTo(d, nearest(d, bestOnClicks(l.ex).at)), act(0.6, () => ease(d, { floorOn: 1 }))],
  };
}

const RACES: BenchTask[] = [level(0), level(1), another, floor()];

/** Tuning: three levels tuned by hand, then the Click. */
export const tuning = (d: D): Bench<A01State> => new Bench(d, 'race', { label: LABEL, next: 'click', tasks: RACES, refute: refute(d), tap: load });

/** A random puzzle of one kind: every mark met (goal 0, a held verdict) or the smallest total the clicks allow (goal above 0, press Done). */
function tune(kind: PuzzleKind): BenchTask {
  let z = puzzle(kind, 1);
  const done = (d: D): boolean => drawnTotal(hv(d), z.ex) <= z.goal + 1e-9;
  const common = {
    id: `tune.${kind}`, label: `Practice · ${LABEL}`, hands: [0, 1],
    setup: (d: D, seed: number) => { z = puzzle(kind, seed); base(d, { ...posed(z.ex, z.start, z.exact ? 0 : -1), ...(z.exact ? {} : { plqOn: 1, plq: 2, floorOn: 0, floorV: z.goal }) }, 'wide', 'race'); },
    update: steps,
  };
  if (kind === 'exact') return { ...common, ask: 't1', verdict: (d) => (done(d) ? true : null), hold: 0.3, ok: () => ['l1'], answer: (d) => pathTo(d, nearest(d, z.at)) };
  return {
    ...common, ask: 'l3go', tap: pressIn, ok: () => ['l3'],
    commit: (d) => { if (done(d)) return { pass: true, walk: [act(0.6, () => ease(d, { floorOn: 1 })), act(1, () => undefined)] }; void d.say('l3more'); return null; },
    answer: (d) => [...pathTo(d, nearest(d, z.at)), act(0.6, () => ease(d, { floorOn: 1 }))],
  };
}
const TUNES: BenchTask[] = [tune('exact'), tune('best')];

/** Endless tuning: new puzzles, the two kinds in turn, from a seed (`?seed=` pins it); the Practice head switches to exercises. */
export const tunes = (d: D, seed: number): Bench<A01State> => new Bench(d, 'tunes', {
  label: `Practice · ${LABEL}`, next: 'end', tasks: [], refute: refute(d), seed, tap: load,
  pool: { tasks: TUNES, pick: (_r, prev?: Task<A01State>) => TUNES[prev === TUNES[0] ? 1 : 0] },
});
