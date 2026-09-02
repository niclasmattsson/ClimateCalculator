let
	# Radiative forcing over the whole observed record. A calibration window is a subrange
	# of this, so the constant part is cached once here rather than per window.
	observedtime = 1:iyear(BASEYEAR)
	rcplist = ["RCP3PD", "RCP45", "RCP6", "RCP85"]
	cache_constantforcing =
		Dict(r => sum(forcing_conc_RCP[r][g][observedtime] for g in GAS) + otherforcing[r][observedtime] for r in rcplist)

	global function forcingerror(aerosolforcingfactor, p::ClimateParams, rcp, calibrationyears)
		firstcalibration, lastcalibration = calibrationyears[1], calibrationyears[end]
		TotalRadiativeForcing_annual = cache_constantforcing[rcp] + aerosolforcingfactor * aerosolforcing[rcp][observedtime]

		s = ClimateState()
		init_temperatures!(s)
		Error_Temp = 0.0
		baseline, baselineyears = 0.0, 0

		for t in YEARS[1]:p.timestep:lastcalibration
			s.TotalRadiativeForcing = interpolate(t, TotalRadiativeForcing_annual)
			temperatures!(s, p)
			# the model's own BASELINEYEARS mean is its zero point, as it is for the observations
			if t ≈ round(t) && round(Int, t) in BASELINEYEARS
				baseline += s.Temp_global
				baselineyears += 1
			end
			if t >= firstcalibration
				Error_Temp += (interpolate(t, histTemp) - (s.Temp_global - baseline/baselineyears))^2
			end
		end

		return Error_Temp, baseline/baselineyears
	end

	global function calibrateforcing!(p::ClimateParams, rcp, calibrationyears=CALIBRATIONYEARS)
		checkcalibrationwindow(calibrationyears)
		result = optimize(f -> forcingerror(f,p,rcp,calibrationyears)[1], -2.0, 5.0)
		aerosolforcingfactor = Optim.minimizer(result) 	# 1.3925
		tempbaseline = forcingerror(aerosolforcingfactor, p, rcp, calibrationyears)[2]
		@pack! p = aerosolforcingfactor, tempbaseline
	end

	function concentrationerror(fertilization, annualemissions, p::ClimateParams, rcp, calibrationyears)
		@pack! p = fertilization
		results::Vector{ClimateState} = solveclimate(annualemissions, p, 1765, calibrationyears[end], false, rcp)

		error = 0.0
		for i=iyear(calibrationyears[1]):iyear(calibrationyears[end])
			error += (results[i].Concentration[:CO2] - histConc[:CO2][i])^2
		end

		return error
	end

	global function calibratefertilization!(annualemissions, p::ClimateParams, rcp, calibrationyears=CALIBRATIONYEARS)
		checkcalibrationwindow(calibrationyears)
		result = optimize(fert -> concentrationerror(fert, annualemissions, p, rcp, calibrationyears), 0.2, 0.8, rel_tol=1e-4)

		fertilization::Float64 = Optim.minimizer(result) 	# 0.5886
		#println("mean concentration error: ",sqrt(Optim.minimum(result))/(lastcalibration-firstcalibration+1))
		@pack! p = fertilization
	end
end

# The window may be narrowed or shifted at run time (the interface has a slider for it), so
# it has to satisfy at run time what the @assert in settings.jl checks for the default.
function checkcalibrationwindow(calibrationyears)
	isempty(calibrationyears) && error("Empty calibration window $calibrationyears.")
	firstyear, lastyear = first(calibrationyears), last(calibrationyears)
	firstyear > BASELINEYEARS[end] ||
		error("The calibration window must start after the temperature baseline ends in $(BASELINEYEARS[end]), got $firstyear.")
	lastyear <= BASEYEAR ||
		error("The calibration window cannot reach past the observed record, which ends in $BASEYEAR, got $lastyear.")
	return nothing
end
