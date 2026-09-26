import type { Example } from './neuron';

/** The lesson's ranges, in one place: every meter, callout, generator and test reads these. */
export const RULES = {
  dial: { min: -3, max: 3, step: 0.5 },
  tube: { min: 0, max: 3 },
  chamber: { min: -4.5, max: 4.5, ticks: [-4, -2, 0, 2, 4] },
  gauge: { min: 0, max: 5, stub: -1.5 },
} as const;

/** The four examples of Fig. 3: inputs and target. */
export const EXAMPLES: Example[] = [{ x: [2, 1], target: 2.5 }, { x: [1, 2], target: 2 }, { x: [3, 1], target: 3.5 }, { x: [1, 1], target: 1.5 }];

/** The tuner of chapter IX: gradient steps on the mean squared miss. */
export const TUNER = { lr: 0.1, steps: 37 };
