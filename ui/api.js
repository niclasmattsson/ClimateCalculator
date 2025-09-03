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