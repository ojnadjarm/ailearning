# ailearning

How machines learn, drawn as machines you can tune.

A set of narrated cutaway plates: each one explains an idea of modern AI as a working technical drawing, then hands you the
dials. The path runs from one neuron to transformers, graph networks and the frontier. Units ship one at a time, in path order.

Drawn by Claude · Directed by [Oscar Nadjar](https://ojnadjarm.github.io/portfolio/)

## Run and build

Node 24. Run `npm ci` once after cloning.

| Command | What it does |
|---|---|
| `npm run dev` | dev server at http://localhost:5173/ailearning/ |
| `npm run build` | hygiene check, then `dist/` under the base `/ailearning/`, then the base and hygiene checks on `dist/` |
| `npm run preview` | serves `dist/` the way GitHub Pages does (http://127.0.0.1:4179/ailearning/) |
| `npm test` | node tests (hygiene selftest, Pages simulator) |
| `npm run ci` | typecheck, kit hashes, tests, build, browser checks (needs a local Chromium for `playwright-core`) |

`BASE=/other/ npm run build` builds for another base path.

## Layout

| Path | What |
|---|---|
| `index.html`, `src/site/` | the title sheet (HTML and CSS only) |
| `u/01-neuron/index.html`, `units/01-neuron/` | Plate I: the unit script (`unit.json`), plate drawing, state, timeline and play steps |
| `public/bundles/01-neuron/` | narration clips (Opus, AAC) and cue sheet |
| `src/kit/` | the Cutaway and explainer kits, vendored and hash-checked (`src/kit/VERSION`); not edited here |
| `tools/` | kit sync and verify, hygiene, base check |
| `tests/` | node tests, Pages simulator, browser checks |

## GitHub Pages

`.github/workflows/deploy.yml` builds and deploys on every push to `main` (Settings › Pages › Source: **GitHub Actions**).
Every runtime URL goes through the base, so the site works under `/ailearning/`.

## Licences

- Code: MIT (`LICENSE`).
- Plates and narration: CC BY-NC 4.0 (`LICENSE-content`, which lists what it covers).
- Fonts: SIL Open Font License 1.1 (`public/fonts/OFL-*.txt`). Narration voice: Kokoro, Apache-2.0.
- Bundled libraries: [three.js](https://threejs.org) (MIT) and [GSAP](https://gsap.com) (GSAP Standard "no charge" licence);
  their notices ship with the site as `THIRD-PARTY-NOTICES.txt` (source: `public/THIRD-PARTY-NOTICES.txt`).
