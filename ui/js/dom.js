// Every element the app touches, looked up once. Module scripts are deferred, so the
// document is fully parsed by the time this module is evaluated.

const byId = (id) => document.getElementById(id);

export const dom = {
    // Sliders (noUiSlider attaches its API to these elements).
    csSlider: byId("csSlider"),
    yearSelectionSlider: byId("yearSelectionSlider"),
    harmonizationSlider: byId("harmonizationSlider"),
    calibrationSlider: byId("calibrationSlider"),

    // The enlarged, editable emissions plot and its overlay.
    ghostFigure: byId("ghostfigure"),
    editEmissions: byId("editemissions"),
    emissionsText: byId("emissionstext"),
    trash: byId("trash"),

    // The carousel of result figures.
    figureGroup: byId("figuregroup"),
    emissionsFigure: byId("emissionsfigure"),
    advancedFigureContainer: byId("advancedfigures"),

    // Settings panel.
    settingsWindow: byId("settingswindow"),
    settingsOpen: byId("settingsopen"),
    settingsClose: byId("settingsclose"),
    modeToggle: byId("modetoggle"),
    sspModelMenu: byId("SSPmodel"),
    interpolationMenu: byId("interpolation"),

    // Input panel.
    simpleUI: byId("simpleUI"),
    advancedUI: byId("advancedUI"),
    scenarioMenus: document.getElementsByClassName("scenario"),
    lockCO2Boxes: [byId("lockCO2box1"), byId("lockCO2box2")],
    numberOfRegionsMenu: byId("numberregions"),
    regionButtons: byId("regionbuttons"),
    runModelButton: byId("csSlider").parentNode.getElementsByTagName("input")[0],

    // Model-run log.
    runLog: byId("runlog"),
    cumulativeHeader: byId("cumulativeheader"),
    clearHiddenButton: byId("clearhidden"),
    clearFiguresButton: byId("clearfigures")
};

const carouselFigures = dom.figureGroup.querySelectorAll("figure");

/**
 * The figures addressed by name. `regionalintensity` and `regionalCO2emissions` are
 * inserted into the carousel only in advanced mode, so they stay undefined until then.
 */
export const figureOf = {
    population: carouselFigures[0],
    otherCO2emissions: carouselFigures[1],
    intensity: carouselFigures[2],
    regionalintensity: undefined,
    regionalCO2emissions: undefined,
    CO2emissions: carouselFigures[3],
    CO2concentration: carouselFigures[4],
    temperature: carouselFigures[5],
    carbonsinks: carouselFigures[6],
    radiativeforcing: carouselFigures[7],
    CH4concentration: carouselFigures[8],
    N2Oconcentration: carouselFigures[9],
    CH4emissions: carouselFigures[10],
    N2Oemissions: carouselFigures[11]
};

/**
 * True for the two figures that break a single model run into its components instead of
 * carrying one trace per run (`carbonsinks` and `radiativeforcing`). The run log's trace
 * bookkeeping -- hide a run, clear the hidden ones -- counts on the one-trace-per-run
 * layout, so it skips these; figures.js redraws them from the active run instead.
 */
export function isComponentFigure(figure) {
    return figure.classList.contains("componentfigure");
}

/**
 * All figures currently in the carousel, in DOM order. Queried fresh because advanced
 * mode inserts and removes two of them.
 */
export function allFigures() {
    return dom.figureGroup.querySelectorAll("figure");
}
