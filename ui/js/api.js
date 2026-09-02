// Talking to the Julia model server.

import { state } from "./state.js";
import { dom } from "./dom.js";
import {
    plotEmissions, plotRegionalEmissions, plotOtherEmissions,
    plotPopulation, plotIntensity, plotConcentration, plotTemperature, plotRunComponents
} from "./figures.js";
import { addRowToLog } from "./runLog.js";

/** Send the current global emission path to the model and draw the results. */
export function submitEmissions() {
    const climatesensitivity = parseFloat(dom.csSlider.noUiSlider.get());
    const cccdata = {
        climatesensitivity,
        firstyear: state.firstYear,
        lastyear: state.lastYear,
        firstcalibrationyear: state.firstCalibrationYear,
        lastcalibrationyear: state.lastCalibrationYear,
        emissions: state.emissions["Global"]
    };

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "runccc", true);
    xhr.onreadystatechange = function () {
        if (xhr.readyState !== XMLHttpRequest.DONE) return;
        const response = JSON.parse(xhr.responseText);

        if (!state.editExistingEmissions) {
            plotEmissions();
            if (state.advancedMode) plotRegionalEmissions(true);
            plotOtherEmissions();
            plotPopulation();
            plotIntensity(true);
            addRowToLog();
        }
        plotConcentration(response.concentrations);
        plotTemperature(response.temperature);

        const row = dom.runLog.rows[0];
        // The carbon-sink and forcing figures show one run at a time, so the results are
        // kept on the log row and redrawn whenever that row is made active again.
        row.results = response;
        plotRunComponents(response);
        row.cells[3].innerHTML = climatesensitivity.toFixed(1) + " &deg;C";
        const finalTemperature = response.temperature[response.temperature.length - 1];
        if (!finalTemperature) {
            console.log(response);
            alert("Bad server response, see console log.");
        }
        row.cells[4].innerHTML = finalTemperature.toFixed(2) + " &deg;C";
        state.editExistingEmissions = false;
    };
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(JSON.stringify(cccdata));
}
