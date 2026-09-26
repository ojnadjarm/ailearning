/** The machine: one part per ring on a common axis (local units, axis y = 0, body from -w/2 to w/2). */
import { f, path, line, rect, circ, poly, text, centre, hatched, pipe, wall, boltSide, rivets, couplings, ticks, gear, arrow } from './draft.mjs';

/** Glass tube along x with end flanges; liquid fills to `fill` (0..1) in class `liq`. */
function tubeX(x, y, w, h, fill, liq = 'bl') {
  return rect(x, y - h / 2, w, h, 'm gl') + rect(x + 2, y - h / 2 + 3, (w - 4) * fill, h - 6, liq)
    + hatched(x - 5, y - h / 2 - 4, 5, h + 8, 't')
    + hatched(x + w, y - h / 2 - 4, 5, h + 8, 't')
    + line(x + 3, y - h / 2 + 2.5, x + w - 3, y - h / 2 + 2.5, 'h dt');
}

/** Scale under a tube: minor and major ticks along x. */
function scaleX(x, y, w, n, every) {
  let s = line(x, y, x + w, y, 'h');
  for (let i = 0; i <= n; i++) s += line(x + (w * i) / n, y, x + (w * i) / n, y + (i % every ? 4 : 8), 'h dt');
  return s;
}

/** A butterfly valve symbol on a pipe run. */
const valve = (x, y, s = 7) => poly([[x - s, y - s], [x + s, y + s], [x + s, y - s], [x - s, y + s]], 't gl') + circ(x, y, 1.6, 'ik dt');

/** Stipple dots, deterministic. */
function stipple(x, y, w, h, n, seed) {
  let s = '', r = seed;
  const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < n; i++) s += circ(x + rnd() * w, y + rnd() * h, 1.3, 'ik dt');
  return s;
}

/** Output the target mark sits at, as a fraction of the gauge sweep (the Play strip races to it). */
export const TARGET = 0.62;

export const BED = {
  key: 'bed', w: 64, up: 48, down: 100,
  draw() {
    return wall(-32, -42, 64, 112, 8, 'hx', 5) + rect(-24, -34, 48, 96, 'sh') + circ(0, 0, 19, 'm gl') + circ(0, 0, 11, 't')
      + rect(-11, -5, 22, 10, 'core') + centre(0, 0, 26) + hatched(-46, 70, 92, 14, 'm')
      + boltSide(-37, 66) + boltSide(37, 66) + line(-62, 84, 62, 84, 'm')
      + Array.from({ length: 13 }, (_, i) => line(-58 + i * 10, 84, -66 + i * 10, 96, 'h')).join('');
  },
};

export const PARTS = [
  {
    ring: 1, key: 'neuron', w: 300, up: 128, down: 98, head: 104, over: 116,
    dot: [-144, -127], hot: { knob: [-18, -58], gauge: [106, 26], column: [58, -20] },
    draw() {
      let s = wall(-150, -128, 300, 226, 13, 'hx', 10, 2.4) + rect(-134, -112, 268, 194, 'sh');
      s += rivets(-136, -121, 136, -121, 34) + rivets(-136, 91, 136, 91, 34);
      s += tubeX(-126, -58, 60, 20, 0.66) + scaleX(-124, -40, 56, 12, 4);
      s += pipe('M-61 -58H-58', true) + pipe('M22 -58H48', true);
      s += circ(-18, -58, 42, 'm gl') + ticks(-18, -58, 42, 135, 405, 12, 2, null, 6) + circ(-18, -58, 33, 'h');
      let kn = circ(0, 0, 31, 'nb');
      for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2; kn += line(Math.cos(a) * 26, Math.sin(a) * 26, Math.cos(a) * 30, Math.sin(a) * 30, 'h dt'); }
      kn += circ(0, 0, 25, 't rd') + line(0, 0, 0, -20, 'pw') + circ(0, 0, 3, 'ik');
      s += `<g transform="translate(-18 -58)"><g class="knob">${kn}</g></g>`;
      s += circ(-18, 18, 13, 'm gl') + line(-26, 13, -10, 23, 't') + centre(-18, 18, 18) + text(-18, 48, 'b', 'np');
      s += pipe('M-18 5V-16', false);
      s += rect(44, -104, 5, 170, 'hx') + rect(50, -100, 26, 162, 'm gl') + rect(53, -97, 20, 156, 'bl lvl')
        + hatched(44, -108, 38, 8, 't') + hatched(44, 62, 38, 8, 't');
      for (let i = 0; i <= 12; i++) s += line(78, -94 + i * 13, i % 3 ? 83 : 88, -94 + i * 13, 'h dt');
      s += line(38, -16, 90, -16, 'c');
      s += pipe('M82 40H90', true) + circ(108, 26, 26, 'm gl') + circ(108, 26, 21.5, 'h') + ticks(108, 26, 21.5, 150, 390, 10, 2, null, 4);
      s += `<g transform="translate(108 26) rotate(${150 + 240 * TARGET + 90})">${poly([[0, -26], [-5, -35], [5, -35]], 'yl t')}</g>`;
      s += `<g transform="translate(108 26)"><g class="needle">${circ(0, 0, 19, 'nb')}${line(0, 0, 18, 0, 'nd')}${circ(0, 0, 3.4, 'bl')}</g></g>`;
      s += rect(-126, 50, 92, 22, 'h gl') + circ(-121, 61, 1.8, 'h') + circ(-39, 61, 1.8, 'h') + text(-80, 66, 'PLATE I', 'np');
      return s + couplings(300, 18);
    },
  },
  {
    ring: 2, key: 'gearbox', w: 180, up: 164, down: 88,
    dot: [0, -164],
    draw() {
      const ringD = 'M-86 0A86 86 0 1 0 86 0A86 86 0 1 0 -86 0ZM-74 0A74 74 0 1 1 74 0A74 74 0 1 1 -74 0Z';
      let s = `<path class="hx" fill-rule="evenodd" d="${ringD}"/>` + circ(0, 0, 86, 'b') + circ(0, 0, 74, 't') + circ(0, 0, 73, 'sh');
      for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + 0.3; s += circ(Math.cos(a) * 80, Math.sin(a) * 80, 3.2, 'h gl'); }
      s += circ(0, 0, 80, 'c');
      s += gear(-20, 12, 42, 16) + gear(25.2, -25.9, 24, 9, 0.34);
      s += path('M50 -58A40 40 0 0 1 58 -18', 'h dt') + arrow(58, -18, 1.8, 9, 3.2);
      s += rect(-8, -112, 16, 28, 'm gl') + hatched(-16, -88, 32, 6, 't');
      s += circ(0, -136, 27, 'm gl') + circ(0, -136, 22, 'h') + ticks(0, -136, 22, 160, 380, 8, 2, null, 4) + line(0, -136, -14, -148, 't') + circ(0, -136, 2.6, 'ik');
      s += text(0, -118, 'LOSS', 'np');
      return s + couplings(180, 16);
    },
  },
  {
    ring: 3, key: 'type', w: 140, up: 152, down: 82,
    dot: [-54, -152],
    draw() {
      let s = wall(-70, -60, 140, 142, 10, 'hx', 6, 2) + rect(-58, -48, 116, 118, 'sh');
      s += path('M-76 -152H76L34 -60H-34Z', 'm gl') + path('M-66 -146H66L30 -66H-30Z', 't') + path('M-76 -152H76L34 -60H-34ZM-66 -146L-30 -66H30L66 -146Z', 'hx');
      const sl = [[-50, 16], [-32, 12], [-18, 20], [4, 10], [16, 22], [40, 14]];
      sl.forEach(([x, w], i) => { const y = -140 + (i % 2) * 18; s += rect(x, y, w, 16, 't gl') + rect(x, y, w, 4, 'hx'); });
      [[-34, 14], [-18, 18], [2, 12], [16, 16]].forEach(([x, w]) => { s += rect(x, -104, w, 16, 't gl') + rect(x, -104, w, 4, 'hx'); });
      [[-54, 14], [-38, 20], [-16, 12], [-2, 18]].forEach(([x, w]) => { s += rect(x, -12, w, 24, 't gl') + rect(x + w - 4, -12, 4, 24, 'hx'); });
      s += line(-58, 14, 58, 14, 't') + line(-58, -14, 58, -14, 't');
      s += rect(22, -48, 18, 30, 'm gl') + rect(22, -48, 18, 6, 'hx') + path('M31 -58L25 -55L37 -52L25 -49', 'h dt');
      s += circ(34, 44, 22, 'm gl') + ticks(34, 44, 22, 0, 360, 20, 2, null, 4) + centre(34, 44, 28) + circ(34, 44, 6, 't gl');
      s += arrow(-4, 0, 0, 10, 3.4);
      return s + couplings(140, 16);
    },
  },
  {
    ring: 4, key: 'tower', w: 170, up: 262, down: 84,
    dot: [-40, -254],
    draw() {
      let s = '';
      const top = -240;
      s += rect(-78, top, 8, 280, 'hx') + rect(70, top, 8, 280, 'hx') + rect(-70, top, 140, 280, 'sh');
      s += line(-78, top, -78, 40, 'b') + line(78, top, 78, 40, 'b') + line(-70, top, -70, 40, 't') + line(70, top, 70, 40, 't');
      s += path(`M-86 ${top}L-70 ${top - 18}H70L86 ${top}Z`, 'm gl') + path(`M-86 ${top}L-70 ${top - 18}H70L86 ${top}Z`, 'hs');
      s += hatched(-92, 40, 184, 16, 'm') + rect(-100, 56, 200, 26, 'm gl') + rect(-100, 56, 200, 26, 'hs');
      for (let k = 0; k < 5; k++) {
        const y0 = 40 - 56 * (k + 1);
        if (k) s += hatched(-70, y0 + 56 - 4, 140, 7, 'h');
        const gx = -62, gy = y0 + 10, c = 8.5;
        s += rect(gx, gy, 4 * c, 4 * c, 't gl');
        for (let i = 1; i < 4; i++) s += line(gx + i * c, gy, gx + i * c, gy + 4 * c, 'h') + line(gx, gy + i * c, gx + 4 * c, gy + i * c, 'h');
        for (let r = 0; r < 4; r++) for (let q = r + 1; q < 4; q++) s += rect(gx + q * c + 0.5, gy + r * c + 0.5, c - 1, c - 1, 'hx');
        s += line(-28, gy + 17, -13, gy + 17, 'h') + arrow(-28, gy + 17, Math.PI, 7, 2.6);
        s += line(13, gy + 20, 64, gy + 20, 't') + valve(28, gy + 20, 5.5) + valve(44, gy + 20, 5.5) + valve(58, gy + 20, 4.5);
        s += line(13, gy + 30, 64, gy + 30, 'h dt');
      }
      s += rect(-11, top, 22, 280, 'm gl') + rect(-5, top + 4, 10, 272, 'core') + line(0, top - 30, 0, 70, 'c');
      for (let k = 0; k < 5; k++) s += arrow(0, 40 - 56 * k - 40, -Math.PI / 2, 8, 3);
      return s + couplings(170, 16);
    },
  },
  {
    ring: 5, key: 'graph', w: 160, up: 88, down: 104,
    dot: [-40, -88],
    draw() {
      let s = wall(-76, -88, 152, 170, 9, 'hs', 10, 1.8) + rect(-67, -79, 134, 152, 'sh');
      const N = [[0, 0, 15], [-42, -46, 10], [44, -42, 10], [-46, 44, 10], [42, 50, 10], [4, -62, 7]];
      const E = [[0, 1], [0, 2], [0, 3], [0, 4], [1, 2], [3, 4], [2, 4], [1, 5], [5, 2]];
      for (const [a, b] of E) s += pipe(`M${N[a][0]} ${N[a][1]}L${N[b][0]} ${N[b][1]}`);
      N.forEach(([x, y, r], i) => { s += circ(x, y, r, i ? 'm gl' : 'b gl') + circ(x, y, r * 0.45, i ? 'h' : 'hx') + (i ? '' : circ(x, y, r * 0.45, 't')) + centre(x, y, r + 6); });
      s += rect(-60, 82, 26, 22, 'm gl') + rect(34, 82, 26, 22, 'm gl') + rect(-60, 82, 26, 22, 'hx') + rect(34, 82, 26, 22, 'hx');
      return s + couplings(160, 16);
    },
  },
  {
    ring: 6, key: 'drum', w: 160, up: 104, down: 78,
    dot: [-20, -104],
    draw() {
      let s = rect(-80, -10, 24, 20, 'm gl') + rect(56, -10, 24, 20, 'm gl');
      s += rect(-48, -64, 96, 128, 'm gl');
      for (let x = -40; x <= 40; x += 10) s += line(x, -64, x, 64, 'h dt');
      s += hatched(-58, -74, 10, 148, 'm') + hatched(48, -74, 10, 148, 'm');
      s += rect(-24, -14, 48, 28, 'm gl');
      for (let i = 0; i < 4; i++) s += rect(-21 + i * 11.5, -10, 9, 20, 'h');
      s += text(-16.5, 5, '4', 'num') + text(-5, 5, '0', 'num') + text(6.5, 5, '9', 'num') + text(18, 5, '1', 'num');
      s += circ(-66, -84, 10, 'm gl') + circ(66, -84, 10, 'm gl') + centre(-66, -84, 15) + centre(66, -84, 15);
      s += path('M-84 -100L-72 -93A10 10 0 0 1 -66 -94H66A10 10 0 0 1 72 -93L84 -100', 't') + path('M-84 -104L-72 -97H72L84 -104', 'h');
      for (let x = -56; x <= 56; x += 14) s += circ(x, -97.5, 1.4, 'h dt');
      s += arrow(-44, -94, 0, 9, 3) + line(-56, 74, -56, 78, 'h') + rect(-64, 74, 128, 4, 'hx');
      return s + couplings(160, 16);
    },
  },
  {
    ring: 7, key: 'frames', w: 150, up: 90, down: 74,
    dot: [0, -82],
    draw() {
      const F = (dx, dy) => [-62 + dx, -58 + dy, 104, 122];
      let s = '';
      [[20, -20], [10, -10]].forEach(([dx, dy], k) => {
        const [x, y, w, h] = F(dx, dy);
        s += rect(x, y, w, h, 'm gl') + rect(x, y, w, h, 'hs') + rect(x + 8, y + 8, w - 16, h - 16, 't gl') + stipple(x + 8, y + 8, w - 16, h - 16, k ? 34 : 70, 7 + k);
      });
      const [x, y, w, h] = F(0, 0);
      s += rect(x, y, w, h, 'b gl') + rect(x, y, w, h, 'hs') + rect(x + 8, y + 8, w - 16, h - 16, 't gl');
      for (let i = 1; i < 6; i++) s += line(x + 8, y + 8 + i * 17.6, x + w - 8, y + 8 + i * 17.6, 'h dt');
      s += path(`M${x + 14} ${y + h - 18}C${x + 44} ${y + h - 22} ${x + 60} ${y + 34} ${x + w - 14} ${y + 20}`, 'm') + stipple(x + 10, y + 10, w - 20, h - 20, 9, 3);
      [[10, -10], [20, -20]].forEach(([dx, dy]) => { const [a, b, c, d] = F(dx, dy); s += path(`M${x + w} ${b + d}H${a + c}V${b}M${a} ${b}V${y}`, 'hd'); });
      s += hatched(-40, 64, 80, 10, 't');
      return s + couplings(150, 14);
    },
  },
  {
    ring: 8, key: 'governor', w: 150, up: 226, down: 58,
    dot: [4, -226],
    draw() {
      let s = rect(-75, -10, 23, 20, 'm gl') + rect(52, -10, 23, 20, 'm gl');
      s += wall(-52, -36, 104, 94, 9, 'hx', 6, 1.8) + rect(-43, -27, 86, 76, 'sh');
      s += gear(-6, 6, 22, 10, 0.3) + rect(-4, -36, 8, 18, 'm gl');
      s += rect(-4, -214, 8, 180, 'm gl') + circ(0, -218, 6, 'm gl') + centre(0, -218, 10);
      s += rect(-11, -110, 22, 22, 'm gl') + rect(-11, -110, 22, 5, 'hx') + rect(-11, -93, 22, 5, 'hx');
      for (const sgn of [-1, 1]) {
        s += line(0, -200, sgn * 56, -140, 'm') + line(sgn * 11, -100, sgn * 50, -138, 't');
        s += circ(sgn * 60, -136, 17, 'm gl') + path(`M${sgn * 60 - 10} ${-142}A11 11 0 0 1 ${sgn * 60 - 2} ${-148}`, 'h dt') + centre(sgn * 60, -136, 22);
        s += circ(sgn * 11, -100, 2.4, 'ik') + circ(sgn * 50, -138, 2.2, 'ik');
      }
      s += circ(0, -200, 3, 'ik') + path('M-78 -136A78 78 0 0 1 -60 -178', 'h dt') + path('M78 -136A78 78 0 0 0 60 -178', 'h dt');
      s += line(11, -99, 60, -70, 't') + poly([[54, -76], [66, -76], [60, -66]], 't gl') + line(60, -70, 60, -44, 't') + valve(60, -44, 6);
      return s + couplings(150, 16);
    },
  },
  {
    ring: 9, key: 'loop', w: 150, up: 104, down: 104,
    dot: [-12, -104],
    draw() {
      let s = wall(-75, -58, 104, 116, 9, 'hx', 6, 1.8) + rect(-66, -49, 86, 98, 'sh');
      s += path('M29 -52C78 -52 86 52 29 52', 'b') + path('M29 -43C66 -43 72 43 29 43', 't') + path('M29 -52C78 -52 86 52 29 52L29 43C72 43 66 -43 29 -43Z', 'hx');
      s += circ(-24, 0, 32, 'h') + circ(-24, 0, 8, 'm gl') + centre(-24, 0, 38);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; s += path(`M${f(-24 + Math.cos(a) * 8)} ${f(Math.sin(a) * 8)}Q${f(-24 + Math.cos(a + 0.5) * 22)} ${f(Math.sin(a + 0.5) * 22)} ${f(-24 + Math.cos(a + 0.9) * 30)} ${f(Math.sin(a + 0.9) * 30)}`, 't'); }
      s += pipe('M-48 -58V-92H70V92H-48V58', true) + arrow(30, -92, 0, 10, 3.4) + arrow(70, 20, Math.PI / 2, 10, 3.4) + arrow(0, 92, Math.PI, 10, 3.4);
      s += rect(-58, -64, 20, 6, 'hx') + rect(-58, 58, 20, 6, 'hx');
      return s + couplings(150, 16, true);
    },
  },
];
