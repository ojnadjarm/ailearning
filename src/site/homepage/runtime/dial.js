/** Plate I's weight: drag round the dial or use arrow keys; the first touch writes WEIGHT on its part. */
export function dial(root = document.documentElement) {
  const hits = [...document.querySelectorAll('.hit')];
  let w = -1;
  const set = (v) => {
    w = Math.max(-3, Math.min(3, Math.round(v * 2) / 2));
    const s = 2 * w + 0.5, o = 1 / (1 + Math.exp(-s / 2));
    root.style.setProperty('--w', w);
    root.style.setProperty('--lv', ((s + 6) / 13).toFixed(3));
    root.style.setProperty('--o', (150 + 240 * o).toFixed(1) + 'deg');
    for (const h of hits) { h.setAttribute('aria-valuenow', w); h.setAttribute('aria-valuetext', 'weight ' + w); }
    root.classList.add('touched');
  };
  const angle = (e, h) => {
    const b = h.getBoundingClientRect(), a = Math.atan2(e.clientY - (b.top + b.height / 2), e.clientX - (b.left + b.width / 2)) * 180 / Math.PI;
    return ((a + 90 + 540) % 360) - 180;
  };
  for (const h of hits) {
    h.addEventListener('pointerdown', (e) => {
      h.setPointerCapture(e.pointerId);
      const move = (ev) => set(angle(ev, h) / 45);
      move(e);
      h.addEventListener('pointermove', move);
      h.addEventListener('pointerup', () => h.removeEventListener('pointermove', move), { once: true });
    });
    h.addEventListener('keydown', (e) => {
      const d = { ArrowRight: 0.5, ArrowUp: 0.5, ArrowLeft: -0.5, ArrowDown: -0.5 }[e.key];
      if (d) { e.preventDefault(); set(w + d); }
    });
  }
}
