let
	conc_CH4_preind 	= 710.0		# ppb
	conc_N2O_preind		= 273.0		# ppb

	cacheterm = 0.47 * log(1 + 2.01e-5*(conc_CH4_preind*conc_N2O_preind)^0.75 +
							+ 5.31e-15*conc_CH4_preind*(conc_CH4_preind*conc_N2O_preind)^1.52)

	global function radiativeforcing!(Concentration, RadiativeForcing)
		# Saturation of CH4 absorption bands minus overlap with N2O
		# IPCC TAR WG1 table 6.2 (p358), or Tanaka eq 2.2.4 & 2.2.5 (sign error in 2.2.4)
		# Can skip the entire 5e-15*() terms, error ~0.1% for 2400 ppb
		RadiativeForcing[:CH4] =
			0.036 * (sqrt(Concentration[:CH4]) - sqrt(conc_CH4_preind)) +
			- 0.47 * log(1 + 2.01e-5*(Concentration[:CH4]*conc_N2O_preind)^0.75 +
							+ 5.31e-15*Concentration[:CH4]*(Concentration[:CH4]*conc_N2O_preind)^1.52) +
			+ cacheterm

		# ditto for N2O
		RadiativeForcing[:N2O] =
			0.12 * (sqrt(Concentration[:N2O]) - sqrt(conc_N2O_preind)) +
			- 0.47 * log(1 + 2.01e-5*(conc_CH4_preind*Concentration[:N2O])^0.75 +
							+ 5.31e-15*conc_CH4_preind*(conc_CH4_preind*Concentration[:N2O])^1.52) +
			+ cacheterm

		# Stratospheric H2O = 15% of radiative forcing from CH4, see IPCC AR4 WG1 sections 2.3.7 and 2.10.3.1
		# Large uncertainty here - it was judged to be 2-5% in TAR (see WG1 section 6.6.4 and Tanaka 2.2.29).
		RadiativeForcing[:H2O] = 0.15 * RadiativeForcing[:CH4]

		# Tropospheric O3 from CH4, Tanaka eq 2.2.21, based on IPCC TAR WG1 tables 4.11 (footnote p269) & 4.9 (p261)
		# Forcing due to ozone precursors (NOx, CO, VOC) is aggregated with RF_other.
		RadiativeForcing[:O3] = 0.042 * 5.0 * log(Concentration[:CH4]/conc_CH4_preind)

		# IPCC TAR WG1 table 6.2 (p358), or Tanaka eq 2.1.73,    5.35 ≈ 3.71/log(2)
		RadiativeForcing[:CO2] = 5.35 * log(Concentration[:CO2]/conc_CO2_preind)
	end

	global function radiativeforcing!(s::ClimateState)
		radiativeforcing!(s.Concentration, s.RadiativeForcing)
	end

	global function radiativeforcing!(t, s::ClimateState, p::ClimateParams, rcp)
		radiativeforcing!(s)
		s.TotalRadiativeForcing = sum(s.RadiativeForcing[g] for g in GAS) + 
			interpolate(t, otherforcing[rcp]) + p.aerosolforcingfactor * interpolate(t, aerosolforcing[rcp])
	end

	global function init_concentration_and_forcing!(s::ClimateState, p::ClimateParams)
		@unpack Concentration = s
		RadiativeForcing = Dict{Symbol,Float64}(g => 0.0 for g in GAS)
		TotalRadiativeForcing = 0.0

		Concentration[:CH4] = conc_CH4_preind
		Concentration[:N2O] = conc_N2O_preind

		@pack s = Concentration, RadiativeForcing, TotalRadiativeForcing
		radiativeforcing!(float(YEARS[1]), s, p, "RCP3PD")
	end
end