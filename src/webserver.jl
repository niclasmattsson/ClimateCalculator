using Oxygen
using HTTP
using JSON

function readresults(annualEmissions, results, firstyear, lastyear)
    years = iyear(firstyear):iyear(lastyear)
    res = results[years]
    temp = getfield.(res, :Temp_global)
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
        
        rcp = "RCP3PD"
        annualEmissions = getscenario(rcp)
        annualEmissions[:CO2][iyear(firstyear):iyear(lastyear)] = 12/44*(cccdata["emissions"]["FossilCO2"] + cccdata["emissions"]["OtherCO2"])
        annualEmissions[:CH4][iyear(firstyear):iyear(lastyear)] = cccdata["emissions"]["CH4"] .+ 270    # natural background emissions: 270 MtCH4
        annualEmissions[:N2O][iyear(firstyear):iyear(lastyear)] = cccdata["emissions"]["N2O"] .+ 10.7   # natural background emissions: 10.7 MtN (TAR p253)
        
        results, p = solveclimate(annualEmissions, usecache=true, lambda=cccdata["climatesensitivity"]/3.7, rcp=rcp)
        printresults(firstyear:10:lastyear, results, p, annualEmissions, rcp)
        
        return JSON.json(readresults(annualEmissions, results, firstyear, lastyear))
    end

    println("Open http://localhost:8000/ClimateCalculator.html in your web browser.")
    serve(; show_banner=false, port=8000)
end