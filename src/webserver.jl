using Mux, JSON

function todict(s::AbstractString)
    d = Dict{String,String}()
    for pair in split(s,"&")
        a = split(pair,"=")
        d[a[1]] = a[2]
    end
    d
end

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

function runclimatemodel(req)
    cccdata = JSON.parse(transcode(String, req[:data]))
    firstyear = cccdata["firstyear"]
    lastyear = cccdata["lastyear"]
    # if cccdata["firstyear"] != 2010 || cccdata["lastyear"] != 2100
    #     throw("Received emission data for $(cccdata["firstyear"])-$(cccdata["lastyear"]), " *
    #         "but currently only 2010-2100 is supported.")
    # end
    rcp = "RCP3PD"
    annualEmissions = getscenario(rcp)
    annualEmissions[:CO2][iyear(firstyear):iyear(lastyear)] = 12/44*(cccdata["emissions"]["FossilCO2"] + cccdata["emissions"]["OtherCO2"])
    annualEmissions[:CH4][iyear(firstyear):iyear(lastyear)] = cccdata["emissions"]["CH4"] .+ 270    # natural background emissions: 270 MtCH4
    annualEmissions[:N2O][iyear(firstyear):iyear(lastyear)] = cccdata["emissions"]["N2O"] .+ 10.7   # natural background emissions: 10.7 MtN (TAR p253)
    results, p = solveclimate(annualEmissions, usecache=true, lambda=cccdata["climatesensitivity"]/3.7, rcp=rcp)
    printresults(firstyear:10:lastyear, results, p, annualEmissions, rcp)
    response = JSON.json(readresults(annualEmissions, results, firstyear, lastyear))
    return response
end

function printPOSTinfo(req)
    println("\n$(req[:method])\n")
    display(req[:headers])
    println("\n")
    d = JSON.parse(transcode(String, req[:data]))
    display(d)
    JSON.print(d, 4)
    "hello kitty! :)"
    #"<p>method: $(req[:method])<p>data: $(transcode(String, req[:data]))<p>headers: $(req[:headers])"
end

global webserver

function startserver()
    staticroute = route("static", files(@__DIR__), Mux.notfound())
    #POSTroute = page("/user/:user", req -> "<h1>Hello, $(req[:params][:user])!</h1>")
    #POSTroute = method("POST", respond("POST request received."))
    #POSTroute = branch(req -> req[:method] == "POST", req -> printPOSTinfo(req))
    POSTroute = branch(req -> req[:method] == "POST", req -> runclimatemodel(req))

    serverstarted = isdefined(ClimateCalculator, :webserver)
    defaults = stack(Mux.todict, Mux.splitquery, Mux.toresponse)
    # @app webserver = (defaults, Mux.basiccatch, POSTroute, staticroute, Mux.notfound())
    @app webserver = (defaults, POSTroute, staticroute, Mux.notfound())
    !serverstarted && serve(webserver)    # only run this once, modify the line with @app test = ... instead
    println("Open http://localhost:8000/static/UI_layout.html in your web browser.")
    # login to NAS as admin, do "sudo -i" to become root
    # cd /volume1/Sync/julia
    # nohup bin/julia -e 'using ClimateCalculator_online; @sync startserver(8000)' > serverlog.txt 2>&1 &
    # nohup bin/julia -e 'using ClimateCalculator_online; @sync startserver(8000)' > /dev/null 2>&1 &
    # ps ax | grep julia
    # kill procnumber
end