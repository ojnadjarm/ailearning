// Framing of U01's plate: at every settled sentence and in the drive shot, on the stage sizes of 1920 and 2560 screens and windows,
// each drawn label, number tag, balloon, block and figure is whole on screen or wholly off it, and the part the voice points at is
// inside the frame between the page chrome. Text keeps a legible size in the shots the learner reads numbers in.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cuts } from '../../src/kit/cutaway/framing.ts';
import { frameIn } from '../../units/01-neuron/unit/frame.ts';
import { SHOTS, INSET, INSET_BEFORE, NOTE, LANDING, ANCHORS } from '../../units/01-neuron/unit/layout.ts';
import { LIVE, noteText } from '../../units/01-neuron/unit/live.ts';
import { derive } from '../../units/01-neuron/sim/neuron.ts';
import { STAGES, OBJECTS, CHROME_W, BAR, cam, samples } from '../lib/framing.mjs';
import { chapterEnds } from '../lib/lesson.mjs';

test('framing: every shown label, tag, balloon, block and figure is whole or out of frame', () => {
  const faults = new Set();
  for (const { at, s } of samples()) for (const [W, H] of STAGES) {
    const { view } = frameIn(cam(s), W, H);
    for (const o of OBJECTS) if (!o.line && o.on(s) && cuts(view, o.r)) faults.add(`${o.id} cut at ${at} on ${W}x${H}`);
  }
  assert.deepEqual([...faults], []);
});

test('framing: no shown label, tag, balloon, block or figure sits under the caption and the bar', () => {
  const faults = new Set();
  for (const { at, s } of samples()) for (const [W, H] of STAGES) {
    const { s: k, cx, view } = frameIn(cam(s), W, H), hw = Math.min(W - 32, CHROME_W) / 2 / k, hb = Math.min(W - 32, BAR.w) / 2 / k;
    const bands = [[cx - hw, view[1], cx + hw, view[1] + INSET.bottom / k], [cx - hb, view[1], cx + hb, view[1] + BAR.h / k]];
    for (const o of OBJECTS) if (o.on(s) && bands.some((b) => o.r[0] < b[2] && o.r[2] > b[0] && o.r[1] < b[3] && o.r[3] > b[1])) faults.add(`${o.id} under the chrome at ${at} on ${W}x${H}`);
  }
  assert.deepEqual([...faults], []);
});

test('framing: the part the voice points at is inside the frame, clear of the page chrome', () => {
  const faults = [];
  for (const { at, s } of samples()) for (const [W, H] of STAGES) {
    if (s.lampOn < 0.5) continue;
    const f = frameIn(cam(s), W, H), px = (s.lampX - f.cx) * f.s + W / 2, py = H / 2 - (s.lampY - f.cy) * f.s;
    if (px < 30 || px > W - 30 || py < INSET.top || py > H - INSET.bottom) faults.push(`lamp at ${at} on ${W}x${H}: ${px.toFixed(0)}, ${py.toFixed(0)}`);
  }
  assert.deepEqual(faults, []);
});

test('framing: before Begin (no side column, no caption or bar) the landing shows Fig. 1 whole, centred on the field both ways', () => {
  const side = [380, 380, 380, 380, 287], fig1 = OBJECTS.find((o) => o.id === 'Fig. 1.');
  for (const [i, [W0, H]] of STAGES.entries()) {
    const W = W0 + side[i], f = frameIn({ x: LANDING.camX, y: LANDING.camY, w: LANDING.camW, h: LANDING.camH }, W, H, INSET_BEFORE);
    assert.ok(!cuts(f.view, fig1.r), `Fig. 1. cut on ${W}x${H}`);
    assert.ok(f.view[1] + INSET_BEFORE.bottom / f.s <= fig1.r[1], `Fig. 1. in the bottom margin on ${W}x${H}`);
    assert.ok(Math.abs(f.cx - LANDING.camX) < 1e-6 && Math.abs(f.cy - LANDING.camY) < 1e-6, `landing off centre on ${W}x${H}`);
  }
});

test('framing: tags and the note stay legible (22-unit text at 11 px or more) in every shot the learner reads numbers in, from a 1920 screen up', () => {
  for (const name of ['full', 'left', 'drive', 'wide']) for (const [W, H] of STAGES.filter(([w]) => w > 1000)) {
    const px = frameIn({ x: 0, y: 0, w: SHOTS[name].camW, h: SHOTS[name].camH }, W, H).s * 22;
    assert.ok(px >= 11, `${name} on ${W}x${H}: ${px.toFixed(1)} px`);
  }
});

test('legibility: on a 1366 screen the note is drawn under 12 px, so the side column carries its rows, and Fig. 6\'s, as text while in the shot', () => {
  const [W, H] = STAGES.at(-1);
  let small = 0;
  for (const { at, s } of samples()) {
    const work = LIVE.working(s), n = Math.round(s.noteRows);
    const shot = (a) => Math.abs(ANCHORS[a].x - s.camX) <= s.camW / 2 && Math.abs(ANCHORS[a].y - s.camY) <= s.camH / 2;
    const rows = s.fig6 <= 0.5 && s.fig5 <= 0.001 && s.noteOn > 0.4 && shot('note') ? noteText(s, derive(s)).slice(0, n).map((r) => r.replace(/^E2 /, '')) : [];
    if (rows.length && frameIn(cam(s), W, H).s * NOTE.size < 12) small++;
    assert.deepEqual(work.find((b) => b.title.startsWith('NOTE'))?.rows ?? [], rows, `note rows at ${at}`);
    if (Math.round(s.fig6k) === 5 && s.fig6 > 0.5 && s.fig3 > 0.5 && shot('race')) assert.ok(work.some((b) => b.title === 'Fig. 6'), `Fig. 6 rows at ${at}`);
  }
  assert.ok(small > 10, `${small} sentences draw the note under 12 px on ${W}x${H}`);
});

test('framing: beside Fig. 1 nothing overlaps: the tally block clears the Fig. 6 gauges, and no balloon sits on Fig. 5 or Fig. 6', () => {
  const of = (...ids) => OBJECTS.filter((o) => ids.some((id) => o.id.startsWith(id)));
  const pairs = [[of('tally block'), of('fig. 6 slot')], [of('balloon'), of('fig. 6 slot', 'Fig. 6.', 'tally block', 'fig. 5')]];
  const hit = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
  const bad = new Set();
  for (const { at, s } of samples()) for (const [A, B] of pairs) for (const a of A) for (const b of B) if (a.on(s) && b.on(s) && hit(a.r, b.r)) bad.add(`${at}: ${a.id} on ${b.id}`);
  assert.deepEqual([...bad], []);
});

test('chapter ends: once a chapter\'s recap is said its working marks are gone; the watch ends on the clean neuron with numbers only, no names', () => {
  const working = OBJECTS.filter((o) => /^(label|tag|balloon|note|fig\. [34]|tuner|dimension)/.test(o.id));
  const ends = chapterEnds(), last = ends.at(-1).numeral, few = [1, 2, 3, 4, 5, 7, 8, 9, 10, 12].map((n) => `balloon ${n}`).sort();
  for (const { numeral, s } of ends) {
    const on = [...working.filter((o) => o.on(s)).map((o) => o.id), ...['missOn', 'locks', 'clickOn', 'bracket'].filter((k) => s[k] > 0.01)].sort();
    assert.deepEqual(on, numeral === last ? few : [], `chapter ${numeral} ends with these working marks drawn`);
  }
});
