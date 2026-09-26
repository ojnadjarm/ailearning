import * as THREE from 'three';
import type { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { Ink, Z, FONT } from '../ink';
import { circle, partial, polyline } from '../../../../src/kit/cutaway/geom';
import { clamp01 } from './text';
import { caption } from './sheet';
import type { Part } from '../../../../src/kit/cutaway/parts/part';

type Spec = { x0: number; y0: number; x1: number; y1: number; max: number };

/** Fig. 5: one neuron's output drawn against its first input (a line that bends once), and pencil marks that need two bends. */
export class BendGraph implements Part {
  readonly root = new THREE.Group();
  private line: LineSegments2;
  private pts: number[] = [];
  private marks: THREE.Group[] = [];
  private key = '';
  constructor(private ink: Ink, private f: Spec, curve: (x: number) => number, ghosts: [number, number][]) {
    const { x0, y0, x1, y1, max } = f, tk: number[] = [];
    for (let v = 0; v <= max; v++) tk.push(this.x(v), y0, this.x(v), y0 - 8, x0, this.y(v), x0 - 8, this.y(v));
    for (let i = 0; i <= 60; i++) { const v = (max * i) / 60; this.pts.push(this.x(v), this.y(Math.min(max, curve(v)))); }
    this.line = ink.segs([], ink.line('signal', 3.2), Z.live);
    const t = ink.text(x1 - x0 + 120, y1 - y0 + 80, (c, th) => {
      c.fillStyle = th.inkSoft; c.font = `500 15px ${FONT.mono}`; c.textAlign = 'center'; c.textBaseline = 'top';
      for (let v = 0; v <= max; v++) c.fillText(String(v), 60 + this.x(v) - x0, 40 + y1 - y0 + 12);
      c.textAlign = 'right'; c.textBaseline = 'middle';
      for (let v = 1; v <= max; v++) c.fillText(String(v), 60 - 14, 40 + y1 - this.y(v));
      c.fillStyle = th.ink; c.font = `600 16px ${FONT.label}`; c.letterSpacing = '1.2px';
      c.textAlign = 'right'; c.fillText('INPUT 1', 60 + x1 - x0, 40 + y1 - y0 - 16);
      c.textAlign = 'left'; c.fillText('OUTPUT', 60 + 12, 30);
    }, 0, 0);
    t.mesh.position.set(x0 - 60, y0 - 40, Z.text);
    this.root.add(ink.segs([x0, y0, x1, y0, x0, y0, x0, y1], ink.line('ink', 'thin'), Z.line), ink.segs(tk, ink.line('ink', 'hair'), Z.line), this.line, t.mesh);
    for (const [gx, gy] of ghosts) {
      const g = new THREE.Group(), x = this.x(gx), y = this.y(gy);
      g.add(ink.segs([...circle(x, y, 11, 24), x - 7, y - 7, x + 7, y + 7, x - 7, y + 7, x + 7, y - 7], ink.line('pencil', 'thin'), Z.callout));
      this.marks.push(g); this.root.add(g);
    }
    this.root.add(caption(ink, 'Fig. 5.', x0 - 60, y0 - 110));
    this.set(0, 0);
  }
  private x(v: number): number { return this.f.x0 + (v / this.f.max) * (this.f.x1 - this.f.x0); }
  private y(v: number): number { return this.f.y0 + (v / this.f.max) * (this.f.y1 - this.f.y0); }
  /** `p` draws the axes then the line in; `m` draws the pencil marks one after another. */
  set(p: number, m: number): void {
    const key = `${p.toFixed(3)}|${m.toFixed(2)}`;
    if (key === this.key) return;
    this.key = key;
    this.root.visible = p > 0.001;
    this.ink.setSegs(this.line, polyline(partial(this.pts, clamp01((p - 0.2) / 0.8))));
    this.marks.forEach((g, i) => { g.visible = m * this.marks.length > i + 0.2; });
  }
}
