// U01 end to end under the Pages base: the whole watch timeline drawn frame by frame (frozen), no Parts button, list or modal (G opens
// nothing), chapters tab and transcript, a heard part's callout with its live number, the note's working in the Working sheet at 12 px or more at 1366,
// then a live run: Begin, narration audio loads, the watch clock runs, a part's body draws nothing on hover and opens nothing on a click,
// its circled number shows the help cursor and outlines the part on hover (a point 6 px outside the badge does not), a click on the number
// opens its note and holds the voice, the same number, Esc and a click on bare paper close it and the voice goes on, the bar seeks back,
// the keys sheet opens (no Parts row), a second tab offers to continue,
// the chooser after the watch leads to Your turn, Practice and the watch again, the three drive steps are turned by hand and lead to the
// Workbench, progress is stored, the end card shows and closes by its ×, by Esc and by a click outside (whole, its three ways in view at 1366×768),
// the plate stays live behind it (a dial turns, a number opens its callout), and a return visit to the finished lesson lands on the end
// chooser (Practice exercises, Practice tuning, Watch again); 0 failed requests, 0 console errors.
// Usage: node tests/e2e/unit.mjs [url]   (default: dist/ under pages-sim)
import { harness, frames, until } from '../lib/harness.mjs';

/** A dial's detents, low to high. */
const DETENTS = Array.from({ length: 13 }, (_, i) => -3 + i / 2);
/** Page coordinates of a point on the plate in drawing units. */
const onPlate = (page, x, y) => page.evaluate(([x, y]) => { const d = window.__d, [a, b] = d.view.toScreen(x, y), r = d.view.canvas.getBoundingClientRect(); return [a + r.left, b + r.top]; }, [x, y]);
/** Page coordinates of bare paper near the stage's left edge (no part under it). */
const bare = (page) => page.evaluate(() => {
  const d = window.__d, r = d.view.canvas.getBoundingClientRect();
  for (const f of [0.3, 0.45, 0.2, 0.6]) {
    const px = 24, py = r.height * f, [wx, wy] = d.view.toWorld(px, py);
    if (!d.spots.peek(wx, wy)) return [px + r.left, py + r.top];
  }
  return null;
});
/** Page coordinates of balloon n once drawn (the watch camera moves and a closed note rewinds to its sentence: read it right before each use). */
const badge = async (page, n) => {
  const h = await page.waitForFunction((n) => window.__d.view.layout().find((i) => i.kind === 'marker' && i.id === String(n) && window.__d.view.fig.balloonAt(n))?.at, n, { timeout: 10000 });
  return onPlate(page, ...await h.jsonValue());
};
/** The opened note, the clock, the outlined part and the plate's cursor. */
const look = (page) => page.evaluate(() => ({ opened: window.__d.opened, playing: window.__d.clock.playing(), lit: window.__d.view.fig.lit.lines.find((l) => l.line.visible)?.spot.part ?? null,
  cursor: getComputedStyle(window.__d.view.canvas).cursor, note: document.querySelector('[data-k=note]').textContent.trim() }));
const endShown = (page) => page.evaluate(() => !document.querySelector('[data-k=end]').hidden);
/** Every Parts control left in the DOM (the button, the list, the modal); G is pressed first and must open nothing. */
const partsLeft = async (page) => {
  await page.keyboard.press('g');
  await frames(page, 3);
  return page.evaluate(() => document.querySelectorAll('[data-k=parts], .modal-back, .modal, .parts, [aria-modal]').length + (document.querySelector('.pop:not([hidden])') ? 1 : 0));
};

/** Waits until a note is open (`true`), or none is and the voice plays (`false`). */
const opened = (page, on) => until(page, (on) => (on ? window.__d.opened !== null : window.__d.opened === null && window.__d.clock.playing()), on, 5000);

const { url, faults, open, end } = await harness('unit', { path: 'u/01-neuron/' });

const frozen = await open(url + '?t=0');
await frozen.page.waitForFunction(() => window.__probe?.ready > 0, null, { timeout: 30000 });
const sweep = await frozen.page.evaluate(async () => {
  const dur = window.__d.tl.duration(), frames = window.__probe.frames;
  for (let t = 0; t <= dur + 0.25; t += 0.25) { window.__rec.watch(Math.min(t, dur)); await new Promise((r) => requestAnimationFrame(r)); }
  return { dur, drawn: window.__probe.frames - frames };
});
const forked = await frozen.page.evaluate(async () => {
  const at = { beat: window.__d.beats.name, card: !document.querySelector('[data-k=end]').hidden };
  window.__rec.watch(60); await new Promise((r) => requestAnimationFrame(r));
  return at;
});
await frozen.page.mouse.click(...await badge(frozen.page, 1));
await until(frozen.page, () => window.__d.opened !== null, null, 5000);
const heard = await frozen.page.evaluate(() => ({ opened: window.__d.opened, note: document.querySelector('[data-k=note]').textContent.replace(/\s+/g, ' ') }));
await frozen.page.keyboard.press('Escape');
const listed = await frozen.page.evaluate(() => ({
  ticks: document.querySelectorAll('.progress .tick').length,
  lines: document.querySelectorAll('.side .transcript li').length,
  chapters: document.querySelectorAll('.side [data-panel=chapters] .chapter-list li').length,
  tab: !!document.querySelector('.side [data-tab=chapters]'),
}));
listed.parts = await partsLeft(frozen.page);
await frozen.close();

const small = await open(url + '?t=0', { width: 1366, height: 768 });
await small.page.waitForFunction(() => window.__probe?.ready > 0, null, { timeout: 30000 });
const mirror = await small.page.evaluate(async () => {
  for (let t = 0; t <= window.__d.tl.duration(); t += 2) {
    window.__rec.watch(t); await new Promise((r) => requestAnimationFrame(r));
    const b = document.querySelector('[data-k=working]');
    if (b.hidden) continue;
    if (!document.querySelector('.pop:not([hidden]) .working')) b.click();
    const w = document.querySelector('.pop:not([hidden]) .working');
    if (w?.querySelector('li')) {
      const li = [...w.querySelectorAll('li')], box = w.getBoundingClientRect();
      return { t, rows: li.map((x) => x.textContent), px: Math.min(...li.map((x) => parseFloat(getComputedStyle(x).fontSize))), seen: box.width > 0 && box.height > 0 };
    }
  }
  return null;
});
await small.page.evaluate(() => window.__rec.go('end'));
await small.page.waitForSelector('[data-k=end]:not([hidden])', { timeout: 30000 });
const endFit = await small.page.evaluate(() => {
  const c = document.querySelector('[data-k=end]').getBoundingClientRect(), b = [...document.querySelectorAll('[data-k=endchoices] [data-c]')];
  return { rows: b.length, whole: c.top >= 0 && c.bottom <= innerHeight, inView: b.filter((x) => { const r = x.getBoundingClientRect(); return r.height > 0 && r.top >= c.top && r.bottom <= c.bottom; }).length };
});
await small.close();

const { page, log } = await open(url);
await page.waitForFunction(() => window.__probe?.frames > 0, null, { timeout: 30000 });
await page.click('[data-k=begin]');
await page.waitForFunction(() => window.__d?.beats?.name === 'watch' && window.__d.clock.now() > Math.max(8, window.__d.spans[1].s + 0.5), null, { timeout: 30000 });
const played = await page.evaluate(() => window.__d.clock.now());
await page.waitForFunction(() => window.__d.view.layout().some((i) => i.kind === 'marker' && i.id === '1'), null, { timeout: 30000 });
await page.mouse.move(...await onPlate(page, -468, 110));
await frames(page, 3);
const hoverBody = await look(page);
await page.mouse.click(...await onPlate(page, -468, 110));
await frames(page, 3);
const tapBody = await look(page);
await page.mouse.move(...await badge(page, 1));
await until(page, () => getComputedStyle(window.__d.view.canvas).cursor === 'help' && window.__d.view.fig.lit.lines.some((l) => l.line.visible), null, 5000);
const hover = await look(page);
await until(page, () => ['camX', 'camY', 'camW'].every((k) => Math.abs(window.__d.s[k] - window.__d.goal[k]) < 0.5), null, 10000);
const [bx, by] = await badge(page, 1);
const br = await page.evaluate(() => { const v = window.__d.view, [a] = v.toScreen(0, 0), [b] = v.toScreen(15, 0); return Math.abs(b - a); });
await page.mouse.move(bx + br + 6, by);
await until(page, () => getComputedStyle(window.__d.view.canvas).cursor !== 'help' && !window.__d.view.fig.lit.lines.some((l) => l.line.visible), null, 5000);
await frames(page, 3);
const off6 = await look(page);
await page.mouse.click(...await badge(page, 1));
await opened(page, true);
const tap = await look(page);
await page.mouse.click(...await badge(page, 1));
await opened(page, false);
const twice = await look(page);
await page.mouse.click(...await badge(page, 1));
await opened(page, true);
await page.keyboard.press('Escape');
await opened(page, false);
const shut = await look(page);
await page.mouse.click(...await badge(page, 1));
await opened(page, true);
const paper = await bare(page);
if (paper) await page.mouse.click(...paper);
await opened(page, false);
const away = await look(page);
await page.mouse.move(...paper ?? [4, 4]);
const liveParts = await partsLeft(page);
await page.click('[data-k=track]', { position: { x: 2, y: 22 } });
const sought = await page.evaluate(() => window.__d.clock.now());
await page.keyboard.press('l');
const fwd = await page.evaluate(() => ({ t: window.__d.clock.now(), furthest: window.__d.furthest }));
await page.keyboard.press('?');
const keys = await page.evaluate(() => document.querySelectorAll('.pop:not([hidden]) .keys-sheet dt').length);
const keyParts = await page.evaluate(() => [...document.querySelectorAll('.pop:not([hidden]) .keys-sheet dd')].filter((x) => /parts/i.test(x.textContent)).length);
await page.keyboard.press('Escape');
const again = await page.context().newPage();
await again.goto(url, { waitUntil: 'load' });
await again.waitForFunction(() => window.__probe?.frames > 0, null, { timeout: 30000 });
const resume = await again.evaluate(() => ({ line: document.querySelector('[data-k=resume]')?.textContent ?? '', begin: document.querySelector('[data-k=begin]').textContent }));
await again.close();
const ways = {};
for (const [i, to] of [[0, 'drive'], [1, 'practice'], [2, 'watch']]) {
  await page.evaluate(() => window.__rec.go('fork'));
  await page.waitForSelector('[data-k=endchoices]:not([hidden]) [data-c]', { timeout: 30000 });
  ways.labels = await page.evaluate(() => [...document.querySelectorAll('[data-k=endchoices] [data-c]')].map((b) => b.textContent));
  await page.click(`[data-k=endchoices] [data-c="${i}"]`);
  await page.waitForFunction((to) => window.__d.beats.name === to, to, { timeout: 30000 }).catch(() => {});
  ways[to] = await page.evaluate(() => window.__d.beats.name);
}
await page.evaluate(() => window.__rec.go('drive'));
await until(page, () => window.__d.beats.name === 'drive' && window.__d.hands[0].enabled, null, 30000);
await page.evaluate(() => window.__rec.turn(0, 2));
await page.waitForFunction(() => window.__d.hands[1].enabled, null, { timeout: 60000 });
await page.evaluate(() => window.__rec.turn(1, 1));
await page.waitForFunction(() => window.__d.hands[0].enabled && window.__d.hands[1].enabled, null, { timeout: 60000 });
const d3 = await page.evaluate(() => ({ x: [window.__d.s.x1, window.__d.s.x2], t: window.__d.s.target }));
const to = DETENTS.flatMap((a) => DETENTS.map((b) => [a, b])).filter(([a, b]) => Math.abs(Math.max(0, a * d3.x[0] + b * d3.x[1]) - d3.t) < 0.01)
  .sort((m, n) => Math.abs(m[0]) + Math.abs(m[1]) - Math.abs(n[0]) - Math.abs(n[1]))[0];
await page.evaluate((a) => window.__rec.turn(0, a / 0.5), to[0]);
await page.waitForFunction((a) => window.__d.hands[0].value() === a && window.__d.hands[0].settled(), to[0], { timeout: 10000 });
await page.evaluate((b) => window.__rec.turn(1, b / 0.5), to[1]);
await page.waitForSelector('[data-k=cta]:not([hidden])', { timeout: 60000 });
await page.click('[data-k=cta]');
await page.waitForFunction(() => window.__d.beats.name === 'bench', null, { timeout: 30000 });
const drove = await page.evaluate(() => window.__d.beats.name);
const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('plates:v1:progress') ?? '{}'));
await page.evaluate(() => window.__rec.go('end'));
await page.waitForSelector('[data-k=end]:not([hidden])', { timeout: 60000 });
const beat = await page.evaluate(() => window.__d.beats.name);
const closes = {};
for (const [how, act] of [['x', () => page.click('[data-k=end-close]')], ['Esc', () => page.keyboard.press('Escape')], ['outside', async () => page.mouse.click(...await bare(page))]]) {
  if (!await endShown(page)) { await page.evaluate(() => window.__rec.go('end')); await page.waitForSelector('[data-k=end]:not([hidden])', { timeout: 30000 }); }
  await act();
  await until(page, () => document.querySelector('[data-k=end]').hidden, null, 5000);
  closes[how] = !await endShown(page);
}
const v0 = await page.evaluate(() => window.__d.hands[0].value());
await page.evaluate(() => window.__rec.turn(0, 1));
await page.waitForFunction((v) => window.__d.hands[0].value() !== v && window.__d.hands[0].settled(), v0, { timeout: 10000 }).catch(() => {});
const plateLive = { turned: await page.evaluate((v) => window.__d.hands[0].value() !== v, v0) };
await page.mouse.click(...await badge(page, 1));
await opened(page, true);
plateLive.callout = await page.evaluate(() => window.__d.opened);
await page.keyboard.press('Escape');
plateLive.parts = await partsLeft(page);
plateLive.chapters = await page.evaluate(() => document.querySelectorAll('.progress .tick').length);
plateLive.card = await endShown(page);
const back = await page.context().newPage();
await back.goto(url, { waitUntil: 'load' });
await back.waitForFunction(() => window.__probe?.frames > 0, null, { timeout: 30000 });
const endResume = await back.evaluate(() => ({ line: document.querySelector('[data-k=resume]')?.textContent ?? '',
  ways: [...document.querySelectorAll('.card.begin .choices button')].map((b) => b.textContent) }));
await back.click('[data-k=begin]:not(.loading)', { timeout: 60000 });
await back.waitForFunction(() => window.__d?.beats?.name === 'practice', null, { timeout: 30000 }).catch(() => {});
endResume.beat = await back.evaluate(() => window.__d.beats.name);
await back.close();
const audio = log.requests.filter((u) => /\/bundles\/01-neuron\/audio\//.test(u));

faults.push(...frozen.log.errors.map((e) => `frozen console ${e}`), ...frozen.log.failed.map((e) => `frozen request ${e}`),
  ...log.errors.map((e) => `console ${e}`), ...log.failed.map((e) => `request ${e}`));
if (!audio.length) faults.push('no narration audio was requested');
if (sweep.drawn < sweep.dur / 0.25) faults.push(`frozen sweep drew ${sweep.drawn} frames over ${sweep.dur.toFixed(1)} s`);
if (drove !== 'bench') faults.push(`the drive led to ${drove}`);
if (beat !== 'end') faults.push(`ended in beat ${beat}`);
if (listed.parts || listed.ticks < 3 || listed.lines < 12 || listed.chapters < 3 || !listed.tab) faults.push(`frozen chrome: ${JSON.stringify(listed)}`);
const live = heard.note.match(/input 1: (\S+)/)?.[1];
if (heard.opened !== 'x1' || !live) faults.push(`heard callout without its live number: ${JSON.stringify(heard)}`);
if (liveParts) faults.push(`${liveParts} Parts controls in the live watch (or G opened a sheet)`);
if (keyParts) faults.push('the keys sheet still lists Parts');
if (hoverBody.opened !== null || !hoverBody.playing || hoverBody.lit !== null || hoverBody.cursor !== 'auto') faults.push(`hover on the tube's body drew something: ${JSON.stringify(hoverBody)}`);
if (tapBody.opened !== null || !tapBody.playing) faults.push(`a click on the tube's body opened a note: ${JSON.stringify(tapBody)}`);
if (hover.opened !== null || !hover.playing || hover.lit !== 'tube1' || hover.cursor !== 'help') faults.push(`hover on number 1: ${JSON.stringify(hover)}`);
if (tap.opened !== 'x1' || tap.playing || !tap.note) faults.push(`a click on number 1: ${JSON.stringify(tap)}`);
if (twice.opened !== null || !twice.playing) faults.push(`a second click on number 1 did not close the note: ${JSON.stringify(twice)}`);
if (forked.beat !== 'fork' || !forked.card) faults.push(`the watch's end did not open the chooser: ${JSON.stringify(forked)}`);
if (off6.cursor === 'help' || off6.lit !== null) faults.push(`a point 6 px outside badge 1 is a hit: ${JSON.stringify(off6)}`);
if (ways.labels?.join() !== 'Your turn,Skip to Practice,Watch again' || ways.drive !== 'drive' || ways.practice !== 'practice' || ways.watch !== 'watch') faults.push(`chooser after the watch: ${JSON.stringify(ways)}`);
if (!paper || away.opened !== null || !away.playing) faults.push(`a click on bare paper did not close the note and resume: ${JSON.stringify({ paper, ...away })}`);
if (!mirror?.seen || mirror.px < 12) faults.push(`working beside the 1366 plate: ${JSON.stringify(mirror)}`);
if (!endFit.whole || endFit.rows !== 3 || endFit.inView !== 3) faults.push(`end card at 1366×768: ${JSON.stringify(endFit)}`);
if (!closes.x || !closes.Esc || !closes.outside) faults.push(`end card closes: ${JSON.stringify(closes)}`);
if (!plateLive.turned || !plateLive.callout || plateLive.parts || plateLive.chapters < 3 || plateLive.card) faults.push(`plate after the end card: ${JSON.stringify(plateLive)}`);
if (endResume.line !== 'You finished this plate.' || endResume.ways.join() !== 'Practice exercises,Practice tuning,Watch again' || endResume.beat !== 'practice') faults.push(`return visit to the finished lesson: ${JSON.stringify(endResume)}`);
if (shut.opened !== null || !shut.playing) faults.push(`Escape did not close the note and resume: ${JSON.stringify(shut)}`);
if (!(sought < 1.5)) faults.push(`seek to the start landed at ${sought}`);
if (!(fwd.t > sought && fwd.t <= fwd.furthest + 1e-3)) faults.push(`forward one sentence: ${JSON.stringify({ sought, ...fwd })}`);
if (keys < 10) faults.push(`keys sheet lists ${keys} rows`);
if (!/chapter I\b/.test(resume.line) || !/continue/i.test(resume.begin)) faults.push(`second tab: ${JSON.stringify(resume)}`);
if (stored.resume?.unit !== 'U01' || stored.units?.U01?.state !== 'driven') faults.push(`stored progress: ${JSON.stringify(stored).slice(0, 160)}`);
await end(`unit: ${url} sweep ${sweep.dur.toFixed(1)} s in ${sweep.drawn} frames, ${listed.parts + liveParts + plateLive.parts} Parts controls, live watch ${played.toFixed(1)} s, tap → ${tap.opened}, seek → ${sought.toFixed(1)} s, `
  + `callout input 1: ${live}, working ${mirror?.rows.length} rows at ${mirror?.px} px (1366), chooser ${ways.labels?.length} ways, ${keys} keys, drive → ${drove}, end ${beat} (closes ${Object.values(closes).filter(Boolean).length}/3, ${endFit.inView}/${endFit.rows} ways in view at 1366), stored ${stored.units?.U01?.state}, ${audio.length} audio files, ${log.requests.length} requests, ${faults.length} faults`);
