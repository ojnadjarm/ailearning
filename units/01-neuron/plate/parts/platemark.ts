import * as THREE from 'three';
import type { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { Ink, Z, FONT } from '../ink';
import { circle, rect } from '../../../../src/kit/cutaway/geom';
import type { Part } from '../../../../src/kit/cutaway/parts/part';

export const ROMAN = ['I', 'II', 'III', 'IV'];

/** An engraved plate mark: a Roman numeral in the serif, framed by a double-ruled box or ring so it never reads as a chapter numeral. */
export class PlateMark implements Part {
  readonly root = new THREE.Group();
  private lit: LineSegments2;
  constructor(ink: Ink, x: number, y: number, text: string, shape: 'box' | 'ring' = 'box', size = 30) {
    const h = size / 2, w = shape === 'ring' ? h : Math.max(h, 7 + text.length * size * 0.19), g = this.root;
    const outer = shape === 'ring' ? circle(x, y, h, 64) : rect(x - w, y - h, x + w, y + h);
    const inner = shape === 'ring' ? circle(x, y, h - 3.5, 64) : rect(x - w + 3.5, y - h + 3.5, x + w - 3.5, y + h - 3.5);
    g.add(shape === 'ring' ? ink.disc(x, y, h, ink.fill('paper'), Z.callout - 0.2, 48) : ink.shape([x - w, y - h, x + w, y - h, x + w, y + h, x - w, y + h], ink.fill('paper'), Z.callout - 0.2));
    g.add(ink.segs(outer, ink.line('ink', 'thin'), Z.callout), ink.segs(inner, ink.line('ink', 'hair'), Z.callout));
    const t = ink.text(2 * w, size, (c, th) => {
      c.fillStyle = th.ink; c.font = `400 ${Math.round(size * (text.length > 2 ? 0.56 : 0.64))}px ${FONT.serif}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, w, h + size * 0.04);
    }, 0.5, 0.5);
    t.mesh.position.set(x, y, Z.text);
    this.lit = ink.segs(shape === 'ring' ? circle(x, y, h + 5, 64) : rect(x - w - 5, y - h - 5, x + w + 5, y + h + 5), ink.line('signal', 'thin'), Z.callout);
    this.lit.visible = false;
    g.add(t.mesh, this.lit);
  }
  /** The posed example's mark carries a blue ring. */
  pose(on: boolean): void { this.lit.visible = on; }
}
