import * as THREE from 'three';
import type { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { Ink, Z } from '../ink';
import { hatch, rect } from '../../../../src/kit/cutaway/geom';
import type { Part } from '../../../../src/kit/cutaway/parts/part';

/** A small glass tube in section holding an input as a length of blue liquid, with capped ends and a 0–max tick scale under it. */
export class MiniTube implements Part {
  readonly root = new THREE.Group();
  private liquid: THREE.Mesh;
  private meniscus: LineSegments2;
  private inner: number;
  constructor(ink: Ink, cx: number, cy: number, readonly len: number, readonly r = 10, readonly max = 3) {
    const x0 = cx - len / 2, x1 = cx + len / 2, ri = r - 3, g = this.root;
    this.inner = len - 2;
    g.add(ink.shape([x0, cy - ri, x1, cy - ri, x1, cy + ri, x0, cy + ri], ink.fill('glass'), Z.fill));
    this.liquid = new THREE.Mesh(new THREE.PlaneGeometry(1, 2 * ri).translate(0.5, 0, 0), ink.fill('signal'));
    this.liquid.position.set(x0 + 1, cy, Z.live);
    this.meniscus = ink.segs([0, -ri, 0, ri], ink.line('ink', 'thin'), Z.line);
    this.meniscus.position.y = cy;
    g.add(this.liquid, this.meniscus);
    g.add(ink.segs([...hatch(() => true, [x0, cy + ri, x1, cy + r], 3.2), ...hatch(() => true, [x0, cy - r, x1, cy - ri], 3.2)], ink.line('hatch', 'hair'), Z.hatch));
    g.add(ink.segs([x0, cy + r, x1, cy + r, x0, cy - r, x1, cy - r], ink.line('ink', 'thin'), Z.line));
    for (const [a, b] of [[x0 - 7, x0 + 1], [x1 - 1, x1 + 7]]) {
      g.add(ink.shape([a, cy - r - 4, b, cy - r - 4, b, cy + r + 4, a, cy + r + 4], ink.fill('paper'), Z.part));
      g.add(ink.segs([...hatch(() => true, [a, cy - r - 4, b, cy + r + 4], 3), ...rect(a, cy - r - 4, b, cy + r + 4)], ink.line('ink', 'hair'), Z.part + 0.1));
    }
    const sy = cy - r - 6, tk: number[] = [x0 + 1, sy, x1 - 1, sy];
    for (let i = 0; i <= max * 2; i++) { const x = x0 + 1 + (this.inner * i) / (max * 2); tk.push(x, sy, x, sy - (i % 2 ? 3 : 6)); }
    g.add(ink.segs(tk, ink.line('ink', 'hair'), Z.line));
  }
  set(v: number): void {
    const w = Math.max(0.001, (this.inner * Math.min(this.max, Math.max(0, v))) / this.max);
    this.liquid.scale.x = w;
    this.meniscus.position.x = this.liquid.position.x + w;
    this.meniscus.visible = v > 0.02;
  }
}
