/** The homepage sections around Fig. 1: header, lede and call to action, notes and title block, the how strip, colophon. */
import { detailA, detailB, detailC } from '../draw/figures.mjs';
import { hm } from '../assembly.js';
import { esc } from './html.mjs';
import { frame } from '../../sheet/frame.mjs';

/** Border zones and the header rail of Sheet 0. */
export const header = (s, base) => frame({ base, name: esc(s.name), label: 'Sheet 0 · General assembly',
  right: '<nav class="nav" aria-label="Site"><a href="#path">Parts list</a><a href="#about">About</a></nav>' });

/** Promise, subline and the one primary per state; the returning label is filled from progress at runtime. */
export function lede(s, first) {
  const ret = s.cta.returning.replace('{plate}', first.plate).replace('{beat}', 'Watch');
  return `<div class="lede"><h1>${esc(s.promise[0])}</h1><p class="sub">${esc(s.subline)}</p></div>
<div class="act">
<a class="btn primary p-new" href="${first.href}">${esc(s.cta.new)}</a>
<a class="btn primary p-returning" href="${first.href}" data-tpl="${esc(s.cta.returning)}">${esc(ret)}</a>
<button class="btn primary p-phone" type="button" data-share>${esc(s.cta.phone)}</button>
<p class="trust">${esc(s.trust)}</p><p class="ph-note">Plates are drawn for a desktop. The map works here.</p></div>`;
}

/** Drafting notes and the title block (signed DRAWN / APPROVED). */
export function foot(c, credits) {
  const s = c.site, total = c.units.reduce((a, u) => a + u.minutes, 0);
  return `<div class="foot">
<details class="notes fold" data-fold open><summary class="fs"><h2>Notes</h2></summary><ol>
<li>Parts drawn in phantom line are in preparation.</li>
<li>A part slides home on the centre line as its plates are learned.</li>
<li>Dimensions are in plates and minutes: ${c.units.length} plates, ${hm(total).toLowerCase()} in all.</li>
<li>Progress stays in this browser. No account.</li></ol></details>
<table class="tb"><caption class="vh">Title block</caption><tbody>
<tr><th colspan="2" class="tb-n">${esc(s.name)}</th><td class="tb-s"><small>Sheet</small>0 <small>of</small> ${c.units.length}</td></tr>
<tr><td><small>Title</small>General assembly · the path</td><td><small>Scale</small>None · units in minutes</td><td><small>Dwg no.</small>AIL-000</td></tr>
<tr><td><small>Drawn</small>${esc(s.credits.drawn)}</td><td><small>Approved</small>${credits.approved}</td><td><small>Rev</small>A</td></tr>
<tr><td colspan="3"><small>Licence</small>Plates and narration ${esc(s.licence.plates)} · code ${esc(s.licence.code)}</td></tr>
</tbody></table></div>`;
}

/** Details A–C of Plate I: Watch, Drive, Play. */
export function how(s) {
  const det = (cls, svg, i, extra = '') => `<figure class="det"><svg viewBox="0 0 260 260" aria-hidden="true" class="${cls}"><circle class="dcf" cx="130" cy="130" r="124"/><g clip-path="url(#dclip)">${svg}</g></svg>`
    + `<figcaption><b>Detail ${'ABC'[i]} · ${esc(s.strip[i].label)}</b>${extra}${esc(s.strip[i].line)}${i === 0 ? ` <i>${esc(s.sound)}</i>` : ''}</figcaption></figure>`;
  return `<section class="how" aria-labelledby="how-h"><h2 id="how-h">How a plate works <span>Details of Plate I, enlarged</span></h2>
<div class="details">${det('da', detailA(), 0)}${det('db', detailB(), 1)}${det('dc race', detailC(), 2, '<span class="gm"><i class="flag" aria-hidden="true"></i>Tuning</span> ')}</div></section>`;
}

// TODO(progress store): link the colophon to the about page (progress download, load, reset) once it exists.
/** Credits line (Drawn by Claude · Directed by, linked to the portfolio), licences, trust line. */
export const colophon = (s, credits) => `<footer class="colophon" id="about"><p class="col1">Drawn by ${esc(s.credits.drawn)} · Directed by <a rel="author" href="${credits.portfolio}">${credits.approved}</a></p>
<p>Plates and narration ${esc(s.licence.plates)} · code ${esc(s.licence.code)} · fonts ${esc(s.licence.fonts)} (IBM Plex, Libre Caslon) · voice ${esc(s.licence.voice)}</p>
<p>${esc(s.trust)}</p></footer>`;
