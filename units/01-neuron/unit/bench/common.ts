import type { Director, Task, WalkStep } from 'explainer-kit';
import { BENCH_REST, type A01State } from '../state';
import { afterWatch } from '../watch';
import { ANCHORS, L, ROW, SHOTS, type ShotName } from '../layout';
import { onPlaque } from '../placed';
import { forward, type NeuronObs, type Vec2 } from '../../sim/neuron';
import { RULES } from '../../sim/rules';

export type D = Director<A01State>;
export type S = Partial<A01State>;
export type BenchTask = Task<A01State>;

/** The misconceptions the bench listens for. */
export const M = {
  adds: 'm.weight-adds', pass: 'm.passthrough', sumOut: 'm.sum-is-output', click: 'm.click-same-size', any: 'm.output-any-number',
  valve: 'm.valve-per-input', sign: 'm.miss-unsigned', input: 'm.change-input', perEx: 'm.setting-per-example', one: 'm.one-right-setting', exact: 'm.always-exact',
} as const;

export const STEP = RULES.dial.step;
export const near = (a: number, b: number, e = 1e-6): boolean => Math.abs(a - b) < e;
const FREE = ['camX', 'camY', 'camW', 'camH', 'lampX', 'lampY'] as const;

/** Where the lamp points: a named anchor or a point. */
export const lampAt = (at: string | [number, number]): S => {
  const p = typeof at === 'string' ? ANCHORS[at] ?? ANCHORS.machine : { x: at[0], y: at[1] };
  return { lampX: p.x, lampY: p.y };
};

/** Pose a case: the plate as the watch leaves it, with no target, cover, pencil or figure beside it, then `o`; the camera and the lamp ease to `shot` and `lamp`. */
export function base(d: D, o: S, shot: ShotName = 'drive', lamp: string | [number, number] = 'dial1'): void {
  const rest = afterWatch();
  for (const k of FREE) delete rest[k];
  const { camX, camY, camW, camH } = SHOTS[shot];
  d.goal = { camX, camY, camW, camH, ...lampAt(lamp) };
  d.pose({ ...rest, ...BENCH_REST, bracket: 0, markOn: 0, markGlow: 0, tT: 0, missOn: 0, tMiss: 0, noteMode: 0, hiDial1: 0, hiDial2: 0, flowOn: 1, ...o });
}

/** Ease plate keys (never a hand's key: the hands write those). */
export const ease = (d: D, v: S): void => { Object.assign(d.goal, v); d.wake(); };

/** The dials' settings the hands are on now (not the eased drawing). */
export const hv = (d: D): Vec2 => [d.hands[0].value(), d.hands[1].value()];
/** Fig. 1's neuron at the hands' settings. */
export const now = (d: D): NeuronObs => forward(hv(d), [d.s.x1, d.s.x2]);

/** The lamp walks over points, `gap` seconds apart. */
export const lampWalk = (d: D, at: (string | [number, number])[], gap = 0.9): WalkStep[] => at.map((a) => ({ gap, run: () => ease(d, lampAt(a)) }));
/** Dial `i` turned click by click to `to`; each step aims at its own detent, so a spring still moving never loses a click. */
export function clicksTo(d: D, i: number, to: number, gap = 0.6, from = d.hands[i].value()): WalkStep[] {
  const n = Math.round((to - from) / STEP), h = d.hands[i];
  return Array.from({ length: Math.abs(n) }, (_, k) => ({ gap, run: () => { h.turn(Math.round((from + (k + 1) * Math.sign(n) * STEP - h.value()) / STEP)); d.wake(); } }));
}
/** Both dials turned click by click to `w`, dial 1 first. */
export const pathTo = (d: D, w: Vec2, gap = 0.6): WalkStep[] => [...clicksTo(d, 0, w[0], gap), ...clicksTo(d, 1, w[1], gap)];
/** A step that only acts. */
export const act = (gap: number, run: () => void): WalkStep => ({ gap, run });

/** A press on a knob or on the plaque presses in. */
export function pressIn(_d: D, wx: number, wy: number): 'commit' | boolean {
  return onPlaque(wx, wy) || ROW.some((y) => Math.hypot(wx - L.dialX, wy - y) <= L.knobR) ? 'commit' : false;
}

/** The settings the learner rested on, as dial pairs (the log's rests). */
export const restsOf = (d: D, gap = 1): Vec2[] => d.log.rests(gap, d.elapsed).map((r) => [r[0], r[1]]);

/** Pencils the learner has moved on this visit: a pencil's "move me" cue is drawn until its first drag, then never again. */
const moved = new Set<'pen1' | 'pen2'>();
/** Exercises in which the learner has moved pencil 2: its YOUR GUESS tag comes back on each new exercise's first view. */
const guessed = new Set<string>();
const CUE = { pen1: ['pen1Cue', 4], pen2: ['pen2Cue', 5] } as const;
/** A pencil's cue as a case poses it: 1 until the learner has moved that pencil once. */
export const cueFor = (pen: 'pen1' | 'pen2'): number => (moved.has(pen) ? 0 : 1);
/** Pencil 2's YOUR GUESS tag as a case of exercise `of` poses it: 1 until the learner has moved pencil 2 in that exercise. */
export const tagFor = (of: string): number => (guessed.has(of) ? 0 : 1);
/** Read every frame of a case: once the learner moves a pencil off `from`, its cue goes for good (and pencil 2's tag for exercise `of`). */
export function watchCue(d: D, pen: 'pen1' | 'pen2', from: number, of = ''): void {
  const [key, hand] = CUE[pen], tag = pen === 'pen2' && d.s.pen2Tag > 0.5;
  if ((d.s[key] < 0.5 && !tag) || Math.abs(d.hands[hand].value() - from) < 1e-6) return;
  moved.add(pen);
  if (tag) { guessed.add(of); d.s.pen2Tag = 0; }
  d.s[key] = 0;
  d.wake();
}
