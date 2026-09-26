import { boxOf as box, discOf as disc, segOf as seg, type Entity, type Shape } from 'explainer-kit';
import { ROW, L, WIN, NOTE, FIG4, TUNER, CLICK_R, FIG5, FIG6, BUILD, BENCH, DETAIL, INPUTS, LAMPS, feeds, rimAngle } from './layout';
import { LABELS, BRACKET, LOCKS, labelOn } from './labels';
import { fig6On, raceOn, type A01State } from './state';

/** Scenes a drawn thing can share: the narrated watch, play on Fig. 1 (with the NOTE and Fig. 4), play with Fig. 5 or 6 beside it, the assembly, Tuning's input panel. */
export const W = 'watch', P = 'play', S = 'side', B = 'build', T = 'tune';
const MACHINE = [W, P, S];
/** A fixed outline and when it is drawn; `named` marks the explanation's lettering (term labels and their leaders), drawn only while names show. */
export type Outline = Entity & { shapes: Shape[]; on: (s: A01State) => boolean; named?: boolean };

const gx = L.gaugeX, tl = L.tubeX - L.tubeLen / 2, tr = L.tubeX + L.tubeLen / 2, cx0 = L.chamberX - L.chamberHW, cx1 = L.chamberX + L.chamberHW;
const fig1 = (s: A01State): boolean => s.fig7 < 0.5;
const tubes = (s: A01State): boolean => s.tune < 0.5;
const flat = (s: A01State): boolean => s.fig6 < 0.5 && s.fig5 < 0.001;
/** Fig. 6 as chapters VIII–IX draw it (the tuning machine explained). */
const told = (s: A01State): boolean => Math.round(s.fig6k) === 5;
const part = (id: string, scenes: string[], shapes: Shape[], on: Outline['on'] = () => true, body?: Shape, host?: string[]): Outline =>
  ({ id, kind: 'part', scenes, shapes, on, body: body ?? shapes[0], host });
const figure = (id: string, scenes: string[], shapes: Shape[], on: Outline['on'], named?: boolean): Outline => ({ id, kind: 'figure', scenes, shapes, on, named });
/** The brass mark on the gauge rim at a target. */
export const markAt = (t: number): Shape => { const a = rimAngle(t), R = L.gaugeR + 26; return disc(gx - Math.sin(a) * R, Math.cos(a) * R, 15); };
const pipe = (x0: number, y: number, x1: number): Shape => box(x0, y - 7, x1, y + 7);
/** The loaded set's two feeds into the dials, as pipe boxes. */
export const feedsOf = (k: number): Shape[] => feeds(INPUTS, k, ROW, L.dialX - L.dialR).flatMap((p) => p.slice(0, -2).flatMap((_, i) => (i % 2 ? [] : [
  box(Math.min(p[i], p[i + 2]) - 7, Math.min(p[i + 1], p[i + 3]) - 7, Math.max(p[i], p[i + 2]) + 7, Math.max(p[i + 1], p[i + 3]) + 7)])));
/** A typed word's box, as `Callout` draws it (width from its length and size, anchored by `align`). */
function wordBox(text: string, [x, y]: [number, number], size: number, align: 'left' | 'right' | 'center' = 'left'): Shape {
  const w = text.length * size * 0.62 + 6, h = size * 1.1, x0 = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
  return box(x0, y - h / 2, x0 + w, y + h / 2);
}
const legs = (l: number[][]): Shape[] => l.flatMap((p) => p.slice(0, -2).flatMap((_, i) => (i % 2 ? [] : [seg(p[i], p[i + 1], p[i + 2], p[i + 3])])));

/** The tube: its glass is the body a leader ends on; flanges and the scale under it are part of it. */
const tube = (id: string, y: number): Outline => part(id, [...MACHINE, B], [box(tl - 16, y - 34, tr + 16, y + 34), box(tl, y - 72, tr + 10, y - 25)], tubes, box(tl, y - L.tubeR, tr, y + L.tubeR));
const win = (id: string, y: number, show: keyof A01State): Outline =>
  part(id, MACHINE, [box(WIN.x - WIN.w / 2 - 7, y - WIN.h / 2 - 5, WIN.x + WIN.w / 2 + 7, y + WIN.h / 2 + 5)], (s) => s[show] > 0.5 && fig1(s));
/** Fig. 6's slots as one block: each slot's gauge, title above and three rows 330 wide below. */
const [f6x0, f6x1] = [Math.min(...FIG6.slots.map(([x]) => x)) - 165, Math.max(...FIG6.slots.map(([x]) => x)) + 165];
const [f6y0, f6y1] = [Math.min(...FIG6.slots.map(([, y]) => y)) - FIG6.r - 12 - FIG6.plate.gap - FIG6.plate.h - 4, Math.max(...FIG6.slots.map(([, y]) => y)) + FIG6.r + 76];

/** Every fixed thing drawn on Plate I near Fig. 1 and beside it, in drawing units. */
export const OUTLINES: Outline[] = [
  { id: 'casing', kind: 'container', scenes: [...MACHINE, B], shapes: [box(-L.caseW / 2, -L.caseH / 2, L.caseW / 2, L.caseH / 2)], on: () => true },
  tube('tube1', ROW[0]), tube('tube2', ROW[1]),
  part('dial1', MACHINE, [disc(L.dialX, ROW[0], L.dialR)], fig1), part('dial2', MACHINE, [disc(L.dialX, ROW[1], L.dialR)], fig1),
  win('win1', ROW[0], 'win1'), win('win2', ROW[1], 'win2'),
  part('chamber', MACHINE, [box(cx0, -L.chamberH / 2, cx1, L.chamberH / 2), box(cx1, -L.chamberH / 2, cx1 + 46, L.chamberH / 2)], fig1),
  part('valve', MACHINE, [disc(L.valveX, 0, L.valveR), box(L.valveX - 24, L.valveR + 16, L.valveX + 22, L.valveR + 36)], fig1),
  part('gauge', [...MACHINE, B], [disc(gx, 0, L.gaugeR + 12)]),
  part('mark', [...MACHINE, B], [markAt(2.5)], (s) => s.markOn > 0.5),
  part('miss', MACHINE, [box(gx - 44, -80, gx + 44, -44)], (s) => (s.missOn > 0.5 || s.tMiss > 0.5) && fig1(s), undefined, ['gauge']),
  part('inlets', MACHINE, ROW.map((y) => pipe(tr + 16, y, L.dialX - L.dialR)), (s) => fig1(s) && tubes(s)),
  part('pipes', MACHINE, [...ROW.map((y) => pipe(L.dialX + L.dialR, y, cx0 - 5)), pipe(cx1 + 5, 0, L.valveX - L.valveR), pipe(L.valveX + L.valveR, 0, gx - L.gaugeR - 12)], fig1),
  part('lock', [W, P, S], LOCKS.at.map(([x, y]) => box(x - 9, y - LOCKS.h / 2, x + 9, y + LOCKS.h / 2 + 18)), (s) => s.locks > 0.5 && tubes(s)),
  part('lamps', [T], [box(LAMPS.x - LAMPS.w / 2, LAMPS.y - LAMPS.h / 2, LAMPS.x + LAMPS.w / 2, LAMPS.y + LAMPS.h / 2), box(LAMPS.shaft - 9, -L.caseH / 2, LAMPS.shaft + 9, LAMPS.y + LAMPS.h / 2)],
    (s) => s.tune > 0.5),
  part('inputs', [T], [box(INPUTS.x0, INPUTS.ys[3] - INPUTS.h / 2 - 12, INPUTS.x1, INPUTS.ys[0] + INPUTS.h / 2 + 12)], (s) => s.tune > 0.5),
  part('detent', [W, P, S], [box(L.dialX - 8, ROW[0] + CLICK_R - 14, L.dialX + 40, ROW[0] + CLICK_R + 10)], (s) => s.clickOn > 0.5 && fig1(s), undefined, ['dial1']),
  part('note', [W, P], [box(NOTE.x0, NOTE.y0, NOTE.x1, NOTE.y1)], (s) => s.noteOn > 0.5 && flat(s)),
  part('graph', [W, P], [box(FIG4.x0 - 34, FIG4.y0 - 22, FIG4.x1 + 6, FIG4.y1 + 8)], (s) => s.graph > 0.5 && flat(s), box(FIG4.x0, FIG4.y0, FIG4.x1, FIG4.y1)),
  part('bracket', [W], [box(tl - 16, 272, tr + 20, 292), box(L.tubeX + 48, 294, L.tubeX + 88, 318), box(gx - 120, 176, gx - 80, 200)], (s) => s.bracket > 0.5,
    box(tl - 16, 276, tr + 16, 290)),
  part('tuner', [W], [box(TUNER.x - TUNER.w / 2, TUNER.y - TUNER.h / 2, TUNER.x + TUNER.w / 2, TUNER.y + TUNER.h / 2), box(TUNER.shaft - 9, ROW[0] + L.dialR * 0.72, TUNER.shaft + 9, TUNER.y - TUNER.h / 2)],
    (s) => s.tunerOn > 0.5, undefined, ['dial1']),
  part('fig6', [S], [box(f6x0, f6y0, f6x1, f6y1)], fig6On),
  part('race', [S], [box(FIG6.race.x0, FIG6.race.y0, FIG6.race.x1, FIG6.race.y1)], raceOn),
  part('fig3', [S], [disc(FIG6.slots[0][0], FIG6.slots[0][1], FIG6.r + 12)], (s) => told(s) && fig6On(s), undefined, ['fig6']),
  part('tally', [S], [box(FIG6.race.x0, FIG6.race.y0, FIG6.race.x1, FIG6.race.y1)], (s) => told(s) && raceOn(s), undefined, ['race']),
  part('fig5', [S], [box(FIG5.x0 - 40, FIG5.y0 - 40, FIG5.x1 + 20, FIG5.y1 + 40)], (s) => s.fig5 > 0.5),
  part('tray', [B], [box(BUILD.tray[0], BUILD.tray[1] - 20, BUILD.tray[2], BUILD.tray[3] + 20)], (s) => s.fig7 > 0.5),
  figure('fig1 caption', MACHINE, [wordBox('Fig. 1.', [-L.caseW / 2, -500], 30)], () => true),
  figure('fig6 caption', [S], [wordBox('Fig. 6.', FIG6.caption, 30)], fig6On),
  figure('fig6 titles', [S], FIG6.slots.slice(0, 4).map(([x, y]) => box(x - 60, y + FIG6.r + 40, x + 70, y + FIG6.r + 80)), fig6On),
  figure('plate tag', [P], [box(BENCH.plateTag[0] - 80, BENCH.plateTag[1] - 16, BENCH.plateTag[0] + 80, BENCH.plateTag[1] + 16)], (s) => s.plate > 0.5),
  figure('detail A', [W], [disc(DETAIL.leader.at(-2)!, DETAIL.leader.at(-1)!, 16)], (s) => s.net > 0.55),
  ...LABELS.flatMap((l): Outline[] => [
    { id: l.text, kind: 'label', scenes: [W], shapes: [wordBox(l.text, l.at, l.size ?? 26, l.align)], on: (s) => labelOn(l, s), named: true },
    figure(`${l.text} leader`, [W], legs(l.legs), (s) => labelOn(l, s), true),
  ]),
  { id: 'NEURON', kind: 'label', scenes: [W], shapes: [wordBox('NEURON', [0, -476], 34, 'center')], on: (s) => s.lblNeuron > 0.5, named: true },
  figure('NEURON line', [W], [seg(-L.caseW / 2, -440, L.caseW / 2, -440), seg(-L.caseW / 2, -268, -L.caseW / 2, -454), seg(L.caseW / 2, -268, L.caseW / 2, -454)], (s) => s.lblNeuron > 0.5, true),
  figure('bracket path', [W], legs(BRACKET.paths), (s) => s.bracket > 0.5),
];
