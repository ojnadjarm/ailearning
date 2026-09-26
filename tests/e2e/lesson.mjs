// U01 played whole by script: the watch, the chooser (Your turn), the drive, every Workbench case (each detector's wrong move first, then
// the right play), Show me on every exercise, every contrast pair, the three tuner levels (Done pressed early on L3 keeps it in play), the
// closing chapter (XIV, no button: the end card opens on its own), stored progress "cleared"; reloaded, the finished landing offers
// Practice exercises / Practice tuning / Watch again, every chapter is done and opens from its row; then a fresh Workbench: three
// clean first tries offer the skip, which opens the tuner levels; endless practice pinned by `?seed=` (the same seed gives the same cases,
// another seed others) with Give up on every exercise kind; Give up on every tuner level and on both endless tuning kinds, and a set loaded
// in Tuning without moving the dials. 0 console errors, 0 failed requests.
// Usage: node --import ./tests/lib/register.mjs tests/e2e/lesson.mjs [url]   (default: dist/ under pages-sim; E2E_PART=lesson|skip|practice|tuning
// runs that part alone: the lesson played whole with its reloads, the skip offer, endless practice, tuning)
import { harness, frames } from '../lib/harness.mjs';
import { right, wrong, shown, DETECTS, CONTRAST } from '../lib/solve.mjs';
import { DETENTS, reached } from '../../units/01-neuron/sim/race.ts';
import { forward, drawnTotal } from '../../units/01-neuron/sim/neuron.ts';
import { puzzle } from '../../units/01-neuron/sim/puzzles.ts';
import { INPUTS } from '../../units/01-neuron/unit/layout.ts';
import { PLAQUE_BOX } from '../../units/01-neuron/unit/place.ts';

const FAST = 10, LIMIT = 20 * 60e3;
const { url, faults, fault, open, end, part } = await harness('lesson', { path: 'u/01-neuron/', echo: true });

/** In the page: a snapshot for the script, and the moves a hand makes (keys, one detent or pencil step at a time). */
function install() {
  const d = window.__d, frame = () => new Promise((r) => requestAnimationFrame(() => r()));
  const until = async (f, ms) => { const t0 = performance.now(); while (!f()) { if (performance.now() - t0 > ms) return false; d.wake(); await frame(); } return true; };
  const shown = (k) => { const n = document.querySelector(`[data-k=${k}]`); return n.hidden ? null : n.textContent; };
  /** The offer chip and the button both up and overlapping (the learner could not press the chip). */
  const clash = () => {
    const [a, b] = ['offer', 'cta'].map((k) => document.querySelector(`[data-k=${k}]`));
    if (a.hidden || b.hidden) return false;
    const r = a.getBoundingClientRect(), q = b.getBoundingClientRect();
    return r.left < q.right && r.right > q.left && r.top < q.bottom && r.bottom > q.top;
  };
  window.__t = {
    snap: () => {
      const b = d.beats.cur, log = d.events.log;
      return {
        beat: d.beats.name, id: b?.task?.id ?? null, phase: b?.phase ?? null, seed: b?.seed ?? null, give: shown('giveup'), gaveUp: log.filter((e) => e.type === 'giveup').length, s: { ...d.s, w1: d.hands[0].value(), w2: d.hands[1].value() }, g: { ...d.goal },
        opens: log.filter((e) => e.type === 'step' && e.phase === 'start' && e.beat !== 'drive').length,
        cta: shown('cta'), offer: shown('offer'), clash: clash(), hint: shown('hint'), enabled: d.hands.map((h) => h.enabled), settled: d.hands.every((h) => h.settled()),
        detects: log.filter((e) => e.type === 'detect'), attempts: log.filter((e) => e.type === 'attempt').length,
        last: log.filter((e) => e.type === 'attempt').at(-1) ?? null, rate: d.rate,
      };
    },
    calm: () => until(() => ['camX', 'camY', 'camW'].every((k) => Math.abs(d.s[k] - d.goal[k]) < 2), 5000),
    plaque: ([x, y]) => { const [a, b] = d.view.toScreen(x, y), r = d.view.canvas.getBoundingClientRect(); return [a + r.left, b + r.top]; },
    rate: (r) => { d.rate = r; },
    /** Lines drawn shorter than their segments (three caches a line's length at its first draw). */
    cut: () => {
      const out = [];
      d.view.stage.scene.traverse((o) => { const g = o.geometry; if (o.visible && g?.attributes?.instanceStart && g._maxInstanceCount < g.attributes.instanceStart.count) out.push(`${g._maxInstanceCount} of ${g.attributes.instanceStart.count}`); });
      return out;
    },
    move: async ([op, i, v]) => {
      if (op === 'rest') { await new Promise((r) => setTimeout(r, i)); return null; }
      const h = d.hands[i];
      if (!h.enabled) return d.beats.cur?.phase === 'play' ? `${op} on hand ${i}, which is not enabled` : null;
      if (op === 'dial') {
        for (let k = 0; k < 8 && h.value() !== v; k++) { h.turn(Math.round((v - h.value()) / 0.5)); d.wake(); await until(() => h.value() === v && h.settled(), 3000); }
        await frame(); await frame();
        return h.value() === v ? null : `dial ${i} stuck at ${h.value()} for ${v}`;
      }
      if (op === 'click') {
        const to = h.value() + v * 0.5;
        h.turn(v); d.wake();
        const ok = await until(() => h.value() === to && h.settled(), 3000);
        await frame(); await frame();
        return ok ? null : `a click on dial ${i} did not land on ${to}`;
      }
      if (op === 'pen') { h.turn(Math.round((v - h.value()) / 0.1)); d.wake(); await frame(); await frame(); return Math.abs(h.value() - v) < 1e-6 ? null : `pencil ${i} at ${h.value()} for ${v}`; }
      if (op === 'slot') { for (let k = 0; k < 10 && h.value() !== v; k++) { h.turn(1); d.wake(); await frame(); } await frame(); return h.value() === v ? null : `part ${i} did not seat at ${v}`; }
      if (op === 'try') { h.turn(1); d.wake(); await frame(); await frame(); return null; }
      return `unknown move ${op}`;
    },
  };
}

/** One page run: helpers bound to it. */
async function start(q) {
  const run = await open(url + q);
  const { page } = run;
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  await page.evaluate(install);
  const snap = () => page.evaluate(() => window.__t.snap());
  /** Snapshots a frame apart until `f` holds (the snapshot) or `ms` pass (null). */
  const poll = async (f, ms) => {
    const t0 = Date.now();
    for (;;) { const st = await snap(); if (f(st)) return st; if (Date.now() - t0 > ms) return null; await frames(page, 1); }
  };
  const wait = async (f, ms, what) => {
    const st = await poll(f, ms);
    if (!st) { const now = await snap(); fault(`timed out: ${what} (beat ${now.beat}, case ${now.id}, phase ${now.phase}, cta ${now.cta})`); }
    return st;
  };
  /** Press in: a click on the plaque when one is up (the pointer path), else Enter. */
  const commit = async (what) => {
    const st = await snap();
    if (st.s.plqOn > 0.5) {
      await page.evaluate(() => window.__t.calm());
      await page.mouse.click(...await page.evaluate((p) => window.__t.plaque(p), [PLAQUE_BOX.x, PLAQUE_BOX.y]));
    } else {
      await page.evaluate(() => document.activeElement?.blur());
      await page.keyboard.press('Enter');
    }
    if (!await poll((now) => now.phase !== 'play' || now.attempts !== st.attempts || now.enabled[0] !== st.enabled[0], 3000)) fault(`${what}: pressing in did nothing`);
  };
  const moves = async (list, what) => {
    for (const m of list) {
      if (m[0] === 'commit') { await commit(what); continue; }
      const err = await page.evaluate((mv) => window.__t.move(mv), m);
      if (err) fault(`${what}: ${err}`);
    }
  };
  const cta = async (want) => {
    const st = await wait((x) => x.cta !== null, 60000, `a button${want ? ` "${want}"` : ''}`);
    if (!st) return null;
    if (want && st.cta !== want) fault(`button reads "${st.cta}", expected "${want}"`);
    await page.click('[data-k=cta]');
    await frames(page, 3);
    return st.cta;
  };
  return { ...run, snap, poll, wait, commit, moves, cta };
}

/** Every page's log, in the order the parts opened them: their console errors and failed requests are faults at the end. */
const logs = [];
let t0 = Date.now();

/**
 * The lesson played whole: the watch chapter by chapter, the chooser, the drive, every case (wrong move, Show me, right play), the Click and
 * the end card; then, reloaded, the finished landing and each hand chapter reopening from its row. Resolves to its summary.
 */
async function lesson() {
  // The watch, chapter by chapter: each chapter plays from its start, then the lesson jumps to just before the next chapter's stop and
  // plays into it; the stop's button opens the next chapter; the last one hands over to the drive.
  const L = await start(`?mute&fast=${FAST}`);
  const chapters = await L.page.evaluate(() => window.__d.chapters().filter((c) => c.t !== undefined).map((c) => ({ n: c.numeral, label: c.label, t: c.t })));
  const duration = await L.page.evaluate(() => window.__d.tl.duration());
  const stops = [];
  for (let i = 0; i < chapters.length; i++) {
    const next = chapters[i + 1], to = (next ? next.t : duration) - 1.6;
    await L.page.waitForFunction((t) => window.__d.clock.now() >= t, Math.min(chapters[i].t + 1.5, to), { timeout: 20000 }).catch(() => {});
    await L.page.evaluate((t) => { window.__d.reach(t); window.__rec.watch(t); }, to);
    const want = next ? `Chapter ${next.n}: ${next.label}` : 'Your turn';
    const at = await L.wait((x) => x.cta !== null, 20000, `the stop before ${want}`);
    if (!at) break;
    stops.push(at.cta);
    if (at.cta !== want) fault(`chapter stop reads "${at.cta}", expected "${want}"`);
    await L.page.click('[data-k=cta]');
  }
  const fork = await L.wait((x) => x.beat === 'fork', 20000, 'the chooser after the watch');
  const ways = await L.page.evaluate(() => [...document.querySelectorAll('[data-k=endchoices]:not([hidden]) [data-c]')].map((b) => b.textContent));
  if (ways.join() !== 'Your turn,Skip to Practice,Watch again') fault(`chooser reads ${JSON.stringify(ways)}`);
  if (fork) await L.page.click('[data-k=endchoices] [data-c="0"]');
  const heard = await L.page.evaluate(() => ({ furthest: window.__d.furthest, stops: window.__d.events.log.filter((e) => e.type === 'stop').length }));
  if (heard.furthest < duration - 1 || heard.stops !== chapters.length - 1) fault(`the watch: heard ${heard.furthest.toFixed(1)} of ${duration.toFixed(1)} s, ${heard.stops} stops`);

  // The drive.
  const out = (s) => forward([s.w1, s.w2], [s.x1, s.x2]).out;
  await L.wait((st) => st.beat === 'drive' && st.enabled[0], 20000, 'drive step 1');
  await L.moves([['dial', 0, 1]], 'd1');
  let st = await L.wait((x) => x.enabled[1] && !x.enabled[0], 30000, 'drive step 2');
  if (st) await L.moves([['dial', 1, DETENTS.find((v) => Math.abs(out({ ...st.s, w2: v }) - st.s.target) < 0.01)]], 'd2');
  st = await L.wait((x) => x.enabled[0] && x.enabled[1], 30000, 'drive step 3');
  if (st) await L.moves(right('d3', st.s), 'd3');
  await L.cta('Continue');
  await L.wait((x) => x.beat === 'bench' && x.phase === 'play', 30000, 'the Workbench');

  /** Every visible line drawn to its full length, a few frames after `where`. */
  const lines = async (where) => {
    await frames(L.page, 5);
    const cut = await L.page.evaluate(() => window.__t.cut());
    if (cut.length) fault(`${where}: lines drawn short: ${cut.join(', ')}`);
  };
  await lines('the watch and the drive');
  const opened = {}, passed = new Set(), hinted = new Set(), buttons = [];
  let handled = -1, early = false;
  /** Wait until the open case leaves play (a verdict or a walk) or another case opens; then note a pass. */
  const resolve = async (id, opens) => {
    const st = await L.wait((x) => x.phase !== 'play' || x.opens !== opens, 60000, `${id} resolves`);
    if (st?.last?.pass) passed.add(id);
    return st;
  };
  /** Show me: Hint (Look), Another hint (Narrow), Show me; the walk leaves the case worked and offers a new one. */
  const showMe = async (st) => {
    hinted.add(st.id.split('.')[0]);
    for (const want of ['Hint', 'Another hint', 'Show me']) {
      const now = await L.wait((x) => x.phase === 'play' && x.hint !== null, 30000, `${st.id} hint "${want}"`);
      if (!now) return;
      if (now.hint !== want) fault(`${st.id}: the hint button reads "${now.hint}", expected "${want}"`);
      await L.page.click('[data-k=hint]');
      await L.poll((x) => x.hint !== now.hint, 5000);
    }
    const up = await L.wait((x) => x.cta !== null, 60000, `${st.id} Show me`);
    if (!up) return;
    const done = await L.wait((x) => x.settled && shown(st.id, x.s, x.g, st.s), 5000, `${st.id}: Show me leaves the case worked`);
    if (done && done.cta !== 'Try a new one' && done.cta !== 'Continue') fault(`${st.id}: after Show me the button reads "${done.cta}"`);
  };

  /** One opened case: the wrong move while its detector still has something to prove, Show me once per exercise, then the right play. */
  async function play(st) {
    const id = st.id, m = DETECTS[id], showable = /^e\d/.test(id);
    opened[id] = (opened[id] ?? 0) + 1;
    await L.page.evaluate((r) => window.__t.rate(r), FAST);
    if (id === 'L3' && !early) {
      early = true;
      await L.wait((x) => x.enabled[0], 30000, 'L3 dials on');
      await L.page.evaluate(() => window.__t.calm());
      await L.page.mouse.click(...await L.page.evaluate((p) => window.__t.plaque(p), [PLAQUE_BOX.x, PLAQUE_BOX.y]));
      await L.poll((x) => x.phase !== 'play' || x.opens !== st.opens || x.cta !== null || !x.enabled[0], 1500);
      const now = await L.snap();
      if (now.phase !== 'play' || now.opens !== st.opens || now.cta !== null || !now.enabled[0]) fault(`L3 Done above the floor left play: ${JSON.stringify({ phase: now.phase, cta: now.cta, enabled: now.enabled })}`);
      await lines('L3 pressed early');
    }
    const fired = st.detects.some((e) => e.task === id), count = st.detects.filter((e) => e.m === m).length;
    if (m && (!fired || count < 2)) {
      const w = wrong(id, st.s);
      if (w) {
        await L.moves(w, `${id} wrong move`);
        const now = await L.wait((x) => x.detects.length > st.detects.length || x.cta !== null || x.opens !== st.opens, 30000, `${id} detector`);
        const hit = now?.detects.slice(st.detects.length).find((e) => e.task === id);
        if (!hit) fault(`${id}: the wrong move fired no detector`);
        else if (hit.m !== m) fault(`${id}: detector named ${hit.m}, expected ${m}`);
        if (!now || now.phase !== 'play' || now.opens !== st.opens) { if (now?.last?.pass) passed.add(id); return; }
      } else if (showable) { await showMe(st); return; }
    }
    if (showable && !hinted.has(id.split('.')[0])) { await showMe(await L.snap()); return; }
    const now = await L.snap();
    await L.moves(right(id, now.s), id);
    const end = await resolve(id, st.opens);
    if (!end?.last?.pass) fault(`${id}: the right play did not pass`);
  }

  t0 = Date.now();
  while (Date.now() - t0 < LIMIT) {
    st = await L.snap();
    if (st.beat === 'click') break;
    if (st.phase === 'play' && st.opens !== handled) { handled = st.opens; await play(st); continue; }
    if (st.cta !== null) { buttons.push(`${st.id ?? '·'} ${st.cta}`); await L.page.click('[data-k=cta]'); await frames(L.page, 3); continue; }
    await frames(L.page, 3);
  }
  await L.page.evaluate(() => window.__t.rate(1));
  const click = await L.wait((x) => x.beat === 'click' && x.g.fig5 === 1 && x.g.fig5m === 1, 60000, 'the Click');
  if (click?.cta) fault(`the Click shows a button "${click.cta}"`);
  await L.wait((x) => x.s.fig5 > 0.999 && x.s.fig5m > 0.999, 10000, 'Fig. 5 drawn');
  await lines('the Click');
  const end = await L.wait((x) => x.beat === 'end', 30000, 'the end card on its own');
  const card = await L.page.evaluate(() => !document.querySelector('[data-k=end]').hidden && document.querySelector('[data-k=end]').textContent.replace(/\s+/g, ' ').slice(0, 80));
  const fit = await L.page.evaluate(() => { const r = (q) => document.querySelector(q).getBoundingClientRect(), c = r('[data-k=end]'), a = r('[data-k=endchoices]');
    return { top: c.top, bottom: c.bottom, h: innerHeight, choices: a.bottom <= c.bottom && a.top >= c.top && a.height > 0 }; });
  if (fit.top < 0 || fit.bottom > fit.h || !fit.choices) fault(`end card does not fit: ${JSON.stringify(fit)}`);
  const stored = await L.page.evaluate(() => JSON.parse(localStorage.getItem('plates:v1:progress') ?? '{}'));
  const final = await L.snap();

  // Saved completion: the finished lesson, opened again, lists every chapter done and reachable, and each chapter played by hand opens from its row.
  const rows = () => L.page.evaluate(() => [...document.querySelectorAll('.side .chapter-list li')].map((li) => {
    const b = li.querySelector('button');
    return { n: b.querySelector('.num').textContent, done: li.classList.contains('done'), open: !b.disabled && !/not reached/i.test(b.textContent) };
  }));
  /** Open the page again with sound (a muted page does not restore) and press the finished landing's first way (Practice exercises). */
  let landed = null;
  const reload = async () => {
    await L.page.goto(url);
    await L.page.waitForSelector('[data-k=begin]:not(.loading)', { timeout: 60000 });
    landed ??= await L.page.evaluate(() => ({ line: document.querySelector('[data-k=resume]').textContent, ways: [...document.querySelectorAll('.card.begin .choices button')].map((b) => b.textContent) }));
    await L.page.click('[data-k=begin]:not(.loading)');
    await L.page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
    await L.page.evaluate(install);
  };
  await reload();
  const kept = await rows();
  const shut = kept.filter((r) => !r.done || !r.open).map((r) => `${r.n}${r.open ? '' : ' closed'}${r.done ? '' : ' not done'}`);
  if (landed.line !== 'You finished this plate.' || landed.ways.join() !== 'Practice exercises,Practice tuning,Watch again') fault(`the finished landing: ${JSON.stringify(landed)}`);
  if (kept.length !== chapters.length + 4 || shut.length) fault(`after a reload: ${kept.length} rows, ${shut.join(', ') || 'all done'}`);
  const reopened = [];
  for (const [i, want] of [[chapters.length, 'drive'], [chapters.length + 1, 'bench'], [chapters.length + 2, 'race'], [chapters.length + 3, 'click']]) {
    await reload();
    await L.page.click(`.side .chapter-list li:nth-child(${i + 1}) button`);
    if (await L.wait((x) => x.beat === want, 20000, `row ${i + 1} opens ${want}`)) reopened.push(want);
  }
  await L.close();
  logs.push(L.log);

  const firedBy = new Set(final.detects.map((e) => e.task));
  for (const id of Object.keys(DETECTS)) if (!firedBy.has(id)) fault(`detector of ${id} never fired`);
  for (const k of Object.values(CONTRAST).filter((k) => k !== 'k3')) if (!opened[k] || !passed.has(k)) fault(`contrast ${k}: opened ${opened[k] ?? 0}, passed ${passed.has(k)}`);
  for (const e of ['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8']) if (!hinted.has(e)) fault(`no Show me on ${e}`);
  for (const id of ['e1.1', 'e1.2', 'e1.3', 'e2.1', 'e2.2', 'e2.3', 'e3.up', 'e3.down', 'e3.zero', 'e3.below', 'e4.1', 'e4.2', 'e5', 'e6.1', 'e6.2', 'e6.3', 'e7.1', 'e7.2', 'e8.1', 'e8.2', 'L1', 'L2', 'L2b', 'L3'])
    if (!passed.has(id)) fault(`${id} never passed`);
  if (!early) fault('L3 was never pressed early');
  if (!end || !card) fault('no end card');
  if (stored.units?.U01?.state !== 'cleared') fault(`stored progress ${JSON.stringify(stored.units?.U01 ?? {}).slice(0, 160)}`);
  if (reopened.length !== 4) fault(`after a reload the hand chapters reopened ${reopened}`);
  return `${chapters.length} chapters, ${stops.length} stops, ${Object.values(opened).reduce((a, b) => a + b, 0)} cases opened, ${passed.size} passed, ${final.detects.length} detector firings over ${firedBy.size} cases, `
    + `${Object.values(CONTRAST).filter((k) => passed.has(k)).length} contrast pairs, ${hinted.size} Show me, ${buttons.length} buttons, stored ${stored.units?.U01?.state}, reloaded ${kept.length - shut.length}/${kept.length} done and open`;
}

/** A fresh Workbench: three clean first tries offer the skip; the chip opens the tuner levels. */
async function skip() {
  const K = await start(`?mute&fast=${FAST}&beat=bench`);
  for (const id of ['e1.1', 'e1.2', 'e1.3']) {
    const s = await K.wait((x) => x.phase === 'play' && x.id === id, 30000, `clean ${id}`);
    if (!s) break;
    await K.moves(right(id, s.s), `clean ${id}`);
    await K.wait((x) => x.phase !== 'play' || x.id !== id, 30000, `clean ${id} passes`);
  }
  const offer = await K.wait((x) => x.offer !== null && x.cta !== null, 30000, 'the skip offer');
  if (offer?.offer !== 'Go to Tuning' || offer.clash) fault(`skip offer: ${JSON.stringify({ offer: offer?.offer, clash: offer?.clash })}`);
  if (offer) await K.page.click('[data-k=offer]');
  const skipped = await K.wait((x) => x.beat === 'race' && x.id === 'L1', 30000, 'the skip opens the tuner levels');
  await K.close();
  logs.push(K.log);
  if (!skipped) fault('the skip offer did not open the tuner levels');
  return null;
}

/** Give up on the open case: the answer plays, then "Try a new one" with a "Next" chip; returns the snapshot then, or null. */
async function giveUp(R, st) {
  if (st.give !== 'Give up') { fault(`${st.id}: the give-up button reads ${JSON.stringify(st.give)}`); return null; }
  await R.page.click('[data-k=giveup]');
  const now = await R.wait((x) => x.cta !== null && x.settled, 60000, `${st.id} give up`);
  if (!now) return null;
  if (now.gaveUp !== st.gaveUp + 1 || now.cta !== 'Try a new one' || now.offer !== 'Next') fault(`${st.id} give up: ${JSON.stringify({ n: now.gaveUp - st.gaveUp, cta: now.cta, offer: now.offer })}`);
  return now;
}
/** Take the "Next" chip to the next case. */
const nextCase = async (R, st) => { await R.page.click('[data-k=offer]'); return R.wait((x) => x.opens !== st.opens || x.cta !== null, 30000, `after ${st.id}`); };

/** Endless practice pinned by a seed: Give up on each case until every exercise kind has been given up; the same seed opens the same cases. */
async function practice() {
  const practiceRun = async (seed, stop) => {
    const R = await start(`?mute&fast=${FAST}&beat=practice&seed=${seed}`), seen = [], kinds = new Set();
    let last = -1;
    for (let n = 0; n < 60 && !stop(seen, kinds); n++) {
      const st = await R.wait((x) => x.beat === 'practice' && x.phase === 'play' && x.opens !== last, 30000, `practice case ${n + 1}`);
      if (!st) break;
      last = st.opens;
      seen.push(`${st.id}@${st.seed}`);
      await R.page.evaluate((r) => window.__t.rate(r), FAST);
      const done = await giveUp(R, st);
      const id = st.id.replace(/^p\./, '');
      if (done && !shown(id, done.s, done.g, st.s)) fault(`practice ${st.id}: Give up did not leave it worked`);
      kinds.add(id.split('.')[0]);
      if (!stop(seen, kinds)) await nextCase(R, st);
    }
    await R.close();
    logs.push(R.log);
    return { seen, kinds };
  };
  const P1 = await practiceRun(7, (_s, k) => k.size >= 8);
  const P2 = await practiceRun(7, (s) => s.length >= 4);
  const P3 = await practiceRun(8, (s) => s.length >= 4);
  if (P1.kinds.size < 8) fault(`practice gave up on ${[...P1.kinds]} only`);
  if (P2.seen.join() !== P1.seen.slice(0, 4).join()) fault(`?seed=7 twice: ${P1.seen.slice(0, 4)} vs ${P2.seen}`);
  if (P3.seen.join() === P2.seen.join()) fault(`?seed=8 opened the same cases as ?seed=7: ${P3.seen}`);
  return `practice gave up on ${P1.kinds.size} kinds in ${P1.seen.length} cases`;
}

/** Tuning: a set loaded into the machine leaves the dials alone; Give up on every level, then on both endless kinds. */
async function tuning() {
  const T = await start(`?mute&fast=${FAST}&beat=race`);
  const LEVEL = { L1: 0, L2: 1, L2b: 1, L3: 2 }, tuned = [];
  let loaded = null;
  for (const id of ['L1', 'L2', 'L2b', 'L3', 'tune.exact', 'tune.best']) {
    if (id === 'tune.exact') { logs.push(T.log); await T.close(); Object.assign(T, await start(`?mute&fast=${FAST}&beat=tunes&seed=3`)); }
    const st = await T.wait((x) => x.phase === 'play' && x.id === id && x.enabled[0], 30000, `tuning ${id}`);
    if (!st) break;
    await T.page.evaluate((r) => window.__t.rate(r), FAST);
    if (id === 'L1') {
      await T.page.evaluate(() => window.__t.calm());
      await T.page.mouse.click(...await T.page.evaluate((p) => window.__t.plaque(p), [(INPUTS.x0 + INPUTS.x1) / 2, INPUTS.ys[2]]));
      const now = await T.poll((x) => x.s.tSel === 2, 3000) ?? await T.snap();
      loaded = { tSel: now.s.tSel, x: [now.s.x1, now.s.x2, now.s.target], ex3: [now.s.ex3a, now.s.ex3b, now.s.ex3t], dials: [now.s.w1 === st.s.w1, now.s.w2 === st.s.w2] };
      if (loaded.tSel !== 2 || loaded.x.join() !== loaded.ex3.join() || !loaded.dials.every(Boolean)) fault(`loading set III: ${JSON.stringify(loaded)}`);
    }
    const done = await giveUp(T, st);
    if (!done) break;
    const w = [done.s.w1, done.s.w2];
    const met = id in LEVEL ? reached(w, LEVEL[id]) : (() => { const z = puzzle(id.slice(5), st.seed); return drawnTotal(w, z.ex) <= z.goal + 1e-9; })();
    if (!met) fault(`${id}: Give up left the dials at ${w}, which miss the goal`);
    tuned.push(id);
    await nextCase(T, st);
  }
  await T.close();
  logs.push(T.log);
  return `tuning gave up on ${tuned.length}, set III loaded ${loaded?.tSel === 2}`;
}

const PARTS = { lesson, skip, practice, tuning };
const said = [];
for (const [name, run] of Object.entries(PARTS)) if (!part || part === name) said.push(await run());
logs.flatMap((l) => [...l.errors.map((e) => `console ${e}`), ...l.failed.map((e) => `request ${e}`)]).forEach(fault);
await end(`lesson: ${url} ${[...said.filter(Boolean), `${((Date.now() - t0) / 1000).toFixed(0)} s`].join(', ')}, ${faults.length} faults`);
