// One e2e run: the site (a url argument, the runner's E2E_SITE, else pages-sim over dist/), the browser (the runner's E2E_WS, else its own),
// the run's faults and its end; plus the waits every file shares. E2E_PART names the shard of a file the runner asked for.
import { chromium } from 'playwright-core';
import { startPagesSim } from './pages-sim.mjs';
import { launch, open } from './browser.mjs';

/**
 * Starts a run named `name`. `path`: the file takes a url argument and runs on `site + path` without one; omitted, it always runs on the
 * site. `echo`: print each fault as it is found (else all at the end).
 */
export async function harness(name, { path, echo = false } = {}) {
  const arg = path === undefined ? undefined : process.argv[2];
  const sim = arg || process.env.E2E_SITE ? null : await startPagesSim();
  const site = process.env.E2E_SITE ?? sim?.url;
  const browser = process.env.E2E_WS ? await chromium.connect(process.env.E2E_WS) : await launch();
  const faults = [];
  const fault = (f) => { faults.push(f); if (echo) console.error(`${name}: ${f}`); };
  return {
    site, url: arg ?? site + (path ?? ''), browser, faults, fault, part: process.env.E2E_PART ?? null,
    open: (url, viewport) => open(browser, url, viewport),
    /** Closes the browser and the site, prints the faults (unless echoed) and `line`, and exits 1 on any fault. */
    async end(line) {
      await browser.close();
      await sim?.close();
      if (!echo) faults.forEach((f) => console.error(`${name}: ${f}`));
      if (line) console.log(line);
      process.exit(faults.length ? 1 : 0);
    },
  };
}

/** Resolves after `n` animation frames of the page (its input handled and drawn). */
export const frames = (page, n = 2) => page.evaluate((n) => new Promise((r) => { const f = () => (--n > 0 ? requestAnimationFrame(f) : r()); requestAnimationFrame(f); }), n);

/** Resolves once no CSS animation or transition of the page runs (at most `ms`), two frames on, so those the last frame started count. */
export const settled = (page, ms = 10000) => page.evaluate(async (ms) => {
  const frame = () => new Promise((r) => requestAnimationFrame(r)), t0 = performance.now();
  await frame();
  do await frame(); while (document.getAnimations().some((a) => a.playState === 'running') && performance.now() - t0 < ms);
}, ms);

/** Waits until `fn(arg)` holds in the page (at most `ms`); resolves whether it did, so the file's own check reports a miss. */
export const until = (page, fn, arg, ms = 10000) => page.waitForFunction(fn, arg, { timeout: ms }).then(() => true, () => false);
