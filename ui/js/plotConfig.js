// Shared Plotly configuration. Individual plots start from a clone of `baseLayout` and
// override the title and y-axis.

export const PLOTLY_COLORS = [
    "#1f77b4",  // muted blue
    "#ff7f0e",  // safety orange
    "#2ca02c",  // cooked asparagus green
    "#d62728",  // brick red
    "#9467bd",  // muted purple
    "#8c564b",  // chestnut brown
    "#e377c2",  // raspberry yogurt pink
    "#7f7f7f",  // middle gray
    "#bcbd22",  // curry yellow-green
    "#17becf"   // blue-teal
];

const FIRST_DISPLAY_YEAR = 2000;

// Mutable: the year-selection slider rewrites `baseLayout.xaxis`.
export const baseLayout = {
    showlegend: false,
    margin: { t: 50, r: 30, b: 40, l: 60, pad: 0 },
    paper_bgcolor: "#fff",
    plot_bgcolor: "#fff",
    colorway: PLOTLY_COLORS,     // sequence of line colors to use
    xaxis: {
        range: [Math.floor(FIRST_DISPLAY_YEAR / 20) * 20 - 1, 2101],
        tick0: Math.floor(FIRST_DISPLAY_YEAR / 20) * 20,
        dtick: 20,
        ticks: "outside",        // next three lines are a hack to get more spacing between x-axis and labels
        ticklen: 3,
        tickcolor: "rgba(255,255,255,0)",
        fixedrange: true,
        hoverformat: ".0f"
    },
    yaxis: {
        autorange: false,
        hoverformat: ".1f"
    },
    dragmode: "pan",             // disables drag-to-zoom on main plot area
    font: { size: 16 },
    hoverinfo: "x+y+text"
};

export const plotConfigOptions = {
    modeBarButtonsToRemove: [
        "toImage", "sendDataToCloud", "select2d", "lasso2d",
        "resetScale2d", "toggleSpikelines", "hoverClosestCartesian", "hoverCompareCartesian"
    ],
    doubleClick: false,
    displaylogo: false
};

// Traces used to initialise the Plotly object before any real data exists; SplineHandle
// needs the xaxis & yaxis properties to be present.
//
// NOTE: these objects are deliberately shared and mutable. Plotly keeps the trace objects
// it is handed inside gd.data, so `historyTrace` below doubles as the live background
// trace of whichever figure was drawn with it most recently.
export const dummyLine = {
    x: [1, 8],
    y: [1, 40],
    cliponaxis: false,
    mode: "lines"
};

export const dummyMarkers = {
    x: [1, 8],
    y: [5, 30],
    cliponaxis: false,
    mode: "markers",
    marker: {
        size: 14,
        color: "rgb(31,119,180)",
        line: {
            color: "rgba(0,0,0,.1)",
            width: 28
        }
    }
};

// The thin black "observed history" curve, and the breakpoint markers' backing trace.
export const historyTrace = {
    x: [1, 8],
    y: [1, 40],
    cliponaxis: false,
    mode: "lines+markers",
    line: {
        color: "rgb(0, 0, 0)",
        width: 1
    },
    marker: {
        size: 3
    }
};
