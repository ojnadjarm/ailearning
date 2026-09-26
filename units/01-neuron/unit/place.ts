import { place, ring, layoutFaults, pairFaults, clipped, dist, boxOf as box, discOf as disc, segOf as seg, type Entity, type Item, type Shape } from 'explainer-kit';
import { OUTLINES, markAt, feedsOf, T, type Outline } from './outlines';
import { RULES as SIM } from '../sim/rules';
import { BALLOONS, BESIDE, TAGS, balloonShown, type TagKey } from './labels';
import { BENCH, L, levelY, rimAngle } from './layout';
import { Z } from '../plate/z';
import type { A01State } from './state';
import { derive } from '../sim/neuron';
import type { GuessPose } from '../plate/parts/pencils';
import { RULES, PLAQUE_BOX, TAG_AT, KEYS, marker, plaque, tag } from './placed';
import { CLIP, SWEEPS, PEN2_WIN, PEN2_CUE, flagAt, flagCue, needleAt, pen1Y } from './bench-shapes';
import { WORDS, arrowRoute, arrowObstacles } from './arrow';

export { RULES, PLACED, FAULTS, TAG_AT, balloon, PLAQUE_BOX } from './placed';

const now = (e: Entity, shapes: Shape[]): Item => ({ ...e, scenes: ['now'], shapes });
const p2 = BENCH.pen2, g = BENCH.goal;

/** A pose's layout: the brass mark at its target (to 0.01) and the bench marks that are out, with every value, balloon and the plaque placed round them. */
interface Pose { placed: Item[]; hidden: Set<string>; faults: string[] }
const poses = new Map<string, Pose>();
const key = (s: A01State): [number, boolean, boolean, number, number, string] => {
  const r = arrowRoute(s);
  return [Math.round(s.target * 100) / 100, s.pen1On > 0.5, s.pen2On > 0.5, s.goalOn > 0.5 ? Math.round(s.goalKind) : -1, s.tune > 0.5 ? Math.round(s.tSel) : -1,
    r ? `${r.k}|${r.R}|${r.words.join(',')}|${r.path.length}|${JSON.stringify(r.path[0])}` : ''];
};
/** The target's value box: where it was placed while it clears the mark, else round the mark at `t`. */
const targetTag = (t: number): Entity => { const a = rimAngle(t); return tag('t', [TAG_AT.t, ...ring(markAt(t), [L.gaugeX - Math.sin(a) * 400, Math.cos(a) * 400], TAGS.t.hw + 6)]); };
/**
 * The layout for the plate as drawn now (`named`: the explanation's lettering is drawn). A balloon with no clear slot in a pose (round a
 * dial while the arc arrow's route passes it) is hidden in it; its part keeps its callout. The target's value box follows the mark; the other
 * value boxes and the plaque keep their one place in every pose.
 */
export function layoutOf(s: A01State, named = true): Pose {
  const [t, pen1, pen2, goal, set, arrow] = key(s), k = `${t}|${+pen1}|${+pen2}|${goal}|${set}|${arrow}|${+named}`;
  let p = poses.get(k);
  if (!p) {
    const outlines = (OUTLINES as Outline[]).filter((o) => named || !o.named).map((o) => (o.id === 'mark' ? { ...o, shapes: [markAt(t)], body: markAt(t) } : o));
    const extra = [...(pen1 ? [SWEEPS.pen1] : []), ...(pen2 ? [SWEEPS.pen2] : []), ...(goal >= 0 ? [SWEEPS.goal[goal]] : []),
      ...(set >= 0 ? [{ id: 'feeds', kind: 'figure', scenes: [T], shapes: feedsOf(set) } as Entity] : []), ...arrowObstacles(s)];
    const pinned = [plaque([[PLAQUE_BOX.x, PLAQUE_BOX.y]]), ...KEYS.map((k) => (k === 't' ? targetTag(t) : tag(k, [TAG_AT[k]])))];
    const r = place([...outlines, ...extra, ...pinned, ...BALLOONS.map((_, i) => marker(i, t))], RULES);
    p = { placed: r.placed, faults: r.faults, hidden: new Set(r.faults.filter((f) => f.startsWith('marker ')).map((f) => f.split(/[ :]/)[1])) };
    poses.set(k, p);
  }
  return p;
}

const valueAt = (id: string, [x, y]: [number, number], h: { hw: number; hh: number }): Item => ({ id, kind: 'value', scenes: ['now'], shapes: [box(x - h.hw, y - h.hh, x + h.hw, y + h.hh)], at: [x, y] });

/** The bench's marks that move with the state, with their draw layer: the pencils (a flag on its rail, a needle, its window) and their cues, a ringed goal, the arc arrow and its words, the loaded set's feeds. */
function moving(s: A01State): Item[] {
  const out: Item[] = [], cue = { z: Z.cue, clip: CLIP };
  if (s.pen1On > 0.5) {
    const y = pen1Y(s);
    out.push(now({ id: 'pencil 1', kind: 'figure', scenes: [], ...cue }, [flagAt(y), ...(s.pen1Cue > 0.5 ? [flagCue(y)] : [])]));
  }
  if (s.pen2On > 0.5) {
    out.push(now({ id: 'pencil 2', kind: 'figure', scenes: [], part: 'gauge', host: ['gauge'], ...cue }, needleAt(s.pen2)));
    out.push({ ...now({ id: 'pencil 2 value', kind: 'value', scenes: [], part: 'gauge', host: ['gauge', 'miss'], ...cue }, [PEN2_WIN]), at: p2.win });
    if (s.pen2Cue > 0.5) out.push(now({ id: 'pencil 2 cue', kind: 'figure', scenes: [], ...cue }, PEN2_CUE));
  }
  if (s.goalOn > 0.5) {
    const k = Math.round(s.goalKind), [x, y] = k === 0 ? g.product : k === 1 ? [g.sumX, levelY(s.goalV)] : g.miss;
    out.push(now({ id: 'goal', kind: 'figure', scenes: [] }, [box(x - 72, y - 25, x + 72, y + 25)]));
  }
  const r = arrowRoute(s);
  if (r) out.push(now({ id: 'arrow', kind: 'cue', scenes: [], z: Z.cue }, r.drawn), { ...valueAt('arrow clicks', r.words, WORDS), ...cue });
  if (s.tune > 0.5) out.push(now({ id: 'feeds', kind: 'figure', scenes: [] }, feedsOf(Math.round(s.tSel))));
  return out;
}

/** What Plate I draws now without pencil 2's name tag (the tag is placed round it). */
function drawnNow(s: A01State, named: boolean): Item[] {
  const side = s.fig6 > 0.5 || s.fig5 > 0.001, fig7 = s.fig7 > 0.5, out: Item[] = [], pose = layoutOf(s, named);
  for (const o of OUTLINES as Outline[]) if (o.on(s) && (named || !o.named)) out.push(o.id === 'mark' ? { ...now(o, [markAt(s.target)]), body: markAt(s.target) } : now(o, o.shapes));
  for (const it of pose.placed) {
    if (it.kind === 'value' && s[TAGS[it.id as TagKey].show] > 0.5 && !(fig7 && !['x1', 'x2', 't'].includes(it.id))) out.push({ ...now(it, it.shapes), z: Z.text });
    const n = Number(it.id);
    if (it.kind === 'marker' && !pose.hidden.has(it.id) && !fig7 && !(side && BESIDE.includes(n)) && balloonShown(s, n - 1) > 0.5) out.push({ ...it, scenes: ['now'], z: Z.text });
    if (it.kind === 'control' && s.plqOn > 0.5) out.push({ ...now(it, it.shapes), z: Z.text });
  }
  return [...out, ...moving(s)];
}

/** Pencil 2's YOUR GUESS tag: half size, and the dot's radius on the needle (past the numerals, among the ticks). */
export const GUESS = { hw: 72, hh: 17, dot: L.gaugeR - 18 };
/** The gauge's numerals stand inside this radius: the tag's leader keeps outside it. */
const NUMERALS = L.gaugeR - 32;
const HOUSING = disc(L.gaugeX, 0, L.gaugeR + 12);
/** What a leader across the drag cue costs, in units of leader length. */
const CROSS_CUE = 60;
const guessItem = (g: GuessPose, host = ['gauge']): Item => ({ id: 'guess tag', kind: 'value', scenes: ['now'], part: 'pencil 2', host, z: Z.cue, clip: CLIP,
  shapes: [box(g.at[0] - GUESS.hw, g.at[1] - GUESS.hh, g.at[0] + GUESS.hw, g.at[1] + GUESS.hh)], at: g.at, leader: seg(...g.from, ...g.to) as Item['leader'] });
/** Where the tag may stand: a grid round the gauge, in and off the casing. */
const GRID: [number, number][] = [];
for (let x = 220; x <= 860; x += 16) for (let y = -320; y <= 320; y += 12) GRID.push([x, y]);
const guesses = new Map<string, GuessPose | null>();
/**
 * Pencil 2's name tag while it shows: the grid slot with the shortest leader that leaves the needle nearest its own way out, whose box and
 * leader clear everything drawn now (value boxes, balloons, the window, the casing), whose leader keeps off the numerals and the machine's
 * needle; a leader across the drag cue counts as 60 units longer.
 */
export function guessTag(s: A01State, named = true): GuessPose | null {
  if (s.pen2On < 0.5 || s.pen2Tag < 0.5) return null;
  const out = Math.min(SIM.gauge.max, Math.max(0, derive(s).out)), shown = KEYS.map((k) => +(s[TAGS[k].show] > 0.5)).join('');
  const k = `${Math.round(s.pen2 * 10)}|${Math.round(out * 100)}|${key(s).join('|')}|${+(s.pen2Cue > 0.5)}|${shown}|${+(s.plqOn > 0.5)}|${+(s.noteOn > 0.5)}|${+named}`;
  if (guesses.has(k)) return guesses.get(k)!;
  const items = drawnNow(s, named), a = rimAngle(s.pen2), b = rimAngle(out), [ux, uy] = [-Math.sin(a), Math.cos(a)];
  const from: [number, number] = [L.gaugeX + ux * GUESS.dot, uy * GUESS.dot];
  const needle = s.cvOut > 0.5 || Math.abs(a - b) < 0.2 ? null : seg(L.gaugeX, 0, L.gaugeX - Math.sin(b) * (L.gaugeR - 8), Math.cos(b) * (L.gaugeR - 8), 3);
  const slots = GRID.map((at) => {
    const to: [number, number] = [Math.min(Math.max(from[0], at[0] - GUESS.hw), at[0] + GUESS.hw), Math.min(Math.max(from[1], at[1] - GUESS.hh), at[1] + GUESS.hh)];
    const off = Math.acos(Math.max(-1, Math.min(1, ((at[0] - L.gaugeX) * ux + at[1] * uy) / Math.hypot(at[0] - L.gaugeX, at[1]))));
    return { g: { at, from, to }, cost: Math.hypot(to[0] - from[0], to[1] - from[1]) + 90 * off };
  }).sort((p, q) => p.cost - q.cost);
  let best: GuessPose | null = null, bestCost = Infinity;
  for (const { g, cost } of slots) {
    if (cost >= bestCost) break;
    const it = guessItem(g, ['gauge', 'pencil 2 cue']), l = it.leader!;
    const n = Math.hypot(l.x1 - l.x0, l.y1 - l.y0) || 1, far = seg(l.x0 + ((l.x1 - l.x0) * 10) / n, l.y0 + ((l.y1 - l.y0) * 10) / n, l.x1, l.y1);
    if (dist(l, disc(L.gaugeX, 0, 0)) < NUMERALS || (needle && dist(far, needle) < 6) || dist(it.shapes[0], HOUSING) < (RULES.value ?? 0) || clipped(it)) continue;
    if (items.some((o) => pairFaults(it, o, RULES).length)) continue;
    const c = cost + (items.some((o) => pairFaults(guessItem(g), o, RULES).length) ? CROSS_CUE : 0);
    if (c < bestCost) { best = g; bestCost = c; }
  }
  guesses.set(k, best);
  return best;
}

/**
 * What Plate I draws now, as layout items (fixed outlines, placed values, balloons and the plaque, the bench's moving marks and pencil 2's
 * tag), with the layers of the numbers and the cues; `layoutFaults` of it is the no-overlap, no-cue-under and no-clipped-mark check. `named` false: the term labels are not drawn, whatever the state says.
 */
export function inventory(s: A01State, named = true): Item[] {
  const g = guessTag(s, named);
  return [...drawnNow(s, named), ...(g ? [guessItem(g, ['gauge', 'pencil 2 cue'])] : [])];
}
/** The no-overlap faults of the plate as drawn now. */
export const faultsNow = (s: A01State, named = true): string[] => layoutFaults(inventory(s, named), RULES);
