import { boxOf as box, discOf as disc, segOf as seg, type Entity, type Shape } from 'explainer-kit';
import { P } from './outlines';
import { BENCH, L, CLEAR, levelY, rimAngle } from './layout';
import type { A01State } from './state';
import { RULES, casing } from './placed';

const [lo, hi] = [levelY(-1e9), levelY(1e9)], p1 = BENCH.pen1, p2 = BENCH.pen2, g = BENCH.goal;
/** A bench mark stays in the casing's clear paper or wholly off the casing, never on its hatched shell. */
export const CLIP = { inner: box(...CLEAR), outer: casing };
export const sweep = (id: string, shapes: Shape[]): Entity => ({ id, kind: 'figure', scenes: [P], shapes });
/** An arc about (cx, cy) at radius r from angle a0 to a1 (radians from +x) as segments of half width w. */
export function arcSegs(cx: number, cy: number, r: number, a0: number, a1: number, w: number): Shape[] {
  const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / 0.12)), pt = (k: number): [number, number] => { const a = a0 + ((a1 - a0) * k) / n; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
  return Array.from({ length: n }, (_, k) => seg(...pt(k), ...pt(k + 1), w));
}
/** Pencil 1's flag at height y (its point on the rail), and its slide cue above and below it. */
export const flagAt = (y: number): Shape => box(p1.flagX0 - 4, y - p1.hh - 4, p1.tipX + 5, y + p1.hh + 4);
export const flagCue = (y: number): Shape => box((p1.flagX0 + p1.flagX1) / 2 - 10, y - p1.cue - 8, (p1.flagX0 + p1.flagX1) / 2 + 10, y + p1.cue + 8);
export const PEN2_WIN = box(p2.win[0] - p2.winHW, p2.win[1] - p2.winHH, p2.win[0] + p2.winHW, p2.win[1] + p2.winHH);
/** The parts of segment (x0, y0)–(x1, y1), half width w, that stand `gap` clear of box b (the needle as seen: it passes under its window). */
function outsideBox(x0: number, y0: number, x1: number, y1: number, b: Extract<Shape, { k: 'box' }>, w: number, gap: number): Shape[] {
  const ts: number[] = [], m = w + gap + 0.5;
  for (let k = 0; k <= 200; k++) {
    const t = k / 200, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, inBox = x >= b.x0 - m && x <= b.x1 + m && y >= b.y0 - m && y <= b.y1 + m;
    if (!inBox) ts.push(t);
  }
  const runs: [number, number][] = [];
  for (const t of ts) { const last = runs.at(-1); if (last && t - last[1] < 0.006) last[1] = t; else runs.push([t, t]); }
  return runs.filter(([a, c]) => c > a).map(([a, c]) => seg(x0 + (x1 - x0) * a, y0 + (y1 - y0) * a, x0 + (x1 - x0) * c, y0 + (y1 - y0) * c, w));
}
/** Pencil 2's needle at value v as seen (hub, shaft outside its window, grip): it turns under the window, never over it. */
export const needleAt = (v: number): Shape[] => {
  const a = rimAngle(v), [dx, dy] = [-Math.sin(a), Math.cos(a)], gx = L.gaugeX + dx * p2.grip, gy = dy * p2.grip;
  return [disc(L.gaugeX, 0, 10), ...outsideBox(L.gaugeX, 0, L.gaugeX + dx * p2.tip, dy * p2.tip, PEN2_WIN as Extract<Shape, { k: 'box' }>, 6, RULES.value ?? RULES.toPart), disc(gx, gy, p2.gripR + 5)];
};
export const PEN2_CUE = arcSegs(L.gaugeX, 0, p2.cueR, Math.PI / 2 - p2.cueA - 0.12, Math.PI / 2 + p2.cueA + 0.12, 9);
/** Where each bench mark can go while it is out: pencil 1's flag up its rail, pencil 2's cue over the gauge (its needle stays on the face), the goal rings. */
export const SWEEPS = {
  pen1: sweep('pencil 1 rail', [box(p1.flagX0 - 4, lo - p1.cue - 8, p1.tipX + 7, hi + p1.cue + 8)]),
  pen2: sweep('pencil 2 cue', PEN2_CUE),
  goal: [box(g.product[0] - 72, g.product[1] - 25, g.product[0] + 72, g.product[1] + 25), box(g.sumX - 72, lo - 25, g.sumX + 72, hi + 25), box(g.miss[0] - 72, g.miss[1] - 25, g.miss[0] + 72, g.miss[1] + 25)]
    .map((b, k) => sweep(`goal ring ${k}`, [b])),
};
/** Pencil 1's flag: its height on the rail at the guess. */
export const pen1Y = (s: A01State): number => levelY(s.pen1);
