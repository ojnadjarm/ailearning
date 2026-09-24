/** The 12-part phantom library (parts list figures) and the three detail views of Plate I (Watch, Drive, Play). */
import { f, path, line, rect, circ, poly, centre, ticks, arrow } from './draft.mjs';
import { TARGET } from './parts.mjs';

const S = {
  gauge: () => circ(36, 24, 16, 'm') + path('M24 32A15 15 0 1 1 48 32', 'h') + line(36, 24, 45, 15, 'm') + circ(36, 24, 1.8, 'ik'),
  sheet: () => path('M8 34L22 8H64L50 34Z', 'm') + line(15, 21, 57, 21, 'c') + line(36, 8, 36, 34, 'c'),
  contour: () => path('M8 22C8 8 64 8 64 22S8 36 8 22Z', 'm') + path('M20 22C20 13 52 13 52 22S20 31 20 22Z', 'h') + path('M31 22C31 18 41 18 41 22S31 26 31 22Z', 'h') + line(12, 36, 56, 10, 't') + arrow(56, 10, -0.53, 7, 2.6),
  gears: () => circ(26, 24, 14, 'm') + circ(51, 28, 9, 'm') + circ(26, 24, 3, 'h') + circ(51, 28, 2.4, 'h') + line(6, 40, 66, 40, 'h'),
  arrows: () => line(8, 38, 64, 38, 'h') + line(8, 38, 8, 6, 'h') + line(8, 38, 50, 14, 'm') + arrow(50, 14, -0.52, 7, 2.6) + line(8, 38, 58, 30, 'm') + arrow(58, 30, -0.16, 7, 2.6),
  type: () => [[8, 10], [20, 14], [36, 8], [46, 18]].map(([x, w]) => rect(x, 10, w, 26, 'm')).join(''),
  tower: () => rect(24, 6, 26, 34, 'm') + line(24, 14.5, 50, 14.5, 'h') + line(24, 23, 50, 23, 'h') + line(24, 31.5, 50, 31.5, 'h') + rect(34, 6, 6, 34, 'h'),
  grid: () => rect(18, 4, 36, 36, 'm') + line(27, 4, 27, 40, 'h') + line(36, 4, 36, 40, 'h') + line(45, 4, 45, 40, 'h') + line(18, 13, 54, 13, 'h') + line(18, 22, 54, 22, 'h') + line(18, 31, 54, 31, 'h') + path('M27 4H54V31Z', 'hx'),
  graph: () => [[36, 22], [14, 10], [58, 12], [16, 36], [56, 36]].map(([x, y], i) => (i ? line(36, 22, x, y, 'h') : '') + circ(x, y, i ? 4 : 6, i ? 'm paper' : 'b paper')).join(''),
  drum: () => rect(22, 10, 28, 28, 'm') + line(22, 24, 50, 24, 'c') + path('M6 8H66', 't') + circ(14, 12, 4, 'h') + circ(58, 12, 4, 'h'),
  course: () => path('M8 38C22 34 20 14 36 14S54 26 64 8', 'm') + circ(36, 14, 4, 't') + line(36, 10, 36, 4, 'h'),
  frame: () => rect(12, 6, 48, 34, 'm') + rect(17, 11, 38, 24, 'h') + path('M20 32C30 31 36 18 52 14', 'm'),
};
export const SILS = Object.keys(S);

/** One hidden <symbol> per silhouette, 72 × 44 units. */
export const silhouetteDefs = () => SILS.map((k) => `<symbol id="s-${k}" viewBox="0 0 72 44">${S[k]()}</symbol>`).join('');

/** Detail A · Watch: the input tube with its callout typing on, and the spoken line under it. */
export function detailA() {
  let s = rect(34, 108, 150, 44, 'm gl') + rect(38, 114, 96, 32, 'bl') + rect(24, 100, 10, 60, 'hx') + rect(24, 100, 10, 60, 't') + rect(184, 100, 10, 60, 'hx') + rect(184, 100, 10, 60, 't');
  s += line(40, 118, 178, 118, 'h') + path('M194 130H232', 'po') + path('M194 130H232', 'pi') + path('M194 130H232', 'flow');
  for (let i = 0; i <= 12; i++) s += line(38 + i * 11.5, 158, 38 + i * 11.5, i % 4 ? 163 : 168, 'h');
  s += circ(62, 100, 3.2, 'ik') + `<path class="ld run-ld" pathLength="1" d="M62 100L90 62H118"/>` + `<text class="lb bl run-lb" x="122" y="70">INPUT</text>`;
  s += `<text class="cc" x="130" y="206" text-anchor="middle">…the input fills its tube,</text>`;
  return s;
}

/** Detail B · Drive: the weight knob, its detents and the turning arrows. */
export function detailB() {
  const c = 130;
  let s = circ(c, c, 84, 'm gl') + ticks(c, c, 84, 135, 405, 12, 2, ['−3', '−2', '−1', '0', '+1', '+2', '+3'], 9);
  s += circ(c, c, 58, 'h');
  for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2; s += line(c + Math.cos(a) * 50, c + Math.sin(a) * 50, c + Math.cos(a) * 57, c + Math.sin(a) * 57, 'h'); }
  s += `<g class="knob-b">${circ(c, c, 48, 't rd')}${line(c, c, c + 26, c - 30, 'pw')}${circ(c, c, 5, 'ik')}</g>` + centre(c, c, 104);
  s += path(`M${c - 104} ${c + 40}A112 112 0 0 1 ${c - 70} ${c - 88}`, 't') + arrow(c - 70, c - 88, -0.9, 12, 4) + arrow(c - 104, c + 40, 1.9, 12, 4);
  return s;
}

/** Detail C · Play: the output gauge; the learner's needle and the tuner's race to the target once. */
export function detailC() {
  const c = 130, a = 150 + 240 * TARGET;
  let s = circ(c, c, 92, 'm gl') + circ(c, c, 80, 'h') + ticks(c, c, 80, 150, 390, 20, 4, ['0', '.2', '.4', '.6', '.8', '1'], 8);
  s += `<g transform="translate(${c} ${c}) rotate(${f(a + 90)})">${poly([[0, -92], [-8, -106], [8, -106]], 'yl t')}</g>`;
  s += `<g transform="translate(${c} ${c})"><g class="rn rn-t">${circ(0, 0, 70, 'nb')}${line(0, 0, 66, 0, 'tn')}</g><g class="rn rn-y">${circ(0, 0, 70, 'nb')}${line(0, 0, 66, 0, 'nd')}</g></g>`;
  s += circ(c, c, 7, 'bl') + circ(c, c, 2.4, 'paper');
  return s;
}
