import * as THREE from 'three';
import { Ink, Z } from './ink';
import { circle, rect } from '../../../src/kit/cutaway/geom';
import { LiveText } from './parts/text';
import { BUILD, L, ROW } from '../unit/layout';
import type { A01State } from '../unit/state';

const HOMES = ['d1', 'd2', 'ch', 'va'] as const;

/** A part of Fig. 1 the assembly carries: its drawing, where it is drawn by default, its size in the tray and its name tag. */
interface Carried { root: THREE.Object3D; at: [number, number]; scale: number; r: number; name: string; key: 'sD1' | 'sD2' | 'sCh' | 'sVa' }

/** The assembly (e5) over Fig. 1: dashed seats, the parts tray, and each carried part drawn at its seat or small in the tray, its name travelling with it. */
export class BuildLayer {
  readonly root = new THREE.Group();
  private names: LiveText[];
  constructor(ink: Ink, private parts: Carried[]) {
    const seats: number[] = [], [x0, y0, x1, y1] = BUILD.tray, rs = [L.dialR, L.valveR, L.dialR, L.valveR, 0, L.valveR];
    BUILD.seats.forEach(([x, y], i) => {
      if (i === 4) seats.push(...rect(x - L.chamberHW - 10, y - L.chamberH / 2 - 10, x + L.chamberHW + 10, y + L.chamberH / 2 + 10));
      else seats.push(...circle(x, y, rs[i] + 8, 48));
    });
    this.root.add(ink.segs(seats, ink.line('inkSoft', 'thin', { dash: [8, 6] }), Z.fill + 0.1));
    this.root.add(ink.shape([x0, y0, x1, y0, x1, y1, x0, y1], ink.fill('paperShade'), Z.fill), ink.segs(rect(x0, y0, x1, y1), ink.line('ink', 'thin'), Z.line));
    const title = new LiveText(ink, 200, 26, [x0, y1 + 16], { size: 17, role: 'inkSoft', weight: 600, align: 0, spacing: 0.1 });
    title.set('PARTS TRAY');
    this.root.add(title.root);
    this.names = parts.map((p) => { const t = new LiveText(ink, 170, 24, [0, 0], { size: 16, role: 'ink', weight: 600, spacing: 0.06 }); t.set(p.name); return t; });
    for (const t of this.names) this.root.add(t.root);
    this.set(null);
  }

  /** Seat each part as the state says (−1: the tray), or put every part back where Fig. 1 draws it (`s` null). */
  set(s: A01State | null): void {
    this.root.visible = !!s;
    this.parts.forEach((p, i) => {
      if (!s) { p.root.position.set(0, 0, 0); p.root.scale.setScalar(1); return; }
      const seat = Math.round(s[p.key]), [X, Y] = seat < 0 ? BUILD.home[HOMES[i]] : BUILD.seats[seat], k = seat < 0 ? p.scale : 1;
      p.root.scale.setScalar(k);
      p.root.position.set(X - k * p.at[0], Y - k * p.at[1], 0);
      this.names[i].move(X, seat >= 0 && Y > 0 ? Y + p.r + 26 : Y - k * p.r - (seat < 0 ? 18 : 26));
    });
  }
}

/** The four parts of Fig. 1 the assembly carries. */
export const carried = (dials: [THREE.Object3D, THREE.Object3D], chamber: THREE.Object3D, valve: THREE.Object3D): Carried[] => [
  { root: dials[0], at: [L.dialX, ROW[0]], scale: BUILD.scale.dial, r: L.dialR, name: 'DIAL · INPUT 1', key: 'sD1' },
  { root: dials[1], at: [L.dialX, ROW[1]], scale: BUILD.scale.dial, r: L.dialR, name: 'DIAL · INPUT 2', key: 'sD2' },
  { root: chamber, at: [L.chamberX, 0], scale: BUILD.scale.chamber, r: L.chamberH / 2, name: 'CHAMBER', key: 'sCh' },
  { root: valve, at: [L.valveX, 0], scale: 1, r: L.valveR, name: 'VALVE', key: 'sVa' },
];
