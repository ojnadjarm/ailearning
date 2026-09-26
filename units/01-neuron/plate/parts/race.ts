import * as THREE from 'three';
import { Ink } from '../ink';
import { TitleTally, type TallySpec, type TallyView } from './readout';
import type { Part } from '../../../../src/kit/cutaway/parts/part';

/** The tuning tally under Fig. 6's gauges: the step, each example's miss, the total, the goal or the floor once found. */
export type RaceView = TallyView;

/** The tally block: a riveted title block with STEP on a drum counter, the GOAL and TOTAL MISS (`TitleTally`). */
export class RaceBlock implements Part {
  readonly root = new THREE.Group();
  private tally: TitleTally;
  constructor(ink: Ink, f: TallySpec) {
    this.tally = new TitleTally(ink, f);
    this.root.add(this.tally.root);
    this.root.visible = false;
  }
  set(on: number, r: RaceView | null): void {
    this.root.visible = on > 0.5 && !!r;
    if (r && this.root.visible) this.tally.set(r);
  }
}
