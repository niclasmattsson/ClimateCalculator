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
            for (var i=0; i<years.length; i++) {
                intensity[reg][i] = (emissions[reg]["FossilCO2"][i] + emissions[reg]["OtherCO2"][i])/emissions[reg]["Population"][i];
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
        for (var i=0; i<years.length; i++) {
            intensity["Global"][i] = (emissions["Global"]["FossilCO2"][i] + emissions["Global"]["OtherCO2"][i])/emissions["Global"]["Population"][i];
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
    options["title"] = "Population:  " + currentRegion;
    options["yaxis"] = {title: "billion people", rangemode: "tozero", hoverformat: ".3f"};
    Plotly.plot( fig["population"], [{
            x: years,
            y: emissions[currentRegion]["Population"],
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

function plotOtherEmissions() {
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
    fig["N2Oemissions"].querySelector('.gtitle').setAttribute("y", 35);

    var options = cloneObject(layout);
    options["title"] = "Other CO<sub>2</sub> emissions:  " + currentRegion;
    options["yaxis"] = {title: "Gton CO<sub>2</sub>/year", rangemode: "tozero", hoverformat: ".1f"};
    Plotly.plot( fig["otherCO2emissions"], [{
            x: years,
            y: emissions[currentRegion]["OtherCO2"],
            name: ''
        }],
        options, configOptions
    );
    fig["otherCO2emissions"].querySelector('.gtitle').setAttribute("y", 35);
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
    Plotly.relayout(fig, { 'yaxis.range': [min, max] });
    for (var i = 0, len = handles[currentRegion].length; i < len; i++) {
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
    for (var i = 0, len = buttons.length; i < len; i++) {
        var autoscaleButton = buttons[i];
        var clonedButton = autoscaleButton.cloneNode(true);
        autoscaleButton.parentNode.replaceChild(clonedButton, autoscaleButton);
        // Now let's add our own click event that calls a custom autoscale function.
        clonedButton.onclick = function (e) {
            autoScale(e);
        }
    }
}

function putOutTheTrash() {
    var pointscontainer = editemissions.querySelector(".scatterlayer .trace:nth-of-type(3) g");
    var trashsize = trash.getAttribute("width");
    pointscontainer.parentNode.insertBefore(trash, pointscontainer);
    pointscontainer.parentNode.insertBefore(trash, pointscontainer);
    trash.setAttribute("transform", "translate(" + (xspawn - trashsize / 2 - 0) + "," + (yspawn - trashsize / 2 - 2) + ")");
    trash.setAttribute("transform", "translate(" + (xspawn - trashsize / 2 - 0) + "," + (yspawn - trashsize / 2 - 2) + ")");
    trash.setAttribute("display", "none");
    trash.setAttribute("display", "none");
}

function refreshAllEmissionFigures() {
    var figlist = ["population", "otherCO2emissions", "CO2emissions", "CH4emissions", "N2Oemissions"]; // add Intensity (1) later
    for (var i = 0, len = figlist.length; i < len; i++) {
        Plotly.purge(fig[figlist[i]]);
    }
    var rows = runlog.rows;
    var currentEmissions = cloneObject(emissions);
    for (var r = rows.length - 1; r >= 0; r--) {
        emissions = rows[r].emissions;
        plotEmissions(r == rows.length - 1);
        advancedmode && plotRegionalEmissions(true);
        plotOtherEmissions();
        plotPopulation();
    }
    for (var i = 0, len = figlist.length; i < len; i++) {
        for (var r = 0; r < rows.length; r++) {
            var ishidden = rows[r].classList.contains('hiddenrow');
            Plotly.restyle(fig[figlist[i]], { opacity: 1 - ishidden }, r);
        }
    }
    emissions = currentEmissions;
    figuregroup.querySelectorAll('figure .gtitle').forEach(function (x) { x.setAttribute("y", 35) });
}

function highlightActiveTrace(figurelist, clearactivefromallfigures) {
    var rows = runlog.rows;
    for (var r = 0, len = rows.length; r < len; r++) {
        if (rows[r].classList.contains("activerow")) {
            var runNumber = len - r - 1;
        }
    }

    var clearlist = clearactivefromallfigures ? [1, 2, 3, 4, 5, 6, 7, 8] : figurelist;
    for (var i = 0, len = clearlist.length; i < len; i++) {
        var fig = figures[clearlist[i]];
        if (fig.classList.contains('js-plotly-plot') && !fig.classList.contains('newfigs')) {
            Plotly.restyle(fig, { line: { width: 2 } });
        }
    }

    for (var i = 0, len = figurelist.length; i < len; i++) {
        var fig = figures[figurelist[i]];
        if (fig.classList.contains('js-plotly-plot') && !fig.classList.contains('newfigs')) {
            Plotly.restyle(fig, { line: { width: 3 } }, fig == emissionsfigure ? runNumber + 1 : runNumber);
        }
    }
}

function updateFigures() {
    updateEditEmissionsFromHandles();
    //console.log(emissionsfigure.data)
    if (editExistingEmissions) {
        Plotly.update(emissionsfigure, { 'y': [emissions[currentRegion]["FossilCO2"]] },
            { 'title': "CO<sub>2</sub> emissions from fossil fuels:  " + currentRegion }, emissionsfigure.data.length - 1);
        Plotly.update(fig["CH4emissions"], { 'y': [emissions[currentRegion]["CH4"]] },
            { 'title': "CH<sub>4</sub> emissions:  " + currentRegion }, fig["CH4emissions"].data.length - 1);
        Plotly.update(fig["N2Oemissions"], { 'y': [emissions[currentRegion]["N2O"]] },
            { 'title': "N<sub>2</sub>O emissions:  " + currentRegion }, fig["N2Oemissions"].data.length - 1);
        Plotly.update(fig["population"], { 'y': [emissions[currentRegion]["Population"]] },
            { 'title': "Population:  " + currentRegion }, fig["population"].data.length - 1);
        advancedmode && plotRegionalEmissions(true);
        plotIntensity(false);
    } else {
        plotEmissions();
        advancedmode && plotRegionalEmissions(true);
        plotOtherEmissions();
        plotPopulation();
        plotIntensity(true);
        editExistingEmissions = true;
    }
    var nyears = lastYear - firstYear + 1;
    var intensity = new Array(nyears);
    var population = getSSP("Global", "Population", firstYear, lastYear);
    for (var i = 0; i < nyears; i++) {
        intensity[i] = emissions["Global"]["FossilCO2"][i] / population[i];
    }
    Plotly.restyle(fig["intensity"], 'y', [intensity], fig["intensity"].data.length - 1);
    //highlightActiveTrace([1,2,7,8],true);
    figuregroup.querySelectorAll('figure .gtitle').forEach(function (x) { x.setAttribute("y", 35) });
};

function showLastEmissionTrace(show) {
    Plotly.restyle(emissionsfigure, 'visible', show, emissionsfigure.data.length - 1);
    Plotly.restyle(fig["intensity"], 'visible', show, fig["intensity"].data.length - 1);
}
