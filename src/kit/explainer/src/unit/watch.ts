import type { Beat } from './beats';
import type { Director } from './director';

export interface WatchOptions<S> {
  /** Beat the call to action leads to. */
  next: string;
  cta?: string;
  label?: string;
  /** Timeline mark where the call to action appears (default `end`, else the timeline's end). */
  mark?: string;
  /** Goal the director eases toward once the watch is left. */
  exitGoal?(s: S): Partial<S>;
}

/** Watch: the narrated animation. State is a pure function of the clock; grabbing a hand pauses it and keeps a snapshot (Memento). */
export class WatchBeat<S extends object> implements Beat {
  readonly label: string;
  readonly pausable = true;
  readonly timed = true;
  private memento: S | null = null;
  private cta = false;
  private d: Director<S>; private o: WatchOptions<S>;
  constructor(d: Director<S>, o: WatchOptions<S>) { this.d = d; this.o = o; this.label = o.label ?? 'Watch'; }
  enter(): void {
    Object.assign(this.d.s, this.d.unit.initial());
    this.d.goal = {};
    this.d.hands.forEach((x) => { x.enabled = true; });
    this.play(0);
  }
  play(from: number): void {
    this.cta = false;
    this.d.clock.start(from);
    this.d.voice.playWatch(this.d.offsets, from);
    this.d.shell.playing(true);
  }
  pause(): void { this.d.clock.stop(); this.d.voice.stop(); this.d.shell.playing(false); }
  toggle(): void {
    if (this.memento) { this.resume(); return; }
    if (this.d.clock.playing()) this.pause(); else this.play(Math.min(this.d.clock.now(), this.d.tl.duration()));
  }
  touched(): void {
    if (this.memento) return;
    this.memento = { ...this.d.s };
    this.pause();
    this.d.shell.cta('Resume', () => this.resume());
  }
  resume(): void {
    if (this.memento) Object.assign(this.d.s, this.memento);
    this.memento = null;
    this.d.shell.cta(null);
    this.play(this.d.clock.now());
  }
  update(dt: number): void {
    const d = this.d, t = d.clock.now();
    if (this.memento) { d.readHands(dt); return; }
    d.tl.seek(t);
    d.placeHands();
    const at = d.tl.marks()[this.o.mark ?? 'end'] ?? d.tl.duration();
    if (!this.cta && t >= at) { this.cta = true; d.shell.cta(this.o.cta ?? 'Your turn', () => d.go(this.o.next)); }
    if (t >= d.tl.duration() && d.clock.playing()) { d.clock.stop(); d.shell.playing(false); }
  }
  exit(): void {
    this.memento = null;
    this.d.clock.stop(); this.d.voice.stop();
    this.d.goal = this.o.exitGoal?.(this.d.s) ?? {};
    this.d.hands.forEach((x) => { x.enabled = false; });
  }
}
