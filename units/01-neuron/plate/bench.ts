import * as THREE from 'three';
import { Ink } from './ink';
import { Cover, GoalRing, Plaque, ArcArrow, DialLetters } from './parts/bench';
import { PencilFlag, DragNeedle, GuessTag } from './parts/pencils';
import { Fig6 } from './parts/fig6';
import { LampBar } from './parts/lamps';
import { RaceBlock } from './parts/race';
import { BendGraph } from './parts/fig5';
import { LiveText } from './parts/text';
import { valueToAngle } from './parts/meters';
import { fig6Slots, raceView } from './views';
import { Ripple } from './ripple';
import type { SlotView } from './parts/fig6';
import type { RaceView } from './parts/race';
import { ROW, L, WIN, BENCH, FIG6, FIG5, FIG5_LINE, LAMPS, levelY, rimAngle } from '../unit/layout';
import { RULES } from '../sim/rules';
import { relu, type Derived } from '../sim/neuron';
import { LEVELS, winners } from '../sim/race';
import { fix, sfix } from '../sim/format';
import { fig6On, raceOn, type A01State } from '../unit/state';
import { PLAQUE } from '../unit/labels';
import { GUESS, guessTag } from '../unit/place';
import { PLAQUE_BOX } from '../unit/placed';
import { arrowRoute } from '../unit/arrow';
import { pen1Y } from '../unit/bench-shapes';


const on = (v: number): number => (v > 0.5 ? 1 : 0);
/** The ripple's gap while the watch explains tuning: slow enough to see the examples taken one at a time. */
const TOLD_GAP = 0.3;
const winBox = (y: number): [number, number, number, number] => [WIN.x - WIN.w / 2 - 6, y - WIN.h / 2 - 6, WIN.x + WIN.w / 2 + 6, y + WIN.h / 2 + 6];

/** Everything the Workbench, the tuning levels and the Click draw over Fig. 1: covers, pencils, ringed goals, the plaque, the arc arrow, lettered ticks, Fig. 6, the tally and Fig. 5. */
export class BenchLayer {
  readonly root = new THREE.Group();
  private covers: [keyof A01State, Cover][];
  private flag: PencilFlag;
  private needle: DragNeedle;
  private guess: GuessTag;
  private goal: GoalRing;
  private plaque: Plaque;
  private arrow: ArcArrow;
  private letters: DialLetters;
  private fig6: Fig6;
  private lamps: LampBar;
  private race: RaceBlock;
  private fig5: BendGraph;
  private tag: LiveText;
  private ripple = new Ripple<SlotView | null>();
  private tally: RaceView | null = null;
  private still = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  constructor(ink: Ink) {
    const ch: [number, number, number, number] = [L.chamberX - L.chamberHW - 4, -L.chamberH / 2, L.chamberX + L.chamberHW + 1, L.chamberH / 2];
    const valve: [number, number, number, number] = [L.valveX - L.valveR - 4, -L.valveR - 4, L.valveX + L.valveR + 4, L.valveR + 4];
    const miss: [number, number, number, number] = [L.gaugeX - 44, -80, L.gaugeX + 44, -44];
    this.covers = [['cvP1', new Cover(ink, winBox(ROW[0]))], ['cvP2', new Cover(ink, winBox(ROW[1]))], ['cvSum', new Cover(ink, ch)], ['cvSum', new Cover(ink, valve)], ['cvMiss', new Cover(ink, miss)]];
    const p1 = BENCH.pen1, p2 = BENCH.pen2;
    this.flag = new PencilFlag(ink, { railX: p1.tipX, y0: levelY(-1e9), y1: levelY(1e9), x0: p1.flagX0, x1: p1.flagX1, hh: p1.hh, cue: p1.cue });
    this.needle = new DragNeedle(ink, { cx: L.gaugeX, cy: 0, grip: p2.grip, gripR: p2.gripR, tip: p2.tip, win: p2.win, winHW: p2.winHW, winHH: p2.winHH, cueR: p2.cueR, cueA: p2.cueA });
    this.guess = new GuessTag(ink, GUESS.hw, GUESS.hh);
    this.goal = new GoalRing(ink);
    this.plaque = new Plaque(ink, PLAQUE_BOX);
    const dials: [number, number][] = ROW.map((y) => [L.dialX, y]);
    this.arrow = new ArcArrow(ink, dials, valueToAngle);
    const ws = winners(LEVELS[1].ex);
    this.letters = new DialLetters(ink, dials, [ws.map((w) => w[0]), ws.map((w) => w[1])], L.dialR, valueToAngle);
    this.fig6 = new Fig6(ink, FIG6);
    this.lamps = new LampBar(ink, LAMPS, ROW[1] - Math.sqrt(L.dialR ** 2 - (LAMPS.shaft - L.dialX) ** 2));
    this.race = new RaceBlock(ink, FIG6.race);
    const [a, b] = FIG5_LINE.w;
    this.fig5 = new BendGraph(ink, FIG5, (x) => relu(a * x + b * FIG5_LINE.x2), FIG5_LINE.ghosts);
    this.tag = new LiveText(ink, 160, 32, BENCH.plateTag, { size: 22, role: 'ink', weight: 600, spacing: 0.12 });
    for (const p of [...this.covers.map(([, c]) => c), this.flag, this.needle, this.guess, this.goal, this.plaque, this.arrow, this.letters, this.fig6, this.lamps, this.race, this.fig5, this.tag]) this.root.add(p.root);
  }

  apply(s: A01State, v: Derived, dt = 0): void {
    for (const [k, c] of this.covers) c.set(s[k]);
    this.flag.set(s.pen1On, pen1Y(s), fix(s.pen1, 1), s.pen1Cue);
    this.needle.set(s.pen2On, rimAngle(s.pen2), fix(s.pen2, 1), s.pen2Cue);
    this.guess.set(guessTag(s));
    const kind = Math.round(s.goalKind), g = BENCH.goal;
    const [gx, gy] = kind === 0 ? g.product : kind === 1 ? [g.sumX, levelY(s.goalV)] : g.miss;
    this.goal.set(s.goalOn, gx, gy, `${['product', 'sum', 'miss'][kind]} ${kind === 2 ? sfix(s.goalV) : fix(s.goalV)}`, kind === 2);
    this.plaque.set(s.plqOn, PLAQUE[Math.round(s.plq)] ?? '', 0.5 * on(s.plqOn));
    const k = Math.round(s.arrDial), w = Math.round((k ? s.w2 : s.w1) / RULES.dial.step) * RULES.dial.step, r = arrowRoute(s);
    this.arrow.set(r ? 1 : 0, k, w, Math.round(s.arrN), RULES.dial.step, r?.words, r?.R, r?.gaps);
    this.letters.set(s.pairs);
    const shown = fig6On(s), slots = shown ? fig6Slots(s, v) : [], race = shown ? raceView(s, v) : null, told = Math.round(s.fig6k) === 5;
    if (s.tune > 0.5) {
      const st = RULES.dial.step, key = `${Math.round(s.w1 / st)}|${Math.round(s.w2 / st)}|${v.bench.map((e) => e.x.join(',') + e.t).join('|')}`;
      const r = this.ripple.run(key, slots, Math.round(s.tSel), dt, this.still || (told && v.two), told ? TOLD_GAP : undefined);
      if (r.settled || !this.tally) this.tally = race;
      this.fig6.set(+shown, r.slots.map((sl, i) => sl && { ...sl, lit: slots[i]?.lit }));
      this.lamps.set(1, r.slots.slice(0, 4).map((sl) => !!sl?.hit));
      this.race.set(+raceOn(s), race && this.tally ? { ...this.tally, steps: race.steps, sel: race.sel } : race);
      return this.rest(s);
    }
    this.fig6.set(+shown, slots);
    this.lamps.set(0, []);
    this.race.set(+raceOn(s), race);
    this.rest(s);
  }
  private rest(s: A01State): void {
    this.fig5.set(s.fig5, s.fig5m);
    this.tag.set(s.plate > 0.5 ? `PLATE ${Math.round(s.plate) === 1 ? 'A' : 'B'}` : '');
  }
}
