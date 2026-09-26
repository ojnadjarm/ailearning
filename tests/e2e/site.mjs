// Site checks under pages-sim: U01 at five widths (from 1024 px a sheet of the set with the plate: rail, a way back never covered (also in watch,
// drive, end), symmetric margins, on landscape the landing's paper across the whole field (no band past the sheet) and its box centred both ways; narrower, the narrow sheet: its chapter list, the way back,
// no plate code loaded), the 404 sheet at five widths (no horizontal scroll, symmetric margins, no spill, its one credit link (rel=author) and
// no other link but the way home), U01 says something without JavaScript, Pages 404/301. The homepage has its own checks in home.mjs.
import { mkdirSync, readFileSync } from 'node:fs';
import { harness, frames, until } from '../lib/harness.mjs';

const SIZES = [[400, 860], [768, 1024], [1366, 768], [1920, 1080], [2560, 1440]];
const CHAPTERS = JSON.parse(readFileSync('units/01-neuron/unit.json', 'utf8')).chapters.length;
/** The drawing sheet's edges [x0, y0, x1, y1] in drawing units. */
const SHEET = JSON.parse(readFileSync('units/01-neuron/unit/layout.ts', 'utf8').match(/export const SHEET[^=]*= (\[[^\]]+\])/)[1]);
const AUTHOR = readFileSync('README.md', 'utf8').match(/Directed by \[[^\]]+\]\((https:[^)]+)\)/)[1];
const { site, browser, faults, fault: fail, open, end } = await harness('site');
mkdirSync('out/shots', { recursive: true });

/** Smallest side of the way-back control if a click at its centre lands on it, else 0. */
const backHit = () => { window.__backHit = () => { const b = document.querySelector('.top .back'); if (!b || !b.getClientRects().length) return 0;
  const r = b.getBoundingClientRect(); return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('.back') ? Math.min(r.width, r.height) : 0; }; };

/** The narrow sheet as drawn: its class on the page, the chapter rows, and the margins of its column. */
const narrowOf = () => {
  const n = document.querySelector('section.narrow'), c = n?.firstElementChild?.getBoundingClientRect();
  return { on: document.documentElement.classList.contains('is-narrow') && !!n && getComputedStyle(n).display !== 'none',
    title: n?.querySelector('h1')?.textContent, rows: n?.querySelectorAll('.nc li').length ?? 0, stage: getComputedStyle(document.getElementById('stage')).display,
    colL: c?.left ?? 0, colR: innerWidth - (c?.right ?? 0) };
};

for (const [width, height] of SIZES) {
  const { page, log, close } = await open(site + 'u/01-neuron/', { width, height });
  await page.evaluate(backHit);
  const wide = width >= 1024;
  if (wide) await page.waitForFunction(() => window.__probe?.frames > 0, null, { timeout: 30000 });
  else { await page.evaluate(() => document.fonts.ready); await page.waitForLoadState('networkidle'); }
  const m = await page.evaluate((SHEET) => {
    const sh = document.querySelector('.sheet').getBoundingClientRect(), st = document.getElementById('stage'), d = window.__d, s = d?.s;
    const vis = (e) => !!e && getComputedStyle(e).display !== 'none' && e.getClientRects().length > 0;
    const W = st.clientWidth, H = st.clientHeight, x = (wx) => d.view.toScreen(wx, s.camY)[0];
    return { sw: document.documentElement.scrollWidth, iw: innerWidth, left: sh.left, right: innerWidth - sh.right, landscape: W > H,
      span: s ? (Math.min(W, x(SHEET[2])) - Math.max(0, x(SHEET[0]))) / W : 0, off: s ? x(s.camX) - W / 2 : 0, offY: s ? d.view.toScreen(s.camX, s.camY)[1] - H / 2 : 0,
      rail: vis(document.querySelector('.top')) ? document.querySelector('.top .sh0').textContent : null, of: document.querySelector('.top .sn')?.textContent,
      back: document.querySelector('.top .back')?.href, backHit: window.__backHit(), mark: vis(document.querySelector('#shell > .mark')),
      spill: [...document.querySelectorAll('.top *')].filter((e) => vis(e) && (e.getBoundingClientRect().right > sh.right + 1 || e.getBoundingClientRect().left < sh.left - 1)).length };
  }, SHEET);
  const n = await page.evaluate(narrowOf);
  const plate = log.requests.filter((u) => /\/assets\/main-[^/]+\.js$/.test(u)).length;
  if (m.sw !== m.iw) fail(`u01 ${width}: scrollWidth ${m.sw} != ${m.iw}`);
  if (Math.abs(m.left - m.right) > 1) fail(`u01 ${width}: margins ${m.left} / ${m.right}`);
  if (m.backHit < 44) fail(`u01 ${width}: the way back is covered or small (${m.backHit} px)`);
  if (m.back !== site) fail(`u01 ${width}: way back to ${m.back}`);
  if (m.spill) fail(`u01 ${width}: ${m.spill} header parts out of the sheet`);
  if (wide) {
    if (n.on) fail(`u01 ${width}: the narrow sheet is shown`);
    if (!plate) fail(`u01 ${width}: the plate code was not loaded`);
    if (m.rail !== 'Sheet I · The neuron' || m.of !== 'Sheet 1 of 43') fail(`u01 ${width}: header rail ${m.rail} / ${m.of}`);
    if (m.mark) fail(`u01 ${width}: bare mark shown`);
    if (m.landscape && m.span < 0.999) fail(`u01 ${width}: the paper spans ${(m.span * 100).toFixed(1)} % of the field`);
    if (m.landscape && (Math.abs(m.off) > 2 || Math.abs(m.offY) > 2)) fail(`u01 ${width}: the landing is ${m.off.toFixed(1)}, ${m.offY.toFixed(1)} px off centre`);
  } else {
    if (!n.on || n.stage !== 'none') fail(`u01 ${width}: narrow sheet ${n.on}, stage display ${n.stage}`);
    if (n.title !== 'Plate I is drawn for a desktop' || n.rows !== CHAPTERS) fail(`u01 ${width}: narrow sheet title ${n.title}, ${n.rows} chapter rows`);
    if (Math.abs(n.colL - n.colR) > 1) fail(`u01 ${width}: narrow column margins ${n.colL} / ${n.colR}`);
    if (plate) fail(`u01 ${width}: the plate code was loaded on the narrow sheet`);
  }
  log.errors.forEach((e) => fail(`u01 ${width}: console ${e}`));
  log.failed.forEach((e) => fail(`u01 ${width}: request ${e}`));
  await page.screenshot({ path: `out/shots/u01-${width}.png` });
  console.log(`u01 ${width}x${height}: ${wide ? `paper span ${(m.span * 100).toFixed(1)} %, landing off centre ${m.off.toFixed(1)}, ${m.offY.toFixed(1)} px` : `narrow sheet, ${n.rows} chapters`}, scroll ${m.sw}/${m.iw}, margins ${m.left.toFixed(1)}/${m.right.toFixed(1)}, `
    + `requests ${log.requests.length}, failed ${log.failed.length}`);
  await close();
}

{
  const { page, log, close } = await open(site + 'u/01-neuron/', { width: 768, height: 1024 });
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.waitForFunction(() => window.__probe?.frames > 0, null, { timeout: 30000 }).catch(() => fail('u01 768 → 1366: the plate did not draw after the window widened'));
  const n = await page.evaluate(narrowOf);
  if (n.on) fail('u01 768 → 1366: the narrow sheet stayed');
  log.errors.forEach((e) => fail(`u01 768 → 1366: console ${e}`));
  console.log(`u01 768 → 1366: narrow sheet ${n.on ? 'stayed' : 'gone'}, plate drawn`);
  await close();
}

{
  const { page, log, close } = await open(site + 'u/01-neuron/?t=30', { width: 1366, height: 768 });
  await page.waitForFunction(() => window.__probe?.ready > 0, null, { timeout: 30000 });
  await page.evaluate(backHit);
  const hits = { watch: await page.evaluate(() => window.__backHit()) };
  for (const beat of ['drive', 'end']) {
    await page.evaluate((b) => window.__rec.go(b), beat);
    await until(page, (b) => window.__d.beats.name === b, beat);
    await frames(page);
    hits[beat] = await page.evaluate(() => window.__backHit());
  }
  for (const [beat, px] of Object.entries(hits)) if (px < 44) fail(`u01 ${beat}: the way back is covered or small (${px} px)`);
  log.errors.forEach((e) => fail(`u01 beats: console ${e}`));
  console.log(`u01 way back through the lesson: ${JSON.stringify(hits)}`);
  await close();
}

for (const [width, height] of SIZES) {
  const { page, log, close } = await open(site + 'u/99-missing/deep/', { width, height });
  await page.evaluate(() => document.fonts.ready);
  const m = await page.evaluate(() => {
    const r = document.querySelector('.sheet').getBoundingClientRect();
    return { sw: document.documentElement.scrollWidth, iw: innerWidth, left: r.left, right: innerWidth - r.right,
      links: [...document.querySelectorAll('a:not([rel~=author])')].map((a) => a.href),
      author: [...document.querySelectorAll('a[rel~=author]')].map((a) => a.href).join(),
      spill: [...document.querySelectorAll('.sheet *')].filter((e) => { const b = e.getBoundingClientRect(); return b.right > r.right + 1 || b.left < r.left - 1; })
        .map((e) => e.tagName + '.' + e.getAttribute('class')) };
  });
  if (m.sw !== m.iw) fail(`404 ${width}: scrollWidth ${m.sw} != ${m.iw}`);
  if (Math.abs(m.left - m.right) > 1) fail(`404 ${width}: margins ${m.left} / ${m.right}`);
  if (m.spill.length) fail(`404 ${width}: spill out of the sheet: ${m.spill.join(', ')}`);
  if (m.links.join() !== site) fail(`404 ${width}: links ${m.links.join()} (want one link to ${site})`);
  if (m.author !== AUTHOR) fail(`404 ${width}: credit link ${m.author}, want ${AUTHOR}`);
  log.errors.filter((e, i) => i > 0 || !/status of 404/.test(e)).forEach((e) => fail(`404 ${width}: console ${e}`));
  log.failed.filter((e) => !/^404 .*\/u\/99-missing\/deep\/$/.test(e)).forEach((e) => fail(`404 ${width}: request ${e}`));
  await page.screenshot({ path: `out/shots/404-${width}.png`, fullPage: true });
  console.log(`404 ${width}x${height}: scroll ${m.sw}/${m.iw}, margins ${m.left.toFixed(1)}/${m.right.toFixed(1)}, links ${m.links.length}`);
  await close();
}

{
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 400, height: 860 } });
  const page = await ctx.newPage();
  await page.goto(site + 'u/01-neuron/');
  const m = await page.evaluate(() => ({ text: document.body.innerText.trim(), sw: document.documentElement.scrollWidth, iw: innerWidth }));
  if (!/JavaScript/.test(m.text)) fail(`u01 without JavaScript: body text is ${JSON.stringify(m.text.slice(0, 60))}`);
  if (m.sw !== m.iw) fail(`u01 without JavaScript: scrollWidth ${m.sw} != ${m.iw}`);
  await page.screenshot({ path: 'out/shots/u01-nojs-400.png' });
  console.log(`u01 without JavaScript: ${m.text.length} chars of text`);
  await ctx.close();
}

const origin = new URL(site).origin;
const status = async (p) => (await fetch(origin + p, { redirect: 'manual' })).status;
const expect = { '/ailearning': 301, '/ailearning/u/01-neuron': 301, '/ailearning/u/01-neuron/': 200, '/ailearning/no-such-sheet/': 404, '/elsewhere/': 404 };
for (const [p, want] of Object.entries(expect)) { const got = await status(p); if (got !== want) fail(`pages-sim ${p}: ${got}, want ${want}`); }

await end(`site: ${SIZES.length * 2 + 1} pages, ${faults.length} faults`);
