// U01's framing data for tests: the stage sizes, every object the frame must show whole or not at all, and the watch samples.
import { labelRect } from '../../src/kit/cutaway/framing.ts';
import { SHOTS, SHEET, NOTE, FIG4, TUNER, L, DETAIL, FIG6, FIG5, BUILD, ANCHORS, LAMPS } from '../../units/01-neuron/unit/layout.ts';
import { LABELS, TAGS, BALLOONS, BESIDE, balloonShown } from '../../units/01-neuron/unit/labels.ts';
import { TAG_AT, PLAQUE_BOX, balloon } from '../../units/01-neuron/unit/place.ts';
import { afterWatch } from '../../units/01-neuron/unit/watch.ts';
import { initialState, BENCH_REST } from '../../units/01-neuron/unit/state.ts';
import { settled } from './lesson.mjs';

/** The plate's stage (the page minus the sheet frame and the side column) at 1920×1080, 2560×1440, both as browser windows, and 1366×768. */
export const STAGES = [[1442, 895], [2051, 1195], [1442, 760], [2051, 1055], [993, 604]];
const ALIGN = { left: 0, center: 0.5, right: 1 };

/** A leader as 24 small boxes per segment, so a diagonal is tested where it runs, not over its whole bounding box. */
const pieces = (p) => Array.from({ length: (p.length / 2 - 1) * 24 }, (_, i) => {
  const j = Math.floor(i / 24) * 2, a = (i % 24) / 24, b = a + 1 / 24, x = (f) => p[j] + (p[j + 2] - p[j]) * f, y = (f) => p[j + 1] + (p[j + 3] - p[j + 1]) * f;
  return [Math.min(x(a), x(b)), Math.min(y(a), y(b)), Math.max(x(a), x(b)), Math.max(y(a), y(b))];
});

/** Every object the frame must show whole or not at all (a `line` may run off the frame), with when it is drawn. */
export const OBJECTS = [
  ...LABELS.map((l) => ({ id: `label ${l.text}`, r: labelRect(l.at[0], l.at[1], l.text, l.size ?? 26, ALIGN[l.align ?? 'left']), on: (s) => s[l.show] > 0.01 })),
  ...Object.entries(TAGS).map(([k, t]) => { const [x, y] = TAG_AT[k]; return { id: `tag ${k}`, r: [x - t.hw, y - 17, x + t.hw, y + 17], on: (s) => s[t.show] > 0.01 }; }),
  ...BALLOONS.map((_, i) => ({ id: `balloon ${i + 1}`, r: [balloon(i + 1).at[0] - 17, balloon(i + 1).at[1] - 17, balloon(i + 1).at[0] + 17, balloon(i + 1).at[1] + 17], on: (s) => balloonShown(s, i) > 0.01 && !(BESIDE.includes(i + 1) && (s.fig6 > 0.5 || s.fig5 > 0.001)) })),
  { id: 'note', r: [NOTE.x0, NOTE.y0, NOTE.x1, NOTE.y1], on: (s) => s.noteOn > 0.01 && s.fig6 <= 0.5 },
  { id: 'fig. 4', r: [FIG4.x0 - 2, FIG4.y0 - 4, FIG4.x1 + 4, FIG4.y1 + 40], on: (s) => s.graph > 0.01 },
  { id: 'fig. 6 told', r: [FIG6.slots[0][0] - 165, FIG6.race.y0 - 10, FIG6.slots[1][0] + 165, FIG6.slots[0][1] + FIG6.r + 76], on: (s) => Math.round(s.fig6k) === 5 && s.fig6 > 0.5 && s.fig3 > 0.01 },
  { id: 'tuner', r: [TUNER.x - TUNER.w / 2, TUNER.y - TUNER.h / 2, TUNER.x + TUNER.w / 2, TUNER.y + TUNER.h / 2], on: (s) => s.tunerOn > 0.01 },
  { id: 'fig. 2', r: [-700, L.netY - 290, 700, L.netY + 350], on: (s) => s.net > 0.2 },
  { id: 'title block', r: [SHEET[2] - 576, SHEET[1] + 16, SHEET[2] - 16, SHEET[1] + 232], on: () => true },
  { id: 'dimension NEURON', r: labelRect(0, -404, 'NEURON', 34, 0.5), on: (s) => s.lblNeuron > 0.01 },
  { id: 'dimension NEURAL NETWORK', r: labelRect(0, L.netY + 336, 'NEURAL NETWORK', 34, 0.5), on: (s) => s.lblNetwork > 0.01 },
  { id: 'dimension line NEURON', r: [-L.caseW / 2, -446, L.caseW / 2, -434], on: (s) => s.lblNeuron > 0.01, line: true },
  { id: 'dimension line NEURAL NETWORK', r: [-695, L.netY + 294, 695, L.netY + 306], on: (s) => s.lblNetwork > 0.01, line: true },
  { id: 'sheet border', r: [SHEET[0], SHEET[1], SHEET[2], SHEET[1] + 16], on: () => true, line: true },
  { id: 'Fig. 1.', r: [-L.caseW / 2, -515, -L.caseW / 2 + 70, -485], on: () => true },
  { id: 'Fig. 2.', r: [-695, L.netY - 290, -625, L.netY - 260], on: (s) => s.net > 0.2 },
  ...pieces(DETAIL.leader).map((r) => ({ id: 'detail A leader', r, on: (s) => s.net > 0.12, line: true })),
  { id: 'detail A sign', r: [DETAIL.arrow[0] - 2, DETAIL.note.at[1] - 14, DETAIL.note.at[0] + 230, DETAIL.arrow[1] + 10], on: (s) => s.net > 0.12 },
  { id: 'plaque', r: [PLAQUE_BOX.x - PLAQUE_BOX.w / 2, PLAQUE_BOX.y - PLAQUE_BOX.h / 2, PLAQUE_BOX.x + PLAQUE_BOX.w / 2, PLAQUE_BOX.y + PLAQUE_BOX.h / 2], on: (s) => s.plqOn > 0.01 },
  ...FIG6.slots.map(([x, y], i) => ({ id: `fig. 6 slot ${i + 1}`, r: [x - 165, y - FIG6.r - 95, x + 165, y + FIG6.r + 76], on: (s) => s.fig6 > 0.01 })),
  { id: 'Fig. 6.', r: [FIG6.caption[0], FIG6.caption[1] - 15, FIG6.caption[0] + 70, FIG6.caption[1] + 15], on: (s) => s.fig6 > 0.01 },
  { id: 'tally block', r: [FIG6.race.stepX - 50, FIG6.race.y - 50, FIG6.race.x1 + 12, FIG6.race.y + 80], on: (s) => s.fig6 > 0.01 && Math.round(s.fig6k) === 3 },
  { id: 'lamp bar', r: [LAMPS.x - LAMPS.w / 2, LAMPS.y - LAMPS.h / 2, LAMPS.x + LAMPS.w / 2, LAMPS.y + LAMPS.h / 2], on: (s) => s.tune > 0.5 },
  { id: 'fig. 5', r: [FIG5.x0 - 60, FIG5.y0 - 125, FIG5.x1 + 60, FIG5.y1 + 40], on: (s) => s.fig5 > 0.01 },
  { id: 'tray', r: BUILD.tray, on: (s) => s.fig7 > 0.01 },
];

/** Screen px of the caption's width (52rem): with the bar under it, the chrome band of INSET.bottom px at the foot of the stage. */
export const CHROME_W = 832;
/** Screen px of the bar (64rem wide, 56 px tall, 16 px off the foot of the stage), wider than the caption. */
export const BAR = { w: 1024, h: 72 };

/** The camera box of a state, and the plate at every sentence whose shot and lamp have landed (before the next sentence's camera leaves), then in the drive. */
export const cam = (s) => ({ x: s.camX, y: s.camY, w: s.camW, h: s.camH });
const held = (s) => Object.values(SHOTS).some((b) => Math.abs(b.camX - s.camX) + Math.abs(b.camY - s.camY) + Math.abs(b.camW - s.camW) + Math.abs(b.camH - s.camH) < 0.5);
export const samples = () => [
  ...settled(0.45).filter(({ s }) => s.exposure > 0.99 && held(s)).map(({ l, s }) => ({ at: `${l.clip}.${l.cue}`, s })),
  { at: 'drive', s: { ...initialState(), ...afterWatch(), net: 1 } },
  ...BENCH_POSES.map(([at, shot, lamp, o]) => ({ at, s: { ...initialState(), ...afterWatch(), ...BENCH_REST, net: 1, ...SHOTS[shot], lampX: ANCHORS[lamp].x, lampY: ANCHORS[lamp].y, ...o } })),
];
/** The Workbench, tuner and Click framings: the shot, where the lamp points and what is drawn beside Fig. 1. */
const BENCH_POSES = [
  ['a goal and the pencils', 'drive', 'goalM', { goalOn: 1, pen1On: 1, pen2On: 1, pen1Cue: 1, pen2Cue: 1, plqOn: 1, stubOn: 1, missOn: 0, tMiss: 0 }],
  ['the assembly', 'drive', 'tray', { fig7: 1, plqOn: 1, plq: 3 }],
  ['a contrast pair', 'wide', 'slotR', { fig6: 1, fig6k: 1, plate: 2 }],
  ['two examples', 'wide', 'slotA', { fig6: 1, fig6k: 2, exN: 2, bracket: 1 }],
  ['the tuner levels', 'wide', 'race', { fig6: 1, fig6k: 3, exN: 4, plqOn: 1, plq: 2, goalT: 0, tune: 1, tSel: 0 }],
  ['the Click', 'wide', 'fig5', { fig5: 1, fig5m: 1 }],
];

