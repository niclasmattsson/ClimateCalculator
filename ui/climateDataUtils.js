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