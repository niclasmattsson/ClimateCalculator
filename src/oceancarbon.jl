#	Princeton 3-D carbon cycle model, from Joos (1996) "An efficient and accurate representation ..."

let
	# http://en.wikipedia.org/wiki/Atmosphere_of_Earth
	# composition:		78.084% N2, 20.946% O2, 0.9340% Ar, 0.039% CO2	=>	28.957 g/mol  (28.96 if CO2 ignored)
	# dry air mass:		5.1352 * 10^18 kg  =  0.17734 * 10^18 "kmol air"
	# ideal gas => volume% = molar%, so:	1 GtC = 1/12 * 10^12 kmol C = 0.4689 * 10^-6 (kmol C / kmol air)
	global const ppm_per_GtC		= 0.4689	# ppm/GtC
	global const conc_CO2_preind	= 278.0		# ppm

	oceandata = [
		#oceanboxweight	oceanboxtime
		#0.70367		0.70177			# Joos t > 1 response
		#0.6113			0.70177			# Daniel fix year 1
		0.611253		0.812465		# Niclas optimized for timestep=0.01 & 25 year horizon
		0.24966			2.3488
		0.066485		15.281
		0.038344		65.359
		0.019439		347.55
		0.014819		999999999		
	]

	dataDIC = [
		#coeffDIC		coeffDICtemp
		15.568e-1		-0.13993e-1
		7.4706e-3		-0.20207e-3
		-1.2748e-5		0.12015e-5
		2.4491e-7		-0.12639e-7
		-1.5468e-10		0.15326e-10		
	]

	oceanboxweight	= oceandata[:,1]
	oceanboxtime 	= oceandata[:,2]
	coeffDIC		= dataDIC[:,1]
	coeffDICtemp	= dataDIC[:,2]

	constantDIC			= 1.722e17	# µmol*m3/(ppm*kg)
	mixedlayerdepth 	= 50.9		# m
	oceansurfacearea	= 3.55e14	# m2 		# (3.62e14)	 m2	

	gasexchangerate		= 1/7.66	# 1/year
	oceantemperature 	= 17.7		# degC

	global const oceanboxlength = length(oceanboxweight)
	global const micromol_per_kg_per_GtC = constantDIC / (mixedlayerdepth*oceansurfacearea) * ppm_per_GtC # µmol/kg/GtC

	# ocean carbon, parameterizations of impulse responses
	global function oceancarbon!(s::ClimateState, p::ClimateParams)
		@unpack Concentration, NetFluxOcean, DeltaDICbox, DeltaCO2ocean, Temp = s
		@unpack timestep, oceantempfeedback = p
		# Mixed layer pulse response function, 3D model in Joos appendix A.2.4
		# The function has 5 exponential terms (+ one constant) with different weights and time constants
		# impulse response function: IRF(t) = sum(oceanboxweight .* exp.(-t./oceanboxtime))

		# [µmol/kg], The IRF convolution can be interpreted as a solution to a system of first order ODEs
		dt_DeltaDICbox = micromol_per_kg_per_GtC * NetFluxOcean * oceanboxweight - DeltaDICbox ./ oceanboxtime
		DeltaDICbox[:] += timestep * dt_DeltaDICbox

		# [µmol/kg], DIC = Dissolved Inorganic Carbon
		DeltaDIC = sum(DeltaDICbox)

		# [ppm] Nonlinear parameterization of ocean carbonate chemistry (Revelle buffer)
		DeltaCO2ocean = sum((coeffDIC[k] + coeffDICtemp[k]*oceantemperature) * DeltaDIC^k for k=1:5)
		#DeltaCO2ocean = sum((coeffDIC + coeffDICtemp*oceantemperature) .* DeltaDIC.^(1:5))

		# Air-sea flux
		NetFluxOcean = calc_NetFluxOcean(Concentration[:CO2], DeltaCO2ocean, Temp[1], oceantempfeedback)

		@pack! s = NetFluxOcean, DeltaDIC, DeltaDICbox, DeltaCO2ocean
	end

	global calc_NetFluxOcean(CO2concentration, DeltaCO2ocean, Temp_mixed, oceantempfeedback) =
		gasexchangerate / ppm_per_GtC *
			(CO2concentration - (conc_CO2_preind + DeltaCO2ocean) * exp(oceantempfeedback*0.0423*Temp_mixed))

	global function init_oceancarbon!(s::ClimateState, p::ClimateParams)
		@unpack Temp = s
		@unpack timestep, oceantempfeedback, equilibriumCO2 = p
		CO2emissions_year1 = 0.0
		DeltaDIC, DeltaCO2ocean = backgroundCO2_solve(equilibriumCO2)

		Concentration = Dict(g => 0.0 for g in GAS3)
		Concentration[:CO2] = conc_CO2_preind + ppm_per_GtC * timestep*CO2emissions_year1 + DeltaCO2ocean
		NetFluxOcean = calc_NetFluxOcean(Concentration[:CO2], DeltaCO2ocean, Temp[1], oceantempfeedback)
		DeltaDICbox = [zeros(length(oceanboxtime)-1); DeltaDIC]

		@pack! s = Concentration, NetFluxOcean, DeltaDICbox, DeltaDIC, DeltaCO2ocean
	end

	global function backgroundCO2_solve(equilibriumCO2)
		# set up background CO2 concentrations by doing a few quick iterations of Newton-Raphson
		# to solve OceanCO2(DeltaDIC) = equilibriumCO2 - conc_CO2_preind
		# (OceanCO2 and DeltaDIC will be zero if equilibriumCO2 is at default value of 278K)
		DeltaDIC = 330*(equilibriumCO2-conc_CO2_preind) / (330 + equilibriumCO2-conc_CO2_preind) # starting guess
		OceanCO2 = 0.0
		for i=1:5
			# split out the iterations to make the solve type stable (the function boundary helps)
			# both backgroundCO2_solve() and newtonraphson_iteration() need to be global for some reason
			DeltaDIC, OceanCO2 = newtonraphson_iteration(DeltaDIC, equilibriumCO2)
		end
		return DeltaDIC, OceanCO2
	end

	global function newtonraphson_iteration(DeltaDIC, equilibriumCO2)
		# DeltaDIC is x and OceanCO2 is y
		OceanCO2 = sum((coeffDIC[k] + coeffDICtemp[k]*oceantemperature) * DeltaDIC^k for k=1:5)
		derivative = sum((coeffDIC[k] + coeffDICtemp[k]*oceantemperature) * k * DeltaDIC^(k-1) for k=1:5)
		oceanCO2target = equilibriumCO2 - conc_CO2_preind
		return DeltaDIC - (OceanCO2 - oceanCO2target)/derivative,  OceanCO2
	end
end