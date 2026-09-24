import gsap from 'gsap';

/** Compiled narration from the `kokoro-narration` skill (cues.json). */
export interface Word { w: string; s: number; e: number }
export interface Clip { src: string; duration: number; marks: Record<string, number>; words: Word[] }
export interface CueSheet { clips: Record<string, Clip>; bias: number }

/** Seconds on the narration axis; every animated thing reads one of these, never wall time. */
export interface Clock { now(): number; playing(): boolean; start(from: number): void; stop(): void }

/** Audio-driven clock: the context's output time minus latency is the master. */
export class AudioClock implements Clock {
  private startAt = 0; private from = 0; private on = false;
  private ctx: AudioContext;
  constructor(ctx: AudioContext) { this.ctx = ctx; }
  private out(): number { return this.ctx.currentTime - (this.ctx.outputLatency || 0); }
  start(from: number): void { this.from = from; this.startAt = this.out(); this.on = true; }
  stop(): void { this.from = this.now(); this.on = false; }
  now(): number { return this.on ? this.from + Math.max(0, this.out() - this.startAt) : this.from; }
  playing(): boolean { return this.on; }
}

/** Clock set from outside: frozen stills (`?t=`) and tests. */
export class ManualClock implements Clock {
  t: number; private on: boolean;
  constructor(t = 0, on = false) { this.t = t; this.on = on; }
  set(t: number): void { this.t = t; }
  start(from: number): void { this.t = from; this.on = true; }
  stop(): void { this.on = false; }
  now(): number { return this.t; }
  playing(): boolean { return this.on; }
}

/** Wall-clock stand-in when there is no audio (muted runs, fps bench). */
export class PerfClock implements Clock {
  private t0 = 0; private from = 0; private on = false;
  start(from: number): void { this.from = from; this.t0 = performance.now(); this.on = true; }
  stop(): void { this.from = this.now(); this.on = false; }
  now(): number { return this.on ? this.from + (performance.now() - this.t0) / 1000 : this.from; }
  playing(): boolean { return this.on; }
}

/** Paused GSAP timeline on the narration axis: tweens sit at cue times and render only through seek(clock.now()). */
export class Timeline {
  private tl = gsap.timeline({ paused: true });
  to(target: object, vars: gsap.TweenVars, at: number): this { this.tl.to(target, { ease: 'power2.inOut', ...vars }, Math.max(0, at)); return this; }
  set(target: object, vars: gsap.TweenVars, at: number): this { this.tl.set(target, vars, Math.max(0, at)); return this; }
  end(at: number): this { this.tl.set({}, {}, at); return this; }
  duration(): number { return this.tl.duration(); }
  seek(t: number): void { this.tl.seek(t, false); }
}

/** Clip id → start second on one axis: clips play in order with `gap` seconds between, after `lead`. */
export function layoutClips(cues: CueSheet, order: string[], lead: number, gap: number): { offsets: Record<string, number>; end: number } {
  const offsets: Record<string, number> = {};
  let t = lead;
  for (const id of order) { offsets[id] = t; t += cues.clips[id].duration + gap; }
  return { offsets, end: t };
}

/** Cue names ({mark} in the script) and spoken words → seconds on the axis. */
export class CueBinder {
  private cues: CueSheet; private offsets: Record<string, number>;
  constructor(cues: CueSheet, offsets: Record<string, number>) { this.cues = cues; this.offsets = offsets; }
  at(clip: string, mark: string): number {
    const t = this.cues.clips[clip]?.marks[mark];
    if (t === undefined) throw new Error(`missing cue ${clip}.${mark}`);
    return this.offsets[clip] + t;
  }
  /** Start of the n-th spoken occurrence of a word. */
  word(clip: string, w: string, nth = 0): number {
    const hits = this.cues.clips[clip].words.filter((x) => x.w.toLowerCase().replace(/[^a-z]/g, '') === w);
    return this.offsets[clip] + hits[nth].s + this.cues.bias;
  }
  start(clip: string): number { return this.offsets[clip]; }
  end(clip: string): number { return this.offsets[clip] + this.cues.clips[clip].duration; }
}

/** Plays the narration clips at their offsets through one AudioContext (the clock's master). */
export class Narration {
  readonly ctx = new AudioContext({ latencyHint: 'interactive' });
  private buffers = new Map<string, AudioBuffer>();
  private live = new Set<AudioBufferSourceNode>();
  private cues: CueSheet; private base: string;
  constructor(cues: CueSheet, base: string) { this.cues = cues; this.base = base; }
  async load(): Promise<void> {
    const ext = new Audio().canPlayType('audio/ogg; codecs=opus') ? '.opus' : '.m4a';
    await Promise.all(Object.entries(this.cues.clips).map(async ([id, c]) => {
      const res = await fetch(this.base + c.src + ext);
      this.buffers.set(id, await this.ctx.decodeAudioData(await res.arrayBuffer()));
    }));
  }
  /** Schedule every clip that is not over yet, as if the axis were at `from`. */
  play(offsets: Record<string, number>, from: number): void {
    this.stop();
    const now = this.ctx.currentTime + 0.02;
    for (const [id, at] of Object.entries(offsets)) {
      const buf = this.buffers.get(id); if (!buf || from >= at + buf.duration) continue;
      const s = new AudioBufferSourceNode(this.ctx, { buffer: buf });
      s.connect(this.ctx.destination); this.live.add(s); s.onended = () => this.live.delete(s);
      s.start(now + Math.max(0, at - from), Math.max(0, from - at));
    }
  }
  stop(): void { this.live.forEach((s) => { s.onended = null; try { s.stop(); } catch { /* already stopped */ } }); this.live.clear(); }
}
