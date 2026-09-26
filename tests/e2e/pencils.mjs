// U01's pencils in the browser: on a fresh load of each predict-the-output case the learner's marks carry their drag cue (the flag's
// arrows, the needle's arc), the cue goes after the first real drag with the mouse (flag dragged up the rail, needle turned by its grip)
// and stays gone in the next case; the needle's grip, the flag and the needle stay big enough to grab at 1366 and 1920.
// Usage: node --import ./tests/lib/register.mjs tests/e2e/pencils.mjs [url]   (default: dist/ under pages-sim)
import { harness, frames } from '../lib/harness.mjs';
import { BENCH, L, rimAngle, levelY } from '../../units/01-neuron/unit/layout.ts';

const { url, faults, fault, open, end } = await harness('pencils', { path: 'u/01-neuron/', echo: true });
const P1 = BENCH.pen1, P2 = BENCH.pen2;

/** Opens case `id` at `seed`, waits for its hands and the camera, and reads the cues, the pencils' values and the page scale. */
const pose = (page, id, seed, hands) => page.evaluate(async ([id, seed, hands]) => {
  const d = window.__d, frame = () => new Promise((r) => requestAnimationFrame(() => r()));
  const until = async (f, ms) => { const t0 = performance.now(); while (!f()) { if (performance.now() - t0 > ms) return false; d.wake(); await frame(); } return true; };
  const b = d.beats.cur, t = [...b.o.tasks, ...(b.o.pool?.tasks ?? [])].find((t) => t.id === id);
  b.q = [t]; b.i = 0; b.open(seed);
  const on = await until(() => hands.every((i) => d.hands[i].enabled), 20000);
  await until(() => ['camX', 'camY', 'camW', 'camH'].every((k) => d.goal[k] === undefined || Math.abs(d.s[k] - d.goal[k]) < 1), 6000);
  for (let k = 0; k < 4; k++) await frame();
  const [ax] = d.view.toScreen(0, 0), [bx] = d.view.toScreen(100, 0);
  return { on, pen1Cue: d.s.pen1Cue, pen2Cue: d.s.pen2Cue, pen1: d.hands[4].value(), pen2: d.hands[5].value(), px: Math.abs(bx - ax) / 100 };
}, [id, seed, hands]);

/** A world point as page pixels. */
const at = (page, x, y) => page.evaluate(([x, y]) => { const c = window.__d.view.canvas.getBoundingClientRect(), [sx, sy] = window.__d.view.toScreen(x, y); return [sx + c.left, sy + c.top]; }, [x, y]);
/** A mouse drag from one world point to another, in steps. */
async function drag(page, from, to) {
  const [x0, y0] = await at(page, ...from), [x1, y1] = await at(page, ...to);
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  for (let k = 1; k <= 12; k++) await page.mouse.move(x0 + ((x1 - x0) * k) / 12, y0 + ((y1 - y0) * k) / 12);
  await page.mouse.up();
  await frames(page, 3);
}
const grip = (v, r = P2.grip) => { const a = rimAngle(v); return [L.gaugeX - Math.sin(a) * r, Math.cos(a) * r]; };
const cues = (page) => page.evaluate(() => ({ pen1Cue: window.__d.s.pen1Cue, pen2Cue: window.__d.s.pen2Cue, pen1: window.__d.hands[4].value(), pen2: window.__d.hands[5].value() }));

for (const [W, H] of [[1366, 768], [1920, 1080]]) {
  const run = await open(url + '?mute&fast=10&beat=bench', { width: W, height: H });
  await run.page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  const a = await pose(run.page, 'e2.1', 7, [4, 5]), at1 = `${W}x${H} e2.1`;
  if (!a.on) fault(`${at1}: the pencils never came on`);
  if (a.pen1Cue !== 1 || a.pen2Cue !== 1) fault(`${at1}: no drag cue on a fresh load (${a.pen1Cue}, ${a.pen2Cue})`);
  const sizes = { grip: 2 * (P2.gripR + 5) * a.px, needle: P2.tip * a.px, flag: 2 * P1.hh * a.px };
  if (sizes.grip < 14 || sizes.needle < 36 || sizes.flag < 9) fault(`${at1}: pencils too small to grab: ${JSON.stringify(sizes)}`);
  await drag(run.page, grip(a.pen2), grip(a.pen2 - 1.5));
  let c = await cues(run.page);
  if (c.pen2 === a.pen2) fault(`${at1}: dragging the needle's grip did not turn it (${c.pen2})`);
  if (c.pen2Cue !== 0) fault(`${at1}: the needle's cue stayed after the first drag`);
  if (c.pen1Cue !== 1) fault(`${at1}: dragging the needle cleared the flag's cue`);
  const fx = (P1.flagX0 + P1.flagX1) / 2;
  await drag(run.page, [fx, levelY(a.pen1)], [fx, levelY(a.pen1) + 60]);
  c = await cues(run.page);
  if (c.pen1 === a.pen1) fault(`${at1}: dragging the flag did not move it (${c.pen1})`);
  if (c.pen1Cue !== 0) fault(`${at1}: the flag's cue stayed after the first drag`);
  const b = await pose(run.page, 'e2.2', 11, [4, 5]), e = await pose(run.page, 'e3.up', 5, [5]);
  if (b.pen1Cue !== 0 || b.pen2Cue !== 0 || e.pen2Cue !== 0) fault(`${W}x${H}: a cue came back in a later case (${JSON.stringify([b.pen1Cue, b.pen2Cue, e.pen2Cue])})`);
  await run.close();
  const fresh = await open(url + '?mute&fast=10&beat=bench', { width: W, height: H });
  await fresh.page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  const f = await pose(fresh.page, 'e3.up', 5, [5]);
  if (f.pen2Cue !== 1) fault(`${W}x${H} e3.up: no needle cue on a fresh load`);
  [...run.log.errors, ...fresh.log.errors].forEach((x) => fault(`${W}x${H}: ${x}`));
  await fresh.close();
  console.log(`pencils: ${W}x${H} grip ${sizes.grip.toFixed(0)} px, needle ${sizes.needle.toFixed(0)} px, flag ${sizes.flag.toFixed(0)} px`);
}
await end(`pencils: ${faults.length} faults`);
