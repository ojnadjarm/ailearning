import type { ShellPort } from '../unit/ports';

const ICON = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>',
  replay: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5a7 7 0 1 1-6.6 4.7l1.9.6A5 5 0 1 0 12 7v3L7.5 6 12 2z"/></svg>',
};

/** Everything the chrome says; the style's CSS decides how it looks. */
export interface ShellText { num: string; name: string; eyebrow: string; title: string; lede: string; keys: string; endEyebrow: string; endTitle: string; again?: string }

/** Page chrome as DOM only (classes: mark, card begin, caption, primary cta, card end, bar, icon, chip); no CSS here. */
export class Shell implements ShellPort {
  private el: Record<string, HTMLElement> = {};
  private go: (() => void) | null = null;
  private cc = false;
  private pressed = false;
  onToggle: () => void = () => undefined;
  onReplay: () => void = () => undefined;

  constructor(root: HTMLElement, t: ShellText) {
    root.innerHTML = `
      <header class="mark"><span class="num">${t.num}</span><span>${t.name}</span></header>
      <section class="card begin" role="dialog" aria-labelledby="t-begin">
        <p class="eyebrow">${t.eyebrow}</p>
        <h1 id="t-begin">${t.title}</h1>
        <p class="lede">${t.lede}</p>
        <button class="primary" data-k="begin">Begin</button>
        <p class="keys">${t.keys}</p>
      </section>
      <p class="caption" data-k="caption" aria-live="polite" hidden></p>
      <button class="primary cta" data-k="cta" hidden></button>
      <section class="card end" data-k="end" hidden>
        <p class="eyebrow">${t.endEyebrow}</p>
        <h2>${t.endTitle}</h2>
        <button class="primary" data-k="again">${t.again ?? 'Replay from the start'}</button>
      </section>
      <nav class="bar" aria-label="Playback">
        <button class="icon" data-k="toggle" aria-label="Pause">${ICON.pause}</button>
        <button class="icon" data-k="replay" aria-label="Replay from the start">${ICON.replay}</button>
        <span class="grow" data-k="status"></span>
        <button class="chip" data-k="cc" aria-pressed="false">CC</button>
      </nav>`;
    root.querySelectorAll<HTMLElement>('[data-k]').forEach((n) => { this.el[n.dataset.k!] = n; });
    this.el.cta.addEventListener('click', () => { const g = this.go; this.cta(null); g?.(); });
    this.el.toggle.addEventListener('click', () => this.onToggle());
    this.el.replay.addEventListener('click', () => this.onReplay());
    this.el.again.addEventListener('click', () => { this.el.end.hidden = true; this.onReplay(); });
    this.el.cc.addEventListener('click', () => this.captions(!this.cc));
  }

  /** Resolves when the learner presses Begin (a user gesture, so audio may start). */
  begin(): Promise<void> {
    return new Promise((res) => this.el.begin.addEventListener('click', () => {
      this.pressed = true;
      if (this.el.begin.classList.contains('loading')) this.el.begin.textContent = 'Starting…';
      res();
    }, { once: true }));
  }
  /** Warm-up progress on the Begin button (0 → 1); a press before 1 is kept. */
  progress(f: number): void {
    const b = this.el.begin;
    b.classList.toggle('loading', f < 1);
    b.style.setProperty('--p', `${Math.round(f * 100)}%`);
    b.textContent = f >= 1 ? 'Begin' : this.pressed ? 'Starting…' : 'Preparing…';
  }
  /** Hide the Begin card and show the playing chrome (frozen stills call it too). */
  live(): void { document.body.classList.add('live'); }
  captions(on: boolean): void { this.cc = on; this.el.cc.setAttribute('aria-pressed', String(on)); this.el.caption.hidden = !on; }

  cta(label: string | null, go?: () => void): void {
    this.go = go ?? null;
    const b = this.el.cta;
    if (!label) { b.hidden = true; return; }
    b.textContent = label; b.hidden = false;
    if (document.activeElement === document.body || !document.activeElement) b.focus({ preventScroll: true });
  }
  caption(text: string): void { if (this.el.caption.textContent !== text) this.el.caption.textContent = text; }
  playing(on: boolean): void {
    this.el.toggle.innerHTML = on ? ICON.pause : ICON.play;
    this.el.toggle.setAttribute('aria-label', on ? 'Pause' : 'Play');
  }
  pausable(on: boolean): void { (this.el.toggle as HTMLButtonElement).disabled = !on; }
  end(onReplay: () => void): void { this.onReplay = onReplay; this.el.end.hidden = false; }
  status(text: string): void { if (this.el.status.textContent !== text) this.el.status.textContent = text; }
}
