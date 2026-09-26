// The sheet change under the Pages base: Begin on Sheet 0 turns the page right to left onto Sheet I (type forward), the way back turns it
// left to right (type back), each 900-1100 ms with its page-turn sound, a 150 ms silent crossfade with reduced motion; Sheet 0 loads no audio
// before the click. Compositor frames of each turn at 1366 and 1920: at most 2 over 20 ms. Frame strip at 1366 (start, middle, end, each way)
// lands in out/shots/. Usage: node tests/e2e/sheet-change.mjs [site url]   (default: dist/ under pages-sim)
import { mkdirSync } from 'node:fs';
import { harness, frames as painted, until } from '../lib/harness.mjs';

const { url, browser, faults, fault: fail, end } = await harness('sheet-change', { path: '' });
mkdirSync('out/shots', { recursive: true });

/** Records each play() of a media element on the page: file name and outcome. */
const listen = () => {
  window.__snd = [];
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    const r = { src: this.src.split('/').pop() };
    window.__snd.push(r);
    const p = play.call(this);
    p.then(() => { r.ok = true; }, (e) => { r.err = e.name; });
    return p;
  };
};

/** Pauses each sheet change as it becomes ready and records its types and animations. */
const hold = () => addEventListener('pagereveal', (e) => {
  const v = e.viewTransition;
  window.__vt = { on: !!v };
  v?.ready.then(() => {
    const a = document.getAnimations().filter((x) => x.effect.pseudoElement);
    a.forEach((x) => x.pause());
    Object.assign(window.__vt, { types: [...v.types], anims: a.map((x) => `${x.effect.pseudoElement} ${x.animationName}`), ms: Math.max(...a.map((x) => x.effect.getComputedTiming().endTime)) });
    window.__vtA = a;
  });
});

/** Waits for the held change, shoots start, middle and end, then lets it finish. */
async function strip(page, tag, want) {
  await page.waitForFunction(() => window.__vtA || window.__vt?.on === false, null, { timeout: 15000 });
  const vt = await page.evaluate(() => window.__vt);
  if (!vt.on) return fail(`${tag}: no view transition`);
  if (vt.types.join() !== want.types) fail(`${tag}: types ${vt.types}, want ${want.types}`);
  for (const n of want.anims) if (!vt.anims.includes(n)) fail(`${tag}: no ${n} (${vt.anims.join(', ')})`);
  if (vt.ms > want.ms || vt.ms < (want.min ?? 0)) fail(`${tag}: ${vt.ms} ms, want ${want.min ?? 0}-${want.ms}`);
  const snd = await page.evaluate(() => window.__snd.filter((r) => r.src.startsWith('page-turn')));
  if (snd.map((r) => r.src).join() !== (want.sound ?? '')) fail(`${tag}: sound ${snd.map((r) => r.src)}, want ${want.sound ?? 'none'}`);
  if (want.shots) for (const [k, f] of [['start', 0.05], ['mid', 0.4], ['end', 1]]) {
    await page.evaluate((t) => window.__vtA.forEach((a) => { a.currentTime = t; }), f * vt.ms);
    await painted(page);
    await page.screenshot({ path: `out/shots/sheet-change-${tag}-${k}.png` });
  }
  await page.evaluate(() => { window.__vtA.forEach((a) => a.finish()); window.__vtA = null; });
  console.log(`sheet-change ${tag}: ${vt.types.join()} ${vt.ms} ms, ${vt.anims.length} animations`);
}

for (const motion of ['no-preference', 'reduce']) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: motion, ignoreHTTPSErrors: true });
  await ctx.addInitScript(hold);
  await ctx.addInitScript(listen);
  const page = await ctx.newPage();
  const errors = [];
  const audio = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => /\.(opus|m4a)$/.test(r.url()) && audio.push(r.url()));
  await page.goto(url + '?state=new');
  await page.waitForLoadState('networkidle');
  if (audio.length) fail(`${motion}: Sheet 0 loaded ${audio.length} audio files before the click`);
  const full = motion === 'no-preference';
  await Promise.all([page.waitForURL(/\/u\/01-neuron\/$/), page.click('a.primary.p-new')]);
  await strip(page, full ? 'forward' : 'reduced-forward', full
    ? { types: 'forward', anims: ['::view-transition-image-pair(front) cut-away', '::view-transition-old(front) hold-away', '::view-transition-group(leaf) fold-away',
      '::view-transition-new(leaf) leaf-shade'],
      min: 900, ms: 1100, sound: 'page-turn.opus', shots: true }
    : { types: 'forward', anims: [], ms: 150 });
  const paint = await page.evaluate(() => ({ fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? -1,
    rail: document.querySelector('.top .sh0')?.textContent, back: document.querySelector('.top .back')?.href }));
  if (paint.rail !== 'Sheet I · The neuron') fail(`${motion}: Sheet I rail reads ${paint.rail}`);
  if (paint.back !== url) fail(`${motion}: way back is ${paint.back}`);
  await page.waitForFunction(() => window.__probe?.frames > 0, null, { timeout: 30000 });
  await Promise.all([page.waitForURL((u) => u.href === url), page.click('.top .back')]);
  await strip(page, full ? 'back' : 'reduced-back', full
    ? { types: 'back', anims: ['::view-transition-image-pair(front) cut-back', '::view-transition-new(front) hold-back', '::view-transition-group(leaf) fold-back',
      '::view-transition-new(leaf) leaf-shade'],
      min: 900, ms: 1100, sound: 'page-turn-back.opus', shots: true }
    : { types: 'back', anims: [], ms: 150 });
  errors.forEach((e) => fail(`${motion}: console ${e}`));
  console.log(`sheet-change ${motion}: Sheet I first paint ${paint.fcp.toFixed(0)} ms`);
  await ctx.close();
}

/** Marks each turn in the trace: `turn` from ready to finished. */
const mark = () => addEventListener('pagereveal', (e) => e.viewTransition?.ready.then(() => {
  performance.mark('turn-start');
  e.viewTransition.finished.finally(() => performance.mark('turn-end'));
}));

/** Waits for the turn's end mark in the new sheet, and three frames more for its last frames to reach the trace. */
const turned = async (page) => { await until(page, () => performance.getEntriesByName('turn-end').length > 0, null, 10000); await painted(page, 3); };

/** Frames presented inside each marked turn, from a Chromium trace: frames, gaps over 20 ms, worst gap. */
function frames(trace) {
  const ev = JSON.parse(trace).traceEvents ?? [];
  const at = (n) => ev.filter((e) => e.name === n && e.ph !== 'e').map((e) => e.ts / 1000).sort((a, b) => a - b);
  const shown = [...new Set(ev.filter((e) => e.name === 'PipelineReporter' && e.ph === 'b' && e.tid !== e.pid
    && e.args?.frame_reporter?.state.startsWith('STATE_PRESENTED')).map((e) => e.ts / 1000))].sort((a, b) => a - b);
  const ends = at('turn-end');
  return at('turn-start').map((t0, i) => {
    const ts = shown.filter((t) => t >= t0 && t <= ends[i]);
    const gaps = ts.slice(1).map((x, k) => x - ts[k]);
    return { ms: Math.round(ends[i] - t0), frames: ts.length, over: gaps.filter((g) => g > 20).length, worst: Math.round(Math.max(...gaps)) };
  });
}

for (const [width, height] of [[1366, 768], [1920, 1080]]) {
  const ctx = await browser.newContext({ viewport: { width, height }, ignoreHTTPSErrors: true });
  await ctx.addInitScript(mark);
  const page = await ctx.newPage();
  await page.goto(url + '?state=new');
  await page.waitForLoadState('networkidle');
  await browser.startTracing(page, { categories: ['disabled-by-default-devtools.timeline.frame', 'blink.user_timing'] });
  await Promise.all([page.waitForURL(/\/u\/01-neuron\/$/), page.click('a.primary.p-new')]);
  await turned(page);
  await Promise.all([page.waitForURL((u) => u.href === url), page.click('.top .back')]);
  await turned(page);
  const turns = frames((await browser.stopTracing()).toString());
  if (turns.length !== 2) fail(`${width}: ${turns.length} turns traced, want 2`);
  turns.forEach((t, i) => { if (t.over > 2) fail(`${width} ${i ? 'back' : 'forward'}: ${t.over} frames over 20 ms`); });
  console.log(`sheet-change frames ${width}: ${turns.map((t, i) => `${i ? 'back' : 'forward'} ${t.frames} frames in ${t.ms} ms, ${t.over} over 20 ms, worst ${t.worst} ms`).join('; ')}`);
  await ctx.close();
}

await end(`sheet-change: ${faults.length} faults`);
