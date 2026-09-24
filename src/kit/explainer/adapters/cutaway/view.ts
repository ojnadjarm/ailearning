import type { View } from '../../src/unit/ports';
import { DetentHand } from '../../src/play/hand';
import type { Projector } from '../../src/play/pointer';

type Box = { x: number; y: number; w: number; h: number };
/** The Cutaway stage as the view needs it (structural: cutaway-kit's `Stage` or a plate's own copy). */
export interface CutawayStage {
  readonly el: HTMLElement;
  readonly renderer: { domElement: HTMLElement; compile(scene: unknown, camera: unknown): unknown };
  readonly scene: unknown; readonly camera: unknown;
  cx: number; cy: number;
  frame(b: Box): void; span(): [number, number]; render(): void; resize(): void;
  toScreen(x: number, y: number): [number, number]; toWorld(px: number, py: number): [number, number];
}
/** A plate: draws a state; the focus lamp and exposure veil are optional. */
export interface CutawayFigure<S> {
  apply(s: S, dt: number, run: boolean): void;
  lamp?: { set(x: number, y: number, on: number, span: number): void };
  veil?: { set(cx: number, cy: number, w: number, h: number, exposure: number): void };
}
/** The state keys every Cutaway plate carries: the shot box, the focus lamp and the exposure. */
export interface CutawayState { camX: number; camY: number; camW: number; camH: number; lampX: number; lampY: number; lampOn: number; exposure: number }

export const CAMERA_KEYS = ['camX', 'camY', 'camW', 'camH'] as const;
const UNITS = { camX: 0.5, camY: 0.5, camW: 0.5, camH: 0.5, lampX: 0.5, lampY: 0.5 };
/** Director easing for Cutaway: the camera eases slower and snaps under reduced motion; camera and lamp (drawing units) land within 0.5. */
export const cutawayEasing = { rates: { camX: 1.5, camY: 1.5, camW: 1.5, camH: 1.5 }, eps: UNITS, snap: [...CAMERA_KEYS] };

/** A cutaway-kit `Dial` as the hand needs it (structural). */
export interface CutawayDial { cx: number; cy: number; r: number; scale: { min: number; max: number; step: number }; angle(v: number): number; value(a: number): number }
/** A detent hand on a cutaway-kit Dial: grab radius `r + pad`, spring overshoot capped at `limit` radians. */
export function dialHand(dial: CutawayDial, proj: Projector, limit = 2.4, pad = 10): DetentHand {
  const { min, max, step } = dial.scale;
  return new DetentHand({ cx: dial.cx, cy: dial.cy, r: dial.r + pad, min, max, step, angle: (v) => dial.angle(v), value: (a) => dial.value(a) }, proj, limit);
}

/** Cutaway style adapter: state → plate parts → shot → lamp and veil → one render. */
export class CutawayView<S extends CutawayState> implements View<S> {
  readonly el: HTMLElement; readonly canvas: HTMLElement;
  private stage: CutawayStage; private fig: CutawayFigure<S>;
  constructor(stage: CutawayStage, fig: CutawayFigure<S>) { this.stage = stage; this.fig = fig; this.el = stage.el; this.canvas = stage.renderer.domElement; }
  draw(s: S, dt: number, run: boolean): void {
    const st = this.stage;
    this.fig.apply(s, dt, run);
    st.frame({ x: s.camX, y: s.camY, w: s.camW, h: s.camH });
    const [sw, sh] = st.span();
    this.fig.lamp?.set(s.lampX, s.lampY, s.lampOn, Math.max(sw, sh));
    this.fig.veil?.set(st.cx, st.cy, sw, sh, s.exposure);
    st.render();
  }
  resize(): void { this.stage.resize(); }
  prepare(): void { this.stage.renderer.compile(this.stage.scene, this.stage.camera); }
  toWorld(px: number, py: number): [number, number] { return this.stage.toWorld(px, py); }
  toScreen(x: number, y: number): [number, number] { return this.stage.toScreen(x, y); }
}
