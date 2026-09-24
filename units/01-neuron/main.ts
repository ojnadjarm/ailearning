import '../../src/core/reload';
import { boot, probe, loadBundle, Shell, type UnitSpec } from 'explainer-kit';
import { CutawayView, cutawayEasing } from 'explainer-kit/cutaway';
import { THEME } from './plate/theme';
import { Ink } from './plate/ink';
import { Stage } from './plate/stage';
import { Plate } from './plate/plate';
import { afterWatch, SHOTS } from './unit/watch';
import { L } from './unit/layout';
import { A01, beats, controls } from './unit/unit';
import spec from './unit.json';

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

const [, bundle] = await Promise.all([fonts(), loadBundle(`${BASE}bundles/01-neuron/`, spec as UnitSpec)]);
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
const shell = new Shell(document.getElementById('shell')!, {
  num: '01', name: 'Neuron', eyebrow: 'Plate I · Instrument 01', title: 'What a neural network is',
  lede: 'A narrated engineering plate, drawn with its casing cut away. Watch it work, then tune it by hand. About ninety seconds, with sound.',
  keys: 'Drag a dial to turn it. Arrow keys turn the lit dial.', endEyebrow: 'End of the opening', endTitle: 'Next in the full unit: race the tuner',
});
const view = new CutawayView(stage, plate);
/** Behind the Begin card: the whole plate on a portrait field, the machine across the full width of a landscape one. */
const full = stage.across({ x: 0, y: 0, w: L.caseW + 160, h: SHOTS.full.camH });
const landing = stage.W > stage.H ? { camX: full.x, camY: full.y, camW: full.w, camH: full.h } : SHOTS.open;
const { d } = boot({ unit: A01, bundle, view, shell, controls: controls(view), beats, after: afterWatch, opening: { ...landing, exposure: 0.35 }, easing: cutawayEasing });
const count = d.onFrame;
d.onFrame = (ms) => { count(ms); probe.accentDrawn = ink.theme.signal; };

if (import.meta.hot) import.meta.hot.accept('./plate/theme.ts', (m) => { if (m) { ink.paint(m.THEME); stage.renderer.setClearColor(m.THEME.paper); d.wake(true); } });
