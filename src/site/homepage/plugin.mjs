/** Vite plugin: validates the homepage content, renders the exploded assembly page and fills the root index.html shell. */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { validate } from '../../../tools/content-check.mjs';
import { layout, ROWS } from './draw/layout.mjs';
import { page } from './render/page.mjs';
import { CREDITS } from './credits.mjs';

const THUMB = './src/site/homepage/plate-i.avif';

/** Content with `href` set on live units: status "drawn" and a built page at u/<slug>/. */
function load(root, base) {
  const file = resolve(root, 'content/homepage.json');
  const c = JSON.parse(readFileSync(file, 'utf8'));
  const errors = validate(c);
  for (const u of c.units.filter((u) => u.status === 'drawn')) {
    if (existsSync(resolve(root, 'u', u.slug, 'index.html'))) u.href = `${base}u/${u.slug}/`;
    else errors.push(`${u.id} is drawn but u/${u.slug}/index.html does not exist`);
  }
  if (!c.units.some((u) => u.href)) errors.push('no live unit to begin with');
  if (errors.length) throw new Error(`homepage content:\n  ${errors.join('\n  ')}`);
  return c;
}

export function homePlugin() {
  let root = '', base = '/';
  const layouts = Object.fromEntries(Object.entries(ROWS).map(([k, rows]) => [k, layout(rows)]));
  return {
    name: 'home-assembly',
    configResolved(config) { root = config.root; base = config.base; },
    configureServer(server) { server.watcher.add(resolve(root, 'content/homepage.json')); },
    handleHotUpdate({ file, server }) { if (file.endsWith('content/homepage.json')) server.ws.send({ type: 'full-reload' }); },
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        if (resolve(ctx.filename) !== resolve(root, 'index.html')) return html;
        const { head, body } = page(load(root, base), layouts, { base, credits: CREDITS, thumb: THUMB });
        return html.replace('<!--home:head-->', () => head).replace('<!--home:body-->', () => body);
      },
    },
  };
}
