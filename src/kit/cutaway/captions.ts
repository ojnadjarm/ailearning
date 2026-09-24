import type { CueSheet } from './motion';

/** The narration script as `narrate.sh` copies it next to cues.json. */
export interface UnitSpec { clips: { id: string; sentences: string[] }[] }

interface Sentence { s: number; e: number; text: string }
const plain = (x: string): string => x.replace(/\{[^}]*\}/g, '').replace(/\|$/, '').trim();

/** Captions: the script's sentences, timed by the cue sheet's word timings, looked up by narration time. */
export class Captions {
  private byClip = new Map<string, Sentence[]>();
  constructor(private cues: CueSheet, spec: UnitSpec, private offsets: Record<string, number>) {
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
  /** The sentence being spoken at narration time t, or ''. */
  at(t: number): string {
    for (const [id, at] of Object.entries(this.offsets)) {
      const c = this.cues.clips[id]; if (!c || t < at - 0.2 || t > at + c.duration) continue;
      const list = this.byClip.get(id) ?? [], u = t - at;
      const hit = list.find((x, i) => u >= x.s - 0.15 && u < Math.min(list[i + 1]?.s ?? Infinity, x.e + 0.9) - 0.15);
      return hit ? hit.text : '';
    }
    return '';
  }
}
