import { Spring } from './spring';
import type { Grabbable, Projector } from './pointer';

const clamp = (x: number, a: number, b: number): number => Math.min(b, Math.max(a, x));
const K_DRAG = 1300, D_DRAG = 90, K_REST = 600, D_REST = 26;

/** A dial as the hand sees it: where it is, its detent scale, and the style's value ↔ angle mapping. */
export interface DialGeom { cx: number; cy: number; r: number; min: number; max: number; step: number; angle(v: number): number; value(a: number): number }

/** Turns a dial by dragging around its centre (or by keys); it settles into detents through a spring. */
export class DetentHand implements Grabbable {
  enabled = false;
  grabbed = false;
  readonly spring: Spring;
  onDetent: (value: number) => void = () => undefined;
  private target = 0; private last: [number, number] = [0, 0]; private centre: [number, number] = [0, 0]; private detent = 0;
  private lo: number; private hi: number;
  readonly g: DialGeom; private proj: Projector;

  constructor(g: DialGeom, proj: Projector, limit = Infinity) {
    this.g = g; this.proj = proj;
    this.lo = Math.min(g.angle(g.min), g.angle(g.max)); this.hi = Math.max(g.angle(g.min), g.angle(g.max));
    this.spring = new Spring(-limit, limit);
  }
  hits(wx: number, wy: number): boolean { return Math.hypot(wx - this.g.cx, wy - this.g.cy) <= this.g.r; }
  down(px: number, py: number): void { this.grabbed = true; this.target = this.spring.a; this.last = [px, py]; this.centre = this.proj.toScreen(this.g.cx, this.g.cy); }
  move(px: number, py: number): void {
    const rx = this.last[0] - this.centre[0], ry = -(this.last[1] - this.centre[1]);
    const dx = px - this.last[0], dy = -(py - this.last[1]);
    this.target = clamp(this.target + (rx * dy - ry * dx) / Math.max(rx * rx + ry * ry, 24 * 24), this.lo, this.hi);
    this.last = [px, py];
  }
  up(): void { this.grabbed = false; this.target = this.g.angle(this.value()); }
  /** Keyboard path: n detents up (positive) or down. */
  turn(n: number): void { this.target = this.g.angle(clamp(this.value() + n * this.g.step, this.g.min, this.g.max)); }
  /** Nearest detent to `v`. */
  snap(v: number): number { return clamp(this.g.min + Math.round((v - this.g.min) / this.g.step) * this.g.step, this.g.min, this.g.max); }
  /** Detent value nearest to where the knob physically is. */
  value(): number { return this.snap(this.g.value(this.spring.a)); }
  settled(): boolean { return !this.grabbed && Math.abs(this.spring.v) < 0.05 && Math.abs(this.spring.a - this.g.angle(this.value())) < 0.02; }
  place(v: number): void { this.spring.set(this.g.angle(v)); this.target = this.spring.a; this.detent = v; }
  /** Step the spring; returns the continuous value for drawing (the knob moves smoothly between detents). */
  update(dt: number): number {
    if (this.grabbed) {
      const nearest = this.g.angle(this.snap(this.g.value(this.target)));
      this.spring.drive(this.target + (nearest - this.target) * 0.45, K_DRAG, D_DRAG);
    } else this.spring.drive(this.target, K_REST, D_REST);
    this.spring.step(dt);
    const v = this.value();
    if (v !== this.detent) { this.detent = v; this.onDetent(v); }
    return this.g.value(this.spring.a);
  }
}
