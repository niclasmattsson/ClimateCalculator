using ClimateCalculator, Test
const CC = ClimateCalculator

# The acceptance checks from REBASELINE-2023.md §7, plus a stored-results regression so that
# a future recalibration cannot drift without anyone noticing. Tolerances are wide enough to
# survive a new data vintage and narrow enough to catch a mistake.

lambda = 3.0/3.7		# the interface's default climate sensitivity, 3 °C per doubling
results, p, annualemissions, rcp = CC.solveclimate("2DEG"; lambda=lambda, usecache=false, lastyear=2100)
warming(y) = results[iyear(y)].Temp_global - p.tempbaseline
concentration(g, y) = results[iyear(y)].Concentration[g]
budget = CC.readfixedwidth(joinpath(@__DIR__, "..", "GlobalCarbonBudget.dat"), comments=true)
budgetyears = Int.(budget[:YEAR])
decade = CC.BASEYEAR-9:CC.BASEYEAR

@testset "ClimateCalculator" begin

@testset "observations" begin
	# the two records the model is driven by must reach the base year
	@test maximum(budgetyears) >= CC.BASEYEAR
	@test !isnan(CC.histTemp[iyear(CC.BASEYEAR)])
	# the temperature baseline is the zero point by construction
	@test CC.nanmean(CC.histTemp[iyear.(CC.BASELINEYEARS)]) ≈ 0 atol=0.05
	# IPCC AR6 WG1 SPM: 1.09 °C over 2011-2020 relative to 1850-1900
	@test sum(CC.histTemp[iyear.(2011:2020)])/10 ≈ 1.09 atol=0.05
end

@testset "concentrations at $(CC.BASEYEAR)" begin
	# CH4 and N2O are driven by inverted concentrations, so they should be near exact
	@test concentration(:CH4, CC.BASEYEAR) ≈ CC.histConc[:CH4][iyear(CC.BASEYEAR)] atol=2.0
	@test concentration(:N2O, CC.BASEYEAR) ≈ CC.histConc[:N2O][iyear(CC.BASEYEAR)] atol=0.5
	# CO2 is emission-driven; the carbon cycle has one free parameter to fit 60 years with
	@test concentration(:CO2, CC.BASEYEAR) ≈ CC.histConc[:CO2][iyear(CC.BASEYEAR)] atol=5.0
end

@testset "temperature" begin
	@test sum(warming(y) for y=2011:2020)/10 ≈ 1.09 atol=0.15
	# 2023 was an exceptionally warm year (WMO: 1.45 °C); a model without ENSO cannot
	# reproduce a single year, so only check that it is in the right neighbourhood
	@test warming(CC.BASEYEAR) ≈ 1.45 atol=0.25
	# AR6 total aerosol ERF: -1.3 W/m², 5-95 % range -2.0 to -0.6
	aerosolERF = p.aerosolforcingfactor * CC.aerosolforcing[rcp][iyear(CC.BASEYEAR)]
	@test -2.0 <= aerosolERF <= -0.6
end

@testset "carbon cycle" begin
	# Global Carbon Budget sinks over the last decade of observations
	i = findall(in(decade), budgetyears)
	@test sum(results[iyear(y)].NetFluxOcean for y in decade)/10 ≈ sum(budget[:OCEANSINK][i])/10 rtol=0.15
	@test sum(results[iyear(y)].NetFluxBiosphere for y in decade)/10 ≈ sum(budget[:LANDSINK][i])/10 rtol=0.25
	# the emissions the model is driven with are the observed ones
	@test annualemissions[:CO2][iyear(CC.BASEYEAR)] ≈
			budget[:FOSSIL][end] + budget[:LANDUSE][end] atol=0.001
end

@testset "TCRE" begin
	# Warming per 1000 GtC of cumulative CO2 emissions, from a run that ramps emissions
	# 1 %/year from the base year with the other gases held constant.
	# AR6 likely range: 1.0-2.3 °C per 1000 PgC.
	ramp = getscenario("RCP3PD")
	for y = CC.BASEYEAR+1:2100
		ramp[:CO2][iyear(y)] = ramp[:CO2][iyear(y-1)] * 1.01
		ramp[:CH4][iyear(y)] = ramp[:CH4][iyear(CC.BASEYEAR)]
		ramp[:N2O][iyear(y)] = ramp[:N2O][iyear(CC.BASEYEAR)]
	end
	res, _ = CC.solveclimate(ramp; lambda=lambda, lastyear=2100)
	dT = res[iyear(2100)].Temp_global - res[iyear(CC.BASEYEAR)].Temp_global
	cumulative = sum(ramp[:CO2][iyear(CC.BASEYEAR)+1:iyear(2100)])
	@test 1.0 <= dT/cumulative*1000 <= 2.3
end

@testset "cache" begin
	# the cached history must be indistinguishable from integrating from 1765
	cached, pc = CC.solveclimate("2DEG"; lambda=lambda, usecache=true, lastyear=2100)
	@test pc.aerosolforcingfactor ≈ p.aerosolforcingfactor atol=1e-3
	@test pc.fertilization ≈ p.fertilization atol=1e-3
	@test pc.tempbaseline ≈ p.tempbaseline atol=1e-3
	for y in [CC.BASEYEAR, 2050, 2100]
		@test cached[iyear(y)].Temp_global ≈ results[iyear(y)].Temp_global atol=1e-3
		@test cached[iyear(y)].Concentration[:CO2] ≈ concentration(:CO2, y) atol=0.1
	end
end

@testset "stored results" begin
	# Regression only: these are what the model said when it was rebaselined to 2023, not
	# targets. Update them deliberately, with the reason in the commit message.
	@test p.aerosolforcingfactor ≈ 1.1338 atol=0.001
	@test p.fertilization ≈ 0.7354 atol=0.001
	@test p.tempbaseline ≈ 0.0832 atol=0.001
	@test warming(CC.BASEYEAR) ≈ 1.3039 atol=0.001
	@test warming(2100) ≈ 2.4027 atol=0.002
	@test concentration(:CO2, 2100) ≈ 481.10 atol=0.05
end

end
