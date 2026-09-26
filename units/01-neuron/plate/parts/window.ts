import * as THREE from 'three';
import type { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { Ink, Z } from '../ink';
import { hatch, partial, polyline, rect } from '../../../../src/kit/cutaway/geom';
import { LiveText, clamp01 } from './text';
import type { Part } from '../../../../src/kit/cutaway/parts/part';

/** A sight glass on an out-pipe: a flanged window that shows the product flowing through it as a number. */
export class ProductWindow implements Part {
  readonly root = new THREE.Group();
  private outline: LineSegments2;
  private pts: number[];
  private body = new THREE.Group();
  private text: LiveText;
  private last = -1;
  constructor(private ink: Ink, cx: number, cy: number, w: number, h: number) {
    const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2;
    this.pts = [cx, y1, x0, y1, x0, y0, x1, y0, x1, y1, cx, y1];
    this.body.add(ink.shape([x0, y0, x1, y0, x1, y1, x0, y1], ink.fill('glass'), Z.top));
    const band = (x: number): number[] => hatch(() => true, [x, y0 - 5, x + 7, y1 + 5], 3.2);
    this.body.add(ink.segs([...band(x0 - 7), ...band(x1)], ink.line('hatch', 'hair'), Z.top + 0.1));
    this.body.add(ink.segs([...rect(x0 - 7, y0 - 5, x0, y1 + 5), ...rect(x1, y0 - 5, x1 + 7, y1 + 5)], ink.line('ink', 'thin'), Z.top + 0.2));
    this.outline = ink.segs([], ink.line('ink', 'thin'), Z.top + 0.2);
    this.text = new LiveText(ink, w - 6, h - 4, [cx, cy], { size: 21, role: 'ink' });
    this.root.add(this.body, this.outline, this.text.root);
    this.set(0, '', 0);
  }
  /** `p` draws the glass in; `value` shows once `tag` reveals it. */
  set(p: number, value: string, tag: number): void {
    if (p !== this.last) {
      this.last = p;
      this.root.visible = p > 0.001;
      this.ink.setSegs(this.outline, polyline(partial(this.pts, clamp01(p / 0.7))));
      this.body.visible = p > 0.4;
    }
    this.text.set(value, tag);
  }
}
