function initclimate(p::ClimateParams, firstyear, usecache)
	if usecache && firstyear > YEARS[1]
		coeffs = cached_coeff_state[:,:,div(firstyear-1800, 10) + 1]
		s = ClimateState([interpolatespline(p.lambda, coeffs[i,:]) for i=1:75])
	else
		s = ClimateState()
		init_temperatures!(s)
		init_oceancarbon!(s, p)
		init_biocarbon!(s, p)
		init_concentration_and_forcing!(s, p)
	end
	return s
end

# firstyear & lastyear: years to start & end the model run (max 1765-2500)
# usecache: whether to use the precalculated cache of results 1765-2010 to speed up run times
# timestep [years]: time step for solving the climate differential equations
# lambda [°C/(W/m^2)]: climate sensitivity, related to CS per doubling of CO2 by CS [°C/(2xCO2)] = 3.7 W/m^2 * lambda
# oceantempfeedback: set to 0 to disable temperature feedback in ocean carbon uptake (default is 1)
# bioQ10factor: set to 1 to disable temperature feedback in the terrestrial biosphere (default is 2)
# equilibriumCO2 [ppm]: use 278 to start model in preindustrial times
function getparams(annualemissions;  firstyear::Int=2010, lastyear::Int=2100, usecache::Bool=true,
						timestep::Float64=0.01, lambda::Float64=0.8, rcp::String="RCP45",
						oceantempfeedback::Float64=1.0, bioQ10factor::Float64=2.0, equilibriumCO2::Float64=278.0)

	p = ClimateParams(timestep, lambda, 0.0, 0.0, oceantempfeedback, bioQ10factor, equilibriumCO2)
	if usecache && oceantempfeedback == 1.0 && bioQ10factor == 2.0 && equilibriumCO2 == 278.0
		p.aerosolforcingfactor = interpolatespline(lambda, cached_coeff_forcing)
		p.fertilization = interpolatespline(lambda, cached_coeff_fertilization)
	else
		calibrateforcing!(p, rcp)
		calibratefertilization!(annualemissions, p, rcp)
	end
	return p, firstyear, lastyear, usecache, rcp
end

# scen: BAU, 3DEG, 2DEG, 1DEG, 15DEG, 2DEGB, 15DEGB, 1PCT, 1PCTD, 3GTC, 2C-3CS, 2C-45CS, 2C-15CS
function runscen(scen::String;  kwargs...)
	results, p, annualemissions, rcp = solveclimate(scen;  kwargs...)
	printresults(2010:10:2100, results, p, annualemissions, rcp)
end

solveclimate(; kwargs...) = solveclimate("2DEG";  kwargs...)
function solveclimate(scen::String;  kwargs...)
	annualemissions = getscenario(scen)
	p, firstyear, lastyear, usecache, rcp = getparams(annualemissions; kwargs...)
	rcp = scen[1:3] == "RCP" ? scen : rcp
	results = solveclimate(annualemissions, p, firstyear, lastyear, usecache, rcp)
	return results, p, annualemissions, rcp
end

function solveclimate(annualemissions;  kwargs...)
	p, firstyear, lastyear, usecache, rcp = getparams(annualemissions; kwargs...)
	results = solveclimate(annualemissions, p, firstyear, lastyear, usecache, rcp)
	return results, p, rcp
end

function solveclimate(annualemissions, p::ClimateParams,
						firstyear::Int=2010, lastyear::Int=2100, usecache::Bool=true, rcp::String="RCP45")
	stabilitycheck(p.timestep)

	firstyear = usecache ? firstyear : YEARS[1]
	roundedyear = firstyear >= 1800 ?  min(2010, 10*floor(Int, firstyear/10)) :  1765
	s = initclimate(p, roundedyear, usecache)

	results = Vector{ClimateState}(undef, iyear(lastyear))

	# don't run the first time step if using the cache (cached results are taken after the iteration)
	startyear = float(roundedyear)
	if usecache
		startyear = roundedyear + p.timestep
		results[iyear(roundedyear)] = copy(s)
	end

	# main time loop of the model
	for t::Float64 in startyear:p.timestep:lastyear
		# the shorter version is type unstable because of the closure bug
		#emissions = Dict(g => interpolate(t, annualemissions[g]) for g in GAS3)
		emissions = Dict(	:CO2 => interpolate(t, annualemissions[:CO2]),
							:CH4 => interpolate(t, annualemissions[:CH4]),
							:N2O => interpolate(t, annualemissions[:N2O]))

		temperatures!(s, p)		# accuracy is better if temperatures are calculated first
		carbonbalance!(emissions, s, p)
		oceancarbon!(s, p)
		biocarbon!(s, p)
		concentrations!(emissions, s, p)
		radiativeforcing!(t, s, p, rcp)

		if t ≈ round(t)
			results[iyear(t)] = copy(s)
		end
	end
	return results
end

function printresults(yearrange, res, p::ClimateParams, annualemissions, rcp::String="RCP45")
	ly = length(yearrange)
	out_carbon = Matrix(undef, ly,3)
	out_emissions = Matrix(undef, ly,3)
	out_concentration = Matrix(undef, ly,3)
	out_temp_forcing = Matrix(undef, ly,6)
	out_temp_ocean = Matrix(undef, ly,5)

	row = 0
	for i in iyear.(yearrange)
		row += 1
		RF_nonCO2 = otherforcing[rcp][i] + p.aerosolforcingfactor * aerosolforcing[rcp][i] +
			sum(res[i].RadiativeForcing[g] for g in GAS if g != :CO2)
		out_carbon[row,:] =
			[res[i].Concentration[:CO2]/ppm_per_GtC  sum(res[i].BioReservoir)  res[i].DeltaDIC/micromol_per_kg_per_GtC]
		out_emissions[row,:] =
			[annualemissions[:CO2][i]  annualemissions[:CH4][i]  annualemissions[:N2O][i]]
		out_concentration[row,:] =
			[res[i].Concentration[:CO2]  res[i].Concentration[:CH4]  res[i].Concentration[:N2O]]
		out_temp_forcing[row,:] =
			[res[i].Temp_global  res[i].TotalRadiativeForcing*p.lambda  res[i].Temp_land  res[i].TotalRadiativeForcing  RF_nonCO2  res[i].Temp_land./res[i].Temp[1]]
		out_temp_ocean[row,:] =
			[res[i].Temp[1]  res[i].Temp[2]  res[i].Temp[5]  res[i].Temp[10]  res[i].Temp[maxlayers]]
	end

	#println("\nAtmosphereCarbon BioCarbon OceanCarbon")
	#display([yearrange out_carbon])
	println("\nEmissions_CO2 Emissions_CH4 Emissions_N2O")
	display([yearrange out_emissions])
	println("\nConcentration_CO2 Concentration_CH4 Concentration_N2O")
	display([yearrange out_concentration])
	println("\nTemp_global EquilibriumTemperature Temp_land TotalRadiativeForcing TotalNonCO2forcing R_lambda")
	display([yearrange out_temp_forcing])
	println("\nTemp_oceanlayer (layers 1,2,5,10,max)")
	display([yearrange out_temp_ocean])

	println("\naerosolforcingfactor & fertilization: ", p.aerosolforcingfactor, "  ", p.fertilization)
end
