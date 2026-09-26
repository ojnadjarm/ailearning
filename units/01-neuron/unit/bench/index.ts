import { Bench, LockedHand, type Task } from 'explainer-kit';
import type { A01State } from '../state';
import { HAND } from '../controls';
import { E1 } from './e1';
import { E2 } from './e2';
import { E3 } from './e3';
import { E4 } from './e4';
import { E5 } from './e5';
import { E6 } from './e6';
import { E7 } from './e7';
import { E8 } from './e8';
import { CONTRASTS } from './contrast';
import type { D } from './common';

const TASKS = [...E1, ...E2, ...E3, ...E4, ...E5, ...E6, ...E7, ...E8];

/** The refutation clip of a misconception, from the script. */
export const refute = (d: D) => (m: string): string | undefined => d.bundle.spec.misconceptions?.find((x) => x.id === m)?.refute;

/** A try on a locked tube is logged; the tube rattles and its lock pin lights. */
export function wireLocks(d: D): void {
  [HAND.tube1, HAND.tube2].forEach((i, k) => {
    const h = d.hands[i];
    if (!(h instanceof LockedHand)) return;
    h.onTry = () => {
      if (!h.enabled) return;
      d.log.push({ hand: i, from: h.value(), to: h.value(), t: d.elapsed, kind: 'try' });
      Object.assign(d.s, k ? { rattle2: 1, pin2: 1 } : { rattle1: 1, pin1: 1 });
      Object.assign(d.goal, k ? { rattle2: 0 } : { rattle1: 0 });
      d.wake();
    };
  });
}

/** The Workbench: eight exercises, contrast pairs, refutations and the skip to Tuning. */
export const workbench = (d: D): Bench<A01State> => new Bench(d, 'bench', {
  label: 'Workbench', next: 'race', tasks: TASKS, refute: refute(d), contrasts: CONTRASTS,
  skip: { clip: 'skip', label: 'Go to Tuning', to: 'race' },
});

/** Every Workbench case as a practice case: its own id, its exercise's name without the round count. */
const PRACTICE: Task<A01State>[] = TASKS.map((t) => ({ ...t, id: `p.${t.id}`, label: `Practice · ${t.label.replace(/ · \d+ of \d+$/, '')}` }));

/** Endless practice: random Workbench cases from a seed (`?seed=` pins it), never the same exercise twice in a row; the Practice head switches to Tuning. */
export const practice = (d: D, seed: number): Bench<A01State> => new Bench(d, 'practice', {
  label: 'Practice · Exercises', next: 'end', tasks: [], refute: refute(d), contrasts: CONTRASTS, seed,
  pool: {
    tasks: PRACTICE,
    pick: (r, prev) => { const left = PRACTICE.filter((t) => !prev || t.of !== prev.of); return left[Math.floor(r() * left.length)]; },
  },
});
