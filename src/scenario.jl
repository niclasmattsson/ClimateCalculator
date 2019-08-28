# RCP3PD, including land use, GtC
# 270 (natural) + 352.34 (anthro) MtCH4
# 10.7 (natural) + 12.66*28/44 (anthro) MtN
# 		      breakyear1 breakyear2 growth1 growth2 growth3
const scendata = [
"BAU" 		:CO2	2050	2150	0.015	0.0018	0.0018	
"BAU" 		:CH4	2050	2150	0.008	0		0		
"BAU" 		:N2O	2050	2150	0.005	0		0		
"3DEG" 		:CO2	2050	2150	-0.0067	-0.0067	-0.0067	
"3DEG" 		:CH4	2050	2150	0		0		0		
"3DEG" 		:N2O	2050	2150	0		0		0		
"2DEG" 		:CO2	2050	2150	-0.0285	-0.0075	-0.0075	
"2DEG" 		:CH4	2050	2150	0		0		0		
"2DEG" 		:N2O	2050	2150	0		0		0		
"1DEG" 		:CO2	2050	2150	-0.0617	-0.0022	-0.0022	
"1DEG" 		:CH4	2050	2150	-0.01	0		0		
"1DEG" 		:N2O	2050	2150	-0.01	0		0		
"15DEG" 	:CO2	2050	2150	-0.055	-0.055	-0.055	
"15DEG" 	:CH4	2050	2150	-0.0014	-0.0014	-0.0014	
"15DEG" 	:N2O	2050	2150	-0.0014	-0.0014	-0.0014	
"1PCT" 		:CO2	2050	2150	-0.01	-0.01	-0.01	
"1PCT" 		:CH4	2050	2150	0		0		0		
"1PCT" 		:N2O	2050	2150	0		0		0		
"1PCTD" 	:CO2	2050	2150	0		-0.025	-0.025	
"1PCTD" 	:CH4	2050	2150	0		-0.0005	-0.0005	
"1PCTD" 	:N2O	2050	2150	0		-0.0005	-0.0005	
"3GTC" 		:CO2	2050	2150	0.005	0		0		
"3GTC" 		:CH4	2050	2150	0		0		0		
"3GTC" 		:N2O	2050	2150	0		0		0		
"2C_3CS"	:CO2	2100	2150	-0.0285	-0.015	-0.015	
"2C_3CS"	:CH4	2050	2150	0		0		0		
"2C_3CS"	:N2O	2050	2150	0		0		0		
"2C_45CS"	:CO2	2100	2150	-0.0285	-0.015	-0.015	
"2C_45CS"	:CH4	2100	2150	-0.0006	-0.0010	-0.0010	
"2C_45CS"	:N2O	2100	2150	-0.0006	-0.0010	-0.0010	
"2C_15CS"	:CO2	2065	2170	0.01	-0.019	-0.006	
"2C_15CS"	:CH4	2050	2150	0		0		0		
"2C_15CS"	:N2O	2050	2150	0		0		0		
]

function getscenario(scen)
	breakyear1 = Dict{Tuple{String,Symbol},Int64}(
		(scendata[r,1], scendata[r,2]) => scendata[r,3] for r=1:size(scendata,1))
	breakyear2 = Dict{Tuple{String,Symbol},Int64}(
		(scendata[r,1], scendata[r,2]) => scendata[r,4] for r=1:size(scendata,1))
	growth1 = Dict{Tuple{String,Symbol},Float64}(
		(scendata[r,1], scendata[r,2]) => scendata[r,5] for r=1:size(scendata,1))
	growth2 = Dict{Tuple{String,Symbol},Float64}(
		(scendata[r,1], scendata[r,2]) => scendata[r,6] for r=1:size(scendata,1))
	growth3 = Dict{Tuple{String,Symbol},Float64}(
		(scendata[r,1], scendata[r,2]) => scendata[r,7] for r=1:size(scendata,1))

	path = joinpath(dirname(@__FILE__), "..")
	rcpscen = scen[1:3] == "RCP" ? scen : "RCP3PD"
	emissionsRCP = readfixedwidth("$path/RCP/$(rcpscen)_EMISSIONS.DAT", header=true, skipstart=37)

	#emissions2010 = Dict(:CO2 => 9.8779, :CH4 => 622.34, :N2O => 18.76)
	annualemissions = Dict{Symbol, Vector{Float64}}()
	annualemissions[:CO2] = emissionsRCP[:FossilCO2] + emissionsRCP[:OtherCO2]
	annualemissions[:CH4] = emissionsRCP[:CH4] + 270	# natural background emissions: 270 MtCH4
	annualemissions[:N2O] = emissionsRCP[:N2O] + 10.7	# natural background emissions: 10.7 MtN (TAR p253)
	if scen[1:3] != "RCP"
		for g in GAS3, y in 2010:YEARS[end]
			annualemissions[g][iyear(y)] = annualemissions[g][iyear(y)-1] * 
				if y <= breakyear1[scen,g]
					1 + growth1[scen,g]
				elseif y <= breakyear2[scen,g]
					1 + growth2[scen,g]
				else
					1 + growth3[scen,g]
				end
		end
	end
	return annualemissions
end