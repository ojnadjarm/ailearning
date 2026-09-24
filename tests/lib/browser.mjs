// Headless Chromium with GPU flags, plus a page that records console errors and failed requests.
import { chromium } from 'playwright-core';

const ARGS = ['--enable-features=Vulkan', '--use-angle=vulkan', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'];

/** Launches the browser once per run. */
export const launch = () => chromium.launch({ headless: true, args: ARGS });

/** Opens a page at a viewport and collects errors and failed requests into `log`. */
export async function open(browser, url, { width = 1920, height = 1080 } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  const log = { errors: [], failed: [], requests: [] };
  page.on('pageerror', (e) => log.errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && log.errors.push(m.text().slice(0, 200)));
  page.on('requestfailed', (r) => log.failed.push(`${r.url()} ${r.failure()?.errorText}`));
  page.on('response', (r) => { log.requests.push(r.url()); if (r.status() >= 400) log.failed.push(`${r.status()} ${r.url()}`); });
  await page.goto(url, { waitUntil: 'load' });
  return { page, log, close: () => ctx.close() };
}
