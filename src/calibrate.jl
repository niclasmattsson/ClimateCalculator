let
	firstcalibration, lastcalibration = CALIBRATIONYEARS[1], CALIBRATIONYEARS[end]

	calibrationtime = 1:iyear(lastcalibration)
	rcplist = ["RCP3PD", "RCP45", "RCP6", "RCP85"]
	cache_constantforcing =
		Dict(r => sum(forcing_conc_RCP[r][g][calibrationtime] for g in GAS) + otherforcing[r][calibrationtime] for r in rcplist)

	global function forcingerror(aerosolforcingfactor, p::ClimateParams, rcp)
		TotalRadiativeForcing_annual = cache_constantforcing[rcp] + aerosolforcingfactor * aerosolforcing[rcp][calibrationtime]

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

	global function calibrateforcing!(p::ClimateParams, rcp)
		result = optimize(f -> forcingerror(f,p,rcp)[1], -2.0, 5.0)
		aerosolforcingfactor = Optim.minimizer(result) 	# 1.3925
		tempbaseline = forcingerror(aerosolforcingfactor, p, rcp)[2]
		@pack! p = aerosolforcingfactor, tempbaseline
	end

	function concentrationerror(fertilization, annualemissions, p::ClimateParams, rcp)
		@pack! p = fertilization
		results::Vector{ClimateState} = solveclimate(annualemissions, p, 1765, lastcalibration, false, rcp)

		error = 0.0
		for i=iyear(firstcalibration):iyear(lastcalibration)
			error += (results[i].Concentration[:CO2] - histConc[:CO2][i])^2
		end

		return error
	end

	global function calibratefertilization!(annualemissions, p::ClimateParams, rcp)
		result = optimize(fert -> concentrationerror(fert, annualemissions, p, rcp), 0.2, 0.8, rel_tol=1e-4)

		fertilization::Float64 = Optim.minimizer(result) 	# 0.5886
		#println("mean concentration error: ",sqrt(Optim.minimum(result))/(lastcalibration-firstcalibration+1))
		@pack! p = fertilization
	end
end
