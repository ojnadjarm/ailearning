/** Parts list status marks and the returning call to action, from progress. Progress never turns a phantom into a link. */
const MARK = { seen: 'q1', driven: 'q2', played: 'q3', cleared: 'q4' };
const cap = (s) => s[0].toUpperCase() + s.slice(1);

export function paint(units, p, state) {
  const done = p.units;
  for (const u of units) {
    const li = document.getElementById('p-' + u.id), st = done[u.id]?.state, here = p.resume?.unit === u.id;
    li.classList.toggle('bench', here);
    if (!u.href) continue;
    li.querySelector('.st').innerHTML = `<i class="mk ${MARK[st] || 'o'}"></i>${st ? cap(st) : 'Drawn'}${here ? ' · on the bench' : ''}`;
    // TODO(desktop gate): on a phone, link to the unit's "Drawn for a desktop" sheet instead of unlinking the title.
    if (state === 'phone') {
      li.querySelector('a.ti').removeAttribute('href');
      li.querySelector('.st').insertAdjacentText('beforeend', ' · for a desktop');
    }
  }
  const unit = units.find((u) => u.id === p.resume?.unit && u.href), cta = document.querySelector('.p-returning');
  if (unit) {
    cta.textContent = cta.dataset.tpl.replace('{plate}', unit.plate).replace('{beat}', cap(p.resume.beat || 'watch'));
    cta.href = unit.href;
  }
  return done;
}
