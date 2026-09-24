import type { DetentHand } from './hand';

/** What the keyboard path needs from the director. */
export interface KeyTarget { hands: DetentHand[]; activeHand: number; beats: { touched(): void }; wake(): void }

/** Keyboard path to every hands-on action: Left/Right turn the lit hand, Up/Down pick another, K or Space pauses. */
export function bindKeys(d: KeyTarget, toggle: () => void): void {
  addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const live = d.hands.map((x, i) => (x.enabled ? i : -1)).filter((i) => i >= 0);
    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && live.length > 1) {
      d.activeHand = live[(live.indexOf(d.activeHand) + 1) % live.length];
    } else if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && d.hands[d.activeHand]?.enabled) {
      d.beats.touched();
      d.hands[d.activeHand].turn(e.key === 'ArrowRight' ? 1 : -1);
    } else if (e.key === 'k' || e.key === 'K' || (e.key === ' ' && !(e.target instanceof HTMLButtonElement))) {
      toggle();
    } else return;
    d.wake();
    e.preventDefault();
  });
}
