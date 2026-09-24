/** Homepage composition root: progress → marks and CTA → seated parts; then the dial, the strip, share and the phone folds. */
import { readProgress } from './progress.js';
import { paint } from './paint.js';
import { seat } from './seat.js';
import { dial } from './dial.js';
import { strip } from './strip.js';
import { share } from './share.js';
import { fold } from './fold.js';

const state = document.documentElement.dataset.state;
const units = JSON.parse(document.getElementById('units').textContent);
const done = paint(units, readProgress(state), state);
if (Object.keys(done).length) requestAnimationFrame(() => requestAnimationFrame(() => seat(units, done, true))); else seat(units, done, false);
dial(); strip(); share(); fold();
