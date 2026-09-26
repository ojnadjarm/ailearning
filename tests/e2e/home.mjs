// Homepage checks under pages-sim (first 10 seconds + site rules): per state and width, no horizontal scroll, symmetric margins,
// nothing spills out of the sheet, one primary above the fold, promise in the first screen, dial ≥ 44 px, no question marks,
// ≤ 3.5 screens on a phone, links only to built pages (U01 is the one live unit), no engine or three.js requests, 0 failed requests.
// Then behaviour: keys turn the dial, stored progress → returning, bad or throwing storage → new, reduced motion, no JavaScript.
// Parts list: every row at 400–2560, the numeral fits its column with a clear gap, text wraps inside its row.
// Phone share button at 360 and 400: after a press its label never shows the address and it stays inside the sheet.
import { mkdirSync, readFileSync } from 'node:fs';
import { harness, frames, settled, until } from '../lib/harness.mjs';

const SIZES = [[400, 800], [400, 860], [768, 1024], [1366, 768], [1920, 1080], [2560, 1440]];
const AUTHOR = readFileSync('README.md', 'utf8').match(/Directed by \[[^\]]+\]\((https:[^)]+)\)/)[1];
const { site, browser, faults, fault: fail, open, end } = await harness('home');
const U01 = site + 'u/01-neuron/';
mkdirSync('out/shots', { recursive: true });

/** Layout facts of the loaded page. */
/** Leader segments of the visible Fig. 1 that cross a label's box, and labels that overlap (drafting rule: nothing crosses lettering). */
const crossings = (page) => page.evaluate(() => {
  const svg = [...document.querySelectorAll('svg.asm')].find((e) => getComputedStyle(e).display !== 'none' && e.getClientRects().length);
  const boxes = [...svg.querySelectorAll('text')].filter((t) => t.textContent.trim()).map((t) => ({ el: t, t: t.textContent, r: t.getBoundingClientRect() }));
  const hit = (a, b, r) => {
    // Liang–Barsky clip of segment a→b against rectangle r.
    let t0 = 0, t1 = 1;
    const dx = b.x - a.x, dy = b.y - a.y;
    for (const [p, q] of [[-dx, a.x - r.left], [dx, r.right - a.x], [-dy, a.y - r.top], [dy, r.bottom - a.y]]) {
      if (p === 0) { if (q < 0) return false; continue; }
      const u = q / p;
      if (p < 0) t0 = Math.max(t0, u); else t1 = Math.min(t1, u);
      if (t0 > t1) return false;
    }
    return true;
  };
  const out = [];
  for (const path of svg.querySelectorAll('path.ld, path.run-ld')) {
    const m = path.getScreenCTM(), pts = path.getAttribute('d').slice(1).split('L').map((p) => {
      const [x, y] = p.trim().split(/\s+/).map(Number);
      return new DOMPoint(x, y).matrixTransform(m);
    });
    const owner = path.closest('.co')?.querySelector('text')?.textContent ?? 'balloon';
    for (let i = 1; i < pts.length; i++) for (const b of boxes) if (hit(pts[i - 1], pts[i], b.r)) out.push(`${owner} leader × ${b.t}`);
  }
  const vis = boxes.filter((b) => b.r.width && getComputedStyle(b.el).display !== 'none' && !b.el.closest('[style*="display: none"]'));
  // Line boxes carry ascent/descent padding (stacked caption lines touch): compare the inner 60 % across the line.
  const ink = ({ r }) => { const d = 0.2 * Math.min(r.width, r.height); return r.height <= r.width ? [r.left, r.right, r.top + d, r.bottom - d] : [r.left + d, r.right - d, r.top, r.bottom]; };
  vis.forEach((a, i) => vis.slice(i + 1).forEach((b) => {
    const [al, ar, at, ab] = ink(a), [bl, br, bt, bb] = ink(b);
    if (al < br && bl < ar && at < bb && bt < ab) out.push(`${a.t} × ${b.t}`);
  }));
  return [...new Set(out)];
});

const measure = (page) => page.evaluate(() => {
  const de = document.documentElement, sh = document.querySelector('.sheet').getBoundingClientRect();
  const vis = (e) => getComputedStyle(e).display !== 'none' && e.getClientRects().length;
  const prim = [...document.querySelectorAll('.primary')].filter(vis);
  const svg = [...document.querySelectorAll('svg.asm')].find(vis);
  const hit = svg?.querySelector('.hit')?.getBoundingClientRect();
  return {
    state: de.dataset.state, sw: de.scrollWidth, iw: innerWidth, ih: innerHeight, left: sh.left, right: innerWidth - sh.right, height: de.scrollHeight,
    primaries: prim.map((e) => ({ text: e.textContent, bottom: e.getBoundingClientRect().bottom, href: e.href ?? null })),
    subBottom: document.querySelector('.sub').getBoundingClientRect().bottom, hitPx: hit ? Math.min(hit.width, hit.height) : 0,
    question: /\?/.test(document.body.innerText),
    links: [...document.querySelectorAll('a[href]:not([rel~=author])')].map((a) => a.href).filter((h) => !h.includes('#')),
    author: [...document.querySelectorAll('a[rel~=author]')].map((a) => a.href),
    u01Link: document.querySelector('#p-U01 .ti')?.hasAttribute('href'),
    spill: [...document.querySelectorAll('.sheet *')].filter((e) => !e.closest('svg') && vis(e)).filter((e) => {
      const b = e.getBoundingClientRect();
      return b.width && (b.right > sh.right + 1 || b.left < sh.left - 1);
    }).map((e) => e.tagName + '.' + e.className),
  };
});

for (const state of ['new', 'returning', 'phone']) {
  for (const [width, height] of SIZES) {
    const tag = `home ${state} ${width}x${height}`;
    const { page, log, close } = await open(`${site}?state=${state}`, { width, height });
    await page.evaluate(() => document.fonts.ready);
    await settled(page);
    const m = await measure(page);
    if (m.state !== state) fail(`${tag}: data-state ${m.state}`);
    if (m.sw !== m.iw) fail(`${tag}: scrollWidth ${m.sw} != ${m.iw}`);
    if (Math.abs(m.left - m.right) > 1) fail(`${tag}: margins ${m.left} / ${m.right}`);
    if (m.spill.length) fail(`${tag}: spill out of the sheet: ${m.spill.slice(0, 5).join(', ')}`);
    if (m.primaries.length !== 1) fail(`${tag}: ${m.primaries.length} visible primaries`);
    else if (m.primaries[0].bottom > height) fail(`${tag}: primary below the fold (${Math.round(m.primaries[0].bottom)})`);
    if (m.subBottom > height) fail(`${tag}: promise and subline not in the first screen`);
    if (m.hitPx < 44) fail(`${tag}: dial hit area ${m.hitPx} px`);
    if (m.question) fail(`${tag}: a question mark in the copy`);
    if (width <= 400 && m.height / 860 > 3.5) fail(`${tag}: ${(m.height / 860).toFixed(2)} screens of 860 (max 3.5)`);
    const bad = m.links.filter((h) => h !== site && h !== U01);
    if (bad.length) fail(`${tag}: links to ${bad.join(', ')}`);
    if (state === 'phone' && m.u01Link) fail(`${tag}: U01 links to a lesson on a phone`);
    if (state !== 'phone' && !m.links.includes(U01)) fail(`${tag}: no link to U01`);
    if (m.author.join() !== AUTHOR) fail(`${tag}: credit links ${m.author.join()}, want one to ${AUTHOR}`);
    if (log.requests.some((u) => /three|u-01|\.opus|\.m4a/.test(u))) fail(`${tag}: engine, three.js or audio requested`);
    (await crossings(page)).forEach((c) => fail(`${tag}: ${c}`));
    log.errors.forEach((e) => fail(`${tag}: console ${e}`));
    log.failed.forEach((e) => fail(`${tag}: request ${e}`));
    if (height !== 800) {
      // A full-page capture here drops the finished draw-on callouts; a viewport as tall as the page keeps them.
      await page.evaluate(() => document.querySelector('.how').scrollIntoView({ block: 'center' }));
      await settled(page);
      await page.setViewportSize({ width, height: m.height });
      await frames(page);
      await page.screenshot({ path: `out/shots/home-${state}-${width}.png` });
    }
    console.log(`${tag}: ${(m.height / height).toFixed(2)} screens, margins ${m.left.toFixed(1)}/${m.right.toFixed(1)}, primary "${m.primaries[0]?.text}", links ${m.links.length}`);
    await close();
  }
}

/** Parts list geometry, every ring open: each numeral fits its cell with a clear gap, text stays in its row and cells never overlap. */
const rows = (page) => page.evaluate(() => {
  document.querySelectorAll('.bom details').forEach((d) => { d.open = true; });
  const ink = (e) => { const r = document.createRange(); r.selectNodeContents(e); return r.getBoundingClientRect(); };
  const cut = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
  const out = [], bh = document.querySelector('.bh'), head = getComputedStyle(bh).display !== 'none' && bh.children[1].getBoundingClientRect();
  for (const u of document.querySelectorAll('.u')) {
    const pn = u.querySelector('.pn'), n = pn.textContent, pb = pn.getBoundingClientRect(), pi = ink(pn), ub = u.getBoundingClientRect();
    const em = parseFloat(getComputedStyle(pn).fontSize), gap = u.querySelector('.desc').getBoundingClientRect().left - pi.right;
    if (pi.left < pb.left - 0.5 || pi.right > pb.right + 0.5) out.push(`${n}: numeral ${pi.width.toFixed(0)} px in a ${pb.width.toFixed(0)} px cell`);
    if (gap < 0.5 * em) out.push(`${n}: gap to the title ${gap.toFixed(1)} px (min ${0.5 * em} px)`);
    if (head && Math.abs(head.width - pb.width) > 0.5) out.push(`${n}: Plate column ${pb.width.toFixed(1)} px, header ${head.width.toFixed(1)} px`);
    const cells = [...u.querySelectorAll('.fig, .pn, .desc, .uses, .min, .st')].filter((e) => e.getClientRects().length);
    for (const e of u.querySelectorAll('.pn, .ti, .ln, .gm, .uses, .min, .st')) {
      const r = ink(e);
      if (e.scrollWidth > e.clientWidth + 1) out.push(`${n} .${e.className}: clipped (${e.scrollWidth} > ${e.clientWidth})`);
      if (r.width && (r.right > ub.right + 1 || r.left < ub.left - 1 || r.right > innerWidth)) out.push(`${n} .${e.className}: text outside its row`);
    }
    cells.forEach((a, i) => cells.slice(i + 1).forEach((b) => {
      if (cut(a.getBoundingClientRect(), b.getBoundingClientRect())) out.push(`${n}: .${a.className} overlaps .${b.className}`);
    }));
  }
  return { n: document.querySelectorAll('.u').length, out };
});
for (const [width, height] of [[400, 860], [768, 1024], [1366, 768], [1920, 1080], [2560, 1440]]) {
  const { page, close } = await open(`${site}?state=new`, { width, height });
  await page.evaluate(() => document.fonts.ready);
  const r = await rows(page);
  r.out.forEach((f) => fail(`parts list ${width}: ${f}`));
  console.log(`parts list ${width}: ${r.n} rows, ${r.out.length} faults`);
  await close();
}

/** Opens the homepage at 1920 with an init script (storage fixtures) and optional context options. */
async function at(init, ctxOpts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, ...ctxOpts });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  if (init) await page.addInitScript(init);
  await page.goto(site, { waitUntil: 'load' });
  if (ctxOpts.javaScriptEnabled !== false) await frames(page);
  return { page, errors, close: () => ctx.close() };
}
const cta = (page) => page.evaluate(() => {
  const p = [...document.querySelectorAll('.primary')].find((e) => getComputedStyle(e).display !== 'none');
  return { state: document.documentElement.dataset.state, text: p?.textContent, href: p?.href };
});

{
  const { page, close } = await at();
  await page.focus('.asm-wide .hit');
  for (let i = 0; i < 2; i++) await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowLeft');
  const m = await page.evaluate(() => ({ now: document.querySelector('.asm-wide .hit').getAttribute('aria-valuenow'), weight: getComputedStyle(document.querySelector('.asm-wide .wco')).display }));
  if (m.now !== '-0.5' || m.weight === 'none') fail(`dial keys: value ${m.now}, WEIGHT callout ${m.weight}`);
  console.log(`dial keys: value ${m.now}, WEIGHT ${m.weight}`);
  await close();
}
{
  // Every part fully seated: the machine at its tightest, where a moved part could bring a leader over a neighbour's label.
  const ids = JSON.parse(readFileSync('content/homepage.json', 'utf8')).units.map((u) => u.id);
  const all = JSON.stringify({ units: Object.fromEntries(ids.map((id) => [id, { state: 'cleared' }])), resume: { unit: 'U01', beat: 'drive' } });
  for (const [width, height] of [[400, 860], [768, 1024], [1920, 1080]]) {
    const ctx = await browser.newContext({ viewport: { width, height } });
    const page = await ctx.newPage();
    await page.addInitScript((v) => localStorage.setItem('plates:v1:progress', v), all);
    await page.goto(site, { waitUntil: 'load' });
    await settled(page);
    const c = await crossings(page);
    c.forEach((x) => fail(`all seated ${width}: ${x}`));
    console.log(`all seated ${width}: ${c.length} leader crossings`);
    await ctx.close();
  }
}
const store = (v) => `localStorage.setItem('plates:v1:progress', ${JSON.stringify(v)})`;
const cases = [
  ['stored progress on U01', store(JSON.stringify({ units: { U01: { state: 'cleared' } }, resume: { unit: 'U01', beat: 'drive' } })), { state: 'returning', text: 'Continue: Plate I, Drive', href: U01 }],
  ['stored progress on a phantom', store(JSON.stringify({ units: {}, resume: { unit: 'U03', beat: 'drive' } })), { state: 'new', text: 'Begin: Plate I', href: U01 }],
  ['bad stored JSON', store('{not json'), { state: 'new', text: 'Begin: Plate I', href: U01 }],
  ['storage that throws', "Object.defineProperty(window, 'localStorage', { get() { throw new Error('denied'); } })", { state: 'new', text: 'Begin: Plate I', href: U01 }],
  ['no progress', null, { state: 'new', text: 'Begin: Plate I', href: U01 }],
];
for (const [name, init, want] of cases) {
  const { page, errors, close } = await at(init);
  const got = await cta(page);
  if (JSON.stringify(got) !== JSON.stringify(want)) fail(`${name}: ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
  errors.forEach((e) => fail(`${name}: page error ${e}`));
  if (name === 'stored progress on U01') {
    await until(page, () => !['', '0px', '-0px'].includes(document.querySelector('.asm-wide .slot[data-ring="1"]').style.getPropertyValue('--dx')), null, 5000);
    const dx = await page.evaluate(() => document.querySelector('.asm-wide .slot[data-ring="1"]').style.getPropertyValue('--dx'));
    if (!dx || dx === '0px' || dx === '-0px') fail(`${name}: ring 1 did not slide (--dx ${dx})`);
  }
  console.log(`${name}: ${got.state}, "${got.text}"`);
  await close();
}
/** The phone's share button after a press: its label never shows the address, and the button with its hatch stays inside the sheet. */
const shareFit = (page) => page.evaluate(() => {
  const b = document.querySelector('[data-share]'), r = b.getBoundingClientRect(), sh = document.querySelector('.sheet').getBoundingClientRect();
  return { text: b.textContent, right: r.right + 6, bottom: r.bottom + 6, sheet: sh.right, sw: document.documentElement.scrollWidth, iw: innerWidth };
});
for (const [path, init, want] of [
  ['no share sheet, clipboard refused', () => { Object.defineProperty(navigator, 'share', { value: undefined }); Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('denied')) } }); }, 'Copy link'],
  ['share sheet cancelled', () => { Object.defineProperty(navigator, 'share', { value: () => Promise.reject(new DOMException('cancel', 'AbortError')) }); }, null],
  ['no share sheet, link copied', () => { Object.defineProperty(navigator, 'share', { value: undefined }); Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.resolve() } }); }, 'Link copied'],
]) for (const width of [360, 400]) {
  const tag = `share ${width}, ${path}`;
  const ctx = await browser.newContext({ viewport: { width, height: 800 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.addInitScript(init);
  await page.goto(`${site}?state=phone`, { waitUntil: 'load' });
  const label = await page.evaluate(() => document.querySelector('[data-share]').textContent);
  await page.tap('[data-share]');
  if (want) await until(page, (w) => document.querySelector('[data-share]').textContent === w, want, 5000); else await frames(page, 3);
  const m = await shareFit(page);
  if (m.text !== (want ?? label)) fail(`${tag}: label "${m.text}", want "${want ?? label}"`);
  if (/https?:|\//.test(m.text)) fail(`${tag}: label shows the address`);
  if (m.right > m.sheet + 0.5) fail(`${tag}: button reaches ${m.right.toFixed(1)} px, sheet ends at ${m.sheet.toFixed(1)}`);
  if (m.sw !== m.iw) fail(`${tag}: scrollWidth ${m.sw} != ${m.iw}`);
  console.log(`${tag}: "${m.text}", right edge ${m.right.toFixed(1)} of ${m.sheet.toFixed(1)}`);
  await ctx.close();
}
{
  const { page, close } = await at(null, { reducedMotion: 'reduce' });
  await page.evaluate(() => document.querySelector('.how').scrollIntoView());
  await until(page, () => !!document.querySelector('.det svg.run'), null, 5000);
  await frames(page);
  const running = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length);
  if (running) fail(`reduced motion: ${running} animations running`);
  console.log(`reduced motion: ${running} running animations`);
  await close();
}
{
  const { page, close } = await at(null, { javaScriptEnabled: false });
  const m = await page.evaluate(() => ({ primaries: [...document.querySelectorAll('.primary')].filter((e) => getComputedStyle(e).display !== 'none').map((e) => e.textContent), sw: document.documentElement.scrollWidth, iw: innerWidth }));
  if (m.primaries.join() !== 'Begin: Plate I' || m.sw !== m.iw) fail(`no JavaScript: ${JSON.stringify(m)}`);
  console.log(`no JavaScript: primary "${m.primaries.join()}"`);
  await close();
}

await end(`home: ${SIZES.length * 3} views + 5 parts-list widths + 9 behaviours + 6 share presses, ${faults.length} faults`);
