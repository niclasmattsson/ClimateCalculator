// Global variables
var firstYear = 2010;
var lastYear = 2100;
var firstDisplayYear = 2000;
var force2020emissions = 38;	// 0 to not force
var showSSPinsteadofHistory = false;
var advancedmode = false;
var reallystartadvancedmode = false;
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
var interpolationmethod = interpolation.options[interpolation.selectedIndex].value;
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
var years = range(firstYear, lastYear, 1);
var allyears = range(backgrounddatastart, lastYear, 1);
var historicyears = range(backgrounddatastart, 2016, 1);
var emissions = {
	"Global": {FossilCO2: [], OtherCO2: [], CH4: [], N2O: []},
	"OECD": {FossilCO2: [], OtherCO2: [], CH4: [], N2O: []},
	"Non-OECD": {FossilCO2: [], OtherCO2: [], CH4: [], N2O: []},
	"Asia": {FossilCO2: [], OtherCO2: [], CH4: [], N2O: []},
	"ROW": {FossilCO2: [], OtherCO2: [], CH4: [], N2O: []}
};

// defined externally in UI_backgrounddata.js
// var CO2emissionhistory;
// var backgrounddatastart;

var figures = figuregroup.querySelectorAll("figure");
var fig = {
	"population": figures[0],
	"regionalintensity": undefined,
	"regionalCO2emissions": undefined,
	"otherCO2emissions": figures[1],
	"intensity": figures[2],
	"CO2emissions": figures[3],
	"CO2concentration": figures[4],
	"temperature": figures[5],
	"CH4concentration": figures[6],
	"N2Oconcentration": figures[7],
	"CH4emissions": figures[8],
	"N2Oemissions": figures[9]
}
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
var dummyline4 = cloneObject(dummyline3);

function decimals(n, unit) {
	unit = typeof unit === "undefined" ? "" : unit;
	return {
		to: function(value) {
			return value !== undefined && value.toFixed(n) + unit;
		},
		from: Number
	}
}

function round(num, decimals) {
	var mult = Math.pow(10,decimals);
	return Math.round(num * mult)/mult;
}

function clamp(x, lower, upper) {
	return Math.max(lower, Math.min(x, upper));
}

function range(start,end,delta) {
	delta = typeof delta === "undefined" ? 1 : delta;
	var n = Math.round((end - start)/delta + 1);
	if (n <= 0) return [];
	var arr = Array(n-1);
	for (var i=0; i<=n-1; i++) {
		arr[i] = ((n-1-i)*start + i*end) / (n-1);
	}
	return arr;
}

function cloneObject(obj) {
	return JSON.parse(JSON.stringify(obj));
}

// Interpolate using cubic Hermite splines. The breakpoints in arrays xbp and ybp are assumed to be sorted.
// Evaluate the function in all points of the array xeval.
function interpolateCubicHermite(xeval, xbp, ybp) {
	// first we need to determine tangents (m)
	var n = xbp.length;
	var obj = calcTangents(xbp, ybp, interpolationmethod, cardinaltension);
	m = obj.m;          // length n
	delta = obj.delta;  // length n-1
	var c = new Array(n-1);
	var d = new Array(n-1);
	if (interpolationmethod.toLowerCase() == 'linear') {
		for (var k=0; k < n-1; k++) {
			m[k] = delta[k];
			c[k] = d[k] = 0;
		}
	} else if (interpolationmethod.toLowerCase() == 'exponential') {
		for (var k=0; k < n-1; k++) {
			m[k] = Math.pow(ybp[k+1]/ybp[k], 1/(xbp[k+1] - xbp[k])) - 1;
			c[k] = d[k] = 0;
		}
	} else {
		for (var k=0; k < n-1; k++) {
			var xdiff = xbp[k+1] - xbp[k];
			c[k] = (3*delta[k] - 2*m[k] - m[k+1]) / xdiff;
			d[k] = (m[k] + m[k+1] - 2*delta[k]) / xdiff / xdiff;
		}
	}

	var len = xeval.length;
	var f = new Array(len);
	var k = 0;
	if (interpolationmethod.toLowerCase() == 'exponential') {
		for (var i=0; i < len; i++) {
			var x = xeval[i];
			if (x < xbp[0] || x > xbp[n-1]) {
				throw "interpolateCubicHermite: x value " + x + " outside breakpoint range [" + xbp[0] + ", " + xbp[n-1] + "]";
			}
			while (k < n-1 && x > xbp[k+1]) {
				k++;
			}
			f[i] = ybp[k] * Math.pow(1 + m[k], x - xbp[k]); 
		}
	} else {
		for (var i=0; i < len; i++) {
			var x = xeval[i];
			if (x < xbp[0] || x > xbp[n-1]) {
				throw "interpolateCubicHermite: x value " + x + " outside breakpoint range [" + xbp[0] + ", " + xbp[n-1] + "]";
			}
			while (k < n-1 && x > xbp[k+1]) {
				k++;
			}
			var xdiff = x - xbp[k];
			f[i] = ybp[k] + m[k]*xdiff + c[k]*xdiff*xdiff + d[k]*xdiff*xdiff*xdiff; 
		}
	}
	return f;
}

// Calculate tangents in all breakpoints
function calcTangents(x, y, method, tension) {
	method = typeof method === 'undefined' ? 'fritschbutland' : method.toLowerCase();
	var n = x.length;
	var delta = new Array(n-1);
	var m = new Array(n);
	for (var k=0; k < n-1; k++) {
		var deltak = (y[k+1] - y[k]) / (x[k+1] - x[k]);
		delta[k] = deltak;
		if (k == 0) {   // left endpoint, same for all methods
			m[k] = deltak;
		} else if (method == 'cardinal') {
			m[k] = (1 - tension) * (y[k+1] - y[k-1]) / (x[k+1] - x[k-1]);
		} else if (method == 'fritschbutland') {
			var alpha = (1 + (x[k+1] - x[k]) / (x[k+1] - x[k-1])) / 3;  // Not the same alpha as below.
			m[k] = delta[k-1] * deltak <= 0  ?  0 : delta[k-1] * deltak / (alpha*deltak + (1-alpha)*delta[k-1]);
		} else if (method == 'fritschcarlson') {
			// If any consecutive secant lines change sign (i.e. curve changes direction), initialize the tangent to zero.
			// This is needed to make the interpolation monotonic. Otherwise set tangent to the average of the secants.
			m[k] = delta[k-1] * deltak < 0  ?  0 : (delta[k-1] + deltak) / 2;
		} else if (method == 'steffen') {
			var p = ((x[k+1] - x[k]) * delta[k-1] + (x[k] - x[k-1]) * deltak) / (x[k+1] - x[k-1]);
			m[k] = (Math.sign(delta[k-1]) + Math.sign(deltak)) * 
								Math.min(Math.abs(delta[k-1]), Math.abs(deltak), 0.5*Math.abs(p));
		} else {    // FiniteDifference
			m[k] = (delta[k-1] + deltak) / 2;
		}
	}
	m[n-1] = delta[n-2];
	if (method != 'fritschcarlson') {
		return {m: m, delta: delta};
	}

	/*
	Fritsch & Carlson derived necessary and sufficient conditions for monotonicity in their 1980 paper. Splines will be
	monotonic if all tangents are in a certain region of the alpha-beta plane, with alpha and beta as defined below.
	A robust choice is to put alpha & beta within a circle around origo with radius 3. The FritschCarlson algorithm
	makes simple initial estimates of tangents and then does another pass over data points to move any outlier tangents
	into the monotonic region. FritschButland & Steffen algorithms make more elaborate first estimates of tangents that
	are guaranteed to lie in the monotonic region, so no second pass is necessary. */
	
	// Second pass of FritschCarlson: adjust any non-monotonic tangents.
	for (var k=0; k < n-1; k++) {
		var deltak = delta[k];
		if (deltak == 0) {
			m[k] = 0;
			m[k+1] = 0;
			continue;
		}
		var alpha = m[k] / deltak;
		var beta = m[k+1] / deltak;
		var tau = 3 / Math.sqrt(Math.pow(alpha,2) + Math.pow(beta,2));
		if (tau < 1) {      // if we're outside the circle with radius 3 then move onto the circle
			m[k] = tau * alpha * deltak;
			m[k+1] = tau * beta * deltak;
		}
	}
	return {m: m, delta: delta};
}

// Calculate tangents in all breakpoints using the FritschButland algorithm (1984, doi:10.1137/0905021).
function calcTangents_old(x, y) {
	var n = x.length;
	var delta = new Array(n-1);
	var m = new Array(n);
	for (var k=0; k < n-1; k++) {
		var deltak = (y[k+1] - y[k]) / (x[k+1] - x[k]);
		delta[k] = deltak;
		if (k == 0) {   // left endpoint
			m[k] = deltak;
		} else {
			var alpha = (1 + (x[k+1] - x[k]) / (x[k+1] - x[k-1])) / 3;
			m[k] = delta[k-1] * deltak <= 0  ?  0 : delta[k-1] * deltak / (alpha*deltak + (1-alpha)*delta[k-1]);
		}
	}
	m[n-1] = delta[n-2];
	return {m: m, delta: delta};
}

function startDragBehavior() {
	var d3 = Plotly.d3;
	var drag = d3.behavior.drag();
	/*d3.select("body").on("click", function(d,i) {
		if (d3.event.defaultPrevented) {
			zoomallowed = false;
			console.log("No")
		} else {
			zoomallowed = true;
			console.log("Yes")
		}
	});*/
	drag.origin(function() {
		var transform = d3.select(this).attr("transform");
		var translate = transform.substring(10, transform.length-1).split(",");
		return {x: translate[0], y: translate[1]};
	});
	drag.on("dragstart", function() {
		//d3.event.sourceEvent.preventDefault();
		if (this.handle.type != 'spawn') {
			trash.setAttribute("display", "inline");
			trash.style.fill = "rgba(0,0,0,.2)";
			destroyHandle(points[0].handle);
		}
	});
	drag.on("drag", function() {
		//d3.event.sourceEvent.preventDefault();
		var xmouse = d3.event.x, ymouse = d3.event.y;
		d3.select(this).attr("transform", "translate(" + [xmouse, ymouse] + ")");
		var xaxis = editemissions._fullLayout.xaxis;
		var yaxis = editemissions._fullLayout.yaxis;
		var handle = this.handle;
		if (handle.type != 'final') handle.x = clamp(xaxis.p2l(xmouse), xaxis.range[0] + 1, xaxis.range[1] - 1e-9);
		if (handle.type == 'spawn' && handle.x > handles[currentRegion][1].x) {
			trash.setAttribute("display", "inline");
			trash.style.fill = "rgba(0,0,0,.2)";
			handle.type = 'normal';
		}
		handle.y = clamp(yaxis.p2l(ymouse), yaxis.range[0], yaxis.range[1]);
		var text = (handle.y == yaxis.range[0] || handle.y == yaxis.range[1]) ?
			'<p><font color="red">To go below zero or above the current max, first change the scale by dragging the y-axis.</font></p>' : '';
		if (handle.x < lastbreakyear) {
			handle.type = 'spawn';
			trash.style.fill = "#a00";				
		}
		var e = d3.event.sourceEvent;
		var snap = e.ctrlKey ? 0.1 : e.shiftKey ? 5 : 1;
		handle.x = Math.round(handle.x/snap) * snap;
		handle.y = Math.round(handle.y/snap) * snap;
		updateEmissionText(handle, text);
		updateEditEmissionsFromHandles();
	});
	drag.on("dragend", function(e) {
		if (this.handle.x < lastbreakyear) destroyHandle(this.handle);
		addHandle('spawn');
		updateEditEmissionsFromHandles();
		updatePointHandles();
		trash.setAttribute("display", "none");
		d3.selectAll(".scatterlayer .trace:last-of-type .points path:last-of-type").call(drag).on("mousedown", function() {
			updateEmissionText(this.handle, "");
		});
		// this disables zoom on click event after dragging handles
		// (except for final handle which for some reason doesn't need it)
		zoomallowed = this.handle.type == "final" ? zoomallowed : false;
		//d3.event.sourceEvent.preventDefault();
		//d3.event.sourceEvent.stopPropagation();
		//console.log(e)
		//e.preventDefault();
		//e.stopPropagation();
		//Plotly.relayout(editemissions, 'annotations', []);
		var title = editemissions.getElementsByClassName('gtitle')[0];
		title && title.setAttribute("y", 49);
	});
	d3.selectAll(".scatterlayer .trace:last-of-type .points path").call(drag).on("mousedown", function() {
		updateEmissionText(this.handle, "");
	});
}

function autoScale(e) {
	if (e) {
		fig = e.target ? e.target : emissionsfigure;
		while (fig && fig.nodeName != "FIGURE") {
			fig = fig.parentNode;	
		}
	} else {
		var fig = editemissions;
	}
	var ydata = fig.data[0].y;
	var min = Math.min(0, Math.min.apply(null, ydata)) * 1.1;
	var max = Math.max.apply(null, ydata) * 1.1;
	Plotly.relayout(fig, {'yaxis.range': [min, max]});
	for (var i=0, len=handles[currentRegion].length; i<len; i++) {
		if (handles[currentRegion][i].type == 'spawn') {
			handles[currentRegion][i].x = editemissions._fullLayout.xaxis.p2l(xspawn);
			handles[currentRegion][i].y = editemissions._fullLayout.yaxis.p2l(yspawn);
		}
	}
	updateEditEmissionsFromHandles();
	e && e.preventDefault();
	e && e.stopPropagation();
}

// The default autoscaleButton is annoying. It's not a one-off autoscale, it sets autorange to true every time it is used.
// We could call Plotly.update() instead of Plotly.restyle() in updateEditEmissionsFromHandles(), but that seems to slow things down.
// So let's change the button instead.
function fixAutoscale() {
	// First we replace the autoscaleButton with a clone in order to kill all its events.
	var buttons = document.querySelectorAll('[data-title="Autoscale"]');
	for (var i=0, len=buttons.length; i<len; i++) {
		var autoscaleButton = buttons[i];
		var clonedButton = autoscaleButton.cloneNode(true);
		autoscaleButton.parentNode.replaceChild(clonedButton, autoscaleButton);
		// Now let's add our own click event that calls a custom autoscale function.
		clonedButton.onclick = function(e) {
			autoScale(e);
		}
	}
}

function destroyHandle(handle) {
	var i = handles[currentRegion].indexOf(handle);
	handles[currentRegion].splice(i,1);
	updateEditEmissionsFromHandles();
}

function poofHandle(handle) {
	Plotly.d3.select(points[0]).transition().duration(500)
		.attr("transform", "translate(" + xspawn + "," + yspawn + ") scale(0)")
		.each("end", function() {
			destroyHandle(handle);
		});
}

function addHandle(type, x, y) {
	if (type == 'spawn') {
		x = editemissions._fullLayout.xaxis.p2l(xspawn);
		y = editemissions._fullLayout.yaxis.p2l(yspawn);
	}
	var newhandle = {
		x: x,
		y: y,
		type: type
	};
	handles[currentRegion].push(newhandle);
	return newhandle;
}

// Sorts the real handles but returns a temporary object with visible handles organized by type
function sortHandles() {
	var len = handles[currentRegion].length;
	handles[currentRegion].sort(function(a,b) {
		return a.x-b.x;
	});
	var x = [], y = [], xvis = [], yvis = [];
	for (var i=0; i < len; i++) {
		if (handles[currentRegion][i].type != 'spawn') {
			x.push(handles[currentRegion][i].x);
			y.push(handles[currentRegion][i].y);
		}
		if (handles[currentRegion][i].type != 'hidden') {
			xvis.push(handles[currentRegion][i].x);
			yvis.push(handles[currentRegion][i].y);
		}
	}
	return {x: x, y: y, xvis: xvis, yvis: yvis};
}

function interpolateSSP(SSPvect) {
	var SSPyears = range(2000,2100,10);
	SSPyears[0] = 2005;
	var annualSSP = new Array(96);
	var iSSP = 0;
	for (var k=0; k<96; k++) {
		var year = 2005+k;
		annualSSP[k] = SSPvect[iSSP] + (year-SSPyears[iSSP]) / (SSPyears[iSSP+1]-SSPyears[iSSP]) * (SSPvect[iSSP+1]-SSPvect[iSSP]);
		year/10 == Math.floor(year/10) && iSSP++;
	}
	return annualSSP;
}

function getSSP(reg,gas,firstYear,lastYear) {
	return interpolateSSP(SSPscenarios[gas][currentModel][currentSSP][reg]).slice(firstYear-2005, lastYear-2005+1);
}

function updateEditEmissionsFromHandles() {
	var sortedhandles = sortHandles();
	emissions[currentRegion]["FossilCO2"] = interpolateCubicHermite(years, sortedhandles.x, sortedhandles.y);
	//Plotly.restyle(emissionsfigure, {'x': [years], 'y': [emissions[currentRegion]["FossilCO2"]]});
	if (!showSSPinsteadofHistory) {
		var historicemissions = CO2emissionhistory[currentRegion].slice(0,2016-backgrounddatastart);
		Plotly.restyle(editemissions, {
			'x': [years, historicyears, sortedhandles.xvis],
			'y': [emissions[currentRegion]["FossilCO2"], historicemissions, sortedhandles.yvis],
			'name': ''
		});
	} else {
		var historicemissions = getSSP(currentRegion,"FossilCO2",firstYear,lastYear);
		Plotly.restyle(editemissions, {
			'x': [years, years, sortedhandles.xvis],
			'y': [emissions[currentRegion]["FossilCO2"], historicemissions, sortedhandles.yvis],
			'name': ''
		});
	}
	var title = editemissions.getElementsByClassName('gtitle')[0];
	title && title.setAttribute("y", 49);
}

function updatePointHandles() {
	for (var i=0, p=0, len=handles[currentRegion].length; i<len; i++) {
		if (handles[currentRegion][i].type != 'hidden') {
			points[p++].handle = handles[currentRegion][i];
		}
	}
}

function putOutTheTrash() {
	var trashsize = trash.getAttribute("width");
	pointscontainer.parentNode.insertBefore(trash, pointscontainer);
	pointscontainer.parentNode.insertBefore(trash, pointscontainer);
	trash.setAttribute("transform", "translate(" + (xspawn - trashsize/2 - 0) + "," + (yspawn - trashsize/2 - 2) + ")");
	trash.setAttribute("transform", "translate(" + (xspawn - trashsize/2 - 0) + "," + (yspawn - trashsize/2 - 2) + ")");
	trash.setAttribute("display", "none");
	trash.setAttribute("display", "none");
}

function plotEditEmissions() {
	var options = cloneObject(layout);
	options["title"] = "CO<sub>2</sub> emissions from fossil fuels";
	options["yaxis"] = {title: "Gton CO<sub>2</sub>/year", hoverformat: ".1f"};
	options["font"] = {size: 24};
	options["margin"] = {t: 70, r: 42, b: 56, l: 84, pad: 0};
	Plotly.update(editemissions, [{
			x: years,
			y: emissions[currentRegion]["FossilCO2"],
			hoverinfo: 'none',
			name: ''
		}],
		options, configOptions
	);
	autoScale();
};

function plotEmissions(plothistory=false) {
	//var thumb = Plotly.d3.selectAll('.thumb');
	var options = cloneObject(layout);
	var colorswithblack = plotlyColors.slice();
	colorswithblack.unshift("#000");
	options["colorway"] = colorswithblack;
	options["title"] = "CO<sub>2</sub> emissions from fossil fuels:  " + currentRegion;
	options["yaxis"] = {title: "Gton CO<sub>2</sub>/year", rangemode: "tozero", hoverformat: ".1f"};
	if (plothistory) {
		if (!showSSPinsteadofHistory) {
			var historicemissions = CO2emissionhistory[currentRegion].slice(0,2016-backgrounddatastart);
			dummyline3.x = historicyears;
			dummyline3.y = historicemissions;	
		} else {
			dummyline3.x = years;
			dummyline3.y = getSSP(currentRegion,"FossilCO2",firstYear,lastYear);
		}
		Plotly.plot( emissionsfigure, [dummyline3], options, configOptions);
	}
	Plotly.plot( emissionsfigure, [{
			x: years,
			y: emissions[currentRegion]["FossilCO2"],
			name: ''
		}],
		options, configOptions
	);
};

function plotRegionalEmissions(plothistory=false) {
	var options = cloneObject(layout);
	options["colorway"] = ["#000", "#555", "#C44", "#44C", "#4C4"];
	options["title"] = "CO<sub>2</sub> emissions from fossil fuels:  Regional";
	options["yaxis"] = {title: "Gton CO<sub>2</sub>/year", rangemode: "tozero", hoverformat: ".1f"};
	Plotly.purge(fig["regionalCO2emissions"]);
	if (plothistory) {
		var historicemissions = CO2emissionhistory[currentRegion].slice(0,2016-backgrounddatastart);
		dummyline3.x = historicyears;
		dummyline3.y = historicemissions;	
		Plotly.plot( fig["regionalCO2emissions"], [dummyline3], options, configOptions);
	}

	var nregions = document.getElementById('numberregions').selectedIndex;
	if (nregions == 2) {
		var regionlist = ["Global", "Asia", "OECD", "ROW"];
	} else {
		var regionlist = ["Global", "Non-OECD", "OECD"];
	}
	for (var r=0; r<regionlist.length; r++) {
		Plotly.plot( fig["regionalCO2emissions"], [{
				x: years,
				y: emissions[regionlist[r]]["FossilCO2"],
				name: ''
			}],
			options, configOptions
		);		
	}
	plotIntensity(false);
	figuregroup.querySelectorAll('figure .gtitle').forEach(function(x) {x.setAttribute("y", 35)});
};

function plotIntensity(plotglobalfigure) {
	if (advancedmode) {
		Plotly.purge( fig["regionalintensity"]);
		var options = cloneObject(layout);
		options["colorway"] = ["#555", "#C44", "#44C", "#4C4"];
		options["title"] = "CO<sub>2</sub> emissions per capita:  Regional";
		options["yaxis"] = {title: "Gton CO<sub>2</sub>/person/year", rangemode: "tozero", hoverformat: ".2f"};
		var nregions = document.getElementById('numberregions').selectedIndex;
		if (nregions == 2) {
			var regionlist = ["Global", "Asia", "OECD", "ROW"];
		} else {
			var regionlist = ["Global", "Non-OECD", "OECD"];
		}
		var intensity = {};
		for (var r=0; r<regionlist.length; r++) {
			var reg = regionlist[r];
			intensity[reg] = new Array(lastYear-firstYear+1);
			var population = getSSP(reg,"Population",firstYear,lastYear);
			for (var i=0; i<years.length; i++) {
				intensity[reg][i] = (emissions[reg]["FossilCO2"][i] + emissions[reg]["OtherCO2"][i])/population[i];
			}
			Plotly.plot( fig["regionalintensity"], [{
					x: years,
					y: intensity[reg],
					name: ''
					//hoverinfo: 'none'
				}],
				options, configOptions
			)
		}
	} else {
		var intensity = {};
		intensity["Global"] = new Array(lastYear-firstYear+1);
		var population = getSSP("Global","Population",firstYear,lastYear);
		for (var i=0; i<years.length; i++) {
			intensity["Global"][i] = (emissions["Global"]["FossilCO2"][i] + emissions["Global"]["OtherCO2"][i])/population[i];
		}
	}

	if (plotglobalfigure) {
		var options = cloneObject(layout);
		options["title"] = "CO<sub>2</sub> emissions per capita";
		options["yaxis"] = {title: "Gton CO<sub>2</sub>/person/year", rangemode: "tozero", hoverformat: ".2f"};
		Plotly.plot( fig["intensity"], [{
				x: years,
				y: intensity["Global"],
				name: ''
				//hoverinfo: 'none'
			}],
			options, configOptions
		)
	}
};

function plotPopulation() {
	var options = cloneObject(layout);
	options["title"] = "World population";
	options["yaxis"] = {title: "billion people", rangemode: "tozero", hoverformat: ".3f"};
	var population = getSSP("Global","Population",firstYear,lastYear);
	Plotly.plot( fig["population"], [{
			x: years,
			y: population,
			name: ''
			//hoverinfo: 'none'
		}],
		options, configOptions
	)
};

function plotConcentration(concentrations) {
	var options = cloneObject(layout);
	options["title"] = "CO<sub>2</sub> concentration in the atmosphere";
	options["yaxis"] = {title: "ppm", hoverformat: ".0f"};
	Plotly.plot( fig["CO2concentration"], [{
			x: years,
			y: concentrations["CO2"],
			name: ''
			//hoverinfo: 'none'
		}],
		options, configOptions
	)
	fig["CO2concentration"].querySelector('.gtitle').setAttribute("y", 35);

	var options = cloneObject(layout);
	options["title"] = "CH<sub>4</sub> concentration in the atmosphere";
	options["yaxis"] = {title: "ppb", hoverformat: ".0f"};
	Plotly.plot( fig["CH4concentration"], [{
			x: years,
			y: concentrations["CH4"],
			name: ''
			//hoverinfo: 'none'
		}],
		options, configOptions
	)
	fig["CH4concentration"].querySelector('.gtitle').setAttribute("y", 35);

	var options = cloneObject(layout);
	options["title"] = "N<sub>2</sub>O concentration in the atmosphere";
	options["yaxis"] = {title: "ppb", hoverformat: ".0f"};
	Plotly.plot( fig["N2Oconcentration"], [{
			x: years,
			y: concentrations["N2O"],
			//hoverinfo: 'none'
		}],
		options, configOptions
	)
	fig["N2Oconcentration"].querySelector('.gtitle').setAttribute("y", 35);
};

function plotOtherEmissions(plothistory=false) {
	var options = cloneObject(layout);
	options["title"] = "CH<sub>4</sub> emissions:  " + currentRegion;
	options["yaxis"] = {title: "MtCH<sub>4</sub>/year", rangemode: "tozero", hoverformat: ".0f"};
	Plotly.plot( fig["CH4emissions"], [{
			x: years,
			y: emissions[currentRegion]["CH4"],
			name: ''
			//hoverinfo: 'none'
		}],
		options, configOptions
	)
	fig["CH4emissions"].querySelector('.gtitle').setAttribute("y", 35);

	var options = cloneObject(layout);
	options["title"] = "N<sub>2</sub>O emissions:  " + currentRegion;
	options["yaxis"] = {title: "MtN/year", rangemode: "tozero", hoverformat: ".2f"};
	Plotly.plot( fig["N2Oemissions"], [{
			x: years,
			y: emissions[currentRegion]["N2O"],
			name: ''
			//hoverinfo: 'none'
		}],
		options, configOptions
	)

	var options = cloneObject(layout);
	options["title"] = "Other CO<sub>2</sub> emissions:  " + currentRegion;
	options["yaxis"] = {title: "Gton CO<sub>2</sub>/year", rangemode: "tozero", hoverformat: ".1f"};
	if (false) {
		var colorswithblack = plotlyColors.slice();
		colorswithblack.unshift("#000");
		options["colorway"] = colorswithblack;
		var historicemissions = CO2emissionhistory["LANDUSE"].slice(0,2016-backgrounddatastart);
		dummyline4.x = historicyears;
		dummyline4.y = historicemissions;	
		Plotly.plot( fig["otherCO2emissions"], [dummyline4], options, configOptions);
	}
	Plotly.plot( fig["otherCO2emissions"], [{
			x: years,
			y: emissions[currentRegion]["OtherCO2"],
			name: ''
		}],
		options, configOptions
	);

	fig["N2Oemissions"].querySelector('.gtitle').setAttribute("y", 35);
};

function plotTemperature(temp) {
	var options = cloneObject(layout);
	options["title"] = "Mean surface temperature<br><span>(change since preindustrial times)</span>";
	options["yaxis"] = {title: "degrees (&deg;C)", rangemode: "tozero", hoverformat: ".2f"};
	Plotly.plot( fig["temperature"], [{
			x: years,
			y: temp,
			name: ''
			//hoverinfo: 'none'
		}],
		options, configOptions
	)
	fig["temperature"].querySelector('.gtitle .line').setAttribute("y", 35);
	fig["temperature"].querySelector('.gtitle .line:last-Child').setAttribute("y", 35);
};

function refreshAllEmissionFigures() {
	var figlist = ["otherCO2emissions", "CO2emissions", "CH4emissions", "N2Oemissions"]; // add Intensity (1) later
	for (var i=0, len=figlist.length; i<len; i++) {
		Plotly.purge(fig[figlist[i]]);
	}
	var rows = runlog.rows;
	var currentEmissions = cloneObject(emissions);
	for (var r=rows.length-1; r>=0; r--) {
		emissions = rows[r].emissions;
		plotEmissions(r == rows.length-1);
		advancedmode && plotRegionalEmissions(true);
		plotOtherEmissions(r == rows.length-1);
	}
	for (var i=0, len=figlist.length; i<len; i++) {
		for (var r=0; r<rows.length; r++) {
			var ishidden = rows[r].classList.contains('hiddenrow');
			Plotly.restyle(fig[figlist[i]], {opacity: 1-ishidden}, r);
		}
	}
	emissions = currentEmissions;
	figuregroup.querySelectorAll('figure .gtitle').forEach(function(x) {x.setAttribute("y", 35)});
}

function highlightActiveTrace(figurelist,clearactivefromallfigures) {
	var rows = runlog.rows;
	for (var r=0, len=rows.length; r<len; r++) {
		if (rows[r].classList.contains("activerow")) {
			var runNumber = len-r-1;
		}
	}
	
	var clearlist = clearactivefromallfigures ? [1,2,3,4,5,6,7,8] : figurelist;
	for (var i=0, len = clearlist.length; i<len; i++ ) {
		var fig = figures[clearlist[i]];
		if (fig.classList.contains('js-plotly-plot') && !fig.classList.contains('newfigs')) {
			Plotly.restyle(fig, {line: {width: 2}});
		}
	}

	for (var i=0, len = figurelist.length; i<len; i++ ) {
		var fig = figures[figurelist[i]];
		if (fig.classList.contains('js-plotly-plot') && !fig.classList.contains('newfigs')) {
			Plotly.restyle(fig, {line: {width: 3}}, fig==emissionsfigure ? runNumber+1 : runNumber);
		}
	}
}

function updateFigures() {
	updateEditEmissionsFromHandles();
	//console.log(emissionsfigure.data)
	if (editExistingEmissions) {
		Plotly.update(emissionsfigure, {'y': [emissions[currentRegion]["FossilCO2"]]},
			{'title': "CO<sub>2</sub> emissions from fossil fuels:  " + currentRegion}, emissionsfigure.data.length-1);
		Plotly.update(fig["CH4emissions"], {'y': [emissions[currentRegion]["CH4"]]},
			{'title': "CH<sub>4</sub> emissions:  " + currentRegion}, fig["CH4emissions"].data.length-1);
		Plotly.update(fig["N2Oemissions"], {'y': [emissions[currentRegion]["N2O"]]},
			{'title': "N<sub>2</sub>O emissions:  " + currentRegion}, fig["N2Oemissions"].data.length-1);
		advancedmode && plotRegionalEmissions(true);
		plotIntensity(false);
	} else {
		plotEmissions();
		advancedmode && plotRegionalEmissions(true);
		plotOtherEmissions();
		plotIntensity(true);
		editExistingEmissions = true;
	}
	var nyears = lastYear-firstYear+1;
	var intensity = new Array(nyears);
	var population = getSSP("Global","Population",firstYear,lastYear);
	for (var i=0; i<nyears; i++) {
		intensity[i] = emissions["Global"]["FossilCO2"][i]/population[i];
	}
	Plotly.restyle(fig["intensity"], 'y', [intensity], fig["intensity"].data.length-1);
	//highlightActiveTrace([1,2,7,8],true);
	figuregroup.querySelectorAll('figure .gtitle').forEach(function(x) {x.setAttribute("y", 35)});
};

function updateEmissionText(handle, extratext) {
	var i = 0;
	while (handles[currentRegion][++i] != handle) {
	}
	var prevhandle = handles[currentRegion][i-1];
	var nexthandle = i+1 < handles[currentRegion].length ? handles[currentRegion][i+1] : null;
	var helptext = i == handles[currentRegion].length-1 ? '<p><font color="red">The last breakpoint is locked at 2100.</font></p>' : '';
	var text0 = "<p>Breakpoint (" + handle.x.toFixed(0) + "):&nbsp;&nbsp;";
	text0 += handle.y.toFixed(1) + " Gton CO<sub>2</sub> /year</p>";
	var growth1 = Math.pow(handle.y/prevhandle.y, 1/(handle.x-prevhandle.x)) - 1;
	var text1 = "<p>Growth (" + prevhandle.x.toFixed(0) + "-" + handle.x.toFixed(0) + "):&nbsp;&nbsp;";
	text1 += (growth1 > 0 ? "+" : "") + (100*growth1).toFixed(1) + " %/year</p>";
	var text2 = ""
	if (nexthandle) {
		var growth2 = Math.pow(nexthandle.y/handle.y, 1/(nexthandle.x-handle.x)) - 1;
		text2 += "<p>Growth (" + handle.x.toFixed(0) + "-" + nexthandle.x.toFixed(0) + "):&nbsp;&nbsp;";
		text2 += (growth2 > 0 ? "+" : "") + (100*growth2).toFixed(1) + " %/year</p>";
	}
	emissionstext.innerHTML = extratext + helptext + text0 + text1 + text2;
}

function showLastEmissionTrace(show) {
	Plotly.restyle(emissionsfigure, 'visible', show, emissionsfigure.data.length-1);
	Plotly.restyle(fig["intensity"], 'visible', show, fig["intensity"].data.length-1);
}

function submitEmissions() {
	var cccdata = {
		"climatesensitivity": parseFloat(csSlider.noUiSlider.get()),
		"firstyear": firstYear,
		"lastyear": lastYear,
		"emissions": emissions["Global"]
	};
	var xhr = new XMLHttpRequest();
	xhr.open("POST", "runccc", true);
	xhr.onreadystatechange = function() {
		if (xhr.readyState == XMLHttpRequest.DONE) {
			var response = JSON.parse(xhr.responseText);
			if (!editExistingEmissions) {
				plotEmissions();
				advancedmode && plotRegionalEmissions(true);
				plotOtherEmissions();
				plotIntensity(true);
				addRowToLog();
				logEmissions(false);
				//highlightActiveTrace([1,2,7,8],true);
			}
			plotConcentration(response.concentrations);
			plotTemperature(response.temperature);
			//highlightActiveTrace([3,4,5,6],false);
			var row = runlog.rows[0];
			row.cells[3].innerHTML = cccdata.climatesensitivity.toFixed(1) + " &deg;C";
			if (!response.temperature[response.temperature.length-1]) {
				console.log(response)
				alert("Bad server response, see console log.");
			}
			row.cells[4].innerHTML = response.temperature[response.temperature.length-1].toFixed(2) + " &deg;C";
			editExistingEmissions = false;
		}
	}
	xhr.setRequestHeader('Content-Type', 'application/json');
	xhr.send(JSON.stringify(cccdata));
}

function activateRow(row) {
	var rows = runlog.rows;
	for (var r=0, len=rows.length; r<len; r++) {
		rows[r].classList.remove("activerow");
	}
	row.classList.add("activerow");
	emissions = cloneObject(row.emissions);
	updateHandlesFromEmissions();
	//refreshAllEmissionFigures();
	if (advancedmode) {
		plotRegionalEmissions(true);
	}
	//updateFigures();
}

function toggleLogRow(event) {
	if (event.target.parentNode == this.firstChild) {
		this.classList.toggle("hiddenrow");
		this.firstChild.classList.toggle("hiddencell");
		var rows = runlog.rows;
		var runNumber = rows.length - Array.prototype.indexOf.call(rows, this) - 1;
		var ishidden = this.classList.contains('hiddenrow');
		for (var i=1, len = figures.length; i<len; i++ ) {
			if (figures[i].classList.contains('js-plotly-plot') && !figures[i].classList.contains('newfigs')) {
				Plotly.restyle(figures[i], {opacity: 1-ishidden}, figures[i]==emissionsfigure ? runNumber+1 : runNumber);
			}
		}
	} else {
		activateRow(this);
	}
}

function logEmissions(update=true) {
	// update global or regional emissions depending on what was just edited
	if (update) {
		if (currentRegion == "Global") {
			regionalEmissionsFromGlobal("Global", ["OECD", "Asia", "ROW"]);		
		} else {
			globalEmissionsFromRegional();
		}
	}

	var maxEmissions = -Infinity;
	var cumulativeEmissions = 0;
	var peakYear = firstYear;
	for (var i=0, len=emissions["Global"]["FossilCO2"].length; i<len; i++) {
		var emis = emissions["Global"]["FossilCO2"][i];
		if (emis > maxEmissions) {
			maxEmissions = emis;
			peakYear = firstYear + i;
		}
		cumulativeEmissions += emis;
	}
	var rows = runlog.rows;
	row = '<td style="color:' + plotlyColors[(rows.length-1) % plotlyColors.length] + '"><span>&#9724;</span></td><td>'
	row += peakYear + "</td><td>" + cumulativeEmissions.toFixed(0) + " Gton CO<sub>2</sub></td><td>-</td><td>-</td>";
	rows[0].emissions = cloneObject(emissions);
	rows[0].innerHTML = row;
	activateRow(rows[0]);
}

function addRowToLog() {
	var row = runlog.rows[0];
	var newrow = runlog.insertRow(0);
	newrow.innerHTML = row.innerHTML;
	newrow.cells[0].style = "color:" + plotlyColors[(runlog.rows.length-1) % plotlyColors.length];
	newrow.onclick = toggleLogRow;
}

function globalEmissionsFromRegional() {
	var len = emissions["Global"]["FossilCO2"].length;
	var regioncombinations = [
		["Global"],
		["OECD", "Non-OECD"],
		["OECD", "Asia", "ROW"]
	];
	var nregions = document.getElementById('numberregions').selectedIndex;
	var regionlist = regioncombinations[nregions];
	for (var i=0; i<len; i++) {
		emissions["Global"]["FossilCO2"][i] = 0;
		for (var r=0; r<regionlist.length; r++) {
			emissions["Global"]["FossilCO2"][i] += emissions[regionlist[r]]["FossilCO2"][i];
		}
	}
	if (nregions == 0) {
		console.log("Why am I here? I shouldn't be here.");
	} else if (nregions == 1) {
		// divide Non-OECD into Asia + ROW
		regionalEmissionsFromGlobal("Non-OECD", ["Asia", "ROW"]);
	} else if (nregions == 2) {
		// update Non-OECD
		for (var i=0; i<len; i++) {
			emissions["Non-OECD"]["FossilCO2"][i] = emissions["Asia"]["FossilCO2"][i] + emissions["ROW"]["FossilCO2"][i];
		}		
	}
}

function regionalEmissionsFromGlobal(parentregion, subregions) {
	var len = emissions[parentregion]["FossilCO2"].length;
	var sourceemissions = getSSP(parentregion,"FossilCO2",firstYear,lastYear);
	var targetemissions = emissions[parentregion]["FossilCO2"];
	var numregions = subregions.length;
	for (var r=0; r<numregions; r++) {
		var regionalemissions = getSSP(subregions[r],"FossilCO2",firstYear,lastYear);
		for (var i=0; i<len; i++) {
			var equalincrement = (targetemissions[i]-sourceemissions[i])/numregions + regionalemissions[i];
			var harmonization = targetemissions[i]/numregions;
			var weighted = equalincrement*(1-harmonizationfactor) + harmonization*harmonizationfactor;
			emissions[subregions[r]]["FossilCO2"][i] = weighted;
		}
	}
	if (parentregion == "Global" && numregions == 3) {
		for (var i=0; i<len; i++) {
			emissions["Non-OECD"]["FossilCO2"][i] = emissions["Asia"]["FossilCO2"][i] + emissions["ROW"]["FossilCO2"][i];
		}
	}
}

function setSSPhandles() {
	handles[currentRegion] = [];
	var ssp = SSPscenarios["FossilCO2"][currentModel][currentSSP][currentRegion];
	addHandle('hidden', firstDisplayYear, CO2emissionhistory[currentRegion][firstDisplayYear-backgrounddatastart]);
	addHandle('hidden', 2010, ssp[1]);
	addHandle('normal', 2020, (currentRegion == "Global" && force2020emissions) ? force2020emissions : ssp[2]);
	addHandle('normal', 2030, ssp[3]);
	addHandle('normal', 2050, ssp[5]);
	addHandle('normal', 2070, ssp[7]);
	addHandle('final', 2100, ssp[10]);
	addHandle('spawn');
	lastbreakyear = firstYear;

	updateEditEmissionsFromHandles();
	updatePointHandles();
	// currentRegion == "Global" && globalEmissionsFromRegional();
}

function getAllNormalHandles(regionlist) {
	var handleyears = [];
	for (var r=0; r<regionlist.length; r++) {
		var regionhandles = handles[regionlist[r]];
		for (var i=0; i<regionhandles.length; i++) {
			if (regionhandles[i].type == "normal") {
				handleyears.push(regionhandles[i].x);					
			}
		}
	}

	const unique = (value, index, self) => {
		return self.indexOf(value) === index;
	}
	handleyears = handleyears.filter(unique);
	handleyears.sort(function(a, b){return a - b})
	return handleyears;
}

function updateHandlesFromEmissions() {
	if (!handles[currentRegion].length) {
		handleyears = getAllNormalHandles(["Global"]);
	} else {
		handleyears = getAllNormalHandles([currentRegion]);
	}

	handles[currentRegion] = [];
	var emis = emissions[currentRegion]["FossilCO2"]
	addHandle('hidden', firstDisplayYear, CO2emissionhistory[currentRegion][firstDisplayYear-backgrounddatastart]);
	addHandle('hidden', firstYear, emis[0]);
	for (var h=0; h<handleyears.length; h++) {
		var yr = handleyears[h];
		addHandle('normal', yr, emis[yr-firstYear]);
	}
	addHandle('final', 2100, emis[2100-firstYear]);
	addHandle('spawn');
	lastbreakyear = firstYear;

	if (!advancedmode || currentRegion != "Global") {
		updateEditEmissionsFromHandles();
		updatePointHandles();
	}
}

function updateRegionButtons(clickedRegionButton) {
	if (!clickedRegionButton) {
		currentregionnumber = 0;
	}
	var buttonconfig = [
		["Global"],
		["Global", "Non-OECD", "OECD"],
		["Global", "Asia", "OECD", "ROW"]
	];
	var colors = ["#BBB", "#ECC", "#CCE", "#CEC"];
	var hovercolors = ["#CCC", "#FDD", "#DDF", "#DFD"];
	var colors_selected = ["#555", "#C44", "#44C", "#4C4"];
	var hovercolors_selected = ["#777", "#D55", "#55D", "#5D5"];
	var nregions = document.getElementById('numberregions').selectedIndex;
	document.getElementById('numberregions').blur();
	var buttonHTML = "";
	for (var i=0; i<buttonconfig[nregions].length; i++) {
		var col = currentregionnumber==i ? colors_selected[i] : colors[i];
		var hovcol = currentregionnumber==i ? hovercolors_selected[i] : hovercolors[i];
		if (currentregionnumber==i) {
			var col = colors_selected[i];
			var hovcol = hovercolors_selected[i];
			var textcol = "#FFF";			
		} else {
			var col = colors[i];
			var hovcol = hovercolors[i];
			var textcol = "#000";		
		}
		buttonHTML += '<button type="button" style="background-color:' + col + '; color:' + textcol + '"';
		buttonHTML += ' onclick="currentregionnumber = ' + i + '; updateRegionButtons(true);"';
		buttonHTML += ' onmouseover="this.style.backgroundColor=\'' + hovcol + '\'"';
		buttonHTML += ' onmouseout="this.style.backgroundColor=\'' + col + '\'">';
		buttonHTML += buttonconfig[nregions][i] + '</button>';
	}
	document.getElementById('regionbuttons').innerHTML = buttonHTML;

	currentRegion = clickedRegionButton ? buttonconfig[nregions][currentregionnumber] : "Global";
	if (currentRegion != lastRegion) {
		updateHandlesFromEmissions();
		refreshAllEmissionFigures();
		// logEmissions(false);
		//updateFigures();
		lastRegion = currentRegion;
	} else {
		advancedmode && plotRegionalEmissions(true);
	}
}

function toggleEnlargeFigure(fig) {
	// currently only called for figure 0
	if (fig == editemissions) {
		if (zoomallowed) {
			ghostfigure.style.display = "none";
			emissionsfigure.classList.remove("noshadow");
			emissionsfigure.parentNode.firstChild.checked = false;
			!editExistingEmissions && addRowToLog();
			logEmissions();
			// currentRegion == "Global" && globalEmissionsFromRegional();
			//autoScale();
			updateFigures();
		}
	} else {
		if ( !(advancedmode && currentRegion == "Global") ) {
			setTimeout(function() {
				ghostfigure.style.display = "block";
				emissionsfigure.classList.add("noshadow");
				autoScale();
				var rect = emissionsfigure.getBoundingClientRect();
				ghostfigure.style.width = rect.width + "px";
				ghostfigure.style.height = rect.height + "px";
				ghostfigure.style.top = rect.top + "px";
				ghostfigure.style.left = rect.left + "px";
				var text = "<p>1. Design your emission path by dragging the breakpoints.</p>";
				text += "<p>2. If you need another breakpoint, grab the one floating in the upper left.</p>";
				text += "<p>3. To remove a breakpoint, just drag it back to the left.</p>";
				emissionstext.innerHTML = text;
			}, 200);
		}
	}
	zoomallowed = true;
}

function changeSSP() {
	currentSSP = this.options[this.selectedIndex].value;
	scenariomenus[1-advancedmode].selectedIndex = this.selectedIndex;
	this.blur();
	if (!document.getElementById('lockCO2box1').checked) {
		setSSPhandles();
	}
	!editExistingEmissions && addRowToLog();
	for (var r=0; r<allregions.length; r++) {
		emissions[allregions[r]]["OtherCO2"] = getSSP(allregions[r],"OtherCO2",firstYear,lastYear);
		emissions[allregions[r]]["CH4"] = getSSP(allregions[r],"CH4",firstYear,lastYear);
		emissions[allregions[r]]["N2O"] = getSSP(allregions[r],"N2O",firstYear,lastYear);
	}
	logEmissions();
	updateFigures();
}

function insertAdvancedModeFigures() {
	var figHTML = '<label class="newfiglabels"><input type="checkbox"><figure class="newfigs"></figure></label>';
	newfigcontainer.innerHTML = figHTML + figHTML;
	var newfigs = newfigcontainer.querySelectorAll(".newfigs");
	fig["regionalintensity"] = newfigs[0];
	fig["regionalCO2emissions"] = newfigs[1];
	carousel.insert(newfigcontainer.childNodes, 3);
	plotRegionalEmissions(true);
	plotIntensity(false);
}

function completeExternalData() {
	// Stats start in 1959. Remove elements we don't need.
	// population.splice(0, firstYear - backgrounddatastart);

	// Calculate emission history for Global, Non-OECD and ROW regions, and convert from GtC to GtCO2.
	var len = CO2emissionhistory["OECD"].length;
	CO2emissionhistory["Non-OECD"] = new Array(len);
	CO2emissionhistory["ROW"] = new Array(len);
	CO2emissionhistory["Global"] = new Array(len);
	for (var i=0; i<len; i++) {
		CO2emissionhistory["OECD"][i] = 44/12/1000*CO2emissionhistory["OECD"][i];
		CO2emissionhistory["Asia"][i] = 44/12/1000*CO2emissionhistory["Asia"][i];
		var ROWemissions = 44/12/1000*(CO2emissionhistory["REF"][i] + CO2emissionhistory["MAF"][i] + 
							CO2emissionhistory["LAM"][i] + CO2emissionhistory["BUNKERS"][i]);
		var NONOECDemissions = ROWemissions + CO2emissionhistory["Asia"][i];
		CO2emissionhistory["ROW"][i] = ROWemissions;
		CO2emissionhistory["Non-OECD"][i] = NONOECDemissions;
		CO2emissionhistory["Global"][i] = NONOECDemissions + CO2emissionhistory["OECD"][i];
		CO2emissionhistory["LANDUSE"][i] = 44/12/1000*CO2emissionhistory["LANDUSE"][i];
	}

	// Calculate SSP emissions for fossil CO2 (total CO2 - other CO2).
	// Also calculate SSP emissions for Non-OECD and ROW regions for all gases.
	var models = ["AIM/CGE", "GCAM4", "IMAGE", "MESSAGE-GLOBIOM", "REMIND-MAGPIE", "WITCH-GLOBIOM"];
	var gases = ["TotalCO2", "FossilCO2", "OtherCO2", "CH4", "N2O", "Population", "GDP"];
	var scenarios = ["SSP1-26", "SSP1-34", "SSP1-45", "SSP1-Baseline",
					"SSP2-26", "SSP2-34", "SSP2-45", "SSP2-60", "SSP2-Baseline",
					"SSP3-34", "SSP3-45", "SSP3-60", "SSP3-Baseline",
					"SSP4-26", "SSP4-34", "SSP4-45", "SSP4-60", "SSP4-Baseline",
					"SSP5-26", "SSP5-34", "SSP5-45", "SSP5-60", "SSP5-Baseline"];
	var regions = ["OECD", "Asia", "LAM", "REF", "MAF", "Global"];
	SSPscenarios["FossilCO2"] = cloneObject(SSPscenarios["TotalCO2"]);
	for (var m=0; m<models.length; m++) {
		var model = models[m];
		for (var s=0; s<scenarios.length; s++) {
			var scen = scenarios[s];
			if (!SSPscenarios["TotalCO2"][model].hasOwnProperty(scen)) {
				continue;
			}
			for (var r=0; r<regions.length; r++) {
				var reg = regions[r];
				for (var i=0; i<11; i++) {
					SSPscenarios["FossilCO2"][model][scen][reg][i] =
						SSPscenarios["TotalCO2"][model][scen][reg][i] - SSPscenarios["OtherCO2"][model][scen][reg][i];
				}
			}
			for (var g=0; g<gases.length; g++) {
				var gas = gases[g];
				SSPscenarios[gas][model][scen]["ROW"] = new Array(11);
				SSPscenarios[gas][model][scen]["Non-OECD"] = new Array(11);
				for (var i=0; i<11; i++) {
					SSPscenarios[gas][model][scen]["ROW"][i] = SSPscenarios[gas][model][scen]["REF"][i] +
						SSPscenarios[gas][model][scen]["MAF"][i] + SSPscenarios[gas][model][scen]["LAM"][i];
					SSPscenarios[gas][model][scen]["Non-OECD"][i] =
						SSPscenarios[gas][model][scen]["ROW"][i] + SSPscenarios[gas][model][scen]["Asia"][i];
				}
			}
		}
	}
}

function init() {
	noUiSlider.create(csSlider, {
		start: 3,
		tooltips: [true],
		step: 0.1,
		range: {
			'min': 1,
			'max': 6
		},
		pips: {
			mode: 'count',
			values: 6,
			density: 10
		},
		format: decimals(1," &deg;C")
	});

	noUiSlider.create(yearSelectionSlider, {
		start: [2000,2010,2100],
		connect: [false,false,true,false],
		tooltips: [true,true,true],
		step: 10,
		range: {
			'min': [1960, 20],
			'15%': [2000, 5],
			'40%': [2020, 10],		
			'70%': [2100, 50],
			'85%': [2200, 100],		
			'max': [2500, ]
		},
		format: decimals(0)
	});

	noUiSlider.create(harmonizationSlider, {
		start: harmonizationfactor,
		tooltips: [true],
		step: 0.05,
		range: {
			'min': 0,
			'max': 1
		},
		format: decimals(1)
	});

	csSlider.parentNode.getElementsByTagName('input')[0].addEventListener('click', submitEmissions);

	completeExternalData();

	setSSPhandles();

	// Plot initial figures
	putOutTheTrash();
	updateEditEmissionsFromHandles();
	updatePointHandles();
	
	plotEditEmissions();
	plotEmissions(true);
	advancedmode && plotRegionalEmissions(true);
	for (var r=0; r<allregions.length; r++) {
		emissions[allregions[r]]["OtherCO2"] = getSSP(allregions[r],"OtherCO2",firstYear,lastYear);
		emissions[allregions[r]]["CH4"] = getSSP(allregions[r],"CH4",firstYear,lastYear);
		emissions[allregions[r]]["N2O"] = getSSP(allregions[r],"N2O",firstYear,lastYear);
	}
	plotOtherEmissions(true);
	plotIntensity(true);
	plotPopulation();
	fixAutoscale();
	autoScale();
	updateEditEmissionsFromHandles();
	updatePointHandles();
	startDragBehavior();

	// add extra margin to the plot titles
	figuregroup.querySelectorAll('figure .gtitle').forEach(function(x) {x.setAttribute("y", x.getAttribute("y")*35/25)});

	// make the carousel with the plots
	carousel = new Flickity('.main-carousel', {
		/*cellAlign: 'center',
		contain: true,*/
		draggable: false,
		initialIndex: '4',
		selectedAttraction: 0.025,
		friction: 0.2
		/* can use flickety as thumbnails for flickety: https://codepen.io/anon/pen/rGzXeq */
	});

	fig["CO2emissions"].classList.add("leftfigure");
	fig["temperature"].classList.add("rightfigure");
	carousel.on( 'select', function() {
		var len = figures.length;
		for (var i=0; i<len; i++ ) {
			figures[i].classList.remove("leftfigure");
			figures[i].classList.remove("rightfigure");
		}
		var i = carousel.selectedIndex;
		i > 0 && figures[i-1].classList.add("leftfigure");
		i < len-1 && figures[i+1].classList.add("rightfigure");
	});

	logEmissions();

	document.getElementById('advancedUI').style.display = advancedmode ? "block" : "none";
	document.getElementById('modetoggle').checked = advancedmode;
	advancedmode && insertAdvancedModeFigures();
	figures = figuregroup.querySelectorAll("figure");
	document.getElementById('modetoggle').onclick = function(e) {
		if (advancedmode) {
			advancedmode = false;
			document.getElementById('advancedUI').style.display = "none";
			document.getElementById('simpleUI').style.display = "block";
			carousel.remove(figuregroup.querySelectorAll(".newfiglabels"));
			figures = figuregroup.querySelectorAll("figure");
		} else {
			advancedmode = true;
			document.getElementById('advancedUI').style.display = "block";
			document.getElementById('simpleUI').style.display = "none";
			insertAdvancedModeFigures();
			figures = figuregroup.querySelectorAll("figure");
		}
	}
	document.getElementById('settingsopen').onclick = function(e) {
		document.getElementById('settingswindow').style.right = "5px";
	}
	document.getElementById('settingsclose').onclick = function(e) {
		document.getElementById('settingswindow').style.right = "-25%";
	}
	document.getElementById('clearfigures').onclick = function(e) {
		for (var i=1, len=figures.length; i<len; i++) {
			Plotly.purge(figures[i]);
		}
		// currentRegion = "Global";
		// currentregionnumber = 0;
		//updateRegionButtons();
		/*handles = {
			"Global": handles["Global"],
			"OECD": [],
			"Non-OECD": [],
			"Asia": [],
			"ROW": [],
		};*/
		updateHandlesFromEmissions();
		plotEmissions(true);
		advancedmode && plotRegionalEmissions(true);
		plotOtherEmissions(true);
		plotIntensity(true);
		editExistingEmissions = true;
		runlog.innerHTML = "<tr><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>";
		logEmissions(false);
		runlog.rows[0].onclick = toggleLogRow;
		startDragBehavior();
		figuregroup.querySelectorAll('figure .gtitle').forEach(function(x) {x.setAttribute("y", 35)});
	}
	document.getElementById('clearhidden').onclick = function(e) {
		var rows = runlog.rows;
		var deleteRows = [];
		var colorIndex = 0;
		for (var len = rows.length, i=len-1; i>=0; i-- ) {
			var ishidden = rows[i].classList.contains('hiddenrow');
			if (ishidden) {
				if (i == 0 && editExistingEmissions) {
					editExistingEmissions = false;
				}
				deleteRows.push(len - i - 1);
				runlog.deleteRow(i);
			} else {
				rows[i].cells[0].style = "color:" + plotlyColors[colorIndex++ % plotlyColors.length];
			}
		}		
		for (var i=1, len = figures.length; i<len; i++ ) {
			if (figures[i] == fig["CO2emissions"]) {
				Plotly.deleteTraces(fig["CO2emissions"], deleteRows.map(function(r) {return r+1}));
			} else {
				Plotly.deleteTraces(figures[i], deleteRows);
			}
		}
		activateRow(rows[0]);
	}

	updateRegionButtons();
	
	document.getElementById('numberregions').onchange = updateRegionButtons;

	document.getElementById('lockCO2box1').checked = false;
	document.getElementById('lockCO2box2').checked = false;
	document.getElementById('lockCO2box1').onchange = function() {
		document.getElementById('lockCO2box2').checked = this.checked
	}
	document.getElementById('lockCO2box2').onchange = function() {
		document.getElementById('lockCO2box1').checked = this.checked
	}

	scenariomenus[0].selectedIndex = currentSSPindex;
	scenariomenus[1].selectedIndex = currentSSPindex;
	scenariomenus[0].onchange = changeSSP;
	scenariomenus[1].onchange = changeSSP;
	changeSSP.call(scenariomenus[0]);

	runlog.rows[0].onclick = toggleLogRow;

	emissionsfigure.onclick = function(e) {
		toggleEnlargeFigure(this);
	}
	emissionsfigure.on('plotly_click', function(eventdata) {
		toggleEnlargeFigure(fig["CO2emissions"]);
	});

	editemissions.onclick = function(e) {
		//console.log(zoomallowed)
		//zoomallowed && toggleEnlargeFigure(this);	// required to make click work on figure margins
		toggleEnlargeFigure(this);	// required to make click work on figure margins
	}
	editemissions.on('plotly_click', function(eventdata) {
		toggleEnlargeFigure(editemissions);
	});

	document.onkeydown = function(e) {
		if (document.activeElement != figuregroup) {	// arrows already scroll the carousel if it is focused 
			if (e.keyCode == 37) {
				carousel.previous();
			} else if (e.keyCode == 39) {
				carousel.next();
			}
		}
	}

	document.getElementById('yearSelectionSlider').noUiSlider.on('set', function() {
		var values = this.get();
		firstDisplayYear = Number(values[0]);
		firstYear = Number(values[1]);
		lastYear = Number(values[2]);
		years = range(firstYear, lastYear, 1);
		layout.xaxis = {
			range: [Math.floor(firstDisplayYear/20)*20-1, 2101],
			tick0: Math.floor(firstDisplayYear/20)*20,
		};
		refreshAllEmissionFigures();
		//updateFigures();
	});
	document.getElementById('harmonizationSlider').noUiSlider.on('set', function() {
		var value = this.get();
		harmonizationfactor = Number(value);
		regionalEmissionsFromGlobal("Global", ["OECD", "Asia", "ROW"]);
		logEmissions();
		updateFigures();
		/*var saveregion = currentRegion;
		for (var r=0; r<allregions.length; r++) {
			currentRegion = allregions[r];
			updateFigures();
		}
		currentRegion = saveregion;*/
	});
	document.getElementById('SSPmodel').onchange = function() {
		currentModel = this.options[this.selectedIndex].value;
	}
	interpolation.onchange = function() {
		interpolationmethod = interpolation.options[interpolation.selectedIndex].value;
		cardinaltension = 0.5;
		if (interpolationmethod == 'catmullrom') {
			interpolationmethod = 'cardinal';
			cardinaltension = 0;
		}
		updateFigures();
	}
	document.getElementById('fixdrag').onclick = startDragBehavior;

	reallystartadvancedmode && document.getElementById('modetoggle').onclick();
}

// draw a dummy plot to initialize the Plotly object
//Plotly.plot('emissionsfigure', [dummyline1], {}, configOptions);
Plotly.plot('editemissions', [dummyline1, dummyline3, dummyline2], {name: ''}, configOptions);
var pointscontainer = editemissions.querySelector(".scatterlayer .trace:nth-of-type(3) g");
var points = pointscontainer.getElementsByTagName("path");
//debugger;
init();


/*
	var submitbutton = csSlider.parentNode.getElementsByTagName('input')[0];
	submitbutton.addEventListener('click', submitEmissions);
	submitbutton.addEventListener('mousedown', function(e) {
		//e.preventDefault();
	});

	editemissions.on('plotly_relayout', function(eventdata) {
		//updateHandles();
		//console.log(editemissions._fullLayout.xaxis," ", editemissions._fullLayout.yaxis)
		//console.log(JSON.stringify(eventdata))
	});

	for (var i=0, len=figures.length; i<len; i++) {
		figures[i].onclick = function(e) {
			toggleEnlargeFigure(this);
		}
	}

	figuregroup.querySelector("#figuregroup figure:nth-child(2)").on('plotly_click', function(e) {
		console.log("jo")
			toggleEnlargeFigure(this);
		});

	//editemissions.style.display = "none";

	document.onmouseup = function() {
		//updateHandles();
	}

	// callback that triggers after zoom events (plotly_afterplot works too)
	editemissions.on('plotly_relayout', function(eventdata) {
		//updateHandles();
		//console.log(editemissions._fullLayout.xaxis," ", editemissions._fullLayout.yaxis)
		//console.log(JSON.stringify(eventdata))
	});

	// callback that triggers on mousedown on the main plot or axes
	Plotly.d3.select(figuregroup).selectAll('.drag').on('mousedown', function() {
	})
*/




// diagnostic: a list of elements that you can focus by hitting tab
//var focusable = document.querySelectorAll('button, [href], input, [tabindex="0"]');




// temperature in 2010 shifts with climate sensitivity => cheat for now by using deltas
// click boxes in log to hide, click elsewhere in row to make bold and show scenario in regional charts



// teaching point: show temperature a function of cumulative emissions, not path


// add option in SSP menu for constant concentrations of all GHGs (for diagnostic purposes)

// remove setSSPhandles(), set emissions and use updateHandlesFromEmissions instead
// Include global land use emissions as a "region" in regional co2 emission chart
// fix SSP scenarios in Julia so regions sum to global
// clear all runs or clear hidden should reset handles (so regional handles don't accumulate)
// add CH4 and N2O history from another source, add history for all charts
// indicate SSP in log
// update population from SSP (not yet, doesn't change between scenarios of the same model)
// fix year selection slider (update "years" & replot), don't splice population

// settings: regional harmonization, firstyear, lastyear, scenario model (e.g. IMAGE, MESSAGE)
//				change figure order, enable/disable figures (different in basic & advanced)

// option "show uncertainty" of climate sensitivity, run distributions
// hover on stuff to get tooltips

// FEATURE: "make direct link to scenario", encodes scenario data for all model runs in the URL so you can save or share them
// 			just encode background scenario and breakpoints to save URL length