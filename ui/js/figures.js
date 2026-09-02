// Everything that draws a Plotly figure.

import { state } from "./state.js";
import { dom, figureOf } from "./dom.js";
import { cloneObject, range } from "./utils.js";
import { getSSP } from "./sspData.js";
import { CO2emissionHistory, backgroundDataStart } from "./data/emissionHistory.js";
import { OBSERVED_HISTORY, OBSERVED_HISTORY_START } from "./data/observedHistory.js";
import { SHOW_SSP_INSTEAD_OF_HISTORY, SPAWN_POSITION } from "./settings.js";
import { updateEditEmissionsFromHandles } from "./handles.js";
import {
    baseLayout, plotConfigOptions, PLOTLY_COLORS, HISTORY_COLORWAY, historyTrace, grayHistoryTrace
} from "./plotConfig.js";

/** Plot options derived from the shared layout, with this figure's title and y-axis. */
function layoutFor(title, yaxis, overrides = {}) {
    return Object.assign(cloneObject(baseLayout), { title, yaxis }, overrides);
}

/**
 * Same, for a figure whose trace 0 is the gray observed-history curve. The extra colour
 * in front of the colourway keeps run n on the same colour as its swatch in the log.
 */
function historyLayoutFor(title, yaxis, overrides = {}) {
    return layoutFor(title, yaxis, Object.assign({ colorway: HISTORY_COLORWAY }, overrides));
}

const gtCO2 = (hoverformat) => ({ title: "Gton CO<sub>2</sub>/year", hoverformat });
const draw = (figure, trace, options) => Plotly.plot(figure, [trace], options, plotConfigOptions);

/** Move a figure's title down; Plotly puts it too close to the plot area. */
function nudgeTitle(figure, y = 35) {
    const title = figure.querySelector(".gtitle");
    if (title) title.setAttribute("y", y);
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
        y: CO2emissionHistory[region].slice(0, state.historicYears.length)
    };
}

/**
 * The observed history behind the figures other than the fossil CO2 ones, from
 * data/observedHistory.js. `globalOnly` marks the series the repository only has as a
 * world total: outside the Global region the curve is drawn empty rather than wrong, so
 * that trace 0 of every figure is the history curve whichever region is selected.
 */
const OBSERVED_HISTORY_END =
    OBSERVED_HISTORY_START + OBSERVED_HISTORY["Temperature"].length - 1;

function observedTrace(series, globalOnly = false) {
    if (globalOnly && state.currentRegion !== "Global") {
        return grayHistoryTrace([], []);
    }
    // Stop where the designed pathway takes over, as the fossil CO2 history does, so that
    // starting the scenario before the end of the observations does not draw both at once.
    const years = range(OBSERVED_HISTORY_START,
        Math.min(OBSERVED_HISTORY_END, state.firstYear));
    return grayHistoryTrace(years, OBSERVED_HISTORY[series].slice(0, years.length));
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
            .slice(0, state.historicYears.length);
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

// Emissions are in Gton CO2/year and population in billions of people, so the ratio is
// tons of CO2 per person per year.
const PER_CAPITA_AXIS = {
    title: "ton CO<sub>2</sub>/person/year",
    rangemode: "tozero",
    hoverformat: ".2f"
};

/** Total CO2 (fossil and other) per head, for one region. */
export function perCapita(region) {
    const series = new Array(state.lastYear - state.firstYear + 1);
    const emissions = state.emissions[region];
    for (let i = 0; i < state.years.length; i++) {
        series[i] = (emissions["FossilCO2"][i] + emissions["OtherCO2"][i]) / emissions["Population"][i];
    }
    return series;
}

export function plotIntensity(plotglobalfigure, plothistory = false) {
    const intensity = {};

    if (state.advancedMode) {
        Plotly.purge(figureOf["regionalintensity"]);
        const options = layoutFor("CO<sub>2</sub> emissions per capita:  Regional", PER_CAPITA_AXIS,
            { colorway: ["#555", "#C44", "#44C", "#4C4"] });
        for (const region of regionalPlotList()) {
            intensity[region] = perCapita(region);
            draw(figureOf["regionalintensity"], { x: state.years, y: intensity[region], name: "" }, options);
        }
    } else {
        intensity["Global"] = perCapita("Global");
    }

    if (plotglobalfigure) {
        const options = historyLayoutFor("CO<sub>2</sub> emissions per capita", PER_CAPITA_AXIS);
        // Observed total CO2 over the observed world population. perCapita() divides by
        // the scenario's population instead, which is a few per cent lower in 2023, so the
        // two meet with a small step.
        if (plothistory) draw(figureOf["intensity"], observedTrace("PerCapitaCO2"), options);
        draw(figureOf["intensity"], { x: state.years, y: intensity["Global"], name: "" }, options);
    }
}

export function plotPopulation(plothistory = false) {
    const options = historyLayoutFor("Population:  " + state.currentRegion,
        { title: "billion people", rangemode: "tozero", hoverformat: ".3f" });
    if (plothistory) draw(figureOf["population"], observedTrace("Population", true), options);
    draw(figureOf["population"], {
        x: state.years,
        y: state.emissions[state.currentRegion]["Population"],
        name: ""
    }, options);
}

export function plotOtherEmissions(plothistory = false) {
    const region = state.currentRegion;
    const withHistory = (name, series, options) => {
        if (plothistory) draw(figureOf[name], observedTrace(series, true), options);
    };

    const ch4Options = historyLayoutFor("CH<sub>4</sub> emissions:  " + region,
        { title: "MtCH<sub>4</sub>/year", rangemode: "tozero", hoverformat: ".0f" });
    withHistory("CH4emissions", "CH4", ch4Options);
    draw(figureOf["CH4emissions"], { x: state.years, y: state.emissions[region]["CH4"], name: "" },
        ch4Options);
    nudgeTitle(figureOf["CH4emissions"]);

    const n2oOptions = historyLayoutFor("N<sub>2</sub>O emissions:  " + region,
        { title: "MtN/year", rangemode: "tozero", hoverformat: ".2f" });
    withHistory("N2Oemissions", "N2O", n2oOptions);
    draw(figureOf["N2Oemissions"], { x: state.years, y: state.emissions[region]["N2O"], name: "" },
        n2oOptions);
    nudgeTitle(figureOf["N2Oemissions"]);

    const otherOptions = historyLayoutFor("Other CO<sub>2</sub> emissions:  " + region,
        Object.assign(gtCO2(".1f"), { rangemode: "tozero" }));
    withHistory("otherCO2emissions", "OtherCO2", otherOptions);
    draw(figureOf["otherCO2emissions"], { x: state.years, y: state.emissions[region]["OtherCO2"], name: "" },
        otherOptions);
    nudgeTitle(figureOf["otherCO2emissions"]);
}

// ---------------------------------------------------------------- model results

// The result figures are drawn once per model run, so their layouts are built in one place
// and reused by plotResultHistory() below, which draws the observed record behind them.
const concentrationLayout = (gas, unit) => historyLayoutFor(
    gas + " concentration in the atmosphere", { title: unit, hoverformat: ".0f" });

const temperatureLayout = () => historyLayoutFor(
    "Mean surface temperature<br><span>(change since preindustrial times)</span>",
    { title: "degrees (&deg;C)", rangemode: "tozero", hoverformat: ".2f" });

/**
 * The observed record on the four model-result figures. Unlike the emission figures these
 * hold no run until the model is run, and a lone history curve on an otherwise empty chart
 * reads as a result rather than as a backdrop, so it is drawn hidden and showHistory()
 * below reveals it along with the first result. Drawing it now rather than later is what
 * gives the figures their axes and their title, and keeps the history at trace 0.
 */
export function plotResultHistory() {
    const hidden = (series) => Object.assign(observedTrace(series), { visible: false });
    draw(figureOf["CO2concentration"], hidden("CO2concentration"),
        concentrationLayout("CO<sub>2</sub>", "ppm"));
    draw(figureOf["CH4concentration"], hidden("CH4concentration"),
        concentrationLayout("CH<sub>4</sub>", "ppb"));
    draw(figureOf["N2Oconcentration"], hidden("N2Oconcentration"),
        concentrationLayout("N<sub>2</sub>O", "ppb"));
    draw(figureOf["temperature"], hidden("Temperature"), temperatureLayout());
    plotRunComponents();
    nudgeResultTitles();
}

/** Reveal the observed record of a result figure, now that there is a result to put it behind. */
function showHistory(name) {
    const figure = figureOf[name];
    if (figure.data && figure.data.length && figure.data[0].visible === false) {
        Plotly.restyle(figure, { visible: true }, 0);
    }
}

function nudgeResultTitles() {
    nudgeTitle(figureOf["CO2concentration"]);
    nudgeTitle(figureOf["CH4concentration"]);
    nudgeTitle(figureOf["N2Oconcentration"]);
    figureOf["temperature"].querySelector(".gtitle .line").setAttribute("y", 35);
    figureOf["temperature"].querySelector(".gtitle .line:last-Child").setAttribute("y", 35);
}

export function plotConcentration(concentrations) {
    showHistory("CO2concentration");
    showHistory("CH4concentration");
    showHistory("N2Oconcentration");
    draw(figureOf["CO2concentration"], { x: state.years, y: concentrations["CO2"], name: "" },
        concentrationLayout("CO<sub>2</sub>", "ppm"));
    nudgeTitle(figureOf["CO2concentration"]);

    draw(figureOf["CH4concentration"], { x: state.years, y: concentrations["CH4"], name: "" },
        concentrationLayout("CH<sub>4</sub>", "ppb"));
    nudgeTitle(figureOf["CH4concentration"]);

    // NOTE: no `name` on this trace, unlike the two above.
    draw(figureOf["N2Oconcentration"], { x: state.years, y: concentrations["N2O"] },
        concentrationLayout("N<sub>2</sub>O", "ppb"));
    nudgeTitle(figureOf["N2Oconcentration"]);
}

export function plotTemperature(temp) {
    showHistory("temperature");
    draw(figureOf["temperature"], { x: state.years, y: temp, name: "" }, temperatureLayout());
    figureOf["temperature"].querySelector(".gtitle .line").setAttribute("y", 35);
    figureOf["temperature"].querySelector(".gtitle .line:last-Child").setAttribute("y", 35);
}

// ---------------------------------------------------------------- run components

/**
 * The two figures that take a single model run apart instead of putting one trace per run
 * on a shared chart: where the emitted carbon ends up, and what the radiative forcing is
 * made of. Both come straight out of the model's state, which used to be discarded at the
 * HTTP boundary (see IMPROVEMENTS.md 1.2).
 *
 * Half a dozen component curves per run would be unreadable overlaid, so unlike every
 * other carousel figure these show one run at a time: the newest after a model run, and
 * whichever row is clicked in the log afterwards. That also keeps them out of the run
 * log's trace bookkeeping, which counts on one trace per run -- see isComponentFigure().
 *
 * Both are stacked areas rather than a bundle of lines: in each figure the components add
 * up to a total the model also reports, so a band's width is one part and the outline
 * drawn over the stack is the whole.
 */

/** A `#rrggbb` colour with an alpha channel, for the fill under a band's outline. */
function translucent(hex, alpha) {
    const rgb = parseInt(hex.slice(1), 16);
    return "rgba(" + [rgb >> 16 & 255, rgb >> 8 & 255, rgb & 255, alpha].join(",") + ")";
}

/**
 * Running totals of `seriesList`. A band drawn at the running total and filled down to the
 * band before it covers exactly its own component, which is how the stacks here are built:
 * this Plotly is 1.39 and predates the `stackgroup` attribute that does it natively.
 */
function runningTotals(seriesList) {
    let total = null;
    return seriesList.map((series) => {
        total = series.map((value, i) => value + (total ? total[i] : 0));
        return total;
    });
}

/**
 * One filled band per entry of `components` ({ name, values, color }), stacked in the order
 * given, bottom first. Every band is drawn at a running total, so hovering one would report
 * the total rather than the component; `text` puts the component's own value back.
 */
function stackedBands(x, components, { alpha = 0.8, showlegend = true, decimals = 1 } = {}) {
    const totals = runningTotals(components.map((c) => c.values));
    return components.map((component, i) => ({
        x,
        y: totals[i],
        name: component.name,
        legendgroup: component.name,
        showlegend,
        mode: "lines",
        // The bottom band rests on the axis; the rest fill down to the band below.
        fill: i === 0 ? "tozeroy" : "tonexty",
        fillcolor: translucent(component.color, alpha),
        line: { color: component.color, width: 1 },
        hoverinfo: "x+text",
        text: component.values.map((v) => component.name + ": " + v.toFixed(decimals))
    }));
}

/** The outline over a stack: the total its bands add up to. */
function totalTrace(name, x, y, color, decimals) {
    return {
        x,
        y,
        name,
        mode: "lines",
        line: { color, width: 3 },
        hoverinfo: "x+text",
        text: y.map((v) => name + ": " + v.toFixed(decimals))
    };
}

/** Shared layout for both component figures: a legend inside the plot, in its free corner. */
function componentLayout(title, yaxis) {
    return layoutFor(title, yaxis, {
        showlegend: true,
        legend: {
            x: 0.02, xanchor: "left",
            y: 0.98, yanchor: "top",
            // Translucent, because which corner is free depends on the pathway drawn.
            bgcolor: "rgba(255, 255, 255, 0.8)",
            bordercolor: "#ddd",
            borderwidth: 1,
            font: { size: 12 }
        }
    });
}

const carbonSinksLayout = () => componentLayout(
    "Carbon sinks",
    { title: "Gton CO<sub>2</sub>/year", rangemode: "tozero", hoverformat: ".1f" });

const forcingLayout = () => componentLayout(
    "Radiative forcing",
    { title: "W/m<sup>2</sup>", rangemode: "tozero", hoverformat: ".2f" });

// Where the emitted carbon ends up, in the order the bands are stacked, and the colour of
// the total emissions that the three of them add up to.
const SINK_BANDS = [
    ["atmosphere", "Atmosphere", "#a6cee3"],   // light blue
    ["ocean", "Ocean sink", "#1f78b4"],        // dark blue
    ["land", "Land sink", "#33a02c"]           // green
];
const TOTAL_EMISSIONS_COLOR = "#333";

// Response key, legend label and colour of each forcing component, warming terms first.
// The keys are the ones radiativeforcingcomponents() in src/webserver.jl returns; the
// colours are the customary ones for these gases, with the cooling aerosol term in blue.
const FORCING_COMPONENTS = [
    ["CO2", "CO<sub>2</sub>", "#d62728"],
    ["CH4", "CH<sub>4</sub>", "#ff7f0e"],
    ["N2O", "N<sub>2</sub>O", "#9467bd"],
    ["H2O", "H<sub>2</sub>O (strat.)", "#17becf"],
    ["O3", "O<sub>3</sub> (trop.)", "#bcbd22"],
    ["Other", "Other", "#7f7f7f"],
    ["Aerosols", "Aerosols", "#1f77b4"]
];

/**
 * The observed carbon budget over the years before the designed pathway starts, split the
 * same three ways as the model's own. The Global Carbon Budget supplies the two sinks and
 * both halves of the emissions; whatever the sinks leave behind is the atmospheric growth,
 * exactly as carbonsinks() in src/webserver.jl reads it out of the model. The budget
 * imbalance, up to a gigaton or so in a single year, therefore lands in the atmosphere band.
 */
function observedCarbonBudget() {
    const years = range(OBSERVED_HISTORY_START,
        Math.min(OBSERVED_HISTORY_END, state.firstYear));
    const cut = (series, start) => series.slice(start, start + years.length);
    const fossil = cut(CO2emissionHistory["Global"], OBSERVED_HISTORY_START - backgroundDataStart);
    const ocean = cut(OBSERVED_HISTORY["OceanSink"], 0);
    const land = cut(OBSERVED_HISTORY["LandSink"], 0);
    const emissions = cut(OBSERVED_HISTORY["OtherCO2"], 0).map((v, i) => v + fossil[i]);
    return {
        years,
        emissions,
        atmosphere: emissions.map((v, i) => v - ocean[i] - land[i]),
        ocean,
        land
    };
}

function carbonSinkTraces(sinks) {
    const observed = observedCarbonBudget();
    const bands = (source, x, options) => stackedBands(x,
        SINK_BANDS.map(([key, name, color]) => ({ name, color, values: source[key] })), options);
    return [
        // The record the run continues, drawn paler so that it reads as observation rather
        // than as model output, and without a second set of legend entries.
        ...bands(observed, observed.years, { alpha: 0.4, showlegend: false }),
        ...bands(sinks, state.years, {}),
        totalTrace("Total CO<sub>2</sub> emissions",
            observed.years.concat(state.years),
            observed.emissions.concat(sinks.emissions), TOTAL_EMISSIONS_COLOR, 1)
    ];
}

/**
 * The forcing components stacked around zero: the warming terms up from the axis and the
 * cooling ones down from it, each in a stack of its own so that neither eats into the
 * other. Aerosols are the term that is negative in practice, but the split is read off the
 * run rather than assumed, since the residual "Other" term carries volcanoes among the rest.
 *
 * The total is not the top of the warming stack -- it is the two stacks netted -- so the
 * gap between the total line and that top is the size of the cooling stack below zero.
 */
function forcingTraces(forcing) {
    const components = FORCING_COMPONENTS.map(([key, name, color]) =>
        ({ name, color, values: forcing[key] }));
    const cools = (component) => component.values.reduce((a, b) => a + b, 0) < 0;
    const options = { decimals: 2 };
    return [
        ...stackedBands(state.years, components.filter((c) => !cools(c)), options),
        ...stackedBands(state.years, components.filter(cools), options),
        totalTrace("Total", state.years, forcing["Total"], "#000", 2)
    ];
}

/**
 * Draw both component figures for one set of model results. Called with nothing -- at
 * start-up, after a change of year range, and whenever the active run in the log has no
 * results of its own -- it leaves them empty, holding only their axes and title.
 */
export function plotRunComponents(results) {
    const redraw = (name, traces, options) => {
        // react() rather than purge-and-plot: the trace list changes wholesale on every
        // run, and this keeps the figure's modebar and axes rather than rebuilding them.
        // An empty figure has nothing to put in a legend, and Plotly would draw the box.
        options.showlegend = traces.length > 0;
        Plotly.react(figureOf[name], traces, options, plotConfigOptions);
        nudgeTitle(figureOf[name]);
    };
    redraw("carbonsinks", results ? carbonSinkTraces(results.carbonsinks) : [],
        carbonSinksLayout());
    redraw("radiativeforcing", results ? forcingTraces(results.forcing) : [],
        forcingLayout());
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

    // On the editable figure only trace 0 is the emission path; traces 1 and 2 hold the
    // background curve and the breakpoint markers. A carousel figure holds the observed
    // history plus one trace per model run, and all of them should fit.
    let min = 0;
    let max = -Infinity;
    for (const trace of (event ? figure.data : [figure.data[0]])) {
        for (const y of trace.y || []) {
            if (y === null || isNaN(y)) continue;
            if (y < min) min = y;
            if (y > max) max = y;
        }
    }
    if (max > -Infinity) Plotly.relayout(figure, { "yaxis.range": [min * 1.1, max * 1.1] });

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

/**
 * Put the model-result figures back to their start-up state. Their traces came from runs
 * made over a different year range, so a change to that range has to discard them, exactly
 * as the run log is emptied at the same moment. The per-capita figure belongs here too: its
 * curve is a model result even though the figure is not.
 */
export function resetResultFigures() {
    for (const name of ["CO2concentration", "CH4concentration", "N2Oconcentration",
                        "temperature", "intensity"]) {
        Plotly.purge(figureOf[name]);
    }
    plotResultHistory();
    plotIntensity(true, true);
    nudgeAllTitles();
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
        const first = r === rows.length - 1;
        plotEmissions(first);
        if (state.advancedMode) plotRegionalEmissions(true);
        plotOtherEmissions(first);
        plotPopulation(first);
    }
    for (const name of figlist) {
        for (let r = 0; r < rows.length; r++) {
            const ishidden = rows[r].classList.contains("hiddenrow");
            // The rows were replotted oldest first, behind the history curve at trace 0,
            // so row r (row 0 being the newest run) is trace rows.length - r.
            Plotly.restyle(figureOf[name], { opacity: 1 - ishidden }, rows.length - r);
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

    // Same definition plotIntensity() uses for the regional figure, so that the "Global"
    // line there and this figure agree.
    Plotly.restyle(figureOf["intensity"], "y", [perCapita("Global")],
        figureOf["intensity"].data.length - 1);
    nudgeAllTitles();
}
