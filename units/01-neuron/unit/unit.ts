import { WatchBeat, GuidedPlay, EndBeat, all, settled, handAt, rng, type Beat, type Director, type GuidedStep, type Hotspot, type Spec, type UnitDef, type UnitSpec } from 'explainer-kit';
import { initialState, type A01State } from './state';
import { watchBuilder, playMarks, WATCH_ORDER, LEAD, GAP } from './watch';
import { ANCHORS, SHOTS } from './layout';
import { SPOTS, drawn } from './spots';
import { LIVE } from './live';
import { forward } from '../sim/neuron';
import { d3 } from '../sim/generators';
import { workbench, wireLocks, practice } from './bench';
import { tuning, tunes } from './race';
import { ClickBeat } from './click';
import { ONWARD, PRACTICE_WAYS, NEXT } from './ways';

export { SECTIONS, FINISHED } from './ways';

export { controls } from './controls';

type D = Director<A01State>;

/** Unit 01 for the engine: its state, the narrated watch built from the script's sentence data, and the live numbers. */
export const makeUnit = (spec: UnitSpec): UnitDef<A01State> => ({
  initial: initialState, watch: { order: WATCH_ORDER, lead: LEAD, gap: GAP, build: watchBuilder(spec) }, live: LIVE,
});

/** Every drawn part and number a hover or a tap can open, in the spots' order (first match wins); a spot answers only once it is drawn. */
export const hotspots = (state: () => A01State): Hotspot[] => Object.values(SPOTS).map((sp) => ({
  part: sp.part, term: sp.term, dot: sp.dot,
  hits: (x, y) => drawn(sp, state())
    && (!!sp.discs?.some(([cx, cy, r]) => Math.hypot(x - cx, y - cy) <= r) || !!sp.boxes?.some(([a, b, c, e]) => x >= a && x <= c && y >= b && y <= e)),
}));


/** Focus lamp to a named anchor (the voice's pointer). */
const lampTo = (d: D, name: string): void => { const p = ANCHORS[name] ?? ANCHORS.machine; Object.assign(d.goal, { lampX: p.x, lampY: p.y }); d.wake(); };
const outputOnTarget: Spec<A01State> = (d) => Math.abs(forward([d.hands[0].value(), d.hands[1].value()], [d.s.x1, d.s.x2]).out - d.s.target) < 0.01;
const seeds = rng(5);
/** d3: new inputs and a new mark, both dials from zero. */
const fresh = (d: D): void => { const c = d3(Math.floor(seeds() * 1e9)); d.pose({ x1: c.x[0], x2: c.x[1], w1: 0, w2: 0, target: c.t }); d.goal.markGlow = 0.25; lampTo(d, 'tubes'); };

const DRIVE: GuidedStep<A01State>[] = [
  { hand: 0, ask: 'd1', ok: 'd1ok', hint: 'd1hint', done: all(handAt(0, 1), settled), enter: (d) => lampTo(d, 'dial1'), after: (d) => lampTo(d, 'gauge') },
  { hand: 1, ask: 'd2', ok: 'd2ok', hint: 'd2hint', done: all(outputOnTarget, settled), enter: (d) => lampTo(d, 'dial2'), after: (d) => { lampTo(d, 'mark'); d.goal.markGlow = 1; } },
  { hand: 0, hands: [0, 1], ask: 'd3', ok: 'd3ok', done: all(outputOnTarget, settled), enter: fresh, after: (d) => { lampTo(d, 'mark'); d.goal.markGlow = 1; } },
];

/** Endless practice seeds: `?seed=` pins them (tests), else each visit draws new cases. */
const practiceSeed = (): number => {
  const q = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('seed');
  return q !== null && Number.isFinite(Number(q)) ? Number(q) : Math.floor(Math.random() * 1e9);
};
/** The lesson is chapters: the watch (I–X), Your turn (XI), the Workbench (XII), Tuning (XIII), What one neuron can't do (XIV), then the end card.
 *  Practice follows it, outside the chapters: endless exercises and endless Tuning puzzles. */
export const beats = (d: D): Record<string, Beat> => {
  wireLocks(d);
  const seed = practiceSeed();
  return {
    watch: new WatchBeat(d, { next: 'fork', stops: true, advance: true, exitGoal: (s) => ({ ...SHOTS.drive, lampX: s.lampX, lampY: s.lampY }) }),
    drive: new GuidedPlay(d, 'drive', DRIVE, { next: 'bench', enter: (x) => { x.s.bLo = 0; Object.assign(x.goal, { ...playMarks(), ...SHOTS.drive, lampOn: 1, exposure: 1, markOn: 1, markGlow: 0.25 }); } }),
    fork: new EndBeat(d, 'What next?', { hands: [0, 1], complete: false, choices: ONWARD,
      card: { eyebrow: 'End of the explanation', title: 'Next: Your turn', lede: 'Chapters XI to XIII are yours to play: the machine by hand, the Workbench, then Tuning; chapter XIV closes the plate. Practice, with new exercises every time, is in the bar whenever you want it.' } }),
    bench: workbench(d),
    practice: practice(d, seed),
    race: tuning(d),
    tunes: tunes(d, seed + 1),
    click: new ClickBeat(d),
    end: new EndBeat(d, 'End of Plate I', { hands: [0, 1], choices: PRACTICE_WAYS, next: NEXT,
      card: { eyebrow: 'End of Plate I', title: 'Practice', lede: 'Every chapter is done. Practice poses new exercises and new Tuning puzzles for as long as you like.' } }),
  };
};
