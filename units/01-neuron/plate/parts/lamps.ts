import * as THREE from 'three';
import { Ink, Z, FONT } from '../ink';
import { circle, hatch, rect } from '../../../../src/kit/cutaway/geom';
import { PlateMark, ROMAN } from './platemark';
import type { Part } from '../../../../src/kit/cutaway/parts/part';

type Spec = { x: number; y: number; w: number; h: number; shaft: number; xs: number[] };

/** One setting, all four: a bar of lamps I–IV under the dials, on a shaft from dial 2; lamp k is filled while target k is met at the setting the dials hold. */
export class LampBar implements Part {
  readonly root = new THREE.Group();
  private fills: THREE.Mesh[];
  constructor(ink: Ink, f: Spec, shaftTop: number) {
    const g = this.root, x0 = f.x - f.w / 2, x1 = f.x + f.w / 2, y0 = f.y - f.h / 2, y1 = f.y + f.h / 2, ly = f.y + 2, sx = f.shaft, cy = (shaftTop + y1) / 2;
    g.add(ink.shape([x0, y0, x1, y0, x1, y1, x0, y1], ink.fill('paper'), Z.fill));
    g.add(ink.segs([...rect(x0, y0, x1, y1), ...rect(x0 + 5, y0 + 5, x1 - 5, y1 - 5)], ink.line('ink', 'med'), Z.line));
    g.add(ink.segs([sx - 4, shaftTop, sx - 4, y1, sx + 4, shaftTop, sx + 4, y1], ink.line('ink', 'thin'), Z.line));
    g.add(ink.shape([sx - 9, cy - 11, sx + 9, cy - 11, sx + 9, cy + 11, sx - 9, cy + 11], ink.fill('paper'), Z.part));
    g.add(ink.segs(hatch(() => true, [sx - 9, cy - 11, sx + 9, cy + 11], 3.2), ink.line('hatch', 'hair'), Z.part + 0.1));
    g.add(ink.segs(rect(sx - 9, cy - 11, sx + 9, cy + 11), ink.line('ink', 'thin'), Z.line));
    const head = ink.text(f.w, 30, (c, th) => {
      c.fillStyle = th.ink; c.font = `600 21px ${FONT.label}`; c.letterSpacing = '2.5px'; c.textBaseline = 'middle'; c.textAlign = 'center'; c.fillText('ONE SETTING · ALL FOUR', f.w / 2, 15);
    }, 0.5, 0.5);
    head.mesh.position.set(f.x, y1 - 26, Z.text);
    g.add(head.mesh);
    this.fills = f.xs.map((dx, k) => {
      const x = f.x + dx, r = 18, d = r * 0.7;
      const fill = ink.disc(x, ly, r - 1, ink.fill('target'), Z.live, 32);
      g.add(fill, ink.segs([...circle(x, ly, r, 48), x - d, ly - d, x + d, ly + d, x - d, ly + d, x + d, ly - d], ink.line('ink', 'thin'), Z.line));
      g.add(new PlateMark(ink, x, ly - 42, ROMAN[k], 'box', 26).root);
      return fill;
    });
  }
  /** `on` shows the bar; `met[k]` fills lamp k. */
  set(on: number, met: boolean[]): void {
    this.root.visible = on > 0.5;
    this.fills.forEach((m, k) => { m.visible = !!met[k]; });
  }
}
