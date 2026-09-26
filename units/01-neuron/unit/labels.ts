import { ROW, L, WIN, NOTE, FIG4, FIG6, TUNER, INPUTS } from './layout';
import type { A01State } from './state';

/** The plaque's words, by `plq`. */
export const PLAQUE = ['PRESS IN', 'LIFT COVER', 'DONE', 'TEST'];

type Role = 'ink' | 'signal' | 'weight' | 'targetInk';
/** A term label: leader legs from dots on static parts, the word at `at`, drawn in as `show` goes 0 → 1; `tune` draws it only with (true) or without (false) Tuning's input panel. */
interface LabelSpec { text: string; legs: number[][]; at: [number, number]; align?: 'left' | 'right' | 'center'; role: Role; show: keyof A01State; size?: number; tune?: boolean }

const tl = L.tubeX - L.tubeLen / 2 - 16, gx = L.gaugeX, gr = L.gaugeR, tx1 = L.tubeX + L.tubeLen / 2;

/** Every term written on the plate, with its leader. */
export const LABELS: LabelSpec[] = [
  { text: 'INPUT', legs: [[tl + 30, ROW[0] + 12, -742, 0], [tl + 30, ROW[1] - 12, -742, 0]], at: [-752, 0], align: 'right', role: 'signal', show: 'lblInput' },
  { text: 'WEIGHT 1', legs: [[L.dialX + 100, ROW[0] + 28, -66, 296, -66, 450, -56, 450]], at: [-48, 450], role: 'weight', show: 'lblWeight' },
  { text: 'WEIGHT 2', legs: [[L.dialX + 100, ROW[1] - 28, -66, -296, -66, -330, -56, -330]], at: [-48, -330], role: 'weight', show: 'lblWeight2' },
  { text: 'PRODUCT', legs: [[WIN.x, ROW[0] + WIN.h / 2, WIN.x, 372, WIN.x + 10, 372]], at: [WIN.x + 18, 372], role: 'ink', show: 'lblProduct' },
  { text: 'SUM', legs: [[L.chamberX, -L.chamberH / 2 - 16, L.chamberX, -330, L.chamberX + 10, -330]], at: [L.chamberX + 18, -330], role: 'ink', show: 'lblSum' },
  { text: 'VALVE', legs: [[L.valveX, -L.valveR, L.valveX, -372, L.valveX + 10, -372]], at: [L.valveX + 18, -372], role: 'ink', show: 'lblValve' },
  { text: 'OUTPUT', legs: [[gx + 40, -gr - 6, gx + 40, -330, gx + 50, -330]], at: [gx + 58, -330], role: 'signal', show: 'lblOutput' },
  { text: 'TARGET', legs: [[gx - 30, gr + 12, 452, 300, 440, 300]], at: [432, 300], align: 'right', role: 'targetInk', show: 'lblTarget' },
  { text: 'MISS', legs: [[gx + 84, gr - 8, 612, 300, 624, 300]], at: [632, 300], role: 'targetInk', show: 'lblMiss' },
  { text: 'EXAMPLE', legs: [[L.tubeX, 290, L.tubeX, 350, -600, 350]], at: [-608, 350], align: 'right', role: 'ink', show: 'lblExample', tune: false },
  { text: 'EXAMPLE', legs: [[L.tubeX, INPUTS.ys[0] + INPUTS.h / 2 + 12, L.tubeX, 350, -600, 350]], at: [-608, 350], align: 'right', role: 'ink', show: 'lblExample', tune: true },
  { text: 'TUNER', legs: [[TUNER.x - TUNER.w / 2, TUNER.y, -300, TUNER.y]], at: [-308, TUNER.y], align: 'right', role: 'ink', show: 'lblTuner' },
  { text: 'LEARNING', legs: [[TUNER.x, TUNER.y + TUNER.h / 2, TUNER.x, 440]], at: [TUNER.x, 456], align: 'center', role: 'ink', show: 'lblLearning' },
];

/** Numbered balloons 1–19 in the order the parts are drawn: the part each number names and the way its leader leaves it (the placer tries that way first). */
export const BALLOONS: { part: string; toward: [number, number] }[] = [
  { part: 'tube1', toward: [L.tubeX + 28, 214] },
  { part: 'tube2', toward: [L.tubeX + 28, -214] },
  { part: 'dial1', toward: [L.dialX - 140, 232] },
  { part: 'dial2', toward: [L.dialX - 140, -232] },
  { part: 'win1', toward: [WIN.x + 58, 190] },
  { part: 'note', toward: [NOTE.x0 - 16, NOTE.y1 + 36] },
  { part: 'win2', toward: [WIN.x + 58, -190] },
  { part: 'chamber', toward: [L.chamberX + 64, 222] },
  { part: 'valve', toward: [L.valveX + 34, -150] },
  { part: 'gauge', toward: [gx - 90, -196] },
  { part: 'graph', toward: [FIG4.x0 - 24, FIG4.y0 - 20] },
  { part: 'mark', toward: [gx + 48, 214] },
  { part: 'miss', toward: [gx - 30, -196] },
  { part: 'lock', toward: [tx1 - 8, 236] },
  { part: 'detent', toward: [L.dialX + 72, 228] },
  { part: 'bracket', toward: [-640, 296] },
  { part: 'fig3', toward: [FIG6.slots[0][0] - FIG6.r - 110, FIG6.slots[0][1] + 40] },
  { part: 'tally', toward: [FIG6.race.x0 - 40, FIG6.race.y0 - 30] },
  { part: 'tuner', toward: [TUNER.x - TUNER.w / 2 - 30, TUNER.y + TUNER.h / 2 + 26] },
];
/** The balloons of the NOTE and Fig. 4, hidden while Fig. 5 or Fig. 6 takes their place beside Fig. 1. */
export const BESIDE = [6, 11];
/** The key that draws the part each balloon points at (null: a part of the machine, always drawn). */
const BALLOON_PART: (keyof A01State | null)[] = [null, null, null, null, 'win1', 'noteOn', 'win2', null, null, null, 'graph', 'markOn', 'missOn', 'locks',
  'clickOn', 'bracket', 'fig3', 'tally', 'tunerOn'];
/** The balloons (0-based) of the tubes and their lock pins, which Tuning's input panel replaces. */
const TUBE_SIDE = [0, 1, 13];
const unit = (x: number): number => Math.min(1, Math.max(0, x));
/** How much of balloon i (0-based) shows: drawn in by `balloons`, gone once its chapter is past (`bLo`), faded with its chapter (`bOn`), and only while its part is drawn. */
export const balloonShown = (s: A01State, i: number): number =>
  (i < s.bLo || (s.tune > 0.5 && TUBE_SIDE.includes(i)) ? 0 : unit(s.balloons - i) * s.bOn * (BALLOON_PART[i] ? unit(s[BALLOON_PART[i]!]) : 1));

export type TagKey = 'x1' | 'x2' | 'w1' | 'w2' | 'sum' | 'out' | 't' | 'miss';
/** The value tag of each drawn number: the part it reads, where it may sit (first choice first; the placer takes the first clear one), half width, and the state key that reveals it. */
export const TAGS: Record<TagKey, { part: string; slots: [number, number][]; hw: number; show: keyof A01State; role: Role; host?: string[] }> = {
  x1: { part: 'tube1', slots: [[-302, ROW[0] + 46]], hw: 24, show: 'tX1', role: 'ink' },
  x2: { part: 'tube2', slots: [[-302, ROW[1] - 46]], hw: 24, show: 'tX2', role: 'ink' },
  w1: { part: 'dial1', slots: [[L.dialX - 14, ROW[0] + L.dialR + 22]], hw: 38, show: 'tW1', role: 'ink' },
  w2: { part: 'dial2', slots: [[L.dialX, ROW[1] - L.dialR - 22]], hw: 38, show: 'tW2', role: 'ink' },
  sum: { part: 'chamber', slots: [[L.chamberX, L.chamberH / 2 + 38]], hw: 40, show: 'tSum', role: 'ink' },
  out: { part: 'gauge', slots: [[gx + 96, -150]], hw: 40, show: 'tOut', role: 'ink' },
  t: { part: 'mark', slots: [[gx - 100, 150]], hw: 40, show: 'tT', role: 'targetInk' },
  miss: { part: 'miss', slots: [[gx, -62]], hw: 40, show: 'tMiss', role: 'targetInk', host: ['gauge', 'miss'] },
};

/** The first example marked on Fig. 1: a bracket over the input tubes, and the "E1" tags on it and beside the target. */
export const BRACKET = { paths: [[tl, 276, tl, 290, tx1 + 16, 290, tx1 + 16, 276]], tags: [[L.tubeX + 68, 306], [gx - 100, 188]] as [number, number][] };
/** Lock pins through the tubes' outlet flanges: centres and pin length. */
export const LOCKS = { at: ROW.map((y) => [tx1 + 7, y]) as [number, number][], h: 2 * L.tubeR + 30 };

/** A term label is drawn: revealed, and in the scene it belongs to (the tubes', or Tuning's input panel). */
export const labelOn = (l: LabelSpec, s: A01State): boolean => s[l.show] > 0.5 && (l.tune === undefined || l.tune === s.tune > 0.5);
