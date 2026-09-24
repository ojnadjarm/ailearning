import { AudioClock, ManualClock, PerfClock, type Clock } from './core/clock';
import { VoicePlayer, NullVoice, type Voice } from './audio/voice';
import { PointerRouter } from './play/pointer';
import { bindKeys } from './play/keys';
import { Director, type Easing } from './unit/director';
import type { Beat } from './unit/beats';
import type { Control, UnitDef, View } from './unit/ports';
import type { UnitBundle } from './content/types';
import type { Shell } from './shell/shell';

/** Numbers the headless tools read (`window.__probe`); a style may add its own fields. */
export interface Probe { ready: number; frames: number; fw: number[]; longtasks: number[]; [k: string]: unknown }

const win = globalThis as unknown as Record<string, unknown>;
export const probe: Probe = { ready: 0, frames: 0, fw: [], longtasks: [] };
win.__probe = probe;
if (typeof document !== 'undefined') new PerformanceObserver((l) => { for (const e of l.getEntries()) probe.longtasks.push(Math.round(e.duration)); }).observe({ type: 'longtask', buffered: true });

export interface BootOptions<S extends object> {
  unit: UnitDef<S>;
  bundle: UnitBundle;
  view: View<S>;
  shell: Shell;
  controls?: Control<S>[];
  /** Every beat by name; `watch` is where the unit starts and Replay returns. */
  beats(d: Director<S>): Record<string, Beat>;
  /** State as the watch leaves it, for `?beat=` jumps and `__rec.go`. */
  after?(): Partial<S>;
  /** State shown behind the Begin card. */
  opening?: Partial<S>;
  easing?: Easing<S>;
}

/** Composition root for one unit: URL modes (`?t=` frozen, `?mute`, `?beat=`), clock and voice, Begin, input, resize, test hooks. */
export function boot<S extends object>(o: BootOptions<S>): { d: Director<S>; clock: Clock; voice: Voice; started: Promise<void> } {
  const q = new URLSearchParams(location.search);
  const frozen = q.has('t'), mute = q.has('mute') || frozen, jump = q.get('beat');
  const { shell, view } = o;
  const voice: Voice = mute ? new NullVoice() : new VoicePlayer(o.bundle);
  const begun = voice.ctx ? shell.begin() : null;
  const loading = voice instanceof VoicePlayer ? voice.load() : Promise.resolve();
  const clock = frozen ? new ManualClock(Number(q.get('t') ?? 0), false) : voice.ctx ? new AudioClock(voice.ctx) : new PerfClock();
  const d = new Director({ unit: o.unit, bundle: o.bundle, view, voice, clock, shell, controls: o.controls }, o.easing);
  d.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  d.onFrame = (ms) => { probe.frames++; if (probe.fw.length < 5000) probe.fw.push(+ms.toFixed(2)); };
  for (const h of d.hands) h.onDetent = () => voice.fx('detent', 0.8);
  for (const [name, beat] of Object.entries(o.beats(d))) d.beats.add(name, beat);

  const router = new PointerRouter(view.canvas, view, d.hands);
  router.onGrab = (g) => { d.activeHand = d.hands.indexOf(g); d.beats.touched(); };
  router.onActivity = () => d.wake();
  const toggle = (): void => { d.beats.toggle(); d.wake(); };
  shell.onToggle = toggle;
  shell.onReplay = () => d.go('watch');
  bindKeys(d, toggle);
  new ResizeObserver(() => { view.resize(); d.wake(true); }).observe(view.el);
  const t0 = performance.now();
  view.prepare?.();
  probe.compileMs = Math.round(performance.now() - t0);

  const after = (): void => { Object.assign(d.s, o.after?.() ?? {}); };
  const start = (): void => { if (jump && jump !== 'watch') { after(); d.go(jump); } else d.go('watch'); };
  win.__d = d;
  win.__rec = {
    watch: (t: number) => { if (d.beats.name !== 'watch') d.go('watch'); (clock as ManualClock).set(t); d.wake(true); },
    go: (b: string) => { after(); d.go(b); },
    turn: (i: number, n: number) => { d.hands[i].turn(n); d.wake(); },
    offsets: d.offsets, duration: d.tl.duration(),
  };
  probe.duration = d.tl.duration();
  win.__seek = (t: number) => (win.__rec as { watch(t: number): void }).watch(t);

  const started = (async () => {
    if (frozen) { shell.live(); start(); (clock as ManualClock).set(Number(q.get('t'))); }
    else if (voice.ctx && begun) {
      Object.assign(d.s, o.opening ?? {});
      d.wake(true);
      await begun; shell.live(); await voice.ctx.resume(); await loading;
      start();
    } else { shell.live(); start(); }
    d.wake(true);
    requestAnimationFrame(() => requestAnimationFrame(() => { probe.ready = performance.now(); win.__ready = true; }));
  })();
  return { d, clock, voice, started };
}
