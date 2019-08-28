let
	lifetime_CH4_2000	= 9.6		# years
	conc_CH4_2000		= 1700.0	# ppb
	lifetime_CH4_strat	= 120.0		# years
	lifetime_CH4_soil	= 160.0		# years
	ppb_per_MtCH4		= 1/2.746	# ppb/MtCH4
	ppb_per_MtN			= 1/4.8		# ppb/MtN
	lifetime_N2O		= 120.0		# years

	global function carbonbalance!(emissions, s::ClimateState, p::ClimateParams)
		@unpack Concentration, NetFluxOcean, NetFluxBiosphere = s
		@unpack timestep = p
		dt_Concentration_CO2 = ppm_per_GtC * (emissions[:CO2] - NetFluxOcean - NetFluxBiosphere)
		Concentration[:CO2] += timestep * dt_Concentration_CO2
		@pack s = Concentration
	end

	global function concentrations!(emissions, s::ClimateState, p::ClimateParams)
		@unpack Concentration = s
		@unpack timestep = p
		# CH4 loss from tropospheric OH (CH4 feedback on its own lifetime), from IPCC TAR WG1 4.2.1.1 (p250)
		Lifetime_CH4_by_OH = lifetime_CH4_2000 * (Concentration[:CH4]/conc_CH4_2000)^0.28

		# All components of CH4 lifetime, from IPCC TAR WG1 4.2.1.1 (p248)
		Lifetime_CH4 = 1 / (1/lifetime_CH4_strat + 1/lifetime_CH4_soil + 1/Lifetime_CH4_by_OH)

		# Simple 1-box exponential decay
		dt_Concentration_CH4 = emissions[:CH4]*ppb_per_MtCH4 - Concentration[:CH4]/Lifetime_CH4
		Concentration[:CH4] += timestep * dt_Concentration_CH4

		# ditto for N2O
		dt_Concentration_N2O = emissions[:N2O]*ppb_per_MtN - Concentration[:N2O]/lifetime_N2O
		Concentration[:N2O] += timestep * dt_Concentration_N2O
		@pack s = Concentration
	end
end