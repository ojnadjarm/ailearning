// U01's layout in the browser, as drawn: at every exercise step (each drive step, Workbench case, contrast pair, tuner level and the
// Click as posed) and every chapter end, at 1366, 1920, 2000 and 2560 px, the plate keeps the layout rules (nothing overlaps, each leader
// ends on its own part), only numbers name parts once the explanation is over, and no page control (the bar with its Practice toggle, and
// the Practice sheet opened at each beat's first pose) covers a drawn number, value box or the plaque, nor does the frame cut one. Inside
// Practice (Exercises and Tuning) the shot and every item sit below the section head's rule. The narrow sheet at 400 and 768 px lists every chapter with no sideways scroll.
// Usage: node --import ./tests/lib/register.mjs tests/e2e/geometry.mjs [url]   (default: dist/ under pages-sim; GEOMETRY_ONLY=WxH one wide
// viewport; E2E_PART=WxH one wide viewport alone, or `narrow`)
import { CueBinder, layoutClips, layoutFaults } from 'explainer-kit';
import { harness } from '../lib/harness.mjs';
import { SPEC, CUES } from '../lib/lesson.mjs';
import { WATCH_ORDER, LEAD, GAP } from '../../units/01-neuron/unit/watch.ts';
import { RULES } from '../../units/01-neuron/unit/place.ts';

const { url, faults, fault, open, end, part } = await harness('geometry', { path: 'u/01-neuron/', echo: true });
const only = part || process.env.GEOMETRY_ONLY;
const WIDE = only === 'narrow' ? [] : only ? [only.split('x').map(Number)] : [[1366, 768], [1920, 1080], [2000, 950], [2560, 1440]];
const NARROW = part && part !== 'narrow' ? [] : [[400, 860], [768, 1024]];

/** Each chapter's end on the watch clock: 0.3 s before the next chapter's first clip, the last at the end of the timeline (-1). */
const { offsets } = layoutClips(CUES, WATCH_ORDER, LEAD, GAP), cue = new CueBinder(CUES, offsets), told = SPEC.chapters.filter((c) => c.clips);
const ENDS = told.map((c, i) => ({ numeral: c.numeral, t: i + 1 < told.length ? cue.start(told[i + 1].clips[0]) - 0.3 : -1 }));

/** In the page: the plate's layout items, their page boxes, the frame and the page controls that are up. */
function probe() {
  const d = window.__d, c = d.view.canvas.getBoundingClientRect();
  const bbox = (s) => (s.k === 'disc' ? [s.x - s.r, s.y - s.r, s.x + s.r, s.y + s.r] : [Math.min(s.x0, s.x1), Math.min(s.y0, s.y1), Math.max(s.x0, s.x1), Math.max(s.y0, s.y1)]);
  const page = (b) => { const [ax, ay] = d.view.toScreen(b[0], b[1]), [bx, by] = d.view.toScreen(b[2], b[3]); return [Math.min(ax, bx) + c.left, Math.min(ay, by) + c.top, Math.max(ax, bx) + c.left, Math.max(ay, by) + c.top]; };
  const items = d.view.layout().map((it) => ({ ...it, box: page(it.shapes.map(bbox).reduce((a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])])) }));
  const controls = ['instruction', 'cta', 'offer', 'caption'].map((k) => document.querySelector(`[data-k=${k}]`)).concat([document.querySelector('.bar'), document.querySelector('[data-k=section]'), document.querySelector('.pop:not([hidden])'), document.querySelector('.section-head')])
    .filter((e) => e && !e.hidden && e.offsetParent !== null).map((e) => ({ id: e.dataset.k ?? e.className, r: e.getBoundingClientRect().toJSON() }));
  const head = document.querySelector('.section-head:not([hidden])')?.getBoundingClientRect().bottom ?? null;
  const shotTop = d.view.toScreen(d.s.camX, d.s.camY + d.s.camH / 2)[1] + c.top;
  return { items, controls, frame: [c.left, c.top, c.right, c.bottom], mode: d.labels, head, shotTop };
}

/** The checks on one probe: the layout rules, numbers only after the explanation, no control over a number, value box or the plaque, none cut by the frame. */
function check(at, p, named) {
  for (const f of layoutFaults(p.items, RULES)) fault(`${at}: ${f}`);
  if (!named && p.items.some((i) => i.kind === 'label' || i.named)) fault(`${at}: a name is drawn after the explanation (${p.items.filter((i) => i.kind === 'label' || i.named).map((i) => i.id).join(', ')})`);
  const [fx0, fy0, fx1, fy1] = p.frame;
  if (p.head !== null) {
    if (p.shotTop < p.head - 0.5) fault(`${at}: the section head covers the plate (shot top ${p.shotTop.toFixed(0)} px, head bottom ${p.head.toFixed(0)} px)`);
    for (const it of p.items) if (it.box[1] < p.head - 0.5 && it.box[3] > fy0) fault(`${at}: the section head covers ${it.kind} ${it.id}`);
  }
  for (const it of p.items.filter((i) => ['marker', 'value', 'control'].includes(i.kind))) {
    const [x0, y0, x1, y1] = it.box, inside = x0 >= fx0 && x1 <= fx1 && y0 >= fy0 && y1 <= fy1, outside = x1 <= fx0 || x0 >= fx1 || y1 <= fy0 || y0 >= fy1;
    if (!inside && !outside) fault(`${at}: ${it.kind} ${it.id} cut by the frame`);
    if (outside) continue;
    for (const c of p.controls) if (x0 < c.r.right && x1 > c.r.left && y0 < c.r.bottom && y1 > c.r.top) fault(`${at}: ${c.id} covers ${it.kind} ${it.id}`);
  }
}

/** Every exercise step of `beat` posed in turn, probed once its easing has landed. */
async function steps(page, beat) {
  return page.evaluate(async ([beat, src]) => {
    const probeFn = new Function(`return (${src})`)(), d = window.__d, frame = () => new Promise((r) => requestAnimationFrame(() => r()));
    const until = async (f, ms) => { const t0 = performance.now(); while (!f()) { if (performance.now() - t0 > ms) return false; d.wake(); await frame(); } return true; };
    window.__rec.go(beat);
    await until(() => d.beats.name === beat, 5000);
    const b = d.beats.cur, out = [];
    const poses = beat === 'drive' ? b.steps.map((_, k) => [`step ${k + 1}`, () => { b.i = k - 1; b.next(); }])
      : b.o?.tasks ? [...b.o.tasks, ...Object.values(b.o.contrasts ?? {}), ...(b.o.pool?.tasks ?? [])].map((t) => [t.id, () => { b.q = [t]; b.i = 0; b.open(1); }]) : [[beat, () => undefined]];
    for (const [id, pose] of poses) {
      pose();
      await until(() => ['camX', 'camY', 'camW', 'camH', 'lampX', 'lampY'].every((k) => d.goal[k] === undefined || Math.abs(d.s[k] - d.goal[k]) < 1), 6000);
      for (let k = 0; k < 4; k++) await frame();
      out.push({ id, ...probeFn() });
      const toggle = document.querySelector('[data-k=section]');
      if (out.length === 1 && toggle?.offsetParent) {
        toggle.click();
        for (let k = 0; k < 2; k++) await frame();
        out.push({ id: `${id} + Practice sheet`, ...probeFn() });
        toggle.click();
      }
    }
    return out;
  }, [beat, probe.toString()]);
}

for (const [W, H] of WIDE) {
  const run = await open(url + '?mute&fast=10&beat=bench', { width: W, height: H });
  await run.page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  let n = 0, marks = 0;
  for (const beat of ['drive', 'bench', 'practice', 'race', 'tunes', 'click']) {
    const t0 = Date.now(), list = await steps(run.page, beat);
    for (const p of list) { check(`${W}x${H} ${beat} ${p.id}`, p, false); n++; marks += p.items.filter((i) => i.kind === 'marker').length; }
    console.log(`geometry: ${W}x${H} ${beat} ${list.length} poses in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  await run.close();
  const w = await open(url + '?t=0', { width: W, height: H });
  await w.page.waitForFunction(() => window.__probe?.ready > 0, null, { timeout: 60000 });
  for (const { numeral, t } of ENDS) {
    const p = await w.page.evaluate(async ([t, src]) => {
      window.__rec.watch(t < 0 ? window.__rec.duration : t);
      for (let k = 0; k < 3; k++) await new Promise((r) => requestAnimationFrame(r));
      return new Function(`return (${src})`)()();
    }, [t, probe.toString()]);
    check(`${W}x${H} chapter ${numeral} end`, p, p.mode === 'named');
    if (t < 0 && p.mode !== 'numbered') fault(`${W}x${H}: the explanation ends with names drawn`);
    n++;
  }
  await w.close();
  if (marks < n * 5) fault(`${W}x${H}: only ${marks} balloons drawn over ${n} poses`);
  console.log(`geometry: ${W}x${H} ${n} poses probed, ${marks} balloons checked in play`);
}

for (const [W, H] of NARROW) {
  const run = await open(url, { width: W, height: H });
  await run.page.evaluate(() => document.fonts.ready);
  await run.page.waitForLoadState('networkidle');
  const r = await run.page.evaluate(() => {
    const rows = [...document.querySelectorAll('.narrow .nc li')].map((li) => li.getBoundingClientRect().toJSON());
    return { narrow: document.documentElement.classList.contains('is-narrow'), scroll: document.documentElement.scrollWidth - innerWidth,
      rows: rows.length, overlap: rows.some((a, i) => i && a.top < rows[i - 1].bottom - 0.5), wide: rows.some((a) => a.right > innerWidth || a.left < 0),
      titles: [...document.querySelectorAll('.narrow .nt')].map((e) => e.textContent) };
  });
  if (!r.narrow || r.scroll > 0 || r.rows !== SPEC.chapters.length || r.overlap || r.wide) fault(`narrow sheet ${W}x${H}: ${JSON.stringify({ ...r, titles: undefined })}`);
  if (!r.titles.includes('Tuning')) fault(`narrow sheet ${W}x${H}: no "Tuning" chapter`);
  const errs = [...run.log.errors, ...run.log.failed];
  errs.forEach((e) => fault(`narrow ${W}x${H}: ${e}`));
  await run.close();
  console.log(`geometry: narrow ${W}x${H} ${r.rows} chapters, scroll ${r.scroll}`);
}
await end(`geometry: ${url} ${WIDE.length} wide viewports, ${NARROW.length} narrow, ${faults.length} faults`);
