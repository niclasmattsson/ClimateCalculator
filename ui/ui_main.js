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

function putOutTheTrash() {
    var pointscontainer = editemissions.querySelector(".scatterlayer .trace:nth-of-type(3) g");
    var trashsize = trash.getAttribute("width");
    pointscontainer.parentNode.insertBefore(trash, pointscontainer);
    pointscontainer.parentNode.insertBefore(trash, pointscontainer);
    trash.setAttribute("transform", "translate(" + (xspawn - trashsize/2 - 0) + "," + (yspawn - trashsize/2 - 2) + ")");
    trash.setAttribute("transform", "translate(" + (xspawn - trashsize/2 - 0) + "," + (yspawn - trashsize/2 - 2) + ")");
    trash.setAttribute("display", "none");
    trash.setAttribute("display", "none");
}

function refreshAllEmissionFigures() {
    var figlist = ["population", "otherCO2emissions", "CO2emissions", "CH4emissions", "N2Oemissions"]; // add Intensity (1) later
    for (var i=0, len=figlist.length; i<len; i++) {
        Plotly.purge(fig[figlist[i]]);
    }
    var rows = runlog.rows;
    var currentEmissions = cloneObject(emissions);
    for (var r=rows.length-1; r>=0; r--) {
        emissions = rows[r].emissions;
        plotEmissions(r == rows.length-1);
        advancedmode && plotRegionalEmissions(true);
        plotOtherEmissions();
        plotPopulation();
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
        Plotly.update(fig["population"], {'y': [emissions[currentRegion]["Population"]]},
            {'title': "Population:  " + currentRegion}, fig["population"].data.length-1);
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
                plotPopulation();
                plotIntensity(true);
                addRowToLog();
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
    if (numregions == 3) {
        for (var i=0; i<len; i++) {
            emissions["Non-OECD"]["FossilCO2"][i] = emissions["Asia"]["FossilCO2"][i] + emissions["ROW"]["FossilCO2"][i];
        }
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
            // update global or regional emissions depending on what was just edited
            if (currentRegion == "Global") {
                regionalEmissionsFromGlobal("Global", ["OECD", "Asia", "ROW"]);
            } else {
                globalEmissionsFromRegional();
            }
            logEmissions();
            //autoScale();
            updateFigures();
        }
    } else {
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
    zoomallowed = true;
}

function changeSSP() {
    currentSSP = this.options[this.selectedIndex].value;
    scenariomenus[1-advancedmode].selectedIndex = this.selectedIndex;
    this.blur();
    !editExistingEmissions && addRowToLog();
    for (var r=0; r<allregions.length; r++) {
        if (!document.getElementById('lockCO2box1').checked) {
            emissions[allregions[r]]["FossilCO2"] = getSSP(allregions[r],"FossilCO2",firstYear,lastYear);
        }
        emissions[allregions[r]]["OtherCO2"] = getSSP(allregions[r],"OtherCO2",firstYear,lastYear);
        emissions[allregions[r]]["CH4"] = getSSP(allregions[r],"CH4",firstYear,lastYear);
        emissions[allregions[r]]["N2O"] = getSSP(allregions[r],"N2O",firstYear,lastYear);
        emissions[allregions[r]]["Population"] = getSSP(allregions[r],"Population",firstYear,lastYear);
    }
    updateHandlesFromEmissions();
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
    interpolationmethod = interpolation.options[interpolation.selectedIndex].value;
    var local_figures = figuregroup.querySelectorAll("figure");
    fig = {
        "population": local_figures[0],
        "otherCO2emissions": local_figures[1],
        "intensity": local_figures[2],
        "regionalintensity": undefined,
        "regionalCO2emissions": undefined,
        "CO2emissions": local_figures[3],
        "CO2concentration": local_figures[4],
        "temperature": local_figures[5],
        "CH4concentration": local_figures[6],
        "N2Oconcentration": local_figures[7],
        "CH4emissions": local_figures[8],
        "N2Oemissions": local_figures[9]
    }

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

    for (var r=0; r<allregions.length; r++) {
        emissions[allregions[r]]["FossilCO2"] = getSSP(allregions[r],"FossilCO2",firstYear,lastYear);
        emissions[allregions[r]]["OtherCO2"] = getSSP(allregions[r],"OtherCO2",firstYear,lastYear);
        emissions[allregions[r]]["CH4"] = getSSP(allregions[r],"CH4",firstYear,lastYear);
        emissions[allregions[r]]["N2O"] = getSSP(allregions[r],"N2O",firstYear,lastYear);
        emissions[allregions[r]]["Population"] = getSSP(allregions[r],"Population",firstYear,lastYear);
    }
    updateHandlesFromEmissions();

    // Plot initial figures
    putOutTheTrash();
    updateEditEmissionsFromHandles();
    updatePointHandles();
    
    plotEditEmissions();
    plotEmissions(true);
    advancedmode && plotRegionalEmissions(true);

    plotOtherEmissions();
    plotPopulation();
    plotIntensity(true);
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

    figures = figuregroup.querySelectorAll("figure");
    fig["CO2emissions"].classList.add("leftfigure");
    fig["temperature"].classList.add("rightfigure");
    carousel.on( 'select', function() {
        figures = figuregroup.querySelectorAll("figure")
        var index = carousel.selectedIndex;
        var len = figures.length;
        for (var i=0; i<len; i++ ) {
            figures[i].classList.remove("leftfigure");
            figures[i].classList.remove("rightfigure");
        }
        index > 0 && figures[index-1].classList.add("leftfigure");
        index < len-1 && figures[index+1].classList.add("rightfigure");
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
        for (var i=0, len=figures.length; i<len; i++) {
            Plotly.purge(figures[i]);
        }
        currentRegion = "Global";
        currentregionnumber = 0;
        //updateRegionButtons();
        /*handles = {
            "Global": handles["Global"],
            "OECD": [],
            "Non-OECD": [],
            "Asia": [],
            "ROW": [],
        };*/
        //updateHandlesFromEmissions();
        plotEmissions(true);
        advancedmode && plotRegionalEmissions(true);
        plotOtherEmissions();
        plotPopulation();
        plotIntensity(true);
        editExistingEmissions = true;
        runlog.innerHTML = "<tr><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>";
        logEmissions();
        runlog.rows[0].onclick = toggleLogRow;
        //startDragBehavior();
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
        for (var i=0, len = figures.length; i<len; i++ ) {
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
}

// draw a dummy plot to initialize the Plotly object
Plotly.plot('editemissions', [dummyline1, dummyline3, dummyline2], {name: ''}, configOptions);
init();