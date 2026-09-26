import type { A01State } from './state';
import { RULES } from '../sim/rules';

/** Plate geometry in drawing units (y up): Fig. 1 the neuron at the origin, Fig. 2 the network above. */
export const ROW: [number, number] = [110, -110];
export const L = {
  tubeX: -468, tubeLen: 232, tubeR: 25,
  dialX: -172, dialR: 104, knobR: 44,
  chamberX: 176, chamberHW: 40, chamberH: 340,
  valveX: 318, valveR: 30,
  gaugeX: 500, gaugeR: 118,
  caseW: 1340, caseH: 520,
  netY: 1210,
};
/** The drawing sheet [x0, y0, x1, y1]. */
export const SHEET: [number, number, number, number] = [-1400, -1990, 1400, 1650];
/** Product windows: sight glasses on the out-pipes, centred at x. */
export const WIN = { x: 26, w: 76, h: 36 };
/** The NOTE block beside Fig. 1: the working, one row per step. */
export const NOTE = { x0: 700, y0: -112, x1: 1080, y1: 112, row: 32, size: 21, titles: ['NOTE · FIG. 1', 'NOTE · EXAMPLE 2', 'NOTE · TOTAL MISS', 'NOTE · TESTS'] };
/** Fig. 4: the valve drawn as a graph, output against sum. */
export const FIG4 = { x0: 810, y0: 160, x1: 1080, y1: 330, min: -3, max: 3 };
/** The tuner block above dial 1, coupled to it by a shaft at x from its floor to the dial housing. */
export const TUNER = { x: -172, y: 352, w: 176, h: 84, shaft: -240 };
/** Detail A: the circle on Fig. 2 round one neuron of the network, and the leader from it to Fig. 1 as [x, y] pairs; it leaves every Fig. 2 shot by its left edge, above the caption; an arrow and a line of text on it say where it goes. */
export const DETAIL = { x: -200, y: L.netY + 64, r: 128, leader: [-290, L.netY - 26, -400, L.netY - 210, -980, L.netY - 210, -980, 420, -690, 420],
  arrow: [-680, L.netY - 210] as [number, number], note: { at: [-680, L.netY - 238] as [number, number], text: 'TO DETAIL A, FIG. 1' } };
/** The click shown on dial 1's scale: the lit segment from 0 to one step, at this radius. */
export const CLICK_R = 75;

/**
 * The Workbench's marks on Fig. 1: where goals are written; pencil 1, a graphite flag on a rail beside the chamber (its number inside the
 * flag); pencil 2, the learner's own needle on the gauge face (a grip on the needle, its number in a fixed window, a drag cue over the rim);
 * the arc arrow's radii, tried in order until it clears every value box (the plaque is placed: `unit/placed.ts`).
 */
export const BENCH = {
  goal: { product: [WIN.x, 42] as [number, number], sumX: 62, miss: [664, 52] as [number, number] },
  pen1: { tipX: L.chamberX - L.chamberHW - 5, x0: 70, x1: 150, flagX0: 80, flagX1: 117, hh: 14, cue: 26 },
  pen2: { hit: L.gaugeR + 24, grip: 35, gripR: 16, tip: L.gaugeR - 10, win: [L.gaugeX, -76] as [number, number], winHW: 30, winHH: 14, cueR: L.gaugeR + 34, cueA: 0.72 },
  arrowR: L.dialR + 22,
  arrowRs: [L.dialR + 22, L.dialR + 38, L.dialR + 56],
  plateTag: [-520, -500] as [number, number],
};
/** The arc arrow's words: a paper knock-out box, as wide as "−4 clicks". */
export const ARROW_WORDS = { w: 108, h: 30 };
/** The casing's clear paper: inside its hatched shell and break line (drawn 30 in, wobbling up to 20 more). A bench mark stays wholly in it or wholly off the casing. */
export const CLEAR: [number, number, number, number] = [-L.caseW / 2 + 50, -L.caseH / 2 + 50, L.caseW / 2 - 50, L.caseH / 2 - 50];
/** Height on Fig. 1 of a sum on the chamber scale, and the sum at a height. */
export const levelY = (v: number): number => -L.chamberH / 2 + 2 + Math.min(1, Math.max(0.005, 0.5 + v / (2 * RULES.chamber.max))) * (L.chamberH - 4);
export const levelOf = (y: number): number => ((y + L.chamberH / 2 - 2) / (L.chamberH - 4) - 0.5) * 2 * RULES.chamber.max;
/** Rotation (CCW from up) of a weight on a dial's scale: ±max at ±135°. */
export const dialAngle = (v: number): number => (-v / RULES.dial.max) * ((135 * Math.PI) / 180);
const SWEEP = (2 * Math.PI) / 3;
/** Rotation (CCW from up) of a value on the gauge rim, the stub below zero included. */
export const rimAngle = (v: number): number => SWEEP * (1 - (2 * v) / RULES.gauge.max);
/** The value under a point near the rim, 0 to max; below the scale it keeps an end the needle already rests on, else takes that side's end. */
export function rimValue(wx: number, wy: number, last: number): number {
  const a = Math.atan2(-(wx - L.gaugeX), wy), max = RULES.gauge.max;
  if (Math.abs(a) > SWEEP) return last <= 0 || last >= max ? last : a > 0 ? 0 : max;
  return ((SWEEP - a) / (2 * SWEEP)) * max;
}
/** Fig. 6 beside Fig. 1: six slots (two rows of three), each example's data plate under its gauge (a contrast pair's reference plate wider), and the tuning tally's title block under them. */
export const FIG6 = {
  slots: [[850, 316], [1170, 316], [850, -42], [1170, -42], [1010, 316], [1010, -42]] as [number, number][], r: 68, caption: [700, -490] as [number, number],
  plate: { w: 284, h: 104, gap: 22 },
  ref: { w: 600, h: 104, gap: 22, size: 26, foot: 330, val: 190 },
  race: { x0: 712, x1: 1308, y0: -410, y1: -268 },
};
/** Tuning's input panel in place of the tubes: four set cards (centres `ys`), each a boxed numeral and two small tubes; the loaded set's pipes turn down the risers at `vx` into the dials. */
export const INPUTS = { x0: -628, x1: -420, ys: [174, 58, -58, -174], h: 100, markX: -596, tubeX: -501, tubeLen: 110, dy: 22, vx: [-396, -366] as [number, number] };
export type InputsSpec = typeof INPUTS;
/** Tuning's lamp bar under the dials, driven by a shaft from dial 2 at `shaft`: one lamp per target, lit while that target is met. */
export const LAMPS = { x: -172, y: -356, w: 420, h: 132, shaft: -100, xs: [-138, -46, 46, 138] };
/** Set k's two feeds, from its tubes' outlets down the risers into the dials at `rows` ending at `dx` (set I takes the outer riser first, so no route crosses). */
export function feeds(f: InputsSpec, k: number, rows: [number, number], dx: number): [number[], number[]] {
  const ox = f.tubeX + f.tubeLen / 2 + 8, y = f.ys[k], [inner, outer] = f.vx;
  const a = k === 0 ? outer : inner, b = k === 0 ? inner : outer;
  return [[ox, y + f.dy, a, y + f.dy, a, rows[0], dx, rows[0]], [ox, y - f.dy, b, y - f.dy, b, rows[1], dx, rows[1]]];
}

/** Fig. 5 (the Click): output against input 1, both 0 to 3. */
export const FIG5 = { x0: 860, y0: -280, x1: 1280, y1: 140, max: 3 };
/** Fig. 5's line: the Click's neuron drawn against its first input (input 2 held at 1), and the pencil marks no single bend meets. */
export const FIG5_LINE = { w: [1.5, -1.5] as [number, number], x2: 1, ghosts: [[0.5, 0.5], [1.5, 2.5], [2.5, 0.5]] as [number, number][] };
/** The assembly (e5) on Fig. 1: the six seats (dial, valve, dial, valve, join, trunk), the tray and each part's home and scale there. */
export const BUILD = {
  seats: [[L.dialX, ROW[0]], [WIN.x, ROW[0]], [L.dialX, ROW[1]], [WIN.x, ROW[1]], [L.chamberX, 0], [L.valveX, 0]] as [number, number][],
  tray: [-540, -478, -78, -318] as [number, number, number, number],
  home: { d1: [-468, -392], d2: [-330, -392], ch: [-222, -392], va: [-140, -392] } as Record<'d1' | 'd2' | 'ch' | 'va', [number, number]>,
  scale: { dial: 0.55, chamber: 0.36 },
  r: { dial: 64, chamber: 56, valve: 40 },
  labelY: -462,
};

/** Screen px the page chrome covers above and below the plate (the caption's two lines and the bar); shots are fitted between them. */
export const INSET = { top: 28, bottom: 216 };
/** Before Begin the page shows no caption or bar: the frame keeps the top inset at both ends, so the landing sits mid-field. */
export const INSET_BEFORE = { top: 28, bottom: 28 };
/** In a section outside the chapters (Practice) its head takes a band at the top, and the shot shows whole below it. */
export const INSET_SECTION = { top: 84, bottom: 216, whole: true };

/** Named points the camera and the focus lamp can look at. */
export const ANCHORS: Record<string, { x: number; y: number }> = {
  machine: { x: 0, y: 0 },
  tubes: { x: L.tubeX, y: 0 }, vial1: { x: L.tubeX, y: ROW[0] }, vial2: { x: L.tubeX, y: ROW[1] },
  dials: { x: L.dialX, y: 0 }, dial1: { x: L.dialX, y: ROW[0] }, dial2: { x: L.dialX, y: ROW[1] },
  chamber: { x: L.chamberX, y: 0 }, valve: { x: L.valveX, y: 0 },
  gauge: { x: L.gaugeX, y: 0 }, mark: { x: L.gaugeX, y: L.gaugeR },
  note: { x: (NOTE.x0 + NOTE.x1) / 2, y: 0 }, graph: { x: (FIG4.x0 + FIG4.x1) / 2, y: (FIG4.y0 + FIG4.y1) / 2 },
  fig3: { x: 1010, y: 140 }, e1: { x: FIG6.slots[0][0], y: FIG6.slots[0][1] }, e2: { x: FIG6.slots[1][0], y: FIG6.slots[1][1] },
  e3: { x: FIG6.slots[2][0], y: FIG6.slots[2][1] }, e4: { x: FIG6.slots[3][0], y: FIG6.slots[3][1] },
  tally: { x: (FIG6.race.x0 + FIG6.race.x1) / 2, y: (FIG6.race.y0 + FIG6.race.y1) / 2 }, inputs: { x: (INPUTS.x0 + INPUTS.x1) / 2, y: 0 }, lampbar: { x: LAMPS.x, y: LAMPS.y },
  fig2: { x: 0, y: L.netY },
  tag1: { x: -302, y: ROW[0] + 46 }, tag2: { x: -302, y: ROW[1] - 46 },
  goalP: { x: BENCH.goal.product[0], y: BENCH.goal.product[1] }, goalM: { x: BENCH.goal.miss[0], y: BENCH.goal.miss[1] },
  slotA: { x: FIG6.slots[0][0], y: FIG6.slots[0][1] }, slotB: { x: FIG6.slots[1][0], y: FIG6.slots[1][1] }, slotR: { x: FIG6.slots[4][0], y: FIG6.slots[4][1] },
  race: { x: 1140, y: -250 }, fig5: { x: (FIG5.x0 + FIG5.x1) / 2, y: (FIG5.y0 + FIG5.y1) / 2 },
  tray: { x: (BUILD.tray[0] + BUILD.tray[2]) / 2, y: (BUILD.tray[1] + BUILD.tray[3]) / 2 }, trunk: { x: L.valveX, y: 0 },
  seat1: { x: WIN.x, y: ROW[0] }, seat2: { x: WIN.x, y: ROW[1] },
};

type ShotVars = Pick<A01State, 'camX' | 'camY' | 'camW' | 'camH'>;
const shot = (x0: number, y0: number, x1: number, y1: number): ShotVars => ({ camX: (x0 + x1) / 2, camY: (y0 + y1) / 2, camW: x1 - x0, camH: y1 - y0 });

/** Named framings as boxes in drawing units, fitted between the page chrome; each shows every drawn label, block and figure whole or not at all, and each ends on bare paper so nothing drawn sits under the caption. */
export const SHOTS = {
  open: shot(-1200, -700, 1400, 700),
  full: shot(-890, -525, 1095, 500),
  left: shot(-900, -525, 100, 300),
  drive: shot(-890, -525, 1095, 500),
  wall: shot(-720, 910, 720, 1580),
  wide: shot(-890, -525, 1370, 500),
};
export type ShotName = keyof typeof SHOTS;
/** Behind the Begin card on a landscape field: the casing and its "Fig. 1." caption with paper round them. */
export const LANDING = shot(-L.caseW / 2 - 80, -560, L.caseW / 2 + 80, L.caseH / 2 + 60);
