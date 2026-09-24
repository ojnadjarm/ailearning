/** Phone folds (notes, parts list): they toggle only on a phone, and the nav opens the fold it points into. */
export function fold(phone = matchMedia('(max-width:639px)')) {
  for (const s of document.querySelectorAll('.fs')) s.addEventListener('click', (e) => { if (!phone.matches) e.preventDefault(); });
  for (const a of document.querySelectorAll('.nav a[href^="#"]')) {
    a.addEventListener('click', () => { const d = document.querySelector(a.getAttribute('href') + ' details[data-fold]'); if (d) d.open = true; });
  }
}
