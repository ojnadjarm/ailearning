import type { UnitSpec } from 'explainer-kit';

/** One Fig. 3 gauge as a sentence states it. */
export interface Fig3Row { x: number[]; t: string; out: string; miss: string }
/** One narrated sentence with the plate data it carries: what it sets, the tags, NOTE rows and Fig. 3 it shows, the shot, lamp, lit parts, the term it names, and its asserts. */
export interface Line {
  clip: string; i: number; cue: string; text: string;
  set?: Record<string, number | null>; tags?: Record<string, string>; note?: string[]; fig3?: Fig3Row[];
  lights?: string[]; shot?: string; lamp?: string; term?: string; asserts?: string[];
}

/** The watch clips' sentences in play order; each sentence's cue is its first `{mark}`. */
export function lines(spec: UnitSpec, order: string[]): Line[] {
  return order.flatMap((id) => {
    const c = spec.clips.find((x) => x.id === id);
    if (!c) throw new Error(`no clip ${id}`);
    return c.sentences.map((s, i) => {
      const o = typeof s === 'string' ? { text: s } : s;
      const cue = /\{([^}]+)\}/.exec(o.text)?.[1];
      if (!cue) throw new Error(`clip ${id} sentence ${i + 1}: no cue mark`);
      return { ...(o as Omit<Line, 'clip' | 'i' | 'cue'>), clip: id, i, cue };
    });
  });
}
