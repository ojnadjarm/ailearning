/** Drafting primitives: each returns an SVG string in local drawing units (y down, axis at y = 0). */
export const f = (n) => Math.round(n * 10) / 10;
const pts = (a) => a.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');

export const path = (d, c) => `<path class="${c}" d="${d}"/>`;
export const line = (x1, y1, x2, y2, c = 'h') => `<path class="${c}" d="M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}"/>`;
export const rect = (x, y, w, h, c, rx = 0) => `<rect class="${c}" x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}"${rx ? ` rx="${rx}"` : ''}/>`;
export const circ = (cx, cy, r, c) => `<circle class="${c}" cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}"/>`;
export const poly = (a, c) => `<polygon class="${c}" points="${pts(a)}"/>`;
export const pline = (a, c) => `<polyline class="${c}" points="${pts(a)}"/>`;
export const text = (x, y, s, c, anchor = 'middle') => `<text class="${c}" x="${f(x)}" y="${f(y)}" text-anchor="${anchor}">${s}</text>`;
export const g = (inner, attrs = '') => `<g${attrs ? ' ' + attrs : ''}>${inner}</g>`;

/** Centre mark: a dash-dot cross through a round part's centre. */
export const centre = (cx, cy, s) => line(cx - s, cy, cx + s, cy, 'c') + line(cx, cy - s, cx, cy + s, 'c');

/** Closed wobbling rectangle path: the torn edge of a broken-out section. */
export function wobbleRect(x, y, w, h, amp = 2.6, seed = 1) {
  const c = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  let d = '', k = 0;
  for (let e = 0; e < 4; e++) {
    const [ax, ay] = c[e], [bx, by] = c[(e + 1) % 4], L = Math.hypot(bx - ax, by - ay), n = Math.max(4, Math.round(L / 12));
    const nx = -(by - ay) / L, ny = (bx - ax) / L;
    for (let i = 0; i < n; i++, k++) {
      const t = i / n, wv = i === 0 ? 0 : Math.sin(k * 2.1 + seed) * amp * (0.55 + 0.45 * Math.sin(k * 0.9 + seed * 2));
      d += `${d ? 'L' : 'M'}${f(ax + (bx - ax) * t + nx * wv)} ${f(ay + (by - ay) * t + ny * wv)}`;
    }
  }
  return d + 'Z';
}

/** Hatched band between an outer and inner rectangle (a cut wall); `pat` is hx (dense) or hs (open shell). */
export function wall(x, y, w, h, t, pat = 'hx', rx = 6, wob = 0) {
  const o = `M${f(x + rx)} ${f(y)}H${f(x + w - rx)}Q${f(x + w)} ${f(y)} ${f(x + w)} ${f(y + rx)}V${f(y + h - rx)}Q${f(x + w)} ${f(y + h)} ${f(x + w - rx)} ${f(y + h)}H${f(x + rx)}Q${f(x)} ${f(y + h)} ${f(x)} ${f(y + h - rx)}V${f(y + rx)}Q${f(x)} ${f(y)} ${f(x + rx)} ${f(y)}Z`;
  const i = wob ? wobbleRect(x + t, y + t, w - 2 * t, h - 2 * t, wob, x + y) : `M${f(x + t)} ${f(y + t)}V${f(y + h - t)}H${f(x + w - t)}V${f(y + t)}Z`;
  return `<path class="${pat}" fill-rule="evenodd" d="${o}${i}"/>` + `<path class="b" d="${o}"/>` + `<path class="t" d="${i}"/>`;
}

/** Wobbling break line from (x1,y1) to (x2,y2): where the cover was torn away. */
export function breakLine(x1, y1, x2, y2, amp = 3.2, seed = 1) {
  const n = Math.max(6, Math.round(Math.hypot(x2 - x1, y2 - y1) / 11));
  const nx = -(y2 - y1), ny = x2 - x1, L = Math.hypot(nx, ny) || 1;
  let d = `M${f(x1)} ${f(y1)}`;
  for (let i = 1; i <= n; i++) {
    const t = i / n, w = i === n ? 0 : Math.sin(i * 2.3 + seed) * amp * (0.6 + 0.4 * Math.sin(i * 0.7 + seed * 3));
    d += `L${f(x1 + (x2 - x1) * t + (nx / L) * w)} ${f(y1 + (y2 - y1) * t + (ny / L) * w)}`;
  }
  return path(d, 't');
}

/** Hex bolt head seen side-on, with its thread shank hidden line. */
export const boltSide = (x, y, horiz = false) => horiz
  ? rect(x - 4, y - 7, 8, 14, 'h gl') + line(x - 4, y - 2.5, x + 4, y - 2.5, 'h') + line(x - 4, y + 2.5, x + 4, y + 2.5, 'h')
  : rect(x - 7, y - 4, 14, 8, 'h gl') + line(x - 2.5, y - 4, x - 2.5, y + 4, 'h') + line(x + 2.5, y - 4, x + 2.5, y + 4, 'h');

/** Rivet heads along a straight run. */
export function rivets(x1, y1, x2, y2, step = 34, r = 2.4) {
  const n = Math.max(1, Math.floor(Math.hypot(x2 - x1, y2 - y1) / step));
  let s = '';
  for (let i = 0; i <= n; i++) s += circ(x1 + ((x2 - x1) * i) / n, y1 + ((y2 - y1) * i) / n, r, 'h gl dt');
  return s;
}

/** Axial coupling: hatched spigot on the left face, bolted flange on the right face, both on the axis. */
export function couplings(w, r = 16, end = false) {
  const L = -w / 2, R = w / 2;
  const left = rect(L - 18, -r, 18, r * 2, 'hx') + rect(L - 18, -r, 18, r * 2, 'm') + line(L - 18, -r + 4, L, -r + 4, 'h dt') + line(L - 18, r - 4, L, r - 4, 'h dt')
    + rect(L - 18, -5, 18, 10, 'core');
  return end ? left : left + rect(R, -r - 12, 12, (r + 12) * 2, 'hx') + rect(R, -r - 12, 12, (r + 12) * 2, 'm')
    + boltSide(R + 6, -r - 5, true) + boltSide(R + 6, r + 5, true) + rect(R, -5, 12, 10, 'core');
}

/** Graduated arc: minor ticks, majors every `every`, numerals in mono. */
export function ticks(cx, cy, r, a0, a1, n, every, labels, len = 7) {
  let s = '';
  for (let i = 0; i <= n; i++) {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180, maj = i % every === 0, l = maj ? len * 1.6 : len;
    const c = Math.cos(a), sn = Math.sin(a);
    s += line(cx + c * r, cy + sn * r, cx + c * (r - l), cy + sn * (r - l), maj ? 't' : 'h');
    if (maj && labels) s += text(cx + c * (r - l - 11), cy + sn * (r - l - 11) + 5, labels[i / every], 'num');
  }
  return s;
}

/** Spur gear outline with trapezoid teeth, hub, keyway and pitch circle. */
export function gear(cx, cy, r, teeth, hub = 0.28) {
  let d = '';
  const rr = r - 7, rt = r;
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2, s = (Math.PI * 2) / teeth;
    const p = [[a, rr], [a + s * 0.18, rt], [a + s * 0.45, rt], [a + s * 0.63, rr]];
    for (const [ang, rad] of p) d += `${d ? 'L' : 'M'}${f(cx + Math.cos(ang) * rad)} ${f(cy + Math.sin(ang) * rad)}`;
    d += `A${rr} ${rr} 0 0 1 ${f(cx + Math.cos(a + s) * rr)} ${f(cy + Math.sin(a + s) * rr)}`;
  }
  const h = r * hub;
  return path(d + 'Z', 'm gl') + circ(cx, cy, r - 3.5, 'c') + circ(cx, cy, h, 'hx') + circ(cx, cy, h, 't') + circ(cx, cy, h * 0.45, 't gl')
    + rect(cx - 2.5, cy - h * 0.45 - 4, 5, 5, 'h') + circ(cx, cy, r * 0.62, 'h dt') + centre(cx, cy, r + 8);
}

/** Item balloon: circle with the item number. */
export const balloon = (x, y, n, r = 17) => circ(x, y, r, 't paper') + text(x, y + 6.5, n, 'bn');

/** Leader: from a dot on a static part to a shoulder, drawn on as one path. */
export function leader(pts2, cls = 'ld') {
  const [x0, y0] = pts2[0];
  return circ(x0, y0, 3.2, 'ik') + `<path class="${cls}" pathLength="1" d="M${pts2.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}"/>`;
}

/** Filled arrowhead at (x,y) pointing along angle a (radians). */
export function arrow(x, y, a, L = 13, W = 4.2) {
  const c = Math.cos(a), s = Math.sin(a);
  return poly([[x, y], [x - c * L - s * W, y - s * L + c * W], [x - c * L + s * W, y - s * L - c * W]], 'ik');
}
