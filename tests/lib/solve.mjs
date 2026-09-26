// Scripted play for the U01 lesson: from a case's plate (`s`, the dials read from the hands), the right moves, the wrong move each
// detector listens for, and whether a "Show me" left the case worked. Moves: ['dial', hand, value], ['click', hand, ±1] (one logged move),
// ['pen', hand, value], ['slot', hand, seat], ['try', hand] (a locked tube), ['rest', ms], ['commit'].
import { forward } from '../../units/01-neuron/sim/neuron.ts';
import { DETENTS, LEVELS, bestOnClicks } from '../../units/01-neuron/sim/race.ts';
import { clicks } from '../../units/01-neuron/sim/generators.ts';
import { flow, passes, buildOf, SEAT } from '../../units/01-neuron/sim/build.ts';
import { RULES } from '../../units/01-neuron/sim/rules.ts';

/** Hand indices in the order `unit/controls.ts` builds them (that module draws, so node cannot import it). */
const HAND = { dial1: 0, dial2: 1, tube1: 2, tube2: 3, pen1: 4, pen2: 5, d1: 6, d2: 7, ch: 8, va: 9 };
const STEP = RULES.dial.step, MIN = RULES.dial.min, MAX = RULES.dial.max;
const near = (a, b, e = 1e-6) => Math.abs(a - b) < e;
const out = (w, x) => forward(w, x).out, sum = (w, x) => forward(w, x).sum;
const x = (s) => [s.x1, s.x2], w = (s) => [s.w1, s.w2];

/** The misconception each case's detector names. */
export const DETECTS = {
  'e1.1': 'm.weight-adds', 'e1.2': 'm.weight-adds', 'e1.3': 'm.weight-adds', 'e2.1': 'm.passthrough', 'e2.2': 'm.passthrough', 'e2.3': 'm.sum-is-output',
  'e3.up': 'm.click-same-size', 'e3.down': 'm.click-same-size', 'e3.zero': 'm.click-same-size', 'e4.1': 'm.output-any-number',
  e5: 'm.valve-per-input', 'e6.1': 'm.miss-unsigned', 'e6.2': 'm.miss-unsigned', 'e6.3': 'm.miss-unsigned', 'e7.1': 'm.change-input', 'e7.2': 'm.change-input',
  'e8.1': 'm.setting-per-example', 'e8.2': 'm.setting-per-example', L2b: 'm.one-right-setting', L3: 'm.always-exact',
};
/** The contrast pair each misconception queues on its second firing. */
export const CONTRAST = {
  'm.passthrough': 'k1', 'm.weight-adds': 'k2', 'm.sum-is-output': 'k9', 'm.click-same-size': 'k8', 'm.output-any-number': 'k3', 'm.valve-per-input': 'k4',
  'm.miss-unsigned': 'k5', 'm.change-input': 'k6', 'm.setting-per-example': 'k7',
};

/** The detent pair nearest `from` (in clicks) that `ok` accepts, turning only the dials in `free`. */
function search(from, ok, free = [0, 1]) {
  const a = free.includes(0) ? DETENTS : [from[0]], b = free.includes(1) ? DETENTS : [from[1]];
  const all = a.flatMap((p) => b.map((q) => [p, q])).filter(ok);
  if (!all.length) throw new Error('no setting meets the case');
  return all.sort((m, n) => clicks(from, m) - clicks(from, n))[0];
}
const dials = (to) => [['dial', 0, to[0]], ['dial', 1, to[1]]];
const bench = (s) => Array.from({ length: s.exN }, (_, i) => ({ x: [s[`ex${i + 1}a`], s[`ex${i + 1}b`]], target: s[`ex${i + 1}t`] }));
const meets = (v, e) => e.every((ex) => near(out(v, ex.x), ex.target, 0.01));
/** Single clicks in direction `dir` until the sum crosses zero (down: to ≤ 0, up: above 0), then `more`; the dial with the larger input first, the other at its stop. */
function cross(s, dir, more) {
  const xs = x(s), v = [...w(s)], moves = [], order = xs[1] > xs[0] ? [1, 0] : [0, 1];
  const click = () => {
    const i = order.find((k) => xs[k] > 0 && (dir < 0 ? v[k] > MIN : v[k] < MAX));
    if (i === undefined) throw new Error('both dials at their stops');
    v[i] += dir * STEP; moves.push(['click', i, dir]);
  };
  while (dir < 0 ? sum(v, xs) > 0 : sum(v, xs) <= 0) click();
  for (let k = 0; k < more; k++) click();
  return moves;
}
const l3best = (s) => bestOnClicks(LEVELS[2].ex).at.sort((m, n) => clicks(w(s), m) - clicks(w(s), n))[0];

/** The right play for a case. */
export function right(id, s) {
  const xs = x(s);
  if (id === 'd3') return dials(search([0, 0], (v) => near(out(v, xs), s.target)));
  if (id === 'e1.1' || id === 'e1.2') return [['dial', 0, s.goalV / s.x1], ['commit']];
  if (id === 'e1.3') return [['dial', 1, (s.goalV - s.x1 * s.w1) / s.x2]];
  if (id.startsWith('e2.')) { const v = sum(w(s), xs); return [['pen', HAND.pen1, v], ['pen', HAND.pen2, Math.max(0, v)], ['commit']]; }
  if (id.startsWith('e3.')) { const v = w(s); v[Math.round(s.arrDial)] += s.arrN * STEP; return [['pen', HAND.pen2, out(v, xs)], ['commit']]; }
  if (id === 'e4.1') return [...cross(s, -1, 0), ['commit']];
  if (id === 'e4.2') return cross(s, 1, 0);
  if (id === 'e5') return [['slot', HAND.d1, SEAT.dial1], ['slot', HAND.d2, SEAT.dial2], ['slot', HAND.ch, SEAT.join], ['slot', HAND.va, SEAT.trunk], ['commit']];
  if (id.startsWith('e6.')) return [['dial', 0, (s.target - s.goalV) / s.x1], ['commit']];
  if (id.startsWith('e7.')) return dials(search(w(s), (v) => near(out(v, xs), s.target)));
  if (id.startsWith('e8.') || id === 'k7') return dials(search(w(s), (v) => meets(v, bench(s))));
  if (id === 'L1' || id === 'L2') return [...dials(search(w(s), (v) => meets(v, bench(s))))];
  if (id === 'L2b') return dials(search(w(s), (v) => meets(v, bench(s)) && !(near(v[0], s.w1) && near(v[1], s.w2))));
  if (id === 'L3') return [...dials(l3best(s)), ['commit']];
  if (id === 'k1' || id === 'k6') return dials(search(w(s), (v) => near(out(v, xs), 3)));
  if (id === 'k2') return [['dial', 0, 1]];
  if (id === 'k9') return [['dial', 1, (-0.5 - xs[0] * s.w1) / xs[1]]];
  if (id === 'k8') return [['dial', 0, search(w(s), (v) => near(out(v, xs), 2), [0])[0]]];
  if (id === 'k3') return [['dial', 1, search(w(s), (v) => out(v, xs) > 0, [1])[1]]];
  if (id === 'k4') return [['slot', HAND.va, SEAT.trunk]];
  if (id === 'k5') return [['dial', 0, search(w(s), (v) => near(s.target - out(v, xs), 1), [0])[0]]];
  throw new Error(`no play for ${id}`);
}

/** The wrong move a case's detector listens for; null when this seed leaves none (the scripted wrong move would pass). */
export function wrong(id, s) {
  const xs = x(s);
  if (id === 'e1.1' || id === 'e1.2') {
    const add = s.goalV - s.x1, v = Math.max(MIN, Math.min(MAX, add));
    return near(v * s.x1, s.goalV) ? null : [['dial', 0, v], ['commit']];
  }
  if (id === 'e1.3') return [['click', 1, 1], ['click', 1, 1], ['rest', 1700]];
  if (id === 'e2.1' || id === 'e2.2') { const p = id === 'e2.1' ? xs[0] + xs[1] : (xs[0] + xs[1]) / 2; return [['pen', HAND.pen1, p], ['pen', HAND.pen2, p], ['commit']]; }
  if (id === 'e2.3') return [['pen', HAND.pen1, 0], ['pen', HAND.pen2, 0], ['commit']];
  if (id.startsWith('e3.')) return [['pen', HAND.pen2, out(w(s), xs) + s.arrN * STEP], ['commit']];
  if (id === 'e4.1') return [...cross(s, -1, 4), ['commit']];
  if (id === 'e5') return [['slot', HAND.d1, SEAT.dial1], ['slot', HAND.d2, SEAT.dial2], ['slot', HAND.ch, SEAT.join], ['slot', HAND.va, SEAT.valve1], ['commit']];
  if (id.startsWith('e6.')) return [['dial', 0, (s.target + s.goalV) / s.x1], ['commit']];
  if (id.startsWith('e7.')) return [['try', HAND.tube1], ['rest', 300]];
  if (id.startsWith('e8.')) {
    const e = bench(s), one = (k) => search(w(s), (v) => near(out(v, e[k].x), e[k].target, 0.01) && !near(out(v, e[1 - k].x), e[1 - k].target, 0.01));
    const a = one(0), b = one(1);
    return [...dials(a), ['rest', 1400], ...dials(b), ['rest', 1400], ...dials(a), ['rest', 1400]];
  }
  if (id === 'L2b') {
    const away = s.w1 + (s.w1 < MAX ? STEP : -STEP), back = ['dial', 0, s.w1], rest = ['rest', 1400];
    return [['dial', 0, away], rest, back, rest, ['dial', 0, away], rest, back, rest];
  }
  if (id === 'L3') {
    const b = l3best(s), k = b[0] < MAX ? 1 : -1;
    return [...dials(b), ...Array.from({ length: 22 }, (_, i) => ['click', 0, i % 2 ? -k : k])];
  }
  return null;
}

/** After "Show me": the plate holds the worked case. `s` is the plate after the walk (dials from the hands), `g` the eased goals, `pre` the case as posed. */
export function shown(id, s, g, pre) {
  const xs = x(s);
  if (id === 'e1.1' || id === 'e1.2') return near(s.x1 * s.w1, s.goalV) && g.cvP1 === 0;
  if (id === 'e1.3') return near(s.x1 * s.w1 + s.x2 * s.w2, s.goalV);
  if (id.startsWith('e2.')) return g.cvP1 === 0 && g.cvP2 === 0 && g.cvSum === 0 && g.cvOut === 0 && g.noteRows === 4;
  if (id.startsWith('e3.')) { const v = w(pre); v[Math.round(pre.arrDial)] += pre.arrN * STEP; return near(s.w1, v[0]) && near(s.w2, v[1]); }
  if (id === 'e4.1') return out(w(s), xs) === 0;
  if (id === 'e4.2') return out(w(s), xs) > 0;
  if (id === 'e5') return passes(buildOf(s), w(s)) && near(flow(buildOf(s), w(s), xs).out, out(w(s), xs)) && Math.round(s.tst) === 3;
  if (id.startsWith('e6.')) return near(s.target - s.x1 * s.w1, s.goalV) && g.cvMiss === 0;
  if (id.startsWith('e7.')) return near(out(w(s), xs), s.target);
  if (id.startsWith('e8.')) return meets(w(s), bench(s));
  return false;
}
