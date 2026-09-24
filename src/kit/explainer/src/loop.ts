/** Render on demand: runs `tick` every frame while it reports a draw, then stops after 30 quiet frames (zero idle cost). */
export class OnDemand {
  private raf = 0;
  private idle = 0;
  private last = 0;
  private tick: (dt: number) => boolean;

  /** `tick(dt)` updates state and draws; it returns whether it drew. */
  constructor(tick: (dt: number) => boolean) { this.tick = tick; }

  wake(): void {
    this.idle = 0;
    if (this.raf) return;
    this.last = performance.now();
    const loop = (now: number): void => {
      const dt = Math.min(0.1, Math.max(0, (now - this.last) / 1000)); this.last = now;
      this.idle = this.tick(dt) ? 0 : this.idle + 1;
      this.raf = this.idle > 30 ? 0 : requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }
}

/** Snapshot key of a flat numeric state: draw only when it changes. */
export const stateKey = (s: object): string => Object.values(s).map((v) => (typeof v === 'number' ? v.toFixed(4) : '')).join();
