import type { CueSheet, UnitSpec } from './content/types';

interface Sentence { s: number; e: number; text: string }
const plain = (x: string): string => x.replace(/\{[^}]*\}/g, '').replace(/\|$/, '').trim();

/** Captions: the script's sentences, timed by the cue sheet's word timings. */
export class Captions {
  private byClip = new Map<string, Sentence[]>();
  private cues: CueSheet;
  constructor(cues: CueSheet, spec: UnitSpec) {
    this.cues = cues;
    for (const clip of spec.clips) {
      const words = cues.clips[clip.id]?.words ?? [], out: Sentence[] = [];
      let i = 0;
      for (const raw of clip.sentences) {
        const text = plain(raw), n = (text.match(/[A-Za-z0-9']+/g) ?? []).length;
        const first = words[i], last = words[Math.min(words.length - 1, i + n - 1)];
        if (first && last) out.push({ s: first.s, e: last.e, text });
        i += n;
      }
      this.byClip.set(clip.id, out);
    }
  }
  /** The sentence of clip `id` spoken `t` seconds into it, or ''. */
  at(id: string, t: number): string {
    const list = this.byClip.get(id) ?? [];
    const hit = list.find((x, i) => t >= x.s - 0.15 && t < Math.min(list[i + 1]?.s ?? Infinity, x.e + 0.9) - 0.15);
    return hit ? hit.text : '';
  }
  /** The sentence spoken at watch-axis time `t`. */
  watch(t: number, offsets: Record<string, number>): string {
    for (const [id, at] of Object.entries(offsets)) {
      if (t >= at - 0.2 && t <= at + this.cues.clips[id].duration) return this.at(id, t - at);
    }
    return '';
  }
}
