# Proposed next refactoring step

Written August 2026, after the module refactor on branch `refactor-2026`. Nothing here has
been applied — no package was installed or updated, and the vendored libraries are
untouched.

Every claim about what breaks under a newer Plotly was checked by loading Plotly 2.35.3
(already sitting unused in `node_modules/`) in a browser and inspecting the real API and
the real rendered DOM, not from release notes.

---

## 1. Where the dependencies stand

| Library | Vendored | Released | Current | Licence |
|---|---|---|---|---|
| Plotly.js | **1.39.4** | mid-2018 | 3.x | MIT |
| Flickity | **2.1.2** | 2018 | 3.x | **GPLv3 or commercial** |
| noUiSlider | **10.0.0** | 2017 | 15.x | MIT |
| Open Sans / Montserrat CSS | Google Fonts v15/v12 | 2018 | — | OFL |

Three things worth knowing before planning:

**Flickity's licence conflicts with this project's.** The bundled
`flickity.pkgd.min.js` header states it is "Licensed GPLv3 for open source use or Flickity
Commercial License for commercial use", while `LICENSE` at the repository root is MIT.
Redistributing the two together under MIT is not something the Flickity licence permits.
This is a pre-existing issue, not something the refactor introduced, but it is the one item
on this page with consequences outside the code.

**The "local" font CSS is not local.** `opensans.css` and `montserrat.css` look like
self-hosted copies — the Google Fonts `<link>` tags in the HTML are commented out — but
every `@font-face` inside them still points at `fonts.gstatic.com`. The app therefore
still calls out to Google on load and does not render correctly offline. Downloading the
`.woff2` files and rewriting the URLs is about twenty minutes of work and removes the last
external dependency.

**Plotly 1.39.4 is 2.8 MB**, roughly 60 % of everything the page downloads. A custom
partial bundle (`plotly.js-dist-min` ships several) containing only the scatter trace type
is around 1 MB.

---

## 2. What actually breaks under Plotly 2/3

Verified against 2.35.3 in the browser. The picture is much narrower than it looks:

**Two hard blockers.**

- `Plotly.plot` is **removed** (`typeof Plotly.plot === "undefined"`). The app relies on a
  specific behaviour of it: calling `Plotly.plot` on a div that already has a plot
  *appends* a trace, which is how successive model runs stack up in the figures. The
  replacement is `Plotly.newPlot` when the figure is empty and `Plotly.addTraces` (plus
  `Plotly.relayout` for the layout half) when it is not. `addTraces` was confirmed to
  append. After the refactor this is **two call sites** — the `draw` helper in
  `js/figures.js` and the start-up dummy plot in `js/main.js` — rather than the fifteen
  scattered ones it used to be.

- `Plotly.d3` is **removed entirely** (`undefined`; no `.behavior`, no `.selectAll`).
  Plotly 1.x re-exported its bundled d3 **v3**, and the whole breakpoint-dragging mechanism
  is built on `Plotly.d3.behavior.drag()` — an API that no longer exists in modern d3
  either, where it is `d3.drag()`. This is the real work. It is confined to
  `startDragBehavior()` in `js/handles.js`, about 70 lines.

**Everything else survives**, which I expected to be the bigger problem and it is not.
All of these were confirmed working in 2.35.3:

- `_fullLayout`, and `xaxis.p2l` / `l2p` / `_offset` — the pixel↔year conversions the drag
  code needs. A `p2l(l2p(2050))` round trip was exact.
- The private DOM the code selects into: `.scatterlayer .trace:nth-of-type(3) g path`
  still yields one `<path>` per marker; `.gtitle`, `.gtitle .line`, `<sub>`/`<br>` in
  titles, `.modebar-btn`, `[data-title="Autoscale"]` and the `js-plotly-plot` class are all
  unchanged.
- `restyle`, `relayout`, `update`, `purge`, `deleteTraces`, `colorway`.

### Recommendation for the drag layer

Rather than adding `d3-drag` as a new dependency and rewriting to the modern d3 API, **drop
d3 and use Pointer Events**. It is roughly the same amount of code, removes a dependency
instead of replacing one, works identically under any Plotly version, and unifies mouse
and touch through one code path. It would also let the drag state live in a closure rather
than being reconstructed from the marker's `transform` attribute on every `dragstart`.

There is a plausible bonus. `BUGS.md` #10 — "dragging the breakpoints may sometimes stop
working", the bug the *Fix* button exists to work around — is most likely caused by the
`dragend` handler rebinding only `path:last-of-type` while the initial binding covers all
`path` elements. I could not reproduce it with synthetic events, so I would not claim the
rewrite fixes it, but owning the event handling makes the failure mode impossible by
construction.

**Update:** all ten entries in `BUGS.md` have since been addressed, including #10, whose
`dragend` handler now rebinds every marker rather than only the last. The *Fix* button and
its bug note have been removed. That does not change the case for Pointer Events — it is
still the way off `Plotly.d3` — but it is no longer carrying a suspected bug fix with it.

---

## 3. Suggested order

1. ~~**Fix the bugs** in `BUGS.md`.~~ **Done** — ten commits, one per entry, each checked
   with the harness. Seven scenarios used to crash; none do now. One design question is
   left open under #9: whether the pinned 2025 breakpoint should be draggable at all.
2. **Self-host the fonts.** Independent of everything else, removes the external call.
3. **Replace the d3 drag with Pointer Events**, still on Plotly 1.39.4. Isolating this from
   the version bump is the whole point: if the drag breaks, you know why.
4. **Move to Plotly 3.x**, which is then just the `Plotly.plot` → `newPlot`/`addTraces`
   change plus a look at the figures. Consider a partial bundle at the same time.
5. **noUiSlider 15.** Left late deliberately: the API migration is small, but `styles.css`
   carries ~80 lines of custom `.noUi-*` styling, and v15 changed how handles are
   positioned internally. This is a visual-regression job, and the harness does not compare
   pixels — it needs a human looking at the sliders.
6. **Flickity**: decide the licence question first. If it needs to go, the carousel is one
   of the easier things to replace — a scroll container with CSS scroll-snap plus the two
   arrow buttons covers what this app uses (`select` event, `selectedIndex`, `previous`,
   `next`, `insert`, `remove`).

Run the harness (`ui/test/README.md`) after each step. Step 4 is the one where it earns
its keep.

---

## 4. Svelte, or stay with vanilla JS?

**Recommendation: stay vanilla, and revisit only if the UI grows.**

There is already a half-finished Svelte 4 + Vite 5 experiment in `node_modules/` and two
commits adding Svelte `.gitignore` entries, so this has been considered before and set
aside. I think that was the right call, for reasons specific to this app rather than any
general view about frameworks.

**What Svelte would genuinely improve.** The settings panel, the input panel and the
model-run log are ordinary declarative UI. The log in particular — rows with hidden and
active states, colour swatches, add and delete — is textbook component work, and
`js/runLog.js` plus its share of `js/main.js` would shrink noticeably. `state.js` is a
mutable object that everything reaches into; a Svelte store would give change propagation
for free instead of the current discipline of calling `updateFigures()` in the right
places. That discipline is exactly where bugs #1 and #5 come from.

**Why it still does not pay here.**

- The hard part of this app is Plotly interop, and Svelte does not help with it. Plotly
  owns its DOM subtree imperatively. In Svelte you would still write the same
  `Plotly.newPlot` / `restyle` / `deleteTraces` calls, just inside `onMount` and behind
  `bind:this`. Roughly two thirds of the JavaScript here is that layer.
- The single most delicate piece — dragging breakpoints by reaching into Plotly's internal
  SVG and converting pixels to years — is irreducibly imperative. A framework can only sit
  next to it.
- Adopting Svelte means adopting a build step. Today `staticfiles(joinpath(..., "ui"))`
  serves the source files directly: edit, reload, done. After Svelte, every change needs
  `npm run build` before the Julia server sees it, and the deployment story for anyone
  cloning the repo grows an npm install. For a teaching and research tool with one
  maintainer that is a real, recurring cost against a one-time saving.
- Scale does not justify it. This is about 1,300 lines of application code on one screen.

**What I would do instead**, if the state discipline starts to hurt: keep vanilla modules
and put a small subscribe/notify wrapper around `state.js`, so that mutating scenario or
region state notifies the figures rather than every call site remembering to. That is
perhaps 30 lines and captures most of what the store would have given you.

**If the answer changes** — a second screen, a scenario comparison view, user accounts —
then Svelte becomes worth it, and the refactor just finished is the right starting point:
the modules are already the shape Vite wants, `state.js` is already the store's contents,
and the Plotly-touching code is already separated from the control code. The natural
boundary would be Svelte for the panels and the log, plain modules for the figures and the
drag layer.

One clarification, since it is easy to conflate: **ES modules and a bundler are separate
decisions.** The app now uses modules natively, with no build step, which is why nothing
had to be installed. Adding Vite later is an independent choice, and would mainly buy
dependency management for Plotly and noUiSlider rather than vendored files in the repo.

---

## 5. Smaller things noticed in passing

- `ui/RCPscenarios.js` is 70,470 lines and about 2.4 MB, and is not referenced by
  anything — not the HTML, not the JavaScript, not the Julia code. It is generated by
  `src/historicdata.jl`. It costs nothing at runtime since it is never loaded, but it is
  worth deciding whether to keep it.
- `README.md` still tells the user to open `/static/UI_layout.html`; the server prints
  `/ClimateCalculator.html`. Fixed on this branch.
- The Julia environment does not currently start: `MbedTLS_jll` is missing from the
  manifest, so `HTTP` and `Oxygen` fail to precompile under Julia 1.12. This predates the
  refactor and needs `Pkg.resolve()` / `Pkg.instantiate()`, which was out of scope here.
  The UI changes were verified against a local Node server instead. Module loading needs
  `.js` to be served as `text/javascript`; Oxygen's `file()` derives that from MIMEs.jl,
  whose database maps `js` to `text/javascript`, so serving modules from the Julia side
  should work — but it has not been run end to end.
