import type { Beat } from 'explainer-kit';
import { base, ease, type D } from './bench/common';
import { FIG5_LINE } from './layout';

/** The closing chapter, "What one neuron can't do": the payoff line, Fig. 5 draws one neuron's bent line, then the marks it cannot meet; a closing line names the next sheet, then the end card opens. */
export class ClickBeat implements Beat {
  readonly label = "What one neuron can't do";
  private t = 0;
  private marks: Record<string, number> = {};
  private d: D;
  constructor(d: D) { this.d = d; }
  enter(): void {
    const d = this.d;
    this.t = 0;
    this.marks = d.bundle.cues.clips.payoff?.marks ?? {};
    base(d, { x1: 2, x2: FIG5_LINE.x2, w1: FIG5_LINE.w[0], w2: FIG5_LINE.w[1], markOn: 0, noteRows: 4, fig5: 0, fig5m: 0 }, 'wide', 'fig5');
    d.hands.forEach((h) => { h.enabled = false; });
    void this.play();
  }
  private async play(): Promise<void> {
    const d = this.d;
    if (!(await d.say('payoff'))) return;
    ease(d, { fig5: 1, fig5m: 1 });
    if (await d.say('close')) this.done();
  }
  private done(): void { this.d.events.emit({ type: 'complete', beat: 'click' }); this.d.go('end'); }
  where(): string { return "what one neuron can't do"; }
  back(): void { this.d.hush(); this.t = 0; void this.play(); }
  update(dt: number): void {
    const d = this.d;
    this.t += dt * d.rate;
    if (this.t >= (this.marks.line ?? 0) && d.goal.fig5 !== 1) ease(d, { fig5: 1 });
    if (this.t >= (this.marks.marks ?? 0) && d.goal.fig5m !== 1) ease(d, { fig5m: 1 });
  }
  exit(): void { this.d.hush(); }
}
