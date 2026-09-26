import * as THREE from 'three';
import type { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { Ink, Z } from '../ink';
import { polyline } from '../../../../src/kit/cutaway/geom';
import { clamp01 } from './text';
import type { Part } from '../../../../src/kit/cutaway/parts/part';

/** A point at rotation a (CCW from up) and radius r around (cx, cy). */
const at = (cx: number, cy: number, r: number, a: number): [number, number] => [cx - r * Math.sin(a), cy + r * Math.cos(a)];

/** The miss drawn as a dimension on the gauge: an arc from the needle to the brass mark, the arrow pointing at the mark (its direction is the sign). */
export class MissArc implements Part {
  readonly root = new THREE.Group();
  private arc: LineSegments2;
  private ext: LineSegments2;
  private head: THREE.Mesh;
  private key = '';
  constructor(private ink: Ink, private cx: number, private cy: number, private R: number, private angleOf: (v: number) => number) {
    this.arc = ink.segs([], ink.line('targetInk', 'thin'), Z.callout);
    this.ext = ink.segs([], ink.line('targetInk', 'hair'), Z.callout);
    this.head = ink.shape([0, 0, -15, 5.5, -15, -5.5], ink.fill('targetInk'), Z.callout + 0.1);
    this.root.add(this.arc, this.ext, this.head);
    this.set(0, 0, 0);
  }
  /** `p` draws it in; `out` and `t` are the needle and the mark. */
  set(p: number, out: number, t: number): void {
    const key = `${p.toFixed(3)}|${out.toFixed(3)}|${t.toFixed(3)}`;
    if (key === this.key) return;
    this.key = key;
    this.root.visible = p > 0.001;
    const { cx, cy, R } = this, a0 = this.angleOf(out), a1 = this.angleOf(t), f = clamp01(p / 0.7);
    const ext = [...at(cx, cy, R - 12, a0), ...at(cx, cy, R + 12, a0)];
    this.ink.setSegs(this.ext, ext);
    const span = a1 - a0, n = Math.max(2, Math.ceil(Math.abs(span) * 40)), pts: number[] = [];
    for (let i = 0; i <= n; i++) pts.push(...at(cx, cy, R, a0 + (span * f * i) / n));
    const flat = Math.abs(span) < 0.02;
    this.ink.setSegs(this.arc, flat ? [] : polyline(pts));
    const [hx, hy] = at(cx, cy, R, a0 + span * f), s = Math.sign(span);
    this.head.visible = !flat && f > 0.2;
    this.head.position.set(hx, hy, Z.callout + 0.1);
    this.head.rotation.z = a0 + span * f + (s > 0 ? Math.PI : 0);
  }
}
