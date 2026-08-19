// Everything that draws a Plotly figure.

import { state } from "./state.js";
import { dom, figureOf } from "./dom.js";
import { cloneObject } from "./utils.js";
import { getSSP } from "./sspData.js";
import { CO2emissionHistory, backgroundDataStart } from "./data/emissionHistory.js";
import { SHOW_SSP_INSTEAD_OF_HISTORY, LAST_HISTORIC_YEAR, SPAWN_POSITION } from "./settings.js";
import { updateEditEmissionsFromHandles } from "./handles.js";
import { baseLayout, plotConfigOptions, PLOTLY_COLORS, historyTrace } from "./plotConfig.js";

/** Plot options derived from the shared layout, with this figure's title and y-axis. */
function layoutFor(title, yaxis, overrides = {}) {
    return Object.assign(cloneObject(baseLayout), { title, yaxis }, overrides);
}

const gtCO2 = (hoverformat) => ({ title: "Gton CO<sub>2</sub>/year", hoverformat });
const draw = (figure, trace, options) => Plotly.plot(figure, [trace], options, plotConfigOptions);

/** Move a figure's title down; Plotly puts it too close to the plot area. */
function nudgeTitle(figure, y = 35) {
    figure.querySelector(".gtitle").setAttribute("y", y);
}

export function nudgeAllTitles() {
    dom.figureGroup.querySelectorAll("figure .gtitle").forEach((t) => t.setAttribute("y", 35));
}

/** The observed history curve, or the base SSP scenario if configured that way. */
function backgroundSeries(region) {
    if (SHOW_SSP_INSTEAD_OF_HISTORY) {
        return { x: state.years, y: getSSP(region, "FossilCO2", state.firstYear, state.lastYear) };
    }
    return {
        x: state.historicYears,
        y: CO2emissionHistory[region].slice(0, LAST_HISTORIC_YEAR + 1 - backgroundDataStart)
    };
}

// ---------------------------------------------------------------- editable figure

export function plotEditEmissions() {
    const options = layoutFor(
        "CO<sub>2</sub> emissions from fossil fuels",
        { title: "Gton CO<sub>2</sub>/year", hoverformat: ".1f" },
        { font: { size: 24 }, margin: { t: 70, r: 42, b: 56, l: 84, pad: 0 } }
    );
    Plotly.update(dom.editEmissions, [{
        x: state.years,
        y: state.emissions[state.currentRegion]["FossilCO2"],
        hoverinfo: "none",
        name: ""
    }], options, plotConfigOptions);
    autoScale();
}

// ---------------------------------------------------------------- carousel figures

export function plotEmissions(plothistory = false) {
    const options = layoutFor(
        "CO<sub>2</sub> emissions from fossil fuels:  " + state.currentRegion,
        Object.assign(gtCO2(".1f"), { rangemode: "tozero" }),
        { colorway: ["#000", ...PLOTLY_COLORS] }
    );
    if (plothistory) {
        const background = backgroundSeries(state.currentRegion);
        historyTrace.x = background.x;
        historyTrace.y = background.y;
        draw(dom.emissionsFigure, historyTrace, options);
    }
    draw(dom.emissionsFigure, {
        x: state.years,
        y: state.emissions[state.currentRegion]["FossilCO2"],
        name: ""
    }, options);
}

/** Which regions the regional figures show, per "number of regions" menu index. */
function regionalPlotList() {
    return dom.numberOfRegionsMenu.selectedIndex === 2
        ? ["Global", "Asia", "OECD", "ROW"]
        : ["Global", "Non-OECD", "OECD"];
}

export function plotRegionalEmissions(plothistory = false) {
    const options = layoutFor(
        "CO<sub>2</sub> emissions from fossil fuels:  Regional",
        Object.assign(gtCO2(".1f"), { rangemode: "tozero" }),
        { colorway: ["#000", "#555", "#C44", "#44C", "#4C4"] }
    );
    Plotly.purge(figureOf["regionalCO2emissions"]);

    if (plothistory) {
        historyTrace.x = state.historicYears;
        historyTrace.y = CO2emissionHistory[state.currentRegion]
            .slice(0, LAST_HISTORIC_YEAR + 1 - backgroundDataStart);
        draw(figureOf["regionalCO2emissions"], historyTrace, options);
    }

    for (const region of regionalPlotList()) {
        draw(figureOf["regionalCO2emissions"], {
            x: state.years,
            y: state.emissions[region]["FossilCO2"],
            name: ""
        }, options);
    }
    plotIntensity(false);
    nudgeAllTitles();
}

export function plotIntensity(plotglobalfigure) {
    const perCapitaAxis = { title: "Gton CO<sub>2</sub>/person/year", rangemode: "tozero", hoverformat: ".2f" };
    const intensity = {};

    const perCapita = (region) => {
        const series = new Array(state.lastYear - state.firstYear + 1);
        const emissions = state.emissions[region];
        for (let i = 0; i < state.years.length; i++) {
            series[i] = (emissions["FossilCO2"][i] + emissions["OtherCO2"][i]) / emissions["Population"][i];
        }
        return series;
    };

    if (state.advancedMode) {
        Plotly.purge(figureOf["regionalintensity"]);
        const options = layoutFor("CO<sub>2</sub> emissions per capita:  Regional", perCapitaAxis,
            { colorway: ["#555", "#C44", "#44C", "#4C4"] });
        for (const region of regionalPlotList()) {
            intensity[region] = perCapita(region);
            draw(figureOf["regionalintensity"], { x: state.years, y: intensity[region], name: "" }, options);
        }
    } else {
        intensity["Global"] = perCapita("Global");
    }

    if (plotglobalfigure) {
        const options = layoutFor("CO<sub>2</sub> emissions per capita", perCapitaAxis);
        draw(figureOf["intensity"], { x: state.years, y: intensity["Global"], name: "" }, options);
    }
}

export function plotPopulation() {
    const options = layoutFor("Population:  " + state.currentRegion,
        { title: "billion people", rangemode: "tozero", hoverformat: ".3f" });
    draw(figureOf["population"], {
        x: state.years,
        y: state.emissions[state.currentRegion]["Population"],
        name: ""
    }, options);
}

export function plotOtherEmissions() {
    const region = state.currentRegion;

    draw(figureOf["CH4emissions"], { x: state.years, y: state.emissions[region]["CH4"], name: "" },
        layoutFor("CH<sub>4</sub> emissions:  " + region,
            { title: "MtCH<sub>4</sub>/year", rangemode: "tozero", hoverformat: ".0f" }));
    nudgeTitle(figureOf["CH4emissions"]);

    draw(figureOf["N2Oemissions"], { x: state.years, y: state.emissions[region]["N2O"], name: "" },
        layoutFor("N<sub>2</sub>O emissions:  " + region,
            { title: "MtN/year", rangemode: "tozero", hoverformat: ".2f" }));
    nudgeTitle(figureOf["N2Oemissions"]);

    draw(figureOf["otherCO2emissions"], { x: state.years, y: state.emissions[region]["OtherCO2"], name: "" },
        layoutFor("Other CO<sub>2</sub> emissions:  " + region,
            Object.assign(gtCO2(".1f"), { rangemode: "tozero" })));
    nudgeTitle(figureOf["otherCO2emissions"]);
}

// ---------------------------------------------------------------- model results

export function plotConcentration(concentrations) {
    draw(figureOf["CO2concentration"], { x: state.years, y: concentrations["CO2"], name: "" },
        layoutFor("CO<sub>2</sub> concentration in the atmosphere", { title: "ppm", hoverformat: ".0f" }));
    nudgeTitle(figureOf["CO2concentration"]);

    draw(figureOf["CH4concentration"], { x: state.years, y: concentrations["CH4"], name: "" },
        layoutFor("CH<sub>4</sub> concentration in the atmosphere", { title: "ppb", hoverformat: ".0f" }));
    nudgeTitle(figureOf["CH4concentration"]);

    // NOTE: no `name` on this trace, unlike the two above.
    draw(figureOf["N2Oconcentration"], { x: state.years, y: concentrations["N2O"] },
        layoutFor("N<sub>2</sub>O concentration in the atmosphere", { title: "ppb", hoverformat: ".0f" }));
    nudgeTitle(figureOf["N2Oconcentration"]);
}

export function plotTemperature(temp) {
    const options = layoutFor(
        "Mean surface temperature<br><span>(change since preindustrial times)</span>",
        { title: "degrees (&deg;C)", rangemode: "tozero", hoverformat: ".2f" });
    draw(figureOf["temperature"], { x: state.years, y: temp, name: "" }, options);
    figureOf["temperature"].querySelector(".gtitle .line").setAttribute("y", 35);
    figureOf["temperature"].querySelector(".gtitle .line:last-Child").setAttribute("y", 35);
}

// ---------------------------------------------------------------- scaling

/**
 * One-off autoscale of a figure's y-axis. Called with an event by the modebar button and
 * without one to rescale the editable figure.
 */
export function autoScale(event) {
    let figure;
    if (event) {
        figure = event.target || dom.emissionsFigure;
        while (figure && figure.nodeName !== "FIGURE") {
            figure = figure.parentNode;
        }
    } else {
        figure = dom.editEmissions;
    }

    const ydata = figure.data[0].y;
    const min = Math.min(0, Math.min.apply(null, ydata)) * 1.1;
    const max = Math.max.apply(null, ydata) * 1.1;
    Plotly.relayout(figure, { "yaxis.range": [min, max] });

    // The spawn handle sits at a fixed pixel position, so its data coordinates move.
    for (const handle of state.handles[state.currentRegion]) {
        if (handle.type === "spawn") {
            handle.x = dom.editEmissions._fullLayout.xaxis.p2l(SPAWN_POSITION.x);
            handle.y = dom.editEmissions._fullLayout.yaxis.p2l(SPAWN_POSITION.y);
        }
    }
    updateEditEmissionsFromHandles();

    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
}

/**
 * The default autoscale button is annoying: it is not a one-off autoscale, it sets
 * autorange to true every time it is used. We could call Plotly.update() instead of
 * Plotly.restyle() in updateEditEmissionsFromHandles(), but that seems to slow things
 * down. So let us change the button instead: replace it with a clone to drop all its
 * events, then attach our own.
 */
export function fixAutoscale() {
    for (const autoscaleButton of document.querySelectorAll("[data-title=\"Autoscale\"]")) {
        const clonedButton = autoscaleButton.cloneNode(true);
        autoscaleButton.parentNode.replaceChild(clonedButton, autoscaleButton);
        clonedButton.onclick = autoScale;
    }
}

// ---------------------------------------------------------------- bulk redraws

/** Redraw every emission figure from scratch, one trace per row of the model-run log. */
export function refreshAllEmissionFigures() {
    const figlist = ["population", "otherCO2emissions", "CO2emissions", "CH4emissions", "N2Oemissions"];
    for (const name of figlist) {
        Plotly.purge(figureOf[name]);
    }

    const rows = dom.runLog.rows;
    const currentEmissions = cloneObject(state.emissions);
    for (let r = rows.length - 1; r >= 0; r--) {
        state.emissions = rows[r].emissions;
        plotEmissions(r === rows.length - 1);
        if (state.advancedMode) plotRegionalEmissions(true);
        plotOtherEmissions();
        plotPopulation();
    }
    for (const name of figlist) {
        for (let r = 0; r < rows.length; r++) {
            const ishidden = rows[r].classList.contains("hiddenrow");
            Plotly.restyle(figureOf[name], { opacity: 1 - ishidden }, r);
        }
    }
    state.emissions = currentEmissions;
    nudgeAllTitles();
}

/** Update the figures in place after an edit, or add a new trace set after a model run. */
export function updateFigures() {
    updateEditEmissionsFromHandles();
    const region = state.currentRegion;

    if (state.editExistingEmissions) {
        const retitle = (figure, y, title) =>
            Plotly.update(figure, { y: [y] }, { title }, figure.data.length - 1);

        retitle(dom.emissionsFigure, state.emissions[region]["FossilCO2"],
            "CO<sub>2</sub> emissions from fossil fuels:  " + region);
        retitle(figureOf["CH4emissions"], state.emissions[region]["CH4"],
            "CH<sub>4</sub> emissions:  " + region);
        retitle(figureOf["N2Oemissions"], state.emissions[region]["N2O"],
            "N<sub>2</sub>O emissions:  " + region);
        retitle(figureOf["population"], state.emissions[region]["Population"],
            "Population:  " + region);
        if (state.advancedMode) plotRegionalEmissions(true);
        plotIntensity(false);
    } else {
        plotEmissions();
        if (state.advancedMode) plotRegionalEmissions(true);
        plotOtherEmissions();
        plotPopulation();
        plotIntensity(true);
        state.editExistingEmissions = true;
    }

    // NOTE: unlike plotIntensity(), this uses fossil CO2 only and the SSP population
    // rather than the current scenario's. See BUGS.md (#5).
    const nyears = state.lastYear - state.firstYear + 1;
    const intensity = new Array(nyears);
    const population = getSSP("Global", "Population", state.firstYear, state.lastYear);
    for (let i = 0; i < nyears; i++) {
        intensity[i] = state.emissions["Global"]["FossilCO2"][i] / population[i];
    }
    Plotly.restyle(figureOf["intensity"], "y", [intensity], figureOf["intensity"].data.length - 1);
    nudgeAllTitles();
}
