using ProgressMeter, Dierckx, JLD

let
	splineknots = [fill(0.2, 4); 0.4:0.1:1.8; fill(2.0, 4)]

	splinecoeff(x, y) = Spline1D(x, y).c
	global interpolatespline(x, coeff) = Spline1D(splineknots, coeff, 3, 3, 0.0)(x)

	# Provenance of the cache: any change to these settings makes the stored history wrong,
	# and there is no way to tell from the numbers themselves.
	stamp() = "baseyear $BASEYEAR, cache $CACHEYEARS, calibration $CALIBRATIONYEARS, " *
				"baseline $BASELINEYEARS, temperatures $TEMPSERIES, data: $datavintage"

	global function makecalibrationcache()
		lambdas = splineknots[1]:0.1:splineknots[end]
		ylen = length(CACHEYEARS)
		states, forcingfactor, fertilization, tempbaseline = precalchistory(lambdas, CACHEYEARS)
		statemat = reshapestates(states)
		forccoeff = splinecoeff(lambdas, forcingfactor)
		fertcoeff = splinecoeff(lambdas, fertilization)
		basecoeff = splinecoeff(lambdas, tempbaseline)
		statecoeff = Array{Float64,3}(undef, 75,length(forccoeff),ylen)
		for ivar = 1:75, iyear=1:ylen
			statecoeff[ivar,:,iyear] = splinecoeff(lambdas, statemat[ivar,:,iyear])
		end
		path = joinpath(@__DIR__, "..")
		JLD.save("$path/cachedclimatehistory.jld", "statecoeff", statecoeff, "forccoeff", forccoeff,
					"fertcoeff", fertcoeff, "basecoeff", basecoeff, "settings", stamp())
	end

	function precalchistory(lambdas, years)
		len = length(lambdas)
		states = Vector{Vector{ClimateState}}(undef, len)
		forcingfactor = Vector{Float64}(undef, len)
		fertilization = Vector{Float64}(undef, len)
		tempbaseline = Vector{Float64}(undef, len)
		progressmeter = Progress(len, 1)
		for i=1:len
			results, p = solveclimate(; lambda=lambdas[i], timestep=0.001, lastyear=BASEYEAR, usecache=false)
			states[i] = results[iyear.(years)]
			forcingfactor[i] = p.aerosolforcingfactor
			fertilization[i] = p.fertilization
			tempbaseline[i] = p.tempbaseline
			next!(progressmeter)
		end
		return states, forcingfactor, fertilization, tempbaseline
	end

	function reshapestates(states::Vector{Vector{ClimateState}})::Array{Float64,3}
		llen = length(states)
		ylen = length(states[1])
		out = Array{Float64,3}(undef, 75,llen,ylen)
		for ilambda=1:llen, iyear=1:ylen
			out[:,ilambda,iyear] = state2vector(states[ilambda][iyear])
		end
		out
	end

	path = joinpath(@__DIR__, "..")
	cache = JLD.load("$path/cachedclimatehistory.jld")
	get(cache, "settings", "none") != stamp() &&
		@warn "The cached history was made with other settings ($(get(cache, "settings", "none"))). " *
				"Run makecalibrationcache() to rebuild it."
	global const cached_coeff_state = cache["statecoeff"]
	global const cached_coeff_forcing = cache["forccoeff"]
	global const cached_coeff_fertilization = cache["fertcoeff"]
	global const cached_coeff_tempbaseline = get(cache, "basecoeff", zeros(size(cache["forccoeff"])))

end
