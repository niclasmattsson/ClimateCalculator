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