/** Composes the homepage: `head` (font preloads, the state picker) and `body` (the sheet), from content, layouts and credits. */
import { assemblySvg, defs } from './assembly.mjs';
import { partsList } from './parts-list.mjs';
import { header, lede, foot, how, colophon } from './sections.mjs';

export const FONTS = ['ibm-plex-sans-condensed-latin-600-normal', 'ibm-plex-sans-condensed-latin-400-normal', 'libre-caslon-text-latin-400-italic',
  'libre-caslon-text-latin-400-normal', 'ibm-plex-mono-latin-500-normal'];

/** Preload link for one self-hosted font face. */
export const preloadFont = (base, ff) => `<link rel="preload" href="${base}fonts/${ff}.woff2" as="font" type="font/woff2" crossorigin>`;

/** Picks data-state before first paint: ?state= (tests), a phone, stored progress that resumes a live unit, or new. */
const statePicker = (live) => `<script>(()=>{const d=document.documentElement,L=${JSON.stringify(live)};let s=new URLSearchParams(location.search).get('state');`
  + `if(!['new','returning','phone'].includes(s)){s='new';try{if(matchMedia('(pointer:coarse) and (max-width:820px)').matches)s='phone';`
  + `else{const r=JSON.parse(localStorage.getItem('plates:v1:progress')||'{}').resume;if(r&&L.includes(r.unit))s='returning'}}catch(e){}}`
  + `d.dataset.state=s;d.classList.add('js')})()</script>`;

/** `units` carry `href` only when live; `thumb` is the built URL of Plate I's still. */
export function page(c, layouts, { base, credits, thumb }) {
  const live = c.units.filter((u) => u.href), first = live[0];
  const widest = c.units.reduce((w, u) => (u.plate.length > w.length ? u.plate : w), '');
  const head = FONTS.map((ff) => preloadFont(base, ff)).join('\n') + '\n' + statePicker(live.map((u) => u.id));
  const data = c.units.map(({ id, ring, plate, minutes, href }) => ({ id, ring, plate, minutes, ...(href ? { href } : {}) }));
  const body = `<div class="sheet">
${header(c.site, base)}
<main>
<section class="hero">
${lede(c.site, first)}
<figure class="fig1">${defs()}
${['wide', 'mid', 'narrow'].map((k) => assemblySvg(k, layouts[k], c.units, c.rings)).join('\n')}
<figcaption id="fig1-cap"><i>Fig. 1.</i> The course as one machine, exploded along its centre line. One part per ring; turn the red weight on Plate I.</figcaption></figure>
${foot(c, credits)}
</section>
${how(c.site)}
<section class="bom" id="path" aria-labelledby="bom-h" style='--pw:"${widest}"'><details class="fold" data-fold open><summary class="fs"><h2 id="bom-h">Parts list <span>${c.units.length} plates in ${c.rings.length} parts, in the order they assemble</span></h2></summary>
<div class="bh" aria-hidden="true"><span>Fig.</span><span>Plate</span><span>Description</span><span>Uses</span><span>Time</span><span>Status</span></div>
<ol class="items">${partsList(c, thumb)}</ol></details></section>
</main>
${colophon(c.site, credits)}
</div>
<script>if(matchMedia('(max-width:639px)').matches)for(const d of document.querySelectorAll('details[data-fold]'))d.open=false</script>
<script type="application/json" id="units">${JSON.stringify(data)}</script>`;
  return { head, body };
}
