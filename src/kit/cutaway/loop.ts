/** Render on demand: runs `tick` every frame while it reports a change, then stops after 30 quiet frames (zero idle cost). */
export class OnDemand {
  private raf = 0;
  private idle = 0;
  private last = 0;
  private dirty = true;
  onFrame: (ms: number) => void = () => undefined;

  /** `tick(dt, force)` updates state and draws; it returns whether it drew. */
  constructor(private tick: (dt: number, force: boolean) => boolean) {}

  /** Start (or keep) the loop; `redraw` forces one draw even if nothing changed (resize, theme). */
  wake(redraw = false): void {
    if (redraw) this.dirty = true;
    this.idle = 0;
    if (this.raf) return;
    this.last = performance.now();
    const loop = (now: number): void => {
      const dt = Math.min(0.1, Math.max(0, (now - this.last) / 1000)); this.last = now;
      const t0 = performance.now(), force = this.dirty;
      this.dirty = false;
      const drew = this.tick(dt, force);
      if (drew) this.onFrame(performance.now() - t0);
      this.idle = drew ? 0 : this.idle + 1;
      this.raf = this.idle > 30 ? 0 : requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }
}

/** Snapshot key of a flat numeric state: draw only when it changes. */
export const stateKey = (s: object): string => Object.values(s).map((v) => (typeof v === 'number' ? v.toFixed(4) : '')).join();
