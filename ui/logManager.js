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
        for (var i=0, len = figures.length; i<len; i++ ) {
            if (figures[i].classList.contains('js-plotly-plot') && !figures[i].classList.contains('newfigs')) {
                Plotly.restyle(figures[i], {opacity: 1-ishidden}, figures[i]==emissionsfigure ? runNumber+1 : runNumber);
            }
        }
    } else {
        activateRow(this);
    }
}

function logEmissions() {
    var maxEmissions = -Infinity;
    var cumulativeEmissions = 0;
    var peakYear = firstYear;
    for (var i=0, len=emissions["Global"]["FossilCO2"].length; i<len; i++) {
        var emis = emissions["Global"]["FossilCO2"][i] + emissions["Global"]["OtherCO2"][i];
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