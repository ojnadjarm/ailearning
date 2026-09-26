import type { A01State } from '../unit/state';
import { forward, relu, type Derived, type Worked } from '../sim/neuron';
import { fix, num, sfix, signed } from '../sim/format';
import { RULES } from '../sim/rules';
import type { RefPlate, SlotView } from './parts/fig6';
import type { RaceView } from './parts/race';

const example = (e: Worked, i: number, d: number): SlotView => ({
  title: `EXAMPLE ${i + 1}`, out: e.out, t: e.t, read: { in: `${num(e.x[0])} · ${num(e.x[1])}`, target: fix(e.t, d), miss: sfix(e.miss, d), out: fix(e.out, d) },
  rows: [`inputs ${num(e.x[0])}, ${num(e.x[1])}`, `target ${fix(e.t, d)} · miss ${sfix(e.miss, d)}`, `output ${fix(e.out, d)}`],
});

const IN = { label: 'IN', role: 'signal' } as const, OUT = { label: 'OUT', role: 'signal' } as const, TARGET = { label: 'TARGET', role: 'targetInk' } as const;
const DIALS = [{ label: 'DIAL 1', role: 'weight' }, { label: 'DIAL 2', role: 'weight' }] as const;
const MISSES = [{ label: 'MISS 1', role: 'targetInk' }, { label: 'MISS 2', role: 'targetInk' }] as const;

/** The other plate of a contrast pair: its letter, its setting and the numbers the task compares, on its data plate (`rows` as text). */
function reference(s: A01State, v: Derived): SlotView {
  const a = v.a, d = v.two ? 2 : 1, title = `PLATE ${Math.round(s.plate) === 1 ? 'B' : 'A'}`, dash = '—';
  const inp = `${num(a.x[0])} · ${num(a.x[1])}`, w = [signed(a.w[0]), signed(a.w[1])];
  const cells = [IN, ...DIALS, TARGET, OUT], row = (t: string, foot: string, value: string, role: RefPlate['role'] = 'ink') => ({ cells, values: [inp, ...w, t, fix(a.out, d)], foot, value, role });
  if (s.aClick > 0.5) {
    const before = relu(a.x[0] * (a.w[0] - RULES.dial.step) + a.x[1] * a.w[1]);
    return { title, out: a.out, ghost: before, t: null, plate: row(dash, `NEEDLE AT DIAL 1 ${signed(a.w[0] - RULES.dial.step)}`, fix(before, d), 'signal'),
      rows: [`inputs ${num(a.x[0])}, ${num(a.x[1])}`, `dial 1: ${signed(a.w[0] - RULES.dial.step)} → ${signed(a.w[0])}`, `needle ${fix(before, d)} → ${fix(a.out, d)}`] };
  }
  const head = `inputs ${num(a.x[0])}, ${num(a.x[1])} · weights ${signed(a.w[0])}, ${signed(a.w[1])}`;
  if (s.fig6k > 3.5) {
    const m = v.bench.map((e) => sfix(e.t - forward(a.w, e.x).out, d));
    return { title, out: null, plate: { cells: [...DIALS, ...MISSES, { label: 'MET', role: 'ink' }], values: [...w, m[0] ?? dash, m[1] ?? dash, `${m.filter((x) => Math.abs(Number(x.replace('−', '-'))) < 1e-9).length} OF ${m.length}`], foot: 'ONE SETTING · BOTH MARKS', value: '', role: 'ink' },
      rows: [`weights ${signed(a.w[0])}, ${signed(a.w[1])}`, `misses ${m.join(', ')}`, 'one setting, both marks'] };
  }
  if (s.aBuild > 0.5) return { title, out: a.out, t: null, plate: row(dash, 'VALVE AFTER SUM · SUM', fix(a.sum, d)), rows: [head, 'valve after the sum', `sum ${fix(a.sum, d)} · output ${fix(a.out, d)}`] };
  return { title, out: a.out, t: s.aT > 0 ? a.t : null,
    plate: s.aT > 0 ? row(fix(a.t, d), 'MISS', sfix(a.miss, d), 'targetInk') : row(dash, 'PRODUCTS', `${fix(a.p1, d)}, ${fix(a.p2, d)}`),
    rows: [head, s.aT > 0 ? `target ${fix(a.t, d)} · miss ${sfix(a.miss, d)}` : `products ${fix(a.p1, d)}, ${fix(a.p2, d)}`, `sum ${fix(a.sum, d)} · output ${fix(a.out, d)}`] };
}

/** Fig. 6's slots: 1 a contrast pair's other plate, 2 the bench's two examples, 3 a tuning level's four, 4 two examples and a reference, 5 the four the watch explains (a lamp lights within 0.05, as near as the tuner gets). */
export function fig6Slots(s: A01State, v: Derived): (SlotView | null)[] {
  const k = Math.round(s.fig6k), d = v.two ? 2 : 1;
  const ex = (i: number): SlotView | null => (v.bench[i] ? example(v.bench[i], i, d) : null);
  if (k === 1) return [null, null, null, null, reference(s, v), null];
  if (k === 2) return [ex(0), ex(1)];
  if (k === 3 || k === 5) {
    const near = k === 5 ? 0.05 : 0.005;
    return [0, 1, 2, 3].map((i) => { const e = ex(i); return e && s.tune > 0.5 ? { ...e, title: 'TARGET', mark: true, lit: i === Math.round(s.tSel), hit: Math.abs(v.bench[i].miss) < near } : e; });
  }
  if (k === 4) return [null, null, ex(0), ex(1), reference(s, v)];
  return [];
}

/** The tuning tally: the learner's step (clicks so far), each example's miss, the loaded set, the total, the level's goal (null: as small as it goes) and, on the last level once Done is pressed, the floor. */
export function raceView(s: A01State, v: Derived): RaceView {
  return {
    steps: Math.round(s.tStepR), parts: v.bench.map((e) => Math.abs(e.miss)), sel: s.tune > 0.5 ? Math.round(s.tSel) : -1, total: v.btotal,
    goal: s.goalT >= 0 ? s.goalT : null, floor: s.floorOn > 0.5 ? s.floorV : null,
  };
}

/** The tally as lines of text, for the note and the Working sheet. */
export const tallyLines = (r: RaceView): string[] => [`step ${r.steps}`, `your total miss: ${fix(r.total, 2)}`,
  r.goal === null ? 'goal: as small as it goes' : `goal ${fix(r.goal, 2)}`, ...(r.floor !== null ? [`best on the clicks ${fix(r.floor, 2)}`] : [])];
