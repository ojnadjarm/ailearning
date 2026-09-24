import type { Voice } from '../audio/voice';
import type { UnitBundle } from '../content/types';
import type { Clock } from '../core/clock';
import type { DetentHand } from '../play/hand';
import type { Timeline } from '../motion/timeline';
import { CueBinder, layoutClips } from '../motion/cues';
import { Captions } from '../captions';
import { Events } from '../core/events';
import { damp } from '../core/math';
import { stateKey, OnDemand } from '../loop';
import { BeatMachine } from './beats';
import type { Control, ShellPort, UnitDef, View } from './ports';

export interface DirectorParts<S> { unit: UnitDef<S>; bundle: UnitBundle; view: View<S>; voice: Voice; clock: Clock; shell: ShellPort; controls?: Control<S>[] }
/** Goal easing: per-key rates (default 2.6/s), per-key arrival distance (default 0.005) and keys that snap under reduced motion. */
export interface Easing<S> { rates?: Partial<Record<keyof S, number>>; eps?: Partial<Record<keyof S, number>>; snap?: (keyof S)[] }

/** Mediator: owns state, clock, voice, captions, hands and beats; parts never talk sideways. Draws through the View on demand. */
export class Director<S extends object> {
  s: S;
  goal: Partial<S> = {};
  readonly tl: Timeline;
  readonly offsets: Record<string, number>;
  readonly captions: Captions;
  readonly beats: BeatMachine;
  readonly events = new Events();
  readonly controls: Control<S>[];
  readonly hands: DetentHand[];
  readonly unit: UnitDef<S>; readonly bundle: UnitBundle; readonly view: View<S>; readonly voice: Voice; readonly clock: Clock; readonly shell: ShellPort;
  activeHand = 0;
  reduced = false;
  onFrame: (drawMs: number) => void = () => undefined;
  private easing: Easing<S>;
  private line: { id: string; at: number } | null = null;
  private lineGen = 0;
  private lastKey = '';
  private flowRun = 0;
  private dirty = true;
  private loop = new OnDemand((dt) => this.tick(dt));

  constructor(p: DirectorParts<S>, easing: Easing<S> = {}) {
    this.unit = p.unit; this.bundle = p.bundle; this.view = p.view; this.voice = p.voice; this.clock = p.clock; this.shell = p.shell;
    this.controls = p.controls ?? [];
    this.hands = this.controls.map((c) => c.hand);
    this.easing = easing;
    this.s = p.unit.initial();
    const w = p.unit.watch;
    this.offsets = layoutClips(p.bundle.cues, w.order, w.lead, w.gap).offsets;
    this.tl = w.build(this.s, new CueBinder(p.bundle.cues, this.offsets));
    this.captions = new Captions(p.bundle.cues, p.bundle.spec);
    this.beats = new BeatMachine(this);
  }

  /** Play one narration line; resolves true when it ends (after its length when muted), false if a newer line or beat cut it. */
  async say(id: string): Promise<boolean> {
    const gen = ++this.lineGen;
    this.line = { id, at: performance.now() };
    this.wake();
    await this.voice.line(id);
    if (!this.voice.ctx) await new Promise((r) => setTimeout(r, this.bundle.cues.clips[id].duration * 1000));
    if (gen === this.lineGen) this.line = null;
    this.wake();
    return gen === this.lineGen;
  }
  hush(): void { this.lineGen++; this.line = null; this.voice.stop(); }

  go(beat: string): void { this.beats.go(beat); this.wake(); }

  /** Hands → state (the learner is driving). */
  readHands(dt: number): void { for (const c of this.controls) (this.s[c.key] as number) = c.hand.update(dt); }
  /** State → hands (the timeline is driving). */
  placeHands(): void { for (const c of this.controls) c.hand.place(this.s[c.key] as number); }

  /** Ease the free (non-timeline) state toward the current goal; a key within its `eps` lands on the goal, so the loop can stop. */
  private approach(dt: number): void {
    const s = this.s as Record<string, number>, e = this.easing as { rates?: Record<string, number>; eps?: Record<string, number>; snap?: string[] };
    for (const [k, v] of Object.entries(this.goal) as [string, number][]) {
      const x = this.reduced && e.snap?.includes(k) ? v : damp(s[k], v, e.rates?.[k] ?? 2.6, dt);
      s[k] = Math.abs(v - x) < (e.eps?.[k] ?? 0.005) ? v : x;
    }
  }

  /** One frame: beat logic, then draw only if something visible changed; returns whether it drew. */
  tick(dt: number): boolean {
    const timed = !!this.beats.cur?.timed;
    if (!timed) this.approach(dt);
    this.beats.update(dt);
    const key = stateKey(this.s), changed = key !== this.lastKey;
    this.lastKey = key;
    this.flowRun = changed || this.clock.playing() ? 2.5 : Math.max(0, this.flowRun - dt);
    const run = this.flowRun > 0;
    this.shell.caption(timed ? this.captions.watch(this.clock.now(), this.offsets) : this.line ? this.captions.at(this.line.id, (performance.now() - this.line.at) / 1000) : '');
    if (!changed && !run && !this.dirty && !this.line) return false;
    this.dirty = false;
    const t0 = performance.now();
    this.view.draw(this.s, dt, run);
    this.onFrame(performance.now() - t0);
    return true;
  }

  /** Run the frame loop until nothing has changed for 30 frames; `redraw` forces one draw (resize, theme). */
  wake(redraw = false): void { if (redraw) this.dirty = true; this.loop.wake(); }
}
