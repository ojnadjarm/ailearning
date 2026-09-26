# ailearning — project notes for agents

Public GitHub Pages site of narrated Cutaway plates (ink on ivory technical drawings you tune by hand). Vite multi-page, TypeScript,
base `/ailearning/`. The plan and any machine-specific notes live outside this repo (`CLAUDE.local.md`, ignored by git).

## Rules
- **Never `git add`, commit or push, never touch GitHub.** The maintainer stages, commits and pushes at the end of each day.
- **Continuous release:** when you stop, `npm run ci` is green and the repo deploys as it is. Unfinished units are not linked.
- **Public repo:** credits read "Drawn by Claude · Directed by" the maintainer, whose name (linked to the portfolio) appears only in
  the credit spots: plate title blocks (APPROVED), README, the homepage title block (APPROVED) and colophon line (from
  `src/site/homepage/credits.mjs`), the 404 sheet, `LICENSE`, `LICENSE-content`. The private deny-list
  holds the exact `allow <path-glob> <regex>` span for each; any other appearance fails, as do the handle and emails. No home paths, host names, emails, internal work-item
  IDs or internal wording in any committed file; no raw audio (WAV, FLAC, AIFF, MP3). `npm run hygiene` scans what git would commit
  (vendored `src/kit/` gets the leak tier only); private names come from `HYGIENE_DENY=<file>` (outside the repo, one regex per line, plus those `allow` spans).
- **Every runtime URL goes through the base:** `import.meta.env.BASE_URL + path` in scripts, relative paths in HTML (Vite adds
  the base). `tools/base-check.mjs` runs after every build.
- **Kits are vendored, never edited here:** `src/kit/{cutaway,explainer}` and `public/fonts/` come from `tools/sync-kit.sh`
  (`CUTAWAY_KIT=<dir> EXPLAINER_KIT=<dir> npm run kit:sync`); `npm run kit:verify` checks them against `src/kit/VERSION`.
- Web pages are fluid and responsive: verified at 400/768/1366/1920/2560, symmetric margins, no horizontal scroll, no dead gaps.

## Layout
| Path | What |
|---|---|
| `index.html` | Homepage shell (Sheet 0 · General assembly): `<!--home:head-->` / `<!--home:body-->` are filled at build by `src/site/homepage/plugin.mjs` |
| `src/site/homepage/` | The homepage (exploded assembly, no three.js): `plugin.mjs` (Vite, `transformIndexHtml` pre) → `render/*` (templates) over `draw/*` (drafting primitives, 9 ring parts, silhouettes, layouts); `runtime/*` (progress read-only, seat, dial, strip, share, phone folds); `home.css`; `credits.mjs`; `plate-i.avif`. Architecture note in the plan folder. |
| `content/homepage.json` + `.schema.json` | Homepage copy and the 43-unit path; `tools/content-check.mjs` (ajv + path/copy rules) runs in `prebuild` and inside the plugin |
| `src/site/sheet/` | The sheet set every page shares: `sheet.css` (fonts, tokens, frame, unit variant `.sheet.app` + `.field`, page-turn keyframes), `frame.mjs` (zones + header rail), `plugin.mjs` (Vite: fills `<!--sheet:frame-->` and `<!--sheet:narrow-->` in `u/<slug>/index.html` from `content/homepage.json`, injects the view-transition opt-in, the sheet change `turn.js` and the press guard `press.js` inline into every page, and on unit pages the plate gate: from 1024 px the lazy plate chunk and its CSS load render-blocking), `narrow.mjs` (the narrow sheet: chapters timed from the cue sheet) |
| `404.html`, `src/site/title.css` | Pages 404 sheet, one link home through `%BASE_URL%` (served at any depth) plus the credit |
| `u/01-neuron/index.html` | U01 page, script `units/01-neuron/entry.ts`; every new page is also added to `build.rollupOptions.input` in `vite.config.ts` |
| `units/01-neuron/` | `entry.ts` (width gate: from 1024 px imports `main.ts`, narrower the page is the narrow sheet until the window widens), `main.ts` (composition root), `unit.json` (script, terms, chapters, parts), `unit/` (state, `layout.ts` geometry + named `SHOTS` + chrome `INSET`, tap targets `SPOTS`, watch timeline, play steps, `live.ts` numbers), `plate/` (`parts/explain.ts`: the drawn callout note and part outline), `unit/bench/` (the Workbench: `e1.ts`…`e8.ts`, `contrast.ts`, `common.ts` misconception ids + walks), `unit/race.ts` (You are the tuner: three solo levels), `unit/click.ts` (XIV, the closing chapter: payoff, closing line, then the end card), `unit/ways.ts` (the Practice section, the finished landing's ways, the next-sheet note), `unit/outlines.ts` (every fixed outline in drawing units) + `unit/place.ts` (the kit placer: value boxes, balloons and the plaque in clear paper, `layoutOf` per pose, `inventory` for the tests; static layout in `placed.ts`, arrow routing `arrow.ts`, bench shapes `bench-shapes.ts`), `sim/` (`neuron.ts` + `derive`, `format.ts` number rules, `generators.ts` seeded cases, `race.ts` levels + goals, `build.ts` the assembly) |
| `public/bundles/01-neuron/` | Kokoro clips + `cues.json` (committed); every clip ships as `.opus` and `.m4a` (`tools/bundle-check.mjs`) |
| `public/sound/` | Page-turn sounds, `.opus` + `.m4a`, ≤ 20 kB each (`bundle-check`) |
| `public/THIRD-PARTY-NOTICES.txt` | three.js MIT text, GSAP copyright and licence link, page-turn sound source (CC0); `tests/unit/notices.test.mjs` fails if a dependency is missing |
| `src/core/reload.ts` | `vite:preloadError` → reload once (stale HTML after a deploy) |
| `tools/` | `sync-kit.sh`, `kit-verify.mjs`, `content-check.mjs`, `hygiene.mjs`, `base-check.mjs`, `link-check.mjs` (internal links resolve, no link to an unbuilt unit), `bundle-check.mjs`, `check-links.sh` (internal + external), `test-changed.mjs` (`npm run test:changed`: path → covering checks), `cue-check.mjs` (`npm run cue-check -- --clip --mark --key --part`: a state key changes on that word, the part is drawn), `narrate.sh` (`KOKORO_PY=… KOKORO_RENDER=… tools/narrate.sh <slug> <clip…>`: renders and merges only the named clips) |
| `tests/` | `run-e2e.mjs` (`npm run e2e`: one pages-sim and one browser; frame-timed files alone, then a timed lane beside a parallel lane), `lib/harness.mjs` (every e2e's site, browser, faults and waits), `unit/*.test.mjs` (node; `lesson.test.mjs` lints the U01 script, checks words against numbers and the number rules; `framing.test.mjs` whole-or-out, nothing under the caption or the bar, lamp in frame, legibility), `lib/lesson.mjs` (the watch settled at each sentence), `lib/framing.mjs` (stages, framed objects, samples), `lib/pages-sim.mjs` (Pages behaviour: 301 `/dir`, 404 + `404.html`, gzip for text), `e2e/home.mjs` (3 states × 6 views + behaviours, and every parts-list row at 400–2560: numeral fits its column with a clear gap, text wraps in its row), `e2e/home-perf.mjs` (homepage budget), `e2e/site.mjs` (U01 as a sheet with the plate from 1024 px, the narrow sheet below with no plate code, widening loads the plate; 404; no-JS), `e2e/sheet-change.mjs` (page turn both ways, sound, reduced motion, compositor frames at 1366/1920, frame strip), `e2e/transitions.mjs` (every frame of both turns at 400–2560 and on a phone, 1× and 4× CPU, reduced motion: no blank or white frame, no late font or style sheet, CLS 0, the turn after the plate's first frame; 50 first presses per button, double presses start one navigation; real presses, down 90 ms up, at 0–1000 ms after the target shows and fully loaded, on "← Sheet 0", the homepage CTA and the landing choices), `e2e/unit.mjs` (watch sweep, no Parts button, list or modal (G opens nothing), the working mirror at 1366, number-only hover and click (body draws and opens nothing), the end card closing three ways, a heard callout's live number, live audio, tap a part, seek, keys sheet, resume in a second tab, drive, end, stored progress, the finished landing), `unit/play.test.mjs` + `lib/solve.mjs` (U01 play: generators, the right play and each detector's wrong move over 400 seeds, assembly, tuner levels solvable by grid search, `lintPlay`), `unit/place.test.mjs` (layout rules in every pose), `e2e/flow.mjs` (the lesson, then Practice: chooser and end card ways, Practice head and tabs, Practice never a chapter, bar segments; Practice from 7 places and back to the same point; the landing states with seeded progress; the closing chapter; the bar status fitting at 1024–2560 for every beat; one voice over 20 entries into Your turn with the clip's fetch delayed), `e2e/geometry.mjs` (layout, numbers only and page controls, the Practice sheet included, at every exercise step and chapter end at 1366/1920/2000/2560, narrow sheet at 400/768), `e2e/lesson.mjs` (the whole lesson by script: every chapter stop, the drive, every case with its detector's wrong move first, Show me per exercise, every contrast pair, the three tuner levels (Done pressed early on L3), the closing chapter with no button, stored "cleared", the finished landing, every chapter reopening, the skip offer; run with `--import ./tests/lib/register.mjs`) |

## Commands
`npm run ci` (typecheck, kit:verify, node tests, build with pre/post checks, e2e under pages-sim; the full suite at most once a day) · `npm run test:changed [-- --dry] [path ...]` (only the checks covering the changed files, default `git status`) · `node tests/e2e/unit.mjs <url>` (U01 plays at any URL, 0 failed requests) · `node --import ./tests/lib/register.mjs tests/e2e/lesson.mjs <url>` (the whole lesson, ~3 min) · `npm run check-links`.
Screens from `e2e/site.mjs` land in `out/shots/`.

## Homepage
- **A unit goes live** when its `content/homepage.json` entry has `status: "drawn"` and `u/<slug>/index.html` exists (the plugin fails the
  build otherwise). Only live units get links; every other unit is a phantom part, drawn, never clickable. `link-check` proves it.
- States: `?state=new|returning|phone` (tests only, no visible switcher), else coarse pointer ≤ 820 px → phone, else a stored
  `plates:v1:progress` resume on a live unit → returning, else new. Progress is read-only here.
- Phone (≤ 639 px): notes and the parts list fold (`details[data-fold]`, closed before first paint), header on one line; ≤ 3.5 screens at 400×860.
- Open TODOs in code: `TODO(progress store)`, `TODO(desktop gate)`, `TODO(stills + path map)`.

## Sheet set
- A unit page is a sheet of the set: link `src/site/sheet/sheet.css`, wrap `#stage` + `#shell` in `<div class="sheet app"><!--sheet:frame--><div class="field">`.
  The rail and "Sheet n of 43" come from `content/homepage.json` by slug; the way back is a drawn outline button (`.back`, "← Sheet 0") at the start
  of the rail, outside the plate field, so the card and plate never cover it (`site.mjs` checks watch, drive, end). Below 1024 px a unit page is its narrow sheet: "Plate I is drawn for a desktop", the chapter list and the way back (the rail stays on phones).
- Sheet change: cross-document View Transitions, CSS only. The earlier sheet is a book page hinged on its left edge: forward it turns right to left
  with its paper back (`.leaf`), back it turns left to right, 1 s; reduced motion is a silent 150 ms crossfade. Browsers without it just navigate.
  Only transforms animate (image-pair windows cut along the fold, counter-turned images, the leaf group reflected), so the compositor runs the
  turn while the plate boots; a clip-path turn stalled at 1920. Use animation longhands on `::view-transition-*` (the minifier drops the shorthand).
- Page-turn sound: `public/sound/page-turn{,-back}.{opus,m4a}` (CC0, -30 LUFS against narration at -16), played by the new page at pagereveal.
  Chromium plays it (activation carries over a same-origin navigation); WebKit blocks it and stays silent. Sheet 0 loads no audio before a click.
- The old sheet stays whole until the new one is drawn: the new page holds the turn (`html.hold` pauses every `::view-transition-*` animation) until
  its fonts are ready and, when it sets `html[data-hold]`, its `sheet:ready` event (U01: the plate's first frame, from 1024 px); cap 2.5 s. The
  `.leaf` belongs to the new page and shows only under `:active-view-transition`. The plate keeps `preserveDrawingBuffer` (an idle canvas is
  captured white in the outgoing snapshot). A press on a link to another sheet sinks at once (`.btn.pressed`) and counts once; a press during
  a turn speeds it to its end and reaches what is under it, also when it starts on the turn and ends after it (its click lands on `<html>`). `sound` plays when the hold releases.

## History
- 2026-09-24 — repo seed: deploy workflow, both kits vendored (55 files hashed), U01 = the explainer-kit neuron example with URLs
  through the base, Sheet 0 title sheet, hygiene (2 tiers + external deny-list), base check, pages-sim, preloadError reload.
- 2026-09-24 — public-readiness fixes: `404.html`, U01 `<noscript>`, third-party notices, bundle check (Opus + AAC per clip), e2e
  through watch, drive and end, hygiene over every committable file, deploy runs typecheck and node tests before the build.
  Not yet: `pages.mjs`, madge and the 300-line rule, narration hashing; the homepage Detail C still reads "Race the tuner".
- 2026-09-24 — credits: plate title blocks carry a DRAWN / APPROVED signature strip (Cutaway kit `TitleSpec.drawn/approved`,
  `titleRect(sheet, signed)`; U01's own sheet draws the same strip), sheets and README say "Drawn by Claude · Directed by" with the
  portfolio link, licences name the maintainer; hygiene honours `allow` spans from the private deny-list.
- 2026-09-24 — homepage: the exploded-assembly design replaces the title sheet (Vite plugin renders it from `content/homepage.json`),
  U01 the only live part, returning state from stored progress, phone folds (5.9 → 3.46 screens), content check (ajv), internal
  link check, home e2e + budget (LCP ~0.2 s, CLS 0, HTML+CSS 25 kB gz, JS 2.8 kB gz, 0 idle frames).
- 2026-09-24 — sheet set: the frame moves to `src/site/sheet/` (shared by the homepage and unit pages), U01 is Sheet I in the same frame
  (rail, way back, Sheet 1 of 43, the landing plate across the field on landscape), sheet change between them both ways, `sheet-change.mjs` e2e.
- 2026-09-24 — sheet change as a book page turn (1 s, both ways, compositor-only), drawn "← Sheet 0" button on the rail, page-turn sound (CC0).
- 2026-09-24 — leader fix + cold first turn: TARGET's label sits right of its leader (OUTPUT's vertical crossed its last T; ring 1 `over` 116 keeps
  it clear of match line A); `home.mjs` fails on any leader crossing a label or two labels overlapping, in every layout, state and fully seated.
  The unit module is render-blocking (`sheet-set:render-blocking` plugin, plus cue-sheet and plate-font preloads): cold, the sheet change waited
  for nothing and revealed an empty Sheet I for ~3.7 s at 1.6 Mbit/s; now Sheet 0 stays until Sheet I can draw. `tests/e2e/sheet-cold.mjs` guards it.
- 2026-09-24 — U01 player (explainer kit synced): progress bar with chapter ticks (seek back, never past what was heard; J/L one
  sentence), tap any part for a drawn note (word, gloss, the numbers now, "said at m:ss ▸ hear it") that holds the voice, caption term links,
  a side column from 1024 px with the numbered parts list (live values) and the transcript, `?` keys sheet, sound sheet, standing
  instruction with Say again, resume (Continue / Start over, `plates:v1:progress` unit `U01`), an honest end card (the next instrument,
  not drawn yet) with the closing line and the chapter list. Script gains `sum`, `valve`, `click` terms, chapters and parts (lint clean).
  The kit tweens with `gsap/gsap-core` (unit JS 205.8 → 198.2 kB gzip); `pages-sim` serves gzip like Pages, which keeps the cold page turn
  honest (it measured uncompressed bytes and skipped the turn at 4.4 s).
- 2026-09-24 — U01 explanation in full: 11 chapters (I–X narrated, XI by hand), 21 parts with live values, a callout on every drawn number
  and part, plate additions (product windows, NOTE working, miss arc, lock pins, click ring, example bracket, Fig. 3 examples + tally,
  Fig. 4 valve graph, tuner, detail A), words-vs-numbers and framing tests (nothing drawn under the caption or the bar). Captions keep a
  term's trailing punctuation on its line (kit `Captions.glued`). Below 1024 px the page is a designed narrow sheet (chapter list, way back,
  no plate code); `base-check` skips Vite's lazy-chunk dependency map. Audio 1.59 / 1.74 MB (opus / m4a), first chapter 168 / 183 kB.
- 2026-09-24 — U01 play in full: the drive gains a third step (both dials to a mark), then the Workbench (eight exercises as hand-played
  cases posed from seeded generators: set and press in, pencil predictions, make it happen, an assembly from a tray, repair with locked
  inputs, one setting for two examples), each with a detector for its misconception, refutations at most twice, contrast pairs on the
  second firing, hints Look → Narrow → Show me on request and the skip after three clean first tries; the Challenge (three levels raced
  against a gradient-descent tuner with seeded par histograms; the last has no exact setting); the Click (Fig. 5, one bend) and the end
  card; stored progress runs seen → driven → played → cleared. Explainer kit: the Workbench upstream (bench, flow, hints, walk, command
  log, `lintPlay`), the last case completes its beat, the skip chip sits above the button. Tests: play over 400 seeds and the whole lesson
  by script in `npm run e2e`; the narrow sheet's chapter count is read from `unit.json` (13 rows). Audio 2.63 / 2.93 MB, first chapter 168 / 183 kB.
  Fixes: a line that grows after its first draw (Fig. 5) was cut to its first length (`ink.setSegs` clears three's cached instance count;
  the lesson e2e checks every visible line); race STEP label and balloons 6/11 no longer overlap Fig. 5/6 (framing test); the hint button
  reads Hint on a case's first rung; the end card stays between the header and the bar with its chapter list scrolling (e2e checks the fit).
  Plate JS 225.78 kB gzip.
- 2026-09-25 — U01 full lesson, polish: a callout opens on a click or tap only (hover outlines the part; Esc or a click on bare paper
  closes it and the voice resumes); each chapter's working marks fade once its recap is said, so a chapter ends on the clean machine; the
  end card closes three ways (drawn ×, Esc, click outside) and the plate stays live, a return visit lands on the end without the card; a
  paused chapter shows the numbers it is heading to (kit `Beat.goals`), not the half-tweened ones; the side column mirrors the drawn
  working as 13 px text (kit `Live.working`, only while it is in the shot), because the plate's 22-unit text is under 8 px at 1366.
  Framing: a zoomed box keeps its foot above the caption band, and before Begin the landing uses `INSET_BEFORE` (no caption or bar yet),
  so Fig. 1 sits centred. Begin card counts its chapters and minutes from `unit.json` and the cue sheet; favicon via `%BASE_URL%`; race
  floor label on its step row; Fig. 2 carries a "TO DETAIL A, FIG. 1" sign; `unit.json` marks unspoken callouts `said: false`.
  Kit: keyboard dial turns accumulate (`DetentHand`), the transport clock stops at the total. Tests: 66 node; the unit e2e checks
  hover/tap/Esc/click-away, the three end-card closes and 13/13 chapters in view at 1366. Plate JS 227.68 kB gzip, kept as one chunk.
- 2026-09-25 — U01 exercise polish: once the explanation ends only the circled numbers name parts (the kit's `LabelMode`); only a
  number opens its callout (hovering it shows the help cursor and the part's outline; a part's body and a parts row draw nothing); value
  boxes, balloons and the plaque are placed by the kit's layout rules (`unit/place.ts`, per pose while a pencil, goal ring or the target
  mark moves; a number with no clear slot hides for that pose); the race became "You are the tuner", three solo levels with a goal, no
  machine opponent, each proven solvable by grid search, new narration for five clips. Tests: node 70, `e2e/geometry.mjs` added.
- 2026-09-25 — U01 next pass: the Parts list and a part's callout live in one modal (×, Esc, a press outside; a part returns to the
  list), the side column is tabs Chapters / Transcript, the working is a sheet on the bar; after the watch a chooser offers Exercises,
  Tuning or the watch again; endless practice and endless tuning (`?seed=` pins them) with a chip onward; Give up on every exercise and
  level; the tuning plate keeps the one machine, with an input panel I–IV that loads one set at a time, TARGET I–IV minis updated in a
  ripple, and four lamps "ONE SETTING · ALL FOUR" (the dials never move when a set loads). Pencil values and arc-arrow words are placed
  by rule and checked as value items. Tests: node 74; unit e2e checks the modal, chooser and 6 px badge edge; lesson e2e gives up
  on every kind and level and pins practice seeds.
- 2026-09-25 — U01 lesson, then Practice: the chapters are the explanation (I–X), Your turn, Workbench and Tuning (XI–XIII), each a
  segment on the bar after the watch (hollow, dashed once reached, inked once done; a press opens a reached one); the Practice section
  (endless exercises and endless tuning) is no chapter: its own head (name, Exercises / Tuning tabs, "Back to the lesson" → the end card),
  the bar playhead hidden, the plate framed with `INSET_SECTION`. The chooser after the watch reads Your turn / Skip to Practice / Watch
  again; the end card Practice exercises / Practice tuning / Watch again. Saved completion: progress sets only grow and restore before the
  resume beat (finished chapters had read "Not reached yet"). One voice at a time: a new line stops the last and a clip cut while decoding
  never starts (a "Your turn" re-entry had played two). Buttons: the Cutaway kit's hatched-section system (`buttons.css`, imported by
  `sheet.css`) on every control of the lesson, "← Sheet 0" and the homepage CTAs; the instruction is a ruled strip. Kit tests 51, e2e `flow.mjs` added.
- 2026-09-25 — U01 Practice from anywhere, landing, closing chapter: a Practice toggle in the bar opens a sheet of its tabs from any
  chapter, and "Back to the lesson" returns to the same second, step or card (an unfinished lesson no longer reads finished). The landing
  shows Begin, Continue / Start over with "You stopped in chapter XII, Workbench.", or for a finished lesson Practice exercises / Practice
  tuning / Watch again; the summary counts 14 chapters and Practice. The Click becomes XIV "What one neuron can't do": the payoff, a new
  closing line (Kokoro `close`), then the end card on its own with a phantom "Next: Sheet II · Layers and creases". The Parts button, both
  modals and `LIVE.value` are gone (the numbered badges name the parts). The bar status wraps instead of being cut. Kit tests 58, node 77.
- 2026-09-25 — U01 quick fixes: in Practice the shot shows whole below the section head (`INSET_SECTION.whole`: `frameIn` drops the
  sheet-width zoom floor there and centres a view wider than the sheet on it; on wide stages the head's rule had crossed the gauge);
  `geometry.mjs` fails when the head covers the shot or any item in Exercises or Tuning. XIV's `close` clip ends on a goodbye
  ("Thanks for tuning with me. See you there."), re-rendered with Kokoro af_heart; m4a 3039 kB.
- 2026-09-25 — homepage parts list: the Plate column is `max-content`, sized in every row and the header by a hidden ghost of the widest
  numeral (`--pw`, set on `section.bom` from content), plus 0.4 em; XXXVII/XXXVIII no longer run into their titles. `home.mjs` checks every row.
- 2026-09-25 — U01 marks, cues and readouts:
  - Learner marks: pencil 1 is a graphite flag on a drawn rail, with its number inside the flag. Pencil 2 is a graphite needle on the
    gauge hub, with a knurled grip and a fixed window on the face (`plate/parts/pencils.ts`).
  - A first-drag cue (▲▼ on the flag, a double arc over the rim) shows until the first move (`watchCue`).
  - Hint arrows draw at `Z.cue` on a paper under-stroke. They are routed by radius, with the words in clear paper or off the casing.
  - The kit's `layoutFaults` now takes `z`, `kind: 'cue'` and `clip`.
  - New `tests/e2e/pencils.mjs`.
- 2026-09-25 — U01 readouts as data plates (`plate/parts/readout.ts`): each Fig. 6 gauge has a riveted plate (IN | TARGET | OUT, then
  MISS on a dotted leader); the tally is a riveted title block (STEP on drums, GOAL with its meaning, TOTAL MISS with the sum under it).
  Rows moved to y 316 / −42 to fit the plates; labels 18 and values 30 units (≥ 11 px at 1920).
- 2026-09-25 — smooth sheet changes: the new sheet holds the page turn until it is drawn (fonts, the plate's first frame), the leaf is added
  by the new page only, the plate canvas keeps its drawing buffer, a press sinks at once and counts once, a press during a turn reaches its
  target. Measured with a frame-by-frame capture at 400–2560, a phone and 4× CPU. The homepage share button reads "Copy link" / "Link copied"
  and never shows the address (it ran off a 400 px phone); `home.mjs` checks it at 360 and 400. `tests/e2e/transitions.mjs` added, not yet run.
- 2026-09-26: the YOUR GUESS tag and chapters VIII–IX on the tuning machine.
  - YOUR GUESS tag on pencil 2 (`GuessTag`, `guessTag()` in `unit/place.ts`). Shown until the first drag in each exercise; it keeps off the numerals, the readout and the blue needle.
  - Chapters VIII–IX run on the tuning machine as Fig. 6 mode 5 (`fig6On`/`raceOn`): the input rack, the TARGET minis coming out one set at a time, the lamp bar, the ripple on a dial turn, and the tally counting the tuner's steps.
  - Fig. 3 and the `bench` shot are gone. Four lines rewritten and three added (c8a–c9b re-rendered).
  - Every m4a re-encoded at 22 kbps (3006 kB).
  - The contrast pairs' reference plate is a five-cell `DataPlate` with a foot line.
  - Tests updated, not run.
- 2026-09-26: cleanup and speed pass, no change in look or behaviour (stills within 8/255, 0.05 %).
  - Dead code out; U01 imports the Cutaway kit's `geom` and `parts/part` instead of copies; `unit/place.ts` split in three.
  - The plate updates matrices only for visible objects; the director's state key is cached.
  - e2e runs in parallel lanes (`tests/run-e2e.mjs`, `lib/harness.mjs`), 879 → ~450 s; `npm run test:changed` runs only the covering checks.
  - The per-unit audio cap is gone; the first chapter stays at most 600 kB per format.
- 2026-09-26: authoring tools, no change in look or behaviour: `npm run cue-check`, `tools/narrate.sh` (named clips only), `tests/unit/chapter-numbers.test.mjs`
  (a spoken chapter number must still be the chapter it means; U01's one mention, "Chapter Seven" in `d2ok`, matches).
- 2026-09-26: balloons 6, 11, 17, 18 are back (no clear slot since Fig. 6 joined the watch scene, so they were hidden): Fig. 6, its tally and caption are
  side-scene outlines, the Fig. 6 and tally balloons' leaders may cross their figure, Fig. 6's slot titles are an outline, balloon 17 uses the long ring.
  `sheet-change.mjs` expects the forward leaf shade on the new page's leaf; hygiene's internal-id pattern takes 3+ digits (a three.js shader name is exempt in dist).
- 2026-09-26: a first press that starts while a sheet still turns and ends after the turn is no longer lost ("← Sheet 0" shows in the turn's
  last tenth, so a hand's press there split across its end: pointerdown on the overlay, pointerup on the button, click on `<html>`). `turn.js`
  keeps the press and delivers it to what is under the pointer; the hold and 300 ms tail rules are unchanged. `transitions.mjs` presses the way a hand does.
- 2026-09-26: the learner's guess needle (pencil 2) stops at 0 and 5: `rimValue` holds an end the needle rests on while the pointer is below
  the scale, so a drag past either end never wraps; the e2.3/e3 detectors for a guess below 0 are gone (e3.below has no detector now).
