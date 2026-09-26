import { INSET, SHEET } from './layout';

export interface Box { x: number; y: number; w: number; h: number }
/** A frame: screen px per drawing unit, the camera centre, and the view [x0, y0, x1, y1] in drawing units. */
interface Frame { s: number; cx: number; cy: number; view: [number, number, number, number] }

/** Screen px the chrome covers above and below; `whole` keeps the box whole between them, even if paper then shows past the sheet's sides. */
export interface Inset { top: number; bottom: number; whole?: boolean }

/**
 * Where the camera looks to show box b on a W × H stage: b fitted between the page chrome, zoomed in or slid sideways so the view never runs
 * past the sheet's side edges. A box zoomed past its fit keeps its foot above the caption band and gives up paper at its head instead.
 * With `whole` the box is never zoomed past its fit, and a view wider than the sheet is centred on it.
 */
export function frameIn(b: Box, W: number, H: number, inset: Inset = INSET): Frame {
  const free = H - inset.top - inset.bottom, sw = SHEET[2] - SHEET[0], fit = Math.min(W / b.w, free / b.h);
  const s = inset.whole ? fit : Math.max(fit, W / sw);
  const hw = W / (2 * s), hh = H / (2 * s);
  const mid = Math.min(inset.top + free / 2, H - inset.bottom - (b.h * s) / 2);
  const cx = 2 * hw >= sw ? (SHEET[0] + SHEET[2]) / 2 : Math.min(SHEET[2] - hw, Math.max(SHEET[0] + hw, b.x)), cy = b.y + (mid - H / 2) / s;
  return { s, cx, cy, view: [cx - hw, cy - hh, cx + hw, cy + hh] };
}
