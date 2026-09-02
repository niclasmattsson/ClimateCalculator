// Wiring: builds the widgets, draws the initial figures and connects every control.

import { state, updateYears } from "./state.js";
import { dom, figureOf, allFigures, isComponentFigure } from "./dom.js";
import {
    ALL_REGIONS, BASE_YEAR, REGION_COLORS, REGION_BUTTON_LAYOUTS,
    CALIBRATION_YEARS, FIRST_CALIBRATION_YEAR, FIRST_SCENARIO_YEAR, LAST_SCENARIO_YEAR
} from "./settings.js";
import { decimals, clamp } from "./utils.js";
import { getSSP, completeExternalData } from "./sspData.js";
import {
    baseLayout, plotConfigOptions, PLOTLY_COLORS, dummyLine, dummyMarkers, historyTrace
} from "./plotConfig.js";
import { globalEmissionsFromRegional, regionalEmissionsFromGlobal } from "./regionalEmissions.js";
import {
    updateHandlesFromEmissions, updateEditEmissionsFromHandles, updatePointHandles,
    startDragBehavior, putOutTheTrash
} from "./handles.js";
import {
    plotEditEmissions, plotEmissions, plotRegionalEmissions, plotOtherEmissions,
    plotPopulation, plotIntensity, plotResultHistory, autoScale, fixAutoscale,
    updateFigures, refreshAllEmissionFigures, resetResultFigures, nudgeAllTitles
} from "./figures.js";
import { logEmissions, addRowToLog, toggleLogRow, activateRow, resetLog } from "./runLog.js";
import { submitEmissions } from "./api.js";

const GASES = ["FossilCO2", "OtherCO2", "CH4", "N2O", "Population"];

let carousel;

// ---------------------------------------------------------------- scenario loading

const co2IsLocked = () => dom.lockCO2Boxes[0].checked;

/** Reload every region's emission series from the selected SSP scenario. */
function loadScenarioEmissions({ respectCO2Lock }) {
    for (const region of ALL_REGIONS) {
        for (const gas of GASES) {
            if (gas === "FossilCO2" && respectCO2Lock && co2IsLocked()) continue;
            state.emissions[region][gas] = getSSP(region, gas, state.firstYear, state.lastYear);
        }
    }
}

function changeScenario(menu) {
    state.currentSSP = menu.options[menu.selectedIndex].value;
    // Keep the other mode's copy of the menu in sync.
    dom.scenarioMenus[state.advancedMode ? 0 : 1].selectedIndex = menu.selectedIndex;
    menu.blur();
    if (!state.editExistingEmissions) addRowToLog();
    loadScenarioEmissions({ respectCO2Lock: true });
    updateHandlesFromEmissions();
    logEmissions();
    updateFigures();
}

// ---------------------------------------------------------------- region buttons

/**
 * Redraw the region buttons and, if the selection changed, switch the figures over to
 * the newly selected region.
 *
 * `keepSelection` is false only during start-up, where the selection resets to Global.
 * Both a region button and the region-count menu keep the current selection.
 */
function updateRegionButtons(keepSelection) {
    if (!keepSelection) {
        state.currentRegionNumber = 0;
    }
    const layout = REGION_BUTTON_LAYOUTS[dom.numberOfRegionsMenu.selectedIndex];
    // Lowering the region count shortens the layout, so the selected index may no longer
    // exist. Fall back to the last region that does.
    state.currentRegionNumber = Math.min(state.currentRegionNumber, layout.length - 1);
    dom.numberOfRegionsMenu.blur();

    dom.regionButtons.replaceChildren(...layout.map((name, i) => makeRegionButton(name, i)));

    state.currentRegion = keepSelection ? layout[state.currentRegionNumber] : "Global";
    if (state.currentRegion !== state.lastRegion) {
        updateHandlesFromEmissions();
        refreshAllEmissionFigures();
        state.lastRegion = state.currentRegion;
    } else if (state.advancedMode) {
        plotRegionalEmissions(true);
    }
}

function makeRegionButton(name, index) {
    const selected = state.currentRegionNumber === index;
    const background = selected ? REGION_COLORS.selected[index] : REGION_COLORS.idle[index];
    const hover = selected ? REGION_COLORS.selectedHover[index] : REGION_COLORS.idleHover[index];

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = name;
    button.style.backgroundColor = background;
    button.style.color = selected ? "#FFF" : "#000";
    button.addEventListener("click", () => {
        state.currentRegionNumber = index;
        updateRegionButtons(true);
    });
    button.addEventListener("mouseover", () => { button.style.backgroundColor = hover; });
    button.addEventListener("mouseout", () => { button.style.backgroundColor = background; });
    return button;
}

// ---------------------------------------------------------------- enlarge / collapse

/** Open the big editable emissions figure, or close it and commit the edited path. */
function toggleEnlargeFigure(clickedFigure) {
    // currently only called for the CO2 emissions figure
    if (clickedFigure === dom.editEmissions) {
        if (state.zoomAllowed) {
            dom.ghostFigure.style.display = "none";
            dom.emissionsFigure.classList.remove("noshadow");
            dom.emissionsFigure.parentNode.firstChild.checked = false;
            if (!state.editExistingEmissions) addRowToLog();
            // update global or regional emissions depending on what was just edited
            if (state.currentRegion === "Global") {
                regionalEmissionsFromGlobal("Global", ["OECD", "Asia", "ROW"]);
            } else {
                globalEmissionsFromRegional();
            }
            logEmissions();
            updateFigures();
        }
    } else {
        setTimeout(() => {
            dom.ghostFigure.style.display = "block";
            dom.emissionsFigure.classList.add("noshadow");
            autoScale();
            const rect = dom.emissionsFigure.getBoundingClientRect();
            dom.ghostFigure.style.width = rect.width + "px";
            dom.ghostFigure.style.height = rect.height + "px";
            dom.ghostFigure.style.top = rect.top + "px";
            dom.ghostFigure.style.left = rect.left + "px";
            dom.emissionsText.innerHTML =
                "<p>1. Design your emission path by dragging the breakpoints.</p>" +
                "<p>2. If you need another breakpoint, grab the one floating in the upper left.</p>" +
                "<p>3. To remove a breakpoint, just drag it back to the left.</p>";
        }, 200);
    }
    state.zoomAllowed = true;
}

// ---------------------------------------------------------------- advanced mode

function insertAdvancedModeFigures() {
    const figHTML = "<label class=\"newfiglabels\"><input type=\"checkbox\"><figure class=\"newfigs\"></figure></label>";
    dom.advancedFigureContainer.innerHTML = figHTML + figHTML;
    const newfigs = dom.advancedFigureContainer.querySelectorAll(".newfigs");
    figureOf["regionalintensity"] = newfigs[0];
    figureOf["regionalCO2emissions"] = newfigs[1];
    carousel.insert(dom.advancedFigureContainer.childNodes, 3);
    plotRegionalEmissions(true);
    plotIntensity(false);
}

function setAdvancedMode(advanced) {
    state.advancedMode = advanced;
    dom.advancedUI.style.display = advanced ? "block" : "none";
    dom.simpleUI.style.display = advanced ? "none" : "block";
    if (advanced) {
        insertAdvancedModeFigures();
    } else {
        carousel.remove(dom.figureGroup.querySelectorAll(".newfiglabels"));
    }
}

// ---------------------------------------------------------------- widget creation

function createSliders() {
    noUiSlider.create(dom.csSlider, {
        start: 3,
        tooltips: [true],
        step: 0.1,
        range: { min: 1, max: 6 },
        pips: { mode: "count", values: 6, density: 10 },
        format: decimals(1, " &deg;C")
    });

    // One-year steps throughout, so that the scenario can start on the base year itself
    // rather than on the nearest decade. The range is non-linear to give the years the
    // pathway is actually drawn over most of the track, and stops at LAST_SCENARIO_YEAR:
    // neither the SSP database nor the model server can serve a later end year.
    noUiSlider.create(dom.yearSelectionSlider, {
        start: [2000, BASE_YEAR, LAST_SCENARIO_YEAR],
        connect: [false, false, true, false],
        tooltips: [true, true, true],
        step: 1,
        range: { min: 1960, "20%": 2000, "40%": 2020, max: LAST_SCENARIO_YEAR },
        format: decimals(0)
    });

    // Narrowing this window is a diagnostic: a short window pins the model to the end of the
    // observed record, a long one fits the whole trajectory and lets the endpoint drift.
    noUiSlider.create(dom.calibrationSlider, {
        start: CALIBRATION_YEARS,
        connect: [false, true, false],
        tooltips: [true, true],
        step: 1,
        margin: 1,
        range: { min: FIRST_CALIBRATION_YEAR, max: BASE_YEAR },
        pips: { mode: "count", values: 5, density: 10 },
        format: decimals(0)
    });

    noUiSlider.create(dom.harmonizationSlider, {
        start: state.harmonizationFactor,
        tooltips: [true],
        step: 0.05,
        range: { min: 0, max: 1 },
        format: decimals(1)
    });
}

function createCarousel() {
    carousel = new Flickity(".main-carousel", {
        draggable: false,
        initialIndex: "4"
        /* can use flickity as thumbnails for flickity: https://codepen.io/anon/pen/rGzXeq */
    });

    figureOf["CO2emissions"].classList.add("leftfigure");
    figureOf["temperature"].classList.add("rightfigure");
    carousel.on("select", () => {
        const figures = allFigures();
        const index = carousel.selectedIndex;
        for (const figure of figures) {
            figure.classList.remove("leftfigure");
            figure.classList.remove("rightfigure");
        }
        if (index > 0) figures[index - 1].classList.add("leftfigure");
        if (index < figures.length - 1) figures[index + 1].classList.add("rightfigure");
    });
}

// ---------------------------------------------------------------- event wiring

function connectSettingsPanel() {
    dom.settingsOpen.addEventListener("click", () => { dom.settingsWindow.style.right = "5px"; });
    dom.settingsClose.addEventListener("click", () => { dom.settingsWindow.style.right = "-25%"; });

    dom.modeToggle.addEventListener("click", () => setAdvancedMode(!state.advancedMode));

    dom.yearSelectionSlider.noUiSlider.on("set", function () {
        const values = this.get().map(Number);

        // The pathway is cut out of the SSP database, which starts in FIRST_SCENARIO_YEAR.
        // Below it getSSP() would slice from a negative index and return the tail of the
        // series, so the handle is pushed back and this fires again with the fixed value.
        const scenarioStart = clamp(values[1], FIRST_SCENARIO_YEAR, LAST_SCENARIO_YEAR);
        if (scenarioStart !== values[1]) {
            this.set([values[0], scenarioStart, values[2]]);
            return;
        }

        const rangeChanged = scenarioStart !== state.firstYear || values[2] !== state.lastYear;
        state.firstDisplayYear = values[0];
        state.firstYear = scenarioStart;
        state.lastYear = values[2];
        updateYears();
        // Merge, so that dtick, ticks, ticklen, tickcolor, fixedrange and hoverformat
        // from plotConfig.js survive a change of year range.
        Object.assign(baseLayout.xaxis, {
            range: [Math.floor(state.firstDisplayYear / 20) * 20 - 1, state.lastYear + 1],
            tick0: Math.floor(state.firstDisplayYear / 20) * 20
        });

        // Every emission series and every logged run is indexed from the old first year, so
        // moving either end of the scenario invalidates them: rebuild from the scenario and
        // start the log over. Moving only the first year drawn leaves all of that alone.
        if (rangeChanged) {
            loadScenarioEmissions({ respectCO2Lock: false });
            updateHandlesFromEmissions();
            resetLog();
            logEmissions();
            resetResultFigures();
        }
        refreshAllEmissionFigures();
    });

    // No redraw: the window only changes what the model does on the next run.
    dom.calibrationSlider.noUiSlider.on("set", function () {
        const values = this.get();
        state.firstCalibrationYear = Number(values[0]);
        state.lastCalibrationYear = Number(values[1]);
    });

    dom.harmonizationSlider.noUiSlider.on("set", function () {
        state.harmonizationFactor = Number(this.get());
        regionalEmissionsFromGlobal("Global", ["OECD", "Asia", "ROW"]);
        logEmissions();
        updateFigures();
    });

    dom.sspModelMenu.addEventListener("change", function () {
        state.currentModel = this.options[this.selectedIndex].value;
    });

    dom.interpolationMenu.addEventListener("change", function () {
        state.interpolationMethod = this.options[this.selectedIndex].value;
        state.cardinalTension = 0.5;
        if (state.interpolationMethod === "catmullrom") {
            state.interpolationMethod = "cardinal";
            state.cardinalTension = 0;
        }
        updateFigures();
    });
}

function connectInputPanel() {
    for (const menu of dom.scenarioMenus) {
        menu.selectedIndex = state.currentSSPindex;
        menu.addEventListener("change", () => changeScenario(menu));
    }

    for (const box of dom.lockCO2Boxes) {
        box.checked = false;
        box.addEventListener("change", () => {
            for (const other of dom.lockCO2Boxes) other.checked = box.checked;
        });
    }

    // Changing the region count keeps the current region selection, clamped to the new
    // layout; passing the handler directly would work by accident, via the truthy Event.
    dom.numberOfRegionsMenu.addEventListener("change", () => updateRegionButtons(true));
}

function connectRunLog() {
    dom.runLog.rows[0].onclick = toggleLogRow;

    dom.clearFiguresButton.addEventListener("click", () => {
        for (const figure of allFigures()) {
            Plotly.purge(figure);
        }
        state.currentRegion = "Global";
        state.currentRegionNumber = 0;
        plotEmissions(true);
        if (state.advancedMode) plotRegionalEmissions(true);
        plotOtherEmissions(true);
        plotPopulation(true);
        plotIntensity(true, true);
        plotResultHistory();
        state.editExistingEmissions = true;
        resetLog();
        logEmissions();
        nudgeAllTitles();
    });

    dom.clearHiddenButton.addEventListener("click", () => {
        const rows = dom.runLog.rows;
        const deleteRows = [];
        let colorIndex = 0;
        for (let len = rows.length, i = len - 1; i >= 0; i--) {
            if (rows[i].classList.contains("hiddenrow")) {
                if (i === 0 && state.editExistingEmissions) {
                    state.editExistingEmissions = false;
                }
                deleteRows.push(len - i - 1);
                dom.runLog.deleteRow(i);
            } else {
                rows[i].cells[0].style = "color:" + PLOTLY_COLORS[colorIndex++ % PLOTLY_COLORS.length];
            }
        }
        for (const figure of allFigures()) {
            // Every figure carries an observed-history curve as trace 0, so its run
            // traces are offset by one. The concentration and temperature figures hold
            // only that curve until the first model run, so they have nothing to delete.
            // The component figures are laid out per component rather than per run, and
            // activateRow() below redraws them from whichever run survives.
            if (isComponentFigure(figure)) continue;
            const traceCount = figure.data ? figure.data.length : 0;
            const indices = deleteRows.map((r) => r + 1).filter((i) => i < traceCount);
            if (indices.length) Plotly.deleteTraces(figure, indices);
        }

        if (rows.length === 0) {
            // Every run was hidden, so the log is now empty. Leaving it that way breaks
            // the next logEmissions(); start over with the current path as a single run.
            resetLog();
            state.editExistingEmissions = false;   // makes updateFigures() draw a fresh trace set
            updateFigures();
            logEmissions();
        } else {
            activateRow(rows[0]);
        }
    });
}

function connectFigures() {
    dom.emissionsFigure.addEventListener("click", function () {
        toggleEnlargeFigure(this);
    });
    dom.emissionsFigure.on("plotly_click", () => {
        toggleEnlargeFigure(figureOf["CO2emissions"]);
    });

    dom.editEmissions.addEventListener("click", function () {
        toggleEnlargeFigure(this);      // required to make click work on figure margins
    });
    dom.editEmissions.on("plotly_click", () => {
        toggleEnlargeFigure(dom.editEmissions);
    });

    document.addEventListener("keydown", (e) => {
        if (document.activeElement === dom.figureGroup) return;  // arrows already scroll the carousel if it is focused
        if (e.key === "ArrowLeft") {
            carousel.previous();
        } else if (e.key === "ArrowRight") {
            carousel.next();
        }
    });
}

// ---------------------------------------------------------------- start-up

function init() {
    const menu = dom.interpolationMenu;
    state.interpolationMethod = menu.options[menu.selectedIndex].value;

    createSliders();
    dom.runModelButton.addEventListener("click", submitEmissions);

    completeExternalData();
    loadScenarioEmissions({ respectCO2Lock: false });
    updateHandlesFromEmissions();

    // Plot initial figures
    putOutTheTrash();
    updateEditEmissionsFromHandles();
    updatePointHandles();

    plotEditEmissions();
    plotEmissions(true);
    if (state.advancedMode) plotRegionalEmissions(true);

    plotOtherEmissions(true);
    plotPopulation(true);
    plotIntensity(true, true);
    plotResultHistory();
    fixAutoscale();
    autoScale();
    updateEditEmissionsFromHandles();
    updatePointHandles();
    startDragBehavior();

    // add extra margin to the plot titles
    dom.figureGroup.querySelectorAll("figure .gtitle")
        .forEach((t) => t.setAttribute("y", t.getAttribute("y") * 35 / 25));

    createCarousel();
    logEmissions();

    dom.advancedUI.style.display = state.advancedMode ? "block" : "none";
    dom.modeToggle.checked = state.advancedMode;
    if (state.advancedMode) insertAdvancedModeFigures();

    connectSettingsPanel();
    connectRunLog();
    updateRegionButtons();
    connectInputPanel();
    connectFigures();

    changeScenario(dom.scenarioMenus[0]);
}

// Draw a dummy plot to initialize the Plotly object before anything else runs.
Plotly.plot("editemissions", [dummyLine, historyTrace, dummyMarkers], { name: "" }, plotConfigOptions);
init();
