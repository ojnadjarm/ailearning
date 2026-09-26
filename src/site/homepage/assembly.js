/** Horizontal dimension from x1 to x2 at height y, extension lines from ey1/ey2, label above the line. */
function dim(x1, x2, y, label, ey1, ey2, cls = '') {
  const r = (n) => Math.round(n * 10) / 10, a = 13, w = 4.2;
  const head = (x, d) => `<polygon class="ik" points="${r(x)},${y} ${r(x + d * a)},${r(y - w)} ${r(x + d * a)},${r(y + w)}"/>`;
  return `<g class="dim ${cls}"><path class="h" d="M${r(x1)} ${r(ey1)}V${r(y + 10)}M${r(x2)} ${r(ey2)}V${r(y + 10)}"/>`
    + `<path class="t" d="M${r(x1)} ${y}H${r(x2)}"/>${head(x1, 1)}${head(x2, -1)}`
    + `<text class="dm" x="${r((x1 + x2) / 2)}" y="${y - 9}" text-anchor="middle">${label}</text></g>`;
}

/** Minutes as "14 H 15 MIN" in drafting caps. */
export function hm(m) {
  const h = Math.floor(m / 60), n = m % 60;
  return h ? `${h} H${n ? ` ${n} MIN` : ''}` : `${n} MIN`;
}

/** Credit a learner state earns toward seating its ring's part. */
export const CREDIT = { seen: 0.25, driven: 0.5, played: 0.75, cleared: 1 };

/** Seat each ring's part by its learned share and dimension what is seated and what is still to go, row by row. */
export function assemble(geo, units, progress) {
  const byRing = {};
  for (const u of units) (byRing[u.ring] ||= []).push(u);
  const credit = (u) => CREDIT[progress[u.id]?.state] || 0;
  const frac = (ring) => byRing[ring].reduce((a, u) => a + credit(u), 0) / byRing[ring].length;
  const shift = {}, dims = [];
  for (const row of geo.rows) {
    let acc = 0, seatedEnd = null, open = false, go = 0, goMin = 0, seated = 0;
    for (const s of row.slots) {
      const fr = frac(s.ring);
      acc += geo.gap * fr;
      shift[s.ring] = -acc;
      if (!open && fr === 1) { seatedEnd = s; seated += byRing[s.ring].length; } else open = true;
      for (const u of byRing[s.ring]) if (credit(u) < 1) { go++; goMin += u.minutes; }
    }
    const last = row.slots[row.slots.length - 1], endX = last.r + shift[last.ring];
    let out = '', from = row.x0, fromDown = row.down0;
    if (seatedEnd) {
      const x = seatedEnd.r + shift[seatedEnd.ring];
      out += dim(row.x0, x, row.dimY, `SEATED · ${seated} PLATE${seated > 1 ? 'S' : ''}`, row.down0 + 6, seatedEnd.down + 6, 'seated');
      from = x; fromDown = seatedEnd.down;
    }
    if (go) out += dim(from, endX, row.dimY, `TO GO · ${go} PLATE${go > 1 ? 'S' : ''} · ${hm(goMin)}`, fromDown + 6, last.down + 6, 'togo');
    dims.push(out);
  }
  return { shift, dims, frac };
}
