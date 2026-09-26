import { boot, probe, loadBundle, layoutClips, keyHint, partMarkers, Shell, type UnitSpec } from 'explainer-kit';
import { CutawayView, cutawayEasing } from 'explainer-kit/cutaway';
import { THEME } from './plate/theme';
import { Ink } from './plate/ink';
import { Stage } from './plate/stage';
import { Plate } from './plate/plate';
import { afterWatch } from './unit/watch';
import { LANDING, SHOTS } from './unit/layout';
import { BALLOON_R } from './unit/placed';
import { makeUnit, hotspots, beats, controls, SECTIONS, FINISHED } from './unit/unit';
import type { A01State } from './unit/state';
import specUrl from './unit.json?url';

/** Composition root: the Cutaway plate (style) and unit 01 (content) handed to the explainer engine. */
const BASE = import.meta.env.BASE_URL;
const FONTS: [string, string, string, string][] = [
  ['Plex Cond', '400', 'normal', 'ibm-plex-sans-condensed-latin-400-normal'], ['Plex Cond', '500', 'normal', 'ibm-plex-sans-condensed-latin-500-normal'],
  ['Plex Cond', '600', 'normal', 'ibm-plex-sans-condensed-latin-600-normal'], ['Plex Mono', '500', 'normal', 'ibm-plex-mono-latin-500-normal'],
  ['Caslon', '400', 'normal', 'libre-caslon-text-latin-400-normal'], ['Caslon', '400', 'italic', 'libre-caslon-text-latin-400-italic'],
];
const fonts = (): Promise<void[]> => Promise.all(FONTS.map(async ([f, w, st, u]) => {
  const ff = new FontFace(f, `url(${BASE}fonts/${u}.woff2)`, { weight: w, style: st }); await ff.load(); document.fonts.add(ff);
}));
Object.assign(probe, { backend: 'webgl2', accentDrawn: '' });

const [, spec] = await Promise.all([fonts(), fetch(specUrl).then((r) => r.json() as Promise<UnitSpec>)]);
const bundle = await loadBundle(`${BASE}bundles/01-neuron/`, spec);
const ink = new Ink(THEME);
const stage = new Stage(document.getElementById('stage')!, ink);
stage.setShots(Object.values(SHOTS).map((b) => ({ x: b.camX, y: b.camY, w: b.camW, h: b.camH })));
let t0 = performance.now();
stage.resize();
probe.resizeMs = Math.round(performance.now() - t0);
t0 = performance.now();
const plate = new Plate(ink);
probe.plateMs = Math.round(performance.now() - t0);
stage.scene.add(plate.root);
const A01 = makeUnit(spec);
const chapters = spec.chapters ?? [], told = chapters.filter((c) => !c.beat).length, byHand = chapters.filter((c) => c.beat && !c.clips?.length).length;
const closing = chapters.length - told - byHand;
const mins = Math.round(layoutClips(bundle.cues, A01.watch.order, A01.watch.lead, A01.watch.gap).end / 60);
const shell = new Shell(document.getElementById('shell')!, {
  num: '01', name: 'Neuron', eyebrow: 'Plate I · Instrument 01', title: 'What a neural network is',
  lede: `A narrated engineering plate, drawn with its casing cut away: ${chapters.length} chapters, ${told} narrated (${mins} min), ${byHand} by hand${closing ? ` and ${closing === 1 ? 'a closing one' : `${closing} closing`}` : ''}, then Practice for as long as you like. With sound; each chapter stops so you can look.`,
  keys: `Drag a dial to turn it. ${keyHint()}`,
  tip: 'Click or tap a circled number to open its note; Esc, a click on bare paper or the same number closes it.',
  endEyebrow: 'End of Plate I', endTitle: 'Next: Plate II',
  endLede: 'Any chapter below plays again.',
});
const view = new CutawayView(stage, plate);
/** Behind the Begin card: the whole plate on a portrait field; on a landscape one the machine and its caption, centred on the field. */
const landing = stage.W > stage.H ? LANDING : SHOTS.open;
let state = (): A01State => A01.initial();
const { d } = boot({
  unit: A01, bundle, view, shell, controls: controls(view), hotspots: hotspots(() => state()), beats, after: afterWatch,
  markers: partMarkers(spec.parts ?? [], (n) => plate.balloonAt(n), BALLOON_R),
  opening: { ...landing, exposure: 0.35 }, easing: cutawayEasing, progress: { unit: 'U01', states: { drive: 'driven', bench: 'played', race: 'cleared' } }, sections: SECTIONS, finished: FINISHED,
});
state = () => d.s;
const count = d.onFrame;
/** The sheet change holds on the old sheet until the plate's first frame (`sheet:ready`). */
let drawn = false;
d.onFrame = (ms) => {
  count(ms); probe.accentDrawn = ink.theme.signal;
  if (!drawn) { drawn = true; Object.assign(window, { __sheetReady: true }); document.dispatchEvent(new Event('sheet:ready')); }
};

if (import.meta.hot) import.meta.hot.accept('./plate/theme.ts', (m) => { if (m) { ink.paint(m.THEME); stage.renderer.setClearColor(m.THEME.paper); d.wake(true); } });
