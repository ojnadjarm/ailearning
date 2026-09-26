import * as THREE from 'three';
import type { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { Ink, Z } from '../ink';
import { arcPts, circle, hatch, polyline, rect } from '../../../../src/kit/cutaway/geom';
import { LiveText } from './text';
import { ARROW_WORDS } from '../../unit/layout';
import type { Gap } from '../../unit/arrow';
import { dir, type Part } from '../../../../src/kit/cutaway/parts/part';

const COVER_Z = Z.text + 0.5;

/** A hatched cover plate over a part until the learner lifts it: it rolls up to its top edge as `on` goes 1 → 0. */
export class Cover implements Part {
  readonly root = new THREE.Group();
  constructor(ink: Ink, box: [number, number, number, number]) {
    const [x0, y0, x1, y1] = box, cx = (x0 + x1) / 2, w = (x1 - x0) / 2, h = y1 - y0;
    const g = new THREE.Group();
    g.add(ink.shape([-w, -h, w, -h, w, 0, -w, 0], ink.fill('paper'), COVER_Z));
    g.add(ink.segs(hatch(() => true, [-w, -h, w, 0], 5, -Math.PI / 4), ink.line('hatch', 'hair'), COVER_Z + 0.1));
    g.add(ink.segs(rect(-w, -h, w, 0), ink.line('ink', 'thin'), COVER_Z + 0.2));
    g.add(ink.shape([-14, 0, 14, 0, 14, 9, -14, 9], ink.fill('ink'), COVER_Z + 0.2));
    this.root.position.set(cx, y1, 0);
    this.root.add(g);
    this.set(0);
  }
  set(on: number): void { this.root.visible = on > 0.01; this.root.scale.y = Math.max(0.001, Math.min(1, on)); }
}

/** A goal written in ringed ink: the value the exercise asks for, on clear paper when `ground`. */
export class GoalRing implements Part {
  readonly root = new THREE.Group();
  private text: LiveText;
  private ring: LineSegments2;
  private ground: THREE.Mesh;
  constructor(ink: Ink) {
    const pts: number[] = [];
    for (let i = 0; i <= 64; i++) { const a = (i / 64) * Math.PI * 2; pts.push(Math.cos(a) * 70, Math.sin(a) * 23); }
    this.ring = ink.segs(polyline(pts), ink.line('targetInk', 'thin'), Z.callout);
    this.ground = ink.shape(pts.slice(0, -2), ink.fill('paper'), Z.callout - 0.1);
    this.text = new LiveText(ink, 130, 30, [0, 0], { size: 20, role: 'targetInk', weight: 600 });
    this.root.add(this.ground, this.ring, this.text.root);
    this.set(0, 0, 0, '');
  }
  set(on: number, x: number, y: number, text: string, ground = false): void {
    this.root.visible = on > 0.5;
    this.ground.visible = ground;
    this.ground.position.set(x, y, Z.callout - 0.1);
    this.ring.position.set(x, y, Z.callout);
    this.text.move(x, y);
    this.text.set(on > 0.5 ? text : '');
  }
}

/** A pressable plate beside Fig. 1: its word says what pressing does. */
export class Plaque implements Part {
  readonly root = new THREE.Group();
  private text: LiveText;
  private glow: THREE.MeshBasicMaterial;
  constructor(ink: Ink, b: { x: number; y: number; w: number; h: number }) {
    const x0 = b.x - b.w / 2, x1 = b.x + b.w / 2, y0 = b.y - b.h / 2, y1 = b.y + b.h / 2;
    this.glow = ink.fill('target', { own: true, opacity: 0 });
    this.root.add(ink.shape([x0 - 8, y0 - 8, x1 + 8, y0 - 8, x1 + 8, y1 + 8, x0 - 8, y1 + 8], this.glow, Z.fill));
    this.root.add(ink.shape([x0, y0, x1, y0, x1, y1, x0, y1], ink.fill('paper'), Z.part));
    this.root.add(ink.segs([...rect(x0, y0, x1, y1), ...rect(x0 + 5, y0 + 5, x1 - 5, y1 - 5)], ink.line('ink', 'thin'), Z.line));
    for (const [sx, sy] of [[x0 + 12, y1 - 12], [x1 - 12, y1 - 12], [x0 + 12, y0 + 12], [x1 - 12, y0 + 12]]) this.root.add(ink.segs(circle(sx, sy, 3, 12), ink.line('ink', 'hair'), Z.line));
    this.text = new LiveText(ink, b.w - 40, b.h - 12, [b.x, b.y], { size: 20, role: 'ink', weight: 600, spacing: 0.1 });
    this.root.add(this.text.root);
    this.set(0, '', 0);
  }
  set(on: number, word: string, glow: number): void {
    this.root.visible = on > 0.5;
    this.text.set(on > 0.5 ? word : '');
    this.glow.opacity = 0.35 * glow;
  }
}

/** The segments of a polyline, less those whose middle falls inside one of `gaps`. */
const broken = (pts: number[], gaps: Gap[]): number[] => {
  const all = polyline(pts), out: number[] = [];
  for (let i = 0; i < all.length; i += 4) {
    const mx = (all[i] + all[i + 2]) / 2, my = (all[i + 1] + all[i + 3]) / 2;
    if (!gaps.some(([x0, y0, x1, y1]) => mx >= x0 && mx <= x1 && my >= y0 && my <= y1)) out.push(all[i], all[i + 1], all[i + 2], all[i + 3]);
  }
  return out;
};

/**
 * A drawn arc over a dial: which way it will turn and how many clicks (the number is drawn, never said). It is a cue: drawn over
 * everything it crosses on a paper under-stroke, at the radius the layout routed clear of the value boxes, its words beside its middle.
 */
export class ArcArrow implements Part {
  readonly root = new THREE.Group();
  private under: LineSegments2;
  private arc: LineSegments2;
  private head: THREE.Mesh;
  private headUnder: THREE.Mesh;
  private words = new THREE.Group();
  private text: LiveText;
  private key = '';
  constructor(private ink: Ink, private dials: [number, number][], private angle: (v: number) => number) {
    this.under = ink.segs([], ink.line('paper', 7), Z.cue);
    this.arc = ink.segs([], ink.line('weight', 'med'), Z.cue + 0.1);
    this.headUnder = ink.shape([4, 0, -20, 10, -20, -10], ink.fill('paper'), Z.cue);
    this.head = ink.shape([0, 0, -16, 6, -16, -6], ink.fill('weight'), Z.cue + 0.1);
    const [w, h] = [ARROW_WORDS.w, ARROW_WORDS.h];
    this.words.add(ink.shape([-w / 2, -h / 2, w / 2, -h / 2, w / 2, h / 2, -w / 2, h / 2], ink.fill('paper'), Z.cue));
    this.text = new LiveText(ink, w, h, [0, 0], { size: 21, role: 'weight', weight: 600 });
    this.text.root.position.z = Z.cue + 0.2 - Z.text;
    this.words.add(this.text.root);
    this.root.add(this.under, this.arc, this.headUnder, this.head, this.words);
    this.set(0, 0, 0, 0);
  }
  /** `on` shows it over dial `k` (0 or 1), from weight `w`, turning `n` clicks of `step`, at radius `R`, its words centred at `at`; inside each of `gaps` (a value box it crosses) the line runs with no paper under it, so the number stays legible. */
  set(on: number, k: number, w: number, n: number, step = 0.5, at: [number, number] = [0, 0], R = 126, gaps: Gap[] = []): void {
    const key = `${on > 0.5}|${k}|${w}|${n}|${at.join(',')}|${R}|${gaps.join(';')}`;
    if (key === this.key) return;
    this.key = key;
    this.root.visible = on > 0.5 && n !== 0;
    if (!this.root.visible) return;
    const [cx, cy] = this.dials[k], a0 = Math.PI / 2 + this.angle(w), a1 = Math.PI / 2 + this.angle(w + n * step);
    const pts = arcPts(cx, cy, R, a0, a1, 32);
    this.ink.setSegs(this.arc, polyline(pts));
    this.ink.setSegs(this.under, broken(pts, gaps));
    const [hx, hy] = [pts[pts.length - 2], pts[pts.length - 1]], rot = a1 + (a1 > a0 ? Math.PI / 2 : -Math.PI / 2);
    for (const m of [this.head, this.headUnder]) { m.position.set(hx, hy, m.position.z); m.rotation.z = rot; }
    this.words.position.set(at[0], at[1], 0);
    this.text.set(`${n > 0 ? '+' : '−'}${Math.abs(n)} ${Math.abs(n) === 1 ? 'click' : 'clicks'}`);
  }
}

/** Lettered ticks outside a dial's scale: the settings a pair of dials can share (a on dial 1 goes with a on dial 2). */
export class DialLetters implements Part {
  readonly root = new THREE.Group();
  constructor(ink: Ink, dials: [number, number][], values: number[][], R: number, angle: (v: number) => number) {
    dials.forEach(([cx, cy], k) => values[k].forEach((v, i) => {
      const [dx, dy] = dir(angle(v)), t = new LiveText(ink, 30, 30, [cx + dx * (R + 16), cy + dy * (R + 16)], { size: 20, role: 'weight', weight: 600 });
      t.set('abcd'[i]);
      this.root.add(t.root, ink.segs([cx + dx * (R - 6), cy + dy * (R - 6), cx + dx * (R + 4), cy + dy * (R + 4)], ink.line('weight', 'thin'), Z.callout));
    }));
    this.set(0);
  }
  set(on: number): void { this.root.visible = on > 0.5; }
}
