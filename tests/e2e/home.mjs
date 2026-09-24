// Homepage checks under pages-sim (first 10 seconds + site rules): per state and width, no horizontal scroll, symmetric margins,
// nothing spills out of the sheet, one primary above the fold, promise in the first screen, dial ≥ 44 px, no question marks,
// ≤ 3.5 screens on a phone, links only to built pages (U01 is the one live unit), no engine or three.js requests, 0 failed requests.
// Then behaviour: keys turn the dial, stored progress → returning, bad or throwing storage → new, reduced motion, no JavaScript.
import { mkdirSync, readFileSync } from 'node:fs';
import { startPagesSim } from '../lib/pages-sim.mjs';
import { launch, open } from '../lib/browser.mjs';

const SIZES = [[400, 800], [400, 860], [768, 1024], [1366, 768], [1920, 1080], [2560, 1440]];
const AUTHOR = readFileSync('README.md', 'utf8').match(/Directed by \[[^\]]+\]\((https:[^)]+)\)/)[1];
const sim = await startPagesSim();
const U01 = sim.url + 'u/01-neuron/';
const browser = await launch();
const faults = [];
const fail = (m) => faults.push(m);
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
    const { page, log, close } = await open(browser, `${sim.url}?state=${state}`, { width, height });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1800);
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
    const bad = m.links.filter((h) => h !== sim.url && h !== U01);
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
      await page.waitForTimeout(1800);
      await page.setViewportSize({ width, height: m.height });
      await page.waitForTimeout(150);
      await page.screenshot({ path: `out/shots/home-${state}-${width}.png` });
    }
    console.log(`${tag}: ${(m.height / height).toFixed(2)} screens, margins ${m.left.toFixed(1)}/${m.right.toFixed(1)}, primary "${m.primaries[0]?.text}", links ${m.links.length}`);
    await close();
  }
}

/** Opens the homepage at 1920 with an init script (storage fixtures) and optional context options. */
async function at(init, ctxOpts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, ...ctxOpts });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  if (init) await page.addInitScript(init);
  await page.goto(sim.url, { waitUntil: 'load' });
  await page.waitForTimeout(200);
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
    await page.goto(sim.url, { waitUntil: 'load' });
    await page.waitForTimeout(1800);
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
    await page.waitForTimeout(1400);
    const dx = await page.evaluate(() => document.querySelector('.asm-wide .slot[data-ring="1"]').style.getPropertyValue('--dx'));
    if (!dx || dx === '0px' || dx === '-0px') fail(`${name}: ring 1 did not slide (--dx ${dx})`);
  }
  console.log(`${name}: ${got.state}, "${got.text}"`);
  await close();
}
{
  const { page, close } = await at(null, { reducedMotion: 'reduce' });
  await page.evaluate(() => document.querySelector('.how').scrollIntoView());
  await page.waitForTimeout(300);
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

await browser.close();
await sim.close();
faults.forEach((f) => console.error(`home: ${f}`));
console.log(`home: ${SIZES.length * 3} views + 9 behaviours, ${faults.length} faults`);
process.exit(faults.length ? 1 : 0);
