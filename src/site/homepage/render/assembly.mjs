/** Fig. 1: the course as one machine exploded along its centre line, in three layouts, plus the hidden part and silhouette defs. */
import { f, line, text, balloon, leader } from '../draw/draft.mjs';
import { BED, PARTS, TARGET } from '../draw/parts.mjs';
import { silhouetteDefs } from '../draw/figures.mjs';
import { assemble } from '../assembly.js';
import { wrap } from './html.mjs';

function callout(pts, label, x, y, anchor, cls, extra = '') {
  return `<g class="co ${extra}">${leader(pts)}${text(x, y, label, `lb ${cls}`, anchor)}</g>`;
}

/** Plate I's callouts and the weight dial's hit area, relative to its centre. */
function plateOne(cx) {
  const X = (x) => cx + x;
  const a = ((150 + 240 * TARGET) * Math.PI) / 180, tx = 108 + 36 * Math.cos(a), ty = 26 + 36 * Math.sin(a);
  let s = '';
  s += callout([[X(-128.5), -72], [X(-128.5), -164], [X(-112), -164]], 'INPUT', X(-108), -157, 'start', 'bl');
  s += callout([[X(-18), -100], [X(-18), -196], [X(-34), -196]], 'WEIGHT', X(-38), -189, 'end', 'rd', 'wco');
  s += callout([[X(tx), ty], [X(tx), -164], [X(tx + 16), -164]], 'TARGET', X(tx + 20), -157, 'start', 'yk');
  s += callout([[X(95), 3.5], [X(95), -200], [X(111), -200]], 'OUTPUT', X(115), -193, 'start', 'bl');
  s += `<circle class="hit" cx="${f(X(-18))}" cy="-58" r="46" tabindex="0" role="slider" aria-label="Weight dial of Plate I" aria-valuemin="-3" aria-valuemax="3" aria-valuenow="-1" aria-valuetext="weight −1"/>`;
  return s;
}

function slotSvg(sl, row, units, ringName) {
  const p = PARTS[sl.ring - 1], [dx, dy] = p.dot, bx = sl.cx + dx;
  const plates = units.filter((u) => u.ring === sl.ring).map((u) => u.plate);
  const range = plates.length > 1 ? `PLATES ${plates[0]}–${plates[plates.length - 1]}` : `PLATE ${plates[0]}`;
  const names = wrap(ringName.toUpperCase(), Math.floor((p.w + 30) / 13.5));
  let s = `<g class="slot ${sl.ring === 1 ? 'ink' : 'ph'}" data-ring="${sl.ring}">`;
  s += `<use href="#p-${p.key}" x="${f(sl.cx)}"/>`;
  s += `<g class="co bal">${leader([[sl.cx + dx, dy], [bx, row.balloonY + 17]])}</g>` + balloon(bx, row.balloonY, sl.ring, 19);
  names.forEach((n, i) => { s += text(sl.cx, row.capY + i * 27, n, 'cap'); });
  s += text(sl.cx, row.capY + names.length * 27 - 2, range, 'capm');
  if (sl.ring === 1) s += plateOne(sl.cx);
  return s + '</g>';
}

function matchLine(x, row, letter) {
  return `<g class="mtl">${line(x, row.top + 34, x, row.dimY + 20, 'mt')}<text class="capm" transform="translate(${f(x + (letter === row.matchOut ? -24 : 10))} ${f(row.top + 44)}) rotate(90)">MATCH LINE ${letter}</text></g>`;
}

/** One layout of the machine; `data-geo` carries what the runtime needs to seat parts and redraw the dimensions. */
export function assemblySvg(name, L, units, rings) {
  const { dims } = assemble(L, units, {});
  const geo = { gap: L.gap, rows: L.rows.map((r) => ({ x0: r.x0, down0: r.down0, dimY: r.dimY, slots: r.slots.map(({ ring, r: rr, down }) => ({ ring, r: rr, down })) })) };
  let s = `<svg class="asm asm-${name}" viewBox="0 0 ${L.vbW} ${L.vbH}" aria-labelledby="fig1-cap" data-geo='${JSON.stringify(geo)}'>`;
  L.rows.forEach((row, ri) => {
    s += `<g transform="translate(0 ${f(row.ty)})">`;
    s += line(row.bedX ? row.bedX - 60 : row.x0 - 4, 0, row.end + (row.matchOut ? 16 : 34), 0, 'c');
    if (row.bedX) s += `<use href="#p-bed" x="${f(row.bedX)}"/>` + text(row.bedX, row.capY, 'BED', 'cap') + text(row.bedX, row.capY + 23, 'FIXED', 'capm');
    if (row.matchIn) s += matchLine(row.x0 - 4, row, row.matchIn);
    if (row.matchOut) s += matchLine(row.end + 16, row, row.matchOut);
    for (const sl of row.slots) s += slotSvg(sl, row, units, rings[sl.ring - 1].name);
    s += `<g class="dims" data-row="${ri}">${dims[ri]}</g></g>`;
  });
  return s + '</svg>';
}

/** Hidden defs: hatch patterns, the detail clip, one group per part and one symbol per phantom silhouette. */
export function defs() {
  return `<svg class="defs" aria-hidden="true" width="0" height="0"><defs>
<pattern id="hd" width="5.2" height="5.2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V5.2" stroke="#8f887a" stroke-width="1.1"/></pattern>
<pattern id="hs" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V10" stroke="#8f887a" stroke-width="1.1"/></pattern>
<clipPath id="dclip"><circle cx="130" cy="130" r="123"/></clipPath><g id="p-bed">${BED.draw()}</g>${PARTS.map((p) => `<g id="p-${p.key}">${p.draw()}</g>`).join('')}${silhouetteDefs()}</defs></svg>`;
}
