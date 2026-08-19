// Access to the SSP scenario database, plus the one-off derivation of the series that
// the generated data files do not contain.

import { SSPscenarios } from "./data/sspScenarios.js";
import { CO2emissionHistory } from "./data/emissionHistory.js";
import { BASE_YEAR_EMISSIONS } from "./data/baseYearEmissions.js";
import { BASE_YEAR, HARMONIZATION_END_YEAR } from "./settings.js";
import { state } from "./state.js";
import { range, cloneObject } from "./utils.js";

// The generated data holds one value per decade; SSP_YEARS[0] is 2005 rather than 2000.
const SSP_YEARS = range(2000, 2100, 10);
SSP_YEARS[0] = 2005;
const SSP_ANNUAL_LENGTH = 96;   // 2005..2100

/** Annual series for one region and gas under the currently selected model and scenario. */
export function getSSP(region, gas, firstYear, lastYear) {
    const byRegion = SSPscenarios[gas][state.currentModel][state.currentSSP];
    const annual = interpolateSSP(byRegion[region]);
    harmonize(annual, gas, interpolateSSP(byRegion["Global"]));
    return annual.slice(firstYear - 2005, lastYear - 2005 + 1);
}

/**
 * Scale a scenario to meet the observed emissions in BASE_YEAR, the correction fading
 * linearly to nothing by HARMONIZATION_END_YEAR. Without it, selecting a scenario makes the
 * emission curve jump away from the observed history at the very year the two meet - the
 * scenarios were built around 2005 and their land use CO2 is up to 50 % above what the
 * Global Carbon Budget now reports. Every region gets the global ratio, so the regions
 * still sum to the global series.
 */
function harmonize(annual, gas, global) {
    const observed = BASE_YEAR_EMISSIONS[gas];
    if (!HARMONIZATION_END_YEAR || observed === undefined) return;
    const ratio = observed / global[BASE_YEAR - 2005];
    for (let k = 0; k < annual.length; k++) {
        const remaining = (HARMONIZATION_END_YEAR - (2005 + k)) / (HARMONIZATION_END_YEAR - BASE_YEAR);
        annual[k] *= 1 + (ratio - 1) * Math.min(1, Math.max(0, remaining));
    }
}

/** Linear interpolation of a decadal SSP vector onto every year from 2005 to 2100. */
export function interpolateSSP(decadal) {
    const annual = new Array(SSP_ANNUAL_LENGTH);
    let i = 0;
    for (let k = 0; k < SSP_ANNUAL_LENGTH; k++) {
        const year = 2005 + k;
        annual[k] = decadal[i] +
            (year - SSP_YEARS[i]) / (SSP_YEARS[i + 1] - SSP_YEARS[i]) * (decadal[i + 1] - decadal[i]);
        if (year / 10 === Math.floor(year / 10)) i++;
    }
    return annual;
}

const SSP_MODELS = ["AIM/CGE", "GCAM4", "IMAGE", "MESSAGE-GLOBIOM", "REMIND-MAGPIE", "WITCH-GLOBIOM"];
const SSP_GASES = ["TotalCO2", "FossilCO2", "OtherCO2", "CH4", "N2O", "Population", "GDP"];
const SSP_SCENARIOS = [
    "SSP1-26", "SSP1-34", "SSP1-45", "SSP1-Baseline",
    "SSP2-26", "SSP2-34", "SSP2-45", "SSP2-60", "SSP2-Baseline",
    "SSP3-34", "SSP3-45", "SSP3-60", "SSP3-Baseline",
    "SSP4-26", "SSP4-34", "SSP4-45", "SSP4-60", "SSP4-Baseline",
    "SSP5-26", "SSP5-34", "SSP5-45", "SSP5-60", "SSP5-Baseline"
];
const SSP_SOURCE_REGIONS = ["OECD", "Asia", "LAM", "REF", "MAF", "Global"];
const GTC_TO_GTCO2 = 44 / 12 / 1000;   // the history is in MtC, the app works in GtCO2

/**
 * Fill in everything the generated data files leave out, once at start-up:
 * the Global / Non-OECD / ROW emission history in GtCO2, the FossilCO2 gas
 * (total CO2 minus other CO2), and the ROW / Non-OECD SSP regions.
 */
export function completeExternalData() {
    completeEmissionHistory();
    completeSSPscenarios();
}

function completeEmissionHistory() {
    const len = CO2emissionHistory["OECD"].length;
    CO2emissionHistory["Non-OECD"] = new Array(len);
    CO2emissionHistory["ROW"] = new Array(len);
    CO2emissionHistory["Global"] = new Array(len);
    for (let i = 0; i < len; i++) {
        CO2emissionHistory["OECD"][i] = GTC_TO_GTCO2 * CO2emissionHistory["OECD"][i];
        CO2emissionHistory["Asia"][i] = GTC_TO_GTCO2 * CO2emissionHistory["Asia"][i];
        const row = GTC_TO_GTCO2 * (CO2emissionHistory["REF"][i] + CO2emissionHistory["MAF"][i] +
            CO2emissionHistory["LAM"][i] + CO2emissionHistory["BUNKERS"][i]);
        const nonOECD = row + CO2emissionHistory["Asia"][i];
        CO2emissionHistory["ROW"][i] = row;
        CO2emissionHistory["Non-OECD"][i] = nonOECD;
        CO2emissionHistory["Global"][i] = nonOECD + CO2emissionHistory["OECD"][i];
    }
}

function completeSSPscenarios() {
    SSPscenarios["FossilCO2"] = cloneObject(SSPscenarios["TotalCO2"]);
    for (const model of SSP_MODELS) {
        for (const scenario of SSP_SCENARIOS) {
            if (!SSPscenarios["TotalCO2"][model].hasOwnProperty(scenario)) continue;

            for (const region of SSP_SOURCE_REGIONS) {
                for (let i = 0; i < 11; i++) {
                    SSPscenarios["FossilCO2"][model][scenario][region][i] =
                        SSPscenarios["TotalCO2"][model][scenario][region][i] -
                        SSPscenarios["OtherCO2"][model][scenario][region][i];
                }
            }
            for (const gas of SSP_GASES) {
                const byRegion = SSPscenarios[gas][model][scenario];
                byRegion["ROW"] = new Array(11);
                byRegion["Non-OECD"] = new Array(11);
                for (let i = 0; i < 11; i++) {
                    byRegion["ROW"][i] = byRegion["REF"][i] + byRegion["MAF"][i] + byRegion["LAM"][i];
                    byRegion["Non-OECD"][i] = byRegion["ROW"][i] + byRegion["Asia"][i];
                }
            }
        }
    }
}
