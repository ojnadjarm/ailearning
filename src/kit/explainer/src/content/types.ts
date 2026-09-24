/** Compiled unit data from `kokoro-narration`: pure types, no behaviour. */
export interface Word { w: string; s: number; e: number }
export interface Clip { src: string; duration: number; marks: Record<string, number>; words: Word[] }
export interface CueSheet { clips: Record<string, Clip>; bias: number }
export interface Term { id: string; word: string; gloss: string; namedCue: string }
/** The narration script (`unit.json`): one entry per clip, sentences with `{cue}` marks. */
export interface UnitSpec { id?: string; title?: string; introduces?: Term[]; clips: { id: string; beat?: string; focus?: string; sentences: string[] }[] }
export interface UnitBundle { spec: UnitSpec; cues: CueSheet; base: string }
