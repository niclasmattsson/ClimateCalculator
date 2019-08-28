let
	startcalibration = 2008		# originally 1960
	endcalibration = 2010

	calibrationtime = 1:iyear(endcalibration)
	rcplist = ["RCP3PD", "RCP45", "RCP6", "RCP85"]
	cache_constantforcing =
		Dict(r => sum(forcing_conc_RCP[r][g][calibrationtime] for g in GAS) + otherforcing[r][calibrationtime] for r in rcplist)

	global function forcingerror(aerosolforcingfactor, p::ClimateParams, rcp)
		TotalRadiativeForcing_annual = cache_constantforcing[rcp] + aerosolforcingfactor * aerosolforcing[rcp][calibrationtime]

		s = ClimateState()
		init_temperatures!(s)
		Error_Temp = 0.0

		for t in YEARS[1]:p.timestep:endcalibration
			s.TotalRadiativeForcing = interpolate(t, TotalRadiativeForcing_annual)
			temperatures!(s, p)
			if t >= startcalibration
				Error_Temp += (interpolate(t, histTempGISS) - s.Temp_global)^2
			end
		end

		return Error_Temp
	end

	global function calibrateforcing!(p::ClimateParams, rcp)
		result = optimize(aerosolforcingfactor -> forcingerror(aerosolforcingfactor,p,rcp), -2.0, 5.0)
		aerosolforcingfactor = Optim.minimizer(result) 	# 1.3925
		@pack! p = aerosolforcingfactor
	end

	function concentrationerror(fertilization, annualemissions, p::ClimateParams, rcp)
		@pack! p = fertilization
		results::Vector{ClimateState} = solveclimate(annualemissions, p, 1765, endcalibration, false, rcp)

		error = 0.0
		for i=iyear(startcalibration):iyear(endcalibration)
			error += (results[i].Concentration[:CO2] - conc_RCP[rcp][:CO2][i])^2
		end

		return error
	end

	global function calibratefertilization!(annualemissions, p::ClimateParams, rcp)
		result = optimize(fert -> concentrationerror(fert, annualemissions, p, rcp), 0.2, 0.8, rel_tol=1e-4)
		
		fertilization::Float64 = Optim.minimizer(result) 	# 0.5886
		#println("mean concentration error: ",sqrt(Optim.minimum(result))/(endcalibration-startcalibration+1))
		@pack! p = fertilization
	end
end