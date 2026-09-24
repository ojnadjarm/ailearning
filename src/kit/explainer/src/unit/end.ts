import type { Beat } from './beats';
import type { Director } from './director';

/** Last beat: the end card; replay goes back to the watch. */
export class EndBeat<S extends object> implements Beat {
  readonly label: string;
  private d: Director<S>; private onEnter?: (d: Director<S>) => void; private replay: string;
  constructor(d: Director<S>, label: string, onEnter?: (d: Director<S>) => void, replay = 'watch') { this.d = d; this.label = label; this.onEnter = onEnter; this.replay = replay; }
  enter(): void { this.onEnter?.(this.d); this.d.events.emit({ type: 'complete', beat: 'unit' }); this.d.shell.end(() => this.d.go(this.replay)); }
  update(): void {}
  exit(): void {}
}
