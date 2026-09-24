/** The details strip runs its one move when it first scrolls into view, then rests. */
export function strip() {
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('run'); io.unobserve(e.target); } }), { threshold: 0.6 });
  document.querySelectorAll('.det svg').forEach((s) => io.observe(s));
}
