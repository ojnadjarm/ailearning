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
| `src/site/sheet/` | The sheet set every page shares: `sheet.css` (fonts, tokens, frame, unit variant `.sheet.app` + `.field`, page-turn keyframes), `frame.mjs` (zones + header rail), `plugin.mjs` (Vite: fills `<!--sheet:frame-->` in `u/<slug>/index.html` from `content/homepage.json`, injects the view-transition opt-in and the direction + sound script into every page) |
| `404.html`, `src/site/title.css` | Pages 404 sheet, one link home through `%BASE_URL%` (served at any depth) plus the credit |
| `u/01-neuron/index.html` | U01 page; every new page is also added to `build.rollupOptions.input` in `vite.config.ts` |
| `units/01-neuron/` | `main.ts` (composition root), `unit.json` (script), `unit/` (state, layout, watch timeline, play steps), `plate/`, `sim/` |
| `public/bundles/01-neuron/` | Kokoro clips + `cues.json` (committed); every clip ships as `.opus` and `.m4a` (`tools/bundle-check.mjs`) |
| `public/sound/` | Page-turn sounds, `.opus` + `.m4a`, ≤ 20 kB each (`bundle-check`) |
| `public/THIRD-PARTY-NOTICES.txt` | three.js MIT text, GSAP copyright and licence link, page-turn sound source (CC0); `tests/unit/notices.test.mjs` fails if a dependency is missing |
| `src/core/reload.ts` | `vite:preloadError` → reload once (stale HTML after a deploy) |
| `tools/` | `sync-kit.sh`, `kit-verify.mjs`, `content-check.mjs`, `hygiene.mjs`, `base-check.mjs`, `link-check.mjs` (internal links resolve, no link to an unbuilt unit), `bundle-check.mjs`, `check-links.sh` (internal + external) |
| `tests/` | `unit/*.test.mjs` (node), `lib/pages-sim.mjs` (Pages behaviour: 301 `/dir`, 404 + `404.html`), `e2e/home.mjs` (3 states × 6 views + behaviours), `e2e/home-perf.mjs` (homepage budget), `e2e/site.mjs` (U01 widths as a sheet, 404, no-JS), `e2e/sheet-change.mjs` (page turn both ways, sound, reduced motion, compositor frames at 1366/1920, frame strip), `e2e/unit.mjs` (watch sweep, live audio, drive, end) |

## Commands
`npm run ci` (typecheck, kit:verify, node tests, build with pre/post checks, e2e under pages-sim) · `node tests/e2e/unit.mjs <url>` (U01 plays at any URL, 0 failed requests) · `npm run check-links`.
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
  of the rail, outside the plate field, so the card and plate never cover it (`site.mjs` checks watch, drive, end). Phones (≤ 639 px) keep the bare plate.
- Sheet change: cross-document View Transitions, CSS only. The earlier sheet is a book page hinged on its left edge: forward it turns right to left
  with its paper back (`.leaf`), back it turns left to right, 1 s; reduced motion is a silent 150 ms crossfade. Browsers without it just navigate.
  Only transforms animate (image-pair windows cut along the fold, counter-turned images, the leaf group reflected), so the compositor runs the
  turn while the plate boots; a clip-path turn stalled at 1920. Use animation longhands on `::view-transition-*` (the minifier drops the shorthand).
- Page-turn sound: `public/sound/page-turn{,-back}.{opus,m4a}` (CC0, -30 LUFS against narration at -16), played by the new page at pagereveal.
  Chromium plays it (activation carries over a same-origin navigation); WebKit blocks it and stays silent. Sheet 0 loads no audio before a click.

## History
- 2026-09-24 — repo seed: deploy workflow, both kits vendored (55 files hashed), U01 = the explainer-kit neuron example with URLs
  through the base, Sheet 0 title sheet, hygiene (2 tiers + external deny-list), base check, pages-sim, preloadError reload.
- 2026-09-24 — public-readiness fixes: `404.html`, U01 `<noscript>`, third-party notices, bundle check (Opus + AAC per clip), e2e
  through watch, drive and end, hygiene over every committable file, deploy runs typecheck and node tests before the build.
  Not yet: `pages.mjs`, madge and the 300-line rule, narration hashing; the U01 end card still names the race.
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
