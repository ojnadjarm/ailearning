/** Screen pixels ↔ world units; the style's view implements it. */
export interface Projector { toWorld(px: number, py: number): [number, number]; toScreen(x: number, y: number): [number, number] }

/** Something the pointer can grab: hit test in world units, drag in screen pixels. */
export interface Grabbable { enabled: boolean; hits(wx: number, wy: number): boolean; down(px: number, py: number): void; move(px: number, py: number): void; up(): void }

/** Routes pointer events on the canvas to the enabled grabbable under the pointer. */
export class PointerRouter<G extends Grabbable> {
  private active: G | null = null;
  onGrab: (g: G) => void = () => undefined;
  onActivity: () => void = () => undefined;
  private el: HTMLElement; private proj: Projector; private items: G[];
  constructor(el: HTMLElement, proj: Projector, items: G[]) {
    this.el = el; this.proj = proj; this.items = items;
    el.style.touchAction = 'none';
    el.addEventListener('pointerdown', (e) => this.down(e));
    el.addEventListener('pointermove', (e) => this.move(e));
    const up = (): void => { this.active?.up(); this.active = null; this.el.style.cursor = ''; this.onActivity(); };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  }
  private px(e: PointerEvent): [number, number] { const r = this.el.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  private pick(e: PointerEvent): G | null {
    const [wx, wy] = this.proj.toWorld(...this.px(e));
    return this.items.find((g) => g.enabled && g.hits(wx, wy)) ?? null;
  }
  private down(e: PointerEvent): void {
    const g = this.pick(e); if (!g) return;
    this.el.setPointerCapture(e.pointerId);
    this.active = g; this.el.style.cursor = 'grabbing'; g.down(...this.px(e)); this.onGrab(g); this.onActivity();
  }
  private move(e: PointerEvent): void {
    if (this.active) { this.active.move(...this.px(e)); this.onActivity(); return; }
    if (e.pointerType === 'mouse') this.el.style.cursor = this.pick(e) ? 'grab' : '';
  }
}
