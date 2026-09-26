import { ROW, L, WIN, NOTE, FIG4, TUNER, CLICK_R, BENCH, FIG5, BUILD, FIG6 } from './layout';
import { LOCKS, type TagKey } from './labels';
import { TAG_AT, PLAQUE_BOX } from './placed';
import { raceOn, type A01State } from './state';

/**
 * A drawn part or number a hover, a focus or a tap opens: its part (`part`), the callout it shows (`term`), its outline in discs
 * [cx, cy, r] and boxes [x0, y0, x1, y1], the dot its callout starts on (on a static part), and the state key that draws it (none: always drawn).
 */
export interface SpotSpec {
  part: string; term: string; discs?: [number, number, number][]; boxes?: [number, number, number, number][]; dot: [number, number]; show?: keyof A01State;
  /** Drawn only while this holds (the bench's figures and the assembly hide parts of Fig. 1). */
  when?: (s: A01State) => boolean;
}

type Box = [number, number, number, number];
const HW: Record<TagKey, number> = { x1: 24, x2: 24, w1: 38, w2: 38, sum: 40, out: 40, t: 40, miss: 40 };
const tag = (k: TagKey): Box => { const [x, y] = TAG_AT[k]; return [x - HW[k], y - 17, x + HW[k], y + 17]; };
const top = (k: TagKey): [number, number] => [TAG_AT[k][0], TAG_AT[k][1] + 17];
const bottom = (k: TagKey): [number, number] => [TAG_AT[k][0], TAG_AT[k][1] - 17];
const tube = (y: number): Box => [L.tubeX - L.tubeLen / 2 - 16, y - L.tubeR - 8, L.tubeX + L.tubeLen / 2 + 16, y + L.tubeR + 8];
const win = (y: number): Box => [WIN.x - WIN.w / 2, y - WIN.h / 2, WIN.x + WIN.w / 2, y + WIN.h / 2];
const pin = ([x, y]: [number, number]): Box => [x - 10, y - LOCKS.h / 2, x + 10, y + LOCKS.h / 2 + 18];
/** Chapters VIII–IX explain tuning on the tuning machine (Fig. 6 in mode 5). */
const told = (s: A01State): boolean => Math.round(s.fig6k) === 5;
const [f6r, f6p] = [FIG6.r, FIG6.plate];
/** Example i as the watch draws it: its TARGET gauge in Fig. 6 and the data plate under it. */
const ex = (i: number): SpotSpec => {
  const [x, y] = FIG6.slots[i], top = y - f6r - 12 - f6p.gap;
  return { part: 'fig3', term: `e${i + 1}`, discs: [[x, y, f6r + 12]], boxes: [[x - f6p.w / 2, top - f6p.h, x + f6p.w / 2, top]], dot: [x, y + f6r + 12], show: 'fig3', when: (s) => told(s) && (s.exN ?? 0) > i };
};
const gx = L.gaugeX, gr = L.gaugeR, tl = L.tubeX - L.tubeLen / 2 - 16, tx1 = L.tubeX + L.tubeLen / 2;
/** Fig. 1 as drawn outside the assembly, and the NOTE and Fig. 4 while no figure sits beside them. */
const fig1 = (s: A01State): boolean => s.fig7 < 0.5;
const side = (s: A01State): boolean => s.fig6 < 0.5 && s.fig5 < 0.001;
const goal = (k: number) => (s: A01State): boolean => s.goalOn > 0.5 && Math.round(s.goalKind) === k;
const ring = ([x, y]: [number, number]): Box => [x - 72, y - 25, x + 72, y + 25];
const arrow = (k: 0 | 1): SpotSpec => ({ part: 'arrow', term: 'arrow', discs: [[L.dialX, ROW[k], BENCH.arrowR + 44]], dot: [L.dialX, ROW[k] + (k ? -1 : 1) * (BENCH.arrowR + 44)],
  when: (s) => s.arrOn > 0.5 && Math.round(s.arrDial) === k });
const pq = PLAQUE_BOX, [fx0, fy0, fx1, fy1] = BUILD.tray;

/** Every spot, first match wins: numbers and small parts before the large parts around them. */
export const SPOTS: Record<string, SpotSpec> = {
  x1: { part: 'tube1', term: 'x1', boxes: [tag('x1')], dot: bottom('x1'), show: 'tX1' },
  x2: { part: 'tube2', term: 'x2', boxes: [tag('x2')], dot: top('x2'), show: 'tX2' },
  w1: { part: 'dial1', term: 'w1', boxes: [tag('w1')], dot: bottom('w1'), show: 'tW1', when: fig1 },
  w2: { part: 'dial2', term: 'w2', boxes: [tag('w2')], dot: top('w2'), show: 'tW2', when: fig1 },
  p1: { part: 'win1', term: 'p1', boxes: [win(ROW[0])], dot: [WIN.x, ROW[0] + WIN.h / 2], show: 'win1', when: fig1 },
  p2: { part: 'win2', term: 'p2', boxes: [win(ROW[1])], dot: [WIN.x, ROW[1] - WIN.h / 2], show: 'win2', when: fig1 },
  sum: { part: 'chamber', term: 'sum', boxes: [tag('sum')], dot: bottom('sum'), show: 'tSum', when: fig1 },
  out: { part: 'gauge', term: 'out', boxes: [tag('out')], dot: top('out'), show: 'tOut', when: fig1 },
  t: { part: 'mark', term: 't', boxes: [tag('t')], discs: [[gx, gr + 26, 30]], dot: bottom('t'), show: 'tT' },
  miss: { part: 'miss', term: 'miss', boxes: [tag('miss')], dot: top('miss'), show: 'tMiss', when: fig1 },
  click: { part: 'detent', term: 'click', boxes: [[L.dialX - 8, ROW[0] + CLICK_R - 14, L.dialX + 40, ROW[0] + CLICK_R + 10]], dot: [L.dialX, ROW[0] + CLICK_R], show: 'clickOn', when: fig1 },
  lock1: { part: 'lock', term: 'lock', boxes: LOCKS.at.map(pin), dot: [LOCKS.at[0][0], LOCKS.at[0][1] + LOCKS.h / 2 + 18], show: 'locks' },
  note: { part: 'note', term: 'note', boxes: [[NOTE.x0, NOTE.y0, NOTE.x1, NOTE.y1]], dot: [NOTE.x0, NOTE.y1 - 20], show: 'noteOn', when: side },
  graph: { part: 'graph', term: 'graph', boxes: [[FIG4.x0, FIG4.y0, FIG4.x1, FIG4.y1]], dot: [FIG4.x0, FIG4.y1], show: 'graph', when: side },
  goalP: { part: 'goal', term: 'goal', boxes: [ring(BENCH.goal.product)], dot: [BENCH.goal.product[0], BENCH.goal.product[1] + 25], when: goal(0) },
  goalM: { part: 'goal', term: 'goal', boxes: [ring(BENCH.goal.miss)], dot: [BENCH.goal.miss[0], BENCH.goal.miss[1] + 25], when: goal(2) },
  plaque: { part: 'plaque', term: 'plaque', boxes: [[pq.x - pq.w / 2, pq.y - pq.h / 2, pq.x + pq.w / 2, pq.y + pq.h / 2]], dot: [pq.x, pq.y + pq.h / 2], show: 'plqOn' },
  race: { part: 'race', term: 'race', boxes: [[FIG6.race.x0, FIG6.race.y0, FIG6.race.x1, FIG6.race.y1]], dot: [FIG6.race.x0, FIG6.race.y1], show: 'fig6', when: (s) => Math.round(s.fig6k) === 3 },
  fig6: { part: 'fig6', term: 'fig6', boxes: [[760, FIG6.slots[2][1] - FIG6.r - 12 - FIG6.plate.gap - FIG6.plate.h, 1260, FIG6.slots[0][1] + 90]], dot: [760, FIG6.slots[0][1] + 90], show: 'fig6', when: (s) => !told(s) },
  fig5: { part: 'fig5', term: 'fig5', boxes: [[FIG5.x0 - 40, FIG5.y0 - 40, FIG5.x1 + 20, FIG5.y1 + 40]], dot: [FIG5.x0 - 40, FIG5.y1 + 40], show: 'fig5' },
  tray: { part: 'tray', term: 'tray', boxes: [[fx0, fy0, fx1, fy1 + 40]], dot: [fx0, fy1 + 40], show: 'fig7' },
  goalS: { part: 'goal', term: 'goal', boxes: [[BENCH.goal.sumX - 72, -L.chamberH / 2, BENCH.goal.sumX + 72, L.chamberH / 2]], dot: [BENCH.goal.sumX, L.chamberH / 2], when: goal(1) },
  pen1: { part: 'pencil', term: 'pen', boxes: [[BENCH.pen1.x0 - 70, -L.chamberH / 2, BENCH.pen1.x1, L.chamberH / 2]], dot: [BENCH.pen1.x0, L.chamberH / 2], show: 'pen1On' },
  e1: ex(0), e2: ex(1), e3: ex(2), e4: ex(3),
  total: { part: 'tally', term: 'total', boxes: [[FIG6.race.x0, FIG6.race.y0, FIG6.race.x1, FIG6.race.y1]], dot: [FIG6.race.x0, FIG6.race.y1], show: 'tally', when: (s) => told(s) && raceOn(s) },
  fig3: { part: 'fig3', term: 'fig3', boxes: [[760, FIG6.slots[2][1] - FIG6.r - 12 - FIG6.plate.gap - FIG6.plate.h, 1260, FIG6.slots[0][1] + 90]], dot: [760, FIG6.slots[0][1] + 90], show: 'fig3', when: told },
  tstep: { part: 'tuner', term: 'tstep', boxes: [[TUNER.x - TUNER.w / 2, TUNER.y - TUNER.h / 2, TUNER.x + TUNER.w / 2, TUNER.y + TUNER.h / 2]], dot: [TUNER.x, TUNER.y + TUNER.h / 2], show: 'tunerOn' },
  bracket: { part: 'bracket', term: 'example', boxes: [[tl - 10, 270, tx1 + 26, 320]], dot: [L.tubeX, 290], show: 'bracket' },
  tube1: { part: 'tube1', term: 'x1', boxes: [tube(ROW[0])], dot: [L.tubeX - 60, ROW[0] + L.tubeR] },
  tube2: { part: 'tube2', term: 'x2', boxes: [tube(ROW[1])], dot: [L.tubeX - 60, ROW[1] - L.tubeR] },
  dial1: { part: 'dial1', term: 'w1', discs: [[L.dialX, ROW[0], L.dialR]], dot: [L.dialX - L.dialR * 0.71, ROW[0] + L.dialR * 0.71], when: fig1 },
  dial2: { part: 'dial2', term: 'w2', discs: [[L.dialX, ROW[1], L.dialR]], dot: [L.dialX - L.dialR * 0.71, ROW[1] - L.dialR * 0.71], when: fig1 },
  chamber: { part: 'chamber', term: 'sum', boxes: [[L.chamberX - L.chamberHW - 8, -L.chamberH / 2, L.chamberX + L.chamberHW + 8, L.chamberH / 2]], dot: [L.chamberX - L.chamberHW - 12, L.chamberH / 2 - 20], when: fig1 },
  valve: { part: 'valve', term: 'valve', discs: [[L.valveX, 0, L.valveR + 8]], dot: [L.valveX, L.valveR], when: fig1 },
  gauge: { part: 'gauge', term: 'out', discs: [[gx, 0, gr + 12]], dot: [gx - gr * 0.71, gr * 0.71] },
  pen2: { part: 'pencil', term: 'pen', discs: [[gx, 0, BENCH.pen2.hit]], dot: [gx, gr + 12], show: 'pen2On' },
  arrow1: arrow(0), arrow2: arrow(1),
  neuron: { part: 'neuron', term: 'neuron', boxes: [[-L.caseW / 2, -L.caseH / 2, L.caseW / 2, L.caseH / 2]], dot: [-L.caseW / 2 + 60, L.caseH / 2] },
  fig2: { part: 'fig2', term: 'network', boxes: [[-700, L.netY - 270, 700, L.netY + 250]], dot: [0, L.netY + 250], show: 'net' },
};

/** A spot answers only while its part is drawn. */
export const drawn = (sp: SpotSpec, s: A01State): boolean => (!sp.show || s[sp.show] > 0.5) && (!sp.when || sp.when(s));
