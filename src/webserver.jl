using Oxygen
using HTTP
using JSON

function readresults(annualEmissions, results, p, firstyear, lastyear, rcp)
    years = iyear(firstyear):iyear(lastyear)
    res = results[years]
    temp = getfield.(res, :Temp_global) .- p.tempbaseline   # warming since BASELINEYEARS
    GAS3 = [:CO2, :CH4, :N2O]
    conc = getfield.(res, :Concentration)
    concentrations = Dict(g => get.(conc, g, 0.0) for g in GAS3)
    emissions = Dict(g => get(annualEmissions, g, 0.0)[years] for g in GAS3)
    return Dict(
            "temperature" => temp,
            "concentrations" => concentrations,
            "emissions" => emissions,
            "carbonsinks" => carbonsinks(annualEmissions, res, years),
            "forcing" => radiativeforcingcomponents(res, p, rcp, years)
    )
end

# Where the emitted carbon ends up, in the units the emission figures use. The model works
# in GtC/year: NetFluxOcean is the air-to-sea flux and NetFluxBiosphere the net increase of
# terrestrial biomass, so whatever the two sinks leave behind is the atmospheric growth --
# the same split carbonbalance!() in concentrations.jl makes every time step.
function carbonsinks(annualEmissions, res, years)
    GtCO2_per_GtC = 44/12
    ocean = getfield.(res, :NetFluxOcean)
    land = getfield.(res, :NetFluxBiosphere)
    total = annualEmissions[:CO2][years]
    return Dict(
            "emissions" => total * GtCO2_per_GtC,
            "atmosphere" => (total - ocean - land) * GtCO2_per_GtC,
            "ocean" => ocean * GtCO2_per_GtC,
            "land" => land * GtCO2_per_GtC
    )
end

# Radiative forcing [W/m2] split the way radiativeforcing!() builds the total: the five
# gases the model computes from its own concentrations, plus the aerosol and residual terms
# read from the RCP scenario the run is driven with.
#
# The parts add up to the total to machine precision in every year but the first. There the
# state comes out of the precalculated history cache, which was integrated under RCP45 at a
# finer timestep and is reconstructed by interpolating in lambda, so its stored total is
# about 0.08 W/m2 below the components read from RCP3PD here. That is a property of the
# hand-off between the cached history and the run, not of this split.
function radiativeforcingcomponents(res, p, rcp, years)
    rf = getfield.(res, :RadiativeForcing)
    forcing = Dict{String,Vector{Float64}}(string(g) => get.(rf, g, 0.0) for g in GAS)
    forcing["Aerosols"] = p.aerosolforcingfactor * aerosolforcing[rcp][years]
    forcing["Other"] = otherforcing[rcp][years]
    forcing["Total"] = getfield.(res, :TotalRadiativeForcing)
    return forcing
end

function startserver()
    staticfiles(joinpath(dirname(@__DIR__), "ui"), "/")

    @post "/runccc" function(req::HTTP.Request)
        cccdata = JSON.parse(String(req.body))
        
        firstyear = cccdata["firstyear"]
        lastyear = cccdata["lastyear"]

        # The interface may narrow the window the aerosol and fertilization factors are
        # fitted to. Anything but the default window bypasses the precalculated history
        # cache and recalibrates from 1765, which costs about a second per run.
        firstcalibration = Int(get(cccdata, "firstcalibrationyear", CALIBRATIONYEARS[1]))
        lastcalibration = Int(get(cccdata, "lastcalibrationyear", CALIBRATIONYEARS[end]))
        calibrationyears = firstcalibration:lastcalibration
        
        rcp = "RCP3PD"
        annualEmissions = getscenario(rcp)
        annualEmissions[:CO2][iyear(firstyear):iyear(lastyear)] = 12/44*(cccdata["emissions"]["FossilCO2"] + cccdata["emissions"]["OtherCO2"])
        annualEmissions[:CH4][iyear(firstyear):iyear(lastyear)] = cccdata["emissions"]["CH4"] .+ NATURALCH4
        annualEmissions[:N2O][iyear(firstyear):iyear(lastyear)] = cccdata["emissions"]["N2O"] .+ NATURALN2O
        
        results, p = solveclimate(annualEmissions, usecache=true, lambda=cccdata["climatesensitivity"]/3.7,
                                    rcp=rcp, firstyear=firstyear, lastyear=lastyear,
                                    calibrationyears=calibrationyears)
        println("\nCalibration window: $calibrationyears")
        printresults(firstyear:10:lastyear, results, p, annualEmissions, rcp)
        
        return JSON.json(readresults(annualEmissions, results, p, firstyear, lastyear, rcp))
    end

    println("Open http://localhost:8000/ClimateCalculator.html in your web browser.")
    serve(; show_banner=false, port=8000)
end