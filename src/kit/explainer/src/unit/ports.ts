import type { Timeline } from '../motion/timeline';
import type { CueBinder } from '../motion/cues';
import type { Projector } from '../play/pointer';
import type { DetentHand } from '../play/hand';

/** The style's side: draw a state, fit the viewport, map pointer pixels to world units. */
export interface View<S> extends Projector {
  /** Container observed for resizes. */
  readonly el: HTMLElement;
  /** Element that receives pointer input. */
  readonly canvas: HTMLElement;
  draw(s: S, dt: number, run: boolean): void;
  resize(): void;
  /** Compile shaders or warm caches before Begin. */
  prepare?(): void;
}

/** What the director needs from the page chrome. */
export interface ShellPort {
  cta(label: string | null, go?: () => void): void;
  caption(text: string): void;
  playing(on: boolean): void;
  pausable(on: boolean): void;
  status(text: string): void;
  end(onReplay: () => void): void;
}

/** The unit's side: its state, and the narrated watch built on the cue sheet. */
export interface UnitDef<S> {
  initial(): S;
  watch: { order: string[]; lead: number; gap: number; build(s: S, cue: CueBinder): Timeline };
}

/** A hand that drives one state number; `glow` is the state key the style uses to light it. */
export interface Control<S> { hand: DetentHand; key: keyof S; glow?: keyof S }
