// Design-time configuration. Anything that changes while the app runs lives in state.js.

export const ALL_REGIONS = ["Global", "OECD", "Non-OECD", "Asia", "ROW"];

// Breakpoint pinned to recent observed emissions. Set to null to disable.
export const FIRST_BREAKPOINT = { year: 2025, emissions: 38 };

// Draw the base SSP scenario instead of the observed emission history as the background curve.
export const SHOW_SSP_INSTEAD_OF_HISTORY = false;

// Last year covered by the observed data in emission_history.js.
export const LAST_HISTORIC_YEAR = 2023;

// Breakpoint years used when a region has no handles yet.
export const DEFAULT_HANDLE_YEARS = [2020, 2030, 2050, 2070];

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
