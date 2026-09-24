/** Seats each ring's part by its learned share and redraws the chain dimensions in every layout. */
import { assemble, CREDIT } from '../assembly.js';

const $$ = (s, el = document) => [...el.querySelectorAll(s)];

export function seat(units, done, animate) {
  for (const svg of $$('svg.asm')) {
    const geo = JSON.parse(svg.dataset.geo), { shift, dims, frac } = assemble(geo, units, done);
    for (const g of $$('.slot', svg)) {
      const ring = +g.dataset.ring, fr = frac(ring), drawn = units.some((u) => u.ring === ring && u.href);
      g.style.setProperty('--dx', shift[ring] + 'px');
      g.classList.toggle('ph', !drawn); g.classList.toggle('ink', drawn); g.classList.toggle('seat', fr === 1);
    }
    $$('.dims', svg).forEach((d, i) => { d.innerHTML = dims[i]; d.classList.toggle('fresh', animate); });
  }
  for (const li of $$('.item')) {
    const ring = +li.dataset.ring, us = units.filter((u) => u.ring === ring), n = us.filter((u) => CREDIT[done[u.id]?.state] === 1).length;
    li.querySelector('.rs').textContent = n === us.length ? 'Seated' : n ? `${n} of ${us.length} learned` : '';
  }
}
