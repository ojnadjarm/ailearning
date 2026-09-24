import type { Beat } from './beats';
import type { Director } from './director';

/** A predicate over the live unit (Specification): "is this step done?". */
export type Spec<S extends object> = (d: Director<S>) => boolean;
export const all = <S extends object>(...specs: Spec<S>[]): Spec<S> => (d) => specs.every((f) => f(d));
export const settled = <S extends object>(d: Director<S>): boolean => d.hands.every((h) => h.settled());
export const handAt = <S extends object>(i: number, v: number): Spec<S> => (d) => d.hands[i].value() === v;

/** One spoken instruction answered by the learner's hand. */
export interface GuidedStep<S extends object> {
  /** Index of the only hand enabled in this step (omit to enable none). */
  hand?: number;
  /** Clip ids: the instruction, and the line said once it is done. */
  ask: string; ok: string;
  done: Spec<S>;
  /** Seconds `done` must hold before it counts (default 0.35). */
  hold?: number;
  /** Clip said once if the step is still open after `hintAfter` seconds (default 12). */
  hint?: string; hintAfter?: number;
  enter?(d: Director<S>): void;
  after?(d: Director<S>): void;
}

export interface GuidedOptions<S extends object> {
  next: string;
  label?: string;
  cta?: string;
  enter?(d: Director<S>): void;
}

/** Guided play: spoken steps, each checked every frame by its Specification, held, then confirmed out loud. */
export class GuidedPlay<S extends object> implements Beat {
  readonly label: string;
  private i = -1; private hold = 0; private waited = 0; private hinted = false; private waiting = false; private t = 0;
  private d: Director<S>; private name: string; private steps: GuidedStep<S>[]; private o: GuidedOptions<S>;
  constructor(d: Director<S>, name: string, steps: GuidedStep<S>[], o: GuidedOptions<S>) {
    this.d = d; this.name = name; this.steps = steps; this.o = o; this.label = o.label ?? 'Your turn';
  }
  enter(): void {
    const d = this.d;
    this.o.enter?.(d);
    for (const c of d.controls) c.hand.place(c.hand.snap(d.s[c.key] as number));
    this.i = -1; this.next();
  }
  private next(): void {
    const d = this.d; this.i++; this.hold = 0; this.waited = 0; this.hinted = false;
    if (this.i >= this.steps.length) {
      d.events.emit({ type: 'complete', beat: this.name });
      d.shell.cta(this.o.cta ?? 'Continue', () => d.go(this.o.next));
      return;
    }
    const st = this.steps[this.i];
    d.hands.forEach((x, k) => { x.enabled = k === st.hand; });
    if (st.hand !== undefined) d.activeHand = st.hand;
    st.enter?.(d);
    this.waiting = true;
    d.events.emit({ type: 'step', beat: this.name, index: this.i, phase: 'start' });
    void d.say(st.ask);
  }
  update(dt: number): void {
    const d = this.d, s = d.s as Record<string, number>;
    this.t += dt;
    d.readHands(dt);
    const st = this.steps[this.i];
    const breathe = 0.55 + 0.45 * Math.sin(this.t * 2.2);
    d.controls.forEach((c, k) => { if (c.glow) s[c.glow as string] = st && this.waiting && st.hand === k ? breathe : 0; });
    if (!st || !this.waiting) return;
    this.waited += dt;
    if (st.hint && !this.hinted && this.waited >= (st.hintAfter ?? 12)) {
      this.hinted = true;
      d.events.emit({ type: 'hint', beat: this.name, index: this.i });
      void d.say(st.hint);
    }
    this.hold = st.done(d) ? this.hold + dt : 0;
    if (this.hold < (st.hold ?? 0.35)) return;
    this.waiting = false;
    if (st.hand !== undefined) d.hands[st.hand].enabled = false;
    d.events.emit({ type: 'step', beat: this.name, index: this.i, phase: 'done' });
    st.after?.(d);
    void d.say(st.ok).then((ok) => { if (ok) this.next(); });
  }
  exit(): void {
    const d = this.d, s = d.s as Record<string, number>;
    d.hands.forEach((x) => { x.enabled = false; });
    d.controls.forEach((c) => { if (c.glow) s[c.glow as string] = 0; });
  }
}
