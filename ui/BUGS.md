# Known bugs in the web interface

Found while refactoring the UI in August 2026. All of these exist in the pre-refactor
code as well — the refactor deliberately preserved them so that the change could be
verified as behaviour-preserving. Numbers are referenced from `NOTE:` comments in the
source.

Severity: **A** = crashes or corrupts state, **B** = wrong numbers shown, **C** = cosmetic.

**All ten are now addressed** (see the per-entry notes), one commit each, each verified with
the harness in `test/`. One design question is deliberately left open under #9.

---

## 1. (A) Two model runs in a row leave a log row with no emissions attached — FIXED

Each row of the "Model runs" table carries the emission path that produced it, as
`row.emissions`. `addRowToLog()` (js/runLog.js) copies the previous row's *HTML* into the
new row but not that property; `logEmissions()` is what fills it in.

Every caller pairs the two except `submitEmissions()` (js/api.js), which calls
`addRowToLog()` on its own.

**Reproduce:** click *RUN MODEL*, then click *RUN MODEL* again without editing anything.
The new top row has no `emissions`. Now click that row.

**Result:** `activateRow()` throws `"undefined" is not valid JSON` (via `cloneObject`).
Anything that calls `refreshAllEmissionFigures()` — moving the year slider, or switching
region — throws too.

**Fixed** by making `addRowToLog()` carry the snapshot over, rather than by calling
`logEmissions()` in `submitEmissions()`. `addRowToLog()` duplicates a row; it should
duplicate all of it, and that keeps the function correct for every caller instead of
relying on each one to remember. The snapshot is cloned rather than shared so that two
rows never alias the same object.

---

## 2. (A) Reducing the number of regions crashes if a high-numbered region is selected — FIXED

`updateRegionButtons(clickedRegionButton)` resets `state.currentRegionNumber` to 0 only
when called with no argument. It is also registered directly as the `change` handler of
the region-count menu, so it receives an `Event` — truthy — and keeps the old index.

**Reproduce:** advanced mode → *Number of regions* = `3 (OECD, Asia and ROW)` → click the
**ROW** button → set *Number of regions* back to `2 (OECD and non-OECD)`.

**Result:** the 2-region layout has no index 3, so `state.currentRegion` becomes
`undefined` and the next `state.handles[undefined]` access throws.

**Fixed** by clamping the index to the new layout, and by registering the menu handler as
`() => updateRegionButtons(true)` so that the behaviour is chosen rather than inherited
from a truthy `Event`. The parameter is now called `keepSelection`, which is what it
actually means.

Clamping keeps the existing "hold on to the selection" behaviour and changes only the case
that used to crash: going 3 → 2 regions from ROW now lands on OECD, and 3 → 1 lands on
Global. Resetting to Global on every count change was the alternative; clamping was chosen
because it disturbs the non-crashing cases less.

---

## 3. (A) "Clear hidden" crashes on figures that have not been plotted yet — FIXED

The handler calls `Plotly.deleteTraces()` on every figure in the carousel. The
concentration and temperature figures only exist after a model run.

**Reproduce (a):** load the page, change the base scenario, hide the log row by clicking
its colour swatch, click *Clear hidden*.
**Result:** `Plotly.deleteTraces` throws on the unplotted figures.

**Reproduce (b):** click *RUN MODEL*, hide the only row, click *Clear hidden*.
**Result:** the table is emptied, then `activateRow(rows[0])` throws on `undefined`. The
log is now empty and the next `logEmissions()` will fail as well.

**Fixed** by filtering the trace indices against each figure's actual trace count, which
covers both an unplotted figure and one that has been emptied by an earlier clear, and by
handling the empty-log case explicitly.

When every run was hidden, the log now restarts rather than being left empty: the
placeholder row comes back and the current emission path is redrawn as a single run. The
alternative — refusing to delete the last row — was rejected because the user asked for
all of them to go, and an empty log is a state the rest of the code cannot represent
(`logEmissions()` writes to `rows[0]`).

---

## 4. (B) The year-selection slider drops most of the x-axis configuration — FIXED

The slider's `set` handler replaces `baseLayout.xaxis` wholesale with an object holding
only `range` and `tick0`, discarding `dtick`, `ticks`, `ticklen`, `tickcolor`,
`fixedrange` and `hoverformat` that were set in js/plotConfig.js.

**Result:** after the first use of the slider, every subsequently drawn figure loses the
20-year tick spacing and the x-axis tick padding hack, and — because `fixedrange` is gone
— the x-axis becomes zoomable/pannable, which the design deliberately disabled.

**Fixed** by merging instead of replacing. The harness now records the whole x-axis
configuration rather than only its range, so a regression here would be caught.

---

## 5. (B) "CO2 emissions per capita" is computed two different ways — FIXED

- `plotIntensity()` (js/figures.js) uses `(FossilCO2 + OtherCO2) / Population`, taking the
  population from the current scenario.
- `updateFigures()` recomputes the same figure's last trace as `FossilCO2 / population`,
  fossil only, and with the population fetched fresh from the SSP database rather than
  from `state.emissions`.

The two disagree by about 22 % at 2010 under the default scenario (5.78 vs 4.74).
Because `updateFigures()` runs at the end of start-up, the global figure shows the
fossil-only number, while the *regional* per-capita figure in advanced mode shows the
fossil+other number — so the "Global" line there does not match the global figure.

**Fixed** by keeping `plotIntensity()`'s definition — total CO2, and the population from
the current scenario — and having `updateFigures()` call the same function instead of
recomputing. Fossil-plus-other was chosen because the figure is titled "CO2 emissions per
capita" without qualification, because the regional figure already used it, and because
`logEmissions()` counts cumulative emissions the same way.

---

## 6. (B) The cumulative-emissions column does not cover the years in its header — FIXED

The table header reads *"Cumulative CO2 emissions (2020-2100)"*, but `logEmissions()` sums
over the whole model range, `state.firstYear` to `state.lastYear` — 2010–2100 by default,
and whatever the year slider is set to otherwise.

**Fixed** by making the header state the range that is actually summed, rather than
summing a fixed 2020–2100. Hard-coding 2020 would break as soon as the year slider is set
past it, and the column would then quietly mean something different from its label again.
The end year is measured from the length of the emission series rather than taken from
`state.lastYear`, because the two can differ.

---

## 7. (C) The emission-history x-vector is one year too long — FIXED

`state.historicYears` is `range(backgroundDataStart, LAST_HISTORIC_YEAR + 1)` = 1959..2024
(66 values), but the data ends in 2023 (65 values). Plotly ignores the dangling 2024
x-value, so nothing is drawn wrong today, but the two arrays should line up.

**Fixed**: `range(backgroundDataStart, LAST_HISTORIC_YEAR)`. The x and y vectors of the history curve are now both 65 long, 1959–2023.

---

## 8. (C) The per-capita y-axis is labelled "Gton CO2/person/year" — FIXED

Emissions are in Gton CO2/year and population in billions of people, so the ratio is
**tons** CO2 per person per year — which is what the plotted values (~4.7) are. The label
is off by a factor of 10^9.

**Fixed**: relabelled to `ton CO<sub>2</sub>/person/year`, on both the global and the regional per-capita figure.

---

## 9. (C) The pinned 2025 breakpoint takes its value from 2020 — FIXED

In `updateHandlesFromEmissions()` (js/handles.js) the first breakpoint is placed at
`FIRST_BREAKPOINT.year` (2025) but its y-value is read at `handleyears[0]`, which is 2020
the first time a region's handles are built (from `DEFAULT_HANDLE_YEARS`).

For Global in basic mode this is harmless — the ratio `emis[i] / globalEmis[i]` is 1 and
the value is forced to 38 regardless. It does bite in advanced mode, where the branch uses
`emis[yr - firstYear]` directly and so puts the region's **2020** emissions at **2025**.

**Fixed** by reading the series at `FIRST_BREAKPOINT.year`. Global in basic mode is
unaffected, as expected — the ratio is 1 and the value is 38 either way. Switching to a
region moves the breakpoint: Non-OECD now starts at 16.6 rather than 14.9 GtCO2.

**Still open, and a design decision rather than a defect:** because this runs on every
rebuild, dragging the first breakpoint and then changing the base scenario snaps it back to
2025 and 38 Gton. If 2025 emissions are meant to be known and not editable, the handle
should probably be `hidden` rather than draggable; if they are meant to be editable, the
pinning should not re-apply. Left alone pending your call.

---

## 10. (?) Dragging breakpoints sometimes stops working — MITIGATED, cause still unconfirmed

This is the bug the interface itself warns about, with the *Fix* button as a workaround.

The suspicious line is in `startDragBehavior()`'s `dragend` handler (js/handles.js), which
rebinds the drag behaviour to

```
.scatterlayer .trace:last-of-type .points path:last-of-type
```

— only the **last** marker element, whereas the initial binding uses `path` and covers all
of them. If Plotly ever replaces the marker elements rather than reusing them (which it
does when the number of points changes), every handle except the last would lose its drag
binding, and pressing *Fix* — which just calls `startDragBehavior()` again — would restore
them. That matches the reported symptom exactly.

I could **not** reproduce it with synthetic mouse events: across repeated drags, spawns
and deletions the elements were reused and all bindings survived. So treat this as a
strong hypothesis, not a diagnosis.

**Changed anyway:** the `dragend` handler now rebinds all markers, using the same selector
as the initial binding. Re-binding an element that is already bound is a no-op in d3, so
this cannot make anything worse, and it makes the "some handles lost their binding" failure
mode impossible by construction. The harness shows no behavioural difference across the
drag, spawn and delete scenarios.

The *Fix* button and the bug note in the interface were removed on the strength of that. If
the symptom ever comes back, the button was only `startDragBehavior()` and is trivial to
restore — but the report should then be treated as a fresh investigation, because this
explanation will have been ruled out.
