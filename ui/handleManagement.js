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
            var spawnHandle = handles[currentRegion].find(h => h.type === 'spawn');
            if (spawnHandle) {
                spawnHandle.type = 'hidden';
            }
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
        
        var hiddenSpawnHandle = handles[currentRegion].find(h => h.type === 'hidden' && 
            Math.abs(h.x - editemissions._fullLayout.xaxis.p2l(xspawn)) < 1);
        if (hiddenSpawnHandle) {
            hiddenSpawnHandle.type = 'spawn';
        } else {
            var existingSpawn = handles[currentRegion].find(h => h.type === 'spawn');
            if (!existingSpawn) {
                addHandle('spawn');
            }
        }
        
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

function updateEmissionText(handle, extratext) {
    var i = 0;
    while (handles[currentRegion][++i] != handle) {
    }
    var prevhandle = handles[currentRegion][i - 1];
    var nexthandle = i + 1 < handles[currentRegion].length ? handles[currentRegion][i + 1] : null;
    var helptext = i == handles[currentRegion].length - 1 ? '<p><font color="red">The last breakpoint is locked at 2100.</font></p>' : '';
    var text0 = "<p>Breakpoint (" + handle.x.toFixed(0) + "):&nbsp;&nbsp;";
    text0 += handle.y.toFixed(1) + " Gton CO<sub>2</sub> /year</p>";
    var growth1 = Math.pow(handle.y / prevhandle.y, 1 / (handle.x - prevhandle.x)) - 1;
    var text1 = "<p>Growth (" + prevhandle.x.toFixed(0) + "-" + handle.x.toFixed(0) + "):&nbsp;&nbsp;";
    text1 += (growth1 > 0 ? "+" : "") + (100 * growth1).toFixed(1) + " %/year</p>";
    var text2 = ""
    if (nexthandle) {
        var growth2 = Math.pow(nexthandle.y / handle.y, 1 / (nexthandle.x - handle.x)) - 1;
        text2 += "<p>Growth (" + handle.x.toFixed(0) + "-" + nexthandle.x.toFixed(0) + "):&nbsp;&nbsp;";
        text2 += (growth2 > 0 ? "+" : "") + (100 * growth2).toFixed(1) + " %/year</p>";
    }
    emissionstext.innerHTML = extratext + helptext + text0 + text1 + text2;
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

function updateEditEmissionsFromHandles() {
    var sortedhandles = sortHandles();
    emissions[currentRegion]["FossilCO2"] = interpolateCubicHermite(years, sortedhandles.x, sortedhandles.y);
    //Plotly.restyle(emissionsfigure, {'x': [years], 'y': [emissions[currentRegion]["FossilCO2"]]});
    if (!showSSPinsteadofHistory) {
        var historicemissions = CO2emissionhistory[currentRegion].slice(0, lasthistoricyear+1-backgrounddatastart);
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
    var points = editemissions.querySelector(".scatterlayer .trace:nth-of-type(3) g").getElementsByTagName("path");
    for (var i=0, p=0, len=handles[currentRegion].length; i<len; i++) {
        if (handles[currentRegion][i].type != 'hidden') {
            points[p++].handle = handles[currentRegion][i];
        }
    }
}

function setSSPhandles() {
    handles[currentRegion] = [];
    var ssp = SSPscenarios["FossilCO2"][currentModel][currentSSP][currentRegion];
    addHandle('hidden', firstDisplayYear, CO2emissionhistory[currentRegion][firstDisplayYear-backgrounddatastart]);
    addHandle('hidden', 2010, ssp[1]);
    addHandle('normal', 2020, ssp[2]);
    addHandle('normal', 2030, ssp[3]);
    addHandle('normal', 2070, ssp[7]);
    addHandle('final', 2100, ssp[10]);
    addHandle('spawn');
    lastbreakyear = firstYear;

    updateEditEmissionsFromHandles();
    updatePointHandles();
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
    /*if (currentRegion == "Global") {
        handleyears = getAllNormalHandles(allregions);
    } else {
        handleyears = getAllNormalHandles(["Global", currentRegion]);
    }*/
    var handleyears = [];
    for (var h=0; h<handles[currentRegion].length; h++) {
        handles[currentRegion][h].type == "normal" && handleyears.push(handles[currentRegion][h].x);
    }
    if (handleyears.length == 0) {
        handleyears = [2020,2030,2050,2070];
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

    updateEditEmissionsFromHandles();
    updatePointHandles();
}