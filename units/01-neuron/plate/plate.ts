import * as THREE from 'three';
import { Ink, Z } from './ink';
import { Tube, Chamber, Pipe } from './parts/glass';
import { Dial, Valve, Gauge, valueToAngle } from './parts/meters';
import { Callout, Balloon, Dimension, DetailLink } from './parts/callout';
import { Casing, Sheet, FocusLamp, Veil, caption } from './parts/sheet';
import { NetworkFigure } from './parts/network';
import { ExplainNote, PartLight } from './parts/explain';
import { LiveText } from './parts/text';
import { ProductWindow } from './parts/window';
import { NoteBlock } from './parts/note';
import { MissArc } from './parts/missarc';
import { LockPins, ClickNote, ExampleBracket } from './parts/marks';
import { InputPanel } from './parts/inputs';
import { ValveGraph } from './parts/fig4';
import { TunerBlock } from './parts/tuner';
import { BenchLayer } from './bench';
import { BuildLayer, carried } from './build';
import { ROW, L, SHEET, WIN, NOTE, FIG4, TUNER, CLICK_R, DETAIL, INPUTS } from '../unit/layout';
import { LABELS, BALLOONS, BESIDE, TAGS, BRACKET, LOCKS, balloonShown } from '../unit/labels';
import { inventory, layoutOf } from '../unit/place';
import { TAG_AT, balloon } from '../unit/placed';
import { SPOTS } from '../unit/spots';
import { noteText } from '../unit/live';
import { derive } from '../sim/neuron';
import { buildOf, flow, SEAT } from '../sim/build';
import { RULES, TUNER as TUNING } from '../sim/rules';
import { tags } from '../sim/format';
import { clamp, type Explained, type Item, type LabelMode } from 'explainer-kit';
import { initialState, type A01State } from '../unit/state';

const NOTES = ['Numbers are drawn to one decimal; to two while a weight is off the clicks.', 'Balloons 1 to 19: click one for its note.'];
const SIGNED = { drawn: 'Claude', approved: 'Oscar Nadjar' };

/** Plate I for unit 01, composed from plate parts (Composite); `apply` pushes the state and the numbers `derive` makes from it into all of them. */
export class Plate {
  readonly root = new THREE.Group();
  readonly dials: [Dial, Dial];
  readonly lamp: FocusLamp;
  readonly veil: Veil;
  private tubes: [Tube, Tube];
  private chamber: Chamber;
  private valve: Valve;
  private gauge: Gauge;
  private net: NetworkFigure;
  private note: ExplainNote;
  private lit: PartLight;
  private s = initialState();
  private pipes: { inp: Pipe[]; out: Pipe[]; sum: Pipe; res: Pipe };
  private names: Callout[];
  private mode: LabelMode = 'named';
  private dims: { neuron: Dimension; network: Dimension };
  private balloons: Balloon[];
  private pose: ReturnType<typeof layoutOf> | null = null;
  private tags: Record<string, LiveText>;
  private windows: ProductWindow[];
  private working: NoteBlock;
  private missArc: MissArc;
  private locks: LockPins;
  private click: ClickNote;
  private bracket: ExampleBracket;
  private graph: ValveGraph;
  private tuner: TunerBlock;
  private detail: DetailLink;
  private bench: BenchLayer;
  private build: BuildLayer;
  private phase = 0;
  private inputs: InputPanel;
  private rowLines: THREE.Object3D[];

  constructor(ink: Ink) {
    const cl = [L.chamberX - 70, 0, L.gaugeX + 150, 0,
      L.dialX, ROW[0] - 150, L.dialX, ROW[0] + 150, L.dialX, ROW[1] - 150, L.dialX, ROW[1] + 150, L.gaugeX, -160, L.gaugeX, 190];
    this.root.add(new Sheet(ink, SHEET, NOTES, SIGNED).root, new Casing(ink, L.caseW, L.caseH, cl).root);
    const rowLines = (x0: number): THREE.Object3D => ink.segs(ROW.flatMap((y) => [x0, y, L.dialX + 150, y]), ink.line('inkSoft', 'hair', { dash: [30, 6] }), Z.shade + 0.1);
    this.rowLines = [rowLines(L.tubeX - 150), rowLines(L.dialX - 150)];
    this.inputs = new InputPanel(ink, INPUTS, ROW, L.dialX - L.dialR);
    this.root.add(...this.rowLines, this.inputs.root);
    this.tubes = ROW.map((y) => new Tube(ink, L.tubeX, y, L.tubeLen, L.tubeR, RULES.tube.max)) as [Tube, Tube];
    this.dials = ROW.map((y) => new Dial(ink, L.dialX, y, L.dialR, L.knobR)) as [Dial, Dial];
    this.chamber = new Chamber(ink, L.chamberX, 0, L.chamberHW, L.chamberH, RULES.chamber.max);
    this.valve = new Valve(ink, L.valveX, 0, L.valveR);
    this.gauge = new Gauge(ink, L.gaugeX, 0, L.gaugeR, RULES.gauge.max);
    const tx1 = L.tubeX + L.tubeLen / 2 + 16, cx0 = L.chamberX - L.chamberHW - 5;
    this.pipes = {
      inp: ROW.map((y) => new Pipe(ink, [tx1, y, L.dialX - L.dialR, y])),
      out: ROW.map((y) => new Pipe(ink, [L.dialX + L.dialR, y, cx0, y])),
      sum: new Pipe(ink, [L.chamberX + L.chamberHW + 5, 0, L.valveX - L.valveR, 0]),
      res: new Pipe(ink, [L.valveX + L.valveR, 0, L.gaugeX - L.gaugeR - 12, 0]),
    };
    for (const p of [...this.pipes.inp, ...this.pipes.out, this.pipes.sum, this.pipes.res]) this.root.add(p.root);
    for (const p of [...this.tubes, ...this.dials, this.chamber, this.valve, this.gauge]) this.root.add(p.root);
    this.windows = ROW.map((y) => new ProductWindow(ink, WIN.x, y, WIN.w, WIN.h));
    this.working = new NoteBlock(ink, NOTE);
    this.missArc = new MissArc(ink, L.gaugeX, 0, L.gaugeR + 26, (v) => this.gauge.angleOf(v));
    this.locks = new LockPins(ink, LOCKS.at, LOCKS.h);
    this.click = new ClickNote(ink, L.dialX, ROW[0], CLICK_R, valueToAngle(RULES.dial.step));
    this.bracket = new ExampleBracket(ink, BRACKET.paths, BRACKET.tags);
    this.graph = new ValveGraph(ink, FIG4);
    this.tuner = new TunerBlock(ink, TUNER, [TUNER.shaft, TUNER.y - TUNER.h / 2, ROW[0] + L.dialR * 0.72], TUNING.steps);
    this.tags = Object.fromEntries(Object.entries(TAGS).map(([k, t]) => [k, new LiveText(ink, 2 * t.hw, 32, TAG_AT[k as keyof typeof TAGS], { size: 22, role: t.role, box: true })]));
    this.names = LABELS.map((l) => new Callout(ink, l.legs, l.at, l.text, { align: l.align, role: l.role, size: l.size ?? 26 }));
    this.dims = {
      neuron: new Dimension(ink, -L.caseW / 2, L.caseW / 2, -440, -L.caseH / 2, 'NEURON', 34, false),
      network: new Dimension(ink, -695, 695, L.netY + 300, L.netY + 250, 'NEURAL NETWORK', 34, false),
    };
    this.balloons = BALLOONS.map((_, i) => { const b = balloon(i + 1); return new Balloon(ink, [...b.from, ...b.at], i + 1); });
    for (const c of [...this.windows, this.working, this.missArc, this.locks, this.click, this.bracket, this.graph, this.tuner, ...Object.values(this.tags),
      ...this.names, ...Object.values(this.dims), ...this.balloons]) this.root.add(c.root);
    this.net = new NetworkFigure(ink, L.netY);
    this.detail = new DetailLink(ink, DETAIL.x, DETAIL.y, DETAIL.r, DETAIL.leader, 'A', DETAIL);
    this.net.root.add(caption(ink, 'Fig. 2.', -695, L.netY - 275));
    this.root.add(this.detail.root, this.net.root, caption(ink, 'Fig. 1.', -L.caseW / 2, -500));
    this.bench = new BenchLayer(ink);
    this.build = new BuildLayer(ink, carried([this.dials[0].root, this.dials[1].root], this.chamber.root, this.valve.root));
    this.root.add(this.bench.root, this.build.root);
    this.lamp = new FocusLamp(ink);
    this.veil = new Veil(ink);
    this.note = new ExplainNote(ink);
    this.lit = new PartLight(ink, SPOTS);
    this.root.add(this.lamp.root, this.lit.root, this.note.root, this.veil.root);
  }

  /** Draw the callout of a part (dot, leader, note) or clear it. */
  explain(c: Explained | null): void { this.note.set(c); }
  /** Outline one part and its numbers, or none. */
  light(part: string | null): void { this.lit.set(part, this.s); }
  /** After framing: keep the note screen-constant and beside its dot. */
  frame(st: Parameters<ExplainNote['frame']>[0]): void { this.note.frame(st); }
  noteAt(px: number, py: number): 'hear' | 'close' | 'inside' | null { return this.note.hit(px, py); }
  /** Named: the term labels draw as the state says (the explanation); numbered: none, only the balloons name parts. */
  labels(mode: LabelMode): void { this.mode = mode; }
  /** Balloon n's centre while it is drawn, else null. */
  balloonAt(n: number): [number, number] | null { return this.balloons[n - 1]?.at() ?? null; }
  /** What is drawn now, as layout items in drawing units (the geometry tests read it). */
  layout(): Item[] { return inventory(this.s, this.mode === 'named'); }

  /** Push state into every part; `run` advances the flowing dashes. Covers hide what they cover; the assembly (e5) draws its build's flow. */
  apply(s: A01State, dt: number, run: boolean): void {
    this.s = s;
    const v = derive(s), tg = tags(v), f = s.flowOn, fig7 = s.fig7 > 0.5, side = s.fig6 > 0.5 || s.fig5 > 0.001;
    const bare = (k: keyof A01State): number => (s[k] > 0.5 ? 0 : 1);
    const b = fig7 ? flow(buildOf(s), [v.w1, v.w2], [s.x1, s.x2]) : null, va = Math.round(s.sVa);
    const p = b ? b.v : [v.p1, v.p2], sum = b ? b.sum : v.sum, out = (b ? b.out : v.out) * s.gaugeOn;
    const open = (b ? (va === SEAT.valve1 ? b.v[0] : va === SEAT.valve2 ? b.v[1] : b.out) > 0 : v.open) ? 1 : 0;
    this.phase += dt;
    const tune = s.tune > 0.5;
    this.rowLines[0].visible = !tune; this.rowLines[1].visible = tune;
    this.inputs.set(s.tune, [[s.ex1a, s.ex1b], [s.ex2a, s.ex2b], [s.ex3a, s.ex3b], [s.ex4a, s.ex4b]], Math.round(s.tSel), f, dt, run);
    this.tubes.forEach((t, i) => { t.root.visible = !tune; t.set(i ? s.x2 : s.x1); t.root.position.x = Math.sin(this.phase * 55) * 7 * (i ? s.rattle2 : s.rattle1); });
    this.dials[0].set(s.w1, s.hiDial1); this.dials[1].set(s.w2, s.hiDial2);
    this.pipes.inp[0].update(s.x1 * f, dt, 0.8, run); this.pipes.inp[1].update(s.x2 * f, dt, 0.8, run);
    for (const p of this.pipes.inp) p.root.visible = !tune;
    this.pipes.out[0].update(p[0] * f * bare('cvP1'), dt, 0.8, run); this.pipes.out[1].update(p[1] * f * bare('cvP2'), dt, 0.8, run);
    this.pipes.sum.update(sum * s.chamberOn * bare('cvSum'), dt, 0.7, run);
    this.pipes.res.update((b ? out : out * open) * bare('cvOut'), dt, 0.7, run);
    this.chamber.set(sum, s.chamberOn);
    this.valve.set(open * s.chamberOn);
    this.gauge.low = s.stubOn > 0.5 ? RULES.gauge.stub : 0;
    this.gauge.set(out);
    this.gauge.cover(s.cvOut > 0.5);
    this.gauge.setTarget(v.t, s.markOn, s.markGlow);
    this.windows[0].set(fig7 ? 0 : s.win1, tg.p1, s.tP1); this.windows[1].set(fig7 ? 0 : s.win2, tg.p2, s.tP2);
    const mode = Math.round(s.noteMode);
    this.working.set(side ? 0 : s.noteOn, noteText(s, v), s.noteRows, mode);
    this.missArc.set(s.missOn * bare('cvMiss'), out, v.t);
    this.locks.set(tune ? 0 : s.locks, [s.pin1, s.pin2]);
    this.click.set(s.clickOn);
    this.bracket.set(s.bracket);
    this.graph.set(side ? 0 : s.graph, v.sum, v.out);
    this.tuner.set(s.tunerOn, s.tStep);
    const cover: Record<string, number> = { sum: s.cvSum, out: s.cvOut, miss: s.cvMiss };
    for (const [k, t] of Object.entries(TAGS)) this.tags[k].set(tg[k], (cover[k] ?? 0) > 0.5 || (fig7 && !['x1', 'x2', 't'].includes(k)) || (tune && (k === 'x1' || k === 'x2')) ? 0 : s[t.show]);
    const named = this.mode === 'named' ? 1 : 0;
    LABELS.forEach((l, i) => this.names[i].set(fig7 || (l.tune !== undefined && l.tune !== tune) ? 0 : named * s[l.show]));
    this.dims.neuron.set(fig7 ? 0 : named * s.lblNeuron); this.dims.network.set(named * s.lblNetwork);
    const pose = layoutOf(s, named === 1);
    if (pose !== this.pose) {
      this.pose = pose;
      for (const it of pose.placed) {
        if (it.kind === 'marker') this.balloons[Number(it.id) - 1].move([it.leader!.x0, it.leader!.y0, ...it.at!]);
        if (it.kind === 'value' && it.id === 't') this.tags.t.move(...it.at!);
      }
    }
    this.balloons.forEach((bl, i) => bl.set(fig7 || (side && BESIDE.includes(i + 1)) || pose.hidden.has(String(i + 1)) ? 0 : balloonShown(s, i)));
    this.net.apply(s.net, s.tuneWall, dt, run);
    this.detail.set(clamp((s.net - 0.12) / 0.43));
    this.bench.apply(s, v, dt);
    this.build.set(fig7 ? s : null);
  }
}
