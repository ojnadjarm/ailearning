// The e2e suite: one pages-sim over dist/ and one browser, each file in its own process with its own contexts. The files that measure frames
// or time (home-perf, sheet-change, sheet-cold) run first, alone. Then two lanes at once: the files whose pages play by frame time (the lesson
// by part, unit, flow: a starved frame changes what they see) one after another, and the rest in parallel, longest first, geometry by
// viewport. Each job's output prints whole when it ends. Usage: node tests/run-e2e.mjs [job ...]   (a job id or file name; E2E_JOBS=n in parallel)
import { spawn } from 'node:child_process';
import { availableParallelism } from 'node:os';
import { startPagesSim } from './lib/pages-sim.mjs';
import { serve } from './lib/browser.mjs';

const TS = ['--import', './tests/lib/register.mjs'];
/** Every job: its file, the shard it runs (E2E_PART), whether it loads the unit's TypeScript; in the order they start. */
const ALONE = [{ file: 'home-perf' }, { file: 'sheet-change' }, { file: 'sheet-cold' }];
const TIMED = [
  ...['lesson', 'practice', 'tuning', 'skip'].map((part) => ({ file: 'lesson', part, ts: true })), { file: 'unit' }, { file: 'flow' },
];
const PARALLEL = [
  ...['1366x768', '1920x1080', '2000x950', '2560x1440'].map((part) => ({ file: 'geometry', part, ts: true })),
  { file: 'home' }, { file: 'geometry', part: 'narrow', ts: true }, { file: 'site' }, { file: 'pencils', ts: true },
];
const id = (j) => (j.part ? `${j.file}:${j.part}` : j.file);
const pick = process.argv.slice(2);
const wanted = (j) => !pick.length || pick.includes(id(j)) || pick.includes(j.file);

const sim = await startPagesSim();
const server = await serve();
const env = { ...process.env, E2E_SITE: sim.url, E2E_WS: server.wsEndpoint() };

/** Runs one job to its end; resolves to its id, seconds and exit code, and prints its output as one block. */
function run(j) {
  const t0 = Date.now(), out = [];
  const child = spawn(process.execPath, [...(j.ts ? TS : []), `tests/e2e/${j.file}.mjs`], { env: { ...env, E2E_PART: j.part ?? '' }, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', (b) => out.push(b));
  child.stderr.on('data', (b) => out.push(b));
  return new Promise((done) => child.on('close', (code) => {
    const s = (Date.now() - t0) / 1000;
    process.stdout.write(`── ${id(j)}: ${code ? 'FAIL' : 'ok'}, ${s.toFixed(0)} s\n${Buffer.concat(out).toString()}`);
    done({ id: id(j), s, code });
  }));
}

/** Runs `jobs` with at most `n` at a time. */
async function pool(jobs, n) {
  const results = [], queue = [...jobs];
  await Promise.all(Array.from({ length: Math.min(n, queue.length) }, async () => { while (queue.length) results.push(await run(queue.shift())); }));
  return results;
}

const t0 = Date.now();
const results = await pool(ALONE.filter(wanted), 1);
const lanes = await Promise.all([pool(TIMED.filter(wanted), 1), pool(PARALLEL.filter(wanted), Number(process.env.E2E_JOBS) || Math.max(1, availableParallelism() - 2))]);
results.push(...lanes.flat());
await server.close();
await sim.close();
const failed = results.filter((r) => r.code);
console.log(`e2e: ${results.length} jobs in ${((Date.now() - t0) / 1000).toFixed(0)} s (${results.map((r) => `${r.id} ${r.s.toFixed(0)}`).join(', ')}), ${failed.length} failed${failed.length ? `: ${failed.map((r) => r.id).join(', ')}` : ''}`);
process.exit(failed.length ? 1 : 0);
