# Rebaselining the model from 2010 to 2023

Planned August 2026, **applied August 2026**. The plan as written is preserved below from §1
onwards; this section records what was actually done, what the numbers came out as, and what
was deliberately left alone. The companion documents are `ui/BUGS.md` and `ui/NEXT-STEPS.md`.

## What was applied

All seven stages. Every date that used to be a literal 2010 now derives from
`src/settings.jl`, which holds the base year, the calibration window, the temperature
baseline, the observation splice years, the blend lengths and the cache grid.

| Decision | Chosen | Where it is configured |
|---|---|---|
| D1 base year | 2023 | `BASEYEAR` |
| D2 non-CO2 history | concentration-driven, boxes inverted | `inverseemissions` in `src/concentrations.jl` |
| D3 calibration window | 1960-2023 | `CALIBRATIONYEARS` |
| D4 temperature baseline | 1850-1900, data-derived | `BASELINEYEARS`, `TEMPSERIES` |
| D5 cache grid | `[1800:10:2020; 2023]` | `CACHEYEARS` |
| D6 SSP harmonization | multiplicative, fading to 1 by 2050 | `HARMONIZATION_END_YEAR` in `ui/js/settings.js` |
| D7 `FIRST_BREAKPOINT` | removed | - |

Data (D1-D4 of §3) is downloaded by `importobservations()` into `AnnualTemperatures.dat`
(GISTEMP v4, HadCRUT5, NOAAGlobalTemp, 1850-2025, each on its published baseline) and
`AnnualConcentrations.dat` (NOAA GML global annual means). `importGlobalCarbonProject(2024)`
now also writes `GlobalCarbonBudget.dat`. D5 and D6 were not needed: the RCP record is
observation-based back to 2005, and inverting the concentration boxes removes the need for a
CH4/N2O emission inventory.

Three things beyond the plan turned out to be necessary:

- **The reported temperature had to move too.** Calibrating against an 1850-1900 baseline
  while reporting warming since the model's 1765 initial state would have overstated warming
  by the difference (0.083 °C). `ClimateParams` gained a `tempbaseline` field, cached
  alongside the calibration coefficients, and the web interface now receives warming since
  1850-1900 - which is what its axis label already claimed.
- **The web endpoint ignored the year range it was sent.** `solveclimate` was called without
  `firstyear`/`lastyear`, so it always used the defaults. Harmless while the default matched
  the interface; not harmless once the year slider can disagree with the base year.
- **A non-default feedback parameter silently kept the cached state.** `getparams` skipped the
  cached *calibration* when `oceantempfeedback`, `bioQ10factor` or `equilibriumCO2` differed
  from the values the cache was built with, but `initclimate` still read the cached *state*.
  The cache is now switched off wholesale in that case.

## Where the numbers landed

Fitted at a climate sensitivity of 3 °C: aerosol factor **1.134** (was 1.450), fertilization
**0.735** (was 0.605). The aerosol factor moving is the missing CH4 forcing being handed back,
exactly as §9 predicted.

| Acceptance check (§7) | Target | Model | |
|---|---|---|---|
| CO2 2023 | 419.4 ppm | 421.5 | +2.1 ppm |
| CH4 2023 | 1921.4 ppb | 1920.8 | inverted, exact by construction |
| N2O 2023 | 336.7 ppb | 336.7 | ditto |
| Warming 2011-2020 vs 1850-1900 | 1.09 °C (AR6) | 1.09 | |
| Warming 2023 vs 1850-1900 | 1.45 °C (WMO) | 1.30 | 2023 was an ENSO year the model cannot make |
| Ocean sink 2014-2023 | 2.87 GtC/yr (GCB) | 3.02 | +5 % |
| Land sink 2014-2023 | 3.19 GtC/yr (GCB) | 2.79 | -12 % |
| TCRE | 1.0-2.3 °C/1000 PgC (AR6) | 1.76 | 1 %/yr ramp 2023-2100 |
| Aerosol ERF 2023 | -2.0 to -0.6 W/m² (AR6) | -0.92 | |

These are `test/runtests.jl`, together with a stored-results regression and a check that the
cached history is indistinguishable from integrating from 1765. `Pkg.test()` runs them.

The remaining +2.1 ppm of CO2 is the one residual worth naming. With a single free parameter
the carbon cycle cannot fit 64 years exactly; the fit is 0.4 ppm low in 1960 and 2.1 ppm high
in 2023, i.e. the modelled sinks grow slightly too slowly. That is a model-structure result,
not a calibration failure, and it is now visible instead of hidden behind a three-year window.

## The open questions of §10, answered

1. **The SSP N2O conversion is correct.** The database's unit column says `kt N2O/yr`, so
   `28/44/1000` gives Mt N. The 30 % step at the old hand-off was a real disagreement between
   the SSP inventory and the observed record, not a unit error: the inverted 2023 emissions
   are 7.81 Mt N of anthropogenic N2O against about 5.5 in SSP2. Harmonization now removes it.
2. **`landuserange` is right.** `C23:C87` is the land-use change column, rows 1959-2023, and
   the 0.989 GtC it yields for 2023 is what the GCB 2024 sheet publishes. The ~1.1 GtC in the
   original draft was from memory.
3. **Solar forcing stays constant after the base year** at the cycle average, so projections
   carry no spurious 11-year wiggle. The cut-off moved from 2010 to the base year, so the real
   solar cycle is now used through 2023. `CONSTANTSOLARRF = false` uses the RCP projection.
4. **Base year 2023**, as recommended. The observations reach 2025 and the temperature record
   is stored to 2025; only the hand-off is at 2023, where the Global Carbon Budget ends.
5. **Harmonization ramp to 2050.**

## Deliberately not done

- **`rcp = "RCP3PD"` in `src/webserver.jl` still selects the aerosol and other-gas forcing
  after the base year.** With the history now observation-driven this only affects the future,
  where it is a scenario choice rather than an error - but it is a strong-mitigation aerosol
  path applied to every run, including high-emission ones. Replacing the forcing basis is the
  larger AR6/RCMIP project §9 warns against.
- **The year slider still steps in decades** and can be dragged below the base year, which
  means designing years that have already happened. The default is now the base year; locking
  the slider is an interface decision, not part of the rebaseline.
- **2011-2020 is inside the calibration window**, so it is a consistency check rather than the
  independent one D3 imagined. Holding a decade out of a 64-year window buys little; the
  independent checks that matter are TCRE and the carbon sinks, neither of which is fitted.

---

*The rest of this document is the original plan, unchanged.*

---

## 0. What "rebaseline" means here

Three separate things are pinned to 2010 and would move together:

1. **The initial condition.** `cachedclimatehistory.jld` stores model state on a 1800:10:2010
   grid; a run starts by interpolating that state and integrating forward.
2. **The calibration.** The aerosol forcing factor and the CO2 fertilization factor are fitted
   against observations in a window ending 2010.
3. **The hand-off year.** The year at which prescribed history stops and the user's designed
   emission pathway begins — `state.firstYear` in the UI, `firstyear` in `solveclimate`.

Everything else (the 1765 spin-up, the physics, the SSP futures) stays as it is.

---

## 1. Why — the size of the gap, measured

### 1.1 The historical driver diverged from reality 20 years ago

The model's history is driven by `getscenario()`, which reads `RCP/RCP3PD_EMISSIONS.DAT`.
RCP emissions are observations only through 2005; after that they are a mitigation scenario.
The web endpoint hardcodes `rcp = "RCP3PD"` (`src/webserver.jl:26`), so this is the path every
interactive run takes.

Concentrations at 2023, read from the RCP files in this repository, against observations:

| | RCP3PD (used) | RCP8.5 | Observed 2023 † | RCP3PD error |
|---|---|---|---|---|
| CO2 (ppm) | 418.60 | 424.99 | ~419.3 | −0.7 (−0.2 %) |
| CH4 (ppb) | 1683.31 | 1982.67 | ~1922 | **−239 (−12.4 %)** |
| N2O (ppb) | 330.80 | 334.47 | ~336.7 | −5.9 (−1.8 %) |

† NOAA GML global annual means, from memory — **verify against the downloaded file before
using these as calibration targets.**

CO2 is close by luck: RCP3PD's optimistic fossil path is offset by its optimistic land-use
path. CH4 is not. Using the radiative forcing expressions in `src/radiativeforcing.jl`, a CH4
concentration 239 ppb low costs:

- direct CH4: `0.036 * (sqrt(1922) - sqrt(1683.3))` = 0.101 W/m²
- stratospheric H2O (15 % of CH4): 0.015 W/m²
- tropospheric O3: `0.042 * 5 * log(1922/1683.3)` = 0.028 W/m²

≈ **0.14 W/m² of forcing missing at the present day**, roughly 0.1 °C of equilibrium warming
at a climate sensitivity of 3 °C. Because `calibrateforcing!` fits the aerosol factor to
observed temperature, that missing forcing does not show up as a temperature error — it is
silently absorbed into the aerosol factor, which is then wrong in the other direction and
carried into every future projection.

### 1.2 The temperature record stops at 2010

`AnnualTemperatures.dat` covers 1880–2010 (GISS, HadCRUT3, NOAA). `src/calibrate.jl` fits over
`startcalibration = 2008` to `endcalibration = 2010` — a three-year window, 16 years stale. The
comment `# originally 1960` records that the window was narrowed at some point.

`src/historicdata.jl:163` applies a hardcoded `+ 0.25` offset to convert GISTEMP's 1951–1980
baseline to the model's preindustrial zero. That constant is undocumented and unverifiable
from the code.

### 1.3 The UI invites users to redesign the past

`state.firstYear = 2010`, so the draggable emission pathway starts in 2010 — while the black
observed-history curve on the same axes runs to 2023 (GCB 2024). The two can disagree by
construction. `FIRST_BREAKPOINT = { year: 2025, emissions: 38 }` in `ui/js/settings.js` is a
hand-placed patch over exactly this problem.

### 1.4 The non-CO2 hand-off is discontinuous

Before `firstyear` the model uses RCP3PD emissions; from `firstyear` it uses whatever the UI
sends, which comes from the SSP database. At the 2010 hand-off (MESSAGE-GLOBIOM):

| gas | RCP3PD 2010 | SSP2 2010 | jump |
|---|---|---|---|
| CH4 (Mt) | 336.6 | 325.8 | −3.2 % |
| N2O (Mt N) | 7.84 | 5.49 | **−30 %** |

The N2O step is large enough that it is probably a unit or inventory-definition mismatch
rather than a real disagreement — `readssp` in `src/historicdata.jl` applies `28/44/1000` to
the SSP N2O column. **Verify the SSP database's N2O unit before rebaselining**; if the factor
is wrong, that is a bug fix worth doing on its own account. With a 120-year lifetime, a step
change at the hand-off year propagates for the rest of the run.

---

## 2. Inventory: everything dated 2010

### Julia

| Location | Current | Role |
|---|---|---|
| `src/calibrate.jl:2-3` | `startcalibration = 2008`, `endcalibration = 2010` | fitting window for both calibrations |
| `src/cachehistory.jl:11` | `years = 1800:10:2010` | cache grid |
| `src/cachehistory.jl:32` | `lastyear=2010` | how far the cache precomputation runs |
| `src/climate.jl:3` | `div(firstyear-1800, 10) + 1` | cache slice index; assumes decadal grid from 1800 |
| `src/climate.jl:63` | `min(2010, 10*floor(...))` | clamps the cache entry point |
| `src/climate.jl:22,59` | `firstyear::Int=2010` | default hand-off year |
| `src/historicdata.jl:163` | `histTempGISS[iyear(1880):iyear(2010)] = ... .+ 0.25` | observed temperature, with baseline offset |
| `src/historicdata.jl:153` | solar RF held at `0.103756` after 2010 | the RCP files *do* carry solar RF to 2500; this replaces it with a constant |
| `src/scenario.jl:63` | `for g in GAS3, y in 2010:YEARS[end]` | where the REPL scenarios diverge (not used by the web path) |
| `src/webserver.jl:26` | `rcp = "RCP3PD"` | historical driver and non-CO2/aerosol forcing basis |
| `cachedclimatehistory.jld` | 22 decadal slices, 1800–2010 | regenerated by `makecalibrationcache()` |

### UI

| Location | Current | Notes |
|---|---|---|
| `ui/js/state.js:13,16` | `firstYear: 2010`, `years: range(2010, 2100)` | |
| `ui/js/main.js:178` | slider start `[2000, 2010, 2100]` | middle handle is the hand-off year |
| `ui/js/settings.js:6` | `FIRST_BREAKPOINT = {2025, 38}` | probably deleted once the base year is real |
| `ui/js/settings.js:15` | `DEFAULT_HANDLE_YEARS = [2020, 2030, 2050, 2070]` | first two land before/at the new base year |
| `ui/js/settings.js:12` | `LAST_HISTORIC_YEAR = 2023` | already current — this is the value everything else should meet |
| `ui/js/sspData.js:10-25` | SSP series start 2005 | fine for a 2023 base year; breaks below 2005 |
| `ui/ClimateCalculator.html` | log header "Cumulative CO2 emissions (2020-2100)" | see BUGS #6; the range becomes 2023–2100 |

---

## 3. Data to obtain

Nothing here is in the repository yet. All are small text files except where noted.

| # | Dataset | Purpose | Source | Notes |
|---|---|---|---|---|
| D1 | GISTEMP v4 annual global mean (LOTI) | extend `AnnualTemperatures.dat` | `data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv` | 1880–present, baseline 1951–1980 |
| D2 | HadCRUT5 annual global mean | replace the retired HadCRUT3 column | Met Office HadCRUT5 summary series | starts 1850, so it can define the 1850–1900 baseline directly |
| D3 | NOAAGlobalTemp annual | third column, as today | NCEI climate-at-a-glance | |
| D4 | NOAA GML global annual means: CO2, CH4, N2O | calibration targets, and inverse emissions (see decision D2) | `gml.noaa.gov/webdata/ccgg/trends/` | CO2 from 1979, CH4 from 1983, N2O from 2001 |
| D5 | CO2 concentration pre-1979 | joins D4 to the RCP historical record | Law Dome / NOAA merged product | probably unnecessary — RCP is observation-based to 2005 |
| D6 | CH4 / N2O emissions 2006–2023 | only if the emission-driven option is chosen | PRIMAP-hist or EDGAR | avoidable, see decision D2 |
| D7 | GCB 2024 ocean and land sink, 1959–2023 | validation of the carbon cycle | **already in the repo**, `SSP/Global_Carbon_Budget_2024_v1.0.xlsx` | same sheet the land-use column is read from |

Downloading these needs your go-ahead; nothing has been fetched.

**Also worth checking while in that spreadsheet:** the importer reads land use from range
`C23:C87` and the resulting 2023 value is 0.99 GtC (3.63 GtCO2), whereas GCB 2024 publishes
land-use change emissions of roughly 1.1 GtC (4.1 GtCO2) for 2023. That is a ~10 % gap and may
be a column or row-offset issue in `GCPfiledata[2024]` rather than a definitional difference.

---

## 4. Decisions to make before touching code

**D1 — Base year: 2023.**
Recommended. It is the last year with complete GCB emissions, and `LAST_HISTORIC_YEAR` is
already 2023. Choosing 2024 or 2025 buys one or two years of currency at the cost of waiting
for every dataset to catch up, and the hand-off then sits on incomplete data.

**D2 — Drive the historical non-CO2 gases by observed concentrations, not emissions.**
Recommended. CH4 and N2O are single-box exponential-decay models (`src/concentrations.jl`), so
given an observed concentration series you can invert them for the emissions that reproduce it
exactly. That means:

- no new emissions inventory to source (D6 drops out),
- historical CH4 and N2O concentrations match observations by construction,
- the discontinuity in §1.4 becomes explicit and can be ramped out rather than hidden.

The alternative — sourcing PRIMAP/EDGAR emissions and running the boxes forward — is more
conventional but leaves a residual concentration error that then contaminates the aerosol
calibration, which is precisely the failure mode being fixed.

CO2 must stay emission-driven: the carbon cycle is the thing being calibrated.

**D3 — Calibration window: 1960–2023, not 2008–2023.**
A three-year window pins an endpoint; it does not fit a trajectory. With one free parameter
(the aerosol factor) a long window is better conditioned and the residual is diagnostic. Keep
the 2011–2020 decadal mean *out* of the fit and use it as an independent check (§7).

**D4 — Drop the `+ 0.25` offset.**
Instead: convert the observation series to an 1850–1900 baseline using HadCRUT5 (which starts
in 1850), and compare against the model's own 1850–1900 mean. Both sides are then on the same
baseline, derived from data rather than a constant, and the comparison matches how IPCC AR6
states warming.

**D5 — Cache grid: `1800:10:2020`, plus an explicit node at the base year.**
The straightforward change is `years = 1800:10:2020` and `min(2020, ...)` in
`src/climate.jl:63`. But then a run with `firstyear = 2023` enters the cache at 2020 and
integrates 2020→2023 using whatever is in `annualemissions` — i.e. RCP3PD — reintroducing the
error being fixed, for three years.

Cleaner: append a node at 2023 (`[1800:10:2020; 2023]`) so the run starts exactly at the base
year with no bridging integration. Cost: `div(firstyear-1800, 10) + 1` in `src/climate.jl:3`
becomes a lookup into the grid vector. Small, and it removes a whole class of off-by-a-decade
questions.

**D6 — Harmonize the SSP futures to observed 2023.**
Measured (MESSAGE-GLOBIOM, interpolated to 2023 the way `interpolateSSP` does), GtCO2/yr:

| | fossil CO2 2023 | land-use CO2 2023 |
|---|---|---|
| observed (GCB 2024, this repo) | 37.64 | 3.63 |
| SSP2-Baseline | 38.03 | 4.85 |
| SSP2-45 | 36.84 | 5.35 |
| SSP2-26 | 34.15 | 3.95 |

Fossil is within ±9 %; land use is 9–47 % high. Without harmonization, selecting a scenario
makes the emission curve jump away from the observed history at the base year — visible on
screen, since both are drawn. The standard treatment is a multiplicative offset at the base
year decaying to 1 by ~2050. This is a modelling choice with a visible effect, so it deserves
a deliberate decision rather than a default.

**D7 — Retire `FIRST_BREAKPOINT`.**
Its whole job is to drag the 2010-based curve back to a plausible present-day value. With a
2023 base year and D6 applied it has nothing left to do, and removing it also resolves BUGS #9
and the "dragging the 2025 breakpoint then changing scenario snaps it back to 38" complaint.

---

## 5. Execution order

Each stage is independently checkable. Stages 1–4 are Julia-only and do not touch the files
the bug-fix session is working in.

**Stage 0 — prerequisite: make the environment instantiate.**
Julia 1.12.6 is on PATH, but per `ui/NEXT-STEPS.md` §5 the manifest is missing `MbedTLS_jll`
and `HTTP`/`Oxygen` fail to precompile. Nothing downstream — least of all regenerating the
cache — is possible until `Pkg.resolve()` / `Pkg.instantiate()` succeeds. This rewrites
`Manifest.toml`, so it wants its own commit.

**Stage 1 — ingest data (no model behaviour change).**
Extend `AnnualTemperatures.dat` to 2023/2024 with GISTEMP v4, HadCRUT5, NOAAGlobalTemp. Add
the NOAA concentration series as a new fixed-width file next to it. Verify by loading and
plotting; the model still runs on the old window and must produce bit-identical results.

**Stage 2 — observation-driven history.**
Splice GCB fossil + land-use CO2 over 1959–2023 into `getscenario()`, and derive CH4/N2O
emissions by inverting the concentration boxes (D2). Check: rerun with the *old* calibration
window and confirm the 2010 state barely moves — it should not, since 1765–2005 is unchanged.

**Stage 3 — recalibrate.**
Move the window to 1960–2023 (D3) and drop the `+0.25` offset in favour of a like-for-like
1850–1900 comparison (D4). Record the new aerosol and fertilization factors and the fit
residual. Expect the aerosol factor to change materially — it has been absorbing the missing
CH4 forcing from §1.1.

**Stage 4 — regenerate the cache.** See §6.

**Stage 5 — UI constants.** The table in §2, plus the log header. Cosmetic, mechanical, and
the only stage that collides with the bug-fix session.

**Stage 6 — SSP harmonization (D6).** Last, because it is the one change that alters what a
scenario means, and it should be evaluated against a model that is otherwise already correct.

---

## 6. Cache regeneration

`makecalibrationcache()` runs `solveclimate` for 19 values of lambda (0.2:0.1:2.0) at
`timestep = 0.001` from 1765, each with `usecache=false` — so each one also runs both
calibration optimizations. The result is spline-fitted in lambda and saved as
`cachedclimatehistory.jld` (75 state variables × spline coefficients × grid years).

Before starting: **time a single lambda.** The commented-out block in `src/cachehistory.jl`
claims "a minute or two" for the whole job, which is hard to believe at `timestep = 0.001` over
~245 000 steps × 19 lambdas × the calibration inner loops. If it turns out to be hours, run it
once, deliberately, rather than iterating on it.

Note also that `getparams` only uses the cached calibration coefficients when
`oceantempfeedback == 1.0 && bioQ10factor == 2.0 && equilibriumCO2 == 278.0`. Any change to
those defaults invalidates the cache silently — worth an assertion, and worth stamping the
`.jld` with the base year and a data-vintage string so a stale cache is detectable rather than
merely wrong.

Keep the current `cachedclimatehistory.jld` until the new one validates. It is 256 KB and
already committed.

---

## 7. Acceptance checks

Targets marked † are from memory and must be replaced with values read from the downloaded
sources before being used.

| Check | Target | Source |
|---|---|---|
| CO2 concentration 2023 | ~419.3 ppm † | NOAA GML |
| CH4 concentration 2023 | ~1922 ppb † | NOAA GML |
| N2O concentration 2023 | ~336.7 ppb † | NOAA GML |
| Warming 2011–2020 vs 1850–1900 (**not** in the fit) | ~1.09 °C † | IPCC AR6 WG1 SPM |
| Warming 2023 vs 1850–1900 | ~1.45 °C † | WMO |
| Ocean carbon sink, 2014–2023 mean | from the GCB sheet | already in repo (D7) |
| Land carbon sink, 2014–2023 mean | from the GCB sheet | already in repo (D7) |
| TCRE | ~1.65 °C / 1000 PgC †, AR6 likely range ~1.0–2.3 | derive by running a 1 %/yr ramp |
| Aerosol forcing factor | implies a plausible total aerosol ERF (AR6: −1.3 W/m², 5–95 % −2.0…−0.6) | sanity check on the fitted value |

The TCRE check is the one that matters most for a tool whose output is "temperature in 2100
given cumulative emissions", and the model does not currently have it as a stated property.

There is no Julia test suite (`Project.toml` has no `[extras]`/`[targets]`, there is no
`test/`). This work is the natural occasion to add one: the checks above as assertions, plus a
stored-results regression so a future recalibration cannot drift silently.

---

## 8. Interaction with work in flight

- **The bug-fix session.** Stages 0–4 touch only `src/` and data files. Stage 5 touches
  `ui/js/state.js`, `main.js`, `settings.js` and the HTML — sequence it after the bug fixes
  land rather than in parallel.
- **The UI regression harness.** `ui/test/` compares two builds and reports any difference. A
  rebaseline changes essentially every fingerprint (years, traces, log contents) *by design*,
  so the harness cannot validate stage 5. Use it to prove the bug fixes are behaviour-preserving
  first, then re-baseline the harness against post-rebaseline output.
- **BUGS #6** (the "2020-2100" cumulative-emissions header) and **#9** (the pinned 2025
  breakpoint) overlap with D7 and stage 5. Whoever gets there first wins; they are compatible.

---

## 9. Risks

- **The aerosol factor moves a lot.** It is currently absorbing at least the 0.14 W/m² of
  missing CH4 forcing. Once CH4 is right, the fitted value changes, and with it every
  projection. That is the rebaseline working as intended, but it means "the numbers changed" is
  not evidence of a mistake — hence the independent checks in §7.
- **The cache is a binary blob.** If regeneration is expensive and a mistake surfaces later, the
  loop is slow. Stamp it with provenance; script the regeneration.
- **Scope creep into a full AR6 update.** Rebaselining to 2023 while keeping the RCP-era forcing
  files and the SSP database is a coherent, bounded step. Replacing the forcing basis with
  AR6/RCMIP is a different, larger project — not this one.
- **The N2O unit question (§1.4)** may turn out to be a plain bug. Resolve it before
  calibrating, or the calibration will fit around it.

---

## 10. Open questions

1. Is the SSP database N2O conversion (`28/44/1000` in `readssp`) correct? A 30 % step at the
   hand-off year says something is wrong.
2. Does `GCPfiledata[2024]["landuserange"] = "C23:C87"` point at the right column? The 2023
   value it yields is ~10 % below the published GCB figure.
3. Should solar forcing after the base year use the RCP file's projected cycle (available to
   2500) instead of the constant `0.103756`?
4. Base year 2023, or wait for a complete 2024 across all datasets?
5. Harmonization ramp length for D6 — to 2050, or shorter?
