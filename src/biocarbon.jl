# 4-box biosphere impulse response, see Joos (1996) appendix A.3

let
	# to get weights for each box, take bioBoxCoeff.*bioboxtime
	biodata = [
		#bioBoxCoeff	bioboxtime
		-0.71846		2.181818				# detritus
		0.70211			2.85714					# ground vegetation
		0.013414		20						# wood
		0.0029323		100						# soil organic carbon
	]

	bioboxweight	= biodata[:,1] .* biodata[:,2]
	bioboxtime		= biodata[:,2]

	baseNPP			= 60.0		# GtC/year

	global const bioboxlength = length(bioboxweight)

	global function biocarbon!(s::ClimateState, p::ClimateParams)
		@unpack Concentration, BioReservoir, Temp, Temp_land = s
		@unpack timestep, fertilization, bioQ10factor = p
		# BioNPP [GtC/year]: Net Primary Production of biosphere, increases with CO2 concentration (fertilization)
		BioNPP = baseNPP * (1 + fertilization*log(Concentration[:CO2]/conc_CO2_preind))
		
		# BioReservoir [GtC]: carbon content of 4 biosphere boxes, temperature feedback controlled by bioQ10factor
		dt_BioReservoir = BioNPP * bioboxweight - BioReservoir * bioQ10factor^(Temp_land/10) ./ bioboxtime
		BioReservoir[:] += timestep * dt_BioReservoir

		# Net increase of terrestrial biomass
		NetFluxBiosphere = sum(dt_BioReservoir)

		@pack! s = NetFluxBiosphere, BioReservoir
	end

	global function init_biocarbon!(s::ClimateState, p::ClimateParams)
		@unpack fertilization, equilibriumCO2 = p
		startNPP = baseNPP * (1 + fertilization*log(equilibriumCO2/conc_CO2_preind))	# GtC/year
		NetFluxBiosphere = 0.0
		BioReservoir = startNPP * bioboxweight .* bioboxtime

		@pack! s = NetFluxBiosphere, BioReservoir
	end
end