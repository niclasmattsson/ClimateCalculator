// Design-time configuration. Anything that changes while the app runs lives in state.js.

export const ALL_REGIONS = ["Global", "OECD", "Non-OECD", "Asia", "ROW"];

// Draw the base SSP scenario instead of the observed emission history as the background curve.
export const SHOW_SSP_INSTEAD_OF_HISTORY = false;

// Last year covered by the observed data in emission_history.js.
export const LAST_HISTORIC_YEAR = 2023;

// The year the designed emission pathway starts, where the observed history hands over.
// Must match BASEYEAR in src/settings.jl, which the model's cached history is built around.
export const BASE_YEAR = 2023;

// Years the SSP scenario database covers, and so the years the designed pathway can span.
// getSSP() indexes its annual series from FIRST_SCENARIO_YEAR; the model server cannot
// return results past LAST_SCENARIO_YEAR either.
export const FIRST_SCENARIO_YEAR = 2005;
export const LAST_SCENARIO_YEAR = 2100;

// Default window of observations the model fits its aerosol forcing factor and its CO2
// fertilization factor to, and the earliest year the calibration slider allows. Must match
// CALIBRATIONYEARS in src/settings.jl, and start after BASELINEYEARS ends there in 1900.
export const CALIBRATION_YEARS = [2010, BASE_YEAR];
export const FIRST_CALIBRATION_YEAR = 1901;

// Breakpoint years used when a region has no handles yet.
export const DEFAULT_HANDLE_YEARS = [2030, 2050, 2070];

// SSP scenarios are scaled to meet the observed emissions in BASE_YEAR, with the correction
// fading to nothing by this year. Set to null to use the scenarios unaltered.
export const HARMONIZATION_END_YEAR = 2050;

// Pixel position of the spawn handle and of the trash can it sits on.
export const SPAWN_POSITION = { x: 50, y: 50 };

// Region colours, indexed the same way as the region buttons.
export const REGION_COLORS = {
    idle:          ["#BBB", "#ECC", "#CCE", "#CEC"],
    idleHover:     ["#CCC", "#FDD", "#DDF", "#DFD"],
    selected:      ["#555", "#C44", "#44C", "#4C4"],
    selectedHover: ["#777", "#D55", "#55D", "#5D5"]
};

// Which regions the region buttons offer, per "number of regions" menu index.
export const REGION_BUTTON_LAYOUTS = [
    ["Global"],
    ["Global", "Non-OECD", "OECD"],
    ["Global", "Asia", "OECD", "ROW"]
];
