import { place, dist, within, boxOf as box, discOf as disc, type Entity, type Shape } from 'explainer-kit';
import { OUTLINES, type Outline } from './outlines';
import { RULES as SIM } from '../sim/rules';
import { TAGS, type TagKey } from './labels';
import { BENCH, L, ROW, WIN, NOTE, ARROW_WORDS, dialAngle } from './layout';
import type { A01State } from './state';
import { RULES, PQ, PLAQUE_BOX, TAG_AT, KEYS, casing } from './placed';
import { CLIP, arcSegs, sweep } from './bench-shapes';

/** The arc arrow as routed: its dial, radius, the whole turn's path (start to goal), the arc drawn now, and its words' centre. */
interface ArrowRoute { k: number; R: number; path: Shape[]; drawn: Shape[]; words: [number, number]; gaps: Gap[] }
/** A value box [x0, y0, x1, y1] the arc arrow crosses: there its line keeps no paper under-stroke, so the number shows through. */
export type Gap = [number, number, number, number];
const inGap = (x: number, y: number, gaps: Gap[]): boolean => gaps.some(([x0, y0, x1, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1);
export const WORDS = { hw: ARROW_WORDS.w / 2, hh: ARROW_WORDS.h / 2 };
const routes = new Map<string, Omit<ArrowRoute, 'drawn'>>();
const wAt = (s: A01State, k: number): number => Math.round((k ? s.w2 : s.w1) / SIM.dial.step) * SIM.dial.step;
const theta = (v: number): number => Math.PI / 2 + dialAngle(v);
/**
 * The arc arrow over dial `k` for the whole turn, from `arrW0` to the goal it counts down to: the first radius whose path keeps clear of
 * every value box, window and the plaque drawn now and whose words find a clear slot near the path (in the casing's clear paper or wholly
 * off the casing), preferring radii that cross no value box; where every radius crosses one, the line runs over it. The route holds while the count runs down, so nothing jumps.
 */
export function arrowRoute(s: A01State): ArrowRoute | null {
  const n = Math.round(s.arrN), k = Math.round(s.arrDial);
  if (s.arrOn < 0.5 || n === 0) return null;
  const w = wAt(s, k), to = w + n * SIM.dial.step, w0 = Math.round(s.arrW0 / SIM.dial.step) * SIM.dial.step, cy = ROW[k];
  const from = Math.sign(to - w0) === Math.sign(n) && w0 !== to ? w0 : w;
  const tags = KEYS.filter((t) => s[TAGS[t].show] > 0.5), key = `${k}|${from}|${to}|${tags.join(',')}|${s.plqOn > 0.5}|${s.win1 > 0.5}|${s.win2 > 0.5}|${s.noteOn > 0.5}`;
  let r = routes.get(key);
  if (!r) {
    const tagBox = (t: TagKey): Shape => box(TAG_AT[t][0] - TAGS[t].hw, TAG_AT[t][1] - 17, TAG_AT[t][0] + TAGS[t].hw, TAG_AT[t][1] + 17);
    const winBox = (y: number): Shape => box(WIN.x - WIN.w / 2 - 7, y - WIN.h / 2 - 5, WIN.x + WIN.w / 2 + 7, y + WIN.h / 2 + 5);
    const avoid = [...tags.map(tagBox), ...(s.plqOn > 0.5 ? [box(PLAQUE_BOX.x - PQ.w / 2, PLAQUE_BOX.y - PQ.h / 2, PLAQUE_BOX.x + PQ.w / 2, PLAQUE_BOX.y + PQ.h / 2)] : []),
      ...(s.win1 > 0.5 ? [winBox(ROW[0])] : []), ...(s.win2 > 0.5 ? [winBox(ROW[1])] : []), ...(s.noteOn > 0.5 ? [box(NOTE.x0, NOTE.y0, NOTE.x1, NOTE.y1)] : [])];
    const pathAt = (R: number): Shape[] => [...arcSegs(L.dialX, cy, R, theta(from), theta(to), 2), disc(L.dialX + Math.cos(theta(to)) * R, cy + Math.sin(theta(to)) * R, 12)];
    const clearOf = (sh: Shape[]): number => Math.min(...sh.flatMap((a) => avoid.map((b) => dist(a, b))));
    const on = (OUTLINES as Outline[]).filter((o) => (o.kind === 'part' || o.kind === 'container') && o.on(s)).map((o) => ({ ...o, scenes: ['now'] }));
    const shown = tags.map((t): Entity => ({ id: t, kind: 'label', scenes: ['now'], shapes: [tagBox(t)] }));
    const mid = (theta(from) + theta(to)) / 2, span = Math.abs(theta(to) - theta(from)) / 2 + 0.6;
    const tryR = (R: number): Omit<ArrowRoute, 'drawn'> & { bad: number } => {
      const path = pathAt(R), slots: [number, number][] = [];
      for (const dr of [WORDS.hh + 10, WORDS.hh + 24, WORDS.hh + 40, WORDS.hh + 60, WORDS.hh + 80, -(WORDS.hh + 10), -(WORDS.hh + 24)]) for (let j = 0; j <= 12; j++) for (const sg of j ? [1, -1] : [1]) {
        const a = mid + sg * j * 0.1;
        if (Math.abs(a - mid) > span) continue;
        const rr = R + dr + Math.sign(dr) * Math.abs(Math.cos(a)) * (WORDS.hw - WORDS.hh);
        const at: [number, number] = [L.dialX + Math.cos(a) * rr, cy + Math.sin(a) * (R + dr)];
        const b = box(at[0] - WORDS.hw, at[1] - WORDS.hh, at[0] + WORDS.hw, at[1] + WORDS.hh);
        if ((within(b, CLIP.inner) || dist(b, casing) >= 8) && Math.min(...path.map((q) => dist(b, q))) <= 72) slots.push(at);
      }
      const words: Entity = { id: 'arrow clicks', kind: 'value', scenes: ['now'], form: box(-WORDS.hw, -WORDS.hh, WORDS.hw, WORDS.hh), slots };
      const res = place([...on, ...shown, { id: 'arrow', kind: 'figure', scenes: ['now'], shapes: path }, words], RULES);
      const at = res.placed.find((i) => i.id === 'arrow clicks')?.at ?? slots[0] ?? [L.dialX, cy + R + 30];
      const gaps = avoid.filter((b) => path.some((q) => dist(q, b) < 4)).map((b): Gap => { const { x0, y0, x1, y1 } = b as Extract<Shape, { k: 'box' }>; return [x0 - 5, y0 - 5, x1 + 5, y1 + 5]; });
      const arc = path.filter((q) => q.k === 'seg'), seen = arc.filter((q) => q.k === 'seg' && !inGap((q.x0 + q.x1) / 2, (q.y0 + q.y1) / 2, gaps)).length / arc.length;
      return { k, R, path, words: at, gaps, bad: res.faults.filter((f) => f.includes('arrow clicks')).length + (clearOf(path) >= 6 ? 0 : 1) + (seen < 0.6 ? 2 : 0) };
    };
    const tries = BENCH.arrowRs.map(tryR), best = tries.find((t) => !t.bad) ?? tries.reduce((a, b) => (b.bad < a.bad ? b : a));
    r = { k: best.k, R: best.R, path: best.path, words: best.words, gaps: best.gaps };
    routes.set(key, r);
  }
  return { ...r, drawn: arcSegs(L.dialX, cy, r.R, theta(w), theta(to), 2) };
}
export const arrowObstacles = (s: A01State): Entity[] => {
  const r = arrowRoute(s);
  const m = RULES.between - RULES.toPart;
  return r ? [sweep('arrow path', r.path), sweep('arrow words', [box(r.words[0] - WORDS.hw - m, r.words[1] - WORDS.hh - m, r.words[0] + WORDS.hw + m, r.words[1] + WORDS.hh + m)])] : [];
};
