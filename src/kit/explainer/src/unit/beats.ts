import type { Events } from '../core/events';
import type { ShellPort } from './ports';

/** One beat of the unit (State pattern); the learner's actions, not timers, move between beats. */
export interface Beat {
  readonly label: string;
  /** The bar's pause button works in this beat. */
  readonly pausable?: boolean;
  /** State is a function of the clock (no goal easing; captions follow the watch axis). */
  readonly timed?: boolean;
  enter(): void;
  update(dt: number): void;
  exit(): void;
  /** The learner grabbed a hand. */
  touched?(): void;
  /** The bar's pause button or K. */
  toggle?(): void;
}

/** Holds the current beat, switches beats and forwards frames and touches. */
export class BeatMachine {
  private beats: Record<string, Beat> = {};
  cur: Beat | null = null;
  name: string | null = null;
  private d: { hush(): void; shell: ShellPort; events: Events };
  constructor(d: { hush(): void; shell: ShellPort; events: Events }) { this.d = d; }
  add(name: string, beat: Beat): this { this.beats[name] = beat; return this; }
  get(name: string): Beat | undefined { return this.beats[name]; }
  go(n: string): void {
    const b = this.beats[n];
    if (!b) throw new Error(`no beat ${n}`);
    this.cur?.exit();
    this.d.hush();
    this.d.shell.cta(null);
    this.d.shell.pausable(!!b.pausable);
    this.d.shell.status(b.label);
    this.name = n; this.cur = b;
    this.d.events.emit({ type: 'beat', name: n });
    b.enter();
  }
  update(dt: number): void { this.cur?.update(dt); }
  touched(): void { this.cur?.touched?.(); }
  toggle(): void { this.cur?.toggle?.(); }
}
