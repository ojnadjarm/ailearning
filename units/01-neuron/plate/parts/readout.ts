import * as THREE from 'three';
import { Ink, Z, FONT } from '../ink';
import { circle, rect } from '../../../../src/kit/cutaway/geom';
import type { ColorRole } from '../theme';
import { LiveText } from './text';
import type { Part } from '../../../../src/kit/cutaway/parts/part';

/** A mechanical drum counter: `n` drums in a double-ruled window, each drum a digit with the drum's curve ruled above and below it. */
class DrumCounter implements Part {
  readonly root = new THREE.Group();
  private digits: LiveText[] = [];
  constructor(ink: Ink, x: number, y: number, n = 3, cw = 24, ch = 32) {
    const w = n * cw + 12, x0 = x - w / 2, y0 = y - ch / 2 - 6, x1 = x + w / 2, y1 = y + ch / 2 + 6, z = Z.callout;
    this.root.add(ink.shape([x0, y0, x1, y0, x1, y1, x0, y1], ink.fill('paper'), z - 0.2));
    this.root.add(ink.segs([...rect(x0, y0, x1, y1), ...rect(x0 + 3, y0 + 3, x1 - 3, y1 - 3)], ink.line('ink', 'thin'), z));
    const drums: number[] = [];
    for (let i = 0; i < n; i++) {
      const cx0 = x0 + 6 + i * cw + 2, cx1 = cx0 + cw - 4;
      drums.push(...rect(cx0, y - ch / 2, cx1, y + ch / 2), cx0, y + ch / 2 - 5, cx1, y + ch / 2 - 5, cx0, y - ch / 2 + 5, cx1, y - ch / 2 + 5);
      this.digits.push(new LiveText(ink, cw - 4, ch - 10, [(cx0 + cx1) / 2, y], { size: Math.round(ch * 0.62), role: 'ink', weight: 600 }));
    }
    this.root.add(ink.segs(drums, ink.line('ink', 'hair'), z), ...this.digits.map((d) => d.root));
  }
  /** Shows `v` (a whole number, clamped to the drums) with leading zeros. */
  set(v: number): void {
    const n = this.digits.length, s = String(Math.max(0, Math.min(10 ** n - 1, Math.round(v)))).padStart(n, '0');
    this.digits.forEach((d, i) => d.set(s[i]));
  }
}

/** One cell of a data plate: its small caps label and the colour of its number (the concept's colour). */
export interface CellSpec { label: string; role: ColorRole }

/** A riveted maker's plate frame: a medium outer rule, a hairline inner rule 5 in, and (with `rivets`) a rivet 12 in from each corner. */
function plateFrame(ink: Ink, g: THREE.Group, x0: number, y0: number, x1: number, y1: number, rivets: [number, number][]): void {
  g.add(ink.shape([x0, y0, x1, y0, x1, y1, x0, y1], ink.fill('paper'), Z.fill));
  g.add(ink.segs(rect(x0, y0, x1, y1), ink.line('ink', 'med'), Z.line), ink.segs(rect(x0 + 5, y0 + 5, x1 - 5, y1 - 5), ink.line('ink', 'hair'), Z.line));
  g.add(ink.segs(rivets.flatMap(([x, y]) => circle(x, y, 3, 12)), ink.line('ink', 'hair'), Z.line));
}

/** A small mono label in the soft ink, letter-spaced like an engraving. */
const engraved = (ink: Ink, w: number, at: [number, number], text: string, size: number, align: 0 | 0.5 | 1 = 0.5, spacing = 0.14): LiveText => {
  const t = new LiveText(ink, w, size + 8, at, { size, role: 'inkSoft', weight: 500, font: FONT.mono, spacing, align });
  t.set(text);
  return t;
};

/** Where a gauge's data plate sits: its width, height and the gap under the gauge's housing; optionally its value size and the foot line's label and value widths. */
export interface PlateSpec { w: number; h: number; gap: number; size?: number; foot?: number; val?: number }

/**
 * A gauge's data plate (a riveted maker's plate under the housing): a row of labelled cells, then the miss on its own line (label,
 * a dotted leader, the number) between two rivets. `top` is the plate's top edge; the cells are fixed, only their numbers change.
 */
export class DataPlate implements Part {
  readonly root = new THREE.Group();
  private values: LiveText[] = [];
  private labels: LiveText[] = [];
  private miss: LiveText;
  private foot: LiveText;
  constructor(ink: Ink, cx: number, top: number, cells: CellSpec[], missRole: ColorRole, f: PlateSpec) {
    const n = cells.length, g = this.root, x0 = cx - f.w / 2, x1 = cx + f.w / 2, y1 = top, y0 = top - f.h, yr = y1 - 62, ym = (yr + y0 + 5) / 2;
    plateFrame(ink, g, x0, y0, x1, y1, [[x0 + 13, ym], [x1 - 13, ym]]);
    const cw = (f.w - 10) / n, rules: number[] = [x0 + 5, yr, x1 - 5, yr];
    for (let i = 1; i < n; i++) rules.push(x0 + 5 + i * cw, y1 - 5, x0 + 5 + i * cw, yr);
    g.add(ink.segs(rules, ink.line('ink', 'hair'), Z.line));
    for (let i = 0; i < n; i++) {
      const x = x0 + 5 + (i + 0.5) * cw;
      this.labels.push(engraved(ink, cw - 6, [x, y1 - 18], cells[i].label, 18, 0.5, 0.1));
      this.values.push(new LiveText(ink, cw - 6, 36, [x, yr + 18], { size: f.size ?? 30, role: cells[i].role, weight: 600 }));
    }
    const lw = f.foot ?? 70, vw = f.val ?? 80, vx = x1 - 26;
    this.foot = engraved(ink, lw, [x0 + 26, ym], 'MISS', 18, 0, 0.1);
    g.add(this.foot.root, ink.segs([x0 + 18 + lw, ym, vx - vw + 10, ym], ink.line('hatch', 'thin', { dash: [2, 4] }), Z.line));
    this.miss = new LiveText(ink, vw, 34, [vx, ym], { size: 28, role: missRole, weight: 600, align: 1 });
    g.add(...this.labels.map((t) => t.root), ...this.values.map((t) => t.root), this.miss.root);
  }
  /** The cells' numbers, in order, and the miss; `cells`, `foot` and `role` relabel the cells and the foot line (a reference plate). */
  set(values: string[], miss: string, cells?: CellSpec[], foot = 'MISS', role?: ColorRole): void {
    this.values.forEach((t, i) => { t.set(values[i] ?? ''); if (cells?.[i]) { t.tint(cells[i].role); this.labels[i].set(cells[i].label); } });
    this.foot.set(foot);
    if (role) this.miss.tint(role);
    this.miss.set(miss);
  }
}

/** Where the tally's title block sits (drawing units, y up). */
export interface TallySpec { x0: number; x1: number; y0: number; y1: number }
/** What the tally shows: the step count, each example's miss, the loaded one, the total, and the goal or, once found, the floor. */
export interface TallyView { steps: number; parts: number[]; sel: number; total: number; goal: number | null; floor: number | null }

const f1 = (v: number): string => v.toFixed(1);
const f2 = (v: number): string => v.toFixed(2);

/**
 * The tuning tally as a title block (the plaque's riveted double frame): STEP on a drum counter, the GOAL with a line on what it means,
 * and TOTAL MISS with the sum it comes from written under a rule.
 */
export class TitleTally implements Part {
  readonly root = new THREE.Group();
  private drums: DrumCounter;
  private goal: LiveText;
  private note: LiveText;
  private total: LiveText;
  private sum: LiveText;
  private key = '';
  constructor(ink: Ink, f: TallySpec) {
    const g = this.root, { x0, x1, y0, y1 } = f, c1 = x0 + 146, c2 = x0 + 340, lab = y1 - 26;
    plateFrame(ink, g, x0, y0, x1, y1, [[x0 + 12, y1 - 12], [x1 - 12, y1 - 12], [x0 + 12, y0 + 12], [x1 - 12, y0 + 12]]);
    g.add(ink.segs([c1, y0 + 5, c1, y1 - 5, c2, y0 + 5, c2, y1 - 5], ink.line('ink', 'thin'), Z.line));
    g.add(engraved(ink, 120, [x0 + 22, lab], 'STEP', 18, 0).root, engraved(ink, 120, [c1 + 20, lab], 'GOAL', 18, 0).root,
      engraved(ink, 200, [c2 + 22, lab], 'TOTAL MISS', 18, 0).root);
    this.drums = new DrumCounter(ink, (x0 + c1) / 2, y1 - 88, 3, 36, 56);
    this.goal = new LiveText(ink, c2 - c1 - 36, 48, [c1 + 20, y1 - 72], { size: 42, role: 'targetInk', weight: 600, align: 0 });
    this.note = new LiveText(ink, c2 - c1 - 30, 26, [c1 + 20, y1 - 112], { size: 18, role: 'inkSoft', weight: 400, font: FONT.serif, align: 0 });
    this.total = new LiveText(ink, x1 - c2 - 46, 60, [c2 + 22, y1 - 72], { size: 54, role: 'targetInk', weight: 600, align: 0 });
    this.sum = new LiveText(ink, x1 - c2 - 46, 26, [c2 + 22, y1 - 118], { size: 18, role: 'inkSoft', weight: 500, align: 0, spacing: 0.04 });
    g.add(ink.segs([c2 + 22, y1 - 102, x1 - 24, y1 - 102], ink.line('ink', 'hair'), Z.line));
    g.add(this.drums.root, this.goal.root, this.note.root, this.total.root, this.sum.root);
  }
  set(v: TallyView): void {
    const key = JSON.stringify(v);
    if (key === this.key) return;
    this.key = key;
    this.drums.set(v.steps);
    this.total.set(f2(v.total));
    const parts = v.parts.slice(0, 4), two = parts.some((m) => Math.abs(m * 10 - Math.round(m * 10)) > 1e-6);
    this.sum.set(two ? parts.map(f2).join(' + ') : `= ${parts.map(f1).join(' + ')}`);
    const at = v.floor ?? v.goal;
    this.goal.set(at === null ? 'MIN' : f2(at));
    this.note.set(v.floor !== null ? 'best on the clicks' : at === null ? 'as low as it goes' : at === 0 ? 'every mark met' : 'or less');
  }
}
