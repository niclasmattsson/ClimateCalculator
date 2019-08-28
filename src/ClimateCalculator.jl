module ClimateCalculator

using Parameters, Optim

export runscen, solveclimate, getscenario, calibrateforcing!, calibratefertilization!, printresults, iyear,
		ClimateState, ClimateParams, annualresults, makecalibrationcache, startserver

const YEARS				= 1765:2500
const GAS				= [:CO2, :CH4, :N2O, :H2O, :O3]
const GAS3 				= [:CO2, :CH4, :N2O]

const y0 = YEARS[1]

iyear(y::Int) = y - y0 + 1
iyear(t::Float64, f::Function) = f(Int,t) - y0 + 1
iyear(t::Float64) = iyear(t,round)

interpolate(t, annualvector) =  (1-(t-floor(t))) * annualvector[iyear(t,floor)] + 
									(t-floor(t)) * annualvector[iyear(t,ceil)]

mutable struct ClimateParams
	timestep				::Float64
	lambda					::Float64
	aerosolforcingfactor	::Float64
	fertilization			::Float64
	oceantempfeedback		::Float64
	bioQ10factor			::Float64
	equilibriumCO2			::Float64
end

mutable struct ClimateState
	Concentration			::Dict{Symbol, Float64}
	RadiativeForcing		::Dict{Symbol, Float64}
	TotalRadiativeForcing	::Float64
	DeltaCO2ocean			::Float64
	NetFluxOcean			::Float64
	DeltaDIC				::Float64
	DeltaDICbox				::Vector{Float64}
	NetFluxBiosphere		::Float64
	BioReservoir			::Vector{Float64}
	Temp_global				::Float64
	Temp_land				::Float64
	Temp					::Vector{Float64}
end

include("oceancarbon.jl")
include("biocarbon.jl")
include("concentrations.jl")
include("radiativeforcing.jl")
include("temperatures.jl")

ClimateState(v::Vector{Float64}) = ClimateState(Dict(GAS3[i] => v[i] for i=1:3), Dict(GAS[i] => v[i+3] for i=1:5),
		v[9], v[10], v[11], v[12], v[13:18], v[19], v[20:23], v[24], v[25], v[26:75])

ClimateState() = ClimateState(zeros(75))::ClimateState

state2vector(s::ClimateState)::Array{Float64} = [
		[s.Concentration[g] for g in GAS3]; [s.RadiativeForcing[g] for g in GAS]; s.TotalRadiativeForcing;
		s.DeltaCO2ocean; s.NetFluxOcean; s.DeltaDIC; s.DeltaDICbox; s.NetFluxBiosphere; s.BioReservoir;
		s.Temp_global; s.Temp_land; s.Temp]

Base.copy(s::ClimateState) = ClimateState(copy(s.Concentration), copy(s.RadiativeForcing), s.TotalRadiativeForcing,
											s.DeltaCO2ocean, s.NetFluxOcean, s.DeltaDIC,
											copy(s.DeltaDICbox), s.NetFluxBiosphere, copy(s.BioReservoir),
											s.Temp_global, s.Temp_land, copy(s.Temp))

include("scenario.jl")
include("climate.jl")
include("historicdata.jl")
include("calibrate.jl")
include("cachehistory.jl")
include("webserver.jl")

end