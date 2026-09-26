import { place, ring, beside, LAYOUT_RULES, boxOf as box, discOf as disc, type Entity, type Item, type Rules } from 'explainer-kit';
import { OUTLINES, markAt, W, P, S, B, T } from './outlines';
import { BALLOONS, BESIDE, TAGS, type TagKey } from './labels';
import { L, rimAngle } from './layout';

/** The kit's clear distances, with value boxes allowed 4 units from an outline (the tags sit tight on the parts they read). */
export const RULES: Rules = { ...LAYOUT_RULES, value: 4 };
/** A balloon's radius, and the plaque's size in drawing units. */
export const BALLOON_R = 15;
export const PQ = { w: 190, h: 54 };
export const casing = OUTLINES[0].shapes[0];
const byId = new Map(OUTLINES.map((o) => [o.id, o]));

/** The numbers each balloon may share a scene with: the machine's in every scene; the NOTE's and Fig. 4's not beside Fig. 5 or 6; the watch's figures only in the watch, Fig. 6 and its tally with the tuning machine they are drawn on. */
const balloonScenes = (n: number): string[] => (n === 17 || n === 18 ? [W, S, T] : n === 19 ? [W, T] : n >= 16 ? [W] : BESIDE.includes(n) ? [W, P] : [1, 2, 14].includes(n) ? [W, P, S] : [W, P, S, T]);
const tagScenes = (k: TagKey): string[] => (['x1', 'x2'].includes(k) ? [W, P, S, B] : k === 't' ? [W, P, S, B, T] : [W, P, S, T]);

/** Balloon n's entity; the brass mark's balloon stands off radially from the gauge, wherever the target puts the mark. */
export function marker(i: number, t = 2.5): Entity {
  const b = BALLOONS[i], p = byId.get(b.part)!, mark = b.part === 'mark', body = mark ? markAt(t) : p.body!;
  const a = rimAngle(t), toward: [number, number] = mark ? [L.gaugeX - Math.sin(a) * 400, Math.cos(a) * 400] : b.toward;
  const slots = mark || b.part === 'fig3' ? ring(body, toward, BALLOON_R, [18, 30, 44, 60, 80, 110, 140]) : ring(body, toward, BALLOON_R);
  return { id: String(i + 1), kind: 'marker', part: b.part, host: p.host, scenes: balloonScenes(i + 1), form: disc(0, 0, BALLOON_R), slots };
}
export const plaque = (slots: [number, number][]): Entity => ({ id: 'plaque', kind: 'control', scenes: [P, S, B, T], form: box(-PQ.w / 2, -PQ.h / 2, PQ.w / 2, PQ.h / 2), slots });
export const tag = (k: TagKey, slots?: [number, number][]): Entity => {
  const t = TAGS[k];
  return { id: k, kind: 'value', part: t.part, host: t.host, scenes: tagScenes(k), form: box(-t.hw, -17, t.hw, 17), slots: slots ?? [...t.slots, ...ring(byId.get(t.part)!.body!, t.slots[0], t.hw + 6)] };
};
export const KEYS = Object.keys(TAGS) as TagKey[];

const MOVABLE: Entity[] = [
  plaque([beside(casing, 'below', 'end', 40, [PQ.w, PQ.h]), beside(casing, 'right', 'start', 40, [PQ.w, PQ.h])]),
  ...KEYS.map((k) => tag(k)),
  ...BALLOONS.map((_, i) => marker(i)),
];

/** One layout for the whole lesson: every value box, balloon and the plaque on its first clear slot. `FAULTS` lists what found none. */
export const { placed: PLACED, faults: FAULTS } = place([...OUTLINES, ...MOVABLE], RULES);
const at = (id: string, kind: string): Item => PLACED.find((e) => e.id === id && e.kind === kind)!;

/** Where each value tag is drawn. */
export const TAG_AT = Object.fromEntries(Object.keys(TAGS).map((k) => [k, at(k, 'value').at!])) as Record<TagKey, [number, number]>;
/** Balloon n (1–19): its centre and its leader from the part's edge. */
export const balloon = (n: number): { at: [number, number]; from: [number, number] } => {
  const it = at(String(n), 'marker');
  return { at: it.at!, from: [it.leader!.x0, it.leader!.y0] };
};
/** The plaque: centre and size. */
export const PLAQUE_BOX = { x: at('plaque', 'control').at![0], y: at('plaque', 'control').at![1], ...PQ };
/** A press on the plaque (with a small margin). */
export const onPlaque = (wx: number, wy: number): boolean => Math.abs(wx - PLAQUE_BOX.x) <= PQ.w / 2 + 8 && Math.abs(wy - PLAQUE_BOX.y) <= PQ.h / 2 + 8;
