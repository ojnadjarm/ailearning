import type { UnitBundle } from '../content/types';

export type Earcon = 'detent' | 'lever' | 'engrave';

/** What the director needs from a voice: schedule the watch clips, play one line, stop, earcons. */
export interface Voice {
  readonly ctx: AudioContext | null;
  playWatch(offsets: Record<string, number>, from: number): void;
  line(id: string): Promise<void>;
  stop(): void;
  speaking(): boolean;
  fx(kind: Earcon, gain?: number): void;
}

/** Web Audio voice: one context, a voice bus and an effects bus 10 dB under it. */
export class VoicePlayer implements Voice {
  readonly ctx: AudioContext;
  private voiceBus: GainNode; private fxBus: GainNode;
  private buffers = new Map<string, AudioBuffer>();
  private live = new Set<AudioBufferSourceNode>();
  private lastFx = 0;
  private bundle: UnitBundle;
  constructor(bundle: UnitBundle) {
    this.bundle = bundle;
    this.ctx = new AudioContext({ latencyHint: 'interactive' });
    this.voiceBus = new GainNode(this.ctx, { gain: 1 }); this.voiceBus.connect(this.ctx.destination);
    this.fxBus = new GainNode(this.ctx, { gain: 0.32 }); this.fxBus.connect(this.ctx.destination);
  }
  /** Decode clips (Opus where the browser plays it, AAC otherwise); already loaded ids are skipped. */
  async load(ids: string[] = Object.keys(this.bundle.cues.clips)): Promise<void> {
    const ext = new Audio().canPlayType('audio/ogg; codecs=opus') ? '.opus' : '.m4a';
    await Promise.all(ids.filter((id) => !this.buffers.has(id)).map(async (id) => {
      const res = await fetch(this.bundle.base + this.bundle.cues.clips[id].src + ext);
      this.buffers.set(id, await this.ctx.decodeAudioData(await res.arrayBuffer()));
    }));
  }
  private src(id: string): AudioBufferSourceNode {
    const s = new AudioBufferSourceNode(this.ctx, { buffer: this.buffers.get(id)! });
    s.connect(this.voiceBus); this.live.add(s); s.onended = () => this.live.delete(s);
    return s;
  }
  /** Schedule every clip that is not over yet, as if the axis were at `from`. */
  playWatch(offsets: Record<string, number>, from: number): void {
    this.stop();
    const now = this.ctx.currentTime + 0.02;
    for (const [id, at] of Object.entries(offsets)) {
      const buf = this.buffers.get(id); if (!buf || from >= at + buf.duration) continue;
      this.src(id).start(now + Math.max(0, at - from), Math.max(0, from - at));
    }
  }
  line(id: string): Promise<void> {
    return this.load([id]).then(() => new Promise((res) => { const s = this.src(id); s.addEventListener('ended', () => res()); s.start(); }));
  }
  stop(): void { this.live.forEach((s) => { s.onended = null; try { s.stop(); } catch { /* already stopped */ } }); this.live.clear(); }
  speaking(): boolean { return this.live.size > 0; }
  /** Soft synthesized earcons: no transients (30 ms attack), low level, at most one per 35 ms. */
  fx(kind: Earcon, gain = 1): void {
    const t = this.ctx.currentTime;
    if (t - this.lastFx < 0.035) return;
    this.lastFx = t;
    const o = new OscillatorNode(this.ctx, { type: 'sine', frequency: kind === 'detent' ? 190 : kind === 'lever' ? 110 : 520 });
    const o2 = new OscillatorNode(this.ctx, { type: 'sine', frequency: kind === 'detent' ? 570 : kind === 'lever' ? 165 : 1040 });
    const g = new GainNode(this.ctx, { gain: 0 }); const g2 = new GainNode(this.ctx, { gain: 0.25 });
    const len = kind === 'engrave' ? 0.34 : kind === 'lever' ? 0.3 : 0.12;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.5 * gain, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g); o2.connect(g2).connect(g); g.connect(this.fxBus);
    o.start(t); o2.start(t); o.stop(t + len + 0.02); o2.stop(t + len + 0.02);
  }
}

/** Null Object for muted runs, frozen frames and tests: records what would play. */
export class NullVoice implements Voice {
  readonly ctx = null;
  log: { id: string; at: number; from: number }[] = [];
  playWatch(offsets: Record<string, number>, from: number): void { for (const [id, at] of Object.entries(offsets)) this.log.push({ id, at, from }); }
  line(id: string): Promise<void> { this.log.push({ id, at: -1, from: 0 }); return Promise.resolve(); }
  stop(): void {}
  speaking(): boolean { return false; }
  fx(): void {}
}
