import * as THREE from 'three';
import { Ink, Z } from '../ink';
import { arcPts, polyline, rect } from '../../../../src/kit/cutaway/geom';
import { LiveText } from './text';
import type { Part } from '../../../../src/kit/cutaway/parts/part';

/** An arrowhead at (x, y) pointing along `a` (radians, from +x), `len` long. */
const head = (x: number, y: number, a: number, len: number, half: number): number[] =>
  [x, y, x - Math.cos(a) * len - Math.sin(a) * half, y - Math.sin(a) * len + Math.cos(a) * half, x - Math.cos(a) * len + Math.sin(a) * half, y - Math.sin(a) * len - Math.cos(a) * half];

/** Where pencil 1 rides: the rail's x (the flag's point), its ends, and the flag's body. */
interface FlagSpec { railX: number; y0: number; y1: number; x0: number; x1: number; hh: number; cue: number }

/**
 * Pencil 1: the learner's guess of the sum, a graphite flag on a drawn rail beside the chamber scale. The number is lettered inside the
 * flag, so it never leaves its mark; the rail shows the whole way it can travel; a cue (▲ ▼ over and under the flag) says "slide me"
 * until the first drag.
 */
export class PencilFlag implements Part {
  readonly root = new THREE.Group();
  private flag = new THREE.Group();
  private cue = new THREE.Group();
  private label: LiveText;
  constructor(ink: Ink, f: FlagSpec) {
    const z = Z.cue, rail = [f.railX, f.y0, f.railX, f.y1, f.railX - 7, f.y0, f.railX + 7, f.y0, f.railX - 7, f.y1, f.railX + 7, f.y1];
    this.root.add(ink.segs(rail, ink.line('pencil', 'hair'), Z.line + 0.2));
    const body = [f.x0, -f.hh, f.x1, -f.hh, f.railX, 0, f.x1, f.hh, f.x0, f.hh];
    this.flag.add(ink.shape([f.x0 - 4, -f.hh - 4, f.x1 + 2, -f.hh - 4, f.railX + 5, 0, f.x1 + 2, f.hh + 4, f.x0 - 4, f.hh + 4], ink.fill('paper'), z));
    this.flag.add(ink.shape(body, ink.fill('pencil'), z + 0.1));
    this.label = new LiveText(ink, f.x1 - f.x0, 2 * f.hh, [(f.x0 + f.x1) / 2, 0], { size: 18, role: 'paper', weight: 600 });
    this.label.root.position.z = z + 0.2 - Z.text;
    this.flag.add(this.label.root);
    const cx = (f.x0 + f.x1) / 2, c = f.cue;
    this.cue.add(ink.shape([cx - 9, c - 8, cx + 9, c - 8, cx, c + 6], ink.fill('pencil'), z + 0.1), ink.shape([cx - 9, 8 - c, cx + 9, 8 - c, cx, -c - 6], ink.fill('pencil'), z + 0.1));
    this.flag.add(this.cue);
    this.root.add(this.flag);
    this.set(0, 0, '', 0);
  }
  /** `on` shows it with its flag at height `y` reading `text`; `cue` draws the slide cue. */
  set(on: number, y: number, text: string, cue: number): void {
    this.root.visible = on > 0.5;
    if (!this.root.visible) return;
    this.flag.position.y = y;
    this.label.set(text);
    this.cue.visible = cue > 0.5;
  }
}

/** Pencil 2's geometry: gauge centre and face radius, the grip's radius on the needle and its size, the needle's tip, the window and the drag cue's radius and half sweep. */
interface NeedleSpec { cx: number; cy: number; grip: number; gripR: number; tip: number; win: [number, number]; winHW: number; winHH: number; cueR: number; cueA: number }

/**
 * Pencil 2: the learner's own needle on the gauge face, a graphite pointer on the gauge's hub with a knurled grip, drawn over the machine's
 * needle and its cover. Its number reads in a fixed pencil window low on the face (the needle passes under the window, never over it).
 * A curved double arrow over the rim says "turn me" until the first drag.
 */
export class DragNeedle implements Part {
  readonly root = new THREE.Group();
  private arm = new THREE.Group();
  private cue: THREE.Group;
  private label: LiveText;
  constructor(ink: Ink, n: NeedleSpec) {
    const z = Z.cue;
    this.arm.position.set(n.cx, n.cy, 0);
    this.arm.add(ink.shape([-8, -24, 8, -24, 3.4, n.tip + 3, -3.4, n.tip + 3], ink.fill('paper'), z));
    this.arm.add(ink.shape([-5.5, -20, 5.5, -20, 1.4, n.tip, -1.4, n.tip], ink.fill('pencil'), z + 0.1));
    const knurl: number[] = [];
    for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2; knurl.push(Math.cos(a) * (n.gripR + 1), n.grip + Math.sin(a) * (n.gripR + 1), Math.cos(a) * (n.gripR + 4), n.grip + Math.sin(a) * (n.gripR + 4)); }
    this.arm.add(ink.disc(0, n.grip, n.gripR + 5, ink.fill('paper'), z + 0.12, 40));
    this.arm.add(ink.segs(knurl, ink.line('pencil', 'thin'), z + 0.13));
    this.arm.add(ink.disc(0, n.grip, n.gripR, ink.fill('pencil'), z + 0.14, 40), ink.disc(0, n.grip, n.gripR - 6, ink.fill('paper'), z + 0.15, 32), ink.disc(0, n.grip, 2.6, ink.fill('pencil'), z + 0.16, 16));
    this.arm.add(ink.disc(0, 0, 10, ink.fill('pencil'), z + 0.12, 32), ink.disc(0, 0, 3.2, ink.fill('paper'), z + 0.13, 16));
    const [wx, wy] = n.win, [x0, y0, x1, y1] = [wx - n.winHW, wy - n.winHH, wx + n.winHW, wy + n.winHH];
    this.root.add(this.arm);
    this.root.add(ink.shape([x0, y0, x1, y0, x1, y1, x0, y1], ink.fill('paper'), z + 0.3));
    this.root.add(ink.segs([...rect(x0, y0, x1, y1), ...rect(x0 + 3, y0 + 3, x1 - 3, y1 - 3)], ink.line('pencil', 'thin'), z + 0.31));
    this.label = new LiveText(ink, 2 * n.winHW - 8, 2 * n.winHH - 4, n.win, { size: 20, role: 'pencil', weight: 600 });
    this.label.root.position.z = z + 0.32 - Z.text;
    this.root.add(this.label.root);
    this.cue = new THREE.Group();
    const a0 = Math.PI / 2 - n.cueA, a1 = Math.PI / 2 + n.cueA, pts = arcPts(n.cx, n.cy, n.cueR, a0, a1, 40);
    this.cue.add(ink.segs(polyline(pts), ink.line('pencil', 'med'), z + 0.1));
    this.cue.add(ink.shape(head(pts[0], pts[1], a0 - Math.PI / 2, 16, 7), ink.fill('pencil'), z + 0.1));
    this.cue.add(ink.shape(head(pts[pts.length - 2], pts[pts.length - 1], a1 + Math.PI / 2, 16, 7), ink.fill('pencil'), z + 0.1));
    this.root.add(this.cue);
    this.set(0, 0, '', 0);
  }
  /** `on` shows it turned to `angle` (CCW from up) reading `text`; `cue` draws the drag cue. */
  set(on: number, angle: number, text: string, cue: number): void {
    this.root.visible = on > 0.5;
    if (!this.root.visible) return;
    this.arm.rotation.z = angle;
    this.label.set(text);
    this.cue.visible = cue > 0.5;
  }
}

/** Where pencil 2's name tag sits: the box centre, the dot on the needle and the leader's end on the box. */
export interface GuessPose { at: [number, number]; from: [number, number]; to: [number, number] }

/** Pencil 2's name tag: "YOUR GUESS" lettered in pencil on paper in a thin double frame, and a hairline leader from a dot on the graphite needle. */
export class GuessTag implements Part {
  readonly root = new THREE.Group();
  private box = new THREE.Group();
  private leader: ReturnType<Ink['segs']>;
  private dot: THREE.Mesh;
  private key = '';
  constructor(private ink: Ink, hw: number, hh: number) {
    const z = Z.cue + 0.4;
    this.box.add(ink.shape([-hw, -hh, hw, -hh, hw, hh, -hw, hh], ink.fill('paper'), z));
    this.box.add(ink.segs([...rect(-hw, -hh, hw, hh), ...rect(-hw + 3, -hh + 3, hw - 3, hh - 3)], ink.line('pencil', 'thin'), z + 0.01));
    const word = new LiveText(ink, 2 * hw - 10, 2 * hh - 4, [0, 0], { size: 18, role: 'pencil', weight: 600, spacing: 0.12 });
    word.set('YOUR GUESS');
    word.root.position.z = z + 0.02 - Z.text;
    this.box.add(word.root);
    this.leader = ink.segs([0, 0, 0, 0], ink.line('pencil', 'hair'), z - 0.05);
    this.dot = ink.disc(0, 0, 3.4, ink.fill('pencil'), z - 0.04, 16);
    this.root.add(this.leader, this.dot, this.box);
    this.root.visible = false;
  }
  /** Show the tag at `g`, or hide it (null). */
  set(g: GuessPose | null): void {
    this.root.visible = !!g;
    if (!g) return;
    const key = [...g.at, ...g.from, ...g.to].join(',');
    if (key === this.key) return;
    this.key = key;
    this.box.position.set(g.at[0], g.at[1], 0);
    this.dot.position.set(g.from[0], g.from[1], 0);
    this.ink.setSegs(this.leader, [...g.from, ...g.to]);
  }
}
