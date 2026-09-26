import * as THREE from 'three';
import { Ink } from '../ink';
import { Gauge } from './meters';
import { LiveText } from './text';
import { caption } from './sheet';
import { PlateMark, ROMAN } from './platemark';
import { DataPlate, type CellSpec, type PlateSpec } from './readout';
import type { Part } from '../../../../src/kit/cutaway/parts/part';
import type { ColorRole } from '../theme';

/**
 * One slot of Fig. 6: a small gauge (the needle, a grey needle where it was, the brass mark) or none, a title (with its set's boxed numeral
 * when `mark`, ringed when `lit`), and a riveted data plate under the gauge: an example's `read` (IN, TARGET and OUT in cells, the miss on
 * its own line) or a reference plate's `plate` (its own cells and foot line). `rows` is the same working as text, for the side column.
 */
export interface SlotView { title: string; rows: string[]; read?: { in: string; target: string; miss: string; out: string }; plate?: RefPlate; out: number | null; ghost?: number | null; t?: number | null; mark?: boolean; lit?: boolean; hit?: boolean }
/** A reference plate's readout: five cells, then the foot line's label, value and the value's colour. */
export interface RefPlate { cells: CellSpec[]; values: string[]; foot: string; value: string; role: ColorRole }
type Spec = { slots: [number, number][]; r: number; caption: [number, number]; plate: PlateSpec; ref: PlateSpec };
/** The reference plate's cells as first drawn (each view relabels them). */
const REF: CellSpec[] = [{ label: 'IN', role: 'signal' }, { label: 'DIAL 1', role: 'weight' }, { label: 'DIAL 2', role: 'weight' }, { label: 'TARGET', role: 'targetInk' }, { label: 'OUT', role: 'signal' }];
/** The slot a contrast pair's reference plate uses. */
const REF_SLOT = 4;
/** The title's height over a gauge's centre, above the target mark. */
const TITLE = 60;

/** Fig. 6, beside Fig. 1 while the bench needs it: a contrast pair's other plate, or the examples one setting must serve, each with its data plate. */
export class Fig6 implements Part {
  readonly root = new THREE.Group();
  private gauges: Gauge[];
  private groups: THREE.Group[] = [];
  private titles: LiveText[];
  private marks: PlateMark[];
  private plates: DataPlate[];
  private at: [number, number][];
  constructor(ink: Ink, f: Spec) {
    this.gauges = f.slots.map(([x, y]) => new Gauge(ink, x, y, f.r, 5, true));
    this.plates = f.slots.map(([x, y], i) => (i === REF_SLOT
      ? new DataPlate(ink, x, y - f.r - 12 - f.ref.gap, REF, 'targetInk', f.ref)
      : new DataPlate(ink, x, y - f.r - 12 - f.plate.gap, [{ label: 'IN', role: 'signal' }, { label: 'TARGET', role: 'targetInk' }, { label: 'OUT', role: 'signal' }], 'targetInk', f.plate)));
    this.titles = f.slots.map(([x, y]) => new LiveText(ink, 300, 28, [x, y + f.r + TITLE], { size: 19, role: 'ink', weight: 600, spacing: 0.08 }));
    this.at = f.slots.map(([x, y]) => [x, y + f.r + TITLE]);
    this.marks = f.slots.slice(0, 4).map(([x, y], i) => new PlateMark(ink, x + 52, y + f.r + TITLE, ROMAN[i], 'box', 28));
    f.slots.forEach((_, i) => {
      const g = new THREE.Group();
      g.add(this.gauges[i].root, this.plates[i].root, this.titles[i].root);
      if (this.marks[i]) g.add(this.marks[i].root);
      this.groups.push(g); this.root.add(g);
    });
    this.root.add(caption(ink, 'Fig. 6.', ...f.caption));
    this.set(0, []);
  }
  /** `on` shows the figure; `slots[i]` fills slot i (null leaves it empty). */
  set(on: number, slots: (SlotView | null)[]): void {
    this.root.visible = on > 0.5;
    if (!this.root.visible) return;
    this.groups.forEach((g, i) => {
      const v = slots[i];
      g.visible = !!v;
      if (!v) return;
      const gauge = this.gauges[i], read = v.read;
      gauge.root.visible = v.out !== null;
      if (v.out !== null) { gauge.set(v.out); gauge.ghost(v.ghost ?? null); gauge.setTarget(v.t ?? 0, v.t === null || v.t === undefined ? 0 : 0.7, 0); }
      this.plates[i].root.visible = !!(read || v.plate);
      if (read) this.plates[i].set([read.in, read.target, read.out], read.miss);
      else if (v.plate) this.plates[i].set(v.plate.values, v.plate.value, v.plate.cells, v.plate.foot, v.plate.role);
      const m = this.marks[i];
      if (m) { m.root.visible = !!v.mark; m.pose(!!v.lit); }
      this.titles[i].move(this.at[i][0] - (v.mark ? 22 : 0), this.at[i][1]);
      this.titles[i].set(v.title);
    });
  }
}
