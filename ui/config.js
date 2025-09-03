// Global variables
var firstYear = 2010;
var lastYear = 2100;
var firstDisplayYear = 2000;
var firstBreakpoint = {year: 2025, emissions: 38};  // set to null to disable
var showSSPinsteadofHistory = false;
var advancedmode = false;
var csSlider = document.getElementById('csSlider');
var emissionsfigure = document.getElementById("emissionsfigure");
var editemissions = document.getElementById("editemissions");
var figuregroup = document.getElementById('figuregroup');
var ghostfigure = document.getElementById('ghostfigure');
var trash = document.getElementById("trash");
var emissionstext = document.getElementById('emissionstext');
var interpolation = document.getElementById('interpolation');
var runlog = document.getElementById('runlog');
var scenariomenus = document.getElementsByClassName('scenario');
var zoomallowed = true;
var xspawn = 50, yspawn = 50;
var editExistingEmissions = true;
var carousel;
var interpolationmethod; // initialized in ui.js
var cardinaltension = 0.5;
var currentSSP = "SSP2-Baseline"; var currentSSPindex = 4;
var currentModel = "MESSAGE-GLOBIOM";
var currentRegion = "Global";
var currentregionnumber = 0;
var lastRegion = "Global";
var allregions = ["Global", "OECD", "Non-OECD", "Asia", "ROW"];
var harmonizationfactor = 1;		// [0-1], for estimating regional emissions after changing global emissions

var handles = {
    "Global": [],
    "OECD": [],
    "Non-OECD": [],
    "Asia": [],
    "ROW": [],
};
var lastbreakyear;
var lasthistoricyear = 2023;
var years = range(firstYear, lastYear, 1);
var allyears = range(backgrounddatastart, lastYear, 1);
var historicyears = range(backgrounddatastart, lasthistoricyear+1, 1);
var emissions = {
    "Global": {FossilCO2: [], OtherCO2: [], CH4: [], N2O: [], Population: []},
    "OECD": {FossilCO2: [], OtherCO2: [], CH4: [], N2O: [], Population: []},
    "Non-OECD": {FossilCO2: [], OtherCO2: [], CH4: [], N2O: [], Population: []},
    "Asia": {FossilCO2: [], OtherCO2: [], CH4: [], N2O: [], Population: []},
    "ROW": {FossilCO2: [], OtherCO2: [], CH4: [], N2O: [], Population: []}
};

// defined externally in UI_backgrounddata.js
// var CO2emissionhistory;
// var backgrounddatastart;

var figures; // initialized in ui.js
var fig = {}; // populated in ui.js

var newfigcontainer = document.getElementById('advancedfigures');

var plotlyColors = [
    '#1f77b4',	// muted blue
    '#ff7f0e',	// safety orange
    '#2ca02c',	// cooked asparagus green
    '#d62728',	// brick red
    '#9467bd',	// muted purple
    '#8c564b',	// chestnut brown
    '#e377c2',	// raspberry yogurt pink
    '#7f7f7f',	// middle gray
    '#bcbd22',	// curry yellow-green
    '#17becf' 	// blue-teal
];

var layout = {
    //autosize: false,
    showlegend: false,
    margin: {
        t: 50, r: 30, b: 40, l: 60, pad: 0
    },
    paper_bgcolor: '#fff',
    plot_bgcolor: '#fff',
    colorway: plotlyColors,		// sequence of line colors to use
    xaxis: {
        range: [Math.floor(firstDisplayYear/20)*20-1, 2101],
        tick0: Math.floor(firstDisplayYear/20)*20,
        dtick: 20,
        ticks: "outside",		// next three lines are a hack to get more spacing between x-axis and labels
        ticklen: 3,
        tickcolor: "rgba(255,255,255,0)",
        fixedrange: true,
        hoverformat: '.0f'
        //layer: 'below traces'
    },
    yaxis: {
        autorange: false,
        hoverformat: '.1f'
        //fixedrange: false,
        //layer: 'below traces'
    },
    dragmode: 'pan',		// disables drag-to-zoom on main plot area
    font: {size: 16},
    hoverinfo: 'x+y+text'
    //hovermode: false
};

var configOptions = {
    modeBarButtonsToRemove: [
        'toImage', 'sendDataToCloud', 'select2d', 'lasso2d',
        //'zoom2d', 'pan2d', 'zoomIn2d', 'zoomOut2d', 'autoScale2d'
        'resetScale2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian'
        ],
    doubleClick: false,
    displaylogo: false
    //displayModeBar: true
};

// draw a dummy plot to initialize the Plotly object (SplineHandle needs xaxis & yaxis properties)
var dummyline1 = {
    x: [1, 8],
    y: [1, 40],
    cliponaxis: false,
    mode: 'lines'
    //hoverinfo: 'none'
};

var dummyline2 = {
    x: [1, 8],
    y: [5, 30],
    cliponaxis: false,
    mode: 'markers',
    marker: {
        size: 14,
        color: 'rgb(31,119,180)',
        line: {
            color: 'rgba(0,0,0,.1)',
            width: 28
        }
    }
    //hoverinfo: 'none'
};

var dummyline3 = {
    x: [1, 8],
    y: [1, 40],
    cliponaxis: false,
    mode: 'lines+markers',
    line: {
        color: 'rgb(0, 0, 0)',
        width: 1
    },
    marker: {
        size: 3
    }
    //hoverinfo: 'none'
};