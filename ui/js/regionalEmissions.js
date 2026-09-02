// Keeping the global and the regional fossil CO2 series consistent with each other.

import { state } from "./state.js";
import { dom } from "./dom.js";
import { getSSP } from "./sspData.js";

// Which regions add up to the global total, per "number of regions" menu index.
const REGION_COMBINATIONS = [
    ["Global"],
    ["OECD", "Non-OECD"],
    ["OECD", "Asia", "ROW"]
];

const selectedRegionCount = () => dom.numberOfRegionsMenu.selectedIndex;

/** Sum the edited regional series back into the global one, then re-split as needed. */
export function globalEmissionsFromRegional() {
    const emissions = state.emissions;
    const len = emissions["Global"]["FossilCO2"].length;
    const nregions = selectedRegionCount();
    const regionlist = REGION_COMBINATIONS[nregions];

    for (let i = 0; i < len; i++) {
        emissions["Global"]["FossilCO2"][i] = 0;
        for (const region of regionlist) {
            emissions["Global"]["FossilCO2"][i] += emissions[region]["FossilCO2"][i];
        }
    }

    if (nregions === 0) {
        console.log("Why am I here? I shouldn't be here.");
    } else if (nregions === 1) {
        // divide Non-OECD into Asia + ROW
        regionalEmissionsFromGlobal("Non-OECD", ["Asia", "ROW"]);
    } else if (nregions === 2) {
        // update Non-OECD
        for (let i = 0; i < len; i++) {
            emissions["Non-OECD"]["FossilCO2"][i] =
                emissions["Asia"]["FossilCO2"][i] + emissions["ROW"]["FossilCO2"][i];
        }
    }
}

/**
 * Distribute a modified parent-region series over its subregions. The harmonization factor
 * blends between giving every subregion an equal share of the *change* (0) and an equal
 * share of the *total* (1).
 *
 * The blend is ramped in over the pathway rather than applied at full strength from its
 * first year. An equal share of the total is a statement about where the world converges,
 * not about where it starts: imposed in the first year it splits the observed emissions
 * evenly between the regions there and then, which throws every regional curve off the
 * history it is drawn against - dragging a global breakpoint moved the OECD from its
 * observed 10.1 Gton CO2 in 2023 to 12.5, a third of the world total. Ramped, the split
 * starts on the observed one whatever the factor says and reaches the full blend in the
 * last year of the pathway.
 */
export function regionalEmissionsFromGlobal(parentregion, subregions) {
    const emissions = state.emissions;
    const { firstYear, lastYear, harmonizationFactor } = state;
    const len = emissions[parentregion]["FossilCO2"].length;
    const sourceemissions = getSSP(parentregion, "FossilCO2", firstYear, lastYear);
    const targetemissions = emissions[parentregion]["FossilCO2"];
    const numregions = subregions.length;
    const span = Math.max(1, lastYear - firstYear);

    for (const subregion of subregions) {
        const regionalemissions = getSSP(subregion, "FossilCO2", firstYear, lastYear);
        for (let i = 0; i < len; i++) {
            const equalincrement = (targetemissions[i] - sourceemissions[i]) / numregions + regionalemissions[i];
            const harmonization = targetemissions[i] / numregions;
            const factor = harmonizationFactor * i / span;
            emissions[subregion]["FossilCO2"][i] =
                equalincrement * (1 - factor) + harmonization * factor;
        }
    }

    if (numregions === 3) {
        for (let i = 0; i < len; i++) {
            emissions["Non-OECD"]["FossilCO2"][i] =
                emissions["Asia"]["FossilCO2"][i] + emissions["ROW"]["FossilCO2"][i];
        }
    }
}
