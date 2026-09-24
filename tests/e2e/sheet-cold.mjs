// The first sheet change on a cold cache over a slow link (fresh context, 150 ms latency, 1.6 Mbit/s): Begin on Sheet 0 must turn onto a drawn
// Sheet I. Fails if the turn is skipped, if any frame after the turn ends lacks the plate or the Begin card, or if the card takes over 7 s from
// the click. Usage: node tests/e2e/sheet-cold.mjs [site url]   (default: dist/ under pages-sim)
import { startPagesSim } from '../lib/pages-sim.mjs';
import { launch } from '../lib/browser.mjs';

const BUDGET_MS = 7000;
const sim = process.argv[2] ? null : await startPagesSim();
const url = process.argv[2] ?? sim.url;
const browser = await launch();
const faults = [];

/** On Sheet I: every frame from the reveal to 1 s after the turn, is the plate drawn and the Begin card up. */
const watch = () => addEventListener('pagereveal', (e) => {
  if (!/\/u\//.test(location.pathname)) return;
  const t = window.__cold = { vt: !!e.viewTransition, reveal: performance.now(), end: 0, frames: [] };
  const up = () => {
    const c = document.querySelector('.card.begin'), r = c?.getBoundingClientRect();
    return !!r?.height && +getComputedStyle(c).opacity > 0.5 && getComputedStyle(c).visibility !== 'hidden';
  };
  const tick = () => {
    t.frames.push({ at: performance.now(), drawn: (window.__probe?.frames ?? 0) > 0, card: up() });
    if (!t.end || performance.now() < t.end + 1000) requestAnimationFrame(tick); else t.done = true;
  };
  requestAnimationFrame(tick);
  if (e.viewTransition) e.viewTransition.finished.finally(() => { t.end = performance.now(); });
  else t.end = t.reveal;
});

for (const [width, height] of [[1366, 768], [1920, 1080]]) {
  const tag = `cold ${width}x${height}`;
  const ctx = await browser.newContext({ viewport: { width, height }, ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 });
  await page.addInitScript(watch);
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(500);
  const click = Date.now();
  await page.locator('.primary:visible').first().click({ noWaitAfter: true });
  await page.waitForURL(/\/u\/01-neuron\//, { timeout: 20000 });
  await page.waitForFunction(() => window.__cold?.done, null, { timeout: 30000, polling: 200 });
  const t = await page.evaluate(() => { const { frames, ...r } = window.__cold; return { ...r, nav: performance.timeOrigin, frames }; });
  const after = t.frames.filter((f) => f.at >= t.end);
  const blank = after.filter((f) => !f.drawn || !f.card).length;
  const first = t.frames.find((f) => f.drawn && f.card);
  const cardMs = first ? Math.round(t.nav + first.at - click) : null;
  if (!t.vt) faults.push(`${tag}: the sheet change was skipped`);
  if (blank) faults.push(`${tag}: ${blank} of ${after.length} frames after the turn without the plate or the Begin card`);
  if (cardMs === null || cardMs > BUDGET_MS) faults.push(`${tag}: Begin card at ${cardMs} ms after the click (budget ${BUDGET_MS})`);
  console.log(`${tag}: turn ${t.vt ? 'on' : 'skipped'}, ends ${Math.round(t.nav + t.end - click)} ms after the click, ${blank}/${after.length} blank frames after it, card at ${cardMs} ms`);
  await ctx.close();
}

await browser.close();
await sim?.close();
faults.forEach((f) => console.error(`sheet-cold: ${f}`));
console.log(`sheet-cold: ${faults.length} faults`);
process.exit(faults.length ? 1 : 0);
