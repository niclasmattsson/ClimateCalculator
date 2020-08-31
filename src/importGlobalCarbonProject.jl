using XLSX, DataFrames

GCPfiledata = Dict(
    2017 => Dict("globalversion" => "v1.3", "landuserange" => "C21:C78", "nationalversion" => "v1.2",
                    "sheet" => "Territorial Emissions GCB", "range" => "A16:IC74"),
    2018 => Dict("globalversion" => "v1.0", "landuserange" => "C21:C79", "nationalversion" => "v1.0",
                    "sheet" => "Territorial Emissions", "range" => "A17:HV76"),
    2019 => Dict("globalversion" => "v1.0", "landuserange" => "D20:D79", "nationalversion" => "v1.0",
                    "sheet" => "Territorial Emissions", "range" => "A17:HW77")
)

RCPregions = Dict(
    # There is already a column "Europe" but it includes Russia and others
    "Europe_alt" => ["EU28", "Iceland", "Norway", "Switzerland", "Turkey", "Macedonia (Republic of)",
                "Albania", "Bosnia and Herzegovina", "Serbia", "Montenegro"],
     # add Europe to OECD in code below
    "OECD" => ["Australia", "Canada", "Japan", "New Zealand", "USA"],
    "REF" => ["Armenia", "Azerbaijan", "Belarus", "Georgia", "Kazakhstan", "Kyrgyzstan", "Moldova",
                "Russian Federation", "Tajikistan", "Turkmenistan", "Ukraine", "Uzbekistan"],
    "ASIA" => ["Afghanistan", "Bangladesh", "Bhutan", "Brunei Darussalam", "Cambodia", "China",
                "Hong Kong", "Macao", "North Korea", "Fiji", "French Polynesia", "India", "Indonesia",
                "Laos", "Malaysia", "Maldives", "Micronesia (Federated States of)", "Mongolia", "Myanmar",
                "Nepal", "New Caledonia", "Pakistan", "Papua New Guinea", "Philippines", "South Korea",
                "Samoa", "Singapore", "Solomon Islands", "Sri Lanka", "Taiwan", "Thailand", "Timor-Leste",
                "Vanuatu", "Viet Nam"],
    "MAF" => ["Algeria", "Angola", "Bahrain", "Benin", "Botswana", "Burkina Faso", "Burundi", "Cameroon",
                "Cape Verde", "Central African Republic", "Chad", "Comoros", "Congo", "Côte d'Ivoire",
                "Democratic Republic of the Congo", "Djibouti", "Egypt", "Equatorial Guinea", "Eritrea",
                "Ethiopia", "Gabon", "Gambia", "Ghana", "Guinea", "Guinea-Bissau", "Iraq", "Iran", "Israel",
                "Hong Kong", "Jordan", "Kenya", "Kuwait", "Lebanon", "Lesotho", "Liberia", "Libya",
                "Madagascar", "Malawi", "Mali", "Mauritania", "Mauritius", "Morocco", "Mozambique",
                "Namibia", "Niger", "Nigeria", "Occupied Palestinian Territory", "Oman", "Qatar", "Rwanda",
                "Réunion", "Saudi Arabia", "Senegal", "Sierra Leone", "Somalia", "South Africa",
                "South Sudan", "Sudan", "Swaziland", "Syria", "Togo", "Tunisia", "Uganda",
                "United Arab Emirates", "Tanzania", "Yemen", "Zambia", "Zimbabwe"],
    "LAM" => ["Argentina", "Aruba", "Bahamas", "Barbados", "Belize", "Bolivia", "Brazil", "Chile",
                "Colombia", "Costa Rica", "Cuba", "Dominican Republic", "Ecuador", "El Salvador",
                "French Guiana", "Grenada", "Guadeloupe", "Guatemala", "Guyana", "Haiti", "Honduras",
                "Jamaica", "Martinique", "Mexico", "Nicaragua", "Panama", "Paraguay", "Peru", "Suriname",
                "Trinidad and Tobago", "Uruguay", "Venezuela"]
)

# Spreadsheet headers not listed above.
# Should be just small islands, EU countries (included in "EU28") and region names.
unlisted = Symbol.(["Andorra", "Anguilla", "Antigua and Barbuda", "Austria", "Belgium", "Bermuda",
            "Bonaire, Saint Eustatius and Saba", "British Virgin Islands", "Bulgaria", "Cayman Islands",
            "Cook Islands", "Croatia", "Curaçao", "Cyprus", "Czech Republic", "Denmark", "Dominica",
            "Estonia", "Faeroe Islands", "Falkland Islands (Malvinas)", "Finland", "France", "Germany",
            "Gibraltar", "Greece", "Greenland", "Hungary", "Ireland", "Italy", "Kiribati", "Kosovo",
            "Latvia", "Liechtenstein", "Lithuania", "Luxembourg", "Malta", "Marshall Islands", "Montserrat",
            "Nauru", "Netherlands", "Niue", "Palau", "Poland", "Portugal", "Romania", "Saint Helena",
            "Saint Lucia", "Sint Maarten (Dutch part)", "Sao Tome and Principe", "Seychelles", "Slovakia",
            "Slovenia", "Spain", "Saint Kitts and Nevis", "Saint Pierre and Miquelon",
            "Saint Vincent and the Grenadines", "Sweden", "Tonga", "Turks and Caicos Islands", "Tuvalu",
            "United Kingdom", "Wallis and Futuna Islands", "KP Annex B", "Non KP Annex B", "OECD", "Non-OECD",
            "Africa", "Asia", "Central America", "Europe", "Middle East", "North America", "Oceania",
            "South America", "Bunkers", "Statistical Difference", "World"])

function importGlobalCarbonProject(year)
    filedata = GCPfiledata[year]
    globalversion, nationalversion = filedata["globalversion"], filedata["nationalversion"]
    globalfile = joinpath(@__DIR__, "..", "SSP", "Global_Carbon_Budget_$year$globalversion.xlsx")
    nationalfile = joinpath(@__DIR__, "..", "SSP", "National_Carbon_Emissions_$year$nationalversion.xlsx")
    allheaders = Symbol.(vcat(values(RCPregions)...))
    # @show allheaders

    # segfault, see https://github.com/felipenoris/XLSX.jl/issues/146
    # XLSX.readtable(nationalfile, filedata["sheet"], filedata["range"])  

    data = XLSX.readdata(nationalfile, filedata["sheet"], filedata["range"])
    data = replace(data, "NaN" => 0) # zero OK because only tiny islands & countries are missing data
    # data = replace(data, "NaN" => missing)
    headers = Symbol.(["year"; data[1, 2:end]])
    df = DataFrame(data[2:end,:], headers)

    landuse = XLSX.readdata(globalfile, "Global Carbon Budget", filedata["landuserange"])

    for h in headers[2:end]
        # !(h in allheaders) && print("\"$h\", ")
        !(h in allheaders) && !(h in unlisted) && println("$h missing in RCPregions.")
    end

    for (reg, countries) in RCPregions
        df[reg] = sum(df[c] for c in countries if Symbol(c) in headers)
    end
    df.GLOBALFOSSIL = df.World
    df.OECD = df.OECD + df.Europe_alt
    df.BUNKERS = df.GLOBALFOSSIL - (df.OECD + df.REF + df.ASIA + df.MAF + df.LAM)
    df.Asia = df.ASIA
    df.LANDUSE = vec(landuse) * 1000

    select!(df, [:OECD, :REF, :Asia, :MAF, :LAM, :BUNKERS, :GLOBALFOSSIL, :LANDUSE])
    for col in names(df)
        df[col] = round.(df[col], digits=6)
    end

    preamble = """
    // File automatically generated from spreadsheet data by importGlobalCarbonProject.jl.

    // Data from The Global Carbon Budget $year. Unit [MtC/year].
    // Source: https://www.globalcarbonproject.org/carbonbudget/

    // National (territorial) CO2 emissions 1959-$(year-1), aggregated to RCP/SSP regions.
    // BUNKERS here is sum of actual BUNKERS field and the statistical error (to make regions sum to global total).
    // Asia not capitalized as in the RCP/SSP standard because it is referenced in the web interface.
    // Land use emissions are from the global overview file, the rest are from the national file.

    var CO2emissionhistory = {
    """

    footer = """
    };

    // first year of the above data
    var backgrounddatastart = 1959;
    """

    filename = joinpath(@__DIR__, "UI_backgrounddata.js")
    open(filename, "w") do file
        print(file, preamble)
        for name in names(df)
            name == :GLOBALFOSSIL && continue
            println(file, "    $name: [", join(df[name], ", "), "],")
        end
        print(file, footer)
    end

    println("\nFile $filename written.\n")
    return df
end

# Helper function used to transition from the old file:
#     Global Carbon Budget 2017 - National_Carbon_Emissions_2017v1.1.xlsx
# Reads Excel equation strings and outputs countries, for example: 
# ClimateCalculator.getcolumns("=IO17+L17+AI17+CW17+EK17+HD17") =>
#    "IO17", "Australia", "Canada", "Japan", "New Zealand", "USA"
function getcolumns(excelstring)
    year = 2017
    filedata = GCPfiledata[year]
    globalversion, nationalversion = filedata["globalversion"], filedata["nationalversion"]
    globalfile = joinpath(@__DIR__, "..", "SSP", "Global_Carbon_Budget_$year$globalversion.xlsx")
    nationalfile = joinpath(@__DIR__, "..", "SSP", "National_Carbon_Emissions_$year$nationalversion.xlsx")

    data = XLSX.readdata(nationalfile, filedata["sheet"], filedata["range"])
    headers = ["year"; data[1, 2:end]]

    cells = [startswith(c, "IF(") ? split(c, ",")[2] : c for c in split(excelstring[2:end], "+")]
    columnnumbers = XLSX.column_number.(XLSX.CellRef.(cells))
    countries = [cn > length(headers) ? cells[i] : headers[cn] for (i,cn) in enumerate(columnnumbers)]
    for c in countries
        print("\"$c\", ")
    end
end
