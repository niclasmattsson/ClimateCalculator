using Oxygen
using HTTP
using JSON

function readresults(annualEmissions, results, p, firstyear, lastyear)
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
            "emissions" => emissions
    )
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
        
        return JSON.json(readresults(annualEmissions, results, p, firstyear, lastyear))
    end

    println("Open http://localhost:8000/ClimateCalculator.html in your web browser.")
    serve(; show_banner=false, port=8000)
end