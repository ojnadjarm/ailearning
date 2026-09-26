/** Rows of parts along the centre line per breakpoint → positions in drawing units (pure). */
import { BED, PARTS } from './parts.mjs';

const GAP = 44;
export const ROWS = {
  wide: [[1, 2, 3, 4, 5, 6, 7, 8, 9]],
  mid: [[1, 2, 3, 4], [5, 6, 7, 8, 9]],
  narrow: [[1], [2, 3], [4, 5], [6, 7], [8, 9]],
};
const M = 36, BED_HALF = 66, MATCH = 26;

export function layout(rows) {
  const out = [];
  let y = 0, vbW = 0;
  rows.forEach((rings, ri) => {
    const parts = rings.map((r) => PARTS[r - 1]);
    const first = ri === 0, last = ri === rows.length - 1;
    const maxUp = Math.max(first ? BED.up : 0, ...parts.map((p) => p.up + (p.head || 0)));
    const maxDown = Math.max(first ? BED.down : 60, ...parts.map((p) => p.down));
    const balloonY = -(maxUp + 44), top = balloonY - 26, dimY = maxDown + 40, capY = dimY + 52, bottom = capY + 74;
    let x = first ? M + BED_HALF + BED.w / 2 : M + MATCH, ext = x;
    const bedX = M + BED_HALF, x0 = x, down0 = first ? 70 : 0;
    const slots = parts.map((p) => {
      const l = x + GAP, cx = l + 18 + p.w / 2, r = cx + p.w / 2 + (p.ring === 9 ? 0 : 12);
      x = r; ext = r + (p.over || 0);
      return { ring: p.ring, key: p.key, cx, l, r, up: p.up, down: p.down, dot: p.dot };
    });
    const width = ext + (last ? M : MATCH + M);
    vbW = Math.max(vbW, width);
    out.push({ ty: y - top, top, bottom, balloonY, dimY, capY, x0, down0, bedX: first ? bedX : null,
      matchIn: first ? null : String.fromCharCode(64 + ri), matchOut: last ? null : String.fromCharCode(65 + ri), end: ext, width, slots });
    y += bottom - top + 18;
  });
  for (const r of out) {
    const ox = (vbW - r.width) / 2;
    r.ox = ox;
    for (const s of r.slots) { s.cx += ox; s.l += ox; s.r += ox; }
    r.x0 += ox; r.end += ox; if (r.bedX) r.bedX += ox;
  }
  return { vbW: Math.ceil(vbW), vbH: Math.ceil(y - 18), rows: out, gap: GAP };
}
