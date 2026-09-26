/** Fig. 6's ripple while tuning: when the key (the dials' detents) changes, slot `first` takes its new reading at once and every other slot `gap` s (or this run's `gap`) after the one before, I to IV. */
export class Ripple<T> {
  private key = '';
  private shown: T[] = [];
  private due: number[] = [];
  private t = 0;
  constructor(private gap = 0.08) {}
  /** The readings to draw now, and whether every slot has caught up. */
  run(key: string, fresh: T[], first: number, dt: number, instant: boolean, gap = this.gap): { slots: T[]; settled: boolean } {
    this.t += dt;
    if (key !== this.key) {
      if (this.key && !instant) [first, ...fresh.map((_, i) => i).filter((i) => i !== first)].forEach((i, r) => { this.due[i] = this.t + r * gap; });
      this.key = key;
    }
    const slots = fresh.map((f, i) => (this.t >= (this.due[i] ?? 0) || this.shown[i] === undefined ? (this.shown[i] = f) : this.shown[i]));
    return { slots, settled: this.due.every((d) => this.t >= d) };
  }
}
