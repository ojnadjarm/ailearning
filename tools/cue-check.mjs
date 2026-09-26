// Plays a unit headless around one cue word and checks that a state key changes on that word and its part is drawn then.
// Usage: npm run cue-check -- --clip c4a --mark meets --key chamberOn --part chamber [--unit 01-neuron] [--within 2] [--url <site>] [--out <dir>]
// Samples the state 0.6 s and 0.1 s before the mark and `within` s after it, and crops the part before and after (`<out>/<clip>.<mark>.*.png`).
import { mkdirSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { harness } from '../tests/lib/harness.mjs';

const { values: a } = parseArgs({ options: {
  clip: { type: 'string' }, mark: { type: 'string' }, key: { type: 'string' }, part: { type: 'string' },
  unit: { type: 'string', default: '01-neuron' }, within: { type: 'string', default: '2' }, url: { type: 'string' }, out: { type: 'string', default: 'out/cue-check' },
} });
for (const k of ['clip', 'mark', 'key', 'part']) if (!a[k]) { console.error(`cue-check: --${k} is required`); process.exit(2); }
const { SPOTS, drawn } = await import(`../units/${a.unit}/unit/spots.ts`);
const spot = SPOTS[a.part];
if (!spot) { console.error(`cue-check: no part "${a.part}" in SPOTS (${Object.keys(SPOTS).join(', ')})`); process.exit(2); }
if (a.url) process.env.E2E_SITE = a.url.endsWith('/') ? a.url : a.url + '/';

const h = await harness('cue-check');
const cues = await (await fetch(`${h.site}bundles/${a.unit}/cues.json`)).json();
const at = cues.clips[a.clip]?.marks[a.mark];
if (at === undefined) { h.fault(`no mark ${a.clip}.${a.mark} in cues.json`); await h.end(); }
const page = await (await h.browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage(), errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${h.site}u/${a.unit}/`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__probe?.frames > 0, null, { timeout: 30000 });
await page.click('[data-k=begin]');
await page.waitForFunction(() => window.__d?.beats?.name === 'watch', null, { timeout: 30000 });
const off = await page.evaluate((c) => window.__rec.offsets[c], a.clip);
if (off === undefined) { h.fault(`${a.clip} is not in the watch`); await h.end(); }
const mark = off + at, within = Number(a.within);
await page.evaluate((t) => { window.__d.furthest = Math.max(window.__d.furthest ?? 0, t + 30); window.__rec.watch(Math.max(0, t)); }, mark - 1.2);

const box = [...(spot.discs ?? []).map(([x, y, r]) => [x - r, y - r, x + r, y + r]), ...(spot.boxes ?? [])]
  .reduce((b, [x0, y0, x1, y1]) => [Math.min(b[0], x0), Math.min(b[1], y0), Math.max(b[2], x1), Math.max(b[3], y1)], [Infinity, Infinity, -Infinity, -Infinity]);
mkdirSync(a.out, { recursive: true });
/** The state at watch second `t` (numbers only: GSAP's own field is circular), and a crop of the part then. */
const sample = async (name, t) => {
  await page.waitForFunction((t) => window.__d.clock.now() >= t, t, { timeout: 40000 });
  const r = await page.evaluate(([x0, y0, x1, y1]) => {
    const d = window.__d, c = d.view.canvas.getBoundingClientRect(), p = [d.view.toScreen(x0, y0), d.view.toScreen(x1, y1)];
    const s = Object.fromEntries(Object.entries(d.s).filter(([, v]) => typeof v === 'number'));
    const xs = p.map((q) => q[0] + c.left), ys = p.map((q) => q[1] + c.top);
    return { t: d.clock.now(), s, clip: { x: Math.min(...xs) - 12, y: Math.min(...ys) - 12, width: Math.abs(xs[1] - xs[0]) + 24, height: Math.abs(ys[1] - ys[0]) + 24 } };
  }, box);
  if (name !== 'early') await page.screenshot({ path: `${a.out}/${a.clip}.${a.mark}.${name}.png`, clip: r.clip });
  return { name, t: +(r.t - off).toFixed(2), v: r.s[a.key], drawn: drawn(spot, r.s) };
};
const rows = [await sample('early', mark - 0.6), await sample('before', mark - 0.1), await sample('after', mark + within)];
const [early, before, after] = rows;
writeFileSync(`${a.out}/${a.clip}.${a.mark}.json`, JSON.stringify({ ...a, mark: at, rows, errors }, null, 1));

if (typeof after.v !== 'number') h.fault(`no number "${a.key}" in the state`);
else if (Math.abs(after.v - before.v) < 1e-3) h.fault(`${a.key} did not change on "${a.mark}": ${before.v} → ${after.v}${early.v !== before.v ? ' (it moved before the word)' : ''}`);
if (!after.drawn) h.fault(`part ${a.part} is not drawn ${within} s after "${a.mark}"`);
errors.forEach((e) => h.fault(e));
await h.end(`cue-check ${a.clip}.${a.mark} @${at}s: ${a.key} ${rows.map((r) => `${r.name} ${+r.v?.toFixed(3)}`).join(', ')}; ${a.part} drawn ${after.drawn}; crops in ${a.out}`);
