import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const UNIT = JSON.parse(readFileSync(new URL('../../units/01-neuron/unit.json', import.meta.url), 'utf8'));
/** Each clip whose narration names chapters by number, and the chapter ids it means, in the order it says them. */
const NAMED = { d2ok: ['c7'] };

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen',
  'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
const ROMAN = { I: 1, V: 5, X: 10, L: 50 };
const NUM = String.raw`(?:\d+|[IVXL]+\b|${WORDS.map((w) => `[${w[0].toUpperCase()}${w[0]}]${w.slice(1)}\\b`).join('|')})`;
const MENTION = new RegExp(String.raw`\b[Cc]hapters?\s+${NUM}(?:\s*(?:,|to|and|or|–)\s*${NUM})*`, 'g');

/** A spoken or written chapter number as an integer (words, roman numerals or digits). */
function value(n) {
  if (/^\d+$/.test(n)) return Number(n);
  if (WORDS.includes(n.toLowerCase())) return WORDS.indexOf(n.toLowerCase());
  return [...n].reduce((sum, c, i, a) => sum + (ROMAN[c] < (ROMAN[a[i + 1]] ?? 0) ? -ROMAN[c] : ROMAN[c]), 0);
}

/** Every chapter number the narration says, by clip, in order. */
function mentions(unit) {
  const out = {};
  for (const clip of unit.clips) for (const s of clip.sentences) {
    const text = typeof s === 'string' ? s : s.text;
    for (const m of text.matchAll(MENTION)) (out[clip.id] ??= []).push(...m[0].replace(/^chapters?\s+/i, '').split(/\s*(?:,|to|and|or|–)\s*/i).map(value));
  }
  return out;
}

/** Chapter numbers the narration says that no longer match the chapter they are declared to mean, or that are not declared. */
function mismatches(unit, named) {
  const numeral = Object.fromEntries(unit.chapters.map((c) => [c.id, value(c.numeral)]));
  const said = mentions(unit), faults = [];
  for (const id of new Set([...Object.keys(said), ...Object.keys(named)])) {
    const got = said[id] ?? [], want = named[id] ?? [];
    if (got.length !== want.length) { faults.push(`${id}: says chapters ${got.join(', ') || 'none'}, declared ${want.join(', ') || 'none'}`); continue; }
    got.forEach((n, i) => { if (numeral[want[i]] !== n) faults.push(`${id}: says chapter ${n}, but ${want[i]} is chapter ${numeral[want[i]] ?? 'gone'}`); });
  }
  return faults;
}

test('every chapter number the narration says is still the chapter it means', () => assert.deepEqual(mismatches(UNIT, NAMED), []));

test('inserting a chapter before a named one makes the lint fail', () => {
  const unit = structuredClone(UNIT), at = unit.chapters.findIndex((c) => c.id === 'c5');
  unit.chapters.splice(at, 0, { id: 'new', numeral: 'V', title: 'x', clips: [] });
  unit.chapters.slice(at + 1).forEach((c, i) => { c.numeral = ['VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'][i]; });
  assert.deepEqual(mismatches(unit, NAMED), ['d2ok: says chapter 7, but c7 is chapter 8']);
});

test('numbers read as words, roman numerals and digits, including lists', () => {
  const unit = { chapters: [], clips: [{ id: 'a', sentences: ['In Chapter Seven, then chapters XI to XIII, and chapter 4.'] }] };
  assert.deepEqual(mentions(unit), { a: [7, 11, 13, 4] });
});
