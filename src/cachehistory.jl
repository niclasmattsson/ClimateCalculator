using ProgressMeter, JLD2, Dierckx

let
	splineknots = [fill(0.2, 4); 0.4:0.1:1.8; fill(2.0, 4)]
	
	splinecoeff(x, y) = Spline1D(x, y).c
	global interpolatespline(x, coeff) = Spline1D(splineknots, coeff, 3, 3, 0.0)(x)

	global function makecalibrationcache()
		lambdas = splineknots[1]:0.1:splineknots[end]
		years = 1800:10:2010
		ylen = length(years)
		states, forcingfactor, fertilization = precalchistory(lambdas, years)
		statemat = reshapestates(states)
		forccoeff = splinecoeff(lambdas, forcingfactor)
		fertcoeff = splinecoeff(lambdas, fertilization)
		statecoeff = Array{Float64,3}(75,length(forccoeff),ylen)
		for ivar = 1:75, iyear=1:ylen
			statecoeff[ivar,:,iyear] = splinecoeff(lambdas, statemat[ivar,:,iyear])
		end
		@save "cachedclimatehistory.jld2" statecoeff forccoeff fertcoeff
	end

	function precalchistory(lambdas, years)
		len = length(lambdas)
		states = Vector{Vector{ClimateState}}(len)
		forcingfactor = Vector{Float64}(len)
		fertilization = Vector{Float64}(len)
		progressmeter = Progress(len, 1)
		for i=1:len
			results, p = solveclimate(; lambda=lambdas[i], timestep=0.001, lastyear=2010, usecache=false)
			states[i] = results[iyear.(years)]
			forcingfactor[i] = p.aerosolforcingfactor
			fertilization[i] = p.fertilization
			next!(progressmeter)
		end
		return states, forcingfactor, fertilization
	end

	function reshapestates(states::Vector{Vector{ClimateState}})::Array{Float64,3}
		llen = length(states)
		ylen = length(states[1])
		out = Array{Float64,3}(75,llen,ylen)
		for ilambda=1:llen, iyear=1:ylen
			out[:,ilambda,iyear] = state2vector(states[ilambda][iyear])
		end
		out
	end

	if !isfile("cachedclimatehistory.jld2")
		println("Precalculating historical model results...")
		println("(This will take a minute or two but will make the model run much faster.)")
		makecalibrationcache()
	end

	@load "cachedclimatehistory.jld2"
	global const cached_coeff_state = statecoeff
	global const cached_coeff_forcing = forccoeff
	global const cached_coeff_fertilization = fertcoeff
end