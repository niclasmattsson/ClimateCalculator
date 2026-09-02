// The application's mutable state, in one place. Previously these were ~30 separate
// `var`s on `window`; collecting them here makes every read and write greppable.

import { range } from "./utils.js";
import { ALL_REGIONS, BASE_YEAR, LAST_HISTORIC_YEAR, CALIBRATION_YEARS } from "./settings.js";
import { backgroundDataStart } from "./data/emissionHistory.js";

const perRegion = (makeValue) => Object.fromEntries(ALL_REGIONS.map((r) => [r, makeValue()]));
const emptyGasSeries = () => ({ FossilCO2: [], OtherCO2: [], CH4: [], N2O: [], Population: [] });

export const state = {
    // Year range, driven by the year-selection slider in the settings panel.
    firstYear: BASE_YEAR,
    lastYear: 2100,
    firstDisplayYear: 2000,
    years: range(BASE_YEAR, 2100),
    historicYears: range(backgroundDataStart, LAST_HISTORIC_YEAR),

    // Window of observations the model calibrates against, from the slider in the settings
    // panel. Takes effect on the next model run, not on the runs already drawn.
    firstCalibrationYear: CALIBRATION_YEARS[0],
    lastCalibrationYear: CALIBRATION_YEARS[1],

    // Scenario selection.
    currentSSP: "SSP2-Baseline",
    currentSSPindex: 4,
    currentModel: "MESSAGE-GLOBIOM",

    // Region selection.
    currentRegion: "Global",
    currentRegionNumber: 0,
    lastRegion: "Global",
    // [0-1]. Governs how a change to global emissions is split across subregions.
    harmonizationFactor: 1,

    // Interpolation between emission breakpoints. Set from the menu during init.
    interpolationMethod: "fritschbutland",
    cardinalTension: 0.5,

    // Interaction flags.
    advancedMode: false,
    zoomAllowed: true,
    // False once the current emission path has been sent to the model, i.e. the next
    // edit starts a new run rather than overwriting the one on screen.
    editExistingEmissions: true,

    // Emission series per region and gas, and the draggable breakpoints per region.
    emissions: perRegion(emptyGasSeries),
    handles: perRegion(() => []),
    // Years before this are history: handles dragged past it are deleted.
    lastBreakYear: undefined
};

/**
 * Recompute the derived year vectors after the year-selection slider moves. The observed
 * history stops where the designed pathway takes over, so that the two do not overlap when
 * the scenario is started before the last year of the observations.
 */
export function updateYears() {
    state.years = range(state.firstYear, state.lastYear);
    state.historicYears = range(backgroundDataStart, Math.min(LAST_HISTORIC_YEAR, state.firstYear));
}
