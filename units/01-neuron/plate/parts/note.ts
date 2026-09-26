import * as THREE from 'three';
import type { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { Ink, Z, FONT, type TextPlate } from '../ink';
import { partial, polyline } from '../../../../src/kit/cutaway/geom';
import { NUM, clamp01 } from './text';
import type { Part } from '../../../../src/kit/cutaway/parts/part';

const HEAD = 34;

/** The NOTE block: the working written out, one row per step, each row typing in as the voice reaches it; the newest row is inked heavier and a long row is set smaller to fit. */
export class NoteBlock implements Part {
  readonly root = new THREE.Group();
  private frame: LineSegments2;
  private pts: number[];
  private plate: TextPlate;
  private key = '';
  private rows: string[] = [];
  private shown = 0;
  private mode = 0;
  private last = -1;
  constructor(private ink: Ink, private box: { x0: number; y0: number; x1: number; y1: number; row: number; size: number; titles: readonly string[] }) {
    const { x0, y0, x1, y1 } = box, w = x1 - x0, h = y1 - y0;
    this.pts = [x0, y1, x1, y1, x1, y0, x0, y0, x0, y1];
    this.root.add(ink.shape([x0, y0, x1, y0, x1, y1, x0, y1], ink.fill('paper'), Z.fill));
    this.frame = ink.segs([], ink.line('ink', 'thin'), Z.line);
    this.plate = ink.text(w, h, (g, th) => this.paint(g, th, w), 0, 1);
    this.plate.mesh.position.set(x0, y1, Z.text);
    this.root.add(this.frame, this.plate.mesh);
    this.set(0, [], 0, 0);
  }

  private paint(g: CanvasRenderingContext2D, th: import('../theme').Theme, w: number): void {
    if (this.last <= 0.4) return;
    const { row, size } = this.box;
    g.strokeStyle = th.ink; g.lineWidth = 0.8; g.beginPath(); g.moveTo(0, HEAD); g.lineTo(w, HEAD); g.stroke();
    g.fillStyle = th.inkSoft; g.font = `500 13px ${FONT.mono}`; g.letterSpacing = '1.6px'; g.textBaseline = 'middle';
    g.fillText(this.box.titles[this.mode] ?? this.box.titles[0], 14, HEAD / 2 + 1);
    g.letterSpacing = '0.4px';
    const top = Math.floor(this.shown - 1e-6);
    this.rows.forEach((r, i) => {
      const n = Math.round(r.length * clamp01(this.shown - i));
      if (!n) return;
      const text = r.replace(/^E2 /, ''), wt = i === top ? 600 : 500;
      g.fillStyle = i === top ? th.ink : th.inkSoft;
      g.font = `${wt} ${size}px ${NUM}`;
      const fit = Math.min(1, (w - 28) / g.measureText(text).width);
      if (fit < 1) g.font = `${wt} ${(size * fit).toFixed(2)}px ${NUM}`;
      g.fillText(text.slice(0, n), 14, HEAD + row * (i + 0.5) + 8);
    });
  }

  /** `p` draws the frame in; `rows` are the working, `shown` how many have typed in; `mode` names the working in the head. */
  set(p: number, rows: string[], shown: number, mode: number): void {
    if (p !== this.last) {
      this.last = p;
      this.root.visible = p > 0.001;
      this.ink.setSegs(this.frame, polyline(partial(this.pts, clamp01(p / 0.6))));
      this.plate.mesh.visible = p > 0.4;
    }
    const key = `${p > 0.4}|${mode}|${shown.toFixed(2)}|${rows.join('\n')}`;
    if (key === this.key) return;
    this.key = key; this.rows = rows; this.shown = shown; this.mode = mode;
    this.plate.redraw(this.ink.k, this.ink.theme);
  }
}
