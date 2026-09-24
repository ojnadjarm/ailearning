/** The parts list: rings of units as nested <ol>, the syllabus and the accessible fallback of Fig. 1. Only live units link. */
import { hm } from '../assembly.js';
import { esc } from './html.mjs';

// TODO(stills + path map): per-unit inked and phantom AVIF stills replace the single Plate I thumbnail and the silhouettes.
function unitRow(u, byId, thumb) {
  const uses = u.requires.length ? u.requires.map((r) => byId[r].plate).join(', ') : '—';
  const fig = u.href
    ? `<img src="${thumb}" alt="" width="132" height="72" decoding="async">`
    : `<svg class="sil" viewBox="0 0 72 44" aria-hidden="true"><use href="#s-${u.silhouette}"/></svg>`;
  const title = u.href ? `<a class="ti" href="${u.href}">${esc(u.title)}</a>` : `<span class="ti">${esc(u.title)}</span>`;
  const game = u.game ? `<span class="gm"><i class="flag" aria-hidden="true"></i>Game · ${esc(u.game)}</span>` : '';
  const st = u.href ? `<i class="mk o"></i>Drawn` : `In preparation`;
  return `<li class="u ${u.href ? 'drawn' : 'ip'}" id="p-${u.id}" data-u="${u.id}"><span class="fig">${fig}</span><span class="pn">${u.plate}</span>`
    + `<span class="desc">${title}<span class="ln">${esc(u.line)}</span>${game}</span><span class="meta"><span class="uses"><b>Uses</b> ${uses}</span>`
    + `<span class="min">${u.minutes} min</span><span class="st">${st}</span></span></li>`;
}

/** Rings 1–2 open, the rest folded. */
export function partsList(c, thumb) {
  const byId = Object.fromEntries(c.units.map((u) => [u.id, u]));
  return c.rings.map((r) => {
    const us = c.units.filter((u) => u.ring === r.n), min = us.reduce((a, u) => a + u.minutes, 0);
    return `<li class="item" id="ring-${r.n}" data-ring="${r.n}"><details${r.n <= 2 ? ' open' : ''}><summary><span class="bb">${r.n}</span>`
      + `<span class="rn">${esc(r.name)}</span><span class="rq">${us.length} plate${us.length > 1 ? 's' : ''} · ${hm(min).toLowerCase()}</span><span class="rs"></span></summary>`
      + `<ol class="plates">${us.map((u) => unitRow(u, byId, thumb)).join('')}</ol></details></li>`;
  }).join('');
}
