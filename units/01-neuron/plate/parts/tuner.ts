import * as THREE from 'three';
import type { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { Ink, Z, FONT } from '../ink';
import { hatch, partial, polyline, rect } from '../../../../src/kit/cutaway/geom';
import { LiveText, clamp01 } from './text';
import type { Part } from '../../../../src/kit/cutaway/parts/part';

type Spec = { x: number; y: number; w: number; h: number };

/** The tuner: a housing above the dials with a step counter and a row of step ticks, coupled to the dial shafts by a drive shaft. */
export class TunerBlock implements Part {
  readonly root = new THREE.Group();
  private frame: LineSegments2;
  private framePts: number[];
  private body = new THREE.Group();
  private count: LiveText;
  private ticks: LineSegments2;
  private key = '';
  constructor(private ink: Ink, private f: Spec, shaft: [number, number, number], private steps: number) {
    const x0 = f.x - f.w / 2, x1 = f.x + f.w / 2, y0 = f.y - f.h / 2, y1 = f.y + f.h / 2;
    this.framePts = [x0, y1, x1, y1, x1, y0, x0, y0, x0, y1];
    this.root.add(ink.shape([x0, y0, x1, y0, x1, y1, x0, y1], ink.fill('paper'), Z.fill));
    this.frame = ink.segs([], ink.line('ink', 'med'), Z.line);
    const [sx, sy0, sy1] = shaft, cy = (sy0 + sy1) / 2;
    this.body.add(ink.segs([sx - 4, sy0, sx - 4, sy1, sx + 4, sy0, sx + 4, sy1], ink.line('ink', 'thin'), Z.line));
    this.body.add(ink.shape([sx - 9, cy - 11, sx + 9, cy - 11, sx + 9, cy + 11, sx - 9, cy + 11], ink.fill('paper'), Z.part));
    this.body.add(ink.segs(hatch(() => true, [sx - 9, cy - 11, sx + 9, cy + 11], 3.2), ink.line('hatch', 'hair'), Z.part + 0.1));
    this.body.add(ink.segs(rect(sx - 9, cy - 11, sx + 9, cy + 11), ink.line('ink', 'thin'), Z.line));
    const head = ink.text(f.w, 20, (c, th) => {
      c.fillStyle = th.inkSoft; c.font = `500 12px ${FONT.mono}`; c.letterSpacing = '1.4px'; c.textBaseline = 'middle'; c.textAlign = 'left'; c.fillText('STEP', 12, 10);
      c.textAlign = 'right'; c.fillText(`OF ${steps}`, f.w - 12, 10);
    }, 0, 1);
    head.mesh.position.set(x0, y1 - 6, Z.text);
    this.body.add(head.mesh);
    this.count = new LiveText(ink, f.w - 24, 34, [f.x, f.y + 2], { size: 30, role: 'ink', font: FONT.label });
    this.ticks = ink.segs([], ink.line('weight', 2), Z.live);
    const all: number[] = [];
    for (let i = 1; i <= steps; i++) { const x = this.tickX(i); all.push(x, y0 + 8, x, y0 + 16); }
    this.body.add(ink.segs(all, ink.line('ink', 'hair'), Z.line), this.ticks, this.count.root);
    this.root.add(this.frame, this.body);
    this.set(0, 0);
  }
  private tickX(i: number): number { const x0 = this.f.x - this.f.w / 2 + 12; return x0 + ((i - 0.5) * (this.f.w - 24)) / this.steps; }

  /** `p` draws the housing in; `step` is the step drawn now (0 before the first). */
  set(p: number, step: number): void {
    const n = Math.round(step), key = `${p.toFixed(3)}|${n}`;
    if (key === this.key) return;
    this.key = key;
    this.root.visible = p > 0.001;
    this.ink.setSegs(this.frame, polyline(partial(this.framePts, clamp01(p / 0.6))));
    this.body.visible = p > 0.5;
    const y0 = this.f.y - this.f.h / 2, on: number[] = [];
    for (let i = 1; i <= n; i++) { const x = this.tickX(i); on.push(x, y0 + 7, x, y0 + 17); }
    this.ink.setSegs(this.ticks, on);
    this.count.set(String(n), (p - 0.5) / 0.5);
  }
}
