import * as THREE from 'three';
import { Ink, Z, FONT, type TextPlate } from '../ink';
import type { ColorRole } from '../theme';
import type { Part } from '../../../../src/kit/cutaway/parts/part';

export const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
/** Plate lettering for numbers: condensed, so a whole row of working fits a note column. */
export const NUM = FONT.label;

/** A line of text whose words can change: it types in with `reveal` and redraws only when the shown characters change; `box` frames it in hairline. */
export class LiveText implements Part {
  readonly root = new THREE.Group();
  private plate: TextPlate;
  private shown = '';
  constructor(private ink: Ink, readonly w: number, readonly h: number, at: [number, number],
    private o: { size: number; role: ColorRole; align?: 0 | 0.5 | 1; weight?: number; font?: string; box?: boolean; spacing?: number }) {
    const ax = o.align ?? 0.5;
    this.plate = ink.text(w, h, (g, th) => {
      if (o.box && this.shown) { g.fillStyle = th.paper; g.fillRect(0, 0, w, h); g.strokeStyle = th.ink; g.lineWidth = 0.9; g.strokeRect(0.5, 0.5, w - 1, h - 1); }
      g.fillStyle = th[o.role]; g.font = `${o.weight ?? 600} ${o.size}px ${o.font ?? NUM}`; g.textBaseline = 'middle';
      g.letterSpacing = `${(o.spacing ?? 0.03) * o.size}px`;
      g.textAlign = ax === 0 ? 'left' : ax === 1 ? 'right' : 'center';
      g.fillText(this.shown, ax === 0 ? (o.box ? 8 : 0) : ax === 1 ? w - (o.box ? 8 : 0) : w / 2, h / 2 + o.size * 0.05);
    }, ax, 0.5);
    this.plate.mesh.position.set(at[0], at[1], Z.text);
    this.plate.mesh.visible = false;
    this.root.add(this.plate.mesh);
  }
  /** Show the first `reveal` fraction of `text`. */
  set(text: string, reveal = 1): void {
    const s = text.slice(0, Math.round(text.length * clamp01(reveal)));
    if (s === this.shown) return;
    this.shown = s;
    this.plate.mesh.visible = s.length > 0;
    this.plate.redraw(this.ink.k, this.ink.theme);
  }
  move(x: number, y: number): void { this.plate.mesh.position.set(x, y, Z.text); }
  /** Draw the text in `role` from now on. */
  tint(role: ColorRole): void {
    if (role === this.o.role) return;
    this.o.role = role;
    this.plate.redraw(this.ink.k, this.ink.theme);
  }
}
