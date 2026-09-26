import * as THREE from 'three';
import type { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { Ink, Z, FONT } from '../ink';
import { partial, polyline } from '../../../../src/kit/cutaway/geom';
import { clamp01 } from './text';
import { caption } from './sheet';
import type { Part } from '../../../../src/kit/cutaway/parts/part';

type Spec = { x0: number; y0: number; x1: number; y1: number; min: number; max: number };
const PAD = 26;

/** Fig. 4: the valve drawn as a graph, the sum along the bottom and the output up the side; one bend at zero, and a dot at the sum now. */
export class ValveGraph implements Part {
  readonly root = new THREE.Group();
  private axes: LineSegments2;
  private line: LineSegments2;
  private drops: LineSegments2;
  private dot: THREE.Mesh;
  private axisPts: number[][];
  private linePts: number[];
  private text: THREE.Mesh;
  private last = '';
  constructor(private ink: Ink, private f: Spec) {
    const { x0, y0, x1, y1, min, max } = f, ox = this.x(0), oy = y0 + PAD;
    this.axisPts = [[x0 + PAD - 10, oy, x1 - 6, oy], [ox, oy - 8, ox, y1 - 6]];
    this.linePts = [this.x(min), oy, ox, oy, this.x(Math.min(max, this.top())), this.y(Math.min(max, this.top()))];
    const tk: number[] = [];
    for (let v = min; v <= max; v++) tk.push(this.x(v), oy, this.x(v), oy - 6);
    for (let v = 1; v <= this.top(); v++) tk.push(ox, this.y(v), ox - 6, this.y(v));
    this.axes = ink.segs([], ink.line('ink', 'thin'), Z.line);
    this.line = ink.segs([], ink.line('signal', 3.2), Z.live);
    this.drops = ink.segs([], ink.line('signal', 'hair', { dash: [5, 4] }), Z.live - 0.1);
    this.dot = ink.disc(0, 0, 6, ink.fill('signal'), Z.live + 0.2, 24);
    const t = ink.text(x1 - x0, y1 - y0, (c, th) => {
      c.fillStyle = th.inkSoft; c.font = `500 13px ${FONT.mono}`; c.textAlign = 'center'; c.textBaseline = 'top';
      for (let v = min; v <= max; v++) if (v) c.fillText(v > 0 ? `+${v}` : `−${-v}`, this.x(v) - x0, y1 - oy + 10);
      c.textAlign = 'right'; c.textBaseline = 'middle';
      for (let v = 1; v <= this.top(); v++) c.fillText(String(v), ox - x0 - 10, y1 - this.y(v));
      c.fillStyle = th.ink; c.font = `600 13px ${FONT.label}`; c.letterSpacing = '1px';
      c.textAlign = 'right'; c.fillText('SUM', x1 - x0, y1 - oy - 12);
      c.textAlign = 'left'; c.fillText('OUTPUT', ox - x0 + 8, 10);
    }, 0, 0);
    t.mesh.position.set(x0, y0, Z.text);
    this.text = t.mesh;
    this.root.add(ink.segs(tk, ink.line('ink', 'hair'), Z.line), this.axes, this.line, this.drops, this.dot, t.mesh);
    this.root.add(caption(ink, 'Fig. 4.', x0, y1 + 22));
    this.set(0, 0, 0);
  }
  private top(): number { return Math.floor((this.f.y1 - this.f.y0 - 2 * PAD) / ((this.f.x1 - this.f.x0 - 2 * PAD) / (this.f.max - this.f.min))); }
  private x(v: number): number { const { x0, x1, min, max } = this.f; return x0 + PAD + ((v - min) / (max - min)) * (x1 - x0 - 2 * PAD); }
  private y(v: number): number { const { x0, x1, y0, min, max } = this.f; return y0 + PAD + (v * (x1 - x0 - 2 * PAD)) / (max - min); }

  /** `p` draws the axes, then the line, then the dot at (sum, output). */
  set(p: number, sum: number, out: number): void {
    const key = `${p.toFixed(3)}|${sum.toFixed(3)}|${out.toFixed(3)}`;
    if (key === this.last) return;
    this.last = key;
    this.root.visible = p > 0.001;
    const a = clamp01(p / 0.4);
    this.ink.setSegs(this.axes, this.axisPts.flatMap((l) => polyline(partial(l, a))));
    this.ink.setSegs(this.line, polyline(partial(this.linePts, clamp01((p - 0.35) / 0.45))));
    this.text.visible = p > 0.3;
    const s = Math.max(this.f.min, Math.min(this.f.max, sum)), o = Math.min(this.top(), out), on = p > 0.85;
    const px = this.x(s), py = this.y(o), ox = this.x(0), oy = this.f.y0 + PAD;
    this.dot.visible = on;
    this.dot.position.set(px, py, Z.live + 0.2);
    this.ink.setSegs(this.drops, on ? [px, oy, px, py, ox, py, px, py] : []);
  }
}
