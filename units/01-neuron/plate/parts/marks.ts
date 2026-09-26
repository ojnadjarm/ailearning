import * as THREE from 'three';
import type { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { Ink, Z } from '../ink';
import { arcPts, circle, hatch, partial, polyline, rect } from '../../../../src/kit/cutaway/geom';
import { LiveText, clamp01 } from './text';
import type { Part } from '../../../../src/kit/cutaway/parts/part';

/** Lock pins through the tubes' outlet flanges: a hatched pin and a crossed head, drawn in when the inputs are locked; a head lights when its tube is tried. */
export class LockPins implements Part {
  readonly root = new THREE.Group();
  private pins: THREE.Group[] = [];
  private glows: THREE.MeshBasicMaterial[] = [];
  constructor(ink: Ink, at: [number, number][], h: number) {
    for (const [x, y] of at) {
      const g = new THREE.Group(), y0 = -h / 2, y1 = h / 2, glow = ink.fill('target', { own: true, opacity: 0 });
      g.position.set(x, y, 0);
      g.add(ink.disc(0, y1 + 9, 17, glow, Z.top, 32));
      this.glows.push(glow);
      g.add(ink.shape([-4, y0, 4, y0, 4, y1, -4, y1], ink.fill('paper'), Z.top));
      g.add(ink.segs(hatch(() => true, [-4, y0, 4, y1], 3), ink.line('hatch', 'hair'), Z.top + 0.1));
      g.add(ink.segs(rect(-4, y0, 4, y1), ink.line('ink', 'thin'), Z.top + 0.2));
      g.add(ink.disc(0, y1 + 9, 9, ink.fill('paper'), Z.top + 0.1, 32));
      g.add(ink.segs([...circle(0, y1 + 9, 9, 36), -6.4, y1 + 2.6, 6.4, y1 + 15.4, -6.4, y1 + 15.4, 6.4, y1 + 2.6], ink.line('ink', 'thin'), Z.top + 0.2));
      this.pins.push(g); this.root.add(g);
    }
    this.set(0);
  }
  set(p: number, lit: number[] = []): void {
    this.root.visible = p > 0.001;
    this.pins.forEach((g) => g.scale.set(1, Math.max(0.001, clamp01(p)), 1));
    this.glows.forEach((m, i) => { m.opacity = 0.8 * clamp01(lit[i] ?? 0); });
  }
}

/** One click shown on a dial: the scale segment from 0 to one step, lit in the weight's colour. */
export class ClickNote implements Part {
  readonly root = new THREE.Group();
  private arc: LineSegments2;
  private pts: number[];
  private last = -1;
  constructor(private ink: Ink, cx: number, cy: number, r: number, a1: number) {
    this.pts = arcPts(cx, cy, r, Math.PI / 2, Math.PI / 2 + a1, 24);
    const ends = [0, this.pts.length - 2].flatMap((i) => { const x = this.pts[i] - cx, y = this.pts[i + 1] - cy, l = Math.hypot(x, y); return [cx + (x / l) * (r - 7), cy + (y / l) * (r - 7), cx + (x / l) * (r + 7), cy + (y / l) * (r + 7)]; });
    this.arc = ink.segs([], ink.line('weight', 4), Z.live + 0.1);
    this.root.add(this.arc, ink.segs(ends, ink.line('weight', 'thin'), Z.live + 0.1));
    this.set(0);
  }
  set(p: number): void {
    if (p === this.last) return;
    this.last = p;
    this.root.visible = p > 0.001;
    this.ink.setSegs(this.arc, polyline(partial(this.pts, clamp01(p))));
  }
}

/** The first example marked on Fig. 1: a bracket over the input tubes and one beside the brass mark, both tagged "E1". */
export class ExampleBracket implements Part {
  readonly root = new THREE.Group();
  private lines: LineSegments2[] = [];
  private paths: number[][];
  private tags: LiveText[];
  private last = -1;
  constructor(private ink: Ink, paths: number[][], tags: [number, number][]) {
    this.paths = paths;
    for (let i = 0; i < paths.length; i++) { const l = ink.segs([], ink.line('ink', 'thin'), Z.callout); this.lines.push(l); this.root.add(l); }
    this.tags = tags.map((at) => new LiveText(ink, 44, 26, at, { size: 17, role: 'ink', box: true }));
    for (const t of this.tags) this.root.add(t.root);
    this.set(0);
  }
  set(p: number): void {
    if (p === this.last) return;
    this.last = p;
    this.root.visible = p > 0.001;
    this.paths.forEach((pts, i) => this.ink.setSegs(this.lines[i], polyline(partial(pts, clamp01(p / 0.6)))));
    for (const t of this.tags) t.set('E1', (p - 0.5) / 0.3);
  }
}
