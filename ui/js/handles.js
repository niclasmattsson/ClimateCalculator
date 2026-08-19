// The draggable breakpoints ("handles") of the editable emissions curve.
//
// A handle has an x (year), a y (Gton CO2/year) and a type:
//   normal      - a user-draggable breakpoint
//   final       - the breakpoint locked to the last year; its x cannot change
//   hidden      - a breakpoint that shapes the curve but is not drawn
//   spawn       - the spare handle parked on the trash can, dragged out to add a breakpoint
//   hiddenspawn - the spawn handle, temporarily hidden while another handle is dragged

import { state } from "./state.js";
import { dom } from "./dom.js";
import { clamp } from "./utils.js";
import { getSSP } from "./sspData.js";
import { CO2emissionHistory, backgroundDataStart } from "./data/emissionHistory.js";
import {
    FIRST_BREAKPOINT, SHOW_SSP_INSTEAD_OF_HISTORY, LAST_HISTORIC_YEAR,
    DEFAULT_HANDLE_YEARS, SPAWN_POSITION
} from "./settings.js";
import { interpolateCubicHermite } from "./interpolation.js";

const currentHandles = () => state.handles[state.currentRegion];
const isVisible = (handle) => handle.type !== "hidden" && handle.type !== "hiddenspawn";
const shapesCurve = (handle) => handle.type !== "spawn" && handle.type !== "hiddenspawn";

/** The <path> elements Plotly draws for the breakpoint markers, in drawing order. */
function markerPaths() {
    return dom.editEmissions
        .querySelector(".scatterlayer .trace:nth-of-type(3) g")
        .getElementsByTagName("path");
}

export function addHandle(type, x, y) {
    if (type === "spawn") {
        x = dom.editEmissions._fullLayout.xaxis.p2l(SPAWN_POSITION.x);
        y = dom.editEmissions._fullLayout.yaxis.p2l(SPAWN_POSITION.y);
    }
    const handle = { x, y, type };
    currentHandles().push(handle);
    return handle;
}

export function destroyHandle(handle) {
    const handles = currentHandles();
    handles.splice(handles.indexOf(handle), 1);
    updateEditEmissionsFromHandles();
}

/** Sort the handles by year and split them into the curve-shaping and the drawn sets. */
function sortHandles() {
    const handles = currentHandles();
    handles.sort((a, b) => a.x - b.x);
    const x = [], y = [], xvis = [], yvis = [];
    for (const handle of handles) {
        if (shapesCurve(handle)) {
            x.push(handle.x);
            y.push(handle.y);
        }
        if (isVisible(handle)) {
            xvis.push(handle.x);
            yvis.push(handle.y);
        }
    }
    return { x, y, xvis, yvis };
}

/** Re-interpolate the emission curve from the handles and redraw the editable figure. */
export function updateEditEmissionsFromHandles() {
    const { x, y, xvis, yvis } = sortHandles();
    const fossilCO2 = interpolateCubicHermite(
        state.years, x, y, state.interpolationMethod, state.cardinalTension);
    state.emissions[state.currentRegion]["FossilCO2"] = fossilCO2;

    const backgroundYears = SHOW_SSP_INSTEAD_OF_HISTORY ? state.years : state.historicYears;
    const backgroundEmissions = SHOW_SSP_INSTEAD_OF_HISTORY
        ? getSSP(state.currentRegion, "FossilCO2", state.firstYear, state.lastYear)
        : CO2emissionHistory[state.currentRegion].slice(0, LAST_HISTORIC_YEAR + 1 - backgroundDataStart);

    Plotly.restyle(dom.editEmissions, {
        x: [state.years, backgroundYears, xvis],
        y: [fossilCO2, backgroundEmissions, yvis],
        name: ""
    });
    nudgeEditTitle();
}

/** Attach each handle to the marker <path> that represents it, so drags can find it. */
export function updatePointHandles() {
    const paths = markerPaths();
    let p = 0;
    for (const handle of currentHandles()) {
        if (isVisible(handle)) paths[p++].handle = handle;
    }
}

/**
 * Rebuild the handles for the current region from its emission series, keeping the years
 * of the existing user-placed breakpoints.
 */
export function updateHandlesFromEmissions() {
    let handleyears = currentHandles().filter((h) => h.type === "normal").map((h) => h.x);
    if (handleyears.length === 0) {
        handleyears = DEFAULT_HANDLE_YEARS;
    }

    state.handles[state.currentRegion] = [];
    const emis = state.emissions[state.currentRegion]["FossilCO2"];
    const { firstYear, firstDisplayYear, advancedMode } = state;

    addHandle("hidden", firstDisplayYear,
        CO2emissionHistory[state.currentRegion][firstDisplayYear - backgroundDataStart]);
    addHandle("hidden", firstYear, emis[0]);
    handleyears.forEach((yr, index) => {
        if (index === 0 && FIRST_BREAKPOINT) {
            // Pin the first breakpoint to the observed recent emissions. In advanced mode
            // the regional series is used unscaled instead.
            const scaled = FIRST_BREAKPOINT.emissions * emis[yr - firstYear] /
                state.emissions["Global"]["FossilCO2"][yr - firstYear];
            addHandle("normal", FIRST_BREAKPOINT.year, advancedMode ? emis[yr - firstYear] : scaled);
        } else {
            addHandle("normal", yr, emis[yr - firstYear]);
        }
    });
    addHandle("final", 2100, emis[2100 - firstYear]);
    addHandle("spawn");
    state.lastBreakYear = firstYear;

    updateEditEmissionsFromHandles();
    updatePointHandles();
}

/** Plotly redraws the title too high after a restyle; put it back. */
function nudgeEditTitle() {
    const title = dom.editEmissions.getElementsByClassName("gtitle")[0];
    if (title) title.setAttribute("y", 49);
}

/** The readout shown next to the enlarged figure while a handle is being dragged. */
export function updateEmissionText(handle, extratext) {
    const handles = currentHandles();
    const i = handles.indexOf(handle);
    const prevhandle = handles[i - 1];
    const nexthandle = i + 1 < handles.length ? handles[i + 1] : null;

    const helptext = i === handles.length - 1
        ? "<p><font color=\"red\">The last breakpoint is locked at 2100.</font></p>" : "";
    const text0 = "<p>Breakpoint (" + handle.x.toFixed(0) + "):&nbsp;&nbsp;" +
        handle.y.toFixed(1) + " Gton CO<sub>2</sub> /year</p>";
    const text1 = growthText(prevhandle, handle);
    const text2 = nexthandle ? growthText(handle, nexthandle) : "";

    dom.emissionsText.innerHTML = extratext + helptext + text0 + text1 + text2;
}

function growthText(from, to) {
    const growth = Math.pow(to.y / from.y, 1 / (to.x - from.x)) - 1;
    return "<p>Growth (" + from.x.toFixed(0) + "-" + to.x.toFixed(0) + "):&nbsp;&nbsp;" +
        (growth > 0 ? "+" : "") + (100 * growth).toFixed(1) + " %/year</p>";
}

const OVER_LIMIT_TEXT =
    "<p><font color=\"red\">To go below zero or above the current max, " +
    "first change the scale by dragging the y-axis.</font></p>";

/**
 * Bind d3 drag behaviour to the breakpoint markers. Called again by the "Fix" button
 * because Plotly recreates the marker elements whenever the breakpoint count changes.
 */
export function startDragBehavior() {
    const d3 = Plotly.d3;
    const drag = d3.behavior.drag();

    drag.origin(function () {
        const transform = d3.select(this).attr("transform");
        const translate = transform.substring(10, transform.length - 1).split(",");
        return { x: translate[0], y: translate[1] };
    });

    drag.on("dragstart", function () {
        if (this.handle.type !== "spawn") {
            showTrash("rgba(0,0,0,.2)");
            const spawnHandle = currentHandles().find((h) => h.type === "spawn");
            if (spawnHandle) spawnHandle.type = "hiddenspawn";
        }
    });

    drag.on("drag", function () {
        const xmouse = d3.event.x, ymouse = d3.event.y;
        d3.select(this).attr("transform", "translate(" + [xmouse, ymouse] + ")");
        const xaxis = dom.editEmissions._fullLayout.xaxis;
        const yaxis = dom.editEmissions._fullLayout.yaxis;
        const handle = this.handle;

        if (handle.type !== "final") {
            handle.x = clamp(xaxis.p2l(xmouse), xaxis.range[0] + 1, xaxis.range[1] - 1e-9);
        }
        if (handle.type === "spawn" && handle.x > currentHandles()[1].x) {
            showTrash("rgba(0,0,0,.2)");
            handle.type = "normal";
        }
        handle.y = clamp(yaxis.p2l(ymouse), yaxis.range[0], yaxis.range[1]);

        const atLimit = handle.y === yaxis.range[0] || handle.y === yaxis.range[1];
        if (handle.x < state.lastBreakYear) {
            handle.type = "spawn";
            dom.trash.style.fill = "#a00";
        }

        const snapEvent = d3.event.sourceEvent;
        const snap = snapEvent.ctrlKey ? 0.1 : snapEvent.shiftKey ? 5 : 1;
        handle.x = Math.round(handle.x / snap) * snap;
        handle.y = Math.round(handle.y / snap) * snap;
        updateEmissionText(handle, atLimit ? OVER_LIMIT_TEXT : "");
        updateEditEmissionsFromHandles();
    });

    drag.on("dragend", function () {
        if (this.handle.x < state.lastBreakYear) destroyHandle(this.handle);

        const hiddenSpawnHandle = currentHandles().find((h) => h.type === "hiddenspawn");
        if (hiddenSpawnHandle) {
            hiddenSpawnHandle.type = "spawn";
        } else if (!currentHandles().some((h) => h.type === "spawn")) {
            addHandle("spawn");
        }

        updateEditEmissionsFromHandles();
        updatePointHandles();
        dom.trash.setAttribute("display", "none");
        bindDrag(d3, drag, ".scatterlayer .trace:last-of-type .points path:last-of-type");

        // this disables zoom on click event after dragging handles
        // (except for final handle which for some reason doesn't need it)
        if (this.handle.type !== "final") state.zoomAllowed = false;
        nudgeEditTitle();
    });

    bindDrag(d3, drag, ".scatterlayer .trace:last-of-type .points path");
}

function bindDrag(d3, drag, selector) {
    d3.selectAll(selector).call(drag).on("mousedown", function () {
        updateEmissionText(this.handle, "");
    });
}

function showTrash(fill) {
    dom.trash.setAttribute("display", "inline");
    dom.trash.style.fill = fill;
}

/** Move the trash can behind the spawn handle, where new breakpoints are dragged from. */
export function putOutTheTrash() {
    const pointscontainer = dom.editEmissions.querySelector(".scatterlayer .trace:nth-of-type(3) g");
    const trashsize = dom.trash.getAttribute("width");
    pointscontainer.parentNode.insertBefore(dom.trash, pointscontainer);
    dom.trash.setAttribute("transform",
        "translate(" + (SPAWN_POSITION.x - trashsize / 2) + "," + (SPAWN_POSITION.y - trashsize / 2 - 2) + ")");
    dom.trash.setAttribute("display", "none");
}
