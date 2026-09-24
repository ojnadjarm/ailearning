// U01 end to end under the Pages base: the whole watch timeline drawn frame by frame (frozen), then a live run: Begin, narration
// audio loads, the watch clock runs, the drive steps are turned by hand, the end card shows; 0 failed requests, 0 console errors.
// Usage: node tests/e2e/unit.mjs [url]   (default: dist/ under pages-sim)
import { startPagesSim } from '../lib/pages-sim.mjs';
import { launch, open } from '../lib/browser.mjs';

const sim = process.argv[2] ? null : await startPagesSim();
const url = process.argv[2] ?? sim.url + 'u/01-neuron/';
const browser = await launch();

const frozen = await open(browser, url + '?t=0');
await frozen.page.waitForFunction(() => window.__probe?.ready > 0, null, { timeout: 30000 });
const sweep = await frozen.page.evaluate(async () => {
  const dur = window.__d.tl.duration(), frames = window.__probe.frames;
  for (let t = 0; t <= dur + 0.25; t += 0.25) { window.__rec.watch(Math.min(t, dur)); await new Promise((r) => requestAnimationFrame(r)); }
  return { dur, drawn: window.__probe.frames - frames };
});
await frozen.close();

const { page, log } = await open(browser, url);
await page.waitForFunction(() => window.__probe?.frames > 0, null, { timeout: 30000 });
await page.click('[data-k=begin]');
await page.waitForFunction(() => window.__d?.beats?.name === 'watch' && window.__d.clock.now() > 4, null, { timeout: 30000 });
const played = await page.evaluate(() => window.__d.clock.now());
await page.evaluate(() => window.__rec.go('drive'));
await page.waitForTimeout(800);
await page.evaluate(() => window.__rec.turn(0, 2));
await page.waitForFunction(() => window.__d.hands[1].enabled, null, { timeout: 60000 });
await page.evaluate(() => window.__rec.turn(1, 1));
await page.waitForSelector('[data-k=cta]:not([hidden])', { timeout: 60000 });
await page.click('[data-k=cta]');
await page.waitForSelector('[data-k=end]:not([hidden])', { timeout: 60000 });
const beat = await page.evaluate(() => window.__d.beats.name);
const audio = log.requests.filter((u) => /\/bundles\/01-neuron\/audio\//.test(u));
await browser.close();
await sim?.close();

const faults = [...frozen.log.errors.map((e) => `frozen console ${e}`), ...frozen.log.failed.map((e) => `frozen request ${e}`),
  ...log.errors.map((e) => `console ${e}`), ...log.failed.map((e) => `request ${e}`)];
if (!audio.length) faults.push('no narration audio was requested');
if (sweep.drawn < sweep.dur / 0.25) faults.push(`frozen sweep drew ${sweep.drawn} frames over ${sweep.dur.toFixed(1)} s`);
if (beat !== 'end') faults.push(`ended in beat ${beat}`);
faults.forEach((f) => console.error(`unit: ${f}`));
console.log(`unit: ${url} sweep ${sweep.dur.toFixed(1)} s in ${sweep.drawn} frames, live watch ${played.toFixed(1)} s, drive → ${beat}, ${audio.length} audio files, ${log.requests.length} requests, ${faults.length} faults`);
process.exit(faults.length ? 1 : 0);
