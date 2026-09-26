// U01 as a lesson, then Practice: the chooser after the watch goes on to chapter XI (or skips to Practice); the end card leads into
// Practice (exercises or tuning) or the watch again; Practice has its own head (name, a tab per kind, the way back to the lesson) and is
// never a chapter (not in the chapter column or the bar); the bar holds a segment per chapter played by hand (XIV, the closing one, too).
// Practice from any chapter: the bar's Practice toggle opens a sheet of its tabs from the watch, each hand chapter, the chooser and the end;
// the way back returns to the same beat, sentence or step (the end with its card open), and nothing completes the unit before the end.
// The landing (with sound, seeded progress): a finished lesson offers Practice exercises / Practice tuning / Watch again, each leading
// there; an unfinished one reads "You stopped in chapter N, Title." (or "Practice, Exercises"); the lede counts 14 chapters and Practice;
// a chapter pressed in a finished lesson opens with no card. The closing chapter: payoff, then the closing line, then the end card with a
// phantom next sheet. The bar's status text fits (no ellipsis, no overlap) at 1024, 1366, 1920 and 2560 for every beat, and no beat has a
// Parts button, list or modal.
// Then one voice at a time: "Your turn" entered 20 times (at once, twice in one frame, while its line plays, while its clip still loads)
// never plays two voices together, and each entry leaves exactly one voice playing.
// Usage: node tests/e2e/flow.mjs [url]   (default: dist/ under pages-sim)
import { harness, frames, until } from '../lib/harness.mjs';

const { url, browser, faults, fault, open, end: finish } = await harness('flow', { path: 'u/01-neuron/', echo: true });
const ready = (page) => page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
const beat = (page) => page.evaluate(() => window.__d.beats.name);
const waitBeat = (page, b) => page.waitForFunction((b) => window.__d.beats.name === b, b, { timeout: 20000 }).then(() => true, () => false);
/** What the chrome lists as chapters: the side column (the chapters button opens it from 1024 px) and the bar's watch ticks plus segments. */
const listed = (page) => page.evaluate(() => {
  const txt = (q) => [...document.querySelectorAll(q)].map((e) => e.textContent.trim());
  document.querySelector('[data-k=chapters]').click();
  return { side: txt('.side .chapter-list .label'), segs: [...document.querySelectorAll('.progress .seg')].map((s) => s.dataset.beat), ticks: document.querySelectorAll('.progress .tick').length };
});
const head = (page) => page.evaluate(() => {
  const h = document.querySelector('.section-head');
  return h.hidden ? null : { name: h.querySelector('.section-name').textContent, tabs: [...h.querySelectorAll('.tab')].map((b) => `${b.textContent}${b.getAttribute('aria-current') ? '*' : ''}`), back: h.querySelector('.back').textContent.trim(),
    bar: getComputedStyle(document.querySelector('.progress .head')).display };
});
const choices = (page) => page.evaluate(() => [...document.querySelectorAll('[data-k=endchoices]:not([hidden]) [data-c]')].map((b) => `${b.textContent}:${b.className.replace('btn ', '')}`));

// 1. Lesson, then Practice (muted: the flow, not the audio).
const A = await open(url + '?mute');
await ready(A.page);
const all = await A.page.evaluate(() => window.__d.chapters().map((c) => c.beat ?? c.id));
if (all.includes('practice') || all.includes('tunes')) fault(`Practice is a chapter: ${all}`);
await A.page.evaluate(() => window.__rec.go('fork'));
const fork = await choices(A.page);
if (fork.join() !== 'Your turn:primary,Skip to Practice:secondary,Watch again:quiet') fault(`chooser after the watch: ${fork}`);
await A.page.click('[data-k=endchoices] [data-c="0"]');
if (!await waitBeat(A.page, 'drive')) fault(`"Your turn" opened ${await beat(A.page)}`);
const inLesson = await head(A.page);
if (inLesson) fault(`the Practice head shows in chapter XI: ${JSON.stringify(inLesson)}`);
const segs = await listed(A.page);
if (segs.segs.join() !== 'drive,bench,race,click') fault(`bar segments: ${segs.segs}`);
await A.page.evaluate(() => window.__rec.go('end'));
const end = await choices(A.page);
if (end.join() !== 'Practice exercises:primary,Practice tuning:secondary,Watch again:quiet') fault(`end card: ${end}`);
await A.page.click('[data-k=endchoices] [data-c="0"]');
if (!await waitBeat(A.page, 'practice')) fault(`"Practice exercises" opened ${await beat(A.page)}`);
const p1 = await head(A.page);
if (!p1 || p1.name !== 'Practice' || p1.tabs.join() !== 'Exercises*,Tuning' || p1.back !== 'Back to the lesson' || p1.bar !== 'none') fault(`Practice head: ${JSON.stringify(p1)}`);
const inPractice = await listed(A.page);
const names = inPractice.side;
if (names.some((n) => /practice/i.test(n)) || inPractice.segs.some((b) => b === 'practice' || b === 'tunes')) fault(`Practice listed as a chapter: ${JSON.stringify(inPractice)}`);
if (inPractice.side.length !== all.length) fault(`chapter column in Practice: ${inPractice.side.length} rows, want ${all.length}`);
await A.page.click('.section-head .tab:nth-child(2)');
if (!await waitBeat(A.page, 'tunes')) fault(`the Tuning tab opened ${await beat(A.page)}`);
const p2 = await head(A.page);
if (p2?.tabs.join() !== 'Exercises,Tuning*') fault(`Tuning tab: ${JSON.stringify(p2)}`);
await A.page.click('.section-head .back');
if (!await waitBeat(A.page, 'end')) fault(`the way back opened ${await beat(A.page)}`);
if (await head(A.page)) fault('the Practice head stays after the way back');
await A.page.click('[data-k=endchoices] [data-c="1"]');
if (!await waitBeat(A.page, 'tunes')) fault(`"Practice tuning" opened ${await beat(A.page)}`);
await A.page.evaluate(() => window.__rec.go('fork'));
await A.page.click('[data-k=endchoices] [data-c="1"]');
if (!await waitBeat(A.page, 'practice')) fault(`"Skip to Practice" opened ${await beat(A.page)}`);
const sw = await A.page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
if (sw > 0) fault(`horizontal scroll ${sw} px`);
await A.close();

// 1b. Practice from any chapter, and back to the same place.
const P = await open(url + '?mute');
await ready(P.page);
await P.page.evaluate(() => { window.__done = []; window.__d.events.on('complete', (e) => window.__done.push(e.beat)); });
/** Where the learner is: the beat, the watch second, the beat's snapshot and whether the end card shows. */
const here = (page) => page.evaluate(() => ({ beat: window.__d.beats.name, t: window.__d.clock.now(), snap: JSON.stringify(window.__d.beats.cur?.snapshot?.() ?? null, (k, v) => (k === 's' ? undefined : v)),
  card: !document.querySelector('[data-k=end]').hidden }));
/** Waits until the beat, its snapshot and the end card hold still for 5 frames (at most 3 s). */
const rest = (page) => page.evaluate(async () => {
  const at = () => JSON.stringify([window.__d.beats.name, window.__d.beats.cur?.snapshot?.() ?? null, document.querySelector('[data-k=end]').hidden], (k, v) => (k === 's' ? undefined : v));
  const t0 = performance.now();
  for (let last = at(), same = 0; same < 5 && performance.now() - t0 < 3000;) { await new Promise((r) => requestAnimationFrame(r)); const now = at(); same = now === last ? same + 1 : 0; last = now; }
});
const tIV = await P.page.evaluate(() => window.__d.chapters().find((c) => c.numeral === 'IV').t);
const trips = {};
for (const [name, go] of [['watch IV', () => P.page.evaluate((t) => { window.__rec.watch(t + 1); window.__d.clock.pause?.(); }, tIV)], ['drive'], ['bench'], ['race'], ['fork'], ['click'], ['end']]) {
  if (go) await go(); else { await P.page.evaluate((b) => window.__rec.go(b), name); await waitBeat(P.page, name); }
  await rest(P.page);
  const before = await here(P.page);
  const toggle = await P.page.evaluate(() => { const b = document.querySelector('[data-k=section]'); return b && b.offsetParent ? b.textContent : null; });
  await P.page.click('[data-k=section]');
  const sheet = await P.page.evaluate(() => [...document.querySelectorAll('.pop:not([hidden]) .section-ways button')].map((b) => b.textContent));
  await P.page.click('.pop:not([hidden]) .section-ways [data-t="0"]');
  const inside = await waitBeat(P.page, 'practice');
  const h = await head(P.page), hidden = await P.page.evaluate(() => !document.querySelector('[data-k=section]').offsetParent);
  if (name === 'fork' || name === 'watch IV') { if ((await P.page.evaluate(() => window.__done)).includes('unit')) fault(`the unit completed before the end (by ${name})`); }
  await P.page.click('.section-head .back');
  await waitBeat(P.page, before.beat);
  await rest(P.page);
  const after = await here(P.page);
  const same = after.beat === before.beat && (before.beat === 'watch' ? Math.abs(after.t - before.t) < 1.5 : after.snap === before.snap) && (before.beat !== 'end' || after.card);
  trips[name] = same;
  if (toggle !== 'Practice' || sheet.join() !== 'Exercises,Tuning' || !inside || h?.name !== 'Practice' || !hidden || !same)
    fault(`Practice from ${name}: ${JSON.stringify({ toggle, sheet, inside, head: h?.name, hidden, before, after })}`);
}
const early = await P.page.evaluate(() => window.__done);
if (early.slice(0, early.indexOf('click') + 1).includes('unit')) fault(`the unit completed before the end: ${early}`);
await P.close();

// 1c. The landing, with sound: a fresh context per stored stop (a reload would flush the old page's progress over the seed).
let L = null, lp = null;
const ALL = ['watch', 'fork', 'drive', 'bench', 'race', 'click', 'end'];
/** Open the page on a stored stop (none: a first visit) and read the Begin card. */
const landAt = async (unit) => {
  await L?.close();
  const value = unit && JSON.stringify({ v: 1, units: { U01: unit }, resume: { unit: 'U01', beat: unit.beat } });
  L = await browser.newContext({ viewport: { width: 1366, height: 768 }, storageState: { cookies: [], origins: value ? [{ origin: new URL(url).origin, localStorage: [{ name: 'plates:v1:progress', value }] }] : [] } });
  lp = await L.newPage();
  await lp.goto(url);
  await lp.waitForSelector('[data-k=begin]:not(.loading)', { timeout: 60000 });
  return lp.evaluate(() => ({ line: document.querySelector('[data-k=resume]').textContent, ways: [...document.querySelectorAll('.card.begin .choices button')].map((b) => b.textContent),
    lede: document.querySelector('.card.begin .lede').textContent }));
};
const { lede } = await landAt(null);
if (!/14 chapters/.test(lede) || !/Practice/.test(lede)) fault(`landing lede: ${lede}`);
const FIN = { furthest: 1e6, done: ['unit', 'drive', 'bench', 'race', 'click'], visited: ALL, beat: 'end', snap: 'end' };
const fin = await landAt(FIN);
if (fin.line !== 'You finished this plate.' || fin.ways.join() !== 'Practice exercises,Practice tuning,Watch again') fault(`finished landing: ${JSON.stringify(fin)}`);
const led = {};
for (const [i, want] of [[0, 'practice'], [1, 'tunes'], [2, 'watch']]) {
  await landAt(FIN);
  await lp.click(`.card.begin .choices button:nth-child(${i + 1})`);
  await ready(lp);
  const ok = await waitBeat(lp, want);
  led[want] = ok && (want !== 'watch' || await lp.evaluate(() => window.__d.clock.now() < 3));
  if (!led[want]) fault(`finished landing choice ${i} opened ${await beat(lp)}`);
}
await landAt(FIN);
await lp.click('.card.begin .choices button:nth-child(1)');
await ready(lp);
await waitBeat(lp, 'practice');
await lp.evaluate(() => document.querySelector('[data-k=chapters]').click());
await lp.evaluate(() => [...document.querySelectorAll('.side .chapter-list button')].find((b) => b.querySelector('.num').textContent === 'XII').click());
const pressed = await waitBeat(lp, 'bench');
const cards = await lp.evaluate(() => ({ begin: !!document.querySelector('.card.begin')?.offsetParent, end: !document.querySelector('[data-k=end]').hidden }));
if (!pressed || cards.begin || cards.end) fault(`chapter XII in a finished lesson: ${JSON.stringify({ pressed, ...cards })}`);
const lines = {
  bench: await landAt({ furthest: 1e6, done: ['drive'], visited: ['watch', 'fork', 'drive', 'bench'], beat: 'bench' }),
  watch: await landAt({ furthest: tIV + 2, beat: 'watch', t: tIV + 1 }),
  practice: await landAt({ furthest: 1e6, visited: ['watch', 'fork', 'practice'], beat: 'practice' }),
};
if (lines.bench.line !== 'You stopped in chapter XII, Workbench.' || lines.bench.ways.join() !== 'Continue,Start over') fault(`unfinished landing at bench: ${JSON.stringify(lines.bench)}`);
if (!/^You stopped in chapter IV, /.test(lines.watch.line)) fault(`unfinished landing mid-watch: ${JSON.stringify(lines.watch)}`);
if (lines.practice.line !== 'You stopped in Practice, Exercises.') fault(`unfinished landing in Practice: ${JSON.stringify(lines.practice)}`);
await L.close();

// 1d. The closing chapter, with sound: payoff, then the closing line, then the end card on its own.
const C = await browser.newContext({ viewport: { width: 1366, height: 768 } });
const cp = await C.newPage();
await cp.goto(url);
await cp.waitForSelector('[data-k=begin]:not(.loading)', { timeout: 60000 });
await cp.click('[data-k=begin]');
await ready(cp);
const xiv = await listed(cp);
await cp.evaluate(() => { const v = window.__d.voice, f = v.line.bind(v); window.__said = []; v.line = (id, ...a) => { window.__said.push(id); return f(id, ...a); }; window.__rec.go('click'); });
const closed = await cp.waitForFunction(() => window.__d.beats.name === 'end', null, { timeout: 60000 }).then(() => true, () => false);
await until(cp, () => !document.querySelector('[data-k=end]').hidden && document.querySelectorAll('[data-k=endchoices] [data-c]').length > 0, null, 5000);
await frames(cp);
const closing = await cp.evaluate(() => ({ said: window.__said.join(), card: !document.querySelector('[data-k=end]').hidden, ways: document.querySelectorAll('[data-k=endchoices] [data-c]').length,
  next: document.querySelector('[data-k=endnext] .next.phantom')?.textContent ?? null, link: !!document.querySelector('[data-k=endnext] a') }));
const xivDone = await cp.evaluate(() => [...document.querySelectorAll('.side .chapter-list li')].find((l) => l.querySelector('.num').textContent === 'XIV')?.className);
if (!xiv.side.includes("What one neuron can't do") && !xiv.side.includes('Not reached yet')) fault(`XIV missing from the side list: ${xiv.side}`);
if (!closed || !closing.said.startsWith('payoff,close') || !closing.card || closing.ways !== 3 || closing.next !== 'Next: Sheet II · Layers and creases' || closing.link || xivDone !== 'done')
  fault(`closing chapter: ${JSON.stringify({ closed, ...closing, xivDone })}`);
if (xiv.side.length !== all.length) fault(`side list: ${xiv.side.length} rows, want ${all.length}`);
await C.close();

// 1e. The bar's status text fits beside the other controls at every desktop width, for every beat.
const fits = [];
const F = await open(url + '?mute');
await ready(F.page);
for (const w of [1024, 1366, 1920, 2560]) {
  await F.page.setViewportSize({ width: w, height: Math.round(w * 9 / 16) });
  for (const b of ['watch', 'fork', 'drive', 'bench', 'race', 'click', 'end', 'practice', 'tunes']) {
    await F.page.evaluate((b) => window.__rec.go(b), b);
    await waitBeat(F.page, b);
    await frames(F.page);
    const r = await F.page.evaluate(() => {
      const st = document.querySelector('[data-k=status]'), a = st.getBoundingClientRect();
      const hit = [...st.parentElement.querySelectorAll('button, .progress')].filter((e) => e.offsetParent && !st.contains(e)).map((e) => e.getBoundingClientRect())
        .some((o) => o.width && o.left < a.right - 0.5 && o.right > a.left + 0.5 && o.top < a.bottom && o.bottom > a.top);
      return { text: st.textContent, cut: st.scrollWidth > st.clientWidth + 0.5 || st.scrollHeight > st.clientHeight + 0.5, hit,
        parts: document.querySelectorAll('[data-k=parts], .modal-back, .modal, .parts').length };
    });
    if (r.cut || r.hit) fits.push(`${w}px ${b} "${r.text}" ${r.cut ? 'cut' : 'overlaps'}`);
    if (r.parts) fault(`${w}px ${b}: ${r.parts} Parts controls in the DOM`);
  }
}
fits.forEach(fault);
await F.close();

// 2. One voice at a time, with sound: every buffer source the page starts is logged (its start, and its end: natural or stopped), and the
// "Your turn" clip is held back 700 ms on its first load, so the early entries race its decode.
function spy() {
  const log = [], start = AudioBufferSourceNode.prototype.start, stop = AudioBufferSourceNode.prototype.stop;
  window.__voices = log;
  AudioBufferSourceNode.prototype.start = function (when = 0, off = 0, dur) {
    const t = this.context.currentTime, s = Math.max(t, when), len = dur ?? (this.buffer?.duration ?? 0) - off;
    this.__rec = { len: +(this.buffer?.duration ?? 0).toFixed(2), s, e: s + len };
    log.push(this.__rec);
    return start.apply(this, arguments);
  };
  AudioBufferSourceNode.prototype.stop = function (when = 0) {
    if (this.__rec) this.__rec.e = Math.min(this.__rec.e, Math.max(this.context.currentTime, when));
    return stop.apply(this, arguments);
  };
}
const B = await browser.newContext({ viewport: { width: 1366, height: 768 } });
await B.addInitScript(spy);
const page = await B.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.route(/\/audio\/d1\.(opus|m4a)$/, async (r) => { await new Promise((ok) => setTimeout(ok, 700)); await r.continue(); });
await page.goto(url);
await page.waitForSelector('[data-k=begin]:not(.loading)', { timeout: 60000 });
await page.click('[data-k=begin]');
await ready(page);
/** Voices sounding now (by clip length; "d1" when it is the Your turn clip), and every overlap of two voices (over 30 ms) so far. */
const voices = () => page.evaluate(() => {
  const now = window.__d.voice.ctx.currentTime, d1 = +window.__d.bundle.cues.clips.d1.duration.toFixed(2);
  const heard = window.__voices.filter((v) => v.len > 0.5 && v.e > v.s + 0.03), over = [];
  const name = (v) => (Math.abs(v.len - d1) < 0.05 ? 'd1' : `${v.len}s`);
  for (let i = 0; i < heard.length; i++) for (let j = i + 1; j < heard.length; j++) {
    const a = heard[i], b = heard[j], o = Math.min(a.e, b.e, now) - Math.max(a.s, b.s);
    if (o > 0.03) over.push(`${name(a)}+${name(b)} ${o.toFixed(2)}s`);
  }
  return { now: heard.filter((v) => v.s <= now && v.e > now).map(name), over, started: heard.length };
});
const PLAN = [0, 0, 250, 0, 900, 120, 1800, 0, 400, 60, 1500, 0, 300, 0, 900, 90, 2200, 0, 500, 1200];
const single = [];
for (let i = 0; i < PLAN.length; i++) {
  await page.evaluate((twice) => { window.__rec.go('drive'); if (twice) window.__rec.go('drive'); }, i % 5 === 3);
  await page.waitForTimeout(PLAN[i]);
  if (PLAN[i] >= 900) single.push((await voices()).now.length);
}
await until(page, () => {
  const now = window.__d.voice.ctx.currentTime, d1 = +window.__d.bundle.cues.clips.d1.duration.toFixed(2);
  const on = window.__voices.filter((v) => v.len > 0.5 && v.e > v.s + 0.03 && v.s <= now && v.e > now);
  return on.length === 1 && Math.abs(on[0].len - d1) < 0.05;
}, null, 5000);
const v = await voices();
if (v.over.length) fault(`two voices at once: ${v.over.slice(0, 5).join(', ')}${v.over.length > 5 ? ` (+${v.over.length - 5})` : ''}`);
if (single.some((n) => n !== 1)) fault(`voices sounding after an entry settled: ${single}`);
if (v.now.length !== 1 || v.now[0] !== 'd1') fault(`after 20 entries, sounding: ${JSON.stringify(v.now)}`);
errors.forEach((e) => fault(`console ${e}`));
await B.close();
await finish(`flow: fork ${fork.length} ways, end ${end.length} ways, Practice head ${p1?.tabs.length ?? 0} tabs, bar ${segs.segs.length} segments; `
  + `Practice and back from ${Object.values(trips).filter(Boolean).length}/${Object.keys(trips).length} places; landing ${fin.ways.length} ways; closing ${closing.said}; status fits ${36 - fits.length}/36; `
  + `20 entries into Your turn, ${v.over.length} overlaps, sounding ${JSON.stringify(v.now)}; ${faults.length} faults`);
