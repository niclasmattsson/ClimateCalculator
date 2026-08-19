using JSON, DelimitedFiles
import XLSX

# Read a file with fixed width columns and a header row.
function readfixedwidth(x::String; opts...)
	data, headers = readdlm(x; header=true, opts...)
	return Dict{Symbol,Vector{Float64}}(Symbol(headers[i]) => data[:,i] for i=1:length(headers))
end 

function readssp(unit)
	path = joinpath(@__DIR__, "..")
	file = "$path/SSP/SSP database.xlsx"
	models = ["AIM/CGE", "GCAM4", "IMAGE", "MESSAGE-GLOBIOM", "REMIND-MAGPIE", "WITCH-GLOBIOM"]
	gases = Dict(
		"TotalCO2" => "Emissions - CO2 total",
		"OtherCO2" => "Emissions - CO2 land use",
		"CH4" => "Emissions - CH4",
		"N2O" => "Emissions - N2O",
		"Population" => "Population - total",
		"GDP" => "GDP (PPP)"
	)
	regions = Dict(
		"R5.2ASIA" => "Asia",
		"R5.2LAM" => "LAM",
		"R5.2MAF" => "MAF",
		"R5.2OECD" => "OECD",
		"R5.2REF" => "REF",
		"World" => "Global"
	)
	scenarios = ["SSP1-26", "SSP1-34", "SSP1-45", "SSP1-Baseline",
				"SSP2-26", "SSP2-34", "SSP2-45", "SSP2-60", "SSP2-Baseline",
				"SSP3-34", "SSP3-45", "SSP3-60", "SSP3-Baseline",
				"SSP4-26", "SSP4-34", "SSP4-45", "SSP4-60", "SSP4-Baseline",
				"SSP5-26", "SSP5-34", "SSP5-45", "SSP5-60", "SSP5-Baseline"
	]

	dict(n) = n == 0 ? Vector{Float64} : Dict{String, dict(n-1)}
	ssp = dict(4)()
	for (gas, sheet) in gases
		nrows = if gas == "Population"
					781
				elseif gas == "GDP"
					721
				else
					631
				end
		arr = XLSX.readdata(file, sheet, "A1:P$nrows")
		unitfactor = if gas == "TotalCO2" || gas == "OtherCO2"
						(unit == :GtC ? 12/44 : 1.0) / 1000
					elseif gas == "N2O"
						28/44/1000
					elseif gas == "Population"
						0.001
					else
						1.0
					end
		for r=2:nrows
			model, scen, reg = arr[r,1], arr[r,2], regions[arr[r,3]]
			#ssp[gas][model][scen][reg] = float.(arr[r, 6:16]) * unitfactor
			if model in models
				get!(dict(1), get!(dict(2), get!(dict(3), ssp, gas), model), scen)[reg] = signif.(float.(arr[r, 6:16]) * unitfactor, 6)
			end
		end
		for model in models, scen in scenarios
			!haskey(ssp[gas][model], scen) && continue
			sspdict = ssp[gas][model][scen]
			sspdict["Global"] = signif.(sspdict["OECD"] + sspdict["Asia"] + sspdict["LAM"] + sspdict["MAF"] + sspdict["REF"], 6)
		end
	end
	open("SSPscenarios.js", "w") do f
		write(f, JSON.json(ssp, 4))
	end
	return ssp		# the return vector (in the dict) is for [2005, 2010, 2020, ..., 2100]
end

#=
	then find/replace in sublime:
		\s+(\-?\d+\.\d+,*)\n	=> 	$1
		\s+]					=>	]
	finally add var assignment to beginning
=#

# Usage: ClimateCalculator_new.readrcp("RCP3PD", ["FossilCO2","OtherCO2"])
function readrcp(rcpscen,gases,unit)
	path = joinpath(dirname(@__FILE__), "..")
	file = "$path/RCP/$rcpscen.SCEN"
	lines = parse(Int, readline(file))

	# note: readdlm() skips blank lines
	data = readdlm(file, skipstart=6)
	regions = data[1:lines+3:end-1,1]
	headers = data[2,:]
	firstyear = data[4,1]
	endyear = data[4+lines-1,1]
	#rcp = Dict{String, Dict{String, Vector{Float64}}}()
	rcp = Dict(gas => Dict{String, Vector{Float64}}() for gas in [gases; "TotalCO2"])
	for gas in gases, (i,reg) in enumerate(regions)
		vect = Array{Float64}(endyear-firstyear+1)
		colindex = findfirst(headers, gas)
		colindex == 0 && error("Column $gas not found in $headers.")
		lastrow = 4 + (i-1)*(lines+3)
		for row = (5:4+lines-1) + (i-1)*(lines+3)
			years = data[lastrow,1]:data[row,1]
			#println(i," ",reg," ",lastrow," ",row," ",years)
			vect[years-firstyear+1] = linspace(data[lastrow,colindex],data[row,colindex],length(years))
			lastrow = row
		end
		rcp[gas][reg] = unit == :GtCO2 ? vect*44/12 : vect
	end
	for reg in regions
		rcp["TotalCO2"][reg] = rcp["FossilCO2"][reg] + rcp["OtherCO2"][reg]
	end
	rcp
end

function readallrcp()
	rcplist = ["RCP3PD", "RCP45", "RCP6", "RCP85"]
	gases = ["FossilCO2", "OtherCO2", "CH4", "N2O"]
	allrcp = Dict(r => readrcp(r,gases,:GtCO2) for r in rcplist)
	open("RCPscenarios.js", "w") do f
		write(f, JSON.json(allrcp, 4))
	end
	#=open("testtest.txt", "w") do f
		show(IOContext(f, :limit => false), MIME("text/plain"), allrcp)
	end=#
	nothing
end

# Observed temperatures, each source rebaselined from the period it publishes to
# BASELINEYEARS. HadCRUT5 is the reference because it is the only one reaching back to 1850;
# the others are aligned to it over 1961-1990 first (as IPCC AR6 does with short records).
function observedtemperatures(anomaly)
	years = Int.(anomaly[:YEAR])
	average(v, yrs) = nanmean(v[i] for (i,y) in enumerate(years) if y in yrs)

	# every source onto its own 1961-1990 anomaly, then all of them onto BASELINEYEARS
	shift = average(anomaly[:HADCRUT5], 1961:1990) - average(anomaly[:HADCRUT5], BASELINEYEARS)
	sources = [:GISS, :HADCRUT5, :NOAA]
	rebaselined = Dict(g => anomaly[g] .- average(anomaly[g], 1961:1990) .+ shift for g in sources)
	series = TEMPSERIES == :mean ? [nanmean(rebaselined[g][i] for g in sources) for i=1:length(years)] :
									rebaselined[TEMPSERIES]

	histTemp = fill(NaN, length(YEARS))
	histTemp[iyear.(years)] = series
	return histTemp
end

nanmean(itr) = (v = collect(Iterators.filter(!isnan, itr)); sum(v)/length(v))

# The observed concentration record: RCP historical concentrations (themselves
# observation-based) up to the splice year, NOAA GML global annual means from there on. The
# level difference between the two records is blended out over SPLICEBLEND years, so the
# series is continuous and still matches observed levels well before BASEYEAR.
function observedconcentrations(observed, conc_RCP)
	years = Int.(observed[:YEAR])
	histConc = Dict(g => copy(conc_RCP["RCP3PD"][g]) for g in GAS3)
	for g in GAS3
		joinyear = CONCENTRATIONSPLICE[g] - 1
		i0 = findfirst(isequal(joinyear), years)
		(i0 === nothing || isnan(observed[g][i0])) && error("No $g observation in $joinyear to splice onto.")
		offset = histConc[g][iyear(joinyear)] - observed[g][i0]
		for (i,y) in enumerate(years)
			(y <= joinyear || isnan(observed[g][i])) && continue
			histConc[g][iyear(y)] = observed[g][i] + offset * max(0.0, 1 - (y-joinyear)/SPLICEBLEND)
		end
		# beyond the observations, carry the record forward with the RCP scenario's changes
		for y = years[end]+1:YEARS[end]
			histConc[g][iyear(y)] = histConc[g][iyear(y-1)] +
				conc_RCP["RCP3PD"][g][iyear(y)] - conc_RCP["RCP3PD"][g][iyear(y-1)]
		end
	end
	return histConc
end

# The emissions the model is driven with up to BASEYEAR: Global Carbon Budget CO2 (the same
# aggregation the web interface draws as observed history), and the CH4 and N2O emissions
# that reproduce the observed concentration record exactly.
function observedemissions(budget, histConc)
	emissions = Dict{Symbol,Vector{Float64}}(g => inverseemissions(g, histConc[g]) for g in [:CH4, :N2O])
	emissions[:CO2] = fill(NaN, length(YEARS))
	emissions[:CO2][iyear.(Int.(budget[:YEAR]))] = budget[:FOSSIL] + budget[:LANDUSE]
	return emissions
end

function historicdata()
	rcplist = ["RCP3PD", "RCP45", "RCP6", "RCP85"]
	path = joinpath(dirname(@__FILE__), "..")
	conc_RCP = Dict(r => readfixedwidth("$path/RCP/$(r)_MIDYEAR_CONCENTRATIONS.DAT", skipstart=38) for r in rcplist)
	forcing_RCP = Dict(r => readfixedwidth("$path/RCP/$(r)_MIDYEAR_RADFORCING.DAT", skipstart=59) for r in rcplist)
	temperatureAnomaly = readfixedwidth("$path/AnnualTemperatures.dat", comments=true)
	observedConc = readfixedwidth("$path/AnnualConcentrations.dat", comments=true)
	carbonbudget = readfixedwidth("$path/GlobalCarbonBudget.dat", comments=true)

	forcing_conc_RCP = Dict(r => Dict(g => Vector{Float64}(undef, length(YEARS)) for g in GAS) for r in rcplist)
	RadiativeForcing = Dict{Symbol,Float64}(g => 0.0 for g in GAS)

	for r in rcplist
		for i=1:length(YEARS)
			conc = Dict{Symbol,Float64}(g => conc_RCP[r][g][i] for g in GAS3)
			radiativeforcing!(conc, RadiativeForcing)
			for g in GAS
				forcing_conc_RCP[r][g][i] = RadiativeForcing[g]
			end
		end
	end

	aerosolforcing = Dict(r => forcing_RCP[r][:TOTAER_DIR_RF] + forcing_RCP[r][:CLOUD_TOT_RF] +
								forcing_RCP[r][:BCSNOW_RF] for r in rcplist)

	# solar RF:  average over one cycle is 0.103756, held constant beyond the observed record
	solarRF_1::Dict{String,Vector{Float64}} = Dict(r => CONSTANTSOLARRF ?
		[forcing_RCP[r][:SOLAR_RF][YEARS .<= BASEYEAR]; fill(0.103756, YEARS[end]-BASEYEAR)] :
		forcing_RCP[r][:SOLAR_RF] for r in rcplist)

	# about 50% of RF from tropospheric O3 is due to CH4, the rest is here
	otherforcing = Dict(r => solarRF_1[r] + forcing_RCP[r][:VOLCANIC_ANNUAL_RF] + forcing_RCP[r][:LANDUSE_RF] +
								forcing_RCP[r][:FGASSUM_RF] + forcing_RCP[r][:MHALOSUM_RF] + forcing_RCP[r][:STRATOZ_RF] +
								0.5*forcing_RCP[r][:TROPOZ_RF] for r in rcplist)

	#histNonCO2forcing_1 = forcing_RCP[:CH4_RF] + forcing_RCP[:N2O_RF] + forcing_RCP[:CH4OXSTRATH2O_RF] + 0.5*forcing_RCP[:TROPOZ_RF]

	# the provenance line each data file starts with, so a stale cache can be recognised
	datavintage = join([first(readlines("$path/$f")) for f in
			["AnnualTemperatures.dat", "AnnualConcentrations.dat", "GlobalCarbonBudget.dat"]], " ")

	histTemp = observedtemperatures(temperatureAnomaly)
	histConc = observedconcentrations(observedConc, conc_RCP)
	histEmissions = observedemissions(carbonbudget, histConc)

	return aerosolforcing, otherforcing, conc_RCP, forcing_conc_RCP, histTemp, histConc, histEmissions, datavintage
end

const aerosolforcing, otherforcing, conc_RCP, forcing_conc_RCP, histTemp, histConc, histEmissions,
		datavintage = historicdata()
