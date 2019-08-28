runmodel("2DEG")

#ForcingMult = 1.39; fertilization = 0.59;
#ForcingMult = 1.390131560400832; fertilization = 0.5877118470187332;

#annualEmissions = getscenario("2DEG");
#p = ClimateParams(0.01, 0.8, 0.0, 0.0, 1.0, 2.0, 278.0);
#calibrateforcing!(p);
#calibratefertilization!(annualEmissions, p);
annualEmissions = getscenario("RCP45");
results, p, rcp = solveclimate(annualEmissions);
printresults(2010:10:2100, results, p, annualEmissions, rcp);

@code_warntype ClimateCalculator.historicdata()
@code_warntype getscenario("2DEG")
# next line (and similar) requires change of function declaration to "global function"
#@code_warntype ClimateCalculator_refactor.forcingerror(ForcingMult, lambda)
@code_warntype calibrateforcing!(p, "RCP45")
#@code_warntype ClimateCalculator_refactor.concentrationerror(fertilization, lambda, ForcingMult, annualEmissions)
@code_warntype calibratefertilization!(annualEmissions, p, "RCP45")
@code_warntype ClimateCalculator.initclimate(p, 2010, false)
@code_warntype solveclimate(annualEmissions, p)
@code_warntype solveclimate(annualEmissions, p, 2010, 2100, true, "RCP45")
@code_warntype solveclimate(annualEmissions, p, 2010, 2100, false, "RCP45")
@code_warntype ClimateCalculator_refactor.printresults(lambda, ForcingMult, fertilization, annualEmissions, results, false)
@code_warntype runmodel("2DEG",0.8; timestep=0.1, firstyear=2010, lastyear=2100, usecache=true, output=true);

using BenchmarkTools
annualEmissions = getscenario("RCP45");
results, p, rcp = solveclimate(annualEmissions);
p.timestep = 0.1
@benchmark solveclimate(annualEmissions, p)

using BenchmarkTools
annualEmissions = getscenario("RCP45");
results, p, rcp = solveclimate(annualEmissions, usecache=false);
p.timestep = 0.1
@benchmark solveclimate(annualEmissions, p, 2010, 2100, false)

@benchmark solveclimate(annualEmissions, timestep=0.1)
@benchmark solveclimate(annualEmissions, p, firstyear=2010, lastyear=2100)
@benchmark runmodel("2DEG", output=false)



lambda, annualEmissions = getscenario("2DEG");
p = ClimateParams(0.1, lambda, 0.0, 0.0, 1.0, 2.0, 278.0);
calibrateforcing!(p);
calibratefertilization!(annualEmissions, p);
s = ClimateState();
ClimateCalculator.init_temperatures!(s);
ClimateCalculator.init_oceancarbon!(s, p);
ClimateCalculator.init_biocarbon!(s, p);
ClimateCalculator.init_concentration_and_forcing!(s, p);
@code_warntype ClimateCalculator.init_temperatures!(s)
@code_warntype ClimateCalculator.oceancarbon_init!(s, p)
@code_warntype ClimateCalculator.biocarbon_init!(s, p)
@code_warntype ClimateCalculator.concentration_RF_init!(s, p)
@code_warntype ClimateCalculator.backgroundCO2_iteration(0.0, equilibriumCO2)
@code_warntype ClimateCalculator.backgroundCO2_solve(equilibriumCO2)
@code_warntype ClimateCalculator.calc_netfluxOcean(CO2concentration, 0.0, Temp[1])

const GAS3 = [:CO2, :CH4, :N2O]
t = 2017.55
const y0 = 1765
iyear(t,f) = f(Int,t) - y0 + 1
iyear(t) = iyear(t,round)
interpolate(t, annualvector) =  (1-(t-floor(t))) * annualvector[iyear(t,floor)] + 
                                    (t-floor(t)) * annualvector[iyear(t,ceil)]
interpolate(t, annualdict, gas) = (1-(t-floor(t))) * annualdict[iyear(t,floor)][gas] + 
                                      (t-floor(t)) * annualdict[iyear(t,ceil)][gas]
emissions = Dict(   :CO2 => interpolate(t, annualEmissions[:CO2]),
                    :CH4 => interpolate(t, annualEmissions[:CH4]),
                    :N2O => interpolate(t, annualEmissions[:N2O]))
ClimateCalculator.carbonbalance!(emissions, s, p)
ClimateCalculator.oceancarbon!(s, p)
ClimateCalculator.biocarbon!(s, p)
ClimateCalculator.concentrations!(emissions, s, p)
ClimateCalculator.radiativeforcing!(t, s, p)
ClimateCalculator.temperatures!(s, p)
@code_warntype interpolate(t, annualEmissions[:CO2])
@code_warntype interpolate(t, [Dict(:CO2 => 23.0)], :CO2)
@code_warntype ClimateCalculator.carbonbalance!(emissions, s, p)
@code_warntype ClimateCalculator.oceancarbon!(s, p)
@code_warntype ClimateCalculator.biocarbon!(s, p)
@code_warntype ClimateCalculator.concentrations!(emissions, s, p)
@code_warntype ClimateCalculator.radiativeforcing!(t, s, p)
@code_warntype ClimateCalculator.temperatures!(s, p)

@benchmark ClimateCalculator.carbonbalance!(emissions, s, p)
@benchmark ClimateCalculator.oceancarbon!(s, p)
@benchmark ClimateCalculator.biocarbon!(s, p)
@benchmark ClimateCalculator.concentrations!(emissions, s, p)
@benchmark ClimateCalculator.radiativeforcing!(t, s, p)
@benchmark ClimateCalculator.temperatures!(s, p)



results = [solveclimate(annualEmissions, p, timestep=[0.25,0.1,0.01,0.001][i]) for i=1:4];
pp=plot();for i=1:4 pp=plot!(1765:2500, get.(getfield.(results[i], :Concentration),:CO2,0.0)  );end;display(pp)
pp=plot();for i=1:4 pp=plot!(1765:2500, getfield.(results[i], :Temp_global)  );end;display(pp)