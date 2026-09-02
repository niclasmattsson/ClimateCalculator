# Proposed improvements — functionality and presentation

Written August 2026, after the ten `ui/BUGS.md` fixes landed. Every file reference was
checked against the current tree; every measurement was taken from the running app or from
the data in the repository. **Item 1.2 has since been applied** (September 2026); nothing
else here has.

This document is deliberately narrow. Three neighbouring concerns are covered elsewhere and
are not repeated:

| Document | Covers |
|---|---|
| `ui/BUGS.md` | the ten defects found during the refactor — all now fixed |
| `ui/NEXT-STEPS.md` | dependency versions, Plotly 3 migration, Pointer Events, Flickity's licence, self-hosting fonts, the unreferenced `RCPscenarios.js`, Svelte |
| `REBASELINE-2023.md` | moving the model's initial condition, calibration and hand-off year from 2010 to 2023 |

What follows is everything else worth doing, in the order I would do it.

---

## Priorities at a glance

| # | Item | Size | Depends on |
|---|---|---|---|
| 1.1 | Editable CH4, N2O and land-use CO2 | M | — |
| 1.2 | ~~Return and plot what the model already computes~~ **done** | M | — |
| 1.3 | Observations on the temperature and concentration charts | S | helped by rebaseline |
| 1.4 | Make net-negative emissions drawable | S | — |
| 1.5 | Peak warming, net-zero year, threshold guides | S | — |
| 1.6 | Climate-sensitivity ensemble in one click | M | 1.5 |
| 1.7 | Feedback and error handling around the run | S | — |
| 1.8 | Save, share, export | M | — |
| 1.9 | Settings the backend can honour | S | — |
| 1.10 | `startserver` ergonomics | S | — |
| 2.1 | Responsive layout | M | — |
| 2.2 | Touch support | S | NEXT-STEPS step 3 |
| 2.3 | Document head: title, favicon, lang, viewport | XS | — |
| 2.4 | Name the traces | S | — |
| 2.5 | In-app help and model documentation | M | — |
| 3.1 | Run the model in the browser | L | — |
| 3.2 | A test suite for the model | M | — |

**If only five:** 1.2, 1.4, 1.5, 2.1, 2.3. Together they are perhaps two days of work and
they change what the tool feels like more than anything else on the list.

---

## 1. Functionality

### 1.1 Let users edit CH4, N2O and land-use CO2

Advanced mode renders four buttons under the heading *Greenhouse gas* —
`Fossil CO2`, `Other CO2`, `CH4`, `N2O` (`ui/ClimateCalculator.html:130`). None of them has an
event listener; `grep` for `advancedUI` finds only display toggling. They are dead controls
that promise a feature, and the README promises it too ("in a future version").

The gap is smaller than it looks. `/runccc` already accepts all four series
(`src/webserver.jl:28-31`), and the interpolation, handle and figure code is gas-agnostic —
what is hardcoded is the string `"FossilCO2"` in `updateEditEmissionsFromHandles()` and
`updateHandlesFromEmissions()` (`ui/js/handles.js`) and in `plotEditEmissions()`
(`ui/js/figures.js`). Introducing `state.currentGas` alongside `state.currentRegion`, and
storing handles per (region, gas) rather than per region, is the shape of the change.

Two things to decide: whether the trash/spawn semantics carry over unchanged for gases whose
units and magnitudes differ by three orders of magnitude, and whether the base-scenario lock
(`Lock CO2 emissions`) grows a per-gas equivalent.

*Size: medium. This is the largest gap between what the interface implies and what it does.*

### 1.2 Return and plot what the model already computes — *done, September 2026*

`readresults()` (`src/webserver.jl:6-19`) keeps `Temp_global`, three concentrations, and echoes
back the emissions it was handed. Everything else in `ClimateState` is computed every timestep
and thrown away at the HTTP boundary:

| Discarded | What it would show |
|---|---|
| `NetFluxOcean`, `DeltaDIC`, `DeltaDICbox` | the ocean carbon sink |
| `NetFluxBiosphere`, `BioReservoir` | the land carbon sink |
| `RadiativeForcing[:CO2 :CH4 :N2O :H2O :O3]`, `TotalRadiativeForcing` | forcing by component |
| `Temp_land`, `Temp[1..50]` | land vs. ocean warming, ocean heat uptake |

Two figures follow almost for free:

- **Where the carbon goes** — airborne fraction, ocean sink, land sink, as a share of
  emissions. This is the model's whole carbon-cycle story in one chart, and it is exactly what
  `CCCsimple.png` and `CCCfull.png` illustrate on paper.
- **Radiative forcing by component** — CO2, CH4, N2O, H2O, O3, aerosols, other. This makes the
  non-CO2 gases visible, which in turn makes 1.1 worth using.

Validation data for the first one is already in the repository: the ocean and land sink columns
of `SSP/Global_Carbon_Budget_2024_v1.0.xlsx`, 1959–2023 (see `REBASELINE-2023.md` §3, D7).

The cost is a wider JSON response and two more carousel entries. For a teaching tool this is
the difference between a black box and a model you can look inside.

*Size: medium, mostly on the Julia side.*

**As built.** `readresults()` now also returns `carbonsinks` (total CO2 emissions split into
atmosphere, ocean and land, all in GtCO2/year) and `forcing` (the five modelled gases plus
aerosols, other and the total, in W/m2). Two carousel figures sit immediately to the right
of the temperature figure, *Carbon sinks* and *Radiative forcing*. Both are stacked areas
with the legend inside the plot: in each the components add up to a total the model also
reports, so a band's width is one part and the line drawn with them is the whole.
The sinks are light blue, dark blue and green (atmosphere, ocean, land) and the years before
the pathway starts carry the observed carbon budget in the same three bands, paler; both
stacks split at the axis, the components that are positive in a year piling up from it and
the negative ones hanging below, so that where a run has both the total line runs inside the
stack, where the two halves net out. That is the aerosol term throughout the forcing figure,
and the atmosphere in the sinks figure once a pathway reaches net zero and the sinks start
drawing carbon back out of it. Unlike every other figure these show one run at a time --
half a dozen component curves per run would be unreadable overlaid -- so they follow
whichever row is active in the run log, and the log's trace bookkeeping skips them. The land
vs. ocean warming split under `Temp_land` and `Temp[1..50]` was left alone.

### 1.3 Put observations on the temperature and concentration charts

The emissions figure draws the observed history as a thin black curve
(`historyTrace` in `ui/js/plotConfig.js`). The temperature and the three concentration figures
draw a single trace starting at `firstYear` and nothing else — even though the model integrates
from 1765 and the server already holds `histTempGISS` and `conc_RCP`.

Plotting from ~1900 with observations overlaid answers "does this thing match reality?" before
anyone is asked to trust a projection. It also makes the calibration visible instead of
implicit.

This pairs naturally with `REBASELINE-2023.md`, which has to source current observation series
anyway — but it is worth doing even against the 2010-vintage data.

*Size: small once the server returns the longer slice.*

### 1.4 Make net-negative emissions drawable

`autoScale()` sets the y-range to `[min(0, min(y)) * 1.1, max(y) * 1.1]`
(`ui/js/figures.js:223-224`), and the drag handler clamps to that range
(`ui/js/handles.js:205`). For any pathway that has not already gone negative, the floor is
exactly zero, and the only way past it is the message *"To go below zero or above the current
max, first change the scale by dragging the y-axis."*

Net-negative emissions are the central question in every 1.5 °C pathway, and the interface
actively resists drawing one. Either give the editable axis fixed headroom (say −20 to
+60 GtCO2) or expand the range automatically when a handle reaches the edge — the second is
friendlier and is about ten lines in the `drag` handler.

*Size: small. Highest ratio of pedagogical value to effort on this list.*

### 1.5 Peak warming, net-zero year, and threshold guides

The run log's last column is temperature at `lastYear` (`ui/js/api.js:43-44`). For an overshoot
pathway — precisely what the breakpoint editor is good at drawing — the 2100 value understates
what the scenario does. Add **peak warming and its year**, and the **year emissions reach net
zero** (already derivable from the series `logEmissions()` walks).

On the temperature chart, horizontal guides at 1.5 °C and 2 °C via `layout.shapes` cost ten
lines and give every curve an instant frame of reference.

*Size: small.*

### 1.6 Climate sensitivity ensemble in one click

Today climate sensitivity is a slider you move and re-run, producing separate log rows. A
*show likely range* button that runs CS ∈ {2, 3, 5} and shades the band between them
communicates far more than three unrelated curves, and it matches how the IPCC states results.
The model is fast enough after the first call, and the run log already supports multiple
concurrent traces.

Worth pairing with an annotation of what the range means (AR6 assessed *likely* range 2.5–4 °C,
*very likely* 2–5 °C) so the numbers on the slider have provenance.

*Size: medium — mostly log and figure bookkeeping, not new physics.*

### 1.7 Feedback and error handling around the run

`submitEmissions()` (`ui/js/api.js`) fires an XHR and does nothing visible until it returns. The
README apologises that the first run takes 5–10 seconds. During that time the button stays
enabled, so a second click starts a second run.

The handler also calls `JSON.parse(xhr.responseText)` without checking `xhr.status`, so any
Julia-side exception — a `BoundsError` from 1.9 below, say — surfaces as a JSON parse error with
the real message buried in the response body.

Three small things: disable the button and show a spinner while in flight; branch on
`xhr.status`; and on the Julia side wrap the handler so failures return a real status code and
a readable message instead of a stack trace. (Modernising XHR to `fetch` is optional and
unrelated.)

*Size: small.*

### 1.8 Save, share, export

There is no permalink, no scenario save/load, and no data export — and `"toImage"` is explicitly
removed from the modebar (`ui/js/plotConfig.js:47`), so a student cannot even get a chart into a
report.

In rough order of value per effort: re-enable PNG export; encode the breakpoint list in the URL
hash so a pathway can be pasted into a message; add CSV download of the current run's series.
The first is deleting one string.

*Size: medium overall, extra-small for the first step.*

### 1.9 Settings the backend can honour

The year-selection slider offers ranges the rest of the system cannot serve:

- **Above 2100.** The slider reaches 2500, but `webserver.jl:33` calls `solveclimate` without
  `lastyear`, so it defaults to 2100 (`src/climate.jl:22`) while `readresults` indexes
  `iyear(firstyear):iyear(lastyear)` — out of bounds for any later end year.
- **Below 2005.** The scenario-start handle reaches 1960, but `getSSP` slices
  `firstYear - 2005` (`ui/js/sspData.js:17`), which goes negative below 2005.

Either pass the years through to the model and clamp the slider to what is supported, or bound
the slider at 2005–2100. Right now both ends of a visible control are traps.

*Size: small.*

### 1.10 `startserver` ergonomics

`startserver()` hardcodes port 8000 and prints a URL without opening it. More importantly it
calls `printresults()` on **every** POST (`src/webserver.jl:34`), dumping five matrices to the
REPL inside the request path.

`startserver(; port=8000, open=true, verbose=false)` is a few lines and makes the tool
noticeably nicer to run.

*Size: small.*

---

## 2. Presentation

### 2.1 Responsive layout

Everything is fixed pixels. Figures are `430px × 571px` (`ui/styles.css`), the sliders are
300 px and 410 px, `#inputdata` has fixed margins, `#ghostfigure` carries hardcoded
`width: 1085px; height: 817px`. There is **no `@media` rule anywhere** and no viewport meta tag.

That is why the README has to instruct the reader: *"Resize the text using your browser's zoom
feature … so that three graph boxes fit completely."* Asking the user to zoom the browser to make
the layout work is the single most visible rough edge in the app.

Measured at 1600 × 1000 the page happens to fit exactly (document height 1000 px, three figures
across). At any other size it does not. CSS grid with `clamp()` on the figure dimensions plus two
or three breakpoints would delete that README paragraph.

*Size: medium. Touches `styles.css` broadly but almost no JavaScript.*

### 2.2 Touch support

The drag layer is d3 v3 `behavior.drag()` on mouse events, so breakpoints cannot be dragged on a
tablet — which is where a lecture demo often lives. `ui/NEXT-STEPS.md` step 3 already recommends
replacing it with Pointer Events for migration reasons; touch support is the user-visible payoff
and worth stating as part of the case.

*Size: small, as a rider on work already planned.*

### 2.3 Document head

`ui/ClimateCalculator.html` has no `<title>` (the browser tab reads
`localhost:8000/ClimateCalculator.html`), no favicon, no `lang` attribute on `<html>`, and no
`<meta name="viewport">`. The last one means a phone renders the desktop layout scaled down.

*Size: extra-small. Four lines.*

### 2.4 Name the traces

Every trace is created with `name: ""` and `showlegend: false`, so runs are distinguished only
by matching a colour swatch in the log against a line in the chart. Letting a run carry a label —
auto-generated ("SSP2-45, CS 3.0") and optionally editable — and putting that label in the hover
would make an exported figure readable on its own. Prerequisite for 1.8 being useful.

*Size: small.*

### 2.5 In-app help and model documentation

There is no in-app explanation of anything. Specifically:

- `CCCsimple.png` and `CCCfull.png` are good diagrams sitting in the repository, referenced only
  from the README on GitHub.
- The snap modifiers in the drag handler — Ctrl for 0.1, Shift for 5 (`ui/js/handles.js:213`) —
  are discoverable only by reading the source.
- Nothing states the units, the calibration, the provenance of the SSP scenarios, or what a
  simple climate model can and cannot tell you.
- `README.md` still says model documentation is "To do".

An *About / How it works* panel behind the cogwheel, carrying those two diagrams, a units table,
the keyboard shortcuts and a short statement of assumptions, needs no new machinery — the
settings panel is already a slide-in overlay.

*Size: medium, mostly writing rather than code.*

### 2.6 Page weight

Measured, for what the page actually loads:

| File | Bytes |
|---|---|
| `plotly-latest.min.js` | 2 790 110 |
| `SSPscenarios.js` | 514 692 |
| `flickity.pkgd.min.js` | 55 255 |
| `nouislider.min.js` | 21 186 |
| `ui/js/*.js` (all modules) | 69 949 |
| everything else (CSS, data) | ~30 000 |
| **total** | **~3.5 MB** |

Plotly alone is 80 %. A partial bundle with only the scatter trace type is around 1 MB —
`ui/NEXT-STEPS.md` step 4 already proposes this; noted here only so the number is on record.
The unreferenced 2.2 MB `RCPscenarios.js` is not loaded and is covered there too.

*Size: covered elsewhere.*

---

## 3. Bigger questions

### 3.1 Run the model in the browser

Every user needs a working Julia installation. The physics is a few hundred lines of explicit
Euler stepping plus two one-dimensional optimisations, and the historical spin-up is already
precomputed into a cache. Porting `solveclimate` to JavaScript — or compiling it to WebAssembly —
would make the whole thing a static page anyone can open, hostable on GitHub Pages, with no
install and no server.

It would also change how the tool feels: the model could run on every drag instead of on a
button press, turning the emissions editor into a live instrument.

The argument against is real: the Julia model is also the research artifact, and a port means
maintaining two implementations that must agree. If the audience is students, I would take the
port seriously and treat the Julia version as the reference implementation with a cross-check
test. If the audience is colleagues who already run Julia, keep the server and ship a
`PackageCompiler` image instead.

*Size: large. Worth a decision before it is worth an estimate.*

### 3.2 A test suite for the model

There is no `test/`, no `runtests.jl`, and no `[extras]`/`[targets]` in `Project.toml`. The
calibration cache is a binary blob regenerated by hand.

Physical assertions — TCRE, historical warming, present-day concentrations, airborne fraction —
plus a stored-results regression would keep a future recalibration from drifting silently. This
matters most alongside `REBASELINE-2023.md`, which changes the calibration deliberately and needs
a way to distinguish intended change from accident. The acceptance table in §7 of that document
is the natural starting content.

*Size: medium.*

---

## 4. Looked at, and would leave alone

- **The Flickity carousel and the checkbox-based zoom.** Idiosyncratic, but they work, they are
  keyboard-accessible, and the licence question is already tracked in `ui/NEXT-STEPS.md`.
- **The harmonization factor slider.** Obscure, but it exposes a genuine modelling choice and
  the settings panel is the right place for it. Better documentation (2.5), not removal.
- **`SHOW_SSP_INSTEAD_OF_HISTORY`.** A design-time switch with no UI. Fine as is.
- **The `hiddendummy` spacer in the region column.** A layout hack that would disappear on its
  own under 2.1.
- **`printresults`' REPL output format.** Useful when driving the model from the REPL; the
  problem is only that the web handler calls it (1.10).
