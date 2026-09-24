/** Vite plugin: frames every unit page as a sheet of the set and tags the direction of each sheet change on every page. */
import { existsSync, readFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { frame, back } from './frame.mjs';
import { esc } from '../homepage/render/html.mjs';

/** Opt-in to the sheet change, inline: an external stylesheet behind a module script lost the race to the first reveal. */
const OPT_IN = '@view-transition{navigation:auto}';

/** Sheet number of a URL (Sheet 0 = the homepage, Sheet n = u/<nn>-slug/). Each change is typed forward or back, and the earlier sheet of the two
 * is the turning page (`html.turning`) with its paper leaf (`.leaf`) for the capture: on the old page at pageswap going forward, on the new page
 * at pagereveal going back.
 * The new page plays the page-turn sound with the turn; where autoplay is blocked it stays silent. */
const DIRECTION = (base) => `(()=>{const S=${JSON.stringify(base + 'sound/page-turn')};const n=u=>+((new URL(u).pathname.match(/\\/u\\/(\\d+)-/)||[])[1]||0),still=()=>matchMedia('(prefers-reduced-motion:reduce)').matches,`
  + `leaf=()=>{const d=document.createElement('div'),h=document.documentElement;d.className='leaf';d.setAttribute('aria-hidden','true');(document.body||h).append(d);h.classList.add('turning')},`
  + `clear=()=>{document.documentElement.classList.remove('turning');document.querySelectorAll('.leaf').forEach(d=>d.remove())};`
  + `addEventListener('pageswap',e=>{const a=e.activation;if(e.viewTransition&&a&&a.entry&&!still()&&n(a.entry.url)>n(location.href))leaf()});`
  + `addEventListener('pagereveal',e=>{clear();const v=e.viewTransition,f=self.navigation&&navigation.activation&&navigation.activation.from;`
  + `if(!v||!f)return;const b=n(f.url)>n(location.href);v.types.add(b?'back':'forward');if(still())return;new Audio(S+(b?'-back':'')+(new Audio().canPlayType('audio/ogg; codecs=opus')?'.opus':'.m4a')).play().catch(()=>{});`
  + `if(b){leaf();v.finished.finally(clear)}})})()`;

/** Header rail of the unit sheet for `slug`, from the homepage content. */
function unitFrame(root, base, slug) {
  const c = JSON.parse(readFileSync(resolve(root, 'content/homepage.json'), 'utf8'));
  const u = c.units.find((x) => x.slug === slug);
  if (!u) throw new Error(`sheet frame: no unit with slug ${slug} in content/homepage.json`);
  return frame({ base, name: esc(c.site.name), label: esc(`Sheet ${u.plate} · ${u.title}`),
    lead: back(base), right: `<span class="sn">Sheet <b class="of">${u.n}</b> of ${c.units.length}</span>` });
}

/** Unit page path → slug, or undefined for any other page. */
const unitSlug = (root, filename) => relative(root, resolve(filename)).split(sep).join('/').match(/^u\/([^/]+)\/index\.html$/)?.[1];

/** The sheet change reveals the new page at its first render; a unit sheet's drawing is built by its module, so that module blocks the
 * render (Vite rewrites the entry tag, so the attribute is added after it). Cold, Sheet 0 stays until Sheet I can be drawn, never an empty sheet. */
const RENDER_BLOCKING = /<script type="module"(?![^>]*\bblocking=)/;
/** What the module awaits before its first draw, fetched beside it: the cue sheet and the one plate weight the frame CSS does not load. */
const PLATE_FONT = (base) => `<link rel="preload" as="font" type="font/woff2" crossorigin href="${base}fonts/ibm-plex-sans-condensed-latin-500-normal.woff2">`;

export function sheetPlugin() {
  let root = '', base = '/';
  return [{
    name: 'sheet-set',
    configResolved(config) { root = config.root; base = config.base; },
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const slug = unitSlug(root, ctx.filename);
        const out = slug && html.includes('<!--sheet:frame-->') ? html.replace('<!--sheet:frame-->', () => unitFrame(root, base, slug)) : html;
        return { html: out, tags: [{ tag: 'style', children: OPT_IN, injectTo: 'head-prepend' }, { tag: 'script', children: DIRECTION(base), injectTo: 'head-prepend' }] };
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
        return html.replace(RENDER_BLOCKING, `${cues}${PLATE_FONT(base)}<script type="module" blocking="render"`);
      },
    },
  }];
}
