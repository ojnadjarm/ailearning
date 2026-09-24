// Homepage budget (desktop 1920x1080, phone 400x860): LCP < 1.0 s, CLS 0, HTML + CSS ≤ 40 kB gzip, JS ≤ 30 kB, first visit
// ≤ 700 / 450 kB, no audio or three.js before a click, 0 frames drawn in 3 s after the strip settles.
// Usage: node tests/e2e/home-perf.mjs [url] (default: dist under pages-sim). Byte budgets are counted gzip, as Pages serves them.
import { gzipSync } from 'node:zlib';
import { startPagesSim } from '../lib/pages-sim.mjs';
import { launch } from '../lib/browser.mjs';

const BUDGET = { lcp: 1000, cls: 0, htmlCss: 40 * 1024, js: 30 * 1024, visit: { desktop: 700 * 1024, phone: 450 * 1024 }, idleFrames: 0 };
const sim = process.argv[2] ? null : await startPagesSim();
const url = process.argv[2] ?? sim.url;
const browser = await launch();
const faults = [];
const kb = (n) => +(n / 1024).toFixed(1);

for (const [view, width, height] of [['desktop', 1920, 1080], ['phone', 400, 860]]) {
  const ctx = await browser.newContext({ viewport: { width, height }, ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  const bodies = [];
  page.on('response', async (r) => { try { bodies.push({ url: r.url(), type: r.request().resourceType(), gz: gzipSync(await r.body()).length }); } catch { /* redirects have no body */ } });
  await page.addInitScript(() => {
    window.__lcp = { t: 0, el: '' }; window.__cls = 0;
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = { t: e.startTime, el: `${e.element?.tagName}.${e.element?.getAttribute('class') ?? ''}` }; }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const { lcp, cls } = await page.evaluate(() => ({ lcp: window.__lcp, cls: window.__cls }));
  await page.evaluate(() => document.querySelector('.how').scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(2500);
  const framesIn = async (ms, act = async () => {}) => {
    await browser.startTracing(page, { categories: ['disabled-by-default-devtools.timeline.frame', 'devtools.timeline'] });
    await act();
    await page.waitForTimeout(ms);
    return JSON.parse((await browser.stopTracing()).toString()).traceEvents.filter((e) => e.name === 'DrawFrame').length;
  };
  const frames = await framesIn(3000);
  const selftest = await framesIn(600, () => page.evaluate(() => document.documentElement.style.setProperty('--w', 3)));
  if (!selftest) faults.push(`${view}: the frame counter saw 0 frames while the dial turned (counter broken)`);
  const sum = (f) => bodies.filter(f).reduce((a, b) => a + b.gz, 0);
  const row = {
    view, lcpMs: Math.round(lcp.t), lcpEl: lcp.el, cls: +cls.toFixed(4),
    htmlCssKB: kb(sum((b) => b.type === 'document' || b.type === 'stylesheet')), jsKB: kb(sum((b) => b.type === 'script')),
    visitKB: kb(sum(() => true)), requests: bodies.length, idleFrames: frames, counterSelftest: selftest,
    audioOrThree: bodies.filter((b) => /\.(opus|m4a)$|three|u-01/.test(b.url)).length,
  };
  const over = [];
  if (row.lcpMs >= BUDGET.lcp) over.push('LCP');
  if (row.cls > BUDGET.cls) over.push('CLS');
  if (row.htmlCssKB * 1024 > BUDGET.htmlCss) over.push('HTML+CSS');
  if (row.jsKB * 1024 > BUDGET.js) over.push('JS');
  if (row.visitKB * 1024 > BUDGET.visit[view]) over.push('first visit');
  if (row.idleFrames > BUDGET.idleFrames) over.push('idle frames');
  if (row.audioOrThree) over.push('audio or three.js loaded');
  over.forEach((o) => faults.push(`${view}: over budget: ${o}`));
  console.log(JSON.stringify(row), over.length ? `OVER ${over.join(', ')}` : 'OK');
  await ctx.close();
}

await browser.close();
await sim?.close();
faults.forEach((f) => console.error(`home-perf: ${f}`));
process.exit(faults.length ? 1 : 0);
