import { DetentHand, LockedHand, SlideHand, SlotHand, type Control, type Projector } from 'explainer-kit';
import { ROW, L, BENCH, BUILD, levelOf, rimValue } from './layout';
import type { A01State } from './state';
import { RULES } from '../sim/rules';
import { fits, type Part } from '../sim/build';
import { valueToAngle, angleToValue } from '../plate/parts/meters';

/** Hand indices, in the order the keys cycle them: the dials, the locked tubes, the pencils, the parts of the assembly. */
export const HAND = { dial1: 0, dial2: 1, tube1: 2, tube2: 3, pen1: 4, pen2: 5, d1: 6, d2: 7, ch: 8, va: 9 } as const;
const PARTS: [keyof typeof BUILD.home, Part, keyof A01State][] = [['d1', 'dial', 'sD1'], ['d2', 'dial', 'sD2'], ['ch', 'chamber', 'sCh'], ['va', 'valve', 'sVa']];
const tubeBox = (y: number) => (x: number, yy: number): boolean => Math.abs(x - L.tubeX) <= L.tubeLen / 2 + 16 && Math.abs(yy - y) <= L.tubeR + 10;

/** Every hand of Plate I: the two weight dials, the two tubes (locked: a try is reported), the pencils (the flag beside the chamber, the needle on the gauge face: a press anywhere on the face turns it), and the four parts of the assembly. */
export function controls(p: Projector): Control<A01State>[] {
  const dials = ROW.map((y, i): Control<A01State> => ({
    hand: new DetentHand({ cx: L.dialX, cy: y, r: L.dialR + 10, min: RULES.dial.min, max: RULES.dial.max, step: RULES.dial.step, angle: valueToAngle, value: angleToValue }, p, 2.4),
    key: i ? 'w2' : 'w1', glow: i ? 'hiDial2' : 'hiDial1',
  }));
  const tubes = ROW.map((y, i): Control<A01State> => ({ hand: new LockedHand(tubeBox(y)), key: i ? 'x2' : 'x1' }));
  const c = RULES.chamber, g = RULES.gauge, pen = BENCH.pen2;
  const pen2: SlideHand = new SlideHand({ hits: (x, y) => Math.hypot(x - L.gaugeX, y) <= pen.hit, valueAt: (x, y) => rimValue(x, y, pen2.value()), min: g.min, max: g.max, step: 0.1 }, p);
  const pens: Control<A01State>[] = [
    { hand: new SlideHand({ hits: (x, y) => x >= BENCH.pen1.x0 && x <= BENCH.pen1.x1 && Math.abs(y) <= L.chamberH / 2 + 10, valueAt: (_, y) => levelOf(y), min: c.min, max: c.max, step: 0.1 }, p), key: 'pen1' },
    { hand: pen2, key: 'pen2' },
  ];
  const slots: SlotHand[] = [];
  const parts = PARTS.map(([home, part, key], k): Control<A01State> => {
    const h = new SlotHand({ home: BUILD.home[home], at: BUILD.seats, r: BUILD.r[part], fits: (i) => fits(part, i), taken: (i) => slots.some((o, j) => j !== k && o.value() === i) }, p);
    slots.push(h);
    return { hand: h, key };
  });
  return [...dials, ...tubes, ...pens, ...parts];
}
