// Sheet changes frame by frame under pages-sim (CDP screencast + page events): Begin on Sheet 0 → Sheet I and "← Sheet 0" back, at 400, 768, 1366,
// 1920 and 2560 px and on a phone (back only: Sheet 0 has no plate link there), CPU 1× and 4×, and reduced motion at 1366. Fails on a blank frame
// (ink under a quarter of the calmer sheet's), a white frame (over 25 % pure white), a font that loads after the turn starts, a style sheet pending at
// the reveal, any layout shift, a turn that plays before the plate's first frame, a skipped transition. Then first presses at 1366 and on a phone: the
// target is pressed once it is wholly visible (the fold geometry of the turn), 0-1.2 s later, and must start its navigation without a second press;
// double presses start one navigation. Then real presses (down, 90 ms, up) at 0, 100, 300 and 1000 ms after the target shows and fully loaded:
// "← Sheet 0", the homepage CTA and the landing card's choices must act on the first press. Usage: node tests/e2e/transitions.mjs [site url]
import { devices } from 'playwright-core';
import { harness } from '../lib/harness.mjs';

const TRIALS = 50, REPS = 2;
const { url, browser, faults, fault: fail, end } = await harness('transitions', { path: '' });
const phone = devices['Pixel 7'];
const VIEWS = [[400, 860], [768, 1024], [1366, 768], [1920, 1080], [2560, 1440]];
const CONFIGS = [...VIEWS.flatMap(([width, height]) => [1, 4].map((cpu) => ({ id: `${width}@${cpu}x`, viewport: { width, height }, cpu }))),
  { id: 'phone@1x', phone: true, cpu: 1 }, { id: 'phone@4x', phone: true, cpu: 4 }, { id: '1366 reduced', viewport: { width: 1366, height: 768 }, cpu: 1, reduced: true }];
const UNIT = /\/u\/01-neuron\/$/, HOME = /\/ailearning\/(\?.*)?$/, BEGIN = 'a.primary.p-new', BACK = '.top .back';
const legs = (c) => [...(c.phone ? [] : [[BEGIN, UNIT, 'forward']]), [BACK, HOME, 'back']];

/** Every document: the reveal (transition, fonts loading, sheets pending), the plate's first frame, the turn's start, font loads, shifts, navigations. */
const INSTR = () => {
  const rec = (k, o = {}) => { try { window.__tr?.(k, { ...o, path: location.pathname, t: performance.timeOrigin + performance.now() }); } catch { /* page gone */ } };
  addEventListener('pagereveal', (e) => {
    const h = document.documentElement;
    rec('reveal', { vt: !!e.viewTransition, sheets: [...document.querySelectorAll('link[rel=stylesheet]')].filter((l) => !l.sheet).length });
    new MutationObserver((_, o) => { if (!h.classList.contains('hold')) { rec('play'); o.disconnect(); } }).observe(h, { attributes: true, attributeFilter: ['class'] });
    e.viewTransition?.ready.catch((x) => rec('skip', { msg: String(x) }));
  });
  document.addEventListener('sheet:ready', () => rec('drawn'));
  document.fonts.addEventListener('loadingdone', (e) => rec('font', { faces: e.fontfaces.map((f) => `${f.family} ${f.weight} ${f.style}`) }));
  new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) rec('shift', { v: e.value }); }).observe({ type: 'layout-shift', buffered: true });
  self.navigation?.addEventListener('navigate', () => rec('navigate'));
};

async function open(c, events) {
  const ctx = await browser.newContext({ ...(c.phone ? phone : { viewport: c.viewport }), reducedMotion: c.reduced ? 'reduce' : 'no-preference', ignoreHTTPSErrors: true });
  await ctx.exposeFunction('__tr', (k, o) => events.push({ k, ...o }));
  await ctx.addInitScript(INSTR);
  const page = await ctx.newPage(), cdp = await ctx.newCDPSession(page);
  const throttle = () => cdp.send('Emulation.setCPUThrottlingRate', { rate: c.cpu }).catch(() => {});
  page.on('framenavigated', (f) => { if (f === page.mainFrame()) void throttle(); });
  await throttle();
  return { ctx, page, cdp };
}
const home = (c) => url + (c.phone ? '' : '?state=new');
const toUnit = async (page, c) => { if (c.phone) { await page.goto(url + 'u/01-neuron/'); await page.waitForTimeout(1500); } };
const tap = (page, c, [x, y]) => (c.phone ? page.touchscreen.tap(x, y) : page.mouse.click(x, y));

/** Whether the first match of `sel` is wholly on the visible part of the new sheet: during a turn the fold (8° lean, x = X at mid height, X from the
 * eased progress of the front window) splits the screen, forward the new sheet right of it, back left of it. */
const visible = (page, sel) => page.evaluate((s) => {
  const e = [...document.querySelectorAll(s)].find((x) => x.getClientRects().length);
  if (!e) return { vis: false };
  const r = e.getBoundingClientRect(), W = innerWidth, H = innerHeight, k = Math.tan(8 * Math.PI / 180), m = 0.0703 * H, at = [r.x + r.width / 2, r.y + r.height / 2];
  const a = document.getAnimations().find((x) => /image-pair\(front\)/.test(x.effect?.pseudoElement ?? ''));
  if (!a) return { vis: r.bottom > 0 && r.top < H, at };
  const [x1, y1, x2, y2] = getComputedStyle(document.documentElement, '::view-transition-image-pair(front)').animationTimingFunction.match(/[\d.]+/g).map(Number);
  const bz = (t, c1, c2) => 3 * c1 * t * (1 - t) ** 2 + 3 * c2 * t * t * (1 - t) + t ** 3, lin = a.effect.getComputedTiming().progress ?? 0;
  let lo = 0, hi = 1;
  for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (bz(mid, x1, x2) < lin) lo = mid; else hi = mid; }
  const p = bz(lo, y1, y2), fwd = a.animationName === 'cut-away', X = fwd ? W + m - p * (W + 2 * m) : -m + p * (W + 2 * m);
  const fold = (y) => X - (y - H / 2) * k;
  return { vis: [[r.left, r.top], [r.right, r.top], [r.left, r.bottom], [r.right, r.bottom]].every(([x, y]) => (fwd ? x > fold(y) : x < fold(y))), at };
}, sel).catch(() => ({ vis: false }));
const until = async (page, sel) => { const t = Date.now(); let v; while (!(v = await visible(page, sel)).vis && Date.now() - t < 10000) await page.waitForTimeout(10); return v; };

/** Ink (luminance < 120) and pure-white fractions of each JPEG frame, decoded in a blank page. */
async function pixels(frames) {
  const page = await browser.newPage();
  const out = await page.evaluate(async (list) => Promise.all(list.map(async (b64) => {
    const img = await createImageBitmap(await (await fetch(`data:image/jpeg;base64,${b64}`)).blob());
    const cv = new OffscreenCanvas(img.width, img.height), g = cv.getContext('2d');
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, img.width, img.height).data;
    let ink = 0, white = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114 < 120) ink++;
      if (Math.min(d[i], d[i + 1], d[i + 2]) >= 250) white++;
    }
    return { ink: ink / (d.length / 4), white: white / (d.length / 4) };
  })), frames.map((f) => f.data));
  await page.close();
  return out;
}

for (const c of CONFIGS) {
  const events = [], shots = [];
  const { ctx, page, cdp } = await open(c, events);
  cdp.on('Page.screencastFrame', (f) => { shots.push({ t: f.metadata.timestamp * 1000, data: f.data }); cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); });
  await page.goto(home(c));
  await page.waitForTimeout(1500);
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 55, maxWidth: 960, maxHeight: 1400, everyNthFrame: 1 });
  const runs = [];
  for (let r = 0; r < REPS; r++) for (const [sel, re, dirn] of legs(c)) {
    await toUnit(page, c);
    const v = await until(page, sel);
    await page.waitForTimeout(700);
    if (!c.phone) { await page.mouse.move(...v.at); await page.waitForTimeout(300); }
    const at = Date.now();
    await tap(page, c, v.at);
    await page.waitForURL(re, { timeout: 15000 });
    await page.waitForTimeout(3200);
    runs.push({ dirn, at, end: Date.now() });
  }
  await cdp.send('Page.stopScreencast');
  for (const { dirn, at, end } of runs) {
    const tag = `${c.id} ${dirn}`, win = shots.filter((s) => s.t >= at - 400 && s.t <= end), px = await pixels(win);
    const before = px.filter((_, i) => win[i].t < at), after = px.filter((_, i) => win[i].t >= at);
    const ref = Math.min(before.at(-1)?.ink ?? 1, after.at(-1)?.ink ?? 1);
    const blank = after.filter((p) => p.ink < 0.25 * ref).length, white = after.filter((p) => p.white > 0.25).length;
    const ev = events.filter((e) => e.t >= at - 5 && e.t <= end), rev = ev.find((e) => e.k === 'reveal'), mine = ev.filter((e) => e.path === rev?.path);
    const play = mine.find((e) => e.k === 'play'), drawn = mine.find((e) => e.k === 'drawn');
    const late = mine.filter((e) => e.k === 'font' && play && e.t > play.t).flatMap((e) => e.faces);
    const cls = mine.filter((e) => e.k === 'shift').reduce((a, e) => a + e.v, 0);
    if (!rev?.vt || ev.some((e) => e.k === 'skip')) fail(`${tag}: no sheet change`);
    if (blank) fail(`${tag}: ${blank} blank frames`);
    if (white) fail(`${tag}: ${white} white frames`);
    if (late.length) fail(`${tag}: fonts after the turn started: ${[...new Set(late)].join(', ')}`);
    if (rev?.sheets) fail(`${tag}: ${rev.sheets} style sheets pending at the reveal`);
    if (cls > 0) fail(`${tag}: CLS ${cls.toFixed(4)}`);
    if (dirn === 'forward' && c.viewport?.width >= 1024 && (!drawn || !play || play.t < drawn.t)) fail(`${tag}: the turn played before the plate was drawn`);
    console.log(`transitions ${tag}: ${after.length} frames, ${blank} blank, ${white} white, ${late.length} late fonts, CLS ${cls.toFixed(4)}, turn at ${play ? Math.round(play.t - at) : '-'} ms`);
  }
  await ctx.close();
}

for (const c of CONFIGS.filter((x) => ['1366@1x', 'phone@1x'].includes(x.id))) {
  const events = [];
  const { ctx, page } = await open(c, events);
  await page.goto(home(c));
  await page.waitForTimeout(1500);
  const missed = { forward: 0, back: 0 }, n = { forward: 0, back: 0 };
  for (let i = 0; i < TRIALS; i++) for (const [sel, re, dirn] of legs(c)) {
    await toUnit(page, c);
    const v = await until(page, sel);
    await page.waitForTimeout((i * 97 + (dirn === 'back' ? 45 : 0)) % 1200);
    const w = await visible(page, sel);
    await tap(page, c, w.at ?? v.at);
    n[dirn]++;
    try { await page.waitForURL(re, { timeout: 6000 }); } catch {
      missed[dirn]++;
      await page.waitForTimeout(1500);
      await tap(page, c, (await until(page, sel)).at);
      await page.waitForURL(re, { timeout: 15000 });
    }
  }
  for (const d of ['forward', 'back']) if (missed[d]) fail(`${c.id} ${d}: ${missed[d]} of ${n[d]} first presses did nothing`);
  const doubles = [];
  for (let i = 0; i < 10; i++) for (const [sel, re] of legs(c)) {
    await toUnit(page, c);
    await page.waitForTimeout(2600);
    const { at } = await until(page, sel), t0 = Date.now();
    if (c.phone) { await page.touchscreen.tap(...at); await page.waitForTimeout(90); await page.touchscreen.tap(...at).catch(() => {}); } else await page.mouse.dblclick(...at);
    await page.waitForURL(re, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000);
    doubles.push(events.filter((e) => e.k === 'navigate' && e.t >= t0 - 5).length);
  }
  if (doubles.some((x) => x !== 1)) fail(`${c.id}: double presses started ${doubles.join(' ')} navigations`);
  console.log(`transitions ${c.id} presses: forward ${n.forward - missed.forward}/${n.forward}, back ${n.back - missed.back}/${n.back}, double presses ${doubles.join('')}`);
  await ctx.close();
}

/** Real presses: a hand holds the button about 90 ms, so a press that starts while a sheet still turns can end after the turn (its click then
 * goes to <html>, the pair's common ancestor). Each target is pressed at 0, 100, 300 and 1000 ms after it shows (the fold, or its first paint)
 * and once the page is fully loaded; every press must act without a second one. Desktop: "← Sheet 0" after the forward turn (fully loaded:
 * on the landing card, narration playing, paused, the chapters tab open, a plate drag), the homepage CTA after the back turn, and the landing
 * card's choices (Begin; Practice exercises and Practice tuning when the lesson is finished). Phone: "← Sheet 0" on the narrow sheet. */
const HOLD = 90, WHEN = [0, 100, 300, 1000, 'loaded'], REAL = 30;
const CTA = 'a.p-new, a.p-returning', FIN = JSON.stringify({ v: 1, units: { U01: { beat: 'end', done: ['unit'], visited: ['watch', 'end'] } }, resume: { unit: 'U01', beat: 'end' } });
const hand = async (page, cdp, c, [x, y]) => {
  if (c.phone) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); await page.waitForTimeout(HOLD); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); return; }
  await page.mouse.move(x - 30, y + 15); await page.mouse.move(x, y, { steps: 3 }); await page.mouse.down(); await page.waitForTimeout(HOLD); await page.mouse.up();
};
/** Waits until `sel` shows on a painted page, then `w` ms more (or until the page is fully loaded), and presses it; resolves to when it pressed. */
const pressAt = async (page, cdp, c, sel, w) => {
  const v = await until(page, sel);
  if (w === 'loaded') { await page.waitForFunction(() => document.readyState === 'complete', null, { timeout: 15000 }).catch(() => {}); await page.waitForTimeout(3000); }
  else { await page.waitForFunction(() => performance.getEntriesByType('paint').length > 0, null, { timeout: 15000 }).catch(() => {}); if (w) await page.waitForTimeout(w); }
  await hand(page, cdp, c, (await visible(page, sel)).at ?? v.at);
};
/** A lesson state a fully loaded "← Sheet 0" press starts from. */
const STATES = [null, 'playing', 'paused', 'chapters', 'drag'];
const into = async (page, s) => {
  if (!s) return;
  await page.click('[data-k=begin]'); await page.waitForFunction(() => document.body.classList.contains('live'), null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);
  if (s === 'paused') await page.keyboard.press('Space');
  if (s === 'chapters') await page.click('[data-k=chapters]').catch(() => {});
  if (s === 'drag') { const r = await page.locator('#stage').boundingBox(); await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await page.mouse.down(); await page.mouse.move(r.x + r.width / 2 + 80, r.y + r.height / 2 + 30, { steps: 8 }); await page.mouse.up(); }
  await page.waitForTimeout(400);
};
for (const c of CONFIGS.filter((x) => ['1366@1x', 'phone@1x'].includes(x.id))) {
  const { ctx, page, cdp } = await open(c, []);
  const ok = {}, count = (k, y) => { ok[k] ??= [0, 0]; ok[k][1]++; if (y) ok[k][0]++; else fail(`${c.id} real press: ${k} did nothing`); };
  const reached = (re) => page.waitForURL(re, { timeout: 6000 }).then(() => true, () => false);
  if (c.phone) for (let i = 0; i < REAL; i++) {
    const w = WHEN[i % WHEN.length];
    await page.goto(url + 'u/01-neuron/', { waitUntil: 'commit' });
    await pressAt(page, cdp, c, BACK, w);
    count(`back +${w}`, await reached(HOME));
  } else {
    await page.goto(home(c)); await page.evaluate(() => localStorage.clear()); await page.waitForTimeout(1500);
    for (let i = 0; i < REAL; i++) {
      const w = WHEN[i % WHEN.length];
      await pressAt(page, cdp, c, CTA, i ? w : 'loaded');
      const fwd = await reached(UNIT); count(`forward +${i ? w : 'loaded'}`, fwd);
      if (!fwd) { await page.goto(url + 'u/01-neuron/'); await page.waitForTimeout(2500); }
      if (w === 'loaded') { await until(page, BACK); await page.waitForTimeout(2500); await into(page, STATES[(i / WHEN.length | 0) % STATES.length]); }
      await pressAt(page, cdp, c, BACK, w);
      const back = await reached(HOME); count(`back +${w}${w === 'loaded' ? ` ${STATES[(i / WHEN.length | 0) % STATES.length] ?? 'landing'}` : ''}`, back);
      if (!back) { await page.goto(url); await page.waitForTimeout(1500); }
    }
    for (let i = 0; i < REAL; i++) {
      const w = WHEN[i % WHEN.length], [label, fin, sel, beat] = [['Begin', false, '[data-k=begin]', 'watch'], ['Practice exercises', true, '[data-k=begin]', 'practice'],
        ['Practice tuning', true, '.choices [data-c="1"]', 'tunes']][(i / WHEN.length | 0) % 3];
      await page.goto(url); await page.evaluate((f) => { localStorage.clear(); if (f) localStorage.setItem('plates:v1:progress', f); }, fin ? FIN : null); await page.waitForTimeout(1200);
      await pressAt(page, cdp, c, CTA, 'loaded');
      if (!(await reached(UNIT))) { fail(`${c.id} real press: the CTA did not open Sheet I`); continue; }
      await pressAt(page, cdp, c, sel, w);
      count(`${label} +${w}`, await page.waitForFunction((b) => window.__d?.beats?.name === b, beat, { timeout: 8000 }).then(() => true, () => false));
    }
  }
  console.log(`transitions ${c.id} real presses: ${Object.entries(ok).map(([k, [a, n]]) => `${k} ${a}/${n}`).join(', ')}`);
  await ctx.close();
}

await end(`transitions: ${CONFIGS.length} configs, ${faults.length} faults`);
