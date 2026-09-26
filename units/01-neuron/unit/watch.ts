import { Timeline, type CueBinder, type UnitSpec } from 'explainer-kit';
import { ANCHORS, SHOTS, type ShotName } from './layout';
import { REVEALS, WORK, type A01State } from './state';
import { lines, type Line } from './script';
import { EFFECTS, BALLOON_AT, type FxCtx } from './effects';

export const WATCH_ORDER = ['c1a', 'c1b', 'c2a', 'c2b', 'c3a', 'c3b', 'c4a', 'c4b', 'c5a', 'c5b', 'c6a', 'c7a', 'c7b', 'c8a', 'c8b', 'c9a', 'c9b', 'c10a'];
export const LEAD = 3.4, GAP = 0.9;
/** A chapter's working marks start to fade this long before its last clip ends (its last word ends about 0.5 s before), over `d` seconds. */
export const FADE = { lead: 0.4, d: 0.6 };
/** The term labels: drawn only while the explanation runs; after it the parts are named by their numbers. */
export const NAMES = REVEALS.filter((k) => k.startsWith('lbl'));

/** The term a sentence names → the label it draws in, on the spoken word. */
const TERM_LABEL: Record<string, [keyof A01State, string]> = {
  neuron: ['lblNeuron', 'neuron'], input: ['lblInput', 'input'], weight: ['lblWeight', 'weight'], product: ['lblProduct', 'product'],
  sum: ['lblSum', 'sum'], valve: ['lblValve', 'valve'], output: ['lblOutput', 'output'], target: ['lblTarget', 'target'], miss: ['lblMiss', 'miss'],
  example: ['lblExample', 'example'], tuner: ['lblTuner', 'tuner'], learning: ['lblLearning', 'learning'], network: ['lblNetwork', 'network'],
};
const TAG_KEY: Record<string, keyof A01State> = { x1: 'tX1', x2: 'tX2', w1: 'tW1', w2: 'tW2', p1: 'tP1', p2: 'tP2', sum: 'tSum', out: 'tOut', t: 'tT', miss: 'tMiss', total: 'tTotal' };
/** A lit part → the working mark it is drawn with. */
const LIGHT_MARK: Record<string, keyof A01State> = {
  note: 'noteOn', graph: 'graph', miss: 'missOn', detent: 'clickOn', fig3: 'fig3', e1: 'fig3', e2: 'fig3', e3: 'fig3', e4: 'fig3', tally: 'tally', tuner: 'tunerOn', lock1: 'locks', lock2: 'locks',
};
/** Sentence `set` keys → state keys, in the order a multi-part change draws them (tubes, then the mark, then the knobs). */
const SET_GROUPS: [string, keyof A01State][][] = [[['x1', 'x1'], ['x2', 'x2']], [['t', 'target']], [['w1', 'w1'], ['w2', 'w2']], [['chamberOn', 'chamberOn'], ['gaugeOn', 'gaugeOn']]];
const LIGHT_KEY: Record<string, keyof A01State> = { dial1: 'hiDial1', dial2: 'hiDial2' };
const noteMode = (rows: string[]): number => (rows[0].startsWith('E2 ') ? 1 : rows[0].startsWith('total') ? 2 : 0);
/** The working marks a sentence draws on: its number tags (the miss tag with its arc), the note, Fig. 3, and the marks of the parts it lights. */
export const uses = (l: Line): (keyof A01State)[] => [
  ...Object.keys(l.tags ?? {}).map((k) => TAG_KEY[k]), ...(l.tags?.miss !== undefined ? ['missOn' as const] : []),
  ...(l.note ? ['noteOn' as const] : []), ...(l.fig3 ? ['fig3' as const] : []), ...(l.lights ?? []).flatMap((p) => (LIGHT_MARK[p] ? [LIGHT_MARK[p]] : [])),
];

/** The watch's opening and resting state: blank paper, framed on the whole sheet. */
function opening(): Partial<A01State> {
  const o: Partial<A01State> = { ...SHOTS.open, lampOn: 0, exposure: 0, x1: 0, x2: 0, w1: 0, w2: 0, target: 2.5, markGlow: 0, hiDial1: 0, hiDial2: 0,
    balloons: 0, bLo: 0, bOn: 1, noteRows: 0, noteMode: 0, tStep: 0, net: 0, tuneWall: 0,
    tune: 0, fig6: 0, fig6k: 0, exN: 0, tSel: 0, tStepR: 0, goalT: 0, lampX: ANCHORS.machine.x, lampY: ANCHORS.machine.y };
  for (const k of REVEALS) o[k] = 0;
  return o;
}

/**
 * The narrated watch built from the script's sentence data: every change lands on its sentence's cue and settles before the next one.
 * Each chapter draws the working marks its sentences use and fades them once its recap is said, so a chapter stop shows the machine alone;
 * the last chapter ends on the clean neuron with its numbers.
 */
export function watchBuilder(spec: UnitSpec): (s: A01State, cue: CueBinder) => Timeline {
  const script = lines(spec, WATCH_ORDER);
  const chapter = new Map((spec.chapters ?? []).flatMap((c, i) => (c.clips ?? []).map((id): [string, number] => [id, i])));
  const last = new Set((spec.chapters ?? []).flatMap((c) => (c.clips?.length ? [c.clips.at(-1)!] : [])));
  return (s, cue) => {
    const tl = new Timeline();
    tl.set(s, opening(), 0);
    tl.to(s, { exposure: 1, duration: 2.2, ease: 'power1.out' }, 0);
    tl.to(s, { ...SHOTS.full, duration: 3.6, ease: 'power3.inOut' }, 0.1);
    tl.to(s, { lampOn: 1, duration: 0.9, ease: 'power1.in' }, 1.6);
    const cur: Record<string, number> = { x1: 0, x2: 0, w1: 0, w2: 0, t: 2.5, chamberOn: 0, gaugeOn: 0 };
    let rows = 0, mode = 0, lit = new Set<string>(), balloons = 0, ch = -1, shown = new Set<keyof A01State>();
    script.forEach((l, j) => {
      const next = script[j + 1], start = cue.start(l.clip), t0 = cue.at(l.clip, l.cue);
      const t1 = next && next.clip === l.clip ? cue.at(next.clip, next.cue) : cue.end(l.clip) + GAP;
      const room = t1 - t0, fx = EFFECTS[`${l.clip}.${l.cue}`], c: FxCtx = { tl, s, t0, t1, shown, at: (m) => cue.at(l.clip, m) };
      if (chapter.get(l.clip) !== ch) { ch = chapter.get(l.clip)!; shown = c.shown = new Set(); tl.set(s, { bLo: balloons, bOn: 1 }, start); }
      if (l.set && !fx?.own?.includes('set')) sets(tl, s, l, cur, t0, room);
      if (l.note) {
        const m = noteMode(l.note);
        if (m !== mode) { mode = m; rows = 0; tl.set(s, { noteMode: m, noteRows: 0 }, t0 + 0.05); }
        if (l.note.length !== rows) { tl.to(s, { noteRows: l.note.length, duration: Math.min(room - 0.4, 0.45 * Math.abs(l.note.length - rows)), ease: 'none' }, t0 + 0.25); rows = l.note.length; }
      }
      if (l.shot && !fx?.own?.includes('shot')) tl.to(s, { ...SHOTS[l.shot as ShotName], duration: Math.min(1.8, room - 0.2) }, Math.max(start, t0 - 0.4));
      if (l.lamp) { const a = ANCHORS[l.lamp]; tl.to(s, { lampX: a.x, lampY: a.y, duration: 0.8 }, Math.max(start, t0 - 0.3)); }
      if (l.term && TERM_LABEL[l.term]) { const [k, w] = TERM_LABEL[l.term]; shown.add(k); tl.to(s, { [k]: 1, duration: 0.9, ease: 'none' }, wordIn(cue, l.clip, w, t0)); }
      const now = new Set((l.lights ?? []).filter((p) => LIGHT_KEY[p]));
      for (const p of now) if (!lit.has(p)) tl.to(s, { [LIGHT_KEY[p]]: 1, duration: 0.4 }, t0 - 0.1);
      for (const p of lit) if (!now.has(p)) tl.to(s, { [LIGHT_KEY[p]]: 0, duration: 0.5 }, t0 - 0.1);
      lit = now;
      const n = BALLOON_AT[`${l.clip}.${l.cue}`];
      if (n) { balloons = n; tl.to(s, { balloons: n, duration: 0.75, ease: 'none' }, t0 + 0.1); }
      fx?.run(c);
      for (const k of uses(l)) if (!shown.has(k)) { shown.add(k); tl.to(s, { [k]: 1, duration: 0.6, ease: 'none' }, t0 + 0.2); }
      if (last.has(l.clip) && next?.clip !== l.clip) {
        const fade: Partial<Record<keyof A01State, number>> = { bOn: 0, hiDial1: 0, hiDial2: 0 };
        for (const k of WORK) fade[k] = 0;
        tl.to(s, { ...fade, duration: FADE.d, ease: 'none' }, cue.end(l.clip) - FADE.lead);
        lit = new Set();
      }
    });
    const end = cue.end(WATCH_ORDER.at(-1)!);
    tl.to(s, { ...SHOTS.drive, duration: 2.6 }, end - 0.8);
    tl.to(s, { net: 0.12, duration: 2.4 }, end - 0.6);
    tl.to(s, { w1: 0, w2: 0, duration: 1.4 }, end - 0.4).set(s, { tStep: 0, noteMode: 0, noteRows: 5 }, end - 0.4);
    tl.to(s, { lampX: ANCHORS.dial1.x, lampY: ANCHORS.dial1.y, duration: 1.0 }, end - 0.3);
    tl.set(s, { bLo: 0 }, end + 0.4).to(s, { bOn: 1, duration: 0.9, ease: 'none' }, end + 0.4);
    tl.mark('end', end + 0.2);
    tl.end(end + 2.2);
    return tl;
  };
}

/** A sentence's value changes: one group eases over the sentence's first second; several groups follow one another. */
function sets(tl: Timeline, s: A01State, l: Line, cur: Record<string, number>, t0: number, room: number): void {
  const groups = SET_GROUPS.map((g) => g.filter(([k]) => l.set![k] !== undefined && l.set![k] !== null && l.set![k] !== cur[k])).filter((g) => g.length);
  groups.forEach((g, i) => {
    const vars: Record<string, number> = {};
    for (const [k, key] of g) { vars[key] = l.set![k]!; cur[k] = l.set![k]!; }
    const d = groups.length > 1 ? 0.45 : Math.max(0.3, Math.min(1.3, room - 0.4));
    tl.to(s, { ...vars, duration: d }, t0 + 0.1 + i * 0.5);
  });
}

/** The spoken start of `word` in a clip at or after second t (watch axis); t itself when the word is not said there. */
function wordIn(cue: CueBinder, clip: string, word: string, t: number): number {
  for (let n = 0; n < 40; n++) {
    let at: number;
    try { at = cue.word(clip, word, n); } catch { return t; }
    if (at >= t - 0.05) return at;
  }
  return t;
}

/** Working marks play leaves off: the example and tuner figures and their labels, and the network's (the bench draws its own figures). */
const NOT_IN_PLAY = ['lblExample', 'lblTuner', 'lblLearning', 'lblNetwork', 'bracket', 'fig3', 'tally', 'tTotal', 'tunerOn'] as const satisfies readonly (keyof A01State)[];

/** The plate as play starts (for jumping straight to a later beat): the machine at rest with its number tags, note and balloons, no term labels. */
export function afterWatch(): Partial<A01State> {
  const o: Partial<A01State> = { ...SHOTS.drive, exposure: 1, lampOn: 1, x1: 2, x2: 1, w1: 0, w2: 0, target: 2.5, markGlow: 0.25, balloons: 19, bLo: 0, bOn: 1,
    noteRows: 5, noteMode: 0, tStep: 0, net: 0.12, tuneWall: 1, lampX: ANCHORS.dial1.x, lampY: ANCHORS.dial1.y };
  for (const k of REVEALS) o[k] = 1;
  for (const k of [...NOT_IN_PLAY, ...NAMES]) o[k] = 0;
  return o;
}
/** The working marks play draws that the watch's clean end does not: the drive eases them in. */
export function playMarks(): Partial<A01State> {
  const p = afterWatch(), o: Partial<A01State> = { bOn: 1 };
  for (const k of WORK) o[k] = p[k];
  return o;
}
