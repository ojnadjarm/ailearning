/** Every animatable quantity of Plate I: the timeline tweens these, parts read them (state = f(t)). Reveals run 0 → 1. */
export interface A01State {
  x1: number; x2: number; w1: number; w2: number; target: number;
  flowOn: number; chamberOn: number; gaugeOn: number; markOn: number; markGlow: number; hiDial1: number; hiDial2: number;
  lblNeuron: number; lblInput: number; lblWeight: number; lblWeight2: number; lblProduct: number; lblSum: number; lblValve: number;
  lblOutput: number; lblTarget: number; lblMiss: number; lblExample: number; lblTuner: number; lblLearning: number; lblNetwork: number;
  /** Balloons drawn so far (balloon n shows from n − 1 to n); those below `bLo` belong to a chapter already past; `bOn` fades the rest. */
  balloons: number; bLo: number; bOn: number;
  tX1: number; tX2: number; tW1: number; tW2: number; tP1: number; tP2: number; tSum: number; tOut: number; tT: number; tMiss: number; tTotal: number;
  /** The NOTE block: shown, rows typed (fractional = typing), and which working it shows (0 Fig. 1, 1 example 2, 2 the total). */
  noteOn: number; noteRows: number; noteMode: number;
  win1: number; win2: number; graph: number; missOn: number; locks: number; clickOn: number; bracket: number;
  fig3: number; tally: number; tunerOn: number; tStep: number;
  lampX: number; lampY: number; lampOn: number;
  camX: number; camY: number; camW: number; camH: number;
  net: number; tuneWall: number; exposure: number;
  /** The bench's examples (`exN` of them: inputs a, b and target t) and the learner's tuning step (clicks so far). */
  exN: number; ex1a: number; ex1b: number; ex1t: number; ex2a: number; ex2b: number; ex2t: number;
  ex3a: number; ex3b: number; ex3t: number; ex4a: number; ex4b: number; ex4t: number;
  tStepR: number;
  /** A contrast pair's reference plate: inputs, weights, target; `aClick` shows its dial 1 one click up, `aBuild` its valve on the trunk. */
  aX1: number; aX2: number; aW1: number; aW2: number; aT: number; aClick: number; aBuild: number;
  /** Hatched cover plates over product 1, product 2, the chamber, the gauge and the miss tag (1 = covered). */
  cvP1: number; cvP2: number; cvSum: number; cvOut: number; cvMiss: number;
  /** A goal in ringed ink: shown, what it is (0 product, 1 sum, 2 miss) and its value. */
  goalOn: number; goalKind: number; goalV: number;
  /** The learner's pencil guesses: the flag on the chamber scale (1) and the needle on the gauge face (2); each one's "move me" cue, drawn until its first drag; pencil 2's YOUR GUESS tag. */
  pen1: number; pen2: number; pen1On: number; pen2On: number; pen1Cue: number; pen2Cue: number; pen2Tag: number;
  /** The arc arrow over a dial: shown, which dial, the clicks it will turn (signed) and the weight it started from (its route holds for the whole turn). */
  arrOn: number; arrDial: number; arrN: number; arrW0: number;
  /** How far below zero the gauge reads (0: to 0, 1: to RULES.gauge.stub); the plaque (a pressable plate: 0 press in, 1 lift cover, 2 done, 3 test). */
  stubOn: number; plqOn: number; plq: number;
  /** Fig. 1 lettered as a plate of a contrast pair (1 A, 2 B); tube rattles and lit lock pins. */
  plate: number; rattle1: number; rattle2: number; pin1: number; pin2: number;
  /** Fig. 6 beside Fig. 1: shown, and what it holds (1 the reference plate, 2 the bench examples, 3 the tuning tally, 4 examples and a reference, 5 the tuning machine as chapters VIII–IX explain it); the tuning goal (−1: as small as it goes) and its floor line. */
  fig6: number; fig6k: number; floorOn: number; floorV: number; pairs: number; goalT: number;
  /** Tuning's input panel in place of the tubes (1 shown) and the set loaded into the machine (0–3). */
  tune: number; tSel: number;
  /** The assembly (e5): shown, the seat of each part (−1 the tray), and the test running (1–3; 0 none). */
  fig7: number; sD1: number; sD2: number; sCh: number; sVa: number; tst: number;
  /** Fig. 5 (the Click): the line drawn in, then the pencil marks. */
  fig5: number; fig5m: number;
}

/** Keys that reveal a drawn thing, 0 → 1. */
export const REVEALS = [
  'lblNeuron', 'lblInput', 'lblWeight', 'lblWeight2', 'lblProduct', 'lblSum', 'lblValve', 'lblOutput', 'lblTarget', 'lblMiss', 'lblExample', 'lblTuner',
  'lblLearning', 'lblNetwork', 'tX1', 'tX2', 'tW1', 'tW2', 'tP1', 'tP2', 'tSum', 'tOut', 'tT', 'tMiss', 'tTotal', 'noteOn', 'win1', 'win2', 'graph',
  'missOn', 'locks', 'clickOn', 'bracket', 'fig3', 'tally', 'tunerOn', 'flowOn', 'chamberOn', 'gaugeOn', 'markOn',
] as const satisfies readonly (keyof A01State)[];

/** The watch's working marks (term labels, number tags, the note, figures, gap and lock marks): a chapter draws those it uses and they fade once its recap
 * is said; the machine itself (tubes, dials, windows, chamber, valve, gauge, brass mark, flow) stays. */
export const WORK = REVEALS.filter((k) => !['win1', 'win2', 'flowOn', 'chamberOn', 'gaugeOn', 'markOn'].includes(k));

/** The bench's keys at rest: nothing covered, pencilled, lettered or assembled. */
export const BENCH_REST = {
  exN: 0, ex1a: 0, ex1b: 0, ex1t: 0, ex2a: 0, ex2b: 0, ex2t: 0, ex3a: 0, ex3b: 0, ex3t: 0, ex4a: 0, ex4b: 0, ex4t: 0, tStepR: 0,
  aX1: 0, aX2: 0, aW1: 0, aW2: 0, aT: 0, aClick: 0, aBuild: 0, cvP1: 0, cvP2: 0, cvSum: 0, cvOut: 0, cvMiss: 0, goalOn: 0, goalKind: 0, goalV: 0,
  pen1: -4.5, pen2: 5, pen1On: 0, pen2On: 0, pen1Cue: 0, pen2Cue: 0, pen2Tag: 0, arrOn: 0, arrDial: 0, arrN: 0, arrW0: 0, stubOn: 0, plqOn: 0, plq: 0, plate: 0, rattle1: 0, rattle2: 0, pin1: 0, pin2: 0,
  fig6: 0, fig6k: 0, floorOn: 0, floorV: 0, pairs: 0, goalT: 0, tune: 0, tSel: 0, fig7: 0, sD1: 0, sD2: 2, sCh: 4, sVa: 5, tst: 0, fig5: 0, fig5m: 0,
} satisfies Partial<A01State>;

export function initialState(): A01State {
  const s = {
    x1: 2, x2: 1, w1: 0, w2: 0, target: 2.5, markGlow: 0, hiDial1: 0, hiDial2: 0, balloons: 0, bLo: 0, bOn: 1, noteRows: 0, noteMode: 0, tStep: 0,
    lampX: 0, lampY: 0, lampOn: 0, camX: 0, camY: 150, camW: 2800, camH: 1700, net: 0, tuneWall: 0, exposure: 0, ...BENCH_REST,
  } as A01State;
  for (const k of REVEALS) s[k] = 0;
  return s;
}

/** Fig. 6 is drawn: while it is out, and in the explanation (mode 5) only while its reveal (`fig3`) is on. */
export const fig6On = (s: A01State): boolean => s.fig6 > 0.5 && (Math.round(s.fig6k) !== 5 || s.fig3 > 0.5);
/** The tuning tally is drawn: in Tuning, and in the explanation once its reveal (`tally`) is on. */
export const raceOn = (s: A01State): boolean => fig6On(s) && (Math.round(s.fig6k) === 3 || (Math.round(s.fig6k) === 5 && s.tally > 0.5));
