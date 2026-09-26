/** The narrow sheet of a unit page: below 1024 px a plate is not drawn; the sheet names the plate, says it is drawn for a desktop and lists its chapters. */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { esc } from '../homepage/render/html.mjs';

/** m:ss of `s` seconds. */
const clock = (s) => { const r = Math.round(s); return `${Math.floor(r / 60)}:${String(r % 60).padStart(2, '0')}`; };

/** Narrow-sheet markup for the unit at `slug`: its chapters from `units/<slug>/unit.json`, each timed from the cue sheet when there is one. */
export function narrowSheet(root, slug, unit) {
  const spec = JSON.parse(readFileSync(resolve(root, `units/${slug}/unit.json`), 'utf8'));
  const cuesPath = resolve(root, `public/bundles/${slug}/cues.json`);
  const cues = existsSync(cuesPath) ? JSON.parse(readFileSync(cuesPath, 'utf8')).clips : {};
  const secs = (c) => (c.clips ?? []).reduce((a, id) => a + (cues[id]?.duration ?? 0), 0);
  const total = spec.chapters.reduce((a, c) => a + secs(c), 0);
  const rows = spec.chapters.map((c) => `<li><span class="nm">${esc(c.numeral)}</span><span class="nt">${esc(c.title)}</span>`
    + `<span class="nd">${c.clips?.length ? clock(secs(c)) : 'by hand'}</span></li>`).join('');
  return `<section class="narrow" aria-labelledby="narrow-title">
<p class="ne">Plate ${esc(unit.plate)} · ${esc(unit.title)}</p>
<h1 id="narrow-title">Plate ${esc(unit.plate)} is drawn for a desktop</h1>
<p class="nl">The plate is drawn, narrated and tuned by hand on a screen at least 1024 pixels wide. Open this sheet there to watch it.</p>
<ol class="nc">${rows}</ol>
<p class="nf"><i>Chapters of Plate ${esc(unit.plate)}.</i> ${spec.chapters.length} chapters, ${Math.round(total / 60)} minutes with sound.</p>
</section>`;
}
