/** Vite plugin: frames every unit page as a sheet of the set (with its narrow sheet) and runs the sheet change and the press guard on every page. */
import { existsSync, readFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { frame, back } from './frame.mjs';
import { narrowSheet } from './narrow.mjs';
import { esc } from '../homepage/render/html.mjs';
import { FONTS, preloadFont } from '../homepage/render/page.mjs';

/** Opt-in to the sheet change, inline: an external stylesheet behind a module script lost the race to the first reveal. */
const OPT_IN = '@view-transition{navigation:auto}';

/** The sheet change (`turn.js`) and the press guard (`press.js`), inlined so they listen before the first render. */
const TURN = readFileSync(new URL('./turn.js', import.meta.url), 'utf8');
const PRESS = readFileSync(new URL('./press.js', import.meta.url), 'utf8');

/** The homepage content and its entry for the unit at `slug`. */
function unitEntry(root, slug) {
  const c = JSON.parse(readFileSync(resolve(root, 'content/homepage.json'), 'utf8'));
  const u = c.units.find((x) => x.slug === slug);
  if (!u) throw new Error(`sheet frame: no unit with slug ${slug} in content/homepage.json`);
  return { c, u };
}

/** Header rail of a unit sheet. */
const unitFrame = ({ c, u }, base) => frame({ base, name: esc(c.site.name), label: esc(`Sheet ${u.plate} · ${u.title}`),
  lead: back(base), right: `<span class="sn">Sheet <b class="of">${u.n}</b> of ${c.units.length}</span>` });

/** Unit page path → slug, or undefined for any other page. */
const unitSlug = (root, filename) => relative(root, resolve(filename)).split(sep).join('/').match(/^u\/([^/]+)\/index\.html$/)?.[1];

/** The sheet change reveals the new page at its first render; a unit sheet's drawing is built by its module, so that module blocks the
 * render (Vite rewrites the entry tag, so the attribute is added after it). Cold, Sheet 0 stays until Sheet I can be drawn, never an empty sheet. */
const RENDER_BLOCKING = /<script type="module"(?![^>]*\bblocking=)/;
/** Fonts fetched beside the module: the frame's five faces (the turn waits for them) and the one plate weight the frame CSS does not load. */
const PLATE_FONT = (base) => [...FONTS, 'ibm-plex-sans-condensed-latin-500-normal'].map((f) => preloadFont(base, f)).join('');

/** From the entry's width (1024 px), its plate chunk and that chunk's CSS are fetched render-blocking from the head: the entry imports the plate
 * lazily, so without this the sheet change would reveal Sheet I before the plate can draw. The page also holds the turn (`data-hold`) until the
 * plate's first frame (`sheet:ready`). Narrower, nothing of the plate loads. */
const PLATE_GATE = (base, js, css) => `<script>if(matchMedia('(min-width:1024px)').matches)document.documentElement.dataset.hold='plate',${JSON.stringify([...css.map((f) => ['link', f]), ...js.map((f) => ['script', f])])}`
  + `.forEach(([t,f])=>{const e=document.createElement(t),u=${JSON.stringify(base)}+f;e.setAttribute('blocking','render');e.crossOrigin='';`
  + `if(t==='link'){e.rel='stylesheet';e.href=u}else{e.type='module';e.src=u}document.head.append(e)})</script>`;

export function sheetPlugin() {
  let root = '', base = '/';
  return [{
    name: 'sheet-set',
    configResolved(config) { root = config.root; base = config.base; },
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const slug = unitSlug(root, ctx.filename);
        const e = slug && /<!--sheet:(frame|narrow)-->/.test(html) ? unitEntry(root, slug) : null;
        const out = e ? html.replace('<!--sheet:frame-->', () => unitFrame(e, base)).replace('<!--sheet:narrow-->', () => narrowSheet(root, slug, e.u)) : html;
        return { html: out, tags: [{ tag: 'style', children: OPT_IN, injectTo: 'head-prepend' },
          { tag: 'script', attrs: { 'data-sound': `${base}sound/page-turn` }, children: TURN, injectTo: 'head-prepend' },
          { tag: 'script', children: PRESS, injectTo: 'head-prepend' }] };
      },
    },
  }, {
    name: 'sheet-set:render-blocking',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const slug = unitSlug(root, ctx.filename);
        if (!slug) return html;
        const cues = existsSync(resolve(root, `public/bundles/${slug}/cues.json`))
          ? `<link rel="preload" as="fetch" crossorigin href="${base}bundles/${slug}/cues.json">` : '';
        const lazy = ctx.chunk?.dynamicImports.map((f) => ctx.bundle[f]).filter((c) => c?.type === 'chunk') ?? [];
        const gate = lazy.length ? PLATE_GATE(base, lazy.map((c) => c.fileName), lazy.flatMap((c) => [...(c.viteMetadata?.importedCss ?? [])])) : '';
        return html.replace(RENDER_BLOCKING, `${cues}${PLATE_FONT(base)}${gate}<script type="module" blocking="render"`);
      },
    },
  }];
}
