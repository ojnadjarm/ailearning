import type { Live, Working } from 'explainer-kit';
import { fig6On, raceOn, type A01State } from './state';
import { derive, type Derived } from '../sim/neuron';
import { RULES, TUNER } from '../sim/rules';
import { buildOf, testRows } from '../sim/build';
import { dp, fix, noteRows, num, op, sfix, signed, working } from '../sim/format';
import { fig6Slots, raceView, tallyLines } from '../plate/views';
import { ANCHORS, FIG5_LINE, NOTE } from './layout';

type Now = (v: Derived, s: A01State) => string;
const row = (v: Derived, i: number): string => noteRows(v, 0)[i];
const ex = (v: Derived, k: number): string => {
  const e = v.ex[k], d = dp(v), [p1, p2, sum, valve, miss] = working(e, [v.w1, v.w2], d);
  return `inputs ${num(e.x[0])} and ${num(e.x[1])}, target ${fix(e.t, d)}\n${p1}\n${p2}\n${sum}\n${valve}\n${miss}`;
};

const COVERS = ['cvP1', 'cvP2', 'cvSum', 'cvOut', 'cvMiss'] as const;
type Cover = (typeof COVERS)[number];
const COVERED = 'under a cover for now';
/** The covers each callout's numbers sit under. */
const UNDER: Record<string, Cover[]> = {
  p1: ['cvP1'], p2: ['cvP2'], sum: ['cvP1', 'cvP2', 'cvSum'], valve: ['cvSum', 'cvOut'], out: ['cvP1', 'cvP2', 'cvSum', 'cvOut'], graph: ['cvSum', 'cvOut'],
  miss: ['cvMiss', 'cvOut'], neuron: [...COVERS],
  win1: ['cvP1'], win2: ['cvP2'], chamber: ['cvP1', 'cvP2', 'cvSum'], gauge: ['cvP1', 'cvP2', 'cvSum', 'cvOut'],
};
const covered = (id: string, s: A01State): boolean => (UNDER[id] ?? []).some((k) => s[k] > 0.5);
const anyCover = (s: A01State): boolean => COVERS.some((k) => s[k] > 0.5);
/** In the assembly, Fig. 1's working is the tests run so far. */
const ASSEMBLY = new Set(['p1', 'p2', 'sum', 'valve', 'out', 'graph', 'miss', 'neuron']);
const tested = (v: Derived, s: A01State): string => {
  const rows = testRows(buildOf(s), [v.w1, v.w2]).slice(0, Math.round(s.tst));
  return rows.length ? rows.join('\n') : 'the tests have not run yet';
};
const SEATS = ['branch 1, dial seat', 'branch 1, after the dial', 'branch 2, dial seat', 'branch 2, after the dial', 'the join', 'the trunk'];
const seat = (v: number): string => SEATS[Math.round(v)] ?? 'the tray';
const PRESS = ['check your answer', 'lift the covers', 'finish this case', 'run the tests'];

/** How each callout's number is made right now (a newline starts a row), all from `derive(state)` and the plate's number rules. */
const NOW: Record<string, Now> = {
  x1: (v) => `input 1: ${num(v.x1)}`,
  x2: (v) => `input 2: ${num(v.x2)}`,
  w1: (v, s) => (s.cvP1 > 0.5 ? `weight 1: ${signed(v.w1)}` : `weight 1: ${signed(v.w1)}\n${row(v, 0)}`),
  w2: (v, s) => (s.cvP2 > 0.5 ? `weight 2: ${signed(v.w2)}` : `weight 2: ${signed(v.w2)}\n${row(v, 1)}`),
  p1: (v) => row(v, 0),
  p2: (v) => row(v, 1),
  note: (v, s) => {
    const n = Math.round(s.noteRows);
    if (Math.round(s.noteMode) === 3) return tested(v, s);
    if (anyCover(s)) return n ? noteRows(v, s.noteMode).slice(0, n).join('\n') : 'nothing written yet';
    return noteRows(v, s.noteMode).slice(0, Math.max(1, n)).join('\n');
  },
  sum: (v) => row(v, 2),
  valve: (v) => row(v, 3),
  out: (v) => `${row(v, 2)}\n${row(v, 3)}`,
  graph: (v) => `sum ${fix(v.sum, dp(v))} → output ${fix(v.out, dp(v))}`,
  t: (v) => `target: ${fix(v.t, dp(v))}`,
  miss: (v) => row(v, 4),
  click: () => `one click: ${num(RULES.dial.step)} of a weight`,
  lock: (v) => `inputs ${num(v.x1)} and ${num(v.x2)}, locked`,
  total: (v) => noteRows(v, 2)[0],
  tstep: (v, s) => `step ${Math.round(s.tStep)} of ${TUNER.steps}\nweights ${signed(v.w1)} and ${signed(v.w2)}\ntotal miss ${fix(v.total, dp(v))}`,
  e1: (v) => ex(v, 0), e2: (v) => ex(v, 1), e3: (v) => ex(v, 2), e4: (v) => ex(v, 3),
  fig3: (v) => `one setting for all four: weights ${signed(v.w1)} and ${signed(v.w2)}\nmisses ${v.ex.map((e) => sfix(e.miss, dp(v))).join(', ')}`,
  neuron: (v) => `${op(v.x1)} × ${op(v.w1)} + ${op(v.x2)} × ${op(v.w2)} = ${fix(v.sum, dp(v))}\noutput ${fix(v.out, dp(v))}`,
  goal: (_, s) => {
    const k = Math.round(s.goalKind);
    return `the ${['product', 'sum', 'miss'][k]} to reach: ${k === 2 ? sfix(s.goalV) : fix(s.goalV)}`;
  },
  pen: (_, s) => [s.pen1On > 0.5 && `your pencil on the chamber: ${fix(s.pen1)}`, s.pen2On > 0.5 && `your pencil on the gauge: ${fix(s.pen2)}`].filter(Boolean).join('\n') || 'no pencil out',
  arrow: (_, s) => {
    const n = Math.round(s.arrN);
    return `dial ${Math.round(s.arrDial) + 1} will turn ${Math.abs(n)} ${Math.abs(n) === 1 ? 'click' : 'clicks'} ${n > 0 ? 'up' : 'down'}\none click: ${num(RULES.dial.step)} of a weight`;
  },
  fig6: (v, s) => fig6Slots(s, v).filter((x) => !!x).map((x) => `${x.title.toLowerCase()}: ${x.rows.join(' · ')}`).join('\n') || 'nothing beside Fig. 1 now',
  race: (v, s) => {
    return tallyLines(raceView(s, v)).join('\n');
  },
  fig5: (_, s) => {
    const [a, b] = FIG5_LINE.w, x2 = FIG5_LINE.x2, bend = (-b * x2) / a;
    const marks = s.fig5m > 0.5 ? `\npencil marks ${FIG5_LINE.ghosts.map(([x, y]) => `(${num(x)}, ${num(y)})`).join(', ')}: they need a second bend` : '';
    return `output against input 1, input 2 held at ${num(x2)}, weights ${signed(a)} and ${signed(b)}\n0 until input 1 reaches ${num(bend)}, then up ${num(a)} for each 1 of input 1${marks}`;
  },
  tray: (_, s) => `dial 1: ${seat(s.sD1)}\ndial 2: ${seat(s.sD2)}\nchamber: ${seat(s.sCh)}\nvalve: ${seat(s.sVa)}`,
  plaque: (_, s) => `pressing it now will ${PRESS[Math.round(s.plq)] ?? 'check your answer'}`,
};

/** The NOTE block's working for the state's mode, as the plate draws it. */
export const noteText = (s: A01State, v: Derived): string[] => (Math.round(s.noteMode) === 3 ? testRows(buildOf(s), [v.w1, v.w2]) : noteRows(v, s.noteMode));

/** The camera's box holds this anchor. */
const inShot = (a: string, s: A01State): boolean => Math.abs(ANCHORS[a].x - s.camX) <= s.camW / 2 && Math.abs(ANCHORS[a].y - s.camY) <= s.camH / 2;

/** The working drawn in the shot, as text for the side column: the note, Fig. 6's gauges and the tally, each as far as it is drawn. */
function drawnWorking(s: A01State): Working[] {
  const v = derive(s), out: Working[] = [], mode = Math.round(s.noteMode), n = Math.round(s.noteRows);
  if (s.fig6 <= 0.5 && s.fig5 <= 0.001 && s.noteOn > 0.4 && n > 0 && inShot('note', s)) {
    out.push({ title: NOTE.titles[mode] ?? NOTE.titles[0], rows: noteText(s, v).slice(0, n).map((r) => r.replace(/^E2 /, '')) });
  }
  if (fig6On(s) && inShot('race', s)) {
    out.push({ title: 'Fig. 6', rows: fig6Slots(s, v).filter((x) => !!x).map((x) => `${x.title.toLowerCase()}: ${x.rows.join(' · ')}`) });
    if (raceOn(s)) {
      out.push({ title: 'Tally', rows: tallyLines(raceView(s, v)) });
    }
  }
  return out;
}

export const LIVE: Live<A01State> = {
  working: drawnWorking,
  now: (id, s) => {
    if (s.fig7 > 0.5 && ASSEMBLY.has(id)) return tested(derive(s), s);
    if (covered(id, s)) return COVERED;
    return NOW[id]?.(derive(s), s) ?? null;
  },
};
