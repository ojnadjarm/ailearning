// U01's watch sampled in node: the script, its cue sheet, and the state where each sentence has settled.
import { readFileSync } from 'node:fs';
import { CueBinder, layoutClips } from 'explainer-kit';
import { derive } from '../../units/01-neuron/sim/neuron.ts';
import { watchBuilder, WATCH_ORDER, LEAD, GAP, FADE } from '../../units/01-neuron/unit/watch.ts';
import { lines } from '../../units/01-neuron/unit/script.ts';
import { initialState } from '../../units/01-neuron/unit/state.ts';

export const SPEC = JSON.parse(readFileSync('units/01-neuron/unit.json', 'utf8'));
export const CUES = JSON.parse(readFileSync('public/bundles/01-neuron/cues.json', 'utf8'));

/** The watch sampled where each sentence has settled, `lead` s before the next sentence's cue, with the numbers the sim derives there. */
export function settled(lead = 0.05) {
  const { offsets } = layoutClips(CUES, WATCH_ORDER, LEAD, GAP);
  const cue = new CueBinder(CUES, offsets), s = initialState(), tl = watchBuilder(SPEC)(s, cue), script = lines(SPEC, WATCH_ORDER);
  tl.seek(0.01);
  return script.map((l, j) => {
    const next = script[j + 1];
    const t1 = next && next.clip === l.clip ? cue.at(next.clip, next.cue) : cue.end(l.clip) + GAP;
    tl.seek(t1 - lead);
    return { l, s: { ...s }, v: derive(s) };
  });
}

/** The plate where each watch chapter leaves it: at the stop before the next chapter (0.3 s before it starts), and at the watch's end for the last. */
export function chapterEnds() {
  const { offsets } = layoutClips(CUES, WATCH_ORDER, LEAD, GAP);
  const cue = new CueBinder(CUES, offsets), s = initialState(), tl = watchBuilder(SPEC)(s, cue);
  const list = SPEC.chapters.filter((c) => c.clips);
  return list.map((c, i) => {
    tl.seek(0); tl.seek(i + 1 < list.length ? cue.start(list[i + 1].clips[0]) - 0.3 : tl.duration());
    return { numeral: c.numeral, s: { ...s } };
  });
}

/** The plate as each sentence is said: 1.4 s after its cue (its reveals have run or are past half way), before the next sentence and its chapter's fade. */
export function speaking() {
  const { offsets } = layoutClips(CUES, WATCH_ORDER, LEAD, GAP);
  const cue = new CueBinder(CUES, offsets), s = initialState(), tl = watchBuilder(SPEC)(s, cue), script = lines(SPEC, WATCH_ORDER);
  tl.seek(0.01);
  return script.map((l, j) => {
    const next = script[j + 1], t0 = cue.at(l.clip, l.cue);
    const t1 = next && next.clip === l.clip ? cue.at(next.clip, next.cue) : cue.end(l.clip) - FADE.lead;
    tl.seek(Math.min(t0 + 1.4, t1 - 0.02));
    return { l, s: { ...s } };
  });
}
