import type { Timeline } from 'explainer-kit';
import type { A01State } from './state';
import { SHOTS } from './layout';
import { tunerPath, type Vec2 } from '../sim/neuron';
import { EXAMPLES, TUNER } from '../sim/rules';

/** What an effect sees: the timeline, the state, its sentence's cue, the next sentence's, and the working marks its chapter has drawn so far. */
export interface FxCtx { tl: Timeline; s: A01State; t0: number; t1: number; shown: Set<keyof A01State>; at: (mark: string) => number }
/** A drawing event tied to one sentence beyond its data (figures, the tuner run); `own` lists the sentence fields it replaces. */
interface Fx { run(c: FxCtx): void; own?: ('set' | 'shot')[] }

/** Tuner steps drawn per second of narration. */
const TUNER_RATE = 8;
const reveal = (c: FxCtx, k: keyof A01State, dt = 0.1, d = 0.9): void => { c.shown.add(k); c.tl.to(c.s, { [k]: 1, duration: d, ease: 'none' }, c.t0 + dt); };
const all = (...fs: ((c: FxCtx) => void)[]): Fx => ({ run: (c) => fs.forEach((f) => f(c)) });
const show = (k: keyof A01State, dt = 0.1, d = 0.9) => (c: FxCtx): void => reveal(c, k, dt, d);

/** The tuner's path from the hand-tuned setting of chapter VII. */
const PATH: Vec2[] = tunerPath([1.5, -0.5]);

/** Set k loaded into the machine: the ring on its card, its inputs in the machine and its target on the mark, eased from the last set. */
const load = (c: FxCtx, k: number, t: number): void => {
  const e = EXAMPLES[k];
  c.tl.set(c.s, { tSel: k }, t).to(c.s, { x1: e.x[0], x2: e.x[1], target: e.target, duration: 0.6 }, t);
};
/** Chapters VIII–IX on the tuning machine: the four sets in the rack, set I loaded and its small gauge out (`exN` counts the gauges run so far). */
const TOLD: Partial<A01State> = {
  tune: 1, fig6: 1, fig6k: 5, exN: 1, goalT: -1, tStepR: 0, tSel: 0,
  ...Object.fromEntries(EXAMPLES.flatMap((e, i) => [[`ex${i + 1}a`, e.x[0]], [`ex${i + 1}b`, e.x[1]], [`ex${i + 1}t`, e.target]])),
};

/** The balloon each sentence draws in, by `clip.mark` (balloons number the parts in the order they are drawn). */
export const BALLOON_AT: Record<string, number> = {
  'c1a.tubes': 2, 'c2a.dials': 4, 'c2a.stays': 5, 'c2a.note': 6, 'c3a.p2': 7, 'c3a.chamber': 8, 'c4a.meets': 9, 'c4a.gauge': 10, 'c4b.graph': 11,
  'c5a.mark': 12, 'c5a.miss': 13, 'c6a.locked': 14, 'c7a.click': 15, 'c8a.example': 16, 'c8a.four': 17, 'c9a.total': 18, 'c9a.tuner': 19,
};

/** Sentence effects by `clip.mark`. */
export const EFFECTS: Record<string, Fx> = {
  'c2a.dials': all(show('flowOn', 0.2, 1.2)),
  'c2a.stays': all(show('win1', 0.3, 0.7)),
  'c2a.note': all((c) => { c.tl.to(c.s, { ...SHOTS.full, duration: 1.6 }, c.t0 - 0.4); }),
  'c3a.dial2': all(show('lblWeight2', 0.4)),
  'c3a.p2': all(show('win2', 0.1, 0.7)),
  'c4b.graph': all(show('graph', 0.3, 1.6)),
  'c5a.target': all(show('markOn', 0.2, 0.5)),
  'c5a.mark': all((c) => { c.tl.to(c.s, { markGlow: 1, duration: 0.4 }, c.t0 + 0.1).to(c.s, { markGlow: 0.25, duration: 1.2 }, c.t0 + 1.2); }),
  'c5a.miss': all(show('missOn', 0.2, 1.0)),
  'c6a.locked': all(show('locks', 0.2, 0.8)),
  'c7a.click': all(show('clickOn', 0.3, 0.9)),
  'c8a.example': all(show('bracket', 0.2, 1.0)),
  'c8a.four': all(show('fig3', 0.3, 1.8), (c) => { c.tl.to(c.s, { bracket: 0, duration: 0.3 }, c.t0).set(c.s, TOLD, c.t0 + 0.3); }),
  'c8a.onebyone': { run: (c) => ['s1', 's2', 's3', 's4'].forEach((m, k) => { load(c, k, c.at(m)); c.tl.set(c.s, { exN: k + 1 }, c.at(m) + 0.3); }) },
  'c8b.firstok': { run: (c) => load(c, 0, c.t0) },
  'c8b.worked': { run: (c) => load(c, 1, c.t0) },
  'c9a.total': all(show('tally', 0.2, 1.2)),
  'c9a.tuner': all(show('tunerOn', 0.2, 1.0)),
  'c9b.step': { own: ['set'], run: (c) => { c.tl.to(c.s, { w1: PATH[1][0], w2: PATH[1][1], duration: 0.9 }, c.t0 + 0.2).set(c.s, { tStep: 1, tStepR: 1 }, c.t0 + 0.2); } },
  'c9b.run': {
    own: ['set'],
    run: (c) => { for (let i = 2; i <= TUNER.steps; i++) c.tl.set(c.s, { w1: PATH[i][0], w2: PATH[i][1], tStep: i, tStepR: i }, c.t0 + 0.3 + (i - 2) / TUNER_RATE); },
  },
  'c10a.learning': { run: (c) => { c.tl.set(c.s, { tune: 0, fig6: 0, fig6k: 0, exN: 0, tSel: 0, tStepR: 0, goalT: 0, x1: 2, x2: 1, target: 2.5 }, c.t0 - 1); } },
  'c10a.pullnet': { run: (c) => { c.tl.to(c.s, { net: 0.55, duration: 3.0, ease: 'power1.inOut' }, c.t0 + 0.6); } },
  'c10a.network': { run: (c) => { c.tl.to(c.s, { net: 1, duration: 1.4 }, c.t0); } },
  'c10a.tuned': { run: (c) => { c.tl.to(c.s, { tuneWall: 1, duration: 4.5, ease: 'none' }, c.t0); } },
};
