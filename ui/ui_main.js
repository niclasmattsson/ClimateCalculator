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