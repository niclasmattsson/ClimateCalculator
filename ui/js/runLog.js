// The "Model runs" table. Each row owns a snapshot of the emissions that produced it,
// stored on the row element as `row.emissions`.

import { state } from "./state.js";
import { dom, figureOf, allFigures } from "./dom.js";
import { cloneObject } from "./utils.js";
import { PLOTLY_COLORS } from "./plotConfig.js";
import { updateHandlesFromEmissions } from "./handles.js";
import { plotRegionalEmissions } from "./figures.js";

const colorFor = (index) => PLOTLY_COLORS[index % PLOTLY_COLORS.length];

const EMPTY_LOG_ROW = "<tr><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>";

/** Put the log back to its start-up state: one placeholder row, awaiting logEmissions(). */
export function resetLog() {
    dom.runLog.innerHTML = EMPTY_LOG_ROW;
    dom.runLog.rows[0].onclick = toggleLogRow;
}

/** Make `row` the active run: its emissions become the ones being edited. */
export function activateRow(row) {
    for (const r of dom.runLog.rows) {
        r.classList.remove("activerow");
    }
    row.classList.add("activerow");
    state.emissions = cloneObject(row.emissions);
    updateHandlesFromEmissions();
    if (state.advancedMode) {
        plotRegionalEmissions(true);
    }
}

/**
 * Click handler for a log row. Clicking the colour swatch hides or shows that run's
 * traces; clicking anywhere else activates the run.
 */
export function toggleLogRow(event) {
    const row = this;
    if (event.target.parentNode !== row.firstChild) {
        activateRow(row);
        return;
    }

    row.classList.toggle("hiddenrow");
    row.firstChild.classList.toggle("hiddencell");
    const rows = dom.runLog.rows;
    const runNumber = rows.length - Array.prototype.indexOf.call(rows, row) - 1;
    const ishidden = row.classList.contains("hiddenrow");
    for (const figure of allFigures()) {
        if (figure.classList.contains("js-plotly-plot") && !figure.classList.contains("newfigs")) {
            // Every carousel figure carries the observed history as trace 0, so the run
            // traces start at 1. The result figures hold only that history until the model
            // has been run, and then have no trace for this run to hide.
            const trace = runNumber + 1;
            if (trace < figure.data.length) {
                Plotly.restyle(figure, { opacity: 1 - ishidden }, trace);
            }
        }
    }
}

/** Summarise the current emission path into the top (pending) row of the log. */
export function logEmissions() {
    const global = state.emissions["Global"];
    let maxEmissions = -Infinity;
    let cumulativeEmissions = 0;
    let peakYear = state.firstYear;
    for (let i = 0; i < global["FossilCO2"].length; i++) {
        const emis = global["FossilCO2"][i] + global["OtherCO2"][i];
        if (emis > maxEmissions) {
            maxEmissions = emis;
            peakYear = state.firstYear + i;
        }
        cumulativeEmissions += emis;
    }

    // Name the years actually summed. The emission series can be shorter than the range
    // the year slider asks for, so measure it rather than trusting state.lastYear.
    const lastSummedYear = state.firstYear + global["FossilCO2"].length - 1;
    dom.cumulativeHeader.innerHTML = "Cumulative<br>CO<sub>2</sub> emissions<br>(" +
        state.firstYear + "-" + lastSummedYear + ")";

    const rows = dom.runLog.rows;
    const swatch = "<td style=\"color:" + colorFor(rows.length - 1) + "\"><span>&#9724;</span></td>";
    rows[0].emissions = cloneObject(state.emissions);
    rows[0].innerHTML = swatch + "<td>" + peakYear +
        "</td><td>" + cumulativeEmissions.toFixed(0) + " Gton CO<sub>2</sub></td><td>-</td><td>-</td>";
    activateRow(rows[0]);
}

/** Push the pending row down into the log and start a fresh one on top. */
export function addRowToLog() {
    const row = dom.runLog.rows[0];
    const newrow = dom.runLog.insertRow(0);
    newrow.innerHTML = row.innerHTML;
    // The new row describes the same emission path as the one it was copied from, until
    // logEmissions() replaces it. Most callers do call logEmissions() straight after, but
    // submitEmissions() does not: a second model run only changes the climate sensitivity,
    // so the emissions carry over unchanged.
    newrow.emissions = cloneObject(row.emissions);
    newrow.cells[0].style = "color:" + colorFor(dom.runLog.rows.length - 1);
    newrow.onclick = toggleLogRow;
}
