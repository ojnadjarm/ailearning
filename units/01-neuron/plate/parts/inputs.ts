import * as THREE from 'three';
import { Ink, Z } from '../ink';
import { hatch, rect } from '../../../../src/kit/cutaway/geom';
import { Pipe } from './glass';
import { MiniTube } from './minitube';
import { PlateMark, ROMAN } from './platemark';
import type { Part } from '../../../../src/kit/cutaway/parts/part';
import { feeds, type InputsSpec } from '../../unit/layout';

/** The input panel: a rack of four set cards (numeral, inputs 1 and 2 as small tubes); one set is loaded and feeds the dials, the others' outlets are capped. */
export class InputPanel implements Part {
  readonly root = new THREE.Group();
  private tubes: [MiniTube, MiniTube][];
  private marks: PlateMark[];
  private pipes: [Pipe, Pipe][];
  private caps: THREE.Group[];
  private rims: THREE.Object3D[];
  constructor(ink: Ink, f: InputsSpec, rows: [number, number], dx: number) {
    const g = this.root, top = f.ys[0] + f.h / 2 + 12, bot = f.ys[3] - f.h / 2 - 12, ox = f.tubeX + f.tubeLen / 2 + 8;
    g.add(ink.shape([f.x0, bot, f.x1, bot, f.x1, top, f.x0, top], ink.fill('paper'), Z.part - 0.2));
    const cards = f.ys.map((y) => [f.x0 + 8, y - f.h / 2, f.x1 - 8, y + f.h / 2] as const);
    const cut = (x: number, y: number): boolean => !cards.some(([a, b, c, d]) => x > a - 2 && x < c + 2 && y > b - 2 && y < d + 2);
    g.add(ink.segs(hatch(cut, [f.x0, bot, f.x1, top], 3.4), ink.line('hatch', 'hair'), Z.part - 0.1));
    g.add(ink.segs(rect(f.x0, bot, f.x1, top), ink.line('ink', 'med'), Z.line));
    this.rims = [];
    for (const [a, b, c, d] of cards) {
      g.add(ink.shape([a, b, c, b, c, d, a, d], ink.fill('paper'), Z.part));
      g.add(ink.segs(rect(a, b, c, d), ink.line('ink', 'thin'), Z.line));
      const rim = ink.segs(rect(a + 4, b + 4, c - 4, d - 4), ink.line('signal', 'thin'), Z.line);
      this.rims.push(rim); g.add(rim);
    }
    this.marks = f.ys.map((y, k) => new PlateMark(ink, f.markX, y, ROMAN[k], 'box', 28));
    this.tubes = f.ys.map((y) => [new MiniTube(ink, f.tubeX, y + f.dy, f.tubeLen, 9), new MiniTube(ink, f.tubeX, y - f.dy, f.tubeLen, 9)]);
    this.pipes = f.ys.map((_, k) => feeds(f, k, rows, dx).map((p) => new Pipe(ink, p)) as [Pipe, Pipe]);
    this.caps = f.ys.map((y) => {
      const c = new THREE.Group();
      for (const v of [y + f.dy, y - f.dy]) {
        c.add(ink.segs([ox, v + 5, ox + 14, v + 5, ox, v - 5, ox + 14, v - 5], ink.line('ink', 'thin'), Z.line));
        c.add(ink.shape([ox + 14, v - 9, ox + 19, v - 9, ox + 19, v + 9, ox + 14, v + 9], ink.fill('ink'), Z.part + 0.2));
      }
      return c;
    });
    for (const p of [...this.marks, ...this.tubes.flat(), ...this.pipes.flat()]) g.add(p.root);
    g.add(...this.caps);
  }
  /** `on` shows the panel; `sets` are the four input pairs; set `sel` is loaded and its pipes flow at `flow`. */
  set(on: number, sets: [number, number][], sel: number, flow: number, dt: number, run: boolean): void {
    this.root.visible = on > 0.5;
    if (!this.root.visible) return;
    sets.forEach(([a, b], k) => {
      const lit = k === sel;
      this.tubes[k][0].set(a); this.tubes[k][1].set(b);
      this.marks[k].pose(lit);
      this.rims[k].visible = lit;
      this.pipes[k].forEach((p, i) => { p.root.visible = lit; p.update((i ? b : a) * flow, dt, 0.8, run); });
      this.caps[k].visible = !lit;
    });
  }
}
